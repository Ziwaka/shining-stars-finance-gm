"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

// ── Color palette ───────────────────────────────────────────────────────────
const C = {
  bg:     '#07080f',
  surf:   '#0d0f1a',
  surf2:  '#15182b',
  border: 'rgba(255,255,255,0.08)',
  gold:   '#fbbf24',
  blue:   '#60a5fa',
  green:  '#34d399',
  pink:   '#f472b6',
  amber:  '#fb923c',
  purple: '#a78bfa',
  cyan:   '#22d3ee',
  red:    '#f87171',
  muted:  'rgba(255,255,255,0.4)',
  text:   'rgba(255,255,255,0.95)',
};

const scoreColor = v => v >= 80 ? C.green : v >= 60 ? C.blue : v >= 40 ? C.amber : C.red;

// Helper to clean dates
const cleanDateStr = (d) => {
  if (!d || d === '-') return '-';
  return String(d).split('T')[0];
};

// ── Shared components ───────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'100px 0',flexDirection:'column',gap:'16px'}}>
    <div style={{width:'40px',height:'40px',border:`3px solid ${C.border}`,borderTop:`3px solid ${C.gold}`,borderRadius:'50%',animation:'spin 0.8s linear infinite',boxShadow:`0 0 15px ${C.gold}44`}}/>
    <span style={{fontSize:'10px',color:C.muted,letterSpacing:'0.25em',textTransform:'uppercase',fontWeight:900}}>Crunching Data...</span>
  </div>
);

const Card = ({ children, style={}, accent, noPad }) => (
  <div style={{
    background: `linear-gradient(145deg, ${C.surf}, ${C.bg})`,
    border: `1px solid ${C.border}`,
    borderRadius: '20px',
    padding: noPad ? '0' : '20px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    ...style
  }}>
    {accent && <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:`linear-gradient(90deg,${accent},transparent)`}}/>}
    {children}
  </div>
);

const CardLabel = ({ children, icon }) => (
  <p style={{fontSize:'10px',color:C.muted,textTransform:'uppercase',letterSpacing:'0.2em',fontWeight:900,margin:'0 0 16px',display:'flex',alignItems:'center',gap:'8px'}}>
    {icon && <span style={{fontSize:'14px'}}>{icon}</span>}
    {children}
  </p>
);

