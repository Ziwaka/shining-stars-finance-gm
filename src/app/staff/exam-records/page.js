"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const S = {
  page: { display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden', background:'#0f0a1e', color:'#fff', fontFamily:'system-ui,sans-serif' },
  header: { zIndex:40, background:'rgba(10,15,30,0.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  card:   { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'16px' },
  input:  { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', padding:'8px 12px', color:'#fff', fontSize:'12px', outline:'none', boxSizing:'border-box', textAlign:'center' },
  label:  { display:'block', fontSize:'9px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' },
  select: { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box', cursor:'pointer' },
  tabOn:  { background:'#fbbf24', color:'#0a0f1e', border:'none', borderRadius:'10px', padding:'7px 16px', fontSize:'10px', fontWeight:900, textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap' },
  tabOff: { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'none', borderRadius:'10px', padding:'7px 16px', fontSize:'10px', fontWeight:900, textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap' },
};

const GRADE_COLOR = { A:'#34d399', B:'#60a5fa', C:'#fbbf24', D:'#fb923c', F:'#f87171' };
const pctToGrade = (pct, cfg) => {
  if (pct >= (cfg?.gradeA||80)) return 'A';
  if (pct >= (cfg?.gradeB||65)) return 'B';
  if (pct >= (cfg?.gradeC||50)) return 'C';
  if (pct >= (cfg?.gradeD||40)) return 'D';
  return 'F';
};
const pctToResult = (pct, cfg) => pct >= (cfg?.passMark||40) ? 'Pass' : 'Fail';
const RANK_ICONS = ['🥇','🥈','🥉'];

const GRADES = ['KG','1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D','E','F'];

export default function ExamRecordsPage() {
  const router = useRouter();
  const [user, setUser]     = useState(null);
  const [tab, setTab]       = useState('entry');
  const [config, setConfig] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  // Filters shared across tabs
  const [selYear, setSelYear]   = useState('');
  const [selTerm, setSelTerm]   = useState('');
  const [selGrade, setSelGrade] = useState('');
  const [selSection, setSelSection] = useState('');

  // Bulk entry state: { [studentId]: { [subject]: score } }
  const [bulkData, setBulkData]   = useState({});
  const [maxScores, setMaxScores] = useState({}); // { [subject]: max }

  // Results state
  const [rankList, setRankList]   = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Edit state
  const [editRow, setEditRow]     = useState(null); // {Student_ID,Name,Subject,Score,Max_Score,Remark}
  const [canEdit, setCanEdit]     = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);

    const checkPerm = (key) => u.userRole==='management' || u[key]===true || String(u[key]||'').toUpperCase()==='TRUE';

    // Management — straight in
    if (u.userRole === 'management') {
      setUser(u); setCanEdit(true); fetchConfig(u); return;
    }

    // Already has perm in localStorage — straight in
    if (checkPerm('Can_Record_Exam')) {
      setUser(u);
      setCanEdit(true);
      fetchConfig(u);
      return;
    }

    // Try fetching fresh permissions from Staff_Permissions sheet
    fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getStaffPermissions' }) })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const fresh = res.data.find(s =>
            (s.Staff_ID && s.Staff_ID.toString() === u.Staff_ID?.toString()) ||
            (s.Name && (s.Name === u['Name (ALL CAPITAL)'] || s.Name === u.Name))
          );
          if (fresh) {
            const updated = { ...u, ...fresh };
            localStorage.setItem('user', JSON.stringify(updated));
            const hasFreshPerm = updated['Can_Record_Exam']===true || String(updated['Can_Record_Exam']||'').toUpperCase()==='TRUE';
            if (!hasFreshPerm) { router.push('/staff'); return; }
            setUser(updated);
            setCanEdit(true);
            fetchConfig(updated);
            return;
          }
        }
        router.push('/staff');
      })
      .catch(() => router.push('/staff'));
  }, []);

  const fetchConfig = async (u) => {
    setLoading(true);
    try {
      const [cfgRes, stuRes] = await Promise.all([
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getExamConfig' }) }),
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getData', sheetName:'Student_Directory' }) }),
      ]);
      const cfg = await cfgRes.json();
      const stu = await stuRes.json();
      if (cfg.success) {
        setConfig(cfg.config);
        setSelYear(cfg.config.academicYear || '');
        if (cfg.config.terms?.length) setSelTerm(cfg.config.terms[0]);
      }
      if (stu.success) setStudents(stu.data || []);
    } catch {}
    setLoading(false);
  };

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  // Get subjects for selected grade
  const gradeKey = selGrade === 'KG' ? 'KG' : `Grade ${selGrade}`;
  const subjects = (config?.subjectsByGrade?.[gradeKey]) || [];
  // Use grade-specific terms if available, else fallback to default
  const termOptions = (config?.termsByGrade?.[gradeKey]) || (config?.terms) || [];

  // Students filtered by grade+section
  const classStudents = students.filter(s => {
    const g = (s.Grade || s['Grade'] || '').toString().replace('Grade ','').trim();
    const sec = (s.Section || s['Section'] || '').toString().trim();
    if (String(g) !== String(selGrade)) return false;
    if (selSection && sec && sec !== selSection) return false;
    return true;
  });

  // Init bulk data when grade/section changes
  useEffect(() => {
    if (!selGrade) return;
    const gradeK = selGrade === 'KG' ? 'KG' : `Grade ${selGrade}`;
    const gradeTerms = (config?.termsByGrade?.[gradeK]) || (config?.terms) || [];
    setSelTerm(gradeTerms[0] || '');
    const init = {};
    classStudents.forEach(s => {
      const sid = s['Enrollment No.'] || s.Student_ID || '';
      if (sid && !init[sid]) init[sid] = {};
    });
    setBulkData(init);
    const mx = {};
    subjects.forEach(sub => { mx[sub] = '100'; });
    setMaxScores(mx);
  }, [selGrade, selSection, students]);

  const handleBulkChange = (sid, subject, val) => {
    setBulkData(prev => ({ ...prev, [sid]: { ...(prev[sid]||{}), [subject]: val } }));
  };

  const handleSubmitBulk = async () => {
    if (!selYear) return showMsg('Academic Year ထည့်ပါ','error');
    if (!selTerm) return showMsg('Term ရွေးပါ','error');
    if (!selGrade) return showMsg('Grade ရွေးပါ','error');
    if (classStudents.length === 0) return showMsg('Student မတွေ့ပါ','error');

    const entries = classStudents.map(s => {
      const sid  = s['Enrollment No.'] || s.Student_ID || '';
      const name = s['Name (ALL CAPITAL)'] || s['အမည်'] || s.Name || '';
      return { Student_ID:sid, Name:name, subjects: bulkData[sid]||{}, maxScores };
    }).filter(e => Object.keys(e.subjects).some(k => e.subjects[k]!==''));

    if (entries.length === 0) return showMsg('Score မထည့်ရသေးပါ','error');

    setSaving(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({
        action: 'recordExamBulk',
        Academic_Year: selYear,
        Term: selTerm,
        Grade: selGrade,
        Section: selSection,
        entries,
        Recorded_By: user?.Name || user?.username || '',
        config,
        userRole: user?.userRole || 'staff', staffId: user?.Staff_ID || user?.username || '',
      })});
      const r = await res.json();
      if (r.success) { showMsg(r.message||'✓ သိမ်းပြီး'); }
      else showMsg(r.message||'Error','error');
    } catch { showMsg('Network error','error'); }
    setSaving(false);
  };

  const fetchResults = useCallback(async () => {
    if (!selYear || !selTerm || !selGrade) return;
    setResultsLoading(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({
        action: 'getExamResults',
        Academic_Year: selYear, Term: selTerm,
        Grade: selGrade, Section: selSection,
      })});
      const r = await res.json();
      if (r.success) setRankList(r.rankList || []);
    } catch {}
    setResultsLoading(false);
  }, [selYear, selTerm, selGrade, selSection]);

  useEffect(() => {
    if (tab === 'results' || tab === 'ranking') fetchResults();
  }, [tab, fetchResults]);

  const handleUpdateEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({
        action: 'updateExamRecord',
        Academic_Year: selYear, Term: selTerm,
        Grade: selGrade, Section: selSection || editRow.Section || '',
        Student_ID: editRow.Student_ID,
        Subject: editRow.Subject,
        Score: editRow.Score,
        Max_Score: editRow.Max_Score,
        Remark: editRow.Remark || '',
        config,
      })});
      const r = await res.json();
      if (r.success) { showMsg('✓ Updated'); setEditRow(null); fetchResults(); }
      else showMsg(r.message||'Error','error');
    } catch { showMsg('Network error','error'); }
    setSaving(false);
  };

  const filterBar = (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginTop:'8px',marginBottom:'12px'}}>
      <div>
        <label style={S.label}>Academic Year</label>
        <input value={selYear} onChange={e=>setSelYear(e.target.value)} placeholder="2024-2025" style={{...S.input,textAlign:'left',padding:'10px 14px'}}/>
      </div>
      <div>
        <label style={S.label}>Term</label>
        <select value={selTerm} onChange={e=>setSelTerm(e.target.value)} style={S.select}>
          <option value="">— Term —</option>
          {termOptions.map((t,i)=><option key={`${t}-${i}`} style={{background:'#0a0f1e'}}>{t}</option>)}
        </select>
      </div>
      <div>
        <label style={S.label}>Grade</label>
        <select value={selGrade} onChange={e=>setSelGrade(e.target.value)} style={S.select}>
          <option value="">— Grade —</option>
          {GRADES.map(g=><option key={g} style={{background:'#0a0f1e'}}>{g}</option>)}
        </select>
      </div>
      <div>
        <label style={S.label}>Section (optional)</label>
        <select value={selSection} onChange={e=>setSelSection(e.target.value)} style={S.select}>
          <option value="">All</option>
          {SECTIONS.map(s=><option key={s} style={{background:'#0a0f1e'}}>{s}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}select,input{font-family:inherit}
        input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
        ::-webkit-scrollbar{height:4px;background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>

      <div style={S.header}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'14px'}}>← Back</button>
        <div style={{textAlign:'center'}}>
          <p style={{fontWeight:900,fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.1em',margin:0}}>Exam Records</p>
          <p style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.12em',margin:0}}>Shining Stars</p>
        </div>
        <button onClick={()=>fetchConfig(user)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'18px'}}>↻</button>
      </div>
      <div style={{flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom:'80px'}}>

      {msg && (
        <div style={{position:'fixed',top:'64px',left:'50%',transform:'translateX(-50%)',zIndex:50,padding:'8px 20px',borderRadius:'999px',fontSize:'12px',fontWeight:900,color:'#fff',background:msg.type==='error'?'#ef4444':'#10b981',boxShadow:'0 4px 20px rgba(0,0,0,0.4)',whiteSpace:'nowrap'}}>
          {msg.text}
        </div>
      )}

      <div style={{display:'flex',gap:'6px',padding:'12px 16px 0',overflowX:'auto'}}>
        {[
          {id:'entry',   label:'📝 Bulk Entry'},
          {id:'results', label:'📊 Results'},
          {id:'ranking', label:'🏆 Ranking'},
          ...(canEdit ? [{id:'edit', label:'✏️ Edit'}] : []),
        ].map(t=>(
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
            {/* ── BULK ENTRY ── */}
            {tab==='entry' && (
              <div style={{marginTop:'8px'}}>
                {filterBar}
                {selGrade && subjects.length===0 && (
                  <div style={{...S.card,textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>
                    Grade {selGrade} subject list မသတ်မှတ်ရသေးပါ — System_Config &gt; Exam_Subjects ထည့်ပါ
                  </div>
                )}
                {selGrade && subjects.length>0 && (
                  <>
                    {/* Max scores row */}
                    <div style={{...S.card,marginBottom:'8px'}}>
                      <p style={{...S.label,marginBottom:'8px',color:'#fbbf24'}}>Max Score per Subject</p>
                      <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(subjects.length,4)},1fr)`,gap:'6px'}}>
                        {subjects.map(sub=>(
                          <div key={sub}>
                            <label style={{...S.label,fontSize:'8px'}}>{sub}</label>
                            <input type="number" value={maxScores[sub]||'100'}
                              onChange={e=>setMaxScores(p=>({...p,[sub]:e.target.value}))}
                              style={S.input}/>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bulk table */}
                    <div style={{overflowX:'auto',marginBottom:'12px'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
                        <thead>
                          <tr style={{background:'rgba(255,255,255,0.04)'}}>
                            <th style={{padding:'8px 10px',textAlign:'left',color:'rgba(255,255,255,0.4)',fontWeight:900,fontSize:'9px',textTransform:'uppercase',whiteSpace:'nowrap',borderBottom:'1px solid rgba(255,255,255,0.08)',position:'sticky',left:0,background:'rgba(10,15,30,0.98)',zIndex:5}}>Name</th>
                            {subjects.map(sub=>(
                              <th key={sub} style={{padding:'8px 6px',textAlign:'center',color:'rgba(255,255,255,0.4)',fontWeight:900,fontSize:'9px',textTransform:'uppercase',whiteSpace:'nowrap',borderBottom:'1px solid rgba(255,255,255,0.08)',minWidth:'64px'}}>
                                {sub}
                              </th>
                            ))}
                            <th style={{padding:'8px 6px',textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:'9px',borderBottom:'1px solid rgba(255,255,255,0.08)',whiteSpace:'nowrap'}}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classStudents.length===0 ? (
                            <tr><td colSpan={subjects.length+2} style={{textAlign:'center',padding:'30px',color:'rgba(255,255,255,0.2)'}}>Student မတွေ့ပါ</td></tr>
                          ) : classStudents.map((s,i)=>{
                            const sid  = s['Enrollment No.'] || s.Student_ID || '';
                            const name = s['Name (ALL CAPITAL)'] || s['အမည်'] || s.Name || '';
                            const row  = bulkData[sid] || {};
                            const totScore = subjects.reduce((sum,sub)=>sum+(Number(row[sub])||0),0);
                            const totMax   = subjects.reduce((sum,sub)=>sum+(Number(maxScores[sub])||100),0);
                            const totPct   = totMax>0?Math.round((totScore/totMax)*100):0;
                            const failCount = subjects.filter(sub=>{
                              const sc = Number(row[sub]);
                              const mx = Number(maxScores[sub])||100;
                              return !isNaN(sc) && row[sub]!=='' && Math.round((sc/mx)*100) < (config?.passMark||40);
                            }).length;
                            const lg = pctToGrade(totPct, config);
                            return (
                              <tr key={sid} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',background:i%2===0?'transparent':'rgba(255,255,255,0.015)'}}>
                                <td style={{padding:'6px 10px',position:'sticky',left:0,background:i%2===0?'#0a0f1e':'rgba(255,255,255,0.015)',zIndex:4}}>
                                  <p style={{fontWeight:700,fontSize:'11px',color:'#fff',margin:0,whiteSpace:'nowrap'}}>{name}</p>
                                  <p style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',margin:0}}>{sid}</p>
                                </td>
                                {subjects.map(sub=>{
                                  const val = row[sub]!==undefined ? row[sub] : '';
                                  const mx  = Number(maxScores[sub])||100;
                                  const pct = val!==''&&!isNaN(Number(val)) ? Math.round((Number(val)/mx)*100) : null;
                                  const isFail = pct!==null && pct<(config?.passMark||40);
                                  return (
                                    <td key={sub} style={{padding:'4px 4px',textAlign:'center'}}>
                                      <input type="number" value={val}
                                        onChange={e=>handleBulkChange(sid,sub,e.target.value)}
                                        min="0" max={maxScores[sub]||100}
                                        style={{...S.input,width:'58px',borderColor:isFail?'rgba(239,68,68,0.5)':val!==''?'rgba(134,239,172,0.3)':'rgba(255,255,255,0.12)',color:isFail?'#f87171':val!==''?'#86efac':'#fff'}}/>
                                    </td>
                                  );
                                })}
                                <td style={{padding:'6px 8px',textAlign:'center'}}>
                                  {totScore>0 && (
                                    <div>
                                      <span style={{fontWeight:900,fontSize:'12px',color:GRADE_COLOR[lg]||'#fff'}}>{lg}</span>
                                      <p style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',margin:0}}>{totPct}%</p>
                                      {failCount>0&&<p style={{fontSize:'8px',color:'#f87171',margin:0}}>{failCount}F</p>}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <button onClick={handleSubmitBulk} disabled={saving}
                      style={{background:'#fbbf24',color:'#0a0f1e',border:'none',borderRadius:'14px',padding:'14px',fontSize:'13px',fontWeight:900,width:'100%',cursor:saving?'default':'pointer',textTransform:'uppercase',letterSpacing:'0.06em',opacity:saving?0.5:1}}>
                      {saving?'Saving...':'💾 Save All Exam Records'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── RESULTS ── */}
            {tab==='results' && (
              <div style={{marginTop:'8px'}}>
                {filterBar}
                <button onClick={fetchResults} style={{...S.card,width:'100%',border:'none',cursor:'pointer',color:'#fbbf24',fontWeight:900,fontSize:'12px',marginBottom:'12px',padding:'10px'}}>
                  🔍 Load Results
                </button>
                {resultsLoading ? (
                  <div style={{display:'flex',justifyContent:'center',padding:'40px 0'}}>
                    <div style={{width:'28px',height:'28px',border:'3px solid rgba(255,255,255,0.1)',borderTop:'3px solid #fbbf24',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                  </div>
                ) : rankList.map((stu,i)=>{
                  const totalPct = stu.totalMax>0?Math.round((stu.totalScore/stu.totalMax)*100):0;
                  const overallGrade = pctToGrade(totalPct, config);
                  const failSubs = Object.entries(stu.subjects||{}).filter(([,v])=>v.result==='Fail');
                  const distinction = totalPct>=(config?.distinctionMark||80) && failSubs.length===0;
                  return (
                    <div key={stu.Student_ID||i} style={{...S.card,marginBottom:'8px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                        <div>
                          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                            <span style={{fontWeight:900,fontSize:'13px',color:'#fff'}}>{stu.Name}</span>
                            {stu.Section&&<span style={{fontSize:'8px',padding:'1px 8px',borderRadius:'99px',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>{stu.Section}</span>}
                            {distinction&&<span style={{fontSize:'8px',padding:'1px 8px',borderRadius:'99px',background:'rgba(251,191,36,0.15)',color:'#fbbf24',fontWeight:900}}>⭐ Distinction</span>}
                          </div>
                          <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:'2px 0 0'}}>{stu.Student_ID}</p>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                            {stu.rank&&<span style={{fontSize:'9px',color:'rgba(255,255,255,0.4)'}}>Rank {stu.rank}</span>}
                            <span style={{fontWeight:900,fontSize:'22px',color:GRADE_COLOR[overallGrade]||'#fff'}}>{overallGrade}</span>
                          </div>
                          <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:0}}>{totalPct}% · {stu.totalScore}/{stu.totalMax}</p>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:'5px'}}>
                        {Object.entries(stu.subjects||{}).map(([sub,v])=>(
                          <div key={sub} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${v.result==='Fail'?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.06)'}`,borderRadius:'8px',padding:'6px 8px',textAlign:'center'}}>
                            <p style={{fontSize:'8px',color:'rgba(255,255,255,0.35)',margin:'0 0 2px',textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap'}}>{sub}</p>
                            <p style={{fontWeight:900,fontSize:'14px',color:GRADE_COLOR[v.grade]||'#fff',margin:0}}>{v.grade}</p>
                            <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:0}}>{v.score}/{v.max}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── RANKING ── */}
            {tab==='ranking' && (
              <div style={{marginTop:'8px'}}>
                {filterBar}
                <button onClick={fetchResults} style={{...S.card,width:'100%',border:'none',cursor:'pointer',color:'#fbbf24',fontWeight:900,fontSize:'12px',marginBottom:'12px',padding:'10px'}}>
                  🔍 Load Ranking
                </button>
                {resultsLoading ? (
                  <div style={{display:'flex',justifyContent:'center',padding:'40px 0'}}>
                    <div style={{width:'28px',height:'28px',border:'3px solid rgba(255,255,255,0.1)',borderTop:'3px solid #fbbf24',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
                  </div>
                ) : rankList.length===0 ? (
                  <div style={{textAlign:'center',padding:'50px 0',color:'rgba(255,255,255,0.2)'}}>Data မရှိသေးပါ</div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    {rankList.map((stu,i)=>{
                      const totalPct = stu.totalMax>0?Math.round((stu.totalScore/stu.totalMax)*100):0;
                      const lg = pctToGrade(totalPct, config);
                      const failCount = Object.values(stu.subjects||{}).filter(v=>v.result==='Fail').length;
                      const isTop3 = (stu.rank||999) <= 3;
                      return (
                        <div key={stu.Student_ID||i} style={{...S.card,display:'flex',alignItems:'center',gap:'12px',padding:'12px 14px',background:isTop3?'rgba(251,191,36,0.05)':'rgba(255,255,255,0.03)',border:isTop3?'1px solid rgba(251,191,36,0.15)':'1px solid rgba(255,255,255,0.07)'}}>
                          <div style={{flexShrink:0,width:'36px',textAlign:'center'}}>
                            {stu.rank<=3 ? <span style={{fontSize:'22px'}}>{RANK_ICONS[(stu.rank||1)-1]}</span>
                              : <span style={{fontWeight:900,fontSize:'16px',color:'rgba(255,255,255,0.3)'}}>{stu.rank}</span>}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                              <span style={{fontWeight:900,fontSize:'13px',color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{stu.Name}</span>
                              {stu.Section&&<span style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',flexShrink:0}}>{stu.Section}</span>}
                            </div>
                            <div style={{display:'flex',gap:'8px',marginTop:'2px',flexWrap:'wrap'}}>
                              <span style={{fontSize:'9px',color:'rgba(255,255,255,0.3)'}}>Total: {stu.totalScore}/{stu.totalMax}</span>
                              {failCount>0&&<span style={{fontSize:'9px',color:'#f87171',fontWeight:900}}>{failCount} Fail</span>}
                              {failCount===0&&totalPct>=(config?.distinctionMark||80)&&<span style={{fontSize:'9px',color:'#fbbf24',fontWeight:900}}>⭐ Distinction</span>}
                            </div>
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <span style={{fontWeight:900,fontSize:'20px',color:GRADE_COLOR[lg]||'#fff'}}>{lg}</span>
                            <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:0}}>{totalPct}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── EDIT ── */}
            {tab==='edit' && canEdit && (
              <div style={{marginTop:'8px'}}>
                {filterBar}
                <button onClick={fetchResults} style={{...S.card,width:'100%',border:'none',cursor:'pointer',color:'#fbbf24',fontWeight:900,fontSize:'12px',marginBottom:'12px',padding:'10px'}}>
                  🔍 Load Records
                </button>
                {editRow && (
                  <div style={{...S.card,border:'1px solid rgba(251,191,36,0.3)',marginBottom:'12px'}}>
                    <p style={{fontWeight:900,fontSize:'13px',color:'#fbbf24',margin:'0 0 12px'}}>✏️ {editRow.Name} — {editRow.Subject}</p>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                      <div>
                        <label style={S.label}>Score</label>
                        <input type="number" value={editRow.Score} onChange={e=>setEditRow(p=>({...p,Score:e.target.value}))} style={{...S.input,textAlign:'left',padding:'10px 14px'}}/>
                      </div>
                      <div>
                        <label style={S.label}>Max Score</label>
                        <input type="number" value={editRow.Max_Score} onChange={e=>setEditRow(p=>({...p,Max_Score:e.target.value}))} style={{...S.input,textAlign:'left',padding:'10px 14px'}}/>
                      </div>
                    </div>
                    <div style={{marginBottom:'10px'}}>
                      <label style={S.label}>Remark</label>
                      <input value={editRow.Remark||''} onChange={e=>setEditRow(p=>({...p,Remark:e.target.value}))} style={{...S.input,textAlign:'left',padding:'10px 14px'}}/>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                      <button onClick={()=>setEditRow(null)} style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)',border:'none',borderRadius:'12px',padding:'10px',fontWeight:900,cursor:'pointer'}}>Cancel</button>
                      <button onClick={handleUpdateEdit} disabled={saving} style={{background:'#fbbf24',color:'#0a0f1e',border:'none',borderRadius:'12px',padding:'10px',fontWeight:900,cursor:saving?'default':'pointer',opacity:saving?0.5:1}}>
                        {saving?'Saving...':'💾 Update'}
                      </button>
                    </div>
                  </div>
                )}
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  {rankList.flatMap(stu =>
                    Object.entries(stu.subjects||{}).map(([sub,v])=>({
                      Student_ID: stu.Student_ID, Name: stu.Name, Section: stu.Section,
                      Subject: sub, Score: v.score, Max_Score: v.max,
                      Pct: v.pct, Grade: v.grade, Result: v.result
                    }))
                  ).map((row,i)=>(
                    <button key={i} onClick={()=>setEditRow({...row,Remark:''})}
                      style={{...S.card,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',width:'100%',textAlign:'left',border:`1px solid ${row.Result==='Fail'?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.07)'}`}}>
                      <div>
                        <p style={{fontWeight:900,fontSize:'12px',color:'#fff',margin:0}}>{row.Name}</p>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.35)',margin:'2px 0 0'}}>{row.Subject}</p>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <span style={{fontWeight:900,fontSize:'16px',color:GRADE_COLOR[row.Grade]||'#fff'}}>{row.Grade}</span>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:0}}>{row.Score}/{row.Max_Score} · {row.Pct}%</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}