"use client";
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';
import { hasPerm } from '@/lib/permissions';

const MM_TZ = 'Asia/Yangon';

// ── 1. DATE UTILITIES ─────────────────────────────────────────

const formatMMDate = (d) => {
  if (!d || d === '-') return '-';
  try {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
    const dateObj = new Date(d);
    if (!isNaN(dateObj.getTime())) return dateObj.toLocaleDateString('en-CA', { timeZone: MM_TZ });
  } catch (e) {}
  return String(d).split('T')[0];
};

const formatDateDisplay = (d) => {
  if (!d || d === '-') return '-';
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: MM_TZ });
    return `${day}/${month}/${year}, ${weekday}`;
  } catch(e) { 
    return formatMMDate(d); 
  }
};

// ── 2. ATTENDANCE CALENDAR (with numbers: students / staff) ──

// ── 2. ATTENDANCE CALENDAR (with fallback to absent count) ──

const AttendanceCalendar = ({ trendData, onDayClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Build a map of date -> absent count (use absentStudents if available, otherwise fallback to total absent)
  const absentMap = {};
  if (trendData && Array.isArray(trendData)) {
    trendData.forEach(item => {
      if (item.date) {
        // If detailed data available, use it; otherwise fallback to total absent
        absentMap[item.date] = {
          students: item.absentStudents !== undefined ? item.absentStudents : (item.absent || 0),
          staff: item.absentStaff !== undefined ? item.absentStaff : 0
        };
      }
    });
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDayClick?.(dateStr);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-black text-slate-900">Attendance Calendar</h3>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Absent</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">←</button>
          <span className="px-4 py-1 bg-slate-100 rounded-full text-sm font-bold">{months[currentMonth]} {currentYear}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">→</button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday Headers */}
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase py-2">{day}</div>
        ))}

        {/* Empty cells for first day */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square p-1"></div>
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const counts = absentMap[dateStr] || { students: 0, staff: 0 };
          const totalAbsent = counts.students + counts.staff;
          
          return (
            <div key={day} className="aspect-square p-1 cursor-pointer" onClick={() => handleDayClick(day)}>
              <div className="w-full h-full rounded-xl border-2 border-slate-200 bg-white flex flex-col items-center justify-center hover:border-amber-300 transition-all p-1">
                <span className="text-xs font-black text-slate-700">{day}</span>
                {totalAbsent > 0 ? (
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full mt-0.5">
                    {totalAbsent}
                  </span>
                ) : (
                  <span className="text-[8px] text-slate-300 mt-0.5">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── 3. EVENT CALENDAR ──────────────────────────────────

const EventCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  useEffect(() => {
    setLoading(true);
    fetch(WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'getEvents', 
        month: `${currentYear}-${String(currentMonth+1).padStart(2,'0')}` // YYYY-MM format
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) setEvents(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentMonth, currentYear]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDayEvents = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.Date === dateStr || e.Start_Date === dateStr);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-slate-900">Event Calendar</h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">←</button>
          <span className="px-4 py-1 bg-slate-100 rounded-full text-sm font-bold">{months[currentMonth]} {currentYear}</span>
          <button onClick={nextMonth} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">→</button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400">Loading events...</div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase py-2">{day}</div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square p-1"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getDayEvents(day);
              return (
                <div key={day} className="aspect-square p-1">
                  <div className="w-full h-full rounded-xl border-2 border-slate-100 flex flex-col items-center justify-center hover:border-indigo-200 transition-colors relative">
                    <span className="text-xs font-black">{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-0.5">
                        {dayEvents.slice(0, 3).map((ev, idx) => (
                          <span key={idx} className="w-1 h-1 rounded-full bg-indigo-500"></span>
                        ))}
                        {dayEvents.length > 3 && <span className="text-[6px] font-bold text-indigo-500">+{dayEvents.length-3}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {events.length === 0 && (
            <p className="text-center text-[10px] text-slate-400 mt-6">No events this month</p>
          )}
        </>
      )}
    </div>
  );
};

// ── 4. ATTENDANCE STATS CARDS ───────────────────────────────

const AttendanceStats = ({ data }) => {
  if (!data) return null;

  const stats = [
    { 
      label: 'Students', 
      present: data.school?.present || 0, 
      absent: data.school?.absent || 0, 
      pending: data.school?.pending || 0,
      total: data.school?.total || 0,
      color: 'blue'
    },
    { 
      label: 'Staff', 
      present: data.staff?.present || 0, 
      absent: data.staff?.absent || 0, 
      pending: data.staff?.pending || 0,
      total: data.staff?.total || 0,
      color: 'purple'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {stats.map((stat, idx) => {
        const presentPercent = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0;
        const absentPercent = stat.total > 0 ? Math.round((stat.absent / stat.total) * 100) : 0;
        const pendingPercent = stat.total > 0 ? Math.round((stat.pending / stat.total) * 100) : 0;

        return (
          <div key={idx} className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-black text-slate-900">{stat.label}</h4>
              <span className="text-xs font-bold text-slate-500">Total: {stat.total}</span>
            </div>
            
            {/* Main Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center p-2 bg-emerald-50 rounded-xl">
                <p className="text-xl font-black text-emerald-600">{stat.present}</p>
                <p className="text-[9px] font-bold text-emerald-700 uppercase">ရှိ</p>
              </div>
              <div className="text-center p-2 bg-rose-50 rounded-xl">
                <p className="text-xl font-black text-rose-600">{stat.absent}</p>
                <p className="text-[9px] font-bold text-rose-700 uppercase">ပျက်</p>
              </div>
              <div className="text-center p-2 bg-amber-50 rounded-xl">
                <p className="text-xl font-black text-amber-600">{stat.pending}</p>
                <p className="text-[9px] font-bold text-amber-700 uppercase">ဆိုင်း</p>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[8px] font-bold mb-1">
                  <span className="text-emerald-600">ရှိ {presentPercent}%</span>
                  <span className="text-rose-600">ပျက် {absentPercent}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${presentPercent}%` }} />
                  <div className="h-full bg-rose-500" style={{ width: `${absentPercent}%` }} />
                  <div className="h-full bg-amber-500" style={{ width: `${pendingPercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── 5. ABSENT MODAL ──────────────────────────────

function AbsentModal({ persons, title, onClose }) {
  if (!persons || persons.length === 0) return null;

  const groupedByStatus = {
    approved: persons.filter(p => p.status === 'Approved'),
    pending: persons.filter(p => p.status === 'Pending')
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full md:w-[600px] rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center md:hidden mb-4"><div className="w-12 h-1.5 bg-slate-200 rounded-full"/></div>
        
        <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Attendance Detail</p>
            <h3 className="text-xl font-black text-slate-900 leading-none">{title}</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 font-black text-lg flex items-center justify-center hover:bg-slate-200">✕</button>
        </div>

        {/* Summary Tabs */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-emerald-600 font-black">{groupedByStatus.approved.length}</p>
            <p className="text-[8px] text-emerald-700 font-bold uppercase">Approved</p>
          </div>
          <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-600 font-black">{groupedByStatus.pending.length}</p>
            <p className="text-[8px] text-amber-700 font-bold uppercase">Pending</p>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
          {groupedByStatus.approved.map((p, i) => (
            <PersonCard key={`approved-${i}`} person={p} />
          ))}
          {groupedByStatus.pending.map((p, i) => (
            <PersonCard key={`pending-${i}`} person={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PersonCard({ person }) {
  return (
    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${person.status === 'Approved' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {person.grade ? '🎓' : '👔'}
          </div>
          <div>
            <p className="font-black text-slate-900 text-[15px]">{person.name || person.id}</p>
            {person.grade && (
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                Grade {person.grade}{person.section ? ` · ${person.section}` : ''}
              </p>
            )}
          </div>
        </div>
        <span className={`text-[9px] uppercase font-black px-3 py-1 rounded-lg shadow-sm border ${
          person.status === 'Approved' 
            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
            : 'bg-amber-50 text-amber-600 border-amber-100'
        }`}>
          {person.status}
        </span>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase">
            {person.leave_type || 'Leave'}
          </span>
          <span className="text-[10px] font-bold text-slate-500">
            📅 {formatDateDisplay(person.start_date)}
            {person.end_date && person.end_date !== person.start_date ? ` → ${formatDateDisplay(person.end_date)}` : ''}
          </span>
        </div>
        {person.reason && person.reason !== '-' && (
          <p className="text-[12px] text-slate-600 italic leading-snug">"{person.reason}"</p>
        )}
      </div>
    </div>
  );
}

// ── 6. TREND CHART (Improved) ────────────────────────────────

const TrendChart = ({ trend }) => {
  if (!trend || trend.length === 0) {
    return <div className="h-full flex items-center justify-center text-[10px] text-white/50">No data available</div>;
  }

  // Calculate max percentage for scaling
  const maxPct = Math.max(...trend.map(t => t.pct), 10);

  return (
    <div className="flex-1 flex items-end gap-1 relative">
      {trend.map((t, i) => (
        <div key={i} className="group relative flex-1 flex flex-col items-center justify-end h-full">
          {/* Tooltip */}
          <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-white text-slate-950 text-[9px] py-1.5 px-3 rounded-lg font-black whitespace-nowrap z-20 pointer-events-none transition-opacity shadow-xl">
            {t.label}: {t.pct}% (S:{t.absentStudents} · T:{t.absentStaff})
          </div>
          {/* Bar with gradient */}
          <div 
            className="w-full rounded-t-sm transition-all duration-500 hover:brightness-110"
            style={{
              height: `${(t.pct / maxPct) * 100}%`,
              background: t.pct >= 90 
                ? 'linear-gradient(180deg, #34d399 0%, #10b981 100%)' 
                : t.pct >= 70
                ? 'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)'
                : 'linear-gradient(180deg, #f87171 0%, #ef4444 100%)',
              minHeight: '4px'
            }}
          />
        </div>
      ))}
    </div>
  );
};

// ── 7. MAIN COMPONENT ───────────────────────────────────────

export default function StaffAccessHub() {
  const [user, setUser] = useState(null);
  const [att, setAtt] = useState(null);           // today's attendance
  const [trend, setTrend] = useState([]);          // trend data (30 days) with absentStudents & absentStaff
  const [loadingAtt, setLoadingAtt] = useState(true);
  const [modal, setModal] = useState(null);
  const [selectedView, setSelectedView] = useState('stats'); // 'stats', 'calendar'
  const [calendarMode, setCalendarMode] = useState('attendance'); // 'attendance', 'events'
  const router = useRouter();

  // Fetch user and initial data
  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || "null");
    if (!auth) { router.push('/login'); return; }
    if (auth.userRole === 'management') { router.push('/management/mgt-dashboard'); return; }

    // Fetch staff permissions (optional, but keeps consistency)
    fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getStaffPermissions' }) })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const fresh = res.data.find(s => (s.Staff_ID && s.Staff_ID.toString() === auth.Staff_ID?.toString()) || (s.Name && s.Name === auth['Name (ALL CAPITAL)']) || (s.Name && s.Name === auth.Name) );
          if (fresh) {
            const updated = { ...auth, ...fresh }; localStorage.setItem('user', JSON.stringify(updated)); setUser(updated); return;
          }
        }
        setUser(auth);
      }).catch(() => setUser(auth));

    const today = new Date().toLocaleDateString('en-CA', { timeZone:'Asia/Yangon' });
    Promise.all([
      fetch(WEB_APP_URL, { method:'POST', body:JSON.stringify({ action:'getAttendance', date:today }) }).then(r=>r.json()),
      fetch(WEB_APP_URL, { method:'POST', body:JSON.stringify({ action:'getAttendanceTrend' }) }).then(r=>r.json())
    ]).then(([attRes, trendRes]) => {
      if (attRes.success) setAtt(attRes);
      if (trendRes.success) {
        console.log('Trend response:', trendRes);
        setTrend(trendRes.trend || []);
      }
      setLoadingAtt(false);
    }).catch(() => setLoadingAtt(false));
  }, []);

  // Handle day click on attendance calendar – fetch that day's attendance and show modal
  const handleDayClick = useCallback(async (date) => {
    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getAttendance', date })
      });
      const data = await res.json();
      if (data.success) {
        const allAbsent = [
          ...(data.absentStudents || []),
          ...(data.pendingStudents || []),
          ...(data.absentStaff || []),
          ...(data.pendingStaff || [])
        ];
        if (allAbsent.length > 0) {
          setModal({ title: formatDateDisplay(date), persons: allAbsent });
        } else {
          alert('No absences on this day.');
        }
      } else {
        alert('Could not fetch attendance for that day.');
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  if (!user) return <div className="h-screen flex items-center justify-center bg-[#F0F9FF]"><div className="w-12 h-12 border-4 border-slate-200 border-t-[#fbbf24] rounded-full animate-spin"></div></div>;

  const toolGroups = [
    { group: "Campus & Student Operations", items: [ { name: 'Student Directory', path: '/staff/student-dir', icon: '👤', perm: null }, { name: 'Hostel Management', path: '/staff/hostel', icon: '🏠', perm: 'Can_Manage_Hostel' }, { name: 'House Score Adjust', path: '/staff/points', icon: '⚖️', perm: null }, ] },
    { group: "Facilities & Transport", items: [ { name: 'Vehicle Registry', path: '/staff/vehicles', icon: '🛵', perm: null }, { name: 'Inventory', path: '/staff/inventory', icon: '📦', perm: 'Can_Manage_Inventory' }, { name: 'Lost & Found', path: '/staff/lost-found', icon: '🔍', perm: null }, ] },
    { group: "Staff Professional Hub", items: [ { name: 'Staff Contacts', path: '/staff/contacts', icon: '📞', perm: null }, { name: 'Master Registry', path: '/staff/staff-dir', icon: '👔', perm: 'Can_View_Staff' }, { name: 'Leave Portal', path: '/staff/leave', icon: '📄', perm: null }, { name: 'Vendors', path: '/staff/vendors', icon: '🤝', perm: null } ] },
    { group: "Administrative & Ledger", items: [ { name: 'Financial Registry', path: '/staff/fees', icon: '💰', perm: 'Can_Manage_Fees' }, { name: 'Registry Notes', path: '/staff/notes', icon: '📒', perm: null }, { name: 'Communication', path: '/management/communication', icon: '📢', perm: 'Can_Post_Announcement' }, { name: 'Exam Records', path: '/staff/exam-records', icon: '📝', perm: 'Can_Record_Exam' }, { name: 'Calendar', path: '/staff/calendar', icon: '📅', perm: 'Can_Manage_Events' }, { name: 'My Timetable', path: '/staff/timetable', icon: '🗓️', perm: null }, ] }
  ];

  const handleLogout = () => { localStorage.removeItem('user'); sessionStorage.removeItem('user'); router.push('/login'); };

  const allAbsentPersons = [ ...(att?.absentStudents || []), ...(att?.pendingStudents || []), ...(att?.absentStaff || []), ...(att?.pendingStaff || []) ];

  const openAbsentModal = (type) => {
    let persons = []; let title = '';
    if (type === 'student') { persons = [...(att?.absentStudents||[]), ...(att?.pendingStudents||[])]; title = 'Student Absences Today'; } 
    else if (type === 'staff') { persons = [...(att?.absentStaff||[]), ...(att?.pendingStaff||[])]; title = 'Staff Absences Today'; } 
    else { persons = allAbsentPersons.filter(p => (p.classKey || 'Unknown') === (type || 'Unknown')); title = type && type !== 'Unknown' ? `Class ${type} — Absences` : 'Grade Unknown — Absences'; }
    if (persons.length > 0) setModal({ title, persons });
  };

  return (
    <div className="h-full overflow-y-auto bg-[#F0F9FF] font-black text-slate-950 p-4 md:p-12 pb-32">
      {modal && <AbsentModal title={modal.title} persons={modal.persons} onClose={() => setModal(null)}/>}

      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* HEADER */}
        <div className="bg-slate-950 rounded-[3rem] p-8 md:p-14 border-b-[12px] border-[#fbbf24] shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#fbbf24]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="relative z-10 w-20 h-20 md:w-32 md:h-32 bg-white rounded-[2rem] flex items-center justify-center text-4xl md:text-6xl shadow-xl border-4 border-[#fbbf24] shrink-0">👤</div>
          <div className="text-center md:text-left flex-1 z-10 min-w-0">
            <div className="inline-block px-4 py-1.5 bg-[#fbbf24] text-slate-950 text-[10px] font-black uppercase rounded-lg mb-3 tracking-[0.2em]">Educational Staff</div>
            <h1 className="text-2xl md:text-5xl italic uppercase font-black text-white tracking-tighter leading-none mb-3 break-words">{user['Name (ALL CAPITAL)'] || user.Name || user.username}</h1>
            <p className="text-slate-400 text-[10px] md:text-xs uppercase font-black tracking-[0.3em]">ID: <span className="text-[#fbbf24]">{user.Staff_ID || user.ID || "—"}</span><span className="mx-3 opacity-30">|</span>Status: <span className="text-white">Authorized</span></p>
          </div>
          <button onClick={handleLogout} className="relative z-50 px-6 py-3 bg-rose-600 text-white text-[10px] md:text-xs font-black uppercase rounded-2xl border-b-4 border-rose-900 active:scale-95 transition-all shrink-0 shadow-xl hover:bg-rose-700">Logout ⏻</button>
        </div>

        {/* ATTENDANCE DASHBOARD */}
        <div className="space-y-4">
          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedView('stats')}
              className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                selectedView === 'stats' 
                  ? 'bg-slate-950 text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              📊 Today's Overview
            </button>
            <button
              onClick={() => setSelectedView('calendar')}
              className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                selectedView === 'calendar' 
                  ? 'bg-slate-950 text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              📅 Calendar View
            </button>
          </div>

          {selectedView === 'stats' ? (
            /* Stats View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Stats Cards */}
              <div className="lg:col-span-1 space-y-4">
                {loadingAtt ? (
                  <div className="bg-white rounded-[2rem] p-6 animate-pulse h-64"></div>
                ) : (
                  <AttendanceStats data={att} />
                )}

                {/* Class Absences */}
                {att?.classes?.some(c => c.absent > 0 || c.pending > 0) && (
                  <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100">
                    <h4 className="text-sm font-black text-slate-900 mb-4">Class Absences</h4>
                    <div className="flex flex-wrap gap-2">
                      {att.classes.filter(c => c.absent > 0 || c.pending > 0).map((c,i) => (
                        <button 
                          key={i} 
                          onClick={() => openAbsentModal(c.grade || 'Unknown')} 
                          className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all hover:opacity-80 ${
                            c.color === 'red' ? 'bg-rose-100 text-rose-700' : 
                            c.color === 'yellow' ? 'bg-amber-100 text-amber-700' : 
                            'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {c.grade} · {c.absent > 0 ? `${c.absent} ပျက်` : `${c.pending} ဆိုင်း`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Trend Chart */}
              <div className="lg:col-span-2 bg-slate-950 rounded-[2rem] p-6 border-b-[8px] border-[#fbbf24] shadow-xl text-white flex flex-col min-h-[400px]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] uppercase tracking-widest text-[#fbbf24] font-black">Attendance Trend (Last 30 Days)</h3>
                  <span className="text-[9px] bg-white/10 px-3 py-1 rounded-full text-slate-300">Daily Breakdown</span>
                </div>

                {/* Improved Trend Chart */}
                {loadingAtt ? (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-white/50">Loading chart...</div>
                ) : (
                  <TrendChart trend={trend} />
                )}

                {/* X-Axis Labels */}
                <div className="flex justify-between mt-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <span>30 Days Ago</span>
                  <span>Today</span>
                </div>
              </div>
            </div>
          ) : (
            /* Calendar View */
            <div className="space-y-4">
              {/* Calendar Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setCalendarMode('attendance')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    calendarMode === 'attendance' 
                      ? 'bg-slate-950 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  📋 Attendance
                </button>
                <button
                  onClick={() => setCalendarMode('events')}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    calendarMode === 'events' 
                      ? 'bg-slate-950 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🎉 Events
                </button>
              </div>

              {calendarMode === 'attendance' ? (
                <AttendanceCalendar 
                  trendData={trend}
                  onDayClick={handleDayClick}
                />
              ) : (
                <EventCalendar />
              )}
            </div>
          )}
        </div>

        {/* TOOL GROUPS */}
        <div className="space-y-12 pt-4">
          {toolGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-6">
              <h2 className="text-base md:text-xl uppercase border-l-8 border-slate-950 pl-4 tracking-tight text-slate-950">{group.group}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {group.items.map((tool, i) => {
                  const locked = tool.perm ? !hasPerm(user, tool.perm) : false;
                  return (
                    <button 
                      key={i} 
                      onClick={() => !locked && router.push(tool.path)} 
                      className={`relative group p-6 md:p-8 rounded-[2rem] border-b-[8px] transition-all duration-300 flex flex-col items-center text-center gap-4 shadow-lg ${
                        locked 
                          ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed' 
                          : 'bg-white border-slate-100 hover:border-[#fbbf24] hover:-translate-y-1 active:scale-95'
                      }`}
                    >
                      <span className={`text-4xl md:text-5xl transition-transform duration-300 ${!locked && 'group-hover:scale-110'}`}>{tool.icon}</span>
                      <div>
                        <h3 className={`text-[11px] md:text-sm font-black uppercase italic tracking-tight leading-tight ${locked ? 'text-slate-400' : 'text-slate-950'}`}>
                          {tool.name}
                        </h3>
                      </div>
                      {locked && <div className="absolute top-4 right-4 text-slate-400 text-sm opacity-50">🔒</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        body { background-color: #F0F9FF; font-weight: 900 !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
}