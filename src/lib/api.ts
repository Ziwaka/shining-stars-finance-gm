// ✅ Server-side /api/gas route မှတဆင့် — GAS URL client-side မထွက်

export async function sendToSheet(data: any) {
  const res = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send', data }),
  });
  return res.json();
}

// ✅ Batch submit — GAS ကို item တစ်ခုချင်း loop ပို့၊ Telegram ကိုတော့ အကုန်ပြီးမှ တစ်ကြိမ်တည်း summary ပို့
export async function sendBatchToSheet(items: any[]) {
  // Step 1: GAS ကို item တစ်ခုချင်းစီ sequential ပို့
  for (const item of items) {
    const res = await fetch('/api/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', data: item }),
    });
    await res.json();
  }

  // Step 2: GAS အကုန်ပြီးမှ Telegram summary တစ်ကြိမ်တည်း ပေးပို့
  await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'telegram_summary', items }),
  });
}

export async function deleteFromSheet(voucherno: string) {
  const res = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', voucherno }),
  });
  return res.json();
}
