"use client"
import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Image as ImageIcon, X, TrendingUp, Layers, Printer, BarChart3, ListChecks, Filter, AlertTriangle, Trash2, ShieldAlert, ChevronDown, RefreshCcw, Wallet, Trophy, Download, Pencil, Save, Check } from 'lucide-react';
import { deleteFromSheet, updateVoucher } from '@/lib/api';
import type { Voucher, VoucherRaw, DashboardAnalytics } from '@/lib/types';

const COLORS = ['#f43f5e','#fb923c','#facc15','#4ade80','#34d399','#22d3ee','#818cf8','#c084fc','#f472b6','#94a3b8','#60a5fa','#a78bfa'];
const fmt = (n: number) => n.toLocaleString();

const ALL_ACCOUNTS = '__ALL__';

function getPresetDates(preset: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2,'0');
  const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = toStr(now);
  if (preset==='7d')    { const s=new Date(now); s.setDate(s.getDate()-6); return { startDate:toStr(s), endDate:today }; }
  if (preset==='30d')   { const s=new Date(now); s.setDate(s.getDate()-29); return { startDate:toStr(s), endDate:today }; }
  if (preset==='month') { return { startDate:`${now.getFullYear()}-${pad(now.getMonth()+1)}-01`, endDate:today }; }
  if (preset==='last')  { const d=new Date(now.getFullYear(),now.getMonth(),0); const s=new Date(d.getFullYear(),d.getMonth(),1); return { startDate:toStr(s), endDate:toStr(d) }; }
  return { startDate:'', endDate:'' };
}

