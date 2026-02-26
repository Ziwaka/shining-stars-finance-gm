"use client"
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Tag, Image as ImageIcon, X, TrendingUp, Layers, Printer, Wallet, ArrowUpCircle, ArrowDownCircle, BarChart3, ListChecks } from 'lucide-react';

const COLORS = ['#1e1b4b', '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9'];

export default function FinancialDashboard({ vouchers = [] }: { vouchers: any[] }) {
  const [filter, setFilter] = useState({ startDate: '', endDate: '', category: '', item: '', vendor: '' });
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  // ၁။ Data Normalization: သင်၏ Sheet Header အတိုင်း အတိအကျ ပြင်ဆင်ခြင်း
  const normalizedData = useMemo(() => {
    return (vouchers || []).map(v => {
      const rawDate = v.date || v.Date || '';
      const cleanDate = rawDate.toString().split('T')[0]; 
      
      // Header Mapping: 'Cost (Total)' -> 'cost_(total)'
      const rawAmount = v['cost_(total)'] || v.cost_total || v.Cost_Total || 0;
      // Header Mapping: 'Item Description' -> 'item_description'
      const itemName = v.item_description || v['item_description'] || v.item || v.Item || '';

      return {
        date: cleanDate.toString(),
        voucherno: (v.voucher_no || v.voucherno || v.Voucher_No || '').toString(),
        type: (v.type || v.Type || "Cash Out").toString().trim(),
        category: (v.category || v.Category || "UNCLASSIFIED").toString().toUpperCase(),
        sub1: (v.sub_1 || v.sub1 || v.Sub_1 || "GENERAL").toString().toUpperCase(),
        sub2: (v.sub_2 || v.sub2 || v.Sub_2 || "").toString().toUpperCase(),
        item: itemName.toString(),
        vendor: (v.vendor || v.Vendor || '').toString(),
        cost_total: Math.round(Number(rawAmount) || 0), 
        image_data: (v.image_data || v.Image_Data || '').toString()
      };
    });
  }, [vouchers]);

  const filtered = useMemo(() => {
    return normalizedData.filter(v => {
      const inDateRange = (!filter.startDate || v.date >= filter.startDate) && (!filter.endDate || v.date <= filter.endDate);
      return inDateRange &&
        v.category.toLowerCase().includes(filter.category.toLowerCase()) &&
        v.item.toLowerCase().includes(filter.item.toLowerCase());
    });
  }, [normalizedData, filter]);

  // ၂။ Dynamic Charts Logic: Bus 1 - Fuel စသည်ဖြင့် ခွဲပြရန် [cite: 2026-02-23]
  const categorySpecificData = useMemo(() => {
    const cats = Array.from(new Set(filtered.filter(v => v.type === "Cash Out").map(v => v.category)));
    return cats.map(catName => {
      const catVouchers = filtered.filter(v => v.category === catName);
      const subKeysSet = new Set<string>();
      const dateMap: any = {};
      
      catVouchers.forEach(v => {
        if (!dateMap[v.date]) dateMap[v.date] = { date: v.date };
        // Bus 1 - Fuel logic [cite: 2026-02-23]
        const key = v.sub2 ? `${v.sub1} - ${v.sub2}` : v.sub1;
        subKeysSet.add(key);
        dateMap[v.date][key] = (dateMap[v.date][key] || 0) + v.cost_total;
      });
      return { name: catName, data: Object.keys(dateMap).map(k => dateMap[k]).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), subKeys: Array.from(subKeysSet) };
    });
  }, [filtered]);

  // ၃။ Hierarchical Audit Log Grouping (VS Code Error Fix)
  const groupedAuditLog = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    filtered.forEach(v => {
      const cat = v.category;
      const sub = v.sub1;
      if (!groups[cat]) groups[cat] = {};
      if (!groups[cat][sub]) groups[cat][sub] = [];
      groups[cat][sub].push(v);
    });
    return groups;
  }, [filtered]);

  const analytics = useMemo(() => {
    let totalIn = 0; let totalOut = 0;
    const catGroup: Record<string, number> = {}; 
    const trendGroup: Record<string, any> = {};
    filtered.forEach(v => {
      if (v.type === "Cash In") totalIn += v.cost_total;
      else { totalOut += v.cost_total; catGroup[v.category] = (catGroup[v.category] || 0) + v.cost_total; }
      if (v.date) {
        if (!trendGroup[v.date]) trendGroup[v.date] = { date: v.date, income: 0, expense: 0 };
        if (v.type === "Cash In") trendGroup[v.date].income += v.cost_total;
        else trendGroup[v.date].expense += v.cost_total;
      }
    });
    return { totalIn, totalOut, balance: totalIn - totalOut, categories: Object.keys(catGroup).map(name => ({ name, value: catGroup[name] })), trends: Object.keys(trendGroup).map(k => trendGroup[k]).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
  }, [filtered]);

  return (
    <div className="space-y-16 **font-bold** **text-slate-950** **uppercase**">
      
      {/* SUMMARY TILES [cite: 2026-02-23] */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-emerald-800">
          <p className="text-[10px] **font-bold** opacity-80 mb-4 uppercase tracking-widest">CASH IN</p>
          <p className="text-4xl **font-bold**">{analytics.totalIn.toLocaleString()} MMK</p>
        </div>
        <div className="bg-rose-600 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-rose-800">
          <p className="text-[10px] **font-bold** opacity-80 mb-4 uppercase tracking-widest">CASH OUT</p>
          <p className="text-4xl **font-bold**">{analytics.totalOut.toLocaleString()} MMK</p>
        </div>
        <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-purple-900">
          <p className="text-[10px] **font-bold** opacity-80 mb-4 uppercase tracking-widest">BALANCE</p>
          <p className="text-4xl **font-bold**">{analytics.balance.toLocaleString()} MMK</p>
        </div>
      </div>

      {/* SUB-CATEGORY CHARTS [cite: 2026-02-23] */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {categorySpecificData.map((catChart, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-2 border-slate-100 min-h-[450px]">
            <h4 className="text-sm **font-bold** text-purple-900 tracking-widest uppercase mb-8">{catChart.name} ANALYSIS</h4>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catChart.data}>
                  <CartesianGrid vertical={false} stroke="#f1f5f9"/><XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 700}} stroke="#94a3b8"/><YAxis tick={{fontSize: 9, fontWeight: 700}} stroke="#94a3b8"/><Tooltip/><Legend iconType="rect" />
                  {catChart.subKeys.map((sub, sIdx) => (
                    <Bar key={sub} dataKey={sub} stackId="a" fill={COLORS[sIdx % COLORS.length]} name={sub} radius={sIdx === catChart.subKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* DETAILED AUDIT LOG [cite: 2026-02-23] */}
      <div className="space-y-12">
        {Object.keys(groupedAuditLog).map((catName) => (
          <div key={catName} className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border-2 border-slate-100 mb-12">
            <div className="bg-slate-950 p-8 text-white flex justify-between items-center border-b-8 border-purple-600">
              <h3 className="text-2xl **font-bold** tracking-widest uppercase">{catName}</h3>
              <p className="text-2xl **font-bold**">{Object.keys(groupedAuditLog[catName]).reduce((s, sub) => s + groupedAuditLog[catName][sub].reduce((ss, i) => ss + i.cost_total, 0), 0).toLocaleString()} MMK</p>
            </div>
            {Object.keys(groupedAuditLog[catName]).map((subName) => (
              <div key={subName} className="p-8 border-b last:border-0">
                <h4 className="text-sm **font-bold** text-slate-950 uppercase tracking-widest mb-6 border-l-8 border-purple-900 pl-4">{subName} BREAKDOWN</h4>
                <table className="w-full text-left **font-bold** uppercase">
                  <thead className="bg-slate-50 text-[9px] text-slate-400 border-b border-slate-100">
                    <tr><th className="pb-4 px-4 **font-bold**">DATE & ID</th><th className="pb-4 px-4 **font-bold**">DETAILS / VENDOR</th><th className="pb-4 px-4 text-right **font-bold**">AMOUNT</th></tr>
                  </thead>
                  <tbody>
                    {groupedAuditLog[catName][subName].map((v: any, vIdx: number) => (
                      <tr key={vIdx} className="hover:bg-slate-50">
                        <td className="py-6 px-4"><div>{v.date}</div><div className="text-purple-900 **font-bold** text-xs mt-1">{v.voucherno}</div></td>
                        <td className="py-6 px-4"><div>{v.item}</div><div className="text-[9px] text-slate-400 mt-1 italic">{v.vendor} {v.sub2 && `| ${v.sub2}`}</div></td>
                        <td className="py-6 px-4 text-right text-xl **font-bold**">{v.cost_total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
