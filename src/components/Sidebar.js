"use client";
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  // ✅ Logout function — FIXED: "token" မဟုတ်ဘဲ "user" key ဖျက်ရမည်
  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  // ✅ FIXED: Paths တွေ project structure နဲ့ ကိုက်ညီအောင် ပြင်ထားသည်
  const menuItems = [
    { name: 'Staff Home', path: '/staff', icon: '🏠' },
    { name: 'My Profile', path: '/staff/profile', icon: '👤' },
    { name: 'Leave Hub', path: '/staff/leave', icon: '🗓️' },
    { name: 'Staff Directory', path: '/staff/staff-dir', icon: '👔' },
    { name: 'Student Directory', path: '/staff/student-dir', icon: '🎓' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-black text-[#020617] selection:bg-[#fbbf24]">
      {/* SIDEBAR */}
      <aside className="w-80 bg-[#1E3A8A] text-white flex flex-col sticky top-0 h-screen shadow-2xl border-r-8 border-[#020617] z-50">
        
        {/* Logo */}
        <div className="p-12 border-b-4 border-white/10 flex flex-col items-center gap-4">
          <div className="bg-white p-6 rounded-[2rem] shadow-2xl rotate-3">
             <span className="text-4xl text-[#1E3A8A]">⭐</span>
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-center mt-4">
            SHINING STARS
          </h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-8 space-y-6 mt-10">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-6 px-8 py-5 rounded-[2.5rem] font-black uppercase text-xs tracking-widest transition-all duration-300 ${
                pathname === item.path 
                ? 'bg-white text-[#1E3A8A] shadow-[0_20px_50px_rgba(0,0,0,0.2)] scale-105' 
                : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            >
              <span className="text-lg">{item.icon}</span> {item.name}
            </button>
          ))}
        </nav>

        {/* ✅ Logout Button */}
        <div className="p-8 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-6 px-8 py-5 rounded-[2.5rem] font-black uppercase text-xs tracking-widest transition-all duration-300 hover:bg-white/10 text-white/70 hover:text-white"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative border-l-4 border-slate-200">
        {children}
      </main>
    </div>
  );
}
