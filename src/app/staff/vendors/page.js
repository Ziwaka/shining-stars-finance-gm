"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const PRESET_CATEGORIES = ['Technology & IT', 'Maintenance & Repair', 'Logistics & Transport', 'Stationery & Supplies', 'Food & Catering', 'Event Management', 'Consulting', 'Others'];
const PRESET_GROUPS = ['Tier 1 (Strategic)', 'Tier 2 (Preferred)', 'Tier 3 (Standard)', 'One-time Vendor'];

export default function StaffVendorsDirectory() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [form, setForm] = useState({
    Vendor_ID: '', Company: '', Name: '', Position: '', Category: 'Technology & IT', Sub_Category: '', Grouping: 'Tier 3 (Standard)', 
    Phone_1: '', Phone_2: '', Phone_3: '', Viber: '', Telegram: '', Email: '', Address: '', Services: '', Note: '', Photo_URL: '', Status: 'Active'
  });

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    if (!u) { router.push('/login'); return; }
    setUser(u);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'getVendors' }) });
      const r = await res.json();
      if (r.success) setVendors(r.data || []);
    } catch {}
    setLoading(false);
  };

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setUploading(true);
      try {
        const res = await fetch(WEB_APP_URL, { method:'POST', body:JSON.stringify({ action:'uploadPhoto', base64, filename: file.name, mimeType: file.type, folder: 'vendors' }) }).then(r=>r.json());
        if(res.success) { setForm(f => ({...f, Photo_URL: res.photoUrl})); showMsg('Photo uploaded ✓'); }
        else showMsg('Upload failed', 'error');
      } catch(err) { showMsg('Upload error', 'error'); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.Name.trim()) return showMsg('Contact Person Name ထည့်ရန် လိုအပ်ပါသည်', 'error');
    if (!form.Company.trim()) return showMsg('Company Name ထည့်ရန် လိုအပ်ပါသည်', 'error');
    setSaving(true);
    try {
      const payload = { action: 'saveVendor', ...form, Updated_By: user.Name || user.username };
      const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
      const r = await res.json();
      if (r.success) { showMsg(r.message); setIsModalOpen(false); fetchData(); } 
      else showMsg(r.message || 'Error', 'error');
    } catch { showMsg('Network error', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (vid) => {
    if (!confirm('ဒီ Contact ကို အမှန်တကယ် ဖျက်မှာလား?')) return;
    setLoading(true);
    try {
      const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteVendor', Vendor_ID: vid }) });
      if ((await res.json()).success) { showMsg('ဖျက်ပြီးပါပြီ'); fetchData(); }
    } catch {}
    setLoading(false);
  };

  const openNew = () => {
    setForm({ Vendor_ID: '', Company: '', Name: '', Position: '', Category: 'Technology & IT', Sub_Category: '', Grouping: 'Tier 3 (Standard)', Phone_1: '', Phone_2: '', Phone_3: '', Viber: '', Telegram: '', Email: '', Address: '', Services: '', Note: '', Photo_URL: '', Status: 'Active' });
    setIsModalOpen(true);
  };

  const openEdit = (v) => { setForm({ ...v }); setIsModalOpen(true); };

  const dynamicCategories = ['ALL', ...new Set([...PRESET_CATEGORIES, ...vendors.map(v => v.Category).filter(Boolean)])];

  const filteredVendors = vendors.filter(v => {
    const matchCat = activeCategory === 'ALL' || v.Category === activeCategory;
    const matchSearch = search === '' || (v.Name||'').toLowerCase().includes(search.toLowerCase()) || (v.Company||'').toLowerCase().includes(search.toLowerCase()) || (v.Services||'').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const groupedVendors = filteredVendors.reduce((acc, v) => {
    const comp = v.Company?.trim() || 'Independent / Others';
    if (!acc[comp]) acc[comp] = [];
    acc[comp].push(v);
    return acc;
  }, {});

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] font-black text-slate-900 overflow-hidden">
      <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
        <button onClick={() => router.push('/staff')} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">←</button>
        <div className="text-center">
          <h1 className="text-slate-900 text-lg uppercase tracking-widest">Partners & Vendors</h1>
          <p className="text-sky-600 text-[10px] uppercase tracking-[0.2em]">Staff Portal</p>
        </div>
        <button onClick={fetchData} className="w-10 h-10 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100 transition-colors">↻</button>
      </div>

      {msg && <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-xs text-white z-50 shadow-2xl uppercase tracking-widest ${msg.type === 'error' ? 'bg-rose-600' : 'bg-emerald-500'}`}>{msg.text}</div>}

      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
          <div className="p-6 pb-2"><p className="text-[10px] uppercase tracking-widest text-slate-400 mb-4">Categories</p></div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
            {dynamicCategories.map(cat => {
              const count = cat === 'ALL' ? vendors.length : vendors.filter(v => v.Category === cat).length;
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeCategory === cat ? 'bg-sky-600 text-white shadow-md shadow-sky-200' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <span className="text-[11px] uppercase tracking-wider">{cat}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg ${activeCategory === cat ? 'bg-sky-700' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 p-6 bg-white/50 backdrop-blur-sm border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
             <input placeholder="Search company, person or services..." value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:w-80 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-sky-500 shadow-sm" />
             <div className="flex gap-2 w-full sm:w-auto overflow-x-auto md:hidden">
               {dynamicCategories.slice(0,4).map(c => <button key={c} onClick={() => setActiveCategory(c)} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider ${activeCategory === c ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{c}</button>)}
             </div>
             <button onClick={openNew} className="shrink-0 w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
               <span>+</span> Add Contact
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
             {loading ? <div className="text-center py-20 text-slate-400 animate-pulse text-sm uppercase tracking-widest">Loading Directory...</div> : Object.keys(groupedVendors).length === 0 ? <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400 text-sm uppercase tracking-widest">No records found</div> : (
               <div className="space-y-8 max-w-[1200px] mx-auto">
                 {Object.entries(groupedVendors).sort().map(([company, members]) => (
                   <div key={company} className="bg-transparent">
                     <div className="flex items-center gap-3 mb-4 pl-2">
                        <div className="w-2 h-6 bg-sky-500 rounded-full shadow-sm" />
                        <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">{company}</h2>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-bold">{members.length} Contact{members.length > 1 ? 's' : ''}</span>
                     </div>
                     <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                       {members.map((v, i) => (
                         <div key={i} className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col relative group">
                           <div className="absolute top-6 right-6">
                              <span className={`text-[8px] uppercase tracking-widest px-3 py-1.5 rounded-lg border ${v.Grouping?.includes('Tier 1') ? 'bg-amber-50 text-amber-700 border-amber-200' : v.Grouping?.includes('Tier 2') ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{v.Grouping || 'Standard'}</span>
                           </div>
                           <div className="flex items-start gap-4 mb-5 pr-20">
                             <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center text-xl text-slate-500 shrink-0 shadow-inner uppercase overflow-hidden">
                               {v.Photo_URL && v.Photo_URL !== '-' ? <img src={v.Photo_URL} alt="Logo" className="w-full h-full object-cover" /> : v.Name.charAt(0)}
                             </div>
                             <div>
                               <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{v.Name}</h3>
                               <p className="text-[10px] text-sky-600 font-bold tracking-widest">{v.Position || 'Contact Person'}</p>
                               <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">{v.Category}</p>
                             </div>
                           </div>
                           <div className="space-y-3 mb-6 flex-1">
                             <div className="flex items-start gap-3 text-sm text-slate-600">
                               <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">📞</div>
                               <div className="flex flex-col gap-1 font-bold">
                                 {v.Phone_1 && <span>{v.Phone_1}</span>}
                                 {v.Phone_2 && <span>{v.Phone_2}</span>}
                                 {v.Phone_3 && <span>{v.Phone_3}</span>}
                                 {!v.Phone_1 && !v.Phone_2 && !v.Phone_3 && <span className="text-slate-400 font-normal">-</span>}
                               </div>
                             </div>
                             {(v.Viber || v.Telegram) && (
                               <div className="flex items-center gap-2 pl-11">
                                  {v.Viber && <span className="text-[9px] bg-[#e6dbfa] text-[#7360f2] px-2 py-1 rounded-md font-black uppercase tracking-wider flex items-center gap-1">Viber: {v.Viber}</span>}
                                  {v.Telegram && <span className="text-[9px] bg-sky-100 text-sky-600 px-2 py-1 rounded-md font-black uppercase tracking-wider flex items-center gap-1">TG: {v.Telegram}</span>}
                               </div>
                             )}
                             {v.Email && (
                               <div className="flex items-center gap-3 text-sm text-slate-600">
                                 <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">✉️</div>
                                 <span className="truncate">{v.Email}</span>
                               </div>
                             )}
                             {v.Address && (
                               <div className="flex items-center gap-3 text-sm text-slate-600">
                                 <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">📍</div>
                                 <span className="truncate whitespace-pre-wrap">{v.Address}</span>
                               </div>
                             )}
                           </div>
                           <div className="border-t border-slate-100 pt-4 flex justify-between items-center gap-4">
                             <div className="flex-1 min-w-0">
                               <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Services</p>
                               <p className="text-xs text-slate-700 truncate">{v.Services || '-'}</p>
                             </div>
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => openEdit(v)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-600 flex items-center justify-center transition-colors">✏️</button>
                               <button onClick={() => handleDelete(v.Vendor_ID)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors">🗑️</button>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-6 shadow-2xl flex flex-col max-h-[85vh]">
             <div className="flex justify-between items-center mb-6 shrink-0">
               <div>
                 <h2 className="text-xl uppercase tracking-tight text-slate-900">{form.Vendor_ID ? 'Edit Contact' : 'New Contact'}</h2>
                 <p className="text-[10px] text-sky-600 uppercase tracking-widest mt-1">Partners & Vendors Directory</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">✕</button>
             </div>
             
             <div className="overflow-y-auto flex-1 pr-2 space-y-6 pb-4 scrollbar-thin scrollbar-thumb-slate-200">
               <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <div className="shrink-0 relative">
                   <div className="w-20 h-20 bg-white border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative">
                     {form.Photo_URL ? <img src={form.Photo_URL} className="w-full h-full object-cover" alt="Logo" /> : <span className="text-2xl text-slate-300">🏢</span>}
                     <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="absolute inset-0 opacity-0 cursor-pointer" />
                   </div>
                   {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-[10px] font-bold text-sky-600">Up...</div>}
                   <p className="text-[8px] text-slate-400 text-center mt-1 uppercase tracking-widest">Logo/Photo</p>
                 </div>
                 <div className="flex-1 space-y-3">
                   <div>
                     <label className="block text-[9px] uppercase text-slate-400 mb-1 tracking-widest">Company / Organization *</label>
                     <input value={form.Company} onChange={e => setForm({...form, Company: e.target.value})} placeholder="e.g. Global Tech Solutions" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500" />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="block text-[9px] uppercase text-slate-400 mb-1 tracking-widest">Contact Name *</label>
                       <input value={form.Name} onChange={e => setForm({...form, Name: e.target.value})} placeholder="Person Name" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500" />
                     </div>
                     <div>
                       <label className="block text-[9px] uppercase text-slate-400 mb-1 tracking-widest">Position</label>
                       <input value={form.Position} onChange={e => setForm({...form, Position: e.target.value})} placeholder="e.g. Manager" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500" />
                     </div>
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                   <label className="block text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Category</label>
                   <input list="cat-list" value={form.Category} onChange={e => setForm({...form, Category: e.target.value})} placeholder="Select..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-500" />
                   <datalist id="cat-list">{PRESET_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Sub Category</label>
                   <input value={form.Sub_Category} onChange={e => setForm({...form, Sub_Category: e.target.value})} placeholder="e.g. Hardware" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-500" />
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Grouping / Tier</label>
                   <select value={form.Grouping} onChange={e => setForm({...form, Grouping: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-500">
                     <option value="">-- None --</option>
                     {PRESET_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                   </select>
                 </div>
               </div>

               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                 <p className="text-[10px] uppercase text-slate-500 tracking-widest font-bold">Contact Numbers</p>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   <input value={form.Phone_1} onChange={e => setForm({...form, Phone_1: e.target.value})} placeholder="Phone 1 *" type="tel" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500" />
                   <input value={form.Phone_2} onChange={e => setForm({...form, Phone_2: e.target.value})} placeholder="Phone 2" type="tel" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500" />
                   <input value={form.Phone_3} onChange={e => setForm({...form, Phone_3: e.target.value})} placeholder="Phone 3" type="tel" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                   <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-sky-500">
                     <span className="bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-500 border-r border-slate-200">Viber</span>
                     <input value={form.Viber} onChange={e => setForm({...form, Viber: e.target.value})} placeholder="Number" type="tel" className="w-full px-3 py-2.5 text-sm outline-none" />
                   </div>
                   <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-sky-500">
                     <span className="bg-slate-100 px-3 py-2.5 text-xs font-bold text-slate-500 border-r border-slate-200">Telegram</span>
                     <input value={form.Telegram} onChange={e => setForm({...form, Telegram: e.target.value})} placeholder="@username or Number" className="w-full px-3 py-2.5 text-sm outline-none" />
                   </div>
                 </div>
               </div>

               <div className="space-y-4">
                 <input value={form.Email} onChange={e => setForm({...form, Email: e.target.value})} placeholder="Email Address" type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-500" />
                 <textarea value={form.Address} onChange={e => setForm({...form, Address: e.target.value})} placeholder="Full Address" rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-500 resize-none" />
                 <div>
                   <label className="block text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Services Offered (Comma separated)</label>
                   <input value={form.Services} onChange={e => setForm({...form, Services: e.target.value})} placeholder="e.g. PC Repair, Networking, CCTV" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-500" />
                 </div>
                 <div>
                   <label className="block text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Internal Notes</label>
                   <textarea value={form.Note} onChange={e => setForm({...form, Note: e.target.value})} placeholder="Any special notes or remarks..." rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-500 resize-none" />
                 </div>
               </div>
             </div>

             <div className="shrink-0 pt-5 border-t border-slate-100">
               <button onClick={handleSave} disabled={saving} className={`w-full py-4 rounded-2xl text-sm uppercase tracking-widest shadow-lg transition-all ${saving ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'}`}>
                 {saving ? 'Saving...' : form.Vendor_ID ? 'Update Contact' : 'Save Contact'}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}