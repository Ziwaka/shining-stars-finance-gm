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

// ✅ Telegram ပို့သည်
// newItems = ခုသွင်းတဲ့ batch
// allVouchers = Sheet ထဲက ဟောင်းသောဒေတာ အကုန် (balance တွက်ရန်)
async function sendTelegramSummary(newItems: any[], allVouchers: any[]) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('Telegram credentials missing');
    return;
  }

  // ✅ Balance = Sheet ထဲက historical data အကုန် + ခုသွင်းတဲ့ batch
  const combined = [...allVouchers, ...newItems];
  const totalIn  = combined.filter(i => (i.type || '').toString().trim() === 'Cash In')
                            .reduce((s, i) => s + Number(i.cost_total || i['cost_(total)'] || 0), 0);
  const totalOut = combined.filter(i => (i.type || '').toString().trim() !== 'Cash In')
                            .reduce((s, i) => s + Number(i.cost_total || i['cost_(total)'] || 0), 0);
  const balance  = totalIn - totalOut;

  // ✅ Today's batch summary
  const batchIn  = newItems.filter(i => (i.type || '').toString().trim() === 'Cash In')
                            .reduce((s, i) => s + Number(i.cost_total || 0), 0);
  const batchOut = newItems.filter(i => (i.type || '').toString().trim() !== 'Cash In')
                            .reduce((s, i) => s + Number(i.cost_total || 0), 0);

  const date = newItems[0]?.date || new Date().toISOString().split('T')[0];

  // ✅ Item lines — item_description မပါရင် fallback ပြမည်
  const itemLines = newItems.map((i, idx) => {
    const arrow = (i.type || '').trim() === 'Cash In' ? '🟢' : '🔴';
    const cat   = [i.category, i.sub1, i.sub2].filter(Boolean).join(' > ');
    const desc  = i.item_description || i.item || '-';
    const amt   = Number(i.cost_total || 0).toLocaleString();
    return `${arrow} *${idx + 1}. ${desc}*\n` +
           `   📂 ${cat || 'GENERAL'}\n` +
           `   🏪 ${i.vendor || 'GENERAL'} | 👤 ${i.entered_by || 'GM'} (${i.account || 'GM ACCOUNT'})\n` +
           `   💵 ${amt} MMK [${i.type || 'Cash Out'}]` +
           (i.note ? `\n   📝 ${i.note}` : '');
  }).join('\n\n');

  const msg =
    `🏫 *SHINING STARS — FINANCE*\n` +
    `🧾 *NEW TRANSACTION — ${date}*\n\n` +
    itemLines + '\n\n' +
    `📊 *THIS BATCH*\n` +
    `🟢 In  : ${batchIn.toLocaleString()} MMK\n` +
    `🔴 Out : ${batchOut.toLocaleString()} MMK\n\n` +
    `💰 *ACCOUNT BALANCE*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🟢 Total In  : ${totalIn.toLocaleString()} MMK\n` +
    `🔴 Total Out : ${totalOut.toLocaleString()} MMK\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `${balance >= 0 ? '✅' : '⚠️'} *Balance : ${balance >= 0 ? '+' : ''}${balance.toLocaleString()} MMK*`;

  const telegramRes = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: 'Markdown',
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

    // ✅ Telegram summary — cache ထဲက allVouchers နဲ့ တွဲတွက်မည်
    if (action === 'telegram_summary') {
      const allVouchers = cache?.data?.vouchers || [];
      await sendTelegramSummary(body.items || [], allVouchers);
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

      sendTelegramSummary([{
        type: 'DELETE',
        item_description: `DELETED: ${body.voucherno}`,
        category: '-', sub1: '', sub2: '',
        vendor: '-', entered_by: '-', account: '-',
        cost_total: 0,
        date: new Date().toISOString().split('T')[0],
        note: `Voucher ${body.voucherno} ဖျက်လိုက်သည်`,
      }], []).catch(() => {});

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
