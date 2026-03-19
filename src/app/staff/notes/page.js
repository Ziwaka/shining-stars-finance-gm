"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const MM_TZ = 'Asia/Yangon';
const getTodayMM = () => {
  try { return new Date().toLocaleDateString('en-CA', { timeZone: MM_TZ }); }
  catch(e) { return new Date().toISOString().split('T')[0]; }
};
const formatMMDate = (d) => {
  if (!d || d === '-') return '-';
  try {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
    const dateObj = new Date(d);
    if (!isNaN(dateObj.getTime())) return dateObj.toLocaleDateString('en-CA', { timeZone: MM_TZ });
  } catch (e) {}
  return String(d).split('T')[0];
};
const formatDateDisplay = (d) => {
  if (!d || d === '-') return '-';
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: MM_TZ });
    return `${day}/${month}/${year}, ${weekday}`;
  } catch(e) { return formatMMDate(d); }
};

const CATEGORIES = [
  { id: 'Discipline', nameEn: 'Discipline', nameMm: 'စည်းကမ်းပိုင်း', icon: '⚖️', color: 'text-rose-600', bg: 'bg-rose-50' },
  { id: 'Academic', nameEn: 'Academic', nameMm: 'ပညာရေး', icon: '📚', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'Health', nameEn: 'Health', nameMm: 'ကျန်းမာရေး', icon: '🏥', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'General', nameEn: 'General', nameMm: 'အထွေထွေ', icon: '📝', color: 'text-slate-600', bg: 'bg-slate-100' },
];

