import { Employee, Meeting, AttendanceRecord, Settings, MonthlyEmployeeRanking, WeeklyEmployeeRanking } from './types';
import { getMonthInfo, getWeekInfo } from './date-utils';
import { calculateWeeklyRankings } from './ranking';

/**
 * Calculates month-end cumulative rankings and payroll fine deductions across all weeks in the month.
 */
export function calculateMonthlyRankings(
  employees: Employee[],
  meetingsInMonth: Meeting[],
  recordsInMonth: AttendanceRecord[],
  settings: Settings,
  monthKey: string // "YYYY-MM" e.g. "2026-09"
): MonthlyEmployeeRanking[] {
  const activeEmployees = employees.filter((e) => e.active);
  const [yearStr, monthStr] = monthKey.split('-');
  const monthLabel = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Group meetings by weekKey
  const meetingsByWeek = new Map<string, Meeting[]>();
  for (const m of meetingsInMonth) {
    const { weekKey } = getWeekInfo(m.date, settings.weeklyCalculationDay);
    if (!meetingsByWeek.has(weekKey)) {
      meetingsByWeek.set(weekKey, []);
    }
    meetingsByWeek.get(weekKey)!.push(m);
  }

  // Calculate rankings for each week in the month
  const weeklyRankingsByWeek = new Map<string, WeeklyEmployeeRanking[]>();
  for (const [wKey, weekMeetings] of meetingsByWeek.entries()) {
    const meetingIds = new Set(weekMeetings.map((m) => m.id));
    const weekRecords = recordsInMonth.filter((r) => meetingIds.has(r.meetingId));
    const weekRanks = calculateWeeklyRankings(employees, weekMeetings, weekRecords, settings);
    weeklyRankingsByWeek.set(wKey, weekRanks);
  }

  const validMeetings = meetingsInMonth.filter((m) => m.status !== 'cancelled');

  const monthlyList: MonthlyEmployeeRanking[] = activeEmployees.map((employee) => {
    let presentMeetings = 0;
    let absentMeetings = 0;
    let excusedMeetings = 0;
    let totalWP = 0;
    let totalNegativeWP = 0;

    const weeklyBreakdown: { weekLabel: string; pointsWP: number; attendancePct: number; fine: number }[] = [];

    for (const [wKey, weekRanks] of weeklyRankingsByWeek.entries()) {
      const empRank = weekRanks.find((r) => r.employee.id === employee.id);
      if (empRank) {
        weeklyBreakdown.push({
          weekLabel: wKey,
          pointsWP: empRank.netPoints,
          attendancePct: empRank.attendancePercentage,
          fine: empRank.salaryDeductionAmount,
        });
      }
    }

    const empRecords = recordsInMonth.filter((r) => r.employeeId === employee.id);
    for (const rec of empRecords) {
      if (rec.status === 'present' || rec.status === 'late') {
        presentMeetings++;
        totalWP += rec.dailyScore;
        if (rec.dailyScore < 0) {
          totalNegativeWP += Math.abs(rec.dailyScore);
        }
      } else if (rec.status === 'absent') {
        absentMeetings++;
        if (rec.dailyScore < 0) {
          totalWP += rec.dailyScore;
          totalNegativeWP += Math.abs(rec.dailyScore);
        }
      } else if (rec.status === 'excused') {
        excusedMeetings++;
      }
    }

    const totalScheduled = validMeetings.length;
    const denominator = settings.excludeExcusedFromDenominator
      ? Math.max(0, totalScheduled - excusedMeetings)
      : totalScheduled;

    const attendancePercentage = denominator > 0
      ? Math.round((presentMeetings / denominator) * 100 * 10) / 10
      : (presentMeetings > 0 ? 100 : 0);

    const averagePunctualityScore = presentMeetings > 0
      ? Math.round((totalWP / presentMeetings) * 10) / 10
      : 0;

    const totalSalaryDeduction = Math.round(totalNegativeWP * settings.finePerMinusPoint * 100) / 100;

    return {
      employee,
      rank: 0,
      isMonthlyWinner: false,
      month: monthKey,
      monthLabel,
      totalWeeks: weeklyRankingsByWeek.size,
      totalScheduledMeetings: totalScheduled,
      presentMeetings,
      absentMeetings,
      excusedMeetings,
      attendancePercentage,
      totalWP: Math.round(totalWP * 10) / 10,
      totalNegativeWP: Math.round(totalNegativeWP * 10) / 10,
      totalSalaryDeduction,
      averagePunctualityScore,
      weeklyBreakdown,
    };
  });

  // Sort monthly rankings:
  // 1. Minimum monthly attendance percentage met
  // 2. Average punctuality score DESC
  // 3. Attendance percentage DESC
  // 4. Total $WP DESC
  // 5. Name ASC
  monthlyList.sort((a, b) => {
    const aEligible = a.attendancePercentage >= settings.minimumAttendancePercentage;
    const bEligible = b.attendancePercentage >= settings.minimumAttendancePercentage;
    if (aEligible !== bEligible) return aEligible ? -1 : 1;

    if (Math.abs(b.averagePunctualityScore - a.averagePunctualityScore) > 0.001) {
      return b.averagePunctualityScore - a.averagePunctualityScore;
    }
    if (Math.abs(b.attendancePercentage - a.attendancePercentage) > 0.001) {
      return b.attendancePercentage - a.attendancePercentage;
    }
    if (Math.abs(b.totalWP - a.totalWP) > 0.001) {
      return b.totalWP - a.totalWP;
    }
    return a.employee.name.localeCompare(b.employee.name);
  });

  // Assign ranks & award Top 3 Grand Winner badges
  monthlyList.forEach((item, idx) => {
    item.rank = idx + 1;
    const isEligible = item.attendancePercentage >= settings.minimumAttendancePercentage;
    if (idx < 3 && isEligible && item.presentMeetings > 0) {
      item.isMonthlyWinner = true;
      if (idx === 0) item.rewardBadge = '🥇 1st Place Grand Champion';
      else if (idx === 1) item.rewardBadge = '🥈 2nd Place Silver Winner';
      else if (idx === 2) item.rewardBadge = '🥉 3rd Place Bronze Winner';
    }
  });

  return monthlyList;
}
