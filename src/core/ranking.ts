import { Employee, Meeting, AttendanceRecord, Settings, WeeklyEmployeeRanking, WeekSummary } from './types';
import { getWeekInfo } from './date-utils';

/**
 * Calculate weekly rankings and punctuality metrics for all employees in a given week.
 * 
 * CORE PRINCIPLE:
 * "Consistency First, Punctuality Second."
 * 
 * 1. Eligible employees (Attendance % >= threshold) always outrank ineligible employees.
 * 2. Punctuality average is calculated ONLY from meetings where the employee was present.
 * 3. Absences do not artificially dilute or inflate punctuality averages, but directly drop eligibility.
 */
export function calculateWeeklyRankings(
  employees: Employee[],
  meetingsInWeek: Meeting[],
  recordsInWeek: AttendanceRecord[],
  settings: Settings
): WeeklyEmployeeRanking[] {
  const activeEmployees = employees.filter((e) => e.active);

  // Group records by employeeId
  const recordsByEmployee = new Map<string, AttendanceRecord[]>();
  for (const emp of activeEmployees) {
    recordsByEmployee.set(emp.id, []);
  }

  for (const rec of recordsInWeek) {
    const list = recordsByEmployee.get(rec.employeeId);
    if (list) {
      list.push(rec);
    }
  }

  // Count active non-cancelled scheduled meetings
  const validMeetings = meetingsInWeek.filter((m) => m.status !== 'cancelled');

  const rankings: WeeklyEmployeeRanking[] = activeEmployees.map((employee) => {
    const empRecords = recordsByEmployee.get(employee.id) || [];

    let presentMeetings = 0;
    let absentMeetings = 0;
    let excusedMeetings = 0;
    let cancelledMeetings = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let standupAttended = 0;
    let eodAttended = 0;

    let totalPoints = 0;
    let punctualityPoints = 0;
    let negativePoints = 0;

    for (const rec of empRecords) {
      if (rec.status === 'present' || rec.status === 'late') {
        presentMeetings++;
        totalPoints += rec.dailyScore;
        punctualityPoints += rec.dailyScore;
        if (rec.dailyScore < 0) {
          negativePoints += Math.abs(rec.dailyScore);
        }

        if (rec.isOnTime) {
          onTimeCount++;
        } else {
          lateCount++;
        }

        if (rec.meetingType === 'standup') {
          standupAttended++;
        } else if (rec.meetingType === 'eod') {
          eodAttended++;
        }
      } else if (rec.status === 'absent') {
        absentMeetings++;
        // If absent score is negative (e.g. absent penalty)
        if (rec.dailyScore < 0) {
          totalPoints += rec.dailyScore;
          negativePoints += Math.abs(rec.dailyScore);
        }
      } else if (rec.status === 'excused') {
        excusedMeetings++;
      } else if (rec.status === 'cancelled') {
        cancelledMeetings++;
      }
    }

    // Determine eligible scheduled meetings denominator
    const totalScheduled = validMeetings.length;
    const denominator = settings.excludeExcusedFromDenominator
      ? Math.max(0, totalScheduled - excusedMeetings)
      : totalScheduled;

    // Attendance percentage calculation
    const attendancePercentage = denominator > 0
      ? Math.round((presentMeetings / denominator) * 100 * 10) / 10
      : (presentMeetings > 0 ? 100 : 0);

    // Average punctuality score: ONLY divided by meetings present!
    const averagePunctualityScore = presentMeetings > 0
      ? Math.round((punctualityPoints / presentMeetings) * 10) / 10
      : 0;

    // Eligibility check
    const isEligible = denominator === 0 || attendancePercentage >= settings.minimumAttendancePercentage;
    const ineligibilityReason = !isEligible
      ? `Attendance ${attendancePercentage}% is below the required ${settings.minimumAttendancePercentage}% threshold`
      : undefined;

    const salaryDeductionAmount = Math.round(negativePoints * settings.finePerMinusPoint * 100) / 100;

    return {
      employee,
      rank: 0,
      isEligible,
      ineligibilityReason,
      totalScheduledMeetings: totalScheduled,
      standupAttended,
      eodAttended,
      presentMeetings,
      absentMeetings,
      excusedMeetings,
      cancelledMeetings,
      attendancePercentage,
      totalPoints: Math.round(totalPoints * 10) / 10,
      dailyBonusPoints: 0,
      netPoints: Math.round(totalPoints * 10) / 10,
      negativePoints: Math.round(negativePoints * 10) / 10,
      salaryDeductionAmount,
      averagePunctualityScore,
      onTimeCount,
      lateCount,
      records: empRecords,
    };
  });

  // Sort rankings deterministically
  rankings.sort(sortWeeklyRankings);

  // Assign 1-indexed rank
  rankings.forEach((r, idx) => {
    r.rank = idx + 1;
  });

  return rankings;
}

