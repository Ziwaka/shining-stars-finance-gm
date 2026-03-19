import DurationBadge from './DurationBadge';
import { formatDateDisplay } from './DateHelpers';

export default function UserDetailModal({ user, onClose }) {
  if (!user) return null;

  // Ensure reasons array exists
  const reasons = user.reasons || [];
  const stats = user.stats || {};

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-[2.5rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs px-3 py-1.5 rounded-full font-black ${user.type === 'STUDENT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                {user.type}
              </span>
              <span className="text-xs bg-slate-100 px-3 py-1.5 rounded-full font-black text-slate-600">ID: {user.id}</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{user.name}</h2>
            {user.grade && (
              <p className="text-sm text-slate-500 mt-2 font-bold">Grade {user.grade} {user.section && `· Section ${user.section}`}</p>
            )}
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-500 transition-all text-xl font-black">✕</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-xl text-center">
            <p className="text-3xl font-black text-amber-600">{user.totalDays || 0}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase mt-1">Total Days</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-center">
            <p className="text-3xl font-black text-rose-600">{user.consecutiveMax || 0}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase mt-1">Max Consecutive</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-center">
            <p className="text-3xl font-black text-emerald-600">{user.weekCount || 0}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase mt-1">This Week</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-center">
            <p className="text-3xl font-black text-purple-600">{user.monthCount || 0}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase mt-1">This Month</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <span>📋</span> Complete Leave History ({reasons.length})
          </h3>
          
          {reasons.length === 0 ? (
            <p className="text-center text-slate-400 italic py-8">No leave history found.</p>
          ) : (
            reasons.map((r, i) => (
              <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[9px] px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 font-black">{r.type}</span>
                    <DurationBadge leave={r} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-black">{formatDateDisplay(r.start)} {r.end !== r.start && `→ ${formatDateDisplay(r.end)}`}</span>
                </div>
                <p className="text-sm text-slate-600 italic leading-relaxed">"{r.text}"</p>
                {r.attachment && r.attachment !== '-' && (
                  <a href={r.attachment} target="_blank" className="text-[10px] text-sky-500 underline font-black mt-3 inline-block">📎 View Attachment</a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}