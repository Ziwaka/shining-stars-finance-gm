"use client";
import { useState } from 'react';
import useLeaveData from '@/hooks/useLeaveData';
import DurationBadge from '@/components/leave/DurationBadge';
import { formatDateDisplay, formatMMDate } from '@/components/leave/DateHelpers';
import { WEB_APP_URL } from '@/lib/api';

export default function ApprovalPage() {
  const { allLeaves, pending, loading, fetchLeaves } = useLeaveData();
  const [proc, setProc] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    }
    return null;
  });

  const handleAction = async (leave, status) => {
    if (!user?.Name) return alert('Session Expired.');
    if (!confirm(`Are you sure you want to ${status} this request?`)) return;
    setProc(true);
    try {
      const cleanDate = formatMMDate(leave.Start_Date);
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateLeave',
          rowIndex: leave._rowIndex,
          userId: leave.User_ID,
          name: leave.Name,
          startDate: cleanDate,
          status,
          approvedBy: user.Name,
          userRole: 'management',
        })
      });
      const r = await res.json();
      if (r.success) {
        alert(`Request ${status} successfully!`);
        fetchLeaves();
      } else alert('FAIL: ' + r.message);
    } catch {
      alert('Network Error');
    } finally {
      setProc(false);
      setSelectedLeave(null);
      setShowDetail(false);
    }
  };

  const viewDetails = (leave) => {
    setSelectedLeave(leave);
    setShowDetail(true);
  };

  const closeDetails = () => {
    setSelectedLeave(null);
    setShowDetail(false);
  };

  if (loading || proc) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="text-2xl text-amber-500 animate-pulse">⌛ Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4 relative">
      {showDetail && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center">
              <h2 className="font-black text-lg">ခွင့်တိုင်ကြားစာ အသေးစိတ်</h2>
              <button onClick={closeDetails} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Header Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-indigo-50 text-indigo-700 text-[10px] px-3 py-1 rounded-full font-black">{selectedLeave.Category || 'Leave'}</span>
                <span className={`text-[10px] px-3 py-1 rounded-full font-black ${selectedLeave.User_Type === 'STUDENT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                  {selectedLeave.User_Type}
                </span>
                <DurationBadge leave={selectedLeave} />
                <span className="bg-slate-100 text-slate-600 text-[10px] px-3 py-1 rounded-full">
                  {formatDateDisplay(selectedLeave.Date_Applied)} (တင်ရက်)
                </span>
              </div>

              {/* Requester Info */}
              <div className="bg-slate-50 p-4 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-400 mb-3">တိုင်ကြားသူ အချက်အလက်</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400">အမည်</p>
                    <p className="font-bold">{selectedLeave.Name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">ID</p>
                    <p className="font-bold">{selectedLeave.User_ID || '-'}</p>
                  </div>
                  {selectedLeave.User_Type === 'STUDENT' ? (
                    <>
                      <div>
                        <p className="text-[10px] text-slate-400">အတန်း</p>
                        <p className="font-bold">{selectedLeave.Grade || '-'} {selectedLeave.Section || ''}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">အိပ်ဆောင်</p>
                        <p className="font-bold">{selectedLeave.Hostel || '-'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] text-slate-400">ရာထူး</p>
                        <p className="font-bold">{selectedLeave.Position || 'Staff'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">ဌာန</p>
                        <p className="font-bold">{selectedLeave.Department || '-'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              {(selectedLeave.Phone || selectedLeave.Email || selectedLeave.Reporter_Name || selectedLeave.Relationship) && (
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <h3 className="text-xs font-bold text-slate-400 mb-3">ဆက်သွယ်ရန် အချက်အလက်</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedLeave.Phone && (
                      <div>
                        <p className="text-[10px] text-slate-400">ဖုန်းနံပါတ်</p>
                        <p className="font-bold">{selectedLeave.Phone}</p>
                      </div>
                    )}
                    {selectedLeave.Email && (
                      <div>
                        <p className="text-[10px] text-slate-400">Email</p>
                        <p className="font-bold">{selectedLeave.Email}</p>
                      </div>
                    )}
                    {selectedLeave.Reporter_Name && (
                      <div>
                        <p className="text-[10px] text-slate-400">သတင်းပို့သူ</p>
                        <p className="font-bold">{selectedLeave.Reporter_Name}</p>
                      </div>
                    )}
                    {selectedLeave.Relationship && (
                      <div>
                        <p className="text-[10px] text-slate-400">ဆက်သွယ်ရာ</p>
                        <p className="font-bold">{selectedLeave.Relationship}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Leave Details */}
              <div className="bg-slate-50 p-4 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-400 mb-3">ခွင့်အချက်အလက်</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400">ခွင့်အမျိုးအစား</p>
                      <p className="font-bold">{selectedLeave.Leave_Type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">စုစုပေါင်းရက်</p>
                      <p className="font-bold">{selectedLeave.Total_Days || 1} ရက်</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">စတင်ရက်</p>
                      <p className="font-bold">{formatDateDisplay(selectedLeave.Start_Date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">ပြီးဆုံးရက်</p>
                      <p className="font-bold">{formatDateDisplay(selectedLeave.End_Date || selectedLeave.Start_Date)}</p>
                    </div>
                  </div>
                  
                  {/* Reason */}
                  <div>
                    <p className="text-[10px] text-slate-400">အကြောင်းပြချက်</p>
                    <p className="text-sm italic bg-white p-3 rounded-xl border border-slate-100 mt-1">
                      "{selectedLeave.Reason || '—'}"
                    </p>
                  </div>

                  {/* Remark (ခွင့်တင်စဉ် မှတ်ချက်) */}
                  {selectedLeave.Remark && selectedLeave.Remark !== '-' && selectedLeave.Remark !== '' && (
                    <div>
                      <p className="text-[10px] text-slate-400">မှတ်ချက်</p>
                      <p className="text-sm bg-amber-50 p-3 rounded-xl border border-amber-200 mt-1">
                        ✏️ {selectedLeave.Remark}
                      </p>
                    </div>
                  )}

                  {/* Attachment */}
                  {selectedLeave.Attachment_Link && selectedLeave.Attachment_Link !== '-' && (
                    <div>
                      <p className="text-[10px] text-slate-400">ပူးတွဲဖိုင်</p>
                      <a href={selectedLeave.Attachment_Link} target="_blank" rel="noopener noreferrer" 
                         className="inline-block mt-1 text-sm text-sky-600 underline break-all">
                        {selectedLeave.Attachment_Link}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => handleAction(selectedLeave, 'Approved')} 
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black text-sm uppercase shadow-md"
                >
                  ✓ Approve
                </button>
                <button 
                  onClick={() => handleAction(selectedLeave, 'Rejected')} 
                  className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-black text-sm uppercase shadow-md"
                >
                  ✗ Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pending.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-5xl mb-3">🥂</p>
          <p className="font-black text-slate-400 text-xl">All Caught Up!</p>
        </div>
      ) : (
        pending.map((l, i) => (
          <div 
            key={i} 
            className="bg-white p-4 rounded-2xl border-l-8 border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => viewDetails(l)}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-indigo-50 text-indigo-700 text-[8px] px-2 py-0.5 rounded-full font-black">{l.Category || 'Leave'}</span>
                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${l.User_Type === 'STUDENT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                  {l.User_Type}
                </span>
                <DurationBadge leave={l} />
              </div>
              <span className="text-[8px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{formatDateDisplay(l.Date_Applied)}</span>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                {l.User_Type === 'STUDENT' ? '🎓' : '👔'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-base uppercase truncate">{l.Name}</h3>
                <p className="text-[9px] text-slate-400">ID: {l.User_ID || '-'} · {l.Leave_Type}</p>
                {l.Phone && <p className="text-[9px] text-slate-400 mt-0.5">📞 {l.Phone}</p>}
                {/* Show remark preview if exists */}
                {l.Remark && l.Remark !== '-' && l.Remark !== '' && (
                  <p className="text-[9px] text-amber-600 mt-0.5 truncate">✏️ {l.Remark}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-800">{l.Total_Days || 1}d</p>
              </div>
            </div>

            {/* Reason Preview */}
            <div className="bg-slate-50 p-3 rounded-xl text-xs italic text-slate-600 mb-2 line-clamp-2">
              "{l.Reason || '—'}"
            </div>

            {/* Dates & Actions */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-[8px] text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-100">
                📅 {formatDateDisplay(l.Start_Date)}
                {l.End_Date && formatMMDate(l.End_Date) !== formatMMDate(l.Start_Date) ? ` – ${formatDateDisplay(l.End_Date)}` : ''}
              </p>
              <div className="flex gap-2">
                {l.Attachment_Link && l.Attachment_Link !== '-' && (
                  <a href={l.Attachment_Link} target="_blank" rel="noopener noreferrer" className="text-[8px] text-sky-500 underline">📎</a>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleAction(l, 'Approved'); }} 
                  className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[8px] font-black uppercase shadow-sm"
                >
                  ✓ Approve
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleAction(l, 'Rejected'); }} 
                  className="px-3 py-1 bg-rose-500 text-white rounded-full text-[8px] font-black uppercase shadow-sm"
                >
                  ✗ Decline
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}