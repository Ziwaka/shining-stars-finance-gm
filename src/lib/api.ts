// ✅ Server-side /api/gas route မှတဆင့် — GAS URL client-side မထွက်

export async function sendToSheet(data: any) {
  const res = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send', data }),
  });
  return res.json();
}

// ✅ Batch submit — item အကုန်ကို တစ်ခါတည်း GAS ပို့ပြီး Telegram summary တစ်ကြိမ်သာ ပေးပို့
export async function sendBatchToSheet(items: any[]) {
  const results = [];
  for (const item of items) {
    const res = await fetch('/api/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // ✅ items array ပါပို့သောကြောင့် server မှာ summary တစ်ကြိမ်တည်း ပို့မည်
      body: JSON.stringify({ action: 'send', data: item, items }),
    });
    results.push(await res.json());
  }
  return results;
}

export async function deleteFromSheet(voucherno: string) {
  const res = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', voucherno }),
  });
  return res.json();
}

export async function fetchFromSheet() {
  const res = await fetch('/api/gas');
  return res.json();
}
