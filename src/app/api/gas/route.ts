import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = process.env.GAS_URL!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let cache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL = 120_000;
let isFetching = false;

async function fetchFromGAS(): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${GAS_URL}?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === '1';
  const now = Date.now();
  const isStale = !cache || (now - cache.fetchedAt) > CACHE_TTL;
  if (cache && !isStale && !force) return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } });
  if (cache && isStale && !isFetching && !force) {
    isFetching = true;
    fetchFromGAS().then(data => { cache = { data, fetchedAt: Date.now() }; }).catch(() => {}).finally(() => { isFetching = false; });
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE' } });
  }
  try {
    isFetching = true;
    const data = await fetchFromGAS();
    cache = { data, fetchedAt: Date.now() };
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (err: any) {
    return NextResponse.json({ error: err.name === 'AbortError' ? 'timeout' : 'fetch_failed', vouchers: [] }, { status: 503 });
  } finally {
    isFetching = false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'delete') {
      const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', voucherno: body.voucherno }) });
      const data = await res.json();
      cache = null;
      return NextResponse.json(data);
    }

    if (action === 'updateSupplier') {
      const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      cache = null;
      return NextResponse.json(data);
    }

    // ── send: GAS သို့ item သိမ်း (Telegram မပါ) ──
    if (action === 'send') {
      const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body.data) });
      const data = await res.json();
      cache = null;
      return NextResponse.json(data);
    }

    // ── sendVoucher: items အကုန် save ပြီးမှ Telegram တစ်ကြောင်းတည်း ──
    if (action === 'sendVoucher') {
      const items: any[] = body.items || [];

      // GAS သို့ items အကုန် save — partial failure tracking
      const failed: number[] = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(items[i]) });
          if (!res.ok) failed.push(i);
        } catch {
          failed.push(i);
        }
      }
      cache = null;

      if (failed.length > 0) {
        return NextResponse.json({ result: 'partial', failedIndexes: failed, telegram: 'skipped' }, { status: 207 });
      }

      const first = items[0];
      console.log('[sendVoucher] type:', first?.type);

      let telegramResult = 'skipped';
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID && items.length > 0) {
          const isCashIn = first.type?.trim().toLowerCase() === 'cash in';
          const emoji = isCashIn ? '📥' : '📤';
          const grandTotal = items.reduce((s: number, i: any) => s + (parseFloat(i.cost_total) || 0), 0);

          const itemLines = items.map((i: any, idx: number) => {
            const subs = [i.sub1, i.sub2, i.sub3, i.sub4, i.sub5].filter(Boolean).join(' › ');
            const cat = subs ? `${i.category} › ${subs}` : (i.category || '—');
            return `${idx + 1}. ${i.item_description} — ${parseFloat(i.cost_total).toLocaleString()} MMK\n    📂 ${cat}`;
          }).join('\n');

          let totalIn = 0, totalOut = 0;
          try {
            const gasData = await fetchFromGAS();
            (gasData.vouchers || []).forEach((v: any) => {
              if ((v.type || '').trim().toLowerCase() === 'cash in')
                totalIn += Math.round(Number(v.income || v['cost_(total)'] || v.cost_total || 0));
              else
                totalOut += Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
            });
          } catch { /* silent */ }

          const balance = totalIn - totalOut;
          const msg = [
            `${emoji} *${first.type?.toUpperCase()} — ${first.voucherno || ''}*`,
            `👤 ${first.entered_by}  |  💳 ${first.account}  |  📅 ${first.date}`,
            `🏷️ ${first.vendor || '—'}`,
            ``,
            itemLines,
            ``,
            `💵 *Total: ${grandTotal.toLocaleString()} MMK*`,
            `${'─'.repeat(24)}`,
            `📈 In:  ${totalIn.toLocaleString()} MMK`,
            `📉 Out: ${totalOut.toLocaleString()} MMK`,
            `${balance >= 0 ? '🟢' : '🔴'} Bal: ${balance.toLocaleString()} MMK`,
            balance < 0 ? `⚠️ *BALANCE NEGATIVE!*` : '',
          ].filter(Boolean).join('\n');

          try {
            const tRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' }),
            });
            const tData = await tRes.json();
            telegramResult = tData.ok ? 'sent' : `failed: ${JSON.stringify(tData)}`;
          } catch (e: any) {
            telegramResult = `error: ${e.message}`;
          }
        }

        return NextResponse.json({ result: 'ok', telegram: telegramResult });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
