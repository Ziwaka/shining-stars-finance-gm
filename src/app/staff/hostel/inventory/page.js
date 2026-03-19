"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL } from '@/lib/api';

// ── Constants ───────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  'Furniture', 'Bedding', 'Electronics', 'Cleaning', 
  'Kitchen', 'Bathroom', 'Sports', 'Stationery', 
  'Uniform', 'Footwear', 'Medical', 'Other'
];

const UNITS = ['Pcs', 'Set', 'Box', 'Roll', 'Bottle', 'Pack', 'Kg', 'Liter', 'Pair', 'Dozen'];
const CONDITIONS = ['Good', 'Fair', 'Damaged', 'Need Repair', 'Disposed'];

const EMPTY_FORM = {
  Hostel_Name: '',
  Item_Name: '',
  Category: '',
  Unit: 'Pcs',
  Condition: 'Good',
  Location: '',
  Assigned_To: '',
  Purchase_Date: '',
  Unit_Price: '',
  Useful_Life_Years: '',
  Serial_No: '',
  Warranty_Until: '',
  Note: '',
  Photo_URL: '',
  Bulk_Quantity: 1
};

// ── Styles ─────────────────────────────────────────────
const styles = {
  page: { 
    display:'flex', 
    flexDirection:'column', 
    height:'100dvh', 
    overflow:'hidden', 
    background:'linear-gradient(145deg, #0f0a1e 0%, #1a1030 100%)', 
    color:'#fff', 
    fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' 
  },
  header: { 
    zIndex:40, 
    background:'rgba(15,10,30,0.9)', 
    backdropFilter:'blur(12px)', 
    borderBottom:'1px solid rgba(255,255,255,0.1)', 
    padding:'12px 16px', 
    display:'flex', 
    alignItems:'center', 
    justifyContent:'space-between' 
  },
  card: { 
    background:'rgba(255,255,255,0.07)', 
    backdropFilter:'blur(10px)', 
    border:'1px solid rgba(255,255,255,0.1)', 
    borderRadius:'20px', 
    padding:'16px', 
    cursor:'pointer', 
    transition:'all 0.3s ease', 
    boxShadow:'0 8px 20px rgba(0,0,0,0.3)',
    ':hover': {
      transform:'translateY(-2px)',
      boxShadow:'0 12px 24px rgba(0,0,0,0.4)'
    }
  },
  cardHL: { 
    background:'rgba(251,191,36,0.15)', 
    border:'1px solid rgba(251,191,36,0.3)', 
    borderRadius:'20px', 
    padding:'16px' 
  },
  input: { 
    width:'100%', 
    background:'rgba(255,255,255,0.08)', 
    border:'1px solid rgba(255,255,255,0.15)', 
    borderRadius:'14px', 
    padding:'12px 16px', 
    color:'#fff', 
    fontSize:'14px', 
    outline:'none', 
    boxSizing:'border-box', 
    transition:'all 0.2s',
    ':focus': {
      borderColor:'#fbbf24',
      boxShadow:'0 0 0 2px rgba(251,191,36,0.2)'
    }
  },
  select: { 
    width:'100%', 
    background:'rgba(15,10,30,0.9)', 
    border:'1px solid rgba(255,255,255,0.15)', 
    borderRadius:'14px', 
    padding:'12px 16px', 
    color:'#fff', 
    fontSize:'14px', 
    outline:'none', 
    boxSizing:'border-box',
    ':focus': {
      borderColor:'#fbbf24'
    }
  },
  label: { 
    display:'block', 
    fontSize:'10px', 
    color:'rgba(255,255,255,0.5)', 
    textTransform:'uppercase', 
    letterSpacing:'0.1em', 
    marginBottom:'6px' 
  },
  btn: { 
    background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
    color:'#0f172a', 
    border:'none', 
    borderRadius:'14px', 
    padding:'14px', 
    fontSize:'14px', 
    fontWeight:900, 
    width:'100%', 
    cursor:'pointer', 
    textTransform:'uppercase', 
    letterSpacing:'0.06em', 
    boxShadow:'0 4px 12px rgba(251,191,36,0.3)',
    transition:'all 0.2s',
    ':hover': {
      transform:'translateY(-1px)',
      boxShadow:'0 6px 16px rgba(251,191,36,0.4)'
    }
  },
  btnSm: { 
    background:'rgba(255,255,255,0.1)', 
    color:'rgba(255,255,255,0.8)', 
    border:'1px solid rgba(255,255,255,0.15)', 
    borderRadius:'10px', 
    padding:'8px 14px', 
    fontSize:'11px', 
    fontWeight:600, 
    cursor:'pointer', 
    flex:1, 
    textAlign:'center', 
    transition:'all 0.2s',
    ':hover': {
      background:'rgba(255,255,255,0.15)'
    }
  },
  btnRed: { 
    background:'rgba(239,68,68,0.2)', 
    color:'#f87171', 
    border:'1px solid rgba(239,68,68,0.3)', 
    borderRadius:'10px', 
    padding:'8px 14px', 
    fontSize:'11px', 
    fontWeight:600, 
    cursor:'pointer', 
    flex:1, 
    textAlign:'center' 
  },
  btnGreen: { 
    background:'rgba(52,211,153,0.2)', 
    color:'#34d399', 
    border:'1px solid rgba(52,211,153,0.3)', 
    borderRadius:'10px', 
    padding:'8px 14px', 
    fontSize:'11px', 
    fontWeight:600, 
    cursor:'pointer', 
    flex:1, 
    textAlign:'center' 
  },
  tabOn: { 
    background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', 
    color:'#0f172a', 
    border:'none', 
    borderRadius:'12px', 
    padding:'8px 16px', 
    fontSize:'11px', 
    fontWeight:900, 
    textTransform:'uppercase', 
    cursor:'pointer', 
    whiteSpace:'nowrap', 
    boxShadow:'0 4px 8px rgba(251,191,36,0.3)' 
  },
  tabOff: { 
    background:'rgba(255,255,255,0.08)', 
    color:'rgba(255,255,255,0.5)', 
    border:'1px solid rgba(255,255,255,0.1)', 
    borderRadius:'12px', 
    padding:'8px 16px', 
    fontSize:'11px', 
    fontWeight:900, 
    textTransform:'uppercase', 
    cursor:'pointer', 
    whiteSpace:'nowrap' 
  },
  pill: (color) => ({ 
    background:`${color}20`, 
    color, 
    border:`1px solid ${color}40`, 
    borderRadius:'99px', 
    padding:'4px 10px', 
    fontSize:'10px', 
    fontWeight:600, 
    display:'inline-block' 
  })
};

