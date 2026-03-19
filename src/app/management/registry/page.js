"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';
import { getTodayMM } from '@/lib/dateUtils';
import { uploadToCloudinary, getPhotoUrl } from '@/lib/cloudinary';

const canManage = (u) => {
  if (!u) return false;
  if (u.userRole === 'management') return true;
  return u.Can_View_Student === true || String(u.Can_View_Student || '').toUpperCase() === 'TRUE';
};

const gas = async (action, payload = {}) => {
  const res = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
};

const S = {
  page:    { display:'flex', flexDirection:'column', minHeight:'100dvh', background:'#09080f', color:'#fff', fontFamily:'system-ui,sans-serif' },
  header:  { position:'sticky', top:0, zIndex:40, background:'rgba(9,8,15,0.97)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,0.07)', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px' },
  body:    { flex:1, overflowY:'auto', padding:'16px', paddingBottom:'80px' },
  card:    { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'18px', padding:'14px', marginBottom:'10px' },
  input:   { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  select:  { width:'100%', background:'#130f22', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  label:   { display:'block', fontSize:'9px', color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'5px', fontWeight:900 },
  btn:     { background:'#fbbf24', color:'#09080f', border:'none', borderRadius:'12px', padding:'11px 20px', fontSize:'12px', fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' },
  btnSm:   { background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', padding:'6px 12px', fontSize:'10px', fontWeight:900, cursor:'pointer' },
  btnRed:  { background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'9px', padding:'6px 12px', fontSize:'10px', fontWeight:900, cursor:'pointer' },
  btnGreen:{ background:'rgba(52,211,153,0.15)', color:'#34d399', border:'1px solid rgba(52,211,153,0.25)', borderRadius:'9px', padding:'6px 12px', fontSize:'10px', fontWeight:900, cursor:'pointer' },
};

const EMPTY_STU = { 'Enrollment No.':'', 'Name (ALL CAPITAL)':'', '\u1021\u1019\u100a\u103a':'', Grade:'', Section:'', Class:'', House:'', Sex:'Male', 'School/Hostel':'School', Status:true, 'Date of Birth':'', Religion:'Buddhist', 'Town/City':'', "Father's Name":'', "Mother's Name":'', "Father's Occupation":'', "Mother's Occupation":'', Phone:'', Photo_URL:'', Password:'' };
const EMPTY_STAFF = { Staff_ID:'', Username:'', 'Name (ALL CAPITAL)':'', Name:'', Position:'Teacher', Department:'Academic', Phone:'', Email:'', Status:true, Photo_URL:'', Password:'' };

const PersonCard = ({ item, type, onEdit, onToggle, isMgt }) => {
  const name = item['Name (ALL CAPITAL)'] || item.Name || '';
  const id   = type === 'student' ? (item['Enrollment No.'] || item.Student_ID || '') : (item.Staff_ID || item.Username || '');
  const active = item.Status === true || String(item.Status || '').toUpperCase() === 'TRUE';
  const photo = getPhotoUrl(item.Photo_URL);
  const sub   = type === 'student'
    ? `G${item.Grade || '?'} ${item.Section || item.Class || ''} \u00b7 ${item.House || '-'}`
    : `${item.Position || ''} \u00b7 ${item.Department || ''}`;
  return (
    <div style={{ ...S.card, display:'flex', alignItems:'center', gap:'12px', opacity: active ? 1 : 0.5 }}>
      <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.08)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
        {photo ? <img src={photo} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} /> : '\ud83d\udc64'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:900, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{name}</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{id} \u00b7 {sub}</div>
      </div>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        {isMgt && <button style={S.btnSm} onClick={() => onEdit(item)}>\u270f\ufe0f Edit</button>}
        {isMgt && <button style={active ? S.btnRed : S.btnGreen} onClick={() => onToggle(item, !active)}>{active ? 'Deactivate' : 'Activate'}</button>}
      </div>
    </div>
  );
};

export default function RegistryPage() {
  const router = useRouter();
  const [user, setUser]         = useState(null);
  const [isMgt, setIsMgt]       = useState(false);
  const [tab, setTab]           = useState('student');
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [cfg, setCfg]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [search, setSearch]     = useState('');
  const [filterGrade, setFilterGrade] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('active');
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({});
  const [uploading, setUploading] = useState(false);

  const showMsg = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3500); };
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) { router.push('/login'); return; }
    const u = JSON.parse(raw);
    if (!canManage(u)) { router.push(u.userRole === 'management' ? '/management/mgt-dashboard' : '/staff'); return; }
    setUser(u);
    setIsMgt(u.userRole === 'management');
    loadAll();
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [stuRes, staffRes, cfgRes] = await Promise.all([
        gas('getData', { sheetName: 'Student_Directory' }),
        gas('getData', { sheetName: 'Staff_Login' }),
        gas('getRegistryConfig'),
      ]);
      if (stuRes.success) setStudents(stuRes.data || []);
      if (staffRes.success) setStaffList((staffRes.data || []).map(s => { const x = {...s}; delete x.Password; delete x.password; return x; }));
      if (cfgRes.success) setCfg(cfgRes);
    } catch(e) { showMsg('Load မအောင်မြင်ပါ', 'err'); }
    finally { setLoading(false); }
  }, []);

  const filterItems = (items, type) => {
    const q = search.toLowerCase().trim();
    return items.filter(item => {
      const active = item.Status === true || String(item.Status || '').toUpperCase() === 'TRUE';
      if (filterStatus === 'active' && !active) return false;
      if (filterStatus === 'inactive' && active) return false;
      if (type === 'student' && filterGrade !== 'ALL' && String(item.Grade || '') !== filterGrade) return false;
      if (!q) return true;
      const name = (item['Name (ALL CAPITAL)'] || item.Name || '').toLowerCase();
      const id   = (item['Enrollment No.'] || item.Student_ID || item.Staff_ID || item.Username || '').toString().toLowerCase();
      const pos  = (item.Position || '').toLowerCase();
      return name.includes(q) || id.includes(q) || pos.includes(q);
    });
  };

  const filteredStu   = filterItems(students, 'student');
  const filteredStaff = filterItems(staffList, 'staff');

  const openAddStu    = () => { setForm({ ...EMPTY_STU }); setModal('addStu'); };
  const openEditStu   = (s) => { setForm({ ...s }); setModal('editStu'); };
  const openAddStaff  = () => { setForm({ ...EMPTY_STAFF }); setModal('addStaff'); };
  const openEditStaff = (s) => { setForm({ ...s }); setModal('editStaff'); };

  const handlePhotoChange = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, tab === 'student' ? 'students' : 'staff');
      setF('Photo_URL', url);
      showMsg('\u1013\u102c\u1010\u103a\u1015\u102f\u1036 upload \u1015\u103c\u102e\u1038\u1015\u102a\u1038\u1015\u103c\u102e');
    } catch(e) { showMsg('Upload \u1019\u1021\u1031\u102c\u1004\u103a\u1019\u103c\u1004\u103a\u1015\u102a', 'err'); }
    finally { setUploading(false); }
  };

  const saveStudent = async () => {
    if (!form['Enrollment No.']) { showMsg('Enrollment No. \u1016\u103c\u100a\u1037\u1015\u102a', 'err'); return; }
    if (!form['Name (ALL CAPITAL)']) { showMsg('\u1021\u1019\u100a\u103a \u1016\u103c\u100a\u1037\u1015\u102a', 'err'); return; }
    setSaving(true);
    try {
      const action = modal === 'addStu' ? 'addStudent' : 'updateStudent';
      const res = await gas(action, form);
      if (res.success) { showMsg(res.message || '\u101e\u102d\u1019\u103a\u1015\u103c\u102e\u1038\u1015\u102a\u1038\u1015\u103c\u102e'); setModal(null); await loadAll(); }
      else showMsg(res.message || '\u1019\u1021\u1031\u102c\u1004\u103a\u1019\u103c\u1004\u103a\u1015\u102a', 'err');
    } catch(e) { showMsg(e.toString(), 'err'); }
    finally { setSaving(false); }
  };

  const saveStaff = async () => {
    if (!form.Staff_ID) { showMsg('Staff ID \u1016\u103c\u100a\u1037\u1015\u102a', 'err'); return; }
    if (!form['Name (ALL CAPITAL)'] && !form.Name) { showMsg('\u1021\u1019\u100a\u103a \u1016\u103c\u100a\u1037\u1015\u102a', 'err'); return; }
    setSaving(true);
    try {
      const action = modal === 'addStaff' ? 'addStaff' : 'updateStaff';
      const res = await gas(action, form);
      if (res.success) { showMsg(res.message || '\u101e\u102d\u1019\u103a\u1015\u103c\u102e\u1038\u1015\u102a\u1038\u1015\u103c\u102e'); setModal(null); await loadAll(); }
      else showMsg(res.message || '\u1019\u1021\u1031\u102c\u1004\u103a\u1019\u103c\u1004\u103a\u1015\u102a', 'err');
    } catch(e) { showMsg(e.toString(), 'err'); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (item, setActive) => {
    if (!confirm(`${setActive ? 'Activate' : 'Deactivate'} "${item['Name (ALL CAPITAL)'] || item.Name}"?`)) return;
    const isStu  = tab === 'student';
    const action = isStu ? 'updateStudent' : 'updateStaff';
    const idKey  = isStu ? 'Enrollment No.' : 'Staff_ID';
    const id     = isStu ? (item['Enrollment No.'] || item.Student_ID) : (item.Staff_ID || item.Username);
    setSaving(true);
    try {
      const res = await gas(action, { [idKey]: id, Status: setActive });
      if (res.success) { showMsg(res.message || '\u1015\u103c\u1031\u102c\u1004\u103a\u1038\u1015\u103c\u102e\u1038\u1015\u102a\u1038\u1015\u103c\u102e'); await loadAll(); }
      else showMsg(res.message || '\u1019\u1021\u1031\u102c\u1004\u103a\u1019\u103c\u1004\u103a\u1015\u102a', 'err');
    } catch(e) { showMsg(e.toString(), 'err'); }
    finally { setSaving(false); }
  };

  const Field = ({ label, fkey, type='text', options, required }) => (
    <div>
      <label style={S.label}>{label}{required && <span style={{color:'#f87171'}}> *</span>}</label>
      {options ? (
        <select style={S.select} value={form[fkey] ?? ''} onChange={e => setF(fkey, e.target.value)}>
          <option value="">— \u101b\u103d\u1031\u1038\u1015\u102a —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input style={S.input} type={type} value={form[fkey] ?? ''} onChange={e => setF(fkey, e.target.value)} placeholder={label} />
      )}
    </div>
  );

  const g2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 };
  const g3 = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 };

  const ModalContent = () => {
    if (!modal) return null;
    const isStu   = modal === 'addStu' || modal === 'editStu';
    const isEdit  = modal === 'editStu' || modal === 'editStaff';
    const grades   = cfg?.grades || [];
    const sections = cfg?.sections || ['A','B','C','D'];
    const houses   = cfg?.houses || [];
    const positions= cfg?.positions || [];
    const depts    = cfg?.departments || [];
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:100, overflowY:'auto', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:16 }}>
        <div style={{ background:'#130f22', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, width:'100%', maxWidth:600, padding:20, marginTop:20, marginBottom:40 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h2 style={{ fontSize:16, fontWeight:900, margin:0 }}>
              {isEdit ? '\u270f\ufe0f ' : '\u2795 '}
              {isStu ? (isEdit ? '\u1000\u103b\u1031\u102c\u1004\u103a\u101e\u102c\u1038 \u1015\u103c\u1004\u103a\u1006\u1004\u103a' : '\u1000\u103b\u1031\u102c\u1004\u103a\u101e\u102c\u1038 \u1021\u101e\u1005\u103a\u1781\u100a\u1037\u1037\u1038') : (isEdit ? '\u101d\u1014\u103a\u1011\u1019\u103a\u1038 \u1015\u103c\u1004\u103a\u1006\u1004\u103a' : '\u101d\u1014\u103a\u1011\u1019\u103a\u1038 \u1021\u101e\u1005\u103a\u1781\u100a\u1037\u1037\u1038')}
            </h2>
            <button style={S.btnSm} onClick={() => setModal(null)}>\u2715 Close</button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
            <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.08)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>
              {form.Photo_URL ? <img src={getPhotoUrl(form.Photo_URL)} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e => e.target.style.display='none'} /> : '\ud83d\udc64'}
            </div>
            <div>
              <label style={S.label}>\u1013\u102c\u1010\u103a\u1015\u102f\u1036</label>
              <input type="file" accept="image/*" style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}
                onChange={e => e.target.files[0] && handlePhotoChange(e.target.files[0])} />
              {uploading && <div style={{ fontSize:10, color:'#fbbf24', marginTop:4 }}>Uploading...</div>}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {isStu ? (
              <>
                <div style={g2}><Field label="Enrollment No." fkey="Enrollment No." required={!isEdit} /><Field label="Password (Login)" fkey="Password" /></div>
                <div style={g2}><Field label="Name (ALL CAPITAL)" fkey="Name (ALL CAPITAL)" required /><Field label="Myanmar Name (\u1021\u1019\u100a\u103a)" fkey="\u1021\u1019\u100a\u103a" /></div>
                <div style={g3}><Field label="Grade" fkey="Grade" options={grades} /><Field label="Section" fkey="Section" options={sections} /><Field label="Class" fkey="Class" /></div>
                <div style={g3}><Field label="House" fkey="House" options={houses} /><Field label="Sex" fkey="Sex" options={cfg?.sexOptions || ['Male','Female']} /><Field label="School/Hostel" fkey="School/Hostel" options={cfg?.schoolHostel || ['School','Hostel']} /></div>
                <div style={g2}><Field label="Date of Birth" fkey="Date of Birth" type="date" /><Field label="Religion" fkey="Religion" options={cfg?.religions || []} /></div>
                <div style={g2}><Field label="Town / City" fkey="Town/City" /><Field label="Phone" fkey="Phone" /></div>
                <div style={g2}><Field label="Father Name" fkey="Father's Name" /><Field label="Mother Name" fkey="Mother's Name" /></div>
                <div style={g2}><Field label="Father Occupation" fkey="Father's Occupation" /><Field label="Mother Occupation" fkey="Mother's Occupation" /></div>
                <div><label style={S.label}>Status</label><select style={S.select} value={String(form.Status)} onChange={e => setF('Status', e.target.value === 'true')}><option value="true">Active</option><option value="false">Inactive</option></select></div>
              </>
            ) : (
              <>
                <div style={g2}><Field label="Staff ID" fkey="Staff_ID" required={!isEdit} /><Field label="Password (Login)" fkey="Password" /></div>
                <div style={g2}><Field label="Name (ALL CAPITAL)" fkey="Name (ALL CAPITAL)" required /><Field label="Display Name" fkey="Name" /></div>
                <div style={g2}><Field label="Position" fkey="Position" options={positions} /><Field label="Department" fkey="Department" options={depts} /></div>
                <div style={g2}><Field label="Phone" fkey="Phone" /><Field label="Email" fkey="Email" type="email" /></div>
                <div><label style={S.label}>Status</label><select style={S.select} value={String(form.Status)} onChange={e => setF('Status', e.target.value === 'true')}><option value="true">Active</option><option value="false">Inactive</option></select></div>
              </>
            )}
            <button style={{ ...S.btn, marginTop:8 }} onClick={isStu ? saveStudent : saveStaff} disabled={saving || uploading}>
              {saving ? 'Saving...' : (isEdit ? '\ud83d\udcbe Update' : '\u2795 Add')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{ ...S.page, alignItems:'center', justifyContent:'center' }}>
      <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.1em' }}>Loading Registry...</div>
    </div>
  );

  const grades = cfg?.grades || ['KG','1','2','3','4','5','6','7','8','9','10','11','12'];

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.btnSm} onClick={() => router.back()}>\u2190 Back</button>
        <h1 style={{ fontSize:15, fontWeight:900, flex:1, margin:0, textTransform:'uppercase', letterSpacing:'0.06em' }}>
          \ud83d\udccb Registry Management
        </h1>
        {isMgt && (
          <button style={S.btn} onClick={tab === 'student' ? openAddStu : openAddStaff}>
            + {tab === 'student' ? 'Add Student' : 'Add Staff'}
          </button>
        )}
      </div>

      {msg && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:200, background: msg.type === 'err' ? '#ef4444' : '#10b981', color:'#fff', padding:'10px 20px', borderRadius:12, fontWeight:900, fontSize:13, maxWidth:340, textAlign:'center', boxShadow:'0 4px 20px rgba(0,0,0,0.3)' }}>
          {msg.text}
        </div>
      )}

      <div style={S.body}>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {['student','staff'].map(t => (
            <button key={t} style={{ padding:'8px 18px', borderRadius:10, border:'none', cursor:'pointer', fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:'0.06em', background: tab === t ? '#fbbf24' : 'rgba(255,255,255,0.06)', color: tab === t ? '#09080f' : 'rgba(255,255,255,0.5)' }}
              onClick={() => { setTab(t); setSearch(''); setFilterGrade('ALL'); }}>
              {t === 'student' ? '\ud83c\udf93 Students' : '\ud83d\udc54 Staff'}
              <span style={{ marginLeft:6, opacity:0.7 }}>({t === 'student' ? students.length : staffList.length})</span>
            </button>
          ))}
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          <input style={{ ...S.input, flex:'1', minWidth:160 }} placeholder="Search name / ID..." value={search} onChange={e => setSearch(e.target.value)} />
          {tab === 'student' && (
            <select style={{ ...S.select, width:'auto' }} value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
              <option value="ALL">All Grades</option>
              {grades.map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          )}
          <select style={{ ...S.select, width:'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {[
            { label:'Active',   count:(tab==='student'?students:staffList).filter(x=>x.Status===true||String(x.Status||'').toUpperCase()==='TRUE').length, color:'#34d399' },
            { label:'Inactive', count:(tab==='student'?students:staffList).filter(x=>x.Status!==true&&String(x.Status||'').toUpperCase()!=='TRUE').length, color:'#f87171' },
            { label:'Showing',  count:tab==='student'?filteredStu.length:filteredStaff.length, color:'#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ padding:'6px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:11 }}>
              <span style={{ fontWeight:900, color:s.color }}>{s.count}</span>
              <span style={{ color:'rgba(255,255,255,0.4)', marginLeft:4 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {tab === 'student' ? (
          filteredStu.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,0.25)', fontSize:13 }}>\u1000\u103b\u1031\u102c\u1004\u103a\u101e\u102c\u1038 \u1019\u1010\u103d\u1031\u1037\u1015\u102a</div>
            : filteredStu.map((s,i) => <PersonCard key={i} item={s} type="student" onEdit={openEditStu} onToggle={toggleStatus} isMgt={isMgt} />)
        ) : (
          filteredStaff.length === 0
            ? <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,0.25)', fontSize:13 }}>\u101d\u1014\u103a\u1011\u1019\u103a\u1038 \u1019\u1010\u103d\u1031\u1037\u1015\u102a</div>
            : filteredStaff.map((s,i) => <PersonCard key={i} item={s} type="staff" onEdit={openEditStaff} onToggle={toggleStatus} isMgt={isMgt} />)
        )}
      </div>

      <ModalContent />
    </div>
  );
}
