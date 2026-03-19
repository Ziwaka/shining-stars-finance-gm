"use client";
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL, GIDS } from '@/lib/api';

// ── 1. COLOR CONSTANTS ───────────────────────────────────────────────────
const COLORS = {
  primary: '#fbbf24',
  primaryDark: '#b45309',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  dark: '#0f172a',
  darker: '#020617',
  light: '#f8fafc',
  gray: '#64748b'
};

// ── 2. COMPONENTS ────────────────────────────────────────────────────────

const StatCard = ({ title, value, subtitle, icon, color, trend }) => (
  <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100">
    <div className="flex justify-between items-start mb-6">
      <div className={`w-14 h-14 rounded-2xl bg-${color}-100 flex items-center justify-center text-3xl`}>
        {icon}
      </div>
      <span className={`text-${color}-600 font-semibold text-sm px-4 py-2 bg-${color}-50 rounded-full`}>
        {trend}
      </span>
    </div>
    <h3 className="text-gray-600 text-sm font-medium mb-2">{title}</h3>
    <p className="text-4xl font-bold text-gray-900 mb-2">{value}</p>
    <p className="text-gray-500 text-sm">{subtitle}</p>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
    <div className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-8">
        <div className="absolute inset-0 border-4 border-amber-500/30 rounded-full" />
        <div className="absolute inset-0 border-4 border-t-amber-500 rounded-full animate-spin" />
      </div>
      <p className="text-amber-500 text-xl font-bold tracking-wider">HOSTEL HUB</p>
      <p className="text-gray-500 text-sm mt-4">Initializing dashboard...</p>
    </div>
  </div>
);