export default function RegistryNotes() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [notesHistory, setNotesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [form, setForm] = useState({ Category: 'Discipline', Note: '', Date: getTodayMM() });

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    if (!u) { router.push('/login'); return; }
    setUser(u);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [initRes, notesRes] = await Promise.all([
        fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'getInitialData' }) }).then(r => r.json()),
        fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'getData', sheetName: 'Student_Notes_Log' }) }).then(r => r.json())
      ]);
      if (initRes.success) {
        const active = s => String(s.Status).toUpperCase() !== 'FALSE';
        setStudents((initRes.students || []).filter(active));
      }
      if (notesRes.success) {
        setNotesHistory((notesRes.data || []).reverse());
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const handleSave = async () => {
    if (!selectedStudent) return showMsg('ကျောင်းသား ရွေးချယ်ရန် လိုအပ်ပါသည် (Select a student)', 'error');
    if (!form.Note.trim()) return showMsg('မှတ်တမ်း အသေးစိတ် ရေးသားရန် လိုအပ်ပါသည် (Write description)', 'error');

    setSaving(true);
    const payload = [{
      Date: formatMMDate(form.Date),
      Student_ID: selectedStudent['Enrollment No.'] || selectedStudent.Student_ID || '',
      Name: selectedStudent['Name (ALL CAPITAL)'] || selectedStudent.Name || '',
      Grade: selectedStudent.Grade || selectedStudent.Class || '',
      Category: form.Category,
      Note: form.Note.trim(),
      Recorded_By: user.Name || user.username || ''
    }];

    try {
      const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'recordNote', sheetName: 'Student_Notes_Log', data: payload, userRole: user?.userRole||'staff', staffId: user?.Staff_ID||user?.username||'' }) });
      const r = await res.json();
      if (r.success) {
        showMsg('မှတ်တမ်း သိမ်းဆည်းပြီးပါပြီ (Saved successfully)');
        setForm(f => ({ ...f, Note: '' }));
        setSelectedStudent(null);
        setStudentSearch('');
        fetchData();
      } else {
        showMsg(r.message || 'Error saving note', 'error');
      }
    } catch { showMsg('Network Error', 'error'); }
    setSaving(false);
  };

  const filteredStudents = studentSearch.length >= 2 ? students.filter(s => {
    const q = studentSearch.toLowerCase();
    const name = (s['Name (ALL CAPITAL)'] || s.Name || '').toLowerCase();
    const id = (s['Enrollment No.'] || s.Student_ID || '').toString().toLowerCase();
    return name.includes(q) || id.includes(q);
  }).slice(0, 5) : [];

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] font-black text-slate-900 overflow-hidden">
      {/* ── HEADER ── */}
      <div className="shrink-0 bg-slate-900 border-b-[8px] border-[#fbbf24] px-6 py-4 flex items-center justify-between z-10 shadow-xl">
        <button onClick={() => router.push('/staff')} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-[#fbbf24] hover:text-slate-900 transition-colors text-lg">←</button>
        <div className="text-center">
          <h1 className="text-white text-lg uppercase tracking-widest italic">Registry Notes</h1>
          <p className="text-[#fbbf24] text-[10px] uppercase tracking-[0.2em]">ကျောင်းသား မှတ်တမ်းများ</p>
        </div>
        <button onClick={fetchData} className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-lg">↻</button>
      </div>

      {msg && <div className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-xs text-white z-50 shadow-2xl uppercase tracking-widest ${msg.type === 'error' ? 'bg-rose-600' : 'bg-emerald-500'}`}>{msg.text}</div>}

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* ── LEFT: ADD NOTE FORM ── */}
          <div className="space-y-6">
             <div className="bg-white rounded-[2rem] border border-slate-200 p-6 md:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-full -mr-10 -mt-10 pointer-events-none opacity-50" />
                <h2 className="text-sm uppercase tracking-widest text-slate-800 mb-6 pb-3 border-b border-slate-100 flex items-center gap-2 relative z-10"><span className="text-2xl">✍️</span> New Note <span className="text-[10px] text-sky-600 bg-sky-50 px-2 py-1 rounded-md ml-2">မှတ်တမ်းသစ်</span></h2>
                
                <div className="space-y-6 relative z-10">
                  {/* Select Student */}
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Student Name <span className="text-slate-500 font-bold">(ကျောင်းသားအမည်)</span> *</label>
                    {!selectedStudent ? (
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search by name or ID..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-[#fbbf24] focus:ring-2 focus:ring-amber-100 focus:bg-white transition-all" />
                        {filteredStudents.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-2xl mt-2 overflow-hidden shadow-2xl">
                            {filteredStudents.map((s, i) => (
                              <button key={i} onClick={() => { setSelectedStudent(s); setStudentSearch(''); }} className={`w-full px-5 py-4 text-left hover:bg-amber-50 transition-colors ${i < filteredStudents.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                <p className="text-sm font-black text-slate-800">{s['Name (ALL CAPITAL)'] || s.Name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">ID: {s['Enrollment No.'] || s.Student_ID} | G-{s.Grade || s.Class}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-emerald-100 flex items-center justify-center text-xl">🎓</div>
                          <div>
                            <p className="font-black text-sm text-emerald-900 m-0 uppercase">{selectedStudent['Name (ALL CAPITAL)'] || selectedStudent.Name}</p>
                            <p className="text-[10px] font-bold text-emerald-600 m-0 mt-1 uppercase tracking-wider">ID: {selectedStudent['Enrollment No.'] || selectedStudent.Student_ID} | G-{selectedStudent.Grade || selectedStudent.Class}</p>
                          </div>
                        </div>
                        <button onClick={() => setSelectedStudent(null)} className="text-[10px] uppercase tracking-widest px-3 py-2 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 font-black shadow-sm transition-colors">Change</button>
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Date <span className="text-slate-500 font-bold">(ရက်စွဲ)</span> *</label>
                    <input type="date" value={form.Date} onChange={e => setForm({...form, Date: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-[#fbbf24] focus:bg-white transition-colors" />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Category <span className="text-slate-500 font-bold">(အမျိုးအစား)</span> *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {CATEGORIES.map(c => (
                        <button key={c.id} onClick={() => setForm({...form, Category: c.id})} className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${form.Category === c.id ? `border-transparent shadow-md ${c.bg}` : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${form.Category === c.id ? 'bg-white shadow-sm' : c.bg}`}>{c.icon}</div>
                          <div className="text-left flex-1 min-w-0">
                            <p className={`text-[11px] font-black uppercase tracking-wider truncate ${form.Category === c.id ? c.color : 'text-slate-700'}`}>{c.nameEn}</p>
                            <p className={`text-[9px] font-bold mt-0.5 truncate ${form.Category === c.id ? c.color : 'text-slate-400'}`}>{c.nameMm}</p>
                          </div>
                          {form.Category === c.id && <div className={`text-lg ${c.color}`}>✓</div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[10px] uppercase text-slate-400 mb-2 tracking-widest">Description <span className="text-slate-500 font-bold">(အသေးစိတ်ရေးသားရန်)</span> *</label>
                    <textarea value={form.Note} onChange={e => setForm({...form, Note: e.target.value})} placeholder="Write detailed report here..." rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#fbbf24] focus:bg-white transition-colors resize-none leading-relaxed" />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-slate-100">
                    <button onClick={handleSave} disabled={saving || !selectedStudent} className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 border-b-[6px] ${saving || !selectedStudent ? 'bg-slate-200 text-slate-400 border-slate-300' : 'bg-[#fbbf24] text-slate-950 border-amber-500 hover:bg-amber-300 active:scale-95'}`}>
                      {saving ? 'Saving...' : '💾 Submit Record (သိမ်းမည်)'}
                    </button>
                  </div>

                </div>
             </div>
          </div>

          {/* ── RIGHT: HISTORY ── */}
          <div className="flex flex-col h-full min-h-[500px]">
             <div className="bg-white rounded-[2rem] border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col h-full">
                <h2 className="text-sm uppercase tracking-widest text-slate-800 mb-6 pb-3 border-b border-slate-100 flex items-center gap-2 shrink-0"><span className="text-2xl">📋</span> Recent Notes <span className="text-[10px] text-sky-600 bg-sky-50 px-2 py-1 rounded-md ml-2">မှတ်တမ်းဟောင်းများ</span></h2>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
                  {loading ? (
                    <div className="text-center py-20 text-slate-400 animate-pulse text-xs font-black uppercase tracking-widest">Loading history...</div>
                  ) : notesHistory.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-xs font-black uppercase tracking-widest border border-dashed border-slate-200 rounded-3xl">No records found.</div>
                  ) : (
                    notesHistory.map((note, i) => {
                      const cat = CATEGORIES.find(c => c.id === note.Category) || CATEGORIES[3];
                      return (
                        <div key={i} className="bg-slate-50 border border-slate-100 p-5 rounded-[1.5rem] hover:shadow-md transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-white shrink-0 group-hover:scale-110 transition-transform ${cat.bg}`}>{cat.icon}</div>
                              <div>
                                <p className="text-sm font-black text-slate-900 leading-none mb-1.5">{note.Name}</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">ID: {note.Student_ID} {note.Grade ? `· G-${note.Grade}` : ''}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 pl-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{formatDateDisplay(note.Date)}</p>
                              <span className={`inline-block mt-2 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${cat.bg} ${cat.color} border-${cat.color.split('-')[1]}-200`}>{cat.nameEn}</span>
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 mb-3 shadow-sm">
                            <p className="text-[12px] md:text-[13px] text-slate-700 leading-relaxed font-bold break-words">"{note.Note}"</p>
                          </div>
                          <div className="flex justify-end items-center gap-2">
                            <span className="text-[8px] text-slate-400 uppercase tracking-widest font-black">Recorded by</span>
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase font-black">{note.Recorded_By || 'Unknown'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}