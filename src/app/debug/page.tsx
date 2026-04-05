// ── DEBUG PAGE — /src/app/debug/page.tsx ──────────────────────
// GAS API မှ ဘာ return လာသလဲ စစ်ဆေးရန်
// Deploy ပြီးရင် localhost:3000/debug ဖွင့်ပါ
// စစ်ပြီးရင် ဖိုင်ကို ဖျက်ပစ်နိုင်သည်
"use client"
import React, { useState } from 'react';

export default function DebugPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/gas?force=1');
    const d = await res.json();
    setData(d);
    setLoading(false);
  };

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 12 }}>
      <button onClick={load} style={{ padding: '8px 16px', marginBottom: 16, cursor: 'pointer' }}>
        {loading ? 'Loading...' : 'Load GAS Data'}
      </button>

      {data && (
        <div>
          <h3>Top-level keys:</h3>
          <pre style={{ background: '#f0f0f0', padding: 12, borderRadius: 8 }}>
            {JSON.stringify(Object.keys(data), null, 2)}
          </pre>

          <h3>categoryList (first 2 rows):</h3>
          <pre style={{ background: '#f0f0f0', padding: 12, borderRadius: 8 }}>
            {JSON.stringify((data.categoryList || data.tree || []).slice(0, 2), null, 2)}
          </pre>

          <h3>suppliers (first 2 rows):</h3>
          <pre style={{ background: '#f0f0f0', padding: 12, borderRadius: 8 }}>
            {JSON.stringify((data.suppliers || []).slice(0, 2), null, 2)}
          </pre>

          <h3>vouchers (first 1 row):</h3>
          <pre style={{ background: '#f0f0f0', padding: 12, borderRadius: 8 }}>
            {JSON.stringify((data.vouchers || []).slice(0, 1), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}