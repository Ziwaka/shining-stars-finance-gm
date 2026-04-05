"use client"
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ChevronRight, Plus, Trash2, RefreshCcw,
  Layers, CheckCircle, XCircle, Tag, FolderOpen, Save
} from 'lucide-react';

interface CatRow {
  Category?: string; category?: string;
  Sub_1?: string; sub_1?: string; sub1?: string;
  Sub_2?: string; sub_2?: string; sub2?: string;
  Sub_3?: string; sub_3?: string; sub3?: string;
  Sub_4?: string; sub_4?: string; sub4?: string;
  Sub_5?: string; sub_5?: string; sub5?: string;
}

function normalize(row: CatRow) {
  return {
    category : (row.Category || row.category || '').toString().trim().toUpperCase(),
    sub1     : (row.Sub_1    || row.sub_1    || row.sub1 || '').toString().trim().toUpperCase(),
    sub2     : (row.Sub_2    || row.sub_2    || row.sub2 || '').toString().trim().toUpperCase(),
    sub3     : (row.Sub_3    || row.sub_3    || row.sub3 || '').toString().trim().toUpperCase(),
    sub4     : (row.Sub_4    || row.sub_4    || row.sub4 || '').toString().trim().toUpperCase(),
    sub5     : (row.Sub_5    || row.sub_5    || row.sub5 || '').toString().trim().toUpperCase(),
  };
}

function groupRows(rows: CatRow[]) {
  const map: Record<string, { sub1: string; sub2: string; sub3: string; sub4: string; sub5: string }[]> = {};
  rows.forEach(r => {
    const n = normalize(r);
    if (!n.category) return;
    if (!map[n.category]) map[n.category] = [];
    map[n.category].push({ sub1: n.sub1, sub2: n.sub2, sub3: n.sub3, sub4: n.sub4, sub5: n.sub5 });
  });
  return map;
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-xs font-black uppercase tracking-widest
      ${ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
      {ok ? <CheckCircle size={14}/> : <XCircle size={14}/>}
      {msg}
    </div>
  );
}

