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

export async function GET() {
  const now = Date.now();
  const isStale = !cache || (now - cache.fetchedAt) > CACHE_TTL;
  if (cache && !isStale) return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } });
  if (cache && isStale && !isFetching) {
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

    // ── Delete ──
    if (action === 'delete') {
      const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', voucherno: body.voucherno }) });
      const data = await res.json();
      cache = null;
      return NextResponse.json(data);
    }

    // ── Update Supplier ──
    if (action === 'updateSupplier') {
      const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      cache = null;
      return NextResponse.json(data);
    }

    // ── Send item to GAS (Telegram မပါ) ──
    if (action === 'send') {
      const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body.data) });
      const data = await res.json();
      cache = null;
      return NextResponse.json(data);
    }

    // ── Telegram Summary (Voucher အားလုံး submit ပြီးမှ တစ်ကြောင်းတည်း) ──
    if (action === 'telegramSummary') {
      const items: any[] = body.items || [];
      if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || items.length === 0) return NextResponse.json({ ok: true });

      const first = items[0];
      const isCashIn = first.type?.trim().toLowerCase() === 'cash in';
      const emoji = isCashIn ? '📥' : '📤';
      const grandTotal = items.reduce((s: number, i: any) => s + (parseFloat(i.cost_total) || 0), 0);

      const getSubCats = (i: any) => [i.sub_1||i.sub1, i.sub_2||i.sub2, i.sub_3||i.sub3, i.sub_4||i.sub4, i.sub_5||i.sub5].filter(Boolean).join(' › ');

      const itemLines = items.map((i: any, idx: number) => {
        const cat = getSubCats(i) ? `${i.category} › ${getSubCats(i)}` : (i.category || '—');
        return `${idx + 1}. 📦 *${i.item_description}*\n    💰 ${parseFloat(i.cost_total).toLocaleString()} MMK\n    🗂️ ${cat}`;
      }).join('\n');

      // GAS မှ total တွက်
      let totalIn = 0, totalOut = 0;
      try {
        const gasData = await fetchFromGAS();
        (gasData.vouchers || []).forEach((v: any) => {
          const vType = (v.type || '').toString().trim().toLowerCase();
          if (vType === 'cash in') totalIn += Math.round(Number(v.income || v['cost_(total)'] || v.cost_total || 0));
          else totalOut += Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
        });
        if (isCashIn) totalIn += grandTotal; else totalOut += grandTotal;
      } catch { /* silent */ }

      const balance = totalIn - totalOut;
      const balEmoji = balance >= 0 ? '🟢' : '🔴';

      const lines = [
        `${emoji} *${first.type?.toUpperCase()} — ${first.voucherno || ''}*`,
        ``,
        `👤 *By:* ${first.entered_by}  |  💳 ${first.account}`,
        `🏷️ *Vendor:* ${first.vendor || '—'}`,
        `📅 *Date:* ${first.date || '—'}`,
        ``,
        `*ITEMS (${items.length}):*`,
        itemLines,
        ``,
        `💵 *Voucher Total: ${grandTotal.toLocaleString()} MMK*`,
        ``,
        `*Grand Total >>*`,
        `${'═'.repeat(22)}`,
        `📈 Total In:  ${totalIn.toLocaleString()} MMK`,
        `📉 Total Out: ${totalOut.toLocaleString()} MMK`,
        `${balEmoji} Balance:    ${balance.toLocaleString()} MMK`,
        balance < 0 ? `\n⚠️ *WARNING: BALANCE IS NEGATIVE!*` : '',
      ].filter(l => l !== undefined).join('\n');

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: lines, parse_mode: 'Markdown' }),
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
