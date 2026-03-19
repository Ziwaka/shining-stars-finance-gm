"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WEB_APP_URL } from '@/lib/api';

export default function PublicZoneMenu() {
  const [announcements, setAnnouncements] = useState([]);
  const [urgent, setUrgent] = useState([]);

  useEffect(() => {
    fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getPublicData' }) })
      .then(r => r.json()).then(d => {
        if (d.success) {
          const all = d.announcements || [];
          setAnnouncements(all.slice(0, 3));
          setUrgent(all.filter(a => a.Is_Priority === true || a.Is_Priority === 'TRUE'));
        }
      }).catch(() => {});
  }, []);

  const S = {
    page: { minHeight:'100vh', background:'#fdfcf0', fontFamily:'system-ui,sans-serif', color:'#020617' },
    card: { background:'#fff', borderRadius:'24px', padding:'20px', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:'1px solid #f1f5f9' },
  };

  return (
    <div style={S.page}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} a{text-decoration:none}`}</style>

      {/* URGENT MARQUEE */}
      {urgent.length > 0 && (
        <div style={{background:'#fbbf24',borderTop:'4px solid #dc2626',borderBottom:'4px solid #dc2626',padding:'10px 0',overflow:'hidden',position:'relative'}}>
          <div style={{display:'flex',alignItems:'center'}}>
            <div style={{flexShrink:0,padding:'0 20px',background:'#fbbf24',borderRight:'4px solid #dc2626',marginRight:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'18px',animation:'pulse 1s infinite'}}>🚨</span>
              <span style={{fontWeight:900,fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.15em',color:'#dc2626'}}>Urgent</span>
            </div>
            <div style={{whiteSpace:'nowrap',fontWeight:900,fontSize:'14px',color:'#dc2626',letterSpacing:'0.05em',animation:'marquee 20s linear infinite'}}>
              {urgent.map(u => u.Title + '  ·  ').join('')}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes marquee{0%{transform:translateX(100vw)}100%{transform:translateX(-100%)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* HEADER */}
      <div style={{background:'#020617',borderBottom:'8px solid #fbbf24',padding:'20px 20px 16px'}}>
        <div style={{maxWidth:'480px',margin:'0 auto',display:'flex',alignItems:'center',gap:'14px'}}>
          <img src="/logo.png" alt="Logo" style={{width:'52px',height:'52px',borderRadius:'12px',border:'3px solid #fbbf24'}} onError={e=>e.target.style.display='none'}/>
          <div>
            <p style={{fontWeight:900,fontSize:'16px',color:'#fff',textTransform:'uppercase',letterSpacing:'0.05em'}}>Shining Stars - Ma Thwe</p>
            <p style={{fontSize:'10px',color:'#fbbf24',textTransform:'uppercase',letterSpacing:'0.2em',marginTop:'2px'}}>Public Information Zone</p>
          </div>
        </div>
      </div>

      <div style={{maxWidth:'480px',margin:'0 auto',padding:'20px 16px',display:'flex',flexDirection:'column',gap:'16px'}}>

        {/* Recent urgent announcement */}
        {urgent.length > 0 && (
          <div style={{background:'#fef2f2',border:'2px solid #fca5a5',borderLeft:'6px solid #dc2626',borderRadius:'16px',padding:'14px 16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px'}}>
              <span style={{background:'#dc2626',color:'#fff',fontSize:'9px',fontWeight:900,padding:'2px 8px',borderRadius:'99px',textTransform:'uppercase'}}>URGENT</span>
              <span style={{fontSize:'9px',color:'#ef4444'}}>{urgent[0].Date}</span>
            </div>
            <p style={{fontWeight:900,fontSize:'14px',color:'#020617',marginBottom:'4px'}}>{urgent[0].Title}</p>
            <p style={{fontSize:'12px',color:'#6b7280',lineHeight:1.6}}>{urgent[0].Message}</p>
          </div>
        )}

        {/* Main nav cards */}
        <Link href="/public-zone/announcements">
          <div style={{...S.card,borderBottom:'6px solid #fbbf24',cursor:'pointer',transition:'transform 0.2s',display:'flex',alignItems:'center',gap:'16px'}}>
            <div style={{fontSize:'36px',flexShrink:0}}>📢</div>
            <div>
              <p style={{fontWeight:900,fontSize:'15px',color:'#020617',marginBottom:'3px'}}>ကျောင်းကြေညာချက်များ</p>
              <p style={{fontSize:'11px',color:'#94a3b8'}}>နောက်ဆုံးရ သတင်းများနှင့် အသိပေးချက်များ</p>
              {announcements.length > 0 && <p style={{fontSize:'9px',color:'#fbbf24',fontWeight:900,marginTop:'4px',textTransform:'uppercase',letterSpacing:'0.1em'}}>{announcements.length}+ announcements →</p>}
            </div>
          </div>
        </Link>

        <Link href="/public-zone/shoutbox">
          <div style={{...S.card,borderBottom:'6px solid #10b981',cursor:'pointer',display:'flex',alignItems:'center',gap:'16px'}}>
            <div style={{fontSize:'36px',flexShrink:0}}>💬</div>
            <div>
              <p style={{fontWeight:900,fontSize:'15px',color:'#020617',marginBottom:'3px'}}>မေးမြန်းချက် / Shoutbox</p>
              <p style={{fontSize:'11px',color:'#94a3b8'}}>ကျောင်းနှင့်ပတ်သက်ပြီး မေးမြန်းရန်</p>
              <p style={{fontSize:'9px',color:'#10b981',fontWeight:900,marginTop:'4px',textTransform:'uppercase',letterSpacing:'0.1em'}}>ကျောင်းဝန်ထမ်းများ ဖတ်ရှုမည် →</p>
            </div>
          </div>
        </Link>

        {/* Recent announcements preview */}
        {announcements.length > 0 && (
          <div>
            <p style={{fontSize:'9px',color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.15em',fontWeight:900,marginBottom:'10px'}}>နောက်ဆုံး ကြေညာချက်များ</p>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {announcements.map((a,i) => (
                <Link key={i} href="/public-zone/announcements">
                  <div style={{...S.card,padding:'12px 16px',cursor:'pointer',borderLeft:`4px solid ${a.Is_Priority==='TRUE'||a.Is_Priority===true?'#dc2626':'#fbbf24'}`}}>
                    <p style={{fontWeight:900,fontSize:'13px',color:'#020617',marginBottom:'3px'}}>{a.Title}</p>
                    <p style={{fontSize:'11px',color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.Message}</p>
                    <p style={{fontSize:'9px',color:'#cbd5e1',marginTop:'4px'}}>✍ {a.Posted_By} · {a.Date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href="/" style={{textAlign:'center',color:'#94a3b8',fontSize:'12px',display:'block',padding:'8px'}}>
          ◀ ပင်မစာမျက်နှာသို့
        </Link>
      </div>
    </div>
  );
}