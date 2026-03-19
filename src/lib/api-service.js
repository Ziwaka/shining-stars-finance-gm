// src/lib/api-service.js
// FIXED: GOOGLE_SCRIPT_URL → WEB_APP_URL
import { WEB_APP_URL } from './api';

export const apiService = {
  // Login လုပ်ဆောင်ချက်
  async login(userType, username, password) {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "login", userType, username, password }),
    });
    return await response.json();
  },

  // ဒေတာသိမ်းဆည်းခြင်း (Points, Leaves, etc.)
  async recordData(targetSheet, payload) {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "recordData", targetSheet, payload }),
    });
    return await response.json();
  },

  // ဒေတာဖတ်ခြင်း
  async getData(sheetName, targetGid) {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "getData", sheetName, targetGid }),
    });
    return await response.json();
  },

  // Note သိမ်းဆည်းခြင်း
  async recordNote(sheetName, data) {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "recordNote", sheetName, data }),
    });
    return await response.json();
  },

  // ── Flexible Timetable အတွက် API များ (အသစ်ထည့်ထားသည်) ─────────────────────

  // ရက်စွဲအလိုက် Timetable ရယူရန်
  async getEffectiveTimetable(grade, section, date) {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ 
        action: "getEffectiveTimetable", 
        grade, 
        section, 
        date: date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Yangon' })
      }),
    });
    return await response.json();
  },

  // Exceptions (ချွင်းချက်ရက်များ) ရယူရန်
  async getExceptions(filter) {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "getExceptions", ...filter }),
    });
    return await response.json();
  },

  // Exception အသစ်ထည့်ရန် (သို့) ပြင်ရန်
  async saveException(data) {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "saveException", ...data }),
    });
    return await response.json();
  },

  // Exception ဖျက်ရန်
  async deleteException(date, className) {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "deleteException", Date: date, Class: className }),
    });
    return await response.json();
  },

  // Seasonal Rules (ရာသီအလိုက် စည်းမျဉ်း) ရယူရန်
  async getSeasonalRules() {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "getSeasonalRules" }),
    });
    return await response.json();
  },

  // Seasonal Rule အသစ်ထည့်ရန် (သို့) ပြင်ရန်
  async saveSeasonalRule(data) {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "saveSeasonalRule", ...data }),
    });
    return await response.json();
  },

  // Seasonal Rule ဖျက်ရန်
  async deleteSeasonalRule(name) {
    const response = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: "deleteSeasonalRule", Name: name }),
    });
    return await response.json();
  },
};