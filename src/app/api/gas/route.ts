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
        const amount = parseFloat(item.cost_total) || 0;
        const emoji = isCashIn ? '📥' : '📤';

        // ✅ Sub-categories တွဲပြ
        const subCats = [item.sub_1 || item.sub1, item.sub_2 || item.sub2, item.sub_3 || item.sub3, item.sub_4 || item.sub4, item.sub_5 || item.sub5]
          .filter(Boolean).join(' › ');
        const categoryLine = subCats ? `${item.category} › ${subCats}` : (item.category || '—');

        // ✅ GAS မှ vouchers အားလုံး ယူပြီး totalIn/totalOut တွက်
        let totalIn = 0, totalOut = 0;
        try {
          const gasRes = await fetch(`${GAS_URL}?t=${Date.now()}`, { cache: 'no-store' });
          const gasData = await gasRes.json();
          const vouchers: any[] = gasData.vouchers || [];
          vouchers.forEach((v: any) => {
            const vType = (v.type || '').toString().trim().toLowerCase();
            if (vType === 'cash in') {
              totalIn += Math.round(Number(v.income || v.Income || v['cost_(total)'] || v.cost_total || 0));
            } else {
              totalOut += Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
            }
          });
          // ✅ ခု submit လုပ်တဲ့ item ပါ ထည့်တွက်
          if (isCashIn) totalIn += amount; else totalOut += amount;
        } catch { /* silent */ }

        const balance = totalIn - totalOut;
        const balanceEmoji = balance >= 0 ? '🟢' : '🔴';

        const msg = [
          `${emoji} *${item.type?.toUpperCase()}*`,
          ``,
          `👤 *By:* ${item.entered_by}`,
          `💳 *Account:* ${item.account}`,
          `🏷️ *Vendor:* ${item.vendor || '—'}`,
          `📦 *Item:* ${item.item_description}`,
          `💰 *Amount:* ${amount.toLocaleString()} MMK`,
          `🗂️ *Category:* ${categoryLine}`,
          `🧾 *Voucher:* ${item.voucherno || '—'}`,
          ``,
          `*Grand Total Cost >>*`,
          `${'═'.repeat(20)}`,
          `📊 *Account Balance*`,
          `📈 Total In:  ${totalIn.toLocaleString()} MMK`,
          `📉 Total Out: ${totalOut.toLocaleString()} MMK`,
          `${balanceEmoji} Balance:    ${balance.toLocaleString()} MMK`,
          balance < 0 ? `\n⚠️ *WARNING: BALANCE IS NEGATIVE!*` : '',
        ].filter(l => l !== undefined).join('\n');

        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' }),
        })
          .then(r => r.json())
          .then(r => console.log('[Telegram] Response:', JSON.stringify(r)))
          .catch(e => console.error('[Telegram] Error:', e));
      } else {
        console.warn('[Telegram] Missing token or chat_id', { hasToken: !!TELEGRAM_BOT_TOKEN, hasChatId: !!TELEGRAM_CHAT_ID });
      }

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
