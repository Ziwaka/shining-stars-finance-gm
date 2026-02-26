"use client"
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Tag, Image as ImageIcon, X, TrendingUp, Layers, Printer, BarChart3, ListChecks, Filter } from 'lucide-react';

const COLORS = ['#1e1b4b', '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9'];

export default function FinancialDashboard({ vouchers = [] }: { vouchers: any[] }) {
  const [filter, setFilter] = useState({ startDate: '', endDate: '', category: '', item: '', vendor: '' });
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

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
        note: (v.note || v.Note || '').toString().toUpperCase(),
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
    <div className="space-y-8 font-black text-slate-950 uppercase">
      {/* 🔴 FILTERS (Compact) 🔴 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-3 items-center font-black">
        <Filter className="text-purple-600" size={18}/>
        <input type="date" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-black" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} />
        <span className="text-[10px] text-slate-400 font-black">TO</span>
        <input type="date" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-black" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} />
        <input type="text" placeholder="CATEGORY..." className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none flex-grow font-black uppercase" value={filter.category} onChange={e => setFilter({...filter, category: e.target.value})} />
        <input type="text" placeholder="VENDOR..." className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none flex-grow font-black uppercase" value={filter.vendor} onChange={e => setFilter({...filter, vendor: e.target.value})} />
        <button onClick={() => setFilter({ startDate: '', endDate: '', category: '', item: '', vendor: '' })} className="p-2.5 px-4 bg-slate-950 text-white rounded-lg text-xs hover:bg-rose-600 transition-all font-black">CLEAR</button>
      </div>

      {/* 🔴 SUMMARY TILES (Compact) 🔴 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-md border-b-[6px] border-emerald-800">
          <p className="text-[10px] opacity-80 mb-2 tracking-widest font-black">CASH IN</p>
          <p className="text-3xl font-black">{analytics.totalIn.toLocaleString()} MMK</p>
        </div>
        <div className="bg-rose-600 p-6 rounded-[2rem] text-white shadow-md border-b-[6px] border-rose-800">
          <p className="text-[10px] opacity-80 mb-2 tracking-widest font-black">CASH OUT</p>
          <p className="text-3xl font-black">{analytics.totalOut.toLocaleString()} MMK</p>
        </div>
        <div className="bg-slate-950 p-6 rounded-[2rem] text-white shadow-md border-b-[6px] border-purple-900">
          <p className="text-[10px] opacity-80 mb-2 tracking-widest font-black">BALANCE</p>
          <p className="text-3xl font-black">{analytics.balance.toLocaleString()} MMK</p>
        </div>
      </div>

      {/* 🔴 MAIN CHARTS (Compact) 🔴 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 min-h-[320px]">
          <h3 className="text-[10px] text-slate-400 mb-6 flex items-center gap-2 font-black"><TrendingUp size={16}/> TRENDS</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.trends}>
                <CartesianGrid vertical={false} stroke="#f1f5f9"/><XAxis dataKey="date" hide/><YAxis tick={{fontSize: 9, fontWeight: 900}}/><Tooltip/><Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900 }}/>
                <Bar dataKey="income" fill="#059669" name="IN" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" fill="#e11d48" name="OUT" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 min-h-[320px]">
          <h3 className="text-[10px] text-slate-400 mb-6 flex items-center gap-2 font-black"><Layers size={16}/> ALLOCATION</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.categories} innerRadius={60} outerRadius={90} paddingAngle={6} dataKey="value" stroke="none">
                  {analytics.categories.map((_:any, i:any) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip/><Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900 }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 🔴 DYNAMIC CHARTS (Compact) 🔴 */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <BarChart3 className="text-purple-600" size={24} />
          <h2 className="text-xl tracking-tight uppercase font-black">SUB-CATEGORY BREAKDOWN</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categorySpecificData.map((catChart, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 min-h-[320px]">
              <h4 className="text-xs text-purple-900 tracking-widest mb-6 font-black">{catChart.name}</h4>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catChart.data}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9"/><XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 900}}/><YAxis tick={{fontSize: 9, fontWeight: 900}}/><Tooltip/><Legend iconType="rect" wrapperStyle={{ fontSize: '10px', fontWeight: 900 }}/>
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

      {/* 🔴 HIERARCHICAL AUDIT LOG (Compact) 🔴 */}
      <div className="space-y-8">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-3">
            <ListChecks className="text-purple-600" size={24} />
            <h2 className="text-xl tracking-tight font-black">DETAILED AUDIT LOG</h2>
          </div>
        </div>
        
        {Object.keys(groupedAuditLog).map((catName) => (
          <div key={catName} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center border-b-4 border-purple-600">
              <h3 className="text-lg tracking-widest font-black">{catName}</h3>
              <p className="text-lg font-black">{Object.keys(groupedAuditLog[catName]).reduce((s, sub) => s + groupedAuditLog[catName][sub].reduce((ss, i) => ss + i.cost_total, 0), 0).toLocaleString()} MMK</p>
            </div>

            {Object.keys(groupedAuditLog[catName]).map((subName) => (
              <div key={subName} className="p-5 border-b last:border-0 border-slate-100">
                <h4 className="text-xs text-slate-950 mb-4 border-l-4 border-purple-900 pl-3 font-black">{subName}</h4>
                <table className="w-full text-left uppercase">
                  <thead className="bg-slate-50 text-[9px] text-slate-400 border-b border-slate-200 font-black">
                    <tr>
                      <th className="pb-3 px-3 font-black">DATE & ID</th>
                      <th className="pb-3 px-3 font-black">DETAILS & NOTES</th>
                      <th className="pb-3 px-3 text-right font-black">AMOUNT</th>
                      <th className="pb-3 px-3 text-center font-black">PROOF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-black">
                    {groupedAuditLog[catName][subName].map((v: any, vIdx: number) => (
                      <tr key={vIdx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-3">
                          <div className="text-[10px] font-black">{v.date}</div>
                          <div className="text-purple-900 text-[10px] mt-0.5 font-black">{v.voucherno}</div>
                        </td>
                        <td className="py-4 px-3">
                          <div className="text-xs font-black">{v.item}</div>
                          <div className="text-[9px] text-slate-400 mt-1 font-black uppercase">
                            {v.vendor} 
                            {[v.sub2, v.sub3, v.sub4, v.sub5].filter(Boolean).map(s => ` ➔ ${s}`).join('')}
                          </div>
                          {v.note && (
                            <div className="mt-2 text-[9px] text-purple-900 bg-purple-50 p-2 rounded-lg font-black border-l-2 border-purple-500 max-w-lg">
                              📝 {v.note}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3 text-right text-base font-black">{v.cost_total.toLocaleString()}</td>
                        <td className="py-4 px-3 text-center font-black">
                          {v.image_data ? <button onClick={() => setSelectedImg(v.image_data)} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-950 hover:text-white transition-all"><ImageIcon size={16}/></button> : "-"}
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
        <div className="fixed inset-0 bg-slate-950/95 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm" onClick={() => setSelectedImg(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-purple-400 font-black"><X size={32}/></button>
          <img src={selectedImg} className="max-w-full max-h-full rounded-2xl border-4 border-white shadow-xl" alt="Proof" />
        </div>
      )}
    </div>
  );
}
