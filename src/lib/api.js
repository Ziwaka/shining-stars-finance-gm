/**
 * Shining Stars - Master API Config (v8.0 Fixed)
 * ROLE: Permanent Data Bridge
 */
export const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwebk9Jh15hK4ioWmbHySroAU5mc8gRFeyHwvIHQTIX7_os13S6qQR4cXz5DtDPHVM5/exec";

export const GIDS = {
  MANAGEMENT_LOGIN: 1500101923,
  STAFF_LOGIN: 0,
  STUDENT_LOGIN: 1858106882,
  STAFF_DIR: 668404503,
  STUDENT_DIR: 1807615173
};

export const TABS = {
  FEES:          "Fees_Management",
  ANNOUNCEMENTS: "Announcements",
  SCORES:        "Exam_Records",      // ✅ Fixed: was "Score_Records"
  EVENTS:        "Events_Calendar",
  NOTES:         "Student_Notes_Log"
  // ATTENDANCE removed — Attendance_Log sheet မရှိပါ (Leave_Records မှ derive)
};