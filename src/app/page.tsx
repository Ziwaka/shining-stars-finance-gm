"use client"
import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, Cpu, CheckCircle2, Plus, ArrowRight, Landmark, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import FinancialDashboard from '@/components/FinancialDashboard';

export default function Home() {
  const [phase, setPhase] = useState<'splash' | 'dashboard'>('splash');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('SYSTEM - INITIALIZING');
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const fetchVouchers = useCallback(async () => {
    setDataLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/gas', { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      setVouchers(data.vouchers || []);
    } catch (err) {
      console.error("Data Fetch Error", err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    // ✅ Data fetch ကို splash နဲ့ parallel ပြေးသည် — dashboard ဝင်ချိန်မှာ data အသင့်ရှိမည်
    fetchVouchers();

    if (sessionStorage.getItem('splashShown')) {
      setPhase('dashboard');
      return;
    }

    const timer = setInterval(() => {
      setProgress(old => {
        if (old >= 100) {
          clearInterval(timer);
          setStatus('SYSTEM - READY');
          sessionStorage.setItem('splashShown', 'true');
          return 100;
        }
        if (old < 30) setStatus('SYSTEM - ONLINE CHECKING...');
        else if (old < 60) setStatus('INTERNET - STABILIZING...');
        else if (old < 90) setStatus('DATA - PROCESSING ARCHIVES...');
        return old + 1;
      });
    }, 60);

    return () => clearInterval(timer);
  }, [fetchVouchers]);

  if (phase === 'splash') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-black text-slate-950 uppercase overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200 blur-[150px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-200 blur-[150px] animate-pulse delay-700"></div>
        </div>

        <div className="relative z-10 w-full max-w-md space-y-12">
          <div className="flex flex-col items-center space-y-6">
            <div className="relative w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-lg animate-bounce p-2 border border-slate-200">
              <Image src="/logo.png" alt="Shining Stars Logo" fill sizes="150px" className="object-contain p-4" priority />
              <div className="absolute -bottom-3 -right-3 bg-white border border-slate-200 text-slate-950 p-3 rounded-full shadow-md">
                <Landmark size={20} className="font-black"/>
              </div>
            </div>
            <div className="text-center space-y-2 font-black">
              <h1 className="text-2xl tracking-[0.1em] font-black text-slate-950">SHINING STARS - MA THWE</h1>
              <h2 className="text-xs tracking-[0.4em] text-slate-600 font-black">PRIVATE HIGH SCHOOL</h2>
              <p className="text-[10px] text-slate-500 tracking-widest font-black mt-2">FINANCIAL STATUS DASHBOARD</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-xl space-y-6 font-black">
            <div className="flex items-center justify-between text-[10px] tracking-widest text-slate-500 font-black">
              <span className="flex items-center gap-2"><Cpu size={14}/> SYSTEM: ONLINE</span>
              <span className="flex items-center gap-2">
                <Wifi size={14} className={isOnline ? 'text-emerald-600' : 'text-rose-600'}/>
                INTERNET: {isOnline ? 'STABLE' : 'CHECKING'}
              </span>
            </div>
            <div className="space-y-3 font-black">
              <div className="flex justify-between items-end font-black">
                <span className="text-[12px] text-slate-600 font-black">{status}</span>
                <span className="text-2xl font-black text-slate-950">{progress}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div className="h-full bg-slate-950 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 font-black">
              <div className="flex items-center gap-2 text-[9px] text-slate-500 font-black">
                <CheckCircle2 size={12} className={progress > 30 ? 'text-slate-950' : 'text-slate-300'}/> INITIALIZING
              </div>
              <div className="flex items-center gap-2 text-[9px] text-slate-500 font-black">
                <CheckCircle2 size={12} className={progress > 70 ? 'text-slate-950' : 'text-slate-300'}/> PROCESSING
              </div>
            </div>
          </div>

          <div className="h-16 flex items-center justify-center font-black">
            {progress === 100 ? (
              <button
                onClick={() => setPhase('dashboard')}
                className="w-full bg-slate-950 text-white py-4 rounded-2xl text-sm hover:bg-slate-800 transition-all shadow-lg font-black flex justify-center items-center gap-2"
              >
                ENTER SYSTEM <ArrowRight size={18} />
              </button>
            ) : (
              <p className="text-center text-slate-400 text-[10px] tracking-[0.3em] font-black animate-pulse">AUTHORIZING ACCESS...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 font-black uppercase text-slate-950">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-12">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-slate-200 pb-10 font-black print:hidden">
          <div className="flex items-center gap-6 font-black">
            <div className="relative w-24 h-24 bg-white rounded-[2rem] shadow-sm p-2 border border-slate-200 shrink-0">
               <Image src="/logo.png" alt="School Logo" fill sizes="100px" className="object-contain p-2" priority />
            </div>
            <div className="space-y-1 font-black">
              <h1 className="text-3xl lg:text-4xl font-black tracking-tighter text-slate-950">SHINING STARS - MA THWE</h1>
              <p className="text-slate-500 text-xs tracking-[0.4em] font-black uppercase">PRIVATE HIGH SCHOOL</p>
              <div className="inline-block bg-slate-200 text-slate-950 px-4 py-1.5 rounded-full text-[10px] tracking-widest font-black mt-2">
                FINANCIAL STATUS DASHBOARD
              </div>
            </div>
          </div>

          <div className="flex gap-4 items-center font-black">
            {/* ✅ Data loading indicator */}
            {dataLoading ? (
              <div className="hidden lg:flex bg-white px-6 py-4 rounded-3xl border border-slate-200 shadow-sm items-center gap-3 font-black">
                <RefreshCcw size={14} className="animate-spin text-slate-500" />
                <span className="text-[10px] font-black text-slate-500">SYNCING...</span>
              </div>
            ) : (
              <div className="hidden lg:flex bg-white px-6 py-4 rounded-3xl border border-slate-200 shadow-sm items-center gap-3 font-black">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                <span className="text-[10px] font-black text-slate-950">LIVE SYNC</span>
              </div>
            )}
            <Link href="/entry" className="bg-slate-950 text-white px-8 py-4 rounded-3xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 font-black text-sm">
              <Plus size={18} strokeWidth={3} /> ADD NEW VOUCHER
            </Link>
          </div>
        </div>

        <section className="space-y-6 font-black">
          {dataLoading && vouchers.length === 0 ? (
            // ✅ Dashboard loading skeleton
            <div className="flex flex-col items-center justify-center py-40 gap-6">
              <RefreshCcw className="animate-spin text-slate-400" size={40} />
              <p className="text-[10px] tracking-[0.3em] text-slate-400 font-black">LOADING FINANCIAL DATA...</p>
            </div>
          ) : (
            <FinancialDashboard vouchers={vouchers} onRefresh={fetchVouchers} />
          )}
        </section>

      </div>
    </main>
  );
}
