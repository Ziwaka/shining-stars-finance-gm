"use client";
import { getPhotoUrl } from "@/lib/cloudinary";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

export default function StaffContacts() {
  const [groupedStaff, setGroupedStaff] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();


  const getFallbackIcon = (sex) => {
    const s = (sex || "").toLowerCase().trim();
    if (s === 'f' || s === 'female' || s === 'မ') return "👩🏻‍💼";
    if (s === 'm' || s === 'male' || s === 'ကျား') return "👨🏽‍💼";
    return "👤"; 
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchStaffData = async () => {
      try {
        const res = await fetch(WEB_APP_URL, { 
          method: 'POST', body: JSON.stringify({ action: 'getData', sheetName: 'Staff_Directory' }) 
        });
        const data = await res.json();
        if (data.success) {
          const activeOnly = data.data.filter(s => String(s.Status).toUpperCase() === "TRUE" || s.Status === true);
          const sorted = activeOnly.sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
          
          const groups = sorted.reduce((acc, staff) => {
            const pos = staff.Position || "Other Staff";
            if (!acc[pos]) acc[pos] = [];
            acc[pos].push(staff);
            return acc;
          }, {});
          
          setGroupedStaff(groups);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchStaffData();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-2xl" style={{background:'#F8FAFC', color:'#4c1d95'}}>LOADING DIRECTORY...</div>;

  return (
    <div className="min-h-screen font-sans text-slate-900 pb-32" style={{background:'#F8FAFC'}}>
      
      {/* 🌟 SOLID HEADER 🌟 */}
      <div className="px-6 py-10 md:py-14 shadow-md" style={{background:'#4c1d95', borderBottomWidth:'8px', borderColor:'#FFD700'}}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto min-w-0">
            <button onClick={() => router.push('/staff')} className="w-12 h-12 shrink-0 text-slate-900 rounded-full flex items-center justify-center transition-all font-black text-xl hover:scale-105 shadow-sm" style={{background:'#FFD700'}}>
              ←
            </button>
            <div className="min-w-0">
              <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight break-words whitespace-normal">Contact Network</h1>
              <p className="md:text-xs font-bold uppercase mt-1" style={{color:'#FFD700', fontSize:'10px', letterSpacing:'0.2em'}}>Shining Stars Official Directory</p>
            </div>
          </div>
          <div className="relative w-full md:w-96 shrink-0">
            <input 
              type="text" 
              placeholder="Search by name..." 
              className="w-full bg-white/10 border-2 border-white/20 text-white placeholder:text-white/60 font-bold p-4 pl-12 rounded-full outline-none focus:border-[#FFD700] transition-all"
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 text-lg">🔍</span>
          </div>
        </div>
      </div>

      {/* 🌟 GROUPED CONTACTS 🌟 */}
      <div className="max-w-7xl mx-auto px-6 mt-10 space-y-12">
        {Object.entries(groupedStaff).map(([position, members]) => {
          const filteredMembers = members.filter(m => (m.Name || "").toLowerCase().includes(search.toLowerCase()));
          if (filteredMembers.length === 0) return null;

          return (
            <section key={position} className="animate-in fade-in duration-500">
              
              {/* Group Header */}
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-wider break-words whitespace-normal">{position}</h2>
                <span className="shrink-0 text-white px-4 py-1.5 rounded-full md:text-xs font-black" style={{background:'#4c1d95', fontSize:'10px'}}>{filteredMembers.length} ACTIVE</span>
                <div className="flex-1 bg-slate-200 min-w-[20px]" style={{height:'2px'}}></div>
              </div>

              {/* Group Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMembers.map((s, i) => {
                  const cleanPhone = s.Phone ? String(s.Phone).replace(/[^0-9+]/g, '') : "";
                  const cleanViber = s.Viber_Phone ? String(s.Viber_Phone).replace(/[^0-9+]/g, '') : "";

                  return (
                    <div key={i} className="bg-white p-6 shadow-sm border-2 border-slate-100 hover:border-purple hover:shadow-lg transition-all duration-300 flex flex-col text-center" style={{borderRadius:'2rem'}}>
                      
                      {/* Avatar */}
                      <div className="w-24 h-24 mx-auto rounded-2xl bg-slate-50 border-4 border-slate-100 shadow-inner overflow-hidden mb-4 flex items-center justify-center text-5xl shrink-0">
                        {s.Photo_URL ? (
                          <img src={getPhotoUrl(s.Photo_URL)} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : getFallbackIcon(s.Sex)}
                      </div>
                      
                      {/* 🌟 Clear Text Info (NO Italic) 🌟 */}
                      <div className="w-full min-w-0 mb-6 flex-1 flex flex-col justify-center">
                        <h3 className="text-xl font-black text-slate-950 uppercase break-words whitespace-normal leading-tight">{s.Name}</h3>
                        <p className="text-xs font-bold text-slate-500 tracking-widest mt-2 uppercase">ID: {s.Staff_ID}</p>
                      </div>

                      {/* Actions */}
                      <div className="w-full flex flex-col gap-3 mt-auto shrink-0">
                        {cleanPhone && (
                          <a href={`tel:${cleanPhone}`} className="w-full bg-slate-50 hover:bg-emerald-500 hover:text-white text-emerald-700 p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all font-black text-sm flex items-center justify-between gap-2 px-4 shadow-sm active:scale-95">
                            <span className="truncate pr-2">{s.Phone}</span>
                            <span className="shrink-0 text-xl">📞</span>
                          </a>
                        )}
                        {cleanViber && (
                          <a href={`viber://contact?number=${cleanViber.replace('+', '%2B')}`} className="w-full bg-slate-50 hover:bg-[#4c1d95] hover:text-white text-purple-700 p-3.5 rounded-xl border border-slate-200 hover:border-[#4c1d95] transition-all font-black text-sm flex items-center justify-between gap-2 px-4 shadow-sm active:scale-95">
                            <span className="truncate pr-2">{s.Viber_Phone}</span>
                            <span className="shrink-0 text-xl">💬</span>
                          </a>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}