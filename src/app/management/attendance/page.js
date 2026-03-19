"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

// ── Date helpers ──────────────────────────────────────────────────────────────
const toMyanmarDate = (d = new Date()) =>
  d.toLocaleDateString('en-CA', { timeZone: 'Asia/Yangon' });

const displayDate = (str) => {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[+m-1]} ${y}`;
};
const shortDate = (str) => {
  if (!str) return '';
  const [, m, d] = str.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[+m-1]}`;
};

const isToday = (str) => str === toMyanmarDate();

// Generate past N calendar days (newest first), excluding Sundays
const getPastDays = (n, fromDate) => {
  const days = [];
  const base = fromDate ? new Date(fromDate) : new Date();
  for (let i = 0; days.length < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    if (d.getDay() !== 0) { // skip Sunday
      days.push(toMyanmarDate(d));
    }
    if (i > 60) break; // safety
  }
  return days;
};

// ── Color helpers ─────────────────────────────────────────────────────────────
const C = {
  bg:     '#07080f',
  surf:   '#0d0f1a',
  surf2:  '#121525',
  border: 'rgba(255,255,255,0.07)',
  muted:  'rgba(255,255,255,0.3)',
  text:   'rgba(255,255,255,0.88)',
  gold:   '#fbbf24',
  green:  '#34d399',
  amber:  '#fb923c',
  red:    '#f87171',
  blue:   '#60a5fa',
  purple: '#a78bfa',
};

const pctColor = (p) => p >= 90 ? C.green : p >= 75 ? C.gold : p >= 60 ? C.amber : C.red;

const STATUS_COLOR = {
  green:  { bg:'rgba(52,211,153,0.1)',  border:'rgba(52,211,153,0.35)',  text:'#34d399', label:'All Clear' },
  yellow: { bg:'rgba(251,191,36,0.1)',  border:'rgba(251,191,36,0.35)',  text:'#fbbf24', label:'Pending'   },
  red:    { bg:'rgba(248,113,113,0.1)', border:'rgba(248,113,113,0.35)', text:'#f87171', label:'Rejected'  },
};
const LEAVE_STATUS_COLOR = { Approved:'#34d399', Pending:'#fbbf24', Rejected:'#f87171' };

// ── Donut ─────────────────────────────────────────────────────────────────────
function Donut({ pct, color, size = 72 }) {
  const r = 14, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" style={{ flexShrink:0, transform:'rotate(-90deg)' }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`} strokeLinecap="round"/>
      <text x="18" y="21" textAnchor="middle" fill={color} fontSize="7" fontWeight="900"
        transform="rotate(90,18,18)">{pct}%</text>
    </svg>
  );
}

