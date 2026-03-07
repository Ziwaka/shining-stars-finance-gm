"use client"
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCcw, ChevronDown } from 'lucide-react';

const VEHICLE_PATTERN = /ferry|bus|ယာဉ်|vehicle|truck|van|car/i;

const EXPENSE_MAP: Record<string, { label: string; dot: string; color: string }> = {
  'FUEL'        : { label: '⛽ ဆီဖြည့်',          dot: 'bg-amber-400',  color: 'bg-amber-100 text-amber-800 border-amber-200'     },
  'MAINTENANCE' : { label: '🔧 ပြုပြင်ထိန်းသိမ်း',  dot: 'bg-rose-400',   color: 'bg-rose-100 text-rose-800 border-rose-200'       },
  'TYRE'        : { label: '🔘 တာယာ/လေချိန်',      dot: 'bg-slate-400',  color: 'bg-slate-100 text-slate-700 border-slate-200'    },
  'DRIVER'      : { label: '👨 Driver ကုန်ကျ',      dot: 'bg-blue-400',   color: 'bg-blue-100 text-blue-800 border-blue-200'       },
  'SERVICE'     : { label: '🛠 Service Fee',          dot: 'bg-purple-400', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  'ROAD FEE'    : { label: '🛣 လမ်းကြေး',            dot: 'bg-green-400',  color: 'bg-green-100 text-green-800 border-green-200'   },
  'OTHER'       : { label: '📋 အခြား',               dot: 'bg-slate-300',  color: 'bg-slate-100 text-slate-600 border-slate-200'   },
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

export default function VehiclesPage() {
  const [vouchers, setVouchers]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/gas?t=' + Date.now())
      .then(r => r.json())
      .then(d => { setVouchers(d.vouchers || []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => (vouchers || []).flatMap(v => {
    if ((v.type||'').toString().trim().toLowerCase() === 'cash in') return [];
    const amount  = Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
    const remark  = (v.remark || v.Remark || '').toString();
    const km      = (() => { const m = remark.match(/KM:([\d.]+)/i); return m ? parseFloat(m[1]) : 0; })();
    const subs    = [1,2,3,4,5].map(i => (v[`sub_${i}`]||v[`sub${i}`]||'').toString().toUpperCase().trim()).filter(Boolean);
    const category = (v.category||'').toString().toUpperCase().trim();
    const dateStr  = (v.date||'').toString().split('T')[0];
    return [{ date: dateStr, month: dateStr.slice(0,7), category, subs, item: (v.item_description||v['item_description']||'').toString(), vendor: (v.vendor||'').toString(), note: (v.note||'').toString(), voucherno: (v.voucher_no||v.voucherno||'').toString(), amount, km }];
  }), [vouchers]);

  const vehicleNames = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => r.subs.forEach(sub => { if (VEHICLE_PATTERN.test(sub)) s.add(sub); }));
    return Array.from(s).sort();
  }, [rows]);

  const allMonths = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => { if(r.month) s.add(r.month); });
    return Array.from(s).sort().reverse();
  }, [rows]);

  const vehicleData = useMemo(() => vehicleNames.map(vname => {
    const vrows  = rows.filter(r => r.subs.includes(vname));
    const total  = vrows.reduce((s,r) => s+r.amount, 0);
    const byType: Record<string,number> = {};
    vrows.forEach(r => { const t=getExpenseType(r.subs,r.category); byType[t]=(byType[t]||0)+r.amount; });
    const byMonth: Record<string,number> = {};
    vrows.forEach(r => { byMonth[r.month]=(byMonth[r.month]||0)+r.amount; });
    const fuelKm  = vrows.filter(r=>getExpenseType(r.subs,r.category)==='FUEL'&&r.km>0).sort((a,b)=>b.km-a.km);
    const latestKm = fuelKm[0]?.km||0, oldestKm=fuelKm[fuelKm.length-1]?.km||0;
    const totalKm  = fuelKm.length>=2 ? latestKm-oldestKm : 0;
    const costPerKm = totalKm>0 ? total/totalKm : 0;
    const logs = [...vrows].sort((a,b)=>b.date.localeCompare(a.date));
    return { name:vname, total, byType, byMonth, latestKm, totalKm, costPerKm, logs };
  }), [vehicleNames, rows]);

  const grandTotal = vehicleData.reduce((s,v)=>s+v.total,0);
  const grandByMonth: Record<string,number> = {};
  rows.filter(r=>r.subs.some(s=>VEHICLE_PATTERN.test(s))).forEach(r=>{ grandByMonth[r.month]=(grandByMonth[r.month]||0)+r.amount; });

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
          <Link href="/" className="p-2 bg-slate-100 rounded-xl"><ArrowLeft size={16}/></Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black uppercase tracking-widest">Vehicle Monitor</h1>
            <p className="text-[10px] text-slate-400">{vehicleNames.length} vehicles</p>
          </div>
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

            {/* ══ GRAND BANNER ══ */}
            <div className="bg-slate-950 text-white rounded-2xl overflow-hidden">
              <div className="px-5 pt-5 pb-4">
                <p className="text-[10px] tracking-widest uppercase text-slate-400 mb-1">ယာဉ် အားလုံး · စုစုပေါင်း</p>
                <p className="text-3xl font-black">{fmt(grandTotal)} <span className="text-sm text-slate-400">MMK</span></p>
              </div>
              {/* Per-vehicle quick row */}
              <div className="grid border-t border-slate-800" style={{gridTemplateColumns:`repeat(${Math.min(vehicleData.length,3)},1fr)`}}>
                {vehicleData.map(v=>(
                  <div key={v.name} className="px-4 py-3 border-r border-slate-800 last:border-r-0">
                    <p className="text-[9px] text-slate-500 uppercase font-black truncate">{v.name}</p>
                    <p className="text-sm font-black text-slate-200 mt-0.5">{fmt(v.total)}</p>
                  </div>
                ))}
              </div>
              {/* Grand monthly */}
              {allMonths.length > 0 && (
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

            {/* ══ PER VEHICLE — always visible summary, collapsible log ══ */}
            {vehicleData.map(vd => {
              const logOpen = expandedLog === vd.name;
              return (
                <div key={vd.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

                  {/* ── Vehicle header ── */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-sm font-black uppercase">🚌 {vd.name}</p>
                    <span className="text-sm font-black">{fmt(vd.total)} MMK</span>
                  </div>

                  {/* ── Summary grid: cost breakdown + monthly ── */}
                  <div className="grid grid-cols-2 divide-x divide-slate-100">
                    {/* Cost by type */}
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

                    {/* Monthly */}
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

                  {/* ── KM stats ── */}
                  {(vd.latestKm>0||vd.costPerKm>0) && (
                    <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                      {[
                        {label:'Total KM',  value:vd.totalKm>0   ? fmt(vd.totalKm)              : '—', unit:'km'},
                        {label:'Cost/KM',   value:vd.costPerKm>0 ? fmt(Math.round(vd.costPerKm)) : '—', unit:'MMK'},
                        {label:'Odometer',  value:vd.latestKm>0  ? fmt(vd.latestKm)             : '—', unit:'km'},
                      ].map((k,i)=>(
                        <div key={i} className="px-2 py-2 text-center">
                          <p className="text-[9px] text-slate-400 uppercase font-black">{k.label}</p>
                          <p className="text-sm font-black mt-0.5">{k.value}</p>
                          <p className="text-[9px] text-slate-400">{k.unit}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Log toggle button ── */}
                  <button
                    onClick={()=>setExpandedLog(logOpen ? null : vd.name)}
                    className="w-full flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-[11px] font-black text-slate-500 uppercase">မှတ်တမ်း {vd.logs.length} ခု</span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${logOpen?'rotate-180':''}`}/>
                  </button>

                  {/* ── Log detail (collapsible) ── */}
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

          </div>
        )}
      </div>
    </main>
  );
}
