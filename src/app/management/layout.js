"use client";
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function MgtUniversalLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    if (!auth || auth.userRole !== 'management') {
      router.push('/login');
    } else {
      setUser(auth);
    }
  }, [router]);

  const navItems = [
    { name:'Dashboard',   path:'/management/mgt-dashboard', icon:'📊' },
    { name:'Leave Hub',   path:'/management/leave',         icon:'📄' },
    { name:'Calendar',    path:'/management/calendar',      icon:'📅' },
    { name:'Performance', path:'/management/performance',   icon:'🏆' },
    { name:'Analytics',   path:'/management/analytic',      icon:'📈' },
    { name:'Registry',    path:'/management/registry',      icon:'🗂️' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    router.push('/login');
  };

  if (!user) return null;

  const displayName = user?.Name || user?.name || user?.username
                   || user?.['Name (ALL CAPITAL)'] || 'Admin';

  return (
    <div style={{
      height:'100dvh', display:'flex', flexDirection:'column',
      overflow:'hidden',
      /* ── Dark navy — clearly distinct from student lavender ── */
      background:'#0F0E1A',
      color:'#E2E2F0', fontFamily:'system-ui,sans-serif',
    }}>

      {/* ── Header: deep navy + lavender accent stripe ── */}
      <header style={{
        flexShrink:0, zIndex:100,
        background:'#1A1830',
        borderBottom:'3px solid #9E9ECA',
        padding:'10px 16px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        boxShadow:'0 3px 20px rgba(0,0,0,0.40)',
      }}>
        <Link href="/management/mgt-dashboard"
          style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }}>
          <div style={{
            width:'36px', height:'36px',
            background:'linear-gradient(135deg,#9E9ECA,#6B6BA8)',
            borderRadius:'10px', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:'20px', flexShrink:0,
            boxShadow:'0 2px 10px rgba(158,158,202,0.40)',
          }}>🌟</div>
          <div style={{ lineHeight:1 }}>
            <p style={{ color:'#E2E2F0', fontSize:'13px', fontWeight:800, margin:0,
                        letterSpacing:'0.04em' }}>
              SSMT
            </p>
            <p style={{ color:'#9E9ECA', fontSize:'8px', margin:'2px 0 0',
                        textTransform:'uppercase', letterSpacing:'0.25em', fontWeight:700 }}>
              Management Hub
            </p>
          </div>
        </Link>

        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', lineHeight:1 }}>
            <span style={{ fontSize:'8px', color:'rgba(226,226,240,0.35)',
                           textTransform:'uppercase', letterSpacing:'0.1em' }}>
              Logged in
            </span>
            <span style={{ fontSize:'11px', color:'#9E9ECA', fontWeight:800, marginTop:'2px' }}>
              {displayName}
            </span>
          </div>
          <button onClick={handleLogout} style={{
            padding:'7px 13px',
            background:'rgba(158,158,202,0.12)',
            border:'1px solid rgba(158,158,202,0.30)',
            color:'#9E9ECA', fontSize:'9px', fontWeight:700,
            textTransform:'uppercase', letterSpacing:'0.06em',
            borderRadius:'10px', cursor:'pointer',
            transition:'background 0.15s',
          }}>
            Logout ⏻
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {children}
      </main>

      {/* ── Bottom Nav: dark with lavender accents ── */}
      <nav style={{
        flexShrink:0,
        background:'#1A1830',
        borderTop:'3px solid #9E9ECA',
        display:'flex', justifyContent:'space-around', alignItems:'center',
        padding:'6px 0 10px', zIndex:110,
        boxShadow:'0 -4px 24px rgba(0,0,0,0.35)',
      }}>
        {navItems.map(item => {
          const isActive = pathname === item.path
            || (item.path !== '/management/mgt-dashboard' && pathname.startsWith(item.path));
          return (
            <Link key={item.path} href={item.path} style={{
              textDecoration:'none', display:'flex', flexDirection:'column',
              alignItems:'center', gap:'3px', padding:'4px 6px',
              opacity: isActive ? 1 : 0.40,
              transform: isActive ? 'translateY(-2px)' : 'none',
              transition:'all 0.15s',
            }}>
              <span style={{ fontSize:'20px',
                filter: isActive ? 'drop-shadow(0 0 6px rgba(158,158,202,0.6))' : 'grayscale(0.6)' }}>
                {item.icon}
              </span>
              <span style={{
                fontSize:'7px', textTransform:'uppercase', letterSpacing:'0.06em',
                fontWeight:800, color: isActive ? '#9E9ECA' : '#6B6BA8',
              }}>
                {item.name}
              </span>
              {isActive && (
                <div style={{
                  width:'20px', height:'2.5px',
                  background:'#9E9ECA', borderRadius:'99px',
                  boxShadow:'0 0 8px rgba(158,158,202,0.5)',
                }}/>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}