import { NextRequest, NextResponse } from 'next/server';

const GAS_URL             = process.env.GAS_URL!;
const TELEGRAM_BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID    = process.env.TELEGRAM_CHAT_ID;

// ── Cache ────────────────────────────────────────────────────────
let cache: { data: any; fetchedAt: number } | null = null;
const CACHE_TTL           = 120_000;  // 2 min
let isFetching            = false;

// ── Timeout constants ────────────────────────────────────────────
// GAS cold start 20-30s ကြာနိုင် →넉넉히 45s ထားသည်
const GAS_TIMEOUT_MS      = 45_000;
const GAS_POST_TIMEOUT_MS = 30_000;
const RETRY_COUNT         = 2;

// ── fetchFromGAS with auto-retry ────────────────────────────────
async function fetchFromGAS(retries = RETRY_COUNT): Promise<any> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GAS_TIMEOUT_MS);
    try {
      const res = await fetch(
        `${GAS_URL}?t=${Date.now()}`,
        { cache: 'no-store', signal: controller.signal }
      );
      clearTimeout(timer);
      if (!res.ok) throw new Error(`GAS HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw lastErr;
}

// ── POST to GAS with timeout ─────────────────────────────────────
async function postToGAS(payload: object): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GAS_POST_TIMEOUT_MS);
  try {
    const res = await fetch(GAS_URL, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
      signal : controller.signal,
    });
    clearTimeout(timer);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}


// ═══════════════════════════════════════════════════════════════════
// GET — Dashboard data  (stale-while-revalidate)
// ═══════════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const force   = req.nextUrl.searchParams.get('force') === '1';
  const now     = Date.now();
  const isStale = !cache || (now - cache.fetchedAt) > CACHE_TTL;

  // Cache HIT
  if (cache && !isStale && !force) {
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'HIT' } });
  }

  // Stale — return immediately, revalidate in background
  if (cache && isStale && !isFetching && !force) {
    isFetching = true;
    fetchFromGAS()
      .then(data  => { cache = { data, fetchedAt: Date.now() }; })
      .catch(() => {})
      .finally(() => { isFetching = false; });
    return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE' } });
  }

  // Cache MISS — fetch fresh
  try {
    isFetching = true;
    const data = await fetchFromGAS();
    cache = { data, fetchedAt: Date.now() };
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } });
  } catch (err: any) {
    // Stale fallback if cache exists
    if (cache) {
      return NextResponse.json(cache.data, { headers: { 'X-Cache': 'STALE-FALLBACK' } });
    }
    const isAbort = err.name === 'AbortError' || err.message?.includes('abort');
    return NextResponse.json(
      { error: isAbort ? 'timeout' : 'fetch_failed', vouchers: [], categoryList: [], suppliers: [] },
      { status: 503 }
    );
  } finally {
    isFetching = false;
  }
}


// ═══════════════════════════════════════════════════════════════════
// POST — Write actions
// ═══════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const body       = await req.json();
    const { action } = body;

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

    // ── updateVoucher: posted ပြီးသား row ပြင်ဆင် ──────────────
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

    // ── sendVoucher ──────────────────────────────────────────────
    if (action === 'sendVoucher') {
      const items: any[] = body.items || [];
      if (items.length === 0) {
        return NextResponse.json({ result: 'error', msg: 'No items' }, { status: 400 });
      }

      // Save all rows to GAS
      const failed: number[] = [];
      for (let i = 0; i < items.length; i++) {
        try {
          const data = await postToGAS(items[i]);
          if (data?.result === 'error') failed.push(i);
        } catch {
          failed.push(i);
        }
      }
      cache = null;

      if (failed.length > 0) {
        return NextResponse.json(
          { result: 'partial', failedIndexes: failed, telegram: 'skipped' },
          { status: 207 }
        );
      }

      // Telegram — cache ကိုသုံး၊ GAS ထပ်မဆွဲ (fast + no extra timeout risk)
      let telegramResult = 'skipped';
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        telegramResult = await sendTelegram(items, cache?.data);
      }

      return NextResponse.json({ result: 'ok', telegram: telegramResult });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err: any) {
    const isAbort = err.name === 'AbortError' || err.message?.includes('abort');
    return NextResponse.json(
      { error: isAbort ? 'GAS timeout — ထပ်ကြိုးစားပါ' : 'Server error', detail: err.message },
      { status: isAbort ? 504 : 500 }
    );
  }
}


// ═══════════════════════════════════════════════════════════════════
// Telegram helper
// ★ Cache data သုံး — GAS ထပ်မဆွဲ၊ timeout risk မရှိ
// ═══════════════════════════════════════════════════════════════════
async function sendTelegram(items: any[], cachedData: any): Promise<string> {
  try {
    const first      = items[0];
    const isCashIn   = first.type?.trim().toLowerCase() === 'cash in';
    const emoji      = isCashIn ? '📥' : '📤';
    const grandTotal = items.reduce((s: number, i: any) => s + (parseFloat(i.cost_total) || 0), 0);

    const itemLines = items.map((i: any, idx: number) => {
      const subs = [i.sub1, i.sub2, i.sub3, i.sub4, i.sub5].filter(Boolean).join(' › ');
      const cat  = subs ? `${i.category} › ${subs}` : (i.category || '—');
      return `${idx + 1}. ${i.item_description} — ${parseFloat(i.cost_total).toLocaleString()} MMK\n    📂 ${cat}`;
    }).join('\n');

    // Balance တွက် — cache data သုံး (fast)
    let totalIn = 0, totalOut = 0;
    if (cachedData?.vouchers) {
      for (const v of cachedData.vouchers) {
        const t = (v.type || '').trim().toLowerCase();
        if (t === 'cash in')
          totalIn  += Math.round(Number(v.income || v['cost_(total)'] || v.cost_total || 0));
        else
          totalOut += Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
      }
    }
    // လောလောဆယ် voucher ကို balance ထဲ ထည့်
    if (isCashIn) totalIn  += grandTotal;
    else          totalOut += grandTotal;
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

    const tRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' }),
      }
    );
    const tData = await tRes.json();
    return tData.ok ? 'sent' : `failed: ${JSON.stringify(tData)}`;
  } catch (e: any) {
    return `error: ${e.message}`;
  }
}