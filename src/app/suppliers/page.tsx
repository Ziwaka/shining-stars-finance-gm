"use client"
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Phone, MapPin, Briefcase, RefreshCcw, Users, ChevronRight, ChevronDown, Filter, TrendingUp, Calendar, ArrowUpDown, X, Receipt, Tag, FolderOpen } from 'lucide-react';

interface Supplier {
  // GAS sheet မှာ header name ကွဲနိုင် — အကုန် declare
  name?: string;
  supplier_name?: string;
  phone?: string; phone1?: string; phone2?: string; phone3?: string;
  address?: string;
  service?: string;
  items_services?: string;
}

interface VoucherRaw {
  vendor?: string; Vendor?: string;
  'cost_(total)'?: string | number;
  cost_total?: string | number;
  income?: string | number;
  date?: string; Date?: string;
  type?: string; Type?: string;
  account?: string; Account?: string;
  category?: string; Category?: string;
  sub_1?: string; Sub_1?: string;
  item_description?: string; item?: string;
  voucher_no?: string; voucherno?: string;
}

type SortKey = 'usage' | 'spend' | 'name' | 'recent';

const fmt = (n: number) => n.toLocaleString();

// ── Component 밖 — pure functions (no hook dependency) ──────────
function sName(s: Supplier): string {
  return (s.name || s.supplier_name || '').toString().trim();
}
function sService(s: Supplier): string {
  return (s.service || s.items_services || '').toString().trim();
}
function sPhone1(s: Supplier): string {
  return (s.phone1 || s.phone || '').toString().trim();
}

