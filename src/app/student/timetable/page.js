"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';
import { apiService } from '@/lib/api-service';

const DAYS       = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Lavender palette ─────────────────────────────────────────────────────────
const C = {
  bgLight  : '#CBCBE5',   // app background
  bgMid    : '#9E9ECA',   // header, accents
  bgDark   : '#6B6BA8',   // selected day, NOW badge
  cardBg   : '#FFFFFF',
  textDark : '#1E1B4B',   // deep indigo text
  textMid  : '#4C4A8E',
  textSoft : '#8886BA',
  textFaint: '#B8B6D9',
  border   : 'rgba(158,158,202,0.35)',
};

// ── Subject colour palette (vivid chip, dark text) ───────────────────────────
const PALETTE = [
  '#FCD34D','#6EE7B7','#93C5FD','#F9A8D4','#A5B4FC',
  '#FCA5A5','#86EFAC','#67E8F9','#FDE68A','#C4B5FD',
  '#FDA4AF','#BAE6FD','#BBF7D0','#FECACA','#DDD6FE',
];
const subjectColor = (() => {
  const cache = {};
  return (s) => {
    if (!s) return '#E2E8F0';
    if (cache[s]) return cache[s];
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    cache[s] = PALETTE[h % PALETTE.length];
    return cache[s];
  };
})();

// ── Time helpers ─────────────────────────────────────────────────────────────
const toMins  = (t) => { if (!t) return 9999; const [h,m]=String(t).split(':').map(Number); return h*60+(m||0); };
const to12    = (t) => { if (!t) return ''; const [hh,mm]=String(t).split(':').map(Number); if(isNaN(hh)) return t; return `${hh%12||12}:${String(mm).padStart(2,'0')} ${hh<12?'AM':'PM'}`; };
const toRange = (s,e) => s ? `${to12(s)} – ${to12(e)}` : '';

// ── Break keyword detection ──────────────────────────────────────────────────
const fixBreak = (arr) => (arr||[]).map((p,i) => {
  const lbl  = String(p.label||'').toLowerCase();
  const auto = ['break','lunch','recess','duty','assembly','prayer','chapel','နားချိန်','အနားယူ'].some(kw=>lbl.includes(kw));
  return { ...p, no:p.no??(i+1), isBreak:p.isBreak===true||p.isBreak==='true'||auto };
});

// ── Grade-specific period config ─────────────────────────────────────────────
const getGradeCfg = (cfg, grade, section) => {
  if (!cfg) return [];
  const pbg = cfg.periods_by_grade||{};
  const raw = pbg[`Grade ${grade}${section||''}`]||pbg[`Grade ${grade}`]
           || pbg[String(grade)]||pbg['default']||cfg.periods||[];
  return fixBreak(raw);
};