// ── Summary card (today view) ─────────────────────────────────────────────────
function SummaryCard({ icon, label, data }) {
  const col = STATUS_COLOR[data.color] || STATUS_COLOR.green;
  return (
    <div style={{ background:col.bg, border:`1px solid ${col.border}`, borderRadius:'18px',
      padding:'18px 20px', display:'flex', alignItems:'center', gap:'16px',
      position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px',
        background:`linear-gradient(90deg,${col.text}cc,${col.text}11)` }}/>
      <Donut pct={data.pct} color={col.text} size={80}/>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
          <span style={{ fontSize:'16px' }}>{icon}</span>
          <span style={{ fontSize:'10px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:900 }}>{label}</span>
          <span style={{ fontSize:'7px', padding:'2px 8px', borderRadius:'99px',
            background:col.text+'22', color:col.text, fontWeight:900,
            textTransform:'uppercase', letterSpacing:'0.08em' }}>{col.label}</span>
        </div>
        <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
          {[{l:'Present',v:data.present,c:'#34d399'},{l:'Absent',v:data.absent,c:data.absent>0?col.text:C.muted},{l:'Total',v:data.total,c:C.text}].map((x,i)=>(
            <div key={i}>
              <div style={{ fontSize:'22px', fontWeight:900, color:x.c, lineHeight:1 }}>{x.v}</div>
              <div style={{ fontSize:'8px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:'2px' }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Class card ────────────────────────────────────────────────────────────────
function ClassCard({ cls }) {
  const [open, setOpen] = useState(false);
  const col = STATUS_COLOR[cls.color] || STATUS_COLOR.green;
  return (
    <div style={{ background:col.bg, border:`1px solid ${col.border}`, borderRadius:'14px', overflow:'hidden' }}>
      <div onClick={() => cls.absentList.length > 0 && setOpen(o=>!o)}
        style={{ display:'flex', alignItems:'center', gap:'12px', padding:'14px 16px',
          cursor:cls.absentList.length > 0 ? 'pointer':'default' }}>
        <Donut pct={cls.pct} color={col.text} size={56}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px', flexWrap:'wrap' }}>
            <span style={{ fontWeight:900, fontSize:'14px', color:C.text }}>Grade {cls.grade}</span>
            {cls.section && <span style={{ fontSize:'9px', background:'rgba(255,255,255,0.07)', color:C.muted, padding:'2px 8px', borderRadius:'6px', fontWeight:900 }}>{cls.section}</span>}
            <span style={{ fontSize:'7px', padding:'2px 8px', borderRadius:'99px',
              background:col.text+'22', color:col.text, fontWeight:900, textTransform:'uppercase', marginLeft:'auto' }}>{col.label}</span>
          </div>
          <div style={{ display:'flex', gap:'10px', fontSize:'9px' }}>
            <span style={{ color:'#34d399' }}>✓ {cls.present} present</span>
            {cls.absent > 0 && <span style={{ color:col.text }}>✗ {cls.absent} absent</span>}
            <span style={{ color:C.muted }}>/ {cls.total} total</span>
          </div>
        </div>
        {cls.absentList.length > 0 && (
          <span style={{ color:C.muted, fontSize:'12px', transform:open?'rotate(180deg)':'none', transition:'transform 0.2s' }}>▼</span>
        )}
      </div>
      {open && cls.absentList.length > 0 && (
        <div style={{ borderTop:`1px solid ${C.border}`, padding:'0 16px 14px' }}>
          {cls.absentList.map((a,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0',
              borderBottom:i<cls.absentList.length-1?`1px solid ${C.border}`:'none' }}>
              <div>
                <div style={{ fontSize:'12px', color:C.text, fontWeight:700 }}>{a.name}</div>
                <div style={{ fontSize:'8px', color:C.muted, marginTop:'1px' }}>{a.leaveType} · {a.days}d</div>
              </div>
              <span style={{ fontSize:'8px', fontWeight:900, padding:'3px 10px', borderRadius:'99px',
                background:(LEAVE_STATUS_COLOR[a.status]||'#aaa')+'22', color:LEAVE_STATUS_COLOR[a.status]||'#aaa',
                textTransform:'uppercase', letterSpacing:'0.06em' }}>{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StaffAbsentCard({ absentList }) {
  if (!absentList?.length) return null;
  return (
    <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:'14px', padding:'16px' }}>
      <p style={{ fontSize:'8px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.14em', fontWeight:900, margin:'0 0 12px' }}>Absent Staff List</p>
      {absentList.map((a,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0',
          borderBottom:i<absentList.length-1?`1px solid ${C.border}`:'none' }}>
          <div>
            <div style={{ fontSize:'12px', color:C.text, fontWeight:700 }}>{a.name}</div>
            <div style={{ fontSize:'8px', color:C.muted, marginTop:'1px' }}>{a.leaveType}</div>
          </div>
          <span style={{ fontSize:'8px', fontWeight:900, padding:'3px 10px', borderRadius:'99px',
            background:(LEAVE_STATUS_COLOR[a.status]||'#aaa')+'22', color:LEAVE_STATUS_COLOR[a.status]||'#aaa', textTransform:'uppercase' }}>{a.status}</span>
        </div>
      ))}
    </div>
  );
}

// ── Sparkline mini bar chart ──────────────────────────────────────────────────
function MiniBar({ value, maxVal, color }) {
  const h = maxVal > 0 ? Math.max(Math.round((value / maxVal) * 52), value > 0 ? 4 : 2) : 2;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, gap:'4px', minWidth:0 }}>
      <span style={{ fontSize:'7px', fontWeight:900, color, lineHeight:1 }}>{value > 0 ? value+'%' : ''}</span>
      <div style={{ width:'100%', maxWidth:'28px', borderRadius:'4px 4px 0 0', height:`${h}px`, background:color, opacity:0.85, transition:'height 0.5s' }}/>
    </div>
  );
}

// ── Historical Trend Section ──────────────────────────────────────────────────
function HistoricalTrend() {
  const [range,    setRange]    = useState(7);
  const [records,  setRecords]  = useState([]); // [{date, schoolPct, staffPct, schoolPresent, schoolTotal, loading, error}]
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchHistory = useCallback(async (days) => {
    setFetching(true);
    setProgress(0);
    setRecords([]);
    const dates = getPastDays(days, toMyanmarDate());
    const results = [];
    for (let i = 0; i < dates.length; i++) {
      const dt = dates[i];
      try {
        const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getAttendance', date:dt }) });
        const r   = await res.json();
        if (r.success) {
          results.push({
            date:           dt,
            schoolPct:      r.school?.pct  ?? 0,
            staffPct:       r.staff?.pct   ?? 0,
            schoolPresent:  r.school?.present ?? 0,
            schoolAbsent:   r.school?.absent  ?? 0,
            schoolTotal:    r.school?.total   ?? 0,
            staffPresent:   r.staff?.present  ?? 0,
            staffAbsent:    r.staff?.absent   ?? 0,
            staffTotal:     r.staff?.total    ?? 0,
            classes:        r.classes         ?? [],
            ok: true,
          });
        } else {
          results.push({ date:dt, schoolPct:0, staffPct:0, ok:false });
        }
      } catch {
        results.push({ date:dt, schoolPct:0, staffPct:0, ok:false });
      }
      setProgress(Math.round(((i + 1) / dates.length) * 100));
      setRecords([...results]);
    }
    setFetching(false);
  }, []);

  useEffect(() => { fetchHistory(range); }, [range]);

  const validRecords = records.filter(r => r.ok && r.schoolTotal > 0);
  // Sort oldest → newest for the chart
  const chartData = [...validRecords].sort((a,b) => a.date.localeCompare(b.date));
  const maxSchool  = Math.max(...chartData.map(r => r.schoolPct), 1);
  const maxStaff   = Math.max(...chartData.map(r => r.staffPct),  1);

  // Weekly average
  const avgSchool = validRecords.length ? Math.round(validRecords.reduce((s,r)=>s+r.schoolPct,0)/validRecords.length) : 0;
  const avgStaff  = validRecords.length ? Math.round(validRecords.reduce((s,r)=>s+r.staffPct, 0)/validRecords.length) : 0;

  // Lowest days
  const lowestSchool = [...validRecords].sort((a,b)=>a.schoolPct-b.schoolPct).slice(0,3);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

      {/* Range selector */}
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:'8px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.14em', fontWeight:900 }}>ကြည့်ချင်သော ရက်အရေအတွက်</span>
        <div style={{ display:'flex', gap:'4px' }}>
          {[5, 7, 14, 20].map(d => (
            <button key={d} onClick={() => { setRange(d); }} disabled={fetching}
              style={{ padding:'6px 12px', borderRadius:'8px', border:'none', cursor:fetching?'default':'pointer',
                fontWeight:900, fontSize:'10px', textTransform:'uppercase',
                background: range===d ? C.gold : 'rgba(255,255,255,0.06)',
                color:      range===d ? '#0a0e1a' : C.muted,
                opacity: fetching ? 0.5 : 1, transition:'all 0.15s' }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      {fetching && (
        <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:'12px', padding:'16px', display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'9px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:900 }}>
              📡 Fetching attendance data…
            </span>
            <span style={{ fontSize:'10px', color:C.gold, fontWeight:900 }}>{progress}%</span>
          </div>
          <div style={{ height:'4px', background:'rgba(255,255,255,0.06)', borderRadius:'99px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progress}%`, background:C.gold, borderRadius:'99px', transition:'width 0.3s' }}/>
          </div>
          {records.length > 0 && (
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              {records.slice(-3).map((r,i) => (
                <span key={i} style={{ fontSize:'8px', color:r.ok?C.green:C.muted, fontWeight:900 }}>
                  {r.ok ? '✓' : '—'} {shortDate(r.date)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI row */}
      {!fetching && validRecords.length > 0 && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
            {[
              { icon:'📊', label:'Days Sampled',    value: validRecords.length,      color: C.blue   },
              { icon:'🏫', label:'Avg Student %',   value: `${avgSchool}%`,           color: pctColor(avgSchool) },
              { icon:'👔', label:'Avg Staff %',     value: `${avgStaff}%`,            color: pctColor(avgStaff)  },
            ].map((k,i) => (
              <div key={i} style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:'14px',
                padding:'14px 10px', display:'flex', flexDirection:'column', gap:'5px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px',
                  background:`linear-gradient(90deg,${k.color}cc,${k.color}11)` }}/>
                <span style={{ fontSize:'16px' }}>{k.icon}</span>
                <span style={{ fontSize:'22px', fontWeight:900, color:k.color, lineHeight:1 }}>{k.value}</span>
                <span style={{ fontSize:'7px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.1em' }}>{k.label}</span>
              </div>
            ))}
          </div>

          {/* ── Student Attendance Bar Chart ── */}
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:'16px', padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <p style={{ fontSize:'8px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.16em', fontWeight:900, margin:0 }}>
                🏫 Student Attendance % — Trend
              </p>
              <span style={{ fontSize:'10px', fontWeight:900, color:pctColor(avgSchool) }}>{avgSchool}% avg</span>
            </div>
            {/* Bar chart */}
            <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:'64px', borderBottom:`1px solid ${C.border}` }}>
              {chartData.map((r,i) => {
                const h = Math.max(Math.round((r.schoolPct / 100) * 56), r.schoolPct > 0 ? 4 : 2);
                const col = pctColor(r.schoolPct);
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', minWidth:0 }}>
                    <span style={{ fontSize:'6px', fontWeight:900, color:col, lineHeight:1 }}>
                      {r.schoolPct > 0 ? r.schoolPct+'%' : ''}
                    </span>
                    <div style={{ width:'100%', maxWidth:'28px', borderRadius:'3px 3px 0 0', height:`${h}px`, background:col, transition:'height 0.6s' }}/>
                  </div>
                );
              })}
            </div>
            {/* X-axis labels */}
            <div style={{ display:'flex', gap:'3px', marginTop:'5px' }}>
              {chartData.map((r,i) => (
                <div key={i} style={{ flex:1, textAlign:'center', minWidth:0 }}>
                  <span style={{ fontSize:'6px', color:C.muted, fontWeight:700, whiteSpace:'nowrap',
                    display:'block', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {shortDate(r.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Staff Attendance Bar Chart ── */}
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:'16px', padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
              <p style={{ fontSize:'8px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.16em', fontWeight:900, margin:0 }}>
                👔 Staff Attendance % — Trend
              </p>
              <span style={{ fontSize:'10px', fontWeight:900, color:pctColor(avgStaff) }}>{avgStaff}% avg</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:'3px', height:'64px', borderBottom:`1px solid ${C.border}` }}>
              {chartData.map((r,i) => {
                const h = Math.max(Math.round((r.staffPct / 100) * 56), r.staffPct > 0 ? 4 : 2);
                const col = pctColor(r.staffPct);
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', minWidth:0 }}>
                    <span style={{ fontSize:'6px', fontWeight:900, color:col, lineHeight:1 }}>
                      {r.staffPct > 0 ? r.staffPct+'%' : ''}
                    </span>
                    <div style={{ width:'100%', maxWidth:'28px', borderRadius:'3px 3px 0 0', height:`${h}px`, background:col, transition:'height 0.6s' }}/>
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:'3px', marginTop:'5px' }}>
              {chartData.map((r,i) => (
                <div key={i} style={{ flex:1, textAlign:'center', minWidth:0 }}>
                  <span style={{ fontSize:'6px', color:C.muted, fontWeight:700, whiteSpace:'nowrap', display:'block', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {shortDate(r.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Combined table (newest first) ── */}
          <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:'16px', overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', borderBottom:`1px solid ${C.border}` }}>
              <p style={{ fontSize:'8px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.16em', fontWeight:900, margin:0 }}>
                📋 Day-by-Day Record
              </p>
            </div>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 72px 72px 72px', gap:'0',
              padding:'8px 16px', background:'rgba(255,255,255,0.03)',
              fontSize:'7px', color:C.muted, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em' }}>
              <span>Date</span>
              <span style={{ textAlign:'center' }}>Students</span>
              <span style={{ textAlign:'center' }}>Staff</span>
              <span style={{ textAlign:'center' }}>Absent</span>
            </div>
            {/* Rows — newest first */}
            {[...validRecords].sort((a,b) => b.date.localeCompare(a.date)).map((r,i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 72px 72px 72px',
                padding:'10px 16px', borderBottom:`1px solid ${C.border}`,
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                alignItems:'center' }}>
                <div>
                  <span style={{ fontSize:'11px', color:C.text, fontWeight:700 }}>{shortDate(r.date)}</span>
                  {isToday(r.date) && <span style={{ marginLeft:'6px', fontSize:'7px', background:C.gold+'33', color:C.gold, fontWeight:900, padding:'1px 6px', borderRadius:'99px', textTransform:'uppercase' }}>Today</span>}
                </div>
                <div style={{ textAlign:'center' }}>
                  <span style={{ fontSize:'14px', fontWeight:900, color:pctColor(r.schoolPct) }}>{r.schoolPct}%</span>
                </div>
                <div style={{ textAlign:'center' }}>
                  <span style={{ fontSize:'14px', fontWeight:900, color:pctColor(r.staffPct) }}>{r.staffPct}%</span>
                </div>
                <div style={{ textAlign:'center' }}>
                  <span style={{ fontSize:'12px', fontWeight:900, color:r.schoolAbsent > 0 ? C.red : C.muted }}>
                    {r.schoolAbsent > 0 ? r.schoolAbsent : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Lowest attendance days ── */}
          {lowestSchool.filter(r => r.schoolPct < 90).length > 0 && (
            <div style={{ background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'16px', padding:'16px' }}>
              <p style={{ fontSize:'8px', color:C.red, textTransform:'uppercase', letterSpacing:'0.14em', fontWeight:900, margin:'0 0 10px' }}>
                ⚠️ Low Attendance Days (below 90%)
              </p>
              {lowestSchool.filter(r => r.schoolPct < 90).map((r,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'8px 0', borderBottom: i < lowestSchool.filter(x=>x.schoolPct<90).length-1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontSize:'12px', color:C.text, fontWeight:700 }}>{displayDate(r.date)}</span>
                  <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                    <span style={{ fontSize:'9px', color:C.muted }}>👥 {r.schoolPresent}/{r.schoolTotal}</span>
                    <span style={{ fontSize:'16px', fontWeight:900, color:pctColor(r.schoolPct) }}>{r.schoolPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Color legend */}
          <div style={{ display:'flex', gap:'14px', flexWrap:'wrap', padding:'4px 0' }}>
            {[{c:C.green,l:'≥ 90%  Excellent'},{c:C.gold,l:'≥ 75%  Good'},{c:C.amber,l:'≥ 60%  Low'},{c:C.red,l:'< 60%  Critical'}].map((x,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:x.c, flexShrink:0 }}/>
                <span style={{ fontSize:'8px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>{x.l}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!fetching && validRecords.length === 0 && records.length > 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:C.muted }}>
          <div style={{ fontSize:'28px', marginBottom:'8px' }}>📭</div>
          <p style={{ fontWeight:900, fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>
            ရွေးချယ်သောကာလတွင် Attendance data မတွေ့ပါ
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const router  = useRouter();
  const [tab,     setTab]     = useState('TODAY');
  const [date,    setDate]    = useState(toMyanmarDate());
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const normalizeGrade = (obj) => {
    const g =
      obj?.grade ??
      obj?.Grade ??
      obj?.GRADE ??
      obj?.classGrade ??
      obj?.Class_Grade ??
      obj?.ClassGrade ??
      obj?.Class ??
      obj?.class ??
      obj?.Class_Name ??
      obj?.ClassName;
    if (g == null) return undefined;
    const s = String(g).trim();
    if (!s || s === '-' || s.toLowerCase() === 'unknown') return undefined;
    const m = s.match(/\d+/);
    return m ? m[0] : s;
  };

  const normalizeAttendancePayload = (res) => {
    if (!res || typeof res !== 'object') return res;
    const normPersons = (arr) =>
      (Array.isArray(arr) ? arr : []).map((p) => {
        const grade = normalizeGrade(p);
        return grade ? { ...p, grade } : p;
      });
    const normClasses = (arr) =>
      (Array.isArray(arr) ? arr : []).map((c) => {
        const grade = normalizeGrade(c);
        return grade ? { ...c, grade } : c;
      });
    return {
      ...res,
      classes: normClasses(res.classes),
      absentStudents:  normPersons(res.absentStudents),
      pendingStudents: normPersons(res.pendingStudents),
      absentStaff:     normPersons(res.absentStaff),
      pendingStaff:    normPersons(res.pendingStaff),
    };
  };

  const fetchData = useCallback(async (targetDate) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getAttendance', date:targetDate }) });
      const r   = await res.json();
      if (r.success) setData(normalizeAttendancePayload(r));
      else setError(r.message || 'Error fetching data');
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.userRole !== 'management') { router.push('/login'); return; }
    fetchData(date);
  }, []);

  const handleDateChange = (e) => { const d = e.target.value; setDate(d); fetchData(d); };
  const today = toMyanmarDate();

  const LEGEND = [
    { color:'#34d399', label:'All Approved / No Absent' },
    { color:'#fbbf24', label:'Has Pending Leave' },
    { color:'#f87171', label:'Has Rejected Leave' },
  ];

  const TABS = [
    { id:'TODAY',   label:'Today',   icon:'📅' },
    { id:'HISTORY', label:'History', icon:'📈' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden',
      background:C.bg, color:C.text, fontFamily:'system-ui,sans-serif' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        input[type=date]{color-scheme:dark}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}
      `}</style>

      {/* Header */}
      <div style={{ flexShrink:0, zIndex:40, background:'rgba(7,8,15,0.97)', backdropFilter:'blur(16px)',
        borderBottom:`1px solid ${C.border}`, padding:'11px 16px',
        display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={() => router.back()} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:'13px', padding:'4px 8px' }}>← Back</button>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontWeight:900, fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.12em', margin:0, color:C.text }}>Attendance</p>
          <p style={{ fontSize:'8px', color:'rgba(255,255,255,0.2)', margin:0 }}>Leave-based tracking</p>
        </div>
        <button onClick={() => fetchData(date)} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:'16px', padding:'4px 8px' }}>↻</button>
      </div>

      {/* Tab bar */}
      <div style={{ flexShrink:0, display:'flex', gap:'4px', padding:'8px 12px 6px',
        background:C.bg, borderBottom:`1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={ tab === t.id
              ? { background:C.gold, color:'#0a0e1a', border:'none', borderRadius:'10px', padding:'7px 16px', fontSize:'9px', fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.05em' }
              : { background:C.surf, color:C.muted, border:`1px solid ${C.border}`, borderRadius:'10px', padding:'7px 16px', fontSize:'9px', fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.05em' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom:'80px' }}>
        <div style={{ padding:'12px 14px', display:'flex', flexDirection:'column', gap:'12px' }}>

          {/* ══ TODAY TAB ══ */}
          {tab === 'TODAY' && (
            <>
              {/* Date picker */}
              <div style={{ background:C.surf, border:`1px solid ${C.border}`, borderRadius:'14px',
                padding:'14px 16px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'9px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:900, whiteSpace:'nowrap' }}>📅 View Date</span>
                <input type="date" value={date} max={today} onChange={handleDateChange}
                  style={{ flex:1, minWidth:'140px', background:'rgba(255,255,255,0.06)',
                    border:`1px solid ${C.border}`, borderRadius:'10px', padding:'8px 12px',
                    color:C.text, fontSize:'13px', fontWeight:700, outline:'none' }}/>
                {!isToday(date) && (
                  <button onClick={() => { setDate(today); fetchData(today); }}
                    style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`, borderRadius:'8px',
                      padding:'7px 14px', color:C.muted, fontSize:'9px', textTransform:'uppercase',
                      letterSpacing:'0.1em', fontWeight:900, cursor:'pointer', whiteSpace:'nowrap' }}>Today</button>
                )}
              </div>

              {/* Legend */}
              <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                {LEGEND.map((l,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:l.color, flexShrink:0 }}/>
                    <span style={{ fontSize:'8px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em' }}>{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Loading */}
              {loading && (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:'12px' }}>
                  <div style={{ width:'28px', height:'28px', border:`2px solid ${C.border}`, borderTop:'2px solid #fbbf24', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
                  <span style={{ fontSize:'9px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.15em' }}>Loading attendance…</span>
                </div>
              )}

              {/* Error */}
              {!loading && error && (
                <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)',
                  borderRadius:'14px', padding:'20px', textAlign:'center' }}>
                  <p style={{ color:'#f87171', fontWeight:900, margin:0 }}>⚠️ {error}</p>
                </div>
              )}

              {/* Data */}
              {!loading && !error && data && (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px', animation:'fadeUp 0.25s ease' }}>
                  <SummaryCard icon="🏫" label="School-wide Students" data={data.school}/>
                  <SummaryCard icon="👔" label="Staff" data={data.staff}/>
                  {data.staff.absentList?.length > 0 && <StaffAbsentCard absentList={data.staff.absentList}/>}
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', margin:'4px 0' }}>
                    <div style={{ flex:1, height:'1px', background:C.border }}/>
                    <span style={{ fontSize:'8px', color:C.muted, textTransform:'uppercase', letterSpacing:'0.18em', whiteSpace:'nowrap' }}>
                      Per Class · {data.classes.length} classes
                    </span>
                    <div style={{ flex:1, height:'1px', background:C.border }}/>
                  </div>
                  {data.classes.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'40px 0', color:C.muted }}>
                      Class data မရှိပါ — Student_Directory ထဲမှာ Grade/Section စစ်ဆေးပါ
                    </div>
                  ) : data.classes.map((cls,i) => (
                    <ClassCard key={`${cls.grade}-${cls.section}-${i}`} cls={cls}/>
                  ))}
                  {data.classes.length > 0 && data.classes.every(c => c.color === 'green') && data.school.absent === 0 && (
                    <div style={{ background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.25)',
                      borderRadius:'14px', padding:'18px', textAlign:'center' }}>
                      <div style={{ fontSize:'28px', marginBottom:'6px' }}>✅</div>
                      <p style={{ color:'#34d399', fontWeight:900, fontSize:'12px',
                        textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>
                        Full Attendance — No Absences
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══ HISTORY TAB ══ */}
          {tab === 'HISTORY' && <HistoricalTrend/>}

        </div>
      </div>
    </div>
  );
}
