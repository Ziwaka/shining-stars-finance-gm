"use client"
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Phone, MapPin, Briefcase, RefreshCcw, Users, ChevronRight, Filter, TrendingUp, Calendar, ArrowUpDown } from 'lucide-react';

interface Supplier {
  name: string;
  phone?: string; phone1?: string; phone2?: string; phone3?: string;
  address?: string;
  service?: string;
}

interface VoucherRaw {
  vendor?: string; Vendor?: string;
  'cost_(total)'?: string | number;
  cost_total?: string | number;
  income?: string | number;
  date?: string; Date?: string;
  type?: string; Type?: string;
  account?: string; Account?: string;
}

type SortKey = 'name' | 'spend' | 'recent';

const fmt = (n: number) => n.toLocaleString();

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vouchers,  setVouchers]  = useState<VoucherRaw[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<string | null>(null);
  const [sortBy,    setSortBy]    = useState<SortKey>('name');
  const [serviceFilter, setServiceFilter] = useState('');

  useEffect(() => {
    fetch('/api/gas')
      .then(r => r.json())
      .then(d => {
        setSuppliers(d.suppliers || []);
        setVouchers(d.vouchers   || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Spend & last-transaction per supplier (from voucher data) ──
  const spendMap = useMemo(() => {
    const m: Record<string, { total: number; lastDate: string }> = {};
    (vouchers || []).forEach(v => {
      const name = (v.vendor || v.Vendor || '').toString().trim();
      if (!name) return;
      const typeStr = (v.type || v.Type || '').toString().trim().toLowerCase();
      if (typeStr === 'cash in') return;
      const amt  = Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
      const date = (v.date || v.Date || '').toString().split('T')[0];
      if (!m[name]) m[name] = { total: 0, lastDate: '' };
      m[name].total += amt;
      if (date > m[name].lastDate) m[name].lastDate = date;
    });
    return m;
  }, [vouchers]);

  // ── All service tags (for filter) ──
  const allServices = useMemo(() => {
    const s = new Set<string>();
    suppliers.forEach(sup => {
      if (sup.service) sup.service.split(',').forEach(sv => { const t = sv.trim(); if (t) s.add(t.toUpperCase()); });
    });
    return Array.from(s).sort();
  }, [suppliers]);

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    let list = suppliers.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !search
        || s.name?.toLowerCase().includes(q)
        || [s.phone, s.phone1, s.phone2, s.phone3].some(p => p?.includes(search))
        || s.service?.toLowerCase().includes(q);
      const matchService = !serviceFilter
        || s.service?.toUpperCase().includes(serviceFilter);
      return matchSearch && matchService;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name);
      if (sortBy === 'spend')  return (spendMap[b.name]?.total  || 0) - (spendMap[a.name]?.total  || 0);
      if (sortBy === 'recent') return (spendMap[b.name]?.lastDate || '').localeCompare(spendMap[a.name]?.lastDate || '');
      return 0;
    });
    return list;
  }, [search, serviceFilter, sortBy, suppliers, spendMap]);

  const totalSupplierSpend = useMemo(() =>
    Object.values(spendMap).reduce((s, v) => s + v.total, 0), [spendMap]);

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'name',   label: 'နာမည်' },
    { key: 'spend',  label: 'ကုန်ကျမှု' },
    { key: 'recent', label: 'နောက်ဆုံး' },
  ];

  return (
    <main className="min-h-screen bg-slate-100 font-black text-slate-950">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-4 pt-4">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <ArrowLeft size={18}/>
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Supplier List</h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">
              {filtered.length} / {suppliers.length} suppliers
            </p>
          </div>
          <div className="ml-auto bg-white border border-slate-200 rounded-2xl p-3">
            <Users size={20} className="text-slate-400"/>
          </div>
        </div>

        {/* Summary banner */}
        {!loading && Object.keys(spendMap).length > 0 && (
          <div className="bg-slate-950 text-white rounded-2xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-slate-400 tracking-widest uppercase mb-1">စုစုပေါင်း Supplier ကုန်ကျ</p>
              <p className="text-2xl font-black">{fmt(totalSupplierSpend)} <span className="text-sm text-slate-400">MMK</span></p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 tracking-widest uppercase mb-1">မှတ်တမ်းရှိသော</p>
              <p className="text-lg font-black">{Object.keys(spendMap).length} <span className="text-sm text-slate-400">ဆိုင်</span></p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
          <input
            className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:border-slate-400 font-black text-slate-950"
            placeholder="နာမည်၊ ဖုန်း၊ service ရှာပါ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Service filter chips */}
        {allServices.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <Filter size={12} className="text-slate-400 shrink-0"/>
            <button
              onClick={() => setServiceFilter('')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${!serviceFilter ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
            >
              ALL
            </button>
            {allServices.map(sv => (
              <button
                key={sv}
                onClick={() => setServiceFilter(serviceFilter === sv ? '' : sv)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${serviceFilter === sv ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
              >
                {sv}
              </button>
            ))}
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown size={12} className="text-slate-400 shrink-0"/>
          <span className="text-[10px] text-slate-400 tracking-widest uppercase">SORT:</span>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => setSortBy(o.key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${sortBy === o.key ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCcw className="animate-spin text-slate-300" size={28}/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-300 text-sm uppercase tracking-widest">
            မတွေ့ပါ
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s, i) => {
              const spend    = spendMap[s.name];
              const isOpen   = selected === s.name;
              const spendPct = totalSupplierSpend > 0 && spend ? Math.round((spend.total / totalSupplierSpend) * 100) : 0;

              return (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-slate-400 transition-all"
                  onClick={() => setSelected(isOpen ? null : s.name)}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between p-4">
                    <div className="space-y-0.5 min-w-0 flex-1 mr-3">
                      <p className="text-sm font-black uppercase truncate">{s.name}</p>
                      {s.service && (
                        <p className="text-[10px] text-slate-400 uppercase truncate">{s.service}</p>
                      )}
                      {/* Spend summary inline */}
                      {spend && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full bg-rose-400 rounded-full" style={{ width: `${spendPct}%` }}/>
                          </div>
                          <span className="text-[10px] font-black text-rose-600">{fmt(spend.total)} MMK</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {spend?.lastDate && (
                        <span className="text-[9px] text-slate-400 hidden sm:block">{spend.lastDate}</span>
                      )}
                      <ChevronRight size={16} className={`text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}/>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-3 mt-0">

                      {/* Spend detail card */}
                      {spend && (
                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 space-y-1.5">
                          <p className="text-[9px] text-rose-400 tracking-widest uppercase font-black">ငွေပေးမှတ်တမ်း</p>
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-lg font-black text-rose-700">{fmt(spend.total)}<span className="text-xs font-black text-rose-400 ml-1">MMK</span></p>
                              <p className="text-[10px] text-rose-400">စုစုပေါင်း Supplier ကုန်ကျ၏ {spendPct}%</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-rose-400 uppercase tracking-widest">နောက်ဆုံး</p>
                              <p className="text-sm font-black text-rose-600 flex items-center gap-1">
                                <Calendar size={11}/> {spend.lastDate || '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Phone */}
                      {(s.phone1 || s.phone) && (
                        <div className="flex items-start gap-2">
                          <Phone size={13} className="text-slate-400 shrink-0 mt-1"/>
                          <div className="space-y-1">
                            {[s.phone1 || s.phone, s.phone2, s.phone3].filter(Boolean).map((p, pi) => (
                              <a
                                key={pi}
                                href={`tel:${p}`}
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-2 group"
                              >
                                <span className="font-black text-slate-950 text-sm group-hover:text-blue-600 transition-colors">{p}</span>
                                <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">ဖုန်းဆက်</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Address */}
                      {s.address && (
                        <div className="flex items-start gap-2">
                          <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5"/>
                          <span className="font-black text-slate-950 text-sm">{s.address}</span>
                        </div>
                      )}

                      {/* Service tags */}
                      {s.service && (
                        <div className="flex items-start gap-2">
                          <Briefcase size={13} className="text-slate-400 shrink-0 mt-0.5"/>
                          <div className="flex flex-wrap gap-1.5">
                            {s.service.split(',').map((sv, idx) => (
                              <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                                {sv.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Spend trend from vouchers */}
                      {spend && (
                        <SpendTrendMini vendorName={s.name} vouchers={vouchers}/>
                      )}
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

// ── Mini spend-by-month bar chart (pure CSS, no recharts) ────
function SpendTrendMini({ vendorName, vouchers }: { vendorName: string; vouchers: VoucherRaw[] }) {
  const monthlySpend = useMemo(() => {
    const m: Record<string, number> = {};
    vouchers.forEach(v => {
      const name = (v.vendor || v.Vendor || '').toString().trim();
      if (name !== vendorName) return;
      const typeStr = (v.type || v.Type || '').toString().trim().toLowerCase();
      if (typeStr === 'cash in') return;
      const amt  = Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
      const date = (v.date || v.Date || '').toString().split('T')[0];
      const month = date.slice(0, 7);
      if (!month) return;
      m[month] = (m[month] || 0) + amt;
    });
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
  }, [vendorName, vouchers]);

  if (monthlySpend.length < 2) return null;

  const max = Math.max(...monthlySpend.map(([, v]) => v));

  return (
    <div className="space-y-1.5">
      <p className="text-[9px] text-slate-400 tracking-widest uppercase flex items-center gap-1">
        <TrendingUp size={10}/> လစဉ် ကုန်ကျ
      </p>
      <div className="flex items-end gap-1 h-10">
        {monthlySpend.map(([month, amt]) => (
          <div key={month} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className="w-full bg-rose-300 rounded-sm transition-all group-hover:bg-rose-500"
              style={{ height: `${max > 0 ? Math.max(4, Math.round((amt / max) * 32)) : 4}px` }}
            />
            <span className="text-[8px] text-slate-400 font-black">{month.slice(5)}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[9px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {fmt(amt)} MMK
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
