"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const S = {
  page: { display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'#0f0a1e', color:'#fff', fontFamily:'system-ui,sans-serif' },
  header:  { flexShrink:0, zIndex:40, background:'rgba(15,10,30,0.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  card:    { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'16px' },
  input:   { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  select:  { width:'100%', background:'rgba(15,10,30,0.9)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  label:   { display:'block', fontSize:'9px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' },
  btn:     { background:'#fbbf24', color:'#0f172a', border:'none', borderRadius:'14px', padding:'12px', fontSize:'13px', fontWeight:900, width:'100%', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' },
  btnSm:   { background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'6px 12px', fontSize:'10px', fontWeight:900, cursor:'pointer', whiteSpace:'nowrap' },
  tabOn:   { background:'#fbbf24', color:'#0f172a', border:'none', borderRadius:'10px', padding:'7px 14px', fontSize:'10px', fontWeight:900, textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap' },
  tabOff:  { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'none', borderRadius:'10px', padding:'7px 14px', fontSize:'10px', fontWeight:900, textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap' },
};

const EVENT_TYPES  = ['Holiday','Exam','Sports','Activity','Meeting','Other'];
const EVENT_COLORS = ['#fbbf24','#60a5fa','#34d399','#f87171','#c084fc','#fb923c','#e879f9'];
const DAYS_SHORT   = ['Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function CalendarTimetablePage() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [isMgt, setIsMgt]       = useState(false);
  const [tab, setTab]           = useState('calendar');
  const [cfg, setCfg]           = useState(null);
  const [events, setEvents]     = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  // Calendar state
  const today    = new Date();
  const [viewDate, setViewDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [eventForm, setEventForm] = useState({ Date:'', End_Date:'', Title:'', Type:'Holiday', Description:'', Target:'All', Color:'#fbbf24' });
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // Timetable state
  const [selGrade, setSelGrade] = useState('');
  const [selDay, setSelDay]     = useState('');
  const [editMode, setEditMode] = useState(false);
  const [ttCells, setTtCells]   = useState({}); // {day_period: {subject,teacher,room}}
  const [teacherView, setTeacherView] = useState('');

  // Config state
  const [cfgTab, setCfgTab]     = useState('periods');
  const [editCfg, setEditCfg]   = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    setUser(u);
    setIsMgt(u.userRole === 'management');
    fetchAll(u);
  }, []);

  const fetchAll = async (u) => {
    setLoading(true);
    try {
      const [cfgRes, evtRes] = await Promise.all([
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getTimetableConfig' }) }),
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getEvents' }) }),
      ]);
      const cfgData = await cfgRes.json();
      const evtData = await evtRes.json();
      if (cfgData.success) { setCfg(cfgData.config); setEditCfg(JSON.parse(JSON.stringify(cfgData.config))); if (cfgData.config.grades?.[0]) setSelGrade(cfgData.config.grades[0]); if (cfgData.config.days?.[0]) setSelDay(cfgData.config.days[0]); }
      if (evtData.success) setEvents(evtData.data || []);
    } catch {}
    setLoading(false);
  };

  const fetchTimetable = useCallback(async (grade) => {
    if (!grade) return;
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getTimetable', grade }) });
      const r = await res.json();
      if (r.success) {
        const cells = {};
        r.data.forEach(row => { cells[`${row.Day}_${row.Period_No}`] = { subject: row.Subject, teacher: row.Teacher, room: row.Room }; });
        setTtCells(cells);
        setTimetable(r.data);
      }
    } catch {}
  }, []);

  useEffect(() => { if (selGrade && tab === 'timetable') fetchTimetable(selGrade); }, [selGrade, tab]);

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };

  // ── CALENDAR HELPERS ──
  const monthKey = `${viewDate.year}-${String(viewDate.month+1).padStart(2,'0')}`;
  const monthEvents = events.filter(e => (e.Date||'').startsWith(monthKey));
  const daysInMonth = new Date(viewDate.year, viewDate.month+1, 0).getDate();
  const firstDow    = (new Date(viewDate.year, viewDate.month, 1).getDay()+6)%7; // Mon=0
  const eventsByDay = {};
  monthEvents.forEach(e => {
    const d = parseInt((e.Date||'').split('-')[2]);
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(e);
  });

  const handleSaveEvent = async () => {
    if (!eventForm.Date || !eventForm.Title) return showMsg('Date နှင့် Title ထည့်ပါ', 'error');
    setSaving(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'saveEvent', ...eventForm, Created_By: user?.Name||user?.name||user?.username, userRole: 'management' }) });
      const r = await res.json();
      if (r.success) {
        showMsg(r.message);
        setShowEventForm(false);
        setEventForm({ Date:'', End_Date:'', Title:'', Type:'Holiday', Description:'', Target:'All', Color:'#fbbf24' });
        fetchAll(user);
      } else showMsg(r.message||'Error','error');
    } catch { showMsg('Network error','error'); }
    setSaving(false);
  };

  const handleDeleteEvent = async (e) => {
    if (!confirm(`"${e.Title}" ဖျက်မှာ သေချာပါသလား?`)) return;
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'deleteEvent', Date:e.Date, Title:e.Title, userRole: 'management' }) });
      const r = await res.json();
      if (r.success) { showMsg(r.message); fetchAll(user); }
    } catch {}
  };

  // ── TIMETABLE HELPERS ──
  const handleCellChange = (day, periodNo, field, value) => {
    const key = `${day}_${periodNo}`;
    setTtCells(prev => ({ ...prev, [key]: { ...(prev[key]||{}), [field]:value } }));
  };

  const handleSaveTimetable = async () => {
    if (!selGrade) return showMsg('Grade ရွေးပါ', 'error');
    setSaving(true);
    const cells = [];
    Object.entries(ttCells).forEach(([key, val]) => {
      if (val.subject) {
        const [day, period] = key.split('_');
        cells.push({ Grade:selGrade, Day:day, Period_No:period, Subject:val.subject, Teacher:val.teacher||'', Room:val.room||'' });
      }
    });
    try {
      // Save all days for this grade
      const days = cfg?.days || [];
      for (const day of days) {
        const dayCells = cells.filter(c => c.Day === day);
        const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'saveTimetable', grade:selGrade, day, cells:dayCells, Updated_By:user?.Name||user?.name||user?.username }) });
        await res.json();
      }
      showMsg('Timetable သိမ်းပြီးပါပြီ');
      setEditMode(false);
    } catch { showMsg('Network error','error'); }
    setSaving(false);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'saveTimetableConfig', ...editCfg }) });
      const r = await res.json();
      if (r.success) { showMsg(r.message); setCfg(JSON.parse(JSON.stringify(editCfg))); }
      else showMsg(r.message||'Error','error');
    } catch { showMsg('Network error','error'); }
    setSaving(false);
  };

  // Teacher view — filter timetable by teacher
  const teacherSchedule = timetable.filter(r => !teacherView || r.Teacher === teacherView);
  const allTeachers = [...new Set(timetable.map(r=>r.Teacher).filter(Boolean))];

  const MAIN_TABS = [
    { id:'calendar',   label:'📅 Calendar' },
    { id:'timetable',  label:'📋 Timetable' },
    ...(isMgt ? [{ id:'config', label:'⚙️ Config' }] : []),
  ];

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>

      <div style={S.header}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'14px'}}>← Back</button>
        <div style={{textAlign:'center'}}>
          <p style={{fontWeight:900,fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.1em',margin:0}}>Calendar & Timetable</p>
          <p style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',margin:0,textTransform:'uppercase',letterSpacing:'0.1em'}}>Shining Stars</p>
        </div>
        <button onClick={()=>fetchAll(user)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'18px'}}>↻</button>
      </div>
      <div style={{flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom:'80px'}}>

      {msg && (
        <div style={{position:'fixed',top:'64px',left:'50%',transform:'translateX(-50%)',zIndex:50,padding:'8px 20px',borderRadius:'999px',fontSize:'12px',fontWeight:900,color:'#fff',background:msg.type==='error'?'#ef4444':'#10b981',boxShadow:'0 4px 20px rgba(0,0,0,0.4)',whiteSpace:'nowrap'}}>
          {msg.text}
        </div>
      )}

      <div style={{display:'flex',gap:'6px',padding:'12px 16px 8px',overflowX:'auto'}}>
        {MAIN_TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tab===t.id?S.tabOn:S.tabOff}>{t.label}</button>)}
      </div>

      <div style={{padding:'0 16px'}}>
        {loading ? (
          <div style={{display:'flex',justifyContent:'center',padding:'70px 0'}}>
            <div style={{width:'32px',height:'32px',border:'3px solid rgba(255,255,255,0.1)',borderTop:'3px solid #fbbf24',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ) : (
          <>
            {/* ══════════════ CALENDAR ══════════════ */}
            {tab==='calendar' && (
              <div style={{display:'flex',flexDirection:'column',gap:'12px',marginTop:'8px'}}>

                {/* Month nav */}
                <div style={{...S.card,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <button onClick={()=>setViewDate(v=>{ const d=new Date(v.year,v.month-1); return {year:d.getFullYear(),month:d.getMonth()}; })}
                    style={{...S.btnSm,background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:'20px'}}>‹</button>
                  <div style={{textAlign:'center'}}>
                    <p style={{fontWeight:900,fontSize:'16px',color:'#fff',margin:0}}>{MONTHS[viewDate.month]} {viewDate.year}</p>
                    <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:0}}>{monthEvents.length} events</p>
                  </div>
                  <button onClick={()=>setViewDate(v=>{ const d=new Date(v.year,v.month+1); return {year:d.getFullYear(),month:d.getMonth()}; })}
                    style={{...S.btnSm,background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:'20px'}}>›</button>
                </div>

                {/* Calendar grid */}
                <div style={{...S.card,padding:'12px'}}>
                  {/* Day headers */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px',marginBottom:'4px'}}>
                    {['M','T','W','T','F','S','S'].map((d,i)=>(
                      <div key={i} style={{textAlign:'center',fontSize:'9px',color:'rgba(255,255,255,0.3)',fontWeight:900,padding:'4px 0'}}>{d}</div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'2px'}}>
                    {Array(firstDow).fill(null).map((_,i)=><div key={`e${i}`}/>)}
                    {Array(daysInMonth).fill(null).map((_,i)=>{
                      const day  = i+1;
                      const isToday = day===today.getDate() && viewDate.month===today.getMonth() && viewDate.year===today.getFullYear();
                      const dayEvts = eventsByDay[day] || [];
                      return (
                        <button key={day} onClick={()=>{ setSelectedDay(day); if(isMgt){ setEventForm(f=>({...f,Date:`${viewDate.year}-${String(viewDate.month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`})); setShowEventForm(true); }}}
                          style={{border:'none',borderRadius:'8px',padding:'4px 2px',cursor:isMgt?'pointer':'default',minHeight:'36px',display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',
                            background: isToday?'rgba(251,191,36,0.2)':dayEvts.length?'rgba(255,255,255,0.06)':'transparent',
                            outline: isToday?'1px solid rgba(251,191,36,0.5)':'none'}}>
                          <span style={{fontSize:'11px',fontWeight:900,color:isToday?'#fbbf24':'rgba(255,255,255,0.7)'}}>{day}</span>
                          <div style={{display:'flex',flexWrap:'wrap',gap:'1px',justifyContent:'center'}}>
                            {dayEvts.slice(0,3).map((e,j)=>(
                              <div key={j} style={{width:'5px',height:'5px',borderRadius:'50%',background:e.Color||'#fbbf24'}}/>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Add event button */}
                {isMgt && (
                  <button onClick={()=>{ setEventForm(f=>({...f,Date:''})); setShowEventForm(true); }}
                    style={S.btn}>+ Add Event</button>
                )}

                {/* Event list */}
                {monthEvents.length > 0 && (
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.15em',fontWeight:900}}>This Month</p>
                    {monthEvents.sort((a,b)=>a.Date>b.Date?1:-1).map((e,i)=>(
                      <div key={i} style={{...S.card,padding:'12px 16px',borderLeft:`4px solid ${e.Color||'#fbbf24'}`,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px',flexWrap:'wrap'}}>
                            <span style={{fontWeight:900,fontSize:'13px'}}>{e.Title}</span>
                            <span style={{fontSize:'8px',padding:'2px 8px',borderRadius:'99px',fontWeight:900,background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)'}}>{e.Type}</span>
                          </div>
                          <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:0}}>
                            📅 {e.Date}{e.End_Date&&e.End_Date!==e.Date?' → '+e.End_Date:''} · 👥 {e.Target||'All'}
                          </p>
                          {e.Description && <p style={{fontSize:'11px',color:'rgba(255,255,255,0.45)',marginTop:'4px'}}>{e.Description}</p>}
                        </div>
                        {isMgt && (
                          <button onClick={()=>handleDeleteEvent(e)}
                            style={{background:'none',border:'none',color:'rgba(248,113,113,0.6)',cursor:'pointer',fontSize:'14px',marginLeft:'8px',padding:'4px',flexShrink:0}}>🗑</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {monthEvents.length === 0 && (
                  <div style={{textAlign:'center',padding:'30px 0',color:'rgba(255,255,255,0.2)'}}>
                    {isMgt ? 'Event မရှိသေးပါ — ထည့်ရန် ခြင်္ကေ့ ကနေ နှိပ်ပါ' : 'Event မရှိသေးပါ'}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════ TIMETABLE ══════════════ */}
            {tab==='timetable' && cfg && (
              <div style={{display:'flex',flexDirection:'column',gap:'12px',marginTop:'8px'}}>
                {/* Controls */}
                <div style={S.card}>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'flex-end'}}>
                    <div style={{flex:1,minWidth:'100px'}}>
                      <label style={S.label}>Grade</label>
                      <select value={selGrade} onChange={e=>{setSelGrade(e.target.value);setEditMode(false);}} style={S.select}>
                        {(cfg.grades||[]).map(g=><option key={g} value={g} style={{background:'#1a1030'}}>Grade {g}</option>)}
                      </select>
                    </div>
                    <div style={{flex:1,minWidth:'100px'}}>
                      <label style={S.label}>Teacher View</label>
                      <select value={teacherView} onChange={e=>setTeacherView(e.target.value)} style={S.select}>
                        <option value="" style={{background:'#1a1030'}}>All Teachers</option>
                        {allTeachers.map(t=><option key={t} value={t} style={{background:'#1a1030'}}>{t}</option>)}
                      </select>
                    </div>
                    {isMgt && (
                      <button onClick={()=>setEditMode(!editMode)}
                        style={{...S.btnSm, background:editMode?'rgba(251,191,36,0.2)':'rgba(255,255,255,0.08)', color:editMode?'#fbbf24':'rgba(255,255,255,0.6)', border:editMode?'1px solid rgba(251,191,36,0.4)':'1px solid rgba(255,255,255,0.1)'}}>
                        {editMode?'✕ Cancel':'✏️ Edit'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Timetable grid */}
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',minWidth:'600px'}}>
                    <thead>
                      <tr>
                        <th style={{padding:'8px',fontSize:'9px',color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',textAlign:'left',minWidth:'80px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>Period</th>
                        {(cfg.days||[]).map(d=>(
                          <th key={d} style={{padding:'8px',fontSize:'9px',color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.1em',textAlign:'center',borderBottom:'1px solid rgba(255,255,255,0.08)',fontWeight:900}}>
                            {DAYS_SHORT[['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(d)]||d.slice(0,3)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(cfg.periods||[]).map((p,pi)=>(
                        <tr key={pi} style={{background:pi%2===0?'rgba(255,255,255,0.02)':'transparent'}}>
                          <td style={{padding:'8px 6px',borderBottom:'1px solid rgba(255,255,255,0.04)',verticalAlign:'middle'}}>
                            <div style={{fontSize:'10px',fontWeight:900,color:p.isBreak?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.6)'}}>{p.label}</div>
                            <div style={{fontSize:'8px',color:'rgba(255,255,255,0.2)'}}>{p.start}–{p.end}</div>
                          </td>
                          {(cfg.days||[]).map(day=>{
                            const key = `${day}_${p.no}`;
                            const cell = ttCells[key] || {};
                            const highlight = teacherView && cell.teacher===teacherView;
                            if (p.isBreak) return (
                              <td key={day} style={{textAlign:'center',padding:'6px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                                <span style={{fontSize:'9px',color:'rgba(255,255,255,0.15)',fontStyle:'italic'}}>{p.label}</span>
                              </td>
                            );
                            return (
                              <td key={day} style={{padding:'4px',borderBottom:'1px solid rgba(255,255,255,0.04)',verticalAlign:'top'}}>
                                {editMode ? (
                                  <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
                                    <select value={cell.subject||''} onChange={e=>handleCellChange(day,p.no,'subject',e.target.value)}
                                      style={{...S.select,padding:'5px 8px',fontSize:'10px',borderRadius:'8px',background:'rgba(255,255,255,0.06)'}}>
                                      <option value="" style={{background:'#1a1030'}}>—</option>
                                      {(cfg.subjects||[]).map(s=><option key={s} value={s} style={{background:'#1a1030'}}>{s}</option>)}
                                    </select>
                                    <input value={cell.teacher||''} onChange={e=>handleCellChange(day,p.no,'teacher',e.target.value)}
                                      placeholder="Teacher" style={{...S.input,padding:'5px 8px',fontSize:'10px',borderRadius:'8px'}}/>
                                    <input value={cell.room||''} onChange={e=>handleCellChange(day,p.no,'room',e.target.value)}
                                      placeholder="Room" style={{...S.input,padding:'5px 8px',fontSize:'10px',borderRadius:'8px'}}/>
                                  </div>
                                ) : (
                                  <div style={{background:highlight?'rgba(251,191,36,0.12)':cell.subject?'rgba(255,255,255,0.04)':'transparent',borderRadius:'8px',padding:cell.subject?'6px 8px':'4px',border:highlight?'1px solid rgba(251,191,36,0.3)':'none',minHeight:'36px'}}>
                                    {cell.subject ? (
                                      <>
                                        <div style={{fontSize:'10px',fontWeight:900,color:highlight?'#fbbf24':'rgba(255,255,255,0.8)',lineHeight:1.2}}>{cell.subject}</div>
                                        {cell.teacher && <div style={{fontSize:'8px',color:'rgba(255,255,255,0.35)',marginTop:'2px'}}>👤 {cell.teacher}</div>}
                                        {cell.room    && <div style={{fontSize:'8px',color:'rgba(255,255,255,0.25)'}}>🚪 {cell.room}</div>}
                                      </>
                                    ) : (
                                      <div style={{fontSize:'9px',color:'rgba(255,255,255,0.1)',textAlign:'center',paddingTop:'6px'}}>—</div>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editMode && (
                  <button onClick={handleSaveTimetable} disabled={saving}
                    style={{...S.btn,opacity:saving?0.5:1,cursor:saving?'default':'pointer'}}>
                    {saving?'Saving...':'💾 Save Timetable — Grade '+selGrade}
                  </button>
                )}
              </div>
            )}

            {/* ══════════════ CONFIG (Management only) ══════════════ */}
            {tab==='config' && isMgt && editCfg && (
              <div style={{display:'flex',flexDirection:'column',gap:'12px',marginTop:'8px'}}>
                <div style={{display:'flex',gap:'6px',overflowX:'auto'}}>
                  {['periods','days','grades','subjects'].map(t=>(
                    <button key={t} onClick={()=>setCfgTab(t)}
                      style={cfgTab===t?S.tabOn:{...S.tabOff}}>
                      {t.charAt(0).toUpperCase()+t.slice(1)}
                    </button>
                  ))}
                </div>

                {/* PERIODS config */}
                {cfgTab==='periods' && (
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {editCfg.periods.map((p,i)=>(
                      <div key={i} style={{...S.card,display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:'8px',alignItems:'center'}}>
                        <div>
                          <label style={S.label}>Label</label>
                          <input value={p.label} onChange={e=>{ const a=[...editCfg.periods]; a[i]={...a[i],label:e.target.value}; setEditCfg(c=>({...c,periods:a})); }} style={S.input}/>
                        </div>
                        <div>
                          <label style={S.label}>Start</label>
                          <input type="time" value={p.start} onChange={e=>{ const a=[...editCfg.periods]; a[i]={...a[i],start:e.target.value}; setEditCfg(c=>({...c,periods:a})); }} style={S.input}/>
                        </div>
                        <div>
                          <label style={S.label}>End</label>
                          <input type="time" value={p.end} onChange={e=>{ const a=[...editCfg.periods]; a[i]={...a[i],end:e.target.value}; setEditCfg(c=>({...c,periods:a})); }} style={S.input}/>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:'4px',paddingTop:'14px'}}>
                          <button onClick={()=>{ const a=[...editCfg.periods]; a[i]={...a[i],isBreak:!a[i].isBreak}; setEditCfg(c=>({...c,periods:a})); }}
                            style={{...S.btnSm,padding:'4px 8px',fontSize:'8px',background:p.isBreak?'rgba(251,191,36,0.2)':'rgba(255,255,255,0.06)',color:p.isBreak?'#fbbf24':'rgba(255,255,255,0.4)'}}>
                            {p.isBreak?'Break':'—'}
                          </button>
                          <button onClick={()=>{ const a=editCfg.periods.filter((_,j)=>j!==i); setEditCfg(c=>({...c,periods:a})); }}
                            style={{...S.btnSm,padding:'4px 8px',fontSize:'8px',color:'rgba(248,113,113,0.7)',border:'1px solid rgba(248,113,113,0.2)'}}>✕</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={()=>{ const no=editCfg.periods.length+1; setEditCfg(c=>({...c,periods:[...c.periods,{no,label:`Period ${no}`,start:'',end:'',isBreak:false}]})); }}
                      style={{...S.btnSm,textAlign:'center'}}>+ Add Period</button>
                  </div>
                )}

                {/* DAYS config */}
                {cfgTab==='days' && (
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d=>(
                      <button key={d} onClick={()=>{ const inc=editCfg.days.includes(d); setEditCfg(c=>({...c,days:inc?c.days.filter(x=>x!==d):[...c.days,d]})); }}
                        style={{...S.card,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',border:editCfg.days.includes(d)?'1px solid rgba(251,191,36,0.4)':'1px solid rgba(255,255,255,0.08)',background:editCfg.days.includes(d)?'rgba(251,191,36,0.06)':'rgba(255,255,255,0.03)'}}>
                        <span style={{fontWeight:900,color:editCfg.days.includes(d)?'#fbbf24':'rgba(255,255,255,0.4)'}}>{d}</span>
                        <span style={{fontSize:'16px'}}>{editCfg.days.includes(d)?'✓':'○'}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* GRADES config */}
                {cfgTab==='grades' && (
                  <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                    {['KG','1','2','3','4','5','6','7','8','9','10','11','12'].map(g=>(
                      <button key={g} onClick={()=>{ const inc=editCfg.grades.includes(g); setEditCfg(c=>({...c,grades:inc?c.grades.filter(x=>x!==g):[...c.grades,g]})); }}
                        style={{padding:'10px 18px',borderRadius:'10px',border:'none',cursor:'pointer',fontWeight:900,fontSize:'13px',background:editCfg.grades.includes(g)?'#fbbf24':'rgba(255,255,255,0.06)',color:editCfg.grades.includes(g)?'#0f172a':'rgba(255,255,255,0.4)'}}>
                        G{g}
                      </button>
                    ))}
                  </div>
                )}

                {/* SUBJECTS config */}
                {cfgTab==='subjects' && (
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                      {editCfg.subjects.map((s,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'99px',padding:'4px 12px',border:'1px solid rgba(255,255,255,0.1)'}}>
                          <span style={{fontSize:'11px',color:'rgba(255,255,255,0.7)'}}>{s}</span>
                          <button onClick={()=>setEditCfg(c=>({...c,subjects:c.subjects.filter((_,j)=>j!==i)}))}
                            style={{background:'none',border:'none',color:'rgba(248,113,113,0.6)',cursor:'pointer',fontSize:'12px',padding:'0 0 0 4px'}}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:'8px'}}>
                      <input id="newSubj" placeholder="Subject နာမည်" style={{...S.input,flex:1}}/>
                      <button onClick={()=>{ const v=document.getElementById('newSubj').value.trim(); if(v){setEditCfg(c=>({...c,subjects:[...c.subjects,v]}));document.getElementById('newSubj').value='';} }}
                        style={{...S.btnSm,flexShrink:0,padding:'10px 16px'}}>+ Add</button>
                    </div>
                  </div>
                )}

                <button onClick={handleSaveConfig} disabled={saving}
                  style={{...S.btn,opacity:saving?0.5:1,cursor:saving?'default':'pointer',marginTop:'4px'}}>
                  {saving?'Saving...':'💾 Save Config'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* EVENT FORM MODAL */}
      {showEventForm && isMgt && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'flex-end',justifyContent:'center',background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)',paddingBottom:'72px'}}
          onClick={()=>setShowEventForm(false)}>
          <div style={{width:'100%',maxWidth:'420px',background:'#1a1030',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px 24px 0 0',padding:'24px',paddingBottom:'32px',display:'flex',flexDirection:'column',gap:'12px',maxHeight:'85dvh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <p style={{fontWeight:900,fontSize:'14px',margin:0}}>Add Event</p>
              <button onClick={()=>setShowEventForm(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',fontSize:'18px'}}>✕</button>
            </div>
            <div><label style={S.label}>Title *</label><input value={eventForm.Title} onChange={e=>setEventForm(f=>({...f,Title:e.target.value}))} placeholder="e.g. ပြည်ထောင်စုနေ့" style={S.input}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              <div><label style={S.label}>Start Date *</label><input type="date" value={eventForm.Date} onChange={e=>setEventForm(f=>({...f,Date:e.target.value}))} style={S.input}/></div>
              <div><label style={S.label}>End Date</label><input type="date" value={eventForm.End_Date} onChange={e=>setEventForm(f=>({...f,End_Date:e.target.value}))} style={S.input}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              <div>
                <label style={S.label}>Type</label>
                <select value={eventForm.Type} onChange={e=>setEventForm(f=>({...f,Type:e.target.value}))} style={S.select}>
                  {EVENT_TYPES.map(t=><option key={t} value={t} style={{background:'#1a1030'}}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Target</label>
                <select value={eventForm.Target} onChange={e=>setEventForm(f=>({...f,Target:e.target.value}))} style={S.select}>
                  {['All','Staff','Student','Public'].map(t=><option key={t} value={t} style={{background:'#1a1030'}}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={S.label}>Color</label>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {EVENT_COLORS.map(c=>(
                  <button key={c} onClick={()=>setEventForm(f=>({...f,Color:c}))}
                    style={{width:'28px',height:'28px',borderRadius:'50%',background:c,border:eventForm.Color===c?'3px solid #fff':'2px solid transparent',cursor:'pointer'}}/>
                ))}
              </div>
            </div>
            <div><label style={S.label}>Description</label><input value={eventForm.Description} onChange={e=>setEventForm(f=>({...f,Description:e.target.value}))} placeholder="Optional" style={S.input}/></div>
            <button onClick={handleSaveEvent} disabled={saving}
              style={{...S.btn,background:eventForm.Color,color:'#fff',opacity:saving?0.5:1}}>
              {saving?'Saving...':'+ Save Event'}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}