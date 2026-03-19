"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';
import { uploadToCloudinary } from '@/lib/cloudinary';

const STATUS_COLORS = {
  Unclaimed: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Claimed:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Closed:    'text-white/30 bg-white/5 border-white/10',
};

const EMPTY_FORM = { Item_Name:'', Description:'', Found_Location:'', Note:'', Photo_URL:'' };

export default function StaffLostFoundPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('list'); // list | report
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [selected, setSelected] = useState(null);
  const [claimName, setClaimName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    setUser(JSON.parse(saved));
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getLostFound' }) });
      const r = await res.json();
      if (r.success) setItems(r.data || []);
    } catch {}
    setLoading(false);
  };

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000); };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'lost-found');
      setForm(f => ({...f, Photo_URL: url}));
      showMsg('ပုံ upload ပြီးပါပြီ');
    } catch { showMsg('Upload မအောင်မြင်ဘူး', 'error'); }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!form.Item_Name) return showMsg('Item name ထည့်ပါ', 'error');
    setSaving(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({
        action:'submitLostFound', ...form,
        Reported_By: user?.name, Reporter_Type: 'Staff'
      })});
      const r = await res.json();
      if (r.success) { showMsg('တင်သွင်းပြီးပါပြီ'); fetchItems(); setForm(EMPTY_FORM); setTab('list'); }
      else showMsg(r.message || 'Error', 'error');
    } catch { showMsg('Network error', 'error'); }
    setSaving(false);
  };

  const handleStatusUpdate = async (lfId, status) => {
    setSaving(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({
        action:'updateLostFound', LF_ID: lfId, Status: status,
        Claimed_By: status === 'Claimed' ? claimName : '', Note: ''
      })});
      const r = await res.json();
      if (r.success) { showMsg('Update ပြီးပါပြီ'); fetchItems(); setSelected(null); setClaimName(''); }
      else showMsg(r.message || 'Error', 'error');
    } catch { showMsg('Network error', 'error'); }
    setSaving(false);
  };

  const filtered = items.filter(i => filter === 'All' || i.Status === filter);
  const unclaimed = items.filter(i => i.Status === 'Unclaimed').length;

  const card = 'bg-white/5 border border-white/10 rounded-2xl';

  return (
    <div className="min-h-screen text-white" style={{background:'#0f0a1e'}}>
      {/* HEADER */}
      <div className="sticky top-0 z-40 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center justify-between" style={{background:'#0f0a1e'}}>
        <button onClick={() => router.back()} className="text-white/40 hover:text-white text-sm transition-colors">← Back</button>
        <div className="text-center">
          <p className="text-white font-black text-sm uppercase tracking-wider">Lost & Found</p>
          {unclaimed > 0 && <p className="text-amber-400 font-black" style={{fontSize:'8px'}}>{unclaimed} unclaimed</p>}
        </div>
        <button onClick={fetchItems} className="text-white/40 hover:text-gold text-xs">↻</button>
      </div>

      {msg && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-xs font-black shadow-xl ${msg.type==='error'?'bg-red-500':'bg-emerald-500'} text-white`}>
          {msg.text}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 px-4 pt-4 pb-2">
        {[{id:'list',label:'Items List'},{id:'report',label:'+ Report Item'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab===t.id?'bg-gold text-slate-950':'bg-white/5 text-white/40 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-20 space-y-3">
        {/* ── LIST TAB ── */}
        {tab === 'list' && (
          <>
            {/* Status filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
              {['All','Unclaimed','Claimed','Closed'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${filter===s?'bg-white/20 text-white':'text-white/30 hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-white/10 rounded-full animate-spin" style={{borderTopWidth:'#fbbf24'}} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-white/20 text-sm">No items found</div>
            ) : filtered.map((item, i) => (
              <div key={i} className={`${card} p-4 cursor-pointer hover:border-white/20 transition-all`}
                onClick={() => { setSelected(item); setClaimName(''); }}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 mr-3">
                    <p className="text-white font-black text-sm">{item.Item_Name}</p>
                    <p className="text-white/40" style={{fontSize:'9px'}}>{item.Found_Location || '—'} · {item.Date}</p>
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${STATUS_COLORS[item.Status] || STATUS_COLORS.Unclaimed}`}>
                    {item.Status}
                  </span>
                </div>
                {item.Description && <p className="text-white/40 mb-2 line-clamp-2" style={{fontSize:'10px'}}>{item.Description}</p>}
                <div className="flex justify-between items-center">
                  <p className="text-white/25" style={{fontSize:'9px'}}>By: {item.Reported_By} ({item.Reporter_Type})</p>
                  {item.Photo_URL && <span className="" style={{fontSize:'9px', color:'#fbbf24'}}>📷 Photo</span>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── REPORT TAB ── */}
        {tab === 'report' && (
          <div className="space-y-4 mt-1">
            <div className={`${card} p-4 space-y-3`}>
              <p className="text-white/50 uppercase tracking-widest" style={{fontSize:'9px'}}>Item Details</p>

              {[
                { key:'Item_Name', label:'Item Name *', placeholder:'e.g. Black Wallet, iPhone, Keys' },
                { key:'Description', label:'Description', placeholder:'Color, size, brand, distinctive marks...', multiline: true },
                { key:'Found_Location', label:'Found Location', placeholder:'e.g. Classroom 3A, Canteen, Toilet' },
                { key:'Note', label:'Note', placeholder:'Optional' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-white/30 uppercase tracking-widest mb-1" style={{fontSize:'9px'}}>{f.label}</label>
                  {f.multiline ? (
                    <textarea value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                      placeholder={f.placeholder} rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-gold/50 placeholder:text-white/15 resize-none" />
                  ) : (
                    <input value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                      placeholder={f.placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs outline-none focus:border-[#fbbf24]/50 placeholder:text-white/15" />
                  )}
                </div>
              ))}
            </div>

            {/* Photo Upload */}
            <div className={`${card} p-4`}>
              <p className="text-white/50 uppercase tracking-widest mb-3" style={{fontSize:'9px'}}>Photo (Optional)</p>
              {form.Photo_URL ? (
                <div className="relative">
                  <img src={form.Photo_URL} alt="uploaded" className="w-full h-40 object-cover rounded-xl" />
                  <button onClick={() => setForm(f => ({...f, Photo_URL:''}))}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-500/80 transition-all">✕</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-28 rounded-xl border border-dashed border-white/15 cursor-pointer hover:border-gold/40 transition-all">
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-white/10 rounded-full animate-spin" style={{borderTopWidth:'#fbbf24'}} />
                  ) : (
                    <>
                      <span className="text-2xl mb-2">📷</span>
                      <span className="text-white/30 uppercase tracking-wider" style={{fontSize:'9px'}}>Tap to upload photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                </label>
              )}
            </div>

            <button onClick={handleSubmit} disabled={saving || uploading}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] ${saving||uploading?'bg-white/10 text-white/30':'bg-gold text-slate-950 shadow-lg /20'}`}>
              {saving ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="w-full max-w-sm border border-white/10 rounded-t-3xl p-6 pb-8 space-y-4" style={{background:'#1a1030'}} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <p className="text-white font-black">{selected.Item_Name}</p>
              <button onClick={() => setSelected(null)} className="text-white/30 text-lg">✕</button>
            </div>

            <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${STATUS_COLORS[selected.Status]}`}>
              {selected.Status}
            </span>

            {selected.Photo_URL && (
              <img src={selected.Photo_URL} alt="item" className="w-full h-44 object-cover rounded-2xl" />
            )}

            <div className="space-y-1.5" style={{fontSize:'10px'}}>
              {[
                ['Description', selected.Description],
                ['Found At', selected.Found_Location],
                ['Reported By', `${selected.Reported_By} (${selected.Reporter_Type})`],
                ['Date', selected.Date],
                ['Claimed By', selected.Claimed_By],
                ['Claim Date', selected.Claim_Date],
                ['Note', selected.Note],
              ].filter(([,v]) => v).map(([k,v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-white/30 w-24 flex-shrink-0">{k}</span>
                  <span className="text-white/70">{v}</span>
                </div>
              ))}
            </div>

            {selected.Status === 'Unclaimed' && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <input value={claimName} onChange={e => setClaimName(e.target.value)}
                  placeholder="Claimed by (name)..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-gold/50 placeholder:text-white/20" />
                <div className="flex gap-2">
                  <button onClick={() => handleStatusUpdate(selected.LF_ID, 'Claimed')} disabled={!claimName || saving}
                    className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${!claimName||saving?'bg-white/5 text-white/20':'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'}`}>
                    Mark Claimed
                  </button>
                  <button onClick={() => handleStatusUpdate(selected.LF_ID, 'Closed')} disabled={saving}
                    className="flex-1 py-3 rounded-xl font-black uppercase bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all" style={{fontSize:'9px'}}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}