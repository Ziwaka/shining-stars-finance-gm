"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

export default function LeaveLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || "null");
    if (!auth || auth.userRole !== 'management') { 
      router.push('/login'); 
      return; 
    }
    setUser(auth);
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getInitialData' })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const count = (data.leaves || []).filter(l => l.Status === 'Pending').length;
        setPendingCount(count);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'approval', label: 'Review', path: '/management/leave/approval', badge: pendingCount },
    { id: 'submit', label: 'Submit', path: '/management/leave/submit' },
    { id: 'analysis', label: 'Insights', path: '/management/leave/analysis' },
    { id: 'history', label: 'History', path: '/management/leave/history' }
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F0F9FF]">
        <div className="text-4xl text-amber-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#F0F9FF] font-black text-slate-950 h-screen flex flex-col overflow-hidden">
      <div className="max-w-[1400px] mx-auto w-full px-3 md:px-6 py-3 md:py-4 flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Header - Smaller */}
        <div className="bg-slate-950 rounded-[2rem] p-4 md:p-5 border-b-[8px] border-[#fbbf24] shadow-xl flex flex-col md:flex-row items-center justify-between gap-2 relative overflow-hidden mb-3 flex-shrink-0">
          <div className="absolute right-0 top-0 w-60 h-60 bg-[#fbbf24]/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"/>
          <div className="z-10 text-center md:text-left">
            <p className="text-[#fbbf24] text-[7px] md:text-[8px] uppercase tracking-[0.5em] font-black mb-1">Management Hub</p>
            <h1 className="text-2xl md:text-3xl italic uppercase font-black text-white tracking-tighter leading-tight">Leave</h1>
          </div>
          <button 
            onClick={fetchPendingCount} 
            className="bg-[#fbbf24] rounded-xl px-3 py-2 text-slate-950 text-base hover:scale-105 active:scale-95 transition-all shadow-lg font-bold flex-shrink-0"
          >
            ↻
          </button>
        </div>

        {/* Tabs - Smaller */}
        <div className="bg-white p-1.5 rounded-[1.5rem] shadow-lg border border-slate-100 mb-3 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            {tabs.map(tab => (
              <Link 
                key={tab.id} 
                href={tab.path}
                className={`py-2 px-3 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all flex items-center justify-center gap-1 whitespace-nowrap text-center
                  ${pathname === tab.path ? 'bg-slate-950 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className={`text-[7px] px-1 py-0.5 rounded-md font-black ${pathname === tab.path ? 'bg-[#fbbf24] text-slate-950' : 'bg-slate-200 text-slate-600'}`}>
                    {tab.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Page Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-[1.5rem] p-4 shadow-lg">
          {children}
        </div>

        {/* Footer - Smaller */}
        <div className="mt-2 text-center flex-shrink-0">
          <p className="text-[7px] md:text-[8px] font-black text-slate-300 uppercase tracking-[0.6em]">Shining Stars Academy</p>
        </div>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        html, body { overflow: hidden; height: 100%; margin: 0; padding: 0; }
        .overflow-y-auto { overflow-y: auto !important; -webkit-overflow-scrolling: touch; }
      `}</style>
    </div>
  );
}