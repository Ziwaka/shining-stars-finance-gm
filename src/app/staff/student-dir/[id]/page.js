"use client";
import { getPhotoUrl } from "@/lib/cloudinary";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id ? decodeURIComponent(params.id) : ""; 

  const [student, setStudent] = useState(null);
  const [allData, setAllData] = useState({ scores: [], points: [], notes: [], fees: [], leaves: [], vehicles: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PROFILE");

  // Helper to remove T... from dates and handle readability [cite: 2026-03-18]
  const fmtDate = (d) => d ? String(d).split('T')[0] : "—";

  const getHouseTheme = (houseName) => {
    const h = (houseName || "").toLowerCase();
    if (h.includes('red') || h.includes('ruby') || h.includes('ဇွဲ')) 
      return { bg: 'from-rose-600 to-rose-900', text: 'text-rose-600', badge: 'bg-rose-500 text-white' };
    if (h.includes('blue') || h.includes('sapphire') || h.includes('သတ္တိ')) 
      return { bg: 'from-blue-600 to-blue-900', text: 'text-blue-600', badge: 'bg-blue-500 text-white' };
    if (h.includes('green') || h.includes('emerald') || h.includes('အောင်')) 
      return { bg: 'from-emerald-500 to-emerald-800', text: 'text-emerald-600', badge: 'bg-emerald-500 text-white' };
    if (h.includes('yellow') || h.includes('gold') || h.includes('topaz') || h.includes('မာန်')) 
      return { bg: 'from-amber-400 to-amber-600', text: 'text-amber-600', badge: 'bg-amber-400 text-slate-900' };
    return { bg: 'from-[#4c1d95] to-[#1e1b4b]', text: 'text-[#FFD700]', badge: 'bg-[#FFD700] text-slate-900' };
  };

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const headers = { 'Content-Type': 'text/plain;charset=utf-8' }; // FIXED CORS
        const [sRes, scRes, pRes, nRes, fRes, lRes, vRes] = await Promise.all([
          fetch(WEB_APP_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'getData', sheetName: 'Student_Directory' }) }),
          fetch(WEB_APP_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'getData', sheetName: 'Score_Records' }) }),
          fetch(WEB_APP_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'getData', sheetName: 'House_Points' }) }),
          fetch(WEB_APP_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'getData', sheetName: 'Student_Notes_Log' }) }),
          fetch(WEB_APP_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'getData', sheetName: 'Fees_Management' }) }),
          fetch(WEB_APP_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'getData', sheetName: 'Leave_Records' }) }), //
          fetch(WEB_APP_URL, { method: 'POST', headers, body: JSON.stringify({ action: 'getVehicles' }) }) //
        ]);
        
        const [s, sc, p, n, f, l, v] = await Promise.all([sRes.json(), scRes.json(), pRes.json(), nRes.json(), fRes.json(), lRes.json(), vRes.json()]);
        
        if (s.success) {
          const foundStudent = s.data.find(x => (x['Enrollment No.'] || x['Registration No.'] || x['No.'] || '').toString().trim() === studentId.trim());
          setStudent(foundStudent);
        }

        setAllData({
          scores: sc.success ? sc.data.filter(x => (x.Student_ID||'').toString() === studentId) : [],
          points: p.success  ? p.data.filter(x => (x.Student_ID||'').toString() === studentId) : [],
          notes:  n.success  ? n.data.filter(x => (x.Student_ID||'').toString() === studentId) : [],
          fees:   f.success  ? f.data.filter(x => (x.Student_ID||'').toString() === studentId) : [],
          leaves: l.success  ? l.data.filter(x => (x.User_ID||'').toString() === studentId && x.Status === 'Approved') : [],
          vehicles: v.success ? v.data.filter(x => (x.User_ID||'').toString() === studentId) : []
        });
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    if (studentId) fetchStudentData();
  }, [studentId]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-[#4c1d95] animate-pulse text-2xl uppercase italic px-6">Loading Profile...</div>;
  if (!student) return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-black text-rose-600 text-2xl uppercase italic gap-4">Student Not Found <button onClick={() => router.push('/staff/student-dir')} className="text-sm bg-slate-900 text-white px-6 py-2 rounded-full">Go Back</button></div>;

  const totalPoints = allData.points.reduce((sum, x) => sum + (Number(x.Points) || 0), 0);
  const avgScore = allData.scores.length ? (allData.scores.reduce((sum, x) => sum + (Number(x.Score) || 0), 0) / allData.scores.length).toFixed(1) : "N/A";
  const totalPaid = allData.fees.reduce((sum, x) => sum + (Number(x.Amount_Paid) || 0), 0);
  const lastFee = allData.fees.length > 0 ? allData.fees[allData.fees.length - 1] : null;

  const houseTheme = getHouseTheme(student.House);
  const previewImg = getPhotoUrl(student.Photo_URL);
  const vehicle = allData.vehicles.length > 0 ? allData.vehicles[0] : null;

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-4 md:p-10 font-black text-slate-950 font-serif-numbers">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* TOP NAVBAR (ORIGINAL)/page.js] */}
        <div className="flex flex-col sm:flex-row justify-between items-center px-2 md:px-4 pt-2 pb-4 border-b-2 border-slate-200 gap-4">
           <div className="flex items-center gap-2"><span className="text-lg md:text-xl font-black text-[#4c1d95] uppercase italic tracking-tighter">Shining Stars</span><span className="text-[#FFD700] text-xl">★</span></div>
           <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
             <button onClick={() => router.push('/staff')} className="bg-slate-200 text-slate-700 text-[9px] md:text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-full hover:bg-slate-300 transition-all flex items-center gap-1"><span>⌂</span> HUB</button>
             <button onClick={() => router.push('/staff/student-dir')} className="bg-[#4c1d95] text-white text-[9px] md:text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-full hover:bg-black shadow-md"><span>◂</span> DIRECTORY</button>
             <button onClick={() => router.push('/')} className="bg-rose-500 text-white text-[9px] md:text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-full shadow-md">EXIT <span>⏏</span></button>
           </div>
        </div>

        {/* HEADER (ORIGINAL)/page.js] */}
        <div className={`relative bg-gradient-to-br ${houseTheme.bg} p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-6 overflow-hidden`}>
          <button onClick={() => router.push('/staff/student-dir')} className="absolute top-4 left-4 md:top-8 md:left-8 text-white bg-white/10 hover:bg-white hover:text-black w-10 h-10 rounded-full flex items-center justify-center transition-all z-20 backdrop-blur-md">←</button>
          <div className="z-10 mt-10 md:mt-0 flex-shrink-0 relative">
            <div className={`w-32 h-32 md:w-40 md:h-40 bg-white rounded-[1.5rem] md:rounded-[2rem] p-1.5 shadow-2xl overflow-hidden border-4 border-white/20 relative`}>
              {previewImg && <img src={previewImg} referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-[1.2rem] md:rounded-[1.7rem] relative z-10" onError={(e) => { e.target.style.display = 'none'; }} />}
              <span className="absolute inset-0 flex items-center justify-center text-5xl md:text-6xl text-slate-300 z-0 bg-slate-100">👤</span>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left z-10 w-full min-w-0 md:mt-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase italic leading-tight drop-shadow-md break-words">{student['Name (ALL CAPITAL)'] || "UNKNOWN"}</h2>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white/90 mt-1">{student['အမည်']}</h3>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
              <span className="text-white/90 font-bold uppercase text-[9px] md:text-[10px] bg-black/30 px-3 py-1.5 rounded-full border border-white/10">ID: {student['Enrollment No.']}</span>
              <span className="text-white/90 font-bold uppercase text-[9px] md:text-[10px] bg-black/30 px-3 py-1.5 rounded-full border border-white/10">GRADE: {student.Grade} {student.Class ? `• ${student.Class}` : ''}</span>
              {student.House && <span className={`px-3 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg ${houseTheme.badge}`}>{student.House}</span>}
            </div>
          </div>
          <div className={`absolute -bottom-20 -right-20 w-64 h-64 bg-white/10 blur-3xl rounded-full`}></div>
        </div>

        {/* TABS (ORIGINAL)/page.js] */}
        <div className="flex bg-white p-2 rounded-full shadow-sm border border-slate-200 gap-1 w-full max-w-md mx-auto relative -mt-4 z-20">
          {["PROFILE", "PERFORMANCE"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 md:py-4 rounded-full font-black italic uppercase tracking-widest text-[10px] md:text-xs transition-all ${activeTab === tab ? 'bg-[#FFD700] text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>{tab}</button>
          ))}
        </div>

        <div className="pt-2 pb-20">
          {activeTab === "PROFILE" ? (
            <div className="space-y-6 md:space-y-8">
              {/* Parent Details (ORIGINAL)/page.js] */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-4">
                   <h4 className="text-[10px] uppercase text-slate-400 font-bold tracking-widest border-b pb-2">ဖခင် အချက်အလက်</h4>
                   <div className="space-y-3">
                     <p className="text-lg md:text-xl font-black text-slate-900">{student["Father's Name"] || "—"}</p>
                     <PhoneLink label="ဖုန်းနံပါတ်" phoneStr={student["Father's Phone"]} />
                     <div className="flex flex-col flex-1"><span className="text-[8px] uppercase text-slate-400 font-bold">အလုပ်အကိုင်</span><span className="text-sm md:text-base font-bold text-slate-700">{student["Father's Occupation"] || "—"}</span></div>
                   </div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-4">
                   <h4 className="text-[10px] uppercase text-slate-400 font-bold tracking-widest border-b pb-2">မိခင် အချက်အလက်</h4>
                   <div className="space-y-3">
                     <p className="text-lg md:text-xl font-black text-slate-900">{student["Mother's Name"] || "—"}</p>
                     <PhoneLink label="ဖုန်းနံပါတ်" phoneStr={student["Mother's Phone"]} />
                     <div className="flex flex-col flex-1"><span className="text-[8px] uppercase text-slate-400 font-bold">အလုပ်အကိုင်</span><span className="text-sm md:text-base font-bold text-slate-700">{student["Mother's Occupation"] || "—"}</span></div>
                   </div>
                </div>
              </div>

              {/* Residential & Guardian (ORIGINAL)/page.js] */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 flex flex-col justify-center"><h4 className="text-[10px] uppercase text-slate-400 font-bold tracking-widest border-b border-slate-100 pb-2 mb-3">အုပ်ထိန်းသူ</h4><p className="text-lg md:text-xl font-black text-slate-900 mb-3">{student["Guardian's Name"] || "—"}</p><PhoneLink label="အုပ်ထိန်းသူဖုန်း" phoneStr={student["Guardian's Phone"]} /></div>
                <div className="lg:col-span-2 bg-slate-50 p-6 md:p-8 rounded-[2rem] border-2 border-slate-200 flex flex-col justify-center"><p className="text-[10px] uppercase text-slate-400 font-bold mb-3 italic">နေရပ်လိပ်စာ</p><p className="text-lg md:text-2xl font-black text-slate-900 italic break-words leading-relaxed">{[student["Address & Street"], student["Ward/Quarter"], student["Town"]].filter(Boolean).join(", ") || "—"}</p></div>
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 flex flex-col items-center"><h4 className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mb-3 w-full border-b">ကိုယ်ပိုင်ဆက်သွယ်ရန်</h4><PhoneLink label="ကျောင်းသားဖုန်း" phoneStr={student["Student's Phone"]} align="center" /></div>
                <div className="bg-indigo-50/50 p-6 md:p-8 rounded-[2rem] border-2 border-indigo-100 text-center"><p className="text-[10px] uppercase text-indigo-400 font-bold mb-1 italic">နေထိုင်မှု</p><p className="text-xl md:text-2xl font-black text-indigo-900 uppercase">{student["School/Hostel"] || "—"}</p></div>
                <div className="bg-sky-50/50 p-6 md:p-8 rounded-[2rem] border-2 border-sky-100 text-center"><p className="text-[10px] uppercase text-sky-400 font-bold mb-1 italic">ယခင်ကျောင်း</p><p className="text-base md:text-lg font-black text-sky-900 uppercase">{student["Transferred from"] || "—"}</p></div>
              </div>

              {/* DETAILED FEATURES SECTIONS [cite: 2026-03-18] */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-4">
                {/* Leave History Section */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-orange-100 shadow-sm space-y-4">
                  <h4 className="text-[10px] uppercase text-orange-400 font-black tracking-widest border-b border-orange-100 pb-2 flex justify-between">
                    <span>Leave History (ခွင့်မှတ်တမ်း)</span>
                    <span className="text-[8px] bg-orange-100 px-2 py-0.5 rounded text-orange-600">APPROVED</span>
                  </h4>
                  <div className="space-y-3">
                    {allData.leaves.length > 0 ? [...allData.leaves].slice(-3).reverse().map((lv, i) => (
                      <div key={i} className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black">
                          <span className="text-slate-500 italic">📅 {fmtDate(lv.Start_Date)} {lv.End_Date && `→ ${fmtDate(lv.End_Date)}`}</span>
                          <span className="text-orange-600 bg-white px-2 py-0.5 rounded shadow-sm">{lv.Total_Days || 1} Days</span>
                        </div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{lv.Leave_Type}</p>
                        <p className="text-xs font-bold text-slate-600 italic border-t border-orange-100 pt-2 line-clamp-2">" {lv.Reason || "No reason provided" } "</p>
                      </div>
                    )) : <p className="text-slate-400 text-sm font-bold italic text-center py-6">No approved leaves on record.</p>}
                  </div>
                </div>

                {/* Vehicle Info Section */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-blue-100 shadow-sm space-y-4">
                  <h4 className="text-[10px] uppercase text-blue-400 font-bold tracking-widest border-b border-blue-100 pb-2">Vehicle Log (ယာဉ်အချက်အလက်)</h4>
                  <div className="flex items-center gap-5 py-4">
                    <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-inner border border-blue-200">🚌</div>
                    <div className="min-w-0">
                      <p className="text-lg md:text-xl font-black text-slate-800 tracking-tighter uppercase">{vehicle ? vehicle.Plate_No : "None Assigned"}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-[9px] font-bold text-blue-400 uppercase bg-blue-50 px-2 py-0.5 rounded">{vehicle?.Vehicle_Type || "—"}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded">{vehicle?.Color || "—"}</span>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 mt-2 italic">Pickup: {student.Pickup_Point || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Registry Note History (Full Width Scrollable) */}
                <div className="md:col-span-2 bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border-b-[10px] border-amber-500 shadow-2xl overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 text-amber-500/10 text-8xl select-none">📋</div>
                  <h4 className="text-[10px] uppercase text-amber-500 font-black tracking-widest mb-6 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"/>Official Registry Notes History
                  </h4>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar relative z-10">
                    {allData.notes.length > 0 ? [...allData.notes].reverse().map((n, i) => (
                      <div key={i} className="bg-white/5 p-5 rounded-[1.5rem] border border-white/10 hover:border-amber-500/30 transition-all">
                        <p className="text-white text-sm md:text-base italic font-medium leading-relaxed opacity-90">"{n.Note || n.Note_Detail}"</p>
                        <div className="flex justify-between mt-4 pt-3 border-t border-white/5 text-[9px] font-black uppercase text-amber-500/50 tracking-widest">
                          <span className="flex items-center gap-1">🏷️ {n.Category || "General"}</span>
                          <span className="flex items-center gap-1">📅 {fmtDate(n.Date)}</span>
                          <span className="flex items-center gap-1">👤 {n.Recorded_By || "Office"}</span>
                        </div>
                      </div>
                    )) : <p className="text-white/40 text-sm font-bold italic text-center py-10">No official administrative entries for this student.</p>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="space-y-6 md:space-y-8">
               {/* PERFORMANCE TAB (ORIGINAL)/page.js] */}
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                 <StatCard label="Academic Avg" value={avgScore} unit="PERCENT" color="text-violet-600" />
                 <StatCard label="House Points" value={totalPoints} unit="POINTS" color={houseTheme.text} />
                 <StatCard label="Total Finance" value={totalPaid.toLocaleString()} unit="MMK PAID" color="text-emerald-600" />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                 <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-xl flex flex-col lg:col-span-2">
                    <h3 className="text-lg md:text-xl font-black uppercase italic text-slate-800 border-l-4 border-emerald-500 pl-4 mb-6">Financial Ledger</h3>
                    <div className="space-y-4">
                      <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest"><span>DATE / CATEGORY</span><span>AMOUNT PAID</span></div>
                        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {allData.fees.length > 0 ? allData.fees.map((f, i) => (
                            <div key={i} className="px-6 py-4 flex justify-between items-center bg-white/50"><div className="min-w-0"><p className="text-[10px] font-black text-slate-400 italic">{fmtDate(f.Date)}</p><p className="text-sm font-bold text-slate-800 uppercase truncate">{f.Fee_Category}</p></div><p className="text-lg font-black text-emerald-600 shrink-0">{Number(f.Amount_Paid || 0).toLocaleString()} <span className="text-[10px]">MMK</span></p></div>
                          )) : <p className="p-10 text-center text-slate-400 italic text-xs">No payment history found.</p>}
                        </div>
                      </div>
                      {lastFee && Number(lastFee.Next_Due_Amount || 0) > 0 && (
                        <div className="bg-rose-50 p-6 md:p-8 rounded-3xl border-2 border-rose-200 flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                          <div className="text-center md:text-left"><p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-1">Current Outstanding Due</p><h4 className="text-3xl md:text-5xl font-black text-rose-600 font-serif-numbers leading-none">{Number(lastFee.Next_Due_Amount).toLocaleString()} <span className="text-sm">MMK</span></h4></div>
                          <div className="bg-white/60 px-6 py-3 rounded-2xl border border-rose-100 text-center"><p className="text-[9px] font-black uppercase text-rose-400">Next Payment Due</p><p className="text-base font-black text-rose-900 italic">{fmtDate(lastFee.Next_Due_Date)}</p></div>
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-lg md:text-xl font-black uppercase italic text-slate-800 border-l-4 border-amber-500 pl-4 mb-4 md:mb-6">Teacher Observations</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {allData.notes.length > 0 ? [...allData.notes].reverse().map((n, i) => (
                         <div key={i} className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                           <p className="text-base md:text-lg font-bold italic text-slate-900">"{n.Note || n.Note_Detail}"</p>
                           <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-500 mt-3 pt-3 border-t border-slate-200"><span>BY: {n.Recorded_By}</span><span>{fmtDate(n.Date)}</span></div>
                         </div>
                       )) : <p className="text-slate-400 text-xs font-bold italic text-center py-6">No Behavioral Archive.</p>}
                    </div>
                 </div>

                 <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-lg md:text-xl font-black uppercase italic text-slate-800 border-l-4 border-indigo-600 pl-4 mb-4 md:mb-6">Academic History</h3>
                    <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                       {allData.scores.length > 0 ? [...allData.scores].reverse().map((sc, i) => (
                         <div key={i} className="bg-slate-50 p-5 rounded-[1.5rem] flex justify-between items-center border border-slate-100 hover:border-indigo-300 transition-all min-w-0">
                            <div className="min-w-0 pr-2"><p className="text-[9px] font-bold uppercase text-slate-400 mb-1 truncate">{sc.Subject}</p><p className="text-sm md:text-lg font-bold italic text-slate-900 truncate">{sc.Term}</p></div>
                            <div className="text-right flex-shrink-0"><p className="text-2xl md:text-4xl font-black italic text-indigo-700 leading-none">{sc.Score}</p><p className="text-[9px] font-bold uppercase text-slate-400 mt-1">Res: {sc.Result}</p></div>
                         </div>
                       )) : <p className="text-slate-400 text-xs font-bold italic text-center py-6">No Exam Records.</p>}
                    </div>
                 </div>
               </div>
             </div>
          )}
        </div>
      </div>
      <style jsx global>{`
        body { background-color: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}

// Helpers (ORIGINAL)/page.js]
function PhoneLink({ label, phoneStr, align = "left" }) {
  const cleanPhoneStr = phoneStr ? phoneStr.replace(/[^0-9+]/g, '') : "";
  if (!phoneStr || phoneStr === "—") return (
    <div className={`flex flex-col min-w-0 flex-1 ${align === "center" ? "items-center text-center" : "items-start text-left"}`}>
      <span className="text-[8px] uppercase text-slate-400 font-bold tracking-widest">{label}</span>
      <span className="text-sm md:text-base font-bold text-slate-400">—</span>
    </div>
  );
  return (
    <div className={`flex items-center gap-3 bg-slate-50 p-2.5 pl-4 rounded-xl border border-slate-200 max-w-full ${align === "center" ? "justify-center" : "justify-between"}`}>
      <div className={`flex flex-col min-w-0 flex-1 ${align === "center" ? "items-center text-center" : "items-start text-left"}`}>
        <span className="text-[8px] uppercase text-slate-400 font-bold tracking-widest">{label}</span>
        <span className="text-sm md:text-base font-bold text-slate-900 tracking-wider truncate w-full">{phoneStr}</span>
      </div>
      <a href={`tel:${cleanPhoneStr}`} className="flex-shrink-0 bg-emerald-100 p-2.5 rounded-lg border border-emerald-200 text-emerald-600 shadow-sm">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
      </a>
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 shadow-sm flex flex-col justify-center min-w-0">
      <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 truncate">{label}</p>
      <p className={`text-3xl md:text-5xl font-black font-serif-numbers italic tracking-tighter ${color} truncate`}>{value}</p>
      <p className="text-[8px] md:text-[9px] font-bold uppercase text-slate-300 italic tracking-widest mt-2 truncate">{unit}</p>
    </div>
  );
}