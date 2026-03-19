"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WEB_APP_URL } from '@/lib/api';

export default function PublicAnnouncements() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getPublicData' }) })
      .then(r => r.json()).then(d => {
        if (d.success) setItems(d.announcements || []);
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(a =>
    !search || a.Title?.toLowerCase().includes(search.toLowerCase()) || a.Message?.toLowerCase().includes(search.toLowerCase())
  );
  const urgent = filtered.filter(a => a.Is_Priority === true || a.Is_Priority === 'TRUE');
  const normal = filtered.filter(a => a.Is_Priority !== true && a.Is_Priority !== 'TRUE');

  const S = { page: { display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden', background:'#0f0a1e', color:'#fff', fontFamily:'system-ui,sans-serif' } };

  return (
    <div style={S.page}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* HEADER */}
      <div style={{background:'#020617',borderBottom:'6px solid #fbbf24',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:40}}>
        <Link href="/public-zone" style={{color:'rgba(255,255,255,0.5)',fontSize:'13px',fontWeight:700}}>← Back</Link>
        <p style={{fontWeight:900,fontSize:'13px',color:'#fff',textTransform:'uppercase',letterSpacing:'0.1em'}}>📢 ကြေညာချက်များ</p>
        <div style={{width:'40px'}}/>
      </div>
      <div style={{flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom:'80px'}}>

      <div style={{maxWidth:'480px',margin:'0 auto',padding:'16px'}}>
        {/* Search */}
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="ကြေညာချက် ရှာရန်..."
          style={{width:'100%',background:'#fff',border:'2px solid #e2e8f0',borderRadius:'12px',padding:'10px 14px',fontSize:'13px',outline:'none',marginBottom:'16px',color:'#020617',boxSizing:'border-box'}}/>

        {loading ? (
          <div style={{display:'flex',justifyContent:'center',padding:'60px 0'}}>
            <div style={{width:'32px',height:'32px',border:'3px solid #e2e8f0',borderTop:'3px solid #fbbf24',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {/* Urgent */}
            {urgent.map((a,i) => (
              <div key={i} style={{background:'#fef2f2',border:'1px solid #fca5a5',borderLeft:'6px solid #dc2626',borderRadius:'16px',padding:'16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                  <span style={{background:'#dc2626',color:'#fff',fontSize:'8px',fontWeight:900,padding:'2px 10px',borderRadius:'99px',textTransform:'uppercase',flexShrink:0}}>🚨 URGENT</span>
                  <span style={{fontSize:'9px',color:'#ef4444'}}>{a.Date}</span>
                </div>
                <p style={{fontWeight:900,fontSize:'15px',color:'#020617',marginBottom:'8px'}}>{a.Title}</p>
                <p style={{fontSize:'13px',color:'#374151',lineHeight:1.7}}>{a.Message}</p>
                <p style={{fontSize:'9px',color:'#9ca3af',marginTop:'10px'}}>✍ {a.Posted_By}</p>
              </div>
            ))}

            {/* Normal */}
            {normal.map((a,i) => (
              <div key={i} style={{background:'#fff',border:'1px solid #f1f5f9',borderLeft:'5px solid #fbbf24',borderRadius:'16px',padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px',marginBottom:'8px'}}>
                  <p style={{fontWeight:900,fontSize:'14px',color:'#020617'}}>{a.Title}</p>
                  <span style={{fontSize:'9px',color:'#94a3b8',flexShrink:0}}>{a.Date}</span>
                </div>
                <p style={{fontSize:'13px',color:'#475569',lineHeight:1.7}}>{a.Message}</p>
                <p style={{fontSize:'9px',color:'#cbd5e1',marginTop:'10px'}}>✍ {a.Posted_By}</p>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{textAlign:'center',padding:'60px 0',color:'#94a3b8'}}>
                <div style={{fontSize:'40px',marginBottom:'12px'}}>📭</div>
                <p style={{fontWeight:700}}>ကြေညာချက် မရှိသေးပါ</p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}