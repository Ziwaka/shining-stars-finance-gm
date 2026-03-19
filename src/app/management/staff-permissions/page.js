"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const PERMISSIONS = [
  { key:'Can_View_Student',                label:'View Students',    icon:'👨‍🎓', desc:'Student directory ကြည့်ခွင့်' },
  { key:'Can_View_Staff',                  label:'View Staff',       icon:'👥',  desc:'Staff directory ကြည့်ခွင့်' },
  { key:'Can_Manage_Fees',                 label:'Manage Fees',      icon:'💰',  desc:'Fees မှတ်တမ်းကြည့် / ပြင်ခွင့်' },
  { key:'Can_Manage_Hostel',               label:'Manage Hostel',    icon:'🏠',  desc:'Hostel directory & inventory' },
  { key:'Can_Manage_Inventory',            label:'School Inventory', icon:'📦',  desc:'ကျောင်း inventory စီမံခန့်ခွဲခွင့်' },
  { key:'Can_Record_Note',                 label:'Registry Notes',   icon:'📒',  desc:'Student notes မှတ်တမ်းတင်ခွင့်' },
  { key:'Can_Record_Exam',                 label:'Exam Records',     icon:'📝',  desc:'Exam score မှတ်တမ်းတင် / ကြည့်ခွင့်' },
  { key:'Can_Record_Points',               label:'House Points',     icon:'⭐',  desc:'House points ထည့်ခွင့်' },
  { key:'Can_Record_Attendance_&_Leave',   label:'Attendance & Leave',icon:'✅', desc:'Attendance / leave မှတ်ခွင့်' },
  { key:'Can_Post_Announcement',           label:'Announcements',    icon:'📢',  desc:'Announcement တင်ခွင့်' },
  { key:'Can_Manage_Events',               label:'Events / Calendar', icon:'📅', desc:'Events calendar ထည့်/ပြင်ခွင့်' },
];

const toBool = v => v === true || v === 'true' || v === 'TRUE';

