"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

// ── Lavender palette (matches layout.js) ─────────────────────────────────────
const C = {
  bg        : '#CBCBE5',
  card      : 'rgba(255,255,255,0.72)',
  cardHover : 'rgba(255,255,255,0.92)',
  border    : 'rgba(158,158,202,0.28)',
  ink       : '#1E1B4B',
  mid       : '#4C4A8E',
  muted     : '#9E9ECA',
  faint     : '#B8B6D9',
  shadow    : '0 2px 12px rgba(107,107,168,0.12)',
  shadowHov : '0 6px 20px rgba(107,107,168,0.22)',
};

const NAV_CARDS = [
  { label:'School Dashboard', sublabel:'ကျောင်းသတင်းများ',    icon:'🏫', path:'/student/school-dashboard', accent:'#818CF8' },
  { label:'My Profile',       sublabel:'ကိုယ်ရေးအချက်အလက်',   icon:'👤', path:'/student/profile',          accent:'#A78BFA' },
  { label:'My Performance',   sublabel:'ရမှတ်များ / Scores',   icon:'⭐', path:'/student/my-performance',   accent:'#FCD34D' },
  { label:'My Timetable',     sublabel:'နေ့စဉ် ဘာသာရပ်ဇယား',  icon:'🗓️', path:'/student/timetable',         accent:'#6EE7B7' },
  { label:'Lost & Found',     sublabel:'ပစ္စည်းပျောက်/တွေ့',  icon:'🔍', path:'/student/lost-found',       accent:'#FCA5A5' },
];

