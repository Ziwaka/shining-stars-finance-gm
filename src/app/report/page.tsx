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
        const noCacheUrl = `${process.env.NEXT_PUBLIC_GAS_URL}?t=${Date.now()}`;
        const res = await fetch(noCacheUrl);
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
        category: (v.category || "UNCLASSIFIED").toString().toUpperCase(),
        sub1: (v.sub_1 || v.sub1 || "").toString().toUpperCase(),
        sub2: (v.sub_2 || v.sub2 || "").toString().toUpperCase(),
        sub3: (v.sub_3 || v.sub3 || "").toString().toUpperCase(),
        sub4: (v.sub_4 || v.sub4 || "").toString().toUpperCase(),
        sub5: (v.sub_5 || v.sub5 || "").toString().toUpperCase(),
        note: (v.note || v.Note || "").toString().toUpperCase(),
        item: itemName,
        vendor: (v.vendor || v.Vendor || '').toString(),
        type: (v.type || v.Type || "Cash Out").toString().trim(),
        cost_total: Math.round(Number(rawAmount)),
        entered_by: (v.entered_by || v.Entered_By || 'GM').toString().toUpperCase(),
        account: (v.account || v.Account || 'GM ACCOUNT').toString().toUpperCase()
      };
    });
  }, [vouchers]);

  const categories = useMemo(() => Array.from(new Set(normalizedVouchers.map(v => v.category).filter(Boolean))), [normalizedVouchers]);

  const filteredVouchers = useMemo(() => {
    return normalizedVouchers.filter(v => {
      const dateMatch = (!startDate || v.date >= startDate) && (!endDate || v.date <= endDate);
      const categoryMatch = !selectedCategory || v.category === selectedCategory;
      return dateMatch && categoryMatch; 
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

  const grandTotal = useMemo(() => {
    return filteredVouchers.reduce((sum, item) => {
      return item.type === "Cash In" ? sum + item.cost_total : sum - item.cost_total;
    }, 0);
  }, [filteredVouchers]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-black text-slate-950 uppercase">
      <RefreshCcw className="animate-spin mb-4 text-slate-950" size={48} /><p className="tracking-[0.3em] font-black text-slate-950">Generating Report...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-200 pb-20 print:bg-white font-black text-slate-950 uppercase">
      
      <div className="max-w-[210mm] mx-auto p-8 space-y-6 no-print font-black">
        <div className="flex justify-between items-center font-black">
          <Link href="/" className="flex items-center text-slate-600 hover:text-slate-950 transition-all font-black text-xs">
            <ChevronLeft size={20} className="mr-2" /> BACK TO DASHBOARD
          </Link>
          <button onClick={() => window.print()} className="bg-slate-950 text-white px-10 py-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center font-black uppercase">
            <Printer className="mr-3" size={24}/> PRINT OFFICIAL REPORT
          </button>
        </div>

        <div className="bg-white border border-slate-300 p-8 rounded-[2rem] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 font-black text-slate-950">
          <div className="space-y-2"><label className="text-[10px] text-slate-500 tracking-widest font-black flex items-center"><Calendar size={12} className="mr-2"/> FROM DATE</label><input type="date" className="w-full p-3 bg-slate-50 text-slate-950 rounded-xl font-black outline-none border border-slate-300 focus:border-slate-500" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
          <div className="space-y-2"><label className="text-[10px] text-slate-500 tracking-widest font-black flex items-center"><ArrowRight size={12} className="mr-2"/> TO DATE</label><input type="date" className="w-full p-3 bg-slate-50 text-slate-950 rounded-xl font-black outline-none border border-slate-300 focus:border-slate-500" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
          <div className="space-y-2"><label className="text-[10px] text-slate-500 tracking-widest font-black flex items-center"><Filter size={12} className="mr-2"/> SELECT CATEGORY</label><select className="w-full p-3 bg-slate-50 text-slate-950 rounded-xl font-black uppercase outline-none border border-slate-300 focus:border-slate-500" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}><option value="">ALL CATEGORIES</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
        </div>
      </div>

      <div className="bg-white max-w-[297mm] mx-auto p-[15mm] shadow-2xl min-h-[210mm] border-t-[20px] border-slate-950 print:max-w-none print:shadow-none print:m-0 print:border-none print:p-0 font-black relative overflow-hidden">
        
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none print:opacity-[0.03]">
           <div className="relative w-[500px] h-[500px]">
             <Image src="/logo.png" alt="Watermark" fill className="object-contain grayscale" />
           </div>
        </div>

        <div className="relative z-10">
          <div className="flex justify-between border-b-8 border-slate-950 print:border-b-4 pb-10 print:pb-4 mb-10 print:mb-4 items-center font-black">
            <div className="space-y-4 print:space-y-1 font-black">
              <h1 className="text-4xl print:text-[16pt] tracking-tighter leading-none font-black text-slate-950">SHINING STARS - MA THWE</h1>
              <h2 className="text-slate-600 text-sm print:text-[10pt] tracking-[0.5em] font-black print:mt-0.5">PRIVATE HIGH SCHOOL</h2>
              
              <div className="pt-6 print:pt-2 flex flex-col print:flex-row print:gap-8 space-y-1 print:space-y-0 text-[10px] print:text-[9pt] text-slate-500 tracking-widest font-black uppercase">
                <p>REPORT DATE: {new Date().toLocaleDateString()}</p>
                <p>RANGE: {startDate || 'START'} TO {endDate || 'PRESENT'}</p>
                <p className="print:hidden text-slate-950">STATUS: OFFICIAL EXPENDITURE LEDGER</p>
              </div>
            </div>
            <div className="relative w-32 h-32 print:w-16 print:h-16 font-black bg-white rounded-2xl p-2 print:p-0 border border-slate-200 print:border-0">
              <Image src="/logo.png" alt="School Logo" fill sizes="150px" className="object-contain p-2 print:p-0" priority />
            </div>
          </div>

          {Object.keys(groupedData).length > 0 ? Object.keys(groupedData).map((cat) => (
            <div key={cat} className="mb-12 print:mb-4 last:mb-0 break-inside-avoid font-black">
              <div className="flex items-center justify-between bg-slate-100 text-slate-950 px-6 print:px-2 py-4 print:py-1 rounded-2xl print:rounded-none mb-4 print:mb-2 border-l-[10px] print:border-l-[4px] border-slate-400 font-black uppercase">
                <h3 className="text-lg print:text-[11pt] tracking-widest font-black text-slate-950">{cat}</h3>
                <FileSpreadsheet size={20} className="text-slate-400 print:hidden" />
              </div>
              
              <table className="w-full border-collapse font-black">
                <thead>
                  <tr className="bg-slate-50 border-b-4 border-slate-300 text-[10px] print:text-[9pt] text-slate-600 font-black uppercase">
                    <th className="py-4 print:py-1 px-3 print:px-1 text-left font-black w-32 print:w-32">DATE / ID</th>
                    <th className="py-4 print:py-1 px-3 print:px-1 text-left font-black">PARTICULARS & ACCOUNTS</th>
                    <th className="py-4 print:py-1 px-3 print:px-1 text-right font-black w-48 print:w-40">AMOUNT (MMK)</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] print:text-[10pt] font-black uppercase">
                  {groupedData[cat].map((v: any, idx: number) => (
                    <tr key={idx} className="border-b print:border-b border-slate-200 print:border-slate-300 font-black hover:bg-slate-50 print:break-inside-avoid">
                      <td className="py-4 print:py-1 px-3 print:px-1 align-top font-black">
                        <span className="text-[10px] print:text-[9pt] block mb-1 print:mb-0 font-black text-slate-500">{v.date}</span>
                        <span className="text-slate-950 text-xs print:text-[10pt] font-black">{v.voucherno}</span>
                      </td>
                      <td className="py-4 print:py-1 px-3 print:px-1 font-black">
                        <div className="text-sm print:text-[10pt] leading-tight mb-2 print:mb-0.5 font-black text-slate-950 flex items-center gap-2">
                           {v.item}
                           {v.type === 'Cash In' && <span className="text-[8px] bg-slate-200 text-slate-950 px-1 py-0.5 rounded print:border print:border-slate-300 border-none">IN</span>}
                        </div>
                        <div className="text-[9px] print:text-[9pt] text-slate-500 font-black flex flex-wrap gap-1 items-center">
                          <span className="bg-white border border-slate-300 print:bg-transparent print:text-slate-950 print:border print:border-slate-300 px-2 print:px-1 py-1 print:py-0 rounded-md print:rounded-none text-slate-950">{v.vendor || 'GENERAL'}</span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-700">{v.account} ({v.entered_by})</span>
                          {[v.sub1, v.sub2, v.sub3, v.sub4, v.sub5].filter(Boolean).map((sub, i) => (
                            <span key={i} className="flex items-center">
                              <span className="text-slate-400 mx-1">/</span>
                              {sub}
                            </span>
                          ))}
                        </div>
                        
                        {v.note && (
                          <div className="mt-2 print:mt-0.5 p-2 print:p-0.5 bg-slate-50 print:bg-transparent text-slate-700 text-[10px] print:text-[9pt] rounded-xl print:rounded-none border-l-2 print:border-l border-slate-300 font-black w-fit max-w-full print:italic">
                            📝 {v.note}
                          </div>
                        )}
                      </td>
                      <td className={`py-4 print:py-1 px-3 print:px-1 text-right text-lg print:text-[11pt] font-black align-top ${v.type === 'Cash In' ? 'text-emerald-600' : 'text-slate-950'}`}>
                        {v.type === 'Cash In' ? '+' : '-'} {v.cost_total.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 print:bg-slate-200 text-slate-950 font-black border-t-4 border-slate-300">
                    <td colSpan={2} className="p-4 print:p-1 text-right text-xs print:text-[10pt] tracking-widest uppercase font-black text-slate-600">SUB-TOTAL ({cat})</td>
                    <td className="p-4 print:p-1 text-right text-xl print:text-[12pt] font-black">
                      {groupedData[cat].reduce((s: number, i: any) => i.type === 'Cash In' ? s + i.cost_total : s - i.cost_total, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )) : (
            <div className="text-center py-40 print:py-6 text-slate-400 font-black border-4 border-dashed border-slate-200 rounded-[3rem] uppercase print:text-[12pt]">
              NO RECORDS FOUND FOR THE SELECTED RANGE
            </div>
          )}

          <div className="mt-16 print:mt-6 pt-8 print:pt-2 border-t-8 print:border-t-4 border-slate-950 bg-slate-50 print:bg-transparent p-10 print:p-2 flex justify-between items-center rounded-3xl print:rounded-none font-black break-inside-avoid">
            <span className="text-xl print:text-[12pt] tracking-[0.4em] print:tracking-widest text-slate-600 font-black uppercase">NET BALANCE LEDGER</span>
            <span className={`text-6xl print:text-[16pt] font-black ${grandTotal < 0 ? 'text-rose-600' : 'text-slate-950'}`}>
              {grandTotal < 0 ? '-' : '+'} {Math.abs(grandTotal).toLocaleString()} <span className="text-sm print:text-[10pt] opacity-50 font-black text-slate-500">MMK</span>
            </span>
          </div>

          <div className="mt-32 print:mt-12 grid grid-cols-3 gap-20 print:gap-10 text-center text-[10px] print:text-[10pt] tracking-widest font-black uppercase break-inside-avoid text-slate-600">
            <div className="space-y-24 print:space-y-8 font-black"><div className="h-[3px] print:h-[1px] bg-slate-950 w-full"></div><span>ACCOUNTANT SIGNATURE</span></div>
            <div className="space-y-24 print:space-y-8 font-black"><div className="h-[3px] print:h-[1px] bg-slate-950 w-full"></div><span>OFFICE VERIFIED</span></div>
            <div className="space-y-24 print:space-y-8 font-black"><div className="h-[3px] print:h-[1px] bg-slate-950 w-full"></div><span>APPROVED BY</span></div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          @page { size: A4 landscape; margin: 10mm; } 
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
