import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = process.env.GAS_URL!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Stale-while-revalidate cache
let cache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL = 120_000;
let isFetching = false;
// ✅ delete/send ပြီးနောက် GET ကို force fresh fetch ဖြစ်အောင်
let forceRefresh = false;

// ✅ cache invalidate မလုပ်ခင် vouchers သိမ်းထားသည် — Telegram balance တွက်ရန်
let lastKnownVouchers: any[] = [];

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
  const isStale = !cache || (now - cache.fetchedAt) > CACHE_TTL || forceRefresh;

  if (cache && !isStale) {
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } });
  }
  if (cache && isStale && !isFetching) {
    isFetching = true;
    fetchFromGAS()
      .then(data => { 
        cache = { data, fetchedAt: Date.now() };
        forceRefresh = false;
        if (data.vouchers) lastKnownVouchers = data.vouchers;
      })
      .catch(() => {})
      .finally(() => { isFetching = false; });
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE' } });
  }
  try {
    isFetching = true;
    const data = await fetchFromGAS();
    cache = { data, fetchedAt: Date.now() };
    forceRefresh = false;
    if (data.vouchers) lastKnownVouchers = data.vouchers;
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

  // ✅ cost field normalize — GAS က cost_(total) လို့ပြန်လာတတ်တာကြောင့်
  const getAmt = (v: any) => Number(v.cost_total || v['cost_(total)'] || 0);
  const getType = (v: any) => (v.type || v.Type || 'Cash Out').toString().trim();

  // ✅ Balance = Sheet ထဲက historical + ခုသွင်းတဲ့ batch
  const combined = [...allVouchers, ...newItems];
  const totalIn  = combined.filter(v => getType(v) === 'Cash In').reduce((s, v) => s + getAmt(v), 0);
  const totalOut = combined.filter(v => getType(v) !== 'Cash In').reduce((s, v) => s + getAmt(v), 0);
  const balance  = totalIn - totalOut;

  const date     = newItems[0]?.date || new Date().toISOString().split('T')[0];
  const vrno     = newItems[0]?.voucherno || '-';
  const vendor   = newItems[0]?.vendor || 'GENERAL';
  const by       = newItems[0]?.entered_by || 'GM';
  const account  = newItems[0]?.account || 'GM ACCOUNT';

  // ✅ Item list — Qty x Rate = Total format
  const itemLines = newItems.map((i, idx) => {
    const desc  = i.item_description || i.item || '-';
    const qty   = Number(i.count || 1);
    const rate  = Number(i.cost_piece || getAmt(i));
    const total = Number(getAmt(i));
    const arrow = getType(i) === 'Cash In' ? '🟢' : '🔴';
    return `${arrow} ${idx + 1}. ${desc}\n` +
           `   ${qty} x ${rate.toLocaleString()} = *${total.toLocaleString()} MMK*` +
           (i.note ? `\n   📝 ${i.note}` : '');
  }).join('\n');

  const grandTotal = newItems.reduce((s, i) => s + getAmt(i), 0);

  const msg =
    `🏫 *SHINING STARS — FINANCE*\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `🧾 *${vrno}*  |  📅 ${date}\n` +
    `🏪 ${vendor}\n` +
    `👤 ${by} (${account})\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    itemLines + '\n' +
    `━━━━━━━━━━━━━━━━━━\n` +
    `💵 *GRAND TOTAL : ${grandTotal.toLocaleString()} MMK*\n\n` +
    `💰 *ACCOUNT BALANCE*\n` +
    `🟢 Total In  : ${totalIn.toLocaleString()} MMK\n` +
    `🔴 Total Out : ${totalOut.toLocaleString()} MMK\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `${balance >= 0 ? '✅' : '⚠️'} *${balance >= 0 ? '+' : ''}${balance.toLocaleString()} MMK*`;

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
      // ✅ lastKnownVouchers = GAS ထဲက ဟောင်းသောဒေတာ (newItems မပါ)
      // sendTelegramSummary ထဲမှာ combined = lastKnownVouchers + newItems တွဲတွက်မည်
      // double count မဖြစ်အောင် lastKnownVouchers ထဲ newItems မထည့်ပါ
      await sendTelegramSummary(body.items || [], lastKnownVouchers);
      return NextResponse.json({ result: 'telegram_sent' });
    }

    if (action === 'delete') {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', voucherno: body.voucherno }),
      });
      const data = await res.json();
      // ✅ cache null + lastKnownVouchers ထဲကလည်း ဖျက်ထားသော voucher ကို ဖြုတ်ပါ
      cache = null;
      lastKnownVouchers = lastKnownVouchers.filter(
        v => (v.voucherno || v.voucher_no || '').toString() !== body.voucherno
      );

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
      forceRefresh = true;
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('POST error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
