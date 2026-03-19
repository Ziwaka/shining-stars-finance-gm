"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

// ── Date Formatter ──────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '-';
  try {
    const match = String(d).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return String(d);
    const [, yyyy, mm, dd] = match;
    const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    const day = dt.toLocaleDateString('en-US', { weekday: 'long' });
    return `${dd}/${mm}/${yyyy}, ${day}`;
  } catch { return String(d); }
};
const fmtShort = (d) => {
  if (!d) return '-';
  try {
    const match = String(d).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return String(d);
    const [, yyyy, mm, dd] = match;
    return `${dd}/${mm}/${yyyy}`;
  } catch { return String(d); }
};
const fmtDateTime = (d) => {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    const pad = n => String(n).padStart(2,'0');
    return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  } catch { return String(d); }
};

// ── Constants ───────────────────────────────────────────────────
const CONDITIONS = ['Good', 'Fair', 'Damaged'];
const UNITS      = ['Pcs', 'Box', 'Set', 'Bottle', 'Pack', 'Roll', 'Kg', 'Liter', 'Ream', 'Dozen'];
const ITEM_TYPES = [
  { v:'Expense', label:'🧻 Expense', desc:'Consumables — chalk, paper, cleaning', color:'#34d399', bg:'rgba(52,211,153,0.12)',  border:'rgba(52,211,153,0.3)' },
  { v:'Capital', label:'🪑 Capital', desc:'Long-term assets — furniture, boards',  color:'#60a5fa', bg:'rgba(96,165,250,0.12)',  border:'rgba(96,165,250,0.3)' },
  { v:'Tool',    label:'🔧 Tool',    desc:'Equipment with serial & warranty',      color:'#c084fc', bg:'rgba(192,132,252,0.12)', border:'rgba(192,132,252,0.3)' },
];
const TYPE_COLOR = { Expense:'#34d399', Capital:'#60a5fa', Tool:'#c084fc' };
const TYPE_ICON  = { Expense:'🧻', Capital:'🪑', Tool:'🔧' };
const LOG_ACTIONS = ['Use','Restock','Transfer','Repair','Write-off','Other'];
const REQ_STATUSES = ['All','Pending','Approved','Rejected'];

const resolveType = (item) => {
  if (item.Item_Type && ['Expense','Capital','Tool'].includes(item.Item_Type)) return item.Item_Type;
  if (item.Is_Tool === 'TRUE' || item.Is_Tool === true) return 'Tool';
  return 'Expense';
};

const EMPTY_FORM = {
  Item_Name:'', Category:'Stationery', Unit:'Pcs', Stock_Qty:'', Min_Stock:'',
  Unit_Price:'', Condition:'Good', Item_Type:'Expense', Serial_No:'', Purchase_Date:'',
  Warranty_Until:'', Useful_Life_Years:'', Location:'', Assigned_To:'', Note:'', Photo_URL:'',
  Bulk_Quantity: 1
};

const daysUntil = (d) => { if (!d) return null; return Math.ceil((new Date(d)-new Date())/(864e5)); };
const depreciatedValue = (price, purchaseDate, usefulYears) => {
  if (!price||!purchaseDate||!usefulYears) return null;
  const age = (new Date()-new Date(purchaseDate))/(864e5*365);
  return Math.round(Number(price) * Math.max(0, 1 - age/Number(usefulYears)));
};

// ── Styles ──────────────────────────────────────────────────────
const S = {
  page:    { display:'flex', flexDirection:'column', flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', background:'#09080f', color:'#fff', fontFamily:'system-ui,sans-serif' },
  header:  { position:'sticky', top:0, zIndex:40, background:'rgba(9,8,15,0.96)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(255,255,255,0.06)', padding:'11px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' },
  card:    { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'18px', padding:'16px' },
  cardHL:  { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:'18px', padding:'16px' },
  input:   { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  select:  { width:'100%', background:'#130f22', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  label:   { display:'block', fontSize:'9px', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:'5px', fontWeight:900 },
  btn:     { background:'#fbbf24', color:'#09080f', border:'none', borderRadius:'12px', padding:'12px', fontSize:'12px', fontWeight:900, width:'100%', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' },
  btnSm:   { background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'9px', padding:'6px 12px', fontSize:'10px', fontWeight:900, cursor:'pointer', textTransform:'uppercase' },
  btnRed:  { background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'9px', padding:'6px 12px', fontSize:'10px', fontWeight:900, cursor:'pointer' },
  btnGreen:{ background:'rgba(52,211,153,0.15)', color:'#34d399', border:'1px solid rgba(52,211,153,0.2)', borderRadius:'9px', padding:'6px 12px', fontSize:'10px', fontWeight:900, cursor:'pointer' },
  pill:    (color) => ({ background:`${color}18`, color, border:`1px solid ${color}40`, borderRadius:'99px', padding:'2px 8px', fontSize:'9px', fontWeight:900, display:'inline-block' }),
};

// ── Modal Wrapper ──────────────────────────────────────────────
const Modal = ({ onClose, children, title }) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:'#130f22',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'24px 24px 0 0',padding:'20px 20px 32px',width:'100%',maxWidth:'480px',maxHeight:'85vh',overflowY:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <p style={{fontWeight:900,fontSize:'14px',margin:0}}>{title}</p>
        <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'20px',cursor:'pointer',padding:'0 4px'}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ── Stat Card ───────────────────────────────────────────────────
const StatCard = ({ icon, value, label, sub, color='#fff', alert, onClick }) => (
  <div onClick={onClick} style={{...alert?S.cardHL:S.card, cursor:onClick?'pointer':'default', transition:'opacity 0.15s'}}
    onMouseEnter={e=>{ if(onClick) e.currentTarget.style.opacity='0.8'; }}
    onMouseLeave={e=>{ e.currentTarget.style.opacity='1'; }}>
    <div style={{fontSize:'22px',marginBottom:'6px'}}>{icon}</div>
    <div style={{fontSize:'22px',fontWeight:900,color,lineHeight:1,marginBottom:'3px'}}>{value}</div>
    <div style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:900}}>{label}</div>
    {sub&&<div style={{fontSize:'9px',color:'rgba(255,255,255,0.18)',marginTop:'2px'}}>{sub}</div>}
  </div>
);

// ── Item Card ───────────────────────────────────────────────────
const ItemCard = ({ item, onDetail, onEdit, onUsage, onTransfer, onRequest }) => {
  const tc   = ITEM_TYPES.find(t=>t.v===item.Item_Type)||ITEM_TYPES[0];
  const low  = item.Item_Type==='Expense' && Number(item.Min_Stock)>0 && Number(item.Stock_Qty)<=Number(item.Min_Stock);
  const wDays = daysUntil(item.Warranty_Until);
  const wExp  = wDays!==null && wDays<=30 && wDays>=0;
  const cv    = depreciatedValue(item.Unit_Price, item.Purchase_Date, item.Useful_Life_Years);

  return (
    <div style={{...S.card, borderColor: low||wExp ? 'rgba(251,191,36,0.35)' : S.card.border, marginBottom:'10px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'6px',flexWrap:'wrap',marginBottom:'4px'}}>
            <span style={S.pill(tc.color)}>{TYPE_ICON[item.Item_Type]} {item.Item_Type}</span>
            {low  && <span style={S.pill('#fbbf24')}>⚠ Low Stock</span>}
            {wExp && <span style={S.pill('#f87171')}>⏳ Warranty {wDays}d</span>}
          </div>
          <p style={{fontWeight:900,fontSize:'14px',margin:'0 0 2px',lineHeight:1.2}}>{item.Item_Name}</p>
          <p style={{fontSize:'10px',color:'rgba(255,255,255,0.35)',margin:0}}>{item.Category||'—'} · {item.Location||'No location'}</p>
        </div>
        {item.Photo_URL && <img src={item.Photo_URL} alt="" style={{width:'48px',height:'48px',borderRadius:'10px',objectFit:'cover',flexShrink:0}}/>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px',marginTop:'12px'}}>
        {item.Item_Type==='Expense' ? (<>
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:'16px',fontWeight:900,color: low?'#fbbf24':'#34d399'}}>{item.Stock_Qty||0}</div>
            <div style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>Stock</div>
          </div>
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:'13px',fontWeight:900,color:'rgba(255,255,255,0.5)'}}>{item.Min_Stock||'—'}</div>
            <div style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>Min</div>
          </div>
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:'13px',fontWeight:900,color:tc.color}}>{item.Unit_Price?Number(item.Unit_Price).toLocaleString()+' ks':'—'}</div>
            <div style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>Unit Price</div>
          </div>
        </>) : (<>
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:'13px',fontWeight:900,color:tc.color}}>{item.Unit_Price?Number(item.Unit_Price).toLocaleString()+' ks':'—'}</div>
            <div style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>Cost</div>
          </div>
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:'13px',fontWeight:900,color:'#a78bfa'}}>{cv!==null?cv.toLocaleString()+' ks':'—'}</div>
            <div style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>Cur. Value</div>
          </div>
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'8px',textAlign:'center'}}>
            <div style={{fontSize:'13px',fontWeight:900,color:wExp?'#f87171':'rgba(255,255,255,0.5)'}}>{item.Condition||'—'}</div>
            <div style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>Condition</div>
          </div>
        </>)}
      </div>

      <div style={{display:'flex',gap:'6px',marginTop:'10px',flexWrap:'wrap'}}>
        <button onClick={()=>onDetail(item)} style={{...S.btnSm,flex:1}}>🔍 Details</button>
        {item.Item_Type==='Expense' && (<>
          <button onClick={()=>onUsage(item,'Use')}     style={{...S.btnRed,  flex:1}}>📤 Use</button>
          <button onClick={()=>onUsage(item,'Restock')} style={{...S.btnGreen,flex:1}}>📥 Restock</button>
        </>)}
        {(item.Item_Type==='Capital'||item.Item_Type==='Tool') && (
          <button onClick={()=>onTransfer(item)} style={{...S.btnSm,flex:1}}>📦 Transfer</button>
        )}
        <button onClick={()=>onEdit(item)} style={{...S.btnSm}}>✏️</button>
        <button onClick={()=>onRequest(item)} style={{...S.btnSm}}>🛒</button>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────
