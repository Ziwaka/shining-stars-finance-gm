import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = process.env.GAS_URL!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Stale-while-revalidate cache
let cache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL = 120_000;
let isFetching = false;

async function fetchFromGAS(): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${GAS_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// GET — stale-while-revalidate
export async function GET() {
  const now = Date.now();
  const isStale = !cache || (now - cache.fetchedAt) > CACHE_TTL;

  if (cache && !isStale) {
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } });
  }

  if (cache && isStale && !isFetching) {
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
    return NextResponse.json(
      { error: err.name === 'AbortError' ? 'timeout' : 'fetch_failed', vouchers: [] },
      { status: 503 }
    );
  } finally {
    isFetching = false;
  }
}

// ✅ Telegram ပို့သည် — item တစ်ခုချင်းစီ + batch summary
async function sendTelegram(items: any[]) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const totalIn  = items.filter(i => i.type === 'Cash In').reduce((s, i) => s + (i.cost_total || 0), 0);
  const totalOut = items.filter(i => i.type !== 'Cash In').reduce((s, i) => s + (i.cost_total || 0), 0);
  const balance  = totalIn - totalOut;
  const date     = items[0]?.date || new Date().toISOString().split('T')[0];

  // ── Item lines ──
  const itemLines = items.map((i, idx) => {
    const arrow  = i.type === 'Cash In' ? '🟢' : '🔴';
    const cat    = [i.category, i.sub1, i.sub2].filter(Boolean).join(' › ');
    const amount = (i.cost_total || 0).toLocaleString();
    return `${arrow} *${idx + 1}. ${i.item_description || '-'}*\n` +
           `   📂 ${cat}\n` +
           `   🏪 ${i.vendor || 'GENERAL'}  |  👤 ${i.entered_by} (${i.account})\n` +
           `   💵 ${amount} MMK  [${i.type}]` +
           (i.note ? `\n   📝 ${i.note}` : '');
  }).join('\n\n');

  // ── Daily summary ──
  const summaryLines =
    `📊 *TODAY'S SUMMARY — ${date}*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🟢 Cash In  : *${totalIn.toLocaleString()} MMK*\n` +
    `🔴 Cash Out : *${totalOut.toLocaleString()} MMK*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `${balance >= 0 ? '✅' : '⚠️'} Balance   : *${balance >= 0 ? '+' : ''}${balance.toLocaleString()} MMK*`;

  const msg =
    `🏫 *SHINING STARS — FINANCE*\n` +
    `🧾 *NEW TRANSACTION SUBMITTED*\n\n` +
    itemLines + '\n\n' +
    summaryLines;

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: msg,
      parse_mode: 'Markdown',
    }),
  });
}

// POST — send / delete
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'delete') {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', voucherno: body.voucherno }),
      });
      const data = await res.json();
      cache = null;

      // ✅ Delete notification
      const v = body.voucherno;
      sendTelegram([{
        type: 'Cash Out',
        item_description: `🗑️ DELETED: ${v}`,
        category: 'DELETE',
        sub1: '', sub2: '',
        vendor: '-', entered_by: '-', account: '-',
        cost_total: 0,
        date: new Date().toISOString().split('T')[0],
        note: `Voucher ${v} ကို ဖျက်လိုက်သည်`,
      }]).catch(() => {});

      return NextResponse.json(data);
    }

    if (action === 'send') {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.data),
      });
      const data = await res.json();
      cache = null;

      // ✅ Telegram — batch items ရှိရင် batch ပို့၊ မဟုတ်ရင် single item ပို့
      const items = Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : [body.data];
      sendTelegram(items).catch(() => {});

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
