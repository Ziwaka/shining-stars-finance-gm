import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = process.env.GAS_URL!;

let cache: any = null;
let cacheTime = 0;
const TTL = 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cacheTime < TTL) return NextResponse.json(cache);
  try {
    const res = await fetch(`${GAS_URL}?action=getVehicles`, { cache: 'no-store' });
    const data = await res.json();
    cache = data;
    cacheTime = Date.now();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ records: [], error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  cache = null;
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}