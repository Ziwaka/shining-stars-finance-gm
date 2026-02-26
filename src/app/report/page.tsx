"use client"
import React, { useEffect, useState, useMemo } from 'react';
import { Printer, ChevronLeft, RefreshCcw, FileSpreadsheet, Calendar, Filter, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ReportPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States [cite: 2026-02-23]
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_GAS_URL!);
        const text = await res.text();
        try {
          const result = JSON.parse(text);
          setVouchers(result.vouchers || []);
        } catch (jsonErr) {
          setError("Invalid Data Format from Cloud.");
        }
      } catch (err) {
        setError("Network Connection Failed.");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  // Dropdown အတွက် Unique Categories ထုတ်ယူခြင်း [cite: 2026-02-23]
  const categories = useMemo(() => {
    const cats = vouchers.map(v => v.category).filter(Boolean);
    return Array.from(new Set(cats));
  }, [vouchers]);

  // ဒေတာများကို Date Range နှင့် Category အလိုက် စစ်ထုတ်ခြင်း [cite: 2026-02-23]
  const filteredVouchers = useMemo(() => {
    return vouchers.filter(v => {
      const vDate = v.date || '';
      const dateMatch = (!startDate || vDate >= startDate) && (!endDate || vDate <= endDate);
      const categoryMatch = !selectedCategory || v.category === selectedCategory;
      return dateMatch && categoryMatch;
    });
  }, [vouchers, startDate, endDate, selectedCategory]);

  // စစ်ထုတ်ပြီးသား ဒေတာများကို Category အလိုက် အုပ်စုဖွဲ့ခြင်း [cite: 2026-02-23]
  const groupedData = useMemo(() => {
    return filteredVouchers.reduce((acc: any, v: any) => {
      const cat = v.category || "GENERAL EXPENSES";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(v);
      return acc;
    }, {});
  }, [filteredVouchers]);

  const grandTotal = useMemo(() => 
    filteredVouchers.reduce((sum, item) => sum + Number(item.cost_total || 0), 0)
  , [filteredVouchers]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-black text-purple-900 uppercase">
      <RefreshCcw className="animate-spin mb-4" size={48} />
      <p className="tracking-[0.3em] font-black">Generating Filterable Audit Report...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-200 pb-20 print:bg-white font-black text-slate-950 uppercase">
      
      {/* 1. NO-PRINT FILTER PANEL (GM Control Center) [cite: 2026-02-23] */}
      <div className="max-w-[210mm] mx-auto p-8 space-y-6 no-print">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center text-slate-500 hover:text-purple-900 transition-all font-black text-xs">
            <ChevronLeft size={20} className="mr-2" /> BACK TO ANALYTICS
          </Link>
          <button 
            onClick={() => window.print()} 
            className="bg-purple-900 text-white px-10 py-4 rounded-2xl shadow-3xl hover:bg-slate-950 transition-all flex items-center font-black"
          >
            <Printer className="mr-3" size={24}/> PRINT FILTERED REPORT
          </button>
        </div>

        {/* Filter Selection UI */}
        <div className="bg-slate-950 p-8 rounded-[2rem] shadow-2xl border-b-8 border-purple-900 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] text-purple-400 tracking-widest font-black flex items-center"><Calendar size={12} className="mr-2"/> FROM DATE</label>
            <input type="date" className="w-full p-3 bg-slate-900 text-white rounded-xl outline-none border border-slate-800 focus:border-purple-500 font-black" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-purple-400 tracking-widest font-black flex items-center"><ArrowRight size={12} className="mr-2"/> TO DATE</label>
            <input type="date" className="w-full p-3 bg-slate-900 text-white rounded-xl outline-none border border-slate-800 focus:border-purple-500 font-black" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-purple-400 tracking-widest font-black flex items-center"><Filter size={12} className="mr-2"/> SELECT CATEGORY</label>
            <select className="w-full p-3 bg-slate-900 text-white rounded-xl outline-none border border-slate-800 focus:border-purple-500 font-black uppercase" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              <option value="">ALL CATEGORIES</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 2. OFFICIAL A4 DOCUMENT BODY [cite: 2026-02-23] */}
      <div className="bg-white max-w-[210mm] mx-auto p-[15mm] shadow-3xl min-h-[297mm] border-t-[30px] border-purple-900 print:shadow-none print:m-0 print:p-[10mm]">
        
        {/* Header */}
        <div className="flex justify-between border-b-8 border-slate-950 pb-12 mb-12 items-start font-black">
          <div className="space-y-4 font-black">
            <h1 className="text-4xl tracking-tighter leading-none font-black">SHINING STARS - MA THWE</h1>
            <h2 className="text-purple-900 text-sm tracking-[0.5em] font-black font-black">PRIVATE HIGH SCHOOL</h2>
            <div className="pt-6 space-y-1 text-[10px] text-slate-400 tracking-widest font-black">
              <p>REPORT DATE: {new Date().toLocaleDateString()}</p>
              <p>REPORT RANGE: {startDate || 'START'} TO {endDate || 'PRESENT'}</p>
              <p>STATUS: VERIFIED LEDGER RECORD</p>
            </div>
          </div>
          <div className="relative w-28 h-28 font-black">
            <Image src="/logo.png" alt="School Logo" fill className="object-contain" priority />
          </div>
        </div>

        {/* Categorized Content [cite: 2026-02-23] */}
        {Object.keys(groupedData).length > 0 ? Object.keys(groupedData).map((cat) => (
          <div key={cat} className="mb-16 last:mb-0 break-inside-avoid font-black">
            <div className="flex items-center justify-between bg-slate-950 text-white px-8 py-5 rounded-2xl mb-6 border-l-[15px] border-purple-600 font-black">
              <h3 className="text-lg tracking-widest font-black uppercase font-black">{cat} EXPENSES</h3>
              <FileSpreadsheet size={20} className="text-purple-400" />
            </div>
            
            <table className="w-full border-collapse font-black">
              <thead>
                <tr className="bg-slate-50 border-b-4 border-slate-950 text-[10px] text-slate-500 font-black">
                  <th className="py-5 px-3 text-left font-black uppercase">DATE / VOUCHER ID</th>
                  <th className="py-5 px-3 text-left font-black uppercase">PARTICULARS / VENDOR</th>
                  <th className="py-5 px-3 text-right font-black uppercase">AMOUNT (MMK)</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-black uppercase">
                {groupedData[cat].map((v: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-100 font-black hover:bg-slate-50">
                    <td className="py-6 px-3 align-top font-black">
                      <span className="text-[9px] text-slate-400 block mb-1 font-black">{v.date}</span>
                      <span className="text-purple-900 font-black text-sm font-black">{v.voucherno}</span>
                    </td>
                    <td className="py-6 px-3 font-black">
                      <div className="text-xs leading-tight mb-1 font-black">{v.item}</div>
                      <div className="text-[9px] text-slate-400 font-black uppercase italic font-black">{v.vendor}</div>
                    </td>
                    <td className="py-6 px-3 text-right text-xl font-black font-black">
                      {Number(v.cost_total || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-purple-50 text-purple-900 font-black">
                  <td colSpan={2} className="p-6 text-right text-xs tracking-widest uppercase font-black font-black">
                    SUB-TOTAL FOR {cat}
                  </td>
                  <td className="p-6 text-right text-2xl font-black font-black font-black">
                    {groupedData[cat].reduce((s: number, i: any) => s + Number(i.cost_total || 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )) : (
          <div className="text-center py-40 text-slate-300 font-black border-4 border-dashed border-slate-100 rounded-[3rem]">
            NO RECORDS FOUND FOR THE SELECTED RANGE
          </div>
        )}

        {/* Grand Total [cite: 2026-02-23] */}
        <div className="mt-20 pt-10 border-t-8 border-slate-950 bg-slate-50 p-10 flex justify-between items-center rounded-3xl font-black font-black">
          <span className="text-xl tracking-[0.4em] text-slate-400 font-black">NET GRAND TOTAL LEDGER</span>
          <span className="text-6xl font-black text-purple-900 font-black">
            {grandTotal.toLocaleString()} <span className="text-sm opacity-50 font-black">MMK</span>
          </span>
        </div>

        {/* Signatures [cite: 2026-02-23] */}
        <div className="mt-40 grid grid-cols-3 gap-20 text-center text-[10px] tracking-widest font-black">
          <div className="space-y-24 font-black font-black"><div className="h-[2px] bg-slate-950 w-full font-black"></div><span>ACCOUNTANT SIGNATURE</span></div>
          <div className="space-y-24 font-black font-black"><div className="h-[2px] bg-slate-950 w-full font-black"></div><span>OFFICE VERIFIED</span></div>
          <div className="space-y-24 font-black font-black"><div className="h-[2px] bg-slate-950 w-full font-black"></div><span>APPROVED BY (GM)</span></div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
}