"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';
import { apiService } from '@/lib/api-service';

const VDAYS      = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const WEEKEND_DAYS = new Set(['Saturday','Sunday']);

// Vivid subject colors — high contrast text on colored bg
const SUBJECT_PALETTES = [
  {bg:'#1e40af',text:'#bfdbfe',accent:'#93c5fd'},
  {bg:'#6b21a8',text:'#e9d5ff',accent:'#c084fc'},
  {bg:'#065f46',text:'#a7f3d0',accent:'#6ee7b7'},
  {bg:'#92400e',text:'#fde68a',accent:'#fbbf24'},
  {bg:'#9f1239',text:'#fecdd3',accent:'#fb7185'},
  {bg:'#164e63',text:'#a5f3fc',accent:'#67e8f9'},
  {bg:'#3b0764',text:'#e9d5ff',accent:'#d8b4fe'},
  {bg:'#422006',text:'#fed7aa',accent:'#fdba74'},
  {bg:'#1a2e05',text:'#d9f99d',accent:'#bef264'},
  {bg:'#0c4a6e',text:'#bae6fd',accent:'#7dd3fc'},
];
const scMap = {};
const getSC = (subjects, subject) => {
  if (!subject) return SUBJECT_PALETTES[0];
  if (!scMap[subject]) {
    const idx = subjects.indexOf(subject);
    scMap[subject] = SUBJECT_PALETTES[(idx>=0?idx:Object.keys(scMap).length) % SUBJECT_PALETTES.length];
  }
  return scMap[subject];
};

const normPeriods = (arr) => (arr||[]).map((p,i) => {
  const lbl = String(p.label||'').toLowerCase();
  const auto = ['break','lunch','recess','duty','assembly','prayer','chapel','နားချိန်','အနားယူ'].some(kw=>lbl.includes(kw));
  return { ...p, no: String(p.no??(i+1)), isBreak: p.isBreak===true||p.isBreak==='true'||auto };
});
const getWidestPeriods = (cfg) => {
  if (!cfg) return [];
  const vals = Object.values(cfg.periods_by_grade||{});
  if (!vals.length) return normPeriods(cfg.periods||[]);
  return normPeriods(vals.reduce((a,b)=>(b||[]).length>(a||[]).length?b:a,[]));
};
const to12    = (t) => { if(!t)return''; const[hh,mm]=t.split(':').map(Number); if(isNaN(hh))return t; return`${hh%12||12}:${String(mm).padStart(2,'0')}${hh<12?'am':'pm'}`; };
const toRange = (s,e) => s?`${to12(s)} – ${to12(e)}`:'';
const toMins  = (t) => { if(!t)return 9999; const[h,m]=t.split(':').map(Number); return h*60+(m||0); };
const myName  = (u) => (u?.['Name (ALL CAPITAL)']||u?.Name||u?.name||u?.username||'').trim();

