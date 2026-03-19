// src/lib/permissions.js
// Shared permission helper for Shining Stars

export const PERMISSION_MAP = {
  '/staff/hostel':        'Can_Manage_Hostel',
  '/staff/hostel/dir':    'Can_Manage_Hostel',
  '/staff/hostel/facilities': 'Can_Manage_Hostel',
  '/staff/fees':          'Can_Manage_Fees',
  '/staff/inventory':     'Can_Manage_Inventory',
  '/staff/exam-records':  'Can_Record_Note',
  '/staff/leave':         'Can_Record_Attendance_&_Leave',
  '/staff/calendar':      'Can_Manage_Events',
  '/staff/staff-dir':     'Can_View_Staff',
  '/management/communication': 'Can_Post_Announcement',
};

// FREE pages — no permission needed
// /staff/student-dir, /staff/points, /staff/contacts,
// /staff/my-leave, /staff/notes, /staff/lost-found, /staff/timetable

export const hasPerm = (user, permKey) => {
  if (!user || !permKey) return false;
  if (user.userRole === 'management') return true; // management = all access
  const val = user[permKey];
  return val === true || String(val).trim().toUpperCase() === 'TRUE';
};

export const hasPageAccess = (user, path) => {
  const perm = PERMISSION_MAP[path];
  if (!perm) return true; // no permission required for this page
  return hasPerm(user, perm);
};