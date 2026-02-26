"use client"
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import VoucherForm from '@/components/VoucherForm';

export default function EntryPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8 font-black uppercase text-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center text-slate-500 hover:text-purple-900 transition-colors font-black text-xs tracking-widest">
          <ChevronLeft size={18} strokeWidth={3} className="mr-1" /> BACK TO ANALYTICS
        </Link>
        
        {/* UI ကို ပိုမိုကျစ်လျစ်အောင် ပြင်ဆင်ထားသည် */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
           <VoucherForm onRefresh={() => {}} />
        </div>
      </div>
    </main>
  );
}