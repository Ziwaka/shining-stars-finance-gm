"use client"
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCcw, Info } from 'lucide-react';

// Vehicle-related keywords — Sub category မှာ ဒါပါရင် vehicle အဖြစ် သတ်မှတ်မည်
const VEHICLE_PATTERN = /ferry|bus|ယာဉ်|vehicle|truck|van|car/i;

const EXPENSE_MAP: Record<string, { label: string; color: string; dot: string }> = {
  'FUEL'        : { label: '⛽ ဆီဖြည့်',          color: 'bg-amber-100 text-amber-800 border-amber-200',     dot: 'bg-amber-400'  },
  'MAINTENANCE' : { label: '🔧 ပြုပြင်ထိန်းသိမ်း',  color: 'bg-rose-100 text-rose-800 border-rose-200',       dot: 'bg-rose-400'   },
  'TYRE'        : { label: '🔘 တာယာ/လေချိန်',      color: 'bg-slate-100 text-slate-700 border-slate-200',    dot: 'bg-slate-400'  },
  'DRIVER'      : { label: '👨 Driver ကုန်ကျ',      color: 'bg-blue-100 text-blue-800 border-blue-200',       dot: 'bg-blue-400'   },
  'SERVICE'     : { label: '🛠 Service Fee',          color: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-400' },
  'ROAD FEE'    : { label: '🛣 လမ်းကြေး',             color: 'bg-green-100 text-green-800 border-green-200',   dot: 'bg-green-400'  },
  'OTHER'       : { label: '📋 အခြား',               color: 'bg-slate-100 text-slate-600 border-slate-200',   dot: 'bg-slate-300'  },
};

function getExpenseType(subs: string[], category: string): string {
  const all = [...subs, category].map(s => s?.toUpperCase().trim()).filter(Boolean);
  for (const s of all) {
    if (/FUEL|ဆီ/.test(s))                                      return 'FUEL';
    if (/MAINT|REPAIR|OIL|ENGINE|ပြုပြင်|BRAKE|FILTER/.test(s)) return 'MAINTENANCE';
    if (/TYRE|တာယာ|လေချိန်|WHEEL/.test(s))                      return 'TYRE';
    if (/DRIVER|SALARY|WAGE|ALLOWANCE/.test(s))                   return 'DRIVER';
    if (/SERVICE FEE|SERVICE/.test(s))                            return 'SERVICE';
    if (/ROAD|လမ်းကြေး|TOLL/.test(s))                            return 'ROAD FEE';
  }
  return 'OTHER';
}

export default function VehiclesPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/gas?t=' + Date.now())
      .then(r => r.json())
      .then(d => { setVouchers(d.vouchers || []); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Normalize
  const rows = useMemo(() => (vouchers || []).flatMap(v => {
    const typeStr = (v.type || '').toString().trim().toLowerCase();
    if (typeStr === 'cash in') return [];
    const rawCost = v['cost_(total)'] || v.cost_total || 0;
    const amount  = Math.round(Number(rawCost) || 0);
    const remark  = (v.remark || v.Remark || '').toString();
    const kmMatch = remark.match(/KM:([\d.]+)/i);
    const km      = kmMatch ? parseFloat(kmMatch[1]) : 0;
    const subs    = [
      (v.sub_1 || v.sub1 || '').toString().toUpperCase().trim(),
      (v.sub_2 || v.sub2 || '').toString().toUpperCase().trim(),
      (v.sub_3 || v.sub3 || '').toString().toUpperCase().trim(),
      (v.sub_4 || v.sub4 || '').toString().toUpperCase().trim(),
      (v.sub_5 || v.sub5 || '').toString().toUpperCase().trim(),
    ].filter(Boolean);
    const category = (v.category || '').toString().toUpperCase().trim();
    return [{ 
      date: (v.date||'').toString().split('T')[0],
      category, subs,
      item: (v.item_description || v['item_description'] || '').toString(),
      vendor: (v.vendor || '').toString(),
      note: (v.note || '').toString(),
      voucherno: (v.voucher_no || v.voucherno || '').toString(),
      amount, km,
    }];
  }), [vouchers]);

  // Auto-detect vehicle names from Sub categories only (not from Category)
  // Category = FERRY ဆိုသည် parent category သာဖြစ်သည် — vehicle name မဟုတ်
  // BUS 1 / BUS 2 တို့သည် Sub category ထဲမှ vehicle names
  const vehicleNames = useMemo(() => {
    const names = new Set<string>();
    rows.forEach(r => {
      r.subs.forEach(s => { if (VEHICLE_PATTERN.test(s)) names.add(s); });
    });
    return Array.from(names).sort();
  }, [rows]);

  // Per-vehicle stats — sub ထဲမှာ vname ပါတဲ့ rows ပဲ ယူမည်
  const vehicleData = useMemo(() => vehicleNames.map(vname => {
    const vrows = rows.filter(r => r.subs.includes(vname));
    const total = vrows.reduce((s, r) => s + r.amount, 0);

    const byType: Record<string, number> = {};
    vrows.forEach(r => {
      const t = getExpenseType(r.subs, r.category);
      byType[t] = (byType[t] || 0) + r.amount;
    });

    // km stats from fuel rows with km data
    const fuelWithKm = vrows
      .filter(r => getExpenseType(r.subs, r.category) === 'FUEL' && r.km > 0)
      .sort((a, b) => b.km - a.km);
    const latestKm   = fuelWithKm[0]?.km || 0;
    const oldestKm   = fuelWithKm[fuelWithKm.length - 1]?.km || 0;
    const totalKm    = fuelWithKm.length >= 2 ? latestKm - oldestKm : 0;
    const costPerKm  = totalKm > 0 ? total / totalKm : 0;

    const logs = [...vrows].sort((a, b) => b.date.localeCompare(a.date));

    return { name: vname, total, byType, latestKm, totalKm, costPerKm, logs };
  }), [vehicleNames, rows]);

  const grandTotal = vehicleData.reduce((s, v) => s + v.total, 0);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 bg-white sticky top-0 z-10">
          <Link href="/" className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
            <ArrowLeft size={16}/>
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-black uppercase tracking-widest">Vehicle Monitor</h1>
            <p className="text-[10px] text-slate-400">{vehicleNames.length} vehicles · Voucher data auto</p>
          </div>
          <button onClick={load} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200">
            <RefreshCcw size={15} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCcw className="animate-spin text-slate-300" size={28}/>
          </div>
        ) : (
          <div className="p-4 space-y-5">

            {/* Tip */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex gap-3">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5"/>
              <p className="text-[11px] text-blue-700 font-black leading-relaxed">
                Voucher Sub category မှာ <strong>FERRY / BUS 1 / BUS 2</strong> ထည့်ထားရင် ဒီမှာ auto ပေါ်မည်။ ယာဉ်အသစ် ထပ်ထည့်လည်း အလိုအလျောက် ပေါ်မည်။
              </p>
            </div>

            {vehicleNames.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                <p className="text-2xl">🚌</p>
                <p className="text-sm font-black text-slate-400 uppercase">Vehicle data မရှိသေးပါ</p>
                <p className="text-[10px] text-slate-300">Voucher Sub category မှာ FERRY / BUS 1 စသည် ထည့်ပါ</p>
              </div>
            ) : (
              <>
                {/* Grand Total */}
                <div className="bg-slate-950 text-white rounded-2xl p-5 space-y-3">
                  <p className="text-[10px] tracking-widest uppercase text-slate-400">ယာဉ် အားလုံး · စုစုပေါင်း</p>
                  <p className="text-3xl font-black">{grandTotal.toLocaleString()} <span className="text-sm text-slate-400">MMK</span></p>
                  {vehicleData.length > 1 && (
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                      {vehicleData.map(v => (
                        <div key={v.name}>
                          <p className="text-[9px] text-slate-500 uppercase font-black">{v.name}</p>
                          <p className="text-xs font-black text-slate-300">{v.total.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Per Vehicle */}
                {vehicleData.map(vd => (
                  <div key={vd.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

                    {/* Vehicle header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-black uppercase">🚌 {vd.name}</p>
                      <span className="text-xs font-black text-slate-500">{vd.total.toLocaleString()} MMK</span>
                    </div>

                    {/* KPI row — km data ရှိမှ ပေါ်မည် */}
                    {(vd.latestKm > 0 || vd.costPerKm > 0) && (
                      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                        {[
                          { label: 'Total KM',  value: vd.totalKm > 0 ? vd.totalKm.toLocaleString() : '—',                    unit: 'km'  },
                          { label: 'Cost/KM',   value: vd.costPerKm > 0 ? Math.round(vd.costPerKm).toLocaleString() : '—',    unit: 'MMK' },
                          { label: 'Odometer',  value: vd.latestKm > 0 ? vd.latestKm.toLocaleString() : '—',                  unit: 'km'  },
                        ].map((k, i) => (
                          <div key={i} className="px-3 py-3 text-center">
                            <p className="text-[9px] text-slate-400 uppercase font-black">{k.label}</p>
                            <p className="text-base font-black mt-0.5">{k.value}</p>
                            <p className="text-[9px] text-slate-400">{k.unit}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cost breakdown */}
                    {vd.total > 0 && (
                      <div className="px-4 py-3 space-y-2">
                        {Object.entries(vd.byType).sort((a,b) => b[1]-a[1]).map(([type, amt]) => {
                          const et = EXPENSE_MAP[type] || EXPENSE_MAP['OTHER'];
                          return (
                            <div key={type} className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-500 w-24 shrink-0">{et.label}</span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${et.dot} rounded-full`} style={{width:`${(amt/vd.total)*100}%`}}/>
                              </div>
                              <span className="text-[10px] font-black text-slate-700 w-24 text-right shrink-0">{amt.toLocaleString()} MMK</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Log */}
                    {vd.logs.length > 0 && (
                      <div className="border-t border-slate-100">
                        <div className="px-4 py-2 bg-slate-50">
                          <p className="text-[10px] font-black text-slate-400 uppercase">မှတ်တမ်း ({vd.logs.length})</p>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {vd.logs.map((r, i) => {
                            const etype = EXPENSE_MAP[getExpenseType(r.subs, r.category)] || EXPENSE_MAP['OTHER'];
                            return (
                              <div key={i} className="flex items-start justify-between px-4 py-3">
                                <div className="space-y-1 flex-1 min-w-0">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${etype.color}`}>{etype.label}</span>
                                  {r.item && <p className="text-xs text-slate-700 truncate">{r.item}</p>}
                                  {r.note && <p className="text-[10px] text-slate-400 truncate">{r.note}</p>}
                                  <div className="flex gap-3 flex-wrap">
                                    <span className="text-[9px] text-slate-400">{r.date}</span>
                                    {r.voucherno && <span className="text-[9px] text-slate-400">{r.voucherno}</span>}
                                    {r.vendor    && <span className="text-[9px] text-slate-400">{r.vendor}</span>}
                                    {r.km > 0    && <span className="text-[9px] text-blue-500 font-black">🛣 {r.km.toLocaleString()} km</span>}
                                  </div>
                                </div>
                                <span className="text-sm font-black shrink-0 ml-3">{r.amount.toLocaleString()} MMK</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}