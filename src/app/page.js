"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [zonesReady, setZonesReady] = useState(false);

  useEffect(() => {
    setTimeout(() => setReady(true), 80);
    setTimeout(() => setZonesReady(true), 1200);
    fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getData', sheetName:'Announcements' }) })
      .then(r=>r.json()).then(d=>{ if(d.data) localStorage.setItem('cached_announcements', JSON.stringify(d.data)); })
      .catch(()=>{});
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center text-white overflow-x-hidden" style={{background:'#1a0f2e'}}>

      {/* BG */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{background:'linear-gradient(160deg, #1f1040 0%, #1a0f2e 45%, #110920 100%)'}} />

      </div>

      {/* MAIN */}
      <div className={`flex flex-col items-center w-full max-w-[380px] px-8 transition-all duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
        style={{paddingTop:'clamp(3rem, 10vh, 5rem)', paddingBottom:'2rem'}}>

        {/* CREST */}
        <div className="mb-8 transition-all duration-1000 delay-100"
          style={{opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(16px)'}}>
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full opacity-20"
              style={{background:'radial-gradient(circle, #c9a84c 0%, transparent 70%)'}} />
            <div className="w-20 h-20 rounded-2xl overflow-hidden border shadow-lg" style={{borderColor:'#c9a84c', background:'rgba(201,168,76,0.08)'}}>
              <img src="/logo.png" alt="Shining Stars - Ma Thwe"
                className="w-full h-full object-contain p-1"
                onError={e => { e.target.style.display='none'; e.target.parentNode.innerHTML='<span style="font-size:2.5rem;display:flex;align-items:center;justify-content:center;height:100%">⭐</span>'; }} />
            </div>
          </div>
        </div>

        {/* SCHOOL NAME — always "Shining Stars - Ma Thwe" */}
        <div className="text-center mb-1 transition-all duration-1000 delay-200 w-full"
          style={{opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(16px)'}}>
          <p className="uppercase mb-5" style={{color:'#c9a84c', fontSize:'8px', letterSpacing:'0.5em', fontFamily:'Georgia, serif', letterSpacing:'0.5em'}}>
            Official Portal
          </p>
          <h1 className="text-white leading-tight mb-3"
            style={{
              fontFamily:'"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
              fontSize:'clamp(1.5rem, 7vw, 2rem)',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              textShadow: '0 2px 20px rgba(201,168,76,0.2)'
            }}>
            Shining Stars - Ma Thwe
          </h1>
          <div className="flex items-center justify-center gap-3 my-4">
            <div className="h-px flex-1" style={{background:'linear-gradient(to right, transparent, rgba(201,168,76,0.4))'}} />
            <span className="uppercase" style={{color:'#c9a84c', fontSize:'7px', letterSpacing:'0.6em', fontFamily:'Georgia, serif'}}>
              Private High School
            </span>
            <div className="h-px flex-1" style={{background:'linear-gradient(to left, transparent, rgba(201,168,76,0.4))'}} />
          </div>
        </div>

        {/* BUTTONS */}
        <div className="w-full space-y-3 mt-6 transition-all duration-1000 delay-300"
          style={{opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(16px)'}}>

          {/* Primary */}
          <button onClick={() => router.push('/login')}
            className="group w-full rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.98]"
            style={{
              background:'linear-gradient(135deg, #c9a84c 0%, #a07830 100%)',
              boxShadow:'0 4px 24px rgba(201,168,76,0.25), 0 1px 0 rgba(255,255,255,0.15) inset'
            }}>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="uppercase mb-0.5" style={{color:'#1a0f2e', fontSize:'8px', letterSpacing:'0.4em', fontFamily:'Georgia, serif'}}>Secure Entry</p>
                <p className="font-bold text-base tracking-wide uppercase" style={{color:'#1a0f2e', fontFamily:'Georgia, serif'}}>Sign In to Portal</p>
              </div>
              <span className="text-lg group-hover:translate-x-1 transition-transform" style={{color:'#1a0f2e'}}>→</span>
            </div>
          </button>

          {/* Secondary */}
          <button onClick={() => router.push('/public-zone')}
            className="group w-full rounded-2xl py-4 px-6 flex items-center justify-between transition-all duration-300 active:scale-[0.98]"
            style={{
              background:'rgba(255,255,255,0.04)',
              border:'1px solid rgba(201,168,76,0.2)'
            }}>
            <p className="text-white/50 text-sm tracking-widest uppercase group-hover:text-white/70 transition-colors"
              style={{fontFamily:'Georgia, serif'}}>
              Public Hub
            </p>
            <span className="text-white/20 group-hover:text-white/40 group-hover:translate-x-1 transition-all">→</span>
          </button>
        </div>

        {/* STATUS PANEL */}
        <div className="w-full mt-7 transition-all duration-700"
          style={{opacity: zonesReady ? 1 : 0}}>
          <div className="rounded-2xl px-5 py-4"
            style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="flex justify-between items-center mb-3 pb-3"
              style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <span className="uppercase text-white/25" style={{fontSize:'7px', letterSpacing:'0.4em', fontFamily:'Georgia, serif'}}>System Status</span>
              <span className="text-emerald-400/70 flex items-center gap-1.5 uppercase tracking-wider" style={{fontSize:'7px'}}>
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Online
              </span>
            </div>
            {['Student Zone','Staff Zone','Management','Cloud Database'].map((z,i) => (
              <div key={i} className="flex justify-between items-center py-1">
                <span className="text-white/25 tracking-wider uppercase" style={{fontSize:'8px', fontFamily:'Georgia, serif'}}>{z}</span>
                <span className="text-emerald-400/60 uppercase tracking-wider" style={{fontSize:'7px'}}>Ready</span>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-8 text-center space-y-1.5">
          <p className="text-white/20 uppercase" style={{fontSize:'7px', letterSpacing:'0.5em', fontFamily:'Georgia, serif'}}>
            Est. 2019 · Taunggyi, Southern Shan State
          </p>
          <p className="uppercase" style={{color:'#c9a84c', fontSize:'7px', letterSpacing:'0.4em', fontFamily:'Georgia, serif'}}>
            Developed by Shine Thit
          </p>
        </div>
      </div>
    </div>
  );
}