export default function CategoriesPage() {
  const [catList,   setCatList]   = useState<CatRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [busy,      setBusy]      = useState(false);

  // Combined new category + sub form
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [newCatName,   setNewCatName]   = useState('');
  const [newSub,       setNewSub]       = useState({ sub1:'', sub2:'', sub3:'', sub4:'', sub5:'' });

  // Add sub to existing category
  const [addSubFor,  setAddSubFor]  = useState<string | null>(null);
  const [addNewSub,  setAddNewSub]  = useState({ sub1:'', sub2:'', sub3:'', sub4:'', sub5:'' });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  };

  const loadData = () => {
    setLoading(true);
    fetch('/api/gas?force=1')
      .then(r => r.json())
      .then(d => { setCatList(d.categoryList || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(loadData, []);

  const grouped = useMemo(() => groupRows(catList), [catList]);
  const categories = useMemo(() => Object.keys(grouped).sort(), [grouped]);
  const subCount = (cat: string) => grouped[cat]?.filter(r => r.sub1).length ?? 0;

  async function manageCat(payload: object) {
    setBusy(true);
    try {
      const res = await fetch('/api/gas', {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ action: 'manageCat', ...payload }),
      });
      const data = await res.json();
      if (data.result === 'saved' || data.result === 'deleted') {
        loadData();
        return true;
      }
      return false;
    } catch { return false; }
    finally { setBusy(false); }
  }

  // Case-insensitive duplicate checks
  function isDuplicateCat(catName: string): boolean {
    return categories.some(c => c.toUpperCase() === catName.trim().toUpperCase());
  }

  function isDuplicateSub(cat: string, sub: typeof addNewSub): boolean {
    const subs = grouped[cat.toUpperCase()] || [];
    return subs.some(r =>
      r.sub1.toUpperCase() === sub.sub1.trim().toUpperCase() &&
      r.sub2.toUpperCase() === (sub.sub2||'').trim().toUpperCase()
    );
  }

  // Save new Category (with optional Sub) — ONE save button
  async function handleSaveNewCatAndSub() {
    const cat = newCatName.trim().toUpperCase();
    if (!cat) { showToast('Category ထည့်ပါ', false); return; }
    if (isDuplicateCat(cat)) { showToast(`"${cat}" ရှိပြီးသား`, false); return; }

    const hasSub = !!newSub.sub1.trim();
    const ok = await manageCat({
      subAction: 'add',
      category : cat,
      sub1     : newSub.sub1.trim().toUpperCase(),
      sub2     : newSub.sub2.trim().toUpperCase(),
      sub3     : newSub.sub3.trim().toUpperCase(),
      sub4     : newSub.sub4.trim().toUpperCase(),
      sub5     : newSub.sub5.trim().toUpperCase(),
    });

    if (ok) {
      showToast(`"${cat}"${hasSub ? ' + Sub' : ''} သိမ်းပြီး`, true);
      setNewCatName('');
      setNewSub({ sub1:'', sub2:'', sub3:'', sub4:'', sub5:'' });
      setShowAddForm(false);
      setExpanded(cat);
    } else {
      showToast('သိမ်းမရ', false);
    }
  }

  async function handleAddSub(cat: string) {
    if (!addNewSub.sub1.trim()) { showToast('Sub 1 ထည့်ပါ', false); return; }
    if (isDuplicateSub(cat, addNewSub)) { showToast('Sub ရှိပြီးသား', false); return; }

    const ok = await manageCat({
      subAction: 'add',
      category : cat,
      sub1     : addNewSub.sub1.trim().toUpperCase(),
      sub2     : addNewSub.sub2.trim().toUpperCase(),
      sub3     : addNewSub.sub3.trim().toUpperCase(),
      sub4     : addNewSub.sub4.trim().toUpperCase(),
      sub5     : addNewSub.sub5.trim().toUpperCase(),
    });
    if (ok) {
      showToast('Sub ထည့်ပြီး', true);
      setAddNewSub({ sub1:'', sub2:'', sub3:'', sub4:'', sub5:'' });
      setAddSubFor(null);
    } else {
      showToast('သိမ်းမရ', false);
    }
  }

  async function handleDeleteSub(cat: string, row: { sub1:string;sub2:string;sub3:string;sub4:string;sub5:string }) {
    if (!confirm(`ဖျက်မလား?\n${cat} › ${[row.sub1,row.sub2,row.sub3,row.sub4,row.sub5].filter(Boolean).join(' › ')}`)) return;
    const ok = await manageCat({ subAction: 'delete', category: cat, ...row });
    if (ok) showToast('ဖျက်ပြီး', true);
    else    showToast('ဖျက်မရ', false);
  }

  async function handleDeleteCategory(cat: string) {
    const rows = grouped[cat] || [];
    if (!confirm(`"${cat}" category အားလုံး ဖျက်မလား?\n(${rows.length > 0 ? rows.length + ' ကြောင်း' : 'bare category'})`)) return;
    setBusy(true);
    const toDelete = rows.length > 0 ? rows : [{ sub1:'', sub2:'', sub3:'', sub4:'', sub5:'' }];
    let allOk = true;
    for (const r of toDelete) {
      const ok = await manageCat({ subAction:'delete', category:cat, ...r });
      if (!ok) { allOk = false; break; }
    }
    if (allOk) { showToast(`${cat} ဖျက်ပြီး`, true); if (expanded === cat) setExpanded(null); }
    else        showToast('အချို့ ဖျက်မရ', false);
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 font-black text-slate-950">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-4 pt-4">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <ArrowLeft size={18}/>
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Category Manager</h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">{categories.length} categories</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={loadData} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              <RefreshCcw size={16} className={loading ? 'animate-spin text-slate-400' : 'text-slate-400'}/>
            </button>
            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <Layers size={20} className="text-slate-400"/>
            </div>
          </div>
        </div>

        {/* Summary */}
        {!loading && categories.length > 0 && (
          <div className="bg-slate-950 text-white rounded-2xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[9px] text-slate-400 tracking-widest uppercase mb-1">Categories</p>
              <p className="text-2xl font-black">{categories.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 tracking-widest uppercase mb-1">Sub Entries</p>
              <p className="text-2xl font-black">{catList.filter(r => normalize(r).sub1).length}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCcw className="animate-spin text-slate-300" size={28}/>
          </div>
        ) : (
          <div className="space-y-2">

            {/* Existing categories */}
            {categories.map(cat => {
              const subs   = grouped[cat] || [];
              const isOpen = expanded === cat;
              return (
                <div key={cat} className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all hover:border-slate-400">
                  <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : cat)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        <FolderOpen size={14} className="text-slate-500"/>
                      </div>
                      <div>
                        <p className="text-sm font-black uppercase">{cat}</p>
                        {subCount(cat) > 0 && (
                          <p className="text-[10px] text-slate-400 uppercase">{subCount(cat)} sub {subCount(cat) > 1 ? 'entries' : 'entry'}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={e => { e.stopPropagation(); handleDeleteCategory(cat); }} disabled={busy}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                        <Trash2 size={13}/>
                      </button>
                      <ChevronRight size={16} className={`text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}/>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-2">
                      {subs.filter(r => r.sub1).length === 0 ? (
                        <p className="text-[10px] text-slate-300 uppercase tracking-widest py-1">Sub မရှိသေး</p>
                      ) : (
                        <div className="space-y-1">
                          {subs.filter(r => r.sub1).map((r, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 group">
                              <div className="flex items-center gap-2 min-w-0">
                                <Tag size={11} className="text-slate-400 shrink-0"/>
                                <span className="text-[11px] font-black text-slate-700 truncate">
                                  {[r.sub1, r.sub2, r.sub3, r.sub4, r.sub5].filter(Boolean).join(' › ')}
                                </span>
                              </div>
                              <button onClick={() => handleDeleteSub(cat, r)} disabled={busy}
                                className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {addSubFor === cat ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 mt-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Sub Category ထည့်ပါ</p>
                          {['Sub 1 *','Sub 2','Sub 3','Sub 4','Sub 5'].map((label, idx) => {
                            const key = `sub${idx+1}` as keyof typeof addNewSub;
                            if (idx > 0 && !addNewSub[`sub${idx}` as keyof typeof addNewSub]) return null;
                            return (
                              <div key={idx} className="space-y-1">
                                <label className="text-[9px] text-slate-400 uppercase font-black">{label}</label>
                                <input
                                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:border-slate-500 text-slate-950 placeholder:text-slate-300"
                                  placeholder={label}
                                  value={addNewSub[key]}
                                  onChange={e => setAddNewSub(prev => ({ ...prev, [key]: e.target.value }))}
                                />
                              </div>
                            );
                          })}
                          {/* Duplicate warning */}
                          {addNewSub.sub1.trim() && isDuplicateSub(cat, addNewSub) && (
                            <p className="text-[10px] text-rose-500 flex items-center gap-1"><XCircle size={11}/> Sub ရှိပြီးသား</p>
                          )}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleAddSub(cat)}
                              disabled={busy || !addNewSub.sub1.trim() || isDuplicateSub(cat, addNewSub)}
                              className="flex-1 bg-slate-950 text-white py-3 rounded-xl text-xs font-black uppercase disabled:opacity-40 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                              {busy ? <RefreshCcw size={13} className="animate-spin"/> : <Save size={13}/>}
                              SAVE SUB CATEGORY
                            </button>
                            <button onClick={() => { setAddSubFor(null); setAddNewSub({ sub1:'', sub2:'', sub3:'', sub4:'', sub5:'' }); }}
                              className="px-4 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition-colors">
                              CANCEL
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddSubFor(cat); setAddNewSub({ sub1:'', sub2:'', sub3:'', sub4:'', sub5:'' }); }}
                          className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-[11px] font-black uppercase text-slate-400 hover:border-slate-400 hover:text-slate-700 transition-all"
                        >
                          <Plus size={13}/> ADD SUB CATEGORY
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* New Category + Sub combined form */}
            {showAddForm ? (
              <div className="bg-white border-2 border-slate-950 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-950 uppercase tracking-widest font-black flex items-center gap-2">
                    <FolderOpen size={14}/> New Category
                  </p>
                  <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">အားလုံးထည့်ပြီးမှ Save နှိပ်ပါ</span>
                </div>

                {/* Category name */}
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Category Name *</label>
                  <input
                    autoFocus
                    className="w-full p-4 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-black uppercase outline-none focus:border-slate-950 text-slate-950 placeholder:text-slate-300"
                    placeholder="CATEGORY NAME"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') { setShowAddForm(false); setNewCatName(''); setNewSub({ sub1:'', sub2:'', sub3:'', sub4:'', sub5:'' }); }
                    }}
                  />
                  {newCatName.trim() && isDuplicateCat(newCatName) && (
                    <p className="text-[10px] text-rose-500 flex items-center gap-1">
                      <XCircle size={11}/> &quot;{newCatName.trim().toUpperCase()}&quot; ရှိပြီးသား (Case-insensitive)
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-slate-200"/>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest">Sub Category (optional)</span>
                  <div className="flex-1 h-px bg-slate-200"/>
                </div>

                {/* Sub fields — show next only if previous is filled */}
                {['Sub 1','Sub 2','Sub 3','Sub 4','Sub 5'].map((label, idx) => {
                  const key = `sub${idx+1}` as keyof typeof newSub;
                  if (idx > 0 && !newSub[`sub${idx}` as keyof typeof newSub]) return null;
                  return (
                    <div key={idx} className="space-y-1">
                      <label className="text-[9px] text-slate-400 uppercase font-black">{label}</label>
                      <input
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:border-slate-500 text-slate-950 placeholder:text-slate-300"
                        placeholder={label}
                        value={newSub[key]}
                        onChange={e => {
                          const val = e.target.value;
                          setNewSub(prev => {
                            const next = { ...prev, [key]: val };
                            // Clear deeper levels when a level is cleared
                            if (!val) {
                              for (let i = idx + 1; i < 5; i++) {
                                (next as Record<string,string>)[`sub${i+1}`] = '';
                              }
                            }
                            return next;
                          });
                        }}
                      />
                    </div>
                  );
                })}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveNewCatAndSub}
                    disabled={busy || !newCatName.trim() || isDuplicateCat(newCatName)}
                    className="flex-1 bg-slate-950 text-white py-4 rounded-xl text-xs font-black uppercase disabled:opacity-40 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    {busy ? <RefreshCcw size={13} className="animate-spin"/> : <Save size={14}/>}
                    SAVE NEW CATEGORY {newSub.sub1.trim() ? '& SUB CATEGORY' : ''}
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewCatName(''); setNewSub({ sub1:'', sub2:'', sub3:'', sub4:'', sub5:'' }); }}
                    className="px-5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-xs font-black uppercase text-slate-400 hover:border-slate-950 hover:text-slate-950 transition-all"
              >
                <Plus size={15}/> ADD CATEGORY
              </button>
            )}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok}/>}
    </main>
  );
}
