"use client"
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCcw, ChevronDown, Download, Calendar, AlertTriangle } from 'lucide-react';

const VEHICLE_PATTERN = /ferry|bus|ယာဉ်|vehicle|truck|van|car/i;

const EXPENSE_MAP: Record<string, { label: string; dot: string; color: string }> = {
  'FUEL'        : { label: 'ဆီဖြည့်',              dot: 'bg-amber-400',  color: 'bg-amber-100 text-amber-800 border-amber-200'   },
  'MAINTENANCE' : { label: 'ပြုပြင်ထိန်းသိမ်း',    dot: 'bg-rose-400',   color: 'bg-rose-100 text-rose-800 border-rose-200'     },
  'TYRE'        : { label: 'တာယာ / လေချိန်',        dot: 'bg-slate-400',  color: 'bg-slate-100 text-slate-700 border-slate-200'  },
  'DRIVER'      : { label: 'Driver ကုန်ကျ',          dot: 'bg-blue-400',   color: 'bg-blue-100 text-blue-800 border-blue-200'     },
  'SERVICE'     : { label: 'Service Fee',             dot: 'bg-purple-400', color: 'bg-purple-100 text-purple-800 border-purple-200'},
  'ROAD FEE'    : { label: 'လမ်းကြေး',               dot: 'bg-green-400',  color: 'bg-green-100 text-green-800 border-green-200' },
  'OTHER'       : { label: 'အခြား',                  dot: 'bg-slate-300',  color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function getExpenseType(subs: string[], category: string): string {
  const all = [...subs, category].map(s => s?.toUpperCase().trim()).filter(Boolean);
  for (const s of all) {
    if (/FUEL|ဆီ/.test(s))                                       return 'FUEL';
    if (/MAINT|REPAIR|OIL|ENGINE|ပြုပြင်|BRAKE|FILTER/.test(s)) return 'MAINTENANCE';
    if (/TYRE|တာယာ|လေချိန်|WHEEL/.test(s))                       return 'TYRE';
    if (/DRIVER|SALARY|WAGE|ALLOWANCE/.test(s))                    return 'DRIVER';
    if (/SERVICE/.test(s))                                         return 'SERVICE';
    if (/ROAD|လမ်းကြေး|TOLL/.test(s))                             return 'ROAD FEE';
  }
  return 'OTHER';
}

const fmt = (n: number) => n.toLocaleString();

function exportCSV(rows: any[], filename: string) {
  const headers = ['Date','Vehicle','Type','Item','Vendor','Amount (MMK)','KM','Voucher No'];
  const data = rows.map(r => [
    r.date, r.vehicleName, getExpenseType(r.subs, r.category),
    `"${(r.item||'').replace(/"/g,'""')}"`,
    r.vendor, r.amount, r.km||'', r.voucherno,
  ]);
  const csv = [headers, ...data].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export default function VehiclesPage() {
  const [vouchers,       setVouchers]       = useState<any[]>([]);
  const [vehicleStartKm, setVehicleStartKm] = useState<Record<string,number>>({});
  const [loading,        setLoading]        = useState(true);
  const [expandedLog,    setExpandedLog]    = useState<string | null>(null);
  const [filterMonth,    setFilterMonth]    = useState('');
  const [activeTab,      setActiveTab]      = useState<'cards' | 'compare'>('cards');

  const load = () => {
    setLoading(true);
    fetch('/api/gas?t=' + Date.now())
      .then(r => r.json())
      .then(d => { setVouchers(d.vouchers || []); setVehicleStartKm(d.vehicleStartKm || {}); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => (vouchers || []).flatMap(v => {
    if ((v.type||'').toString().trim().toLowerCase() === 'cash in') return [];
    const amount   = Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
    const remark   = (v.remark || v.Remark || '').toString();
    const km       = (() => { const m = remark.match(/KM:([\d.]+)/i); return m ? parseFloat(m[1]) : 0; })();
    const subs     = [1,2,3,4,5].map(i => (v[`sub_${i}`]||v[`sub${i}`]||'').toString().toUpperCase().trim()).filter(Boolean);
    const category = (v.category||'').toString().toUpperCase().trim();
    const dateStr  = (v.date||'').toString().split('T')[0];
    const vehicleName = subs.find(s => VEHICLE_PATTERN.test(s)) || '';
    return vehicleName ? [{ date: dateStr, month: dateStr.slice(0,7), category, subs, vehicleName, item: (v.item_description||v['item_description']||'').toString(), vendor: (v.vendor||'').toString(), note: (v.note||'').toString(), voucherno: (v.voucher_no||v.voucherno||'').toString(), amount, km }] : [];
  }), [vouchers]);

  const vehicleNames = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => { if (VEHICLE_PATTERN.test(r.vehicleName)) s.add(r.vehicleName); });
    return Array.from(s).sort();
  }, [rows]);

  const allMonths = useMemo(() => {
    const s = new Set<string>(); rows.forEach(r => { if(r.month) s.add(r.month); });
    return Array.from(s).sort().reverse();
  }, [rows]);

  const filteredRows = useMemo(() =>
    filterMonth ? rows.filter(r => r.month === filterMonth) : rows
  , [rows, filterMonth]);

  const vehicleData = useMemo(() => vehicleNames.map(vname => {
    const allVrows = rows.filter(r => r.vehicleName === vname);         // all time (for KM)
    const vrows    = filteredRows.filter(r => r.vehicleName === vname); // filtered (for spend)

    const total  = vrows.reduce((s,r) => s+r.amount, 0);
    const byType: Record<string,number> = {};
    vrows.forEach(r => { const t=getExpenseType(r.subs,r.category); byType[t]=(byType[t]||0)+r.amount; });
    const byMonth: Record<string,number> = {};
    allVrows.forEach(r => { byMonth[r.month]=(byMonth[r.month]||0)+r.amount; });

    // KM always uses all rows (not filtered)
    const anyKm    = allVrows.filter(r=>r.km>0).sort((a,b)=>a.km-b.km);
    const latestKm = anyKm.length>0 ? anyKm[anyKm.length-1].km : 0;
    const normalizeKey = (s: string) => s.replace(/\s+/g,'').toUpperCase();
    const startKmEntry = Object.entries(vehicleStartKm).find(([k]) => normalizeKey(k) === normalizeKey(vname));
    const startKm  = startKmEntry ? startKmEntry[1] : (anyKm.length>0 ? anyKm[0].km : 0);
    const totalKm  = latestKm > startKm ? latestKm - startKm : 0;
    const fuelTotal = vrows.filter(r=>getExpenseType(r.subs,r.category)==='FUEL').reduce((s,r)=>s+r.amount,0);
    const fuelCostPerKm  = totalKm>0 ? fuelTotal/totalKm : 0;
    const totalCostPerKm = totalKm>0 ? total/totalKm : 0;

    // Last maintenance (from ALL rows)
    const maintRows = allVrows.filter(r => getExpenseType(r.subs,r.category)==='MAINTENANCE').sort((a,b)=>b.date.localeCompare(a.date));
    const lastMaint = maintRows[0] || null;
    const lastMaintKm = maintRows.find(r => r.km>0)?.km || 0;
    const kmSinceMaint = lastMaintKm>0 && latestKm>lastMaintKm ? latestKm - lastMaintKm : 0;

    // Fuel efficiency trend (monthly — all time)
    const fuelTrend: {month:string; cpk:number}[] = [];
    const fuelMonths = Array.from(new Set(allVrows.filter(r=>r.km>0||getExpenseType(r.subs,r.category)==='FUEL').map(r=>r.month))).sort();
    fuelMonths.forEach(m => {
      const mRows = allVrows.filter(r=>r.month===m);
      const mFuel = mRows.filter(r=>getExpenseType(r.subs,r.category)==='FUEL').reduce((s,r)=>s+r.amount,0);
      const mKmRows = mRows.filter(r=>r.km>0).sort((a,b)=>a.km-b.km);
      const mKm = mKmRows.length>=2 ? mKmRows[mKmRows.length-1].km - mKmRows[0].km : 0;
      if (mFuel>0 && mKm>0) fuelTrend.push({ month: m, cpk: Math.round(mFuel/mKm) });
    });

    const logs = [...vrows].sort((a,b)=>b.date.localeCompare(a.date));
    return { name:vname, total, byType, byMonth, latestKm, totalKm, fuelCostPerKm, totalCostPerKm, lastMaint, lastMaintKm, kmSinceMaint, fuelTrend, logs };
  }), [vehicleNames, filteredRows, rows, vehicleStartKm]);

  const grandTotal = vehicleData.reduce((s,v)=>s+v.total,0);
  const grandByMonth: Record<string,number> = {};
  filteredRows.filter(r=>VEHICLE_PATTERN.test(r.vehicleName)).forEach(r=>{ grandByMonth[r.month]=(grandByMonth[r.month]||0)+r.amount; });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
          <Link href="/" className="p-2 bg-slate-100 rounded-xl"><ArrowLeft size={16}/></Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black uppercase tracking-widest">Vehicle Monitor</h1>
            <p className="text-[10px] text-slate-400">{vehicleNames.length} vehicles{filterMonth ? ` · ${filterMonth}` : ''}</p>
          </div>
          <button
            onClick={() => exportCSV(filteredRows.filter(r=>VEHICLE_PATTERN.test(r.vehicleName)), `vehicles-${filterMonth||'all'}-${new Date().toISOString().slice(0,10)}.csv`)}
            className="p-2 bg-slate-100 rounded-xl shrink-0"
            title="CSV Export"
          >
            <Download size={15}/>
          </button>
          <button onClick={load} className="p-2 bg-slate-100 rounded-xl shrink-0">
            <RefreshCcw size={15} className={loading?'animate-spin':''}/>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><RefreshCcw className="animate-spin text-slate-300" size={28}/></div>
        ) : vehicleNames.length === 0 ? (
          <div className="m-4 bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
            <p className="text-4xl">🚌</p>
            <p className="text-sm font-black text-slate-400 uppercase">Vehicle data မရှိသေးပါ</p>
            <p className="text-[11px] text-slate-300">Voucher Sub category မှာ BUS 1 / BUS 2 / FERRY ထည့်ပါ</p>
          </div>
        ) : (
          <div className="p-3 space-y-3">

            {/* ── Month filter ── */}
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar size={13} className="text-slate-400 shrink-0"/>
              <button
                onClick={() => setFilterMonth('')}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${!filterMonth ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
              >
                အားလုံး
              </button>
              {allMonths.map(m => (
                <button
                  key={m}
                  onClick={() => setFilterMonth(filterMonth === m ? '' : m)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${filterMonth === m ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                >
                  {m.slice(5)} လ
                </button>
              ))}
            </div>

            {/* ── View tabs ── */}
            <div className="flex gap-1 bg-slate-200 p-1 rounded-xl">
              {(['cards','compare'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-black transition-all ${activeTab === tab ? 'bg-white shadow-sm text-slate-950' : 'text-slate-500'}`}
                >
                  {tab === 'cards' ? 'ကတ်ပြားမြင်ကွင်း' : 'နှိုင်းယှဉ်ကြည့်'}
                </button>
              ))}
            </div>

            {/* ══ COMPARISON TABLE ══ */}
            {activeTab === 'compare' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-black">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-3 py-2.5 text-slate-500 tracking-widest uppercase font-black">ယာဉ်</th>
                        <th className="text-right px-3 py-2.5 text-slate-500 tracking-widest uppercase font-black">ကုန်ကျ</th>
                        <th className="text-right px-3 py-2.5 text-slate-500 tracking-widest uppercase font-black">KM</th>
                        <th className="text-right px-3 py-2.5 text-slate-500 tracking-widest uppercase font-black">ဆီ/KM</th>
                        <th className="text-right px-3 py-2.5 text-slate-500 tracking-widest uppercase font-black">စုစုပေါင်း/KM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {vehicleData.map(vd => (
                        <tr key={vd.name} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 font-black text-slate-950">{vd.name}</td>
                          <td className="px-3 py-2.5 text-right text-rose-600">{fmt(vd.total)}</td>
                          <td className="px-3 py-2.5 text-right text-blue-600">{vd.totalKm > 0 ? fmt(vd.totalKm) : '—'}</td>
                          <td className="px-3 py-2.5 text-right text-amber-700">{vd.fuelCostPerKm > 0 ? fmt(Math.round(vd.fuelCostPerKm)) : '—'}</td>
                          <td className="px-3 py-2.5 text-right text-purple-700">{vd.totalCostPerKm > 0 ? fmt(Math.round(vd.totalCostPerKm)) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-950 text-white">
                        <td className="px-3 py-2.5 font-black uppercase tracking-widest text-[10px]">TOTAL</td>
                        <td className="px-3 py-2.5 text-right font-black">{fmt(grandTotal)}</td>
                        <td colSpan={3} className="px-3 py-2.5 text-right text-slate-400 text-[10px]">MMK</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Comparison bar chart */}
                <div className="px-4 py-3 border-t border-slate-100 space-y-2">
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">ကုန်ကျ နှိုင်းယှဉ်</p>
                  {vehicleData.map(vd => {
                    const pct = grandTotal > 0 ? Math.round((vd.total / grandTotal) * 100) : 0;
                    const COLORS = ['bg-rose-400','bg-amber-400','bg-blue-400','bg-purple-400','bg-green-400'];
                    const ci = vehicleNames.indexOf(vd.name) % COLORS.length;
                    return (
                      <div key={vd.name} className="space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-black text-slate-700">{vd.name}</span>
                          <span className="text-slate-500">{pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${COLORS[ci]} rounded-full`} style={{ width: `${pct}%` }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ══ GRAND BANNER (cards view) ══ */}
            {activeTab === 'cards' && (
              <>
                <div className="bg-slate-950 text-white rounded-2xl overflow-hidden">
                  <div className="px-5 pt-5 pb-4">
                    <p className="text-[10px] tracking-widest uppercase text-slate-400 mb-1">ယာဉ် အားလုံး · {filterMonth ? filterMonth+' လ' : 'စုစုပေါင်း'}</p>
                    <p className="text-3xl font-black">{fmt(grandTotal)} <span className="text-sm text-slate-400">MMK</span></p>
                  </div>
                  <div className="grid border-t border-slate-800" style={{gridTemplateColumns:`repeat(${Math.min(vehicleData.length,3)},1fr)`}}>
                    {vehicleData.map(v=>(
                      <div key={v.name} className="px-4 py-3 border-r border-slate-800 last:border-r-0">
                        <p className="text-[9px] text-slate-500 uppercase font-black truncate">{v.name}</p>
                        <p className="text-sm font-black text-slate-200 mt-0.5">{fmt(v.total)}</p>
                      </div>
                    ))}
                  </div>
                  {!filterMonth && allMonths.length > 0 && (
                    <div className="border-t border-slate-800 px-5 py-3">
                      <p className="text-[9px] text-slate-500 uppercase font-black mb-2">လစဉ် ကုန်ကျစရိတ်</p>
                      <div className="space-y-1.5">
                        {allMonths.map(m=>{
                          const amt=grandByMonth[m]||0;
                          return (
                            <div key={m} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 w-12 shrink-0">{m.slice(5)} လ</span>
                              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-400 rounded-full" style={{width:`${grandTotal>0?(amt/grandTotal)*100:0}%`}}/>
                              </div>
                              <span className="text-[10px] font-black text-slate-300 w-20 text-right shrink-0">{fmt(amt)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* ══ PER VEHICLE CARDS ══ */}
                {vehicleData.map(vd => {
                  const logOpen = expandedLog === vd.name;
                  const maintAlert = vd.kmSinceMaint > 4000;
                  return (
                    <div key={vd.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

                      {/* Vehicle header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black uppercase">🚌 {vd.name}</p>
                          {maintAlert && (
                            <span className="flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                              <AlertTriangle size={9}/> ပြုပြင်ကြည့်ပါ
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-black">{fmt(vd.total)} MMK</span>
                      </div>

                      {/* Cost by type + monthly */}
                      <div className="grid grid-cols-2 divide-x divide-slate-100">
                        <div className="px-4 py-3 space-y-2">
                          <p className="text-[9px] text-slate-400 uppercase font-black">ကုန်ကျ အမျိုးအစား</p>
                          {Object.entries(vd.byType).sort((a,b)=>b[1]-a[1]).map(([type,amt])=>{
                            const et=EXPENSE_MAP[type]||EXPENSE_MAP['OTHER'];
                            return (
                              <div key={type} className="space-y-0.5">
                                <div className="flex justify-between items-center gap-1">
                                  <span className="text-[10px] text-slate-600 truncate">{et.label}</span>
                                  <span className="text-[10px] font-black shrink-0">{fmt(amt)}</span>
                                </div>
                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full ${et.dot} rounded-full`} style={{width:`${vd.total>0?(amt/vd.total)*100:0}%`}}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="px-4 py-3 space-y-2">
                          <p className="text-[9px] text-slate-400 uppercase font-black">လစဉ်</p>
                          {allMonths.filter(m=>vd.byMonth[m]).map(m=>{
                            const amt=vd.byMonth[m];
                            return (
                              <div key={m} className="space-y-0.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-slate-500 font-black">{m.slice(5)} လ</span>
                                  <span className="text-[10px] font-black">{fmt(amt)}</span>
                                </div>
                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-slate-400 rounded-full" style={{width:`${vd.total>0?(amt/vd.total)*100:0}%`}}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* KM stats */}
                      {(vd.latestKm>0||vd.totalCostPerKm>0) && (
                        <div className="grid grid-cols-2 gap-2 px-4 pb-3 pt-2 border-t border-slate-100">
                          {[
                            {label:'Total KM',      value:vd.totalKm>0         ? fmt(vd.totalKm)                    : '—', unit:'km'},
                            {label:'Odometer',      value:vd.latestKm>0        ? fmt(vd.latestKm)                   : '—', unit:'km'},
                            {label:'ဆီကုန်/KM',     value:vd.fuelCostPerKm>0   ? fmt(Math.round(vd.fuelCostPerKm))  : '—', unit:'MMK/km'},
                            {label:'စုစုပေါင်း/KM', value:vd.totalCostPerKm>0  ? fmt(Math.round(vd.totalCostPerKm)) : '—', unit:'MMK/km'},
                          ].map((k,i)=>(
                            <div key={i} className="bg-slate-50 rounded-xl px-3 py-2 text-center border border-slate-100">
                              <p className="text-[9px] text-slate-400 uppercase font-black">{k.label}</p>
                              <p className="text-sm font-black mt-0.5">{k.value}</p>
                              <p className="text-[9px] text-slate-400">{k.unit}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Last maintenance reminder */}
                      {vd.lastMaint && (
                        <div className={`mx-4 mb-3 rounded-xl p-3 border ${maintAlert ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`text-[9px] uppercase tracking-widest font-black ${maintAlert ? 'text-amber-600' : 'text-slate-400'}`}>
                                {maintAlert ? '⚠️ ' : ''}နောက်ဆုံး ပြုပြင်မှတ်တမ်း
                              </p>
                              <p className="text-[11px] font-black text-slate-700 mt-0.5 truncate max-w-[180px]">
                                {vd.lastMaint.item || 'ပြုပြင်ထိန်းသိမ်း'}
                              </p>
                              <p className="text-[10px] text-slate-500">{vd.lastMaint.date}</p>
                            </div>
                            <div className="text-right shrink-0">
                              {vd.lastMaintKm > 0 && <p className="text-[10px] text-blue-600 font-black">{fmt(vd.lastMaintKm)} km</p>}
                              {vd.kmSinceMaint > 0 && (
                                <p className={`text-[11px] font-black ${maintAlert ? 'text-amber-700' : 'text-slate-600'}`}>
                                  +{fmt(vd.kmSinceMaint)} km ပြေးပြီ
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Fuel efficiency trend */}
                      {vd.fuelTrend.length >= 2 && (
                        <div className="mx-4 mb-3 space-y-1.5">
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">ဆီကုန်/KM လစဉ် trend</p>
                          <div className="flex items-end gap-1 h-12">
                            {vd.fuelTrend.map(({ month, cpk }) => {
                              const maxCpk = Math.max(...vd.fuelTrend.map(x => x.cpk));
                              const pct = maxCpk > 0 ? Math.max(10, Math.round((cpk / maxCpk) * 100)) : 10;
                              const isLast = month === vd.fuelTrend[vd.fuelTrend.length-1].month;
                              return (
                                <div key={month} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                                  <div
                                    className={`w-full rounded-sm transition-all ${isLast ? 'bg-amber-500' : 'bg-amber-200 group-hover:bg-amber-400'}`}
                                    style={{ height: `${Math.round(pct * 0.4)}px` }}
                                  />
                                  <span className="text-[8px] text-slate-400 font-black">{month.slice(5)}</span>
                                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[9px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    {fmt(cpk)} MMK/km
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Log toggle */}
                      <button
                        onClick={() => setExpandedLog(logOpen ? null : vd.name)}
                        className="w-full flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <span className="text-[11px] font-black text-slate-500 uppercase">မှတ်တမ်း {vd.logs.length} ခု</span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${logOpen?'rotate-180':''}`}/>
                      </button>

                      {/* Log detail */}
                      {logOpen && (
                        <div className="divide-y divide-slate-50 border-t border-slate-100">
                          {vd.logs.map((r,i)=>{
                            const etype=EXPENSE_MAP[getExpenseType(r.subs,r.category)]||EXPENSE_MAP['OTHER'];
                            return (
                              <div key={i} className="flex items-start justify-between px-4 py-3 gap-3">
                                <div className="flex-1 min-w-0 space-y-1">
                                  <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full border ${etype.color}`}>{etype.label}</span>
                                  {r.item   && <p className="text-xs text-slate-700 truncate">{r.item}</p>}
                                  {r.note   && <p className="text-[10px] text-slate-400 truncate">{r.note}</p>}
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                                    <span className="text-[9px] text-slate-400">{r.date}</span>
                                    {r.voucherno && <span className="text-[9px] text-slate-400">{r.voucherno}</span>}
                                    {r.vendor    && <span className="text-[9px] text-slate-400 truncate max-w-[80px]">{r.vendor}</span>}
                                    {r.km>0      && <span className="text-[9px] text-blue-500 font-black">🛣 {fmt(r.km)} km</span>}
                                  </div>
                                </div>
                                <span className="text-sm font-black shrink-0">{fmt(r.amount)} MMK</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  );
                })}
              </>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