function exportCSV(data: Voucher[], filename: string) {
  const headers = ['Date','Voucher No','Type','Account','Category','Sub1','Sub2','Vendor','Item','Amount (MMK)','Entered By'];
  const rows = data.map(v => [
    v.date, v.voucherno, v.type, v.account, v.category,
    v.sub1, v.sub2, v.vendor,
    `"${v.item.replace(/"/g,'""')}"`,
    v.cost_total, v.entered_by,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  vouchers: VoucherRaw[];
  onRefresh?: () => void;
  dashboardDefaults?: Record<string, string>;
}

export default function FinancialDashboard({ vouchers = [], onRefresh, dashboardDefaults = {} }: Props) {
  const [filter, setFilter] = useState({
    startDate:'', endDate:'', category:'', subCategory:'',
    vendor:'', item:'', enteredBy:'', account: '',
  });
  const [selectedImg, setSelectedImg] = useState<string|null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ open:false, voucherno:'', confirmInput:'', loading:false });

  // ── Edit Voucher Modal state ──────────────────────────────────
  const [editModal, setEditModal] = useState<{
    open: boolean;
    voucher: typeof normalizedData[0] | null;
    saving: boolean;
    imgUploading: boolean;
  }>({ open:false, voucher:null, saving:false, imgUploading:false });
  const [editForm, setEditForm] = useState({
    date:'', item:'', note:'', cost_total:0,
    category:'', sub1:'', sub2:'', sub3:'', sub4:'', sub5:'',
    vendor:'', image_data:'',
  });
  const [activePreset, setActivePreset] = useState('');
  const [openCats, setOpenCats] = useState<Record<string,boolean>>({});

  const toggleCat = (key: string) => setOpenCats(p => ({...p, [key]: !p[key]}));
  const applyPreset = (preset: string) => { setFilter(f=>({...f,...getPresetDates(preset)})); setActivePreset(preset); };
  const clearFilter = () => {
    setFilter({ startDate:'',endDate:'',category:'',subCategory:'',vendor:'',item:'',enteredBy:'',account:'' });
    setActivePreset('');
  };
  const handleRefresh = async () => {
    if (!onRefresh||isRefreshing) return;
    setIsRefreshing(true); await onRefresh(); setTimeout(()=>setIsRefreshing(false),1000);
  };

  const normalizedData = useMemo<Voucher[]>(() => (vouchers||[]).map((v: VoucherRaw) => {
    const cleanDate = (v.date||v.Date||'').toString().split('T')[0];
    const rawCost   = v['cost_(total)']||v.cost_total||v.Cost_Total||0;
    const rawIncome = v.income||v.Income||0;
    const typeStr   = (v.type||v.Type||'Cash Out').toString().trim();
    const isCashIn  = typeStr.toLowerCase()==='cash in';
    const amount    = isCashIn ? Math.round(Number(rawIncome)||Number(rawCost)||0) : Math.round(Number(rawCost)||0);
    return {
      date: cleanDate, month: cleanDate.slice(0,7),
      voucherno: (v.voucher_no||v.voucherno||'').toString(),
      type: isCashIn ? 'Cash In' : 'Cash Out',
      category: (v.category||v.Category||'UNCLASSIFIED').toString().toUpperCase(),
      sub1: (v.sub_1||v.sub1||'GENERAL').toString().toUpperCase(),
      sub2: (v.sub_2||v.sub2||'').toString().toUpperCase(),
      sub3: (v.sub_3||v.sub3||'').toString().toUpperCase(),
      sub4: (v.sub_4||v.sub4||'').toString().toUpperCase(),
      sub5: (v.sub_5||v.sub5||'').toString().toUpperCase(),
      item: (v.item_description||v.item||'').toString(),
      vendor: (v.vendor||v.Vendor||'').toString(),
      note: (v.note||v.Note||'').toString(),
      cost_total: amount,
      image_data: (v.image_data||v.Image_Data||'').toString(),
      entered_by: (v.entered_by||v.Entered_By||'').toString().toUpperCase(),
      account: (v.account||v.Account||'').toString().toUpperCase(),
    };
  }), [vouchers]);

  const categoryOptions    = useMemo(()=>Array.from(new Set(normalizedData.map(v=>v.category))).filter(Boolean).sort(),[normalizedData]);
  const subCategoryOptions = useMemo(()=>{
    const s=new Set<string>();
    normalizedData.filter(v=>!filter.category||v.category===filter.category).forEach(v=>{[v.sub1,v.sub2,v.sub3,v.sub4,v.sub5].filter(Boolean).forEach(x=>s.add(x));});
    return Array.from(s).filter(Boolean).sort();
  },[normalizedData,filter.category]);
  const vendorOptions    = useMemo(()=>Array.from(new Set(normalizedData.map(v=>v.vendor))).filter(Boolean).sort(),[normalizedData]);
  const enteredByOptions = useMemo(()=>Array.from(new Set(normalizedData.map(v=>v.entered_by))).filter(Boolean).sort(),[normalizedData]);
  const accountOptions   = useMemo(()=>Array.from(new Set(normalizedData.map(v=>v.account))).filter(Boolean).sort(),[normalizedData]);

  const defaultAccount = useMemo(()=>{
    const gm = accountOptions.find(a => a.toLowerCase().includes('gm'));
    return dashboardDefaults.account || gm || '';
  },[accountOptions, dashboardDefaults.account]);

  // '' → use default,  ALL_ACCOUNTS → show all accounts combined
  const activeAccount = filter.account === '' ? defaultAccount : (filter.account === ALL_ACCOUNTS ? '' : filter.account);
  const isAllAccounts = filter.account === ALL_ACCOUNTS;

  const filtered = useMemo<Voucher[]>(()=>normalizedData.filter(v=>{
    const inDate = (!filter.startDate||v.date>=filter.startDate)&&(!filter.endDate||v.date<=filter.endDate);
    return inDate
      && (!filter.category||v.category===filter.category)
      && (!filter.subCategory||[v.sub1,v.sub2,v.sub3,v.sub4,v.sub5].includes(filter.subCategory))
      && (!filter.vendor||v.vendor===filter.vendor)
      && (!filter.enteredBy||v.entered_by===filter.enteredBy)
      && (!activeAccount||v.account===activeAccount)
      && (!filter.item||v.item.toLowerCase().includes(filter.item.toLowerCase()));
  }),[normalizedData,filter,activeAccount]);

  const analytics = useMemo<DashboardAnalytics>(()=>{
    let totalIn=0,totalOut=0;
    const catGroup: Record<string,number>={};
    const dailyMap: Record<string,{date:string;income:number;expense:number}>={};
    const monthMap: Record<string,{month:string;income:number;expense:number}>={};
    filtered.forEach(v=>{
      const isIn=v.type==='Cash In';
      if(isIn) totalIn+=v.cost_total;
      else { totalOut+=v.cost_total; catGroup[v.category]=(catGroup[v.category]||0)+v.cost_total; }
      if(!dailyMap[v.date]) dailyMap[v.date]={date:v.date,income:0,expense:0};
      if(isIn) dailyMap[v.date].income+=v.cost_total; else dailyMap[v.date].expense+=v.cost_total;
      if(!monthMap[v.month]) monthMap[v.month]={month:v.month,income:0,expense:0};
      if(isIn) monthMap[v.month].income+=v.cost_total; else monthMap[v.month].expense+=v.cost_total;
    });
    return {
      totalIn, totalOut, balance:totalIn-totalOut,
      categories: Object.entries(catGroup).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value),
      dailyTrends:  Object.values(dailyMap).sort((a,b)=>a.date.localeCompare(b.date)),
      monthlyTrends: Object.values(monthMap).sort((a,b)=>a.month.localeCompare(b.month)),
    };
  },[filtered]);

  // Top 5 vendors by spend
  const topVendors = useMemo(()=>{
    const g: Record<string,number>={};
    filtered.filter(v=>v.type==='Cash Out'&&v.vendor).forEach(v=>{g[v.vendor]=(g[v.vendor]||0)+v.cost_total;});
    return Object.entries(g).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,5);
  },[filtered]);

  // Per-account summary for ALL mode
  const accountSummary = useMemo(()=>{
    if(!isAllAccounts) return [];
    const g: Record<string,{acc:string;in:number;out:number}>={};
    filtered.forEach(v=>{
      if(!g[v.account]) g[v.account]={acc:v.account,in:0,out:0};
      if(v.type==='Cash In') g[v.account].in+=v.cost_total; else g[v.account].out+=v.cost_total;
    });
    return Object.values(g).sort((a,b)=>b.out-a.out);
  },[filtered,isAllAccounts]);

  const categorySpecificData = useMemo(()=>{
    const cats=Array.from(new Set(filtered.filter(v=>v.type==='Cash Out').map(v=>v.category)));
    return cats.map(catName=>{
      const catV=filtered.filter(v=>v.category===catName&&v.type==='Cash Out');
      const subKeysSet=new Set<string>();
      const dateMap: Record<string,Record<string,number|string>>={};
      catV.forEach(v=>{
        if(!dateMap[v.date]) dateMap[v.date]={date:v.date};
        const parts=[v.sub1,v.sub2,v.sub3,v.sub4,v.sub5].filter(Boolean);
        const key=parts.join(' › ');
        subKeysSet.add(key);
        dateMap[v.date][key]=((dateMap[v.date][key] as number)||0)+v.cost_total;
      });
      return {
        name:catName, total:catV.reduce((s,v)=>s+v.cost_total,0),
        data:Object.values(dateMap).sort((a,b)=>(a.date as string).localeCompare(b.date as string)),
        subKeys:Array.from(subKeysSet),
      };
    });
  },[filtered]);

  const groupedAuditLog = useMemo(()=>{
    type VrEntry = { date:string; type:string; vendor:string; entered_by:string; account:string; items:Voucher[] };
    const g: Record<string, Record<string, VrEntry>> = {};
    const sorted=[...filtered].sort((a,b)=>b.date.localeCompare(a.date)||b.voucherno.localeCompare(a.voucherno));
    sorted.forEach(v=>{
      if(!g[v.category]) g[v.category]={};
      if(!g[v.category][v.voucherno]){
        g[v.category][v.voucherno]={ date:v.date, type:v.type, vendor:v.vendor, entered_by:v.entered_by, account:v.account, items:[] };
      }
      g[v.category][v.voucherno].items.push(v);
    });
    return g;
  },[filtered]);

  const handleDelete  = (voucherno:string)=>setDeleteModal({open:true,voucherno,confirmInput:'',loading:false});

  // ── Open Edit Modal ───────────────────────────────────────────
  const openEditModal = (v: typeof normalizedData[0]) => {
    setEditForm({
      date: v.date, item: v.item, note: v.note,
      cost_total: v.cost_total,
      category: v.category, sub1: v.sub1, sub2: v.sub2,
      sub3: v.sub3, sub4: v.sub4, sub5: v.sub5,
      vendor: v.vendor, image_data: v.image_data,
    });
    setEditModal({ open:true, voucher:v, saving:false, imgUploading:false });
  };

  // ── Upload new photo to Cloudinary ───────────────────────────
  const uploadEditPhoto = async (file: File) => {
    setEditModal(m => ({ ...m, imgUploading:true }));
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((res, rej) => {
        reader.onload = e => res(e.target!.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const r = await fetch('/api/cloudinary', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ image: base64 }),
      });
      const d = await r.json();
      setEditForm(f => ({ ...f, image_data: d.url ?? base64 }));
    } catch { /* keep old image */ }
    finally { setEditModal(m => ({ ...m, imgUploading:false })); }
  };

  // ── Save edited voucher ───────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editModal.voucher) return;
    setEditModal(m => ({ ...m, saving:true }));
    try {
      await updateVoucher({
        voucherno  : editModal.voucher.voucherno,
        date       : editForm.date,
        item       : editForm.item,
        note       : editForm.note,
        cost_total : editForm.cost_total,
        category   : editForm.category,
        sub1       : editForm.sub1,
        sub2       : editForm.sub2,
        sub3       : editForm.sub3,
        sub4       : editForm.sub4,
        sub5       : editForm.sub5,
        vendor     : editForm.vendor,
        image_data : editForm.image_data,
      });
      setEditModal({ open:false, voucher:null, saving:false, imgUploading:false });
      if (onRefresh) onRefresh();
    } catch {
      setEditModal(m => ({ ...m, saving:false }));
      alert('Save မအောင်မြင်ပါ — ထပ်ကြိုးစားပါ');
    }
  };
  const confirmDelete = async()=>{
    if(deleteModal.confirmInput!==deleteModal.voucherno) return;
    setDeleteModal(m=>({...m,loading:true}));
    try {
      await deleteFromSheet(deleteModal.voucherno);
      setDeleteModal({open:false,voucherno:'',confirmInput:'',loading:false});
      if(onRefresh) onRefresh();
    } catch {
      setDeleteModal(m=>({...m,loading:false}));
      alert('FAILED TO DELETE.');
    }
  };

  const PRESETS=[{key:'7d',label:'7 ရက်'},{key:'30d',label:'30 ရက်'},{key:'month',label:'ဒီလ'},{key:'last',label:'ပြီးခဲ့တဲ့လ'}];

  const FSelect=({label,value,options,onChange,special}:{label:string;value:string;options:string[];onChange:(v:string)=>void;special?:{value:string;label:string}})=>(
    <div className="relative">
      <select className="appearance-none w-full pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] outline-none font-black text-slate-950 uppercase cursor-pointer" value={value} onChange={e=>onChange(e.target.value)}>
        <option value="">{label}</option>
        {special&&<option value={special.value}>{special.label}</option>}
        {options.map((o:string)=><option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
    </div>
  );

  const TrendChart=({data,xKey}:{data:{date?:string;month?:string;income:number;expense:number}[];xKey:string})=>(
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={2} margin={{left:-20,right:4,top:4,bottom:0}}>
        <CartesianGrid vertical={false} stroke="#f1f5f9"/>
        <XAxis dataKey={xKey} tick={{fontSize:7,fontWeight:900,fill:'#94a3b8'}} tickLine={false} axisLine={false} tickFormatter={d=>xKey==='month'?d.slice(5)+' လ':d.slice(5)}/>
        <YAxis tick={{fontSize:7,fontWeight:900,fill:'#94a3b8'}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}K`:String(v)}/>
        <Tooltip formatter={(v:unknown)=>fmt(Number(v))+' MMK'} labelStyle={{fontSize:10,fontWeight:900}}/>
        <Bar dataKey="income"  fill="#10b981" name="IN"  radius={[3,3,0,0]}/>
        <Bar dataKey="expense" fill="#f43f5e" name="OUT" radius={[3,3,0,0]}/>
      </BarChart>
    </ResponsiveContainer>
  );

  const displayAccountLabel = isAllAccounts ? 'ALL ACCOUNTS' : (activeAccount || 'ALL');

  return (
    <div className="space-y-5 font-black text-slate-950 uppercase">

      {analytics.balance<0&&(
        <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200">
          <div className="animate-pulse flex justify-center items-center gap-2 text-[11px] tracking-widest font-black text-rose-700">
            <AlertTriangle size={15}/> WARNING: BALANCE NEGATIVE ({fmt(analytics.balance)} MMK)
          </div>
        </div>
      )}

      {/* ── FILTER ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-slate-400 shrink-0"/>
          {PRESETS.map(p=>(
            <button key={p.key} onClick={()=>applyPreset(p.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-black border transition-all ${activePreset===p.key?'bg-slate-950 text-white border-slate-950':'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'}`}>
              {p.label}
            </button>
          ))}
          <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50">
            <RefreshCcw size={13} className={isRefreshing?'animate-spin':''}/>
          </button>
          <button
            onClick={()=>exportCSV(filtered,`finance-${displayAccountLabel}-${new Date().toISOString().slice(0,10)}.csv`)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black hover:bg-slate-100"
          >
            <Download size={12}/> CSV
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] outline-none font-black text-slate-950 min-w-0"
            value={filter.startDate} onChange={e=>{setFilter({...filter,startDate:e.target.value});setActivePreset('');}}/>
          <span className="text-[10px] text-slate-400 shrink-0">TO</span>
          <input type="date" className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] outline-none font-black text-slate-950 min-w-0"
            value={filter.endDate} onChange={e=>{setFilter({...filter,endDate:e.target.value});setActivePreset('');}}/>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <FSelect label="CATEGORY"     value={filter.category}    options={categoryOptions}    onChange={(v:string)=>setFilter({...filter,category:v,subCategory:''})}/>
          <FSelect label="SUB-CATEGORY" value={filter.subCategory} options={subCategoryOptions} onChange={(v:string)=>setFilter({...filter,subCategory:v})}/>
          <FSelect label="VENDOR"       value={filter.vendor}      options={vendorOptions}      onChange={(v:string)=>setFilter({...filter,vendor:v})}/>
          <FSelect label="BY"           value={filter.enteredBy}   options={enteredByOptions}   onChange={(v:string)=>setFilter({...filter,enteredBy:v})}/>
          {/* ACCOUNT with ALL ACCOUNTS combined option */}
          <FSelect
            label="ACCOUNT"
            value={filter.account === '' ? defaultAccount : filter.account}
            options={accountOptions}
            onChange={(v:string)=>setFilter({...filter,account:v})}
            special={{ value: ALL_ACCOUNTS, label: '★ ALL ACCOUNTS (COMBINED)' }}
          />
          <input type="text" placeholder="ITEM ..." className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] outline-none font-black text-slate-950 uppercase"
            value={filter.item} onChange={e=>setFilter({...filter,item:e.target.value})}/>
        </div>
        <div className="flex gap-2">
          <button onClick={clearFilter} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-[11px] font-black hover:bg-slate-200 border border-slate-200">CLEAR</button>
          <Link href="/report" className="flex-1 py-2.5 bg-slate-950 text-white rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 hover:bg-slate-800">
            <Printer size={12}/> PRINT
          </Link>
        </div>
      </div>

      {/* Account badge + count */}
      <div className="flex items-center gap-2 flex-wrap">
        <Wallet size={13} className="text-slate-400"/>
        <span className="text-[10px] text-slate-500 tracking-widest">VIEWING:</span>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${isAllAccounts?'bg-purple-50 text-purple-700 border-purple-200':'bg-slate-100 text-slate-700 border-slate-200'}`}>
          {displayAccountLabel}
        </span>
        <span className="text-[10px] text-slate-400">{filtered.length} vouchers</span>
      </div>

      {/* Per-account breakdown — visible when ALL ACCOUNTS selected */}
      {isAllAccounts && accountSummary.length > 1 && (
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-2">
          <h3 className="text-[9px] text-purple-600 tracking-widest mb-2">ACCOUNT BREAKDOWN</h3>
          {accountSummary.map(acc=>(
            <div key={acc.acc} className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700">{acc.acc}</span>
              <div className="flex gap-3 text-[11px]">
                <span className="text-emerald-600">+{fmt(acc.in)}</span>
                <span className="text-rose-600">-{fmt(acc.out)}</span>
                <span className={`font-black ${acc.in-acc.out>=0?'text-purple-700':'text-rose-700'}`}>= {fmt(acc.in-acc.out)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
          <p className="text-[9px] text-slate-500 mb-1 tracking-widest">CASH IN</p>
          <p className="text-base font-black text-emerald-700 leading-tight">{fmt(analytics.totalIn)}</p>
          <p className="text-[9px] text-slate-400">MMK</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200">
          <p className="text-[9px] text-slate-500 mb-1 tracking-widest">CASH OUT</p>
          <p className="text-base font-black text-rose-700 leading-tight">{fmt(analytics.totalOut)}</p>
          <p className="text-[9px] text-slate-400">MMK</p>
        </div>
        <div className={`p-4 rounded-2xl border ${analytics.balance>=0?'bg-purple-50 border-purple-200':'bg-rose-100 border-rose-300'}`}>
          <p className="text-[9px] text-slate-500 mb-1 tracking-widest">BALANCE</p>
          <p className={`text-base font-black leading-tight ${analytics.balance>=0?'text-purple-700':'text-rose-700'}`}>{fmt(analytics.balance)}</p>
          <p className="text-[9px] text-slate-400">MMK</p>
        </div>
      </div>

      {/* Top 5 vendors */}
      {topVendors.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <h3 className="text-[10px] text-slate-500 mb-3 flex items-center gap-2 tracking-widest"><Trophy size={13}/> TOP VENDORS BY SPEND</h3>
          <div className="space-y-2">
            {topVendors.map((v,i)=>{
              const pct = analytics.totalOut > 0 ? Math.round((v.value/analytics.totalOut)*100) : 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-black text-slate-700 truncate max-w-[200px]">{v.name||'—'}</span>
                    <span className="text-slate-500 shrink-0">{fmt(v.value)} <span className="text-[9px]">MMK</span> · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400 rounded-full transition-all" style={{width:`${pct}%`}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily trend */}
      {analytics.dailyTrends.length>0&&(
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <h3 className="text-[10px] text-slate-500 mb-3 flex items-center gap-2 tracking-widest"><TrendingUp size={13}/> DAILY TREND</h3>
          <div className="h-[160px]"><TrendChart data={analytics.dailyTrends} xKey="date"/></div>
          <div className="flex gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>IN</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/>OUT</span>
          </div>
        </div>
      )}

      {/* Monthly trend */}
      {analytics.monthlyTrends.length>0&&(
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <h3 className="text-[10px] text-slate-500 mb-3 flex items-center gap-2 tracking-widest"><TrendingUp size={13}/> MONTHLY TREND</h3>
          <div className="h-[160px]"><TrendChart data={analytics.monthlyTrends} xKey="month"/></div>
          <div className="flex gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>IN</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/>OUT</span>
          </div>
        </div>
      )}

      {/* Expense pie */}
      {analytics.categories.length>0&&(
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <h3 className="text-[10px] text-slate-500 mb-3 flex items-center gap-2 tracking-widest"><Layers size={13}/> EXPENSE ALLOCATION</h3>
          <div className="flex gap-3 items-start">
            <div className="w-[120px] h-[120px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.categories} innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
                    {analytics.categories.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:unknown)=>fmt(Number(v))+' MMK'}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5 overflow-y-auto max-h-[120px]">
              {analytics.categories.map((cat,i)=>(
                <div key={i} className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor:COLORS[i%COLORS.length]}}/>
                    <span className="text-[10px] font-black text-slate-700 truncate">{cat.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-500 shrink-0">{fmt(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-category breakdown */}
      {categorySpecificData.length>0&&(
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1"><BarChart3 className="text-slate-400" size={15}/><h2 className="text-xs tracking-widest font-black">SUB-CATEGORY BREAKDOWN</h2></div>
          {categorySpecificData.map((catChart,idx)=>(
            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[11px] text-slate-500 tracking-widest font-black">{catChart.name}</h4>
                <span className="text-xs font-black">{fmt(catChart.total)} MMK</span>
              </div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catChart.data} margin={{left:-20,right:4,top:4,bottom:0}}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="date" tick={{fontSize:7,fontWeight:900,fill:'#94a3b8'}} tickLine={false} axisLine={false} tickFormatter={d=>String(d).slice(5)}/>
                    <YAxis tick={{fontSize:7,fontWeight:900,fill:'#94a3b8'}} tickLine={false} axisLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}K`:String(v)}/>
                    <Tooltip formatter={(v:unknown)=>fmt(Number(v))+' MMK'}/>
                    {catChart.subKeys.map((sub,sIdx)=>(
                      <Bar key={sub} dataKey={sub} stackId="a" fill={COLORS[sIdx%COLORS.length]} name={sub} radius={sIdx===catChart.subKeys.length-1?[3,3,0,0]:[0,0,0,0]}/>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {catChart.subKeys.map((sub,sIdx)=>(
                  <span key={sIdx} className="flex items-center gap-1 text-[9px] text-slate-500 font-black">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{backgroundColor:COLORS[sIdx%COLORS.length]}}/>
                    <span className="truncate max-w-[120px]">{sub}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit log */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1"><ListChecks className="text-slate-400" size={15}/><h2 className="text-xs tracking-widest font-black">DETAILED AUDIT LOG</h2></div>
        {Object.keys(groupedAuditLog).map(catName=>{
          const vrMap = groupedAuditLog[catName];
          const allItems = Object.values(vrMap).flatMap(vr=>vr.items);
          const catOut = allItems.filter(v=>v.type!=='Cash In').reduce((s,v)=>s+v.cost_total,0);
          const catIn  = allItems.filter(v=>v.type==='Cash In').reduce((s,v)=>s+v.cost_total,0);
          const isOpen = openCats[catName]!==false;
          return (
            <div key={catName} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button onClick={()=>toggleCat(catName)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors">
                <h3 className="text-xs tracking-widest font-black">{catName}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-black">
                    {catIn >0&&<span className="text-emerald-600">+{fmt(catIn)}</span>}
                    {catOut>0&&<span className="text-rose-600">-{fmt(catOut)}</span>}
                    <span className="text-slate-400 text-[9px]">MMK</span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen?'rotate-180':''}`}/>
                </div>
              </button>
              {isOpen&&Object.entries(vrMap).map(([vrNo, vr])=>{
                const vrTotal = vr.items.reduce((s,v)=>s+v.cost_total,0);
                const isVrOpen = openCats[vrNo]!==false;
                return (
                  <div key={vrNo} className="border-b border-slate-50 last:border-0">
                    <button onClick={()=>toggleCat(vrNo)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">{vrNo}</span>
                        <span className="text-[9px] text-slate-400">{vr.date}</span>
                        {vr.vendor&&<span className="text-[9px] text-slate-400 truncate max-w-[80px]">{vr.vendor}</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-black ${vr.type==='Cash In'?'text-emerald-600':'text-rose-600'}`}>
                          {vr.type==='Cash In'?'+':'-'}{fmt(vrTotal)}
                        </span>
                        <div className="flex gap-1">
                          {vr.account&&<span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black">{vr.account}</span>}
                          {vr.entered_by&&<span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black">{vr.entered_by}</span>}
                        </div>
                        <ChevronDown size={11} className={`text-slate-300 transition-transform duration-150 ${isVrOpen?'rotate-180':''}`}/>
                      </div>
                    </button>
                    {isVrOpen&&(
                      <div className="divide-y divide-slate-50 bg-slate-50/50">
                        {vr.items.map((v,idx)=>(
                          <div key={idx} className="px-4 py-2.5 flex items-start gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-xs font-black truncate">{v.item||'—'}</p>
                              <div className="flex flex-wrap gap-1">
                                {[v.sub1,v.sub2,v.sub3,v.sub4,v.sub5].filter(Boolean).map((s,si)=>(
                                  <span key={si} className="text-[8px] text-slate-400">{si>0?'›':''} {s}</span>
                                ))}
                              </div>
                              {v.note&&<p className="text-[9px] text-slate-500 bg-amber-50 px-2 py-1 rounded border-l-2 border-amber-300 normal-case">📝 {v.note}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className={`text-sm font-black ${v.type==='Cash In'?'text-emerald-600':'text-rose-600'}`}>
                                {v.type==='Cash In'?'+':'-'}{fmt(v.cost_total)}
                              </span>
                              <div className="flex gap-1.5 print:hidden">
                                <button onClick={()=>openEditModal(v)} className="p-1.5 bg-blue-50 text-blue-500 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white transition-all" title="Edit">
                                  <Pencil size={12}/>
                                </button>
                                <button onClick={()=>handleDelete(v.voucherno)} className="p-1.5 bg-rose-50 text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-600 hover:text-white transition-all">
                                  <Trash2 size={12}/>
                                </button>
                                {v.image_data&&<button onClick={()=>setSelectedImg(v.image_data)} className="p-1.5 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-950 hover:text-white transition-all text-slate-600"><ImageIcon size={12}/></button>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Image preview */}
      {selectedImg&&(
        <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm print:hidden" onClick={()=>setSelectedImg(null)}>
          <button className="absolute top-6 right-6 text-white"><X size={28}/></button>
          <img src={selectedImg} className="max-w-full max-h-full rounded-2xl border-4 border-white shadow-xl" alt="Proof"/>
        </div>
      )}

      {/* ── Edit Voucher Modal ── */}
      {editModal.open && editModal.voucher && (
        <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm print:hidden"
          onClick={()=>{ if(!editModal.saving) setEditModal(m=>({...m,open:false})); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e=>e.stopPropagation()}>

            {/* Header */}
            <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[9px] text-slate-400 tracking-widest uppercase">Edit Voucher</p>
                <p className="text-sm font-black tracking-widest">{editModal.voucher.voucherno}</p>
              </div>
              <button onClick={()=>setEditModal(m=>({...m,open:false}))} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                <X size={16}/>
              </button>
            </div>

            {/* Scrollable form */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Date</label>
                <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none focus:border-slate-500 text-slate-950"
                  value={editForm.date} onChange={e=>setEditForm(f=>({...f,date:e.target.value}))}/>
              </div>

              {/* Vendor */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Vendor / Supplier</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none focus:border-slate-500 text-slate-950 uppercase"
                  value={editForm.vendor} onChange={e=>setEditForm(f=>({...f,vendor:e.target.value}))}/>
              </div>

              {/* Category path */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {label:'Category', key:'category' as const},
                    {label:'Sub 1',    key:'sub1'     as const},
                    {label:'Sub 2',    key:'sub2'     as const},
                    {label:'Sub 3',    key:'sub3'     as const},
                  ].map(({label,key})=>(
                    <div key={key} className="space-y-0.5">
                      <p className="text-[8px] text-slate-400 uppercase">{label}</p>
                      <input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none focus:border-slate-500 text-slate-950 uppercase"
                        value={editForm[key]} onChange={e=>setEditForm(f=>({...f,[key]:e.target.value.toUpperCase()}))}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Item description */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Item Description</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none focus:border-slate-500 text-slate-950"
                  value={editForm.item} onChange={e=>setEditForm(f=>({...f,item:e.target.value}))}/>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Amount (MMK)</label>
                <input type="number" className="w-full p-3 bg-slate-950 text-white border-0 rounded-xl text-xl text-center font-black outline-none"
                  value={editForm.cost_total} onChange={e=>setEditForm(f=>({...f,cost_total:parseFloat(e.target.value)||0}))}/>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Note</label>
                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none focus:border-slate-500 text-slate-950 resize-none h-16 normal-case"
                  value={editForm.note} onChange={e=>setEditForm(f=>({...f,note:e.target.value}))}/>
              </div>

              {/* Photo */}
              <div className="space-y-2">
                <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Photo</label>
                {editForm.image_data ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editForm.image_data} alt="voucher" className="w-full max-h-40 object-contain rounded-xl border border-slate-200"/>
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <label className="cursor-pointer p-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-200 transition-colors">
                        <Pencil size={12}/>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadEditPhoto(f); e.target.value=''; }}/>
                      </label>
                      <button onClick={()=>setEditForm(f=>({...f,image_data:''}))}
                        className="p-1.5 bg-rose-100 text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-200 transition-colors">
                        <X size={12}/>
                      </button>
                    </div>
                    {editModal.imgUploading && (
                      <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                        <RefreshCcw size={20} className="animate-spin text-slate-400"/>
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-slate-400 transition-colors text-slate-400 text-[11px] font-black uppercase">
                    {editModal.imgUploading
                      ? <><RefreshCcw size={14} className="animate-spin"/> Uploading...</>
                      : <><ImageIcon size={14}/> ပုံ ပြောင်းမည်</>
                    }
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadEditPhoto(f); e.target.value=''; }}/>
                  </label>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="px-5 pb-5 pt-3 flex gap-3 shrink-0 border-t border-slate-100">
              <button onClick={handleSaveEdit}
                disabled={editModal.saving || editModal.imgUploading}
                className="flex-1 bg-slate-950 text-white py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-slate-800 transition-colors">
                {editModal.saving
                  ? <><RefreshCcw size={13} className="animate-spin"/> Saving...</>
                  : <><Save size={13}/> Save Changes</>
                }
              </button>
              <button onClick={()=>setEditModal(m=>({...m,open:false}))} disabled={editModal.saving}
                className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-2xl text-xs font-black hover:bg-slate-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteModal.open&&(
        <div className="fixed inset-0 bg-slate-900/80 z-[9999] flex items-center justify-center p-6 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5 border border-rose-200">
            <div className="flex items-center gap-3">
              <div className="bg-rose-100 p-2.5 rounded-2xl"><ShieldAlert size={22} className="text-rose-600"/></div>
              <div><h2 className="text-sm font-black tracking-widest">CONFIRM DELETE</h2><p className="text-[10px] text-slate-400 mt-0.5 normal-case">ဤလုပ်ဆောင်ချက်ကို ပြန်မဖြေဖြစ်နိုင်ပါ</p></div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
              <p className="text-[9px] text-slate-400 tracking-widest mb-1">VOUCHER</p>
              <p className="text-lg font-black text-rose-700 tracking-widest">{deleteModal.voucherno}</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-400 tracking-widest">VOUCHER ID ရိုက်ထည့်ပါ</label>
              <input autoFocus type="text" className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-black uppercase outline-none focus:border-rose-400 tracking-widest"
                placeholder={deleteModal.voucherno} value={deleteModal.confirmInput}
                onChange={e=>setDeleteModal(m=>({...m,confirmInput:e.target.value.toUpperCase()}))}
                onKeyDown={e=>e.key==='Enter'&&confirmDelete()}/>
              {deleteModal.confirmInput.length>0&&deleteModal.confirmInput!==deleteModal.voucherno&&<p className="text-[10px] text-rose-500">✗ ID မတူပါ</p>}
              {deleteModal.confirmInput===deleteModal.voucherno&&<p className="text-[10px] text-emerald-600">✓ ID တူပါသည်</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteModal({open:false,voucherno:'',confirmInput:'',loading:false})} className="flex-1 py-3.5 bg-slate-100 rounded-2xl text-xs font-black hover:bg-slate-200 border border-slate-200">CANCEL</button>
              <button onClick={confirmDelete} disabled={deleteModal.confirmInput!==deleteModal.voucherno||deleteModal.loading}
                className={`flex-1 py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all ${deleteModal.confirmInput===deleteModal.voucherno&&!deleteModal.loading?'bg-rose-600 text-white hover:bg-rose-700':'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                {deleteModal.loading?<><span className="animate-spin">⟳</span> DELETING...</>:<><Trash2 size={12}/> DELETE</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}