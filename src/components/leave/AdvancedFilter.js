const LEAVE_DEFAULTS = ['Casual Leave','Medical Leave','Emergency Leave','Personal Leave', 'Sick Leave', 'Funeral', 'Personal Affair'];

export default function AdvancedFilter({ filters, onFilterChange }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg space-y-4">
      <div className="flex items-center gap-2 text-slate-600 font-black text-sm uppercase tracking-wider">
        <span>🔍</span> Advanced Filters
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">User Type</label>
          <select 
            value={filters.userType} 
            onChange={(e) => handleChange('userType', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="ALL">All</option>
            <option value="STUDENT">Students</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Min Total Days</label>
          <input 
            type="number" 
            min="0"
            value={filters.minDays} 
            onChange={(e) => handleChange('minDays', e.target.value)}
            placeholder="e.g., 3"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Total Days</label>
          <input 
            type="number" 
            min="0"
            value={filters.maxDays} 
            onChange={(e) => handleChange('maxDays', e.target.value)}
            placeholder="e.g., 10"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Min Consecutive Days</label>
          <input 
            type="number" 
            min="1"
            value={filters.minConsecutive} 
            onChange={(e) => handleChange('minConsecutive', e.target.value)}
            placeholder="e.g., 3"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Time Period</label>
          <select 
            value={filters.timePeriod} 
            onChange={(e) => handleChange('timePeriod', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="ALL">All Time</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">Last 30 Days</option>
            <option value="QUARTER">Last 90 Days</option>
            <option value="YEAR">Last Year</option>
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Leave Type</label>
          <select 
            value={filters.leaveType} 
            onChange={(e) => handleChange('leaveType', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="ALL">All Types</option>
            {LEAVE_DEFAULTS.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Sort By</label>
          <select 
            value={filters.sortBy} 
            onChange={(e) => handleChange('sortBy', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="totalDays">Total Days</option>
            <option value="consecutiveDays">Consecutive Days</option>
            <option value="grade">Grade / ID</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>

        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Order</label>
          <select 
            value={filters.sortOrder} 
            onChange={(e) => handleChange('sortOrder', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="desc">Highest First</option>
            <option value="asc">Lowest First</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {Object.entries(filters).map(([key, value]) => {
          if (value && value !== 'ALL' && value !== '' && key !== 'sortBy' && key !== 'sortOrder') {
            return (
              <span key={key} className="bg-amber-50 text-amber-700 text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-wider border border-amber-200">
                {key}: {value}
              </span>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}