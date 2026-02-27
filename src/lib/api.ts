export async function sendToSheet(data: any) {
  const res = await fetch(process.env.NEXT_PUBLIC_GAS_URL!, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

// 🔴 Transaction တစ်ခုချင်းစီကို Voucher ID ဖြင့် ဖျက်ရန် 🔴
export async function deleteFromSheet(voucherno: string) {
  const res = await fetch(process.env.NEXT_PUBLIC_GAS_URL!, {
    method: 'POST',
    body: JSON.stringify({ action: "delete", voucherno }),
  });
  return res.json();
}
