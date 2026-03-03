"use client"
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Image as ImageIcon, X, TrendingUp, Layers, Printer, BarChart3, ListChecks, Filter, AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';
import { deleteFromSheet } from '@/lib/api';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#84cc16'];

export default function FinancialDashboard({ vouchers = [], onRefresh }: { vouchers: any[], onRefresh?: () => void }) {
  const [filter, setFilter] = useState({ startDate: '', endDate: '', category: '', sub1: '', sub2: '', sub3: '', sub4: '', sub5: '', vendor: '' });
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  // ✅ Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean; voucherno: string; confirmInput: string; loading: boolean;
  }>({ open: false, voucherno: '', confirmInput: '', loading: false });


  const normalizedData = useMemo(() => {
    return (vouchers || []).map(v => {
      const rawDate = v.date || v.Date || '';
      // ✅ Date normalize — UTC shift မဖြစ်အောင် string အနေနဲ့ ဆက်သုံးမည်
      // GAS က Date object လာရင် toISOString ဖြင့် split၊ string ဆိုရင် တိုက်ရိုက် substring
      const rawStr = rawDate instanceof Date
        ? rawDate.toISOString().split('T')[0]
        : rawDate.toString().replace(/T.*$/, '').substring(0, 10);
      const cleanDate = rawStr;
      const rawAmount = v['cost_(total)'] || v.cost_total || v.Cost_Total || 0;
      const itemName = v.item_description || v['item_description'] || v.item || v.Item || '';

      return {
        date: cleanDate.toString(),
        voucherno: (v.voucher_no || v.voucherno || '').toString(),
        type: (v.type || v.Type || "Cash Out").toString().trim(),
        category: (v.category || v.Category || "UNCLASSIFIED").toString().toUpperCase(),
        sub1: (v.sub_1 || v.sub1 || "GENERAL").toString().toUpperCase(),
        sub2: (v.sub_2 || v.sub2 || "").toString().toUpperCase(),
        sub3: (v.sub_3 || v.sub3 || "").toString().toUpperCase(),
        sub4: (v.sub_4 || v.sub4 || "").toString().toUpperCase(),
        sub5: (v.sub_5 || v.sub5 || "").toString().toUpperCase(),
        item: itemName.toString(),
        vendor: (v.vendor || v.Vendor || '').toString(),
        note: (v.note || v.Note || '').toString().toUpperCase(),
        cost_total: Math.round(Number(rawAmount) || 0), 
        image_data: (v.image_data || v.Image_Data || '').toString(),
        entered_by: (v.entered_by || v.Entered_By || 'GM').toString().toUpperCase(),
        account: (v.account || v.Account || 'GM ACCOUNT').toString().toUpperCase()
      };
    });
  }, [vouchers]);

  // ✅ Dropdown options from data
  const filterOptions = useMemo(() => {
    const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean))).sort();
    const cats = uniq(normalizedData.map(v => v.category));
    const sub1s = uniq(normalizedData.filter(v => !filter.category || v.category === filter.category).map(v => v.sub1));
    const sub2s = uniq(normalizedData.filter(v => (!filter.category || v.category === filter.category) && (!filter.sub1 || v.sub1 === filter.sub1)).map(v => v.sub2));
    const sub3s = uniq(normalizedData.filter(v => (!filter.category || v.category === filter.category) && (!filter.sub1 || v.sub1 === filter.sub1) && (!filter.sub2 || v.sub2 === filter.sub2)).map(v => v.sub3));
    const sub4s = uniq(normalizedData.filter(v => (!filter.category || v.category === filter.category) && (!filter.sub1 || v.sub1 === filter.sub1) && (!filter.sub2 || v.sub2 === filter.sub2) && (!filter.sub3 || v.sub3 === filter.sub3)).map(v => v.sub4));
    const sub5s = uniq(normalizedData.filter(v => (!filter.category || v.category === filter.category) && (!filter.sub1 || v.sub1 === filter.sub1) && (!filter.sub2 || v.sub2 === filter.sub2) && (!filter.sub3 || v.sub3 === filter.sub3) && (!filter.sub4 || v.sub4 === filter.sub4)).map(v => v.sub5));
    const vendors = uniq(normalizedData.map(v => v.vendor));
    return { cats, sub1s, sub2s, sub3s, sub4s, sub5s, vendors };
  }, [normalizedData, filter.category, filter.sub1, filter.sub2, filter.sub3, filter.sub4]);

  const filtered = useMemo(() => {
    return normalizedData.filter(v => {
      const inDateRange = (!filter.startDate || v.date >= filter.startDate) && (!filter.endDate || v.date <= filter.endDate);
      return inDateRange &&
        (!filter.category || v.category === filter.category) &&
        (!filter.sub1 || v.sub1 === filter.sub1) &&
        (!filter.sub2 || v.sub2 === filter.sub2) &&
        (!filter.sub3 || v.sub3 === filter.sub3) &&
        (!filter.sub4 || v.sub4 === filter.sub4) &&
        (!filter.sub5 || v.sub5 === filter.sub5) &&
        (!filter.vendor || v.vendor === filter.vendor);
    });
  }, [normalizedData, filter]);

  const categorySpecificData = useMemo(() => {
    const cats = Array.from(new Set(filtered.map(v => v.category)));
    return cats.map(catName => {
      const catVouchers = filtered.filter(v => v.category === catName);
      // Group by month for x-axis
      const monthMap: any = {};
      const subKeysIn = new Set<string>();
      const subKeysOut = new Set<string>();
      catVouchers.forEach(v => {
        const month = v.date ? v.date.substring(0, 7) : v.date;
        if (!monthMap[month]) monthMap[month] = { date: month };
        // Sub key = sub1 > sub2 > sub3 chain
        const subParts = [v.sub1, v.sub2, v.sub3].filter(s => s && s !== 'GENERAL' && s !== '');
        const subKey = subParts.length > 0 ? subParts.join(' > ') : 'GENERAL';
        if (v.type === 'Cash In') {
          const k = `IN: ${subKey}`;
          subKeysIn.add(k);
          monthMap[month][k] = (monthMap[month][k] || 0) + v.cost_total;
        } else {
          const k = `OUT: ${subKey}`;
          subKeysOut.add(k);
          monthMap[month][k] = (monthMap[month][k] || 0) + v.cost_total;
        }
      });
      const data = Object.values(monthMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
      return {
        name: catName,
        data,
        inKeys: Array.from(subKeysIn),
        outKeys: Array.from(subKeysOut),
      };
    });
  }, [filtered]);

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
    const catGroup: any = {}; const trendGroup: any = {};
    filtered.forEach(v => {
      if (v.type === "Cash In") totalIn += v.cost_total;
      else { totalOut += v.cost_total; catGroup[v.category] = (catGroup[v.category] || 0) + v.cost_total; }
      if (v.date) {
        if (!trendGroup[v.date]) trendGroup[v.date] = { date: v.date, income: 0, expense: 0 };
        if (v.type === "Cash In") trendGroup[v.date].income += v.cost_total;
        else trendGroup[v.date].expense += v.cost_total;
      }
    });
    return { totalIn, totalOut, balance: totalIn - totalOut, categories: Object.keys(catGroup).map(name => ({ name, value: catGroup[name] })), trends: Object.values(trendGroup).sort((a:any, b:any) => new Date(a.date).getTime() - new Date(b.date).getTime()) };
  }, [filtered]);

  // ✅ Modal ဖွင့်ရုံ — browser confirm() မသုံးတော့
  const handleDelete = (voucherno: string) => {
    setDeleteModal({ open: true, voucherno, confirmInput: '', loading: false });
  };

  // ✅ Voucher ID တိုက်ကိုက်မှသာ delete လုပ်မည်
  const confirmDelete = async () => {
    if (deleteModal.confirmInput !== deleteModal.voucherno) return;
    setDeleteModal(m => ({ ...m, loading: true }));
    try {
      await deleteFromSheet(deleteModal.voucherno);
      setDeleteModal({ open: false, voucherno: '', confirmInput: '', loading: false });
      // ✅ GAS processing time အနည်းငယ်ပေးပြီးမှ refresh လုပ်မည်
      setTimeout(() => { if (onRefresh) onRefresh(); }, 1500);
    } catch {
      setDeleteModal(m => ({ ...m, loading: false }));
      alert("FAILED TO DELETE TRANSACTION.");
    }
  };

  return (
    <div className="space-y-8 font-black text-slate-950 uppercase">
      
      {/* 🔴 SOFT MARQUEE 🔴 */}
      {analytics.balance < 0 && (
        <div className="w-full bg-rose-50 text-slate-950 p-3 rounded-2xl border border-rose-200 shadow-sm overflow-hidden font-black print:hidden">
          <div className="animate-pulse flex justify-center items-center gap-4 text-xs tracking-widest uppercase font-black">
            <AlertTriangle size={20} className="text-rose-600" />
            <span>⚠️ WARNING: YOUR CURRENT ACCOUNT BALANCE IS NEGATIVE ({analytics.balance.toLocaleString()} MMK) ⚠️</span>
            <AlertTriangle size={20} className="text-rose-600" />
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 font-black print:hidden space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Filter className="text-slate-400" size={16}/>
          <span className="text-[10px] tracking-widest text-slate-500 font-black">FILTER</span>
        </div>
        {/* Row 1: Date + Vendor */}
        <div className="flex flex-wrap gap-3 items-center">
          <input type="date" className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black text-slate-950 flex-1 min-w-[130px]" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} />
          <span className="text-[10px] text-slate-400 font-black">TO</span>
          <input type="date" className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black text-slate-950 flex-1 min-w-[130px]" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} />
          <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black text-slate-950 flex-1 min-w-[130px] uppercase" value={filter.vendor} onChange={e => setFilter({...filter, vendor: e.target.value})}>
            <option value="">ALL VENDORS</option>
            {filterOptions.vendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        {/* Row 2: Category + Subs (cascade) */}
        <div className="flex flex-wrap gap-3 items-center">
          <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black text-slate-950 flex-1 min-w-[120px] uppercase" value={filter.category} onChange={e => setFilter({...filter, category: e.target.value, sub1:'', sub2:'', sub3:'', sub4:'', sub5:''})}>
            <option value="">ALL CATEGORIES</option>
            {filterOptions.cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {filterOptions.sub1s.filter(s => s && s !== 'GENERAL').length > 0 && (
            <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black text-slate-950 flex-1 min-w-[120px] uppercase" value={filter.sub1} onChange={e => setFilter({...filter, sub1: e.target.value, sub2:'', sub3:'', sub4:'', sub5:''})}>
              <option value="">ALL SUB 1</option>
              {filterOptions.sub1s.filter(s => s && s !== 'GENERAL').map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {filter.sub1 && filterOptions.sub2s.filter(Boolean).length > 0 && (
            <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black text-slate-950 flex-1 min-w-[120px] uppercase" value={filter.sub2} onChange={e => setFilter({...filter, sub2: e.target.value, sub3:'', sub4:'', sub5:''})}>
              <option value="">ALL SUB 2</option>
              {filterOptions.sub2s.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {filter.sub2 && filterOptions.sub3s.filter(Boolean).length > 0 && (
            <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black text-slate-950 flex-1 min-w-[120px] uppercase" value={filter.sub3} onChange={e => setFilter({...filter, sub3: e.target.value, sub4:'', sub5:''})}>
              <option value="">ALL SUB 3</option>
              {filterOptions.sub3s.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {filter.sub3 && filterOptions.sub4s.filter(Boolean).length > 0 && (
            <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black text-slate-950 flex-1 min-w-[120px] uppercase" value={filter.sub4} onChange={e => setFilter({...filter, sub4: e.target.value, sub5:''})}>
              <option value="">ALL SUB 4</option>
              {filterOptions.sub4s.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {filter.sub4 && filterOptions.sub5s.filter(Boolean).length > 0 && (
            <select className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black text-slate-950 flex-1 min-w-[120px] uppercase" value={filter.sub5} onChange={e => setFilter({...filter, sub5: e.target.value})}>
              <option value="">ALL SUB 5</option>
              {filterOptions.sub5s.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
        {/* Row 3: Actions */}
        <div className="flex gap-3 items-center justify-end">
          <button onClick={() => setFilter({ startDate: '', endDate: '', category: '', sub1:'', sub2:'', sub3:'', sub4:'', sub5:'', vendor: '' })} className="p-2.5 px-5 bg-slate-200 text-slate-950 rounded-xl text-xs hover:bg-slate-300 transition-all font-black">CLEAR ALL</button>
          <Link href="/report" className="p-2.5 px-6 bg-slate-950 text-white rounded-xl text-xs hover:bg-slate-800 transition-all font-black flex items-center gap-2 shadow-sm">
            <Printer size={16}/> PRINT REPORT
          </Link>
        </div>
      </div>

      {/* 🔴 SOFT PASTEL TILES 🔴 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-black">
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-200 shadow-sm">
          <p className="text-[10px] text-slate-500 mb-2 tracking-widest font-black">CASH IN</p>
          <p className="text-3xl font-black text-slate-950">{analytics.totalIn.toLocaleString()} MMK</p>
        </div>
        <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-200 shadow-sm">
          <p className="text-[10px] text-slate-500 mb-2 tracking-widest font-black">CASH OUT</p>
          <p className="text-3xl font-black text-slate-950">{analytics.totalOut.toLocaleString()} MMK</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-[2rem] border border-purple-200 shadow-sm">
          <p className="text-[10px] text-slate-500 mb-2 tracking-widest font-black">BALANCE</p>
          <p className="text-3xl font-black text-slate-950">{analytics.balance.toLocaleString()} MMK</p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-black">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 min-h-[320px]">
          <h3 className="text-[10px] text-slate-500 mb-6 flex items-center gap-2 font-black"><TrendingUp size={16}/> TRENDS</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.trends} barCategoryGap="30%">
                <CartesianGrid vertical={false} stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} tickFormatter={(v: string) => v.length > 7 ? v.substring(5) : v}/>
                <YAxis tick={{fontSize: 9, fontWeight: 900, fill: '#0f172a'}} tickFormatter={(v: any) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)}/>
                <Tooltip formatter={(v: any) => v.toLocaleString() + ' MMK'}/>
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, color: '#0f172a' }}/>
                <Bar dataKey="income" fill="#10b981" name="Cash In" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#f43f5e" name="Cash Out" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 min-h-[320px]">
          <h3 className="text-[10px] text-slate-500 mb-6 flex items-center gap-2 font-black"><Layers size={16}/> ALLOCATION (CASH OUT)</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.categories}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  label={({ name, percent }: any) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={true}
                >
                  {analytics.categories.map((_:any, i:any) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(v: any) => v.toLocaleString() + ' MMK'}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-6 font-black">
        <div className="flex items-center gap-3 px-2">
          <BarChart3 className="text-slate-400" size={24} />
          <h2 className="text-xl tracking-tight uppercase font-black text-slate-950">SUB-CATEGORY BREAKDOWN</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categorySpecificData.map((catChart, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 min-h-[340px]">
              <h4 className="text-xs text-slate-600 tracking-widest mb-2 font-black">{catChart.name}</h4>
              <div className="flex gap-4 mb-4 text-[9px] font-black">
                <span className="text-emerald-600">● CASH IN ({catChart.inKeys.length} sub)</span>
                <span className="text-rose-500">● CASH OUT ({catChart.outKeys.length} sub)</span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catChart.data} barCategoryGap="25%">
                    <CartesianGrid vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} tickFormatter={(v: string) => v.length > 7 ? v.substring(5) : v}/>
                    <YAxis tick={{fontSize: 9, fontWeight: 900, fill: '#0f172a'}} tickFormatter={(v: any) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)}/>
                    <Tooltip formatter={(v: any) => v.toLocaleString() + ' MMK'}/>
                    <Legend iconType="rect" wrapperStyle={{ fontSize: '9px', fontWeight: 900, color: '#0f172a' }}/>
                    {/* Cash In subs — stacked green tones */}
                    {catChart.inKeys.map((sub, sIdx) => (
                      <Bar key={sub} dataKey={sub} stackId="in" fill={['#10b981','#34d399','#6ee7b7','#a7f3d0'][sIdx % 4]} name={sub} radius={sIdx === catChart.inKeys.length - 1 ? [4,4,0,0] : [0,0,0,0]}/>
                    ))}
                    {/* Cash Out subs — stacked colorful */}
                    {catChart.outKeys.map((sub, sIdx) => (
                      <Bar key={sub} dataKey={sub} stackId="out" fill={COLORS[sIdx % COLORS.length]} name={sub} radius={sIdx === catChart.outKeys.length - 1 ? [4,4,0,0] : [0,0,0,0]}/>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* ✅ Monthly Summary Table */}
      <div className="space-y-4 font-black">
        <div className="flex items-center gap-3 px-2">
          <TrendingUp className="text-slate-400" size={24} />
          <h2 className="text-xl tracking-tight font-black text-slate-950 uppercase">Monthly Summary</h2>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* ✅ Mobile: card layout, Desktop: table layout */}
          <div className="hidden md:block">
            <table className="w-full text-left font-black uppercase">
              <thead className="bg-slate-100 text-[10px] text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6 font-black text-slate-950">Month</th>
                  <th className="py-4 px-6 text-right font-black text-emerald-700">Cash In</th>
                  <th className="py-4 px-6 text-right font-black text-rose-700">Cash Out</th>
                  <th className="py-4 px-6 text-right font-black text-slate-950">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const monthMap: Record<string, {in: number, out: number}> = {};
                  normalizedData.forEach(v => {
                    const m = v.date ? v.date.substring(0, 7) : 'Unknown';
                    if (!monthMap[m]) monthMap[m] = {in: 0, out: 0};
                    if (v.type === 'Cash In') monthMap[m].in += v.cost_total;
                    else monthMap[m].out += v.cost_total;
                  });
                  return Object.keys(monthMap).sort().reverse().map(m => {
                    const bal = monthMap[m].in - monthMap[m].out;
                    return (
                      <tr key={m} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 text-sm font-black text-slate-950">{m}</td>
                        <td className="py-4 px-6 text-right text-sm font-black text-emerald-600">+{monthMap[m].in.toLocaleString()}</td>
                        <td className="py-4 px-6 text-right text-sm font-black text-rose-600">-{monthMap[m].out.toLocaleString()}</td>
                        <td className={`py-4 px-6 text-right text-sm font-black ${bal >= 0 ? 'text-slate-950' : 'text-rose-600'}`}>{bal >= 0 ? '+' : ''}{bal.toLocaleString()}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          {/* ✅ Mobile card layout */}
          <div className="md:hidden divide-y divide-slate-100">
            {(() => {
              const monthMap: Record<string, {in: number, out: number}> = {};
              normalizedData.forEach(v => {
                const m = v.date ? v.date.substring(0, 7) : 'Unknown';
                if (!monthMap[m]) monthMap[m] = {in: 0, out: 0};
                if (v.type === 'Cash In') monthMap[m].in += v.cost_total;
                else monthMap[m].out += v.cost_total;
              });
              return Object.keys(monthMap).sort().reverse().map(m => {
                const bal = monthMap[m].in - monthMap[m].out;
                return (
                  <div key={m} className="p-5 space-y-3">
                    <div className="text-base font-black text-slate-950">{m}</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                        <div className="text-[9px] text-emerald-600 font-black mb-1">CASH IN</div>
                        <div className="text-xs font-black text-emerald-700">+{monthMap[m].in.toLocaleString()}</div>
                      </div>
                      <div className="bg-rose-50 rounded-2xl p-3 text-center">
                        <div className="text-[9px] text-rose-600 font-black mb-1">CASH OUT</div>
                        <div className="text-xs font-black text-rose-700">-{monthMap[m].out.toLocaleString()}</div>
                      </div>
                      <div className={`rounded-2xl p-3 text-center ${bal >= 0 ? 'bg-slate-100' : 'bg-rose-50'}`}>
                        <div className="text-[9px] text-slate-500 font-black mb-1">BALANCE</div>
                        <div className={`text-xs font-black ${bal >= 0 ? 'text-slate-950' : 'text-rose-700'}`}>{bal >= 0 ? '+' : ''}{bal.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      <div className="space-y-8 font-black">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <ListChecks className="text-slate-400" size={24} />
            <h2 className="text-xl tracking-tight font-black text-slate-950">DETAILED AUDIT LOG</h2>
          </div>
        </div>
        
        {Object.keys(groupedAuditLog).map((catName) => (
          <div key={catName} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="bg-slate-100 p-5 text-slate-950 flex justify-between items-center border-b border-slate-200 font-black">
              <h3 className="text-lg tracking-widest font-black text-slate-950">{catName}</h3>
              <p className="text-lg font-black text-slate-950">{Object.keys(groupedAuditLog[catName]).reduce((s, sub) => s + groupedAuditLog[catName][sub].reduce((ss, i) => ss + i.cost_total, 0), 0).toLocaleString()} MMK</p>
            </div>

            {Object.keys(groupedAuditLog[catName]).map((subName) => (
              <div key={subName} className="p-5 border-b last:border-0 border-slate-100 font-black">
                <h4 className="text-xs text-slate-600 mb-4 border-l-4 border-slate-400 pl-3 font-black">{subName}</h4>
                <table className="w-full text-left uppercase font-black">
                  <thead className="bg-slate-50 text-[9px] text-slate-500 border-b border-slate-200 font-black">
                    <tr>
                      <th className="pb-3 px-3 font-black text-slate-950">DATE & ID</th>
                      <th className="pb-3 px-3 font-black text-slate-950">DETAILS & ACCOUNT</th>
                      <th className="pb-3 px-3 text-right font-black text-slate-950">AMOUNT</th>
                      <th className="pb-3 px-3 text-center font-black text-slate-950 print:hidden">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-black">
                    {groupedAuditLog[catName][subName].map((v: any, vIdx: number) => (
                      <tr key={vIdx} className="hover:bg-slate-50 transition-colors font-black">
                        <td className="py-4 px-3 font-black">
                          <div className="text-[10px] font-black text-slate-500">{v.date}</div>
                          <div className="text-slate-950 text-[10px] mt-0.5 font-black">{v.voucherno}</div>
                        </td>
                        <td className="py-4 px-3 font-black">
                          <div className="text-xs font-black text-slate-950">{v.item}</div>
                          <div className="text-[9px] text-slate-500 mt-1 font-black uppercase">
                            {v.vendor} {[v.sub2, v.sub3, v.sub4, v.sub5].filter(Boolean).map(s => ` ➔ ${s}`).join('')}
                          </div>
                          <div className="mt-1 flex gap-2 font-black">
                            <span className="bg-white text-slate-950 px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-slate-300">ACC: {v.account}</span>
                            <span className="bg-slate-200 text-slate-950 px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-slate-300">BY: {v.entered_by}</span>
                          </div>
                          {v.note && (
                            <div className="mt-2 text-[9px] text-slate-950 bg-slate-100 p-2 rounded-lg font-black border-l-2 border-slate-400 max-w-lg">
                              📝 {v.note}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-right text-base font-black">
                          {v.type === 'Cash Out' ? (
                            <span className="text-rose-600 font-black">- {v.cost_total.toLocaleString()}</span>
                          ) : (
                            <span className="text-emerald-600 font-black">+ {v.cost_total.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="py-4 px-3 text-center font-black flex items-center justify-center gap-2 print:hidden">
                          <button onClick={() => handleDelete(v.voucherno)} className="p-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-600 hover:text-white transition-all font-black">
                            <Trash2 size={16}/>
                          </button>
                          {v.image_data ? (
                            <button onClick={() => setSelectedImg(v.image_data)} className="p-2 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-950 hover:text-white transition-all text-slate-950">
                              <ImageIcon size={16}/>
                            </button>
                          ) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>

      {selectedImg && (
        <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm print:hidden" onClick={() => setSelectedImg(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-slate-300 font-black"><X size={32}/></button>
          <img src={selectedImg} className="max-w-full max-h-full rounded-2xl border-4 border-white shadow-xl" alt="Proof" />
        </div>
      )}

      {/* ✅ Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 border border-rose-200">

            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="bg-rose-100 p-3 rounded-2xl">
                <ShieldAlert size={28} className="text-rose-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950 uppercase tracking-widest">Confirm Delete</h2>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">ဤလုပ်ဆောင်ချက်ကို ပြန်မဖြေဖြစ်နိုင်ပါ</p>
              </div>
            </div>

            {/* Voucher details */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-1">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Voucher ဖျက်မည်</p>
              <p className="text-xl font-black text-rose-700 tracking-widest">{deleteModal.voucherno}</p>
            </div>

            {/* Confirm input */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                အတည်ပြုရန် Voucher ID ကို ရိုက်ထည့်ပါ
              </label>
              <input
                autoFocus
                type="text"
                className="w-full p-4 bg-slate-50 border-2 border-slate-300 rounded-2xl text-sm font-black text-slate-950 uppercase outline-none focus:border-rose-400 tracking-widest transition-all"
                placeholder={deleteModal.voucherno}
                value={deleteModal.confirmInput}
                onChange={e => setDeleteModal(m => ({ ...m, confirmInput: e.target.value.toUpperCase() }))}
                onKeyDown={e => e.key === 'Enter' && confirmDelete()}
              />
              {deleteModal.confirmInput.length > 0 && deleteModal.confirmInput !== deleteModal.voucherno && (
                <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">✗ ID မတူပါ</p>
              )}
              {deleteModal.confirmInput === deleteModal.voucherno && (
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">✓ ID တူပါသည်</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteModal({ open: false, voucherno: '', confirmInput: '', loading: false })}
                className="flex-1 py-4 bg-slate-100 text-slate-950 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all border border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteModal.confirmInput !== deleteModal.voucherno || deleteModal.loading}
                className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${
                  deleteModal.confirmInput === deleteModal.voucherno && !deleteModal.loading
                    ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {deleteModal.loading ? (
                  <><span className="animate-spin">⟳</span> Deleting...</>
                ) : (
                  <><Trash2 size={14}/> Permanent Delete</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
