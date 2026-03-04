"use client"
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Phone, MapPin, Briefcase, RefreshCcw, Users, ChevronRight } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetch('/api/gas')
      .then(r => r.json())
      .then(d => { setSuppliers(d.suppliers || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    return suppliers.filter(s =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search) ||
      s.service?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, suppliers]);

  return (
    <main className="min-h-screen bg-slate-100 font-black text-slate-950">
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 pt-4">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <ArrowLeft size={18}/>
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Supplier List</h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">{suppliers.length} suppliers total</p>
          </div>
          <div className="ml-auto bg-white border border-slate-200 rounded-2xl p-3">
            <Users size={20} className="text-slate-400"/>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
          <input
            className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm outline-none focus:border-slate-400 font-black text-slate-950"
            placeholder="Name, phone, service ရှာပါ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
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
            {filtered.map((s, i) => (
              <div key={i}
                className="bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-slate-400 transition-all"
                onClick={() => setSelected(selected?.name === s.name ? null : s)}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-black uppercase">{s.name}</p>
                    {s.service && (
                      <p className="text-[10px] text-slate-400 uppercase">{s.service}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className={`text-slate-300 transition-transform ${selected?.name === s.name ? 'rotate-90' : ''}`}/>
                </div>

                {/* Expanded details */}
                {selected?.name === s.name && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    {(s.phone1 || s.phone) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={13} className="text-slate-400 shrink-0"/>
                        <div className="space-y-0.5">
                          {[s.phone1||s.phone, s.phone2, s.phone3].filter(Boolean).map((p: string, pi: number) => (
                            <a key={pi} href={`tel:${p}`} className="block font-black text-slate-950 hover:text-blue-600">{p}</a>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={13} className="text-slate-400 shrink-0"/>
                        <span className="font-black text-slate-950">{s.address}</span>
                      </div>
                    )}
                    {s.service && (
                      <div className="flex items-start gap-2 text-sm">
                        <Briefcase size={13} className="text-slate-400 shrink-0 mt-0.5"/>
                        <div className="flex flex-wrap gap-1.5">
                          {s.service.split(',').map((sv: string, idx: number) => (
                            <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">{sv.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}