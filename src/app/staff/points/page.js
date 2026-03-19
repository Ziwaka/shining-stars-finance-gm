"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const S = {
  page: { display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden', background:'#0f0a1e', color:'#fff', fontFamily:'system-ui,sans-serif' },
  header: { zIndex:40, background:'rgba(15,10,30,0.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  card:   { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'16px' },
  input:  { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  label:  { display:'block', fontSize:'9px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' },
  tabOn:  { background:'#fbbf24', color:'#0f172a', border:'none', borderRadius:'10px', padding:'7px 16px', fontSize:'10px', fontWeight:900, textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap' },
  tabOff: { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'none', borderRadius:'10px', padding:'7px 16px', fontSize:'10px', fontWeight:900, textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap' },
};
const HOUSE_PALETTE = [
  { bg:'rgba(239,68,68,0.15)',  border:'rgba(239,68,68,0.4)',  text:'#f87171' },
  { bg:'rgba(202,138,4,0.15)',  border:'rgba(202,138,4,0.4)',  text:'#facc15' },
  { bg:'rgba(34,197,94,0.15)',  border:'rgba(34,197,94,0.4)',  text:'#4ade80' },
  { bg:'rgba(37,99,235,0.15)',  border:'rgba(37,99,235,0.4)',  text:'#93c5fd' },
  { bg:'rgba(168,85,247,0.15)', border:'rgba(168,85,247,0.4)', text:'#d8b4fe' },
];
const DEFAULT_COL = { bg:'rgba(255,255,255,0.05)', border:'rgba(255,255,255,0.1)', text:'#fbbf24' };
const houseCol = (h, houses) => { const i=(houses||[]).indexOf(h); return i>=0?(HOUSE_PALETTE[i]||DEFAULT_COL):DEFAULT_COL; };
const RANK_ICONS = ['🥇','🥈','🥉','4️⃣','5️⃣'];
const getStudentName = (s) => s['Name (ALL CAPITAL)'] || s['အမည်'] || s['Name'] || '';

export default function StaffHousePointsPage() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [tab, setTab]           = useState('record');
  const [mode, setMode]         = useState('individual');
  const [categories, setCategories] = useState([]);
  const [houses, setHouses]     = useState([]);
  const [students, setStudents] = useState([]);
  const [points, setPoints]     = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [search, setSearch]         = useState('');
  const [selStudent, setSelStudent] = useState(null);
  const [selHouse, setSelHouse]     = useState('');
  const [selCategory, setSelCategory] = useState(null);
  const [eventName, setEventName]   = useState('');
  const [remark, setRemark]         = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.userRole !== 'staff' && u.userRole !== 'management') { router.push('/login'); return; }
    setUser(u);
    fetchAll(u);
  }, []);

  const fetchAll = async (u) => {
    setLoading(true);
    try {
      const [cfgRes, ptRes, stuRes] = await Promise.all([
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getHouseConfig' }) }),
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getHousePoints', recordedBy: u?.Name||u?.name }) }),
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getData', sheetName:'Student_Directory' }) }),
      ]);
      const cfg = await cfgRes.json();
      const pt  = await ptRes.json();
      const stu = await stuRes.json();
      if (cfg.success) { setCategories(cfg.categories||[]); setHouses(cfg.houses||[]); }
      if (pt.success)  { setPoints(pt.data||[]); setLeaderboard(pt.leaderboard||[]); }
      if (stu.success) setStudents(stu.data||[]);
    } catch {}
    setLoading(false);
  };

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };

  const resetForm = () => {
    setSelStudent(null); setSelHouse(''); setSelCategory(null);
    setEventName(''); setRemark(''); setSearch('');
  };

  const handleSubmit = async () => {
    if (mode==='individual' && !selStudent) return showMsg('Student ရွေးပါ', 'error');
    if (mode==='house'      && !selHouse)   return showMsg('House ရွေးပါ', 'error');
    if (!selCategory)      return showMsg('Category ရွေးပါ', 'error');
    if (!remark.trim())    return showMsg('Remark ဖြည့်ပါ', 'error');
    if (!eventName.trim()) return showMsg('Event ဖြည့်ပါ', 'error');
    const pts = selCategory.defaultPoints;
    const type = pts < 0 ? 'Deduct' : 'Award';
    setSaving(true);
    try {
      const payload = mode === 'house' ? {
        action:'recordHousePoint', Type:type,
        Student_ID:'', Name:`[House: ${selHouse}]`,
        House_Name:selHouse, House_Award:true,
        Category:selCategory.name, Points:String(pts),
        Event_Name:eventName||selCategory.name, Remark:remark,
        Recorded_By:user?.Name||user?.name||user?.username,
        userRole: user?.userRole || 'staff', staffId: user?.Staff_ID || user?.username || '',
      } : {
        action:'recordHousePoint', Type:type,
        Student_ID:selStudent['Enrollment No.']||selStudent.Student_ID||'',
        Name:getStudentName(selStudent),
        House_Name:selStudent.House||'',
        Category:selCategory.name, Points:String(pts),
        Event_Name:eventName||selCategory.name, Remark:remark,
        Recorded_By:user?.Name||user?.name||user?.username,
        userRole: user?.userRole || 'staff', staffId: user?.Staff_ID || user?.username || '',
      };
      const res = await fetch(WEB_APP_URL, { method:'POST', body:JSON.stringify(payload) });
      const r = await res.json();
      if (r.success) { showMsg(r.message||'Points မှတ်တမ်းတင်ပြီး'); resetForm(); fetchAll(user); }
      else showMsg(r.message||'Error','error');
    } catch { showMsg('Network error','error'); }
    setSaving(false);
  };

  const filteredStudents = search.length >= 2
    ? students.filter(s => {
        const en = (s['Name (ALL CAPITAL)']||s['Name']||'').toLowerCase();
        const mm = s['အမည်']||'';
        const id = (s['Enrollment No.']||s.Student_ID||'');
        return en.includes(search.toLowerCase()) || mm.includes(search) || id.includes(search);
      }).slice(0,8)
    : [];

  const myHistory = points.filter(p => p.Recorded_By===(user?.Name||user?.name||user?.username));
  const pts_num = selCategory?.defaultPoints || 0;
  const isDeduct = pts_num < 0;

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
      <div style={S.header}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'14px'}}>← Back</button>
        <div style={{textAlign:'center'}}>
          <p style={{fontWeight:900,fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.1em',margin:0}}>House Points</p>
          <p style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.12em',margin:0}}>Shining Stars</p>
        </div>
        <button onClick={()=>fetchAll(user)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'18px'}}>↻</button>
      </div>
      {msg && (
        <div style={{position:'fixed',top:'64px',left:'50%',transform:'translateX(-50%)',zIndex:50,padding:'8px 20px',borderRadius:'999px',fontSize:'12px',fontWeight:900,color:'#fff',background:msg.type==='error'?'#ef4444':'#10b981',boxShadow:'0 4px 20px rgba(0,0,0,0.4)',whiteSpace:'nowrap'}}>
          {msg.text}
        </div>
      )}
      <div style={{flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom:'80px'}}>
      <div style={{display:'flex',gap:'6px',padding:'12px 16px 8px',overflowX:'auto'}}>
        {[{id:'record',label:'📝 Record'},{id:'leaderboard',label:'🏆 Leaderboard'},{id:'history',label:'📋 My Records'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={tab===t.id?S.tabOn:S.tabOff}>{t.label}</button>
        ))}
      </div>
      <div style={{padding:'0 16px'}}>
        {loading ? (
          <div style={{display:'flex',justifyContent:'center',padding:'60px 0'}}>
            <div style={{width:'32px',height:'32px',border:'3px solid rgba(255,255,255,0.1)',borderTop:'3px solid #fbbf24',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ) : (
          <>
            {tab==='record' && (
              <div style={{display:'flex',flexDirection:'column',gap:'12px',marginTop:'8px'}}>
                {/* Mode toggle */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {[{id:'individual',icon:'👤',label:'Individual'},{id:'house',icon:'🏠',label:'By House'}].map(m=>(
                    <button key={m.id} onClick={()=>{setMode(m.id);setSelStudent(null);setSelHouse('');setSearch('');}}
                      style={{padding:'12px',borderRadius:'14px',cursor:'pointer',fontWeight:900,fontSize:'12px',
                        background:mode===m.id?'#fbbf24':'rgba(255,255,255,0.05)',
                        color:mode===m.id?'#0f172a':'rgba(255,255,255,0.4)',
                        border:mode===m.id?'2px solid transparent':'1px solid rgba(255,255,255,0.08)'}}>
                      <div style={{fontSize:'20px',marginBottom:'4px'}}>{m.icon}</div>
                      {m.label}
                    </button>
                  ))}
                </div>
                {/* Individual student search */}
                {mode==='individual' && (
                  <div style={S.card}>
                    <label style={S.label}>Student ရွေးပါ</label>
                    {selStudent ? (
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.3)',borderRadius:'12px',padding:'10px 14px'}}>
                        <div>
                          <p style={{fontWeight:900,fontSize:'13px',color:'#fbbf24',margin:0}}>{getStudentName(selStudent)}</p>
                          <p style={{fontSize:'9px',color:'rgba(255,255,255,0.4)',margin:'2px 0 0'}}>{selStudent['Enrollment No.']} · {selStudent.House}</p>
                        </div>
                        <button onClick={()=>{setSelStudent(null);setSearch('');}} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'16px'}}>✕</button>
                      </div>
                    ) : (
                      <div style={{position:'relative'}}>
                        <input value={search} onChange={e=>setSearch(e.target.value)}
                          placeholder="နာမည် (မြန်မာ/အင်္ဂလိပ်) သို့ ID ရိုက်ပါ..."
                          style={S.input} autoComplete="off"/>
                        {filteredStudents.length>0 && (
                          <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:20,background:'#1a1030',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',marginTop:'4px',overflow:'hidden',maxHeight:'220px',overflowY:'auto'}}>
                            {filteredStudents.map((s,i)=>(
                              <button key={i} onClick={()=>{setSelStudent(s);setSearch('');}}
                                style={{width:'100%',padding:'10px 14px',background:'none',border:'none',color:'#fff',cursor:'pointer',textAlign:'left',borderBottom:i<filteredStudents.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                  <div>
                                    <div style={{fontSize:'12px',fontWeight:700}}>{s['Name (ALL CAPITAL)']||s['Name']}</div>
                                    {s['အမည်'] && <div style={{fontSize:'10px',color:'rgba(255,255,255,0.4)'}}>{s['အမည်']}</div>}
                                  </div>
                                  <span style={{fontSize:'9px',color:'rgba(255,255,255,0.35)',flexShrink:0}}>{s['Enrollment No.']} · {s.House}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* House selector */}
                {mode==='house' && (
                  <div style={S.card}>
                    <label style={S.label}>House ရွေးပါ</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                      {houses.map(h=>{
                        const col=houseCol(h,houses); const sel=selHouse===h;
                        return (
                          <button key={h} onClick={()=>setSelHouse(h)}
                            style={{padding:'10px 18px',borderRadius:'12px',cursor:'pointer',fontWeight:900,fontSize:'12px',
                              background:sel?col.bg:'rgba(255,255,255,0.04)',color:sel?col.text:'rgba(255,255,255,0.5)',
                              border:`1px solid ${sel?col.border:'rgba(255,255,255,0.08)'}`}}>
                            🏠 {h}
                          </button>
                        );
                      })}
                    </div>
                    {selHouse && <p style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',margin:'8px 0 0'}}>⚠ {selHouse} House တစ်ခုလုံးကို points ပေးမည်</p>}
                  </div>
                )}
                {/* Category — split Reward / Deduct dropdowns */}
                <div style={S.card}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    {/* Reward */}
                    <div>
                      <label style={{...S.label,color:'#86efac'}}>⬆ Reward</label>
                      <select
                        value={selCategory?.defaultPoints>=0?selCategory.name:''}
                        onChange={e=>{
                          const c=categories.find(x=>x.name===e.target.value);
                          setSelCategory(c||null);
                        }}
                        style={{...S.input,cursor:'pointer',color:selCategory&&selCategory.defaultPoints>=0?'#86efac':'rgba(255,255,255,0.3)',borderColor:selCategory&&selCategory.defaultPoints>=0?'rgba(134,239,172,0.4)':'rgba(255,255,255,0.12)'}}>
                        <option value="">— ရွေးပါ —</option>
                        {categories.filter(c=>c.defaultPoints>=0).map(c=>(
                          <option key={c.name} value={c.name} style={{background:'#1a1030',color:'#fff'}}>
                            {c.name} (+{c.defaultPoints})
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Deduct */}
                    <div>
                      <label style={{...S.label,color:'#f87171'}}>⬇ Deduct</label>
                      <select
                        value={selCategory?.defaultPoints<0?selCategory.name:''}
                        onChange={e=>{
                          const c=categories.find(x=>x.name===e.target.value);
                          setSelCategory(c||null);
                        }}
                        style={{...S.input,cursor:'pointer',color:selCategory&&selCategory.defaultPoints<0?'#f87171':'rgba(255,255,255,0.3)',borderColor:selCategory&&selCategory.defaultPoints<0?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.12)'}}>
                        <option value="">— ရွေးပါ —</option>
                        {categories.filter(c=>c.defaultPoints<0).map(c=>(
                          <option key={c.name} value={c.name} style={{background:'#1a1030',color:'#fff'}}>
                            {c.name} ({c.defaultPoints})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                {/* Event + Remark */}
                <div style={S.card}>
                  <label style={S.label}>Event / ရည်ညွှန်းချက်</label>
                  <input value={eventName} onChange={e=>setEventName(e.target.value)}
                    placeholder="e.g. Science Quiz, Clean Classroom..." style={S.input}/>
                  <div style={{marginTop:'10px'}}>
                    <label style={S.label}>Remark</label>
                    <input value={remark} onChange={e=>setRemark(e.target.value)}
                      placeholder="Additional note..." style={S.input}/>
                  </div>
                </div>
                {/* Preview */}
                {selCategory && (
                  <div style={{background:isDeduct?'rgba(239,68,68,0.07)':'rgba(251,191,36,0.07)',border:`1px solid ${isDeduct?'rgba(239,68,68,0.2)':'rgba(251,191,36,0.2)'}`,borderRadius:'12px',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',margin:'0 0 2px'}}>Preview</p>
                      <p style={{fontWeight:900,fontSize:'13px',color:'#fff',margin:'0 0 1px'}}>
                        {mode==='house'?(selHouse?`🏠 ${selHouse} House`:'House မရွေးရသေး'):(selStudent?getStudentName(selStudent):'Student မရွေးရသေး')}
                      </p>
                      <p style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',margin:0}}>{selCategory.name}</p>
                    </div>
                    <p style={{fontWeight:900,fontSize:'32px',color:isDeduct?'#f87171':'#fbbf24',margin:0}}>{pts_num>0?'+':''}{pts_num}</p>
                  </div>
                )}
                <button onClick={handleSubmit} disabled={saving}
                  style={{background:isDeduct?'#ef4444':'#fbbf24',color:isDeduct?'#fff':'#0f172a',border:'none',borderRadius:'14px',padding:'14px',fontSize:'13px',fontWeight:900,width:'100%',cursor:saving?'default':'pointer',textTransform:'uppercase',letterSpacing:'0.06em',opacity:saving?0.5:1}}>
                  {saving?'Saving...':isDeduct?`⬇ Deduct ${Math.abs(pts_num)||'?'} Points`:`⬆ Award ${pts_num||'?'} Points`}
                </button>
              </div>
            )}
            {tab==='leaderboard' && (
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginTop:'8px'}}>
                {leaderboard.length===0?(<div style={{textAlign:'center',padding:'50px 0',color:'rgba(255,255,255,0.2)'}}>Points မရှိသေးပါ</div>)
                :leaderboard.map((h,i)=>{
                  const col=houseCol(h.house,houses);
                  return (
                    <div key={i} style={{background:col.bg,border:`1px solid ${col.border}`,borderRadius:'16px',padding:'16px',display:'flex',alignItems:'center',gap:'14px'}}>
                      <div style={{fontSize:'28px',flexShrink:0}}>{RANK_ICONS[i]||'⭐'}</div>
                      <div style={{flex:1}}>
                        <p style={{fontWeight:900,fontSize:'16px',color:col.text,margin:'0 0 6px'}}>{h.house}</p>
                        <div style={{height:'6px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${Math.min(100,Math.max(0,(h.total/(leaderboard[0]?.total||1))*100))}%`,background:col.text,borderRadius:'99px',transition:'width 0.8s ease'}}/>
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <p style={{fontWeight:900,fontSize:'22px',color:col.text,margin:0}}>{h.total}</p>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:0}}>pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {tab==='history' && (
              <div style={{display:'flex',flexDirection:'column',gap:'8px',marginTop:'8px'}}>
                <p style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',textAlign:'center',margin:'0 0 4px'}}>{myHistory.length} records</p>
                {myHistory.length===0?(<div style={{textAlign:'center',padding:'50px 0',color:'rgba(255,255,255,0.2)'}}>Record မရှိသေးပါ</div>)
                :myHistory.map((p,i)=>{
                  const pts=Number(p.Points||0); const col=houseCol(p.House_Name,houses);
                  const houseAward=(p.Name||'').startsWith('[House:');
                  return (
                    <div key={i} style={{...S.card,display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px',flexWrap:'wrap'}}>
                          <span style={{fontWeight:900,fontSize:'13px',color:'#fff'}}>{houseAward?`🏠 ${p.House_Name} House`:p.Name}</span>
                          <span style={{padding:'1px 8px',borderRadius:'99px',fontSize:'8px',fontWeight:900,background:col.bg,color:col.text}}>{p.House_Name}</span>
                        </div>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:0}}>{p.Category} · {p.Event_Name}</p>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.2)',margin:'2px 0 0'}}>
                          🕐 {p.DateTime||p.Date} {p.Time||''} {p.Recorded_By ? `· ✍ ${p.Recorded_By}` : ''}
                        </p>
                        {p.Remark&&<p style={{fontSize:'9px',color:'rgba(255,255,255,0.2)',fontStyle:'italic',margin:'2px 0 0'}}>{p.Remark}</p>}
                      </div>
                      <p style={{fontWeight:900,fontSize:'18px',color:pts<0?'#f87171':'#fbbf24',margin:0,flexShrink:0}}>{pts>0?'+':''}{pts}</p>
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