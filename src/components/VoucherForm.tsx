"use client"
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Save, RefreshCcw, Camera, ArrowUpRight, ArrowDownLeft, CheckCircle, AlertTriangle, MessageSquare, Hash, Banknote, Search, User, Wallet, BellRing, Phone, MapPin, Briefcase, X } from 'lucide-react';

export default function VoucherForm({ onRefresh }: { onRefresh: () => void }) {
  const [type, setType] = useState<'Cash Out' | 'Cash In'>('Cash Out');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherno, setVoucherno] = useState('');
  const [image, setImage] = useState<string>('');
  const [itemList, setItemList] = useState<any[]>([]);
  const [enteredBy, setEnteredBy] = useState('');
  const [account, setAccount] = useState('');
  const [config, setConfig] = useState<any>({ categoryList: [], prefixes: {}, lastSerials: {}, suppliers: [], recentItems: [], users: [], accounts: [] });
  const [category, setCategory] = useState('');
  const [sub1, setSub1] = useState('');
  const [sub2, setSub2] = useState('');
  const [sub3, setSub3] = useState('');
  const [sub4, setSub4] = useState('');
  const [sub5, setSub5] = useState('');
  const [currentItem, setCurrentItem] = useState({ item_description: '', brand: '', count: '' as any, cost_piece: '' as any, note: '', km: '' as any });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [toastMsg, setToastMsg] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierDropdown, setSupplierDropdown] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone1: '', phone2: '', phone3: '', address: '', service: '' });
  const supplierRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [editForm, setEditForm] = useState({ phone1: '', phone2: '', phone3: '', address: '', service: '' });
  const [editServices, setEditServices] = useState<string[]>([]);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemDropdown, setItemDropdown] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
        if (data.users?.length > 0) setEnteredBy(String(data.users[0]));
        if (data.accounts?.length > 0) setAccount(String(data.accounts[0]));
      })
      .catch(err => console.error('Failed to fetch config:', err));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setSupplierDropdown(false);
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) setItemDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return config.suppliers;
    return config.suppliers.filter((s: any) => s.name?.toLowerCase().includes(supplierSearch.toLowerCase()));
  }, [supplierSearch, config.suppliers]);

  const filteredItems = useMemo(() => {
    if (!itemSearch) return config.recentItems;
    return config.recentItems.filter((item: string) => item.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [itemSearch, config.recentItems]);

  const categoryOptions = useMemo<any[]>(() => Array.from(new Set(config.categoryList.map((row: any) => String(row.Category || row.category || '')))).filter(Boolean), [config.categoryList]);
  const sub1Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category).map((row: any) => String(row.Sub_1 || row.sub1 || '')))).filter(Boolean), [category, config.categoryList]);
  const sub2Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1).map((row: any) => String(row.Sub_2 || row.sub2 || '')))).filter(Boolean), [sub1, config.categoryList, category]);
  const sub3Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1 && String(row.Sub_2 || row.sub2) === sub2).map((row: any) => String(row.Sub_3 || row.sub3 || '')))).filter(Boolean), [sub2, config.categoryList, category, sub1]);
  const sub4Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1 && String(row.Sub_2 || row.sub2) === sub2 && String(row.Sub_3 || row.sub3) === sub3).map((row: any) => String(row.Sub_4 || row.sub4 || '')))).filter(Boolean), [sub3, config.categoryList, category, sub1, sub2]);
  const sub5Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1 && String(row.Sub_2 || row.sub2) === sub2 && String(row.Sub_3 || row.sub3) === sub3 && String(row.Sub_4 || row.sub4) === sub4).map((row: any) => String(row.Sub_5 || row.sub5 || '')))).filter(Boolean), [sub4, config.categoryList, category, sub1, sub2, sub3]);

  const generateVrID = (cat: string, currentBatch: any[]): string => {
    const prefix = type === 'Cash In' ? 'INC' : (config.prefixes[cat] || 'EXP');
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

  const openEditModal = (supplier: any) => {
    const services = supplier.service ? supplier.service.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    setEditingSupplier(supplier);
    setEditForm({ phone1: supplier.phone1 || supplier.phone || '', phone2: supplier.phone2 || '', phone3: supplier.phone3 || '', address: supplier.address || '', service: supplier.service || '' });
    setEditServices(services);
    setNewServiceInput('');
    setShowEditModal(true);
  };

  const saveEditedSupplier = async () => {
    if (!editingSupplier) return;
    setEditSaving(true);
    const updated = { ...editingSupplier, phone1: editForm.phone1, phone2: editForm.phone2, phone3: editForm.phone3, address: editForm.address, service: editServices.join(', ') };
    try {
      await fetch('/api/gas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateSupplier', supplier: updated }) });
      setConfig((prev: any) => ({ ...prev, suppliers: prev.suppliers.map((s: any) => s.name === editingSupplier.name ? updated : s) }));
      if (selectedSupplier?.name === editingSupplier.name) setSelectedSupplier(updated);
      setShowEditModal(false);
    } catch {
      alert('SAVE FAILED — ထပ်ကြိုးစားပါ');
    } finally {
      setEditSaving(false);
    }
  };

  const resetForm = () => {
    setVendor(''); setSupplierSearch(''); setSelectedSupplier(null);
    setCategory(''); setSub1(''); setSub2(''); setSub3(''); setSub4(''); setSub5('');
    setCurrentItem({ item_description: '', brand: '', count: '', cost_piece: '', note: '', km: '' });
    setItemSearch(''); setImage(''); setVoucherno('');
    setSubmitStatus('idle');
  };

  const addItem = () => {
    const countNum = parseFloat(currentItem.count);
    const costNum = parseInt(currentItem.cost_piece);
    if (!vendor || !currentItem.item_description || isNaN(countNum)) return alert('REQUIRED: VENDOR, ITEM & QTY');
    const total = Math.round(countNum * costNum);

    // ✅ Vr. No. — batch ထဲ ပထမ item ဆိုရင် generate၊ မဟုတ်ရင် အရင် voucherno ကိုပဲ သုံး
    const vrNo = itemList.length === 0 ? generateVrID(category, itemList) : voucherno;

    const newItem = {
      date, entered_by: enteredBy, account, vendor, type,
      voucherno: vrNo,
      vendor_phone: selectedSupplier?.phone1 || selectedSupplier?.phone || '',
      vendor_address: selectedSupplier?.address || '',
      vendor_service: selectedSupplier?.service || '',
      category, sub1, sub2, sub3, sub4, sub5,
      item_description: currentItem.brand
        ? `${currentItem.item_description} (${currentItem.brand})`
        : currentItem.item_description,
      note: currentItem.note,
      km: parseFloat(currentItem.km) || 0,
      remark: currentItem.km ? `KM:${currentItem.km}` : '',
      count: countNum, cost_piece: costNum, cost_total: total, image_data: image, id: Date.now()
    };
    setItemList(prev => [...prev, newItem]);
    setToastMsg(`+ ${total.toLocaleString()} MMK ADDED TO BATCH`);
    setTimeout(() => setToastMsg(''), 3000);
    setCurrentItem({ item_description: '', brand: '', count: '', cost_piece: '', note: '', km: '' });
    setItemSearch('');
    setImage('');
  };

  const loadConfig = (force = false) => fetch('/api/gas?t=' + Date.now() + (force ? '&force=1' : ''))
    .then(res => res.json())
    .then(data => {
      setConfig({
        categoryList: data.categoryList || data.tree || [],
        prefixes: data.prefixes || {},
        lastSerials: data.lastSerials || {},
        suppliers: data.suppliers || [],
        recentItems: data.recentItems || [],
        users: data.users || [],
        accounts: data.accounts || [],
      });
    })
    .catch(err => console.error('Failed to fetch config:', err));

  const handleFinalSubmit = async () => {
    if (itemList.length === 0 || submitStatus === 'processing') return;
    setSubmitStatus('processing');
    try {
      await fetch('/api/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sendVoucher', items: itemList }),
      });
      setSubmitStatus('success');
      setItemList([]);
      setVoucherno('');
      onRefresh();
      // ✅ force=true — cache bypass ဖြင့် fresh lastSerials ရမည်
      await loadConfig(true);
    } catch {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-0 font-black text-slate-950">

      {toastMsg && (
        <div className="absolute top-4 right-4 bg-emerald-50 border border-emerald-200 text-slate-950 p-4 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-bounce font-black">
          <BellRing size={20} className="text-emerald-600"/>
          {toastMsg}
        </div>
      )}

      {/* ── LEFT INPUT PANEL ── */}
      <div className="lg:col-span-8 p-6 space-y-6 border-r border-slate-200 font-black">

        {/* Type / User / Account */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl w-fit font-black">
          <div className="flex">
            <button onClick={() => { setType('Cash Out'); setVoucherno(''); }} className={`flex items-center px-6 py-2 rounded-xl transition-all font-black ${type === 'Cash Out' ? 'bg-white border border-slate-300 shadow-sm text-slate-950' : 'text-slate-400'}`}><ArrowDownLeft size={16} className="mr-2"/> CASH OUT</button>
            <button onClick={() => { setType('Cash In'); setVoucherno(''); }} className={`flex items-center px-6 py-2 rounded-xl transition-all font-black ${type === 'Cash In' ? 'bg-white border border-slate-300 shadow-sm text-slate-950' : 'text-slate-400'}`}><ArrowUpRight size={16} className="mr-2"/> CASH IN</button>
          </div>
          <div className="h-6 w-[2px] bg-slate-300"/>
          <div className="flex items-center gap-2 px-2">
            <User size={16} className="text-slate-500"/>
            <select className="bg-transparent text-sm outline-none font-black text-slate-950 cursor-pointer uppercase" value={enteredBy} onChange={e => { setEnteredBy(e.target.value); if (submitStatus === 'success') setSubmitStatus('idle'); }}>
              {config.users?.map((u: any, i: number) => <option key={i} value={String(u)}>{String(u)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-2 border-l-2 border-slate-300 pl-4">
            <Wallet size={16} className="text-slate-500"/>
            <select className="bg-transparent text-sm outline-none font-black text-slate-950 cursor-pointer uppercase" value={account} onChange={e => { setAccount(e.target.value); if (submitStatus === 'success') setSubmitStatus('idle'); }}>
              {config.accounts?.map((a: any, i: number) => <option key={i} value={String(a)}>{String(a)}</option>)}
            </select>
          </div>
        </div>

        {/* Supplier / Date / Voucher ID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 font-black">

          {/* Supplier */}
          <div className="space-y-2 font-black" ref={supplierRef}>
            <label className="text-[10px] text-slate-500 tracking-widest font-black">SUPPLIER</label>
            <div className="relative">
              <input
                className="w-full bg-white border border-slate-300 p-3 pr-10 rounded-xl outline-none focus:border-slate-500 text-sm font-black text-slate-950 "
                value={supplierSearch}
                onChange={e => { setSupplierSearch(e.target.value); setVendor(e.target.value); setSelectedSupplier(null); setSupplierDropdown(true); }}
                onFocus={() => setSupplierDropdown(true)}
                placeholder="SEARCH..."
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              {supplierDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredSuppliers.length > 0 ? filteredSuppliers.map((s: any, i: number) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                      onMouseDown={() => { setVendor(s.name); setSupplierSearch(s.name); setSelectedSupplier(s); setSupplierDropdown(false); }}>
                      <p className="text-xs font-black text-slate-950 uppercase">{s.name}</p>
                      {s.service && <p className="text-[10px] text-slate-400 mt-0.5">{s.service}</p>}
                    </div>
                  )) : (
                    <div className="px-4 py-3 text-center space-y-2">
                      <p className="text-[10px] text-slate-400">မတွေ့ပါ</p>
                      <button onMouseDown={() => { setNewSupplier({ ...newSupplier, name: supplierSearch }); setShowNewSupplierForm(true); setSupplierDropdown(false); }}
                        className="text-[10px] bg-slate-950 text-white px-3 py-1.5 rounded-lg font-black">+ ADD NEW SUPPLIER</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedSupplier && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-400 tracking-widest">INFO (AUTO-FILLED)</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(selectedSupplier)} className="text-[10px] text-slate-500 hover:text-slate-950 flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 rounded-lg font-black">✏️ EDIT</button>
                    <button onClick={() => { setSelectedSupplier(null); setVendor(''); setSupplierSearch(''); }} className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1"><X size={10}/> CLEAR</button>
                  </div>
                </div>
                {[
                  { icon: <Phone size={11}/>, value: [selectedSupplier.phone1||selectedSupplier.phone, selectedSupplier.phone2, selectedSupplier.phone3].filter(Boolean).join(' / '), placeholder: 'PHONE' },
                  { icon: <MapPin size={11}/>, value: selectedSupplier.address, placeholder: 'ADDRESS' },
                  { icon: <Briefcase size={11}/>, value: selectedSupplier.service, placeholder: 'SERVICE' },
                ].map(({ icon, value, placeholder }, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-slate-400 flex-shrink-0">{icon}</span>
                    <span className={`text-[11px] font-black flex-1 uppercase truncate ${value ? 'text-slate-950' : 'text-slate-300'}`}>{value || placeholder}</span>
                  </div>
                ))}
              </div>
            )}

            {showNewSupplierForm && (
              <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-2 shadow-sm">
                <p className="text-[10px] font-black text-slate-950 tracking-widest">NEW SUPPLIER</p>
                {[{ key: 'name', label: 'NAME', icon: <User size={10}/> }, { key: 'phone1', label: 'PHONE 1', icon: <Phone size={10}/> }, { key: 'phone2', label: 'PHONE 2', icon: <Phone size={10}/> }, { key: 'phone3', label: 'PHONE 3', icon: <Phone size={10}/> }, { key: 'address', label: 'ADDRESS', icon: <MapPin size={10}/> }, { key: 'service', label: 'SERVICE / PRODUCT', icon: <Briefcase size={10}/> }].map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-slate-400">{icon}</span>
                    <input className="flex-1 bg-slate-50 border border-slate-200 p-2 rounded-lg text-[11px] outline-none font-black text-slate-950" placeholder={label} value={(newSupplier as any)[key]} onChange={e => setNewSupplier({ ...newSupplier, [key]: e.target.value })}/>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => {
                    if (!newSupplier.name) return;
                    // ✅ တူတဲ့ Supplier ရှိရင် service ပေါင်း၊ မရှိရင် အသစ်ထည့်
                    const existing = config.suppliers.find((s: any) => s.name.toLowerCase() === newSupplier.name.toLowerCase());
                    if (existing) {
                      const mergedServices = [existing.service, newSupplier.service].filter(Boolean).join(', ');
                      const merged = { ...existing, ...newSupplier, service: mergedServices };
                      setVendor(merged.name); setSupplierSearch(merged.name); setSelectedSupplier(merged);
                      setConfig((prev: any) => ({ ...prev, suppliers: prev.suppliers.map((s: any) => s.name.toLowerCase() === merged.name.toLowerCase() ? merged : s) }));
                    } else {
                      setVendor(newSupplier.name); setSupplierSearch(newSupplier.name); setSelectedSupplier(newSupplier);
                      setConfig((prev: any) => ({ ...prev, suppliers: [...prev.suppliers, { ...newSupplier }] }));
                    }
                    setShowNewSupplierForm(false); setNewSupplier({ name: '', phone1: '', phone2: '', phone3: '', address: '', service: '' });
                  }} className="flex-1 bg-slate-950 text-white text-[10px] py-2 rounded-lg font-black">SAVE</button>
                  <button onClick={() => setShowNewSupplierForm(false)} className="flex-1 bg-slate-100 text-slate-600 text-[10px] py-2 rounded-lg font-black">CANCEL</button>
                </div>
              </div>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1 font-black">
            <label className="text-[10px] text-slate-500 tracking-widest font-black">DATE</label>
            <input type="date" className="w-full bg-white border border-slate-300 p-3 rounded-xl outline-none focus:border-slate-500 text-sm font-black text-slate-950" value={date} onChange={e => setDate(e.target.value)}/>
          </div>

          {/* Voucher ID */}
          <div className="space-y-1 font-black">
            <label className="text-[10px] text-slate-500 tracking-widest font-black">VOUCHER ID</label>
            <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 h-[46px] font-black">
              <span className="text-slate-950 text-sm flex-grow font-black">{voucherno || 'ID AUTO'}</span>
              <RefreshCcw size={16} className="text-slate-400 cursor-pointer hover:text-slate-950" onClick={() => generateVrID(category, itemList)}/>
            </div>
          </div>
        </div>

        {/* Category + Item inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black">

          {/* Left — Category dropdowns */}
          <div className="space-y-4 font-black">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase font-black">CATEGORY</label>
              <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={category} onChange={e => { setCategory(e.target.value); setSub1(''); setSub2(''); setSub3(''); setSub4(''); setSub5(''); generateVrID(e.target.value, itemList); }}>
                <option value="">SELECT CATEGORY</option>
                {categoryOptions.map((c: any, i: number) => <option key={i} value={String(c)}>{String(c)}</option>)}
              </select>
            </div>
            {sub1Options.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-black">SUB 1</label>
                <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={sub1} onChange={e => { setSub1(e.target.value); setSub2(''); setSub3(''); setSub4(''); setSub5(''); }}>
                  <option value="">SELECT</option>{sub1Options.map((o: any, i: number) => <option key={i} value={String(o)}>{String(o)}</option>)}
                </select>
              </div>
            )}
            {sub2Options.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-black">SUB 2</label>
                <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={sub2} onChange={e => { setSub2(e.target.value); setSub3(''); setSub4(''); setSub5(''); }}>
                  <option value="">SELECT</option>{sub2Options.map((o: any, i: number) => <option key={i} value={String(o)}>{String(o)}</option>)}
                </select>
              </div>
            )}
            {sub3Options.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-black">SUB 3</label>
                <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={sub3} onChange={e => { setSub3(e.target.value); setSub4(''); setSub5(''); }}>
                  <option value="">SELECT</option>{sub3Options.map((o: any, i: number) => <option key={i} value={String(o)}>{String(o)}</option>)}
                </select>
              </div>
            )}
            {sub4Options.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-black">SUB 4</label>
                <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={sub4} onChange={e => { setSub4(e.target.value); setSub5(''); }}>
                  <option value="">SELECT</option>{sub4Options.map((o: any, i: number) => <option key={i} value={String(o)}>{String(o)}</option>)}
                </select>
              </div>
            )}
            {sub5Options.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-black">SUB 5</label>
                <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={sub5} onChange={e => setSub5(e.target.value)}>
                  <option value="">SELECT</option>{sub5Options.map((o: any, i: number) => <option key={i} value={String(o)}>{String(o)}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Right — Item inputs */}
          <div className="space-y-4 font-black">

            {/* Item description */}
            <div className="space-y-1" ref={itemRef}>
              <label className="text-[10px] text-slate-500 uppercase font-black">ITEM DESCRIPTION</label>
              <div className="relative">
                <input
                  className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-sm outline-none focus:border-slate-500 font-black text-slate-950"
                  placeholder="DETAILS"
                  value={itemSearch}
                  onChange={e => { setItemSearch(e.target.value); setCurrentItem({ ...currentItem, item_description: e.target.value }); setItemDropdown(true); }}
                  onFocus={() => { if (itemSearch) setItemDropdown(true); }}
                />
                {itemDropdown && filteredItems.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {filteredItems.map((item: string, idx: number) => (
                      <div key={idx} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-xs font-black text-slate-950 uppercase border-b border-slate-100 last:border-0"
                        onMouseDown={() => { setItemSearch(item); setCurrentItem({ ...currentItem, item_description: item }); setItemDropdown(false); }}>{item}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Brand */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase flex items-center gap-1 font-black">BRAND <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
              <input className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 font-black text-slate-950 placeholder:text-slate-300" placeholder="e.g. TOYOTA, SAMSUNG..." value={currentItem.brand} onChange={e => setCurrentItem({ ...currentItem, brand: e.target.value })}/>
            </div>

            {/* QTY + Rate */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase flex items-center font-black"><Hash size={12} className="mr-1"/> QTY</label>
                <input type="number" step="any" className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xl text-center text-slate-950 outline-none focus:border-slate-500 font-black" value={currentItem.count} onChange={e => setCurrentItem({ ...currentItem, count: e.target.value })}/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase flex items-center font-black"><Banknote size={12} className="mr-1"/> RATE</label>
                <input type="number" className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xl text-center text-slate-950 outline-none focus:border-slate-500 font-black" value={currentItem.cost_piece} onChange={e => setCurrentItem({ ...currentItem, cost_piece: e.target.value })}/>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase flex items-center font-black"><MessageSquare size={12} className="mr-2"/> NOTES</label>
              <textarea className="w-full p-4 bg-white border border-slate-300 rounded-xl text-[10px] outline-none focus:border-slate-500 h-16 resize-none font-black text-slate-950" value={currentItem.note} onChange={e => setCurrentItem({ ...currentItem, note: e.target.value })}/>
            </div>

            {/* KM (only for vehicle categories) */}
            {[category, sub1, sub2, sub3].some(s => /ferry|bus\s*\d*|ယာဉ်/i.test(s)) && (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase flex items-center font-black">
                <span className="mr-1">🛣</span> KM / ODOMETER <span className="text-slate-300 normal-case font-normal ml-1">(optional)</span>
              </label>
              <input type="number" className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xl text-center text-slate-950 outline-none focus:border-slate-500 font-black" placeholder="—" value={currentItem.km} onChange={e => setCurrentItem({ ...currentItem, km: e.target.value })}/>
            </div>
            )}

            {/* Per-item photo */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase flex items-center gap-1 font-black"><Camera size={12}/> ITEM PHOTO <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
              <div className="relative h-28 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                {image ? (
                  <>
                    <img src={image} className="w-full h-full object-cover"/>
                    <button onClick={() => setImage('')} className="absolute top-2 right-2 bg-rose-100 text-rose-600 border border-rose-200 p-1.5 rounded-full shadow-sm"><Trash2 size={12}/></button>
                    <span className="absolute bottom-2 left-2 bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-200">📷 PHOTO ATTACHED</span>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
                    <Camera size={24}/>
                    <span className="text-[9px] font-black uppercase">TAP TO ADD PHOTO</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
                  </label>
                )}
              </div>
            </div>

            {/* ADD TO BATCH */}
            <button onClick={addItem} className="w-full bg-slate-200 text-slate-950 py-5 rounded-[1.5rem] text-sm hover:bg-slate-300 transition-all flex items-center justify-center uppercase font-black border border-slate-300 shadow-sm">
              <Plus className="mr-2" size={20} strokeWidth={4}/> ADD TO BATCH
            </button>

          </div>
        </div>
      </div>

      {/* ── BATCH PANEL ── */}
      <div className="lg:col-span-4 flex flex-col bg-slate-50 border-l border-slate-200 font-black">
        <div className="bg-slate-200 p-5 text-slate-950 flex justify-between items-center font-black border-b border-slate-300">
          <span className="text-[10px] tracking-[0.3em] font-black">BATCH ({itemList.length})</span>
        </div>
        <div className="flex-grow p-5 space-y-4 overflow-y-auto max-h-[500px] font-black">
          {itemList.map(i => (
            <div key={i.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] ${i.type === 'Cash In' ? 'border-l-emerald-400' : 'border-l-rose-400'} font-black`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500">{i.voucherno}</p>
                  <p className="text-xs leading-tight font-black text-slate-950">{i.item_description}</p>
                  <p className="text-[8px] text-slate-600 uppercase">[{i.entered_by} • {i.account}]</p>
                </div>
                <button onClick={() => setItemList(itemList.filter(x => x.id !== i.id))} className="text-rose-500 p-1"><Trash2 size={14}/></button>
              </div>
              {i.note && <p className="text-[9px] text-slate-500 mt-2">NOTE: {i.note}</p>}
              {i.km > 0 && <p className="text-[9px] text-blue-600 mt-1">🛣 {i.km.toLocaleString()} km</p>}
              {i.image_data && <p className="text-[9px] text-emerald-600 mt-1">📷 PHOTO ATTACHED</p>}
              <div className="flex justify-between items-end mt-4">
                <p className="text-[9px] text-slate-500">{i.count} X {i.cost_piece.toLocaleString()} MMK</p>
                <p className="text-sm font-black">{i.cost_total.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-200 p-8 space-y-6 font-black border-t border-slate-300">
          <div className="flex justify-between items-end border-b border-slate-400 pb-4">
            <span className="text-slate-600 text-[10px] tracking-widest">TOTAL</span>
            <span className="text-slate-950 text-4xl font-black">{itemList.reduce((s, x) => s + x.cost_total, 0).toLocaleString()}</span>
          </div>
          <button onClick={handleFinalSubmit} disabled={submitStatus === 'processing' || itemList.length === 0}
            className={`w-full py-5 rounded-2xl text-xs transition-all flex items-center justify-center font-black ${submitStatus === 'idle' || submitStatus === 'success' ? 'bg-slate-950 text-white shadow-md hover:bg-slate-800' : submitStatus === 'processing' ? 'bg-slate-300 text-slate-950' : 'bg-rose-100 text-rose-900 border border-rose-300'}`}>
            {submitStatus === 'processing' && <><RefreshCcw className="mr-2 animate-spin" size={18} strokeWidth={3}/> PROCESSING...</>}
            {submitStatus !== 'processing' && <><Save className="mr-2" size={18} strokeWidth={3}/> POST TO CLOUD</>}
          </button>
          {submitStatus === 'success' && (
            <button onClick={resetForm} className="w-full py-4 rounded-2xl text-xs bg-white border-2 border-slate-950 text-slate-950 hover:bg-slate-950 hover:text-white transition-all flex items-center justify-center font-black gap-2">
              <Plus size={16} strokeWidth={3}/> NEW VOUCHER
            </button>
          )}
        </div>
      </div>

      {/* ── EDIT SUPPLIER MODAL ── */}
      {showEditModal && editingSupplier && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-slate-950 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400 tracking-widest">EDIT SUPPLIER</p>
                <p className="text-sm font-black uppercase">{editingSupplier.name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 tracking-widest flex items-center gap-1"><Phone size={10}/> PHONE 1</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-slate-500 font-black text-slate-950 " value={editForm.phone1} onChange={e => setEditForm({ ...editForm, phone1: e.target.value })} placeholder="09..."/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 tracking-widest flex items-center gap-1"><Phone size={10}/> PHONE 2</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-slate-500 font-black text-slate-950 " value={editForm.phone2} onChange={e => setEditForm({ ...editForm, phone2: e.target.value })} placeholder="09..."/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 tracking-widest flex items-center gap-1"><Phone size={10}/> PHONE 3</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-slate-500 font-black text-slate-950 " value={editForm.phone3} onChange={e => setEditForm({ ...editForm, phone3: e.target.value })} placeholder="09..."/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 tracking-widest flex items-center gap-1"><MapPin size={10}/> ADDRESS</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-slate-500 font-black text-slate-950 " value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="ADDRESS..."/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 tracking-widest flex items-center gap-1"><Briefcase size={10}/> SERVICES</label>
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {editServices.map((svc, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-950 text-[11px] font-black px-3 py-1.5 rounded-full uppercase">
                      {svc}
                      <button onClick={() => setEditServices(editServices.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-500"><X size={10}/></button>
                    </span>
                  ))}
                  {editServices.length === 0 && <span className="text-[10px] text-slate-300 italic">NO SERVICES YET</span>}
                </div>
                <div className="flex gap-2">
                  <input className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[11px] outline-none focus:border-slate-500 font-black text-slate-950 " placeholder="ADD SERVICE..." value={newServiceInput} onChange={e => setNewServiceInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newServiceInput.trim()) { e.preventDefault(); if (!editServices.includes(newServiceInput.trim())) setEditServices([...editServices, newServiceInput.trim()]); setNewServiceInput(''); } }}/>
                  <button onClick={() => { if (!newServiceInput.trim()) return; if (!editServices.includes(newServiceInput.trim())) setEditServices([...editServices, newServiceInput.trim()]); setNewServiceInput(''); }} className="bg-slate-200 hover:bg-slate-300 text-slate-950 px-3 rounded-xl font-black"><Plus size={14}/></button>
                </div>
                <p className="text-[9px] text-slate-300">ENTER နှိပ်ရင်လည်း ထည့်နိုင်သည်</p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={saveEditedSupplier} disabled={editSaving} className="flex-1 bg-slate-950 text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50">
                {editSaving ? <><RefreshCcw size={14} className="animate-spin"/> SAVING...</> : <><Save size={14}/> SAVE CHANGES</>}
              </button>
              <button onClick={() => setShowEditModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-xs font-black">CANCEL</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
