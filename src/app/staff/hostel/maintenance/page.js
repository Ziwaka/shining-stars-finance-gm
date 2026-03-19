"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const styles = {
  page: { display:'flex', flexDirection:'column', minHeight:'100dvh', background:'#0f0a1e', color:'#fff', fontFamily:'system-ui,sans-serif' },
  header: { background:'rgba(15,10,30,0.97)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  card: { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'20px' },
  input: { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'12px 16px', color:'#fff', fontSize:'14px', outline:'none', boxSizing:'border-box' },
  label: { display:'block', fontSize:'10px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' },
  btn: { background:'#fbbf24', color:'#0f172a', border:'none', borderRadius:'14px', padding:'14px', fontSize:'14px', fontWeight:900, width:'100%', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' }
};

const ISSUE_TYPES = ['Water Leak', 'Electricity', 'Plumbing', 'Furniture', 'Cleaning', 'Other'];

export default function MaintenancePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    type: 'Water Leak',
    location: '',
    description: '',
    urgent: false
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    setUser(JSON.parse(saved));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would send data to backend (e.g., action: 'submitMaintenanceRequest')
    console.log('Maintenance request:', form);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setForm({ type: 'Water Leak', location: '', description: '', urgent: false });
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', fontSize:'16px', cursor:'pointer' }}>← Back</button>
        <h2 style={{ fontSize:'16px', fontWeight:900, textTransform:'uppercase', margin:0 }}>🛠️ Maintenance</h2>
        <div style={{ width:'24px' }} />
      </div>

      <div style={{ padding:'20px' }}>
        <div style={styles.card}>
          <p style={{ fontWeight:900, fontSize:'14px', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'20px' }}>Report a Maintenance Issue</p>

          {submitted && (
            <div style={{ background:'rgba(52,211,153,0.2)', border:'1px solid rgba(52,211,153,0.3)', borderRadius:'12px', padding:'12px', marginBottom:'20px', color:'#34d399' }}>
              ✅ Request submitted successfully!
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:'16px' }}>
              <label style={styles.label}>Issue Type *</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} style={styles.input}>
                {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:'16px' }}>
              <label style={styles.label}>Location *</label>
              <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="e.g. Boys Hostel, Room 203" required style={styles.input} />
            </div>

            <div style={{ marginBottom:'16px' }}>
              <label style={styles.label}>Description *</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the issue..." required rows="4" style={{...styles.input, resize:'vertical'}} />
            </div>

            <div style={{ marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px' }}>
              <input type="checkbox" id="urgent" checked={form.urgent} onChange={e => setForm({...form, urgent: e.target.checked})} style={{ width:'18px', height:'18px' }} />
              <label htmlFor="urgent" style={{ fontSize:'13px', color:'rgba(255,255,255,0.8)' }}>Urgent (requires immediate attention)</label>
            </div>

            <button type="submit" style={styles.btn}>Submit Request</button>
          </form>

          <div style={{ marginTop:'30px', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'20px' }}>
            <p style={{ fontWeight:900, fontSize:'12px', marginBottom:'10px' }}>📋 Recent Requests (demo)</p>
            <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>No requests yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}