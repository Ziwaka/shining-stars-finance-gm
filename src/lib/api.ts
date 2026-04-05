// ✅ Server-side API route မှတဆင့် ပေးပို့သောကြောင့် GAS URL client-side မထွက်တော့ပါ

export async function sendToSheet(data: any) {
  const res = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send', data }),
  });
  return res.json();
}

export async function deleteFromSheet(voucherno: string) {
  const res = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', voucherno }),
  });
  return res.json();
}

export async function updateVoucher(payload: {
  voucherno  : string;
  date?      : string;
  item?      : string;
  note?      : string;
  cost_total?: number;
  category?  : string;
  sub1?      : string;
  sub2?      : string;
  sub3?      : string;
  sub4?      : string;
  sub5?      : string;
  vendor?    : string;
  image_data?: string;   // Cloudinary URL or ''
}) {
  const res = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateVoucher', ...payload }),
  });
  return res.json();
}

export async function fetchFromSheet() {
  const res = await fetch('/api/gas');
  return res.json();
}