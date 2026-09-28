import { AttendanceStatus, MeetingType, MeetingTypeSettings, AttendanceRecord } from './types';
import { getDiffInSeconds } from './date-utils';

export interface ScoreCalculationResult {
  status: AttendanceStatus;
  isOnTime: boolean;
  minutesLate: number;
  dailyScore: number;
  diffSeconds: number;
  graceSeconds: number;
  explanation: string;
}

/**
 * Calculates attendance status, minutes late, and daily $WP score for a participant join event.
 * 
 * Rules:
 * 1. Grace Period:
 *    If joinedTime <= scheduledTime + gracePeriod:
 *    -> ON TIME, minutesLate = 0, score = onTimeScore
 * 
 * 2. Late calculation after grace period:
 *    late_seconds = diff_seconds - grace_seconds
 *    late_minutes = Math.ceil(late_seconds / 60)
 *    score = onTimeScore - (late_minutes * latePenalty)
 *    score = Math.max(score, minimumDailyScore)  // Floor clamping (e.g. -5.0 $WP)
 * 
 * 3. Absence:
 *    If status is absent:
 *    -> minutesLate = 0, score = absentScore (0 for Standup, -5 for EOD by default)
 * 
 * 4. Excused / Cancelled:
 *    -> score = 0, not counted in punctuality average
 */
export function calculateAttendanceScore(
  scheduledStart: string | Date,
  joinedAt: string | Date | undefined,
  settings: MeetingTypeSettings,
  forcedStatus?: AttendanceStatus
): ScoreCalculationResult {
  // 1. Explicit status overrides
  if (forcedStatus === 'excused') {
    return {
      status: 'excused',
      isOnTime: false,
      minutesLate: 0,
      dailyScore: 0,
      diffSeconds: 0,
      graceSeconds: settings.gracePeriodMinutes * 60,
      explanation: 'Excused from meeting',
    };
  }

  if (forcedStatus === 'cancelled') {
    return {
      status: 'cancelled',
      isOnTime: false,
      minutesLate: 0,
      dailyScore: 0,
      diffSeconds: 0,
      graceSeconds: settings.gracePeriodMinutes * 60,
      explanation: 'Meeting was cancelled',
    };
  }

  if (forcedStatus === 'absent' || (!joinedAt && forcedStatus !== 'present' && forcedStatus !== 'late')) {
    return {
      status: 'absent',
      isOnTime: false,
      minutesLate: 0,
      dailyScore: settings.absentScore,
      diffSeconds: 0,
      graceSeconds: settings.gracePeriodMinutes * 60,
      explanation: settings.absentScore < 0 
        ? `Absent (${settings.absentScore} $WP penalty)` 
        : `Absent (0 $WP)`,
    };
  }

  if (!joinedAt) {
    return {
      status: 'absent',
      isOnTime: false,
      minutesLate: 0,
      dailyScore: settings.absentScore,
      diffSeconds: 0,
      graceSeconds: settings.gracePeriodMinutes * 60,
      explanation: `Did not join (${settings.absentScore} $WP)`,
    };
  }

  const diffSeconds = getDiffInSeconds(scheduledStart, joinedAt);
  const graceSeconds = Math.round(settings.gracePeriodMinutes * 60);

  // 2. On time check (diffSeconds <= graceSeconds)
  // Even if joined early (diffSeconds < 0), it's ON TIME with full onTimeScore!
  if (diffSeconds <= graceSeconds) {
    return {
      status: 'present',
      isOnTime: true,
      minutesLate: 0,
      dailyScore: settings.onTimeScore,
      diffSeconds,
      graceSeconds,
      explanation: diffSeconds <= 0 
        ? `Joined on time (+${settings.onTimeScore} $WP)` 
        : `Joined within ${settings.gracePeriodMinutes}m grace period (+${settings.onTimeScore} $WP)`,
    };
  }

  // 3. Late calculation
  const lateSeconds = diffSeconds - graceSeconds;
  const minutesLate = Math.ceil(lateSeconds / 60);

  const rawScore = settings.onTimeScore - (minutesLate * settings.latePenalty);
  const dailyScore = Math.max(rawScore, settings.minimumDailyScore);

  const isCapped = rawScore < settings.minimumDailyScore;
  const explanation = isCapped
    ? `${minutesLate} min late (Clamped to minimum floor: ${dailyScore} $WP)`
    : `${minutesLate} min late (-${(minutesLate * settings.latePenalty).toFixed(1)} $WP penalty = ${dailyScore.toFixed(1)} $WP)`;

  return {
    status: 'late',
    isOnTime: false,
    minutesLate,
    dailyScore,
    diffSeconds,
    graceSeconds,
    explanation,
  };
}

/**
 * Creates or updates an attendance record with calculated score
 */
export function createAttendanceRecord(
  id: string,
  meetingId: string,
  employeeId: string,
  meetingType: MeetingType,
  scheduledStart: string | Date,
  joinedAt: string | Date | undefined,
  settings: MeetingTypeSettings,
  statusOverride?: AttendanceStatus,
  notes?: string
): AttendanceRecord {
  const result = calculateAttendanceScore(scheduledStart, joinedAt, settings, statusOverride);
  const now = new Date().toISOString();

  return {
    id,
    meetingId,
    employeeId,
    meetingType,
    status: result.status,
    joinedAt: joinedAt ? (typeof joinedAt === 'string' ? joinedAt : joinedAt.toISOString()) : undefined,
    minutesLate: result.minutesLate,
    dailyScore: result.dailyScore,
    isOnTime: result.isOnTime,
    notes: notes || result.explanation,
    createdAt: now,
    updatedAt: now,
  };
}
