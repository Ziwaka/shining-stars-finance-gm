import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = process.env.GAS_URL!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ✅ Stale-while-revalidate cache
// Vercel serverless မှာ module-level variable က request တစ်ခုမှ နောက်တစ်ခုသို့ survive ဖြစ်တတ်သည်
// Production မှာ 60–80% hit rate ရနိုင်သည်
let cache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL = 120_000; // 2 မိနစ် — stale ဖြစ်မည့်အချိန်
let isFetching = false;   // background fetch race condition ကာကွယ်ရန်

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

// GET — stale-while-revalidate logic
export async function GET() {
  const now = Date.now();
  const isStale = !cache || (now - cache.fetchedAt) > CACHE_TTL;

  // ✅ Cache ရှိပြီး stale မဖြစ်သေးရင် — ချက်ချင်းပြ
  if (cache && !isStale) {
    return NextResponse.json(cache.data, {
      headers: { 'X-Cache': 'HIT' },
    });
  }

  // ✅ Stale cache ရှိသောအခါ — ဟောင်းသောဟာကို ချက်ချင်းပြပြီး background မှာ refresh
  if (cache && isStale && !isFetching) {
    isFetching = true;
    // Background fetch — await မလုပ်သောကြောင့် response ကို block မလုပ်
    fetchFromGAS()
      .then(data => { cache = { data, fetchedAt: Date.now() }; })
      .catch(() => {}) // background fail ဖြစ်ရင် stale data ဆက်သုံးမည်
      .finally(() => { isFetching = false; });

    return NextResponse.json(cache.data, {
      headers: { 'X-Cache': 'STALE' },
    });
  }

  // ✅ Cache လုံးဝ မရှိသောအခါ (ပထမဆုံး request) — GAS ကို တိုက်ရိုက်ခေါ်မည်
  try {
    isFetching = true;
    const data = await fetchFromGAS();
    cache = { data, fetchedAt: Date.now() };
    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'timeout' : 'fetch_failed', vouchers: [] },
      { status: 503 }
    );
  } finally {
    isFetching = false;
  }
}

// POST — send / delete (cache invalidate ပါ)
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
      // ✅ Delete ပြီးရင် cache invalidate — နောက် GET မှာ fresh data ရမည်
      cache = null;
      return NextResponse.json(data);
    }

    if (action === 'updateSupplier') {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      // ✅ Supplier update ပြီးရင် cache invalidate
      cache = null;
      return NextResponse.json(data);
    }

    if (action === 'send') {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body.data),
      });
      const data = await res.json();

      // ✅ Submit ပြီးရင် cache invalidate — dashboard refresh လုပ်ရင် data အသစ်ရမည်
      cache = null;

      // Telegram notification
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const item = body.data;
        const isCashIn = item.type?.trim().toLowerCase() === 'cash in';
        const amount = isCashIn
          ? (parseFloat(item.income) || parseFloat(item.cost_total) || 0)
          : (parseFloat(item.cost_total) || 0);
        const msg = `🚨 *NEW TRANSACTION*\n\n👤 *By:* ${item.entered_by}\n💳 *Account:* ${item.account}\n📈 *Type:* ${item.type}\n🧾 *Item:* ${item.item_description}\n💰 *Amount:* ${amount.toLocaleString()} MMK`;
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' }),
        }).catch(() => {});
      }

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}