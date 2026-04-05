"use client"
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCcw, Upload, CheckCircle, XCircle, Image as ImageIcon, CloudLightning, AlertTriangle } from 'lucide-react';

interface VoucherRaw {
  voucher_no?: string; voucherno?: string;
  image_data?: string; Image_Data?: string;
  item_description?: string; item?: string;
  date?: string; Date?: string;
  vendor?: string; Vendor?: string;
}

interface MigrateResult {
  voucherno: string;
  item: string;
  status: 'done' | 'skip' | 'error';
  url?: string;
  error?: string;
}

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;

export default function MigratePage() {
  const [vouchers,    setVouchers]    = useState<VoucherRaw[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [running,     setRunning]     = useState(false);
  const [results,     setResults]     = useState<MigrateResult[]>([]);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [done,        setDone]        = useState(false);
  const [previewImg,  setPreviewImg]  = useState<string | null>(null);

  // ── Load all vouchers from GAS ──────────────────────────────
  useEffect(() => {
    fetch('/api/gas?force=1')
      .then(r => r.json())
      .then(d => {
        const all: VoucherRaw[] = d.vouchers || [];
        setVouchers(all);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Filter: only those with base64 images ──────────────────
  const needsMigration = vouchers.filter(v => {
    const img = v.image_data || v.Image_Data || '';
    return img.startsWith('data:image') || (img.length > 200 && !img.startsWith('http'));
  });

  const alreadyMigrated = vouchers.filter(v => {
    const img = v.image_data || v.Image_Data || '';
    return img.startsWith('http');
  });

  // ── Run migration ───────────────────────────────────────────
  const runMigration = async () => {
    if (needsMigration.length === 0) return;
    setRunning(true);
    setDone(false);
    setResults([]);
    setCurrentIdx(0);

    const res: MigrateResult[] = [];

    for (let i = 0; i < needsMigration.length; i++) {
      const v = needsMigration[i];
      setCurrentIdx(i + 1);

      const vno  = (v.voucher_no || v.voucherno || '').toString();
      const item = (v.item_description || v.item || '').toString();
      const img  = (v.image_data || v.Image_Data || '').toString();

      try {
        // 1. Upload to Cloudinary via our API
        const upRes = await fetch('/api/cloudinary', {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({ image: img }),
        });

        if (!upRes.ok) throw new Error('Cloudinary upload failed');
        const { url } = await upRes.json();

        // 2. Update the row in Google Sheet via GAS
        await fetch('/api/gas', {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({
            action    : 'updateImageUrl',
            voucherno : vno,
            image_url : url,
          }),
        });

        res.push({ voucherno: vno, item, status: 'done', url });

      } catch (e: any) {
        res.push({ voucherno: vno, item, status: 'error', error: e.message });
      }

      // Small delay to avoid rate limit
      await new Promise(r => setTimeout(r, 300));
      setResults([...res]);
    }

    setDone(true);
    setRunning(false);
  };

  const doneCount  = results.filter(r => r.status === 'done').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <main className="min-h-screen bg-slate-100 font-black text-slate-950">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-4 pt-4">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <ArrowLeft size={18}/>
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
              <CloudLightning size={20} className="text-amber-500"/> Cloudinary Migration
            </h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">ဟောင်းပုံများ Cloudinary သို့ ရွှေ့ပြောင်း</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle size={13}/> မစတင်မီ သိထားရမည်
          </p>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            ဤ page သည် Google Sheet ထဲမှ Base64 ပုံများကို Cloudinary သို့ တစ်ကြိမ်တည်း upload လုပ်ပြီး
            Sheet ထဲ URL ဖြင့် အစားထိုးသည်။ Process မပြီးမချင်း browser ပိတ်မပါနှင့်။
          </p>
          <p className="text-[10px] text-amber-600">
            ⚠️ GAS script တွင် <code className="bg-amber-100 px-1 rounded">updateImageUrl</code> action ထည့်ထားရမည်
          </p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCcw className="animate-spin text-slate-300" size={28}/>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">စုစုပေါင်း Voucher</p>
                <p className="text-2xl font-black">{vouchers.length}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="text-[9px] text-amber-600 uppercase tracking-widest mb-1">Migrate လိုသည်</p>
                <p className="text-2xl font-black text-amber-700">{needsMigration.length}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                <p className="text-[9px] text-emerald-600 uppercase tracking-widest mb-1">URL ရပြီး</p>
                <p className="text-2xl font-black text-emerald-700">{alreadyMigrated.length}</p>
              </div>
            </div>

            {/* Nothing to migrate */}
            {needsMigration.length === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                <CheckCircle size={32} className="text-emerald-500 mx-auto"/>
                <p className="text-sm font-black text-emerald-700 uppercase">Migrate လုပ်စရာ မရှိပါ</p>
                <p className="text-[11px] text-emerald-600">ပုံ {alreadyMigrated.length} ခု Cloudinary URL ရပြီး</p>
              </div>
            )}

            {/* Migration list preview */}
            {needsMigration.length > 0 && !running && !done && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                    Migrate မည့် Voucher {needsMigration.length} ကြောင်း
                  </p>
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {needsMigration.map((v, i) => {
                    const img = v.image_data || v.Image_Data || '';
                    const vno = v.voucher_no || v.voucherno || '—';
                    const item = v.item_description || v.item || '—';
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <button
                          onClick={() => setPreviewImg(img)}
                          className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:border-slate-400 transition-colors"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt="" className="w-full h-full object-cover"/>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-700 truncate">{item}</p>
                          <p className="text-[9px] text-slate-400">{vno} · {v.date || v.Date || ''}</p>
                        </div>
                        <div className="text-[9px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-black shrink-0">
                          {Math.round(img.length / 1024)}KB
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Progress during migration */}
            {running && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">
                    Migrating {currentIdx} / {needsMigration.length}
                  </p>
                  <RefreshCcw size={16} className="animate-spin text-slate-400"/>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${(currentIdx / needsMigration.length) * 100}%` }}
                  />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {results.slice(-5).map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      {r.status === 'done'  && <CheckCircle size={11} className="text-emerald-500 shrink-0"/>}
                      {r.status === 'error' && <XCircle     size={11} className="text-rose-500 shrink-0"/>}
                      <span className="text-slate-500 font-black shrink-0">{r.voucherno}</span>
                      <span className="text-slate-400 truncate">{r.item}</span>
                      {r.status === 'error' && <span className="text-rose-500 shrink-0">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Final results */}
            {done && (
              <div className="space-y-3">
                <div className={`rounded-2xl p-5 border ${errorCount === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-3">
                    {errorCount === 0
                      ? <CheckCircle size={24} className="text-emerald-500"/>
                      : <AlertTriangle size={24} className="text-amber-500"/>
                    }
                    <div>
                      <p className="text-sm font-black uppercase">
                        {errorCount === 0 ? 'Migration ပြီးပါပြီ ✓' : 'တစ်ချို့ Error ရှိသည်'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        ✓ {doneCount} ကြောင်း အောင်မြင် · ✗ {errorCount} ကြောင်း မအောင်မြင်
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error details */}
                {errorCount > 0 && (
                  <div className="bg-white border border-rose-200 rounded-2xl overflow-hidden">
                    <div className="bg-rose-50 px-4 py-3 border-b border-rose-100">
                      <p className="text-[10px] text-rose-600 uppercase tracking-widest font-black">Error ({errorCount})</p>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {results.filter(r => r.status === 'error').map((r, i) => (
                        <div key={i} className="px-4 py-3 space-y-0.5">
                          <p className="text-[11px] font-black text-slate-700">{r.voucherno} — {r.item}</p>
                          <p className="text-[10px] text-rose-500">{r.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Migrated URL preview */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Cloudinary URLs</p>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {results.filter(r => r.status === 'done').map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <button onClick={() => setPreviewImg(r.url!)}
                          className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.url} alt="" className="w-full h-full object-cover"/>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-slate-700 truncate">{r.item}</p>
                          <p className="text-[9px] text-emerald-600 truncate">{r.url}</p>
                        </div>
                        <CheckCircle size={13} className="text-emerald-500 shrink-0"/>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Start button */}
            {needsMigration.length > 0 && !done && (
              <button
                onClick={runMigration}
                disabled={running}
                className={`w-full py-4 rounded-2xl text-sm font-black uppercase flex items-center justify-center gap-2 transition-all ${
                  running
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'
                }`}
              >
                {running
                  ? <><RefreshCcw size={16} className="animate-spin"/> Migrating...</>
                  : <><Upload size={16}/> Start Migration ({needsMigration.length} ပုံ)</>
                }
              </button>
            )}

            {done && (
              <Link href="/" className="w-full py-4 rounded-2xl text-sm font-black uppercase flex items-center justify-center gap-2 bg-slate-950 text-white hover:bg-slate-800 transition-all">
                Dashboard သို့ ပြန်သွား
              </Link>
            )}
          </>
        )}
      </div>

      {/* Image preview modal */}
      {previewImg && (
        <div
          className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
          onClick={() => setPreviewImg(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImg}
            className="max-w-full max-h-full rounded-2xl border-4 border-white shadow-2xl"
            alt="Preview"
          />
        </div>
      )}
    </main>
  );
}