const KpiCard = ({ icon, label, value, color, sub }) => (
  <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:'16px',padding:'16px',display:'flex',flexDirection:'column',gap:'6px',position:'relative',overflow:'hidden',boxShadow:`inset 0 0 20px ${color}08`}}>
    <div style={{position:'absolute',top:0,right:0,width:'50px',height:'50px',background:color,opacity:0.1,borderRadius:'50%',filter:'blur(20px)',transform:'translate(20%, -20%)'}}/>
    <span style={{fontSize:'20px',marginBottom:'4px'}}>{icon}</span>
    <span style={{fontSize:'28px',fontWeight:900,color,lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{value}</span>
    <span style={{fontSize:'9px',color:C.text,textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700}}>{label}</span>
    {sub && <span style={{fontSize:'8px',color:C.muted,fontWeight:600}}>{sub}</span>}
  </div>
);

const HBar = ({ label, count, max, color, showPct, total }) => {
  const pct = max > 0 ? Math.min(100, (count / max * 100)) : 0;
  const pctOfTotal = total > 0 ? Math.round(count / total * 100) : null;
  return (
    <div style={{marginBottom:'12px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',fontSize:'12px',marginBottom:'6px'}}>
        <span style={{color:C.text,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:'8px',fontWeight:600}}>{label}</span>
        <div style={{textAlign:'right'}}>
          <span style={{fontWeight:900,color,fontSize:'14px'}}>{count}</span>
          {pctOfTotal !== null && showPct && <span style={{color:C.muted,fontWeight:600,fontSize:'9px',marginLeft:'6px',background:C.surf2,padding:'2px 6px',borderRadius:'6px'}}>{pctOfTotal}%</span>}
        </div>
      </div>
      <div style={{height:'6px',background:'rgba(255,255,255,0.05)',borderRadius:'99px',overflow:'hidden',boxShadow:'inset 0 1px 2px rgba(0,0,0,0.2)'}}>
        <div style={{height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${color}88,${color})`,borderRadius:'99px',transition:'width 1s cubic-bezier(.4,0,.2,1)'}}/>
      </div>
    </div>
  );
};

const DonutChart = ({ percentage, color, label, size = 100, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div style={{position:'relative',width:size,height:size,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke={C.surf2} strokeWidth={strokeWidth}/>
        <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke={color} strokeWidth={strokeWidth} 
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{transition:'stroke-dashoffset 1s ease-out'}}/>
      </svg>
      <div style={{position:'absolute',textAlign:'center'}}>
        <div style={{fontSize:size/4,fontWeight:900,color,lineHeight:1}}>{percentage}%</div>
        {label && <div style={{fontSize:'8px',color:C.muted,textTransform:'uppercase',letterSpacing:'0.1em',marginTop:'2px'}}>{label}</div>}
      </div>
    </div>
  );
};

const RankList = ({ items, color, total, emptyMsg }) => {
  const [expanded, setExpanded] = useState(false);
  if (!items || items.length === 0) return <p style={{textAlign:'center',padding:'30px 0',color:C.muted,fontSize:'12px',fontStyle:'italic',background:C.surf2,borderRadius:'12px'}}>{emptyMsg||'No data available'}</p>;
  const max = items[0].count;
  const visible = expanded ? items : items.slice(0, 5);
  return (
    <>
      {visible.map((item, i) => (
        <HBar key={i} label={item.label} count={item.count} max={max} color={i===0?color:i===1?color+'dd':i===2?color+'bb':color+'77'} showPct total={total}/>
      ))}
      {items.length > 5 && (
        <button onClick={() => setExpanded(e=>!e)}
          style={{background:C.surf2,border:`1px solid ${C.border}`,color:C.text,borderRadius:'10px',padding:'8px 16px',fontSize:'9px',textTransform:'uppercase',letterSpacing:'0.15em',cursor:'pointer',width:'100%',marginTop:'8px',fontWeight:900,transition:'all 0.2s'}}>
          {expanded ? '▲ Show Less' : `▼ View All (${items.length})`}
        </button>
      )}
    </>
  );
};

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const router = useRouter();
  const [tab, setTab]         = useState('overview');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.userRole !== 'management') { router.push('/login'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body:JSON.stringify({ action:'getAnalytics' }) });
      const r   = await res.json();
      if (r.success) { setData(r); setUpdated(new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})); }
    } catch {}
    setLoading(false);
  };

  const TABS = [
    { id:'overview',  icon:'📊', label:'Overview'   },
    { id:'students',  icon:'🎓', label:'Students'   },
    { id:'demog',     icon:'🧬', label:'Demographics'},
    { id:'academic',  icon:'📝', label:'Academic'   },
    { id:'finance',   icon:'💰', label:'Finance'    },
    { id:'ops',       icon:'⚙️', label:'Operations' },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',background:C.bg,color:C.text,fontFamily:'system-ui,sans-serif'}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:99px}
        .tab-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .tab-btn:active { transform: scale(0.95); }
      `}</style>

      {/* Header */}
      <div style={{flexShrink:0,zIndex:40,background:'rgba(7,8,15,0.85)',backdropFilter:'blur(20px)',borderBottom:`1px solid ${C.border}`,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={()=>router.back()} style={{background:C.surf2,border:`1px solid ${C.border}`,color:C.text,borderRadius:'10px',cursor:'pointer',fontSize:'16px',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center'}}>
          ‹
        </button>
        <div style={{textAlign:'center'}}>
          <p style={{fontWeight:900,fontSize:'14px',textTransform:'uppercase',letterSpacing:'0.2em',margin:0,color:C.gold}}>Intelligence</p>
          {updated && <p style={{fontSize:'9px',color:C.muted,margin:'2px 0 0',letterSpacing:'0.05em'}}>Synced {updated}</p>}
        </div>
        <button onClick={fetchData} style={{background:C.surf2,border:`1px solid ${C.border}`,color:C.text,borderRadius:'10px',cursor:'pointer',fontSize:'14px',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center'}}>
          ↻
        </button>
      </div>

      {/* Tabs */}
      <div style={{flexShrink:0,display:'flex',gap:'8px',padding:'12px 16px',overflowX:'auto',background:`linear-gradient(to bottom, ${C.bg}, transparent)`}}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} className="tab-btn"
            style={tab===t.id
              ? {background:C.gold,color:'#000',border:'none',borderRadius:'12px',padding:'10px 16px',fontSize:'10px',fontWeight:900,cursor:'pointer',whiteSpace:'nowrap',letterSpacing:'0.1em',textTransform:'uppercase',boxShadow:`0 4px 15px ${C.gold}44`}
              : {background:C.surf,color:C.muted,border:`1px solid ${C.border}`,borderRadius:'12px',padding:'10px 16px',fontSize:'10px',fontWeight:900,cursor:'pointer',whiteSpace:'nowrap',letterSpacing:'0.1em',textTransform:'uppercase'}
            }>{t.icon} <span style={{marginLeft:'6px'}}>{t.label}</span></button>
        ))}
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'0 16px 80px'}}>
        <div style={{animation:'fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)', paddingTop:'8px'}}>
          {loading ? <Spinner/> : !data ? (
            <div style={{textAlign:'center',padding:'100px 0',color:C.red,background:C.surf2,borderRadius:'20px',marginTop:'20px'}}>
              <p style={{fontSize:'30px',marginBottom:'10px'}}>⚠️</p>
              <p style={{fontWeight:900,letterSpacing:'0.1em'}}>DATA UNAVAILABLE</p>
              <p style={{fontSize:'10px',color:C.muted,marginTop:'5px'}}>Please check your connection and refresh.</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
              
              {/* ══════════ OVERVIEW ══════════════════════════════════════════ */}
              {tab === 'overview' && (() => {
                const s = data.students || {};
                const f = data.fees || {};
                const lv = data.leaves || {};
                const collectionRate = (f.paid+f.pending) > 0 ? Math.round(f.paid/(f.paid+f.pending)*100) : 0;
                
                return (
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                      <KpiCard icon="🎓" label="Active Students" value={s.active ?? s.total ?? 0} color={C.blue} sub={`Total Enrolled: ${s.total||0}`}/>
                      <KpiCard icon="👔" label="Total Staff" value={data.staff?.total ?? 0} color={C.purple} sub={`Active: ${data.staff?.active ?? 0}`}/>
                      <div style={{gridColumn: '1 / -1'}}>
                        <KpiCard icon="💰" label="Total Revenue (MMK)" value={(f.revenue||0).toLocaleString()} color={C.green} sub={`${collectionRate}% Collection Rate`}/>
                      </div>
                    </div>

                    <Card accent={C.gold}>
                      <CardLabel icon="📊">Quick Insights</CardLabel>
                      <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                        <div style={{background:C.surf2,padding:'12px 16px',borderRadius:'12px',borderLeft:`4px solid ${C.blue}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontSize:'12px',fontWeight:700}}>Gender Ratio</span>
                          <span style={{fontSize:'12px',color:C.muted}}><span style={{color:C.blue}}>{s.male}</span> Boys / <span style={{color:C.pink}}>{s.female}</span> Girls</span>
                        </div>
                        <div style={{background:C.surf2,padding:'12px 16px',borderRadius:'12px',borderLeft:`4px solid ${C.purple}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontSize:'12px',fontWeight:700}}>Hostel vs Day</span>
                          <span style={{fontSize:'12px',color:C.muted}}><span style={{color:C.purple}}>{s.hostel}</span> Hostel / <span style={{color:C.cyan}}>{s.school}</span> Day</span>
                        </div>
                        {data.scores?.total > 0 && (
                          <div style={{background:C.surf2,padding:'12px 16px',borderRadius:'12px',borderLeft:`4px solid ${scoreColor(data.scores.avg)}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span style={{fontSize:'12px',fontWeight:700}}>Academic Avg</span>
                            <span style={{fontSize:'14px',fontWeight:900,color:scoreColor(data.scores.avg)}}>{data.scores.avg}%</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </>
                );
              })()}

              {/* ══════════ STUDENTS ══════════════════════════════════════════ */}
              {tab === 'students' && (() => {
                const s = data.students || {};
                const total = s.active ?? s.total ?? 0;
                const maxGradeCount = Math.max(...(s.gradeBreakdown||[{count:1}]).map(x=>x.count));

                return (
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                      <Card accent={C.blue} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                        <p style={{fontSize:'10px',color:C.muted,fontWeight:900,letterSpacing:'0.1em',marginBottom:'16px'}}>GENDER RATIO</p>
                        <DonutChart percentage={total?Math.round((s.male/total)*100):0} color={C.blue} size={110} label="Boys"/>
                        <div style={{display:'flex',gap:'16px',marginTop:'20px',width:'100%',justifyContent:'center'}}>
                          <div><p style={{fontSize:'16px',fontWeight:900,color:C.blue}}>{s.male}</p><p style={{fontSize:'8px',color:C.muted,textTransform:'uppercase'}}>Boys</p></div>
                          <div><p style={{fontSize:'16px',fontWeight:900,color:C.pink}}>{s.female}</p><p style={{fontSize:'8px',color:C.muted,textTransform:'uppercase'}}>Girls</p></div>
                        </div>
                      </Card>

                      <Card accent={C.purple} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                        <p style={{fontSize:'10px',color:C.muted,fontWeight:900,letterSpacing:'0.1em',marginBottom:'16px'}}>BOARDING</p>
                        <DonutChart percentage={total?Math.round((s.hostel/total)*100):0} color={C.purple} size={110} label="Hostel"/>
                        <div style={{display:'flex',gap:'16px',marginTop:'20px',width:'100%',justifyContent:'center'}}>
                          <div><p style={{fontSize:'16px',fontWeight:900,color:C.purple}}>{s.hostel}</p><p style={{fontSize:'8px',color:C.muted,textTransform:'uppercase'}}>Hostel</p></div>
                          <div><p style={{fontSize:'16px',fontWeight:900,color:C.cyan}}>{s.school}</p><p style={{fontSize:'8px',color:C.muted,textTransform:'uppercase'}}>Day</p></div>
                        </div>
                      </Card>
                    </div>

                    <Card accent={C.cyan}>
                      <CardLabel icon="📈">Grade Distribution</CardLabel>
                      {s.gradeBreakdown?.length > 0 ? (
                        <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'150px',marginTop:'20px',overflowX:'auto',paddingBottom:'10px'}}>
                          {s.gradeBreakdown.map((g,i) => {
                            const hPct = Math.max((g.count/maxGradeCount)*100, 5);
                            return (
                              <div key={i} style={{flex:'1',minWidth:'30px',display:'flex',flexDirection:'column',alignItems:'center',gap:'8px'}}>
                                <span style={{fontSize:'10px',fontWeight:900,color:C.text}}>{g.count}</span>
                                <div style={{width:'100%',maxWidth:'24px',height:`${hPct}%`,background:`linear-gradient(to top, ${C.cyan}44, ${C.cyan})`,borderRadius:'6px 6px 0 0',transition:'height 1s'}}/>
                                <span style={{fontSize:'9px',color:C.muted,fontWeight:700,whiteSpace:'nowrap',transform:'rotate(-45deg)',marginTop:'10px'}}>{g.grade.replace('Grade ','G')}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : <p style={{color:C.muted,fontSize:'12px',textAlign:'center'}}>No grade data.</p>}
                    </Card>

                    {Object.keys(s.houseCounts||{}).length > 0 && (
                      <Card accent={C.gold}>
                        <CardLabel icon="🏰">House Points / Distribution</CardLabel>
                        <RankList items={Object.entries(s.houseCounts).map(([k,v])=>({label:k,count:v})).sort((a,b)=>b.count-a.count)} color={C.gold} total={total}/>
                      </Card>
                    )}
                  </>
                );
              })()}

              {/* ══════════ DEMOGRAPHICS ══════════════════════════════════════ */}
              {tab === 'demog' && (() => {
                const dm = data.demographics || {};
                const total = data.students?.active ?? data.students?.total ?? 0;
                const gasDeployed = !!data.demographics;

                const DemogSection = ({ title, items, color, icon }) => (
                  <Card accent={color}>
                    <CardLabel icon={icon}>{title}</CardLabel>
                    <RankList items={items} color={color} total={total} emptyMsg={`No data for ${title}`}/>
                  </Card>
                );

                return (
                  <>
                    {!gasDeployed && (
                      <div style={{background:`${C.red}22`,border:`1px solid ${C.red}55`,borderRadius:'16px',padding:'20px',textAlign:'center'}}>
                        <p style={{fontSize:'30px',margin:'0 0 10px'}}>⚠️</p>
                        <p style={{color:C.red,fontWeight:900,fontSize:'14px',textTransform:'uppercase',letterSpacing:'0.1em'}}>Demographics Unavailable</p>
                        <p style={{color:C.text,fontSize:'11px',marginTop:'8px',opacity:0.8}}>Backend script requires an update to process demographic data. See instructions below.</p>
                      </div>
                    )}

                    {gasDeployed && dm.ageTotal > 0 && (
                      <Card accent={C.amber}>
                        <CardLabel icon="🎂">Age Distribution ({dm.ageTotal} recorded)</CardLabel>
                        {(dm.ageRanges||[]).map((r,i) => (
                          <HBar key={i} label={`${r.range} yrs`} count={r.count} max={Math.max(...dm.ageRanges.map(x=>x.count),1)} color={[C.blue,C.cyan,C.green,C.amber,C.pink,C.purple][i%6]} showPct total={dm.ageTotal}/>
                        ))}
                      </Card>
                    )}

                    {gasDeployed && (
                      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'16px'}}>
                        <DemogSection title="Religion" items={dm.religions} color={C.gold} icon="🛐"/>
                        <DemogSection title="Town / City" items={dm.towns} color={C.cyan} icon="🏙️"/>
                        <DemogSection title="Father's Occupation" items={dm.fatherOccupations} color={C.blue} icon="👨‍💼"/>
                        <DemogSection title="Mother's Occupation" items={dm.motherOccupations} color={C.pink} icon="👩‍💼"/>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* ══════════ ACADEMIC ══════════════════════════════════════════ */}
              {tab === 'academic' && (() => {
                const sc = data.scores || {};
                return (
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                      <Card accent={scoreColor(sc.avg)} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',gridColumn:'1 / -1'}}>
                        <p style={{fontSize:'10px',color:C.muted,fontWeight:900,letterSpacing:'0.1em',marginBottom:'10px'}}>SCHOOL AVERAGE SCORE</p>
                        <div style={{fontSize:'54px',fontWeight:900,color:scoreColor(sc.avg),textShadow:`0 0 30px ${scoreColor(sc.avg)}44`}}>{sc.avg}%</div>
                        <p style={{fontSize:'12px',color:C.text,marginTop:'4px',fontWeight:700}}>{sc.avg>=80?'Excellent Performance 🎉':sc.avg>=60?'Good Performance 👍':sc.avg>=40?'Needs Improvement ⚠️':'Critical Alert 🚨'}</p>
                      </Card>

                      <KpiCard icon="⭐" label="Distinctions" value={sc.distinctions || 0} color={C.green}/>
                      <KpiCard icon="❌" label="Fails" value={sc.fails || 0} color={sc.fails>0?C.red:C.green}/>
                    </div>

                    {sc.subjectAvg?.length > 0 ? (
                      <Card accent={C.purple}>
                        <CardLabel icon="📚">Subject Performance</CardLabel>
                        {sc.subjectAvg.map((s,i) => (
                          <HBar key={i} label={s.subject} count={s.avg} max={100} color={scoreColor(s.avg)}/>
                        ))}
                      </Card>
                    ) : (
                       <Card><p style={{textAlign:'center',color:C.muted,fontSize:'12px'}}>No subject data available.</p></Card>
                    )}
                  </>
                );
              })()}

              {/* ══════════ FINANCE ══════════════════════════════════════════ */}
              {tab === 'finance' && (() => {
                const f = data.fees || {};
                const total = (f.paid || 0) + (f.pending || 0);
                const rate  = total > 0 ? Math.round(f.paid/total*100) : 0;
                
                return (
                  <>
                    <Card accent={C.green} style={{textAlign:'center',padding:'30px 20px'}}>
                      <p style={{fontSize:'10px',color:C.muted,fontWeight:900,letterSpacing:'0.2em',marginBottom:'10px'}}>TOTAL REVENUE (MMK)</p>
                      <p style={{fontSize:'42px',fontWeight:900,color:C.green,margin:0,textShadow:`0 0 30px ${C.green}44`}}>{(f.revenue||0).toLocaleString()}</p>
                    </Card>

                    <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'12px'}}>
                      <Card accent={rate>=80?C.green:rate>=50?C.amber:C.red}>
                        <CardLabel icon="📈">Collection Status</CardLabel>
                        <div style={{display:'flex',alignItems:'center',gap:'20px'}}>
                          <DonutChart percentage={rate} color={rate>=80?C.green:rate>=50?C.amber:C.red} size={100}/>
                          <div style={{flex:1,display:'flex',flexDirection:'column',gap:'12px'}}>
                            <div style={{background:`${C.green}15`,padding:'12px',borderRadius:'12px',border:`1px solid ${C.green}33`}}>
                              <p style={{fontSize:'9px',color:C.green,fontWeight:900,textTransform:'uppercase',margin:'0 0 4px'}}>Paid Students</p>
                              <p style={{fontSize:'20px',fontWeight:900,color:C.text,margin:0}}>{f.paid || 0}</p>
                            </div>
                            <div style={{background:`${C.amber}15`,padding:'12px',borderRadius:'12px',border:`1px solid ${C.amber}33`}}>
                              <p style={{fontSize:'9px',color:C.amber,fontWeight:900,textTransform:'uppercase',margin:'0 0 4px'}}>Pending Students</p>
                              <p style={{fontSize:'20px',fontWeight:900,color:C.text,margin:0}}>{f.pending || 0}</p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </>
                );
              })()}

              {/* ══════════ OPERATIONS (Includes Recent Detailed Leaves) ══════ */}
              {tab === 'ops' && (() => {
                const st = data.staff || {};
                const lv = data.leaves || {};
                
                return (
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                      <KpiCard icon="👔" label="Total Staff" value={st.total || 0} color={C.cyan}/>
                      <KpiCard icon="✅" label="Active Staff" value={st.active || 0} color={C.green}/>
                    </div>

                    {st.byPosition?.length > 0 && (
                      <Card accent={C.purple}>
                        <CardLabel icon="🏷️">Staff Roles</CardLabel>
                        <RankList items={st.byPosition} color={C.purple} total={st.total}/>
                      </Card>
                    )}

                    <Card accent={C.amber}>
                      <CardLabel icon="📅">Leave Requests Overview</CardLabel>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'24px'}}>
                        {[
                          {label:'Pending', value:lv.pending||0,  color:C.amber},
                          {label:'Approved',value:lv.approved||0, color:C.green},
                          {label:'Rejected',value:lv.rejected||0, color:C.red},
                        ].map((x,i) => (
                          <div key={i} style={{background:`${x.color}15`,border:`1px solid ${x.color}33`,borderRadius:'14px',padding:'16px 10px',textAlign:'center'}}>
                            <div style={{fontSize:'24px',fontWeight:900,color:x.color}}>{x.value}</div>
                            <div style={{fontSize:'8px',color:C.text,textTransform:'uppercase',letterSpacing:'0.1em',marginTop:'6px',fontWeight:700}}>{x.label}</div>
                          </div>
                        ))}
                      </div>
                      
                      {lv.recent?.length > 0 && (
                        <div>
                          <p style={{fontSize:'11px',color:C.text,fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'14px'}}>Recent Detailed Leaves</p>
                          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                            {lv.recent.slice(0,10).map((l,i) => (
                              <div key={i} style={{background:C.surf2,padding:'16px',borderRadius:'16px',display:'flex',flexDirection:'column',gap:'10px',border:`1px solid ${C.border}`}}>
                                {/* Name, Labels, Status */}
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                                  <div>
                                    <p style={{fontSize:'14px',fontWeight:900,color:C.text,margin:'0 0 6px'}}>{l.Name}</p>
                                    <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
                                      <span style={{fontSize:'9px',color:C.gold,background:'rgba(251,191,36,0.1)',padding:'3px 8px',borderRadius:'6px',fontWeight:700}}>{l.Leave_Type}</span>
                                      {(l.Grade || l.Class) && (
                                        <span style={{fontSize:'9px',color:C.cyan,background:'rgba(34,211,238,0.1)',padding:'3px 8px',borderRadius:'6px',fontWeight:700}}>
                                          {l.Grade ? `G-${l.Grade}` : ''}{l.Grade && l.Class ? ' · ' : ''}{l.Class || ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div style={{textAlign:'right'}}>
                                    <span style={{fontSize:'9px',fontWeight:900,padding:'5px 14px',borderRadius:'99px',textTransform:'uppercase',
                                      background:l.Status==='Approved'?`${C.green}22`:l.Status==='Rejected'?`${C.red}22`:`${C.amber}22`,
                                      color:l.Status==='Approved'?C.green:l.Status==='Rejected'?C.red:C.amber}}>
                                      {l.Status}
                                    </span>
                                    <p style={{fontSize:'16px',fontWeight:900,color:C.text,margin:'8px 0 0',lineHeight:1}}>{l.Total_Days} <span style={{fontSize:'9px',color:C.muted,fontWeight:600}}>Day{l.Total_Days > 1 ? 's' : ''}</span></p>
                                  </div>
                                </div>
                                {/* Date Range and Reason */}
                                <div style={{background:'rgba(0,0,0,0.3)',padding:'12px',borderRadius:'10px',border:`1px solid rgba(255,255,255,0.05)`}}>
                                  <p style={{fontSize:'10px',color:C.cyan,fontWeight:700,margin:'0 0 6px'}}>
                                    📅 {cleanDateStr(l.Start_Date)} {l.End_Date && cleanDateStr(l.End_Date) !== cleanDateStr(l.Start_Date) ? `→ ${cleanDateStr(l.End_Date)}` : ''}
                                  </p>
                                  <p style={{fontSize:'11px',color:C.muted,margin:0,fontStyle:'italic',lineHeight:1.4}}>
                                    "{l.Reason || 'No reason provided'}"
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  </>
                );
              })()}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}