"use client";
import { useState, useMemo } from 'react';
import useLeaveData from '@/hooks/useLeaveData';
import DurationBadge from '@/components/leave/DurationBadge';
import { formatDateDisplay, formatMMDate, getTodayMM } from '@/components/leave/DateHelpers';

export default function HistoryPage() {
  const { allLeaves, loading } = useLeaveData();
  const [histSearch, setHistSearch] = useState('');
  const [histFilter, setHistFilter] = useState('ALL');
  const today = getTodayMM(); // YYYY-MM-DD

  // အတည်ပြုပြီးသော ခွင့်များကိုသာ ယူပြီး ယနေ့နောက်ပိုင်းရက်များကို ဖယ်ထုတ်မယ်
  const history = useMemo(() => {
    return allLeaves.filter(l => 
      l.Status !== 'Pending' && 
      l.Start_Date <= today // စတင်ရက်က ယနေ့ထက်နောက်မကျစေရ
    );
  }, [allLeaves, today]);

  // ရက်ရှည်ခွင့်များကို ရက်အလိုက် ဖြန့်ပြီး စုစည်းမယ် (ယနေ့အထိသာ)
  const expandedHistory = useMemo(() => {
    const expanded = [];
    history.forEach(leave => {
      const start = formatMMDate(leave.Start_Date);
      const end = formatMMDate(leave.End_Date || leave.Start_Date);
      
      // ယနေ့ထက်နောက်ကျတဲ့ရက်တွေကို မထည့်ပါနဲ့
      const maxEnd = end > today ? today : end;
      
      let current = new Date(start);
      const last = new Date(maxEnd);
      
      while (current <= last) {
        const dateStr = current.toISOString().split('T')[0];
        expanded.push({
          ...leave,
          displayDate: dateStr,
          originalStart: start,
          originalEnd: end
        });
        current.setDate(current.getDate() + 1);
      }
    });
    return expanded;
  }, [history, today]);

  // Filter နဲ့ Search
  const filteredHistory = useMemo(() => {
    return expandedHistory.filter(item => {
      const matchSearch = (item.Name || '').toLowerCase().includes(histSearch.toLowerCase());
      const matchType = histFilter === 'ALL' || item.User_Type === histFilter;
      return matchSearch && matchType;
    });
  }, [expandedHistory, histSearch, histFilter]);

  // ရက်စွဲအလိုက် အုပ်စုဖွဲ့မယ်
  const groupedHistory = useMemo(() => {
    const groups = {};
    filteredHistory.forEach(item => {
      const date = item.displayDate;
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [filteredHistory]);

  // ရက်စွဲများကို စီမယ် (အသစ်ဆုံးရက်က အထက်မှာ)
  const sortedHistoryDates = useMemo(() => {
    return Object.keys(groupedHistory).sort((a, b) => new Date(b) - new Date(a));
  }, [groupedHistory]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-4xl text-amber-500 animate-pulse">⌛ Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          placeholder="Search by name..."
          value={histSearch}
          onChange={e => setHistSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
        />
        <select
          value={histFilter}
          onChange={e => setHistFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-full px-4 py-2 text-sm font-black uppercase outline-none focus:ring-2 focus:ring-amber-200"
        >
          <option value="ALL">All</option>
          <option value="STUDENT">Students</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>

      {sortedHistoryDates.length === 0 ? (
        <div className="py-20 text-center text-slate-300 italic text-2xl font-black">No records found</div>
      ) : (
        sortedHistoryDates.map(date => (
          <div key={date} className="space-y-2">
            {/* Date Header */}
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 py-2 px-4 rounded-full shadow-sm border border-slate-100 inline-block">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                📅 {formatDateDisplay(date)} · {groupedHistory[date].length} ဦး
              </span>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupedHistory[date].map((item, idx) => (
                <div
                  key={idx}
                  className={`bg-white p-4 rounded-2xl border-l-8 shadow-md hover:shadow-lg transition-all ${
                    item.Status === 'Approved' ? 'border-emerald-400' : 'border-rose-400'
                  }`}
                >
                  {/* Header Line */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                        item.User_Type === 'STUDENT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.User_Type}
                      </span>
                      <DurationBadge leave={item} />
                    </div>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${
                      item.Status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {item.Status}
                    </span>
                  </div>

                  {/* Name & ID */}
                  <h4 className="font-black text-slate-900 text-base uppercase leading-tight mb-1">{item.Name}</h4>
                  <p className="text-[9px] text-slate-400 font-bold mb-2">ID: {item.User_ID} · {item.Leave_Type}</p>

                  {/* Reason */}
                  <div className="bg-slate-50 p-2 rounded-lg text-[11px] italic text-slate-600 line-clamp-2 mb-2">
                    "{item.Reason || '—'}"
                  </div>

                  {/* Attachment link */}
                  {item.Attachment_Link && item.Attachment_Link !== '-' && (
                    <a href={item.Attachment_Link} target="_blank" className="text-[9px] text-sky-500 underline font-black inline-block">
                      📎 Attachment
                    </a>
                  )}

                  {/* Range indicator (if multi-day) */}
                  {item.originalStart !== item.originalEnd && (
                    <p className="text-[8px] text-slate-400 mt-2 border-t border-slate-100 pt-1">
                      📅 {formatDateDisplay(item.originalStart)} – {formatDateDisplay(item.originalEnd)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}