// ── Transaction History Modal ────────────────────────────────────
function TxHistoryModal({ vendorName, vouchers, onClose }: { vendorName: string; vouchers: VoucherRaw[]; onClose: () => void }) {
  const txList = useMemo(() => {
    const grouped: Record<string, { date: string; category: string; item: string; amount: number; type: string }[]> = {};
    vouchers.forEach(v => {
      const name = (v.vendor || v.Vendor || '').toString().trim();
      if (name !== vendorName) return;
      const typeStr = (v.type || v.Type || '').toString().trim().toLowerCase();
      const amt  = Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
      const date = (v.date || v.Date || '').toString().split('T')[0];
      const cat  = (v.category || v.Category || '').toString().toUpperCase();
      const item = (v.item_description || v.item || '').toString();
      const vrNo = (v.voucher_no || v.voucherno || String(date) + String(Math.random())).toString();
      if (!grouped[vrNo]) grouped[vrNo] = [];
      grouped[vrNo].push({ date, category: cat, item, amount: amt, type: typeStr });
    });
    return Object.entries(grouped)
      .map(([vrNo, items]) => ({ vrNo, date: items[0]?.date || '', category: items[0]?.category || '', items }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [vendorName, vouchers]);

  const total = useMemo(() => txList.flatMap(t => t.items).reduce((s, i) => s + i.amount, 0), [txList]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-950 text-white px-5 py-4 rounded-t-3xl sm:rounded-t-3xl flex items-center justify-between shrink-0">
          <div>
            <p className="text-[9px] text-slate-400 tracking-widest uppercase">Transaction History</p>
            <p className="text-sm font-black uppercase truncate max-w-[220px]">{vendorName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] text-slate-400">Total Spend</p>
              <p className="text-base font-black text-rose-400">{fmt(total)} MMK</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
              <X size={16}/>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {txList.length === 0 ? (
            <div className="py-16 text-center text-slate-300 text-sm uppercase tracking-widest">မှတ်တမ်းမရှိ</div>
          ) : txList.map((tx, i) => (
            <div key={i} className="px-5 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={11} className="text-slate-400"/>
                  <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{tx.vrNo || '—'}</span>
                  <span className="text-[10px] text-slate-400">{tx.date}</span>
                </div>
                {tx.category && <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full uppercase">{tx.category}</span>}
              </div>
              {tx.items.map((item, j) => (
                <div key={j} className="flex items-center justify-between pl-4">
                  <p className="text-[11px] font-black text-slate-700 truncate max-w-[220px]">{item.item || '—'}</p>
                  <span className={`text-xs font-black ${item.type === 'cash in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.type === 'cash in' ? '+' : '-'}{fmt(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Mini spend bar chart ─────────────────────────────────────────
function SpendTrendMini({ vendorName, vouchers }: { vendorName: string; vouchers: VoucherRaw[] }) {
  const monthlySpend = useMemo(() => {
    const m: Record<string, number> = {};
    vouchers.forEach(v => {
      const name = (v.vendor || v.Vendor || '').toString().trim();
      if (name !== vendorName) return;
      const typeStr = (v.type || v.Type || '').toString().trim().toLowerCase();
      if (typeStr === 'cash in') return;
      const amt   = Math.round(Number(v['cost_(total)'] || v.cost_total || 0));
      const date  = (v.date || v.Date || '').toString().split('T')[0];
      const month = date.slice(0, 7);
      if (!month) return;
      m[month] = (m[month] || 0) + amt;
    });
    return Object.entries(m).sort((a, b) => (a[0] || '').localeCompare(b[0] || '')).slice(-6);
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
            <div className="w-full bg-rose-300 rounded-sm group-hover:bg-rose-500"
              style={{ height: `${max > 0 ? Math.max(4, Math.round((amt / max) * 32)) : 4}px` }}/>
            <span className="text-[8px] text-slate-400 font-black">{month.slice(5)}</span>
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[9px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
              {fmt(amt)} MMK
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vouchers,  setVouchers]  = useState<VoucherRaw[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<string | null>(null);
  const [sortBy,    setSortBy]    = useState<SortKey>('usage');
  const [txModal,   setTxModal]   = useState<string | null>(null);
  const [filterCat,  setFilterCat]  = useState('');
  const [filterSub,  setFilterSub]  = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    fetch('/api/gas')
      .then(r => r.json())
      .then(d => { setSuppliers(d.suppliers || []); setVouchers(d.vouchers || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Spend & usage maps ─────────────────────────────────────────
  const spendMap = useMemo(() => {
    const m: Record<string, { total: number; lastDate: string }> = {};
    (vouchers || []).forEach(v => {
      const name = (v.vendor || v.Vendor || '').toString().trim();
      if (!name || name === 'undefined') return;
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

  const usageMap = useMemo(() => {
    const m: Record<string, number> = {};
    const seen: Record<string, Set<string>> = {};
    (vouchers || []).forEach(v => {
      const name = (v.vendor || v.Vendor || '').toString().trim();
      if (!name || name === 'undefined') return;
      const vrNo = (v.voucher_no || v.voucherno || '').toString();
      if (!seen[name]) seen[name] = new Set();
      seen[name].add(vrNo);
      m[name] = seen[name].size;
    });
    return m;
  }, [vouchers]);

  // ── Hierarchical filter options ────────────────────────────────
  const allCategories = useMemo(() => {
    const s = new Set<string>();
    vouchers.forEach(v => {
      const cat = (v.category || v.Category || '').toString().trim().toUpperCase();
      if (cat) s.add(cat);
    });
    return Array.from(s).sort();
  }, [vouchers]);

  const subOptions = useMemo(() => {
    if (!filterCat) return [];
    const s = new Set<string>();
    vouchers.forEach(v => {
      const cat = (v.category || v.Category || '').toString().trim().toUpperCase();
      if (cat !== filterCat) return;
      const sub = (v.sub_1 || v.Sub_1 || '').toString().trim().toUpperCase();
      if (sub) s.add(sub);
    });
    return Array.from(s).sort();
  }, [vouchers, filterCat]);

  const filteredSupplierNames = useMemo(() => {
    if (!filterCat && !filterSub && !filterItem) return null;
    const s = new Set<string>();
    vouchers.forEach(v => {
      const name = (v.vendor || v.Vendor || '').toString().trim();
      if (!name) return;
      const cat  = (v.category || v.Category || '').toString().trim().toUpperCase();
      const sub  = (v.sub_1 || v.Sub_1 || '').toString().trim().toUpperCase();
      const item = (v.item_description || v.item || '').toString().trim();
      if (filterCat  && cat !== filterCat) return;
      if (filterSub  && sub !== filterSub) return;
      if (filterItem && !item.toLowerCase().includes(filterItem.toLowerCase())) return;
      s.add(name);
    });
    return s;
  }, [vouchers, filterCat, filterSub, filterItem]);

  // ── Filter + sort ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = suppliers.filter(s => {
      const nm  = sName(s).toLowerCase();
      const svc = sService(s).toLowerCase();
      const matchSearch = !search
        || nm.includes(q)
        || [s.phone, s.phone1, s.phone2, s.phone3].some(p => p?.includes(search))
        || svc.includes(q);
      const matchFilter = filteredSupplierNames === null || filteredSupplierNames.has(sName(s));
      return matchSearch && matchFilter;
    });

    list = [...list].sort((a, b) => {
      const an = sName(a), bn = sName(b);
      if (sortBy === 'usage')  return (usageMap[bn] || 0) - (usageMap[an] || 0);
      if (sortBy === 'spend')  return (spendMap[bn]?.total || 0) - (spendMap[an]?.total || 0);
      if (sortBy === 'name')   return an.localeCompare(bn);
      if (sortBy === 'recent') return (spendMap[bn]?.lastDate || '').localeCompare(spendMap[an]?.lastDate || '');
      return 0;
    });
    return list;
  }, [search, filteredSupplierNames, sortBy, suppliers, spendMap, usageMap]);

  const totalSupplierSpend = useMemo(() =>
    Object.values(spendMap).reduce((s, v) => s + v.total, 0), [spendMap]);

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'usage',  label: 'အသုံးများ' },
    { key: 'spend',  label: 'ကုန်ကျမှု' },
    { key: 'recent', label: 'နောက်ဆုံး' },
    { key: 'name',   label: 'နာမည်' },
  ];

  const hasFilter = filterCat || filterSub || filterItem;

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
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">{filtered.length} / {suppliers.length} suppliers</p>
          </div>
          <div className="ml-auto bg-white border border-slate-200 rounded-2xl p-3">
            <Users size={20} className="text-slate-400"/>
          </div>
        </div>

        {/* Summary */}
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
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Hierarchical Filter */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <button onClick={() => setShowFilter(!showFilter)}
            className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${hasFilter ? 'bg-blue-50 border-b border-blue-100' : 'hover:bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <Filter size={13} className={hasFilter ? 'text-blue-600' : 'text-slate-400'}/>
              <span className={`text-[11px] font-black uppercase tracking-widest ${hasFilter ? 'text-blue-700' : 'text-slate-500'}`}>
                {hasFilter ? [filterCat, filterSub, filterItem].filter(Boolean).join(' › ') : 'FILTER BY CATEGORY / SUBCATEGORY / ITEM'}
              </span>
              {hasFilter && <span className="bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black">ON</span>}
            </div>
            <div className="flex items-center gap-2">
              {hasFilter && (
                <button onClick={e => { e.stopPropagation(); setFilterCat(''); setFilterSub(''); setFilterItem(''); }}
                  className="text-[10px] text-slate-400 hover:text-rose-500 border border-slate-200 px-2 py-1 rounded-lg font-black">CLEAR</button>
              )}
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showFilter ? 'rotate-180' : ''}`}/>
            </div>
          </button>

          {showFilter && (
            <div className="p-4 space-y-3 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1"><FolderOpen size={10}/> Category</label>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => { setFilterCat(''); setFilterSub(''); setFilterItem(''); }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${!filterCat ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>ALL</button>
                  {allCategories.map(cat => (
                    <button key={cat} onClick={() => { setFilterCat(filterCat === cat ? '' : cat); setFilterSub(''); setFilterItem(''); }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${filterCat === cat ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>{cat}</button>
                  ))}
                </div>
              </div>
              {filterCat && subOptions.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest flex items-center gap-1"><Tag size={10}/> Sub Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => { setFilterSub(''); setFilterItem(''); }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${!filterSub ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>ALL</button>
                    {subOptions.map(sub => (
                      <button key={sub} onClick={() => { setFilterSub(filterSub === sub ? '' : sub); setFilterItem(''); }}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${filterSub === sub ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>{sub}</button>
                    ))}
                  </div>
                </div>
              )}
              {filterCat && (
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Item</label>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] outline-none focus:border-slate-400 font-black text-slate-950"
                      placeholder="Item ရှာပါ..." value={filterItem} onChange={e => setFilterItem(e.target.value)}/>
                    {filterItem && (
                      <button onClick={() => setFilterItem('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"><X size={12}/></button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown size={12} className="text-slate-400 shrink-0"/>
          <span className="text-[10px] text-slate-400 tracking-widest uppercase">SORT:</span>
          {SORT_OPTIONS.map(o => (
            <button key={o.key} onClick={() => setSortBy(o.key)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${sortBy === o.key ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
              {o.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCcw className="animate-spin text-slate-300" size={28}/></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-300 text-sm uppercase tracking-widest">မတွေ့ပါ</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s, i) => {
              const nm       = sName(s);
              const svc      = sService(s);
              const ph1      = sPhone1(s);
              const spend    = spendMap[nm];
              const usage    = usageMap[nm] || 0;
              const isOpen   = selected === nm;
              const spendPct = totalSupplierSpend > 0 && spend ? Math.round((spend.total / totalSupplierSpend) * 100) : 0;

              return (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-slate-400 transition-all"
                  onClick={() => setSelected(isOpen ? null : nm)}>

                  {/* Card header */}
                  <div className="flex items-center justify-between p-4">
                    <div className="space-y-0.5 min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black uppercase truncate">{nm || '—'}</p>
                        {sortBy === 'usage' && usage > 0 && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                            i === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            i < 3   ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                      'bg-slate-50  text-slate-400 border border-slate-100'
                          }`}>#{i+1} · {usage}x</span>
                        )}
                      </div>
                      {svc && <p className="text-[10px] text-slate-400 uppercase truncate">{svc}</p>}
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
                      {spend && (
                        <button onClick={e => { e.stopPropagation(); setTxModal(nm); }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-950 hover:text-white text-slate-500 rounded-lg transition-all" title="Transaction History">
                          <Receipt size={13}/>
                        </button>
                      )}
                      {spend?.lastDate && <span className="text-[9px] text-slate-400 hidden sm:block">{spend.lastDate}</span>}
                      <ChevronRight size={16} className={`text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}/>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-3 mt-0">
                      <button onClick={e => { e.stopPropagation(); setTxModal(nm); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-950 text-white rounded-xl text-[11px] font-black uppercase hover:bg-slate-800 transition-colors mt-3">
                        <Receipt size={13}/> Transaction History ကြည့်ရန်
                      </button>
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
                      {ph1 && (
                        <div className="flex items-start gap-2">
                          <Phone size={13} className="text-slate-400 shrink-0 mt-1"/>
                          <div className="space-y-1">
                            {[ph1, s.phone2, s.phone3].filter(Boolean).map((p, pi) => (
                              <a key={pi} href={`tel:${p}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 group">
                                <span className="font-black text-slate-950 text-sm group-hover:text-blue-600 transition-colors">{p}</span>
                                <span className="text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">ဖုန်းဆက်</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {s.address && (
                        <div className="flex items-start gap-2">
                          <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5"/>
                          <span className="font-black text-slate-950 text-sm">{s.address}</span>
                        </div>
                      )}
                      {svc && (
                        <div className="flex items-start gap-2">
                          <Briefcase size={13} className="text-slate-400 shrink-0 mt-0.5"/>
                          <div className="flex flex-wrap gap-1.5">
                            {svc.split(',').map((sv, idx) => (
                              <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">{sv.trim()}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {spend && <SpendTrendMini vendorName={nm} vouchers={vouchers}/>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {txModal && <TxHistoryModal vendorName={txModal} vouchers={vouchers} onClose={() => setTxModal(null)}/>}
    </main>
  );
}