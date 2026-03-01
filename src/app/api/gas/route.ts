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

// ✅ Telegram ပို့သည် — item list မှ summary တစ်ကြိမ်တည်း
async function sendTelegramSummary(items: any[]) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram credentials missing');
    return;
  }

  const totalIn  = items.filter(i => i.type === 'Cash In').reduce((s, i) => s + Number(i.cost_total || 0), 0);
  const totalOut = items.filter(i => i.type !== 'Cash In').reduce((s, i) => s + Number(i.cost_total || 0), 0);
  const balance  = totalIn - totalOut;
  const date     = items[0]?.date || new Date().toISOString().split('T')[0];

  const itemLines = items.map((i, idx) => {
    const arrow = i.type === 'Cash In' ? '🟢' : '🔴';
    const cat   = [i.category, i.sub1, i.sub2].filter(Boolean).join(' › ');
    return `${arrow} *${idx + 1}. ${i.item_description || '-'}*\n` +
           `   📂 ${cat || 'GENERAL'}\n` +
           `   🏪 ${i.vendor || 'GENERAL'}  |  👤 ${i.entered_by || 'GM'} \\(${i.account || 'GM ACCOUNT'}\\)\n` +
           `   💵 ${Number(i.cost_total || 0).toLocaleString()} MMK  \\[${i.type}\\]` +
           (i.note ? `\n   📝 ${i.note}` : '');
  }).join('\n\n');

  const msg =
    `🏫 *SHINING STARS — FINANCE*\n` +
    `🧾 *NEW TRANSACTION SUBMITTED*\n\n` +
    itemLines + '\n\n' +
    `📊 *TODAY'S SUMMARY — ${date}*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🟢 Cash In  : *${totalIn.toLocaleString()} MMK*\n` +
    `🔴 Cash Out : *${totalOut.toLocaleString()} MMK*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `${balance >= 0 ? '✅' : '⚠️'} Balance   : *${balance >= 0 ? '+' : ''}${balance.toLocaleString()} MMK*`;

  const telegramRes = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: 'MarkdownV2',
      }),
    }
  );

  const result = await telegramRes.json();
  if (!result.ok) {
    console.error('Telegram error:', JSON.stringify(result));
  }
}

// POST — send / delete / telegram_summary
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ✅ Telegram summary only — GAS ကို မခေါ်၊ Telegram ကိုသာ ပို့
    if (action === 'telegram_summary') {
      await sendTelegramSummary(body.items || []);
      return NextResponse.json({ result: 'telegram_sent' });
    }

    if (action === 'delete') {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', voucherno: body.voucherno }),
      });
      const data = await res.json();
      cache = null;

      // Delete notification
      sendTelegramSummary([{
        type: 'Cash Out',
        item_description: `🗑️ DELETED: ${body.voucherno}`,
        category: 'DELETE', sub1: '', sub2: '',
        vendor: '-', entered_by: '-', account: '-',
        cost_total: 0,
        date: new Date().toISOString().split('T')[0],
        note: `Voucher ${body.voucherno} ကို ဖျက်လိုက်သည်`,
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
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('POST error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
