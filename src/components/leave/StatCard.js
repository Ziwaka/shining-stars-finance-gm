export default function StatCard({ title, value, subtitle, icon, color, trend, onClick }) {
  return (
    <div 
      className={`bg-white rounded-2xl p-5 shadow-lg border border-slate-100 hover:shadow-xl transition-all ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`w-10 h-10 rounded-xl bg-${color}-100 flex items-center justify-center text-xl`}>
          {icon}
        </div>
        <span className={`text-${color}-600 text-xs font-black bg-${color}-50 px-2 py-1 rounded-lg`}>
          {trend}
        </span>
      </div>
      <h4 className="text-xs text-slate-500 font-black uppercase tracking-wider mb-1">{title}</h4>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}