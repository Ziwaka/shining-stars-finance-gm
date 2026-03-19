"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const S = {
  page: { minHeight:'100vh', background:'#0f0a1e', color:'#fff', fontFamily:'system-ui,sans-serif', paddingBottom:'32px' },
  card: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', padding:'16px' },
};

const NAV_CARDS = [
  { label:'School Dashboard', sublabel:'ကျောင်းသတင်းများ', icon:'🏫', path:'/student/school-dashboard', color:'#60a5fa' },
  { label:'My Profile',       sublabel:'ကိုယ်ရေးအချက်အလက်', icon:'👤', path:'/student/profile',          color:'#c084fc' },
  { label:'My Performance',   sublabel:'ရမှတ်များ / Scores',  icon:'⭐', path:'/student/my-performance',   color:'#fbbf24' },
  { label:'Leave Form',       sublabel:'ခွင့်လျှောက်ရန်',      icon:'📄', path:'/student/student-leave',    color:'#34d399' },
  { label:'Lost & Found',     sublabel:'ပစ္စည်းပျောက်/တွေ့',   icon:'🔍', path:'/student/lost-found',       color:'#fb923c' },
];

export default function StudentHome() {
  const router = useRouter();
  const [user, setUser]           = useState(null);
  const [announcements, setAnn]   = useState([]);
  const [fees, setFees]           = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!saved || saved === 'undefined') { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.userRole !== 'student') { router.push('/login'); return; }
    setUser(u);
    fetchData(u);
  }, []);

  const fetchData = async (u) => {
    const myID = (u.Student_ID || u['Enrollment No.'] || '').toString().trim();
    try {
      const [annRes, feeRes] = await Promise.all([
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getAnnouncements' }) }),
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getData', sheetName:'Fees_Management' }) }),
      ]);
      const ann = await annRes.json();
      const fee = await feeRes.json();
      if (ann.success) {
        const all = ann.data || [];
        setAnn(all.filter(a => a.Target_Student === true || a.Target_Student === 'TRUE').slice(0, 5));
      }
      if (fee.success && myID) {
        setFees((fee.data || []).filter(f => f.Student_ID?.toString().trim() === myID));
      }
    } catch {}
    setLoading(false);
  };

  const unpaidFees = fees.filter(f => f.Status !== 'Paid' && f.Status !== 'paid' && f.Status);
  const urgentAnn  = announcements.filter(a => a.Is_Priority === true || a.Is_Priority === 'TRUE');

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>

      {/* WELCOME HEADER */}
      <div style={{ background:'linear-gradient(135deg, #1e1040 0%, #0f0a1e 100%)', borderBottom:'4px solid #fbbf24', padding:'20px 16px 16px' }}>
        <div style={{ maxWidth:'480px', margin:'0 auto' }}>
          {loading ? (
            <div style={{ height:'48px', display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'24px', height:'24px', border:'2px solid rgba(255,255,255,0.1)', borderTop:'2px solid #fbbf24', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              <span style={{ color:'rgba(255,255,255,0.3)', fontSize:'12px' }}>Loading...</span>
            </div>
          ) : (
            <div>
              <p style={{ fontSize:'10px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.2em', margin:'0 0 4px' }}>Welcome back</p>
              <h1 style={{ fontWeight:900, fontSize:'22px', color:'#fff', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                {user?.Name || user?.name || 'Student'}
              </h1>
              <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.35)', margin:0 }}>
                {user?.Grade ? `Grade ${user.Grade}` : ''} {user?.House ? `· ${user.House} House` : ''} {user?.['Enrollment No.'] ? `· #${user['Enrollment No.']}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:'480px', margin:'0 auto', padding:'16px', display:'flex', flexDirection:'column', gap:'14px' }}>

        {/* URGENT ANNOUNCEMENTS */}
        {urgentAnn.length > 0 && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderLeft:'5px solid #dc2626', borderRadius:'14px', padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
              <span style={{ background:'#dc2626', color:'#fff', fontSize:'8px', fontWeight:900, padding:'2px 8px', borderRadius:'99px', textTransform:'uppercase' }}>🚨 Urgent</span>
            </div>
            <p style={{ fontWeight:900, fontSize:'13px', color:'#fff', margin:'0 0 3px' }}>{urgentAnn[0].Title}</p>
            <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.5)', margin:0 }}>{urgentAnn[0].Message}</p>
          </div>
        )}

        {/* QUICK STATUS */}
        {!loading && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
            <div style={{ ...S.card, textAlign:'center' }}>
              <div style={{ fontSize:'22px', fontWeight:900, color: unpaidFees.length > 0 ? '#fbbf24' : '#34d399' }}>
                {unpaidFees.length > 0 ? unpaidFees.length : '✓'}
              </div>
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:'2px' }}>
                {unpaidFees.length > 0 ? 'Pending Fees' : 'Fees Clear'}
              </div>
            </div>
            <div style={{ ...S.card, textAlign:'center' }}>
              <div style={{ fontSize:'22px', fontWeight:900, color:'#60a5fa' }}>{announcements.length}</div>
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:'2px' }}>Announcements</div>
            </div>
          </div>
        )}

        {/* NAV CARDS */}
        <div>
          <p style={{ fontSize:'9px', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.18em', fontWeight:900, margin:'0 0 10px' }}>Quick Access</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {NAV_CARDS.map((c, i) => (
              <button key={i} onClick={() => router.push(c.path)}
                style={{ background:'rgba(255,255,255,0.04)', border:`1px solid rgba(255,255,255,0.08)`, borderLeft:`4px solid ${c.color}`, borderRadius:'14px', padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:'14px', textAlign:'left', width:'100%', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}>
                <span style={{ fontSize:'24px', flexShrink:0 }}>{c.icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:900, fontSize:'13px', color:'#fff', margin:'0 0 2px' }}>{c.label}</p>
                  <p style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)', margin:0 }}>{c.sublabel}</p>
                </div>
                <span style={{ color:'rgba(255,255,255,0.2)', fontSize:'16px' }}>›</span>
              </button>
            ))}
          </div>
        </div>

        {/* RECENT ANNOUNCEMENTS */}
        {announcements.length > 0 && (
          <div>
            <p style={{ fontSize:'9px', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.18em', fontWeight:900, margin:'0 0 10px' }}>📢 ကြေညာချက်များ</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {announcements.map((a, i) => {
                const urgent = a.Is_Priority === true || a.Is_Priority === 'TRUE';
                return (
                  <div key={i} style={{ background:'rgba(255,255,255,0.04)', border:`1px solid ${urgent ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`, borderLeft:`4px solid ${urgent ? '#dc2626' : '#fbbf24'}`, borderRadius:'12px', padding:'12px 14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'4px' }}>
                      <p style={{ fontWeight:900, fontSize:'12px', color:'#fff', margin:0 }}>{a.Title}</p>
                      <span style={{ fontSize:'9px', color:'rgba(255,255,255,0.25)', flexShrink:0 }}>{a.Date}</span>
                    </div>
                    <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)', margin:0, lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{a.Message}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PENDING FEES */}
        {unpaidFees.length > 0 && (
          <div>
            <p style={{ fontSize:'9px', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', letterSpacing:'0.18em', fontWeight:900, margin:'0 0 10px' }}>⏳ Pending Fees</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {unpaidFees.slice(0, 3).map((f, i) => (
                <div key={i} style={{ ...S.card, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px' }}>
                  <div>
                    <p style={{ fontWeight:900, fontSize:'12px', color:'#fff', margin:'0 0 2px' }}>{f.Fee_Type || f.Description || 'Fee'}</p>
                    <p style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)', margin:0 }}>Due: {f.Due_Date || f.Next_Due_Date || '—'}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontWeight:900, fontSize:'13px', color:'#fbbf24', margin:0 }}>{Number(f.Amount||0).toLocaleString()} ks</p>
                    <span style={{ fontSize:'8px', padding:'2px 8px', borderRadius:'99px', background:'rgba(251,191,36,0.15)', color:'#fbbf24', fontWeight:900 }}>Pending</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}