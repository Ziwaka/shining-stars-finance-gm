"use client"
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Image as ImageIcon, X, TrendingUp, Layers, Printer, BarChart3, ListChecks, Filter, AlertTriangle, Trash2, ShieldAlert, ChevronDown } from 'lucide-react';
import { deleteFromSheet } from '@/lib/api';

const COLORS = [
  '#f43f5e','#fb923c','#facc15','#4ade80',
  '#34d399','#22d3ee','#818cf8','#c084fc',
  '#f472b6','#94a3b8','#60a5fa','#a78bfa'
];

const renderPieLabel = ({ cx, cy, midAngle, outerRadius, name, percent }: any) => {
  if (percent < 0.02) return null;
  const RAD = Math.PI / 180;
  const r = outerRadius + 22;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text x={x} y={y} fill="#0f172a" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
      style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

export default function FinancialDashboard({ vouchers = [], onRefresh }: { vouchers: any[], onRefresh?: () => void }) {

  const [filter, setFilter] = useState({ startDate: '', endDate: '', category: '', subCategory: '', vendor: '', item: '' });
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; voucherno: string; confirmInput: string; loading: boolean; }>({ open: false, voucherno: '', confirmInput: '', loading: false });

  const normalizedData = useMemo(() => {
    return (vouchers || []).map(v => {
      const rawDate   = v.date || v.Date || '';
      const cleanDate = rawDate.toString().split('T')[0];
      const rawCost   = v['cost_(total)'] || v.cost_total || v.Cost_Total || 0;
      const rawIncome = v.income || v.Income || 0;
      const typeStr   = (v.type || v.Type || 'Cash Out').toString().trim();
      const isCashIn  = typeStr.toLowerCase() === 'cash in';
      const amount    = isCashIn
        ? Math.round(Number(rawIncome) || Number(rawCost) || 0)
        : Math.round(Number(rawCost) || 0);
      const itemName  = v.item_description || v['item_description'] || v.item || v.Item || '';
      return {
        date:       cleanDate.toString(),
        voucherno:  (v.voucher_no || v.voucherno || '').toString(),
        type:       typeStr,
        category:   (v.category || v.Category   || 'UNCLASSIFIED').toString().toUpperCase(),
        sub1:       (v.sub_1    || v.sub1        || 'GENERAL').toString().toUpperCase(),
        sub2:       (v.sub_2    || v.sub2        || '').toString().toUpperCase(),
        sub3:       (v.sub_3    || v.sub3        || '').toString().toUpperCase(),
        sub4:       (v.sub_4    || v.sub4        || '').toString().toUpperCase(),
        sub5:       (v.sub_5    || v.sub5        || '').toString().toUpperCase(),
        item:       itemName.toString(),
        vendor:     (v.vendor   || v.Vendor      || '').toString(),
        note:       (v.note     || v.Note        || '').toString(),
        cost_total: amount,
        image_data: (v.image_data || v.Image_Data || '').toString(),
        entered_by: (v.entered_by || v.Entered_By || '').toString().toUpperCase(),
        account:    (v.account    || v.Account    || '').toString().toUpperCase(),
      };
    });
  }, [vouchers]);

  const categoryOptions    = useMemo(() => Array.from(new Set(normalizedData.map(v => v.category))).filter(Boolean).sort(), [normalizedData]);
  const subCategoryOptions = useMemo(() => Array.from(new Set(normalizedData.filter(v => !filter.category || v.category === filter.category).map(v => v.sub1))).filter(Boolean).sort(), [normalizedData, filter.category]);
  const vendorOptions      = useMemo(() => Array.from(new Set(normalizedData.map(v => v.vendor))).filter(Boolean).sort(), [normalizedData]);

  const filtered = useMemo(() => normalizedData.filter(v => {
    const inDate = (!filter.startDate || v.date >= filter.startDate) && (!filter.endDate || v.date <= filter.endDate);
    return inDate &&
      (!filter.category    || v.category === filter.category) &&
      (!filter.subCategory || v.sub1     === filter.subCategory) &&
      (!filter.vendor      || v.vendor   === filter.vendor) &&
      (!filter.item        || v.item.toLowerCase().includes(filter.item.toLowerCase()));
  }), [normalizedData, filter]);

  const analytics = useMemo(() => {
    let totalIn = 0, totalOut = 0;
    const catGroup: Record<string, number> = {};
    const trendGroup: Record<string, { date: string; income: number; expense: number }> = {};
    filtered.forEach(v => {
      if (v.type === 'Cash In') { totalIn += v.cost_total; }
      else { totalOut += v.cost_total; catGroup[v.category] = (catGroup[v.category] || 0) + v.cost_total; }
      if (v.date) {
        if (!trendGroup[v.date]) trendGroup[v.date] = { date: v.date, income: 0, expense: 0 };
        if (v.type === 'Cash In') trendGroup[v.date].income  += v.cost_total;
        else                      trendGroup[v.date].expense += v.cost_total;
      }
    });
    return {
      totalIn, totalOut, balance: totalIn - totalOut,
      categories: Object.keys(catGroup).map(name => ({ name, value: catGroup[name] })),
      trends: Object.values(trendGroup).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  }, [filtered]);

  const categorySpecificData = useMemo(() => {
    const cats = Array.from(new Set(filtered.filter(v => v.type === 'Cash Out').map(v => v.category)));
    return cats.map(catName => {
      const catVouchers = filtered.filter(v => v.category === catName && v.type === 'Cash Out');
      const subKeysSet  = new Set<string>();
      const dateMap: Record<string, any> = {};
      catVouchers.forEach(v => {
        if (!dateMap[v.date]) dateMap[v.date] = { date: v.date };
        const key = v.sub2 ? `${v.sub1} › ${v.sub2}` : v.sub1;
        subKeysSet.add(key);
        dateMap[v.date][key] = (dateMap[v.date][key] || 0) + v.cost_total;
      });
      return {
        name: catName, total: catVouchers.reduce((s, v) => s + v.cost_total, 0),
        data: Object.values(dateMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        subKeys: Array.from(subKeysSet),
      };
    });
  }, [filtered]);

  const groupedAuditLog = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    filtered.forEach(v => {
      if (!groups[v.category])       groups[v.category]       = {};
      if (!groups[v.category][v.sub1]) groups[v.category][v.sub1] = [];
      groups[v.category][v.sub1].push(v);
    });
    return groups;
  }, [filtered]);

  const handleDelete  = (voucherno: string) => setDeleteModal({ open: true, voucherno, confirmInput: '', loading: false });
  const confirmDelete = async () => {
    if (deleteModal.confirmInput !== deleteModal.voucherno) return;
    setDeleteModal(m => ({ ...m, loading: true }));
    try {
      await deleteFromSheet(deleteModal.voucherno);
      setDeleteModal({ open: false, voucherno: '', confirmInput: '', loading: false });
      if (onRefresh) onRefresh();
    } catch { setDeleteModal(m => ({ ...m, loading: false })); alert('FAILED TO DELETE.'); }
  };

  const FilterSelect = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
    <div className="relative">
      <select className="appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-black text-slate-950 uppercase cursor-pointer min-w-[130px]"
        value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
    </div>
  );

  return (
    <div className="space-y-8 font-black text-slate-950 uppercase">

      {analytics.balance < 0 && (
        <div className="w-full bg-rose-50 p-3 rounded-2xl border border-rose-200 overflow-hidden print:hidden">
          <div className="animate-pulse flex justify-center items-center gap-4 text-xs tracking-widest font-black">
            <AlertTriangle size={18} className="text-rose-600"/>
            ⚠️ WARNING: BALANCE NEGATIVE ({analytics.balance.toLocaleString()} MMK)
            <AlertTriangle size={18} className="text-rose-600"/>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-3 items-center print:hidden">
        <Filter className="text-slate-400" size={16}/>
        <input type="date" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-black text-slate-950" value={filter.startDate} onChange={e => setFilter({ ...filter, startDate: e.target.value })}/>
        <span className="text-[10px] text-slate-400">TO</span>
        <input type="date" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-black text-slate-950" value={filter.endDate} onChange={e => setFilter({ ...filter, endDate: e.target.value })}/>
        <FilterSelect label="CATEGORY"     value={filter.category}    options={categoryOptions}    onChange={v => setFilter({ ...filter, category: v, subCategory: '' })}/>
        <FilterSelect label="SUB-CATEGORY" value={filter.subCategory} options={subCategoryOptions} onChange={v => setFilter({ ...filter, subCategory: v })}/>
        <FilterSelect label="VENDOR"       value={filter.vendor}      options={vendorOptions}      onChange={v => setFilter({ ...filter, vendor: v })}/>
        <input type="text" placeholder="ITEM..." className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-black text-slate-950 uppercase min-w-[120px]" value={filter.item} onChange={e => setFilter({ ...filter, item: e.target.value })}/>
        <button onClick={() => setFilter({ startDate: '', endDate: '', category: '', subCategory: '', vendor: '', item: '' })} className="p-2.5 px-4 bg-slate-200 text-slate-950 rounded-lg text-xs hover:bg-slate-300 font-black">CLEAR</button>
        <Link href="/report" className="p-2.5 px-6 bg-slate-950 text-white rounded-lg text-xs hover:bg-slate-800 font-black flex items-center gap-2 ml-auto shadow-sm"><Printer size={14}/> PRINT REPORT</Link>
      </div>

      {/* KPI TILES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-200 shadow-sm">
          <p className="text-[10px] text-slate-500 mb-2 tracking-widest">CASH IN</p>
          <p className="text-3xl font-black text-emerald-700">{analytics.totalIn.toLocaleString()} <span className="text-base">MMK</span></p>
        </div>
        <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-200 shadow-sm">
          <p className="text-[10px] text-slate-500 mb-2 tracking-widest">CASH OUT</p>
          <p className="text-3xl font-black text-rose-700">{analytics.totalOut.toLocaleString()} <span className="text-base">MMK</span></p>
        </div>
        <div className={`p-6 rounded-[2rem] border shadow-sm ${analytics.balance >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-rose-100 border-rose-300'}`}>
          <p className="text-[10px] text-slate-500 mb-2 tracking-widest">BALANCE</p>
          <p className={`text-3xl font-black ${analytics.balance >= 0 ? 'text-purple-700' : 'text-rose-700'}`}>{analytics.balance.toLocaleString()} <span className="text-base">MMK</span></p>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 min-h-[320px]">
          <h3 className="text-[10px] text-slate-500 mb-6 flex items-center gap-2 tracking-widest"><TrendingUp size={14}/> DAILY TRENDS</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.trends} barGap={2}>
                <CartesianGrid vertical={false} stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }} tickLine={false} axisLine={false}/>
                <YAxis tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}/>
                <Tooltip formatter={(val: any) => Number(val).toLocaleString() + ' MMK'} labelStyle={{ fontWeight: 900, fontSize: 10 }}/>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 900 }}/>
                <Bar dataKey="income"  fill="#10b981" name="CASH IN"  radius={[4,4,0,0]}/>
                <Bar dataKey="expense" fill="#f43f5e" name="CASH OUT" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 min-h-[320px]">
          <h3 className="text-[10px] text-slate-500 mb-6 flex items-center gap-2 tracking-widest"><Layers size={14}/> EXPENSE ALLOCATION</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.categories} innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none" labelLine={true} label={renderPieLabel}>
                  {analytics.categories.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(val: any) => Number(val).toLocaleString() + ' MMK'}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SUB-CATEGORY STACKED CHARTS */}
      {categorySpecificData.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2"><BarChart3 className="text-slate-400" size={22}/><h2 className="text-lg tracking-widest font-black">SUB-CATEGORY BREAKDOWN</h2></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {categorySpecificData.map((catChart, idx) => (
              <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 min-h-[300px]">
                <div className="flex justify-between items-start mb-6">
                  <h4 className="text-xs text-slate-500 tracking-widest">{catChart.name}</h4>
                  <span className="text-xs font-black">{catChart.total.toLocaleString()} MMK</span>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catChart.data}>
                      <CartesianGrid vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="date" tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }} tickLine={false} axisLine={false}/>
                      <YAxis tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}/>
                      <Tooltip formatter={(val: any) => Number(val).toLocaleString() + ' MMK'}/>
                      <Legend iconType="rect" wrapperStyle={{ fontSize: 9, fontWeight: 900 }}/>
                      {catChart.subKeys.map((sub, sIdx) => (
                        <Bar key={sub} dataKey={sub} stackId="a" fill={COLORS[sIdx % COLORS.length]} name={sub} radius={sIdx === catChart.subKeys.length - 1 ? [4,4,0,0] : [0,0,0,0]}/>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAILED AUDIT LOG */}
      <div className="space-y-8">
        <div className="flex items-center gap-3 px-2"><ListChecks className="text-slate-400" size={22}/><h2 className="text-lg tracking-widest font-black">DETAILED AUDIT LOG</h2></div>
        {Object.keys(groupedAuditLog).map(catName => {
          const allRows   = Object.values(groupedAuditLog[catName]).flat() as any[];
          const catCashOut = allRows.filter((v: any) => v.type !== 'Cash In').reduce((s: number, v: any) => s + v.cost_total, 0);
          const catCashIn  = allRows.filter((v: any) => v.type === 'Cash In').reduce((s: number, v: any) => s + v.cost_total, 0);
          return (
            <div key={catName} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-6 py-4 flex justify-between items-center border-b border-slate-200">
                <h3 className="text-base tracking-widest font-black">{catName}</h3>
                <div className="flex items-center gap-4 text-xs font-black">
                  {catCashIn  > 0 && <span className="text-emerald-600">+ {catCashIn.toLocaleString()}</span>}
                  {catCashOut > 0 && <span className="text-rose-600">- {catCashOut.toLocaleString()}</span>}
                  <span className="text-slate-400 text-[10px]">MMK</span>
                </div>
              </div>
              {Object.keys(groupedAuditLog[catName]).map(subName => (
                <div key={subName} className="p-5 border-b last:border-0 border-slate-100">
                  <h4 className="text-[10px] text-slate-500 mb-4 border-l-4 border-slate-300 pl-3 tracking-widest">{subName}</h4>
                  <table className="w-full text-left uppercase">
                    <thead className="bg-slate-50 text-[9px] text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="pb-3 px-3 font-black">DATE & ID</th>
                        <th className="pb-3 px-3 font-black">DETAILS & ACCOUNT</th>
                        <th className="pb-3 px-3 text-right font-black">AMOUNT</th>
                        <th className="pb-3 px-3 text-center font-black print:hidden">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {groupedAuditLog[catName][subName].map((v: any, vIdx: number) => (
                        <tr key={vIdx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-3">
                            <div className="text-[10px] text-slate-500">{v.date}</div>
                            <div className="text-[10px] font-black mt-0.5">{v.voucherno}</div>
                          </td>
                          <td className="py-4 px-3">
                            <div className="text-xs font-black">{v.item}</div>
                            <div className="text-[9px] text-slate-400 mt-1">{v.vendor}{[v.sub2,v.sub3,v.sub4,v.sub5].filter(Boolean).map(s=>`  ›  ${s}`).join('')}</div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <span className="bg-white text-slate-700 px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-slate-200">ACC: {v.account}</span>
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[8px] font-black tracking-widest border border-slate-200">BY: {v.entered_by}</span>
                            </div>
                            {v.note && <div className="mt-2 text-[9px] text-slate-600 bg-amber-50 p-2 rounded-lg border-l-2 border-amber-300 max-w-lg normal-case">📝 {v.note}</div>}
                          </td>
                          <td className="py-4 px-3 text-right text-sm font-black whitespace-nowrap">
                            {v.type === 'Cash In'
                              ? <span className="text-emerald-600">+ {v.cost_total.toLocaleString()}</span>
                              : <span className="text-rose-600">- {v.cost_total.toLocaleString()}</span>}
                          </td>
                          <td className="py-4 px-3 print:hidden">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleDelete(v.voucherno)} className="p-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                              {v.image_data
                                ? <button onClick={() => setSelectedImg(v.image_data)} className="p-2 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-950 hover:text-white transition-all text-slate-700"><ImageIcon size={14}/></button>
                                : <span className="text-slate-300 text-xs px-2">—</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* IMAGE PREVIEW */}
      {selectedImg && (
        <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm print:hidden" onClick={() => setSelectedImg(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-slate-300"><X size={32}/></button>
          <img src={selectedImg} className="max-w-full max-h-full rounded-2xl border-4 border-white shadow-xl" alt="Proof"/>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 border border-rose-200">
            <div className="flex items-center gap-4">
              <div className="bg-rose-100 p-3 rounded-2xl"><ShieldAlert size={26} className="text-rose-600"/></div>
              <div><h2 className="text-sm font-black tracking-widest">CONFIRM DELETE</h2><p className="text-[10px] text-slate-400 mt-0.5">ဤလုပ်ဆောင်ချက်ကို ပြန်မဖြေဖြစ်နိုင်ပါ</p></div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <p className="text-[9px] text-slate-400 tracking-widest mb-1">VOUCHER</p>
              <p className="text-xl font-black text-rose-700 tracking-widest">{deleteModal.voucherno}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 tracking-widest">VOUCHER ID ရိုက်ထည့်ပါ</label>
              <input autoFocus type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-black text-slate-950 uppercase outline-none focus:border-rose-400 tracking-widest transition-all"
                placeholder={deleteModal.voucherno} value={deleteModal.confirmInput}
                onChange={e => setDeleteModal(m => ({ ...m, confirmInput: e.target.value.toUpperCase() }))}
                onKeyDown={e => e.key === 'Enter' && confirmDelete()}/>
              {deleteModal.confirmInput.length > 0 && deleteModal.confirmInput !== deleteModal.voucherno && <p className="text-[10px] text-rose-500 tracking-widest">✗ ID မတူပါ</p>}
              {deleteModal.confirmInput === deleteModal.voucherno && <p className="text-[10px] text-emerald-600 tracking-widest">✓ ID တူပါသည်</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal({ open: false, voucherno: '', confirmInput: '', loading: false })} className="flex-1 py-4 bg-slate-100 text-slate-950 rounded-2xl text-xs font-black hover:bg-slate-200 border border-slate-200">CANCEL</button>
              <button onClick={confirmDelete} disabled={deleteModal.confirmInput !== deleteModal.voucherno || deleteModal.loading}
                className={`flex-1 py-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all ${deleteModal.confirmInput === deleteModal.voucherno && !deleteModal.loading ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-md' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                {deleteModal.loading ? <><span className="animate-spin">⟳</span> DELETING...</> : <><Trash2 size={13}/> PERMANENT DELETE</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
