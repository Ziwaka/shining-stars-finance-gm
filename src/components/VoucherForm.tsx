"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { sendToSheet } from '@/lib/api';
import { Plus, Trash2, Save, RefreshCcw, Camera, ArrowUpRight, ArrowDownLeft, CheckCircle, AlertTriangle, MessageSquare, Hash, Banknote, Search } from 'lucide-react';

export default function VoucherForm({ onRefresh }: { onRefresh: () => void }) {
  const [type, setType] = useState<'Cash Out' | 'Cash In'>('Cash Out');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherno, setVoucherno] = useState('');
  const [image, setImage] = useState<string>('');
  const [itemList, setItemList] = useState<any[]>([]);
  
  const [config, setConfig] = useState<any>({ categoryList: [], prefixes: {}, lastSerials: {}, suppliers: [], recentItems: [] });
  
  // 🔴 ၅ ဆင့်လုံးအတွက် State များ [cite: 2026-02-23]
  const [category, setCategory] = useState('');
  const [sub1, setSub1] = useState('');
  const [sub2, setSub2] = useState('');
  const [sub3, setSub3] = useState('');
  const [sub4, setSub4] = useState('');
  const [sub5, setSub5] = useState('');

  const [currentItem, setCurrentItem] = useState({ item_description: '', count: '' as any, cost_piece: '' as any, note: '' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_GAS_URL!)
      .then(res => res.json())
      .then(data => {
        setConfig({
          categoryList: data.categoryList || data.tree || [],
          prefixes: data.prefixes || {},
          lastSerials: data.lastSerials || {},
          suppliers: data.suppliers || [],
          recentItems: data.recentItems || []
        });
      });
  }, []);

  // 🔴 ၅ ဆင့်လုံးအတွက် Flat Filtering Logic [cite: 2026-02-23]
  const categoryOptions = useMemo<string[]>(() => Array.from(new Set(config.categoryList.map((row: any) => String(row.Category || row.category || '')))).filter(Boolean) as string[], [config.categoryList]);
  const sub1Options = useMemo<string[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => (row.Category || row.category) === category).map((row: any) => String(row.Sub_1 || row.sub1 || '')))).filter(Boolean) as string[], [category, config.categoryList]);
  const sub2Options = useMemo<string[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => (row.Category || row.category) === category && (row.Sub_1 || row.sub1) === sub1).map((row: any) => String(row.Sub_2 || row.sub2 || '')))).filter(Boolean) as string[], [sub1, config.categoryList, category]);
  const sub3Options = useMemo<string[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => (row.Category || row.category) === category && (row.Sub_1 || row.sub1) === sub1 && (row.Sub_2 || row.sub2) === sub2).map((row: any) => String(row.Sub_3 || row.sub3 || '')))).filter(Boolean) as string[], [sub2, config.categoryList, category, sub1]);
  const sub4Options = useMemo<string[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => (row.Category || row.category) === category && (row.Sub_1 || row.sub1) === sub1 && (row.Sub_2 || row.sub2) === sub2 && (row.Sub_3 || row.sub3) === sub3).map((row: any) => String(row.Sub_4 || row.sub4 || '')))).filter(Boolean) as string[], [sub3, config.categoryList, category, sub1, sub2]);
  const sub5Options = useMemo<string[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => (row.Category || row.category) === category && (row.Sub_1 || row.sub1) === sub1 && (row.Sub_2 || row.sub2) === sub2 && (row.Sub_3 || row.sub3) === sub3 && (row.Sub_4 || row.sub4) === sub4).map((row: any) => String(row.Sub_5 || row.sub5 || '')))).filter(Boolean) as string[], [sub4, config.categoryList, category, sub1, sub2, sub3]);

  const generateVrID = (cat: string, currentBatch: any[]) => {
    const prefix = type === 'Cash In' ? 'INC' : (config.prefixes[cat] || "EXP");
    const lastNum = config.lastSerials[prefix] || 0;
    const inBatchCount = currentBatch.filter(i => i.voucherno.startsWith(prefix)).length;
    const nextNum = (lastNum + inBatchCount + 1).toString().padStart(3, '0');
    const month = (new Date(date).getMonth() + 1).toString().padStart(2, '0');
    setVoucherno(`${prefix}-${month}-${nextNum}`);
  };

  const addItem = () => {
    const countNum = parseFloat(currentItem.count); 
    const costNum = parseInt(currentItem.cost_piece); 
    if (!vendor || !currentItem.item_description || isNaN(countNum)) return alert("REQUIRED: VENDOR, ITEM & QTY");
    
    const total = Math.round(countNum * costNum);
    const newItem = { 
      date, vendor, type, voucherno, category, sub1, sub2, sub3, sub4, sub5,
      item_description: currentItem.item_description, note: currentItem.note,
      count: countNum, cost_piece: costNum, cost_total: total, image_data: image, id: Date.now() 
    };
    
    const updatedList = [...itemList, newItem];
    setItemList(updatedList);
    generateVrID(category, updatedList);
    setCurrentItem({ item_description: '', count: '', cost_piece: '', note: '' });
    setImage('');
  };

  const handleFinalSubmit = async () => {
    if (itemList.length === 0 || submitStatus === 'processing') return; 
    setSubmitStatus('processing'); 
    try {
      for (const item of itemList) { await sendToSheet(item); }
      setSubmitStatus('success'); setItemList([]); onRefresh();
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (err) { setSubmitStatus('error'); setTimeout(() => setSubmitStatus('idle'), 3000); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 font-black text-slate-950 uppercase">
      {/* INPUT PANEL */}
      <div className="lg:col-span-8 p-6 space-y-6 border-r border-slate-100 font-black">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit font-black">
          <button onClick={() => { setType('Cash Out'); setVoucherno(''); }} className={`flex items-center px-6 py-2 rounded-xl transition-all font-black ${type === 'Cash Out' ? 'bg-purple-900 text-white shadow-lg' : 'text-slate-400'}`}><ArrowDownLeft size={16} className="mr-2"/> CASH OUT</button>
          <button onClick={() => { setType('Cash In'); setVoucherno(''); }} className={`flex items-center px-6 py-2 rounded-xl transition-all font-black ${type === 'Cash In' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}><ArrowUpRight size={16} className="mr-2"/> CASH IN</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border-b-4 border-slate-950 font-black">
          <div className="space-y-1 font-black">
            <label className="text-[10px] text-purple-900 tracking-widest font-black">SUPPLIER</label>
            <div className="relative font-black">
              <input list="suppliers" className="w-full bg-white border border-slate-200 p-3 pr-10 rounded-xl outline-none focus:border-purple-900 text-sm font-black uppercase" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="SEARCH..." />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 font-black" size={16} />
              <datalist id="suppliers">{config.suppliers?.map((s:any, i:number) => <option key={i} value={s} />)}</datalist>
            </div>
          </div>
          <div className="space-y-1 font-black">
            <label className="text-[10px] text-purple-900 tracking-widest font-black">DATE</label>
            <input type="date" className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none text-sm font-black" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1 font-black">
            <label className="text-[10px] text-purple-900 tracking-widest font-black">VOUCHER ID</label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 h-[46px] font-black">
              <span className="text-purple-900 text-sm flex-grow font-black">{voucherno || "ID AUTO"}</span>
              <RefreshCcw size={16} className="text-slate-300 cursor-pointer font-black" onClick={() => generateVrID(category, itemList)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black">
          <div className="space-y-4 font-black">
             <div className="relative h-44 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden font-black">
               {image ? <><img src={image} className="w-full h-full object-cover font-black"/><button onClick={() => setImage('')} className="absolute top-2 right-2 bg-rose-500 text-white p-2 rounded-full font-black"><Trash2 size={14}/></button></> : <label className="cursor-pointer flex flex-col items-center font-black"><Camera size={32} className="text-slate-300 mb-2 font-black"/><span className="text-[10px] text-slate-400 font-black">VR PHOTO</span><input type="file" accept="image/*" className="hidden font-black" onChange={e => { const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setImage(r.result as string); r.readAsDataURL(f); } }} /></label>}
             </div>
             
             {/* 🔴 ၅ ဆင့်စလုံးအတွက် Selectors များ 🔴 */}
             <div className="space-y-1 font-black">
               <label className="text-[10px] text-slate-400 uppercase font-black">CATEGORY</label>
               <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-black" value={category} onChange={e => { setCategory(e.target.value); setSub1(''); setSub2(''); setSub3(''); setSub4(''); setSub5(''); generateVrID(e.target.value, itemList); }}>
                 <option value="" className="font-black">SELECT CATEGORY</option>{categoryOptions.map(c => <option key={c} value={c} className="font-black">{c}</option>)}
               </select>
             </div>
             {sub1Options.length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[10px] text-slate-400 uppercase font-black">SUB 1</label>
                 <select className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs uppercase font-black" value={sub1} onChange={e => { setSub1(e.target.value); setSub2(''); setSub3(''); setSub4(''); setSub5(''); }}>
                   <option value="" className="font-black">SELECT</option>{sub1Options.map(o => <option key={o} value={o} className="font-black">{o}</option>)}
                 </select>
               </div>
             )}
             {sub2Options.length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[10px] text-slate-400 uppercase font-black">SUB 2</label>
                 <select className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs uppercase font-black" value={sub2} onChange={e => { setSub2(e.target.value); setSub3(''); setSub4(''); setSub5(''); }}>
                   <option value="" className="font-black">SELECT</option>{sub2Options.map(o => <option key={o} value={o} className="font-black">{o}</option>)}
                 </select>
               </div>
             )}
             {sub3Options.length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[10px] text-slate-400 uppercase font-black">SUB 3</label>
                 <select className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs uppercase font-black" value={sub3} onChange={e => { setSub3(e.target.value); setSub4(''); setSub5(''); }}>
                   <option value="" className="font-black">SELECT</option>{sub3Options.map(o => <option key={o} value={o} className="font-black">{o}</option>)}
                 </select>
               </div>
             )}
             {sub4Options.length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[10px] text-slate-400 uppercase font-black">SUB 4</label>
                 <select className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs uppercase font-black" value={sub4} onChange={e => { setSub4(e.target.value); setSub5(''); }}>
                   <option value="" className="font-black">SELECT</option>{sub4Options.map(o => <option key={o} value={o} className="font-black">{o}</option>)}
                 </select>
               </div>
             )}
             {sub5Options.length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[10px] text-slate-400 uppercase font-black">SUB 5</label>
                 <select className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs uppercase font-black" value={sub5} onChange={e => setSub5(e.target.value)}>
                   <option value="" className="font-black">SELECT</option>{sub5Options.map(o => <option key={o} value={o} className="font-black">{o}</option>)}
                 </select>
               </div>
             )}
          </div>

          <div className="space-y-4 font-black">
            <div className="space-y-1 font-black">
              <label className="text-[10px] text-slate-400 uppercase font-black">ITEM DESCRIPTION</label>
              <input list="items" className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none uppercase font-black" placeholder="DETAILS" value={currentItem.item_description} onChange={e => setCurrentItem({...currentItem, item_description: e.target.value})} />
              <datalist id="items">{config.recentItems?.map((i:any, idx:number) => <option key={idx} value={i} className="font-black" />)}</datalist>
            </div>
            
            <div className="grid grid-cols-2 gap-4 font-black">
              <div className="space-y-1 font-black">
                <label className="text-[10px] text-slate-400 uppercase flex items-center font-black"><Hash size={12} className="mr-1 font-black" /> QTY</label>
                <input type="number" step="any" className="w-full p-4 bg-white border-2 border-slate-950 rounded-2xl text-xl text-center text-slate-950 outline-none font-black" value={currentItem.count} onChange={e => setCurrentItem({...currentItem, count: e.target.value})} />
              </div>
              <div className="space-y-1 font-black">
                <label className="text-[10px] text-slate-400 uppercase flex items-center font-black"><Banknote size={12} className="mr-1 font-black" /> RATE</label>
                <input type="number" className="w-full p-4 bg-white border-2 border-slate-950 rounded-2xl text-xl text-center text-slate-950 outline-none font-black" value={currentItem.cost_piece} onChange={e => setCurrentItem({...currentItem, cost_piece: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-1 font-black">
              <label className="text-[10px] text-slate-400 uppercase flex items-center font-black"><MessageSquare size={12} className="mr-2 font-black" /> NOTES</label>
              <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] outline-none uppercase h-16 resize-none font-black" value={currentItem.note} onChange={e => setCurrentItem({...currentItem, note: e.target.value})} />
            </div>
            
            <button onClick={addItem} className="w-full bg-slate-950 text-white py-5 rounded-[1.5rem] text-sm shadow-2xl hover:bg-purple-900 transition-all flex items-center justify-center uppercase font-black">
              <Plus className="mr-2 font-black" size={20} strokeWidth={4}/> ADD TO BATCH
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: BATCH SIDEBAR */}
      <div className="lg:col-span-4 flex flex-col bg-slate-100 border-l border-slate-200 font-black">
        <div className="bg-slate-950 p-5 text-white flex justify-between items-center font-black">
          <span className="text-[10px] tracking-[0.3em] font-black">BATCH ({itemList.length})</span>
        </div>
        <div className="flex-grow p-5 space-y-4 overflow-y-auto max-h-[500px] font-black">
          {itemList.map(i => (
            <div key={i.id} className={`bg-white p-4 rounded-2xl shadow-sm border-l-[6px] ${i.type === 'Cash In' ? 'border-emerald-500' : 'border-purple-600'} font-black`}>
              <div className="flex justify-between items-start font-black">
                <div className="space-y-1 font-black">
                  <p className="text-[10px] text-purple-600 font-black">{i.voucherno}</p>
                  <p className="text-xs leading-tight font-black">{i.item_description}</p>
                </div>
                <button onClick={() => setItemList(itemList.filter(x => x.id !== i.id))} className="text-rose-500 p-1 font-black"><Trash2 size={14} className="font-black"/></button>
              </div>
              {i.note && <p className="text-[9px] text-slate-400 mt-2 font-black">NOTE: {i.note}</p>}
              <div className="flex justify-between items-end mt-4 font-black">
                <p className="text-[9px] text-slate-400 font-black">{i.count} X {i.cost_piece.toLocaleString()} MMK</p>
                <p className="text-sm font-black">{(i.cost_total).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-950 p-8 space-y-6 font-black">
          <div className="flex justify-between items-end border-b border-slate-800 pb-4 font-black">
            <span className="text-purple-400 text-[10px] tracking-widest font-black">TOTAL</span>
            <span className="text-white text-4xl font-black">{itemList.reduce((s,x)=>s+x.cost_total,0).toLocaleString()}</span>
          </div>
          <button onClick={handleFinalSubmit} disabled={submitStatus === 'processing'} className={`w-full py-5 rounded-2xl text-xs transition-all flex items-center justify-center font-black ${submitStatus === 'idle' ? 'bg-white text-slate-950 hover:bg-purple-900 hover:text-white shadow-xl' : submitStatus === 'processing' ? 'bg-yellow-500 text-slate-900' : submitStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            {submitStatus === 'idle' && <><Save className="mr-2 font-black" size={18} strokeWidth={3}/> POST TO CLOUD</>}
            {submitStatus === 'processing' && <><RefreshCcw className="mr-2 animate-spin font-black" size={18} strokeWidth={3}/> PROCESSING...</>}
            {submitStatus === 'success' && <><CheckCircle className="mr-2 font-black" size={18} strokeWidth={3}/> SUCCESSFUL</>}
            {submitStatus === 'error' && <><AlertTriangle className="mr-2 font-black" size={18} strokeWidth={3}/> ERROR</>}
          </button>
        </div>
      </div>
    </div>
  );
}
