import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = process.env.GAS_URL!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let cache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL = 120_000;
let isFetching = false;
const GAS_TIMEOUT_MS = 45000;
const GAS_POST_TIMEOUT_MS = 30000;

async function fetchFromGAS(): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GAS_TIMEOUT_MS);
  try {
    const res = await fetch(`${GAS_URL}?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`GAS HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function postToGAS(payload: object): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GAS_POST_TIMEOUT_MS);
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === '1';
  const now = Date.now();
  const isStale = !cache || (now - cache.fetchedAt) > CACHE_TTL;

  if (cache && !isStale && !force) {
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } });
  }
  if (cache && isStale && !isFetching && !force) {
    isFetching = true;
    fetchFromGAS()
      .then(data => { cache = { data, fetchedAt: Date.now() }; })
      .catch(() => {})
      .finally(() => { isFetching = false; });
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE' } });
  }
  try {
    isFetching = true;
    const data = await fetchFromGAS();
    cache = { data, fetchedAt: Date.now() };
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (err: any) {
    if (cache) return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE-FALLBACK' } });
    return NextResponse.json(
      { error: err.name === 'AbortError' ? 'timeout' : 'fetch_failed', vouchers: [], categoryList: [] },
      { status: 503 }
    );
  } finally {
    isFetching = false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'sendVoucher' && body.items) {
      const data = await postToGAS({ action: 'sendVoucher', items: body.items });
      cache = null;
      if (data.result === 'saved' && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        await sendTelegram(body.items, cache?.data);
      }
      return NextResponse.json(data);
    }

    if (action === 'delete') {
      const data = await postToGAS({ action: 'delete', voucherno: body.voucherno });
      cache = null;
      return NextResponse.json(data);
    }
    if (action === 'updateSupplier') {
      const data = await postToGAS(body);
      cache = null;
      return NextResponse.json(data);
    }
    if (action === 'manageCat') {
      const data = await postToGAS(body);
      cache = null;
      return NextResponse.json(data);
    }
    if (action === 'updateImageUrl') {
      const data = await postToGAS(body);
      cache = null;
      return NextResponse.json(data);
    }
    if (action === 'updateVoucher') {
      const data = await postToGAS(body);
      cache = null;
      return NextResponse.json(data);
    }
    if (action === 'send') {
      const data = await postToGAS(body.data);
      cache = null;
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function sendTelegram(items: any[], cachedData: any): Promise<void> {
  try {
    const first = items[0];
    const isCashIn = first.type?.trim().toLowerCase() === 'cash in';
    const emoji = isCashIn ? '📥' : '📤';
    const grandTotal = items.reduce((s: number, i: any) => s + (parseFloat(i.cost_total) || 0), 0);
    const itemLines = items.map((i: any, idx: number) => {
      const subs = [i.sub1, i.sub2, i.sub3, i.sub4, i.sub5].filter(Boolean).join(' › ');
      const cat = subs ? `${i.category} › ${subs}` : (i.category || '—');
      return `${idx + 1}. ${i.item_description} — ${parseFloat(i.cost_total).toLocaleString()} MMK\n    📂 ${cat}`;
    }).join('\n');
    let totalIn = 0, totalOut = 0;
    if (cachedData?.vouchers) {
      for (const v of cachedData.vouchers) {
        const t = (v.type || '').trim().toLowerCase();
        if (t === 'cash in') totalIn += Math.round(Number(v.income || v['cost_(total)'] || v.cost_total || 0));
        else totalOut += Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
      }
    }
    if (isCashIn) totalIn += grandTotal;
    else totalOut += grandTotal;
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
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' }),
    });
  } catch (e) { console.error('Telegram error', e); }
}