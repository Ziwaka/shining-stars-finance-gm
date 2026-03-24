"use client"
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Save, RefreshCcw, Camera, Upload, ScanLine, Zap, RotateCcw, ArrowUpRight, ArrowDownLeft, MessageSquare, Hash, Banknote, Search, User, Wallet, BellRing, Phone, MapPin, Briefcase, X, Check } from 'lucide-react';

/* ─── AUTO ENHANCE ─────────────────────────────────────────── */
function autoEnhance(src: ImageData): ImageData {
  const d = new Uint8ClampedArray(src.data);
  const minC = [255, 255, 255], maxC = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4)
    for (let c = 0; c < 3; c++) { if (d[i+c] < minC[c]) minC[c]=d[i+c]; if (d[i+c] > maxC[c]) maxC[c]=d[i+c]; }
  for (let i = 0; i < d.length; i += 4)
    for (let c = 0; c < 3; c++) {
      let v = ((d[i+c]-minC[c])/(maxC[c]-minC[c]||1))*255;
      v = 128 + (v-128)*1.25;
      d[i+c] = Math.max(0,Math.min(255,v));
    }
  const {width,height}=src, blur=new Float32Array(width*height*4);
  const k=[1/16,2/16,1/16,2/16,4/16,2/16,1/16,2/16,1/16];
  for (let y=1;y<height-1;y++) for (let x=1;x<width-1;x++) {
    const base=(y*width+x)*4; let ki=0;
    for (let c=0;c<3;c++) { let s=0; ki=0; for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) s+=d[((y+dy)*width+(x+dx))*4+c]*k[ki++]; blur[base+c]=s; }
  }
  for (let i=0;i<d.length;i+=4) for (let c=0;c<3;c++) d[i+c]=Math.max(0,Math.min(255,d[i+c]+0.6*(d[i+c]-blur[i+c])));
  return new ImageData(d,width,height);
}

/* ─── AUTO CROP ─────────────────────────────────────────────── */
function autoCrop(imageData: ImageData): {top:number;bottom:number;left:number;right:number}|null {
  const {data,width,height}=imageData;
  const gray=new Float32Array(width*height);
  for (let i=0;i<width*height;i++) gray[i]=0.299*data[i*4]+0.587*data[i*4+1]+0.114*data[i*4+2];
  const edges=new Float32Array(width*height); let maxE=0;
  for (let y=1;y<height-1;y++) for (let x=1;x<width-1;x++) {
    const gx=-gray[(y-1)*width+(x-1)]-2*gray[y*width+(x-1)]-gray[(y+1)*width+(x-1)]+gray[(y-1)*width+(x+1)]+2*gray[y*width+(x+1)]+gray[(y+1)*width+(x+1)];
    const gy=-gray[(y-1)*width+(x-1)]-2*gray[(y-1)*width+x]-gray[(y-1)*width+(x+1)]+gray[(y+1)*width+(x-1)]+2*gray[(y+1)*width+x]+gray[(y+1)*width+(x+1)];
    const e=Math.sqrt(gx*gx+gy*gy); edges[y*width+x]=e; if(e>maxE)maxE=e;
  }
  const thr=maxE*0.08; let top=height,bottom=0,left=width,right=0;
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) if(edges[y*width+x]>thr) { if(y<top)top=y; if(y>bottom)bottom=y; if(x<left)left=x; if(x>right)right=x; }
  if (right-left<width*0.2||bottom-top<height*0.2) return null;
  const m=Math.round(Math.min(width,height)*0.025);
  return {top:Math.max(0,top-m),bottom:Math.min(height,bottom+m),left:Math.max(0,left-m),right:Math.min(width,right+m)};
}

