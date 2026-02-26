"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { sendToSheet } from '@/lib/api';
import { Plus, Trash2, Save, RefreshCcw, Camera, ArrowUpRight, ArrowDownLeft, CheckCircle, AlertTriangle, Search } from 'lucide-react';

export default function VoucherForm({ onRefresh }: { onRefresh: () => void }) {
  const [type, setType] = useState<'Cash In' | 'Cash Out'>('Cash Out');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherno, setVoucherno] = useState('');
  const [image, setImage] = useState<string>('');
  const [itemList, setItemList] = useState<any[]>([]);
  
  // ၁။ Config Data ကို ပိုမိုခိုင်မာအောင် လက်ခံခြင်း [cite: 2026-02-23]
  const [config, setConfig] = useState<any>({ 
    tree: [], prefixes: {}, lastSerials: {}, suppliers: [], recentItems: [] 
  });

  const [currentItem, setCurrentItem] = useState({ 
    item: '', count: '' as any, cost_piece: '' as any, category: '', sub1: '', sub2: '' 
  });

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_GAS_URL!)
      .then(res => res.json())
      .then(data => {
        // GAS ကပေးတဲ့ Key နာမည် အကြီး/အသေးကို Normalizing လုပ်ခြင်း [cite: 2026-02-25]
        setConfig({
          tree: data.tree || data.Tree || [],
          prefixes: data.prefixes || data.Prefixes || {},
          lastSerials: data.lastSerials || data.LastSerials || {},
          suppliers: data.suppliers || data.Suppliers || [],
          recentItems: data.recentItems || data.RecentItems || []
        });
      });
  }, []);

  // ၂။ Supplier List ကို ရှာဖွေရလွယ်အောင် စီစဉ်ခြင်း [cite: 2026-02-23]
  const supplierOptions = useMemo(() => config.suppliers || [], [config.suppliers]);

  const getOptions = (level: number, parent: string) => {
    if (!parent) return [];
    return (config.tree || [])
      .filter((node: any) => node.level === level && node.parent === parent)
      .map((node: any) => node.child);
  };

  const addItem = () => {
    const countNum = parseFloat(currentItem.count); 
    const costNum = parseInt(currentItem.cost_piece); 
    if (!vendor || !currentItem.item || isNaN(countNum)) return alert("REQUIRED: VENDOR, ITEM & QTY");
    
    const total = Math.round(countNum * costNum);
    const newItem = { 
      ...currentItem, count: countNum, cost_piece: costNum, cost_total: total,
      voucherno, type, image_data: image, id: Date.now() 
    };
    const updatedList = [...itemList, newItem];
    setItemList(updatedList);
    generateVrID(currentItem.category, updatedList);
    setCurrentItem({ ...currentItem, item: '', count: '', cost_piece: '' });
    setImage('');
  };

  const generateVrID = (cat: string, currentBatch: any[]) => {
    const prefix = type === 'Cash In' ? 'INC' : (config.prefixes[cat] || "EXP");
    const lastNum = config.lastSerials[prefix] || 0;
    const inBatchCount = currentBatch.filter(i => i.voucherno.startsWith(prefix)).length;
    const nextNum = (lastNum + inBatchCount + 1).toString().padStart(3, '0');
    const month = (new Date(date).getMonth() + 1).toString().padStart(2, '0');
    setVoucherno(`${prefix}-${month}-${nextNum}`);
  };

  const handleFinalSubmit = async () => {
    if (itemList.length === 0 || submitStatus === 'processing') return; 
    setSubmitStatus('processing'); 
    try {
      for (const item of itemList) {
        await sendToSheet({ date, vendor, ...item });
      }
      setSubmitStatus('success'); setItemList([]); onRefresh();
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (err) { 
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 font-black text-slate-950 uppercase">
      {/* LEFT PANEL */}
      <div className="lg:col-span-8 p-6 space-y-6 border-r border-slate-100">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit font-black">
          <button onClick={() => { setType('Cash Out'); setVoucherno(''); }} className={`flex items-center px-6 py-2 rounded-xl transition-all ${type === 'Cash Out' ? 'bg-purple-900 text-white shadow-lg' : 'text-slate-400'}`}><ArrowDownLeft size={16} className="mr-2"/> CASH OUT</button>
          <button onClick={() => { setType('Cash In'); setVoucherno(''); }} className={`flex items-center px-6 py-2 rounded-xl transition-all ${type === 'Cash In' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}><ArrowUpRight size={16} className="mr-2"/> CASH IN</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border-b-4 border-slate-950">
          <div className="space-y-1 relative">
            <label className="text-[9px] text-purple-900 tracking-widest font-black uppercase">SUPPLIER / VENDOR</label>
            <div className="relative">
              {/* 🔴 Autocomplete Input with Search Icon [cite: 2026-02-23] 🔴 */}
              <input 
                list="suppliers" 
                className="w-full bg-white border border-slate-200 p-3 pr-10 rounded-xl outline-none focus:border-purple-900 text-sm font-black uppercase" 
                value={vendor} 
                onChange={e => setVendor(e.target.value)} 
                placeholder="TYPE NAME..." 
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              
              {/* 🔴 Dynamic Datalist ချိတ်ဆက်မှု 🔴 */}
              <datalist id="suppliers">
                {supplierOptions.map((s: string, idx: number) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="space-y-1 font-black">
            <label className="text-[9px] text-purple-900 tracking-widest font-black uppercase">DATE</label>
            <input type="date" className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none text-sm font-black" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1 font-black">
            <label className="text-[9px] text-purple-900 tracking-widest font-black uppercase">VOUCHER ID</label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 h-[46px]"><span className="text-purple-900 text-sm font-black flex-grow uppercase">{voucherno || "SELECT CATEGORY"}</span><RefreshCcw size={16} className="text-slate-300 cursor-pointer" onClick={() => generateVrID(currentItem.category, itemList)} /></div>
          </div>
        </div>

        {/* CATEGORY & ITEMS AREA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-black">
          <div className="space-y-4 font-black">
             <div className="relative h-44 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden font-black">
                {image ? <><img src={image} className="w-full h-full object-cover"/><button onClick={() => setImage('')} className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-full"><Trash2 size={14}/></button></> : <label className="cursor-pointer flex flex-col items-center"><Camera size={32} className="text-slate-300 mb-2"/><span className="text-[9px] text-slate-400 font-black">VR PHOTO</span><input type="file" accept="image/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setImage(r.result as string); r.readAsDataURL(f); } }} /></label>}
             </div>
             
             <div className="space-y-1 font-black">
               <label className="text-[9px] text-slate-400 uppercase font-black font-black">MAIN CATEGORY</label>
               <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs uppercase font-black" value={currentItem.category} onChange={e => { setCurrentItem({...currentItem, category: e.target.value, sub1: '', sub2: ''}); generateVrID(e.target.value, itemList); }}>
                  <option value="">SELECT MAIN CATEGORY</option>
                  {Object.keys(config.prefixes || {}).map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>

             {getOptions(1, currentItem.category).length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[9px] text-slate-400 uppercase font-black">SUB CATEGORY 1</label>
                 <select className="w-full p-3 bg-white border-2 border-purple-100 rounded-xl font-black text-xs uppercase" value={currentItem.sub1} onChange={e => setCurrentItem({...currentItem, sub1: e.target.value, sub2: ''})}>
                    <option value="">SELECT SUB-CATEGORY 1</option>
                    {getOptions(1, currentItem.category).map((o:any) => <option key={o} value={o}>{o}</option>)}
                 </select>
               </div>
             )}
          </div>

          <div className="space-y-3 font-black">
            <label className="text-[9px] text-slate-400 uppercase font-black font-black">ITEM DESCRIPTION</label>
            <input list="items" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-black uppercase font-black" placeholder="ENTER DETAILS" value={currentItem.item} onChange={e => setCurrentItem({...currentItem, item: e.target.value})} />
            <datalist id="items">{config.recentItems?.map((i:any) => <option key={i} value={i} />)}</datalist>
            
            <div className="grid grid-cols-2 gap-3 font-black">
              <div className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-black">QTY</label><input type="number" step="any" className="w-full p-3 bg-slate-950 text-white rounded-xl text-lg text-center font-black" value={currentItem.count} onChange={e => setCurrentItem({...currentItem, count: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-black">RATE</label><input type="number" className="w-full p-3 bg-slate-950 text-white rounded-xl text-lg text-center font-black" value={currentItem.cost_piece} onChange={e => setCurrentItem({...currentItem, cost_piece: e.target.value})} /></div>
            </div>
          </div>
        </div>

        <button onClick={addItem} className="w-full bg-slate-950 text-white py-4 rounded-xl font-black text-sm shadow-xl hover:bg-purple-900 transition-all flex items-center justify-center uppercase font-black"><Plus className="mr-2" size={18} strokeWidth={4}/> ADD TO VOUCHER BATCH</button>
      </div>

      {/* BATCH SIDEBAR */}
      <div className="lg:col-span-4 flex flex-col bg-slate-100 border-l border-slate-200 font-black">
        <div className="bg-slate-950 p-4 text-white flex justify-between items-center font-black"><span className="text-[10px] tracking-widest font-black uppercase font-black">BATCH ITEMS ({itemList.length})</span></div>
        <div className="flex-grow p-4 space-y-3 overflow-y-auto max-h-[450px] font-black uppercase font-black">
          {itemList.map(i => (
            <div key={i.id} className={`bg-white p-3 rounded-xl shadow-sm border-l-4 ${i.type === 'Cash In' ? 'border-emerald-500' : 'border-purple-600'} flex justify-between items-center font-black`}>
              <div className="space-y-0.5 font-black uppercase font-black"><p className="text-[8px] font-black text-purple-600 font-black">{i.voucherno}</p><p className="font-black text-[11px] font-black">{i.item}</p><p className="text-[8px] text-slate-400 font-black font-black">{i.count} X {i.cost_piece.toLocaleString()} MMK</p></div>
              <p className="font-black text-xs font-black">{(i.cost_total).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="bg-slate-950 p-6 space-y-4 font-black font-black">
          <div className="flex justify-between items-end border-b border-slate-800 pb-3 font-black">
            <span className="text-purple-400 text-[9px] font-black uppercase font-black">BATCH TOTAL</span>
            <span className="text-white text-3xl font-black font-black">{itemList.reduce((s,x)=>s+x.cost_total,0).toLocaleString()}</span>
          </div>
          
          <button onClick={handleFinalSubmit} disabled={submitStatus === 'processing'} className={`w-full py-4 rounded-xl font-black text-xs transition-all flex items-center justify-center uppercase font-black ${submitStatus === 'idle' ? 'bg-white text-slate-950 hover:bg-purple-900 hover:text-white shadow-md' : submitStatus === 'processing' ? 'bg-yellow-500 text-slate-900' : submitStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            {submitStatus === 'idle' && <><Save className="mr-2" size={16} strokeWidth={3}/> POST TO CLOUD LEDGER</>}
            {submitStatus === 'processing' && <><RefreshCcw className="mr-2 animate-spin" size={16} strokeWidth={3}/> PROCESSING...</>}
            {submitStatus === 'success' && <><CheckCircle className="mr-2" size={16} strokeWidth={3}/> SUCCESSFUL</>}
            {submitStatus === 'error' && <><AlertTriangle className="mr-2" size={16} strokeWidth={3}/> ERROR</>}
          </button>
        </div>
      </div>
    </div>
  );
}
