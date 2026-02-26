"use client"
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RefreshCcw, PlusCircle, FileText } from 'lucide-react';
import FinancialDashboard from '@/components/FinancialDashboard';

export default function Home() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_GAS_URL!);
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        setVouchers(data.vouchers || []);
      } catch (e) { console.error("Data error: Check GAS access."); }
    } catch (err) { console.error("Network error."); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-black uppercase text-slate-950">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* TOP BRANDING & ACTION BAR */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-10 rounded-[3rem] shadow-2xl border-b-[10px] border-purple-900 transition-all">
          <div className="flex items-center gap-8 mb-8 md:mb-0">
            <div className="relative w-24 h-24 bg-purple-50 rounded-3xl overflow-hidden border-4 border-purple-100 flex items-center justify-center">
              <Image src="/logo.png" alt="School Logo" fill className="object-contain p-2" priority />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl tracking-tighter leading-none font-black">SHINING STARS - MA THWE</h1>
              <p className="text-purple-700 tracking-[0.5em] mt-3 text-sm font-black">Private High School</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {/* NEW ENTRY BUTTON [cite: 2026-02-23] */}
            <Link href="/entry">
              <button className="bg-purple-900 text-white px-8 py-5 rounded-2xl flex items-center shadow-xl hover:bg-slate-950 transition-all transform active:scale-95 font-black">
                <PlusCircle className="mr-3" size={24} /> CREATE NEW ENTRY
              </button>
            </Link>
            <Link href="/report">
              <button className="bg-slate-950 text-white px-8 py-5 rounded-2xl flex items-center shadow-xl hover:bg-purple-900 transition-all transform active:scale-95 font-black">
                <FileText className="mr-3" size={24} /> VIEW OFFICIAL REPORT
              </button>
            </Link>
            <button onClick={loadData} className={`p-5 bg-slate-100 rounded-2xl text-purple-900 shadow-md ${loading ? 'animate-spin opacity-50' : 'hover:bg-slate-200'}`}>
              <RefreshCcw size={24} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* MAIN DASHBOARD ANALYTICS [cite: 2026-02-23] */}
        <div className="relative transition-opacity duration-500" style={{ opacity: loading ? 0.5 : 1 }}>
           <FinancialDashboard vouchers={vouchers} />
        </div>

      </div>
    </main>
  );
}