/* ─── CLAMP ─────────────────────────────────────────────────── */
const clamp = (v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

/* ─── PROCESS PIPELINE ──────────────────────────────────────── */
function processImagePipeline(src: string, onDone: (r:string)=>void) {
  const img=new Image();
  img.onload=()=>{
    const rc=document.createElement('canvas'); rc.width=img.width; rc.height=img.height;
    const rctx=rc.getContext('2d')!; rctx.drawImage(img,0,0);
    let id=autoEnhance(rctx.getImageData(0,0,rc.width,rc.height));
    rctx.putImageData(id,0,0);
    const b=autoCrop(id); let fc=rc;
    if(b){const cw=b.right-b.left,ch=b.bottom-b.top; fc=document.createElement('canvas'); fc.width=cw; fc.height=ch; fc.getContext('2d')!.drawImage(rc,b.left,b.top,cw,ch,0,0,cw,ch);}
    const MAX=1400, scale=Math.min(1,MAX/fc.width,MAX/fc.height);
    if(scale<1){const rs=document.createElement('canvas'); rs.width=Math.round(fc.width*scale); rs.height=Math.round(fc.height*scale); rs.getContext('2d')!.drawImage(fc,0,0,rs.width,rs.height); fc=rs;}
    onDone(fc.toDataURL('image/jpeg',0.88));
  };
  img.src=src;
}

export default function VoucherForm({ onRefresh }: { onRefresh: () => void }) {
  const [type, setType] = useState<'Cash Out' | 'Cash In'>('Cash Out');
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherno, setVoucherno] = useState('');
  const [image, setImage] = useState<string>('');
  const [itemList, setItemList] = useState<any[]>([]);
  const [enteredBy, setEnteredBy] = useState('');
  const [account, setAccount] = useState('');
  const [config, setConfig] = useState<any>({ categoryList: [], prefixes: {}, lastSerials: {}, suppliers: [], recentItems: [], users: [], accounts: [] });
  const [category, setCategory] = useState('');
  const [sub1, setSub1] = useState('');
  const [sub2, setSub2] = useState('');
  const [sub3, setSub3] = useState('');
  const [sub4, setSub4] = useState('');
  const [sub5, setSub5] = useState('');
  const [currentItem, setCurrentItem] = useState({ item_description: '', brand: '', count: '' as any, cost_piece: '' as any, cost_total: '' as any, note: '', km: '' as any });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [toastMsg, setToastMsg] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierDropdown, setSupplierDropdown] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', phone1: '', phone2: '', phone3: '', address: '', service: '' });
  const supplierRef = useRef<HTMLDivElement>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [editForm, setEditForm] = useState({ phone1: '', phone2: '', phone3: '', address: '', service: '' });
  const [editServices, setEditServices] = useState<string[]>([]);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemDropdown, setItemDropdown] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  // ── Inline Category Add states ──
  const [showAddCat,   setShowAddCat]   = useState(false);
  const [newCatInput,  setNewCatInput]  = useState('');
  const [addSubLevel,  setAddSubLevel]  = useState<number>(0); // 0=hidden, 1-5=adding at that level
  const [newSubInput,  setNewSubInput]  = useState(''); // input for the new sub value
  const [catBusy,      setCatBusy]      = useState(false);

  // ── Scanner states ──
  const [cameraActive, setCameraActive]     = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [scanProgress, setScanProgress]     = useState('');
  const [cropMode, setCropMode]             = useState(false);
  const [rawSrc, setRawSrc]                 = useState('');
  const [cropRect, setCropRect]             = useState({ x:0.05, y:0.05, w:0.9, h:0.9 });
  const streamRef   = useRef<MediaStream | null>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const scanFileRef = useRef<HTMLInputElement>(null);
  const cropImgRef  = useRef<HTMLImageElement>(null);
  const dragState   = useRef<{handle:string;startX:number;startY:number;startRect:typeof cropRect}|null>(null);

  useEffect(() => {
    fetch('/api/gas')
      .then(res => res.json())
      .then(data => {
        setConfig({
          categoryList: data.categoryList || data.tree || [],
          prefixes: data.prefixes || {},
          lastSerials: data.lastSerials || {},
          suppliers: data.suppliers || [],
          recentItems: data.recentItems || [],
          users: data.users || [],
          accounts: data.accounts || []
        });
        if (data.users?.length > 0) setEnteredBy(String(data.users[0]));
        if (data.accounts?.length > 0) {
          const gm = data.accounts.find((a: any) => String(a).toLowerCase().includes('gm'));
          setAccount(gm ? String(gm) : String(data.accounts[0]));
        }
      })
      .catch(err => console.error('Failed to fetch config:', err));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setSupplierDropdown(false);
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) setItemDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => { document.removeEventListener('mousedown', handler); streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return config.suppliers;
    return config.suppliers.filter((s: any) => s.name?.toLowerCase().includes(supplierSearch.toLowerCase()));
  }, [supplierSearch, config.suppliers]);

  const filteredItems = useMemo(() => {
    if (!itemSearch) return config.recentItems;
    return config.recentItems.filter((item: string) => item.toLowerCase().includes(itemSearch.toLowerCase()));
  }, [itemSearch, config.recentItems]);

  const categoryOptions = useMemo<any[]>(() => Array.from(new Set(config.categoryList.map((row: any) => String(row.Category || row.category || '')))).filter(Boolean), [config.categoryList]);
  const sub1Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category).map((row: any) => String(row.Sub_1 || row.sub1 || '')))).filter(Boolean), [category, config.categoryList]);
  const sub2Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1).map((row: any) => String(row.Sub_2 || row.sub2 || '')))).filter(Boolean), [sub1, config.categoryList, category]);
  const sub3Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1 && String(row.Sub_2 || row.sub2) === sub2).map((row: any) => String(row.Sub_3 || row.sub3 || '')))).filter(Boolean), [sub2, config.categoryList, category, sub1]);
  const sub4Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1 && String(row.Sub_2 || row.sub2) === sub2 && String(row.Sub_3 || row.sub3) === sub3).map((row: any) => String(row.Sub_4 || row.sub4 || '')))).filter(Boolean), [sub3, config.categoryList, category, sub1, sub2]);
  const sub5Options = useMemo<any[]>(() => Array.from(new Set(config.categoryList.filter((row: any) => String(row.Category || row.category) === category && String(row.Sub_1 || row.sub1) === sub1 && String(row.Sub_2 || row.sub2) === sub2 && String(row.Sub_3 || row.sub3) === sub3 && String(row.Sub_4 || row.sub4) === sub4).map((row: any) => String(row.Sub_5 || row.sub5 || '')))).filter(Boolean), [sub4, config.categoryList, category, sub1, sub2, sub3]);

  const generateVrID = (cat: string, currentBatch: any[]): string => {
    const prefix = type === 'Cash In' ? 'INC' : (config.prefixes[cat] || 'EXP');
    const lastNum = config.lastSerials[prefix] || 0;
    const inBatchCount = currentBatch.filter(i => String(i.voucherno).startsWith(prefix)).length;
    const nextNum = (lastNum + inBatchCount + 1).toString().padStart(3, '0');
    const month = (new Date(date).getMonth() + 1).toString().padStart(2, '0');
    const newId = `${prefix}-${month}-${nextNum}`;
    setVoucherno(newId);
    return newId;
  };



  // ── Inline Category helpers ──────────────────────────────
  async function handleInlineAddCat() {
    const cat = newCatInput.trim().toUpperCase();
    if (!cat) return;
    setCatBusy(true);
    try {
      const res = await fetch('/api/gas', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ action:'manageCat', subAction:'add', category:cat, sub1:'', sub2:'', sub3:'', sub4:'', sub5:'' }),
      });
      const d = await res.json();
      if (d.result === 'saved') {
        // ── Optimistic: add to local categoryList immediately ──
        setConfig((prev: any) => ({
          ...prev,
          categoryList: [...prev.categoryList, { Category: cat, Sub_1: '', Sub_2: '', Sub_3: '', Sub_4: '', Sub_5: '' }]
        }));
        setCategory(cat);
        setNewCatInput('');
        setShowAddCat(false);
        // Background refresh after delay
        setTimeout(() => fetch('/api/gas?force=1').then(r => r.json()).then(data => {
          setConfig((prev: any) => ({ ...prev, categoryList: data.categoryList || prev.categoryList }));
        }).catch(() => {}), 3000);
      }
    } finally { setCatBusy(false); }
  }

  async function handleInlineAddSub() {
    if (!category || !newSubInput.trim() || addSubLevel === 0) return;
    const subs = [sub1, sub2, sub3, sub4, sub5];
    subs[addSubLevel - 1] = newSubInput.trim().toUpperCase();
    for (let i = addSubLevel; i < 5; i++) subs[i] = '';
    setCatBusy(true);
    try {
      const res = await fetch('/api/gas', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          action:'manageCat', subAction:'add',
          category,
          sub1: subs[0], sub2: subs[1], sub3: subs[2], sub4: subs[3], sub5: subs[4],
        }),
      });
      const d = await res.json();
      if (d.result === 'saved') {
        // ── Optimistic: add to local categoryList immediately ──
        setConfig((prev: any) => ({
          ...prev,
          categoryList: [...prev.categoryList, {
            Category: category,
            Sub_1: subs[0], Sub_2: subs[1], Sub_3: subs[2], Sub_4: subs[3], Sub_5: subs[4],
          }]
        }));
        if (addSubLevel === 1) { setSub1(subs[0]); setSub2(''); setSub3(''); setSub4(''); setSub5(''); }
        if (addSubLevel === 2) { setSub2(subs[1]); setSub3(''); setSub4(''); setSub5(''); }
        if (addSubLevel === 3) { setSub3(subs[2]); setSub4(''); setSub5(''); }
        if (addSubLevel === 4) { setSub4(subs[3]); setSub5(''); }
        if (addSubLevel === 5) { setSub5(subs[4]); }
        setNewSubInput('');
        setAddSubLevel(0);
        // Background refresh after delay
        setTimeout(() => fetch('/api/gas?force=1').then(r => r.json()).then(data => {
          setConfig((prev: any) => ({ ...prev, categoryList: data.categoryList || prev.categoryList }));
        }).catch(() => {}), 3000);
      }
    } finally { setCatBusy(false); }
  }

  const openEditModal = (supplier: any) => {
    const services = supplier.service ? supplier.service.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
    setEditingSupplier(supplier);
    setEditForm({ phone1: supplier.phone1 || supplier.phone || '', phone2: supplier.phone2 || '', phone3: supplier.phone3 || '', address: supplier.address || '', service: supplier.service || '' });
    setEditServices(services);
    setNewServiceInput('');
    setShowEditModal(true);
  };

  const saveEditedSupplier = async () => {
    if (!editingSupplier) return;
    setEditSaving(true);
    const updated = { ...editingSupplier, phone1: editForm.phone1, phone2: editForm.phone2, phone3: editForm.phone3, address: editForm.address, service: editServices.join(', ') };
    try {
      await fetch('/api/gas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateSupplier', supplier: updated }) });
      setConfig((prev: any) => ({ ...prev, suppliers: prev.suppliers.map((s: any) => s.name === editingSupplier.name ? updated : s) }));
      if (selectedSupplier?.name === editingSupplier.name) setSelectedSupplier(updated);
      setShowEditModal(false);
    } catch {
      alert('SAVE FAILED — ထပ်ကြိုးစားပါ');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Scanner helpers ──
  const openCamera = async () => {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ideal:'environment'}, width:{ideal:3840}, height:{ideal:2160} } });
      streamRef.current = ms; setCameraActive(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = ms; videoRef.current.play(); } });
    } catch { scanFileRef.current?.click(); }
  };
  const closeCamera = () => { streamRef.current?.getTracks().forEach(t=>t.stop()); streamRef.current=null; setCameraActive(false); };

  const captureFrame = () => {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement('canvas'); c.width=v.videoWidth; c.height=v.videoHeight;
    c.getContext('2d')!.drawImage(v,0,0); closeCamera();
    openCropEditor(c.toDataURL('image/jpeg',0.95));  // Camera only → Crop Editor
  };

  const openCropEditor = (src: string) => {
    setRawSrc(src);
    const img = new Image();
    img.onload = () => {
      const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
      const ctx=c.getContext('2d')!; ctx.drawImage(img,0,0);
      const b=autoCrop(ctx.getImageData(0,0,c.width,c.height));
      setCropRect(b ? {x:b.left/img.width,y:b.top/img.height,w:(b.right-b.left)/img.width,h:(b.bottom-b.top)/img.height} : {x:0.04,y:0.04,w:0.92,h:0.92});
      setCropMode(true);
    };
    img.src=src;
  };

  // Gallery → enhance only, skip crop
  const handleScanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const src=ev.target!.result as string;
      setScanProcessing(true); setScanProgress('⚡ Enhancing...');
      const img=new Image();
      img.onload=()=>{
        const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
        const ctx=c.getContext('2d')!; ctx.drawImage(img,0,0);
        const id=autoEnhance(ctx.getImageData(0,0,c.width,c.height));
        ctx.putImageData(id,0,0);
        const MAX=1400,scale=Math.min(1,MAX/c.width,MAX/c.height);
        let fc=c;
        if(scale<1){const rs=document.createElement('canvas');rs.width=Math.round(c.width*scale);rs.height=Math.round(c.height*scale);rs.getContext('2d')!.drawImage(c,0,0,rs.width,rs.height);fc=rs;}
        setImage(fc.toDataURL('image/jpeg',0.88));
        setScanProcessing(false); setScanProgress('');
      };
      img.src=src;
    };
    reader.readAsDataURL(file); e.target.value='';
  };

  // Smooth crop drag — RAF throttle
  const rafRef = useRef<number>(0);
  const onCropPointerDown = (e: React.PointerEvent, handle: string) => {
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { handle, startX:e.clientX, startY:e.clientY, startRect:{...cropRect} };
  };
  const onCropPointerMove = (e: React.PointerEvent) => {
    const ds=dragState.current; if(!ds) return;
    const cx=e.clientX, cy=e.clientY;
    cancelAnimationFrame(rafRef.current);
    rafRef.current=requestAnimationFrame(()=>{
      const el=cropImgRef.current; if(!el) return;
      const {width:W,height:H}=el.getBoundingClientRect();
      const dx=(cx-ds.startX)/W, dy=(cy-ds.startY)/H;
      const MIN=0.05, r={...ds.startRect}, h=ds.handle;
      if(h==='move')      { r.x=clamp(r.x+dx,0,1-r.w); r.y=clamp(r.y+dy,0,1-r.h); }
      if(h.includes('l')) { const nx=clamp(r.x+dx,0,r.x+r.w-MIN); r.w+=r.x-nx; r.x=nx; }
      if(h.includes('r')) { r.w=clamp(r.w+dx,MIN,1-r.x); }
      if(h.includes('t')) { const ny=clamp(r.y+dy,0,r.y+r.h-MIN); r.h+=r.y-ny; r.y=ny; }
      if(h.includes('b')) { r.h=clamp(r.h+dy,MIN,1-r.y); }
      setCropRect(r);
    });
  };
  const onCropPointerUp = () => { dragState.current=null; cancelAnimationFrame(rafRef.current); };

  // ── Apply crop then enhance ──
  const applyCrop = () => {
    setCropMode(false);
    setScanProcessing(true); setScanProgress('✂️ Cropping...');
    const img=new Image();
    img.onload=()=>{
      const cw=Math.round(img.width*cropRect.w), ch=Math.round(img.height*cropRect.h);
      const cx=Math.round(img.width*cropRect.x),  cy=Math.round(img.height*cropRect.y);
      const c=document.createElement('canvas'); c.width=cw; c.height=ch;
      c.getContext('2d')!.drawImage(img,cx,cy,cw,ch,0,0,cw,ch);
      setScanProgress('⚡ Enhancing...');
      setTimeout(()=>{
        const ctx2=c.getContext('2d')!;
        const id=autoEnhance(ctx2.getImageData(0,0,cw,ch));
        ctx2.putImageData(id,0,0);
        const MAX=1400, scale=Math.min(1,MAX/c.width,MAX/c.height);
        let fc=c;
        if(scale<1){ const rs=document.createElement('canvas'); rs.width=Math.round(c.width*scale); rs.height=Math.round(c.height*scale); rs.getContext('2d')!.drawImage(c,0,0,rs.width,rs.height); fc=rs; }
        setImage(fc.toDataURL('image/jpeg',0.88));
        setScanProcessing(false); setScanProgress('');
      },200);
    };
    img.src=rawSrc;
  };

  const resetForm = () => {
    setVendor(''); setSupplierSearch(''); setSelectedSupplier(null);
    setCategory(''); setSub1(''); setSub2(''); setSub3(''); setSub4(''); setSub5('');
    setCurrentItem({ item_description: '', brand: '', count: '', cost_piece: '', cost_total: '', note: '', km: '' });
    setItemSearch(''); setImage(''); setVoucherno('');
    setSubmitStatus('idle');
  };

  const addItem = () => {
    const countNum = parseFloat(currentItem.count) || 0;
    const costNum  = parseFloat(currentItem.cost_piece) || 0;
    const totalFromState = parseFloat(currentItem.cost_total);
    if (!vendor || !currentItem.item_description || countNum <= 0) return alert('REQUIRED: VENDOR, ITEM & QTY');
    // Use manually entered total if available, otherwise calculate
    const total = !isNaN(totalFromState) && totalFromState > 0
      ? Math.round(totalFromState)
      : Math.round(countNum * costNum);

    // ✅ Vr. No. — batch ထဲ ပထမ item ဆိုရင် generate၊ မဟုတ်ရင် အရင် voucherno ကိုပဲ သုံး
    const vrNo = itemList.length === 0 ? generateVrID(category, itemList) : voucherno;

    const newItem = {
      date, entered_by: enteredBy, account, vendor, type,
      voucherno: vrNo,
      vendor_phone: selectedSupplier?.phone1 || selectedSupplier?.phone || '',
      vendor_address: selectedSupplier?.address || '',
      vendor_service: selectedSupplier?.service || '',
      category, sub1, sub2, sub3, sub4, sub5,
      item_description: currentItem.brand
        ? `${currentItem.item_description} (${currentItem.brand})`
        : currentItem.item_description,
      note: currentItem.note,
      km: parseFloat(currentItem.km) || 0,
      remark: currentItem.km ? `KM:${currentItem.km}` : '',
      count: countNum, cost_piece: costNum, cost_total: total, image_data: image, id: Date.now()
    };
    setItemList(prev => [...prev, newItem]);
    setToastMsg(`+ ${total.toLocaleString()} MMK ADDED TO BATCH`);
    setTimeout(() => setToastMsg(''), 3000);
    setCurrentItem({ item_description: '', brand: '', count: '', cost_piece: '', cost_total: '', note: '', km: '' });
    setItemSearch('');
    setImage('');
  };

  const loadConfig = (force = false) => fetch('/api/gas?t=' + Date.now() + (force ? '&force=1' : ''))
    .then(res => res.json())
    .then(data => {
      setConfig({
        categoryList: data.categoryList || data.tree || [],
        prefixes: data.prefixes || {},
        lastSerials: data.lastSerials || {},
        suppliers: data.suppliers || [],
        recentItems: data.recentItems || [],
        users: data.users || [],
        accounts: data.accounts || [],
      });
    })
    .catch(err => console.error('Failed to fetch config:', err));

  const handleFinalSubmit = async () => {
    if (itemList.length === 0 || submitStatus === 'processing') return;
    setSubmitStatus('processing');
    try {
      await fetch('/api/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sendVoucher', items: itemList }),
      });
      setSubmitStatus('success');
      setItemList([]);
      setVoucherno('');
      onRefresh();
      // ✅ force=true — cache bypass ဖြင့် fresh lastSerials ရမည်
      await loadConfig(true);
    } catch {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  };

  return (
    <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-0 font-black text-slate-950">

      {/* ── CROP EDITOR ── */}
      {cropMode && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col select-none">
          <div className="bg-black px-4 py-3 flex items-center justify-between border-b border-white/10">
            <div>
              <p className="text-white text-xs font-black tracking-widest uppercase">Manual Crop</p>
              <p className="text-slate-400 text-[9px] mt-0.5">Corner & Edge ကိုဆွဲ၍ ဖြတ်ပါ</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{setCropMode(false); setRawSrc('');}}
                className="text-slate-400 text-[10px] font-black px-3 py-1.5 border border-white/20 rounded-lg">CANCEL</button>
              <button onClick={applyCrop}
                className="bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform">
                <Check size={12}/> CROP & ENHANCE
              </button>
            </div>
          </div>

          {/* Image + crop overlay */}
          <div className="flex-1 overflow-hidden flex items-center justify-center p-3"
            onPointerMove={onCropPointerMove} onPointerUp={onCropPointerUp} onPointerCancel={onCropPointerUp}>
            <div className="relative inline-block" style={{maxWidth:'100%',maxHeight:'100%'}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={cropImgRef} src={rawSrc} alt="crop" draggable={false}
                style={{display:'block',maxWidth:'calc(100vw - 24px)',maxHeight:'calc(100vh - 130px)',userSelect:'none'}}/>

              {/* Dark overlay — clip out crop window */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background:`linear-gradient(rgba(0,0,0,0.6),rgba(0,0,0,0.6))`,
                clipPath:`polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                  ${cropRect.x*100}% ${cropRect.y*100}%,
                  ${cropRect.x*100}% ${(cropRect.y+cropRect.h)*100}%,
                  ${(cropRect.x+cropRect.w)*100}% ${(cropRect.y+cropRect.h)*100}%,
                  ${(cropRect.x+cropRect.w)*100}% ${cropRect.y*100}%,
                  ${cropRect.x*100}% ${cropRect.y*100}%
                )`,
              }}/>

              {/* Crop border */}
              <div className="absolute pointer-events-none" style={{
                left:`${cropRect.x*100}%`, top:`${cropRect.y*100}%`,
                width:`${cropRect.w*100}%`, height:`${cropRect.h*100}%`,
                border:'2px solid #34d399', boxSizing:'border-box',
              }}>
                {/* Rule-of-thirds grid */}
                {[1/3,2/3].map(p=>(
                  <React.Fragment key={p}>
                    <div style={{position:'absolute',left:`${p*100}%`,top:0,bottom:0,width:1,background:'rgba(52,211,153,0.25)'}}/>
                    <div style={{position:'absolute',top:`${p*100}%`,left:0,right:0,height:1,background:'rgba(52,211,153,0.25)'}}/>
                  </React.Fragment>
                ))}
              </div>

              {/* Move handle (center) */}
              <div onPointerDown={e=>onCropPointerDown(e,'move')}
                className="absolute cursor-move"
                style={{left:`${cropRect.x*100}%`,top:`${cropRect.y*100}%`,width:`${cropRect.w*100}%`,height:`${cropRect.h*100}%`}}/>

              {/* Corner & edge handles */}
              {[
                {h:'tl', cx:cropRect.x,          cy:cropRect.y,          cursor:'nwse-resize'},
                {h:'tr', cx:cropRect.x+cropRect.w, cy:cropRect.y,         cursor:'nesw-resize'},
                {h:'bl', cx:cropRect.x,          cy:cropRect.y+cropRect.h, cursor:'nesw-resize'},
                {h:'br', cx:cropRect.x+cropRect.w, cy:cropRect.y+cropRect.h,cursor:'nwse-resize'},
                {h:'t',  cx:cropRect.x+cropRect.w/2, cy:cropRect.y,       cursor:'ns-resize'},
                {h:'b',  cx:cropRect.x+cropRect.w/2, cy:cropRect.y+cropRect.h, cursor:'ns-resize'},
                {h:'l',  cx:cropRect.x,           cy:cropRect.y+cropRect.h/2, cursor:'ew-resize'},
                {h:'r',  cx:cropRect.x+cropRect.w, cy:cropRect.y+cropRect.h/2, cursor:'ew-resize'},
              ].map(({h,cx,cy,cursor})=>(
                <div key={h} onPointerDown={e=>onCropPointerDown(e,h)}
                  style={{
                    position:'absolute', cursor,
                    left:`calc(${cx*100}% - 14px)`, top:`calc(${cy*100}% - 14px)`,
                    width:28, height:28, zIndex:10,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                  <div style={{
                    width: h.length===2?14:10, height: h.length===2?14:10,
                    background:'#34d399', border:'2px solid white',
                    borderRadius: h.length===2?3:2,
                    boxShadow:'0 2px 8px rgba(0,0,0,0.5)',
                  }}/>
                </div>
              ))}
            </div>
          </div>

          {/* Hint bar */}
          <div className="bg-black border-t border-white/10 px-4 py-2.5 flex items-center justify-center gap-2">
            <ScanLine size={12} className="text-emerald-400"/>
            <span className="text-slate-400 text-[10px] font-black">
              Auto-detect ဖြင့် Initial Frame ထားပြီး — ကိုယ်တိုင် ပြန်ညှိနိုင်သည်
            </span>
          </div>
        </div>
      )}
      {cameraActive && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col">
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted/>
            <div className="absolute inset-0 pointer-events-none" style={{background:'radial-gradient(ellipse 72% 55% at 50% 45%, transparent 80%, rgba(0,0,0,0.6) 100%)'}}/>
            {/* Guide frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative" style={{width:'78%',height:'58%'}}>
                {(['tl','tr','bl','br'] as const).map(pos=>(
                  <span key={pos} className="absolute w-8 h-8 block" style={{
                    top:pos.startsWith('t')?0:'auto', bottom:pos.startsWith('b')?0:'auto',
                    left:pos.endsWith('l')?0:'auto', right:pos.endsWith('r')?0:'auto',
                    borderTop:pos.startsWith('t')?'3px solid #34d399':undefined, borderBottom:pos.startsWith('b')?'3px solid #34d399':undefined,
                    borderLeft:pos.endsWith('l')?'3px solid #34d399':undefined, borderRight:pos.endsWith('r')?'3px solid #34d399':undefined,
                    borderRadius:pos==='tl'?'4px 0 0 0':pos==='tr'?'0 4px 0 0':pos==='bl'?'0 0 0 4px':'0 0 4px 0',
                  }}/>
                ))}
                <div style={{position:'absolute',inset:'4px',overflow:'hidden'}}>
                  <div style={{position:'absolute',left:0,right:0,height:'2px',background:'linear-gradient(90deg,transparent,#34d399,transparent)',animation:'scanline 2s linear infinite'}}/>
                </div>
              </div>
            </div>
            <div className="absolute bottom-32 inset-x-0 flex justify-center">
              <span className="bg-black/50 text-white text-[11px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase">Document ကို Frame ထဲ ထည့်ပါ</span>
            </div>
          </div>
          <div className="bg-black py-8 flex items-center justify-around">
            <button onClick={closeCamera} className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"><X size={22} className="text-white"/></button>
            <button onClick={captureFrame} className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform">
              <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center"><Camera size={28} className="text-slate-700"/></div>
            </button>
            <button onClick={()=>{closeCamera();scanFileRef.current?.click();}} className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"><Upload size={18} className="text-white"/></button>
          </div>
          <style>{`@keyframes scanline{0%{top:-4px}100%{top:calc(100% + 4px)}}`}</style>
        </div>
      )}

      {toastMsg && (
        <div className="absolute top-4 right-4 bg-emerald-50 border border-emerald-200 text-slate-950 p-4 rounded-xl shadow-lg flex items-center gap-3 z-50 animate-bounce font-black">
          <BellRing size={20} className="text-emerald-600"/>
          {toastMsg}
        </div>
      )}

      {/* ── LEFT INPUT PANEL ── */}
      <div className="lg:col-span-8 p-6 space-y-6 border-r border-slate-200 font-black">

        {/* Type / User / Account */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl w-fit font-black">
          <div className="flex">
            <button onClick={() => { setType('Cash Out'); setVoucherno(''); }} className={`flex items-center px-6 py-2 rounded-xl transition-all font-black ${type === 'Cash Out' ? 'bg-white border border-slate-300 shadow-sm text-slate-950' : 'text-slate-400'}`}><ArrowDownLeft size={16} className="mr-2"/> CASH OUT</button>
            <button onClick={() => { setType('Cash In'); setVoucherno(''); }} className={`flex items-center px-6 py-2 rounded-xl transition-all font-black ${type === 'Cash In' ? 'bg-white border border-slate-300 shadow-sm text-slate-950' : 'text-slate-400'}`}><ArrowUpRight size={16} className="mr-2"/> CASH IN</button>
          </div>
          <div className="h-6 w-[2px] bg-slate-300"/>
          <div className="flex items-center gap-2 px-2">
            <User size={16} className="text-slate-500"/>
            <select className="bg-transparent text-sm outline-none font-black text-slate-950 cursor-pointer uppercase" value={enteredBy} onChange={e => { setEnteredBy(e.target.value); if (submitStatus === 'success') setSubmitStatus('idle'); }}>
              {config.users?.map((u: any, i: number) => <option key={i} value={String(u)}>{String(u)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-2 border-l-2 border-slate-300 pl-4">
            <Wallet size={16} className="text-slate-500"/>
            <select className="bg-transparent text-sm outline-none font-black text-slate-950 cursor-pointer uppercase" value={account} onChange={e => { setAccount(e.target.value); if (submitStatus === 'success') setSubmitStatus('idle'); }}>
              {config.accounts?.map((a: any, i: number) => <option key={i} value={String(a)}>{String(a)}</option>)}
            </select>
          </div>
        </div>

        {/* Supplier / Date / Voucher ID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 font-black">

          {/* Supplier */}
          <div className="space-y-2 font-black" ref={supplierRef}>
            <label className="text-[10px] text-slate-500 tracking-widest font-black">SUPPLIER</label>
            <div className="relative">
              <input
                className="w-full bg-white border border-slate-300 p-3 pr-10 rounded-xl outline-none focus:border-slate-500 text-sm font-black text-slate-950 "
                value={supplierSearch}
                onChange={e => { setSupplierSearch(e.target.value); setVendor(e.target.value); setSelectedSupplier(null); setSupplierDropdown(true); }}
                onFocus={() => setSupplierDropdown(true)}
                placeholder="SEARCH..."
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              {supplierDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredSuppliers.length > 0 ? filteredSuppliers.map((s: any, i: number) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                      onMouseDown={() => { setVendor(s.name); setSupplierSearch(s.name); setSelectedSupplier(s); setSupplierDropdown(false); }}>
                      <p className="text-xs font-black text-slate-950 uppercase">{s.name}</p>
                      {s.service && <p className="text-[10px] text-slate-400 mt-0.5">{s.service}</p>}
                    </div>
                  )) : (
                    <div className="px-4 py-3 text-center space-y-2">
                      <p className="text-[10px] text-slate-400">မတွေ့ပါ</p>
                      <button onMouseDown={() => { setNewSupplier({ ...newSupplier, name: supplierSearch }); setShowNewSupplierForm(true); setSupplierDropdown(false); }}
                        className="text-[10px] bg-slate-950 text-white px-3 py-1.5 rounded-lg font-black">+ ADD NEW SUPPLIER</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedSupplier && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-400 tracking-widest">INFO (AUTO-FILLED)</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(selectedSupplier)} className="text-[10px] text-slate-500 hover:text-slate-950 flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 rounded-lg font-black">✏️ EDIT</button>
                    <button onClick={() => { setSelectedSupplier(null); setVendor(''); setSupplierSearch(''); }} className="text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1"><X size={10}/> CLEAR</button>
                  </div>
                </div>
                {[
                  { icon: <Phone size={11}/>, value: [selectedSupplier.phone1||selectedSupplier.phone, selectedSupplier.phone2, selectedSupplier.phone3].filter(Boolean).join(' / '), placeholder: 'PHONE' },
                  { icon: <MapPin size={11}/>, value: selectedSupplier.address, placeholder: 'ADDRESS' },
                  { icon: <Briefcase size={11}/>, value: selectedSupplier.service, placeholder: 'SERVICE' },
                ].map(({ icon, value, placeholder }, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-slate-400 flex-shrink-0">{icon}</span>
                    <span className={`text-[11px] font-black flex-1 uppercase truncate ${value ? 'text-slate-950' : 'text-slate-300'}`}>{value || placeholder}</span>
                  </div>
                ))}
              </div>
            )}

            {showNewSupplierForm && (
              <div className="bg-white border border-slate-300 rounded-xl p-4 space-y-2 shadow-sm">
                <p className="text-[10px] font-black text-slate-950 tracking-widest">NEW SUPPLIER</p>
                {[{ key: 'name', label: 'NAME', icon: <User size={10}/> }, { key: 'phone1', label: 'PHONE 1', icon: <Phone size={10}/> }, { key: 'phone2', label: 'PHONE 2', icon: <Phone size={10}/> }, { key: 'phone3', label: 'PHONE 3', icon: <Phone size={10}/> }, { key: 'address', label: 'ADDRESS', icon: <MapPin size={10}/> }, { key: 'service', label: 'SERVICE / PRODUCT', icon: <Briefcase size={10}/> }].map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-slate-400">{icon}</span>
                    <input className="flex-1 bg-slate-50 border border-slate-200 p-2 rounded-lg text-[11px] outline-none font-black text-slate-950" placeholder={label} value={(newSupplier as any)[key]} onChange={e => setNewSupplier({ ...newSupplier, [key]: e.target.value })}/>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => {
                    if (!newSupplier.name) return;
                    // ✅ တူတဲ့ Supplier ရှိရင် service ပေါင်း၊ မရှိရင် အသစ်ထည့်
                    const existing = config.suppliers.find((s: any) => s.name.toLowerCase() === newSupplier.name.toLowerCase());
                    if (existing) {
                      const mergedServices = [existing.service, newSupplier.service].filter(Boolean).join(', ');
                      const merged = { ...existing, ...newSupplier, service: mergedServices };
                      setVendor(merged.name); setSupplierSearch(merged.name); setSelectedSupplier(merged);
                      setConfig((prev: any) => ({ ...prev, suppliers: prev.suppliers.map((s: any) => s.name.toLowerCase() === merged.name.toLowerCase() ? merged : s) }));
                    } else {
                      setVendor(newSupplier.name); setSupplierSearch(newSupplier.name); setSelectedSupplier(newSupplier);
                      setConfig((prev: any) => ({ ...prev, suppliers: [...prev.suppliers, { ...newSupplier }] }));
                    }
                    setShowNewSupplierForm(false); setNewSupplier({ name: '', phone1: '', phone2: '', phone3: '', address: '', service: '' });
                  }} className="flex-1 bg-slate-950 text-white text-[10px] py-2 rounded-lg font-black">SAVE</button>
                  <button onClick={() => setShowNewSupplierForm(false)} className="flex-1 bg-slate-100 text-slate-600 text-[10px] py-2 rounded-lg font-black">CANCEL</button>
                </div>
              </div>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1 font-black">
            <label className="text-[10px] text-slate-500 tracking-widest font-black">DATE</label>
            <input type="date" className="w-full bg-white border border-slate-300 p-3 rounded-xl outline-none focus:border-slate-500 text-sm font-black text-slate-950" value={date} onChange={e => setDate(e.target.value)}/>
          </div>

          {/* Voucher ID */}
          <div className="space-y-1 font-black">
            <label className="text-[10px] text-slate-500 tracking-widest font-black">VOUCHER ID</label>
            <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 h-[46px] font-black">
              <span className="text-slate-950 text-sm flex-grow font-black">{voucherno || 'ID AUTO'}</span>
              <RefreshCcw size={16} className="text-slate-400 cursor-pointer hover:text-slate-950" onClick={() => generateVrID(category, itemList)}/>
            </div>
          </div>
        </div>

        {/* Category + Item inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black">

          {/* Left — Category dropdowns */}
          <div className="space-y-4 font-black">
            {/* CATEGORY */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-500 uppercase font-black">CATEGORY</label>
                {!showAddCat && (
                  <button type="button" onClick={() => { setShowAddCat(true); setNewCatInput(''); }}
                    className="text-[9px] text-slate-400 hover:text-slate-950 border border-dashed border-slate-300 px-2 py-0.5 rounded-lg font-black uppercase hover:border-slate-500 transition-all">
                    + ADD
                  </button>
                )}
              </div>
              {showAddCat ? (
                <div className="flex gap-1">
                  <input autoFocus className="flex-1 p-2 bg-white border border-slate-400 rounded-xl text-xs font-black uppercase outline-none text-slate-950 placeholder:text-slate-300"
                    placeholder="NEW CATEGORY"
                    value={newCatInput}
                    onChange={e => setNewCatInput(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') handleInlineAddCat(); if (e.key==='Escape') setShowAddCat(false); }}
                  />
                  <button type="button" onClick={handleInlineAddCat} disabled={catBusy || !newCatInput.trim()}
                    className="px-3 bg-slate-950 text-white rounded-xl text-[10px] font-black disabled:opacity-40">
                    {catBusy ? '…' : 'SAVE'}
                  </button>
                  <button type="button" onClick={() => setShowAddCat(false)}
                    className="px-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black">✕</button>
                </div>
              ) : (
                <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500" value={category} onChange={e => { setCategory(e.target.value); setSub1(''); setSub2(''); setSub3(''); setSub4(''); setSub5(''); setAddSubLevel(0); generateVrID(e.target.value, itemList); }}>
                  <option value="">SELECT CATEGORY</option>
                  {categoryOptions.map((c: any, i: number) => <option key={i} value={String(c)}>{String(c)}</option>)}
                </select>
              )}
            </div>

            {/* ── Reusable inline-add row ── */}
            {([
              { level:1, label:'SUB 1', opts:sub1Options, val:sub1, setter:(v:string)=>{ setSub1(v); setSub2(''); setSub3(''); setSub4(''); setSub5(''); }, show: !!category },
              { level:2, label:'SUB 2', opts:sub2Options, val:sub2, setter:(v:string)=>{ setSub2(v); setSub3(''); setSub4(''); setSub5(''); }, show: !!category && !!sub1 },
              { level:3, label:'SUB 3', opts:sub3Options, val:sub3, setter:(v:string)=>{ setSub3(v); setSub4(''); setSub5(''); }, show: !!category && !!sub1 && !!sub2 },
              { level:4, label:'SUB 4', opts:sub4Options, val:sub4, setter:(v:string)=>{ setSub4(v); setSub5(''); }, show: !!category && !!sub1 && !!sub2 && !!sub3 },
              { level:5, label:'SUB 5', opts:sub5Options, val:sub5, setter:(v:string)=>{ setSub5(v); }, show: !!category && !!sub1 && !!sub2 && !!sub3 && !!sub4 },
            ] as const).map(({ level, label, opts, val, setter, show }) => show && (
              <div key={level} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-500 uppercase font-black">{label}</label>
                  {addSubLevel !== level && (
                    <button type="button" onClick={() => { setAddSubLevel(level); setNewSubInput(''); }}
                      className="text-[9px] text-slate-400 hover:text-slate-950 border border-dashed border-slate-300 px-2 py-0.5 rounded-lg font-black uppercase hover:border-slate-500 transition-all">
                      + ADD
                    </button>
                  )}
                </div>
                {addSubLevel === level ? (
                  <div className="flex gap-1">
                    <input autoFocus
                      className="flex-1 p-2 bg-white border border-slate-400 rounded-xl text-xs font-black uppercase outline-none text-slate-950 placeholder:text-slate-300"
                      placeholder={`NEW ${label}`}
                      value={newSubInput}
                      onChange={e => setNewSubInput(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter') handleInlineAddSub(); if (e.key==='Escape') setAddSubLevel(0); }}
                    />
                    <button type="button" onClick={handleInlineAddSub} disabled={catBusy || !newSubInput.trim()}
                      className="px-3 bg-slate-950 text-white rounded-xl text-[10px] font-black disabled:opacity-40">
                      {catBusy ? '…' : 'SAVE'}
                    </button>
                    <button type="button" onClick={() => setAddSubLevel(0)}
                      className="px-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black">✕</button>
                  </div>
                ) : opts.length > 0 ? (
                  <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs uppercase font-black text-slate-950 focus:border-slate-500"
                    value={val} onChange={e => setter(e.target.value)}>
                    <option value="">SELECT</option>
                    {opts.map((o: any, i: number) => <option key={i} value={String(o)}>{String(o)}</option>)}
                  </select>
                ) : (
                  <p className="text-[10px] text-slate-300 uppercase tracking-widest py-1">Sub မရှိသေး — + ADD နှိပ်ပါ</p>
                )}
              </div>
            ))}
          </div>

          {/* Right — Item inputs */}
          <div className="space-y-4 font-black">

            {/* Item description */}
            <div className="space-y-1" ref={itemRef}>
              <label className="text-[10px] text-slate-500 uppercase font-black">ITEM DESCRIPTION</label>
              <div className="relative">
                <input
                  className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-sm outline-none focus:border-slate-500 font-black text-slate-950"
                  placeholder="DETAILS"
                  value={itemSearch}
                  onChange={e => { setItemSearch(e.target.value); setCurrentItem({ ...currentItem, item_description: e.target.value }); setItemDropdown(true); }}
                  onFocus={() => { if (itemSearch) setItemDropdown(true); }}
                />
                {itemDropdown && filteredItems.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {filteredItems.map((item: string, idx: number) => (
                      <div key={idx} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-xs font-black text-slate-950 uppercase border-b border-slate-100 last:border-0"
                        onMouseDown={() => { setItemSearch(item); setCurrentItem({ ...currentItem, item_description: item }); setItemDropdown(false); }}>{item}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Brand */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase flex items-center gap-1 font-black">BRAND <span className="text-slate-300 normal-case font-normal">(optional)</span></label>
              <input className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 font-black text-slate-950 placeholder:text-slate-300" placeholder="e.g. TOYOTA, SAMSUNG..." value={currentItem.brand} onChange={e => setCurrentItem({ ...currentItem, brand: e.target.value })}/>
            </div>

            {/* QTY + Rate + Total (auto-calc) */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase flex items-center font-black"><Hash size={12} className="mr-1"/> QTY</label>
                  <input type="number" step="any" className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xl text-center text-slate-950 outline-none focus:border-slate-500 font-black"
                    value={currentItem.count}
                    onChange={e => {
                      const qty = e.target.value;
                      const rate = parseFloat(currentItem.cost_piece);
                      const total = parseFloat(currentItem.cost_total);
                      let next = { ...currentItem, count: qty };
                      const q = parseFloat(qty);
                      if (!isNaN(q) && q > 0) {
                        if (!isNaN(rate) && rate > 0) next.cost_total = String(Math.round(q * rate));
                        else if (!isNaN(total) && total > 0) next.cost_piece = String(Math.round(total / q));
                      }
                      setCurrentItem(next);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase flex items-center font-black"><Banknote size={12} className="mr-1"/> RATE</label>
                  <input type="number" className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xl text-center text-slate-950 outline-none focus:border-slate-500 font-black"
                    value={currentItem.cost_piece}
                    onChange={e => {
                      const rate = e.target.value;
                      const qty = parseFloat(currentItem.count);
                      let next = { ...currentItem, cost_piece: rate };
                      const r = parseFloat(rate);
                      if (!isNaN(r) && r > 0 && !isNaN(qty) && qty > 0) next.cost_total = String(Math.round(qty * r));
                      setCurrentItem(next);
                    }}
                  />
                </div>
              </div>
              {/* TOTAL */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase flex items-center font-black">💵 TOTAL</label>
                <input type="number" className="w-full p-4 bg-slate-950 text-white border-0 rounded-2xl text-2xl text-center outline-none font-black placeholder:text-slate-600"
                  placeholder="0"
                  value={currentItem.cost_total}
                  onChange={e => {
                    const total = e.target.value;
                    const qty = parseFloat(currentItem.count);
                    const rate = parseFloat(currentItem.cost_piece);
                    let next = { ...currentItem, cost_total: total };
                    const t = parseFloat(total);
                    if (!isNaN(t) && t > 0) {
                      if (!isNaN(qty) && qty > 0) next.cost_piece = String(Math.round(t / qty));
                      else if (!isNaN(rate) && rate > 0) next.count = String(Math.round(t / rate));
                    }
                    setCurrentItem(next);
                  }}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase flex items-center font-black"><MessageSquare size={12} className="mr-2"/> NOTES</label>
              <textarea className="w-full p-4 bg-white border border-slate-300 rounded-xl text-[10px] outline-none focus:border-slate-500 h-16 resize-none font-black text-slate-950" value={currentItem.note} onChange={e => setCurrentItem({ ...currentItem, note: e.target.value })}/>
            </div>

            {/* KM (only for vehicle categories) */}
            {[category, sub1, sub2, sub3].some(s => /ferry|bus\s*\d*|ယာဉ်/i.test(s)) && (
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase flex items-center font-black">
                <span className="mr-1">🛣</span> KM / ODOMETER <span className="text-slate-300 normal-case font-normal ml-1">(optional)</span>
              </label>
              <input type="number" className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-xl text-center text-slate-950 outline-none focus:border-slate-500 font-black" placeholder="—" value={currentItem.km} onChange={e => setCurrentItem({ ...currentItem, km: e.target.value })}/>
            </div>
            )}

            {/* ── SCAN / PHOTO ── */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase flex items-center gap-1.5 font-black">
                <ScanLine size={12}/> SCAN / PHOTO
                <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 text-[8px] px-1.5 py-0.5 rounded-full font-black ml-1">AUTO CROP + ENHANCE</span>
                <span className="text-slate-300 normal-case font-normal text-[9px]">(optional)</span>
              </label>

              <div className="relative min-h-28 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">

                {/* Processing overlay */}
                {scanProcessing && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-10">
                    <div className="relative"><Zap size={32} className="text-emerald-400 animate-pulse"/><div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping"/></div>
                    <p className="text-white text-[10px] font-black tracking-widest animate-pulse">{scanProgress}</p>
                    <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full animate-pulse" style={{width:'60%'}}/></div>
                  </div>
                )}

                {/* Preview */}
                {!scanProcessing && image && (
                  <>
                    <img src={image} className="w-full max-h-52 object-contain"/>
                    <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow"><Check size={9}/> SCANNED & ENHANCED</div>
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      {/* Re-crop: rawSrc ရှိရင် crop editor ပြန်ဖွင့် */}
                      {rawSrc && (
                        <button onClick={()=>setCropMode(true)} title="Crop ပြန်လုပ်"
                          className="bg-violet-100 text-violet-600 border border-violet-200 p-1.5 rounded-full shadow-sm">
                          <ScanLine size={12}/>
                        </button>
                      )}
                      <button onClick={() => { setImage(''); openCamera(); }} title="Camera ထပ်ရိုက်"
                        className="bg-blue-100 text-blue-600 border border-blue-200 p-1.5 rounded-full shadow-sm"><Camera size={12}/></button>
                      <button onClick={() => scanFileRef.current?.click()} title="Gallery မှရွေး"
                        className="bg-amber-100 text-amber-600 border border-amber-200 p-1.5 rounded-full shadow-sm"><RotateCcw size={12}/></button>
                      <button onClick={() => { setImage(''); setRawSrc(''); }} title="ဖျက်"
                        className="bg-rose-100 text-rose-600 border border-rose-200 p-1.5 rounded-full shadow-sm"><Trash2 size={12}/></button>
                    </div>
                  </>
                )}

                {/* Idle */}
                {!scanProcessing && !image && (
                  <div className="flex flex-col items-center gap-3 py-5">
                    <div className="flex gap-3">
                      <button onClick={openCamera} className="flex flex-col items-center gap-1.5 bg-slate-950 text-white px-6 py-3 rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md">
                        <Camera size={22}/><span className="text-[9px] font-black uppercase tracking-wider">Camera</span>
                      </button>
                      <button onClick={() => scanFileRef.current?.click()} className="flex flex-col items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 px-6 py-3 rounded-xl hover:bg-slate-200 active:scale-95 transition-all">
                        <Upload size={22}/><span className="text-[9px] font-black uppercase tracking-wider">Gallery</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[9px]"><ScanLine size={10}/><span>ရိုက်ပြီးတာနဲ့ Auto Crop + Enhance လုပ်မည်</span></div>
                  </div>
                )}

                <input ref={scanFileRef} type="file" accept="image/*" className="hidden" onChange={handleScanFile}/>
              </div>
            </div>

            {/* ADD TO BATCH */}
            <button onClick={addItem} className="w-full bg-slate-200 text-slate-950 py-5 rounded-[1.5rem] text-sm hover:bg-slate-300 transition-all flex items-center justify-center uppercase font-black border border-slate-300 shadow-sm">
              <Plus className="mr-2" size={20} strokeWidth={4}/> ADD TO BATCH
            </button>

          </div>
        </div>
      </div>

      {/* ── BATCH PANEL ── */}
      <div className="lg:col-span-4 flex flex-col bg-slate-50 border-l border-slate-200 font-black">
        <div className="bg-slate-200 p-5 text-slate-950 flex justify-between items-center font-black border-b border-slate-300">
          <span className="text-[10px] tracking-[0.3em] font-black">BATCH ({itemList.length})</span>
        </div>
        <div className="flex-grow p-5 space-y-4 overflow-y-auto max-h-[500px] font-black">
          {itemList.map(i => (
            <div key={i.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-200 border-l-[6px] ${i.type === 'Cash In' ? 'border-l-emerald-400' : 'border-l-rose-400'} font-black`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500">{i.voucherno}</p>
                  <p className="text-xs leading-tight font-black text-slate-950">{i.item_description}</p>
                  <p className="text-[8px] text-slate-600 uppercase">[{i.entered_by} • {i.account}]</p>
                </div>
                <button onClick={() => setItemList(itemList.filter(x => x.id !== i.id))} className="text-rose-500 p-1"><Trash2 size={14}/></button>
              </div>
              {i.note && <p className="text-[9px] text-slate-500 mt-2">NOTE: {i.note}</p>}
              {i.km > 0 && <p className="text-[9px] text-blue-600 mt-1">🛣 {i.km.toLocaleString()} km</p>}
              {i.image_data && <p className="text-[9px] text-emerald-600 mt-1">📷 PHOTO ATTACHED</p>}
              <div className="flex justify-between items-end mt-4">
                <p className="text-[9px] text-slate-500">{i.count} X {i.cost_piece.toLocaleString()} MMK</p>
                <p className="text-sm font-black">{i.cost_total.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-200 p-8 space-y-6 font-black border-t border-slate-300">
          <div className="flex justify-between items-end border-b border-slate-400 pb-4">
            <span className="text-slate-600 text-[10px] tracking-widest">TOTAL</span>
            <span className="text-slate-950 text-4xl font-black">{itemList.reduce((s, x) => s + x.cost_total, 0).toLocaleString()}</span>
          </div>
          <button onClick={handleFinalSubmit} disabled={submitStatus === 'processing' || itemList.length === 0}
            className={`w-full py-5 rounded-2xl text-xs transition-all flex items-center justify-center font-black ${submitStatus === 'idle' || submitStatus === 'success' ? 'bg-slate-950 text-white shadow-md hover:bg-slate-800' : submitStatus === 'processing' ? 'bg-slate-300 text-slate-950' : 'bg-rose-100 text-rose-900 border border-rose-300'}`}>
            {submitStatus === 'processing' && <><RefreshCcw className="mr-2 animate-spin" size={18} strokeWidth={3}/> PROCESSING...</>}
            {submitStatus !== 'processing' && <><Save className="mr-2" size={18} strokeWidth={3}/> POST TO CLOUD</>}
          </button>
          {submitStatus === 'success' && (
            <button onClick={resetForm} className="w-full py-4 rounded-2xl text-xs bg-white border-2 border-slate-950 text-slate-950 hover:bg-slate-950 hover:text-white transition-all flex items-center justify-center font-black gap-2">
              <Plus size={16} strokeWidth={3}/> NEW VOUCHER
            </button>
          )}
        </div>
      </div>

      {/* ── EDIT SUPPLIER MODAL ── */}
      {showEditModal && editingSupplier && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-slate-950 text-white px-6 py-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-400 tracking-widest">EDIT SUPPLIER</p>
                <p className="text-sm font-black uppercase">{editingSupplier.name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 tracking-widest flex items-center gap-1"><Phone size={10}/> PHONE 1</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-slate-500 font-black text-slate-950 " value={editForm.phone1} onChange={e => setEditForm({ ...editForm, phone1: e.target.value })} placeholder="09..."/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 tracking-widest flex items-center gap-1"><Phone size={10}/> PHONE 2</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-slate-500 font-black text-slate-950 " value={editForm.phone2} onChange={e => setEditForm({ ...editForm, phone2: e.target.value })} placeholder="09..."/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 tracking-widest flex items-center gap-1"><Phone size={10}/> PHONE 3</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-slate-500 font-black text-slate-950 " value={editForm.phone3} onChange={e => setEditForm({ ...editForm, phone3: e.target.value })} placeholder="09..."/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 tracking-widest flex items-center gap-1"><MapPin size={10}/> ADDRESS</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:border-slate-500 font-black text-slate-950 " value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="ADDRESS..."/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 tracking-widest flex items-center gap-1"><Briefcase size={10}/> SERVICES</label>
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {editServices.map((svc, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-950 text-[11px] font-black px-3 py-1.5 rounded-full uppercase">
                      {svc}
                      <button onClick={() => setEditServices(editServices.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-500"><X size={10}/></button>
                    </span>
                  ))}
                  {editServices.length === 0 && <span className="text-[10px] text-slate-300 italic">NO SERVICES YET</span>}
                </div>
                <div className="flex gap-2">
                  <input className="flex-1 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-[11px] outline-none focus:border-slate-500 font-black text-slate-950 " placeholder="ADD SERVICE..." value={newServiceInput} onChange={e => setNewServiceInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newServiceInput.trim()) { e.preventDefault(); if (!editServices.includes(newServiceInput.trim())) setEditServices([...editServices, newServiceInput.trim()]); setNewServiceInput(''); } }}/>
                  <button onClick={() => { if (!newServiceInput.trim()) return; if (!editServices.includes(newServiceInput.trim())) setEditServices([...editServices, newServiceInput.trim()]); setNewServiceInput(''); }} className="bg-slate-200 hover:bg-slate-300 text-slate-950 px-3 rounded-xl font-black"><Plus size={14}/></button>
                </div>
                <p className="text-[9px] text-slate-300">ENTER နှိပ်ရင်လည်း ထည့်နိုင်သည်</p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={saveEditedSupplier} disabled={editSaving} className="flex-1 bg-slate-950 text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50">
                {editSaving ? <><RefreshCcw size={14} className="animate-spin"/> SAVING...</> : <><Save size={14}/> SAVE CHANGES</>}
              </button>
              <button onClick={() => setShowEditModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl text-xs font-black">CANCEL</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
