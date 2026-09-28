import { Employee, Meeting, AttendanceRecord, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  currencySymbol: '🪙 WP',
  minimumAttendancePercentage: 80,
  excludeExcusedFromDenominator: true,
  timezone: 'Asia/Karachi',
  finePerMinusPoint: 10,
  salaryCurrency: 'PKR',
  weeklyCalculationDay: 6, // Saturday

  standup: {
    enabled: true,
    startTime: '10:00:00',
    onTimeScore: 5,
    gracePeriodMinutes: 2,
    latePenalty: 0.5,
    minimumDailyScore: -5,
    absentScore: -5, // Mandatory fine for unexcused standup absence
    activeDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
  },

  eod: {
    enabled: true,
    startTime: '18:40:00',
    onTimeScore: 5,
    gracePeriodMinutes: 2,
    latePenalty: 0.5,
    minimumDailyScore: -5,
    absentScore: -5, // Mandatory fine for unexcused EOD absence
    activeDays: [1, 2, 3, 4, 5], // Mon-Fri
  },

  enableDailyTop3Bonus: true,
  dailyTop3BonusPoints: [3, 2, 1],
  slackWebhookUrl: '',
  slackChannel: '#daily-standup',
  slackAutoShareOnEnd: false,
  slackWarningMessageTemplate: '⚠️ *Policy Notice:* Minus 🪙 WP coin balances result in payroll salary deductions (PKR 10 per minus point). Please ensure on-time attendance for all scheduled Standup & EOD calls.',
  adminPin: 'webpenter2026',
};

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'emp-ayub', name: 'Ayub Khokhar', email: 'ayub@webpenter.com', department: 'Business Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-ali', name: 'Ali Hassan', email: 'ali@webpenter.com', department: 'Business Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-zahid', name: 'Zahid Khurshid', email: 'zahid@webpenter.com', department: 'Senior Software Engineer | Founder', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-ahmad', name: 'Ahmad Raza', email: 'ahmad@webpenter.com', department: 'Senior Software Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-mehtab', name: 'Mehtab Sain', email: 'mehtab@webpenter.com', department: 'PHP Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-fayyaz-a', name: 'Fayyaz Ahmad', email: 'fayyaz.ahmad@webpenter.com', department: 'Junior PHP Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-waqar', name: 'Waqar Hussain', email: 'waqar@webpenter.com', department: 'Full Stack Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-sadiq', name: 'Muhammad Sadiq', email: 'sadiq@webpenter.com', department: 'Full Stack Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-fayyaz-wp', name: 'Fayyaz WebPenter', email: 'fayyaz.wp@webpenter.com', department: 'Management', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-wp-inc', name: 'Web Penter Inc.', email: 'team@webpenter.com', department: 'Management', active: true, createdAt: '2026-09-28T00:00:00Z' },
];

/**
 * Initializes clean real dataset starting strictly from September 28, 2026.
 * Zero fake/dummy historical weeks.
 */
