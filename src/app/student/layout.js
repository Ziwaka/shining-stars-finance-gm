"use client";
import { useRouter, usePathname } from 'next/navigation';

export default function StudentMasterLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();

  const nav = [
    { icon:'🏫', label:'School',     path:'/student/school-dashboard' },
    { icon:'👤', label:'Profile',    path:'/student/profile' },
    { icon:'⭐', label:'Record',     path:'/student/my-performance' },
    { icon:'🔍', label:'Lost+Found', path:'/student/lost-found' },
  ];

  const logout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div style={{
      height:'100dvh', display:'flex', flexDirection:'column',
      overflow:'hidden', background:'#CBCBE5',
      color:'#1E1B4B', fontFamily:'system-ui,sans-serif',
    }}>

      {/* ── Header: soft white card feel ── */}
      <header style={{
        flexShrink:0, zIndex:100,
        background:'rgba(255,255,255,0.80)',
        backdropFilter:'blur(12px)',
        borderBottom:'2px solid rgba(158,158,202,0.30)',
        padding:'10px 16px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        boxShadow:'0 2px 12px rgba(158,158,202,0.18)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}
          onClick={() => router.push('/student')}>
          <div style={{
            width:'36px', height:'36px',
            background:'linear-gradient(135deg,#CBCBE5,#9E9ECA)',
            borderRadius:'10px', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:'20px', flexShrink:0,
            boxShadow:'0 2px 8px rgba(158,158,202,0.35)',
          }}>🎓</div>
          <div>
            <p style={{ fontWeight:800, fontSize:'13px', color:'#1E1B4B',
                        margin:0, letterSpacing:'0.04em' }}>
              Shining Stars - Ma Thwe
            </p>
            <p style={{ fontSize:'8px', color:'#9E9ECA', margin:0,
                        textTransform:'uppercase', letterSpacing:'0.18em', fontWeight:700 }}>
              Student Portal
            </p>
          </div>
        </div>

        <button onClick={logout} style={{
          background:'rgba(158,158,202,0.15)',
          border:'1px solid rgba(158,158,202,0.35)',
          borderRadius:'10px', padding:'6px 12px',
          color:'#6B6BA8', fontSize:'10px', fontWeight:700,
          cursor:'pointer', letterSpacing:'0.05em',
        }}>
          Logout ⏻
        </button>
      </header>

      {/* ── Main ── */}
      <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {children}
      </main>

      {/* ── Bottom Nav: frosted white, high-contrast icons ── */}
      <nav style={{
        flexShrink:0,
        background:'rgba(255,255,255,0.92)',
        backdropFilter:'blur(16px)',
        borderTop:'2px solid rgba(158,158,202,0.28)',
        display:'flex', justifyContent:'space-around', alignItems:'center',
        padding:'8px 0 12px', zIndex:110,
        boxShadow:'0 -3px 20px rgba(107,107,168,0.15)',
      }}>
        {nav.map(item => {
          const active = pathname === item.path;
          return (
            <button key={item.path} onClick={() => router.push(item.path)}
              style={{
                background:'none', border:'none', cursor:'pointer',
                display:'flex', flexDirection:'column', alignItems:'center',
                gap:'4px', padding:'4px 14px',
                transition:'all 0.15s',
              }}>
              {/* Icon bubble — active gets filled lavender bg */}
              <div style={{
                width:'42px', height:'34px',
                background: active ? 'linear-gradient(135deg,#9E9ECA,#6B6BA8)' : 'transparent',
                borderRadius:'12px',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'background 0.15s',
                boxShadow: active ? '0 3px 10px rgba(107,107,168,0.30)' : 'none',
              }}>
                <span style={{
                  fontSize:'20px',
                  filter: active ? 'brightness(1.3)' : 'none',
                  opacity: active ? 1 : 0.55,
                }}>
                  {item.icon}
                </span>
              </div>
              <span style={{
                fontSize:'8px', fontWeight:800, textTransform:'uppercase',
                letterSpacing:'0.07em',
                color: active ? '#4C4A8E' : '#9E9ECA',
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}