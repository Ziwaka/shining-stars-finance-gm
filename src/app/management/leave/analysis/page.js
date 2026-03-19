"use client";
import { useState, useMemo, useRef } from 'react';
import useLeaveData from '@/hooks/useLeaveData';
import StatCard from '@/components/leave/StatCard';
import GradeBreakdown from '@/components/leave/GradeBreakdown';
import CompactAdvancedFilter from '@/components/leave/CompactAdvancedFilter';
import UserDetailModal from '@/components/leave/UserDetailModal';
import PrintableView from '@/components/leave/PrintableView';
import DurationBadge from '@/components/leave/DurationBadge'; // IMPORT ထည့်ရန် အရေးကြီး
import { getTodayMM, formatMMDate, formatDateDisplay } from '@/components/leave/DateHelpers';

// Watchlist Group Component
const EnhancedWatchlistGroup = ({ title, users, icon, color, onViewDetails }) => (
  <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col max-h-[600px] shadow-xl">
    <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4 shrink-0">
      <p className={`text-sm font-black uppercase tracking-widest leading-tight ${color}`}>
        {icon} {title} <span className="ml-2 text-xs bg-slate-100 px-2 py-1 rounded-lg">{users.length}</span>
      </p>
    </div>
    
    <div className="space-y-4 overflow-y-auto pr-2 flex-1 scrollbar-thin">
      {users.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-10">No records found</p>
      ) : users.map((u, i) => (
        <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-pointer" onClick={() => onViewDetails(u)}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="font-black text-slate-900 text-base">{u.name}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-[9px] px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-600 font-black">{u.id}</span>
                <span className={`text-[9px] px-2 py-1 rounded-md font-black uppercase ${u.type === 'STUDENT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                  {u.type}
                </span>
                {u.grade && (
                  <span className="text-[9px] px-2 py-1 rounded-md bg-sky-100 text-sky-700 font-black">G-{u.grade}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-amber-600">{u.totalDays}d</p>
              <p className="text-[8px] text-slate-400 uppercase">total</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white p-2 rounded-lg text-center">
              <p className="text-sm font-black text-rose-600">{u.stats?.consecutiveMax || 0}</p>
              <p className="text-[7px] text-slate-400 uppercase">Max Consec</p>
            </div>
            <div className="bg-white p-2 rounded-lg text-center">
              <p className="text-sm font-black text-amber-600">{u.stats?.weekCount || 0}</p>
              <p className="text-[7px] text-slate-400 uppercase">This Week</p>
            </div>
            <div className="bg-white p-2 rounded-lg text-center">
              <p className="text-sm font-black text-emerald-600">{u.stats?.monthCount || 0}</p>
              <p className="text-[7px] text-slate-400 uppercase">This Month</p>
            </div>
          </div>

          {u.reasons && u.reasons.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-[8px] text-slate-400 font-black uppercase mb-2">Recent:</p>
              <div className="space-y-2">
                {u.reasons.slice(0, 2).map((r, ri) => (
                  <div key={ri} className="bg-white p-2 rounded-lg text-[10px]">
                    <span className="text-slate-500 block mb-1">📅 {formatDateDisplay(r.start)}</span>
                    <span className="text-slate-700 italic">"{r.text.substring(0, 50)}..."</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default function AnalysisPage() {
  const { 
    allLeaves, 
    allStudents, 
    allStaff, 
    statsList, 
    pending, 
    loading,
    getTodayAbsentUsers,
    getTodayAbsentCount,
    highRiskUsers,
    topAbsentees
  } = useLeaveData();
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [printView, setPrintView] = useState(null);
  const [watchFilter, setWatchFilter] = useState("CONSECUTIVE_3");
  const [historySearchQueryAnalysis, setHistorySearchQueryAnalysis] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({
    userType: 'ALL',
    minDays: '',
    maxDays: '',
    minConsecutive: '',
    timePeriod: 'ALL',
    leaveType: 'ALL',
    sortBy: 'grade',
    sortOrder: 'asc'
  });

  // Calendar state
  const [calDate, setCalDate] = useState(new Date());
  const [selectedCalDate, setSelectedCalDate] = useState(null);

  const printRef = useRef();

  // Grade-wise breakdowns
  const getTodayAbsentByGrade = useMemo(() => {
    const byGrade = {};
    getTodayAbsentUsers.filter(u => u.type === 'STUDENT').forEach(u => {
      const grade = u.grade || 'undefined';
      if (!byGrade[grade]) byGrade[grade] = [];
      byGrade[grade].push(u);
    });
    return byGrade;
  }, [getTodayAbsentUsers]);

  const pendingByGrade = useMemo(() => {
    const byGrade = {};
    pending.filter(l => l.User_Type === 'STUDENT').forEach(l => {
      const student = allStudents?.find(s => s.Student_ID === l.User_ID || s.Name === l.Name);
      const grade = student?.Grade || 'undefined';
      if (!byGrade[grade]) byGrade[grade] = [];
      byGrade[grade].push({
        ...l,
        studentGrade: grade,
        studentSection: student?.Section
      });
    });
    return byGrade;
  }, [pending, allStudents]);

  const highRiskByGrade = useMemo(() => {
    const byGrade = {};
    highRiskUsers.filter(u => u.type === 'STUDENT').forEach(u => {
      const grade = u.grade || 'undefined';
      if (!byGrade[grade]) byGrade[grade] = [];
      byGrade[grade].push(u);
    });
    return byGrade;
  }, [highRiskUsers]);

  const topAbsenteesByGrade = useMemo(() => {
    const byGrade = {};
    topAbsentees.forEach(u => {
      const grade = u.grade || 'undefined';
      if (!byGrade[grade]) byGrade[grade] = [];
      byGrade[grade].push(u);
    });
    return byGrade;
  }, [topAbsentees]);

  // Filtered stats
  const filteredStats = useMemo(() => {
    return statsList.filter(u => {
      if (advancedFilters.userType !== 'ALL' && u.type !== advancedFilters.userType) return false;
      if (advancedFilters.minDays && u.totalDays < Number(advancedFilters.minDays)) return false;
      if (advancedFilters.maxDays && u.totalDays > Number(advancedFilters.maxDays)) return false;
      if (advancedFilters.minConsecutive && u.consecutiveMax < Number(advancedFilters.minConsecutive)) return false;
      if (advancedFilters.timePeriod !== 'ALL') {
        if (advancedFilters.timePeriod === 'WEEK' && u.weekCount === 0) return false;
        if (advancedFilters.timePeriod === 'MONTH' && u.monthCount === 0) return false;
        if (advancedFilters.timePeriod === 'QUARTER' && u.quarterCount === 0) return false;
      }
      if (advancedFilters.leaveType !== 'ALL') {
        if (!u.leaveTypes[advancedFilters.leaveType]) return false;
      }
      return true;
    }).sort((a, b) => {
      let aVal, bVal;

      switch (advancedFilters.sortBy) {
        case 'totalDays':
          aVal = a.totalDays;
          bVal = b.totalDays;
          return advancedFilters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        case 'consecutiveDays':
          aVal = a.consecutiveMax;
          bVal = b.consecutiveMax;
          return advancedFilters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        case 'grade':
          if (a.type !== b.type) {
            return a.type === 'STUDENT' ? -1 : 1;
          }
          if (a.type === 'STUDENT') {
            const gradeA = parseInt(a.grade) || 0;
            const gradeB = parseInt(b.grade) || 0;
            if (gradeA !== gradeB) return gradeA - gradeB;
            return (a.enrollmentNo || a.id).localeCompare(b.enrollmentNo || b.id);
          }
          return (a.id || '').localeCompare(b.id || '');
        case 'recent':
          aVal = a.reasons[0]?.start || '';
          bVal = b.reasons[0]?.start || '';
          return advancedFilters.sortOrder === 'asc'
            ? new Date(aVal) - new Date(bVal)
            : new Date(bVal) - new Date(aVal);
        default:
          aVal = a.totalDays;
          bVal = b.totalDays;
          return advancedFilters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
  }, [statsList, advancedFilters]);

  // Watch groups
  const watchGroups = {
    'CONSECUTIVE_2': { 
      title: '၂ ရက်ဆက်တိုက် ပျက်သူများ', 
      users: filteredStats.filter(u => u.consecutiveMax >= 2),
      icon: '⚠️',
      color: 'text-amber-600'
    },
    'CONSECUTIVE_3': { 
      title: '၃ ရက်ဆက်တိုက် ပျက်သူများ', 
      users: filteredStats.filter(u => u.consecutiveMax >= 3),
      icon: '🔥',
      color: 'text-orange-600'
    },
    'CONSECUTIVE_4': { 
      title: '၄ ရက်ဆက်တိုက် ပျက်သူများ', 
      users: filteredStats.filter(u => u.consecutiveMax >= 4),
      icon: '⚡',
      color: 'text-red-600'
    },
    'CONSECUTIVE_5': { 
      title: '၅ ရက်ဆက်တိုက် ပျက်သူများ', 
      users: filteredStats.filter(u => u.consecutiveMax >= 5),
      icon: '🚨',
      color: 'text-rose-600'
    },
    'WEEK_2PLUS': { 
      title: '၁ ပတ်အတွင်း ၂ ရက်နှင့်အထက်', 
      users: filteredStats.filter(u => u.weekCount >= 2),
      icon: '📊',
      color: 'text-emerald-600'
    },
    'MONTH_3PLUS': { 
      title: '၁ လအတွင်း ၃ ရက်နှင့်အထက်', 
      users: filteredStats.filter(u => u.monthCount >= 3),
      icon: '📈',
      color: 'text-blue-600'
    },
    'QUARTER_5PLUS': { 
      title: '၃ လအတွင်း ၅ ရက်နှင့်အထက်', 
      users: filteredStats.filter(u => u.quarterCount >= 5),
      icon: '🎯',
      color: 'text-purple-600'
    }
  };

  const watchTabs = [
    { id: 'CONSECUTIVE_2', label: '၂ ရက်ဆက်' },
    { id: 'CONSECUTIVE_3', label: '၃ ရက်ဆက်' },
    { id: 'CONSECUTIVE_4', label: '၄ ရက်ဆက်' },
    { id: 'CONSECUTIVE_5', label: '၅ ရက်ဆက်' },
    { id: 'WEEK_2PLUS', label: '၁ ပတ် ≥၂' },
    { id: 'MONTH_3PLUS', label: '၁ လ ≥၃' },
    { id: 'QUARTER_5PLUS', label: '၃ လ ≥၅' }
  ];

  // Calendar logic
  const cYear = calDate.getFullYear();
  const cMonth = calDate.getMonth();
  const daysInMonth = new Date(cYear, cMonth + 1, 0).getDate();
  const firstDay = new Date(cYear, cMonth, 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const calCells = [];
  for(let i=0; i<firstDay; i++) calCells.push(null);
  for(let i=1; i<=daysInMonth; i++) {
    const dStr = `${cYear}-${String(cMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    const count = allLeaves.filter(l => l.Status === 'Approved' && formatMMDate(l.Start_Date) <= dStr && formatMMDate(l.End_Date || l.Start_Date) >= dStr).length;
    calCells.push({ day: i, dateStr: dStr, total: count });
  }

  const handlePrint = (title, data) => {
    setPrintView({ title, data });
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${title}</title>
              <style>
                @media print {
                  body { margin: 0; padding: 20px; }
                  table { page-break-inside: avoid; }
                  tr { page-break-inside: avoid; page-break-after: auto; }
                }
              </style>
            </head>
            <body>
              ${document.getElementById('print-content').innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
      setPrintView(null);
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-4xl text-amber-500 animate-pulse">⌛ Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      {printView && (
        <div id="print-content" className="hidden">
          <PrintableView
            ref={printRef}
            data={printView.data}
            title={printView.title}
            date={getTodayMM()}
          />
        </div>
      )}

      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {selectedCalDate && (
        <div className="fixed inset-0 z-[99] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedCalDate(null)}>
          <div className="bg-white w-full max-w-[550px] rounded-[2.5rem] p-8 shadow-3xl flex flex-col max-h-[85vh] border-t-8 border-sky-500" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-none mb-2">Absent Details</h3>
                <p className="text-[11px] uppercase tracking-[0.2em] text-sky-500 font-bold">{formatDateDisplay(selectedCalDate)}</p>
              </div>
              <button onClick={() => setSelectedCalDate(null)} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 font-black text-xl flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-all">✕</button>
            </div>
            <div className="overflow-y-auto space-y-4 pr-3 scrollbar-thin">
              {allLeaves.filter(l => l.Status === 'Approved' && formatMMDate(l.Start_Date) <= selectedCalDate && (formatMMDate(l.End_Date) || formatMMDate(l.Start_Date)) >= selectedCalDate).length === 0 ? (
                <div className="py-20 text-center text-slate-300 italic font-black uppercase tracking-widest">No absentees for this day.</div>
              ) : allLeaves.filter(l => l.Status === 'Approved' && formatMMDate(l.Start_Date) <= selectedCalDate && (formatMMDate(l.End_Date) || formatMMDate(l.Start_Date)) >= selectedCalDate).map((l, i) => {
                // Find user stats to pass to modal
                const userStat = statsList.find(s => s.id === l.User_ID || s.name === l.Name);
                const userForModal = userStat ? { ...userStat, id: l.User_ID, name: l.Name } : null;
                return (
                  <div 
                    key={i} 
                    className="bg-slate-50 border border-slate-100 p-5 rounded-[1.8rem] shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => userForModal && setSelectedUser(userForModal)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <p className="font-black text-slate-900 text-[16px] italic uppercase tracking-tighter">{l.Name}</p>
                      <span className="text-[9px] uppercase font-black bg-white px-3 py-1.5 rounded-xl text-sky-600 border border-sky-100 shadow-sm">{l.Leave_Type}</span>
                    </div>
                    <div className="flex gap-2 mb-4 flex-wrap">
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-black tracking-widest">ID: {l.User_ID}</span>
                      <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest ${l.User_Type==='STUDENT'?'bg-indigo-100 text-indigo-700':'bg-amber-100 text-amber-700'}`}>{l.User_Type}</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100">
                      <p className="text-[13px] text-slate-600 italic leading-relaxed font-medium">"{l.Reason || "No reason specified"}"</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="ယနေ့ ပျက်ကွက်"
          value={getTodayAbsentCount}
          subtitle="ကျောင်းသား/ဝန်ထမ်း"
          icon="📍"
          color="rose"
          trend="Now"
          onClick={() => {
            document.getElementById('today-absent-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        <StatCard
          title="စောင့်ဆိုင်း"
          value={pending.length}
          subtitle="ခွင့်တင်ထားသူ"
          icon="⏳"
          color="amber"
          trend="Action Needed"
          onClick={() => {
            document.getElementById('grade-breakdowns')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        <StatCard
          title="စောင့်ကြည့်ရန်"
          value={highRiskUsers.length}
          subtitle="၃ရက်ဆက်တိုက်ပျက်သူ"
          icon="⚠️"
          color="orange"
          trend="High Risk"
          onClick={() => {
            document.getElementById('watchlist-tabs')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        <StatCard
          title="အပျက်များသူ"
          value={topAbsentees.length}
          subtitle="ထိပ်ဆုံး ၂၀"
          icon="🔥"
          color="purple"
          trend="Top Absentees"
          onClick={() => {
            document.getElementById('grade-breakdowns')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        <CompactAdvancedFilter
          filters={advancedFilters}
          onFilterChange={setAdvancedFilters}
        />
        <div className="text-xs text-slate-400 font-black">
          {filteredStats.length} items filtered
        </div>
      </div>

      {/* TODAY'S ABSENT SECTION - ထိပ်ဆုံးမှာ */}
      {getTodayAbsentUsers.length > 0 && (
        <div id="today-absent-section" className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-[2.5rem] p-6 border-2 border-rose-200 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-8 bg-rose-500 rounded-full"></div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">ယနေ့ ပျက်ကွက်သူများ</h2>
            <span className="text-sm bg-rose-500 text-white px-3 py-1 rounded-full font-black">{getTodayAbsentCount} ဦး</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getTodayAbsentUsers.map((user, idx) => (
              <div
                key={idx}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border border-rose-200 shadow-md hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-black text-slate-900 text-base">{user.name}</p>
                    <div className="flex gap-1 mt-1">
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${user.type === 'STUDENT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {user.type}
                      </span>
                      {user.grade && <span className="text-[8px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-black">G-{user.grade}</span>}
                    </div>
                  </div>
                  <span className="text-xs bg-rose-100 text-rose-600 px-2 py-1 rounded-lg font-black">{user.totalDays}d</span>
                </div>
                {user.todayReason && (
                  <div className="mt-2 pt-2 border-t border-rose-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-black text-rose-500 uppercase">{user.todayReason.type}</span>
                      <DurationBadge leave={user.todayReason} />
                    </div>
                    <p className="text-xs text-slate-700 italic line-clamp-2">"{user.todayReason.text}"</p>
                    {user.todayReason.attachment && user.todayReason.attachment !== '-' && (
                      <a href={user.todayReason.attachment} target="_blank" className="text-[8px] text-sky-500 underline font-black mt-1 inline-block">📎</a>
                    )}
                  </div>
                )}
                <div className="mt-2 text-[8px] text-slate-400 flex justify-end">
                  <span>Click for full history →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Watchlist Tabs */}
      <div id="watchlist-tabs" className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-2 h-8 bg-amber-500 rounded-full shadow-lg" />
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Attendance Watchlist</h3>
          <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-black">
            {filteredStats.length} filtered
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-6 mb-4 no-scrollbar">
          {watchTabs.map(f => (
            <button
              key={f.id}
              onClick={() => setWatchFilter(f.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 border-b-4 ${
                watchFilter === f.id
                  ? 'bg-slate-950 text-white border-slate-800 shadow-lg'
                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {f.label}
              <span className={`px-1.5 py-0.5 rounded-lg text-[7px] ${
                watchFilter === f.id ? 'bg-[#fbbf24] text-slate-950' : 'bg-slate-200 text-slate-500'
              }`}>
                {watchGroups[f.id]?.users.length || 0}
              </span>
            </button>
          ))}
        </div>

        {watchGroups[watchFilter] && (
          <EnhancedWatchlistGroup
            {...watchGroups[watchFilter]}
            onViewDetails={setSelectedUser}
          />
        )}
      </div>

      {/* Calendar View */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setCalDate(new Date(cYear, cMonth - 1, 1))} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:bg-sky-100 hover:text-sky-600 transition-all">‹</button>
          <div className="text-center">
            <h3 className="text-xl font-black uppercase tracking-[0.2em] text-slate-900">{monthNames[cMonth]}</h3>
            <p className="text-[9px] font-black text-sky-500 mt-1 uppercase tracking-widest">{cYear}</p>
          </div>
          <button onClick={() => setCalDate(new Date(cYear, cMonth + 1, 1))} className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 hover:bg-sky-100 hover:text-sky-600 transition-all">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-3 text-center">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-[9px] font-black text-slate-400">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calCells.map((cell, idx) => {
            if (!cell) return <div key={idx} className="aspect-square bg-slate-50/50 rounded-xl opacity-30"/>;
            const isToday = cell.dateStr === getTodayMM();
            return (
              <button
                key={idx}
                onClick={() => cell.total > 0 && setSelectedCalDate(cell.dateStr)}
                className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center text-xs transition-all border ${
                  isToday ? 'bg-sky-600 text-white border-sky-800 shadow-md scale-105 z-10' :
                  cell.total > 0 ? 'bg-rose-50 border-rose-200 hover:bg-rose-100' : 'bg-slate-50 border-slate-100 hover:bg-white'
                }`}
              >
                <span className={`font-black text-[10px] ${isToday ? 'text-white' : cell.total > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{cell.day}</span>
                {cell.total > 0 && <span className={`text-[7px] font-black ${isToday ? 'text-white/80' : 'text-rose-500'}'}`}>{cell.total}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade-wise Breakdowns */}
      <div id="grade-breakdowns" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(getTodayAbsentByGrade).length > 0 && (
          <GradeBreakdown
            data={getTodayAbsentByGrade}
            title="📌 ယနေ့ပျက်ကွက်သူများ (အတန်းအလိုက်)"
            onPrint={() => handlePrint('ယနေ့ပျက်ကွက်သူများ', getTodayAbsentByGrade)}
            onViewDetails={setSelectedUser}
          />
        )}

        {Object.keys(pendingByGrade).length > 0 && (
          <GradeBreakdown
            data={pendingByGrade}
            title="⏳ ခွင့်တင်ထားသူများ (အတန်းအလိုက်)"
            onPrint={() => handlePrint('ခွင့်တင်ထားသူများ', pendingByGrade)}
            onViewDetails={setSelectedUser}
          />
        )}

        {Object.keys(highRiskByGrade).length > 0 && (
          <GradeBreakdown
            data={highRiskByGrade}
            title="⚠️ ၃ရက်ဆက်တိုက်ပျက်သူများ (အတန်းအလိုက်)"
            onPrint={() => handlePrint('၃ရက်ဆက်တိုက်ပျက်သူများ', highRiskByGrade)}
            onViewDetails={setSelectedUser}
          />
        )}

        {Object.keys(topAbsenteesByGrade).length > 0 && (
          <GradeBreakdown
            data={topAbsenteesByGrade}
            title="🔥 အပျက်အများဆုံး ကျောင်းသားများ (အတန်းအလိုက်)"
            onPrint={() => handlePrint('အပျက်အများဆုံးကျောင်းသားများ', topAbsenteesByGrade)}
            onViewDetails={setSelectedUser}
          />
        )}
      </div>

      {/* Individual Deep Dive */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl">
        <p className="text-xs font-black text-sky-600 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">🔍 တစ်ဦးချင်း ရှာဖွေရန်</p>
        <input
          value={historySearchQueryAnalysis}
          onChange={e => setHistorySearchQueryAnalysis(e.target.value)}
          placeholder="နာမည် သို့မဟုတ် ID ရိုက်ထည့်ပါ..."
          className="w-full bg-slate-50 border border-slate-200 rounded-full px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-sky-200 transition-all mb-4"
        />

        {historySearchQueryAnalysis.trim().length >= 2 && (
          <div className="max-h-[400px] overflow-y-auto flex flex-col gap-3 pr-2 scrollbar-thin">
            {statsList.filter(u =>
              u.name.toLowerCase().includes(historySearchQueryAnalysis.toLowerCase()) ||
              u.id.toLowerCase().includes(historySearchQueryAnalysis.toLowerCase())
            ).length === 0 ? (
              <p className="py-10 text-center italic text-slate-300 font-black">မတွေ့ပါ။</p>
            ) : statsList.filter(u =>
              u.name.toLowerCase().includes(historySearchQueryAnalysis.toLowerCase()) ||
              u.id.toLowerCase().includes(historySearchQueryAnalysis.toLowerCase())
            ).map((u, i) => (
              <div
                key={i}
                className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:bg-white hover:shadow cursor-pointer transition-all"
                onClick={() => setSelectedUser(u)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-slate-900">{u.name}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[8px] bg-white border border-slate-200 px-2 py-0.5 rounded-full font-black">ID: {u.id}</span>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${u.type === 'STUDENT' ? 'bg-indigo-100' : 'bg-amber-100'}`}>{u.type}</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-amber-600">{u.totalDays}d</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}