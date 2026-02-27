"use client"
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Image as ImageIcon, X, TrendingUp, Layers, Printer, BarChart3, ListChecks, Filter, AlertTriangle, Trash2 } from 'lucide-react';
import { deleteFromSheet } from '@/lib/api';

const COLORS = ['#cbd5e1', '#e2e8f0', '#f1f5f9', '#94a3b8', '#64748b', '#475569', '#cbd5e1', '#f1f5f9'];

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
        image_data: (v.image_data || v.Image_Data || '').toString(),
        entered_by: (v.entered_by || v.Entered_By || 'GM').toString().toUpperCase(),
        account: (v.account || v.Account || 'GM ACCOUNT').toString().toUpperCase()
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

  const handleDelete = async (voucherno: string) => {
    if(confirm(`⚠️ WARNING: ARE YOU SURE YOU WANT TO PERMANENTLY DELETE VOUCHER ${voucherno}?`)) {
      try {
        await deleteFromSheet(voucherno);
        alert("TRANSACTION DELETED SUCCESSFULLY.");
        window.location.reload();
      } catch (err) { alert("FAILED TO DELETE TRANSACTION."); }
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
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-3 items-center font-black print:hidden">
        <Filter className="text-slate-400" size={18}/>
        <input type="date" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-black text-slate-950" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} />
        <span className="text-[10px] text-slate-400 font-black">TO</span>
        <input type="date" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-black text-slate-950" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} />
        <input type="text" placeholder="CATEGORY..." className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none flex-grow font-black text-slate-950 uppercase" value={filter.category} onChange={e => setFilter({...filter, category: e.target.value})} />
        <input type="text" placeholder="VENDOR..." className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none flex-grow font-black text-slate-950 uppercase" value={filter.vendor} onChange={e => setFilter({...filter, vendor: e.target.value})} />
        <button onClick={() => setFilter({ startDate: '', endDate: '', category: '', item: '', vendor: '' })} className="p-2.5 px-4 bg-slate-200 text-slate-950 rounded-lg text-xs hover:bg-slate-300 transition-all font-black">CLEAR</button>
        <Link href="/report" className="p-2.5 px-6 bg-slate-950 text-white rounded-lg text-xs hover:bg-slate-800 transition-all font-black flex items-center gap-2 ml-auto shadow-sm">
          <Printer size={16}/> PRINT REPORT
        </Link>
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
              <BarChart data={analytics.trends}>
                <CartesianGrid vertical={false} stroke="#f1f5f9"/><XAxis dataKey="date" hide/><YAxis tick={{fontSize: 9, fontWeight: 900, fill: '#0f172a' }}/><Tooltip/><Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, color: '#0f172a' }}/>
                <Bar dataKey="income" fill="#10b981" name="IN" radius={[4, 4, 0, 0]} /><Bar dataKey="expense" fill="#f43f5e" name="OUT" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 min-h-[320px]">
          <h3 className="text-[10px] text-slate-500 mb-6 flex items-center gap-2 font-black"><Layers size={16}/> ALLOCATION</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.categories} innerRadius={60} outerRadius={90} paddingAngle={6} dataKey="value" stroke="none">
                  {analytics.categories.map((_:any, i:any) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip/><Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900, color: '#0f172a' }}/>
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
            <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 min-h-[320px]">
              <h4 className="text-xs text-slate-500 tracking-widest mb-6 font-black">{catChart.name}</h4>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catChart.data}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9"/><XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 900, fill: '#0f172a'}}/><YAxis tick={{fontSize: 9, fontWeight: 900, fill: '#0f172a'}}/><Tooltip/><Legend iconType="rect" wrapperStyle={{ fontSize: '10px', fontWeight: 900, color: '#0f172a' }}/>
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
    </div>
  );
}
