import { NextResponse } from 'next/server';
import { WEB_APP_URL } from '@/lib/api';

export async function GET() {
  try {
    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getInitialData' })
    });
    
    const data = await res.json();
    
    if (data.success) {
      const pendingCount = (data.leaves || []).filter(l => l.Status === 'Pending').length;
      return NextResponse.json({ count: pendingCount });
    } else {
      return NextResponse.json({ count: 0 });
    }
  } catch (error) {
    console.error('Error fetching pending count:', error);
    return NextResponse.json({ count: 0 });
  }
}