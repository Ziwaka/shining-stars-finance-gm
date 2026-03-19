"use client";
import { useState } from 'react';
import { WEB_APP_URL } from '@/lib/api';

export default function PointAdjustmentForm({ originalRecord, staffName }) {
  const [newPoints, setNewPoints] = useState(originalRecord?.oldPoints || 0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [btnState, setBtnState] = useState('idle');

  // ✅ FIXED: Submit handler ထည့်ပြီးပြီ — Google Sheet သို့ သွင်းသည်
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (btnState !== 'idle' || !adjustmentReason.trim()) return;
    setBtnState('saving');

    const payload = [{
      Date: new Date().toISOString().split('T')[0],
      Student_ID: originalRecord?.studentId || '',
      Student_Name: originalRecord?.studentName || '',
      Original_Points: originalRecord?.oldPoints || 0,
      Adjusted_Points: newPoints,
      Change: Number(newPoints) - Number(originalRecord?.oldPoints || 0),
      Reason: adjustmentReason,
      Adjusted_By: staffName || 'Management',
    }];

    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'recordNote', sheetName: 'Points_Adjustments', data: payload })
      });
      const result = await res.json();

      if (result.success) {
        setBtnState('success');
        setTimeout(() => setBtnState('idle'), 2000);
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
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-indigo-600 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl">⚖️</div>
        <h3 className="text-xl font-black text-slate-900">Management Adjustment</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-slate-50 rounded-2xl border border-dashed">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Original Points</p>
          <p className="text-2xl font-black text-slate-400 line-through">{originalRecord?.oldPoints}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-indigo-600 uppercase">New Points (Adjusted)</p>
          <p className="text-2xl font-black text-indigo-600">{newPoints}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase ml-2">Adjust Points (+ or -)</label>
          <input
            type="number"
            value={newPoints}
            onChange={(e) => setNewPoints(e.target.value)}
            className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-xl font-bold focus:border-indigo-600 outline-none"
            placeholder="e.g. -10 for penalty"
          />
          <p className="text-[10px] text-slate-400 ml-2 italic">* အမှတ်လျှော့ချင်ပါက ( - ) သင်္ကေတ ထည့်ရိုက်ပါ (ဥပမာ - -5)</p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase ml-2">Reason for Adjustment / Penalty</label>
          <textarea
            rows="3"
            required
            placeholder="Why are you changing these points? (e.g. Disciplinary action / Typing error)"
            value={adjustmentReason}
            className="w-full px-6 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-400"
            onChange={(e) => setAdjustmentReason(e.target.value)}
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={btnState !== 'idle' || !adjustmentReason.trim()}
          className={`w-full py-5 rounded-[1.5rem] font-black shadow-lg transition-all active:scale-95
            ${btnState === 'idle' && adjustmentReason.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''}
            ${btnState === 'idle' && !adjustmentReason.trim() ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : ''}
            ${btnState === 'saving' ? 'bg-amber-400 text-slate-900 cursor-not-allowed' : ''}
            ${btnState === 'success' ? 'bg-emerald-500 text-white cursor-not-allowed' : ''}
            ${btnState === 'error' ? 'bg-red-500 text-white cursor-not-allowed' : ''}
          `}
        >
          {btnState === 'idle' && 'CONFIRM ADJUSTMENT'}
          {btnState === 'saving' && '⏳ SAVING...'}
          {btnState === 'success' && '✓ ADJUSTMENT RECORDED'}
          {btnState === 'error' && '✕ ERROR — TRY AGAIN'}
        </button>
      </form>
    </div>
  );
}
