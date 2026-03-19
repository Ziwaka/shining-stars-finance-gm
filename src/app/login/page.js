"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

export default function LoginPage() {
  const [role, setRole] = useState('STUDENT');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => setReady(true), 100);
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        router.push(u.userRole === 'management' ? '/management/mgt-dashboard' : u.userRole === 'staff' ? '/staff' : '/student');
      } catch { localStorage.removeItem('user'); sessionStorage.removeItem('user'); }
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', role: role.toLowerCase(), username: username.trim(), password: password.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        localStorage.setItem('user', JSON.stringify({ ...result.user, userRole: role.toLowerCase() }));
        router.push(role === 'MANAGEMENT' ? '/management/mgt-dashboard' : role === 'STAFF' ? '/staff' : '/student');
      } else {
        const msg = result.message || '';
        if (msg.includes('မရှိ') || msg.toLowerCase().includes('user')) setError('Username မှားနေသည်');
        else if (msg.includes('မှားယွင်း') || msg.toLowerCase().includes('password')) setError('Password မှားနေသည်');
        else setError('ဝင်ရောက်မှု မအောင်မြင်ပါ');
      }
    } catch { setError('ကွန်ရက် ချိတ်ဆက်မှု ကျရှုံးသည်'); }
    finally { setLoading(false); }
  };

  const ROLES = [
    { id: 'STUDENT',    label: 'Student',    sub: 'ကျောင်းသား' },
    { id: 'STAFF',      label: 'Staff',      sub: 'ဆရာ / ဆရာမ' },
    { id: 'MANAGEMENT', label: 'Mgt',        sub: 'စီမံခန့်ခွဲ' },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col" style={{background:'#0e0b1a'}}>

      {/* BG — clean, no scan lines */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{background:'#0e0b1a'}} />
        <div className="absolute top-0 right-0 w-96 h-96 opacity-10 pointer-events-none"
          style={{background:'radial-gradient(circle at 80% 10%, #d4af37, transparent 60%)'}} />
        <div className="absolute bottom-0 left-0 w-80 h-80 opacity-[0.06] pointer-events-none"
          style={{background:'radial-gradient(circle at 20% 90%, #7c3aed, transparent 60%)'}} />
      </div>

      {/* HEADER */}
      <div className={`flex items-center justify-between px-6 pt-6 transition-all duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}>
        <button onClick={() => router.push('/')} className="group flex items-center gap-2">
          <span style={{color:'rgba(212,175,55,0.4)', fontSize:'1.1rem', lineHeight:1}}>‹</span>
          <span style={{fontFamily:'Georgia,serif', fontSize:'0.6rem', letterSpacing:'0.3em', textTransform:'uppercase', color:'rgba(255,255,255,0.2)'}}>Home</span>
        </button>
        <p style={{fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'0.65rem', color:'rgba(212,175,55,0.4)', letterSpacing:'0.15em'}}>
          Shining Stars - Ma Thwe
        </p>
        <div style={{width:'3rem'}} />
      </div>

      {/* MAIN */}
      <div className={`flex-1 flex items-center justify-center px-6 py-8 transition-all duration-500 delay-100 ${ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{transform: ready ? 'translateY(0)' : 'translateY(16px)'}}>
        <div className="w-full" style={{maxWidth:'340px'}}>

          {/* LOGO */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{background:'rgba(212,175,55,0.08)', border:'1px solid rgba(212,175,55,0.2)'}}>
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-1.5"
                onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML='<span style="color:#d4af37;font-size:2rem">⭐</span>'; }} />
            </div>
          </div>

          {/* TITLE */}
          <div className="text-center mb-7">
            <h1 style={{
              fontFamily:'"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif',
              fontSize:'2.4rem', fontWeight:700, color:'#fff',
              letterSpacing:'-0.02em', lineHeight:1, marginBottom:'0.5rem'
            }}>Sign In</h1>
            <p style={{fontFamily:'Georgia,serif', fontSize:'0.55rem', color:'rgba(255,255,255,0.2)', letterSpacing:'0.45em', textTransform:'uppercase'}}>
              Authorized Access Only
            </p>
          </div>

          {/* ROLE SELECTOR */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.5rem', marginBottom:'1.5rem'}}>
            {ROLES.map(r => (
              <button key={r.id} type="button"
                onClick={() => { setRole(r.id); setError(''); }}
                className="relative flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all duration-200 active:scale-95"
                style={{
                  background: role === r.id ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.03)',
                  border: role === r.id ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.07)',
                }}>
                {role === r.id && (
                  <div className="absolute top-0 inset-x-4 h-px"
                    style={{background:'linear-gradient(to right, transparent, rgba(212,175,55,0.9), transparent)'}} />
                )}
                <span style={{
                  fontFamily:'Georgia,serif', fontSize:'0.65rem', fontWeight:700,
                  textTransform:'uppercase', letterSpacing:'0.08em',
                  color: role === r.id ? '#d4af37' : 'rgba(255,255,255,0.3)',
                  marginBottom:'0.2rem'
                }}>{r.label}</span>
                <span style={{
                  fontFamily:'sans-serif', fontSize:'0.55rem',
                  color: role === r.id ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.15)',
                }}>{r.sub}</span>
              </button>
            ))}
          </div>

          {/* INPUTS — underline style */}
          <div style={{marginBottom:'1.25rem'}}>
            <div style={{marginBottom:'1.25rem'}}>
              <label style={{display:'block', fontFamily:'Georgia,serif', fontSize:'0.55rem', letterSpacing:'0.4em', textTransform:'uppercase', color:'rgba(212,175,55,0.5)', marginBottom:'0.5rem'}}>
                Username
              </label>
              <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full outline-none transition-all"
                style={{
                  background:'transparent', color:'rgba(255,255,255,0.85)',
                  fontFamily:'Georgia,serif', fontSize:'0.9rem',
                  padding:'0.4rem 0', border:'none',
                  borderBottom:'1px solid rgba(255,255,255,0.12)',
                  width:'100%'
                }}
                onFocus={e => e.target.style.borderBottomColor='rgba(212,175,55,0.6)'}
                onBlur={e => e.target.style.borderBottomColor='rgba(255,255,255,0.12)'}
              />
            </div>
            <div>
              <label style={{display:'block', fontFamily:'Georgia,serif', fontSize:'0.55rem', letterSpacing:'0.4em', textTransform:'uppercase', color:'rgba(212,175,55,0.5)', marginBottom:'0.5rem'}}>
                Password
              </label>
              <div style={{position:'relative'}}>
                <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full outline-none transition-all"
                  style={{
                    background:'transparent', color:'rgba(255,255,255,0.85)',
                    fontFamily:'Georgia,serif', fontSize:'0.9rem',
                    padding:'0.4rem 0', paddingRight:'3rem',
                    border:'none', borderBottom:'1px solid rgba(255,255,255,0.12)',
                    width:'100%'
                  }}
                  onFocus={e => e.target.style.borderBottomColor='rgba(212,175,55,0.6)'}
                  onBlur={e => e.target.style.borderBottomColor='rgba(255,255,255,0.12)'}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{position:'absolute', right:0, top:'50%', transform:'translateY(-50%)',
                    fontFamily:'Georgia,serif', fontSize:'0.55rem', letterSpacing:'0.2em',
                    textTransform:'uppercase', color:'rgba(212,175,55,0.4)',
                    background:'none', border:'none', cursor:'pointer', padding:'0.25rem'}}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div style={{
              marginBottom:'1rem', padding:'0.65rem 1rem', borderRadius:'0.6rem',
              background:'rgba(220,38,38,0.07)', border:'1px solid rgba(220,38,38,0.2)',
              fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:'0.7rem',
              color:'rgba(252,165,165,0.8)', textAlign:'center'
            }}>{error}</div>
          )}

          {/* SUBMIT */}
          <button onClick={handleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl transition-all duration-300 active:scale-[0.98]"
            style={{
              padding:'0.95rem',
              background: loading ? 'rgba(212,175,55,0.2)' : 'linear-gradient(135deg, #d4af37, #a07828)',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(212,175,55,0.28)',
              cursor: loading ? 'not-allowed' : 'pointer',
              border: 'none'
            }}>
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full animate-spin inline-block"
                  style={{border:'2px solid rgba(0,0,0,0.2)', borderTopColor:'rgba(0,0,0,0.5)'}} />
                <span style={{fontFamily:'Georgia,serif', fontSize:'0.7rem', letterSpacing:'0.25em', textTransform:'uppercase', color:'rgba(0,0,0,0.4)'}}>
                  Verifying...
                </span>
              </>
            ) : (
              <span style={{fontFamily:'Georgia,serif', fontWeight:700, fontSize:'0.75rem', letterSpacing:'0.25em', textTransform:'uppercase', color:'#0e0b1a'}}>
                Authorize Entry
              </span>
            )}
          </button>

          {/* BOTTOM ORNAMENT */}
          <div className="flex items-center gap-3 mt-8">
            <div className="flex-1 h-px" style={{background:'linear-gradient(to right, transparent, rgba(212,175,55,0.15))'}} />
            <span style={{fontSize:'0.35rem', color:'rgba(212,175,55,0.25)'}}>◆ ◆ ◆</span>
            <div className="flex-1 h-px" style={{background:'linear-gradient(to left, transparent, rgba(212,175,55,0.15))'}} />
          </div>
        </div>
      </div>

      <p className="pb-5 text-center" style={{fontFamily:'Georgia,serif', fontSize:'0.5rem', color:'rgba(255,255,255,0.08)', letterSpacing:'0.4em', textTransform:'uppercase'}}>
        Shining Stars - Ma Thwe · Est. 2019
      </p>

      <style jsx global>{`
        * { -webkit-tap-highlight-color: transparent; }
        body { background: #0e0b1a !important; }
        input::placeholder { color: rgba(255,255,255,0.15) !important; font-style:italic; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #0e0b1a inset !important; -webkit-text-fill-color: rgba(255,255,255,0.85) !important; }
      `}</style>
    </div>
  );
}