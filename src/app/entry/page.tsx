"use client"
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Layers } from 'lucide-react';
import VoucherForm from '@/components/VoucherForm';

export default function EntryPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-black uppercase text-slate-950 pb-20">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-10 space-y-8">
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 pb-6 border-b-8 border-slate-950 font-black">
          <Link href="/" className="flex items-center text-slate-500 hover:text-pink-600 transition-all font-black text-xs w-fit">
            <ChevronLeft size={20} className="mr-2" /> BACK TO DASHBOARD
          </Link>
          
          <div className="flex items-center gap-4 text-right justify-end font-black">
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tighter text-slate-950">VOUCHER ENTRY</h1>
              <p className="text-pink-600 text-[10px] tracking-[0.2em] font-black">SHINING STARS - MA THWE</p>
            </div>
            <div className="relative w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 shrink-0 hidden md:block">
               <Image src="/logo.png" alt="School Logo" fill sizes="50px" className="object-contain p-1" priority />
            </div>
          </div>
        </div>

        <section className="bg-white rounded-[3rem] shadow-3xl border border-slate-100 overflow-hidden font-black">
          <div className="bg-slate-950 p-6 text-yellow-400 flex items-center gap-3 font-black">
            <Layers size={20}/> <span className="text-xs tracking-widest font-black uppercase">SECURE DATA SUBMISSION</span>
          </div>
          {/* 🔴 စာရင်းသွင်းပြီးလျှင် Dashboard သို့ မကန်ထုတ်ဘဲ အပေါ်ဆုံးသို့သာ Scroll ပြန်တက်မည် 🔴 */}
          <VoucherForm onRefresh={() => {
             window.scrollTo({ top: 0, behavior: 'smooth' });
          }} />
        </section>

      </div>
    </main>
  );
}
