"use client";
import { useState } from 'react';
import { WEB_APP_URL } from '@/lib/api';

export default function LeaveEntryForm({ userRole, staffName }) {
  const [formData, setFormData] = useState({
    studentId: '',
    leaveType: 'Sick Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [btnState, setBtnState] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (btnState !== 'idle') return;
    setBtnState('saving');

    const payload = [{
      Date: new Date().toISOString().split('T')[0],
      Student_ID: formData.studentId,
      Leave_Type: formData.leaveType,
      Start_Date: formData.startDate,
      End_Date: formData.endDate,
      Reason: formData.reason,
      Recorded_By: staffName || '',
      Role: userRole || '',
      Status: 'Pending'
    }];

    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'recordNote', sheetName: 'Leave_Records', data: payload })
      });
      const result = await res.json();

      if (result.success) {
        setBtnState('success');
        setTimeout(() => {
          setBtnState('idle');
          setFormData({ studentId: '', leaveType: 'Sick Leave', startDate: '', endDate: '', reason: '' });
        }, 2000);
      } else {
        setBtnState('error');
        setTimeout(() => setBtnState('idle'), 2000);
      }
    } catch (err) {
      setBtnState('error');
      setTimeout(() => setBtnState('idle'), 2000);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-2xl">📝</div>
        <div>
          <h3 className="text-xl font-black text-slate-800">New Leave Record</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Entry by: {staffName} ({userRole})</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase ml-2">Student ID</label>
          <input
            type="text"
            placeholder="e.g. SS-001"
            required
            value={formData.studentId}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition"
            onChange={(e) => setFormData({...formData, studentId: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-2">Leave Type</label>
            <select
              value={formData.leaveType}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition appearance-none"
              onChange={(e) => setFormData({...formData, leaveType: e.target.value})}
            >
              <option>Sick Leave</option>
              <option>Funeral (နာရေး)</option>
              <option>Personal Affair (ကိစ္စရှိ၍)</option>
              <option>Home Visit (အိမ်ပြန်)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-2">Duration (Days)</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                required
                value={formData.startDate}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm"
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              />
              <span className="text-slate-300">to</span>
              <input
                type="date"
                required
                value={formData.endDate}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm"
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase ml-2">Reason / Remark</label>
          <textarea
            rows="3"
            placeholder="Enter detailed reason here..."
            value={formData.reason}
            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition"
            onChange={(e) => setFormData({...formData, reason: e.target.value})}
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={btnState !== 'idle'}
          className={`w-full py-5 rounded-[1.5rem] font-black shadow-lg transition-all active:scale-95
            ${btnState === 'idle' ? 'bg-slate-900 text-white hover:bg-rose-600' : ''}
            ${btnState === 'saving' ? 'bg-amber-400 text-slate-900 cursor-not-allowed' : ''}
            ${btnState === 'success' ? 'bg-emerald-500 text-white cursor-not-allowed' : ''}
            ${btnState === 'error' ? 'bg-red-500 text-white cursor-not-allowed' : ''}
          `}
        >
          {btnState === 'idle' && 'SAVE RECORD'}
          {btnState === 'saving' && '⏳ SAVING...'}
          {btnState === 'success' && '✓ SAVED TO SHEET'}
          {btnState === 'error' && '✕ ERROR — TRY AGAIN'}
        </button>
      </form>
    </div>
  );
}
