"use client";
import { useState, useMemo, useRef } from 'react';
import useLeaveData from '@/hooks/useLeaveData';
import { getDisplayName, getTodayMM, formatMMDate } from '@/components/leave/DateHelpers';
import { WEB_APP_URL } from '@/lib/api';

const LEAVE_DEFAULTS = ['Casual Leave', 'Medical Leave', 'Emergency Leave', 'Personal Leave', 'Sick Leave', 'Funeral', 'Personal Affair'];

export default function SubmitPage() {
  const { allStaff, allStudents, configs, allLeaves, fetchLeaves } = useLeaveData();
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    }
    return null;
  });

  const [otherTarget, setOtherTarget] = useState('STAFF');
  const [otherSearch, setOtherSearch] = useState('');
  const [otherSel, setOtherSel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [otherForm, setOtherForm] = useState({
    Category: 'School',
    Leave_Type: 'Casual Leave',
    Start_Date: getTodayMM(),
    End_Date: getTodayMM(),
    Reason: '',
    Leave_Mode: 'Full Day',
    Time_Detail: '',
    subject: '',
    Attachment_Link: '',
    Reporter_Name: '',
    Relationship: '',
    Phone: '',
    Method: 'Phone Call',
    Status: 'Approved'
  });

  const fileInputRef = useRef();
  const cameraInputRef = useRef();

  const filteredOther = useMemo(() => {
    const list = otherTarget === 'STAFF' ? allStaff : allStudents;
    if (!otherSearch.trim()) return [];
    const q = otherSearch.toLowerCase();
    return list.filter(s =>
      getDisplayName(s).toLowerCase().includes(q) ||
      (s['Enrollment No.'] || s.Student_ID || s.Staff_ID || '').toString().includes(q)
    );
  }, [otherTarget, allStaff, allStudents, otherSearch]);

  const staffAllowance = useMemo(() => {
    if (!otherSel || otherTarget !== 'STAFF') return null;
    const sid = otherSel.Staff_ID || otherSel.ID || '';
    const used = allLeaves
      .filter(l => (l.User_ID || '').toString() === sid.toString() && l.Status === 'Approved')
      .reduce((sum, l) => sum + Number(l.Total_Days || 0), 0);

    const total = Number(configs['Staff_Leave_Allowance']) || 12;
    return { total, used, remaining: Math.max(0, total - used) };
  }, [otherSel, otherTarget, allLeaves, configs]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        setUploading(true);
        try {
          const res = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'uploadPhoto', base64, filename: file.name, mimeType: file.type, folder: 'documents' })
          }).then(r => r.json());
          if (res.success) {
            setAttachments(prev => [...prev, res.photoUrl]);
            alert(`File ${file.name} uploaded ✓`);
          } else alert(`Upload failed for ${file.name}`);
        } catch (e) { alert('Upload error'); }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (e) => {
    handleFileUpload(e);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const calcDays = () => {
    if (otherForm.Leave_Mode === 'Half Day') return 0.5;
    if (otherForm.Leave_Mode === 'Period-wise') return 0;
    if (!otherForm.Start_Date || !otherForm.End_Date) return 0;
    const d = Math.ceil(Math.abs(new Date(otherForm.End_Date) - new Date(otherForm.Start_Date)) / 86400000) + 1;
    return d > 0 ? d : 0;
  };

  const handleOtherSubmit = async () => {
    if (!otherSel) return alert('တစ်ဦး ရွေးပါ');
    if (!otherForm.Start_Date) return alert('Start Date ထည့်ပါ');
    if (otherForm.Leave_Mode === 'Full Day' && !otherForm.End_Date) return alert('End Date ထည့်ပါ');
    if (!otherForm.Reason.trim()) return alert('Reason ဖြည့်ပါ');
    if (otherTarget === 'STUDENT' && !otherForm.Reporter_Name.trim()) return alert('Reporter Name ဖြည့်ပါ');

    setSaving(true);
    const days = calcDays();
    const endD = otherForm.Leave_Mode === 'Full Day' ? otherForm.End_Date : otherForm.Start_Date;

    try {
      const isStaff = otherTarget === 'STAFF';
      const entry = [{
        Date_Applied: getTodayMM(),
        Category: otherForm.Category,
        User_Type: otherTarget,
        User_ID: otherSel['Enrollment No.'] || otherSel.Student_ID || otherSel.Staff_ID || '',
        Name: getDisplayName(otherSel),
        Leave_Type: otherForm.Leave_Type,
        Start_Date: formatMMDate(otherForm.Start_Date),
        End_Date: formatMMDate(endD),
        Total_Days: days,
        Reason: otherForm.Reason.trim(),
        Leave_Mode: otherForm.Leave_Mode,
        Half_Day_Part: otherForm.Leave_Mode === 'Half Day' ? otherForm.Time_Detail : '-',
        Period_Range: otherForm.Leave_Mode === 'Period-wise' ? otherForm.subject : '-',
        Attachment_Link: attachments.length > 0 ? attachments.join(',') : '-',
        Reporter_Name: isStaff ? (user?.Name || 'Management') : otherForm.Reporter_Name,
        Relationship: isStaff ? 'Management' : otherForm.Relationship,
        Phone: isStaff ? '-' : otherForm.Phone,
        Method: isStaff ? 'Direct' : otherForm.Method,
        Status: otherForm.Status,
        Approved_By: otherForm.Status === 'Approved' ? (user?.Name || 'Management') : '-'
      }];
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'recordNote', sheetName: 'Leave_Records', data: entry })
      });
      const r = await res.json();
      if (r.success) {
        alert('Submitted ✓');
        setOtherSel(null);
        setOtherSearch('');
        setAttachments([]);
        setOtherForm(f => ({ ...f, Start_Date: getTodayMM(), End_Date: getTodayMM(), Reason: '', Attachment_Link: '' }));
        fetchLeaves();
      }
    } catch { alert('Network Error'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* User Type Selector - ကျစ်လစ်အောင် */}
      <div className="grid grid-cols-2 gap-2">
        {[{ id: 'STAFF', icon: '👔', label: 'Staff' }, { id: 'STUDENT', icon: '🎓', label: 'Student' }].map(t => (
          <button
            key={t.id}
            onClick={() => { setOtherTarget(t.id); setOtherSel(null); setOtherSearch(''); }}
            className={`py-3 rounded-xl font-black uppercase text-xs transition-all flex items-center justify-center gap-2 border-b-4 ${
              otherTarget === t.id ? 'bg-[#fbbf24] text-slate-950 border-amber-600 shadow-md' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* User Selection */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2 block">
          Select {otherTarget === 'STAFF' ? 'Staff' : 'Student'}
        </label>
        {otherSel ? (
          <div className="flex items-center justify-between bg-amber-50 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-200 rounded-lg flex items-center justify-center text-lg">👤</div>
              <div>
                <p className="font-black text-sm text-amber-900">{getDisplayName(otherSel)}</p>
                <p className="text-[8px] text-amber-600">ID: {otherSel['Enrollment No.'] || otherSel.Staff_ID}</p>
              </div>
            </div>
            <button onClick={() => { setOtherSel(null); setOtherSearch(''); }} className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-xs">✕</button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={otherSearch}
              onChange={e => setOtherSearch(e.target.value)}
              placeholder="Search name or ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
            />
            {filteredOther.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto p-1">
                {filteredOther.slice(0, 5).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setOtherSel(s); setOtherSearch(''); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 rounded-lg text-sm"
                  >
                    <p className="font-bold">{getDisplayName(s)}</p>
                    <p className="text-[9px] text-slate-400">{s['Enrollment No.'] || s.Staff_ID}</p>
                  </button>
                ))}
                {filteredOther.length > 5 && (
                  <p className="text-[9px] text-slate-400 text-center py-1">+{filteredOther.length - 5} more</p>
                )}
              </div>
            )}
          </div>
        )}

        {staffAllowance && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-slate-900 p-2 rounded-lg text-center">
              <p className="text-[8px] text-slate-400">Total</p>
              <p className="text-sm font-black text-white">{staffAllowance.total}d</p>
            </div>
            <div className="bg-rose-50 p-2 rounded-lg text-center">
              <p className="text-[8px] text-rose-400">Used</p>
              <p className="text-sm font-black text-rose-600">{staffAllowance.used}d</p>
            </div>
            <div className="bg-emerald-50 p-2 rounded-lg text-center">
              <p className="text-[8px] text-emerald-500">Left</p>
              <p className="text-sm font-black text-emerald-600">{staffAllowance.remaining}d</p>
            </div>
          </div>
        )}
      </div>

      {/* Form - ကျစ်လစ်အောင် */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Category</label>
            <select
              value={otherForm.Category}
              onChange={e => setOtherForm(f => ({ ...f, Category: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
            >
              <option>School</option>
              <option>Guide</option>
            </select>
          </div>
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Type</label>
            <select
              value={otherForm.Leave_Type}
              onChange={e => setOtherForm(f => ({ ...f, Leave_Type: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
            >
              {LEAVE_DEFAULTS.map(lt => <option key={lt}>{lt}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Mode</label>
          <div className="flex gap-1">
            {['Full Day', 'Half Day', 'Period-wise'].map(m => (
              <button
                key={m}
                onClick={() => setOtherForm(f => ({ ...f, Leave_Mode: m }))}
                className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${
                  otherForm.Leave_Mode === m ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {m === 'Full Day' ? 'Full' : m === 'Half Day' ? '½ Day' : 'Period'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Start</label>
            <input
              type="date"
              value={otherForm.Start_Date}
              onChange={e => setOtherForm(f => ({ ...f, Start_Date: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
            />
          </div>
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">
              {otherForm.Leave_Mode === 'Full Day' ? 'End' : otherForm.Leave_Mode === 'Half Day' ? 'Session' : 'Subject'}
            </label>
            {otherForm.Leave_Mode === 'Full Day' ? (
              <input
                type="date"
                value={otherForm.End_Date}
                min={otherForm.Start_Date}
                onChange={e => setOtherForm(f => ({ ...f, End_Date: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              />
            ) : (
              <input
                value={otherForm.Leave_Mode === 'Half Day' ? otherForm.Time_Detail : otherForm.subject}
                onChange={e => setOtherForm(f => ({ ...f, [otherForm.Leave_Mode === 'Half Day' ? 'Time_Detail' : 'subject']: e.target.value }))}
                placeholder={otherForm.Leave_Mode === 'Half Day' ? 'AM/PM' : 'Subject'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              />
            )}
          </div>
        </div>

        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Reason</label>
          <textarea
            value={otherForm.Reason}
            onChange={e => setOtherForm(f => ({ ...f, Reason: e.target.value }))}
            rows={2}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold resize-none"
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Documents</label>
          <div className="flex gap-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1"
            >
              📸 Camera
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1"
            >
              🖼️ Gallery
            </button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} className="hidden" multiple />
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" multiple />
          {uploading && <p className="text-[9px] text-amber-600 mt-1">Uploading...</p>}
          {attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {attachments.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                  <a href={url} target="_blank" className="text-[9px] text-sky-600 underline truncate">📎 File {idx + 1}</a>
                  <button onClick={() => removeAttachment(idx)} className="text-rose-500 text-[9px]">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {otherTarget === 'STUDENT' && (
          <div className="bg-indigo-50 p-3 rounded-xl space-y-2">
            <p className="text-[8px] font-black text-indigo-400 uppercase">Reporter</p>
            <div className="grid grid-cols-3 gap-1">
              <input value={otherForm.Reporter_Name} onChange={e => setOtherForm(f => ({ ...f, Reporter_Name: e.target.value }))} placeholder="Name" className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold" />
              <input value={otherForm.Relationship} onChange={e => setOtherForm(f => ({ ...f, Relationship: e.target.value }))} placeholder="Relation" className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold" />
              <input value={otherForm.Phone} onChange={e => setOtherForm(f => ({ ...f, Phone: e.target.value }))} placeholder="Phone" className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-bold" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1">
            <div className="flex gap-1">
              <button onClick={() => setOtherForm(f => ({ ...f, Status: 'Approved' }))} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase ${otherForm.Status === 'Approved' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>Approve</button>
              <button onClick={() => setOtherForm(f => ({ ...f, Status: 'Pending' }))} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase ${otherForm.Status === 'Pending' ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-400'}`}>Pending</button>
            </div>
          </div>
          <button
            onClick={handleOtherSubmit}
            disabled={saving}
            className="px-6 py-2 bg-slate-900 text-[#fbbf24] rounded-xl text-xs font-black uppercase shadow-md disabled:bg-slate-300"
          >
            {saving ? '...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}