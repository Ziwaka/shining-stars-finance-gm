"use client";
import { getPhotoUrl } from "@/lib/cloudinary";
import Image from "next/image";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL, GIDS } from '@/lib/api';

/**
 * Shining Stars - Staff Administrative Directory (v73.0)
 * FIXED: Removed redundant paths from Header [cite: 2026-02-25]
 * PATH: src/app/staff/profile/page.js [cite: 2026-02-25]
 * FEATURES: Student Card Grid, Modal Detail (35 Columns), ID/Name Search
 */
export default function AdministrativeStudentRegistry() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inspect, setInspect] = useState(null);
  const router = useRouter();

  const getImageUrl = (url) => {
    if (!url || url === "-" || url === "") return "/logo.png";
    try {
      const fileId = url.includes('id=') ? url.split('id=')[1]?.split('&')[0] : (url.includes('/d/') ? url.split('/d/')[1]?.split('/')[0] : url);
      return fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : "/logo.png";
    } catch (e) { return "/logo.png"; }
  };

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || "null");
    if (!auth || auth.Can_View_Student !== true) { router.push('/staff'); return; }

    const fetchData = async () => {
      try {
        const res = await fetch(WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'getData', targetGid: GIDS.STUDENT_DIR })
        });
        const result = await res.json();
        if (result.success) setStudents(result.data);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [router]);

  // SEARCH LOGIC: Enrollment No. or Full Name [cite: 2026-02-25]
  const filtered = students.filter(s => 
    s['Name (ALL CAPITAL)']?.toLowerCase().includes(search.toLowerCase()) ||
    s['Enrollment No.']?.toString().includes(search)
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse italic uppercase" style={{background:'#0F071A', color:'#fbbf24'}}>AUTHORIZING ARCHIVE ACCESS...</div>;

  return (
    <div className="min-h-screen p-6 md:p-14 font-black selection:bg-gold" style={{background:'#0F071A'}}>
      <div className="mx-auto space-y-12" style={{maxWidth:'1700px'}}>
        
        {/* CLEAN HEADER - No Redundant Paths [cite: 2026-02-25] */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-10 bg-white/5 p-12 border-b-8 shadow-3xl" style={{borderRadius:'4rem', borderColor:'#fbbf24'}}>
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-7xl uppercase italic font-black text-white tracking-tighter">Student Registry</h1>
            <p className="text-xs uppercase mt-2 italic" style={{color:'#fbbf24', letterSpacing:'0.5em'}}>Administrative Control Hub</p>
          </div>
          <div className="w-full lg:w-[45rem]">
            <input 
              type="text" 
              placeholder="SEARCH BY ENROLLMENT ID OR STUDENT NAME..." 
              className="w-full border-4 border-white/10 p-7 outline-none focus:border-gold font-black italic shadow-2xl text-xl" style={{background:'#0F071A', borderRadius:'2.5rem', color:'#fbbf24'}}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* INDIVIDUAL STUDENT CARDS GRID [cite: 2026-02-25] */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-10">
          {filtered.map((s, idx) => (
            <div 
              key={idx} 
              onClick={() => setInspect(s)}
              className="bg-white/5 p-1 hover:bg-gold/10 transition-all cursor-pointer border border-white/10 shadow-2xl group" style={{borderRadius:'3.5rem'}}
            >
              <div className="p-10 h-full flex flex-col items-center space-y-8 relative overflow-hidden" style={{background:'#1A0B2E', borderRadius:'3.4rem'}}>
                <div className="absolute top-6 right-8 px-4 py-1 rounded-full font-black uppercase italic shadow-md" style={{background:'#fbbf24', color:'#020617', fontSize:'10px'}}>ID: {s['Enrollment No.']}</div>
                
                <div className="w-44 h-44 overflow-hidden border-8 border-white/5 shadow-2xl transition-transform group-hover:scale-105" style={{borderRadius:'3rem'}}>
                  <img src={getImageUrl(s.Photo_URL)} className="w-full h-full object-cover" alt="Student" />
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-3xl uppercase font-black italic text-white leading-tight">{s['Name (ALL CAPITAL)']}</h3>
                  <p className="text-lg font-black italic" style={{color:'#fbbf24'}}>{s['Grade'] || s['အမည်'] || "No Entry"}</p>
                </div>

                <div className="w-full grid grid-cols-2 gap-4 border-t border-white/5 pt-6 font-black italic">
                   <div className="text-center">
                     <p className="uppercase text-white/30 tracking-widest" style={{fontSize:'9px'}}>House (AF32)</p>
                     <p className="text-sm text-rose-400 uppercase">{s.House || "-"}</p>
                   </div>
                   <div className="text-center">
                     <p className="uppercase text-white/30 tracking-widest" style={{fontSize:'9px'}}>Steam (AE31)</p>
                     <p className="text-sm text-blue-400 uppercase">{s.Steam || "-"}</p>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL: 35-COLUMN FULL DOSSIER [cite: 2026-02-15, 2026-02-25] */}
        {inspect && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-2xl animate-in zoom-in-95 duration-300" style={{background:'#020617'}}>
            <div className="w-full max-w-7xl max-h-[85vh] overflow-y-auto border-4 p-12 md:p-24 relative shadow-[0_0_150px_rgba(0,0,0,1)]" style={{background:'#1A0B2E', borderRadius:'5rem', borderColor:'#fbbf24'}}>
              <button onClick={() => setInspect(null)} className="absolute top-12 right-12 text-white hover:text-red-500 text-5xl font-black">✕</button>
              
              <div className="flex flex-col md:flex-row gap-16 items-center mb-20 border-b-4 border-white/5 pb-20">
                <img src={getImageUrl(inspect.Photo_URL)} className="w-64 h-64 md:w-80 md:h-80 object-cover border-[12px] border-white/5 shadow-2xl" style={{borderRadius:'5rem'}} alt="Ledger" />
                <div className="text-center md:text-left space-y-6">
                  <h2 className="text-6xl md:text-[8rem] italic uppercase font-black text-white leading-none tracking-tighter">{inspect['Name (ALL CAPITAL)']}</h2>
                  <p className="text-3xl uppercase italic font-black" style={{color:'#fbbf24', letterSpacing:'0.5em'}}>Archive Record: {inspect['Enrollment No.']}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 font-black italic">
                {Object.entries(inspect).map(([key, value]) => (
                  key !== "Photo_URL" && (
                    <div key={key} className="bg-white/5 p-8 border-2 border-white/5 hover:border-gold/30 transition-all" style={{borderRadius:'2.5rem'}}>
                      <span className="text-xs uppercase tracking-widest font-black" style={{color:'#fbbf24'}}>{key}</span>
                      <p className="text-white text-2xl mt-3 truncate">{value || "-"}</p>
                    </div>
                  )
                ))}
              </div>
              <div className="mt-24 text-center">
                 <button onClick={() => setInspect(null)} className="px-24 py-8 rounded-full text-xl uppercase italic font-black hover:scale-105 transition-all shadow-3xl border-b-8 border-amber-600" style={{background:'#fbbf24', color:'#020617'}}>Close Dossier Access</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}