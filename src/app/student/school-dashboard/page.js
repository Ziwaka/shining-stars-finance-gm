"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

/**
 * Shining Stars - Student School Dashboard (v53.0 Perfect Alignment)
 * FIX: Set fixed min-height for house names to prevent text wrapping from pushing the glass tubes upwards [cite: 2026-02-25]
 * STYLE: Slate-950 Bold strictly adhered [cite: 2023-02-23]
 */
export default function StudentSchoolDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [myHouse, setMyHouse] = useState("SYNCING..."); 
  const [loading, setLoading] = useState(true);

  // States
  const [houseTotals, setHouseTotals] = useState({
    "အနော်ရထာ": 0, "ကျန်စစ်သား": 0, "ဘုရင့်နောင်": 0, "အလောင်းဘုရား": 0, "ဗန္ဓုလ": 0
  });
  const [earnedPoints, setEarnedPoints] = useState([]);
  const [deductedPoints, setDeductedPoints] = useState([]);
  const [priorityAnns, setPriorityAnns] = useState([]);
  const [regularAnns, setRegularAnns] = useState([]);

  // 🌟 GUARANTEED BASE HOUSES WITH STRICT HEX COLORS 
  const DEFAULT_HOUSES = [
    { name: "အနော်ရထာ", colorStart: "#ea580c", colorEnd: "#fdba74", borderColor: "#ea580c", textColor: "#ea580c" },
    { name: "ကျန်စစ်သား", colorStart: "#ca8a04", colorEnd: "#fde047", borderColor: "#ca8a04", textColor: "#ca8a04" },
    { name: "ဘုရင့်နောင်", colorStart: "#16a34a", colorEnd: "#86efac", borderColor: "#16a34a", textColor: "#16a34a" },
    { name: "အလောင်းဘုရား", colorStart: "#dc2626", colorEnd: "#fca5a5", borderColor: "#dc2626", textColor: "#dc2626" },
    { name: "ဗန္ဓုလ", colorStart: "#2563eb", colorEnd: "#93c5fd", borderColor: "#2563eb", textColor: "#2563eb" }
  ];

  const MAX_POINTS = 500;

  const toEngNum = (str) => {
    if (str === null || str === undefined) return "0";
    const burmeseNumbers = {'၀':'0','၁':'1','၂':'2','၃':'3','၄':'4','၅':'5','၆':'6','၇':'7','၈':'8','၉':'9'};
    return String(str).replace(/[၀-၉]/g, m => burmeseNumbers[m]).trim();
  };

  const isTruthy = (val) => {
    if (val === true || val === 1) return true;
    if (!val) return false;
    const s = String(val).trim().toUpperCase();
    return s === "TRUE" || s === "1" || s === "YES";
  };

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (!saved || saved === "undefined") { router.push('/login'); return; }
      
      const authUser = JSON.parse(saved);
      if (isMounted) setUser(authUser);
      const myID = (authUser.Student_ID || authUser['Enrollment No.'] || "").toString().trim();

      const fetchSheet = async (name) => {
        try {
          const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getData', sheetName: name }),
          });
          const text = await res.text();
          try {
            const json = JSON.parse(text);
            if (json.success && Array.isArray(json.data)) {
               json.data = json.data.map(obj => {
                  const cleanObj = {};
                  Object.keys(obj).forEach(k => { cleanObj[k.trim()] = obj[k]; });
                  return cleanObj;
               });
            }
            return json;
          } catch (e) {
            return { success: false, data: [] };
          }
        } catch (e) {
          return { success: false, data: [] };
        }
      };

      try {
        const dirRes = await fetchSheet("Student_Directory");
        const ptsRes = await fetchSheet("House_Points");
        const annRes = await fetchSheet("Announcements");

        // Fetch house config from System_Config via GAS
        const cfgRes = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'getHouseConfig' }) });
        const cfgData = await cfgRes.json();
        const configHouseNames = cfgData.success && cfgData.houses?.length > 0
          ? cfgData.houses
          : ["အနော်ရထာ", "ကျန်စစ်သား", "ဘုရင့်နောင်", "အလောင်းဘုရား", "ဗန္ဓုလ"];

        if (!isMounted) return;

        // 1. Build Student Directory Lookup Map
        const studentHouseMap = {};
        let currentHouse = "UNASSIGNED";

        if (dirRes.success && Array.isArray(dirRes.data)) {
          dirRes.data.forEach(student => {
            const sid1 = student['Student_ID']?.toString().trim();
            const sid2 = student['Enrollment No.']?.toString().trim();
            const house = student['House']?.toString().trim();
            
            if (sid1 && house) studentHouseMap[sid1] = house;
            if (sid2 && house) studentHouseMap[sid2] = house;
            if ((sid1 === myID || sid2 === myID) && house) currentHouse = house;
          });
        }
        setMyHouse(currentHouse);

        // 2. Process House Points
        if (ptsRes.success && Array.isArray(ptsRes.data)) {
          let initialTotals = {};
          configHouseNames.forEach(h => { initialTotals[h] = 0; });
          let earned = [];
          let deducted = [];

          ptsRes.data.forEach(row => {
            const rawPts = row.Points !== undefined ? row.Points : (row.Point !== undefined ? row.Point : "0");
            const engPtsStr = toEngNum(rawPts);
            const pts = parseInt(engPtsStr, 10);
            const safePts = isNaN(pts) ? 0 : pts;

            if (safePts === 0 && !row.Event_Name && !row.House_Name) return; 

            const studentId = (row.Student_ID || row['Student ID'] || "").toString().trim();
            let actualVerifiedHouse = row.House_Name?.toString().trim() || row.House?.toString().trim();
            
            if (studentId && studentHouseMap[studentId]) {
               actualVerifiedHouse = studentHouseMap[studentId]; 
            }
            if (!actualVerifiedHouse) actualVerifiedHouse = "UNASSIGNED";
            
            if (initialTotals[actualVerifiedHouse] !== undefined) {
              initialTotals[actualVerifiedHouse] += safePts;
            }

            const verifiedRow = { ...row, Verified_House: actualVerifiedHouse, Points: safePts };

            if (safePts >= 0) earned.push(verifiedRow);
            else deducted.push(verifiedRow);
          });

          setHouseTotals(initialTotals);
          setEarnedPoints(earned.reverse());
          setDeductedPoints(deducted.reverse());
        }

        // 3. Process Announcements 
        if (annRes.success && Array.isArray(annRes.data)) {
          const studentAnns = annRes.data.filter(a => Object.keys(a).some(k => k.toLowerCase().includes('student') && isTruthy(a[k])));
          const priorities = studentAnns.filter(a => Object.keys(a).some(k => k.toLowerCase().includes('priority') && isTruthy(a[k])));

          setPriorityAnns(priorities);
          setRegularAnns([...studentAnns].reverse());
        }

      } catch (err) {
        console.error("Dashboard Sync Error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();
    return () => { isMounted = false; };
  }, [router]);

  if (loading) return (
    <div className="h-full overflow-y-auto bg-[#FDFCF0] flex flex-col items-center justify-center font-black text-[#020617] animate-pulse">
      <div className="text-7xl mb-6">🏛️</div>
      <div className="text-sm uppercase italic tracking-[0.4em] text-[#020617]">Synchronizing Global Data...</div>
    </div>
  );

  return (
    <div className="bg-[#FDFCF0] font-black text-[#020617]" style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:"120px",minHeight:0}}>
      
      {/* 🚨 STRICT MARQUEE (အဝါအောက်ခံ၊ အနီစာလုံး Inline Styles) */}
      {priorityAnns.length > 0 && (
        <div style={{ backgroundColor: '#FBBF24', borderTop: '6px solid #B91C1C', borderBottom: '6px solid #B91C1C', display: 'flex', alignItems: 'center', padding: '15px 0', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
           <div style={{ position: 'absolute', left: 0, backgroundColor: '#FBBF24', padding: '15px 24px', zIndex: 10, borderRight: '6px solid #B91C1C', display: 'flex', alignItems: 'center' }}>
             <span className="animate-pulse text-2xl">🚨</span>
             <span style={{ marginLeft: '12px', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.2em', color: '#B91C1C', fontSize: '14px' }}>Urgent</span>
           </div>
           <div style={{ flex: 1, marginLeft: '160px', whiteSpace: 'nowrap' }}>
             <div className="animate-marquee" style={{ textTransform: 'uppercase', fontStyle: 'italic', fontWeight: 900, fontSize: '18px', color: '#DC2626', letterSpacing: '1px' }}>
                {priorityAnns.map((a, i) => (
                  <span key={i} style={{ margin: '0 40px' }}>
                     ★ <span style={{ color: '#020617' }}>[{a.Date || a.date || "TODAY"}]</span> {a.Title} : <span style={{ textDecoration: 'underline' }}>{a.Message}</span> <span style={{ color: '#020617', marginLeft: '10px' }}>(တင်သူ - {a.Posted_By || a.posted_by || "Admin"})</span>
                  </span>
                ))}
             </div>
           </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto p-4 md:p-10 space-y-12 mt-6">
        
        {/* HEADER */}
        <div className="bg-white p-10 md:p-12 rounded-[3.5rem] shadow-xl border-b-[12px] border-[#FBBF24] flex flex-col md:flex-row justify-between items-center gap-6">
           <div>
              <h1 className="text-[clamp(2rem,5vw,4.5rem)] italic uppercase tracking-tighter leading-none text-[#020617]">Welcome, {user?.Name}</h1>
              <p className="text-[#64748B] mt-3 uppercase tracking-[0.4em] text-xs font-black italic">Institutional Dashboard Access</p>
           </div>
           <div className="bg-[#F8FAFC] px-10 py-5 rounded-[2rem] border-4 border-[#E2E8F0] text-center shadow-inner">
              <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mb-1">My House</p>
              <p className="text-2xl font-black uppercase italic text-[#020617]">{myHouse}</p>
           </div>
        </div>

        {/* 📰 OFFICIAL NEWS */}
        <div className="bg-white p-10 md:p-12 rounded-[4rem] shadow-2xl border-t-[10px] border-[#020617]">
           <h3 className="text-2xl md:text-3xl uppercase italic mb-10 border-l-[12px] border-[#020617] pl-6 text-[#020617] tracking-tight">Official Announcements</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {regularAnns.length > 0 ? regularAnns.map((ann, i) => {
                const isPriority = Object.keys(ann).some(k => k.toLowerCase().includes('priority') && isTruthy(ann[k]));
                return (
                  <div key={i} className="p-8 rounded-[2.5rem] border-4 transition-all shadow-sm" style={{ backgroundColor: isPriority ? '#FEF2F2' : '#F8FAFC', borderColor: isPriority ? '#FCA5A5' : '#E2E8F0' }}>
                     <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] px-4 py-1.5 rounded-full uppercase tracking-[0.2em] font-black" style={{ backgroundColor: isPriority ? '#DC2626' : '#020617', color: '#FFF' }}>
                           {ann.Date || ann.date || "TODAY"} {isPriority && "🚨"}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isPriority ? '#EF4444' : '#64748B' }}>By {ann.Posted_By || ann.posted_by || "Admin"}</span>
                     </div>
                     <h4 className="text-[clamp(1.2rem,2vw,1.8rem)] font-black uppercase leading-tight mb-4" style={{ color: isPriority ? '#B91C1C' : '#020617' }}>{ann.Title}</h4>
                     <p className="text-sm md:text-base leading-relaxed italic" style={{ color: isPriority ? '#B91C1C' : '#334155' }}>"{ann.Message}"</p>
                  </div>
                );
              }) : <div className="col-span-full text-center py-20 opacity-30 text-2xl uppercase italic text-[#020617]">No New Announcements</div>}
           </div>
        </div>

        {/* 🏆 HOUSE STANDINGS — Horizontal bars, center-zero, dynamic max */}
        <div className="p-6 md:p-10 rounded-[2.5rem] shadow-2xl border-b-[8px]" style={{ backgroundColor: '#020617', borderColor: '#FBBF24' }}>
          <h2 className="text-xl md:text-3xl uppercase italic border-l-[8px] border-[#FBBF24] pl-5 mb-8 tracking-tight text-white">🏆 House Standings</h2>
          {(() => {
            const allPts = DEFAULT_HOUSES.map(h => houseTotals[h.name] || 0);
            const maxAbs = Math.max(200, ...allPts.map(Math.abs));
            // Sort by points descending
            const sorted = [...DEFAULT_HOUSES].map(h => ({ ...h, pts: houseTotals[h.name] || 0 }))
              .sort((a, b) => b.pts - a.pts);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {sorted.map((house, idx) => {
                  const pts = house.pts;
                  const isPos = pts >= 0;
                  // bar width: 0-50% of container each side from center
                  const barW = Math.min(50, (Math.abs(pts) / maxAbs) * 50);
                  const rank = ['🥇','🥈','🥉','4️⃣','5️⃣'][idx];
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* House name + rank */}
                      <div style={{ width: '120px', flexShrink: 0, textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{rank} {house.name}</span>
                      </div>
                      {/* Bar track — center-zero */}
                      <div style={{ flex: 1, position: 'relative', height: '36px', background: '#1e293b', borderRadius: '99px', overflow: 'hidden' }}>
                        {/* Center line */}
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.15)', transform: 'translateX(-50%)', zIndex: 2 }} />
                        {/* Bar */}
                        <div style={{
                          position: 'absolute',
                          top: '4px', bottom: '4px',
                          borderRadius: '99px',
                          background: `linear-gradient(to right, ${house.colorStart}, ${house.colorEnd})`,
                          transition: 'width 0.8s ease, left 0.8s ease',
                          ...(isPos
                            ? { left: '50%', width: `${barW}%` }
                            : { right: '50%', width: `${barW}%` }
                          ),
                          boxShadow: `0 0 12px ${house.colorStart}88`
                        }} />
                        {/* Score label inside bar */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                          <span style={{ fontWeight: 900, fontSize: '13px', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                            {pts > 0 ? '+' : ''}{pts}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '9px', color: '#475569', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Max: ±{maxAbs} pts · Center = 0
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 📊 SPLIT VIEW WITH REASONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
           
           {/* 🌟 HOUSE EARNED */}
           <div className="bg-white p-8 md:p-10 rounded-[3.5rem] shadow-xl border-t-[10px]" style={{ borderColor: '#10B981' }}>
              <h3 className="text-xl md:text-2xl uppercase italic mb-8 tracking-widest flex items-center gap-3 font-black" style={{ color: '#059669' }}>
                 <span style={{ backgroundColor: '#10B981', color: '#FFF', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', fontSize: '24px' }}>+</span> House Earned
              </h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                 {earnedPoints.length > 0 ? earnedPoints.map((pt, i) => (
                   <div key={i} className="p-6 rounded-[2rem] flex justify-between items-center gap-4" style={{ backgroundColor: '#ECFDF5', border: '2px solid #6EE7B7' }}>
                      <div className="flex-1">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="text-white px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest font-black" style={{ backgroundColor: '#020617' }}>{pt.Verified_House}</span>
                            <p className="text-sm font-black uppercase" style={{ color: '#020617' }}>{pt.Name}</p>
                         </div>
                         <p className="text-lg uppercase italic font-black leading-tight" style={{ color: '#020617' }}>★ {pt.Event_Name}</p>
                         {pt.Remark && <p className="text-xs mt-2 px-3 py-1.5 rounded-lg inline-block font-bold shadow-sm" style={{ backgroundColor: '#FFF', color: '#047857', border: '1px solid #A7F3D0' }}>"{pt.Remark}"</p>}
                         <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: '#059669' }}>{pt.Date} • Recorded By {pt.Recorded_By}</p>
                      </div>
                      <div className="text-4xl font-black" style={{ color: '#059669' }}>+{pt.Points}</div>
                   </div>
                 )) : <div className="text-center py-10 opacity-30 text-xl font-black uppercase italic text-[#020617]">No records found</div>}
              </div>
           </div>

           {/* 🌟 HOUSE DEDUCTED */}
           <div className="bg-white p-8 md:p-10 rounded-[3.5rem] shadow-xl border-t-[10px]" style={{ borderColor: '#E11D48' }}>
              <h3 className="text-xl md:text-2xl uppercase italic mb-8 tracking-widest flex items-center gap-3 font-black" style={{ color: '#E11D48' }}>
                 <span style={{ backgroundColor: '#E11D48', color: '#FFF', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', fontSize: '30px' }}>-</span> House Deducted
              </h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                 {deductedPoints.length > 0 ? deductedPoints.map((pt, i) => (
                   <div key={i} className="p-6 rounded-[2rem] flex justify-between items-center gap-4" style={{ backgroundColor: '#FFF1F2', border: '2px solid #FDA4AF' }}>
                      <div className="flex-1">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="text-white px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest font-black" style={{ backgroundColor: '#020617' }}>{pt.Verified_House}</span>
                            <p className="text-sm font-black uppercase" style={{ color: '#020617' }}>{pt.Name}</p>
                         </div>
                         <p className="text-lg uppercase italic font-black leading-tight" style={{ color: '#020617' }}>⚠ {pt.Event_Name}</p>
                         {pt.Remark && <p className="text-xs mt-2 px-3 py-1.5 rounded-lg inline-block font-bold shadow-sm" style={{ backgroundColor: '#FFF', color: '#BE123C', border: '1px solid #FECDD3' }}>"{pt.Remark}"</p>}
                         <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: '#E11D48' }}>{pt.Date} • Recorded By {pt.Recorded_By}</p>
                      </div>
                      <div className="text-4xl font-black" style={{ color: '#E11D48' }}>{pt.Points}</div>
                   </div>
                 )) : <div className="text-center py-10 opacity-30 text-xl font-black uppercase italic text-[#020617]">Clean Record</div>}
              </div>
           </div>

        </div>
      </div>

      <style jsx global>{`
        @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        .animate-marquee { display: inline-block; animation: marquee 20s linear infinite; padding-left: 100%; }
        .animate-marquee:hover { animation-play-state: paused; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        body { background-color: #FDFCF0; }
      `}</style>
    
      {/* 🏠 Home Button */}
      <button onClick={() => router.push('/student')}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 bg-[#020617] border-2 border-[#fbbf24] rounded-full text-[#fbbf24] font-black text-[10px] uppercase tracking-wider shadow-xl hover:bg-[#fbbf24] hover:text-[#020617] transition-all">
        🏠 Home
      </button>
</div>
  );
}