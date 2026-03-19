"use client";
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { WEB_APP_URL } from '@/lib/api';

export default function PublicShoutbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [msg, setMsg]           = useState(null);
  const [form, setForm]         = useState({ name:'', message:'', phone:'' });
  const bottomRef               = useRef(null);

  const fetchMsgs = async () => {
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getShoutbox' }) });
      const r = await res.json();
      if (r.success) setMessages(r.data || []);
    } catch {} setLoading(false);
  };

  useEffect(() => { fetchMsgs(); }, []);

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };

  const handleSend = async () => {
    if (!form.name.trim())    return showMsg('နာမည် ထည့်ပါ', 'error');
    if (!form.message.trim()) return showMsg('Message ထည့်ပါ', 'error');
    if (form.message.length > 300) return showMsg('300 လုံးထက် မကျော်ပါနှင့်', 'error');
    setSending(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'postShoutbox', ...form }) });
      const r = await res.json();
      if (r.success) {
        showMsg('Message ပို့ပြီးပါပြီ ✓');
        setForm({ name:'', message:'', phone:'' });
        fetchMsgs();
      } else showMsg(r.message || 'Error', 'error');
    } catch { showMsg('Network error', 'error'); }
    setSending(false);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return diff + ' min ago';
    if (diff < 1440) return Math.floor(diff/60) + ' hr ago';
    return Math.floor(diff/1440) + ' days ago';
  };

  return (
    <div style={{minHeight:'100vh',background:'#f0fdf4',fontFamily:'system-ui,sans-serif',display:'flex',flexDirection:'column'}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* HEADER */}
      <div style={{background:'#020617',borderBottom:'6px solid #10b981',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:40}}>
        <Link href="/public-zone" style={{color:'rgba(255,255,255,0.5)',fontSize:'13px',fontWeight:700}}>← Back</Link>
        <div style={{textAlign:'center'}}>
          <p style={{fontWeight:900,fontSize:'13px',color:'#fff',textTransform:'uppercase',letterSpacing:'0.1em'}}>💬 Shoutbox</p>
          <p style={{fontSize:'9px',color:'#10b981',letterSpacing:'0.1em'}}>မေးမြန်းချက်များ</p>
        </div>
        <button onClick={fetchMsgs} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'16px'}}>↻</button>
      </div>

      {/* TOAST */}
      {msg && (
        <div style={{position:'fixed',top:'64px',left:'50%',transform:'translateX(-50%)',zIndex:50,padding:'8px 20px',borderRadius:'999px',fontSize:'12px',fontWeight:900,color:'#fff',background:msg.type==='error'?'#ef4444':'#10b981',boxShadow:'0 4px 20px rgba(0,0,0,0.3)',whiteSpace:'nowrap'}}>
          {msg.text}
        </div>
      )}

      {/* INFO BANNER */}
      <div style={{background:'#ecfdf5',borderBottom:'1px solid #a7f3d0',padding:'10px 16px',textAlign:'center'}}>
        <p style={{fontSize:'11px',color:'#059669',fontWeight:700}}>
          📌 ဤနေရာတွင် မေးသည့် မေးခွန်းများကို ကျောင်းဝန်ထမ်းများ ဖတ်ရှုပြီး ဖြေပါမည်
        </p>
      </div>

      {/* MESSAGES */}
      <div style={{flex:1,overflowY:'auto',maxWidth:'480px',width:'100%',margin:'0 auto',padding:'16px',display:'flex',flexDirection:'column',gap:'10px',paddingBottom:'0'}}>
        {loading ? (
          <div style={{display:'flex',justifyContent:'center',padding:'40px 0'}}>
            <div style={{width:'28px',height:'28px',border:'3px solid #d1fae5',borderTop:'3px solid #10b981',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ) : messages.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px 0',color:'#94a3b8'}}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>💬</div>
            <p style={{fontWeight:700}}>မေးမြန်းချက် မရှိသေးပါ</p>
            <p style={{fontSize:'12px',marginTop:'4px'}}>ပထမဆုံး မေးမြန်းသူ ဖြစ်ပါ</p>
          </div>
        ) : messages.map((m, i) => (
          <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:'16px',borderTopLeftRadius:'4px',padding:'12px 14px',boxShadow:'0 2px 6px rgba(0,0,0,0.04)',maxWidth:'90%'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
              <span style={{fontWeight:900,fontSize:'12px',color:'#020617'}}>
                👤 {m.Name || 'Anonymous'}
              </span>
              <span style={{fontSize:'9px',color:'#94a3b8'}}>{timeAgo(m.Date)}</span>
            </div>
            <p style={{fontSize:'13px',color:'#334155',lineHeight:1.65}}>{m.Message}</p>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* INPUT FORM */}
      <div style={{background:'#fff',borderTop:'2px solid #e2e8f0',padding:'16px',position:'sticky',bottom:0}}>
        <div style={{maxWidth:'480px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'8px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              placeholder="နာမည် *" maxLength={30}
              style={{background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:'10px',padding:'9px 12px',fontSize:'12px',outline:'none',color:'#020617'}}/>
            <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}
              placeholder="ဖုန်း (optional)"
              style={{background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:'10px',padding:'9px 12px',fontSize:'12px',outline:'none',color:'#020617'}}/>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))}
              placeholder="မေးမြန်းချက် ရေးပါ... (max 300)" maxLength={300} rows={2}
              style={{flex:1,background:'#f8fafc',border:'1.5px solid #e2e8f0',borderRadius:'10px',padding:'9px 12px',fontSize:'12px',outline:'none',resize:'none',color:'#020617'}}/>
            <button onClick={handleSend} disabled={sending}
              style={{background:sending?'#e2e8f0':'#10b981',color:sending?'#94a3b8':'#fff',border:'none',borderRadius:'10px',padding:'0 16px',fontWeight:900,fontSize:'18px',cursor:sending?'default':'pointer',flexShrink:0}}>
              {sending?'...':'➤'}
            </button>
          </div>
          <p style={{fontSize:'9px',color:'#94a3b8',textAlign:'right'}}>{form.message.length}/300</p>
        </div>
      </div>
    </div>
  );
}