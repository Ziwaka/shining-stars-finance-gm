"use client";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';
import { CLOUDINARY_CLOUD } from '@/lib/cloudinary';

// Presets — Cloudinary dashboard မှာ ၂ ခု သီးသန့် ဖန်တီးထားရသည်
const PRESETS = {
  students: 'shining-stars-students',
  staff:    'shining-stars-staff',
};
const FOLDERS = {
  students: 'shining-stars/students',
  staff:    'shining-stars/staff',
};

// Sheet config per tab
const SHEET_CONFIG = {
  students: { sheetName: 'Student_Directory', idField: 'Enrollment No.' },
  staff:    { sheetName: 'Staff_Directory',   idField: 'Staff_ID' },
};

export default function PhotoUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [tab, setTab]           = useState('students');
  const [queue, setQueue]       = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState({ done: 0, total: 0, errors: 0 });
  const [log, setLog]           = useState([]);
  const logRef = useRef(null);

  const addLog = (type, msg) => {
    const time = new Date().toLocaleTimeString('en-GB');
    setLog(prev => [...prev, { type, msg, time }]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  };

  const addFiles = (files) => {
    const newItems = Array.from(files).map(file => ({
      id:       Math.random().toString(36).slice(2),
      file,
      status:   'waiting',
      preview:  URL.createObjectURL(file),
      // publicId = filename without extension = Student/Staff ID
      publicId: file.name.replace(/\.[^/.]+$/, '').trim(),
    }));
    setQueue(prev => [...prev, ...newItems]);
  };

  const removeFile = (id)  => setQueue(prev => prev.filter(f => f.id !== id));
  const clearAll   = ()    => { setQueue([]); setProgress({ done:0, total:0, errors:0 }); setLog([]); };
  const updateStatus = (id, status, extra = {}) =>
    setQueue(prev => prev.map(f => f.id === id ? { ...f, status, ...extra } : f));

  // ── Save URL back to Google Sheet ────────────────────────────────────────
  const saveToSheet = async (studentId, photoUrl) => {
    const cfg = SHEET_CONFIG[tab];
    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({
        action:    'updatePhotoUrl',
        sheetName: cfg.sheetName,
        idField:   cfg.idField,
        id:        studentId,
        photoUrl:  photoUrl,
      }),
    });
    const data = await res.json();
    return data;
  };

  // ── Main upload loop ─────────────────────────────────────────────────────
  const startUpload = async () => {
    const pending = queue.filter(f => f.status !== 'done');
    if (!pending.length || uploading) return;
    setUploading(true);
    setProgress({ done: 0, total: pending.length, errors: 0 });

    let done = 0, errors = 0;
    addLog('info', `📤 ${pending.length} files → ${FOLDERS[tab]}`);

    for (const item of pending) {
      updateStatus(item.id, 'uploading');
      const fd = new FormData();
      fd.append('file',           item.file);
      fd.append('upload_preset',  PRESETS[tab]);
      fd.append('folder',         FOLDERS[tab]);
      fd.append('public_id',      item.publicId);

      try {
        // Step 1 — Upload to Cloudinary
        const res  = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
          { method: 'POST', body: fd }
        );
        const data = await res.json();

        if (!data.secure_url) {
          updateStatus(item.id, 'error');
          addLog('err', `❌ ${item.file.name}: ${data.error?.message || 'Cloudinary upload failed'}`);
          errors++;
          setProgress({ done: done + errors, total: pending.length, errors });
          continue;
        }

        addLog('ok', `☁️ ${item.file.name} → Cloudinary OK`);

        // Step 2 — Save URL to Google Sheet
        const saveRes = await saveToSheet(item.publicId, data.secure_url);
        if (saveRes.success) {
          updateStatus(item.id, 'done', { savedUrl: data.secure_url });
          addLog('ok', `✅ ${item.publicId} — Sheet updated (row ${saveRes.row})`);
          done++;
        } else {
          updateStatus(item.id, 'sheet-error', { savedUrl: data.secure_url });
          addLog('err', `⚠️ ${item.publicId} — Cloudinary OK ဒါပေမဲ့ Sheet မသိမ်းရ: ${saveRes.message}`);
          errors++;
        }
      } catch(e) {
        updateStatus(item.id, 'error');
        addLog('err', `❌ ${item.file.name}: ${e.message}`);
        errors++;
      }
      setProgress({ done: done + errors, total: pending.length, errors });
    }

    addLog('info', `🏁 Complete — ✅ ${done} success · ❌ ${errors} errors`);
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const STATUS_COLOR = {
    waiting:      '#94a3b8',
    uploading:    '#60a5fa',
    done:         '#10b981',
    error:        '#ef4444',
    'sheet-error':'#f59e0b',
  };
  const STATUS_ICON = {
    waiting:      '⏳',
    uploading:    '⬆',
    done:         '✅',
    error:        '❌',
    'sheet-error':'⚠️',
  };

  return (
    <div className="min-h-screen p-4 md:p-10 font-black" style={{ background: '#0f0720', color: '#fff' }}>
      <div className="mx-auto space-y-6" style={{ maxWidth: '1000px' }}>

        {/* HEADER */}
        <div className="flex items-center gap-4 p-6 rounded-[2rem]"
          style={{ background: '#1e1b4b', border: '4px solid #fbbf24' }}>
          <button onClick={() => router.push('/management/mgt-dashboard')}
            className="text-2xl p-3 rounded-xl active:scale-90 transition-all"
            style={{ background: '#fbbf24', color: '#000' }}>🔙</button>
          <div>
            <h1 className="text-2xl md:text-4xl uppercase italic tracking-tighter" style={{ color: '#fbbf24' }}>
              📸 Photo Upload
            </h1>
            <p className="text-xs uppercase tracking-widest mt-1" style={{ color: '#7c3aed' }}>
              Cloudinary · {tab === 'students' ? 'shining-stars-students' : 'shining-stars-staff'} preset
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-3">
          {['students','staff'].map(t => (
            <button key={t} onClick={() => { setTab(t); clearAll(); }}
              className="px-6 py-3 rounded-full uppercase text-sm transition-all"
              style={{
                background: tab === t ? '#fbbf24' : '#1e1b4b',
                color:      tab === t ? '#000'    : '#94a3b8',
                fontWeight: 900,
              }}>
              {t === 'students' ? '👨‍🎓 Students' : '👥 Staff'}
            </button>
          ))}
        </div>

        {/* RULE NOTE */}
        <div className="p-4 rounded-2xl" style={{ background: '#1e1b4b', borderLeft: '4px solid #fbbf24' }}>
          <p className="text-sm mb-1" style={{ color: '#fbbf24' }}>📋 File naming rule:</p>
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            {tab === 'students'
              ? 'Enrollment No. နဲ့ ပေးရမယ် — e.g. 26G12001.jpg'
              : 'Staff ID နဲ့ ပေးရမယ် — e.g. S001.jpg'}
          </p>
          <p className="text-xs mt-2" style={{ color: '#4ade80' }}>
            ✅ Upload ပြီးရင် {SHEET_CONFIG[tab].sheetName} Sheet ထဲ Photo_URL အလိုအလျောက် သိမ်းမည်
          </p>
        </div>

        {/* DROP ZONE */}
        <div
          onDrop={onDrop} onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-[2rem] p-10 text-center cursor-pointer transition-all hover:border-[#fbbf24]"
          style={{ border: '3px dashed #4c1d95', background: '#1e1b4b' }}>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
            onChange={e => addFiles(e.target.files)} />
          <div className="text-5xl mb-3">📁</div>
          <p style={{ color: '#94a3b8' }}>
            <span style={{ color: '#fbbf24', fontWeight: 900 }}>Click or Drag & Drop</span> — JPG, PNG, WEBP
          </p>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Photo အများကြီး တစ်ချိန်တည်း ထည့်နိုင်သည်</p>
        </div>

        {/* QUEUE GRID */}
        {queue.length > 0 && (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
            {queue.map(item => (
              <div key={item.id} className="relative rounded-2xl p-3 text-center"
                style={{ background: '#1e1b4b', opacity: item.status === 'done' ? 0.6 : 1,
                  border: item.status === 'sheet-error' ? '2px solid #f59e0b' : '2px solid transparent' }}>
                <button onClick={() => removeFile(item.id)}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full text-xs flex items-center justify-center"
                  style={{ background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}>✕</button>
                <img src={item.preview} alt="" className="w-full rounded-xl mb-2"
                  style={{ height: '80px', objectFit: 'cover' }} />
                <div className="text-xs truncate" style={{ color: '#fbbf24' }}>{item.publicId}</div>
                <div className="text-xs mt-1" style={{ color: STATUS_COLOR[item.status] || '#94a3b8' }}>
                  {STATUS_ICON[item.status] || '⏳'} {item.status}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CONTROLS */}
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={startUpload} disabled={queue.length === 0 || uploading}
            className="px-8 py-4 rounded-full uppercase text-sm transition-all"
            style={{
              background: queue.length > 0 && !uploading ? '#fbbf24' : '#374151',
              color:      queue.length > 0 && !uploading ? '#000'    : '#6b7280',
              cursor:     queue.length > 0 && !uploading ? 'pointer' : 'not-allowed',
              fontWeight: 900,
            }}>
            {uploading ? `⬆ Uploading... ${pct}%` : `▶ Upload All (${queue.filter(f=>f.status!=='done').length})`}
          </button>
          <button onClick={clearAll} disabled={uploading}
            className="px-6 py-4 rounded-full uppercase text-sm transition-all"
            style={{ background: '#1e1b4b', color: '#94a3b8', border: '2px solid #374151',
              fontWeight: 900, cursor: 'pointer' }}>
            🗑 Clear
          </button>
          {progress.total > 0 && (
            <span className="text-sm" style={{ color: '#fbbf24' }}>
              {progress.done}/{progress.total} · {progress.errors} errors
            </span>
          )}
        </div>

        {/* PROGRESS BAR */}
        {progress.total > 0 && (
          <div className="rounded-full overflow-hidden" style={{ background: '#1e1b4b', height: '10px' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, background: 'linear-gradient(to right, #7c3aed, #fbbf24)' }} />
          </div>
        )}

        {/* sheet-error explanation */}
        {queue.some(f => f.status === 'sheet-error') && (
          <div className="p-4 rounded-2xl" style={{ background: '#1e1b4b', border: '2px solid #f59e0b' }}>
            <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>⚠️ Sheet save မရဘူးဆိုရင် —</p>
            <ul className="text-xs mt-2 space-y-1" style={{ color: '#94a3b8' }}>
              <li>· File name က Enrollment No. / Staff ID နဲ့ ကိုက်ရမယ်</li>
              <li>· GAS redeploy လုပ်ဖို့ လိုနိုင်တယ်</li>
              <li>· Sheet ထဲမှာ Photo_URL column ရှိရမယ်</li>
            </ul>
          </div>
        )}

        {/* LOG */}
        {log.length > 0 && (
          <div ref={logRef} className="rounded-2xl p-4 font-mono text-xs space-y-1 overflow-y-auto"
            style={{ background: '#050310', maxHeight: '220px' }}>
            {log.map((l, i) => (
              <div key={i} style={{ color: { ok:'#10b981', err:'#ef4444', info:'#60a5fa' }[l.type] || '#94a3b8' }}>
                [{l.time}] {l.msg}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}