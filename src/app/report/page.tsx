"use client"
import React, { useEffect, useState, useMemo } from 'react';
import { Printer, ChevronLeft, RefreshCcw, FileSpreadsheet, Calendar, Filter, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ReportPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_GAS_URL!);
        const text = await res.text();
        const result = JSON.parse(text);
        setVouchers(result.vouchers || []);
      } catch (err) { setError("Network Connection Failed."); } finally { setLoading(false); }
    };
    fetchReportData();
  }, []);

  const normalizedVouchers = useMemo(() => {
    return vouchers.map(v => {
      const rawDate = v.date || v.Date || '';
      const cleanDate = rawDate.toString().split('T')[0];
      const rawAmount = v['cost_(total)'] || v.cost_total || 0;
      const itemName = v.item_description || v['item_description'] || v.item || '';

      return {
        date: cleanDate,
        voucherno: v.voucher_no || v.voucherno || '',
        category: v.category || "GENERAL EXPENSES",
        sub1: (v.sub_1 || v.sub1 || "").toString().toUpperCase(),
        sub2: (v.sub_2 || v.sub2 || "").toString().toUpperCase(),
        sub3: (v.sub_3 || v.sub3 || "").toString().toUpperCase(),
        sub4: (v.sub_4 || v.sub4 || "").toString().toUpperCase(),
        sub5: (v.sub_5 || v.sub5 || "").toString().toUpperCase(),
        note: (v.note || v.Note || "").toString().toUpperCase(),
        item: itemName,
        vendor: v.vendor || '',
        type: (v.type || "Cash Out").toString().trim(),
        cost_total: Math.round(Number(rawAmount)) 
      };
    });
  }, [vouchers]);

  const categories = useMemo(() => Array.from(new Set(normalizedVouchers.map(v => v.category).filter(Boolean))), [normalizedVouchers]);

  const filteredVouchers = useMemo(() => {
    return normalizedVouchers.filter(v => {
      const dateMatch = (!startDate || v.date >= startDate) && (!endDate || v.date <= endDate);
      const categoryMatch = !selectedCategory || v.category === selectedCategory;
      return dateMatch && categoryMatch && v.type === "Cash Out"; 
    });
  }, [normalizedVouchers, startDate, endDate, selectedCategory]);

  const groupedData = useMemo(() => {
    return filteredVouchers.reduce((acc: any, v: any) => {
      const cat = v.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(v);
      return acc;
    }, {});
  }, [filteredVouchers]);

  const grandTotal = useMemo(() => filteredVouchers.reduce((sum, item) => sum + item.cost_total, 0), [filteredVouchers]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-black text-slate-950 uppercase">
      <RefreshCcw className="animate-spin mb-4" size={48} /><p className="tracking-[0.3em] font-black">Generating Report...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-200 pb-20 print:bg-white font-black text-slate-950 uppercase">
      
      {/* 1. NO-PRINT FILTER PANEL */}
      <div className="max-w-[210mm] mx-auto p-8 space-y-6 no-print font-black">
        <div className="flex justify-between items-center font-black">
          <Link href="/" className="flex items-center text-slate-500 hover:text-slate-950 transition-all font-black text-xs"><ChevronLeft size={20} className="mr-2" /> BACK TO ANALYTICS</Link>
          <button onClick={() => window.print()} className="bg-slate-950 text-white px-10 py-4 rounded-2xl shadow-3xl hover:bg-slate-800 transition-all flex items-center font-black uppercase"><Printer className="mr-3" size={24}/> PRINT OFFICIAL REPORT</button>
        </div>

        <div className="bg-slate-950 p-8 rounded-[2rem] shadow-2xl border-b-8 border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-6 font-black text-white">
          <div className="space-y-2"><label className="text-[10px] text-slate-400 tracking-widest font-black flex items-center"><Calendar size={12} className="mr-2"/> FROM DATE</label><input type="date" className="w-full p-3 bg-slate-900 text-white rounded-xl font-black outline-none border border-slate-800 focus:border-slate-500" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div className="space-y-2"><label className="text-[10px] text-slate-400 tracking-widest font-black flex items-center"><ArrowRight size={12} className="mr-2"/> TO DATE</label><input type="date" className="w-full p-3 bg-slate-900 text-white rounded-xl font-black outline-none border border-slate-800 focus:border-slate-500" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          <div className="space-y-2"><label className="text-[10px] text-slate-400 tracking-widest font-black flex items-center"><Filter size={12} className="mr-2"/> SELECT CATEGORY</label><select className="w-full p-3 bg-slate-900 text-white rounded-xl font-black uppercase outline-none border border-slate-800 focus:border-slate-500" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}><option value="">ALL CATEGORIES</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
        </div>
      </div>

      {/* 2. OFFICIAL PRINT DOCUMENT BODY (LANDSCAPE & COMPACT) */}
      <div className="bg-white max-w-[297mm] mx-auto p-[15mm] shadow-3xl min-h-[210mm] border-t-[30px] border-slate-950 print:max-w-none print:shadow-none print:m-0 print:border-none print:p-0 font-black">
        
        {/* 🔴 HEADER SECTION (Extremely Compact) 🔴 */}
        <div className="flex justify-between border-b-8 border-slate-950 print:border-b-2 pb-12 print:pb-2 mb-12 print:mb-2 items-center font-black">
          <div className="space-y-4 print:space-y-0 font-black">
            <h1 className="text-4xl print:text-[14pt] tracking-tighter leading-none font-black text-slate-950">SHINING STARS - MA THWE</h1>
            <h2 className="text-slate-950 text-sm print:text-[10pt] tracking-[0.5em] font-black print:mt-0.5">PRIVATE HIGH SCHOOL</h2>
            
            <div className="pt-6 print:pt-1 flex flex-col print:flex-row print:gap-6 space-y-1 print:space-y-0 text-[10px] print:text-[9pt] text-slate-500 tracking-widest font-black uppercase">
              <p>REPORT DATE: {new Date().toLocaleDateString()}</p>
              <p>RANGE: {startDate || 'START'} TO {endDate || 'PRESENT'}</p>
              <p className="print:hidden">STATUS: OFFICIAL EXPENDITURE LEDGER</p>
            </div>
          </div>
          <div className="relative w-28 h-28 print:w-10 print:h-10 font-black">
            <Image src="/logo.png" alt="School Logo" fill className="object-contain" priority />
          </div>
        </div>

        {Object.keys(groupedData).length > 0 ? Object.keys(groupedData).map((cat) => (
          <div key={cat} className="mb-16 print:mb-3 last:mb-0 break-inside-avoid font-black">
            <div className="flex items-center justify-between bg-slate-950 text-white px-8 print:px-2 py-5 print:py-1 rounded-2xl print:rounded-none mb-6 print:mb-1 border-l-[15px] print:border-l-[4px] border-slate-700 font-black uppercase">
              <h3 className="text-lg print:text-[11pt] tracking-widest font-black">{cat} EXPENSES</h3>
              <FileSpreadsheet size={20} className="text-slate-400 print:hidden" />
            </div>
            
            <table className="w-full border-collapse font-black">
              <thead>
                <tr className="bg-slate-50 border-b-4 border-slate-950 text-[10px] print:text-[9pt] text-slate-500 font-black uppercase">
                  <th className="py-5 print:py-1 px-3 print:px-1 text-left font-black w-32 print:w-32">DATE / ID</th>
                  <th className="py-5 print:py-1 px-3 print:px-1 text-left font-black">PARTICULARS & NOTES</th>
                  <th className="py-5 print:py-1 px-3 print:px-1 text-right font-black w-48 print:w-40">AMOUNT (MMK)</th>
                </tr>
              </thead>
              <tbody className="text-[11px] print:text-[10pt] font-black uppercase">
                {groupedData[cat].map((v: any, idx: number) => (
                  <tr key={idx} className="border-b-2 print:border-b border-slate-100 print:border-slate-300 font-black hover:bg-slate-50 print:break-inside-avoid">
                    {/* 🔴 ROW PADDING ကို အကျဉ်းဆုံး လျှော့ချထားပါသည် (print:py-1) 🔴 */}
                    <td className="py-6 print:py-1 px-3 print:px-1 align-top font-black">
                      <span className="text-[10px] print:text-[9pt] block mb-1 print:mb-0 font-black text-slate-500">{v.date}</span>
                      <span className="text-slate-950 text-xs print:text-[10pt] font-black">{v.voucherno}</span>
                    </td>
                    <td className="py-6 print:py-1 px-3 print:px-1 font-black">
                      <div className="text-sm print:text-[10pt] leading-tight mb-2 print:mb-0.5 font-black text-slate-950">{v.item}</div>
                      <div className="text-[9px] print:text-[9pt] text-slate-500 font-black flex flex-wrap gap-1 items-center">
                        <span className="bg-slate-200 print:bg-transparent print:border print:border-slate-300 px-2 print:px-1 py-1 print:py-0 rounded-md print:rounded-none text-slate-950">{v.vendor || 'GENERAL'}</span>
                        {[v.sub1, v.sub2, v.sub3, v.sub4, v.sub5].filter(Boolean).map((sub, i) => (
                          <span key={i} className="flex items-center">
                            <span className="text-slate-400 mx-1">/</span>
                            {sub}
                          </span>
                        ))}
                      </div>
                      
                      {v.note && (
                        <div className="mt-3 print:mt-0.5 p-3 print:p-0.5 bg-slate-100 print:bg-transparent text-slate-950 text-[10px] print:text-[9pt] rounded-xl print:rounded-none border-l-4 print:border-l-2 border-slate-950 font-black w-fit max-w-full print:italic">
                          📝 {v.note}
                        </div>
                      )}
                    </td>
                    <td className="py-6 print:py-1 px-3 print:px-1 text-right text-xl print:text-[11pt] font-black align-top text-rose-600">
                      - {v.cost_total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 print:bg-slate-200 text-white print:text-slate-950 font-black">
                  <td colSpan={2} className="p-6 print:p-1 text-right text-xs print:text-[10pt] tracking-widest uppercase font-black">SUB-TOTAL ({cat})</td>
                  <td className="p-6 print:p-1 text-right text-2xl print:text-[12pt] font-black text-rose-500 print:text-rose-600">- {groupedData[cat].reduce((s: number, i: any) => s + i.cost_total, 0).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )) : (
          <div className="text-center py-40 print:py-6 text-slate-300 font-black border-4 border-dashed border-slate-100 rounded-[3rem] uppercase print:text-[12pt]">
            NO RECORDS FOUND FOR THE SELECTED RANGE
          </div>
        )}

        <div className="mt-20 print:mt-4 pt-10 print:pt-2 border-t-8 print:border-t-2 border-slate-950 bg-slate-50 print:bg-transparent p-10 print:p-1 flex justify-between items-center rounded-3xl print:rounded-none font-black break-inside-avoid">
          <span className="text-xl print:text-[12pt] tracking-[0.4em] print:tracking-widest text-slate-500 font-black uppercase">NET EXPENSE LEDGER</span>
          <span className="text-6xl print:text-[14pt] font-black text-rose-600">- {grandTotal.toLocaleString()} <span className="text-sm print:text-[10pt] opacity-50 font-black text-slate-950">MMK</span></span>
        </div>

        <div className="mt-40 print:mt-8 grid grid-cols-3 gap-20 print:gap-10 text-center text-[10px] print:text-[9pt] tracking-widest font-black uppercase break-inside-avoid text-slate-950">
          <div className="space-y-24 print:space-y-6 font-black"><div className="h-[3px] print:h-[1px] bg-slate-950 w-full"></div><span>ACCOUNTANT SIGNATURE</span></div>
          <div className="space-y-24 print:space-y-6 font-black"><div className="h-[3px] print:h-[1px] bg-slate-950 w-full"></div><span>OFFICE VERIFIED</span></div>
          <div className="space-y-24 print:space-y-6 font-black"><div className="h-[3px] print:h-[1px] bg-slate-950 w-full"></div><span>APPROVED BY</span></div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { 
            background: white !important; 
            padding: 0 !important; 
            margin: 0 !important; 
          }
          @page { 
            size: A4 landscape; 
            margin: 10mm; 
          } 
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
        }
      `}</style>
    </div>
  );
}
