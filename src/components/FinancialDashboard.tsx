"use client"
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Tag, Image as ImageIcon, X, TrendingUp, Layers, Printer, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const COLORS = ['#1e1b4b', '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa'];

export default function FinancialDashboard({ vouchers = [] }: { vouchers: any[] }) {
  const [filter, setFilter] = useState({ startDate: '', endDate: '', category: '', item: '', vendor: '' });
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  // 🔴 ဒေတာအတိအကျ ဖတ်ယူခြင်း (Header ပုံစံအတိုင်း) 🔴
  const normalizedData = useMemo(() => {
    return vouchers.map(v => {
      // Date ပြင်ဆင်ခြင်း
      const rawDate = v.date || v.Date || '';
      const cleanDate = rawDate.toString().split('T')[0]; 
      
      // Cost (Total) ကို ဖတ်ယူခြင်း
      const rawAmount = v['cost_(total)'] || v.cost_total || 0;
      
      // Item Description ကို ဖတ်ယူခြင်း
      const itemName = v.item_description || v['item_description'] || v.item || '';

      return {
        date: cleanDate,
        voucherno: v.voucher_no || v.voucherno || '',
        type: (v.type || "Cash Out").toString().trim(),
        category: v.category || "UNCLASSIFIED",
        item: itemName,
        vendor: v.vendor || '',
        cost_total: Math.round(Number(rawAmount)), 
        image_data: v.image_data || ''
      };
    });
  }, [vouchers]);

  const uniqueCategories = useMemo(() => Array.from(new Set(normalizedData.map(v => v.category).filter(Boolean))), [normalizedData]);

  const filtered = useMemo(() => {
    return normalizedData.filter(v => {
      const inDateRange = (!filter.startDate || v.date >= filter.startDate) && (!filter.endDate || v.date <= filter.endDate);
      return inDateRange &&
        (v.category || "").toLowerCase().includes(filter.category.toLowerCase()) &&
        (v.item || "").toLowerCase().includes(filter.item.toLowerCase()) &&
        (v.vendor || "").toLowerCase().includes(filter.vendor.toLowerCase());
    });
  }, [normalizedData, filter]);

  const analytics = useMemo(() => {
    let totalIn = 0; let totalOut = 0;
    const catGroup: any = {}; const trendGroup: any = {};

    filtered.forEach(v => {
      if (v.type === "Cash In") totalIn += v.cost_total;
      else {
        totalOut += v.cost_total;
        catGroup[v.category] = (catGroup[v.category] || 0) + v.cost_total;
      }

      if (v.date) {
        if (!trendGroup[v.date]) trendGroup[v.date] = { date: v.date, income: 0, expense: 0 };
        if (v.type === "Cash In") trendGroup[v.date].income += v.cost_total;
        else trendGroup[v.date].expense += v.cost_total;
      }
    });

    return {
      totalIn, totalOut, balance: totalIn - totalOut,
      categories: Object.keys(catGroup).map(name => ({ name, value: catGroup[name] })),
      trends: Object.values(trendGroup).sort((a:any, b:any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    };
  }, [filtered]);

  return (
    <div className="space-y-8 font-black text-slate-950 uppercase">
      
      {/* FILTER PANEL */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="space-y-2"><label className="flex items-center text-purple-900 text-[9px] font-black"><Calendar size={14} className="mr-2"/> FROM</label><input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs" onChange={e => setFilter({...filter, startDate: e.target.value})} /></div>
        <div className="space-y-2"><label className="flex items-center text-purple-900 text-[9px] font-black"><Calendar size={14} className="mr-2"/> TO</label><input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs" onChange={e => setFilter({...filter, endDate: e.target.value})} /></div>
        <div className="space-y-2"><label className="flex items-center text-purple-900 text-[9px] font-black"><Tag size={14} className="mr-2"/> CATEGORY</label><select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs" onChange={e => setFilter({...filter, category: e.target.value})}><option value="">ALL HEADS</option>{uniqueCategories.map((c:any) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="space-y-2"><label className="flex items-center text-purple-900 text-[9px] font-black"><Layers size={14} className="mr-2"/> ITEM</label><input placeholder="SEARCH..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs" onChange={e => setFilter({...filter, item: e.target.value})} /></div>
        <div className="flex items-end"><Link href="/report" className="w-full bg-slate-950 text-white p-4 rounded-2xl font-black text-xs flex justify-center items-center hover:bg-purple-900"><Printer size={18} className="mr-2"/> PRINT REPORT</Link></div>
      </div>

      {/* TILES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-emerald-800"><p className="text-[10px] font-black opacity-80 mb-4 uppercase">CASH IN (INCOME)</p><p className="text-4xl font-black">{analytics.totalIn.toLocaleString()} <span className="text-xs opacity-50 font-black">MMK</span></p></div>
        <div className="bg-rose-600 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-rose-800"><p className="text-[10px] font-black opacity-80 mb-4 uppercase">CASH OUT (EXPENSE)</p><p className="text-4xl font-black">{analytics.totalOut.toLocaleString()} <span className="text-xs opacity-50 font-black">MMK</span></p></div>
        <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-purple-900"><p className="text-[10px] font-black opacity-80 mb-4 uppercase">NET BALANCE</p><p className="text-4xl font-black">{analytics.balance.toLocaleString()} <span className="text-xs opacity-50 font-black">MMK</span></p></div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl">
          <h3 className="text-[10px] text-slate-400 mb-8 font-black uppercase">INCOME VS EXPENSE</h3>
          <div style={{ width: '100%', height: 300, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.trends}>
                <CartesianGrid vertical={false} stroke="#f1f5f9"/><XAxis dataKey="date" hide/><YAxis tick={{fontSize: 10, fontWeight: 900}}/><Tooltip/><Legend iconType="circle" />
                <Bar dataKey="income" fill="#059669" name="CASH IN" /><Bar dataKey="expense" fill="#e11d48" name="CASH OUT" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] shadow-2xl">
          <h3 className="text-[10px] text-slate-400 mb-8 font-black uppercase">ALLOCATION</h3>
          <div style={{ width: '100%', height: 300, minHeight: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.categories} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                  {analytics.categories.map((_:any, i:any) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip/><Legend/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TRANSACTIONS */}
      <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-2 border-slate-100 font-black">
        <table className="w-full text-left uppercase">
          <thead className="bg-slate-50 text-[9px] text-slate-400 border-b border-slate-100"><tr className="font-black"><th className="p-6">DATE & ID</th><th className="p-6">DETAILS</th><th className="p-6 text-right">TOTAL</th><th className="p-6 text-center">PROOF</th></tr></thead>
          <tbody className="divide-y divide-slate-100 font-black">
            {filtered.slice().reverse().map((v, i) => (
              <tr key={i} className="hover:bg-slate-50 font-black transition-colors text-xs">
                <td className="p-6"><div>{v.date}</div><div className="text-purple-900 font-black">{v.voucherno}</div></td>
                <td className="p-6"><div>{v.item}</div><div className="text-[9px] text-slate-400 font-black">{v.vendor}</div></td>
                <td className="p-6 text-right font-black">{v.cost_total.toLocaleString()}</td>
                <td className="p-6 text-center">{ v.image_data ? <button onClick={() => setSelectedImg(v.image_data)} className="p-3 bg-slate-950 text-white rounded-xl"><ImageIcon size={18}/></button> : "-" }</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {selectedImg && (
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-6" onClick={() => setSelectedImg(null)}><img src={selectedImg} className="max-w-full max-h-full rounded-2xl shadow-3xl" alt="Voucher" /></div>
      )}
    </div>
  );
}
