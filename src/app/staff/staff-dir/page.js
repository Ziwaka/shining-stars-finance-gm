"use client";
import { getPhotoUrl } from "@/lib/cloudinary";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

export default function MasterStaffDirectory() {
  const [staffList, setStaffList]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const router = useRouter();

  const getFallbackIcon = (sex) => {
    const s = (sex || "").toLowerCase().trim();
    if (s === 'f' || s === 'female' || s === 'မ') return "👩🏻‍💼";
    if (s === 'm' || s === 'male'   || s === 'ကျား') return "👨🏽‍💼";
    return "👤";
  };

  const isActive = (s) =>
    String(s.Status ?? 'TRUE').toUpperCase() === 'TRUE' || s.Status === true;

  useEffect(() => {
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    const checkPerm = (key) => u.userRole==='management' || u[key]===true || String(u[key]||'').toUpperCase()==='TRUE';
    if (u.userRole === 'management') return;
    if (checkPerm('Can_View_Staff')) return;
    fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getStaffPermissions' }) })
      .then(r=>r.json()).then(res => {
        const fresh = res.success && res.data && res.data.find(s =>
          (s.Staff_ID && s.Staff_ID.toString()===u.Staff_ID?.toString()) ||
          (s.Name && (s.Name===u['Name (ALL CAPITAL)']||s.Name===u.Name)));
        if (fresh) {
          const up={...u,...fresh};
          localStorage.setItem('user',JSON.stringify(up));
          if (up['Can_View_Staff']===true||String(up['Can_View_Staff']||'').toUpperCase()==='TRUE') return;
        }
        router.push('/staff');
      }).catch(()=>router.push('/staff'));
  }, []);

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        const res  = await fetch(WEB_APP_URL, { method: 'POST',
          body: JSON.stringify({ action: 'getData', sheetName: 'Staff_Directory' }) });
        const data = await res.json();
        if (data.success) {
          setStaffList(data.data.sort((a, b) => (a.Name || "").localeCompare(b.Name || "")));
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchStaffData();
  }, []);

  // ── search filter ──────────────────────────────────────────────────────────
  const matchesSearch = (s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (s.Name     || "").toLowerCase().includes(q) ||
           (s.Staff_ID || "").toLowerCase().includes(q) ||
           (s.Position || "").toLowerCase().includes(q);
  };

  const activeStaff   = staffList.filter(s =>  isActive(s) && matchesSearch(s));
  const inactiveStaff = staffList.filter(s => !isActive(s) && matchesSearch(s));

  // Group active by position
  const activeGroups = activeStaff.reduce((acc, s) => {
    const pos = s.Position || "Other Staff";
    if (!acc[pos]) acc[pos] = [];
    acc[pos].push(s);
    return acc;
  }, {});

  // ── Staff card ─────────────────────────────────────────────────────────────
  const StaffCard = ({ s, inactive = false }) => (
    <button
      onClick={() => setSelectedStaff(s)}
      className="p-5 rounded-3xl border-2 shadow-sm hover:shadow-lg transition-all text-left flex items-center gap-4 group"
      style={inactive
        ? { background: '#f0f0f0', borderColor: '#ccc', filter: 'grayscale(1)' }
        : { background: '#fff', borderColor: '#4c1d95' }}
    >
      <div className="w-16 h-16 rounded-xl border flex-shrink-0 overflow-hidden flex items-center justify-center text-3xl"
        style={inactive
          ? { background: '#e0e0e0', borderColor: '#bbb' }
          : { background: '#f3e8ff', borderColor: '#4c1d95' }}>
        {s.Photo_URL
          ? <img src={getPhotoUrl(s.Photo_URL)} className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }} />
          : getFallbackIcon(s.Sex)}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-black text-lg uppercase truncate"
          style={{ color: inactive ? '#666' : '#1e1b4b' }}>
          {s.Name}
        </h3>
        <p className="font-bold tracking-widest uppercase mt-0.5 truncate"
          style={{ fontSize: '10px', color: inactive ? '#999' : '#6b7280' }}>
          {s.Position}
        </p>
        {inactive && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border"
            style={{ background: '#e5e5e5', borderColor: '#ccc' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#999' }} />
            <span className="font-black uppercase tracking-wider"
              style={{ fontSize: '8px', color: '#888' }}>Inactive</span>
          </div>
        )}
      </div>
    </button>
  );

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-black animate-pulse"
      style={{ color: '#4c1d95' }}>
      <span className="text-2xl tracking-widest text-center px-4 uppercase">Loading Registry...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-40 font-sans text-slate-900 overflow-x-hidden">

      {/* ── Header ── */}
      <div className="px-6 py-12 md:py-16 shadow-md"
        style={{ background: '#4c1d95', borderBottomWidth: '8px', borderColor: '#FFD700' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto min-w-0">
            <button onClick={() => router.push('/staff')}
              className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-black text-xl hover:scale-105 shadow-sm"
              style={{ background: '#FFD700', color: '#4c1d95' }}>←</button>
            <div className="min-w-0">
              <h1 className="text-3xl md:text-5xl font-black text-white uppercase break-words leading-tight">Master Registry</h1>
              <p className="text-xs font-bold uppercase mt-1" style={{ color: '#FFD700', letterSpacing: '0.3em' }}>Official Database</p>
            </div>
          </div>
          <div className="w-full md:w-[400px] shrink-0">
            <div className="relative">
              <input type="text" placeholder="Search Name, ID or Position..."
                className="w-full bg-white/10 border-2 border-white/20 text-white placeholder:text-white/60 font-bold p-4 pl-12 rounded-full outline-none focus:border-[#FFD700]"
                onChange={(e) => setSearch(e.target.value)} />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-white/60">🔍</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10 space-y-12">

        {/* ── ACTIVE groups ── */}
        {Object.entries(activeGroups).map(([position, members]) => (
          <div key={position}>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider" style={{ color: '#4c1d95' }}>{position}</h2>
              <span className="px-3 py-1 rounded-full font-black" style={{ background: '#FFD700', color: '#4c1d95', fontSize: '10px' }}>
                {members.length} STAFF
              </span>
              <div className="flex-1" style={{ height: '2px', background: '#4c1d95' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {members.map((s, idx) => <StaffCard key={idx} s={s} inactive={false} />)}
            </div>
          </div>
        ))}

        {activeStaff.length === 0 && inactiveStaff.length === 0 && (
          <div className="text-center py-20 font-black italic text-xl uppercase tracking-widest text-slate-400">
            No staff found.
          </div>
        )}

        {/* ── INACTIVE section ── */}
        {inactiveStaff.length > 0 && (
          <div>
            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1" style={{ height: '2px', background: '#ddd' }} />
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border-2"
                style={{ background: '#f5f5f5', borderColor: '#ddd' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: '#bbb' }} />
                <span className="font-black uppercase tracking-widest" style={{ fontSize: '10px', color: '#999' }}>
                  Inactive — {inactiveStaff.length}
                </span>
              </div>
              <div className="flex-1" style={{ height: '2px', background: '#ddd' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {inactiveStaff.map((s, idx) => <StaffCard key={idx} s={s} inactive={true} />)}
            </div>
          </div>
        )}

      </div>

      {/* ── Profile Modal ── */}
      {selectedStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setSelectedStaff(null)} />

          <div className="relative bg-white w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
            style={{ borderRadius: '2.5rem',
              filter: isActive(selectedStaff) ? 'none' : 'grayscale(1)' }}>

            {/* Top purple section */}
            <div className="pt-10 pb-8 px-6 relative flex flex-col items-center shrink-0 text-center"
              style={{ background: isActive(selectedStaff) ? '#4c1d95' : '#555',
                borderBottomWidth: '8px', borderColor: isActive(selectedStaff) ? '#FFD700' : '#888' }}>
              <button onClick={() => setSelectedStaff(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 text-white hover:bg-rose-500 rounded-full flex items-center justify-center font-bold">✕</button>

              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white border-[6px] shadow-xl overflow-hidden flex items-center justify-center text-6xl relative z-10 mb-4"
                style={{ borderColor: isActive(selectedStaff) ? '#FFD700' : '#aaa' }}>
                <span className="absolute z-0 opacity-20">{getFallbackIcon(selectedStaff.Sex)}</span>
                {getPhotoUrl(selectedStaff.Photo_URL) &&
                  <img src={getPhotoUrl(selectedStaff.Photo_URL)} className="w-full h-full object-cover relative z-10 bg-white"
                    onError={(e) => { e.target.style.display = 'none'; }} />}
              </div>

              <h2 className="text-2xl md:text-4xl font-black uppercase leading-tight break-words"
                style={{ color: isActive(selectedStaff) ? '#FFD700' : '#ccc' }}>
                {selectedStaff.Name}
              </h2>
              <p className="text-white font-bold text-sm md:text-base uppercase mt-2" style={{ letterSpacing: '0.2em' }}>
                {selectedStaff.Position}
              </p>

              <div className="flex flex-wrap justify-center items-center gap-3 mt-5">
                <span className="px-4 py-1.5 rounded-full font-black tracking-widest shadow-md"
                  style={{ background: isActive(selectedStaff) ? '#FFD700' : '#aaa',
                    color: '#1e1b4b', fontSize: '10px' }}>
                  ID: {selectedStaff.Staff_ID}
                </span>
                <span className="px-4 py-1.5 rounded-full font-black tracking-widest uppercase shadow-md text-white"
                  style={{ fontSize: '10px',
                    background: isActive(selectedStaff) ? '#22c55e' : '#888',
                    border: `1px solid ${isActive(selectedStaff) ? '#16a34a' : '#777'}` }}>
                  {isActive(selectedStaff) ? "ACTIVE" : "INACTIVE"}
                </span>
                <span className="border-2 px-4 py-1.5 rounded-full font-black tracking-widest uppercase"
                  style={{ borderColor: isActive(selectedStaff) ? '#FFD700' : '#aaa',
                    color: isActive(selectedStaff) ? '#FFD700' : '#aaa', fontSize: '10px' }}>
                  SS OFFICIAL VERIFIED
                </span>
              </div>
            </div>

            {/* Data section */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
                <DataBox label="NRC / Passport No."         value={selectedStaff.NRC} />
                <DataBox label="Sex / Gender"               value={selectedStaff.Sex} />
                <DataBox label="Professional Qualification" value={selectedStaff.Qualification} className="md:col-span-2" />
                <DataBox label="Employment Type"            value={selectedStaff.Part_Time_Full_Time} />
                <DataBox label="Official Join Date"         value={selectedStaff.Join_Date} />
                <DataBox label="Basic Salary"               value={selectedStaff.Basic_Salary} className="md:col-span-2" />
                <DataBox label="Contract Status"            value={selectedStaff['Contract (Yes/No)']} />
                <DataBox label="Contract End Date"          value={selectedStaff.Contract_End_Date} />
                <DataBox label="Primary Phone"              value={selectedStaff.Phone}       isPhone={true} />
                <DataBox label="Viber Contact"              value={selectedStaff.Viber_Phone} isViber={true} />
                <DataBox label="Emergency Contact"          value={selectedStaff.Emergency_Contact} className="md:col-span-2" />
                <DataBox label="Residential Address"        value={selectedStaff.Address}     className="md:col-span-2" />
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4c1d95; border-radius: 10px; }
      `}</style>
    </div>
  );
}

function DataBox({ label, value, className = "", isPhone = false, isViber = false }) {
  const cleanPhone = value ? String(value).replace(/[^0-9+]/g, '') : "";
  return (
    <div className={`p-4 md:p-5 rounded-2xl flex flex-col justify-center min-w-0 shadow-sm border-2 border-purple bg-amber ${className}`}>
      <p className="text-blue-700 font-black uppercase tracking-widest break-words leading-tight mb-1"
        style={{ fontSize: '10px' }}>{label}</p>
      <div className="flex items-center justify-between gap-4 min-w-0 w-full mt-1">
        <p className="text-amber-600 text-sm md:text-lg font-black whitespace-normal break-words leading-snug flex-1 min-w-0">
          {value || "—"}
        </p>
        {isPhone && cleanPhone && value !== "—" && (
          <a href={`tel:${cleanPhone}`} className="shrink-0 w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 text-lg">📞</a>
        )}
        {isViber && cleanPhone && value !== "—" && (
          <a href={`viber://contact?number=${cleanPhone.replace('+', '%2B')}`} className="shrink-0 w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:scale-95 text-lg">💬</a>
        )}
      </div>
    </div>
  );
}