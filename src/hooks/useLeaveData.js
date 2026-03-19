// src/hooks/useLeaveData.js
import { useState, useEffect, useMemo } from 'react';
import { WEB_APP_URL } from '@/lib/api';
import { 
  getTodayMM, 
  formatMMDate, 
  parseMMDate, 
  isDateInRange,
  compareMMDates 
} from '@/components/leave/DateHelpers';

export default function useLeaveData() {
  const [allLeaves, setAllLeaves] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [statsList, setStatsList] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getData', sheetName: 'Leave_Records' })
      });
      const data = await res.json();
      if (data.success) {
        // Format all dates using our central date utilities
        const formattedLeaves = data.data.map(l => {
          const startDate = formatMMDate(l.Start_Date);
          const endDate = formatMMDate(l.End_Date || l.Start_Date);
          const dateApplied = formatMMDate(l.Date_Applied);
          
          return {
            ...l,
            Start_Date: startDate,
            End_Date: endDate,
            Date_Applied: dateApplied,
            // Add a field for easy date comparison
            _startObj: startDate !== '-' ? parseMMDate(startDate) : null,
            _endObj: endDate !== '-' ? parseMMDate(endDate) : null,
          };
        });
        
        setAllLeaves(formattedLeaves);
        
        // Filter pending leaves
        const pendingLeaves = formattedLeaves
          .filter(l => l.Status === 'Pending')
          .map((l, index) => ({ ...l, _rowIndex: index + 2 }));
        
        setPending(pendingLeaves);
      }
    } catch (e) {
      console.error('Failed to fetch leaves:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getData', sheetName: 'Student_Directory' })
      });
      const data = await res.json();
      if (data.success) setAllStudents(data.data);
    } catch (e) {
      console.error('Failed to fetch students:', e);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getData', sheetName: 'Staff_Login' })
      });
      const data = await res.json();
      if (data.success) setAllStaff(data.data);
    } catch (e) {
      console.error('Failed to fetch staff:', e);
    }
  };

  useEffect(() => {
    Promise.all([fetchLeaves(), fetchStudents(), fetchStaff()]);
  }, []);

  // Today in Myanmar time (YYYY-MM-DD)
  const today = getTodayMM();

  // Get today's absent users
  const getTodayAbsentUsers = useMemo(() => {
    const todayLeaves = allLeaves.filter(l => 
      l.Status === 'Approved' && 
      isDateInRange(today, l.Start_Date, l.End_Date)
    );

    return todayLeaves.map(l => {
      const student = allStudents.find(s => s.Student_ID === l.User_ID || s.Name === l.Name);
      const staff = allStaff.find(s => s.Staff_ID === l.User_ID || s.Name === l.Name);
      const userInfo = student || staff || {};
      
      return {
        id: l.User_ID,
        name: l.Name,
        type: l.User_Type || (student ? 'STUDENT' : 'STAFF'),
        grade: student?.Grade || '',
        totalDays: Number(l.Total_Days) || 1,
        todayReason: {
          text: l.Reason,
          type: l.Leave_Type,
          attachment: l.Attachment_Link,
          remark: l.Remark || ''  // Include remark
        },
        // For detailed view
        reasons: [{
          start: l.Start_Date,
          end: l.End_Date,
          text: l.Reason,
          type: l.Leave_Type,
          status: l.Status,
          remark: l.Remark || ''  // Include remark
        }]
      };
    });
  }, [allLeaves, allStudents, allStaff, today]);

  const getTodayAbsentCount = useMemo(() => 
    getTodayAbsentUsers.length, [getTodayAbsentUsers]
  );

  // Generate comprehensive stats for each user
  const statsListData = useMemo(() => {
    const userMap = new Map();

    // Process all approved leaves
    allLeaves.filter(l => l.Status === 'Approved').forEach(l => {
      const key = `${l.User_Type}_${l.User_ID || l.Name}`;
      
      if (!userMap.has(key)) {
        const student = allStudents.find(s => s.Student_ID === l.User_ID || s.Name === l.Name);
        const staff = allStaff.find(s => s.Staff_ID === l.User_ID || s.Name === l.Name);
        
        userMap.set(key, {
          id: l.User_ID,
          name: l.Name,
          type: l.User_Type || (student ? 'STUDENT' : 'STAFF'),
          grade: student?.Grade || '',
          section: student?.Section || '',
          enrollmentNo: student?.['Enrollment No.'] || '',
          position: staff?.Position || '',
          department: staff?.Department || '',
          phone: l.Phone || student?.Phone || staff?.Phone || '',
          email: l.Email || student?.Email || staff?.Email || '',
          totalDays: 0,
          consecutiveMax: 0,
          weekCount: 0,
          monthCount: 0,
          quarterCount: 0,
          leaveTypes: {},
          reasons: [],
          leaveDates: []
        });
      }

      const user = userMap.get(key);
      const days = Number(l.Total_Days) || 1;
      user.totalDays += days;

      // Track leave types
      user.leaveTypes[l.Leave_Type] = (user.leaveTypes[l.Leave_Type] || 0) + days;

      // Store reason with remark
      user.reasons.push({
        start: l.Start_Date,
        end: l.End_Date,
        text: l.Reason,
        type: l.Leave_Type,
        status: l.Status,
        remark: l.Remark || '',
        attachment: l.Attachment_Link
      });

      // Track individual dates for consecutive calculation
      if (l._startObj && l._endObj) {
        const currentDate = new Date(l._startObj);
        while (currentDate <= l._endObj) {
          const dateStr = currentDate.toISOString().split('T')[0];
          user.leaveDates.push(dateStr);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // Fallback if objects not available
        const startParts = l.Start_Date.split('-').map(Number);
        const endParts = l.End_Date.split('-').map(Number);
        if (startParts.length === 3 && endParts.length === 3) {
          const start = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
          const end = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            user.leaveDates.push(dateStr);
          }
        }
      }
    });

    // Calculate additional stats for each user
    userMap.forEach(user => {
      // Calculate max consecutive days
      if (user.leaveDates.length > 0) {
        const sortedDates = [...new Set(user.leaveDates)].sort();
        let maxConsecutive = 1;
        let currentConsecutive = 1;
        
        for (let i = 1; i < sortedDates.length; i++) {
          const prev = new Date(sortedDates[i-1]);
          const curr = new Date(sortedDates[i]);
          const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          } else {
            currentConsecutive = 1;
          }
        }
        user.consecutiveMax = maxConsecutive;
      }

      // Count leaves in recent periods using date comparison
      const todayObj = parseMMDate(today);
      const oneWeekAgo = new Date(todayObj); 
      oneWeekAgo.setDate(todayObj.getDate() - 7);
      const oneMonthAgo = new Date(todayObj); 
      oneMonthAgo.setMonth(todayObj.getMonth() - 1);
      const threeMonthsAgo = new Date(todayObj); 
      threeMonthsAgo.setMonth(todayObj.getMonth() - 3);

      // Convert to YYYY-MM-DD for comparison
      const weekAgoStr = oneWeekAgo.toISOString().split('T')[0];
      const monthAgoStr = oneMonthAgo.toISOString().split('T')[0];
      const quarterAgoStr = threeMonthsAgo.toISOString().split('T')[0];

      user.weekCount = user.reasons.filter(r => 
        compareMMDates(r.start, weekAgoStr) >= 0
      ).length;

      user.monthCount = user.reasons.filter(r => 
        compareMMDates(r.start, monthAgoStr) >= 0
      ).length;

      user.quarterCount = user.reasons.filter(r => 
        compareMMDates(r.start, quarterAgoStr) >= 0
      ).length;

      // Sort reasons by date (newest first)
      user.reasons.sort((a, b) => compareMMDates(b.start, a.start));
    });

    return Array.from(userMap.values());
  }, [allLeaves, allStudents, allStaff, today]);

  // High risk users (3+ consecutive days)
  const highRiskUsers = useMemo(() => 
    statsListData.filter(u => u.consecutiveMax >= 3)
      .sort((a, b) => b.consecutiveMax - a.consecutiveMax)
  , [statsListData]);

  // Top 20 absentees
  const topAbsentees = useMemo(() => 
    statsListData.filter(u => u.totalDays > 0)
      .sort((a, b) => b.totalDays - a.totalDays)
      .slice(0, 20)
  , [statsListData]);

  return {
    allLeaves,
    allStudents,
    allStaff,
    statsList: statsListData,
    pending,
    loading,
    fetchLeaves,
    getTodayAbsentUsers,
    getTodayAbsentCount,
    highRiskUsers,
    topAbsentees
  };
}