export default function StudentTimetablePage() {
  const router = useRouter();
  const [user,    setUser]    = useState(null);
  const [cfg,     setCfg]     = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [grade,   setGrade]   = useState('');
  const [section, setSection] = useState('');
  const [selDay,  setSelDay]  = useState('');
  const [loading, setLoading] = useState(true);
  
  // NEW: Date picker state
  const [selectedDate, setSelectedDate] = useState('');
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayReason, setHolidayReason] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('user')||sessionStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.userRole !== 'student') { router.push('/login'); return; }
    setUser(u);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Yangon' });
    setSelectedDate(today);
    setSelDay(DAYS[new Date().getDay()]);
    fetchAll(u);
  }, []);

  const extractGradeSection = (u) => {
    let g='', sec='';
    const rawGrade=u.Grade||u.grade||'', rawClass=u.Class||u.class||'';
    const rawSec=u.Section||u.section||'', rawID=u.Student_ID||u.student_id||'';
    if (rawGrade) {
      g = rawGrade.toString().replace(/^grade\s*/i,'').trim();
      sec = rawSec||(rawClass.match(/[A-Za-z]+$/)?.[0]||'');
    } else if (rawClass) {
      const m = rawClass.toString().replace(/^grade\s*/i,'').trim().match(/^(\d+)\s*([A-Za-z]?)$/);
      if (m) { g=m[1]; sec=m[2]||rawSec; } else { g=rawClass; }
    } else if (rawID) {
      const m = rawID.toString().match(/G(\d+)([A-Za-z]?)/);
      if (m) { g=m[1]; sec=m[2]||rawSec; }
    }
    return { g, sec };
  };

  const fetchAll = async (u) => {
    try {
      const { g, sec } = extractGradeSection(u);
      setGrade(g); setSection(sec);
      const [cfgRes, ttRes] = await Promise.all([
        fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getTimetableConfig'})}),
        fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getTimetable',grade:g,section:sec})}),
      ]);
      const cfgData=await cfgRes.json(), ttData=await ttRes.json();
      if (cfgData.success) setCfg(cfgData.config);
      if (ttData.success) {
        const secUp = sec ? sec.toUpperCase() : '';
        setRawRows((ttData.data||[]).filter(r => {
          if (!secUp) return true;
          const rSec=String(r.Section||'').trim().toUpperCase();
          return rSec===''||rSec===secUp;
        }));
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // NEW: Fetch effective timetable when date changes
  useEffect(() => {
    if (!cfg || !grade || !selectedDate) return;
    let cancelled = false;
    setLoading(true);
    const fetchData = async () => {
      try {
        const result = await apiService.getEffectiveTimetable(grade, section, selectedDate);
        if (result.isHoliday) {
          setIsHoliday(true);
          setHolidayReason(result.reason || 'ကျောင်းပိတ်ရက်');
          setRawRows([]);
        } else {
          setIsHoliday(false);
          // Use the returned data
          const secUp = section ? section.toUpperCase() : '';
          setRawRows((result.data||[]).filter(r => {
            if (!secUp) return true;
            const rSec=String(r.Section||'').trim().toUpperCase();
            return rSec===''||rSec===secUp;
          }));
        }
      } catch(e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; setLoading(false); };
  }, [cfg, grade, section, selectedDate]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const todayDay   = DAYS[new Date().getDay()];
  const activeDays = cfg?.days || DAYS.slice(1,6);
  const periods    = getGradeCfg(cfg, grade, section);

  // Start-time based cell map
  const cellMap = useMemo(() => {
    const map={};
    rawRows.forEach(r => {
      let day=String(r.Day||'');
      if (!DAYS.includes(day)) day=day.split('_').find(x=>DAYS.includes(x))||day;
      const pNo=String(r.Period_No??'');
      const cfgSlot=periods.find(p=>String(p.no)===pNo);
      if (cfgSlot?.start) map[`${day}__${cfgSlot.start}`]=r;
      else                map[`${day}__pno${pNo}`]=r;
    });
    return map;
  }, [rawRows, periods]);

  const getCell = (day, p) =>
    p.start ? (cellMap[`${day}__${p.start}`]||null)
            : (cellMap[`${day}__pno${String(p.no)}`]||null);

  const nowMins = new Date().getHours()*60+new Date().getMinutes();
  const currentPeriod = selDay===todayDay
    ? (periods.find(p=>p.start&&p.end&&nowMins>=toMins(p.start)&&nowMins<toMins(p.end))||null)
    : null;

  // Full frame schedule — breaks always shown, empty class periods HIDDEN
  const schedule = useMemo(() => {
    const result = [];
    for (const p of periods) {
      const cell = getCell(selDay, p);
      const isCurrent = !p.isBreak && currentPeriod?.start === p.start;
      if (p.isBreak) {
        result.push({ ...p, cell:null, isCurrent:false });
      } else if (cell || isCurrent) {
        // Only show class period if it has data OR it's the current live period
        result.push({ ...p, cell, isCurrent });
      }
      // else: skip empty periods silently
    }
    return result;
  }, [periods, selDay, rawRows, currentPeriod]);

  const gradeLabel = grade
    ? `Grade ${grade}${section?' '+section.toUpperCase():''}`
    : (user?.Grade?`Grade ${user.Grade}`:'');

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden',
                  background:C.bgLight, color:C.textDark, fontFamily:'system-ui,sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        * { box-sizing:border-box }
        .day-btn { transition:transform 0.12s, box-shadow 0.12s }
        .day-btn:hover { transform:translateY(-1px) }
        .p-card { transition:box-shadow 0.15s, transform 0.15s }
        .p-card:hover { box-shadow:0 6px 24px rgba(107,107,168,0.18); transform:translateY(-1px) }
      `}</style>

      {/* ── Header ── */}
      <div style={{ flexShrink:0, background:C.bgMid, padding:'14px 16px',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    boxShadow:'0 2px 12px rgba(107,107,168,0.25)' }}>
        <button onClick={()=>router.push('/student')}
          style={{ background:'rgba(255,255,255,0.18)', border:'none', color:'#fff',
                   cursor:'pointer', fontSize:'16px', width:'34px', height:'34px',
                   borderRadius:'50%', display:'flex', alignItems:'center',
                   justifyContent:'center', fontWeight:700 }}>←</button>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontWeight:800, fontSize:'14px', color:'#fff',
                      letterSpacing:'0.06em', margin:0, textTransform:'uppercase' }}>
            Timetable
          </p>
          <p style={{ fontSize:'10px', color:'rgba(255,255,255,0.75)', margin:0, fontWeight:600 }}>
            {gradeLabel}
          </p>
        </div>
        <div style={{ width:'34px' }}/>
      </div>

      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch',
                    paddingBottom:'80px' }}>
        <div style={{ padding:'16px', maxWidth:'480px', margin:'0 auto',
                      display:'flex', flexDirection:'column', gap:'14px' }}>

          {/* ── Date Picker ── */}
          <div style={{ background:C.cardBg, borderRadius:'18px', padding:'14px 16px', boxShadow:'0 2px 8px rgba(107,107,168,0.12)' }}>
            <p style={{ fontSize:'9px', color:C.textSoft, textTransform:'uppercase', letterSpacing:'0.15em', fontWeight:800, margin:'0 0 8px' }}>
              📅 ရက်စွဲ ရွေးပါ
            </p>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width:'100%', background:C.bgLight, border:'1px solid rgba(107,107,168,0.2)', borderRadius:'12px', padding:'10px 14px', color:C.textDark, fontSize:'14px', outline:'none' }}
            />
          </div>

          {isHoliday && (
            <div style={{ background:'#fef9c3', color:'#92400e', padding:'14px 16px', borderRadius:'18px', fontSize:14, fontWeight:600 }}>
              🏮 {holidayReason}
            </div>
          )}

          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'80px 0' }}>
              <div style={{ width:'32px', height:'32px',
                            border:`3px solid ${C.border}`,
                            borderTop:`3px solid ${C.bgDark}`,
                            borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
            </div>
          ) : !isHoliday && (
            <>
              {/* ── Day Selector ── */}
              <div style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'4px' }}>
                {activeDays.map(day => {
                  const isToday=day===todayDay, isSel=day===selDay;
                  const idx=DAYS.indexOf(day);
                  return (
                    <button key={day} onClick={()=>setSelDay(day)} className="day-btn"
                      style={{ flexShrink:0, padding:'9px 15px', borderRadius:'14px', border:'none',
                               cursor:'pointer', fontWeight:800, fontSize:'11px', textAlign:'center',
                               background: isSel   ? C.bgDark
                                         : isToday ? 'rgba(158,158,202,0.35)'
                                                   : 'rgba(255,255,255,0.55)',
                               color: isSel   ? '#fff'
                                    : isToday ? C.bgDark
                                              : C.textMid,
                               boxShadow: isSel
                                 ? '0 3px 12px rgba(107,107,168,0.35)'
                                 : '0 1px 3px rgba(107,107,168,0.10)',
                               outline: isToday && !isSel
                                 ? `2px solid ${C.bgMid}` : 'none' }}>
                      {DAYS_SHORT[idx]||day.slice(0,3)}
                      {isToday && (
                        <div style={{ fontSize:'6px', marginTop:'2px', fontWeight:700,
                                      letterSpacing:'0.05em',
                                      color: isSel ? 'rgba(255,255,255,0.8)' : C.bgDark }}>
                          TODAY
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── Schedule List ── */}
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {schedule.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px 0',
                                color:C.textFaint, fontWeight:600, fontSize:'13px' }}>
                    Timetable မသတ်မှတ်ရသေးပါ
                  </div>
                ) : schedule.map((p, i) => {
                  const c       = p.cell;
                  const isCur   = p.isCurrent;
                  const isPast  = selDay===todayDay && p.end && nowMins>toMins(p.end) && !isCur;
                  const chipBg  = c ? subjectColor(c.Subject) : null;

                  // ── Break divider ───────────────────────────────────────
                  if (p.isBreak) return (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px',
                                          padding:'2px 4px' }}>
                      <div style={{ fontSize:'8px', color:C.textFaint, minWidth:'68px',
                                    textAlign:'right', flexShrink:0, fontWeight:600 }}>
                        {p.start ? to12(p.start) : ''}
                      </div>
                      <div style={{ flex:1, height:'1px', background:C.border }}/>
                      <div style={{ fontSize:'8px', color:C.textSoft, fontWeight:700,
                                    flexShrink:0, textTransform:'uppercase',
                                    letterSpacing:'0.08em' }}>
                        {p.label}
                      </div>
                      <div style={{ flex:1, height:'1px', background:C.border }}/>
                    </div>
                  );

                  // ── Class period card ───────────────────────────────────
                  return (
                    <div key={i} className="p-card"
                      style={{ display:'flex', alignItems:'stretch', borderRadius:'18px',
                               overflow:'hidden', opacity:isPast?0.45:1,
                               background:C.cardBg,
                               boxShadow: isCur
                                 ? `0 0 0 2.5px ${C.bgDark}, 0 4px 20px rgba(107,107,168,0.20)`
                                 : '0 2px 8px rgba(107,107,168,0.12)' }}>

                      {/* Time strip */}
                      <div style={{ width:'68px', flexShrink:0, padding:'14px 8px',
                                    display:'flex', flexDirection:'column',
                                    alignItems:'center', justifyContent:'center',
                                    background: isCur ? C.bgDark : C.bgLight,
                                    borderRight:`1px solid ${C.border}` }}>
                        {p.start ? (
                          <>
                            <div style={{ fontSize:'9px', fontWeight:800, lineHeight:1.5,
                                          color: isCur ? '#fff' : C.textDark }}>
                              {to12(p.start)}
                            </div>
                            <div style={{ width:'18px', height:'1.5px',
                                          background: isCur ? 'rgba(255,255,255,0.3)' : C.border,
                                          margin:'3px 0' }}/>
                            <div style={{ fontSize:'8px', fontWeight:600, lineHeight:1.5,
                                          color: isCur ? 'rgba(255,255,255,0.6)' : C.textSoft }}>
                              {to12(p.end)}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize:'8px', fontWeight:700, textAlign:'center',
                                        color: isCur ? '#fff' : C.textSoft }}>
                            {p.label}
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex:1, minWidth:0, padding:'13px 14px',
                                    display:'flex', alignItems:'center', gap:'11px' }}>
                        {/* Color bar */}
                        <div style={{ width:'5px', flexShrink:0, alignSelf:'stretch',
                                      borderRadius:'99px',
                                      background: chipBg || C.bgLight }}/>

                        <div style={{ flex:1, minWidth:0 }}>
                          {/* Subject badge */}
                          <div style={{ display:'inline-flex', alignItems:'center',
                                        background:chipBg, borderRadius:'9px',
                                        padding:'3px 11px', marginBottom:'5px' }}>
                            <span style={{ fontSize:'12px', fontWeight:800,
                                           color:'#1E293B', letterSpacing:'0.01em' }}>
                              {c.Subject}
                            </span>
                          </div>
                          {/* Teacher & Room */}
                          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                            {c.Teacher && (
                              <span style={{ fontSize:'9px', fontWeight:600,
                                             color:C.textSoft, display:'flex',
                                             alignItems:'center', gap:'3px' }}>
                                {'👤'} {c.Teacher}
                              </span>
                            )}
                            {c.Room && (
                              <span style={{ fontSize:'9px', fontWeight:600,
                                             color:C.textSoft, display:'flex',
                                             alignItems:'center', gap:'3px' }}>
                                {'🚪'} {c.Room}
                              </span>
                            )}
                            {p.start && (
                              <span style={{ fontSize:'8px', color:C.textFaint }}>
                                {toRange(p.start, p.end)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* NOW badge */}
                        {isCur && (
                          <div style={{ flexShrink:0, background:C.bgDark, color:'#fff',
                                        fontSize:'8px', fontWeight:800, padding:'4px 10px',
                                        borderRadius:'99px', letterSpacing:'0.08em' }}>
                            NOW
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Weekly Overview Grid ── */}
              <div style={{ background:'rgba(255,255,255,0.70)', border:`1px solid ${C.border}`,
                            borderRadius:'18px', padding:'16px',
                            boxShadow:'0 2px 8px rgba(107,107,168,0.10)' }}>
                <p style={{ fontSize:'9px', color:C.textSoft, textTransform:'uppercase',
                            letterSpacing:'0.15em', fontWeight:800, margin:'0 0 12px' }}>
                  Weekly Overview
                </p>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'separate',
                                  borderSpacing:'3px', minWidth:'360px' }}>
                    <thead>
                      <tr>
                        <th style={{ padding:'4px 6px', fontSize:'8px', color:C.textSoft,
                                     textAlign:'left', fontWeight:800, textTransform:'uppercase',
                                     letterSpacing:'0.08em', minWidth:'68px' }}>
                          Time
                        </th>
                        {activeDays.map(d => (
                          <th key={d}
                            style={{ padding:'4px 6px', fontSize:'8px',
                                     color: d===todayDay ? C.bgDark : C.textSoft,
                                     textAlign:'center', fontWeight:800,
                                     textTransform:'uppercase',
                                     background: d===todayDay ? C.bgLight : 'transparent',
                                     borderRadius:'6px' }}>
                            {DAYS_SHORT[DAYS.indexOf(d)]||d.slice(0,3)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((p, pi) => {
                        if (p.isBreak) return (
                          <tr key={'brk-'+pi}>
                            <td colSpan={activeDays.length+1}
                              style={{ padding:'3px 6px', fontSize:'7px', color:C.textFaint,
                                       fontWeight:700, textAlign:'center',
                                       textTransform:'uppercase', letterSpacing:'0.06em',
                                       borderTop:`1px dashed ${C.border}`,
                                       borderBottom:`1px dashed ${C.border}` }}>
                              {p.label}{p.start ? ` · ${toRange(p.start,p.end)}` : ''}
                            </td>
                          </tr>
                        );

                        const isNowRow = currentPeriod?.start===p.start;
                        return (
                          <tr key={'row-'+pi}
                            style={{ background: isNowRow
                                       ? 'rgba(158,158,202,0.12)' : 'transparent' }}>
                            <td style={{ padding:'4px 6px', fontSize:'8px', fontWeight:700,
                                         whiteSpace:'nowrap',
                                         color: isNowRow ? C.bgDark : C.textSoft }}>
                              {p.start ? to12(p.start) : p.label}
                            </td>
                            {activeDays.map(day => {
                              const c    = getCell(day, p);
                              const isNw = day===todayDay && isNowRow;
                              const bg   = c ? subjectColor(c.Subject) : null;
                              return (
                                <td key={day} style={{ padding:'3px', textAlign:'center' }}>
                                  {c ? (
                                    <div style={{ background:bg, borderRadius:'8px',
                                                  padding:'4px 3px', fontSize:'8px',
                                                  fontWeight:800, color:'#1E293B',
                                                  whiteSpace:'nowrap', overflow:'hidden',
                                                  textOverflow:'ellipsis', maxWidth:'58px',
                                                  boxShadow: isNw
                                                    ? `0 0 0 2px ${C.bgDark}` : 'none' }}>
                                      {c.Subject?.split(' ')[0]}
                                    </div>
                                  ) : (
                                    <div style={{ color:C.textFaint, fontSize:'8px',
                                                  fontWeight:600 }}>—</div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}