// ── Modal Component ─────────────────────────────────────
const Modal = ({ onClose, children, title }) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{background:'linear-gradient(145deg, #1a1030 0%, #22183a 100%)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'28px 28px 0 0',padding:'24px 24px 36px',width:'100%',maxWidth:'480px',maxHeight:'85vh',overflowY:'auto',boxShadow:'0 -10px 30px rgba(0,0,0,0.5)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <p style={{fontWeight:900,fontSize:'16px',margin:0,color:'#fbbf24'}}>{title}</p>
        <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',fontSize:'22px',cursor:'pointer',padding:'0 4px'}}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ── Category Card (Level 1) ────────────────────────────
const CategoryCard = ({ category, count, totalValue, onClick }) => (
  <div style={styles.card} onClick={onClick}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
      <div>
        <p style={{fontWeight:900, fontSize:'16px', margin:'0 0 4px', color:'#fbbf24'}}>{category}</p>
        <p style={{fontSize:'12px', color:'rgba(255,255,255,0.6)', margin:'0'}}>{count} items</p>
        <p style={{fontSize:'14px', fontWeight:600, color:'#34d399', margin:'8px 0 0'}}>{new Intl.NumberFormat().format(totalValue)} Ks</p>
      </div>
      <div style={{fontSize:'32px', opacity:0.8}}>
        {category === 'Furniture' && '🪑'}
        {category === 'Bedding' && '🛏️'}
        {category === 'Electronics' && '💻'}
        {category === 'Cleaning' && '🧹'}
        {category === 'Kitchen' && '🍳'}
        {category === 'Bathroom' && '🚿'}
        {category === 'Sports' && '⚽'}
        {category === 'Stationery' && '📝'}
        {category === 'Uniform' && '👕'}
        {category === 'Footwear' && '👟'}
        {category === 'Medical' && '💊'}
        {category === 'Other' && '📦'}
      </div>
    </div>
  </div>
);

// ── Location Card (Level 2) ────────────────────────────
const LocationCard = ({ location, count, totalValue, onClick }) => (
  <div style={styles.card} onClick={onClick}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
      <div>
        <p style={{fontWeight:900, fontSize:'15px', margin:'0 0 4px', color:'#60a5fa'}}>{location || 'Unspecified'}</p>
        <p style={{fontSize:'12px', color:'rgba(255,255,255,0.6)', margin:'0'}}>{count} items</p>
        <p style={{fontSize:'13px', fontWeight:600, color:'#34d399', margin:'8px 0 0'}}>{new Intl.NumberFormat().format(totalValue)} Ks</p>
      </div>
      <div style={{fontSize:'28px', opacity:0.8}}>📍</div>
    </div>
  </div>
);

// ── Item Type Card (Level 3) ───────────────────────────
const ItemTypeCard = ({ itemName, count, totalValue, onClick }) => (
  <div style={styles.card} onClick={onClick}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
      <div>
        <p style={{fontWeight:900, fontSize:'15px', margin:'0 0 4px', color:'#f472b6'}}>{itemName}</p>
        <p style={{fontSize:'12px', color:'rgba(255,255,255,0.6)', margin:'0'}}>{count} items</p>
        <p style={{fontSize:'13px', fontWeight:600, color:'#34d399', margin:'8px 0 0'}}>{new Intl.NumberFormat().format(totalValue)} Ks</p>
      </div>
      <div style={{fontSize:'28px', opacity:0.8}}>📦</div>
    </div>
  </div>
);

// ── Individual Item Card (Level 4) ─────────────────────
const ItemCard = ({ asset, onUpdate, onEdit }) => {
  const getPillColor = (condition) => {
    if (condition === 'Good') return '#34d399';
    if (condition === 'Fair') return '#fbbf24';
    if (condition === 'Damaged') return '#f87171';
    return '#60a5fa';
  };
  const pillColor = getPillColor(asset.Condition);
  
  return (
    <div style={{...styles.card, cursor:'default', padding:'14px'}}>
      <div style={{display:'flex', gap:'12px'}}>
        {asset.Photo_URL && (
          <img src={asset.Photo_URL} alt="" style={{width:'56px',height:'56px',objectFit:'cover',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.1)'}} />
        )}
        <div style={{flex:1}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <p style={{fontWeight:900,fontSize:'14px',margin:0}}>{asset.Item_Name}</p>
              <p style={{fontSize:'10px',color:'rgba(255,255,255,0.4)',margin:'2px 0'}}>
                {asset.Hostel_Name} · {asset.Location || 'No location'}
              </p>
              <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',margin:'2px 0'}}>
                📅 Added: {formatDate(asset.Last_Updated || asset.Created_At)} · 👤 {asset.Updated_By || asset.Created_By || 'System'}
              </p>
            </div>
            <span style={styles.pill(pillColor)}>{asset.Condition}</span>
          </div>
          {asset.Assigned_To && (
            <p style={{fontSize:'10px',color:'rgba(255,255,255,0.3)',margin:'2px 0'}}>👤 {asset.Assigned_To}</p>
          )}
          <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
            <button onClick={() => onUpdate(asset)} style={styles.btnSm}>Update</button>
            <button onClick={() => onEdit(asset)} style={styles.btnSm}>Edit</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Advanced Filter Component (Dropdown Style) ─────────
const AdvancedFilter = ({ filters, setFilters, onApply, onClear, hostels, categories }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key, value) => {
    setFilters({...filters, [key]: value});
  };

  return (
    <div style={styles.card}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
        <p style={{...styles.label, margin:0, fontSize:'11px', color:'#fbbf24'}}>🔍 FILTERS</p>
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)} 
          style={{
            ...styles.btnSm, 
            background: showAdvanced ? '#fbbf24' : 'rgba(255,255,255,0.1)',
            color: showAdvanced ? '#0f172a' : 'rgba(255,255,255,0.8)',
            fontWeight: 700
          }}
        >
          {showAdvanced ? 'Simple' : 'Advanced'}
        </button>
      </div>
      
      {/* Basic filters always visible */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px'}}>
        <input
          value={filters.search}
          onChange={e => handleChange('search', e.target.value)}
          placeholder="Search items, serial, location..."
          style={styles.input}
        />
        <select
          value={filters.hostel}
          onChange={e => handleChange('hostel', e.target.value)}
          style={styles.select}
        >
          <option value="All">All Hostels</option>
          {hostels.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>

      {/* Advanced filters (expandable) */}
      {showAdvanced && (
        <div style={{marginTop:'12px', animation:'fadeIn 0.3s ease'}}>
          <p style={{...styles.label, marginBottom:'8px'}}>MORE OPTIONS</p>
          
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px'}}>
            <select
              value={filters.category}
              onChange={e => handleChange('category', e.target.value)}
              style={styles.select}
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filters.condition}
              onChange={e => handleChange('condition', e.target.value)}
              style={styles.select}
            >
              <option value="All">All Conditions</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px'}}>
            <input
              value={filters.location}
              onChange={e => handleChange('location', e.target.value)}
              placeholder="Location contains..."
              style={styles.input}
            />
            <input
              value={filters.assignedTo}
              onChange={e => handleChange('assignedTo', e.target.value)}
              placeholder="Assigned to..."
              style={styles.input}
            />
          </div>
          
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px'}}>
            <input
              type="number"
              value={filters.minPrice}
              onChange={e => handleChange('minPrice', e.target.value)}
              placeholder="Min price (Ks)"
              style={styles.input}
            />
            <input
              type="number"
              value={filters.maxPrice}
              onChange={e => handleChange('maxPrice', e.target.value)}
              placeholder="Max price (Ks)"
              style={styles.input}
            />
          </div>
          
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px'}}>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => handleChange('dateFrom', e.target.value)}
              placeholder="From date"
              style={styles.input}
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => handleChange('dateTo', e.target.value)}
              placeholder="To date"
              style={styles.input}
            />
          </div>
          
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={onApply} style={{...styles.btnSm, background:'#fbbf24', color:'#0f172a', fontWeight:700}}>Apply Filters</button>
            <button onClick={onClear} style={styles.btnSm}>Clear All</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Format date helper ─────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

// ── Main Component ─────────────────────────────────────
export default function HostelInventoryPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [invCategories, setInvCategories] = useState(DEFAULT_CATEGORIES);
  const [invLocations, setInvLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('dashboard');
  
  // Navigation state for hierarchical view
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedItemName, setSelectedItemName] = useState(null);
  
  // Filter state for list view
  const [filters, setFilters] = useState({
    search: '',
    hostel: 'All',
    category: 'All',
    condition: 'All',
    location: '',
    assignedTo: '',
    minPrice: '',
    maxPrice: '',
    dateFrom: '',
    dateTo: ''
  });

  // Form
  const [form, setForm] = useState(EMPTY_FORM);
  const [editItem, setEditItem] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  
  // Modals
  const [updateModal, setUpdateModal] = useState(null);
  const [updateForm, setUpdateForm] = useState({ New_Condition: '', New_Location: '', New_Assigned_To: '', Note: '' });
  
  // Config Modal
  const [configModal, setConfigModal] = useState(null); // 'category' or 'location'
  const [configNew, setConfigNew] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  
  // Auto-suggest
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  
  const [msg, setMsg] = useState(null);

  // ── Auth & Fetch ──
  useEffect(() => {
    const saved = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!saved) { router.push('/login'); return; }
    try {
      const u = JSON.parse(saved);
      if (!u.Can_Manage_Hostel && u.userRole !== 'management') { router.push('/staff'); return; }
      setUser(u);
      fetchAll();
      fetchConfig();
    } catch { router.push('/login'); }
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, logRes] = await Promise.all([
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getHostelInventory' }) }),
        fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getHostelInventoryLog' }) })
      ]);
      
      const assetsData = await assetsRes.json();
      const logData = await logRes.json();
      
      if (assetsData.success) {
        setAssets(assetsData.data || []);
        const uniqueHostels = [...new Set((assetsData.data || []).map(a => a.Hostel_Name).filter(Boolean))];
        setHostels(uniqueHostels);
      } else {
        setError(assetsData.message);
      }
      
      if (logData.success) {
        setLogs(logData.data || []);
      } else {
        console.warn('Log fetch failed:', logData.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action:'getInventoryConfig' }) });
      const data = await res.json();
      if (data.success) {
        if (data.categories?.length) setInvCategories(data.categories);
        if (data.locations?.length) setInvLocations(data.locations);
      }
    } catch (e) {
      console.error('Failed to fetch config:', e);
    }
  };

  const showMsg = (text, type = 'success') => { setMsg({text,type}); setTimeout(() => setMsg(null),3000); };

  // ── Camera Functions ──
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        setShowCamera(true);
      }
    } catch { showMsg('Camera access denied', 'error'); }
  };
  const stopCamera = () => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    setShowCamera(false);
  };
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.7);
      setPhotoBase64(base64);
      setPhotoPreview(base64);
      setForm(f => ({ ...f, Photo_URL: base64 }));
      stopCamera();
    }
  };
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showMsg('Photo size < 2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoBase64(reader.result);
      setPhotoPreview(reader.result);
      setForm(f => ({ ...f, Photo_URL: reader.result }));
    };
    reader.readAsDataURL(file);
  };
  const removePhoto = () => {
    setPhotoBase64('');
    setPhotoPreview('');
    setForm(f => ({ ...f, Photo_URL: '' }));
  };
  useEffect(() => () => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()); }, [cameraStream]);

  // ── Auto-suggest ──
  const handleItemNameChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, Item_Name: value });
    if (value.length >= 2) {
      const suggestions = assets
        .filter(a => {
          const name = a.Item_Name || '';
          return name.toLowerCase().includes(value.toLowerCase()) && a.Hostel_Name === form.Hostel_Name;
        })
        .map(a => ({ name: a.Item_Name, category: a.Category, unit: a.Unit }))
        .filter((v, i, a) => i === a.findIndex(t => t.name === v.name))
        .slice(0, 5);
      setItemSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else { setShowSuggestions(false); setItemSuggestions([]); }
  };
  const selectSuggestion = (s) => {
    setSelectedSuggestion(s);
    setForm({ ...form, Item_Name: s.name, Category: s.category, Unit: s.unit });
    setShowSuggestions(false);
  };

  // ── Config Handlers ──
  const handleAddConfig = async () => {
    const val = configNew.trim();
    if (!val) return;
    setConfigSaving(true);
    try {
      const isCat = configModal === 'category';
      const updated = isCat ? [...invCategories, val] : [...invLocations, val];
      const payload = isCat ? { action:'saveInventoryConfig', categories: updated } : { action:'saveInventoryConfig', locations: updated };
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        if (isCat) setInvCategories(updated);
        else setInvLocations(updated);
        showMsg(`"${val}" added`);
        setConfigModal(null);
        setConfigNew('');
      } else {
        showMsg(data.message || 'Error', 'error');
      }
    } catch {
      showMsg('Network error', 'error');
    }
    setConfigSaving(false);
  };

  const handleRemoveConfig = async (type, val) => {
    if (!confirm(`Remove "${val}"?`)) return;
    const updated = type === 'category' ? invCategories.filter(c => c !== val) : invLocations.filter(l => l !== val);
    try {
      const payload = type === 'category' ? { action:'saveInventoryConfig', categories: updated } : { action:'saveInventoryConfig', locations: updated };
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        if (type === 'category') setInvCategories(updated);
        else setInvLocations(updated);
        showMsg(`"${val}" removed`);
      } else {
        showMsg(data.message || 'Error', 'error');
      }
    } catch {
      showMsg('Network error', 'error');
    }
  };

  // ── Save (Single or Bulk) ──
  const handleSave = async () => {
    if (!form.Item_Name) return showMsg('Item name required', 'error');
    if (!form.Hostel_Name) return showMsg('Select hostel', 'error');
    
    setSaving(true);
    try {
      if (form.Bulk_Quantity > 1) {
        const items = [];
        for (let i = 0; i < form.Bulk_Quantity; i++) {
          items.push({
            Hostel_Name: form.Hostel_Name,
            Item_Name: form.Item_Name,
            Category: form.Category,
            Unit: form.Unit,
            Condition: form.Condition,
            Location: form.Location,
            Assigned_To: form.Assigned_To,
            Purchase_Date: form.Purchase_Date,
            Unit_Price: form.Unit_Price,
            Useful_Life_Years: form.Useful_Life_Years,
            Serial_No: form.Serial_No,
            Warranty_Until: form.Warranty_Until,
            Note: form.Note,
            Photo_URL: form.Photo_URL,
            Updated_By: user?.Name || user?.username || ''
          });
        }
        const res = await fetch(WEB_APP_URL, {
          method:'POST',
          body: JSON.stringify({ action:'addHostelItemsBulk', items, userRole: user?.userRole||'staff', staffId: user?.Staff_ID||user?.username||'' })
        });
        const data = await res.json();
        if (data.success) {
          showMsg(`${form.Bulk_Quantity} items added`);
          setForm(EMPTY_FORM);
          setEditItem(null);
          setPhotoPreview('');
          setSelectedCategory(null);
          setSelectedLocation(null);
          setSelectedItemName(null);
          fetchAll();
        } else showMsg(data.message, 'error');
      } else {
        const action = editItem ? 'updateHostelItem' : 'addHostelItem';
        const payload = editItem ? { ...form, Asset_ID: editItem.Asset_ID, Updated_By: user?.Name } : { ...form, Updated_By: user?.Name };
        const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify({ action, ...payload, userRole: user?.userRole||'staff', staffId: user?.Staff_ID||user?.username||'' }) });
        const data = await res.json();
        if (data.success) {
          showMsg(editItem ? 'Updated' : 'Added');
          setForm(EMPTY_FORM);
          setEditItem(null);
          setPhotoPreview('');
          setSelectedCategory(null);
          setSelectedLocation(null);
          setSelectedItemName(null);
          fetchAll();
        } else showMsg(data.message, 'error');
      }
    } catch { showMsg('Network error', 'error'); }
    setSaving(false);
  };

  // ── Update Asset ──
  const handleUpdate = async () => {
    if (!updateModal) return;
    setSaving(true);
    try {
      const payload = {
        action: 'logHostelUsage',
        Asset_ID: updateModal.Asset_ID,
        Item_Name: updateModal.Item_Name,
        Hostel_Name: updateModal.Hostel_Name,
        Done_By: user?.Name || '',
        userRole: user?.userRole||'staff', staffId: user?.Staff_ID||user?.username||'',
        ...updateForm
      };
      const res = await fetch(WEB_APP_URL, { method:'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        showMsg('Asset updated');
        setUpdateModal(null);
        setUpdateForm({ New_Condition: '', New_Location: '', New_Assigned_To: '', Note: '' });
        fetchAll();
      } else showMsg(data.message, 'error');
    } catch { showMsg('Network error', 'error'); }
    setSaving(false);
  };

  const startEdit = (asset) => {
    setEditItem(asset);
    setForm({ ...EMPTY_FORM, ...asset, Category: asset.Category || '' });
    setPhotoPreview(asset.Photo_URL || '');
    setPhotoBase64(asset.Photo_URL || '');
    setTab('add');
  };

  // ── Data Processing for Hierarchical View ──
  
  // Level 1: Categories
  const categorySummary = useMemo(() => {
    const map = {};
    assets.forEach(a => {
      const cat = a.Category || 'Other';
      if (!map[cat]) {
        map[cat] = { count: 0, totalValue: 0 };
      }
      map[cat].count++;
      map[cat].totalValue += Number(a.Unit_Price || 0);
    });
    return Object.entries(map).map(([cat, data]) => ({ category: cat, ...data }));
  }, [assets]);

  // Level 2: Locations within selected category
  const locationsInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    const map = {};
    assets
      .filter(a => (a.Category || 'Other') === selectedCategory)
      .forEach(a => {
        const loc = a.Location || 'Unspecified';
        if (!map[loc]) {
          map[loc] = { count: 0, totalValue: 0 };
        }
        map[loc].count++;
        map[loc].totalValue += Number(a.Unit_Price || 0);
      });
    return Object.entries(map).map(([loc, data]) => ({ location: loc, ...data }));
  }, [assets, selectedCategory]);

  // Level 3: Item types within selected category and location
  const itemTypesInLocation = useMemo(() => {
    if (!selectedCategory || !selectedLocation) return [];
    const map = {};
    assets
      .filter(a => (a.Category || 'Other') === selectedCategory && (a.Location || 'Unspecified') === selectedLocation)
      .forEach(a => {
        const name = a.Item_Name || 'Unknown';
        if (!map[name]) {
          map[name] = { count: 0, totalValue: 0 };
        }
        map[name].count++;
        map[name].totalValue += Number(a.Unit_Price || 0);
      });
    return Object.entries(map).map(([name, data]) => ({ itemName: name, ...data }));
  }, [assets, selectedCategory, selectedLocation]);

  // Level 4: Individual items of selected item type in selected location
  const itemsOfType = useMemo(() => {
    if (!selectedCategory || !selectedLocation || !selectedItemName) return [];
    return assets.filter(a => 
      (a.Category || 'Other') === selectedCategory &&
      (a.Location || 'Unspecified') === selectedLocation &&
      a.Item_Name === selectedItemName
    );
  }, [assets, selectedCategory, selectedLocation, selectedItemName]);

  // ── Filtered assets for List View (using advanced filters) ──
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      // Basic search
      const itemName = a.Item_Name || '';
      const serial = a.Serial_No || '';
      const location = a.Location || '';
      const assigned = a.Assigned_To || '';
      const matchesSearch = !filters.search || 
        itemName.toLowerCase().includes(filters.search.toLowerCase()) ||
        serial.toLowerCase().includes(filters.search.toLowerCase()) ||
        location.toLowerCase().includes(filters.search.toLowerCase()) ||
        assigned.toLowerCase().includes(filters.search.toLowerCase());

      // Hostel filter
      const matchesHostel = filters.hostel === 'All' || a.Hostel_Name === filters.hostel;

      // Category filter
      const matchesCategory = filters.category === 'All' || a.Category === filters.category;

      // Condition filter
      const matchesCondition = filters.condition === 'All' || a.Condition === filters.condition;

      // Location contains filter
      const matchesLocation = !filters.location || (a.Location || '').toLowerCase().includes(filters.location.toLowerCase());

      // Assigned to contains filter
      const matchesAssigned = !filters.assignedTo || (a.Assigned_To || '').toLowerCase().includes(filters.assignedTo.toLowerCase());

      // Price range
      const price = Number(a.Unit_Price) || 0;
      const matchesMinPrice = !filters.minPrice || price >= Number(filters.minPrice);
      const matchesMaxPrice = !filters.maxPrice || price <= Number(filters.maxPrice);

      // Date range (using Last_Updated or Created_At)
      const dateStr = a.Last_Updated || a.Created_At || '';
      let itemDate = null;
      if (dateStr) {
        try {
          itemDate = new Date(dateStr);
        } catch { itemDate = null; }
      }
      const matchesDateFrom = !filters.dateFrom || (itemDate && itemDate >= new Date(filters.dateFrom));
      const matchesDateTo = !filters.dateTo || (itemDate && itemDate <= new Date(filters.dateTo));

      return matchesSearch && matchesHostel && matchesCategory && matchesCondition &&
             matchesLocation && matchesAssigned && matchesMinPrice && matchesMaxPrice &&
             matchesDateFrom && matchesDateTo;
    });
  }, [assets, filters]);

  // ── Loading / Error ──
  if (loading) return <div style={styles.page}>Loading...</div>;
  if (error) return <div style={styles.page}>Error: {error}</div>;

  const TABS = [
    { id:'dashboard', label:'📊 Dashboard' },
    { id:'list', label:`📋 Assets (${assets.length})` },
    { id:'add', label: editItem ? '✏️ Edit' : '➕ Add' },
    { id:'log', label:'📝 Log' },
    { id:'config', label:'⚙️ Config' }
  ];

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      hostel: 'All',
      category: 'All',
      condition: 'All',
      location: '',
      assignedTo: '',
      minPrice: '',
      maxPrice: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  // Apply filters (just triggers re-render via useMemo)
  const applyFilters = () => {
    showMsg('Filters applied', 'success');
  };

  return (
    <div style={styles.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => router.back()} style={{background:'none',border:'none',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:'16px'}}>← Back</button>
        <div style={{textAlign:'center'}}>
          <p style={{fontWeight:900,fontSize:'14px',textTransform:'uppercase',letterSpacing:'0.1em',margin:0,color:'#fbbf24'}}>📦 Hostel Inventory</p>
        </div>
        <button onClick={fetchAll} style={{background:'none',border:'none',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:'18px'}}>↻</button>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{position:'fixed',top:'72px',left:'50%',transform:'translateX(-50%)',zIndex:60,padding:'10px 24px',borderRadius:'999px',fontSize:'12px',fontWeight:600,color:'#fff',background:msg.type === 'error' ? 'rgba(239,68,68,0.9)' : 'rgba(16,185,129,0.9)',backdropFilter:'blur(8px)',boxShadow:'0 4px 12px rgba(0,0,0,0.3)'}}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:'8px',padding:'12px 16px 0',overflowX:'auto'}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { 
            setTab(t.id); 
            setSelectedCategory(null);
            setSelectedLocation(null);
            setSelectedItemName(null);
            if (t.id === 'add' && !editItem) setForm({ ...EMPTY_FORM, Hostel_Name: hostels[0] || '' }); 
          }}
            style={tab === t.id ? styles.tabOn : styles.tabOff}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1, overflowY:'auto', padding:'16px 16px 80px'}}>
        
        {/* ── DASHBOARD (Hierarchical View) ── */}
        {tab === 'dashboard' && (
          <div>
            {/* Breadcrumb navigation */}
            {(selectedCategory || selectedLocation || selectedItemName) && (
              <div style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'20px', flexWrap:'wrap'}}>
                <button onClick={() => {
                  setSelectedCategory(null);
                  setSelectedLocation(null);
                  setSelectedItemName(null);
                }} style={{...styles.btnSm, width:'auto'}}>🏠 All Categories</button>
                {selectedCategory && !selectedLocation && (
                  <span style={{color:'#fbbf24', fontSize:'14px'}}>› {selectedCategory}</span>
                )}
                {selectedCategory && selectedLocation && (
                  <>
                    <button onClick={() => setSelectedLocation(null)} style={{...styles.btnSm, width:'auto'}}>‹ {selectedCategory}</button>
                    <span style={{color:'#60a5fa', fontSize:'14px'}}>› {selectedLocation}</span>
                  </>
                )}
                {selectedCategory && selectedLocation && selectedItemName && (
                  <>
                    <button onClick={() => setSelectedItemName(null)} style={{...styles.btnSm, width:'auto'}}>‹ {selectedLocation}</button>
                    <span style={{color:'#f472b6', fontSize:'14px'}}>› {selectedItemName}</span>
                  </>
                )}
              </div>
            )}

            {/* Level 1: Categories */}
            {!selectedCategory && (
              <div>
                <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'12px'}}>CATEGORIES</p>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px'}}>
                  {categorySummary.map(({category, count, totalValue}) => (
                    <CategoryCard 
                      key={category}
                      category={category}
                      count={count}
                      totalValue={totalValue}
                      onClick={() => setSelectedCategory(category)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Level 2: Locations */}
            {selectedCategory && !selectedLocation && (
              <div>
                <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'12px'}}>LOCATIONS IN {selectedCategory.toUpperCase()}</p>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px'}}>
                  {locationsInCategory.map(({location, count, totalValue}) => (
                    <LocationCard 
                      key={location}
                      location={location}
                      count={count}
                      totalValue={totalValue}
                      onClick={() => setSelectedLocation(location)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Level 3: Item Types */}
            {selectedCategory && selectedLocation && !selectedItemName && (
              <div>
                <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'12px'}}>ITEMS IN {selectedLocation}</p>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px'}}>
                  {itemTypesInLocation.map(({itemName, count, totalValue}) => (
                    <ItemTypeCard 
                      key={itemName}
                      itemName={itemName}
                      count={count}
                      totalValue={totalValue}
                      onClick={() => setSelectedItemName(itemName)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Level 4: Individual Items */}
            {selectedCategory && selectedLocation && selectedItemName && (
              <div>
                <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'12px'}}>{selectedItemName} ({itemsOfType.length} items)</p>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                  {itemsOfType.map(asset => (
                    <ItemCard 
                      key={asset.Asset_ID} 
                      asset={asset}
                      onUpdate={(a) => {
                        setUpdateModal(a);
                        setUpdateForm({ New_Condition: a.Condition, New_Location: a.Location, New_Assigned_To: a.Assigned_To, Note: '' });
                      }}
                      onEdit={startEdit}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LIST (Advanced Filters) ── */}
        {tab === 'list' && (
          <div>
            <AdvancedFilter 
              filters={filters}
              setFilters={setFilters}
              onApply={applyFilters}
              onClear={clearFilters}
              hostels={hostels}
              categories={invCategories}
            />

            <p style={{fontSize:'11px',color:'rgba(255,255,255,0.4)',margin:'12px 0'}}>{filteredAssets.length} assets found</p>

            {filteredAssets.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.3)'}}>
                <div style={{fontSize:'48px',marginBottom:'16px'}}>📭</div>
                <p>No assets match your filters</p>
              </div>
            ) : (
              filteredAssets.map(asset => (
                <ItemCard 
                  key={asset.Asset_ID} 
                  asset={asset}
                  onUpdate={(a) => {
                    setUpdateModal(a);
                    setUpdateForm({ New_Condition: a.Condition, New_Location: a.Location, New_Assigned_To: a.Assigned_To, Note: '' });
                  }}
                  onEdit={startEdit}
                />
              ))
            )}
          </div>
        )}

        {/* ── ADD / EDIT ── */}
        {tab === 'add' && (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <div style={styles.card}>
              <label style={styles.label}>Hostel *</label>
              <select value={form.Hostel_Name} onChange={e => setForm({ ...form, Hostel_Name: e.target.value })} style={styles.select}>
                <option value="">Select Hostel</option>
                {hostels.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div style={{...styles.card, position:'relative'}}>
              <label style={styles.label}>Item Name *</label>
              <input value={form.Item_Name} onChange={handleItemNameChange} onFocus={() => { if (form.Item_Name?.length >= 2) setShowSuggestions(true); }} onBlur={() => setTimeout(() => setShowSuggestions(false),200)} placeholder="e.g. Bed, Chair" style={styles.input} />
              {showSuggestions && (
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#1a1030',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',marginTop:'4px',zIndex:10,maxHeight:'200px',overflowY:'auto'}}>
                  {itemSuggestions.map((s,i) => (
                    <div key={i} onMouseDown={() => selectSuggestion(s)} style={{padding:'10px 14px',borderBottom:i < itemSuggestions.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none',cursor:'pointer'}} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{fontWeight:900,fontSize:'13px'}}>{s.name}</div>
                      <div style={{fontSize:'9px',color:'rgba(255,255,255,0.4)'}}>{s.category} · {s.unit}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={styles.card}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                <div>
                  <label style={styles.label}>Category</label>
                  <select value={form.Category} onChange={e => setForm({ ...form, Category: e.target.value })} style={styles.select}>
                    <option value="">Select Category</option>
                    {invCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Unit</label>
                  <select value={form.Unit} onChange={e => setForm({ ...form, Unit: e.target.value })} style={styles.select}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                <div>
                  <label style={styles.label}>Condition</label>
                  <select value={form.Condition} onChange={e => setForm({ ...form, Condition: e.target.value })} style={styles.select}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Location / Room</label>
                  <input value={form.Location} onChange={e => setForm({ ...form, Location: e.target.value })} placeholder="e.g. Room 101" style={styles.input} />
                </div>
              </div>

              <div style={{marginBottom:'12px'}}>
                <label style={styles.label}>Assigned To (Student/Staff)</label>
                <input value={form.Assigned_To} onChange={e => setForm({ ...form, Assigned_To: e.target.value })} placeholder="Name" style={styles.input} />
              </div>
            </div>

            <div style={styles.card}>
              <p style={styles.label}>Purchase Details</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                <div>
                  <label style={styles.label}>Purchase Date</label>
                  <input type="date" value={form.Purchase_Date} onChange={e => setForm({ ...form, Purchase_Date: e.target.value })} style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Unit Price (Ks)</label>
                  <input type="number" value={form.Unit_Price} onChange={e => setForm({ ...form, Unit_Price: e.target.value })} placeholder="0" style={styles.input} />
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                <div>
                  <label style={styles.label}>Useful Life (years)</label>
                  <input type="number" value={form.Useful_Life_Years} onChange={e => setForm({ ...form, Useful_Life_Years: e.target.value })} placeholder="e.g. 5" style={styles.input} />
                </div>
                <div>
                  <label style={styles.label}>Warranty Until</label>
                  <input type="date" value={form.Warranty_Until} onChange={e => setForm({ ...form, Warranty_Until: e.target.value })} style={styles.input} />
                </div>
              </div>
              <div>
                <label style={styles.label}>Serial No</label>
                <input value={form.Serial_No} onChange={e => setForm({ ...form, Serial_No: e.target.value })} placeholder="Optional" style={styles.input} />
              </div>
            </div>

            <div style={styles.card}>
              <label style={styles.label}>Note</label>
              <textarea value={form.Note} onChange={e => setForm({ ...form, Note: e.target.value })} placeholder="Additional info" style={{...styles.input, minHeight:'60px'}} />
            </div>

            {!editItem && (
              <div style={styles.card}>
                <label style={styles.label}>Quantity (Bulk Add)</label>
                <input type="number" min="1" value={form.Bulk_Quantity} onChange={e => setForm({ ...form, Bulk_Quantity: parseInt(e.target.value) || 1 })} style={styles.input} />
                <p style={{fontSize:'9px',color:'rgba(255,255,255,0.3)',marginTop:'4px'}}>Enter &gt;1 to add multiple identical items</p>
              </div>
            )}

            <div style={styles.card}>
              <label style={styles.label}>Photo</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                <button onClick={() => fileInputRef.current?.click()} style={{...styles.btnSm, padding:'10px'}}>📁 Choose File</button>
                <button onClick={showCamera ? stopCamera : startCamera} style={{...styles.btnSm, padding:'10px', background:showCamera ? '#ef4444' : '#10b981', color:'#fff'}}>
                  {showCamera ? '⏹️ Stop' : '📸 Camera'}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} style={{display:'none'}} />
              {showCamera && (
                <div style={{position:'relative',marginBottom:'8px'}}>
                  <video ref={videoRef} autoPlay playsInline style={{width:'100%',borderRadius:'12px'}} />
                  <button onClick={capturePhoto} style={{position:'absolute',bottom:'16px',left:'50%',transform:'translateX(-50%)',padding:'8px 24px',background:'#fbbf24',border:'none',borderRadius:'999px',fontWeight:900}}>📸 Capture</button>
                </div>
              )}
              <canvas ref={canvasRef} style={{display:'none'}} />
              {photoPreview && !showCamera && (
                <div style={{textAlign:'center'}}>
                  <img src={photoPreview} alt="preview" style={{maxWidth:'100%',maxHeight:'150px',borderRadius:'8px',marginBottom:'8px'}} />
                  <button onClick={removePhoto} style={{...styles.btnSm, background:'#ef4444', color:'#fff'}}>Remove</button>
                </div>
              )}
            </div>

            <button onClick={handleSave} disabled={saving} style={{...styles.btn, opacity:saving ? 0.5 : 1}}>
              {saving ? 'Saving...' : editItem ? 'Update Asset' : 'Add Asset'}
            </button>
            {editItem && <button onClick={() => { setEditItem(null); setForm({ ...EMPTY_FORM, Hostel_Name: hostels[0] || '' }); setPhotoPreview(''); }} style={{...styles.btnSm, width:'100%', marginTop:'8px'}}>Cancel</button>}
          </div>
        )}

        {/* ── LOG ── */}
        {tab === 'log' && (
          <div>
            {logs.length === 0 ? (
              <div style={{textAlign:'center',padding:'60px 0',color:'rgba(255,255,255,0.3)'}}>
                <div style={{fontSize:'48px',marginBottom:'16px'}}>📭</div>
                <p>No activity logs yet</p>
              </div>
            ) : (
              logs.slice(0, 50).map((log, i) => (
                <div key={i} style={{...styles.card, cursor:'default', marginBottom:'10px'}}>
                  <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <div style={{width:'36px',height:'36px',borderRadius:'12px',background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px'}}>
                      {log.Action === 'Add' && '➕'}
                      {log.Action === 'Update' && '✏️'}
                      {log.Action === 'Transfer' && '🔄'}
                      {log.Action === 'Use' && '📤'}
                      {log.Action === 'Restock' && '📥'}
                      {!['Add','Update','Transfer','Use','Restock'].includes(log.Action) && '📋'}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <p style={{fontWeight:900, fontSize:'13px', margin:0}}>{log.Item_Name}</p>
                        <span style={styles.pill('#60a5fa')}>{log.Action}</span>
                      </div>
                      <p style={{fontSize:'10px', color:'rgba(255,255,255,0.4)', margin:'4px 0 0'}}>
                        {log.Hostel_Name} · {formatDate(log.Date)} · by {log.Done_By || 'System'}
                      </p>
                      {log.Note && (
                        <p style={{fontSize:'10px', color:'rgba(255,255,255,0.3)', margin:'4px 0 0', fontStyle:'italic'}}>
                          "{log.Note}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── CONFIG TAB ── */}
        {tab === 'config' && (
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {/* Categories */}
            <div style={styles.card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <p style={{fontWeight:900,fontSize:'12px',textTransform:'uppercase',color:'#fbbf24'}}>🏷️ Categories</p>
                <button onClick={()=>{setConfigModal('category'); setConfigNew('');}} style={styles.btnSm}>+ Add</button>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                {invCategories.map(cat => (
                  <div key={cat} style={{display:'flex',alignItems:'center',gap:'4px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'99px',padding:'4px 10px'}}>
                    <span style={{fontSize:'11px',fontWeight:900}}>{cat}</span>
                    <button onClick={()=>handleRemoveConfig('category',cat)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',fontSize:'12px',padding:'0 2px'}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
            {/* Locations */}
            <div style={styles.card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                <p style={{fontWeight:900,fontSize:'12px',textTransform:'uppercase',color:'#60a5fa'}}>📍 Locations</p>
                <button onClick={()=>{setConfigModal('location'); setConfigNew('');}} style={styles.btnSm}>+ Add</button>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                {invLocations.map(loc => (
                  <div key={loc} style={{display:'flex',alignItems:'center',gap:'4px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'99px',padding:'4px 10px'}}>
                    <span style={{fontSize:'11px',fontWeight:900}}>{loc}</span>
                    <button onClick={()=>handleRemoveConfig('location',loc)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.3)',cursor:'pointer',fontSize:'12px',padding:'0 2px'}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
            {/* Summary */}
            <div style={styles.card}>
              <p style={{fontWeight:900,fontSize:'12px',textTransform:'uppercase',color:'rgba(255,255,255,0.5)'}}>📊 Inventory Summary</p>
              <div style={{display:'flex',flexDirection:'column',gap:'6px',marginTop:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Total Assets</span><span>{assets.length}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Categories</span><span>{invCategories.length}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Locations</span><span>{invLocations.length}</span></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span>Total Value</span><span>{new Intl.NumberFormat().format(assets.reduce((s,a)=>s+Number(a.Unit_Price||0),0))} Ks</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Update Modal */}
      {updateModal && (
        <Modal title={`Update: ${updateModal.Item_Name}`} onClose={() => setUpdateModal(null)}>
          <div style={{marginBottom:'12px'}}>
            <label style={styles.label}>Condition</label>
            <select value={updateForm.New_Condition} onChange={e => setUpdateForm({ ...updateForm, New_Condition: e.target.value })} style={styles.select}>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{marginBottom:'12px'}}>
            <label style={styles.label}>Location</label>
            <input value={updateForm.New_Location} onChange={e => setUpdateForm({ ...updateForm, New_Location: e.target.value })} placeholder="New location" style={styles.input} />
          </div>
          <div style={{marginBottom:'12px'}}>
            <label style={styles.label}>Assigned To</label>
            <input value={updateForm.New_Assigned_To} onChange={e => setUpdateForm({ ...updateForm, New_Assigned_To: e.target.value })} placeholder="Person" style={styles.input} />
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={styles.label}>Note</label>
            <input value={updateForm.Note} onChange={e => setUpdateForm({ ...updateForm, Note: e.target.value })} placeholder="Reason" style={styles.input} />
          </div>
          <button onClick={handleUpdate} disabled={saving} style={{...styles.btn, opacity:saving ? 0.5 : 1}}>
            {saving ? 'Updating...' : 'Update'}
          </button>
        </Modal>
      )}

      {/* Config Add Modal */}
      {configModal && (
        <Modal title={configModal === 'category' ? 'Add Category' : 'Add Location'} onClose={() => setConfigModal(null)}>
          <div style={{marginBottom:'14px'}}>
            <label style={styles.label}>Name *</label>
            <input value={configNew} onChange={e => setConfigNew(e.target.value)} placeholder={configModal === 'category' ? 'e.g. Electronics' : 'e.g. Room 101'} style={styles.input} autoFocus onKeyDown={e=>{if(e.key==='Enter') handleAddConfig();}} />
          </div>
          <button onClick={handleAddConfig} disabled={configSaving} style={{...styles.btn, opacity:configSaving ? 0.5 : 1}}>
            {configSaving ? 'Adding...' : 'Add'}
          </button>
        </Modal>
      )}
    </div>
  );
}