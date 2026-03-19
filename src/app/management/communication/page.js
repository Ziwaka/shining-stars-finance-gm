"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const S = {
  page: { display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden', background:'#0f0a1e', color:'#fff', fontFamily:'system-ui,sans-serif' },
  header: { zIndex:40, background:'rgba(15,10,30,0.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  card:   { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'16px' },
  input:  { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  textarea: { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box', resize:'vertical', minHeight:'100px' },
  label:  { display:'block', fontSize:'9px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' },
  btn:    { background:'#fbbf24', color:'#0f172a', border:'none', borderRadius:'14px', padding:'13px', fontSize:'13px', fontWeight:900, width:'100%', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' },
  tabOn:  { background:'#fbbf24', color:'#0f172a', border:'none', borderRadius:'10px', padding:'7px 18px', fontSize:'10px', fontWeight:900, textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap' },
  tabOff: { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'none', borderRadius:'10px', padding:'7px 18px', fontSize:'10px', fontWeight:900, textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap' },
};

const EMPTY = { Title:'', Message:'', Target_Public:true, Target_Staff:true, Target_Student:true, Is_Priority:false };

export default function CommunicationPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [canPost, setCanPost] = useState(false);
  const [tab, setTab] = useState('post');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    setUser(u);
    const checkPerm = (key) => u.userRole==='management' || u[key]===true || String(u[key]||'').toUpperCase()==='TRUE';
    if (u.userRole === 'management') { setCanPost(true); fetchAnn(); return; }
    if (checkPerm('Can_Post_Announcement')) { setCanPost(true); fetchAnn(); return; }
    fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getStaffPermissions' }) })
      .then(r=>r.json()).then(res => {
        const fresh = res.success && res.data && res.data.find(s =>
          (s.Staff_ID && s.Staff_ID.toString()===u.Staff_ID?.toString()) ||
          (s.Name && (s.Name===u['Name (ALL CAPITAL)']||s.Name===u.Name)));
        if (fresh) {
          const up={...u,...fresh};
          localStorage.setItem('user',JSON.stringify(up));
          if (up['Can_Post_Announcement']===true||String(up['Can_Post_Announcement']||'').toUpperCase()==='TRUE'){
            setCanPost(true); fetchAnn(); return;
          }
        }
        router.push('/staff');
      }).catch(()=>router.push('/staff'));
  }, []);

  const fetchAnn = async () => {
    setLoading(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getAnnouncements' }) });
      const r = await res.json();
      if (r.success) setAnnouncements(r.data || []);
    } catch {}
    setLoading(false);
  };

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };

  const handlePost = async () => {
    if (!form.Title.trim()) return showMsg('Title ထည့်ပါ', 'error');
    if (!form.Message.trim()) return showMsg('Message ထည့်ပါ', 'error');
    if (!form.Target_Public && !form.Target_Staff && !form.Target_Student)
      return showMsg('Target အနည်းဆုံး ၁ ခု ရွေးပါ', 'error');
    setSaving(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({
        action:'postAnnouncement', ...form,
        Posted_By: user?.Name || user?.name || user?.username,
        userRole: 'management',
      })});
      const r = await res.json();
      if (r.success) { showMsg(r.message); setForm(EMPTY); fetchAnn(); setTab('list'); }
      else showMsg(r.message || 'Error', 'error');
    } catch { showMsg('Network error', 'error'); }
    setSaving(false);
  };

  const handleDelete = async (ann) => {
    if (!confirm(`"${ann.Title}" ကို ဖျက်မှာ သေချာပါသလား?`)) return;
    setDeleting(ann.Title);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({
        action:'deleteAnnouncement',
        Title: ann.Title, Posted_By: ann.Posted_By, Date: ann.Date,
        userRole: 'management',
      })});
      const r = await res.json();
      if (r.success) { showMsg(r.message); fetchAnn(); }
      else showMsg(r.message || 'Error', 'error');
    } catch { showMsg('Network error', 'error'); }
    setDeleting(null);
  };

  const Toggle = ({ label, val, onChange }) => (
    <button onClick={()=>onChange(!val)}
      style={{ padding:'8px 14px', borderRadius:'99px', border:'none', cursor:'pointer', fontWeight:900, fontSize:'10px',
        background: val ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)',
        color: val ? '#fbbf24' : 'rgba(255,255,255,0.35)',
        border: val ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
      {val ? '✓ ' : ''}{label}
    </button>
  );

  const isPriority = (ann) => ann.Is_Priority === true || ann.Is_Priority === 'TRUE';
  const isOwn = (ann) => {
    const me = user?.Name || user?.name || user?.username;
    return ann.Posted_By === me || user?.userRole === 'management';
  };

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>

      <div style={S.header}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'14px'}}>← Back</button>
        <div style={{textAlign:'center'}}>
          <p style={{fontWeight:900,fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.1em',margin:0}}>Communication</p>
          <p style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',margin:0,letterSpacing:'0.12em',textTransform:'uppercase'}}>Announcements</p>
        </div>
        <button onClick={fetchAnn} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'18px'}}>↻</button>
      </div>
      <div style={{flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom:'80px'}}>

      {msg && (
        <div style={{position:'fixed',top:'64px',left:'50%',transform:'translateX(-50%)',zIndex:50,padding:'8px 20px',borderRadius:'999px',fontSize:'12px',fontWeight:900,color:'#fff',background:msg.type==='error'?'#ef4444':'#10b981',boxShadow:'0 4px 20px rgba(0,0,0,0.4)',whiteSpace:'nowrap'}}>
          {msg.text}
        </div>
      )}

      {/* TABS */}
      <div style={{display:'flex',gap:'6px',padding:'12px 16px 8px'}}>
        <button onClick={()=>setTab('post')} style={tab==='post'?S.tabOn:S.tabOff}>📢 Post New</button>
        <button onClick={()=>setTab('list')} style={tab==='list'?S.tabOn:S.tabOff}>
          📋 All ({announcements.length})
        </button>
      </div>

      <div style={{padding:'0 16px'}}>
        {loading ? (
          <div style={{display:'flex',justifyContent:'center',padding:'60px 0'}}>
            <div style={{width:'32px',height:'32px',border:'3px solid rgba(255,255,255,0.1)',borderTop:'3px solid #fbbf24',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ) : (
          <>
            {/* ── POST FORM ── */}
            {tab==='post' && (
              <div style={{display:'flex',flexDirection:'column',gap:'12px',marginTop:'8px'}}>

                {/* Priority toggle */}
                <div style={{
                  background: form.Is_Priority ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)',
                  border: form.Is_Priority ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius:'14px', padding:'12px 16px',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <div>
                    <p style={{fontWeight:900,fontSize:'12px',color:form.Is_Priority?'#f87171':'rgba(255,255,255,0.5)',margin:0}}>
                      {form.Is_Priority ? '🚨 URGENT / Priority' : '📌 Normal Announcement'}
                    </p>
                    <p style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',margin:'2px 0 0'}}>Priority ဆိုရင် Marquee ပြမည်</p>
                  </div>
                  <button onClick={()=>setForm(f=>({...f,Is_Priority:!f.Is_Priority}))}
                    style={{width:'48px',height:'26px',borderRadius:'99px',border:'none',cursor:'pointer',position:'relative',
                      background:form.Is_Priority?'#ef4444':'rgba(255,255,255,0.12)'}}>
                    <div style={{width:'20px',height:'20px',background:'#fff',borderRadius:'50%',position:'absolute',top:'3px',
                      left:form.Is_Priority?'25px':'3px',transition:'left 0.2s'}}/>
                  </button>
                </div>

                {/* Title */}
                <div style={S.card}>
                  <label style={S.label}>Title *</label>
                  <input value={form.Title} onChange={e=>setForm(f=>({...f,Title:e.target.value}))}
                    placeholder="e.g. ကျောင်းပိတ်ရက် သတိပေးချက်" style={S.input}/>
                </div>

                {/* Message */}
                <div style={S.card}>
                  <label style={S.label}>Message *</label>
                  <textarea value={form.Message} onChange={e=>setForm(f=>({...f,Message:e.target.value}))}
                    placeholder="အသေးစိတ် ကြေညာချက် ရေးပါ..." style={S.textarea}/>
                  <p style={{fontSize:'9px',color:'rgba(255,255,255,0.2)',margin:'6px 0 0',textAlign:'right'}}>{form.Message.length} chars</p>
                </div>

                {/* Target */}
                <div style={S.card}>
                  <label style={{...S.label,marginBottom:'10px'}}>Target Audience (multiple ရွေးနိုင်)</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                    <Toggle label="🌐 Public" val={form.Target_Public} onChange={v=>setForm(f=>({...f,Target_Public:v}))}/>
                    <Toggle label="👔 Staff" val={form.Target_Staff} onChange={v=>setForm(f=>({...f,Target_Staff:v}))}/>
                    <Toggle label="🎓 Student" val={form.Target_Student} onChange={v=>setForm(f=>({...f,Target_Student:v}))}/>
                  </div>
                  {!form.Target_Public && !form.Target_Staff && !form.Target_Student && (
                    <p style={{color:'#f87171',fontSize:'9px',marginTop:'8px',margin:'8px 0 0'}}>⚠ အနည်းဆုံး ၁ ခု ရွေးပါ</p>
                  )}
                </div>

                {/* Preview */}
                {form.Title && (
                  <div style={{...S.card, border: form.Is_Priority?'1px solid rgba(239,68,68,0.3)':'1px solid rgba(251,191,36,0.2)', background: form.Is_Priority?'rgba(239,68,68,0.06)':'rgba(251,191,36,0.04)'}}>
                    <p style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',margin:'0 0 8px',textTransform:'uppercase',letterSpacing:'0.1em'}}>Preview</p>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
                      {form.Is_Priority && <span style={{background:'#dc2626',color:'#fff',fontSize:'8px',fontWeight:900,padding:'2px 8px',borderRadius:'99px',textTransform:'uppercase'}}>URGENT</span>}
                      <p style={{fontWeight:900,fontSize:'14px',color:'#fff',margin:0}}>{form.Title}</p>
                    </div>
                    {form.Message && <p style={{fontSize:'12px',color:'rgba(255,255,255,0.6)',margin:0,lineHeight:1.6}}>{form.Message}</p>}
                    <div style={{display:'flex',gap:'6px',marginTop:'10px',flexWrap:'wrap'}}>
                      {form.Target_Public  && <span style={{fontSize:'8px',padding:'2px 8px',borderRadius:'99px',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)'}}>🌐 Public</span>}
                      {form.Target_Staff   && <span style={{fontSize:'8px',padding:'2px 8px',borderRadius:'99px',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)'}}>👔 Staff</span>}
                      {form.Target_Student && <span style={{fontSize:'8px',padding:'2px 8px',borderRadius:'99px',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)'}}>🎓 Student</span>}
                      <span style={{fontSize:'8px',padding:'2px 8px',borderRadius:'99px',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)'}}>✍ {user?.Name||user?.name||user?.username}</span>
                    </div>
                  </div>
                )}

                <button onClick={handlePost} disabled={saving}
                  style={{...S.btn, opacity:saving?0.5:1, cursor:saving?'default':'pointer',
                    background: form.Is_Priority ? '#ef4444' : '#fbbf24',
                    color: form.Is_Priority ? '#fff' : '#0f172a'}}>
                  {saving ? 'Posting...' : form.Is_Priority ? '🚨 Post Urgent' : '📢 Post Announcement'}
                </button>
              </div>
            )}

            {/* ── LIST ── */}
            {tab==='list' && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginTop:'8px'}}>
                {announcements.length===0 ? (
                  <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.2)'}}>Announcement မရှိသေးပါ</div>
                ) : announcements.map((ann,i)=>{
                  const urgent = isPriority(ann);
                  const own = isOwn(ann);
                  const targets = [
                    ann.Target_Public===true||ann.Target_Public==='TRUE'?'🌐 Public':null,
                    ann.Target_Staff===true||ann.Target_Staff==='TRUE'?'👔 Staff':null,
                    ann.Target_Student===true||ann.Target_Student==='TRUE'?'🎓 Student':null,
                  ].filter(Boolean);
                  return (
                    <div key={i} style={{
                      background: urgent?'rgba(239,68,68,0.07)':'rgba(255,255,255,0.04)',
                      border: urgent?'1px solid rgba(239,68,68,0.25)':'1px solid rgba(255,255,255,0.08)',
                      borderRadius:'16px', padding:'14px 16px'
                    }}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',flexWrap:'wrap'}}>
                            {urgent && <span style={{background:'#dc2626',color:'#fff',fontSize:'8px',fontWeight:900,padding:'2px 8px',borderRadius:'99px',textTransform:'uppercase',flexShrink:0}}>🚨 URGENT</span>}
                            <p style={{fontWeight:900,fontSize:'14px',color:'#fff',margin:0}}>{ann.Title}</p>
                          </div>
                          <p style={{fontSize:'12px',color:'rgba(255,255,255,0.55)',margin:'0 0 10px',lineHeight:1.6}}>{ann.Message}</p>
                          <div style={{display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
                            {targets.map((t,j)=>(
                              <span key={j} style={{fontSize:'8px',padding:'2px 8px',borderRadius:'99px',background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.4)'}}>{t}</span>
                            ))}
                            <span style={{fontSize:'8px',color:'rgba(255,255,255,0.25)',marginLeft:'4px'}}>✍ {ann.Posted_By} · {ann.Date}</span>
                          </div>
                        </div>
                        {own && (
                          <button onClick={()=>handleDelete(ann)} disabled={deleting===ann.Title}
                            style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'8px',padding:'6px 10px',color:'#f87171',fontSize:'11px',cursor:'pointer',flexShrink:0,fontWeight:900,opacity:deleting===ann.Title?0.5:1}}>
                            {deleting===ann.Title?'...':'🗑'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}