"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const VEHICLE_TYPES = ['School Bus', 'Private Car', 'Motorcycle', 'E-Bike', 'Bicycle'];

export default function StaffVehiclesDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [registry, setRegistry] = useState({ students: [], staff: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL'); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetType, setTargetType] = useState('STUDENT');
  const [personSearch, setPersonSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [form, setForm] = useState({ Reg_ID: '', Vehicle_Type: 'Motorcycle', Plate_No: '', Color: '', Brand: '', Remark: '', Status: 'Active' });

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    if (!u) { router.push('/login'); return; }
    setUser(u);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, initRes] = await Promise.all([
        fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'getVehicles' }) }).then(r => r.json()),
        fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'getInitialData' }) }).then(r => r.json())
      ]);
      
      if (initRes.success) {
        const isActive = u => u.Status?.toString().toUpperCase() !== 'FALSE';
        const st = (initRes.students || []).filter(isActive);
        const sf = (initRes.staffList || initRes.staff || []).filter(isActive);
        setRegistry({ students: st, staff: sf });
        
        // ── Enrich vehicles with Gender and Grade from Registry ──
        if (vRes.success) {
          const enriched = (vRes.data || []).map(v => {
             if(String(v.User_Type).toUpperCase() === 'STUDENT') {
               const s = st.find(x => x['Enrollment No.'] === v.User_ID || x.Student_ID === v.User_ID || x['Name (ALL CAPITAL)'] === v.Name);
               return { ...v, Grade: s?.Grade || s?.Class || 'Unknown', Sex: s?.Sex || 'Unknown' };
             }
             return { ...v, Grade: 'Staff', Sex: 'Staff' };
          });
          setVehicles(enriched);
        }
      }
    } catch {}
    setLoading(false);
  };

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const handleSave = async () => {
    if (!selectedPerson) return showMsg('ကျောင်းသား သို့မဟုတ် Staff ကို ရွေးပါ', 'error');
    if (!form.Vehicle_Type) return showMsg('ယာဉ်အမျိုးအစား ရွေးပါ', 'error');
    if (!form.Plate_No && !['Bicycle'].includes(form.Vehicle_Type)) return showMsg('ယာဉ်အမှတ် (Plate No) ထည့်ပါ', 'error');
    
    setSaving(true);
    const payload = {
      action: 'saveVehicle', Reg_ID: form.Reg_ID, User_Type: targetType,
      User_ID: selectedPerson['Enrollment No.'] || selectedPerson.Staff_ID || selectedPerson.Student_ID, 
      Name: selectedPerson['Name (ALL CAPITAL)'] || selectedPerson.Name,
      Vehicle_Type: form.Vehicle_Type, Plate_No: form.Plate_No, Color: form.Color, Brand: form.Brand, Remark: form.Remark, Status: form.Status, Registered_By: user.Name || user.username
    };
    try {
      const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
      const r = await res.json();
      if (r.success) { showMsg(r.message); setIsModalOpen(false); fetchData(); } 
      else showMsg(r.message || 'Error', 'error');
    } catch { showMsg('Network error', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (regId) => {
    if (!confirm('ဒီမှတ်တမ်းကို အမှန်တကယ် ဖျက်မှာလား?')) return;
    setLoading(true);
    try {
      const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteVehicle', Reg_ID: regId }) });
      if ((await res.json()).success) { showMsg('ဖျက်ပြီးပါပြီ'); fetchData(); } 
      else showMsg('Error deleting', 'error');
    } catch {}
    setLoading(false);
  };

  const openEdit = (v) => {
    const tType = String(v.User_Type).toUpperCase() === 'STAFF' ? 'STAFF' : 'STUDENT';
    setTargetType(tType);
    setSelectedPerson({ 'Enrollment No.': v.User_ID, Staff_ID: v.User_ID, Name: v.Name, 'Name (ALL CAPITAL)': v.Name });
    setForm({ Reg_ID: v.Reg_ID, Vehicle_Type: v.Vehicle_Type, Plate_No: v.Plate_No, Color: v.Color, Brand: v.Brand, Remark: v.Remark, Status: v.Status });
    setIsModalOpen(true);
  };

  const openNew = () => {
    setTargetType('STUDENT'); setSelectedPerson(null); setPersonSearch('');
    setForm({ Reg_ID: '', Vehicle_Type: 'Motorcycle', Plate_No: '', Color: '', Brand: '', Remark: '', Status: 'Active' });
    setIsModalOpen(true);
  };

  const personList = targetType === 'STAFF' ? registry.staff : registry.students;
  const filteredPersons = personSearch.length >= 2 ? personList.filter(s => {
    const n = (s['Name (ALL CAPITAL)'] || s.Name || '').toLowerCase(), id = (s['Enrollment No.'] || s.Staff_ID || s.Student_ID || '').toString().toLowerCase(), query = personSearch.toLowerCase();
    return n.includes(query) || id.includes(query);
  }).slice(0, 5) : [];

  const displayVehicles = vehicles.filter(v => {
    const matchType = filterType === 'ALL' || String(v.User_Type).toUpperCase() === filterType;
    const matchSearch = search === '' || (v.Name||'').toLowerCase().includes(search.toLowerCase()) || (v.Plate_No||'').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  // ── ADVANCED STATS CALCULATION ──
  const vStats = vehicles.reduce((acc, v) => {
    acc.total++;
    if (String(v.User_Type).toUpperCase() === 'STUDENT') {
      acc.student++;
      const sex = String(v.Sex).toUpperCase();
      if(['M','MALE','ကျား'].includes(sex)) acc.male++;
      else if(['F','FEMALE','မ'].includes(sex)) acc.female++;
      
      const g = v.Grade !== 'Unknown' && v.Grade !== '' ? `G-${v.Grade}` : 'Unknown';
      acc.grades[g] = (acc.grades[g] || 0) + 1;
    } else {
      acc.staff++;
    }
    acc.types[v.Vehicle_Type] = (acc.types[v.Vehicle_Type] || 0) + 1;
    return acc;
  }, { total: 0, student: 0, staff: 0, male: 0, female: 0, types: {}, grades: {} });

  const maxGradeVal = Math.max(...Object.values(vStats.grades), 1);

  return (
    <div className="h-screen flex flex-col bg-[#F0F9FF] font-black text-slate-900 overflow-hidden">
      
      {/* ── HEADER ── */}
      <div className="shrink-0 bg-slate-950 border-b-[8px] border-[#fbbf24] px-6 py-4 flex items-center justify-between z-10 shadow-xl">
        <button onClick={() => router.push('/staff')} className="bg-[#fbbf24] text-slate-950 w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold shadow-md hover:bg-amber-300">←</button>
        <div className="text-center">
          <h1 className="text-white text-lg uppercase tracking-widest italic">Vehicle Monitoring</h1>
          <p className="text-[#fbbf24] text-[9px] uppercase tracking-[0.2em]">Staff Portal</p>
        </div>
        <button onClick={fetchData} className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white text-xl">↻</button>
      </div>

      {msg && <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-xs text-white z-50 shadow-2xl uppercase tracking-widest ${msg.type === 'error' ? 'bg-rose-600' : 'bg-emerald-500'}`}>{msg.text}</div>}

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-[1000px] mx-auto space-y-6">
          
          {/* ── ADVANCED STATS DASHBOARD ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* Total Registered */}
             <div className="bg-slate-950 text-white rounded-3xl p-5 border-b-[6px] border-[#fbbf24] shadow-xl flex items-center gap-4 lg:col-span-1">
               <div className="text-4xl">🛵</div>
               <div>
                 <p className="text-3xl text-[#fbbf24] leading-none">{vStats.total}</p>
                 <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Total Registered</p>
               </div>
             </div>
             
             {/* By Role */}
             <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
               <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">By Role</p>
               <div className="flex justify-between items-center text-sm">
                 <span className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">🎓 Student: {vStats.student}</span>
                 <span className="text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">👔 Staff: {vStats.staff}</span>
               </div>
             </div>

             {/* By Gender */}
             <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
               <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">By Gender (Students)</p>
               <div className="flex justify-between items-center text-sm">
                 <span className="text-sky-600 bg-sky-50 px-3 py-1.5 rounded-lg">♂️ Male: {vStats.male}</span>
                 <span className="text-pink-600 bg-pink-50 px-3 py-1.5 rounded-lg">♀️ Female: {vStats.female}</span>
               </div>
             </div>

             {/* By Vehicle Type */}
             <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-wrap gap-2 justify-center items-center lg:col-span-1">
                {Object.entries(vStats.types).map(([type, count]) => (
                  <div key={type} className="text-center px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-100 min-w-[50px] flex-1">
                    <p className="text-base text-slate-800 leading-tight">{count}</p>
                    <p className="text-[7px] text-slate-500 uppercase font-bold mt-0.5">{type.split(' ')[0]}</p>
                  </div>
                ))}
             </div>
          </div>

          {/* Vehicles By Grade Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-5 font-black border-b border-slate-100 pb-2">Vehicles By Grade (Students)</p>
            <div className="flex items-end gap-2 h-28 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 pt-2">
              {Object.keys(vStats.grades).length === 0 ? <p className="text-xs text-slate-400 italic">No student vehicle records</p> : 
                Object.entries(vStats.grades).sort((a,b) => a[0].localeCompare(b[0])).map(([g, c]) => (
                <div key={g} className="flex-1 flex flex-col items-center justify-end min-w-[40px] group relative h-full">
                   <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold pointer-events-none transition-opacity shadow-lg">
                     {c}
                   </div>
                   <div className="w-full max-w-[28px] bg-[#fbbf24] hover:bg-amber-500 rounded-t-lg transition-all duration-300" style={{height: `${Math.max((c/maxGradeVal)*100, 10)}%`}}></div>
                   <p className="text-[9px] text-slate-600 font-bold mt-2 rotate-45 whitespace-nowrap">{g}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── ACTIONS & FILTERS ── */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mt-8">
             <div className="flex gap-2 w-full md:w-auto">
               {['ALL', 'STUDENT', 'STAFF'].map(t => (
                 <button key={t} onClick={() => setFilterType(t)} className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === t ? 'bg-[#fbbf24] text-slate-950 shadow-md' : 'bg-slate-100 text-slate-500'}`}>{t}</button>
               ))}
             </div>
             <div className="flex gap-2 w-full md:w-auto">
               <input placeholder="Search Name or Plate..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#fbbf24]" />
               <button onClick={openNew} className="shrink-0 bg-slate-950 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-slate-800">+ Register</button>
             </div>
          </div>

          {/* ── VEHICLE LIST ── */}
          <div className="space-y-4">
             {loading ? <div className="text-center py-20 text-slate-400 animate-pulse text-sm font-black uppercase tracking-widest">Loading Records...</div> : displayVehicles.length === 0 ? (
               <div className="text-center py-20 text-slate-400 text-sm font-black uppercase tracking-widest bg-white rounded-3xl border border-slate-200 border-dashed">No vehicles found</div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {displayVehicles.map((v, i) => (
                   <div key={i} className="bg-white p-5 rounded-[2rem] border-b-[6px] border-slate-200 shadow-md hover:border-[#fbbf24] transition-all flex gap-5 items-center group">
                      <div className="w-14 h-14 shrink-0 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl border border-slate-200 group-hover:scale-110 transition-transform">
                         {v.Vehicle_Type === 'Bicycle' ? '🚲' : v.Vehicle_Type === 'Private Car' ? '🚙' : v.Vehicle_Type === 'School Bus' ? '🚌' : '🛵'}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start mb-1">
                           <p className="text-sm font-black uppercase italic truncate">{v.Name}</p>
                           <span className={`text-[8px] uppercase px-2 py-0.5 rounded-md font-bold ${String(v.User_Type).toUpperCase()==='STUDENT'?'bg-indigo-100 text-indigo-700':'bg-amber-100 text-amber-700'}`}>
                             {v.User_Type} {String(v.User_Type).toUpperCase()==='STUDENT' && v.Grade !== 'Unknown' ? ` (${v.Grade})` : ''}
                           </span>
                         </div>
                         <p className="text-[10px] font-bold text-slate-400 mb-2">ID: {v.User_ID} · {v.Brand}</p>
                         <div className="flex gap-2">
                           <span className="bg-slate-950 text-[#fbbf24] text-[10px] px-3 py-1 rounded-lg tracking-widest">{v.Plate_No || 'NO-PLATE'}</span>
                           <span className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1 rounded-lg">{v.Color}</span>
                         </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(v)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-[#fbbf24] hover:text-slate-950 text-xs flex items-center justify-center transition-colors">✏️</button>
                        <button onClick={() => handleDelete(v.Reg_ID)} className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white text-xs flex items-center justify-center transition-colors">🗑️</button>
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:w-[500px] rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 shadow-2xl flex flex-col max-h-[90vh]">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-lg font-black uppercase tracking-tight italic">{form.Reg_ID ? 'Edit Vehicle' : 'Vehicle Registration'}</h2>
               <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:bg-slate-200">✕</button>
             </div>
             
             <div className="overflow-y-auto flex-1 pr-2 space-y-5 pb-4 scrollbar-thin scrollbar-thumb-slate-200">
               {!form.Reg_ID && !selectedPerson && (
                 <div className="space-y-3">
                   <div className="flex bg-slate-100 p-1 rounded-xl">
                     {['STUDENT', 'STAFF'].map(t => (
                       <button key={t} onClick={() => {setTargetType(t); setPersonSearch('');}} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg ${targetType === t ? 'bg-white shadow-sm text-slate-950' : 'text-slate-400'}`}>{t}</button>
                     ))}
                   </div>
                   <input placeholder={`${targetType} Name or ID...`} value={personSearch} onChange={e => setPersonSearch(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#fbbf24]" />
                   {filteredPersons.map((p, i) => (
                     <button key={i} onClick={() => setSelectedPerson(p)} className="w-full text-left bg-white border border-slate-200 p-3 rounded-xl hover:border-[#fbbf24] flex justify-between items-center">
                       <div><p className="text-sm font-black">{p['Name (ALL CAPITAL)'] || p.Name}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-1">ID: {p['Enrollment No.'] || p.Staff_ID}</p></div>
                       <span className="text-slate-300 font-bold">→</span>
                     </button>
                   ))}
                 </div>
               )}

               {selectedPerson && (
                 <>
                   <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
                     <div><p className="text-xs font-black uppercase text-emerald-800">{selectedPerson['Name (ALL CAPITAL)'] || selectedPerson.Name}</p><p className="text-[9px] font-bold text-emerald-600 uppercase mt-1">ID: {selectedPerson['Enrollment No.'] || selectedPerson.Staff_ID} ({targetType})</p></div>
                     {!form.Reg_ID && <button onClick={() => setSelectedPerson(null)} className="text-xs font-black text-rose-500 bg-white px-3 py-1 rounded-lg border border-rose-100 shadow-sm hover:bg-rose-50">Change</button>}
                   </div>

                   <div>
                     <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Vehicle Type *</label>
                     <select value={form.Vehicle_Type} onChange={e => setForm({...form, Vehicle_Type: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#fbbf24]">
                       {VEHICLE_TYPES.map(v => <option key={v}>{v}</option>)}
                     </select>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Plate No / Number *</label>
                       <input value={form.Plate_No} onChange={e => setForm({...form, Plate_No: e.target.value})} placeholder="e.g. 1A-1234" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold uppercase outline-none focus:border-[#fbbf24]"/>
                     </div>
                     <div>
                       <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Color</label>
                       <input value={form.Color} onChange={e => setForm({...form, Color: e.target.value})} placeholder="Red, Black..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#fbbf24]"/>
                     </div>
                   </div>

                   <div>
                     <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Brand / Model</label>
                     <input value={form.Brand} onChange={e => setForm({...form, Brand: e.target.value})} placeholder="Honda, Toyota..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#fbbf24]"/>
                   </div>

                   <div>
                     <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Remark / Description</label>
                     <input value={form.Remark} onChange={e => setForm({...form, Remark: e.target.value})} placeholder="Stickers, marks..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[#fbbf24]"/>
                   </div>
                 </>
               )}
             </div>

             <div className="shrink-0 pt-4 border-t border-slate-100 mt-2">
               <button onClick={handleSave} disabled={saving || !selectedPerson} className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg transition-all ${saving || !selectedPerson ? 'bg-slate-200 text-slate-400' : 'bg-[#fbbf24] text-slate-950 hover:bg-amber-300 active:scale-95'}`}>
                 {saving ? 'Saving...' : form.Reg_ID ? 'Update Record' : 'Register Vehicle'}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}