export default function StaffPermissionsPage() {
  const router = useRouter();
  const [staff,    setStaff]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);
  const [perms,    setPerms]    = useState({});
  const [status,   setStatus]   = useState('TRUE');
  const [msg,      setMsg]      = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.userRole !== 'management') { router.push('/login'); return; }
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getStaffPermissions' }) });
      const r   = await res.json();
      if (r.success) setStaff(r.data || []);
    } catch {}
    setLoading(false);
  };

  const showMsg = (text, type='success') => {
    setMsg({text,type});
    setTimeout(() => setMsg(null), 3500);
  };

  const selectStaff = s => {
    setSelected(s);
    const p = {};
    PERMISSIONS.forEach(({ key }) => { p[key] = toBool(s[key]); });
    setPerms(p);
    setStatus((s.Status||'TRUE').toString().toUpperCase() === 'FALSE' ? 'FALSE' : 'TRUE');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({
        action:      'updateStaffPermissions',
        Staff_ID:    selected.Staff_ID,
        Name:        selected.Name,
        permissions: perms,
        Status:      status,
      })});
      const r = await res.json();
      if (r.success) {
        showMsg('Saved ✓ — Staff re-login လုပ်မှ အကျိုးသက်ရောက်မည်');
        setStaff(prev => prev.map(s =>
          s.Staff_ID === selected.Staff_ID ? { ...s, ...perms, Status: status } : s
        ));
        setSelected(prev => ({ ...prev, ...perms, Status: status }));
      } else showMsg(r.message || 'Error', 'error');
    } catch { showMsg('Network error', 'error'); }
    setSaving(false);
  };

  const toggleAll = val => {
    const p = {};
    PERMISSIONS.forEach(({ key }) => { p[key] = val; });
    setPerms(p);
  };

  const filtered = staff.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.Name||'').toLowerCase().includes(q) || (s.Staff_ID||'').toString().toLowerCase().includes(q);
  });

  const permCount = s => PERMISSIONS.filter(({ key }) => toBool(s[key])).length;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden', background:'#0a0a0f', color:'#f1f5f9', fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:0}
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink:0, background:'#0a0a0f', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px' }}>
        <button
          onClick={() => selected ? setSelected(null) : router.push('/management/mgt-dashboard')}
          style={{ background:'rgba(255,255,255,0.06)', border:'none', color:'rgba(255,255,255,0.6)', borderRadius:'10px', padding:'8px 14px', cursor:'pointer', fontSize:'13px', fontWeight:700 }}>
          ← {selected ? 'Back' : 'Dashboard'}
        </button>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:900, fontSize:'14px', margin:0 }}>🔐 Staff Permissions</p>
          {selected && <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', margin:0 }}>{selected.Name}</p>}
        </div>
        {selected && (
          <button onClick={handleSave} disabled={saving}
            style={{ background:'#fbbf24', color:'#0a0a0f', border:'none', borderRadius:'10px', padding:'8px 16px', fontSize:'13px', fontWeight:900, cursor:saving?'default':'pointer', opacity:saving?0.6:1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {/* ── Toast ── */}
      {msg && (
        <div style={{ position:'fixed', top:'68px', left:'50%', transform:'translateX(-50%)', zIndex:99, padding:'9px 22px', borderRadius:'999px', fontSize:'12px', fontWeight:900, color:'#fff', background:msg.type==='error'?'#ef4444':'#10b981', boxShadow:'0 4px 24px rgba(0,0,0,0.5)', whiteSpace:'nowrap' }}>
          {msg.text}
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom:80 }}>
        <div style={{ maxWidth:600, margin:'0 auto', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>

          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'80px 0' }}>
              <div style={{ width:32, height:32, border:'3px solid rgba(255,255,255,0.08)', borderTop:'3px solid #fbbf24', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            </div>
          ) : !selected ? (
            /* ── Staff list ── */
            <>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Staff ရှာပါ…"
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'11px 14px', color:'#f1f5f9', fontSize:14, outline:'none' }}/>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', margin:0 }}>{filtered.length} staff members</p>

              {filtered.map((s, i) => {
                const active = (s.Status||'TRUE').toString().toUpperCase() !== 'FALSE';
                const pc     = permCount(s);
                return (
                  <button key={i} onClick={() => selectStaff(s)} style={{
                    background: active ? '#13131a' : 'rgba(239,68,68,0.05)',
                    border: `1px solid ${active ? 'rgba(255,255,255,0.07)' : 'rgba(239,68,68,0.2)'}`,
                    borderRadius:14, padding:'14px 16px', cursor:'pointer',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    textAlign:'left', width:'100%', animation:'fadeUp 0.2s ease',
                  }}>
                    <div>
                      <p style={{ fontWeight:800, fontSize:14, color: active?'#f1f5f9':'rgba(255,255,255,0.35)', margin:'0 0 4px' }}>{s.Name}</p>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', margin:0 }}>
                        ID: {s.Staff_ID}
                        {!active && <span style={{ marginLeft:8, color:'#f87171', fontWeight:900 }}>INACTIVE</span>}
                      </p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ display:'flex', gap:3, justifyContent:'flex-end', marginBottom:4 }}>
                        {PERMISSIONS.map(({ key, icon }) => (
                          <span key={key} style={{ fontSize:11, opacity: toBool(s[key]) ? 1 : 0.12 }}>{icon}</span>
                        ))}
                      </div>
                      <p style={{ fontSize:10, color:'rgba(255,255,255,0.25)', margin:0 }}>{pc}/{PERMISSIONS.length}</p>
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            /* ── Permission editor ── */
            <>
              {/* Account Status */}
              <div style={{ background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'14px 16px' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.1em', margin:'0 0 10px' }}>Account Status</p>
                <div style={{ display:'flex', gap:8 }}>
                  {['TRUE','FALSE'].map(v => (
                    <button key={v} onClick={() => setStatus(v)} style={{
                      flex:1, padding:'11px', borderRadius:12, border:'none', cursor:'pointer', fontWeight:800, fontSize:12,
                      background: status===v ? (v==='TRUE'?'#10b981':'#ef4444') : 'rgba(255,255,255,0.05)',
                      color: status===v ? '#fff' : 'rgba(255,255,255,0.3)',
                    }}>
                      {v==='TRUE' ? '✓ Active' : '✕ Inactive'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div style={{ background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>Permissions</p>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => toggleAll(true)}  style={{ background:'rgba(52,211,153,0.1)',  border:'1px solid rgba(52,211,153,0.2)',  color:'#34d399', borderRadius:8, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>All ON</button>
                    <button onClick={() => toggleAll(false)} style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', color:'#f87171', borderRadius:8, padding:'5px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>All OFF</button>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {PERMISSIONS.map(({ key, label, icon, desc }) => (
                    <div key={key} onClick={() => setPerms(p => ({ ...p, [key]: !p[key] }))} style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'13px 14px', borderRadius:12, cursor:'pointer',
                      background: perms[key] ? 'rgba(251,191,36,0.07)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${perms[key] ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}`,
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                        <span style={{ fontSize:22, opacity: perms[key] ? 1 : 0.25 }}>{icon}</span>
                        <div>
                          <p style={{ fontWeight:800, fontSize:13, color: perms[key]?'#f1f5f9':'rgba(255,255,255,0.35)', margin:0 }}>{label}</p>
                          <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', margin:0 }}>{desc}</p>
                        </div>
                      </div>
                      {/* Toggle switch */}
                      <div style={{ width:46, height:26, borderRadius:13, position:'relative', flexShrink:0,
                        background: perms[key] ? '#fbbf24' : 'rgba(255,255,255,0.1)', transition:'background 0.2s' }}>
                        <div style={{ position:'absolute', top:4, width:18, height:18, borderRadius:'50%', background:'#fff',
                          transition:'left 0.2s', left: perms[key] ? 24 : 4, boxShadow:'0 1px 4px rgba(0,0,0,0.4)' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{ background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.12)', borderRadius:12, padding:'12px 16px' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.4)', margin:'0 0 8px' }}>Active Permissions</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {PERMISSIONS.filter(({ key }) => perms[key]).map(({ icon, label }) => (
                    <span key={label} style={{ fontSize:11, fontWeight:700, padding:'4px 11px', borderRadius:99, background:'rgba(251,191,36,0.12)', color:'#fbbf24' }}>
                      {icon} {label}
                    </span>
                  ))}
                  {Object.values(perms).every(v => !v) && (
                    <span style={{ fontSize:12, color:'rgba(255,255,255,0.25)', fontStyle:'italic' }}>Permission မရှိပါ</span>
                  )}
                </div>
              </div>

              {/* Save button (bottom) */}
              <button onClick={handleSave} disabled={saving} style={{
                background:'#fbbf24', color:'#0a0a0f', border:'none', borderRadius:14,
                padding:'15px', fontSize:14, fontWeight:900, width:'100%',
                cursor:saving?'default':'pointer', opacity:saving?0.6:1,
                textTransform:'uppercase', letterSpacing:'0.06em',
              }}>
                {saving ? 'Saving…' : '💾 Save Permissions'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}