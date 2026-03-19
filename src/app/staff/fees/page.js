"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

const GRADES = ['KG','1','2','3','4','5','6','7','8','9','10','11','12'];
const SECTIONS = ['','A','B','C','D','E'];

export default function FeesManagementHub() {
  const router   = useRouter();
  const [tab, setTab]             = useState('single');
  const [staff, setStaff]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState(null);

  const [categories, setCategories] = useState([]);
  const [students, setStudents]     = useState([]);
  const [feeLogs, setFeeLogs]       = useState([]);

  const [search, setSearch]             = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [btnState, setBtnState]         = useState('idle');
  const [activeDue, setActiveDue]       = useState(null);
  const [form, setForm] = useState({
    category:'', amount:'', date: new Date().toISOString().split('T')[0],
    nextAmount:'0', dueDate:'', remark:''
  });

  const [bulkGrade, setBulkGrade]     = useState('');
  const [bulkSection, setBulkSection] = useState('');
  const [bulkCat, setBulkCat]         = useState('');
  const [bulkDate, setBulkDate]       = useState(new Date().toISOString().split('T')[0]);
  const [bulkData, setBulkData]       = useState({});

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    if (!u) { router.push('/login'); return; }
    const checkPerm = (key) => u.userRole==='management' || u[key]===true || String(u[key]||'').toUpperCase()==='TRUE';
    if (u.userRole === 'management') { setStaff(u); fetchAll(); return; }
    if (checkPerm('Can_Manage_Fees')) { setStaff(u); fetchAll(); return; }
    fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getStaffPermissions' }) })
      .then(r=>r.json()).then(res => {
        const fresh = res.success && res.data && res.data.find(s =>
          (s.Staff_ID && s.Staff_ID.toString()===u.Staff_ID?.toString()) ||
          (s.Name && (s.Name===u['Name (ALL CAPITAL)']||s.Name===u.Name)));
        if (fresh) {
          const up={...u,...fresh};
          localStorage.setItem('user',JSON.stringify(up));
          if (!(up['Can_Manage_Fees']===true||String(up['Can_Manage_Fees']||'').toUpperCase()==='TRUE')){router.push('/staff');return;}
          setStaff(up); fetchAll(); return;
        }
        router.push('/staff');
      }).catch(()=>router.push('/staff'));
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catRes, stuRes, feeRes] = await Promise.all([
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getFeeConfig' }) }),
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getData', sheetName:'Student_Directory' }) }),
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getData', sheetName:'Fees_Management' }) }),
      ]);
      const catData = await catRes.json();
      const stuData = await stuRes.json();
      const feeData = await feeRes.json();
      if (catData.success && (catData.categories||[]).length > 0) {
        setCategories(catData.categories || []);
        const first = catData.categories?.[0];
        setForm(f => ({ ...f, category: first?.name||'', amount: String(first?.amount||'') }));
        setBulkCat(first?.name||'');
      } else {
        // Fallback: try old getConfig endpoint
        try {
          const fallbackRes = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getConfig', category:'Fee_Categories' }) });
          const fallbackData = await fallbackRes.json();
          if (fallbackData.success && fallbackData.data?.length > 0) {
            const cats = fallbackData.data.map(r => ({ name: r.Setting_Name||r.Category||r.Name||'', amount: Number(r.Value_1||r.Amount||0) })).filter(c=>c.name);
            if (!cats.find(c=>c.name==='DUE SETTLEMENT')) cats.push({ name:'DUE SETTLEMENT', amount:0 });
            setCategories(cats);
            const first = cats[0];
            setForm(f => ({ ...f, category: first?.name||'', amount: String(first?.amount||'') }));
            setBulkCat(first?.name||'');
          }
        } catch {}
      }
      if (stuData.success) setStudents(stuData.data || []);
      if (feeData.success) setFeeLogs(feeData.data || []);
    } catch {}
    setLoading(false);
  };

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),4000); };

  const currentId = selectedStudent?.['Enrollment No.'] || selectedStudent?.Student_ID || '';
  const ledger    = feeLogs.filter(l => String(l.Student_ID)===String(currentId));
  const paidRecs  = ledger.filter(l => Number(l.Amount_Paid||0)>0).slice().reverse();
  const totalPaid = paidRecs.reduce((s,r) => s+Number(r.Amount_Paid||0), 0);

  useEffect(() => {
    if (!currentId) { setActiveDue(null); return; }
    const last = ledger.length ? ledger[ledger.length-1] : null;
    const due  = Number(last?.Next_Due_Amount||0);
    setActiveDue(due>0 ? { amount:due, dueDate:last?.Next_Due_Date||'' } : null);
  }, [currentId, feeLogs]);

  const handleCatChange = (name) => {
    const cat = categories.find(c => c.name===name);
    setForm(f => ({ ...f, category:name, amount: cat?.amount ? String(cat.amount) : f.amount }));
  };

  const handleSingle = async () => {
    if (!selectedStudent || !form.amount || btnState!=='idle') return;
    setBtnState('processing');
    const payload = [{
      Date: form.date, Student_ID: currentId,
      Name: selectedStudent['Name (ALL CAPITAL)']||selectedStudent.Name||'',
      Grade: selectedStudent.Grade||'',
      Fee_Category: form.category, Amount_Paid: form.amount,
      Next_Due_Date: form.dueDate||'', Next_Due_Amount: form.nextAmount||'0',
      Status:'PAID', Recorded_By: staff?.Name||'', Remark: form.remark
    }];
    try {
      const res  = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'recordNote', sheetName:'Fees_Management', data:payload[0], userRole: staff?.userRole||'staff', staffId: staff?.Staff_ID||staff?.username||'' }) });
      const r    = await res.json();
      if (r.success) {
        setFeeLogs(prev => [...prev, payload[0]]);
        Number(form.nextAmount)===0 ? setActiveDue(null) : setActiveDue({ amount:Number(form.nextAmount), dueDate:form.dueDate||'' });
        setBtnState('success');
        setTimeout(() => {
          setBtnState('idle');
          const first = categories[0];
          setForm({ category:first?.name||'', amount:String(first?.amount||''), date:new Date().toISOString().split('T')[0], nextAmount:'0', dueDate:'', remark:'' });
        }, 1500);
      } else { setBtnState('idle'); showMsg(r.message||'Error','error'); }
    } catch { setBtnState('idle'); showMsg('Network error','error'); }
  };

  const getStudentGrade   = (s) => String(s['Grade']||s['Class']||s['grade']||s['class']||'').replace(/grade\s*/i,'').trim();
  const getStudentSection = (s) => String(s['Section']||s['section']||s['Class_Section']||'').trim();
  const bulkStudents = students.filter(s => {
    if (!bulkGrade) return false;
    const g   = getStudentGrade(s);
    const sec = getStudentSection(s);
    if (g !== String(bulkGrade)) return false;
    if (bulkSection && sec && sec !== bulkSection) return false;
    return true;
  });

  useEffect(() => {
    const init = {};
    const cat  = categories.find(c => c.name===bulkCat);
    bulkStudents.forEach(s => {
      const sid = s['Enrollment No.']||s.Student_ID||'';
      if (sid) init[sid] = { amount: cat?.amount ? String(cat.amount):'', nextAmount:'0', nextDate:'', remark:'' };
    });
    setBulkData(init);
  }, [bulkGrade, bulkSection, bulkCat]);

  const handleBulkCatChange = (name) => {
    setBulkCat(name);
    const cat = categories.find(c => c.name===name);
    setBulkData(prev => {
      const next = {...prev};
      Object.keys(next).forEach(k => { next[k] = {...next[k], amount: cat?.amount ? String(cat.amount) : next[k].amount}; });
      return next;
    });
  };

  const handleBulkSubmit = async () => {
    const entries = bulkStudents.map(s => {
      const sid  = s['Enrollment No.']||s.Student_ID||'';
      const row  = bulkData[sid]||{};
      return { Student_ID:sid, Name:s['Name (ALL CAPITAL)']||s.Name||'', Grade:bulkGrade,
        Fee_Category:bulkCat, Amount_Paid:row.amount||'',
        Next_Due_Amount:row.nextAmount||'0', Next_Due_Date:row.nextDate||'', Remark:row.remark||'' };
    }).filter(e => e.Amount_Paid && Number(e.Amount_Paid)>0);
    if (!entries.length) return showMsg('Amount မထည့်ရသေးပါ','error');
    setSaving(true);
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({
        action:'recordFeesBulk', entries, Date:bulkDate, Recorded_By:staff?.Name||'',
        userRole: staff?.userRole || 'staff', staffId: staff?.Staff_ID || staff?.username || ''
      })});
      const r = await res.json();
      if (r.success) {
        showMsg(r.message||'✓ သိမ်းပြီး');
        setFeeLogs(prev => [...prev, ...entries.map(e=>({...e, Date:bulkDate, Status:'PAID', Recorded_By:staff?.Name||''}))]);
      } else showMsg(r.message||'Error','error');
    } catch { showMsg('Network error','error'); }
    setSaving(false);
  };

  const filteredStudents = search.trim()===''
    ? students.slice(0,8)
    : students.filter(s => {
        const name = (s['Name (ALL CAPITAL)']||s.Name||'').toLowerCase();
        const id   = String(s['Enrollment No.']||s.Student_ID||'');
        return name.includes(search.toLowerCase()) || id.includes(search);
      }).slice(0,10);

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#F0F9FF',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#4c1d95',textTransform:'uppercase',fontStyle:'italic',fontFamily:'system-ui,sans-serif'}}>
      Loading...
    </div>
  );

  const inp = (extra={}) => ({
    width:'100%', background:'#f8fafc', border:'2px solid #f1f5f9', borderRadius:'16px',
    padding:'12px 16px', fontWeight:900, fontStyle:'italic', fontSize:'13px', outline:'none',
    boxSizing:'border-box', fontFamily:'system-ui,sans-serif', color:'#0f172a', ...extra
  });

  const tabBtn = (id, label) => (
    <button onClick={()=>setTab(id)} style={{
      background: tab===id ? '#4c1d95' : 'white',
      color: tab===id ? '#fbbf24' : '#94a3b8',
      border: tab===id ? 'none' : '2px solid #f1f5f9',
      borderRadius:'16px', padding:'8px 18px', fontSize:'10px',
      fontWeight:900, textTransform:'uppercase', cursor:'pointer', whiteSpace:'nowrap',
      fontFamily:'system-ui,sans-serif', fontStyle:'italic', letterSpacing:'0.05em'
    }}>{label}</button>
  );

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100dvh',overflow:'hidden',background:'#F0F9FF',fontFamily:'system-ui,sans-serif'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}input[type=number]{-moz-appearance:textfield}::-webkit-scrollbar{height:4px}::-webkit-scrollbar-thumb{background:#fbbf24;border-radius:4px}`}</style>

      <div style={{background:'#4c1d95',padding:'20px 16px',borderBottom:'8px solid #fbbf24'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',maxWidth:'700px',margin:'0 auto'}}>
          <button onClick={()=>router.back()} style={{width:'44px',height:'44px',background:'#fbbf24',borderRadius:'14px',border:'none',fontSize:'20px',cursor:'pointer',flexShrink:0}}>←</button>
          <div>
            <p style={{color:'white',fontWeight:900,fontSize:'22px',fontStyle:'italic',textTransform:'uppercase',letterSpacing:'-0.02em',margin:0}}>Fees Hub</p>
            <p style={{color:'rgba(255,255,255,0.4)',fontSize:'9px',textTransform:'uppercase',fontWeight:900,margin:0}}>Shining Stars</p>
          </div>
        </div>
      </div>
      <div style={{flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', paddingBottom:'80px'}}>

      {msg && (
        <div style={{position:'fixed',top:'12px',left:'50%',transform:'translateX(-50%)',zIndex:50,padding:'8px 20px',borderRadius:'999px',fontSize:'12px',fontWeight:900,color:'white',background:msg.type==='error'?'#ef4444':'#10b981',boxShadow:'0 4px 20px rgba(0,0,0,0.2)',whiteSpace:'nowrap',fontStyle:'italic'}}>
          {msg.text}
        </div>
      )}

      <div style={{maxWidth:'700px',margin:'0 auto',padding:'16px'}}>
        <div style={{display:'flex',gap:'8px',marginBottom:'16px',overflowX:'auto',paddingBottom:'4px'}}>
          {tabBtn('single','👤 Single')}
          {tabBtn('bulk','📋 Bulk Entry')}
          {tabBtn('ledger','📒 Ledger')}
        </div>

        {/* ══ SINGLE ══ */}
        {tab==='single' && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'white',borderRadius:'28px',padding:'20px',boxShadow:'0 2px 12px rgba(0,0,0,0.05)',borderBottom:'4px solid #f1f5f9'}}>
              <p style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',color:'#94a3b8',fontStyle:'italic',marginBottom:'10px'}}>1. Select Student</p>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="SEARCH NAME OR ID..." style={inp({marginBottom:'10px'})}/>
              {selectedStudent && (
                <div style={{background:'#fbbf24',borderRadius:'16px',padding:'10px 14px',marginBottom:'10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <p style={{fontWeight:900,fontSize:'13px',fontStyle:'italic',margin:0}}>{selectedStudent['Name (ALL CAPITAL)']||selectedStudent.Name}</p>
                    <p style={{fontSize:'9px',opacity:0.7,fontWeight:900,margin:0}}>ID: {currentId} · Grade {selectedStudent.Grade}</p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontSize:'9px',fontWeight:900,margin:0}}>Total Paid</p>
                    <p style={{fontWeight:900,fontSize:'14px',fontStyle:'italic',margin:0}}>{totalPaid.toLocaleString()} MMK</p>
                  </div>
                </div>
              )}
              {activeDue && (
                <div style={{background:'#fef2f2',border:'2px solid #fecaca',borderRadius:'16px',padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <div>
                    <p style={{fontSize:'9px',fontWeight:900,color:'#ef4444',textTransform:'uppercase',margin:0}}>Outstanding Due</p>
                    <p style={{fontWeight:900,fontSize:'16px',color:'#ef4444',fontStyle:'italic',margin:0}}>{activeDue.amount.toLocaleString()} MMK</p>
                  </div>
                  <button onClick={()=>setForm(f=>({...f,category:'DUE SETTLEMENT',amount:String(activeDue.amount),remark:`Settlement — due ${activeDue.dueDate}`,nextAmount:'0',tab:'single'}))}
                    style={{background:'#ef4444',color:'white',border:'none',borderRadius:'12px',padding:'8px 14px',fontWeight:900,fontSize:'10px',cursor:'pointer',fontStyle:'italic',textTransform:'uppercase'}}>
                    Settle ⚡
                  </button>
                </div>
              )}
              <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'4px'}}>
                {filteredStudents.map((s,i)=>{
                  const sid=s['Enrollment No.']||s.Student_ID||'';
                  const active=String(currentId)===String(sid);
                  return (
                    <button key={i} onClick={()=>setSelectedStudent(s)} style={{flexShrink:0,padding:'8px 14px',borderRadius:'14px',border:active?'none':'2px solid #f1f5f9',background:active?'#4c1d95':'#f8fafc',color:active?'white':'#64748b',cursor:'pointer',fontWeight:900,fontStyle:'italic',fontSize:'11px',textAlign:'left'}}>
                      <p style={{fontSize:'8px',opacity:0.6,margin:0}}>ID:{sid}</p>
                      <p style={{margin:0,whiteSpace:'nowrap'}}>{s['Name (ALL CAPITAL)']||s.Name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{background:'white',borderRadius:'28px',padding:'20px',boxShadow:'0 2px 12px rgba(0,0,0,0.05)',borderBottom:'8px solid #0f172a',display:'flex',flexDirection:'column',gap:'12px'}}>
              <p style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',color:'#6366f1',fontStyle:'italic',margin:0}}>2. Payment Entry</p>
              <div>
                <label style={{fontSize:'9px',fontWeight:900,color:'#94a3b8',textTransform:'uppercase',fontStyle:'italic',display:'block',marginBottom:'4px'}}>Date</label>
                <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={inp()}/>
              </div>
              <div>
                <label style={{fontSize:'9px',fontWeight:900,color:'#94a3b8',textTransform:'uppercase',fontStyle:'italic',display:'block',marginBottom:'4px'}}>Category</label>
                <select value={form.category} onChange={e=>handleCatChange(e.target.value)} style={inp()}>
                  {categories.map((c,i)=><option key={i} value={c.name}>{c.name}{c.amount>0?` — ${c.amount.toLocaleString()} MMK`:''}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'9px',fontWeight:900,color:'#94a3b8',textTransform:'uppercase',fontStyle:'italic',display:'block',marginBottom:'4px'}}>Amount (MMK)</label>
                <input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} style={inp({fontSize:'22px',color:'#16a34a'})}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'9px',fontWeight:900,color:'#ef4444',textTransform:'uppercase',fontStyle:'italic',display:'block',marginBottom:'4px'}}>Next Due MMK</label>
                  <input type="number" value={form.nextAmount} onChange={e=>setForm(f=>({...f,nextAmount:e.target.value}))} style={inp({color:'#ef4444',background:'#fef2f2',border:'2px solid #fecaca'})}/>
                </div>
                <div>
                  <label style={{fontSize:'9px',fontWeight:900,color:'#ef4444',textTransform:'uppercase',fontStyle:'italic',display:'block',marginBottom:'4px'}}>Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={inp({color:'#ef4444',background:'#fef2f2',border:'2px solid #fecaca'})}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:'9px',fontWeight:900,color:'#94a3b8',textTransform:'uppercase',fontStyle:'italic',display:'block',marginBottom:'4px'}}>Remark</label>
                <input value={form.remark} onChange={e=>setForm(f=>({...f,remark:e.target.value}))} style={inp()}/>
              </div>
              <button onClick={handleSingle} disabled={!selectedStudent||!form.amount||btnState!=='idle'}
                style={{width:'100%',padding:'18px',borderRadius:'20px',border:'none',borderBottom:'8px solid',cursor:(!selectedStudent||!form.amount)?'not-allowed':'pointer',fontWeight:900,fontSize:'14px',fontStyle:'italic',textTransform:'uppercase',letterSpacing:'0.04em',fontFamily:'system-ui,sans-serif',
                  ...(btnState==='idle'       ? {background:'#0f172a',color:'white',borderColor:'#4338ca',opacity:(!selectedStudent||!form.amount)?0.4:1} :
                     btnState==='processing'  ? {background:'#fbbf24',color:'#0f172a',borderColor:'#d97706'} :
                                               {background:'#10b981',color:'white',borderColor:'#047857'})
                }}>
                {btnState==='idle' && '★ Record Payment'}
                {btnState==='processing' && <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}><span style={{width:'16px',height:'16px',border:'3px solid rgba(0,0,0,0.2)',borderTop:'3px solid #0f172a',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>Processing...</span>}
                {btnState==='success' && '✓ Recorded'}
              </button>
            </div>
          </div>
        )}

        {/* ══ BULK ══ */}
        {tab==='bulk' && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'white',borderRadius:'28px',padding:'20px',boxShadow:'0 2px 12px rgba(0,0,0,0.05)',borderBottom:'4px solid #f1f5f9'}}>
              <p style={{fontSize:'9px',fontWeight:900,textTransform:'uppercase',color:'#94a3b8',fontStyle:'italic',marginBottom:'12px'}}>Filter</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                <div>
                  <label style={{fontSize:'9px',fontWeight:900,color:'#94a3b8',display:'block',marginBottom:'4px',textTransform:'uppercase',fontStyle:'italic'}}>Grade</label>
                  <select value={bulkGrade} onChange={e=>setBulkGrade(e.target.value)} style={inp()}>
                    <option value="">— Grade —</option>
                    {GRADES.map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'9px',fontWeight:900,color:'#94a3b8',display:'block',marginBottom:'4px',textTransform:'uppercase',fontStyle:'italic'}}>Section</label>
                  <select value={bulkSection} onChange={e=>setBulkSection(e.target.value)} style={inp()}>
                    {SECTIONS.map(s=><option key={s} value={s}>{s===''?'All':s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'9px',fontWeight:900,color:'#94a3b8',display:'block',marginBottom:'4px',textTransform:'uppercase',fontStyle:'italic'}}>Category</label>
                  <select value={bulkCat} onChange={e=>handleBulkCatChange(e.target.value)} style={inp()}>
                    {categories.filter(c=>c.name!=='DUE SETTLEMENT').map((c,i)=><option key={i} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'9px',fontWeight:900,color:'#94a3b8',display:'block',marginBottom:'4px',textTransform:'uppercase',fontStyle:'italic'}}>Date</label>
                  <input type="date" value={bulkDate} onChange={e=>setBulkDate(e.target.value)} style={inp()}/>
                </div>
              </div>
            </div>

            {bulkGrade && bulkStudents.length===0 && (
              <div style={{background:'white',borderRadius:'20px',padding:'30px',textAlign:'center',color:'#94a3b8',fontWeight:900,fontStyle:'italic',fontSize:'13px'}}>
                Grade {bulkGrade}{bulkSection?` (${bulkSection})`:''} — Student မတွေ့ပါ
              </div>
            )}

            {bulkGrade && bulkStudents.length>0 && (<>
              <div style={{background:'white',borderRadius:'24px',overflow:'hidden',boxShadow:'0 2px 12px rgba(0,0,0,0.05)'}}>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',fontFamily:'system-ui,sans-serif'}}>
                    <thead>
                      <tr style={{background:'#0f172a',color:'white'}}>
                        <th style={{padding:'10px 14px',textAlign:'left',fontWeight:900,fontSize:'9px',textTransform:'uppercase',fontStyle:'italic',position:'sticky',left:0,background:'#0f172a',zIndex:5,whiteSpace:'nowrap'}}>Name</th>
                        <th style={{padding:'10px 8px',fontWeight:900,fontSize:'9px',textTransform:'uppercase',fontStyle:'italic',textAlign:'center',minWidth:'110px'}}>Amount (MMK)</th>
                        <th style={{padding:'10px 8px',fontWeight:900,fontSize:'9px',textTransform:'uppercase',fontStyle:'italic',textAlign:'center',minWidth:'100px'}}>Next Due</th>
                        <th style={{padding:'10px 8px',fontWeight:900,fontSize:'9px',textTransform:'uppercase',fontStyle:'italic',textAlign:'center',minWidth:'120px'}}>Due Date</th>
                        <th style={{padding:'10px 8px',fontWeight:900,fontSize:'9px',textTransform:'uppercase',fontStyle:'italic',textAlign:'center',minWidth:'110px'}}>Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkStudents.map((s,i)=>{
                        const sid  = s['Enrollment No.']||s.Student_ID||'';
                        const name = s['Name (ALL CAPITAL)']||s.Name||'';
                        const row  = bulkData[sid]||{};
                        const hasAmt = row.amount && Number(row.amount)>0;
                        return (
                          <tr key={sid} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#f8fafc'}}>
                            <td style={{padding:'8px 14px',position:'sticky',left:0,background:i%2===0?'white':'#f8fafc',zIndex:4}}>
                              <p style={{fontWeight:900,fontSize:'11px',fontStyle:'italic',margin:0,whiteSpace:'nowrap'}}>{name}</p>
                              <p style={{fontSize:'8px',color:'#94a3b8',fontWeight:900,margin:0}}>{sid}</p>
                            </td>
                            <td style={{padding:'4px'}}>
                              <input type="number" value={row.amount||''} placeholder="0"
                                onChange={e=>setBulkData(p=>({...p,[sid]:{...(p[sid]||{}),amount:e.target.value}}))}
                                style={{width:'102px',background:hasAmt?'#f0fdf4':'#f8fafc',border:`2px solid ${hasAmt?'#bbf7d0':'#f1f5f9'}`,borderRadius:'12px',padding:'8px',fontWeight:900,fontStyle:'italic',fontSize:'13px',color:hasAmt?'#16a34a':'#0f172a',outline:'none',textAlign:'center',boxSizing:'border-box',fontFamily:'system-ui'}}/>
                            </td>
                            <td style={{padding:'4px'}}>
                              <input type="number" value={row.nextAmount||''} placeholder="0"
                                onChange={e=>setBulkData(p=>({...p,[sid]:{...(p[sid]||{}),nextAmount:e.target.value}}))}
                                style={{width:'92px',background:'#fef2f2',border:'2px solid #fecaca',borderRadius:'12px',padding:'8px',fontWeight:900,fontStyle:'italic',fontSize:'12px',color:'#ef4444',outline:'none',textAlign:'center',boxSizing:'border-box',fontFamily:'system-ui'}}/>
                            </td>
                            <td style={{padding:'4px'}}>
                              <input type="date" value={row.nextDate||''}
                                onChange={e=>setBulkData(p=>({...p,[sid]:{...(p[sid]||{}),nextDate:e.target.value}}))}
                                style={{width:'116px',background:'#fef2f2',border:'2px solid #fecaca',borderRadius:'12px',padding:'8px',fontWeight:900,fontStyle:'italic',fontSize:'11px',color:'#ef4444',outline:'none',boxSizing:'border-box',fontFamily:'system-ui'}}/>
                            </td>
                            <td style={{padding:'4px'}}>
                              <input value={row.remark||''} placeholder="..."
                                onChange={e=>setBulkData(p=>({...p,[sid]:{...(p[sid]||{}),remark:e.target.value}}))}
                                style={{width:'102px',background:'#f8fafc',border:'2px solid #f1f5f9',borderRadius:'12px',padding:'8px',fontWeight:900,fontStyle:'italic',fontSize:'11px',color:'#0f172a',outline:'none',boxSizing:'border-box',fontFamily:'system-ui'}}/>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <button onClick={handleBulkSubmit} disabled={saving}
                style={{width:'100%',padding:'18px',borderRadius:'20px',border:'none',borderBottom:'8px solid #4338ca',background:'#0f172a',color:'white',fontWeight:900,fontSize:'14px',fontStyle:'italic',textTransform:'uppercase',cursor:saving?'default':'pointer',opacity:saving?0.6:1,letterSpacing:'0.04em',fontFamily:'system-ui'}}>
                {saving?'⏳ Saving...':`💾 Save All (${bulkStudents.length} ဦး)`}
              </button>
            </>)}
          </div>
        )}

        {/* ══ LEDGER ══ */}
        {tab==='ledger' && (
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <div style={{background:'white',borderRadius:'20px',padding:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="SEARCH NAME OR ID..." style={inp({marginBottom:'10px'})}/>
              <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'4px'}}>
                {filteredStudents.map((s,i)=>{
                  const sid=s['Enrollment No.']||s.Student_ID||'';
                  const active=String(currentId)===String(sid);
                  return (
                    <button key={i} onClick={()=>setSelectedStudent(s)} style={{flexShrink:0,padding:'8px 14px',borderRadius:'14px',border:active?'none':'2px solid #f1f5f9',background:active?'#4c1d95':'#f8fafc',color:active?'white':'#64748b',cursor:'pointer',fontWeight:900,fontStyle:'italic',fontSize:'11px',textAlign:'left'}}>
                      <p style={{fontSize:'8px',opacity:0.6,margin:0}}>{sid}</p>
                      <p style={{margin:0,whiteSpace:'nowrap'}}>{s['Name (ALL CAPITAL)']||s.Name}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedStudent && (
              <div style={{background:'#0f172a',borderRadius:'28px',padding:'20px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'14px'}}>
                  <div>
                    <p style={{color:'#fbbf24',fontSize:'13px',fontWeight:900,fontStyle:'italic',margin:0}}>{selectedStudent['Name (ALL CAPITAL)']||selectedStudent.Name}</p>
                    <p style={{color:'rgba(255,255,255,0.3)',fontSize:'9px',fontWeight:900,margin:0}}>ID: {currentId} · Grade {selectedStudent.Grade}</p>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <p style={{color:'rgba(255,255,255,0.4)',fontSize:'8px',textTransform:'uppercase',fontWeight:900,margin:0}}>Total Paid</p>
                    <p style={{color:'white',fontSize:'16px',fontWeight:900,fontStyle:'italic',margin:0}}>{totalPaid.toLocaleString()} MMK</p>
                  </div>
                </div>
                {activeDue && (
                  <div style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'16px',padding:'12px',marginBottom:'12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <p style={{color:'#f87171',fontSize:'8px',fontWeight:900,textTransform:'uppercase',margin:0}}>Outstanding Due</p>
                      <p style={{color:'#f87171',fontSize:'16px',fontWeight:900,fontStyle:'italic',margin:0}}>{activeDue.amount.toLocaleString()} MMK</p>
                    </div>
                    <p style={{color:'rgba(255,255,255,0.3)',fontSize:'9px',fontWeight:900,margin:0}}>Due: {activeDue.dueDate||'—'}</p>
                  </div>
                )}
                {paidRecs.length===0 ? (
                  <p style={{color:'rgba(255,255,255,0.2)',textAlign:'center',padding:'20px 0',fontWeight:900,fontStyle:'italic',fontSize:'12px'}}>No payment history</p>
                ) : paidRecs.map((log,i)=>(
                  <div key={i} style={{background:'white',borderRadius:'16px',padding:'14px',marginBottom:'8px',borderBottom:'4px solid #e0e7ff'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'4px'}}>
                      <span style={{background:'#dcfce7',color:'#15803d',fontSize:'7px',fontWeight:900,textTransform:'uppercase',padding:'2px 8px',borderRadius:'99px'}}>PAID</span>
                      <span style={{color:'#94a3b8',fontSize:'9px',fontWeight:900,fontStyle:'italic'}}>{log.Date}</span>
                    </div>
                    <p style={{color:'#4c1d95',fontSize:'9px',fontWeight:900,textTransform:'uppercase',fontStyle:'italic',margin:'4px 0'}}>{log.Fee_Category}</p>
                    <p style={{color:'#0f172a',fontSize:'20px',fontWeight:900,fontStyle:'italic',margin:0}}>{Number(log.Amount_Paid||0).toLocaleString()} <span style={{fontSize:'10px'}}>MMK</span></p>
                    {log.Remark&&<p style={{color:'#94a3b8',fontSize:'9px',fontWeight:900,fontStyle:'italic',margin:'4px 0 0'}}>※ {log.Remark}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}