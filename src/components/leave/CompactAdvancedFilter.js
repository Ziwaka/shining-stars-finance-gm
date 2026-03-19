"use client";
import { useState } from 'react';

const LEAVE_DEFAULTS = ['Casual Leave', 'Medical Leave', 'Emergency Leave', 'Personal Leave', 'Sick Leave', 'Funeral', 'Personal Affair'];

export default function CompactAdvancedFilter({ filters, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => 
    value && value !== 'ALL' && value !== '' && key !== 'sortBy' && key !== 'sortOrder'
  ).length;

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
      >
        <span>🔍</span>
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
        <span className="text-slate-400 ml-1">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[700px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 z-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-black text-slate-900">Advanced Filters</h4>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* User Type */}
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">User Type</label>
              <select
                value={filters.userType}
                onChange={(e) => handleChange('userType', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <option value="ALL">All</option>
                <option value="STUDENT">Students</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>

            {/* Min Days */}
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Min Days</label>
              <input
                type="number"
                min="0"
                value={filters.minDays}
                onChange={(e) => handleChange('minDays', e.target.value)}
                placeholder="Any"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              />
            </div>

            {/* Max Days */}
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Max Days</label>
              <input
                type="number"
                min="0"
                value={filters.maxDays}
                onChange={(e) => handleChange('maxDays', e.target.value)}
                placeholder="Any"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              />
            </div>

            {/* Min Consecutive */}
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Min Consec</label>
              <input
                type="number"
                min="1"
                value={filters.minConsecutive}
                onChange={(e) => handleChange('minConsecutive', e.target.value)}
                placeholder="Any"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              />
            </div>

            {/* Time Period */}
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Time Period</label>
              <select
                value={filters.timePeriod}
                onChange={(e) => handleChange('timePeriod', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <option value="ALL">All Time</option>
                <option value="WEEK">Last 7 Days</option>
                <option value="MONTH">Last 30 Days</option>
                <option value="QUARTER">Last 90 Days</option>
                <option value="YEAR">Last Year</option>
              </select>
            </div>

            {/* Leave Type */}
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Leave Type</label>
              <select
                value={filters.leaveType}
                onChange={(e) => handleChange('leaveType', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <option value="ALL">All Types</option>
                {LEAVE_DEFAULTS.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleChange('sortBy', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <option value="totalDays">Total Days</option>
                <option value="consecutiveDays">Consecutive Days</option>
                <option value="grade">Grade / ID</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>

            {/* Order */}
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleChange('sortOrder', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              >
                <option value="desc">Highest First</option>
                <option value="asc">Lowest First</option>
              </select>
            </div>
          </div>

          {/* Active Filter Tags */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
              {Object.entries(filters).map(([key, value]) => {
                if (value && value !== 'ALL' && value !== '' && key !== 'sortBy' && key !== 'sortOrder') {
                  return (
                    <span key={key} className="bg-amber-50 text-amber-700 text-[8px] px-2 py-1 rounded-full font-black uppercase">
                      {key}: {value}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}