export default function InventoryPage() {
  const router = useRouter();

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [user,          setUser]          = useState(null);
  const [items,         setItems]         = useState([]);
  const [logs,          setLogs]          = useState([]);
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);

  const [tab,           setTab]           = useState('dashboard');
  const [saving,        setSaving]        = useState(false);
  const [msg,           setMsg]           = useState(null);

  const [typeFilter,    setTypeFilter]    = useState('All');
  const [catFilter,     setCatFilter]     = useState('All');
  const [locFilter,     setLocFilter]     = useState('All');
  const [condFilter,    setCondFilter]    = useState('All');
  const [search,        setSearch]        = useState('');
  const [sortBy,        setSortBy]        = useState('name');

  const [logSearch,     setLogSearch]     = useState('');
  const [logAction,     setLogAction]     = useState('All');
  const [logDateFrom,   setLogDateFrom]   = useState('');
  const [logDateTo,     setLogDateTo]     = useState('');

  const [reqStatus,     setReqStatus]     = useState('All');

  const [invCategories, setInvCategories] = useState(['Stationery','Cleaning','Furniture','Tool','Electronics','Other']);
  const [invLocations,  setInvLocations]  = useState(['Store Room','Office','Classroom','Lab','Gym','Library']);

  const [form,          setForm]          = useState(EMPTY_FORM);
  const [editItem,      setEditItem]      = useState(null);
  const [photoPreview,  setPhotoPreview]  = useState(null);
  const [photoUploading,setPhotoUploading]= useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);

  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const [detailModal,   setDetailModal]   = useState(null);
  const [detailHistory, setDetailHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [usageModal,    setUsageModal]    = useState(null);
  const [usageAction,   setUsageAction]   = useState('Use');
  const [usageQty,      setUsageQty]      = useState('');
  const [usageNote,     setUsageNote]     = useState('');
  const [transferModal, setTransferModal] = useState(null);
  const [transferLoc,   setTransferLoc]   = useState('');
  const [transferNote,  setTransferNote]  = useState('');
  const [requestModal,  setRequestModal]  = useState(null);
  const [requestQty,    setRequestQty]    = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [configModal,   setConfigModal]   = useState(null);
  const [configNew,     setConfigNew]     = useState('');
  const [configSaving,  setConfigSaving]  = useState(false);

  // ── Auth ──
  useEffect(() => {
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    const u = JSON.parse(saved);
    if (u.userRole !== 'staff' && u.userRole !== 'management') { router.push('/login'); return; }
    const checkPerm = (k) => u.userRole==='management'||u[k]===true||String(u[k]||'').toUpperCase()==='TRUE';
    if (u.userRole==='management') { setUser(u); fetchAll(); return; }
    if (checkPerm('Can_Manage_Inventory')) { setUser(u); fetchAll(); return; }
    fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getStaffPermissions'})})
      .then(r=>r.json()).then(res=>{
        const fresh=res.success&&res.data?.find(s=>
          (s.Staff_ID&&s.Staff_ID.toString()===u.Staff_ID?.toString())||
          (s.Name&&(s.Name===u['Name (ALL CAPITAL)']||s.Name===u.Name)));
        if(fresh){
          const up={...u,...fresh};
          localStorage.setItem('user',JSON.stringify(up));
          if(!(up['Can_Manage_Inventory']===true||String(up['Can_Manage_Inventory']||'').toUpperCase()==='TRUE')){router.push('/staff');return;}
          setUser(up);fetchAll();return;
        }
        router.push('/staff');
      }).catch(()=>router.push('/staff'));
  },[]);

  // ── Fetch ──
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [invRes,logRes,cfgRes,reqRes] = await Promise.all([
        fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getInventory'})}),
        fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getInventoryLog'})}),
        fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getInventoryConfig'})}),
        fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getPurchaseRequests'})}),
      ]);
      const inv=await invRes.json(), log=await logRes.json(),
            cfg=await cfgRes.json(), req=await reqRes.json();
      if(inv.success) setItems((inv.data||[]).map(i=>({...i,Item_Type:resolveType(i)})));
      if(log.success) setLogs(log.data||[]);
      if(cfg.success){ if(cfg.categories?.length) setInvCategories(cfg.categories); if(cfg.locations?.length) setInvLocations(cfg.locations); }
      if(req.success) setRequests(req.data||[]);
    } catch {}
    setLoading(false);
  };

  const showMsg = (text, type='success') => { setMsg({text,type}); setTimeout(()=>setMsg(null),3000); };

  // ── Camera functions (FIXED) ──
  useEffect(() => {
    if (showCamera && videoRef.current && !cameraStream) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        .then(stream => {
          videoRef.current.srcObject = stream;
          setCameraStream(stream);
        })
        .catch(error => {
          showMsg('Camera access denied', 'error');
          setShowCamera(false);
        });
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera]);

  const startCamera = () => {
    setShowCamera(true);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      handleCapturedPhoto(base64);
      stopCamera();
    }
  };

  const handleCapturedPhoto = async (base64) => {
    setPhotoUploading(true);
    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ 
          action: 'uploadPhoto', 
          base64, 
          filename: 'inventory_capture_' + Date.now() + '.jpg', 
          mimeType: 'image/jpeg',
          folder: 'inventory'
        })
      });
      const r = await res.json();
      if (r.success) {
        setForm(f => ({ ...f, Photo_URL: r.photoUrl }));
        setPhotoPreview(r.photoUrl);
        showMsg('ဓာတ်ပုံ တင်ပြီးပါပြီ ✓');
      } else {
        showMsg(r.message || 'Upload failed', 'error');
      }
    } catch {
      showMsg('Network error', 'error');
    }
    setPhotoUploading(false);
  };

  // ── Actions ──
  const handleUsageLog = async () => {
    if(!usageQty) return showMsg('Quantity ထည့်ပါ','error');
    setSaving(true);
    const qtyChange = usageAction==='Use' ? -Math.abs(Number(usageQty)) : Math.abs(Number(usageQty));
    try {
      const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'logInventoryUsage',Item_ID:usageModal.Item_ID,Item_Name:usageModal.Item_Name,Qty_Change:qtyChange,Action:usageAction,Done_By:user?.Name||user?.username,Note:usageNote,userRole:user?.userRole||'staff',staffId:user?.Staff_ID||user?.username||''})});
      const r=await res.json();
      if(r.success){showMsg('Log တင်ပြီးပါပြီ ✓');fetchAll();setUsageModal(null);setUsageQty('');setUsageNote('');}
      else showMsg(r.message||'Error','error');
    } catch{showMsg('Network error','error');}
    setSaving(false);
  };

  const handleTransfer = async () => {
    if(!transferLoc) return showMsg('Location ရွေးပါ','error');
    setSaving(true);
    try {
      const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'transferInventoryItem',Item_ID:transferModal.Item_ID,Item_Name:transferModal.Item_Name,New_Location:transferLoc,Done_By:user?.Name||user?.username||'',Note:transferNote})});
      const r=await res.json();
      if(r.success){showMsg('Transfer ပြီးပါပြီ ✓');setTransferModal(null);setTransferLoc('');setTransferNote('');fetchAll();}
      else showMsg(r.message||'Error','error');
    } catch{showMsg('Network error','error');}
    setSaving(false);
  };

  const handleRequest = async () => {
    if(!requestQty)    return showMsg('Quantity ထည့်ပါ','error');
    if(!requestReason) return showMsg('Reason ထည့်ပါ','error');
    setSaving(true);
    try {
      const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'submitPurchaseRequest',Item_Name:requestModal.Item_Name,Category:requestModal.Category,Qty:requestQty,Unit:requestModal.Unit,Reason:requestReason,Requested_By:user?.Name||user?.username||''})});
      const r=await res.json();
      if(r.success){showMsg(r.message||'Request တင်ပြီးပါပြီ ✓');setRequestModal(null);setRequestQty('');setRequestReason('');fetchAll();}
      else showMsg(r.message||'Error','error');
    } catch{showMsg('Network error','error');}
    setSaving(false);
  };

  const openDetail = async (item) => {
    setDetailModal(item); setDetailHistory([]); setDetailLoading(true);
    try {
      const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getItemHistory',Item_ID:item.Item_ID})});
      const r=await res.json();
      if(r.success) setDetailHistory(r.data||[]);
    } catch {}
    setDetailLoading(false);
  };

  const handleItemNameChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, Item_Name: value });

    if (value.length >= 2) {
      const suggestions = items
        .filter(item => item.Item_Name?.toLowerCase().includes(value.toLowerCase()))
        .map(item => ({
          name: item.Item_Name,
          category: item.Category,
          unit: item.Unit,
          itemType: item.Item_Type,
          minStock: item.Min_Stock,
          location: item.Location,
          note: item.Note
        }))
        .filter((item, index, self) => index === self.findIndex(i => i.name === item.name))
        .slice(0, 5);
      setItemSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
      setItemSuggestions([]);
    }
  };

  const selectSuggestion = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setForm({
      ...form,
      Item_Name: suggestion.name,
      Category: suggestion.category,
      Unit: suggestion.unit,
      Item_Type: suggestion.itemType,
    });
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    if (!form.Item_Name) return showMsg('Item name ထည့်ပါ', 'error');

    if (form.Item_Type === 'Capital' && form.Bulk_Quantity > 1) {
      setSaving(true);
      try {
        const items = [];
        for (let i = 0; i < form.Bulk_Quantity; i++) {
          items.push({
            Item_Name: form.Item_Name,
            Category: form.Category,
            Unit: form.Unit,
            Unit_Price: form.Unit_Price,
            Useful_Life_Years: form.Useful_Life_Years,
            Purchase_Date: form.Purchase_Date,
            Condition: form.Condition,
            Location: form.Location,
            Note: form.Note,
            Photo_URL: form.Photo_URL,
            Created_By: user?.Name || user?.username || ''
          });
        }

        const res = await fetch(WEB_APP_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'addInventoryItemsBulk',
            items: items
          })
        });
        const r = await res.json();
        if (r.success) {
          showMsg(`${form.Bulk_Quantity} items added successfully ✓`);
          fetchAll();
          setForm(EMPTY_FORM);
          setEditItem(null);
          setPhotoPreview(null);
          setTab('list');
        } else {
          showMsg(r.message || 'Error', 'error');
        }
      } catch {
        showMsg('Network error', 'error');
      }
      setSaving(false);
      return;
    }

    setSaving(true);
    try {
      const action = editItem ? 'updateInventoryItem' : 'addInventoryItem';
      const payload = editItem
        ? { ...form, Item_ID: editItem.Item_ID, Updated_By: user?.Name || user?.username || '' }
        : { ...form, Updated_By: user?.Name || user?.username || '' };
      const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action, ...payload }) });
      const r = await res.json();
      if (r.success) {
        showMsg(editItem ? 'Update ပြီးပါပြီ ✓' : 'Item ထည့်ပြီးပါပြီ ✓');
        fetchAll();
        setForm(EMPTY_FORM);
        setEditItem(null);
        setPhotoPreview(null);
        setTab('list');
      } else showMsg(r.message || 'Error', 'error');
    } catch {
      showMsg('Network error', 'error');
    }
    setSaving(false);
  };

  const handlePhotoSelect = async (e) => {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const base64=ev.target.result; setPhotoPreview(base64); setPhotoUploading(true);
      try {
        const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'uploadPhoto',base64,filename:'inventory_'+Date.now()+'.'+file.name.split('.').pop(),mimeType:file.type,folder:'inventory'})});
        const r=await res.json();
        if(r.success){setForm(f=>({...f,Photo_URL:r.photoUrl}));showMsg('ဓာတ်ပုံ တင်ပြီးပါပြီ ✓');}
        else showMsg(r.message||'Upload failed','error');
      } catch{showMsg('Network error','error');}
      setPhotoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddConfig = async () => {
    const val=configNew.trim(); if(!val) return;
    setConfigSaving(true);
    try {
      const isCat=configModal==='category';
      const updated=isCat?[...invCategories,val]:[...invLocations,val];
      const payload=isCat?{action:'saveInventoryConfig',categories:updated}:{action:'saveInventoryConfig',locations:updated};
      const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify(payload)});
      const r=await res.json();
      if(r.success){isCat?setInvCategories(updated):setInvLocations(updated);showMsg(`"${val}" ထည့်ပြီးပါပြီ ✓`);setConfigModal(null);setConfigNew('');}
      else showMsg(r.message||'Error','error');
    } catch{showMsg('Network error','error');}
    setConfigSaving(false);
  };

  const handleRemoveConfig = async (type,val) => {
    if(!confirm(`"${val}" ဖျက်မှာ သေချာပြီလား?`)) return;
    const updated=type==='category'?invCategories.filter(c=>c!==val):invLocations.filter(l=>l!==val);
    try {
      const payload=type==='category'?{action:'saveInventoryConfig',categories:updated}:{action:'saveInventoryConfig',locations:updated};
      const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify(payload)});
      const r=await res.json();
      if(r.success){type==='category'?setInvCategories(updated):setInvLocations(updated);showMsg(`"${val}" ဖျက်ပြီးပါပြီ`);}
      else showMsg(r.message||'Error','error');
    } catch{showMsg('Network error','error');}
  };

  const handlePrint = () => {
    const lowStock   = items.filter(i=>Number(i.Stock_Qty)<=Number(i.Min_Stock)&&Number(i.Min_Stock)>0);
    const expiring   = items.filter(i=>{const d=daysUntil(i.Warranty_Until);return d!==null&&d<=30&&d>=0;});
    const capitalItems = items.filter(i=>i.Item_Type==='Capital'||i.Item_Type==='Tool');
    const totalCapital = capitalItems.reduce((s,i)=>s+(Number(i.Unit_Price)||0),0);
    const totalExpense = items.filter(i=>i.Item_Type==='Expense').reduce((s,i)=>s+(Number(i.Stock_Qty)||0)*(Number(i.Unit_Price)||0),0);
    const html=`<!DOCTYPE html><html><head><title>Inventory Report — Shining Stars</title>
<style>body{font-family:sans-serif;padding:24px;color:#111;font-size:12px}h1{font-size:18px}h2{font-size:13px;margin-top:24px;border-bottom:2px solid #000;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:11px}th{background:#111;color:#fff;padding:6px 8px;text-align:left}td{padding:5px 8px;border-bottom:1px solid #eee}
.warn{color:#b45309;font-weight:bold}.ok{color:#047857}.badge{display:inline-block;padding:1px 7px;border-radius:99px;font-size:10px;font-weight:bold}
.expense{background:#d1fae5;color:#047857}.capital{background:#dbeafe;color:#1d4ed8}.tool{background:#ede9fe;color:#7c3aed}
@media print{button{display:none}}</style></head><body>
<h1>📦 Inventory Report — Shining Stars</h1>
<p style="color:#666">Generated: ${new Date().toLocaleString()}</p>
<div style="display:flex;gap:24px;margin:16px 0;padding:12px;background:#f9fafb;border-radius:8px;flex-wrap:wrap">
  <div><strong>Capital Asset Value</strong><br><span style="font-size:16px;color:#1d4ed8">${totalCapital.toLocaleString()} ks</span></div>
  <div><strong>Expense Stock Value</strong><br><span style="font-size:16px;color:#047857">${totalExpense.toLocaleString()} ks</span></div>
  <div><strong>Total Items</strong><br><span style="font-size:16px">${items.length}</span></div>
  <div><strong>Low Stock Alerts</strong><br><span style="font-size:16px;color:#b45309">${lowStock.length}</span></div>
</div>
<h2>📋 Capital & Tools Register (${capitalItems.length})</h2>
<table><tr><th>Item</th><th>Type</th><th>Location</th><th>Purchase Price</th><th>Current Value</th><th>Condition</th><th>Warranty Until</th><th>Purchase Date</th></tr>
${capitalItems.map(i=>{ const cv=depreciatedValue(i.Unit_Price,i.Purchase_Date,i.Useful_Life_Years);
  return`<tr><td>${i.Item_Name}</td><td><span class="badge ${i.Item_Type.toLowerCase()}">${i.Item_Type}</span></td><td>${i.Location||'—'}</td>
  <td>${i.Unit_Price?Number(i.Unit_Price).toLocaleString()+' ks':'—'}</td>
  <td>${cv!==null?cv.toLocaleString()+' ks':'—'}</td>
  <td>${i.Condition||'—'}</td><td>${fmtDate(i.Warranty_Until)}</td><td>${fmtDate(i.Purchase_Date)}</td></tr>`;}).join('')}
</table>
<h2>🧻 Expense Items (${items.filter(i=>i.Item_Type==='Expense').length})</h2>
<table><tr><th>Item</th><th>Category</th><th>Location</th><th>Stock</th><th>Min</th><th>Unit</th><th>Unit Price</th><th>Total Value</th></tr>
${items.filter(i=>i.Item_Type==='Expense').map(i=>`<tr>
  <td>${i.Item_Name}</td><td>${i.Category||'—'}</td><td>${i.Location||'—'}</td>
  <td class="${Number(i.Stock_Qty)<=Number(i.Min_Stock)&&Number(i.Min_Stock)>0?'warn':'ok'}">${i.Stock_Qty}</td>
  <td>${i.Min_Stock||'—'}</td><td>${i.Unit}</td><td>${i.Unit_Price?Number(i.Unit_Price).toLocaleString()+' ks':'—'}</td>
  <td>${((Number(i.Stock_Qty)||0)*(Number(i.Unit_Price)||0)).toLocaleString()} ks</td></tr>`).join('')}
</table>
${lowStock.length?`<h2>⚠ Low Stock Alert (${lowStock.length})</h2><table><tr><th>Item</th><th>Category</th><th>Current Stock</th><th>Min Stock</th><th>Unit</th></tr>
${lowStock.map(i=>`<tr><td>${i.Item_Name}</td><td>${i.Category||'—'}</td><td class="warn">${i.Stock_Qty}</td><td>${i.Min_Stock}</td><td>${i.Unit}</td></tr>`).join('')}</table>`:''}
${expiring.length?`<h2>🔧 Warranty Expiring Soon (${expiring.length})</h2><table><tr><th>Item</th><th>Serial No</th><th>Warranty Until</th><th>Days Left</th></tr>
${expiring.map(i=>`<tr><td>${i.Item_Name}</td><td>${i.Serial_No||'—'}</td><td>${fmtDate(i.Warranty_Until)}</td><td class="warn">${daysUntil(i.Warranty_Until)}</td></tr>`).join('')}</table>`:''}
</body></html>`;
    const w=window.open('','_blank'); w.document.write(html); w.document.close(); setTimeout(()=>w.print(),400);
  };

  const expenses     = items.filter(i=>i.Item_Type==='Expense');
  const capitals     = items.filter(i=>i.Item_Type==='Capital');
  const tools        = items.filter(i=>i.Item_Type==='Tool');
  const lowStock     = items.filter(i=>i.Item_Type==='Expense'&&Number(i.Min_Stock)>0&&Number(i.Stock_Qty)<=Number(i.Min_Stock));
  const outOfStock   = items.filter(i=>i.Item_Type==='Expense'&&Number(i.Stock_Qty)===0);
  const expiringWarr = items.filter(i=>{const d=daysUntil(i.Warranty_Until);return d!==null&&d<=30&&d>=0;});
  const expiredWarr  = items.filter(i=>{const d=daysUntil(i.Warranty_Until);return d!==null&&d<0;});
  const totalAssetCost   = [...capitals,...tools].reduce((s,i)=>s+(Number(i.Unit_Price)||0),0);
  const totalAssetCurrent= [...capitals,...tools].reduce((s,i)=>{ const cv=depreciatedValue(i.Unit_Price,i.Purchase_Date,i.Useful_Life_Years); return s+(cv||Number(i.Unit_Price)||0); },0);
  const totalStockValue  = expenses.reduce((s,i)=>s+(Number(i.Stock_Qty)||0)*(Number(i.Unit_Price)||0),0);
  const pendingRequests  = requests.filter(r=>r.Status==='Pending'||!r.Status);

  const catBreakdown = useMemo(() => {
    const map = {};
    items.forEach(i=>{ map[i.Category||'Other']=(map[i.Category||'Other']||0)+1; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  },[items]);

  const recentLogs = useMemo(()=>[...logs].slice(0,8),[logs]);

  const listItems = useMemo(()=>{
    let base = items;
    if(typeFilter!=='All') base=base.filter(i=>i.Item_Type===typeFilter);
    if(catFilter!=='All')  base=base.filter(i=>i.Category===catFilter);
    if(locFilter!=='All')  base=base.filter(i=>i.Location===locFilter);
    if(condFilter!=='All') base=base.filter(i=>i.Condition===condFilter);
    if(search) base=base.filter(i=>i.Item_Name?.toLowerCase().includes(search.toLowerCase())||i.Serial_No?.toLowerCase().includes(search.toLowerCase()));
    return [...base].sort((a,b)=>{
      if(sortBy==='name')  return (a.Item_Name||'').localeCompare(b.Item_Name||'');
      if(sortBy==='stock') return Number(b.Stock_Qty||0)-Number(a.Stock_Qty||0);
      if(sortBy==='value') return (Number(b.Unit_Price||0))-(Number(a.Unit_Price||0));
      if(sortBy==='alert'){ const aL=Number(a.Min_Stock)>0&&Number(a.Stock_Qty)<=Number(a.Min_Stock)?0:1; const bL=Number(b.Min_Stock)>0&&Number(b.Stock_Qty)<=Number(b.Min_Stock)?0:1; return aL-bL; }
      return 0;
    });
  },[items,typeFilter,catFilter,locFilter,condFilter,search,sortBy]);

  const filteredLogs = useMemo(()=>logs.filter(l=>{
    if(logAction!=='All'&&l.Action!==logAction) return false;
    if(logSearch&&!l.Item_Name?.toLowerCase().includes(logSearch.toLowerCase())&&!l.Done_By?.toLowerCase().includes(logSearch.toLowerCase())) return false;
    if(logDateFrom&&l.Date<logDateFrom) return false;
    if(logDateTo&&l.Date>logDateTo) return false;
    return true;
  }),[logs,logAction,logSearch,logDateFrom,logDateTo]);

  const filteredRequests = useMemo(()=>requests.filter(r=>{
    if(reqStatus==='All') return true;
    if(reqStatus==='Pending') return !r.Status||r.Status==='Pending';
    return r.Status===reqStatus;
  }),[requests,reqStatus]);

  const startEdit = (item) => { setEditItem(item); setForm({...EMPTY_FORM,...item,Item_Type:resolveType(item)}); setPhotoPreview(item.Photo_URL||null); setTab('add'); };

  const TABS = [
    {id:'dashboard', label:'📊 Dashboard'},
    {id:'list',      label:`📦 Items${items.length?' ('+items.length+')':''}`},
    {id:'alerts',    label:`⚠️ Alerts${lowStock.length+expiringWarr.length>0?' ('+(lowStock.length+expiringWarr.length)+')':''}`},
    {id:'requests',  label:`🛒 Requests${pendingRequests.length>0?' ('+pendingRequests.length+')':''}`},
    {id:'log',       label:'📋 Log'},
    {id:'add',       label: editItem?'✏️ Edit':'➕ Add'},
    {id:'config',    label:'⚙️ Config'},
  ];

  if (!user) return null;

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box} select option{background:#130f22} input[type=date]{color-scheme:dark}`}</style>

      <div style={S.header}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',cursor:'pointer',fontSize:'13px',fontWeight:900}}>← Back</button>
        <div style={{textAlign:'center'}}>
          <p style={{fontWeight:900,fontSize:'13px',textTransform:'uppercase',letterSpacing:'0.12em',margin:0}}>📦 Inventory</p>
          {(lowStock.length>0||expiringWarr.length>0||pendingRequests.length>0)&&(
            <p style={{fontSize:'9px',color:'#fbbf24',margin:'2px 0 0',fontWeight:900}}>
              {lowStock.length>0&&`⚠ ${lowStock.length} low`}
              {expiringWarr.length>0&&` 🔧 ${expiringWarr.length} warranty`}
              {pendingRequests.length>0&&` 🛒 ${pendingRequests.length} requests`}
            </p>
          )}
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <button onClick={handlePrint} style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',cursor:'pointer',fontSize:'17px',padding:'4px'}} title="Print Report">🖨</button>
          <button onClick={fetchAll}    style={{background:'none',border:'none',color:'rgba(255,255,255,0.35)',cursor:'pointer',fontSize:'19px',padding:'4px'}} title="Refresh">↻</button>
        </div>
      </div>

      {msg&&(
        <div style={{position:'fixed',top:'60px',left:'50%',transform:'translateX(-50%)',zIndex:999,padding:'8px 20px',borderRadius:'999px',fontSize:'12px',fontWeight:900,color:'#fff',background:msg.type==='error'?'#ef4444':'#10b981',boxShadow:'0 4px 20px rgba(0,0,0,0.5)',whiteSpace:'nowrap',animation:'fadeIn 0.2s ease'}}>
          {msg.text}
        </div>
      )}

      <div style={{display:'flex',gap:'6px',padding:'10px 16px 6px',overflowX:'auto',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);if(t.id!=='add'){setEditItem(null);setForm(EMPTY_FORM);setPhotoPreview(null);}}}
            style={{background:tab===t.id?'#fbbf24':'rgba(255,255,255,0.05)',color:tab===t.id?'#09080f':'rgba(255,255,255,0.4)',border:'none',borderRadius:'10px',padding:'7px 13px',fontSize:'10px',fontWeight:900,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:'12px 16px 80px'}}>
        {loading ? (
          <div style={{display:'flex',justifyContent:'center',padding:'80px 0'}}>
            <div style={{width:'32px',height:'32px',border:'3px solid rgba(255,255,255,0.08)',borderTop:'3px solid #fbbf24',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
          </div>
        ) : (<>

          {tab==='dashboard'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'14px',animation:'fadeIn 0.2s ease'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <StatCard icon="🏛" value={totalAssetCost.toLocaleString()+' ks'} label="Original Asset Value" sub={`Current: ${totalAssetCurrent.toLocaleString()} ks`} color="#60a5fa"/>
                <StatCard icon="🧻" value={totalStockValue.toLocaleString()+' ks'} label="Expense Stock Value" sub={`${expenses.length} types`} color="#34d399"/>
                <StatCard icon="⚠️" value={lowStock.length} label="Low Stock Items" sub={`${outOfStock.length} out of stock`} color="#fbbf24" alert={lowStock.length>0} onClick={()=>setTab('alerts')}/>
                <StatCard icon="🛒" value={pendingRequests.length} label="Pending Requests" sub={`${requests.length} total`} color="#f472b6" alert={pendingRequests.length>0} onClick={()=>setTab('requests')}/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                {[{icon:'🧻',label:'Expense',count:expenses.length,color:'#34d399'},
                  {icon:'🪑',label:'Capital',count:capitals.length,color:'#60a5fa'},
                  {icon:'🔧',label:'Tool',count:tools.length,color:'#c084fc'}].map(t=>(
                  <div key={t.label} style={{...S.card,textAlign:'center',padding:'12px 8px'}}>
                    <div style={{fontSize:'18px'}}>{t.icon}</div>
                    <div style={{fontSize:'20px',fontWeight:900,color:t.color}}>{t.count}</div>
                    <div style={{fontSize:'8px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{t.label}</div>
                  </div>
                ))}
              </div>

              {catBreakdown.length>0&&(
                <div style={S.card}>
                  <p style={{fontWeight:900,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 12px',color:'rgba(255,255,255,0.4)'}}>Category Breakdown</p>
                  {catBreakdown.slice(0,8).map(([cat,cnt])=>(
                    <div key={cat} style={{marginBottom:'8px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                        <span style={{fontSize:'11px',fontWeight:900}}>{cat}</span>
                        <span style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',fontWeight:900}}>{cnt}</span>
                      </div>
                      <div style={{height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'99px'}}>
                        <div style={{height:'100%',background:'#fbbf24',borderRadius:'99px',width:`${(cnt/items.length)*100}%`,transition:'width 0.5s ease'}}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expiringWarr.length>0&&(
                <div style={{...S.card,border:'1px solid rgba(248,113,113,0.3)'}}>
                  <p style={{fontWeight:900,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 10px',color:'#f87171'}}>🔧 Warranty Expiring Soon</p>
                  {expiringWarr.map((i,idx)=>(
                    <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div>
                        <p style={{fontWeight:900,fontSize:'12px',margin:0}}>{i.Item_Name}</p>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:0}}>{i.Serial_No||'No serial'} · {i.Location||'—'}</p>
                      </div>
                      <span style={{...S.pill('#f87171'),flexShrink:0}}>{daysUntil(i.Warranty_Until)}d left</span>
                    </div>
                  ))}
                </div>
              )}

              {recentLogs.length>0&&(
                <div style={S.card}>
                  <p style={{fontWeight:900,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 10px',color:'rgba(255,255,255,0.4)'}}>Recent Activity</p>
                  {recentLogs.map((l,idx)=>{
                    const isIn=(Number(l.Qty_Change)||0)>0;
                    return (
                      <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontWeight:900,fontSize:'12px',margin:0,truncate:true}}>{l.Item_Name}</p>
                          <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:0}}>{l.Action} · {l.Done_By||'—'} · {fmtShort(l.Date)}</p>
                        </div>
                        {l.Qty_Change&&<span style={{...S.pill(isIn?'#34d399':'#f87171'),flexShrink:0}}>{isIn?'+':''}{l.Qty_Change}</span>}
                      </div>
                    );
                  })}
                  <button onClick={()=>setTab('log')} style={{...S.btnSm,width:'100%',marginTop:'8px',textAlign:'center'}}>View Full Log →</button>
                </div>
              )}
            </div>
          )}

          {tab==='list'&&(
            <div style={{animation:'fadeIn 0.2s ease'}}>
              <div style={{position:'relative',marginBottom:'10px'}}>
                <span style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',opacity:0.4}}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items, serial…"
                  style={{...S.input,paddingLeft:'34px'}}/>
              </div>

              <div style={{display:'flex',gap:'6px',overflowX:'auto',marginBottom:'8px'}}>
                {['All','Expense','Capital','Tool'].map(t=>(
                  <button key={t} onClick={()=>setTypeFilter(t)}
                    style={{background:typeFilter===t?(t==='All'?'#fbbf24':TYPE_COLOR[t]||'#fbbf24'):'rgba(255,255,255,0.05)',color:typeFilter===t?'#09080f':'rgba(255,255,255,0.4)',border:'none',borderRadius:'9px',padding:'6px 12px',fontSize:'10px',fontWeight:900,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                    {t==='All'?'All':TYPE_ICON[t]+' '+t}
                  </button>
                ))}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{...S.select,fontSize:'11px',padding:'8px 10px'}}>
                  <option value="All">All Categories</option>
                  {invCategories.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <select value={locFilter} onChange={e=>setLocFilter(e.target.value)} style={{...S.select,fontSize:'11px',padding:'8px 10px'}}>
                  <option value="All">All Locations</option>
                  {invLocations.map(l=><option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...S.select,fontSize:'11px',padding:'8px 10px'}}>
                  <option value="name">Sort: A-Z</option>
                  <option value="stock">Sort: Stock ↓</option>
                  <option value="value">Sort: Value ↓</option>
                  <option value="alert">Sort: Alerts First</option>
                </select>
                <select value={condFilter} onChange={e=>setCondFilter(e.target.value)} style={{...S.select,fontSize:'11px',padding:'8px 10px'}}>
                  <option value="All">All Conditions</option>
                  {CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <p style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',fontWeight:900,marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                {listItems.length} items {listItems.length!==items.length&&`(filtered from ${items.length})`}
              </p>

              {listItems.length===0 ? (
                <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(255,255,255,0.2)'}}>
                  <div style={{fontSize:'40px',marginBottom:'8px'}}>📭</div>
                  <p style={{fontWeight:900}}>No items found</p>
                </div>
              ) : (
                listItems.map((item,idx)=>(
                  <ItemCard key={item.Item_ID||idx} item={item}
                    onDetail={openDetail}
                    onEdit={startEdit}
                    onUsage={(i,action)=>{setUsageModal(i);setUsageAction(action);setUsageQty('');setUsageNote('');}}
                    onTransfer={(i)=>{setTransferModal(i);setTransferLoc('');setTransferNote('');}}
                    onRequest={(i)=>{setRequestModal(i);setRequestQty('');setRequestReason('');}}
                  />
                ))
              )}
            </div>
          )}

          {tab==='alerts'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'12px',animation:'fadeIn 0.2s ease'}}>
              {outOfStock.length>0&&(
                <div style={{...S.card,border:'1px solid rgba(239,68,68,0.3)'}}>
                  <p style={{fontWeight:900,fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 10px',color:'#f87171'}}>🚫 Out of Stock ({outOfStock.length})</p>
                  {outOfStock.map((i,idx)=>(
                    <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div>
                        <p style={{fontWeight:900,fontSize:'12px',margin:0}}>{i.Item_Name}</p>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:'2px 0 0'}}>{i.Category} · {i.Location||'No location'}</p>
                      </div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={()=>{setUsageModal(i);setUsageAction('Restock');setUsageQty('');setUsageNote('');}} style={S.btnGreen}>📥</button>
                        <button onClick={()=>{setRequestModal(i);setRequestQty('');setRequestReason('');}} style={S.btnSm}>🛒</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {lowStock.filter(i=>Number(i.Stock_Qty)>0).length>0&&(
                <div style={{...S.card,border:'1px solid rgba(251,191,36,0.3)'}}>
                  <p style={{fontWeight:900,fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 10px',color:'#fbbf24'}}>⚠️ Low Stock ({lowStock.filter(i=>Number(i.Stock_Qty)>0).length})</p>
                  {lowStock.filter(i=>Number(i.Stock_Qty)>0).map((i,idx)=>(
                    <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div>
                        <p style={{fontWeight:900,fontSize:'12px',margin:0}}>{i.Item_Name}</p>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:'2px 0 0'}}>{i.Category} · Stock: {i.Stock_Qty} {i.Unit} (min: {i.Min_Stock})</p>
                      </div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={()=>{setUsageModal(i);setUsageAction('Restock');setUsageQty('');setUsageNote('');}} style={S.btnGreen}>📥</button>
                        <button onClick={()=>{setRequestModal(i);setRequestQty('');setRequestReason('');}} style={S.btnSm}>🛒</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {expiringWarr.length>0&&(
                <div style={{...S.card,border:'1px solid rgba(248,113,113,0.3)'}}>
                  <p style={{fontWeight:900,fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 10px',color:'#f87171'}}>🔧 Warranty Expiring ≤ 30 days ({expiringWarr.length})</p>
                  {expiringWarr.sort((a,b)=>daysUntil(a.Warranty_Until)-daysUntil(b.Warranty_Until)).map((i,idx)=>(
                    <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div>
                        <p style={{fontWeight:900,fontSize:'12px',margin:0}}>{i.Item_Name}</p>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:'2px 0 0'}}>Serial: {i.Serial_No||'—'} · Until: {fmtDate(i.Warranty_Until)}</p>
                      </div>
                      <span style={S.pill('#f87171')}>{daysUntil(i.Warranty_Until)}d</span>
                    </div>
                  ))}
                </div>
              )}

              {expiredWarr.length>0&&(
                <div style={S.card}>
                  <p style={{fontWeight:900,fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 10px',color:'rgba(255,255,255,0.3)'}}>📋 Warranty Expired ({expiredWarr.length})</p>
                  {expiredWarr.map((i,idx)=>(
                    <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <div>
                        <p style={{fontWeight:900,fontSize:'12px',margin:0,color:'rgba(255,255,255,0.5)'}}>{i.Item_Name}</p>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.2)',margin:'2px 0 0'}}>Expired: {fmtDate(i.Warranty_Until)}</p>
                      </div>
                      <span style={S.pill('rgba(255,255,255,0.2)')}>expired</span>
                    </div>
                  ))}
                </div>
              )}

              {lowStock.length===0&&expiringWarr.length===0&&expiredWarr.length===0&&(
                <div style={{textAlign:'center',padding:'80px 20px',color:'rgba(255,255,255,0.2)'}}>
                  <div style={{fontSize:'48px',marginBottom:'10px'}}>✅</div>
                  <p style={{fontWeight:900,fontSize:'16px'}}>No Alerts</p>
                  <p style={{fontSize:'11px',margin:'4px 0 0'}}>All stock levels and warranties are OK</p>
                </div>
              )}
            </div>
          )}

          {tab==='requests'&&(
            <div style={{animation:'fadeIn 0.2s ease'}}>
              <div style={{display:'flex',gap:'6px',marginBottom:'12px',overflowX:'auto'}}>
                {REQ_STATUSES.map(s=>(
                  <button key={s} onClick={()=>setReqStatus(s)}
                    style={{background:reqStatus===s?'#fbbf24':'rgba(255,255,255,0.05)',color:reqStatus===s?'#09080f':'rgba(255,255,255,0.4)',border:'none',borderRadius:'9px',padding:'6px 14px',fontSize:'10px',fontWeight:900,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                    {s}{s==='Pending'&&pendingRequests.length>0?` (${pendingRequests.length})`:''}
                  </button>
                ))}
              </div>

              {filteredRequests.length===0 ? (
                <div style={{textAlign:'center',padding:'80px 20px',color:'rgba(255,255,255,0.2)'}}>
                  <div style={{fontSize:'48px',marginBottom:'10px'}}>🛒</div>
                  <p style={{fontWeight:900}}>No {reqStatus!=='All'?reqStatus:''} Requests</p>
                </div>
              ) : (
                filteredRequests.map((r,idx)=>{
                  const statusColor = r.Status==='Approved'?'#34d399':r.Status==='Rejected'?'#f87171':'#fbbf24';
                  return (
                    <div key={idx} style={{...S.card,marginBottom:'10px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px',marginBottom:'8px'}}>
                        <div style={{flex:1}}>
                          <p style={{fontWeight:900,fontSize:'14px',margin:'0 0 2px'}}>{r.Item_Name}</p>
                          <p style={{fontSize:'10px',color:'rgba(255,255,255,0.35)',margin:0}}>{r.Category||'—'} · Requested by: {r.Requested_By||'—'}</p>
                        </div>
                        <span style={S.pill(statusColor)}>{r.Status||'Pending'}</span>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                        <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'8px'}}>
                          <div style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Quantity</div>
                          <div style={{fontWeight:900,fontSize:'14px'}}>{r.Qty_Requested||r.Qty||'—'} {r.Unit||''}</div>
                        </div>
                        <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'8px'}}>
                          <div style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Date</div>
                          <div style={{fontWeight:900,fontSize:'11px'}}>{fmtShort(r.Date)}</div>
                        </div>
                      </div>
                      {r.Reason&&<p style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',fontStyle:'italic',margin:'0',padding:'8px',background:'rgba(255,255,255,0.03)',borderRadius:'8px'}}>"{r.Reason}"</p>}
                      {r.Note&&<p style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',margin:'6px 0 0'}}>Note: {r.Note}</p>}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab==='log'&&(
            <div style={{animation:'fadeIn 0.2s ease'}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'12px'}}>
                {[
                  {label:'Total Entries', value:logs.length, color:'#fff'},
                  {label:'Stock Out',     value:logs.filter(l=>l.Action==='Use'||(Number(l.Qty_Change)||0)<0).length, color:'#f87171'},
                  {label:'Restocked',     value:logs.filter(l=>l.Action==='Restock'||(Number(l.Qty_Change)||0)>0).length, color:'#34d399'},
                ].map((s,i)=>(
                  <div key={i} style={{...S.card,textAlign:'center',padding:'10px 6px'}}>
                    <div style={{fontSize:'18px',fontWeight:900,color:s.color}}>{s.value}</div>
                    <div style={{fontSize:'8px',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:'2px'}}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{position:'relative',marginBottom:'8px'}}>
                <span style={{position:'absolute',left:'12px',top:'50%',transform:'translateY(-50%)',fontSize:'14px',opacity:0.4}}>🔍</span>
                <input value={logSearch} onChange={e=>setLogSearch(e.target.value)} placeholder="Search by item or person…" style={{...S.input,paddingLeft:'34px'}}/>
              </div>
              <div style={{display:'flex',gap:'6px',overflowX:'auto',marginBottom:'8px'}}>
                {['All',...LOG_ACTIONS].map(a=>(
                  <button key={a} onClick={()=>setLogAction(a)}
                    style={{background:logAction===a?'#fbbf24':'rgba(255,255,255,0.05)',color:logAction===a?'#09080f':'rgba(255,255,255,0.4)',border:'none',borderRadius:'9px',padding:'6px 11px',fontSize:'9px',fontWeight:900,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                    {a}
                  </button>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                <div><label style={S.label}>From</label><input type="date" value={logDateFrom} onChange={e=>setLogDateFrom(e.target.value)} style={S.input}/></div>
                <div><label style={S.label}>To</label><input type="date" value={logDateTo} onChange={e=>setLogDateTo(e.target.value)} style={S.input}/></div>
              </div>

              <p style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',fontWeight:900,marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.08em'}}>{filteredLogs.length} entries</p>

              {filteredLogs.length===0 ? (
                <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.2)'}}>
                  <div style={{fontSize:'36px',marginBottom:'8px'}}>📭</div>
                  <p style={{fontWeight:900}}>No log entries</p>
                </div>
              ) : (
                filteredLogs.map((l,idx)=>{
                  const isIn=(Number(l.Qty_Change)||0)>0;
                  return (
                    <div key={idx} style={{display:'flex',gap:'10px',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{width:'32px',height:'32px',borderRadius:'10px',background:isIn?'rgba(52,211,153,0.12)':'rgba(248,113,113,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0}}>
                        {l.Action==='Use'?'📤':l.Action==='Restock'?'📥':l.Action==='Transfer'?'🔄':'📋'}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                          <p style={{fontWeight:900,fontSize:'12px',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{l.Item_Name}</p>
                          {l.Qty_Change&&<span style={{...S.pill(isIn?'#34d399':'#f87171'),flexShrink:0,marginLeft:'6px'}}>{isIn?'+':''}{l.Qty_Change}</span>}
                        </div>
                        <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:'2px 0 0'}}>{l.Action} · {l.Done_By||'—'} · {fmtShort(l.Date)}</p>
                        {l.Note&&<p style={{fontSize:'9px',color:'rgba(255,255,255,0.2)',margin:'2px 0 0',fontStyle:'italic'}}>"{l.Note}"</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab==='add'&&(
            <div style={{animation:'fadeIn 0.2s ease'}}>
              <p style={{fontWeight:900,fontSize:'14px',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'16px',color:editItem?'#fbbf24':'rgba(255,255,255,0.6)'}}>{editItem?`✏️ Editing: ${editItem.Item_Name}`:'➕ New Item'}</p>

              <div style={{marginBottom:'14px'}}>
                <label style={S.label}>Item Type *</label>
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {ITEM_TYPES.map(t=>(
                    <button key={t.v} onClick={()=>setForm(f=>({...f,Item_Type:t.v}))}
                      style={{border:`1px solid ${form.Item_Type===t.v?t.border:'rgba(255,255,255,0.08)'}`,background:form.Item_Type===t.v?t.bg:'transparent',borderRadius:'12px',padding:'10px 14px',color:'#fff',cursor:'pointer',textAlign:'left'}}>
                      <span style={{fontWeight:900,fontSize:'12px',color:form.Item_Type===t.v?t.color:'rgba(255,255,255,0.6)'}}>{t.label}</span>
                      <span style={{fontSize:'10px',color:'rgba(255,255,255,0.25)',marginLeft:'8px'}}>{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{marginBottom:'12px', position:'relative' }}>
                <label style={S.label}>Item Name *</label>
                <input
                  value={form.Item_Name}
                  onChange={handleItemNameChange}
                  onFocus={() => {
                    if (form.Item_Name?.length >= 2 && itemSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Type item name..."
                  style={S.input}
                />
                {showSuggestions && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#1a1030',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    marginTop: '4px',
                    zIndex: 100,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}>
                    {itemSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        onMouseDown={() => selectSuggestion(suggestion)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: idx < itemSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          cursor: 'pointer',
                          transition: 'background 0.1s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ fontWeight: 900, fontSize: '13px', color: '#fff' }}>{suggestion.name}</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                          {suggestion.category} · {suggestion.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedSuggestion && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    background: 'rgba(52,211,153,0.1)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    borderRadius: '8px',
                    fontSize: '10px',
                    color: '#34d399'
                  }}>
                    ✓ Using existing item: {selectedSuggestion.name}
                  </div>
                )}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                <div>
                  <label style={S.label}>Category</label>
                  <select value={form.Category} onChange={e=>setForm(f=>({...f,Category:e.target.value}))} style={S.select}>
                    {invCategories.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Unit</label>
                  <select value={form.Unit} onChange={e=>setForm(f=>({...f,Unit:e.target.value}))} style={S.select}>
                    {UNITS.map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {form.Item_Type==='Expense'&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                  <div><label style={S.label}>Stock Qty</label><input type="number" value={form.Stock_Qty} onChange={e=>setForm(f=>({...f,Stock_Qty:e.target.value}))} placeholder="0" style={S.input}/></div>
                  <div><label style={S.label}>Min Stock</label><input type="number" value={form.Min_Stock} onChange={e=>setForm(f=>({...f,Min_Stock:e.target.value}))} placeholder="Min alert level" style={S.input}/></div>
                </div>
              )}

              {(form.Item_Type==='Capital'||form.Item_Type==='Tool')&&(
                <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                    <div><label style={S.label}>Purchase Price (ks)</label><input type="number" value={form.Unit_Price} onChange={e=>setForm(f=>({...f,Unit_Price:e.target.value}))} placeholder="0" style={S.input}/></div>
                    <div><label style={S.label}>Useful Life (years)</label><input type="number" value={form.Useful_Life_Years} onChange={e=>setForm(f=>({...f,Useful_Life_Years:e.target.value}))} placeholder="e.g. 5" style={S.input}/></div>
                  </div>
                  <div style={{marginBottom:'12px'}}>
                    <label style={S.label}>Purchase Date</label>
                    <input type="date" value={form.Purchase_Date} onChange={e=>setForm(f=>({...f,Purchase_Date:e.target.value}))} style={S.input}/>
                  </div>
                </>
              )}

              {form.Item_Type === 'Capital' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={S.label}>Quantity (Bulk Add) *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.Bulk_Quantity || 1}
                    onChange={e => setForm(f => ({ ...f, Bulk_Quantity: parseInt(e.target.value) || 1 }))}
                    placeholder="Number of identical items"
                    style={S.input}
                  />
                  <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
                    ပစ္စည်းအလုံးရေ အများကြီးကို တစ်ပြိုင်တည်းထည့်ရန်
                  </p>
                </div>
              )}

              {form.Item_Type==='Tool'&&(
                <>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                    <div><label style={S.label}>Serial No</label><input value={form.Serial_No} onChange={e=>setForm(f=>({...f,Serial_No:e.target.value}))} placeholder="S/N" style={S.input}/></div>
                    <div><label style={S.label}>Warranty Until</label><input type="date" value={form.Warranty_Until} onChange={e=>setForm(f=>({...f,Warranty_Until:e.target.value}))} style={S.input}/></div>
                  </div>
                  <div style={{marginBottom:'12px'}}>
                    <label style={S.label}>Assigned To</label>
                    <input value={form.Assigned_To} onChange={e=>setForm(f=>({...f,Assigned_To:e.target.value}))} placeholder="Person or department" style={S.input}/>
                  </div>
                </>
              )}

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                <div>
                  <label style={S.label}>Condition</label>
                  <select value={form.Condition} onChange={e=>setForm(f=>({...f,Condition:e.target.value}))} style={S.select}>
                    {CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Location</label>
                  <select value={form.Location} onChange={e=>setForm(f=>({...f,Location:e.target.value}))} style={S.select}>
                    <option value="">— Select —</option>
                    {invLocations.map(l=><option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {form.Item_Type==='Expense'&&(
                <div style={{marginBottom:'12px'}}>
                  <label style={S.label}>Unit Price (ks)</label>
                  <input type="number" value={form.Unit_Price} onChange={e=>setForm(f=>({...f,Unit_Price:e.target.value}))} placeholder="Price per unit" style={S.input}/>
                </div>
              )}

              <div style={{marginBottom:'12px'}}>
                <label style={S.label}>Note</label>
                <textarea value={form.Note} onChange={e=>setForm(f=>({...f,Note:e.target.value}))} placeholder="Optional note…"
                  style={{...S.input,resize:'vertical',minHeight:'60px',fontFamily:'inherit'}}/>
              </div>

              {/* Photo upload with Camera */}
              <div style={{marginBottom:'16px'}}>
                <label style={S.label}>Photo</label>
                {photoPreview && !showCamera && (
                  <img src={photoPreview} alt="" style={{width:'100%',height:'140px',objectFit:'cover',borderRadius:'12px',marginBottom:'8px'}}/>
                )}

                {showCamera && (
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{
                        width: '100%',
                        borderRadius: '12px',
                        border: '2px solid rgba(255,255,255,0.1)'
                      }}
                    />
                    <button
                      onClick={capturePhoto}
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        padding: '10px 24px',
                        background: '#fbbf24',
                        color: '#000',
                        border: 'none',
                        borderRadius: '999px',
                        fontWeight: 900,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      📸 Capture
                    </button>
                  </div>
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <label style={{...S.btnSm, textAlign:'center', cursor:'pointer', position:'relative', overflow:'hidden'}}>
                    {photoUploading ? 'Uploading…' : '📁 Choose File'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    />
                  </label>
                  <button
                    onClick={showCamera ? stopCamera : startCamera}
                    style={{ ...S.btnSm, background: showCamera ? '#ef4444' : '#10b981', color: '#fff' }}
                  >
                    {showCamera ? '⏹️ Stop Camera' : '📸 Open Camera'}
                  </button>
                </div>

                {photoPreview && !showCamera && (
                  <button 
                    onClick={() => { setPhotoPreview(null); setForm(f => ({ ...f, Photo_URL: '' })); }}
                    style={{ ...S.btnSm, marginTop: '8px', width: '100%', background: '#ef4444', color: '#fff' }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              <button onClick={handleSave} disabled={saving}
                style={{...S.btn, opacity:saving?0.6:1}}>
                {saving?'Saving…':editItem?'Update Item':'Add Item'}
              </button>
              {editItem&&<button onClick={()=>{setEditItem(null);setForm(EMPTY_FORM);setPhotoPreview(null);setSelectedSuggestion(null);setItemSuggestions([]);stopCamera();}} style={{...S.btnSm,width:'100%',textAlign:'center',marginTop:'8px'}}>Cancel Edit</button>}
            </div>
          )}

          {tab==='config'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'14px',animation:'fadeIn 0.2s ease'}}>
              {[{type:'category',label:'Categories',list:invCategories,icon:'🏷'},
                {type:'location', label:'Locations',  list:invLocations, icon:'📍'}].map(({type,label,list,icon})=>(
                <div key={type} style={S.card}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                    <p style={{fontWeight:900,fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.1em',margin:0}}>{icon} {label}</p>
                    <button onClick={()=>{setConfigModal(type);setConfigNew('');}} style={{...S.btnSm,flexShrink:0}}>+ Add</button>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                    {list.map(v=>(
                      <div key={v} style={{display:'flex',alignItems:'center',gap:'4px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'99px',padding:'4px 10px'}}>
                        <span style={{fontSize:'11px',fontWeight:900}}>{v}</span>
                        <button onClick={()=>handleRemoveConfig(type,v)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',fontSize:'12px',padding:'0 2px',lineHeight:1}}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={S.card}>
                <p style={{fontWeight:900,fontSize:'12px',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 12px',color:'rgba(255,255,255,0.4)'}}>📊 Inventory Summary</p>
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  {[['Total Items', items.length],['Expense Items', expenses.length],['Capital Items', capitals.length],['Tools', tools.length],['Low Stock', lowStock.length],['Log Entries', logs.length],['Purchase Requests', requests.length]].map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      <span style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',fontWeight:900}}>{k}</span>
                      <span style={{fontSize:'11px',fontWeight:900}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </>)}
      </div>

      {/* MODALS (unchanged) */}
      {detailModal&&(
        <Modal title="Item Details" onClose={()=>setDetailModal(null)}>
          {detailModal.Photo_URL&&<img src={detailModal.Photo_URL} alt="" style={{width:'100%',borderRadius:'14px',aspectRatio:'16/9',objectFit:'cover',marginBottom:'14px'}}/>}
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
            <span style={S.pill(TYPE_COLOR[detailModal.Item_Type]||'#fff')}>{TYPE_ICON[detailModal.Item_Type]} {detailModal.Item_Type}</span>
            <span style={S.pill(detailModal.Condition==='Good'?'#34d399':detailModal.Condition==='Fair'?'#fbbf24':'#f87171')}>{detailModal.Condition}</span>
          </div>
          <p style={{fontWeight:900,fontSize:'18px',margin:'0 0 4px'}}>{detailModal.Item_Name}</p>
          <p style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',margin:'0 0 14px'}}>{detailModal.Category} · {detailModal.Location||'No location'}</p>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'14px'}}>
            {[
              detailModal.Item_Type==='Expense'?['Stock', `${detailModal.Stock_Qty||0} ${detailModal.Unit}`]:null,
              detailModal.Item_Type==='Expense'?['Min Stock', detailModal.Min_Stock||'—']:null,
              detailModal.Unit_Price?['Price', Number(detailModal.Unit_Price).toLocaleString()+' ks']:null,
              (detailModal.Item_Type==='Capital'||detailModal.Item_Type==='Tool')&&detailModal.Unit_Price&&detailModal.Purchase_Date&&detailModal.Useful_Life_Years?
                ['Current Value',(()=>{const cv=depreciatedValue(detailModal.Unit_Price,detailModal.Purchase_Date,detailModal.Useful_Life_Years);return cv!==null?cv.toLocaleString()+' ks':'—';})()]:null,
              detailModal.Purchase_Date?['Purchase Date', fmtDate(detailModal.Purchase_Date)]:null,
              detailModal.Useful_Life_Years?['Useful Life', detailModal.Useful_Life_Years+' yrs']:null,
              detailModal.Serial_No?['Serial No', detailModal.Serial_No]:null,
              detailModal.Assigned_To?['Assigned To', detailModal.Assigned_To]:null,
              detailModal.Warranty_Until?['Warranty', fmtDate(detailModal.Warranty_Until)+(daysUntil(detailModal.Warranty_Until)!==null?' ('+daysUntil(detailModal.Warranty_Until)+'d)':'')]:null,
            ].filter(Boolean).map(([k,v])=>(
              <div key={k} style={{background:'rgba(255,255,255,0.04)',borderRadius:'10px',padding:'10px'}}>
                <div style={{fontSize:'8px',color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:900,marginBottom:'3px'}}>{k}</div>
                <div style={{fontWeight:900,fontSize:'12px'}}>{v}</div>
              </div>
            ))}
          </div>

          {detailModal.Note&&<p style={{fontSize:'11px',color:'rgba(255,255,255,0.35)',fontStyle:'italic',margin:'0 0 14px',padding:'10px',background:'rgba(255,255,255,0.03)',borderRadius:'10px'}}>"{detailModal.Note}"</p>}

          <p style={{fontWeight:900,fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.1em',margin:'0 0 8px',color:'rgba(255,255,255,0.35)'}}>Item History</p>
          {detailLoading ? (
            <div style={{display:'flex',justifyContent:'center',padding:'20px'}}>
              <div style={{width:'24px',height:'24px',border:'2px solid rgba(255,255,255,0.1)',borderTop:'2px solid #fbbf24',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
            </div>
          ) : detailHistory.length===0 ? (
            <p style={{fontSize:'11px',color:'rgba(255,255,255,0.2)',textAlign:'center',padding:'16px 0'}}>No history yet</p>
          ) : (
            detailHistory.map((h,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <div>
                  <p style={{fontWeight:900,fontSize:'11px',margin:0}}>{h.Action}</p>
                  <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:'1px 0 0'}}>{h.Done_By||'—'} · {fmtShort(h.Date)}</p>
                  {h.Note&&<p style={{fontSize:'9px',color:'rgba(255,255,255,0.2)',fontStyle:'italic',margin:'1px 0 0'}}>"{h.Note}"</p>}
                </div>
                {h.Qty_Change&&<span style={S.pill((Number(h.Qty_Change)||0)>0?'#34d399':'#f87171')}>{(Number(h.Qty_Change)||0)>0?'+':''}{h.Qty_Change}</span>}
              </div>
            ))
          )}

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginTop:'16px'}}>
            {detailModal.Item_Type==='Expense'&&<>
              <button onClick={()=>{setDetailModal(null);setUsageModal(detailModal);setUsageAction('Use');setUsageQty('');setUsageNote('');}} style={{...S.btnRed}}>📤 Use Stock</button>
              <button onClick={()=>{setDetailModal(null);setUsageModal(detailModal);setUsageAction('Restock');setUsageQty('');setUsageNote('');}} style={{...S.btnGreen}}>📥 Restock</button>
            </>}
            <button onClick={()=>{setDetailModal(null);startEdit(detailModal);}} style={{...S.btnSm}}>✏️ Edit</button>
            <button onClick={()=>{setDetailModal(null);setRequestModal(detailModal);setRequestQty('');setRequestReason('');}} style={{...S.btnSm}}>🛒 Request</button>
          </div>
        </Modal>
      )}

      {usageModal&&(
        <Modal title={usageAction==='Use'?'📤 Record Usage':'📥 Restock Item'} onClose={()=>setUsageModal(null)}>
          <p style={{fontWeight:900,fontSize:'14px',marginBottom:'14px'}}>{usageModal.Item_Name}</p>
          <div style={{display:'flex',gap:'6px',marginBottom:'14px'}}>
            {['Use','Restock','Other'].map(a=>(
              <button key={a} onClick={()=>setUsageAction(a)}
                style={{background:usageAction===a?'#fbbf24':'rgba(255,255,255,0.06)',color:usageAction===a?'#09080f':'rgba(255,255,255,0.4)',border:'none',borderRadius:'9px',padding:'6px 14px',fontSize:'10px',fontWeight:900,cursor:'pointer',flex:1}}>
                {a}
              </button>
            ))}
          </div>
          <div style={{marginBottom:'12px'}}>
            <label style={S.label}>Quantity *</label>
            <input type="number" value={usageQty} onChange={e=>setUsageQty(e.target.value)} placeholder="e.g. 5" style={S.input} autoFocus/>
            {usageModal.Item_Type==='Expense'&&<p style={{fontSize:'9px',color:'rgba(255,255,255,0.25)',margin:'4px 0 0'}}>Current stock: {usageModal.Stock_Qty} {usageModal.Unit}</p>}
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={S.label}>Note</label>
            <input value={usageNote} onChange={e=>setUsageNote(e.target.value)} placeholder="Optional…" style={S.input}/>
          </div>
          <button onClick={handleUsageLog} disabled={saving} style={{...S.btn,opacity:saving?0.6:1}}>
            {saving?'Saving…':'Confirm'}
          </button>
        </Modal>
      )}

      {transferModal&&(
        <Modal title="📦 Transfer Item" onClose={()=>setTransferModal(null)}>
          <p style={{fontWeight:900,fontSize:'14px',marginBottom:'4px'}}>{transferModal.Item_Name}</p>
          <p style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'14px'}}>Current location: {transferModal.Location||'Not set'}</p>
          <div style={{marginBottom:'12px'}}>
            <label style={S.label}>New Location *</label>
            <select value={transferLoc} onChange={e=>setTransferLoc(e.target.value)} style={S.select}>
              <option value="">— Select —</option>
              {invLocations.filter(l=>l!==transferModal.Location).map(l=><option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={S.label}>Note</label>
            <input value={transferNote} onChange={e=>setTransferNote(e.target.value)} placeholder="Reason for transfer…" style={S.input}/>
          </div>
          <button onClick={handleTransfer} disabled={saving} style={{...S.btn,opacity:saving?0.6:1}}>
            {saving?'Saving…':'Confirm Transfer'}
          </button>
        </Modal>
      )}

      {requestModal&&(
        <Modal title="🛒 Purchase Request" onClose={()=>setRequestModal(null)}>
          <p style={{fontWeight:900,fontSize:'14px',marginBottom:'4px'}}>{requestModal.Item_Name}</p>
          <p style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',marginBottom:'14px'}}>{requestModal.Category||'—'}</p>
          <div style={{marginBottom:'12px'}}>
            <label style={S.label}>Quantity Needed *</label>
            <input type="number" value={requestQty} onChange={e=>setRequestQty(e.target.value)} placeholder={`Amount in ${requestModal.Unit||'units'}`} style={S.input}/>
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={S.label}>Reason *</label>
            <textarea value={requestReason} onChange={e=>setRequestReason(e.target.value)} placeholder="Why is this needed?"
              style={{...S.input,resize:'vertical',minHeight:'80px',fontFamily:'inherit'}}/>
          </div>
          <button onClick={handleRequest} disabled={saving} style={{...S.btn,opacity:saving?0.6:1}}>
            {saving?'Submitting…':'Submit Request'}
          </button>
        </Modal>
      )}

      {configModal&&(
        <Modal title={configModal==='category'?'Add Category':'Add Location'} onClose={()=>setConfigModal(null)}>
          <div style={{marginBottom:'14px'}}>
            <label style={S.label}>Name *</label>
            <input value={configNew} onChange={e=>setConfigNew(e.target.value)} placeholder={configModal==='category'?'e.g. Science Lab':'e.g. Block B'}
              style={S.input} autoFocus onKeyDown={e=>{if(e.key==='Enter')handleAddConfig();}}/>
          </div>
          <button onClick={handleAddConfig} disabled={configSaving} style={{...S.btn,opacity:configSaving?0.6:1}}>
            {configSaving?'Saving…':'Add'}
          </button>
        </Modal>
      )}
    </div>
  );
}