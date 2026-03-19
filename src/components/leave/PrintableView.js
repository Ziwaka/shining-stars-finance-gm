import React from 'react';
import { formatDateDisplay } from './DateHelpers';

const PrintableView = React.forwardRef(({ data, title, date }, ref) => (
  <div ref={ref} className="bg-white p-8 print:p-4" style={{ minWidth: '800px' }}>
    <div className="text-center mb-6 print:mb-4">
      <h1 className="text-2xl font-black uppercase tracking-tight">{title}</h1>
      <p className="text-sm text-slate-500">Date: {formatDateDisplay(date)}</p>
    </div>
    
    {Object.entries(data).map(([grade, users]) => (
      <div key={grade} className="mb-6 print:mb-4 print:break-inside-avoid">
        <div className="bg-slate-900 text-white px-4 py-2 rounded-t-lg font-black">
          {grade === 'undefined' ? 'အတန်းမရှိသူများ' : `Grade ${grade}`} ({users.length} ဦး)
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black uppercase">
              <th className="border p-2 text-left">စဥ်</th>
              <th className="border p-2 text-left">အမည်</th>
              <th className="border p-2 text-left">ID</th>
              <th className="border p-2 text-right">စုစုပေါင်း</th>
              <th className="border p-2 text-right">ဆက်တိုက်</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={idx} className="text-xs">
                <td className="border p-2">{idx + 1}</td>
                <td className="border p-2 font-bold">{u.name}</td>
                <td className="border p-2">{u.id}</td>
                <td className="border p-2 text-right font-black">{u.totalDays}</td>
                <td className="border p-2 text-right">{u.consecutiveMax}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}
    
    <div className="text-[8px] text-slate-400 text-center mt-8 print:mt-4">
      Printed from Management Leave Hub • {new Date().toLocaleString()}
    </div>
  </div>
));

PrintableView.displayName = 'PrintableView';
export default PrintableView;