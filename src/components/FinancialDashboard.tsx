"use client"
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Tag, Image as ImageIcon, X, TrendingUp, Layers, Printer, BarChart3, ListChecks, Filter } from 'lucide-react';

const COLORS = ['#1e1b4b', '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9'];

export default function FinancialDashboard({ vouchers = [] }: { vouchers: any[] }) {
  const [filter, setFilter] = useState({ startDate: '', endDate: '', category: '', item: '', vendor: '' });
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  // ၁။ Note နှင့် Sub 3, 4, 5 များကိုပါ ဆွဲထုတ်ခြင်း [cite: 2026-02-23]
  const normalizedData = useMemo(() => {
    return (vouchers || []).map(v => {
      const rawDate = v.date || v.Date || '';
      const cleanDate = rawDate.toString().split('T')[0]; 
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
        note: (v.note || v.Note || '').toString().toUpperCase(), // 🔴 Note ဖတ်ရန်
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
        v.item.toLowerCase().includes(filter.item.toLowerCase()) &&
        v.vendor.toLowerCase().includes(filter.vendor.toLowerCase());
    });
  }, [normalizedData, filter]);

  const categorySpecificData = useMemo(() => {
    const cats = Array.from(new Set(filtered.filter(v => v.type === "Cash Out").map(v => v.category)));
    return cats.map(catName => {
      const catVouchers = filtered.filter(v => v.category === catName);
      const subKeysSet = new Set<string>();
      const dateMap: any = {};
      catVouchers.forEach(v => {
        if (!dateMap[v.date]) dateMap[v.date] = { date: v.date };
        const key = v.sub2 ? `${v.sub1} - ${v.sub2}` : v.sub1;
        subKeysSet.add(key);
        dateMap[v.date][key] = (dateMap[v.date][key] || 0) + v.cost_total;
      });
      return { name: catName, data: Object.keys(dateMap).map(k => dateMap[k]).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()), subKeys: Array.from(subKeysSet) };
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

  return (
    <div className="space-y-12 font-black text-slate-950 uppercase">
      {/* FILTERS */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 flex flex-wrap gap-4 items-center font-black">
        <Filter className="text-purple-600" size={24}/>
        <input type="date" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} />
        <span className="text-slate-400 font-black">TO</span>
        <input type="date" className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none font-black" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} />
        <input type="text" placeholder="CATEGORY..." className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none flex-grow font-black uppercase" value={filter.category} onChange={e => setFilter({...filter, category: e.target.value})} />
        <input type="text" placeholder="VENDOR..." className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none flex-grow font-black uppercase" value={filter.vendor} onChange={e => setFilter({...filter, vendor: e.target.value})} />
        <button onClick={() => setFilter({ startDate: '', endDate: '', category: '', item: '', vendor: '' })} className="p-3 bg-slate-950 text-white rounded-xl text-xs hover:bg-rose-600 transition-all font-black">CLEAR</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-emerald-800">
          <p className="text-[10px] opacity-80 mb-4 tracking-widest font-black">CASH IN</p>
          <p className="text-4xl font-black">{analytics.totalIn.toLocaleString()} MMK</p>
        </div>
        <div className="bg-rose-600 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-rose-800">
          <p className="text-[10px] opacity-80 mb-4 tracking-widest font-black">CASH OUT</p>
          <p className="text-4xl font-black">{analytics.totalOut.toLocaleString()} MMK</p>
        </div>
        <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-xl border-b-[10px] border-purple-900">
          <p className="text-[10px] opacity-80 mb-4 tracking-widest font-black">BALANCE</p>
          <p className="text-4xl font-black">{analytics.balance.toLocaleString()} MMK</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl min-h-[450px]">
          <h3 className="text-[10px] text-slate-400 mb-8 flex items-center gap-3 font-black"><TrendingUp size={18}/> TRENDS</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.trends}>
                <CartesianGrid vertical={false} stroke="#f1f5f9"/><XAxis dataKey="date" hide/><YAxis tick={{fontSize: 10, fontWeight: 900}}/><Tooltip/><Legend iconType="circle" />
                <Bar dataKey="income" fill="#059669" name="IN" radius={[6, 6, 0, 0]} /><Bar dataKey="expense" fill="#e11d48" name="OUT" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl min-h-[450px]">
          <h3 className="text-[10px] text-slate-400 mb-8 flex items-center gap-3 font-black"><Layers size={18}/> ALLOCATION</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.categories} innerRadius={90} outerRadius={125} paddingAngle={8} dataKey="value" stroke="none">
                  {analytics.categories.map((_:any, i:any) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip/><Legend/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DYNAMIC CHARTS */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 px-4"><BarChart3 className="text-purple-600" size={32} /><h2 className="text-2xl tracking-tighter uppercase font-black">SUB-CATEGORY BREAKDOWN</h2></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {categorySpecificData.map((catChart, idx) => (
            <div key={idx} className="bg-white p-8 rounded-[3.5rem] shadow-2xl border-2 border-slate-100 min-h-[450px]">
              <h4 className="text-sm text-purple-900 tracking-widest mb-8 font-black">{catChart.name} ANALYSIS</h4>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catChart.data}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9"/><XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 900}}/><YAxis tick={{fontSize: 9, fontWeight: 900}}/><Tooltip/><Legend iconType="rect" />
                    {catChart.subKeys.map((sub, sIdx) => (
                      <Bar key={sub} dataKey={sub} stackId="a" fill={COLORS[sIdx % COLORS.length]} name={sub} radius={sIdx === catChart.subKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🔴 HIERARCHICAL AUDIT LOG (WITH NOTES & SUB 1 TO 5) 🔴 */}
      <div className="space-y-12">
        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-4"><ListChecks className="text-purple-600" size={36} /><h2 className="text-3xl tracking-tighter font-black">DETAILED AUDIT LOG</h2></div>
          <button onClick={() => window.print()} className="p-4 bg-purple-100 text-purple-900 rounded-2xl hover:bg-purple-900 hover:text-white transition-all font-black"><Printer size={24}/></button>
        </div>
        
        {Object.keys(groupedAuditLog).map((catName) => (
          <div key={catName} className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border-2 border-slate-100 mb-12">
            
            {/* Main Category Header */}
            <div className="bg-slate-950 p-8 text-white flex justify-between items-center border-b-8 border-purple-600">
              <h3 className="text-2xl tracking-widest font-black">{catName}</h3>
              <p className="text-2xl font-black">{Object.keys(groupedAuditLog[catName]).reduce((s, sub) => s + groupedAuditLog[catName][sub].reduce((ss, i) => ss + i.cost_total, 0), 0).toLocaleString()} MMK</p>
            </div>

            {/* Sub Category 1 Grouping */}
            {Object.keys(groupedAuditLog[catName]).map((subName) => (
              <div key={subName} className="p-8 border-b last:border-0">
                <h4 className="text-sm text-slate-950 mb-6 border-l-8 border-purple-900 pl-4 font-black">{subName}</h4>
                <table className="w-full text-left uppercase">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 border-b font-black">
                    <tr><th className="pb-4 px-4 font-black">DATE & ID</th><th className="pb-4 px-4 font-black">DETAILS & NOTES</th><th className="pb-4 px-4 text-right font-black">AMOUNT</th><th className="pb-4 px-4 text-center font-black">PROOF</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-black">
                    {groupedAuditLog[catName][subName].map((v: any, vIdx: number) => (
                      <tr key={vIdx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-6 px-4">
                          <div className="font-black">{v.date}</div>
                          <div className="text-purple-900 text-xs mt-1 font-black">{v.voucherno}</div>
                        </td>
                        <td className="py-6 px-4">
                          <div className="text-sm font-black">{v.item}</div>
                          
                          {/* 🔴 Sub 2 to 5 များကို အဆင့်ဆင့် ပြသခြင်း 🔴 */}
                          <div className="text-[9px] text-slate-400 mt-1 font-black uppercase">
                            {v.vendor} 
                            {[v.sub2, v.sub3, v.sub4, v.sub5].filter(Boolean).map(s => ` ➔ ${s}`).join('')}
                          </div>
                          
                          {/* 🔴 Note ရှိပါက သီးသန့် Box ဖြင့် ပြသခြင်း 🔴 */}
                          {v.note && (
                            <div className="mt-3 text-[10px] text-purple-900 bg-purple-50 p-3 rounded-xl font-black border-l-4 border-purple-500 max-w-lg leading-relaxed">
                              📝 NOTE: {v.note}
                            </div>
                          )}
                        </td>
                        <td className="py-6 px-4 text-right text-xl font-black">{v.cost_total.toLocaleString()}</td>
                        <td className="py-6 px-4 text-center font-black">{v.image_data ? <button onClick={() => setSelectedImg(v.image_data)} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-950 hover:text-white transition-all"><ImageIcon size={18}/></button> : "-"}</td>
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
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-8 backdrop-blur-md" onClick={() => setSelectedImg(null)}>
          <button className="absolute top-10 right-10 text-white hover:text-purple-400 font-black"><X size={48}/></button>
          <img src={selectedImg} className="max-w-full max-h-full rounded-3xl border-8 border-white shadow-2xl" alt="Proof" />
        </div>
      )}
    </div>
  );
}
