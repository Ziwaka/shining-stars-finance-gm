// /components/leave/DateHelpers.js

export const MM_TZ = 'Asia/Yangon';

/**
 * Myanmar Timezone အတိုင်း ယနေ့ရက်စွဲကို YYYY-MM-DD ပုံစံနဲ့ ပြန်ပေးတယ်
 */
export const getTodayMM = () => {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: MM_TZ });
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * ရက်စွဲကို YYYY-MM-DD ပုံစံပြောင်းတယ် (Myanmar Timezone)
 * @param {string|Date} d - ရက်စွဲ (string သို့ Date object)
 */
export const formatMMDate = (d) => {
  if (!d || d === '-') return '-';
  try {
    // YYYY-MM-DD ပုံစံဖြစ်နေရင် ပြန်ပေး
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return d.trim();
    const dateObj = new Date(d);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-CA', { timeZone: MM_TZ });
    }
  } catch {}
  // မရရင် မူလအတိုင်း T ဖြတ်ပြီးပြန်
  return String(d).split('T')[0];
};

/**
 * ရက်စွဲ string ကို Date object အဖြစ်ပြောင်းတယ် (Myanmar Timezone အတွက် နေ့လယ် ၁၂နာရီထားတယ်)
 * @param {string} dateStr - YYYY-MM-DD ပုံစံ
 */
export const parseMMDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return null;
  try {
    // နေ့လယ် ၁၂:၀၀ ချိန်မှာ Date ဆောက်တာက timezone offset ကို ကြားခံနိုင်တယ်
    return new Date(dateStr + 'T12:00:00');
  } catch {
    return null;
  }
};

/**
 * ရက်စွဲတစ်ခုကို လူဖတ်လို့ရတဲ့ပုံစံ (dd/mm/yyyy, Day) ပြောင်းတယ်
 * @param {string} d - YYYY-MM-DD ရက်စွဲ
 */
export const formatDateDisplay = (d) => {
  if (!d || d === '-') return '-';
  try {
    const dateObj = parseMMDate(d);
    if (!dateObj) return d;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: MM_TZ });
    return `${day}/${month}/${year}, ${weekday}`;
  } catch {
    return formatMMDate(d);
  }
};

/**
 * ရက်စွဲနှစ်ခုကို နှိုင်းယှဉ်တယ် (အစောပိုင်း/နောက်ကျ)
 * @param {string} date1 - YYYY-MM-DD
 * @param {string} date2 - YYYY-MM-DD
 * @returns {number} - date1 > date2 ဆိုရင် 1, ညီရင် 0, ငယ်ရင် -1
 */
export const compareMMDates = (date1, date2) => {
  const d1 = parseMMDate(date1);
  const d2 = parseMMDate(date2);
  if (!d1 || !d2) return 0;
  if (d1 > d2) return 1;
  if (d1 < d2) return -1;
  return 0;
};

/**
 * ရက်စွဲတစ်ခုဟာ သတ်မှတ်ထားတဲ့ range (စနေ့၊ ဆုံးရက်) အတွင်းရှိမရှိစစ်တယ်
 * @param {string} date - YYYY-MM-DD ပုံစံ
 * @param {string} start - YYYY-MM-DD ပုံစံ
 * @param {string} end - YYYY-MM-DD ပုံစံ (optional, မရှိရင် start နဲ့တူ)
 */
export const isDateInRange = (date, start, end = start) => {
  const d = parseMMDate(date);
  const s = parseMMDate(start);
  const e = parseMMDate(end);
  if (!d || !s || !e) return false;
  return d >= s && d <= e;
};

/**
 * ရက်စွဲနှစ်ခုကြား ရက်အရေအတွက်တွက်တယ် (inclusive)
 * @param {string} start - YYYY-MM-DD
 * @param {string} end - YYYY-MM-DD
 */
export const daysBetween = (start, end) => {
  const s = parseMMDate(start);
  const e = parseMMDate(end);
  if (!s || !e) return 0;
  const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 0;
};

/**
 * ရက်စွဲတစ်ခုက YYYY-MM-DD ပုံစံကျနေလားစစ်တယ်
 * @param {string} date 
 */
export const isValidMMDate = (date) => {
  if (!date || typeof date !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
};