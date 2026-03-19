import { formatDateDisplay } from './DateHelpers';

export default function GradeBreakdown({ data, title, onPrint, onViewDetails }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-black text-slate-900">{title}</h3>
        <button 
          onClick={onPrint}
          className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 transition-all"
        >
          🖨️ Print
        </button>
      </div>
      <div className="space-y-4">
        {Object.entries(data).map(([grade, users]) => (
          <div key={grade} className="border-b border-slate-100 pb-3 last:border-0">
            <div className="flex justify-between items-center mb-2">
              <span className="font-black text-amber-600">{grade === 'undefined' ? 'No Grade' : `Grade ${grade}`}</span>
              <span className="text-sm bg-slate-100 px-3 py-1 rounded-full font-black">{users.length} ဦး</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {users.slice(0, 5).map((u, i) => (
                <div 
                  key={i} 
                  className="text-xs bg-slate-50 p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
                  onClick={() => onViewDetails && onViewDetails(u)}
                >
                  <p className="font-black truncate">{u.name}</p>
                  <p className="text-[8px] text-slate-400">{u.totalDays || 0} days</p>
                </div>
              ))}
              {users.length > 5 && (
                <div className="text-xs text-slate-400 flex items-center justify-center">
                  +{users.length - 5} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}