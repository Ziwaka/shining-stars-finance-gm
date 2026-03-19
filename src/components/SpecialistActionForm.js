"use client";
import { useState } from 'react';

export default function SpecialistActionForm({ staffRole }) {
  const [pointMode, setPointMode] = useState('reward'); // 'reward' or 'penalty'
  const [points, setPoints] = useState(10);
  const [studentId, setStudentId] = useState('');

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-t-8 border-amber-400 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl">🏆</div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Point Entry</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{staffRole} Department</p>
          </div>
        </div>
        
        {/* တိုးမလား/လျှော့မလား ရွေးသည့် Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setPointMode('reward')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition ${pointMode === 'reward' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400'}`}
          >
            REWARD (+)
          </button>
          <button 
            onClick={() => setPointMode('penalty')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition ${pointMode === 'penalty' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400'}`}
          >
            PENALTY (-)
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase ml-2">Student ID</label>
            <input type="text" placeholder="e.g. SS-001" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase ml-2">Point Amount</label>
            <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border-2 ${pointMode === 'reward' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <span className={`text-2xl font-black ${pointMode === 'reward' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {pointMode === 'reward' ? '+' : '-'}{points}
              </span>
              <input 
                type="range" min="1" max="50" step="1" value={points}
                onChange={(e) => setPoints(e.target.value)}
                className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${pointMode === 'reward' ? 'accent-emerald-500 bg-emerald-200' : 'accent-rose-500 bg-rose-200'}`}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase ml-2">Reason</label>
          <textarea rows="2" placeholder={pointMode === 'reward' ? "စာကြည့်တိုက်တွင် ကူညီပေးခြင်း..." : "စည်းကမ်းဖောက်ဖျက်ခြင်း..."} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"></textarea>
        </div>

        <button className={`w-full py-5 rounded-[1.5rem] font-black shadow-lg active:scale-95 transition-all text-white ${pointMode === 'reward' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
          {pointMode === 'reward' ? 'GIVE REWARD POINTS' : 'APPLY PENALTY POINTS'}
        </button>
      </div>
    </div>
  );
}