export function generateSeedData(): {
  employees: Employee[];
  meetings: Meeting[];
  records: AttendanceRecord[];
  settings: Settings;
} {
  const employees = [...INITIAL_EMPLOYEES];
  const meetings: Meeting[] = [];
  const records: AttendanceRecord[] = [];

  // ==========================================
  // REAL DATA START: MONDAY, SEP 28, 2026
  // Google Meet Code: jns-arbs-nyv
  // ==========================================
  const todayMeetingId = 'meet-su-2026-09-28';
  const todayScheduled = '2026-09-28T10:00:00+05:00';

  meetings.push({
    id: todayMeetingId,
    code: 'meet.google.com/jns-arbs-nyv',
    title: 'Daily Standup — Monday, Sep 28',
    type: 'standup',
    date: '2026-09-28',
    scheduledStart: todayScheduled,
    scheduledEnd: '2026-09-28T10:30:00+05:00',
    status: 'completed',
    timezone: 'Asia/Karachi',
    createdAt: todayScheduled,
  });

  // 1. Ayub Khokhar — joined 10:02:51 AM (51s past grace -> 1m late -> +4.5 🪙 WP)
  records.push({
    id: `rec-today-${todayMeetingId}-emp-ayub`,
    meetingId: todayMeetingId,
    employeeId: 'emp-ayub',
    meetingType: 'standup',
    status: 'late',
    joinedAt: '2026-09-28T10:02:51+05:00',
    minutesLate: 1,
    dailyScore: 4.5,
    isOnTime: false,
    notes: 'Joined at 10:02:51 AM (1 min late)',
    createdAt: todayScheduled,
    updatedAt: todayScheduled,
  });

  // 2. Fayyaz WebPenter — joined 10:03:21 AM (81s past grace -> 2m late -> +4.0 🪙 WP)
  records.push({
    id: `rec-today-${todayMeetingId}-emp-fayyaz-wp`,
    meetingId: todayMeetingId,
    employeeId: 'emp-fayyaz-wp',
    meetingType: 'standup',
    status: 'late',
    joinedAt: '2026-09-28T10:03:21+05:00',
    minutesLate: 2,
    dailyScore: 4.0,
    isOnTime: false,
    notes: 'Joined at 10:03:21 AM (2 min late)',
    createdAt: todayScheduled,
    updatedAt: todayScheduled,
  });

  // 3. Web Penter Inc. — joined 10:03:21 AM (81s past grace -> 2m late -> +4.0 🪙 WP)
  records.push({
    id: `rec-today-${todayMeetingId}-emp-wp-inc`,
    meetingId: todayMeetingId,
    employeeId: 'emp-wp-inc',
    meetingType: 'standup',
    status: 'late',
    joinedAt: '2026-09-28T10:03:21+05:00',
    minutesLate: 2,
    dailyScore: 4.0,
    isOnTime: false,
    notes: 'Joined at 10:03:21 AM (2 min late)',
    createdAt: todayScheduled,
    updatedAt: todayScheduled,
  });

  // 4. Waqar Hussain — joined 10:04:21 AM (141s past grace -> 3m late -> +3.5 🪙 WP)
  records.push({
    id: `rec-today-${todayMeetingId}-emp-waqar`,
    meetingId: todayMeetingId,
    employeeId: 'emp-waqar',
    meetingType: 'standup',
    status: 'late',
    joinedAt: '2026-09-28T10:04:21+05:00',
    minutesLate: 3,
    dailyScore: 3.5,
    isOnTime: false,
    notes: 'Joined at 10:04:21 AM (3 min late)',
    createdAt: todayScheduled,
    updatedAt: todayScheduled,
  });

  // 5. Ali Hassan — joined 10:19:23 AM (18m late -> -4.0 🪙 WP)
  records.push({
    id: `rec-today-${todayMeetingId}-emp-ali`,
    meetingId: todayMeetingId,
    employeeId: 'emp-ali',
    meetingType: 'standup',
    status: 'late',
    joinedAt: '2026-09-28T10:19:23+05:00',
    minutesLate: 18,
    dailyScore: -4.0,
    isOnTime: false,
    notes: 'Joined at 10:19:23 AM (18 min late)',
    createdAt: todayScheduled,
    updatedAt: todayScheduled,
  });

  // 6. Zahid Khurshid — joined 10:19:23 AM (18m late -> -4.0 🪙 WP)
  records.push({
    id: `rec-today-${todayMeetingId}-emp-zahid`,
    meetingId: todayMeetingId,
    employeeId: 'emp-zahid',
    meetingType: 'standup',
    status: 'late',
    joinedAt: '2026-09-28T10:19:23+05:00',
    minutesLate: 18,
    dailyScore: -4.0,
    isOnTime: false,
    notes: 'Joined at 10:19:23 AM (18 min late)',
    createdAt: todayScheduled,
    updatedAt: todayScheduled,
  });

  // 7. Ahmad Raza — joined at 10:20:00 AM (19m late -> -4.5 🪙 WP)
  records.push({
    id: `rec-today-${todayMeetingId}-emp-ahmad`,
    meetingId: todayMeetingId,
    employeeId: 'emp-ahmad',
    meetingType: 'standup',
    status: 'late',
    joinedAt: '2026-09-28T10:20:00+05:00',
    minutesLate: 19,
    dailyScore: -4.5,
    isOnTime: false,
    notes: 'Joined at 10:20:00 AM (19 min late)',
    createdAt: todayScheduled,
    updatedAt: todayScheduled,
  });

  // 8. Mehtab Sain — added right after Ahmad Raza per instructions (joined 10:20:15 AM -> -4.5 🪙 WP)
  records.push({
    id: `rec-today-${todayMeetingId}-emp-mehtab`,
    meetingId: todayMeetingId,
    employeeId: 'emp-mehtab',
    meetingType: 'standup',
    status: 'late',
    joinedAt: '2026-09-28T10:20:15+05:00',
    minutesLate: 19,
    dailyScore: -4.5,
    isOnTime: false,
    notes: 'Joined at 10:20:15 AM right after Ahmad Raza',
    createdAt: todayScheduled,
    updatedAt: todayScheduled,
  });

  // 9. Muhammad Sadiq — Unexcused Absent (-5.0 🪙 WP penalty fine)
  records.push({
    id: `rec-today-${todayMeetingId}-emp-sadiq`,
    meetingId: todayMeetingId,
    employeeId: 'emp-sadiq',
    meetingType: 'standup',
    status: 'absent',
    joinedAt: undefined,
    minutesLate: 0,
    dailyScore: -5.0,
    isOnTime: false,
    notes: 'Unexcused absence (-5.0 🪙 WP penalty)',
    createdAt: todayScheduled,
    updatedAt: todayScheduled,
  });

  // 10. Fayyaz Ahmad — Unexcused Absent (-5.0 🪙 WP penalty fine)
  records.push({
    id: `rec-today-${todayMeetingId}-emp-fayyaz-a`,
    meetingId: todayMeetingId,
    employeeId: 'emp-fayyaz-a',
    meetingType: 'standup',
    status: 'absent',
    joinedAt: undefined,
    minutesLate: 0,
    dailyScore: -5.0,
    isOnTime: false,
    notes: 'Unexcused absence (-5.0 🪙 WP penalty)',
    createdAt: todayScheduled,
    updatedAt: todayScheduled,
  });

  return {
    employees,
    meetings,
    records,
    settings: DEFAULT_SETTINGS,
  };
}
