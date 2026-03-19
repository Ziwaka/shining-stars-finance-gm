"use client";
import { useState } from 'react';

export default function CompactWatchlistFilter({ tabs, activeId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const activeTab = tabs.find(t => t.id === activeId) || tabs[0];

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
      >
        <span>👁️</span>
        <span>{activeTab.label}</span>
        <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full">
          {activeTab.count || 0}
        </span>
        <span className="text-slate-400 ml-1">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                onSelect(tab.id);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm font-black flex items-center justify-between hover:bg-slate-50 transition-colors ${
                tab.id === activeId ? 'bg-amber-50 text-amber-700' : 'text-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab.id === activeId ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}