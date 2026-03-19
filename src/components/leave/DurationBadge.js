export default function DurationBadge({ leave, big }) {
  const dt = leave.Duration_Type || (leave.Leave_Mode === 'Half Day' ? 'HALF' : leave.Leave_Mode === 'Period-wise' ? 'PERIOD' : 'FULL');
  const days = Number(leave.Total_Days || 0);
  const sz = big ? { fontSize: '9px', padding: '4px 10px' } : { fontSize: '8px', padding: '3px 8px' };
  
  if (dt === 'HALF') {
    const part = leave.Half_Day_Part && leave.Half_Day_Part !== '-' ? ` (${leave.Half_Day_Part})` : '';
    return (
      <span style={{...sz, background: '#fef3c7', color: '#92400e', fontWeight: 900, borderRadius: '99px', textTransform: 'uppercase', whiteSpace: 'nowrap'}}>
        🌗 ½ Day{part}
      </span>
    );
  }
  if (dt === 'PERIOD') {
    const subj = leave.Period_Range && leave.Period_Range !== '-' ? leave.Period_Range : (leave.Leave_Detail && leave.Leave_Detail !== '-' ? leave.Leave_Detail : 'Period');
    return (
      <span style={{...sz, background: '#ede9fe', color: '#6d28d9', fontWeight: 900, borderRadius: '99px', textTransform: 'uppercase', whiteSpace: 'nowrap'}}>
        ⏱️ {subj}
      </span>
    );
  }
  return (
    <span style={{...sz, background: '#f0fdf4', color: '#16a34a', fontWeight: 900, borderRadius: '99px', textTransform: 'uppercase', whiteSpace: 'nowrap'}}>
      📅 {days} Day{days !== 1 ? 's' : ''}
    </span>
  );
}