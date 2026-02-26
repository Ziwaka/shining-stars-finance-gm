"use client"
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Calendar, Tag, User, Image as ImageIcon, X, TrendingUp, Layers, ShoppingBag, Printer, ShoppingCart, ChevronDown, ArrowRight, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const COLORS = ['#1e1b4b', '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa'];

export default function FinancialDashboard({ vouchers }: { vouchers: any[] }) {
  const [filter, setFilter] = useState({ startDate: '', endDate: '', category: '', item: '', vendor: '' });
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  // ၁။ Unique Categories ထုတ်ယူခြင်း [cite: 2026-02-23]
  const uniqueCategories = useMemo(() => {
    const cats = vouchers.map(v => v.category).filter(Boolean);
    return Array.from(new Set(cats));
  }, [vouchers]);

  // ၂။ ဒေတာများကို Filter လုပ်ခြင်း [cite: 2026-02-23]
  const filtered = useMemo(() => {
    return vouchers.filter(v => {
      const vDate = v.date || '';
      const inDateRange = (!filter.startDate || vDate >= filter.startDate) && (!filter.endDate || vDate <= filter.endDate);
      return inDateRange &&
        (v.category || '').toLowerCase().includes(filter.category.toLowerCase()) &&
        (v.item || '').toLowerCase().includes(filter.item.toLowerCase()) &&
        (v.vendor || '').toLowerCase().includes(filter.vendor.toLowerCase());
    });
  }, [vouchers, filter]);

  // ၃။ Balance Analytics တွက်ချက်ခြင်း [cite: 2026-02-23]
  const analytics = useMemo(() => {
    let totalIn = 0; let totalOut = 0;
    const catGroup: any = {}; const trendGroup: any = {};

    filtered.forEach(v => {
      const amt = Number(v.cost_total || 0);
      const type = v.type || "Cash Out"; // Default is Out
      
      if (type === "Cash In") totalIn += amt;
      else totalOut += amt;

      // Category Allocation (Expenses Only) [cite: 2026-02-23]
      if (type === "Cash Out") {
        catGroup[v.category] = (catGroup[v.category] || 0) + amt;
      }

      // Daily Trend Data
      if (!trendGroup[v.date]) trendGroup[v.date] = { date: v.date, income: 0, expense: 0 };
      if (type === "Cash In") trendGroup[v.date].income += amt;
      else trendGroup[v.date].expense += amt;
    });

    return {
      totalIn, totalOut, balance: totalIn - totalOut,
      categories: Object.keys(catGroup).map(name => ({ name, value: catGroup[name] })),
      trends: Object.values(trendGroup).sort((a:any, b:any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    };
  }, [filtered]);

  return (
    <div className="space-y-8 font-black text-slate-950 uppercase">
      
      {/* 1. FILTER PANEL [cite: 2026-02-23] */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="space-y-2">
          <label className="flex items-center text-purple-900 text-[9px] tracking-widest font-black"><Calendar className="mr-2" size={14}/> FROM</label>
          <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xs focus:border-purple-900" onChange={e => setFilter({...filter, startDate: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="flex items-center text-purple-900 text-[9px] tracking-widest font-black"><ArrowRight className="mr-2" size={14}/> TO</label>
          <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xs focus:border-purple-900" onChange={e => setFilter({...filter, endDate: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="flex items-center text-purple-900 text-[9px] tracking-widest font-black"><Tag className="mr-2" size={14}/> CATEGORY</label>
          <div className="relative">
            <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xs appearance-none" value={filter.category} onChange={e => setFilter({...filter, category: e.target.value})}>
              <option value="">ALL HEADS</option>
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="flex items-center text-purple-900 text-[9px] tracking-widest font-black"><Layers className="mr-2" size={14}/> ITEM</label>
          <input placeholder="SEARCH..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-xs" onChange={e => setFilter({...filter, item: e.target.value})} />
        </div>
        <div className="flex items-end">
          <Link href="/report" className="w-full bg-slate-950 text-white p-4 rounded-2xl flex justify-center items-center hover:bg-purple-900 transition-all shadow-lg font-black text-xs">
            <Printer size={18} className="mr-2"/> PRINT REPORT
          </Link>
        </div>
      </div>

      {/* 2. REAL-TIME BALANCE TILES [cite: 2026-02-23] */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-emerald-800">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] tracking-[0.3em] font-black opacity-80">CASH IN (INCOME)</p>
            <ArrowUpCircle size={24} />
          </div>
          <p className="text-4xl font-black">{analytics.totalIn.toLocaleString()} <span className="text-xs opacity-50 italic">MMK</span></p>
        </div>
        
        <div className="bg-rose-600 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-rose-800">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] tracking-[0.3em] font-black opacity-80">CASH OUT (EXPENSE)</p>
            <ArrowDownCircle size={24} />
          </div>
          <p className="text-4xl font-black">{analytics.totalOut.toLocaleString()} <span className="text-xs opacity-50 italic">MMK</span></p>
        </div>

        <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-purple-900">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] tracking-[0.3em] font-black opacity-80">NET BALANCE (REMAIN)</p>
            <Wallet size={24} className="text-purple-400" />
          </div>
          <p className={`text-4xl font-black ${analytics.balance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {analytics.balance.toLocaleString()} <span className="text-xs opacity-50 italic text-white">MMK</span>
          </p>
        </div>
      </div>

      {/* 3. BALANCE & ALLOCATION CHARTS [cite: 2026-02-23] */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-50 h-[450px]">
          <h3 className="text-[10px] tracking-widest text-slate-400 mb-8 flex items-center gap-2 font-black"><TrendingUp size={16}/> INCOME VS EXPENSE TREND</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={analytics.trends}>
              <CartesianGrid vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="date" hide/>
              <YAxis tick={{fontSize: 10, fontWeight: 900}}/>
              <Tooltip cursor={{fill: '#f8fafc'}}/>
              <Legend iconType="circle" />
              <Bar dataKey="income" fill="#059669" radius={[4, 4, 0, 0]} name="CASH IN" />
              <Bar dataKey="expense" fill="#e11d48" radius={[4, 4, 0, 0]} name="CASH OUT" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-50 h-[450px]">
          <h3 className="text-[10px] tracking-widest text-slate-400 mb-8 flex items-center gap-2 font-black"><Layers size={16}/> EXPENSE ALLOCATION</h3>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie data={analytics.categories} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                {analytics.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip/>
              <Legend/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. TRANSACTION LEDGER */}
      <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-2 border-slate-100">
        <div className="bg-slate-950 p-6 text-white flex justify-between items-center">
          <span className="tracking-widest font-black text-xs">AUDITED TRANSACTION HISTORY</span>
          <ShoppingCart className="text-purple-500" size={20}/>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[9px] tracking-widest text-slate-400 border-b border-slate-100">
            <tr><th className="p-6">DATE & ID</th><th className="p-6">DETAILS</th><th className="p-6 text-right">AMOUNT</th><th className="p-6 text-center">TYPE</th><th className="p-6 text-center">PROOF</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice().reverse().map((v, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors font-black">
                <td className="p-6">
                  <span className="text-[8px] text-slate-400 block mb-0.5">{v.date}</span>
                  <span className="text-purple-900 text-sm font-black">{v.voucherno}</span>
                </td>
                <td className="p-6 text-[11px] font-black">
                  <div className="font-black">{v.item}</div>
                  <div className="text-[8px] text-slate-400 mt-0.5">{v.vendor} | {v.category}</div>
                </td>
                <td className="p-6 text-right text-2xl font-black">{Number(v.cost_total||0).toLocaleString()}</td>
                <td className="p-6 text-center">
                  <span className={`text-[8px] px-3 py-1 rounded-full font-black ${v.type === 'Cash In' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {v.type?.toUpperCase() || 'CASH OUT'}
                  </span>
                </td>
                <td className="p-6 text-center">
                  {v.image_data ? (
                    <button onClick={() => setSelectedImg(v.image_data)} className="p-3 bg-slate-950 text-white rounded-xl hover:scale-110 transition-all font-black shadow-lg"><ImageIcon size={18}/></button>
                  ) : <span className="text-slate-200 text-[8px]">NONE</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* LIGHTBOX */}
      {selectedImg && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-xl">
          <button onClick={() => setSelectedImg(null)} className="absolute top-10 right-10 text-white font-black"><X size={48}/></button>
          <img src={selectedImg} className="max-w-full max-h-full rounded-2xl border-4 border-purple-900 shadow-3xl" alt="Voucher" />
        </div>
      )}
    </div>
  );
}
