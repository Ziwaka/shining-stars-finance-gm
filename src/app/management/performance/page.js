"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const S = {
  page: { display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden', background:'#0f0a1e', color:'#fff', fontFamily:'system-ui,sans-serif' },
  header: { zIndex:40, background:'rgba(15,10,30,0.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  card:   { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'16px' },
  select: { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'9px 14px', color:'#fff', fontSize:'12px', outline:'none' },
  tabOn:  { background:'#fbbf24', color:'#0f172a', border:'none', borderRadius:'10px', padding:'7px 18px', fontSize:'10px', fontWeight:900, textTransform:'uppercase', cursor:'pointer' },
  tabOff: { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'none', borderRadius:'10px', padding:'7px 18px', fontSize:'10px', fontWeight:900, textTransform:'uppercase', cursor:'pointer' },
};

const pctColor = (p) => p >= 80 ? '#34d399' : p >= 60 ? '#60a5fa' : p >= 40 ? '#fbbf24' : '#f87171';
// NaN-safe number — handles #VALUE!, #N/A, empty string, undefined
const safeNum = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const RANK_ICON = ['🥇','🥈','🥉'];

export default function MgtPerformanceHub() {
  const router = useRouter();
  const [data, setData]               = useState({ students:[], points:[], rankings:{} });
  const [loading, setLoading]         = useState(true);
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [tab, setTab]                 = useState('rankings');

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.userRole !== 'management') { router.push('/login'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [initRes, scoreRes, ptRes] = await Promise.all([
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getInitialData' }) }),
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getData', sheetName:'Score_Records' }) }),
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getData', sheetName:'House_Points' }) }),
      ]);
      const init  = await initRes.json();
      const score = await scoreRes.json();
      const pt    = await ptRes.json();

      const students = init.students || [];
      const scores   = score.data   || [];
      const points   = (pt.data || []).reverse();

      // Build rankings per grade
      const rankings = {};
      const grades = [...new Set(students.map(s => s.Grade).filter(Boolean))].sort();
      grades.forEach(g => {
        const gradeScores = scores.filter(sc => String(sc.Grade) === String(g));
        const totals = {};
        gradeScores.forEach(sc => {
          const id = sc.Student_ID;
          if (!totals[id]) totals[id] = { name:sc.Name, total:0, count:0 };
          totals[id].total += safeNum(sc['Percentage (%)'] || sc.Percentage);
          totals[id].count++;
        });
        rankings[g] = Object.values(totals)
          .map(s => ({ ...s, avg: Math.round(s.total / s.count) }))
          .sort((a,b) => b.avg - a.avg)
          .slice(0, 10);
      });

      setData({ students, points, rankings, grades });
    } finally { setLoading(false); }
  };

  const grades = data.grades || [];
  const currentRankings = selectedGrade === 'All' ? [] : (data.rankings[selectedGrade] || []);
  const filteredPoints  = data.points.filter(p => {
    // Points 0 ဖြစ်တဲ့ rows ဖျောက် + field name fallback
    const pts = safeNum(p.Points ?? p.points ?? p.Point ?? p.Score);
    if (pts === 0) return false;
    if (selectedGrade === 'All') return true;
    const s = data.students.find(st => (st['Enrollment No.']||st.Student_ID)?.toString() === p.Student_ID?.toString());
    return s?.Grade?.toString() === selectedGrade;
  });

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>

      <div style={S.header}>
        <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'14px' }}>← Back</button>
        <div style={{ textAlign:'center' }}>
          <p style={{ fontWeight:900, fontSize:'13px', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>Performance Hub</p>
          <p style={{ fontSize:'9px', color:'rgba(255,255,255,0.25)', margin:0, textTransform:'uppercase', letterSpacing:'0.1em' }}>Rankings & Points</p>
        </div>
        <button onClick={loadData} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'18px' }}>↻</button>
      </div>
      <div style={{flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom:'80px'}}>

      <div style={{ padding:'12px 16px', display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
        <button onClick={() => setTab('rankings')} style={tab==='rankings'?S.tabOn:S.tabOff}>🏆 Rankings</button>
        <button onClick={() => setTab('points')}   style={tab==='points'?S.tabOn:S.tabOff}>⭐ House Points</button>
        <div style={{ marginLeft:'auto' }}>
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} style={S.select}>
            <option value="All" style={{ background:'#1a1030' }}>All Grades</option>
            {grades.map(g => <option key={g} value={g} style={{ background:'#1a1030' }}>Grade {g}</option>)}
          </select>
        </div>
      </div>

      <div style={{ padding:'0 16px' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}>
            <div style={{ width:'32px', height:'32px', border:'3px solid rgba(255,255,255,0.1)', borderTop:'3px solid #fbbf24', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          </div>
        ) : (
          <>
            {/* ── RANKINGS ── */}
            {tab === 'rankings' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {selectedGrade === 'All' ? (
                  <div style={{ textAlign:'center', padding:'50px 0', color:'rgba(255,255,255,0.2)' }}>
                    <div style={{ fontSize:'36px', marginBottom:'8px' }}>🎓</div>
                    <p>Grade တစ်ခု ရွေးပါ</p>
                  </div>
                ) : currentRankings.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'50px 0', color:'rgba(255,255,255,0.2)' }}>Grade {selectedGrade} — Score records မရှိသေးပါ</div>
                ) : currentRankings.map((s, i) => (
                  <div key={i} style={{ ...S.card, display:'flex', alignItems:'center', gap:'14px',
                    background: i===0?'rgba(251,191,36,0.08)':i===1?'rgba(255,255,255,0.06)':i===2?'rgba(251,191,36,0.04)':'rgba(255,255,255,0.04)',
                    borderLeft: `4px solid ${i===0?'#fbbf24':i===1?'rgba(255,255,255,0.3)':i===2?'#fb923c':'rgba(255,255,255,0.08)'}` }}>
                    <div style={{ fontSize:'24px', flexShrink:0, width:'32px', textAlign:'center' }}>
                      {RANK_ICON[i] || <span style={{ fontWeight:900, fontSize:'14px', color:'rgba(255,255,255,0.3)' }}>#{i+1}</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:900, fontSize:'13px', color:'#fff', margin:'0 0 3px' }}>{s.name}</p>
                      <div style={{ height:'4px', background:'rgba(255,255,255,0.06)', borderRadius:'99px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${s.avg}%`, background: pctColor(s.avg), borderRadius:'99px' }}/>
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontWeight:900, fontSize:'18px', color: pctColor(s.avg), margin:0 }}>{s.avg}%</p>
                      <p style={{ fontSize:'9px', color:'rgba(255,255,255,0.25)', margin:0 }}>{s.count} subjects</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── HOUSE POINTS LOG ── */}
            {tab === 'points' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {filteredPoints.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'50px 0', color:'rgba(255,255,255,0.2)' }}>House points records မရှိသေးပါ</div>
                ) : filteredPoints.slice(0, 30).map((p, i) => {
                  const pts = safeNum(p.Points ?? p.points ?? p.Point ?? p.Score);
                  const pos = pts >= 0;
                  return (
                    <div key={i} style={{ ...S.card, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center',
                      borderLeft:`4px solid ${pos?'#34d399':'#f87171'}`,
                      background:`rgba(${pos?'52,211,153':'248,113,113'},0.05)` }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px', flexWrap:'wrap' }}>
                          <p style={{ fontWeight:900, fontSize:'12px', color:'#fff', margin:0 }}>{p.Name}</p>
                          <span style={{ fontSize:'8px', padding:'1px 8px', borderRadius:'99px', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', fontWeight:900 }}>{p.Category}</span>
                          {p.House_Name && <span style={{ fontSize:'8px', color:'rgba(255,255,255,0.3)' }}>{p.House_Name}</span>}
                        </div>
                        {p.Remark && <p style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', margin:0, fontStyle:'italic' }}>"{p.Remark}"</p>}
                        <p style={{ fontSize:'9px', color:'rgba(255,255,255,0.2)', margin:'3px 0 0' }}>{p.Date} · {p.Recorded_By}</p>
                      </div>
                      <div style={{ flexShrink:0, marginLeft:'12px', textAlign:'right' }}>
                        <span style={{ fontWeight:900, fontSize:'20px', color: pos?'#34d399':'#f87171' }}>
                          {pos?'+':''}{pts}
                        </span>
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