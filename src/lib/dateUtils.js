// ဖိုင်လမ်းကြောင်း: src/lib/dateUtils.js

export const MM_TZ = 'Asia/Yangon';

// System တွက်ချက်မှု နှင့် Database သိမ်းရန် (YYYY-MM-DD)
export const getTodayMM = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: MM_TZ });
};

export const formatMMDate = (d) => {
  if (!d || d === '-') return '-';
  try {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
    const dateObj = new Date(d);
    if (!isNaN(dateObj.getTime())) return dateObj.toLocaleDateString('en-CA', { timeZone: MM_TZ });
  } catch (e) {}
  return String(d).split('T')[0];
};

// UI မျက်နှာပြင်တွင် ပြသရန် (DD/MM/YYYY + Day)
export const formatDateDisplay = (d) => {
  if (!d || d === '-') return '-';
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: MM_TZ });
    return `${day}/${month}/${year}, ${weekday}`;
  } catch(e) {
    return formatMMDate(d);
  }
};