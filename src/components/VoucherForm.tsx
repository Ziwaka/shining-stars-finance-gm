"use client"
import React, { useState, useMemo, useEffect } from 'react';
import { sendToSheet } from '@/lib/api';
import { Plus, Trash2, Save, RefreshCcw, Camera, ShoppingCart, Calendar } from 'lucide-react';

export default function VoucherForm({ onRefresh }: { onRefresh: () => void }) {
  const [vendor, setVendor] = useState('');
  // Date ကို ဒီနေ့ရက်စွဲပေးထားပြီး ပြန်ရွေးလို့ရအောင် စီစဉ်ထားသည် [cite: 2026-02-23]
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherno, setVoucherno] = useState('');
  const [image, setImage] = useState<string>('');
  const [itemList, setItemList] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ tree: [], prefixes: {}, lastSerials: {} });
  const [currentItem, setCurrentItem] = useState({ item: '', count: 0, cost_piece: 0, category: '', sub1: '', sub2: '', sub3: '', sub4: '', sub5: '' });

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_GAS_URL!).then(res => res.json()).then(data => setConfig(data));
  }, []);

  const generateVrID = (cat: string, currentBatch: any[]) => {
    const prefix = config.prefixes[cat] || "VR";
    const lastNum = config.lastSerials[prefix] || 0;
    const inBatchCount = currentBatch.filter(i => i.voucherno.startsWith(prefix)).length;
    const nextNum = (lastNum + inBatchCount + 1).toString().padStart(3, '0');
    const month = (new Date(date).getMonth() + 1).toString().padStart(2, '0');
    setVoucherno(`${prefix}-${month}-${nextNum}`);
  };

  const addItem = () => {
    if (!vendor || !currentItem.item || currentItem.count <= 0) return alert("REQUIRED: VENDOR, ITEM & QTY");
    const newItem = { ...currentItem, voucherno, image_data: image, id: Date.now() };
    const updatedList = [...itemList, newItem];
    setItemList(updatedList);
    generateVrID(currentItem.category, updatedList);
    setCurrentItem({ ...currentItem, item: '', count: 0, cost_piece: 0 });
    setImage('');
  };

  const handleFinalSubmit = async () => {
    if (itemList.length === 0) return;
    try {
      for (const item of itemList) {
        await sendToSheet({ date, vendor, ...item, cost_total: item.count * item.cost_piece });
      }
      alert("POSTED TO CLOUD LEDGER"); setItemList([]); onRefresh();
    } catch (err) { alert("ERROR POSTING DATA"); }
  };

  const getOptions = (l: number, p: string) => (config.tree || []).filter((i: any) => i.level === l && i.parent === p).map((i: any) => i.child);
  const grandTotal = useMemo(() => itemList.reduce((s, i) => s + (i.count * i.cost_piece), 0), [itemList]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 font-black text-slate-950 uppercase h-full">
      {/* 1. COMPACT INPUT AREA (LEFT) [cite: 2026-02-23] */}
      <div className="lg:col-span-8 p-6 space-y-6 border-r border-slate-100">
        
        {/* HEADER: DATE & VENDOR [cite: 2026-02-25] */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border-b-4 border-purple-900">
          <div className="space-y-1">
            <label className="text-[9px] text-purple-900 tracking-widest font-black uppercase">VENDOR / SHOP</label>
            <input className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none focus:border-purple-900 text-sm font-black" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="ENTER VENDOR NAME" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-purple-900 tracking-widest font-black uppercase">RECORD DATE</label>
            <div className="relative">
              <input type="date" className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none text-sm font-black uppercase" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-purple-900 tracking-widest font-black uppercase">VOUCHER ID</label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 h-[46px]">
              <span className="text-purple-900 text-sm font-black flex-grow">{voucherno || "SELECT CATEGORY"}</span>
              <RefreshCcw size={16} className="text-slate-300 cursor-pointer hover:text-purple-900" onClick={() => generateVrID(currentItem.category, itemList)} />
            </div>
          </div>
        </div>

        {/* INPUT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="relative h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
              {image ? <><img src={image} className="w-full h-full object-cover"/><button onClick={() => setImage('')} className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-full shadow-lg"><Trash2 size={14}/></button></> : <label className="cursor-pointer flex flex-col items-center"><Camera size={32} className="text-slate-300 mb-2"/><span className="text-[9px] text-slate-400 font-black">VR PHOTO</span><input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setImage(r.result as string); r.readAsDataURL(f); } }} /></label>}
            </div>
            
            <div className="space-y-2 font-black">
              <label className="text-[9px] text-slate-400 font-black uppercase">MAIN CATEGORY</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-xs uppercase" value={currentItem.category} onChange={e => { setCurrentItem({...currentItem, category: e.target.value}); generateVrID(e.target.value, itemList); }}>
                <option value="">SELECT HEAD</option>
                {Object.keys(config.prefixes || {}).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3 font-black">
            {['sub1', 'sub2', 'sub3'].map((key, idx) => {
              const opts = getOptions(idx + 1, idx === 0 ? currentItem.category : (currentItem as any)[`sub${idx}`]);
              return opts.length > 0 && <div key={key} className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-black">SUB {idx+1}</label><select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-xs" value={(currentItem as any)[key]} onChange={e => setCurrentItem({...currentItem, [key]: e.target.value})}><option value="">SELECT OPTION</option>{opts.map((o:any)=><option key={o} value={o}>{o}</option>)}</select></div>
            })}
            <div className="space-y-1 font-black">
              <label className="text-[9px] text-slate-400 uppercase font-black">ITEM DESCRIPTION</label>
              <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none focus:border-purple-900" placeholder="E.G. FUEL BUS 1" value={currentItem.item} onChange={e => setCurrentItem({...currentItem, item: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-black">QTY</label><input type="number" className="w-full p-3 bg-slate-950 text-white rounded-xl font-black text-lg text-center" value={currentItem.count} onChange={e => setCurrentItem({...currentItem, count: Number(e.target.value)})} /></div>
              <div className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-black">RATE</label><input type="number" className="w-full p-3 bg-slate-950 text-white rounded-xl font-black text-lg text-center" value={currentItem.cost_piece} onChange={e => setCurrentItem({...currentItem, cost_piece: Number(e.target.value)})} /></div>
            </div>
          </div>
        </div>

        <button onClick={addItem} className="w-full bg-purple-900 text-white py-4 rounded-xl font-black text-sm shadow-lg hover:bg-slate-950 transition-all flex items-center justify-center border-b-4 border-purple-950 active:scale-95 uppercase font-black">
          <Plus className="mr-2" size={18} strokeWidth={4}/> ADD TO VOUCHER BATCH
        </button>
      </div>

      {/* 2. COMPACT CART SIDEBAR (RIGHT) [cite: 2026-02-23] */}
      <div className="lg:col-span-4 flex flex-col bg-slate-50 border-l border-slate-200">
        <div className="bg-slate-950 p-4 text-white flex justify-between items-center font-black">
          <div className="flex gap-2 items-center text-xs tracking-widest font-black uppercase font-black"><ShoppingCart size={16} className="text-purple-400 font-black"/> <span>BATCH</span></div>
          <span className="bg-purple-900 px-3 py-0.5 rounded-full text-[9px] font-black">{itemList.length} ITEMS</span>
        </div>

        <div className="flex-grow p-4 space-y-3 overflow-y-auto max-h-[450px]">
          {itemList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 pt-10">
              <p className="text-[10px] font-black uppercase">NO ITEMS ADDED</p>
            </div>
          ) : (
            itemList.map(i => (
              <div key={i.id} className="bg-white p-3 rounded-xl shadow-sm border-l-4 border-purple-900 flex justify-between items-center group font-black uppercase font-black">
                <div className="space-y-0.5">
                  <p className="text-[8px] text-purple-600 font-black font-black">{i.voucherno}</p>
                  <p className="font-black text-[11px] leading-tight font-black">{i.item}</p>
                  <p className="text-[8px] text-slate-400 font-black">{i.count} X {i.cost_piece.toLocaleString()} MMK</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-black text-xs">{(i.count * i.cost_piece).toLocaleString()}</p>
                  <button onClick={() => setItemList(itemList.filter(x => x.id !== i.id))} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all font-black"><Trash2 size={14}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-slate-950 p-6 space-y-4 font-black uppercase">
          <div className="flex justify-between items-end border-b border-slate-800 pb-3 font-black uppercase">
            <span className="text-purple-400 text-[9px] font-black uppercase">GRAND TOTAL</span>
            <div className="text-right font-black uppercase">
              <span className="text-white text-2xl font-black block font-black">{(grandTotal).toLocaleString()}</span>
              <span className="text-purple-400 text-[8px] italic font-black">MMK TOTAL</span>
            </div>
          </div>
          <button onClick={handleFinalSubmit} className="w-full bg-white text-slate-950 py-4 rounded-xl font-black text-xs shadow-md hover:bg-purple-900 hover:text-white transition-all flex justify-center items-center font-black uppercase">
            <Save className="mr-2" size={16} strokeWidth={3}/> POST TO CLOUD
          </button>
        </div>
      </div>
    </div>
  );
}