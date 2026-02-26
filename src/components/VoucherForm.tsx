"use client"
import React, { useState, useMemo, useEffect } from 'react';
import { sendToSheet } from '@/lib/api';
import { Plus, Trash2, Save, RefreshCcw, Camera, ShoppingCart, ChevronDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function VoucherForm({ onRefresh }: { onRefresh: () => void }) {
  // ၁။ ဝင်ငွေ/ထွက်ငွေ အမျိုးအစား (Default: Cash Out)
  const [type, setType] = useState<'Cash In' | 'Cash Out'>('Cash Out');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherno, setVoucherno] = useState('');
  const [image, setImage] = useState<string>('');
  const [itemList, setItemList] = useState<any[]>([]);
  
  // GAS မှလာသော Configuration (Suppliers & Items အပါအဝင်) [cite: 2026-02-25]
  const [config, setConfig] = useState<any>({ 
    tree: [], prefixes: {}, lastSerials: {}, suppliers: [], recentItems: [] 
  });
  
  const [currentItem, setCurrentItem] = useState({ 
    item: '', count: 0, cost_piece: 0, category: '', sub1: '', sub2: '', sub3: '', sub4: '', sub5: '' 
  });

  // Data Sync လုပ်ခြင်း
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_GAS_URL!).then(res => res.json()).then(data => setConfig(data));
  }, []);

  // Voucher ID ထုတ်ပေးခြင်း (Type အလိုက် Prefix ခွဲခြားသည်) [cite: 2026-02-23]
  const generateVrID = (cat: string, currentBatch: any[]) => {
    const prefix = type === 'Cash In' ? 'INC' : (config.prefixes[cat] || "EXP");
    const lastNum = config.lastSerials[prefix] || 0;
    const inBatchCount = currentBatch.filter(i => i.voucherno.startsWith(prefix)).length;
    const nextNum = (lastNum + inBatchCount + 1).toString().padStart(3, '0');
    const month = (new Date(date).getMonth() + 1).toString().padStart(2, '0');
    setVoucherno(`${prefix}-${month}-${nextNum}`);
  };

  const addItem = () => {
    if (!vendor || !currentItem.item || currentItem.count <= 0) return alert("REQUIRED: VENDOR, ITEM & QTY");
    const newItem = { ...currentItem, voucherno, type, image_data: image, id: Date.now() };
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
      alert("DATA SYNCED TO CLOUD LEDGER"); setItemList([]); onRefresh();
    } catch (err) { alert("ERROR POSTING DATA"); }
  };

  const getOptions = (l: number, p: string) => (config.tree || []).filter((i: any) => i.level === l && i.parent === p).map((i: any) => i.child);
  const grandTotal = useMemo(() => itemList.reduce((s, i) => s + (i.count * i.cost_piece), 0), [itemList]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 font-black text-slate-950 uppercase">
      {/* LEFT: INPUT PANEL */}
      <div className="lg:col-span-8 p-6 space-y-6 border-r border-slate-100">
        
        {/* TYPE TOGGLE: CASH IN / CASH OUT [cite: 2026-02-23] */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button 
            onClick={() => { setType('Cash Out'); setVoucherno(''); }}
            className={`flex items-center px-6 py-2.5 rounded-xl transition-all ${type === 'Cash Out' ? 'bg-purple-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <ArrowDownLeft size={16} className="mr-2"/> CASH OUT
          </button>
          <button 
            onClick={() => { setType('Cash In'); setVoucherno(''); }}
            className={`flex items-center px-6 py-2.5 rounded-xl transition-all ${type === 'Cash In' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <ArrowUpRight size={16} className="mr-2"/> CASH IN
          </button>
        </div>

        {/* HEADER: VENDOR & DATE [cite: 2026-02-25] */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border-b-4 border-slate-950">
          <div className="space-y-1">
            <label className="text-[9px] text-purple-900 tracking-widest font-black uppercase">SUPPLIER / VENDOR</label>
            <input 
              list="supplier-list"
              className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none focus:border-purple-900 text-sm font-black" 
              value={vendor} 
              onChange={e => setVendor(e.target.value)} 
              placeholder="SEARCH OR ADD NEW" 
            />
            <datalist id="supplier-list">
              {config.suppliers?.map((s: string) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-purple-900 tracking-widest font-black uppercase">DATE</label>
            <input type="date" className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none text-sm font-black" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] text-purple-900 tracking-widest font-black uppercase">VOUCHER ID</label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 h-[46px]">
              <span className="text-purple-900 text-sm font-black flex-grow">{voucherno || "SELECT CATEGORY"}</span>
              <RefreshCcw size={16} className="text-slate-300 cursor-pointer hover:rotate-180 transition-all" onClick={() => generateVrID(currentItem.category, itemList)} />
            </div>
          </div>
        </div>

        {/* INPUT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="relative h-44 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
              {image ? <><img src={image} className="w-full h-full object-cover"/><button onClick={() => setImage('')} className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-full"><Trash2 size={14}/></button></> : <label className="cursor-pointer flex flex-col items-center"><Camera size={32} className="text-slate-300 mb-2"/><span className="text-[9px] text-slate-400 font-black">VR PHOTO</span><input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setImage(r.result as string); r.readAsDataURL(f); } }} /></label>}
            </div>
            
            <div className="space-y-2">
              <label className="text-[9px] text-slate-400 font-black uppercase">CATEGORY HEAD</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs" value={currentItem.category} onChange={e => { setCurrentItem({...currentItem, category: e.target.value}); generateVrID(e.target.value, itemList); }}>
                <option value="">SELECT MAIN CATEGORY</option>
                {Object.keys(config.prefixes || {}).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3 font-black">
            {['sub1', 'sub2'].map((key, idx) => {
              const opts = getOptions(idx + 1, idx === 0 ? currentItem.category : (currentItem as any)[`sub${idx}`]);
              return opts.length > 0 && <div key={key} className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-black">SUB CATEGORY</label><select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs" value={(currentItem as any)[key]} onChange={e => setCurrentItem({...currentItem, [key]: e.target.value})}><option value="">SELECT OPTION</option>{opts.map((o:any)=><option key={o} value={o}>{o}</option>)}</select></div>
            })}
            
            {/* ITEM SUGGESTION FIELD [cite: 2026-02-17] */}
            <div className="space-y-1 font-black">
              <label className="text-[9px] text-slate-400 uppercase font-black">PARTICULARS / ITEM NAME</label>
              <input 
                list="item-suggestions"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-900 font-black" 
                placeholder="E.G. SCHOOL FEES" 
                value={currentItem.item} 
                onChange={e => setCurrentItem({...currentItem, item: e.target.value})} 
              />
              <datalist id="item-suggestions">
                {config.recentItems?.map((i: string) => <option key={i} value={i} />)}
              </datalist>
            </div>
            
            <div className="grid grid-cols-2 gap-3 font-black">
              <div className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-black">QUANTITY</label><input type="number" className="w-full p-3 bg-slate-950 text-white rounded-xl text-lg text-center font-black" value={currentItem.count} onChange={e => setCurrentItem({...currentItem, count: Number(e.target.value)})} /></div>
              <div className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-black">RATE (MMK)</label><input type="number" className="w-full p-3 bg-slate-950 text-white rounded-xl text-lg text-center font-black" value={currentItem.cost_piece} onChange={e => setCurrentItem({...currentItem, cost_piece: Number(e.target.value)})} /></div>
            </div>
          </div>
        </div>

        <button onClick={addItem} className="w-full bg-slate-950 text-white py-4 rounded-xl font-black text-sm shadow-xl hover:bg-purple-900 transition-all flex items-center justify-center active:scale-95 uppercase font-black">
          <Plus className="mr-2" size={18} strokeWidth={4}/> ADD TO VOUCHER BATCH
        </button>
      </div>

      {/* RIGHT: BATCH SIDEBAR */}
      <div className="lg:col-span-4 flex flex-col bg-slate-100 border-l border-slate-200">
        <div className="bg-slate-950 p-4 text-white flex justify-between items-center font-black">
          <div className="flex gap-2 items-center text-xs tracking-widest uppercase font-black font-black"><ShoppingCart size={16} className="text-purple-400 font-black"/> <span>PENDING BATCH</span></div>
          <span className="bg-purple-900 px-3 py-0.5 rounded-full text-[9px] font-black">{itemList.length} ITEMS</span>
        </div>

        <div className="flex-grow p-4 space-y-3 overflow-y-auto max-h-[450px] font-black">
          {itemList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 pt-10 font-black uppercase">NO ITEMS ADDED</div>
          ) : (
            itemList.map(i => (
              <div key={i.id} className={`bg-white p-3 rounded-xl shadow-sm border-l-4 ${i.type === 'Cash In' ? 'border-emerald-500' : 'border-purple-600'} flex justify-between items-center group font-black uppercase`}>
                <div className="space-y-0.5 font-black">
                  <p className={`text-[8px] font-black ${i.type === 'Cash In' ? 'text-emerald-600' : 'text-purple-600'}`}>{i.voucherno} | {i.type}</p>
                  <p className="font-black text-[11px] leading-tight font-black">{i.item}</p>
                  <p className="text-[8px] text-slate-400 font-black">{i.count} X {i.cost_piece.toLocaleString()} MMK</p>
                </div>
                <div className="flex items-center gap-2 font-black">
                  <p className="font-black text-xs">{(i.count * i.cost_piece).toLocaleString()}</p>
                  <button onClick={() => setItemList(itemList.filter(x => x.id !== i.id))} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all font-black"><Trash2 size={14}/></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-slate-950 p-6 space-y-4 font-black">
          <div className="flex justify-between items-end border-b border-slate-800 pb-3 font-black">
            <span className="text-purple-400 text-[9px] font-black uppercase">BATCH NET TOTAL</span>
            <div className="text-right font-black uppercase">
              <span className="text-white text-3xl font-black block">{(grandTotal).toLocaleString()}</span>
              <span className="text-purple-400 text-[8px] italic font-black">MMK</span>
            </div>
          </div>
          <button onClick={handleFinalSubmit} className="w-full bg-white text-slate-950 py-4 rounded-xl font-black text-xs shadow-md hover:bg-purple-900 hover:text-white transition-all flex justify-center items-center uppercase font-black">
            <Save className="mr-2" size={16} strokeWidth={3}/> POST TO CLOUD LEDGER
          </button>
        </div>
      </div>
    </div>
  );
}
