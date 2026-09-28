export type MeetingStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused' | 'cancelled';
export type MeetingType = 'standup' | 'eod';

export interface Employee {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  department?: string;
  active: boolean;
  createdAt: string; // ISO 8601
}

export interface Meeting {
  id: string;
  code: string;               // e.g. "standup-2026-09-28" or Meet code "abc-defg-hij"
  title: string;
  type: MeetingType;          // 'standup' or 'eod'
  date: string;               // YYYY-MM-DD
  scheduledStart: string;     // ISO 8601 e.g. "2026-09-28T10:00:00.000Z"
  scheduledEnd: string;       // ISO 8601
  status: MeetingStatus;
  timezone: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  employeeId: string;
  meetingType: MeetingType;   // 'standup' or 'eod'
  status: AttendanceStatus;
  joinedAt?: string;          // ISO 8601 of first join
  minutesLate: number;        // 0 if on time
  dailyScore: number;         // in $WP (e.g. +5.0 $WP, +4.5 $WP, -5.0 $WP floor)
  isOnTime: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingTypeSettings {
  enabled: boolean;
  startTime: string;          // e.g. "10:00:00" for standup, "18:00:00" for EOD
  onTimeScore: number;        // in $WP (default: 5)
  gracePeriodMinutes: number; // default: 2
  latePenalty: number;        // default: 0.5 $WP per min
  minimumDailyScore: number;  // default: -5 $WP floor
  absentScore: number;        // Standup default: 0 $WP; EOD default: -5 $WP (mandatory minus deduction)
  activeDays: number[];       // [1,2,3,4,5,6] (0=Sun, 1=Mon, ..., 6=Sat)
}

export interface Settings {
  currencySymbol: string;     // default: "$WP"
  minimumAttendancePercentage: number;  // default: 80%
  excludeExcusedFromDenominator: boolean;// default: true
  timezone: string;           // default: Intl.DateTimeFormat().resolvedOptions().timeZone
  finePerMinusPoint: number;  // e.g. 100 (Salary deduction per negative $WP)
  salaryCurrency: string;     // default: "PKR" or "USD"
  weeklyCalculationDay: number; // default: 6 (Saturday)
  
  // Dual Meeting Configurations
  standup: MeetingTypeSettings;
  eod: MeetingTypeSettings;

  // Rewards & Top 3 Bonuses
  enableDailyTop3Bonus: boolean;        // default: true
  dailyTop3BonusPoints: [number, number, number]; // default: [3, 2, 1] $WP for 1st, 2nd, 3rd of the day
  monthlyGrandRewardNotes?: string;     // Company reward description for Monthly Top 3 Winners

  // Slack Integration
  slackWebhookUrl?: string;
  slackChannel?: string;
  slackAutoShareOnEnd?: boolean;
  slackWarningMessageTemplate?: string;

  // Admin Security
  adminPin?: string;                    // default: "webpenter2026"
}

export interface AuditLogEntry {
  id: string;
  recordId: string;
  employeeId: string;
  employeeName: string;
  meetingId: string;
  meetingDate: string;
  meetingType: MeetingType;
  changedBy: string;
  timestamp: string;
  oldValue: Partial<AttendanceRecord>;
  newValue: Partial<AttendanceRecord>;
  reason: string;
}

export interface WeeklyEmployeeRanking {
  employee: Employee;
  rank: number;
  isEligible: boolean;
  ineligibilityReason?: string;
  totalScheduledMeetings: number;
  standupAttended: number;
  eodAttended: number;
  presentMeetings: number;
  absentMeetings: number;
  excusedMeetings: number;
  cancelledMeetings: number;
  attendancePercentage: number;
  totalPoints: number;                  // Total $WP earned from attendance & punctuality
  dailyBonusPoints: number;             // Extra $WP awarded from Daily Top 3 bonuses
  netPoints: number;                    // totalPoints + dailyBonusPoints
  negativePoints: number;               // Sum of negative $WP deductions (absolute sum)
  salaryDeductionAmount: number;        // negativePoints * finePerMinusPoint
  averagePunctualityScore: number;      // Calculated ONLY over present meetings
  onTimeCount: number;
  lateCount: number;
  records: AttendanceRecord[];
}

export interface WeekSummary {
  weekKey: string;                      // e.g. "2026-W39"
  dateRangeLabel: string;               // e.g. "Sep 21 – Sep 27"
  totalEmployees: number;
  averageAttendancePercentage: number;
  meetingsHeld: number;
  eligibleEmployeesCount: number;
  totalWPEarned: number;
  totalFinesDeducted: number;
  topPerformer?: { name: string; netPoints: number; avgScore: number };
  bestAttendance?: { name: string; percentage: number };
  bestPunctuality?: { name: string; avgScore: number; meetings: number };
}

export interface MonthlyEmployeeRanking {
  employee: Employee;
  rank: number;                         // Monthly Rank (1, 2, 3 = Grand Winners 🥇🥈🥉)
  isMonthlyWinner: boolean;             // Top 3 Grand Winner flag
  rewardBadge?: string;                 // "🥇 1st Place Champion", "🥈 2nd Place", "🥉 3rd Place"
  month: string;                        // YYYY-MM e.g. "2026-09"
  monthLabel: string;                   // e.g. "September 2026"
  totalWeeks: number;
  totalScheduledMeetings: number;
  presentMeetings: number;
  absentMeetings: number;
  excusedMeetings: number;
  attendancePercentage: number;
  totalWP: number;                      // Total $WP across all weeks
  totalNegativeWP: number;              // Total negative $WP across all weeks
  totalSalaryDeduction: number;         // Cumulative salary deduction
  averagePunctualityScore: number;
  weeklyBreakdown: { weekLabel: string; pointsWP: number; attendancePct: number; fine: number }[];
}

export interface DailyMeetingViewParticipant {
  record: AttendanceRecord;
  employee: Employee;
  rank: number;
  joinTimeFormatted: string;
  badgeLabel: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  scoreFormatted: string;
  fineWarning?: string;
}