/**
 * Deterministic multi-tier sorting comparator
 */
export function sortWeeklyRankings(a: WeeklyEmployeeRanking, b: WeeklyEmployeeRanking): number {
  // 1. Eligibility first: Eligible always outranks Ineligible
  if (a.isEligible !== b.isEligible) {
    return a.isEligible ? -1 : 1;
  }

  // 2. Average punctuality score DESC
  if (Math.abs(b.averagePunctualityScore - a.averagePunctualityScore) > 0.001) {
    return b.averagePunctualityScore - a.averagePunctualityScore;
  }

  // 3. Attendance percentage DESC
  if (Math.abs(b.attendancePercentage - a.attendancePercentage) > 0.001) {
    return b.attendancePercentage - a.attendancePercentage;
  }

  // 4. Number of on-time meetings DESC
  if (b.onTimeCount !== a.onTimeCount) {
    return b.onTimeCount - a.onTimeCount;
  }

  // 5. Net points DESC
  if (Math.abs(b.netPoints - a.netPoints) > 0.001) {
    return b.netPoints - a.netPoints;
  }

  // 6. Alphabetical tiebreaker
  return a.employee.name.localeCompare(b.employee.name);
}

/**
 * Calculate weekly summary cards metrics
 */
export function calculateWeekSummary(
  rankings: WeeklyEmployeeRanking[],
  meetingsInWeek: Meeting[],
  weekKey: string,
  dateRangeLabel: string
): WeekSummary {
  const totalEmployees = rankings.length;
  const eligibleCount = rankings.filter((r) => r.isEligible).length;
  const validMeetings = meetingsInWeek.filter((m) => m.status !== 'cancelled').length;

  const avgAttendance = totalEmployees > 0
    ? Math.round((rankings.reduce((sum, r) => sum + r.attendancePercentage, 0) / totalEmployees) * 10) / 10
    : 0;

  const totalWPEarned = rankings.reduce((sum, r) => sum + r.netPoints, 0);
  const totalFinesDeducted = rankings.reduce((sum, r) => sum + r.salaryDeductionAmount, 0);

  // Top Performer (Rank #1 among eligible)
  const eligibleRankings = rankings.filter((r) => r.isEligible);
  const topPerformer = eligibleRankings.length > 0
    ? {
        name: eligibleRankings[0].employee.name,
        netPoints: eligibleRankings[0].netPoints,
        avgScore: eligibleRankings[0].averagePunctualityScore,
      }
    : undefined;

  // Best Attendance
  const sortedByAttendance = [...rankings].sort((a, b) => b.attendancePercentage - a.attendancePercentage);
  const bestAttendance = sortedByAttendance.length > 0
    ? {
        name: sortedByAttendance[0].employee.name,
        percentage: sortedByAttendance[0].attendancePercentage,
      }
    : undefined;

  // Best Punctuality (Highest average with >= 1 meeting attended)
  const attendedOnly = rankings.filter((r) => r.presentMeetings > 0);
  attendedOnly.sort((a, b) => b.averagePunctualityScore - a.averagePunctualityScore);
  const bestPunctuality = attendedOnly.length > 0
    ? {
        name: attendedOnly[0].employee.name,
        avgScore: attendedOnly[0].averagePunctualityScore,
        meetings: attendedOnly[0].presentMeetings,
      }
    : undefined;

  return {
    weekKey,
    dateRangeLabel,
    totalEmployees,
    averageAttendancePercentage: avgAttendance,
    meetingsHeld: validMeetings,
    eligibleEmployeesCount: eligibleCount,
    totalWPEarned: Math.round(totalWPEarned * 10) / 10,
    totalFinesDeducted: Math.round(totalFinesDeducted * 100) / 100,
    topPerformer,
    bestAttendance,
    bestPunctuality,
  };
}