// Maintenance Request Modal (unchanged)
const MaintenanceModal = ({ isOpen, onClose, onSubmit, user }) => {
  const [form, setForm] = useState({
    type: 'water',
    description: '',
    priority: 'medium',
    location: '',
    estimated_cost: '',
    completed_note: '',
    status: 'pending'
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      requested_by: user?.Name || 'Unknown',
      requested_date: new Date().toISOString().split('T')[0]
    });
    setForm({ type: 'water', description: '', priority: 'medium', location: '', estimated_cost: '', completed_note: '', status: 'pending' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">New Maintenance Request</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Request Type *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'water', label: '💧 ရေ', color: 'blue' },
                { id: 'electric', label: '⚡ မီး', color: 'yellow' },
                { id: 'structure', label: '🏗️ အဆောက်အဦ', color: 'amber' },
                { id: 'other', label: '🛠️ အခြား', color: 'gray' }
              ].map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setForm({ ...form, type: type.id })}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    form.type === type.id
                      ? `border-${type.color}-500 bg-${type.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl block mb-2">{type.label.split(' ')[0]}</span>
                  <span className="text-sm font-medium">{type.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">တည်နေရာ *</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="e.g., Building A, Room 101, Common Area"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ဆောင်ရွက်ပေးစေလိုသည်များ *</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows="4"
              placeholder="အသေးစိတ်ဖော်ပြပေးပါ..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">အရေးကြီးမှုအဆင့်</label>
            <div className="flex gap-3">
              {[
                { value: 'low', label: '🟢 သာမန်', color: 'green' },
                { value: 'medium', label: '🟡 အလယ်အလတ်', color: 'yellow' },
                { value: 'high', label: '🔴 အရေးပေါ်', color: 'red' }
              ].map(priority => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => setForm({ ...form, priority: priority.value })}
                  className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                    form.priority === priority.value
                      ? `border-${priority.color}-500 bg-${priority.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium">{priority.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Estimated Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ခန့်မှန်းတန်ဖိုး (ကျပ်)</label>
            <input
              type="number"
              value={form.estimated_cost}
              onChange={e => setForm({ ...form, estimated_cost: e.target.value })}
              placeholder="e.g., 50000"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Maintenance Log Modal (unchanged)
const MaintenanceLogModal = ({ isOpen, onClose, request, onSubmit, user }) => {
  const [form, setForm] = useState({
    completed_note: '',
    actual_cost: '',
    status: 'completed'
  });

  useEffect(() => {
    if (request) {
      setForm({
        completed_note: request.completed_note || '',
        actual_cost: request.estimated_cost || '',
        status: 'completed'
      });
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...request,
      ...form,
      completed_by: user?.Name || 'Unknown',
      completed_date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full p-8" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Maintenance Request</h2>
        <p className="text-gray-600 mb-6">{request.description}</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Completed Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ဆောင်ရွက်ပြီးစီးမှုမှတ်ချက် *</label>
            <textarea
              value={form.completed_note}
              onChange={e => setForm({ ...form, completed_note: e.target.value })}
              rows="3"
              placeholder="ဘယ်လိုဆောင်ရွက်ခဲ့တယ်ဆိုတာ အသေးစိတ်ရေးပါ..."
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              required
            />
          </div>

          {/* Actual Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">အကုန်အကျတန်ဖိုး (ကျပ်)</label>
            <input
              type="number"
              value={form.actual_cost}
              onChange={e => setForm({ ...form, actual_cost: e.target.value })}
              placeholder="e.g., 45000"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
            >
              Mark as Completed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Maintenance Requests List (unchanged)
const MaintenanceList = ({ requests, onComplete, user }) => {
  const getTypeIcon = (type) => {
    switch(type) {
      case 'water': return '💧';
      case 'electric': return '⚡';
      case 'structure': return '🏗️';
      default: return '🛠️';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  return (
    <div className="space-y-4">
      {requests.map((req, idx) => (
        <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getTypeIcon(req.type)}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{req.location}</h3>
                <p className="text-sm text-gray-600 mt-1">{req.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(req.priority)}`}>
                {req.priority === 'high' ? 'အရေးပေါ်' : req.priority === 'medium' ? 'အလယ်အလတ်' : 'သာမန်'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(req.status)}`}>
                {req.status === 'completed' ? 'ပြီးစီး' : req.status === 'in_progress' ? 'လုပ်ဆောင်နေ' : 'ဆိုင်းငံ့'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">တောင်းဆိုသူ</span>
              <p className="font-medium text-gray-900">{req.requested_by}</p>
            </div>
            <div>
              <span className="text-gray-500">ရက်စွဲ</span>
              <p className="font-medium text-gray-900">{req.requested_date}</p>
            </div>
            {req.estimated_cost && (
              <div>
                <span className="text-gray-500">ခန့်မှန်းတန်ဖိုး</span>
                <p className="font-medium text-gray-900">{Number(req.estimated_cost).toLocaleString()} ကျပ်</p>
              </div>
            )}
            {req.actual_cost && (
              <div>
                <span className="text-gray-500">အကုန်အကျ</span>
                <p className="font-medium text-gray-900">{Number(req.actual_cost).toLocaleString()} ကျပ်</p>
              </div>
            )}
          </div>

          {req.completed_note && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-700">
                <span className="font-medium">မှတ်ချက်:</span> {req.completed_note}
              </p>
              {req.completed_by && (
                <p className="text-xs text-gray-500 mt-2">
                  ဆောင်ရွက်သူ: {req.completed_by} • {req.completed_date}
                </p>
              )}
            </div>
          )}

          {req.status === 'pending' && (
            <button
              onClick={() => onComplete(req)}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
            >
              ပြီးစီးကြောင်းမှတ်တမ်းတင်ရန်
            </button>
          )}
        </div>
      ))}

      {requests.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <p className="text-gray-500">No maintenance requests yet</p>
        </div>
      )}
    </div>
  );
};

// ── 3. MAIN DASHBOARD ────────────────────────────────────────────────────

export default function HostelMasterDashboard() {
  const [students, setStudents] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('CONNECTING');
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(null);
  const router = useRouter();

  // ── A. AUTHENTICATION ──────────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authSession = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (!authSession) {
          router.push('/login');
          return;
        }
        
        const currentUser = JSON.parse(authSession);
        setUser(currentUser);
        
        const isPowerUser = currentUser.userRole === 'management';
        const hasHostelAccess = currentUser['Can_Manage_Hostel'] === true || 
                               String(currentUser['Can_Manage_Hostel'] || '').toUpperCase() === 'TRUE';

        if (isPowerUser || hasHostelAccess) {
          return;
        }

        const res = await fetch(WEB_APP_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'getStaffPermissions' }) 
        });
        
        const data = await res.json();
        
        if (data.success) {
          const match = data.data.find(s =>
            s.Staff_ID?.toString() === currentUser.Staff_ID?.toString() ||
            s.Name === currentUser.Name
          );
          
          if (match?.['Can_Manage_Hostel'] === true) {
            localStorage.setItem('user', JSON.stringify({ ...currentUser, ...match }));
            return;
          }
        }
        
        router.push('/staff');
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/staff');
      }
    };

    checkAuth();
  }, [router]);

  // ── B. DATA FETCHING ───────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setSyncStatus('SYNCING');
    
    try {
      // Try using GIDS.STUDENT_DIR first, fallback to sheet name
      const studentPayload = GIDS.STUDENT_DIR 
        ? { action: 'getData', targetGid: GIDS.STUDENT_DIR }
        : { action: 'getData', sheetName: 'Student_Directory' };

      const [studentRes, facilityRes, maintenanceRes] = await Promise.all([
        fetch(WEB_APP_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(studentPayload)
        }),
        fetch(WEB_APP_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'getData', sheetName: 'Hostel_Facilities' }) 
        }),
        fetch(WEB_APP_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'getData', sheetName: 'Hostel_Maintenance' }) 
        })
      ]);
      
      const sData = await studentRes.json();
      const fData = await facilityRes.json();
      const mData = await maintenanceRes.json();

      if (sData.success) setStudents(sData.data || []);
      else console.warn('Student data fetch failed:', sData.message);
      
      if (fData.success) setFacilities(fData.data || []);
      else console.warn('Facilities data fetch failed:', fData.message);
      
      if (mData.success) setMaintenance(mData.data || []);
      else console.warn('Maintenance data fetch failed:', mData.message);
      
      setSyncStatus('ONLINE');
    } catch (err) {
      console.error("Data fetch failed:", err);
      setError(err.message || 'Failed to load data');
      setSyncStatus('ERROR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── C. MAINTENANCE HANDLERS ────────────────────────────────────────────
  const handleMaintenanceSubmit = async (data) => {
    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'submitData',
          sheetName: 'Hostel_Maintenance',
          data: data
        })
      });
      
      const result = await res.json();
      if (result.success) {
        setShowMaintenanceModal(false);
        fetchData();
      } else {
        alert('Failed to submit: ' + result.message);
      }
    } catch (error) {
      console.error('Failed to submit maintenance:', error);
      alert('Network error');
    }
  };

  const handleMaintenanceComplete = async (data) => {
    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'submitData',
          sheetName: 'Hostel_Maintenance_Log',
          data: data
        })
      });
      
      const result = await res.json();
      if (result.success) {
        setShowLogModal(false);
        setSelectedRequest(null);
        fetchData();
      } else {
        alert('Failed to log completion: ' + result.message);
      }
    } catch (error) {
      console.error('Failed to complete maintenance:', error);
      alert('Network error');
    }
  };

  // ── D. DATA PROCESSING ─────────────────────────────────────────────────
  const boarders = useMemo(() => 
    students.filter(s => s['School/Hostel']?.toString().trim().toLowerCase() === "hostel"),
    [students]
  );

  const gradeMatrix = useMemo(() => {
    const stats = boarders.reduce((acc, s) => {
      const grade = s.Grade || 'N/A';
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(stats).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [boarders]);

  const totalFacilities = facilities.length;
  const maintenanceNeeded = facilities.reduce((sum, item) => sum + (Number(item.Need_Repair) || 0), 0);
  const healthScore = totalFacilities > 0 ? Math.round(((totalFacilities - maintenanceNeeded) / totalFacilities) * 100) : 100;

  const maleCount = boarders.filter(s => s['Sex']?.toString().trim() === "ကျား").length;
  const femaleCount = boarders.filter(s => s['Sex']?.toString().trim() === "မ").length;
  const malePercentage = boarders.length > 0 ? Math.round((maleCount / boarders.length) * 100) : 50;

  // Maintenance stats
  const pendingMaintenance = maintenance.filter(m => m.status === 'pending').length;
  const completedMaintenance = maintenance.filter(m => m.status === 'completed').length;
  const totalEstimatedCost = maintenance.reduce((sum, m) => sum + (Number(m.estimated_cost) || 0), 0);
  const totalActualCost = maintenance.reduce((sum, m) => sum + (Number(m.actual_cost) || 0), 0);

  if (loading) return <LoadingScreen />;
  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={fetchData}
          className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            <div className="flex items-center gap-8">
              <button
                onClick={() => router.push('/staff')}
                className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
              >
                <span className="text-2xl">←</span>
              </button>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Hostel Command Center</h1>
                <div className="flex items-center gap-3 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    syncStatus === 'ONLINE' ? 'bg-green-500' : 
                    syncStatus === 'ERROR' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                  }`} />
                  <span className="text-sm text-gray-600">Status: {syncStatus}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <span>🔄</span>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Action Bar - Top Navigation (Facilities button removed) */}
          <div className="flex gap-2 mt-4 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => router.push('/staff/hostel/inventory')}
              className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              📦 Inventory
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-6 py-3 rounded-xl font-medium transition-colors whitespace-nowrap ${
                activeTab === 'maintenance'
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🛠️ Maintenance ({pendingMaintenance})
            </button>
            <button
              onClick={() => router.push('/staff/hostel/dir')}
              className="px-6 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              🏢 Resident Registry
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {activeTab === 'overview' && (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <StatCard 
                title="Total Boarders"
                value={boarders.length}
                subtitle="Active residents"
                icon="🏢"
                color="blue"
                trend={`${boarders.length} total`}
              />
              
              <StatCard 
                title="Facilities"
                value={totalFacilities}
                subtitle="Total assets"
                icon="🏗️"
                color="amber"
                trend={`${maintenanceNeeded} need repair`}
              />
              
              <StatCard 
                title="Health Score"
                value={`${healthScore}%`}
                subtitle="Facility condition"
                icon="🏥"
                color="green"
                trend={healthScore > 80 ? 'Good' : 'Needs attention'}
              />
              
              <StatCard 
                title="Gender Ratio"
                value={`${malePercentage}% / ${100 - malePercentage}%`}
                subtitle="M / F"
                icon="👥"
                color="purple"
                trend={`${maleCount} M • ${femaleCount} F`}
              />
            </div>

            {/* Maintenance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Overview</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pending</span>
                    <span className="text-2xl font-bold text-yellow-600">{pendingMaintenance}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Completed</span>
                    <span className="text-2xl font-bold text-green-600">{completedMaintenance}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-gray-600">Total Cost</span>
                    <span className="text-2xl font-bold text-gray-900">{totalActualCost.toLocaleString()} K</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Requests</h3>
                <div className="space-y-3">
                  {maintenance.slice(0, 3).map((req, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {req.type === 'water' ? '💧' : req.type === 'electric' ? '⚡' : req.type === 'structure' ? '🏗️' : '🛠️'}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{req.location}</p>
                          <p className="text-sm text-gray-500">{req.requested_date}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Grade Distribution */}
            <div className="bg-white rounded-3xl p-8 shadow-xl mb-12">
              <h2 className="text-xl font-bold text-gray-900 mb-8">Grade Distribution</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {gradeMatrix.map(([grade, count]) => {
                  const percentage = Math.round((count / boarders.length) * 100);
                  return (
                    <div key={grade} className="bg-gray-50 rounded-2xl p-4">
                      <p className="text-2xl font-bold text-gray-900 mb-2">{grade}</p>
                      <p className="text-lg font-semibold text-amber-500">{count}</p>
                      <p className="text-xs text-gray-500">{percentage}% of total</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gender Distribution */}
            <div className="bg-white rounded-3xl p-8 shadow-xl mb-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Gender Distribution</h2>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-sm text-gray-600">Male ({maleCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-rose-500 rounded-full" />
                    <span className="text-sm text-gray-600">Female ({femaleCount})</span>
                  </div>
                </div>
              </div>
              
              <div className="h-8 bg-gray-100 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                  style={{ width: `${malePercentage}%` }}
                />
                <div 
                  className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-1000"
                  style={{ width: `${100 - malePercentage}%` }}
                />
              </div>
            </div>

            {/* Quick Action Cards (Facilities card removed, grid adjusted) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <button
                onClick={() => router.push('/staff/hostel/inventory')}
                className="group bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-8 text-white text-left hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                  📦
                </div>
                <h3 className="text-2xl font-bold mb-3">Inventory</h3>
                <p className="text-white/80 text-sm mb-6">Manage hostel assets and track items</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Launch</span>
                  <span className="group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </button>

              <button
                onClick={() => setShowMaintenanceModal(true)}
                className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-8 text-white text-left hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                  🛠️
                </div>
                <h3 className="text-2xl font-bold mb-3">Maintenance</h3>
                <p className="text-white/80 text-sm mb-6">Request repairs and track progress</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>New Request</span>
                  <span className="group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </button>

              <button
                onClick={() => router.push('/staff/hostel/dir')}
                className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-8 text-white text-left hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                  🏢
                </div>
                <h3 className="text-2xl font-bold mb-3">Resident Registry</h3>
                <p className="text-white/80 text-sm mb-6">Manage boarder profiles</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Launch</span>
                  <span className="group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </button>
            </div>
          </>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Maintenance Requests</h2>
              <button
                onClick={() => setShowMaintenanceModal(true)}
                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
              >
                + New Request
              </button>
            </div>

            <MaintenanceList 
              requests={maintenance.sort((a, b) => new Date(b.requested_date) - new Date(a.requested_date))}
              onComplete={(req) => {
                setSelectedRequest(req);
                setShowLogModal(true);
              }}
              user={user}
            />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Shining Stars Academy • Hostel Management System</p>
          <p className="mt-2 text-xs">Secure Terminal Protocol • All operations are logged</p>
        </footer>
      </main>

      {/* Modals */}
      <MaintenanceModal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onSubmit={handleMaintenanceSubmit}
        user={user}
      />

      <MaintenanceLogModal
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onSubmit={handleMaintenanceComplete}
        user={user}
      />
    </div>
  );
}