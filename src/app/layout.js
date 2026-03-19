"use client";
import "./globals.css";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }) {
  const [user, setUser] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    const savedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (savedUser && savedUser !== "undefined") {
      try { setUser(JSON.parse(savedUser)); } catch (e) { console.error(e); }
    }
  }, [pathname]);

  // ဒီ pages တွေမှာ root nav bar မပြဘဲ ကိုယ်ပိုင် layout သုံးမည်
  const isFullScreen = pathname === '/' 
    || pathname.startsWith('/login') 
    || pathname.startsWith('/public-zone')
    || pathname.startsWith('/management')  // Management zone — ကိုယ်ပိုင် header ရှိသည်
    || pathname.startsWith('/staff')       // Staff zone — ကိုယ်ပိုင် header ရှိသည်
    || pathname.startsWith('/student');    // Student zone — ကိုယ်ပိုင် header ရှိသည်

  return (
    <html lang="en">
      <head>
        <title>Shining Stars</title>
        <meta name="application-name" content="Shining Stars" />
        <meta name="apple-mobile-web-app-title" content="Shining Stars" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" href="/logo.png" />
      </head>

      <body className="antialiased bg-slate-50 text-slate-950 font-black">

        {/* Root nav — login/public/landing pages တွေကိုသာ ပြမည် */}
        {!isFullScreen && user && (
          <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b-4 border-indigo-900 px-8 py-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-black text-indigo-900 text-xl tracking-tighter">
                SHINING STARS <span className="text-amber-500">★</span>
              </Link>
              <Link href="/" className="text-[10px] font-black text-indigo-900 hover:text-amber-500 uppercase tracking-widest italic transition-colors">HOME</Link>
            </div>
            <button
              onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.href = "/login"; }}
              className="bg-indigo-900 text-white px-6 py-2 rounded-xl text-[10px] font-black hover:bg-rose-600 transition shadow-xl active:scale-95"
            >
              LOGOUT
            </button>
          </nav>
        )}

        <div className={!isFullScreen && user ? "pt-24" : ""}>
          {children}
        </div>


      </body>
    </html>
  );
}