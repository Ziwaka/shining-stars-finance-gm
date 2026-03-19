"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api-service';

export default function ManageExceptions() {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Form state
  const [date, setDate] = useState('');
  const [className, setClassName] = useState('');
  const [type, setType] = useState('holiday');
  const [scheduleOverride, setScheduleOverride] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadExceptions();
  }, []);

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const res = await apiService.getExceptions({});
      if (res.success) setExceptions(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !className || !type) return;
    await apiService.saveException({
      Date: date,
      Class: className,
      Type: type,
      ScheduleOverride: scheduleOverride,
      Reason: reason,
      Created_By: 'management', // or get current user
    });
    // Reset form
    setDate('');
    setClassName('');
    setType('holiday');
    setScheduleOverride('');
    setReason('');
    loadExceptions();
  };

  const handleDelete = async (date, className) => {
    if (confirm('ဖျက်မှာသေချာပါသလား?')) {
      await apiService.deleteException(date, className);
      loadExceptions();
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
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>ချွင်းချက်ရက်များ စီမံခြင်း (Exceptions)</h1>

      {/* Add/Edit Form */}
      <div style={formStyle}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>အသစ်ထည့်ရန်</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>ရက်စွဲ</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>အတန်း (Class)</label>
            <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="ဥပမာ Grade 5A သို့မဟုတ် all" style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>အမျိုးအစား</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="holiday">ကျောင်းပိတ်ရက် (Holiday)</option>
              <option value="special">အထူးအချိန်ဇယား (Special)</option>
            </select>
          </div>
          {type === 'special' && (
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>အထူးအချိန်ဇယား ID</label>
              <input type="text" value={scheduleOverride} onChange={(e) => setScheduleOverride(e.target.value)} placeholder="saturday_schedule" style={inputStyle} />
            </div>
          )}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>အကြောင်းပြချက်</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ဥပမာ ဝါဆိုလပြည့်" style={inputStyle} />
          </div>
          <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            သိမ်းဆည်းမည်
          </button>
        </form>
      </div>

      {/* List */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>ရှိပြီးသား ချွင်းချက်များ</h2>
        {loading ? (
          <p>Loading...</p>
        ) : exceptions.length === 0 ? (
          <p>ချွင်းချက်ရက် မရှိသေး</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>ရက်စွဲ</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>အတန်း</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>အမျိုးအစား</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>အထူးဇယား</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>အကြောင်း</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>လုပ်ဆောင်ချက်</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((ex, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>{ex.Date}</td>
                  <td style={{ padding: '10px' }}>{ex.Class}</td>
                  <td style={{ padding: '10px' }}>{ex.Type}</td>
                  <td style={{ padding: '10px' }}>{ex.ScheduleOverride || '-'}</td>
                  <td style={{ padding: '10px' }}>{ex.Reason}</td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => handleDelete(ex.Date, ex.Class)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>
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