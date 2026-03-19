"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api-service';

export default function ManageSeasonalRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [applyToAll, setApplyToAll] = useState(true);
  const [overrideDays, setOverrideDays] = useState('{"Saturday":"open","Sunday":"closed"}');

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await apiService.getSeasonalRules();
      if (res.success) setRules(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;
    await apiService.saveSeasonalRule({
      Name: name,
      StartDate: startDate,
      EndDate: endDate,
      ApplyToAll: applyToAll,
      OverrideDays: overrideDays,
      Created_By: 'management',
    });
    // Reset
    setName('');
    setStartDate('');
    setEndDate('');
    setApplyToAll(true);
    setOverrideDays('{"Saturday":"open","Sunday":"closed"}');
    loadRules();
  };

  const handleDelete = async (name) => {
    if (confirm('ဖျက်မှာသေချာပါသလား?')) {
      await apiService.deleteSeasonalRule(name);
      loadRules();
    }
  };

  const containerStyle = {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
    background: '#f8fafc',
    minHeight: '100vh',
  };

  const formStyle = {
    background: '#fff',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
  };

  return (
    <div style={containerStyle}>
      <button onClick={() => router.back()} style={{ marginBottom: '20px', padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        ← နောက်သို့
      </button>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>ရာသီအလိုက် စည်းမျဉ်းများ (Seasonal Rules)</h1>

      {/* Add/Edit Form */}
      <div style={formStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>အသစ်ထည့်ရန်</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>အမည်</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ဥပမာ ဝါတွင်းကာလ" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>စတင်ရက်</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>ပြီးဆုံးရက်</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
              <input type="checkbox" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} /> အတန်းအားလုံးအတွက် သက်ရောက်စေမည်
            </label>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>ရက်သတ္တပတ်အလိုက် သတ်မှတ်ချက် (JSON)</label>
            <input type="text" value={overrideDays} onChange={(e) => setOverrideDays(e.target.value)} placeholder='{"Saturday":"open","Sunday":"closed"}' style={inputStyle} />
            <p style={{ fontSize: '12px', color: '#64748b' }}>ရက်သတ္တပတ်၏ အမည်များ (Sunday,Monday,etc) နဲ့ "open" သို့မဟုတ် "closed" တန်ဖိုးများ ထည့်ပါ။</p>
          </div>
          <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            သိမ်းဆည်းမည်
          </button>
        </form>
      </div>

      {/* List */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>ရှိပြီးသား စည်းမျဉ်းများ</h2>
        {loading ? (
          <p>Loading...</p>
        ) : rules.length === 0 ? (
          <p>စည်းမျဉ်း မရှိသေး</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>အမည်</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>စတင်ရက်</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>ပြီးဆုံးရက်</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>အားလုံးအတွက်</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>သတ်မှတ်ချက်</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>လုပ်ဆောင်ချက်</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>{rule.Name}</td>
                  <td style={{ padding: '10px' }}>{rule.StartDate}</td>
                  <td style={{ padding: '10px' }}>{rule.EndDate}</td>
                  <td style={{ padding: '10px' }}>{rule.ApplyToAll === 'TRUE' ? 'Yes' : 'No'}</td>
                  <td style={{ padding: '10px' }}>{rule.OverrideDays}</td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => handleDelete(rule.Name)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                      ဖျက်မည်
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}