export default function StaffTimetablePage() {
  const router  = useRouter();
  const cfgRef  = useRef(null);

  const [user,        setUser]        = useState(null);
  const [cfg,         setCfg]         = useState(null);
  const [myRows,      setMyRows]      = useState([]);
  const [allRows,     setAllRows]     = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selDay,      setSelDay]      = useState('');
  const [cmpTeacher,  setCmpTeacher]  = useState('');
  const [cmpSearch,   setCmpSearch]   = useState('');
  const [showOverview,setShowOverview]= useState(false);
  
  // NEW: Date picker state
  const [selectedDate, setSelectedDate] = useState('');
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('user')||sessionStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    setUser(u);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Yangon' });
    setSelectedDate(today);
    setSelDay(VDAYS[new Date().getDay()]);
    fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getTimetableConfig'})})
      .then(r=>r.json()).then(data=>{
        if (!data.success) return;
        let raw = data.config;
        if (Array.isArray(raw.grades)) { const o={}; raw.grades.forEach(g=>{o[g]=['A'];}); raw.grades=o; }
        if (!raw.grades||typeof raw.grades!=='object') raw.grades={};
        if (!raw.periods_by_grade) raw.periods_by_grade={default:raw.periods||[]};
        raw.periods=normPeriods(raw.periods);
        Object.keys(raw.periods_by_grade).forEach(k=>{raw.periods_by_grade[k]=normPeriods(raw.periods_by_grade[k]);});
        cfgRef.current=raw; setCfg(raw);
      }).catch(()=>{});
  },[]);

  // NEW: Fetch effective timetable when date changes
  useEffect(() => {
    if (!cfg || !user || !selectedDate) return;
    const me = myName(user);
    if (!me) return;
    let cancelled = false;
    setLoading(true);
    const fetchData = async () => {
      try {
        // Fetch timetable for selected date
        const result = await apiService.getEffectiveTimetable('', '', selectedDate); // staff view, no grade/section filter needed
        if (result.isHoliday) {
          setIsHoliday(true);
          setHolidayReason(result.reason || 'ကျောင်းပိတ်ရက်');
          setMyRows([]);
          setAllRows([]);
        } else {
          setIsHoliday(false);
          // Process rows as before
          const rows = result.data || [];
          const mine = rows.filter(r => r.Teacher === me || r.Asst_Teacher === me).map(r => ({ ...r, isAsst: r.Teacher !== me }));
          const everyone = rows;
          const dedupMine = (arr) => { const seen = new Set(); return arr.filter(r => { const k = r.Day+'_'+r.Period_No; if (seen.has(k)) return false; seen.add(k); return true; }); };
          const dedupAll = (arr) => { const seen = new Set(); return arr.filter(r => { const k = r.Day+'_'+r.Period_No+'_'+r.Teacher+'_'+r.Grade+'_'+r.Section; if (seen.has(k)) return false; seen.add(k); return true; }); };
          const fp = cfg ? getWidestPeriods(cfg) : [];
          const breakNos = new Set(fp.filter(p=>p.isBreak).map(p=>p.no));
          const dmFiltered = dedupMine(mine).filter(r => !breakNos.has(r.Period_No));
          setMyRows(dmFiltered);
          setAllRows(dedupAll(everyone));
          const ts = new Set(); everyone.forEach(r => { if (r.Teacher) ts.add(r.Teacher); if (r.Asst_Teacher) ts.add(r.Asst_Teacher); }); ts.delete(me);
          setAllTeachers([...ts].sort());
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; setLoading(false); };
  }, [cfg, user, selectedDate]);

  const now      = new Date();
  const todayDay = VDAYS[now.getDay()];
  const nowMins  = now.getHours()*60+now.getMinutes();
  const me       = myName(user);
  const subjects = cfg?.subjects||[];
  const allDays  = cfg?.days||[];
  const frame    = cfg ? getWidestPeriods(cfg) : [];
  const curP     = frame.find(p=>!p.isBreak&&p.start&&p.end&&toMins(p.start)<=nowMins&&nowMins<toMins(p.end))||null;
  const myDays   = new Set(myRows.map(r=>r.Day));
  const getMyRow = (day,no) => myRows.find(r=>r.Day===day && r.Period_No===String(no));
  const getCmpRow= (day,no) => cmpTeacher?allRows.find(r=>r.Day===day && r.Period_No===String(no) && (r.Teacher===cmpTeacher||r.Asst_Teacher===cmpTeacher)):null;
  const filtered = allTeachers.filter(t=>!cmpSearch||t.toLowerCase().includes(cmpSearch.toLowerCase()));

  const handlePrint=()=>{
    let h=`<html><head><title>${me}</title><style>body{font-family:Arial;font-size:11px;padding:20px}h2{margin:0 0 6px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:center;font-size:10px}th{background:#f0f0f0}.my{background:#fffbeb}.br td{background:#fef9c3;font-style:italic}@media print{@page{margin:1cm}}</style></head><body><h2>${me} — Timetable</h2><table><tr><th>Time</th>${allDays.map(d=>`<th>${DAYS_SHORT[VDAYS.indexOf(d)]||d.slice(0,3)}</th>`).join('')}</tr>`;
    frame.forEach(p=>{
      if(p.isBreak){h+=`<tr class="br"><td colspan="${allDays.length+1}">${p.label}${p.start?' · '+toRange(p.start,p.end):''}</td></tr>`;return;}
      h+=`<tr><td>${p.start?toRange(p.start,p.end):'P'+p.no}</td>`;
      allDays.forEach(d=>{const r=getMyRow(d,p.no);h+=r?`<td class="my"><b>${r.Subject}</b><br>G${r.Grade}${r.Section}</td>`:`<td>—</td>`;});
      h+=`</tr>`;
    });
    h+=`</table></body></html>`;
    const w=window.open('','_blank'); w.document.write(h); w.document.close(); setTimeout(()=>w.print(),400);
  };

  // ─── STYLES ───────────────────────────────────────────────────────────────
  const S = {
    page:    {display:'flex',flexDirection:'column',height:'100dvh',overflow:'hidden',background:'#0a0a0f',color:'#f1f5f9',fontFamily:"'DM Sans',system-ui,sans-serif"},
    header:  {flexShrink:0,background:'#0a0a0f',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'},
    body:    {flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',paddingBottom:90},
    inner:   {padding:'0 16px 16px',maxWidth:680,margin:'0 auto',display:'flex',flexDirection:'column',gap:16},
    card:    {background:'#13131a',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,overflow:'hidden'},
    label:   {fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em'},
  };

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:0;height:0}
      `}</style>

      {/* ── Header ── */}
      <div style={S.header}>
        <button onClick={()=>router.back()} style={{background:'rgba(255,255,255,0.06)',border:'none',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:13,padding:'7px 12px',borderRadius:10,fontWeight:700}}>← Back</button>
        <div style={{textAlign:'center'}}>
          <p style={{fontWeight:900,fontSize:14,margin:0,letterSpacing:'0.02em'}}>My Timetable</p>
          {me && <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',margin:0,marginTop:1}}>{me}</p>}
        </div>
        <button onClick={handlePrint} style={{background:'rgba(255,255,255,0.06)',border:'none',color:'rgba(255,255,255,0.6)',borderRadius:10,padding:'7px 12px',cursor:'pointer',fontSize:13,fontWeight:700}}>Print</button>
      </div>

      <div style={S.body}>
        <div style={S.inner}>

          {/* ── Date Picker ── */}
          <div style={{...S.card, padding:'14px 16px'}}>
            <p style={{...S.label, margin:'0 0 8px'}}>📅 ရက်စွဲ ရွေးပါ</p>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', color:'#f1f5f9', fontSize:14, outline:'none'}}
            />
          </div>

          {isHoliday && (
            <div style={{background:'#fef9c3', color:'#92400e', padding:'14px 16px', borderRadius:16, fontSize:14, fontWeight:600}}>
              🏮 {holidayReason}
            </div>
          )}

          {loading ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:14,padding:'80px 0',animation:'fadeUp 0.4s ease'}}>
              <div style={{width:36,height:36,border:'3px solid rgba(255,255,255,0.08)',borderTop:'3px solid #fbbf24',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.3)',margin:0}}>ဒေတာဖတ်နေသည်…</p>
            </div>
          ) : !isHoliday && (<>

          {/* ── Summary cards ── */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,paddingTop:16}}>
            {[
              {label:'Classes This Week', value:`${myRows.length}`, color:'#fbbf24'},
              {label:'Active Days',        value:`${myDays.size}`,  color:'#818cf8'},
            ].map(({label,value,color})=>(
              <div key={label} style={{...S.card,padding:'14px 16px'}}>
                <p style={{...S.label,margin:'0 0 6px'}}>{label}</p>
                <p style={{fontSize:28,fontWeight:900,color,margin:0,lineHeight:1}}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Compare picker ── */}
          <div style={{...S.card,padding:'14px 16px'}}>
            <p style={{...S.label,margin:'0 0 10px'}}>🔍 ဆရာ နှိုင်းယှဉ်ကြည့်ရန်</p>
            <div style={{display:'flex',gap:8}}>
              <input value={cmpSearch} onChange={e=>setCmpSearch(e.target.value)} placeholder="ဆရာ အမည် ရှာပါ…"
                style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 14px',color:'#f1f5f9',fontSize:14,outline:'none'}}/>
              {cmpTeacher&&<button onClick={()=>{setCmpTeacher('');setCmpSearch('');}} style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.25)',color:'#fca5a5',borderRadius:10,padding:'0 14px',fontSize:13,cursor:'pointer',fontWeight:700}}>✕</button>}
            </div>
            {cmpTeacher&&(
              <div style={{marginTop:10,display:'flex',alignItems:'center',gap:8,background:'rgba(129,140,248,0.1)',border:'1px solid rgba(129,140,248,0.25)',borderRadius:10,padding:'8px 12px'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'#818cf8',flexShrink:0}}/>
                <span style={{fontSize:13,fontWeight:700,color:'#a5b4fc'}}>{cmpTeacher}</span>
              </div>
            )}
            {cmpSearch&&filtered.length>0&&(
              <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:4,maxHeight:180,overflowY:'auto'}}>
                {filtered.slice(0,10).map(t=>(
                  <button key={t} onClick={()=>{setCmpTeacher(t);setCmpSearch('');}} style={{background:t===cmpTeacher?'rgba(129,140,248,0.2)':'rgba(255,255,255,0.04)',border:`1px solid ${t===cmpTeacher?'rgba(129,140,248,0.4)':'rgba(255,255,255,0.07)'}`,color:t===cmpTeacher?'#a5b4fc':'#e2e8f0',borderRadius:10,padding:'10px 14px',cursor:'pointer',fontSize:13,fontWeight:600,textAlign:'left'}}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            {/* Legend */}
            {cmpTeacher&&(
              <div style={{marginTop:10,display:'flex',gap:12,flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:12,borderRadius:3,background:'#fbbf24'}}/><span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{me.split(' ').slice(-1)[0]}</span></div>
                <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:12,borderRadius:3,background:'#818cf8'}}/><span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{cmpTeacher.split(' ').slice(-1)[0]}</span></div>
                <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:12,borderRadius:3,background:'#f87171'}}/><span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>နှစ်ဦးလုံး Busy</span></div>
              </div>
            )}
          </div>

          {/* ── Day tabs ── */}
          <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2,scrollbarWidth:'none'}}>
            {allDays.map(day=>{
              const isT=day===todayDay, isS=day===selDay, hasMe=myDays.has(day);
              return(
                <button key={day} onClick={()=>setSelDay(day)} style={{
                  flexShrink:0,padding:'10px 16px',borderRadius:12,border:'none',cursor:'pointer',fontWeight:800,fontSize:13,
                  background:isS?'#fbbf24':isT?'rgba(251,191,36,0.12)':'rgba(255,255,255,0.05)',
                  color:isS?'#0a0a0f':isT?'#fbbf24':hasMe?'#e2e8f0':'rgba(255,255,255,0.2)',
                  outline:isT&&!isS?'2px solid rgba(251,191,36,0.35)':'none', outlineOffset:2,
                }}>
                  {DAYS_SHORT[VDAYS.indexOf(day)]||day.slice(0,3)}
                  {isT&&<div style={{fontSize:8,marginTop:2,fontWeight:900,opacity:0.7}}>TODAY</div>}
                </button>
              );
            })}
          </div>

          {/* ── Period list for selected day ── */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {frame.map((p,pi)=>{
              if(p.isBreak) return(
                <div key={pi} style={{display:'flex',alignItems:'center',gap:10,padding:'2px 4px'}}>
                  <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.25)',fontWeight:700,whiteSpace:'nowrap',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                    {p.label}{p.start?` · ${toRange(p.start,p.end)}`:''}
                  </span>
                  <div style={{flex:1,height:1,background:'rgba(255,255,255,0.06)'}}/>
                </div>
              );
              const myR  = getMyRow(selDay,p.no);
              const cmpR = getCmpRow(selDay,p.no);
              const isCur= !!(curP?.no===p.no&&selDay===todayDay);
              const isPast= selDay===todayDay&&p.end&&nowMins>toMins(p.end);
              const both = myR&&cmpR;
              const sc   = myR?getSC(subjects,myR.Subject):null;
              const scC  = cmpR?getSC(subjects,cmpR.Subject):null;

              return(
                <div key={pi} style={{
                  background:isCur?'rgba(251,191,36,0.07)':both?'rgba(239,68,68,0.07)':'#13131a',
                  border:`1px solid ${isCur?'rgba(251,191,36,0.3)':both?'rgba(239,68,68,0.25)':'rgba(255,255,255,0.06)'}`,
                  borderLeft:`3px solid ${isCur?'#fbbf24':both?'#f87171':myR?(sc?.accent||'#fbbf24'):cmpR?'#818cf8':'rgba(255,255,255,0.08)'}`,
                  borderRadius:14,padding:'14px',opacity:isPast?0.5:1,animation:'fadeUp 0.3s ease',
                }}>
                  {/* Time row */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:myR||cmpR?10:0}}>
                    <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                      {p.start?(
                        <>
                          <span style={{fontSize:15,fontWeight:800,color:isCur?'#fbbf24':'#e2e8f0'}}>{to12(p.start)}</span>
                          <span style={{fontSize:12,color:'rgba(255,255,255,0.25)'}}>– {to12(p.end)}</span>
                        </>
                      ):(
                        <span style={{fontSize:15,fontWeight:800,color:'rgba(255,255,255,0.5)'}}>Period {p.no}</span>
                      )}
                    </div>
                    <div style={{display:'flex',gap:5}}>
                      {isCur&&myR&&<span style={{background:'#fbbf24',color:'#0a0a0f',fontSize:10,fontWeight:900,padding:'3px 9px',borderRadius:99}}>NOW</span>}
                      {both&&<span style={{background:'rgba(239,68,68,0.2)',color:'#fca5a5',fontSize:10,fontWeight:800,padding:'3px 9px',borderRadius:99}}>⚠ BUSY</span>}
                      {cmpTeacher&&myR&&!cmpR&&<span style={{background:'rgba(52,211,153,0.15)',color:'#6ee7b7',fontSize:10,fontWeight:800,padding:'3px 9px',borderRadius:99}}>✓ FREE</span>}
                    </div>
                  </div>

                  {/* Class cards */}
                  {(myR||cmpR) && (
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {myR&&(
                        <div style={{flex:1,minWidth:120,background:sc?.bg||'#1e40af',borderRadius:10,padding:'10px 12px'}}>
                          <p style={{fontSize:10,fontWeight:700,color:sc?.accent||'#93c5fd',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'0.08em',opacity:0.8}}>
                            {me.split(' ').slice(-1)[0]}
                            {myR.isAsst&&' · Asst'}
                          </p>
                          <p style={{fontSize:17,fontWeight:900,color:sc?.text||'#bfdbfe',margin:'0 0 4px',lineHeight:1.2}}>{myR.Subject}</p>
                          <p style={{fontSize:12,color:sc?.accent||'#93c5fd',margin:0,opacity:0.75}}>
                            Grade {myR.Grade}{myR.Section?' · '+myR.Section:''}{myR.Room?' · 🚪'+myR.Room:''}
                          </p>
                        </div>
                      )}
                      {cmpR&&(
                        <div style={{flex:1,minWidth:120,background:scC?.bg||'#1e1b4b',borderRadius:10,padding:'10px 12px',border:'1px solid rgba(129,140,248,0.2)'}}>
                          <p style={{fontSize:10,fontWeight:700,color:'#a5b4fc',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'0.08em',opacity:0.8}}>
                            {cmpTeacher.split(' ').slice(-1)[0]}
                          </p>
                          <p style={{fontSize:17,fontWeight:900,color:scC?.text||'#e0e7ff',margin:'0 0 4px',lineHeight:1.2}}>{cmpR.Subject}</p>
                          <p style={{fontSize:12,color:'#a5b4fc',margin:0,opacity:0.75}}>
                            Grade {cmpR.Grade}{cmpR.Section?' · '+cmpR.Section:''}{cmpR.Room?' · 🚪'+cmpR.Room:''}
                          </p>
                        </div>
                      )}
                      {cmpTeacher&&myR&&!cmpR&&(
                        <div style={{flex:1,minWidth:120,background:'rgba(52,211,153,0.06)',border:'1px dashed rgba(52,211,153,0.2)',borderRadius:10,padding:'10px 12px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <p style={{fontSize:13,color:'rgba(110,231,183,0.5)',fontWeight:700,margin:0}}>— Free —</p>
                        </div>
                      )}
                    </div>
                  )}
                  {!myR&&!cmpR&&(
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.15)',margin:0,fontStyle:'italic'}}>— အားချိန် —</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Full week overview (collapsible) ── */}
          <div style={S.card}>
            <button onClick={()=>setShowOverview(v=>!v)} style={{width:'100%',background:'none',border:'none',cursor:'pointer',padding:'16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:14,fontWeight:800,color:'#e2e8f0'}}>Full Week Overview</span>
                {cmpTeacher&&<span style={{fontSize:11,color:'rgba(129,140,248,0.7)',fontWeight:700}}>vs {cmpTeacher.split(' ').slice(-1)[0]}</span>}
              </div>
              <span style={{color:'rgba(255,255,255,0.3)',fontSize:16,transition:'transform 0.2s',display:'block',transform:showOverview?'rotate(90deg)':'none'}}>›</span>
            </button>
            {showOverview&&(
              <div style={{overflowX:'auto',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:420}}>
                  <thead>
                    <tr>
                      <th style={{padding:'10px 10px',fontSize:11,color:'rgba(255,255,255,0.3)',textAlign:'left',borderBottom:'1px solid rgba(255,255,255,0.06)',minWidth:75,fontWeight:700}}>Time</th>
                      {allDays.map(d=>(
                        <th key={d} style={{padding:'10px 6px',fontSize:12,fontWeight:800,textAlign:'center',borderBottom:'1px solid rgba(255,255,255,0.06)',color:d===todayDay?'#fbbf24':WEEKEND_DAYS.has(d)?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.6)'}}>
                          {DAYS_SHORT[VDAYS.indexOf(d)]||d.slice(0,3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {frame.map((p,pi)=>{
                      if(p.isBreak) return(
                        <tr key={`b${pi}`}>
                          <td colSpan={allDays.length+1} style={{padding:'6px 10px',background:'rgba(255,255,255,0.02)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                            <span style={{fontSize:10,color:'rgba(255,255,255,0.2)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>{p.label}{p.start?' · '+toRange(p.start,p.end):''}</span>
                          </td>
                        </tr>
                      );
                      const isNow=!!(todayDay&&curP?.no===p.no);
                      return(
                        <tr key={`c${pi}`} style={{background:isNow?'rgba(251,191,36,0.04)':'transparent'}}>
                          <td style={{padding:'8px 10px',borderBottom:'1px solid rgba(255,255,255,0.04)',verticalAlign:'middle'}}>
                            <span style={{fontSize:11,fontWeight:700,color:isNow?'#fbbf24':'rgba(255,255,255,0.4)',whiteSpace:'nowrap'}}>{p.start?toRange(p.start,p.end):'P'+p.no}</span>
                          </td>
                          {allDays.map(day=>{
                            const myR =getMyRow(day,p.no);
                            const cmpR=getCmpRow(day,p.no);
                            const both=myR&&cmpR;
                            const sc  =myR?getSC(subjects,myR.Subject):null;
                            return(
                              <td key={day} style={{padding:4,borderBottom:'1px solid rgba(255,255,255,0.04)',verticalAlign:'top',textAlign:'center'}}>
                                {myR&&(
                                  <div style={{background:sc?.bg||'#1e40af',borderRadius:7,padding:'5px 4px',marginBottom:cmpR?3:0}}>
                                    <div style={{fontSize:11,fontWeight:800,color:sc?.text||'#bfdbfe',lineHeight:1.2}}>{myR.Subject}</div>
                                    <div style={{fontSize:9,color:sc?.accent||'#93c5fd',opacity:0.8,marginTop:1}}>G{myR.Grade}{myR.Section}</div>
                                  </div>
                                )}
                                {cmpR&&(
                                  <div style={{background:both?'rgba(239,68,68,0.25)':'rgba(129,140,248,0.15)',border:`1px solid ${both?'rgba(239,68,68,0.4)':'rgba(129,140,248,0.3)'}`,borderRadius:7,padding:'5px 4px'}}>
                                    <div style={{fontSize:11,fontWeight:800,color:both?'#fca5a5':'#a5b4fc',lineHeight:1.2}}>{cmpR.Subject}</div>
                                    <div style={{fontSize:9,color:both?'rgba(252,165,165,0.7)':'rgba(165,180,252,0.7)',marginTop:1}}>G{cmpR.Grade}{cmpR.Section}</div>
                                  </div>
                                )}
                                {!myR&&!cmpR&&<span style={{fontSize:10,color:'rgba(255,255,255,0.07)'}}>—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          </>)}
        </div>
      </div>
    </div>
  );
}