export default function StudentHome() {
  const router = useRouter();
  const [user,          setUser]    = useState(null);
  const [announcements, setAnn]     = useState([]);
  const [fees,          setFees]    = useState([]);
  const [loading,       setLoading] = useState(true);
  const [hovered,       setHovered] = useState(null);

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
        setFees((fee.data || []).filter(f => {
          const fid = (f.Student_ID || f.student_id || f['Enrollment No.'] || '').toString().trim();
          return myID && fid === myID;
        }));
      }
    } catch {}
    setLoading(false);
  };

  const unpaidFees = fees.filter(f => {
    const s   = (f.Status||'').toLowerCase();
    const amt = Number(f.Next_Due_Amount||f.Amount_Due||f.Amount||0);
    return amt > 0 && s !== 'paid' && s !== 'complete' && s !== 'completed';
  });
  const urgentAnn = announcements.filter(a => a.Is_Priority === true || a.Is_Priority === 'TRUE');

  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column',
      background:C.bg, overflowY:'auto',
      WebkitOverflowScrolling:'touch', paddingBottom:'24px',
    }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg) } }
        * { box-sizing:border-box }
        .nav-card { transition: box-shadow 0.15s, transform 0.15s, background 0.15s }
        .nav-card:hover { transform:translateX(3px) }
      `}</style>

      {/* ── Welcome banner ── */}
      <div style={{
        background:'linear-gradient(135deg, #9E9ECA 0%, #6B6BA8 100%)',
        padding:'20px 20px 24px',
        position:'relative', overflow:'hidden',
      }}>
        {/* subtle pattern */}
        <div style={{
          position:'absolute', top:'-40px', right:'-40px',
          width:'140px', height:'140px',
          background:'rgba(255,255,255,0.08)',
          borderRadius:'50%', pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', bottom:'-30px', left:'10%',
          width:'80px', height:'80px',
          background:'rgba(255,255,255,0.05)',
          borderRadius:'50%', pointerEvents:'none',
        }}/>

        <div style={{ maxWidth:'480px', margin:'0 auto', position:'relative', zIndex:1 }}>
          {loading ? (
            <div style={{ height:'52px', display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'22px', height:'22px',
                            border:'2px solid rgba(255,255,255,0.2)',
                            borderTop:'2px solid #fff',
                            borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
              <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'12px' }}>Loading...</span>
            </div>
          ) : (
            <>
              <p style={{ fontSize:'9px', color:'rgba(255,255,255,0.60)',
                          textTransform:'uppercase', letterSpacing:'0.22em',
                          margin:'0 0 5px', fontWeight:700 }}>
                Welcome back
              </p>
              <h1 style={{ fontWeight:900, fontSize:'22px', color:'#fff',
                           margin:'0 0 5px', textTransform:'uppercase',
                           letterSpacing:'0.04em', textShadow:'0 2px 8px rgba(0,0,0,0.15)' }}>
                {user?.Name || user?.name || 'Student'}
              </h1>
              <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)', margin:0, fontWeight:600 }}>
                {user?.Grade ? `Grade ${user.Grade}` : ''}
                {user?.House ? ` · ${user.House} House` : ''}
                {user?.['Enrollment No.'] ? ` · #${user['Enrollment No.']}` : ''}
              </p>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth:'480px', margin:'0 auto', padding:'16px',
                    width:'100%', display:'flex', flexDirection:'column', gap:'14px' }}>

        {/* ── Urgent notice ── */}
        {urgentAnn.length > 0 && (
          <div style={{
            background:'rgba(220,38,38,0.08)',
            border:'1px solid rgba(220,38,38,0.25)',
            borderLeft:'4px solid #dc2626',
            borderRadius:'14px', padding:'12px 14px',
          }}>
            <span style={{ background:'#dc2626', color:'#fff', fontSize:'8px',
                           fontWeight:800, padding:'2px 8px', borderRadius:'99px',
                           textTransform:'uppercase', display:'inline-block',
                           marginBottom:'6px' }}>
              🚨 Urgent
            </span>
            <p style={{ fontWeight:800, fontSize:'13px', color:C.ink, margin:'0 0 3px' }}>
              {urgentAnn[0].Title}
            </p>
            <p style={{ fontSize:'11px', color:C.mid, margin:0 }}>{urgentAnn[0].Message}</p>
          </div>
        )}

        {/* ── Quick status cards ── */}
        {!loading && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            {/* Fees */}
            <div style={{
              background:C.card, border:`1px solid ${C.border}`,
              borderRadius:'16px', padding:'16px', textAlign:'center',
              boxShadow:C.shadow,
              borderTop:`3px solid ${unpaidFees.length > 0 ? '#FCA5A5' : '#6EE7B7'}`,
            }}>
              <div style={{ fontSize:'24px', fontWeight:900,
                            color: unpaidFees.length > 0 ? '#DC2626' : '#059669' }}>
                {unpaidFees.length > 0 ? unpaidFees.length : '✓'}
              </div>
              <div style={{ fontSize:'9px', color:C.muted, textTransform:'uppercase',
                            letterSpacing:'0.1em', marginTop:'3px', fontWeight:700 }}>
                {unpaidFees.length > 0 ? 'Pending Fees' : 'Fees Clear'}
              </div>
            </div>
            {/* Announcements */}
            <div style={{
              background:C.card, border:`1px solid ${C.border}`,
              borderRadius:'16px', padding:'16px', textAlign:'center',
              boxShadow:C.shadow, borderTop:`3px solid #818CF8`,
            }}>
              <div style={{ fontSize:'24px', fontWeight:900, color:'#4338CA' }}>
                {announcements.length}
              </div>
              <div style={{ fontSize:'9px', color:C.muted, textTransform:'uppercase',
                            letterSpacing:'0.1em', marginTop:'3px', fontWeight:700 }}>
                Announcements
              </div>
            </div>
          </div>
        )}

        {/* ── Quick Access nav cards ── */}
        <div>
          <p style={{ fontSize:'9px', color:C.muted, textTransform:'uppercase',
                      letterSpacing:'0.18em', fontWeight:800, margin:'0 0 10px' }}>
            Quick Access
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
            {NAV_CARDS.map((c, i) => (
              <button key={i}
                className="nav-card"
                onClick={() => router.push(c.path)}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background   : hovered === i ? C.cardHover : C.card,
                  border       : `1px solid ${C.border}`,
                  borderLeft   : `4px solid ${c.accent}`,
                  borderRadius : '16px',
                  padding      : '14px 16px',
                  cursor       : 'pointer',
                  display      : 'flex',
                  alignItems   : 'center',
                  gap          : '14px',
                  textAlign    : 'left',
                  width        : '100%',
                  boxShadow    : hovered === i ? C.shadowHov : C.shadow,
                }}>
                <span style={{ fontSize:'24px', flexShrink:0 }}>{c.icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:800, fontSize:'13px', color:C.ink,
                               margin:'0 0 2px' }}>{c.label}</p>
                  <p style={{ fontSize:'10px', color:C.muted, margin:0 }}>{c.sublabel}</p>
                </div>
                <span style={{ color:C.faint, fontSize:'18px', fontWeight:300 }}>›</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Announcements list ── */}
        {announcements.length > 0 && (
          <div>
            <p style={{ fontSize:'9px', color:C.muted, textTransform:'uppercase',
                        letterSpacing:'0.18em', fontWeight:800, margin:'0 0 10px' }}>
              📢 ကြေညာချက်များ
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {announcements.map((a, i) => {
                const urgent = a.Is_Priority === true || a.Is_Priority === 'TRUE';
                return (
                  <div key={i} style={{
                    background   : C.card,
                    border       : `1px solid ${urgent ? 'rgba(220,38,38,0.25)' : C.border}`,
                    borderLeft   : `4px solid ${urgent ? '#dc2626' : C.muted}`,
                    borderRadius : '14px', padding:'12px 14px',
                    boxShadow    : C.shadow,
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between',
                                  alignItems:'flex-start', gap:'8px', marginBottom:'4px' }}>
                      <p style={{ fontWeight:800, fontSize:'12px', color:C.ink, margin:0 }}>
                        {a.Title}
                      </p>
                      <span style={{ fontSize:'9px', color:C.faint, flexShrink:0 }}>{a.Date}</span>
                    </div>
                    <p style={{ fontSize:'11px', color:C.mid, margin:0, lineHeight:1.5,
                                overflow:'hidden', display:'-webkit-box',
                                WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                      {a.Message}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Pending fees ── */}
        {unpaidFees.length > 0 && (
          <div>
            <p style={{ fontSize:'9px', color:C.muted, textTransform:'uppercase',
                        letterSpacing:'0.18em', fontWeight:800, margin:'0 0 10px' }}>
              ⏳ Pending Fees
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              {unpaidFees.slice(0, 3).map((f, i) => (
                <div key={i} style={{
                  background   : C.card, border:`1px solid ${C.border}`,
                  borderRadius : '14px', padding:'12px 16px',
                  display:'flex', justifyContent:'space-between',
                  alignItems:'center', boxShadow:C.shadow,
                }}>
                  <div>
                    <p style={{ fontWeight:800, fontSize:'12px', color:C.ink,
                                 margin:'0 0 2px' }}>
                      {f.Fee_Category || f.Fee_Type || f.Description || 'Fee'}
                    </p>
                    <p style={{ fontSize:'9px', color:C.muted, margin:0 }}>
                      Due: {f.Next_Due_Date || f.Due_Date || '—'}
                    </p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontWeight:900, fontSize:'13px', color:'#DC2626', margin:'0 0 3px' }}>
                      {Number(f.Next_Due_Amount||f.Amount||0).toLocaleString()} ks
                    </p>
                    <span style={{ fontSize:'8px', padding:'2px 8px', borderRadius:'99px',
                                   background:'rgba(220,38,38,0.10)',
                                   color:'#DC2626', fontWeight:800 }}>
                      Pending
                    </span>
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