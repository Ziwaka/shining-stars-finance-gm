"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WEB_APP_URL, GIDS } from '@/lib/api';

export default function HostelResidentRegistryV2() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentExamRecords, setStudentExamRecords] = useState([]);
  const [studentLeaveRecords, setStudentLeaveRecords] = useState([]);
  const [studentNotes, setStudentNotes] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // info, exams, leave, notes
  const router = useRouter();

  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || "null");
    if (!auth) {
      router.push('/login');
      return;
    }
    
    const canManageHostel = auth['Can_Manage_Hostel'] === true || 
                           String(auth['Can_Manage_Hostel'] || '').toUpperCase() === 'TRUE' ||
                           auth.userRole === 'management';
    
    if (!canManageHostel) { 
      router.push('/staff'); 
      return; 
    }

    const fetchRegistry = async () => {
      try {
        setLoading(true);
        
        const res = await fetch(WEB_APP_URL, { 
          method: 'POST', 
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ 
            action: 'getData', 
            targetGid: GIDS.STUDENT_DIR
          }) 
        });
        
        const text = await res.text();
        const result = JSON.parse(text);
        
        if (result.success && Array.isArray(result.data)) {
          const hostelOnly = result.data.filter(s => 
            s && String(s['School/Hostel'] || '').toLowerCase().trim() === "hostel"
          );
          setResidents(hostelOnly);
        } else {
          setResidents([]);
        }
      } catch (err) {
        console.error("Registry Sync Failure:", err);
        setResidents([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegistry();
  }, [router]);

  const fetchStudentDetails = async (student) => {
    setLoadingDetails(true);
    setSelectedStudent(student);
    setStudentDetails(student);
    
    const studentId = student['Enrollment No.'] || student['Student_ID'] || '';
    
    try {
      // Fetch Exam Records
      const examRes = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'getExamResults',
          Student_ID: studentId
        })
      });
      const examText = await examRes.text();
      const examResult = JSON.parse(examText);
      if (examResult.success) {
        setStudentExamRecords(examResult.data || []);
      }

      // Fetch Leave Records
      const leaveRes = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'getAttendance',
          studentId: studentId
        })
      });
      const leaveText = await leaveRes.text();
      const leaveResult = JSON.parse(leaveText);
      if (leaveResult.success) {
        const studentLeaves = (leaveResult.absentStudents || []).filter(l => 
          l.id === studentId || l.name === student['Name (ALL CAPITAL)']
        );
        setStudentLeaveRecords(studentLeaves);
      }

      // Fetch Analytics for Notes
      const notesRes = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'getAnalytics'
        })
      });
      const notesText = await notesRes.text();
      const notesResult = JSON.parse(notesText);
      if (notesResult.success) {
        const studentNotes = (notesResult.recentNotes || []).filter(n => 
          n.Student_ID === studentId || n.Name === student['Name (ALL CAPITAL)']
        );
        setStudentNotes(studentNotes);
      }

    } catch (err) {
      console.error("Error fetching student details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getImageUrl = (photoUrl) => {
    if (!photoUrl) return null;
    
    if (photoUrl.includes('cloudinary')) {
      return photoUrl.replace('/upload/', '/upload/w_200,h_200,c_fill/');
    }
    
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    }
    
    return null;
  };

  // Phone call function
  const makePhoneCall = (phoneNumber) => {
    if (!phoneNumber) return;
    
    // Remove any non-numeric characters except + for international
    const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    // For mobile devices, use tel: protocol
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      window.location.href = `tel:${cleanedNumber}`;
    } else {
      // For desktop, show confirmation
      if (window.confirm(`Call ${cleanedNumber}?`)) {
        window.open(`https://wa.me/${cleanedNumber.replace('+', '')}`, '_blank');
      }
    }
  };

  const maleResidents = residents.filter(s => String(s['Sex'] || '').trim() === "ကျား");
  const femaleResidents = residents.filter(s => String(s['Sex'] || '').trim() === "မ");

  const grades = [...new Set(residents.map(s => s?.Grade).filter(Boolean))].sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return String(a).localeCompare(String(b));
  });

  const filtered = residents.filter(s => {
    const matchesGender = selectedGender === 'all' || 
      (selectedGender === 'male' && String(s['Sex'] || '').trim() === "ကျား") ||
      (selectedGender === 'female' && String(s['Sex'] || '').trim() === "မ");
    
    const matchesGrade = selectedGrade === 'all' || s?.Grade === selectedGrade;
    
    const matchesSearch = !search || 
      String(s['Name (ALL CAPITAL)'] || '').toLowerCase().includes(search.toLowerCase()) ||
      String(s['Enrollment No.'] || '').includes(search);
    
    return matchesGender && matchesGrade && matchesSearch;
  });

  const groupedByGrade = filtered.reduce((acc, student) => {
    const grade = student.Grade || 'Ungraded';
    if (!acc[grade]) {
      acc[grade] = [];
    }
    acc[grade].push(student);
    return acc;
  }, {});

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-white/60 mt-6 text-sm font-medium tracking-widest uppercase">Loading Registry</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/staff/hostel')}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">Hostel Directory</h1>
                <p className="text-xs text-white/40">{filtered.length} residents</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="all">All Grades</option>
                {grades.map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>

              <div className="flex bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setSelectedGender('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    selectedGender === 'all' 
                      ? 'bg-indigo-500 text-white' 
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedGender('male')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    selectedGender === 'male' 
                      ? 'bg-blue-500 text-white' 
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  ကျား ({maleResidents.length})
                </button>
                <button
                  onClick={() => setSelectedGender('female')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    selectedGender === 'female' 
                      ? 'bg-pink-500 text-white' 
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  မ ({femaleResidents.length})
                </button>
              </div>
            </div>
          </div>

          <div className="relative mt-4">
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pl-11 text-white/90 placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
              onChange={(e) => setSearch(e.target.value)}
              value={search}
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {Object.entries(groupedByGrade)
            .sort(([gradeA], [gradeB]) => {
              if (gradeA === 'Ungraded') return 1;
              if (gradeB === 'Ungraded') return -1;
              const numA = parseInt(gradeA);
              const numB = parseInt(gradeB);
              if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
              }
              return String(gradeA).localeCompare(String(gradeB));
            })
            .map(([grade, students]) => {
              const maleInGrade = students.filter(s => String(s['Sex'] || '').trim() === "ကျား");
              const femaleInGrade = students.filter(s => String(s['Sex'] || '').trim() === "မ");
              
              return (
                <div key={grade} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                    <h2 className="text-lg font-semibold text-white">
                      {grade === 'Ungraded' ? 'Ungraded' : `Grade ${grade}`}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 text-white/40 text-xs">
                      {students.length} students
                    </span>
                  </div>

                  {maleInGrade.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 pl-4">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <h3 className="text-sm font-medium text-blue-400">Male (ကျား) · {maleInGrade.length}</h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {maleInGrade.map((s, idx) => (
                          <ResidentCard 
                            key={`male-${idx}`} 
                            student={s} 
                            isMale={true} 
                            onClick={() => fetchStudentDetails(s)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {femaleInGrade.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 pl-4">
                        <div className="w-1 h-4 bg-pink-500 rounded-full"></div>
                        <h3 className="text-sm font-medium text-pink-400">Female (မ) · {femaleInGrade.length}</h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {femaleInGrade.map((s, idx) => (
                          <ResidentCard 
                            key={`female-${idx}`} 
                            student={s} 
                            isMale={false} 
                            onClick={() => fetchStudentDetails(s)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3 opacity-20">🔍</div>
              <h3 className="text-base text-white/40 font-medium">No matching residents</h3>
              <p className="text-white/20 text-xs mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal 
          student={studentDetails}
          examRecords={studentExamRecords}
          leaveRecords={studentLeaveRecords}
          notes={studentNotes}
          loading={loadingDetails}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onClose={() => {
            setSelectedStudent(null);
            setStudentDetails(null);
            setStudentExamRecords([]);
            setStudentLeaveRecords([]);
            setStudentNotes([]);
            setActiveTab('info');
          }}
          onPhoneCall={makePhoneCall}
        />
      )}
    </div>
  );
}

// Resident Card Component
function ResidentCard({ student, isMale, onClick }) {
  const [imageError, setImageError] = useState(false);
  
  const getImageUrl = (photoUrl) => {
    if (!photoUrl || imageError) return null;
    
    if (photoUrl.includes('cloudinary')) {
      return photoUrl.replace('/upload/', '/upload/w_200,h_200,c_fill/');
    }
    
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    }
    
    return null;
  };

  const photoUrl = getImageUrl(student.Photo_URL);

  return (
    <div 
      className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all hover:scale-105 hover:border-indigo-500/50 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative mb-2">
        <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center overflow-hidden border-2 transition-all ${
          isMale 
            ? 'bg-blue-500/10 border-blue-500/30 group-hover:border-blue-500' 
            : 'bg-pink-500/10 border-pink-500/30 group-hover:border-pink-500'
        }`}>
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={student['Name (ALL CAPITAL)'] || ''}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <span className="text-2xl">{isMale ? '👨' : '👩'}</span>
          )}
        </div>
        
        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs border-2 border-slate-900 ${
          isMale ? 'bg-blue-500' : 'bg-pink-500'
        }`}>
          {isMale ? '♂' : '♀'}
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-white font-medium text-xs mb-0.5 line-clamp-1">
          {student['Name (ALL CAPITAL)'] || 'Unknown'}
        </h3>
        <p className="text-white/30 text-[10px] mb-1">
          {student['Enrollment No.'] || 'N/A'}
        </p>
        {/* Show Class if available */}
        {student['Class'] && (
          <p className="text-white/20 text-[8px]">
            Class {student['Class']}
          </p>
        )}
      </div>
    </div>
  );
}

// Student Detail Modal Component
function StudentDetailModal({ 
  student, 
  examRecords, 
  leaveRecords, 
  notes, 
  loading,
  activeTab,
  setActiveTab,
  onClose,
  onPhoneCall
}) {
  const [imageError, setImageError] = useState(false);
  
  const getImageUrl = (photoUrl) => {
    if (!photoUrl || imageError) return null;
    
    if (photoUrl.includes('cloudinary')) {
      return photoUrl.replace('/upload/', '/upload/w_400,h_400,c_fill/');
    }
    
    if (photoUrl.startsWith('http')) {
      return photoUrl;
    }
    
    return null;
  };

  const photoUrl = getImageUrl(student?.Photo_URL);
  const isMale = String(student?.['Sex'] || '').trim() === "ကျား";

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return date;
    }
  };

  // Get all available phone numbers
  const phoneNumbers = [
    { label: "Student's Phone", number: student?.['Phone'] },
    { label: "Father's Phone", number: student?.["Father's Phone"] },
    { label: "Mother's Phone", number: student?.["Mother's Phone"] },
    { label: "Guardian's Phone", number: student?.["Guardian's Phone"] },
    { label: "Parents' Phone", number: student?.["Parents' Phone"] }
  ].filter(p => p.number && p.number.trim() !== '');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-4 z-10 float-right mr-4 w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10"
        >
          ✕
        </button>

        {/* Content */}
        <div className="p-8 pt-16">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Header with Photo and Quick Actions */}
              <div className="flex items-start gap-6 mb-8">
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden border-4 ${
                  isMale ? 'border-blue-500/30' : 'border-pink-500/30'
                }`}>
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt={student?.['Name (ALL CAPITAL)'] || ''}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <span className="text-4xl">{isMale ? '👨' : '👩'}</span>
                  )}
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {student?.['Name (ALL CAPITAL)'] || 'Unknown'}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isMale ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                    }`}>
                      {student?.['Sex'] || 'N/A'}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-medium">
                      Grade {student?.['Grade'] || 'N/A'}
                    </span>
                    {student?.['Class'] && (
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium">
                        Class {student['Class']}
                      </span>
                    )}
                    {student?.['Section'] && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                        Sec {student['Section']}
                      </span>
                    )}
                  </div>

                  {/* Quick Call Buttons */}
                  {phoneNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {phoneNumbers.map((phone, idx) => (
                        <button
                          key={idx}
                          onClick={() => onPhoneCall(phone.number)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium transition-all border border-green-500/30"
                          title={`Call ${phone.label}`}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                          {phone.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
                {[
                  { id: 'info', label: 'Personal Info' },
                  { id: 'exams', label: `Exam Records (${examRecords.length})` },
                  { id: 'leave', label: `Leave History (${leaveRecords.length})` },
                  { id: 'notes', label: `Notes (${notes.length})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-500 text-white'
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-6">
                {activeTab === 'info' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Personal Information</h3>
                      <div className="space-y-3">
                        <DetailItem label="Student ID" value={student?.['Enrollment No.']} />
                        <DetailItem label="Date of Birth" value={formatDate(student?.['Date of Birth'])} />
                        <DetailItem label="Religion" value={student?.['Religion']} />
                        <DetailItem label="Nationality" value={student?.['Nationality']} />
                        <DetailItem label="NRC" value={student?.['NRC']} />
                        <DetailItem label="Previous School" value={student?.['Previous School']} />
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Contact Information</h3>
                      <div className="space-y-3">
                        <DetailItem label="Address" value={student?.['Address']} />
                        <DetailItem label="Town/City" value={student?.['Town/City']} />
                        <DetailItem label="Student's Phone" value={student?.['Phone']} withCall onCall={onPhoneCall} />
                        <DetailItem label="Email" value={student?.['Email']} />
                      </div>
                    </div>

                    {/* Family Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Family Information</h3>
                      <div className="space-y-3">
                        <DetailItem label="Father's Name" value={student?.["Father's Name"]} />
                        <DetailItem label="Father's Occupation" value={student?.["Father's Occupation"]} />
                        <DetailItem label="Father's Phone" value={student?.["Father's Phone"]} withCall onCall={onPhoneCall} />
                        <DetailItem label="Mother's Name" value={student?.["Mother's Name"]} />
                        <DetailItem label="Mother's Occupation" value={student?.["Mother's Occupation"]} />
                        <DetailItem label="Mother's Phone" value={student?.["Mother's Phone"]} withCall onCall={onPhoneCall} />
                        <DetailItem label="Guardian's Name" value={student?.["Guardian's Name"]} />
                        <DetailItem label="Guardian's Phone" value={student?.["Guardian's Phone"]} withCall onCall={onPhoneCall} />
                        <DetailItem label="Parents' Phone" value={student?.["Parents' Phone"]} withCall onCall={onPhoneCall} />
                      </div>
                    </div>

                    {/* Academic Information */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Academic Information</h3>
                      <div className="space-y-3">
                        <DetailItem label="Grade" value={student?.['Grade']} />
                        <DetailItem label="Class" value={student?.['Class']} />
                        <DetailItem label="Section" value={student?.['Section']} />
                        <DetailItem label="House" value={student?.['House']} />
                        <DetailItem label="School/Hostel" value={student?.['School/Hostel']} />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'exams' && (
                  <div className="space-y-4">
                    {examRecords.length > 0 ? (
                      examRecords.map((exam, idx) => (
                        <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white font-medium">{exam.Subject}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              exam.Result === 'Pass' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {exam.Result}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-white/40">Score:</span>
                              <span className="text-white ml-2">{exam.Score}</span>
                            </div>
                            <div>
                              <span className="text-white/40">Max:</span>
                              <span className="text-white ml-2">{exam.Max_Score}</span>
                            </div>
                            <div>
                              <span className="text-white/40">%:</span>
                              <span className="text-white ml-2">{exam.Percentage}%</span>
                            </div>
                            <div>
                              <span className="text-white/40">Grade:</span>
                              <span className="text-white ml-2">{exam.Letter_Grade}</span>
                            </div>
                          </div>
                          <div className="text-xs text-white/30 mt-2">
                            {exam.Term} · {exam.Academic_Year}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/40 text-center py-8">No exam records found</p>
                    )}
                  </div>
                )}

                {activeTab === 'leave' && (
                  <div className="space-y-4">
                    {leaveRecords.length > 0 ? (
                      leaveRecords.map((leave, idx) => (
                        <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white font-medium">{leave.leave_type}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              leave.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                              leave.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {leave.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-white/40">From:</span>
                              <span className="text-white ml-2">{formatDate(leave.start_date)}</span>
                            </div>
                            <div>
                              <span className="text-white/40">To:</span>
                              <span className="text-white ml-2">{formatDate(leave.end_date)}</span>
                            </div>
                          </div>
                          {leave.reason && (
                            <p className="text-white/60 text-sm mt-2">{leave.reason}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-white/40 text-center py-8">No leave records found</p>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    {notes.length > 0 ? (
                      notes.map((note, idx) => (
                        <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white/60 text-sm">{note.Date || 'No date'}</span>
                            <span className="text-white/40 text-xs">By: {note.Recorded_By || 'System'}</span>
                          </div>
                          <p className="text-white">{note.Note || note.Message || 'No content'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/40 text-center py-8">No notes found</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Detail Item Component with Call Button
function DetailItem({ label, value, withCall, onCall }) {
  if (!value || value === '') return null;
  
  return (
    <div className="flex justify-between items-start border-b border-white/5 pb-2">
      <span className="text-white/40 text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-white/90 text-sm font-medium text-right max-w-[60%]">{value}</span>
        {withCall && onCall && (
          <button
            onClick={() => onCall(value)}
            className="p-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-all"
            title={`Call ${label}`}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}