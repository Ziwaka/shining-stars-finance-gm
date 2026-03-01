"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { sendToSheet } from '@/lib/api';
import { Plus, Trash2, Save, RefreshCcw, Camera, ArrowUpRight, ArrowDownLeft, CheckCircle, AlertTriangle, MessageSquare, Hash, Banknote, Search, User, Wallet, BellRing } from 'lucide-react';

export default function VoucherForm({ onRefresh }: { onRefresh: () => void }) {
  const [type, setType] = useState<'Cash Out' | 'Cash In'>('Cash Out');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherno, setVoucherno] = useState('');
  const [image, setImage] = useState<string>('');
  const [itemList, setItemList] = useState<any[]>([]);
  
  const [enteredBy, setEnteredBy] = useState('GM');
  const [account, setAccount] = useState('GM ACCOUNT');

  // ✅ /api/gas မှ fetch — GAS URL client-side မထွက်တော့
  const [config, setConfig] = useState<any>({ categoryList: [], prefixes: {}, lastSerials: {}, suppliers: [], recentItems: [], users: [], accounts: [] });
  
  const [category, setCategory] = useState('');
  const [sub1, setSub1] = useState('');
  const [sub2, setSub2] = useState('');
  const [sub3, setSub3] = useState('');
  const [sub4, setSub4] = useState('');
  const [sub5, setSub5] = useState('');

  const [currentItem, setCurrentItem] = useState({ item_description: '', count: '' as any, cost_piece: '' as any, note: '' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    // ✅ /api/gas route မှတဆင့် — GAS URL browser မမြင်နိုင်
    fetch('/api/gas')
      .then(res => res.json())
      .then(data => {
        setConfig({
          categoryList: data.categoryList || data.tree || [],
          prefixes: data.prefixes || {},
          lastSerials: data.lastSerials || {},
          suppliers: data.suppliers || [],
          recentItems: data.recentItems || [],
          users: data.users || [],
          accounts: data.accounts || []
        });
        if (data.users && data.users.length > 0) setEnteredBy(String(data.users[0]));
        if (data.accounts && data.accounts.length > 0) setAccount(String(data.accounts[0]));
      })
      .catch(err => console.error("Failed to fetch config:", err));
  }, []);

  const categoryOptions = useMemo<any[]>(() => Array.from(new Set(config.categoryList.map((row: any) => String(row.Category || row.category || '')))).filter(Boolean), [config.categoryList]);
  const sub1Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category).map((row: any) => String(row.Sub_1 || row.sub1 || '')))).filter(Boolean), [category, config.categoryList]);
  const sub2Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1).map((row: any) => String(row.Sub_2 || row.sub2 || '')))).filter(Boolean), [sub1, config.categoryList, category]);
  const sub3Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1 && String(row.Sub_2 || row.sub2) === sub2).map((row: any) => String(row.Sub_3 || row.sub3 || '')))).filter(Boolean), [sub2, config.categoryList, category, sub1]);
  const sub4Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1 && String(row.Sub_2 || row.sub2) === sub2 && String(row.Sub_3 || row.sub3) === sub3).map((row: any) => String(row.Sub_4 || row.sub4 || '')))).filter(Boolean), [sub3, config.categoryList, category, sub1, sub2]);
  const sub5Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1 && String(row.Sub_2 || row.sub2) === sub2 && String(row.Sub_3 || row.sub3) === sub3 && String(row.Sub_4 || row.sub4) === sub4).map((row: any) => String(row.Sub_5 || row.sub5 || '')))).filter(Boolean), [sub4, config.categoryList, category, sub1, sub2, sub3]);

  // ✅ Bug Fix: ID ကို generate ပြီးမှ return ပြန်သည် — item ထဲ မဝင်ခင် သတ်မှတ်နိုင်ရန်
  const generateVrID = (cat: string, currentBatch: any[]): string => {
    const prefix = type === 'Cash In' ? 'INC' : (config.prefixes[cat] || "EXP");
    const lastNum = config.lastSerials[prefix] || 0;
    const inBatchCount = currentBatch.filter(i => String(i.voucherno).startsWith(prefix)).length;
    const nextNum = (lastNum + inBatchCount + 1).toString().padStart(3, '0');
    const month = (new Date(date).getMonth() + 1).toString().padStart(2, '0');
    const newId = `${prefix}-${month}-${nextNum}`;
    setVoucherno(newId);
    return newId;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        if (width > height) { if (width > 800) { height *= 800 / width; width = 800; } } else { if (height > 800) { width *= 800 / height; height = 800; } }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        setImage(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addItem = () => {
    const countNum = parseFloat(currentItem.count);
    const costNum = parseInt(currentItem.cost_piece);
    if (!vendor || !currentItem.item_description || isNaN(countNum)) return alert("REQUIRED: VENDOR, ITEM & QTY");
    
    const total = Math.round(countNum * costNum);

    // ✅ Bug Fix: ID ကို addItem မှာ ကြိုတင် generate ပြီး item ထဲ ထည့်သည်
    const generatedId = generateVrID(category, itemList);

    const newItem = {
      date, entered_by: enteredBy, account, vendor, type,
      voucherno: generatedId, // ✅ ပြည့်စုံသော ID ဖြင့် သိမ်းသည်
      category, sub1, sub2, sub3, sub4, sub5,
      item_description: currentItem.item_description, note: currentItem.note,
      count: countNum, cost_piece: costNum, cost_total: total, image_data: image, id: Date.now()
    };
    
    const updatedList = [...itemList, newItem];
    setItemList(updatedList);

    setToastMsg(`+ ${total.toLocaleString()} MMK ADDED TO BATCH`);
    setTimeout(() => setToastMsg(''), 3000);
    setCurrentItem({ item_description: '', count: '', cost_piece: '', note: '' });
    setImage('');
  };

  // ✅ Telegram notification ကို server-side (api/gas) မှ ပေးပို့သောကြောင့် ဒီမှာ မလိုတော့ပါ

  const handleFinalSubmit = async () => {
    if (itemList.length === 0 || submitStatus === 'processing') return;
    setSubmitStatus('processing');
    try {
      for (const item of itemList) {
        await sendToSheet(item); // ✅ sendToSheet ထဲမှာ Telegram noti ပါ server-side မှ ပေးပို့ပြီ
      }
      setSubmitStatus('success');
      setItemList([]);
      setVoucherno('');
      onRefresh();
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } catch (err) {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-0 font-black text-slate-950 uppercase">
      
      {toastMsg && (
        <div className="absolute top-4 right-4 bg-emerald-50 border border-emerald-200 text-slate-950 p-4 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-bounce font-black">
          <BellRing size={20} className="text-emerald-600" />
          {toastMsg}
        </div>
      )}

      {/* INPUT PANEL */}
      <div className="lg:col-span-8 p-6 space-y-6 border-r border-slate-200 font-black">
        
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl w-fit font-black">
          <div className="flex">
            <button onClick={() => { setType('Cash Out'); setVoucherno(''); }} className={`flex items-center px-6 py-2 rounded-xl transition-all font-black ${type === 'Cash Out' ? 'bg-white border border-slate-300 shadow-sm text-slate-950' : 'text-slate-400'}`}><ArrowDownLeft size={16} className="mr-2"/> CASH OUT</button>
            <button onClick={() => { setType('Cash In'); setVoucherno(''); }} className={`flex items-center px-6 py-2 rounded-xl transition-all font-black ${type === 'Cash In' ? 'bg-white border border-slate-300 shadow-sm text-slate-950' : 'text-slate-400'}`}><ArrowUpRight size={16} className="mr-2"/> CASH IN</button>
          </div>
          <div className="h-6 w-[2px] bg-slate-300"></div>
          
          <div className="flex items-center gap-2 px-2">
            <User size={16} className="text-slate-500"/>
            <select className="bg-transparent text-sm outline-none font-black text-slate-950 cursor-pointer uppercase" value={enteredBy} onChange={e => setEnteredBy(e.target.value)}>
              {config.users && config.users.length > 0 ? (
                config.users.map((u: any, i: number) => <option key={`user-${i}`} value={String(u)}>{String(u)}</option>)
              ) : (
                <><option value="GM">GM</option><option value="FOUNDER">FOUNDER</option></>
              )}
            </select>
          </div>
          
          <div className="flex items-center gap-2 px-2 border-l-2 border-slate-300 pl-4">
            <Wallet size={16} className="text-slate-500"/>
            <select className="bg-transparent text-sm outline-none font-black text-slate-950 cursor-pointer uppercase" value={account} onChange={e => setAccount(e.target.value)}>
              {config.accounts && config.accounts.length > 0 ? (
                config.accounts.map((a: any, i: number) => <option key={`acc-${i}`} value={String(a)}>{String(a)}</option>)
              ) : (
                <><option value="GM ACCOUNT">GM ACCOUNT</option><option value="FOUNDER ACCOUNT">FOUNDER ACCOUNT</option></>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 font-black">
          <div className="space-y-1 font-black">
            <label className="text-[10px] text-slate-500 tracking-widest font-black">SUPPLIER</label>
            <div className="relative font-black">
              <input list="suppliers" className="w-full bg-white border border-slate-300 p-3 pr-10 rounded-xl outline-none focus:border-slate-500 text-sm font-black text-slate-950 uppercase" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="SEARCH..." />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-black" size={16} />
              <datalist id="suppliers">{config.suppliers?.map((s: any, i: number) => <option key={`sup-${i}`} value={String(s)} />)}</datalist>
            </div>
          </div>
          <div className="space-y-1 font-black">
            <label className="text-[10px] text-slate-500 tracking-widest font-black">DATE</label>
            <input type="date" className="w-full bg-white border border-slate-300 p-3 rounded-xl outline-none focus:border-slate-500 text-sm font-black text-slate-950" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="space-y-1 font-black">
            <label className="text-[10px] text-slate-500 tracking-widest font-black">VOUCHER ID</label>
            <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 h-[46px] font-black">
              <span className="text-slate-950 text-sm flex-grow font-black">{voucherno || "ID AUTO"}</span>
              <RefreshCcw size={16} className="text-slate-400 cursor-pointer font-black hover:text-slate-950" onClick={() => generateVrID(category, itemList)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black">
          <div className="space-y-4 font-black">
             <div className="relative h-44 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden font-black">
               {image ? (
                 <>
                   <img src={image} className="w-full h-full object-cover font-black"/>
                   <button onClick={() => setImage('')} className="absolute top-2 right-2 bg-rose-100 text-rose-600 border border-rose-200 p-2 rounded-full font-black shadow-sm"><Trash2 size={14}/></button>
                 </>
               ) : (
                 <label className="cursor-pointer flex flex-col items-center font-black">
                   <Camera size={32} className="text-slate-400 mb-2 font-black"/>
                   <span className="text-[10px] text-slate-500 font-black">VR PHOTO</span>
                   <input type="file" accept="image/*" className="hidden font-black" onChange={handleImageUpload} />
                 </label>
               )}
             </div>
             
             <div className="space-y-1 font-black">
               <label className="text-[10px] text-slate-500 uppercase font-black">CATEGORY</label>
               <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={category} onChange={e => { setCategory(e.target.value); setSub1(''); setSub2(''); setSub3(''); setSub4(''); setSub5(''); generateVrID(e.target.value, itemList); }}>
                 <option value="" className="font-black">SELECT CATEGORY</option>{categoryOptions.map((c: any, i: number) => <option key={`cat-${i}`} value={String(c)} className="font-black">{String(c)}</option>)}
               </select>
             </div>
             {sub1Options.length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[10px] text-slate-500 uppercase font-black">SUB 1</label>
                 <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={sub1} onChange={e => { setSub1(e.target.value); setSub2(''); setSub3(''); setSub4(''); setSub5(''); }}>
                   <option value="" className="font-black">SELECT</option>{sub1Options.map((o: any, i: number) => <option key={`s1-${i}`} value={String(o)} className="font-black">{String(o)}</option>)}
                 </select>
               </div>
             )}
             {sub2Options.length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[10px] text-slate-500 uppercase font-black">SUB 2</label>
                 <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={sub2} onChange={e => { setSub2(e.target.value); setSub3(''); setSub4(''); setSub5(''); }}>
                   <option value="" className="font-black">SELECT</option>{sub2Options.map((o: any, i: number) => <option key={`s2-${i}`} value={String(o)} className="font-black">{String(o)}</option>)}
                 </select>
               </div>
             )}
             {sub3Options.length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[10px] text-slate-500 uppercase font-black">SUB 3</label>
                 <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={sub3} onChange={e => { setSub3(e.target.value); setSub4(''); setSub5(''); }}>
                   <option value="" className="font-black">SELECT</option>{sub3Options.map((o: any, i: number) => <option key={`s3-${i}`} value={String(o)} className="font-black">{String(o)}</option>)}
                 </select>
               </div>
             )}
             {sub4Options.length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[10px] text-slate-500 uppercase font-black">SUB 4</label>
                 <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={sub4} onChange={e => { setSub4(e.target.value); setSub5(''); }}>
                   <option value="" className="font-black">SELECT</option>{sub4Options.map((o: any, i: number) => <option key={`s4-${i}`} value={String(o)} className="font-black">{String(o)}</option>)}
                 </select>
               </div>
             )}
             {sub5Options.length > 0 && (
               <div className="space-y-1 font-black">
                 <label className="text-[10px] text-slate-500 uppercase font-black">SUB 5</label>
                 <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={sub5} onChange={e => setSub5(e.target.value)}>
                   <option value="" className="font-black">SELECT</option>{sub5Options.map((o: any, i: number) => <option key={`s5-${i}`} value={String(o)} className="font-black">{String(o)}</option>)}
                 </select>
               </div>
             )}
          </div>

          <div className="space-y-4 font-black">
            <div className="space-y-1 font-black">
              <label className="text-[10px] text-slate-500 uppercase font-black">ITEM DESCRIPTION</label>
              <input list="items" className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-sm outline-none focus:border-slate-500 uppercase font-black text-slate-950" placeholder="DETAILS" value={currentItem.item_description} onChange={e => setCurrentItem({...currentItem, item_description: e.target.value})} />
              <datalist id="items">{config.recentItems?.map((item: any, idx: number) => <option key={`item-${idx}`} value={String(item)} className="font-black" />)}</datalist>
            </div>
            
            <div className="grid grid-cols-2 gap-4 font-black">
              <div className="space-y-1 font-black">
                <label className="text-[10px] text-slate-500 uppercase flex items-center font-black"><Hash size={12} className="mr-1 font-black" /> QTY</label>
                <input type="number" step="any" className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xl text-center text-slate-950 outline-none focus:border-slate-500 font-black" value={currentItem.count} onChange={e => setCurrentItem({...currentItem, count: e.target.value})} />
              </div>
              <div className="space-y-1 font-black">
                <label className="text-[10px] text-slate-500 uppercase flex items-center font-black"><Banknote size={12} className="mr-1 font-black" /> RATE</label>
                <input type="number" className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xl text-center text-slate-950 outline-none focus:border-slate-500 font-black" value={currentItem.cost_piece} onChange={e => setCurrentItem({...currentItem, cost_piece: e.target.value})} />
              </div>
            </div>
            
            <div className="space-y-1 font-black">
              <label className="text-[10px] text-slate-500 uppercase flex items-center font-black"><MessageSquare size={12} className="mr-2 font-black" /> NOTES</label>
              <textarea className="w-full p-4 bg-white border border-slate-300 rounded-xl text-[10px] outline-none focus:border-slate-500 uppercase h-16 resize-none font-black text-slate-950" value={currentItem.note} onChange={e => setCurrentItem({...currentItem, note: e.target.value})} />
            </div>
            
            <button onClick={addItem} className="w-full bg-slate-200 text-slate-950 py-5 rounded-[1.5rem] text-sm hover:bg-slate-300 transition-all flex items-center justify-center uppercase font-black border border-slate-300 shadow-sm">
              <Plus className="mr-2 font-black" size={20} strokeWidth={4}/> ADD TO BATCH
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 flex flex-col bg-slate-50 border-l border-slate-200 font-black">
        <div className="bg-slate-200 p-5 text-slate-950 flex justify-between items-center font-black border-b border-slate-300">
          <span className="text-[10px] tracking-[0.3em] font-black">BATCH ({itemList.length})</span>
        </div>
        <div className="flex-grow p-5 space-y-4 overflow-y-auto max-h-[500px] font-black">
          {itemList.map(i => (
            <div key={i.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] ${i.type === 'Cash In' ? 'border-l-emerald-400' : 'border-l-rose-400'} font-black`}>
              <div className="flex justify-between items-start font-black">
                <div className="space-y-1 font-black">
                  <p className="text-[10px] text-slate-500 font-black">{i.voucherno}</p>
                  <p className="text-xs leading-tight font-black text-slate-950">{i.item_description}</p>
                  <p className="text-[8px] text-slate-600 uppercase font-black">[{i.entered_by} • {i.account}]</p>
                </div>
                <button onClick={() => setItemList(itemList.filter(x => x.id !== i.id))} className="text-rose-500 p-1 font-black"><Trash2 size={14} className="font-black"/></button>
              </div>
              {i.note && <p className="text-[9px] text-slate-500 mt-2 font-black">NOTE: {i.note}</p>}
              <div className="flex justify-between items-end mt-4 font-black">
                <p className="text-[9px] text-slate-500 font-black">{i.count} X {i.cost_piece.toLocaleString()} MMK</p>
                <p className="text-sm font-black text-slate-950">{(i.cost_total).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-200 p-8 space-y-6 font-black border-t border-slate-300">
          <div className="flex justify-between items-end border-b border-slate-400 pb-4 font-black">
            <span className="text-slate-600 text-[10px] tracking-widest font-black">TOTAL</span>
            <span className="text-slate-950 text-4xl font-black">{itemList.reduce((s,x)=>s+x.cost_total,0).toLocaleString()}</span>
          </div>
          <button onClick={handleFinalSubmit} disabled={submitStatus === 'processing'} className={`w-full py-5 rounded-2xl text-xs transition-all flex items-center justify-center font-black ${submitStatus === 'idle' ? 'bg-slate-950 text-white shadow-md hover:bg-slate-800' : submitStatus === 'processing' ? 'bg-slate-300 text-slate-950' : submitStatus === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'}`}>
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
