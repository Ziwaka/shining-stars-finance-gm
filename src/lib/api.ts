export async function sendToSheet(formData: any) {
  const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;
  if (!GAS_URL) throw new Error("GAS URL is missing in .env.local");

  const response = await fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors', // GAS အတွက် no-cors သုံးရပါမည်
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  return { result: "success" }; // no-cors ဖြစ်၍ response body ကို ဖတ်၍မရသော်လည်း အလုပ်လုပ်ပါသည်
}