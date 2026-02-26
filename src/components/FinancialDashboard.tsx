"use client"
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Calendar, Tag, User, Image as ImageIcon, X, TrendingUp, Layers, ShoppingBag, Printer, ShoppingCart, ChevronDown, ArrowRight } from 'lucide-react';

const COLORS = ['#1e1b4b', '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa'];

export default function FinancialDashboard({ vouchers }: { vouchers: any[] }) {
  // Date Range အပါအဝင် Filter State များ [cite: 2026-02-23]
  const [filter, setFilter] = useState({ 
    startDate: '', 
    endDate: '', 
    category: '', 
    item: '', 
    vendor: '' 
  });
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  // စာရင်းထဲရှိ Unique Category များကို Dropdown အတွက် ထုတ်ယူခြင်း [cite: 2026-02-23]
  const uniqueCategories = useMemo(() => {
    const cats = vouchers.map(v => v.category).filter(Boolean);
    return Array.from(new Set(cats));
  }, [vouchers]);

  // Date Range နှင့် အခြား Filter များ ပေါင်းစပ်စစ်ဆေးခြင်း Logic [cite: 2026-02-23]
  const filtered = useMemo(() => {
    return vouchers.filter(v => {
      const vDate = v.date || '';
      const inDateRange = (!filter.startDate || vDate >= filter.startDate) && 
                          (!filter.endDate || vDate <= filter.endDate);
      
      return inDateRange &&
        (v.category || '').toLowerCase().includes(filter.category.toLowerCase()) &&
        (v.item || '').toLowerCase().includes(filter.item.toLowerCase()) &&
        (v.vendor || '').toLowerCase().includes(filter.vendor.toLowerCase());
    });
  }, [vouchers, filter]);

  const chartData = useMemo(() => {
    const catGroup: any = {}; const dayGroup: any = {}; let runningTotal = 0;
    const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach(v => {
      const amt = Number(v.cost_total || 0);
      catGroup[v.category] = (catGroup[v.category] || 0) + amt;
      dayGroup[v.date] = (dayGroup[v.date] || 0) + amt;
    });
    return { 
      dailyTrend: Object.keys(dayGroup).map(date => { 
        runningTotal += dayGroup[date]; 
        return { date, amount: dayGroup[date], cumulative: runningTotal }; 
      }),
      categories: Object.keys(catGroup).map(name => ({ name, value: catGroup[name] })) 
    };
  }, [filtered]);

  return (
    <div className="space-y-10 font-black text-slate-950 uppercase">
      
      {/* 1. ADVANCED FILTERS WITH DATE RANGE & DROPDOWN [cite: 2026-02-23] */}
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-purple-900 grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* စတင်မည့်ရက် */}
        <div className="space-y-3">
          <label className="flex items-center text-purple-900 text-[10px] tracking-widest font-black"><Calendar className="mr-2" size={14}/> FROM DATE</label>
          <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none font-black focus:border-purple-900" onChange={e => setFilter({...filter, startDate: e.target.value})} />
        </div>
        {/* ကုန်ဆုံးမည့်ရက် */}
        <div className="space-y-3">
          <label className="flex items-center text-purple-900 text-[10px] tracking-widest font-black"><ArrowRight className="mr-2" size={14}/> TO DATE</label>
          <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none font-black focus:border-purple-900" onChange={e => setFilter({...filter, endDate: e.target.value})} />
        </div>
        {/* Category Dropdown */}
        <div className="space-y-3">
          <label className="flex items-center text-purple-900 text-[10px] tracking-widest font-black"><Tag className="mr-2" size={14}/> CATEGORY</label>
          <div className="relative">
            <select className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none font-black focus:border-purple-900 appearance-none uppercase" value={filter.category} onChange={e => setFilter({...filter, category: e.target.value})}>
              <option value="">ALL HEADS</option>
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          </div>
        </div>
        {/* Search Inputs */}
        <div className="space-y-3">
          <label className="flex items-center text-purple-900 text-[10px] tracking-widest font-black"><Layers className="mr-2" size={14}/> ITEM</label>
          <input placeholder="SEARCH..." className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none font-black focus:border-purple-900 uppercase" onChange={e => setFilter({...filter, item: e.target.value})} />
        </div>
        <div className="space-y-3">
          <label className="flex items-center text-purple-900 text-[10px] tracking-widest font-black"><User className="mr-2" size={14}/> VENDOR</label>
          <input placeholder="SEARCH..." className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none font-black focus:border-purple-900 uppercase" onChange={e => setFilter({...filter, vendor: e.target.value})} />
        </div>
      </div>

      {/* 2. CFO TILES & ACTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-950 p-10 rounded-[3rem] text-white border-b-[15px] border-purple-900 shadow-2xl">
          <p className="text-purple-400 text-[10px] tracking-[0.4em] mb-3 font-black uppercase">Range Total Spent</p>
          <p className="text-5xl font-black">{filtered.reduce((s,v)=>s+Number(v.cost_total||0),0).toLocaleString()} <span className="text-sm opacity-30 italic font-black">MMK</span></p>
        </div>
        <div className="bg-purple-900 p-10 rounded-[3rem] text-white shadow-2xl">
          <p className="text-purple-200 text-[10px] tracking-[0.4em] mb-3 font-black uppercase">Range Vouchers</p>
          <p className="text-5xl font-black">{filtered.length} <span className="text-sm opacity-30 italic font-black">ITEMS</span></p>
        </div>
        <Link href="/report" className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-slate-100 flex flex-col justify-center items-center group hover:bg-purple-50 transition-all">
          <Printer size={48} className="text-purple-900 mb-4 group-hover:scale-110 transition-transform font-black" />
          <span className="font-black text-xs tracking-widest uppercase">Print Range Report</span>
        </Link>
      </div>

      {/* 3. CHARTS GRID [cite: 2026-02-23] */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 h-[500px]">
           <h3 className="text-xs tracking-widest text-slate-400 mb-10 uppercase flex items-center gap-3 font-black"><TrendingUp size={20}/> EXPENDITURE TREND</h3>
           <ResponsiveContainer width="100%" height="80%">
             <AreaChart data={chartData.dailyTrend}>
               <CartesianGrid vertical={false} stroke="#f1f5f9"/>
               <XAxis dataKey="date" hide/>
               <YAxis tick={{fontSize: 10, fontWeight: 900}}/>
               <Tooltip/>
               <Area type="monotone" dataKey="amount" stroke="#4c1d95" fill="#c4b5fd" fillOpacity={0.3} strokeWidth={6}/>
             </AreaChart>
           </ResponsiveContainer>
        </div>
        <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-2 border-slate-50 h-[500px]">
           <h3 className="text-xs tracking-widest text-slate-400 mb-10 uppercase flex items-center gap-3 font-black"><Layers size={20}/> BUDGET ALLOCATION</h3>
           <ResponsiveContainer width="100%" height="80%">
             <PieChart>
               <Pie data={chartData.categories} innerRadius={90} outerRadius={120} paddingAngle={10} dataKey="value" stroke="none">
                 {chartData.categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
               </Pie>
               <Tooltip/><Legend/>
             </PieChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* 4. DATA TABLE */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border-[6px] border-slate-950 font-black">
        <div className="bg-slate-950 p-8 text-white flex justify-between items-center font-black">
          <span className="tracking-widest font-black text-sm uppercase font-black">Historical Ledger Records</span>
          <ShoppingCart className="text-purple-500" size={24}/>
        </div>
        <table className="w-full text-left uppercase font-black">
          <thead className="bg-slate-50 text-[11px] tracking-widest text-slate-500 border-b-2 border-slate-100 font-black">
            <tr><th className="p-8">DATE & VR ID</th><th className="p-8">PARTICULARS</th><th className="p-8 text-right">TOTAL</th><th className="p-8 text-center">PROOF</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-black">
            {filtered.slice().reverse().map((v, i) => (
              <tr key={i} className="hover:bg-purple-50 transition-colors font-black">
                <td className="p-8"><span className="text-[10px] text-slate-400 block mb-1 font-black">{v.date}</span><span className="text-purple-900 text-lg font-black">{v.voucherno}</span></td>
                <td className="p-8 text-sm font-black"><div>{v.item}</div><div className="text-[10px] text-slate-400 mt-1 font-black">{v.vendor} | {v.category}</div></td>
                <td className="p-8 text-right text-3xl font-black">{Number(v.cost_total||0).toLocaleString()}</td>
                <td className="p-8 text-center">
                  {v.image_data ? (
                    <button onClick={() => setSelectedImg(v.image_data)} className="p-4 bg-purple-900 text-white rounded-2xl hover:scale-110 transition-all shadow-xl font-black"><ImageIcon size={24}/></button>
                  ) : <span className="text-slate-200 text-[10px] font-black uppercase font-black">NONE</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* IMAGE MODAL */}
      {selectedImg && (
        <div className="fixed inset-0 bg-slate-950/98 z-[9999] flex items-center justify-center p-6 backdrop-blur-2xl">
          <button onClick={() => setSelectedImg(null)} className="absolute top-10 right-10 text-white hover:rotate-90 transition-all font-black font-black"><X size={64} strokeWidth={3}/></button>
          <img src={selectedImg} className="max-w-full max-h-full rounded-[2rem] border-4 border-purple-900 shadow-2xl font-black" alt="Voucher" />
        </div>
      )}
    </div>
  );
}