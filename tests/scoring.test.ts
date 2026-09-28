import { describe, it, expect } from 'vitest';
import { calculateAttendanceScore } from '../src/core/scoring';
import { MeetingTypeSettings } from '../src/core/types';

describe('Scoring Engine', () => {
  const defaultStandupSettings: MeetingTypeSettings = {
    enabled: true,
    startTime: '10:00:00',
    onTimeScore: 5.0,
    gracePeriodMinutes: 2, // 120 seconds
    latePenalty: 0.5,
    minimumDailyScore: -5.0,
    absentScore: 0,
    activeDays: [1, 2, 3, 4, 5, 6],
  };

  const scheduledStart = '2026-09-28T10:00:00.000Z';

  it('awards full 5.0 points when joining early or exactly at scheduled start', () => {
    // Exactly at start
    const res1 = calculateAttendanceScore(scheduledStart, '2026-09-28T10:00:00.000Z', defaultStandupSettings);
    expect(res1.status).toBe('present');
    expect(res1.isOnTime).toBe(true);
    expect(res1.minutesLate).toBe(0);
    expect(res1.dailyScore).toBe(5.0);

    // Early join
    const res2 = calculateAttendanceScore(scheduledStart, '2026-09-28T09:58:30.000Z', defaultStandupSettings);
    expect(res2.status).toBe('present');
    expect(res2.isOnTime).toBe(true);
    expect(res2.minutesLate).toBe(0);
    expect(res2.dailyScore).toBe(5.0);
  });

  it('awards full 5.0 points within the 2-minute grace period', () => {
    // 10:01:00 (60s into meeting)
    const res1 = calculateAttendanceScore(scheduledStart, '2026-09-28T10:01:00.000Z', defaultStandupSettings);
    expect(res1.isOnTime).toBe(true);
    expect(res1.dailyScore).toBe(5.0);

    // 10:01:59 (119s into meeting)
    const res2 = calculateAttendanceScore(scheduledStart, '2026-09-28T10:01:59.000Z', defaultStandupSettings);
    expect(res2.isOnTime).toBe(true);
    expect(res2.dailyScore).toBe(5.0);
  });

  it('respects the exact second grace boundary (10:02:00 vs 10:02:01)', () => {
    // Exactly at grace boundary 10:02:00 (120s) -> ON TIME, 5.0 points
    const resBoundary = calculateAttendanceScore(scheduledStart, '2026-09-28T10:02:00.000Z', defaultStandupSettings);
    expect(resBoundary.isOnTime).toBe(true);
    expect(resBoundary.minutesLate).toBe(0);
    expect(resBoundary.dailyScore).toBe(5.0);

    // 1 second past grace 10:02:01 (121s) -> LATE, 1 minute late -> 4.5 points
    const resLate = calculateAttendanceScore(scheduledStart, '2026-09-28T10:02:01.000Z', defaultStandupSettings);
    expect(resLate.isOnTime).toBe(false);
    expect(resLate.status).toBe('late');
    expect(resLate.minutesLate).toBe(1);
    expect(resLate.dailyScore).toBe(4.5);
  });

  it('accurately deducts 0.5 points per minute late according to specification examples', () => {
    // 10:03:00 -> 1 min late -> 4.5
    expect(calculateAttendanceScore(scheduledStart, '2026-09-28T10:03:00.000Z', defaultStandupSettings).dailyScore).toBe(4.5);

    // 10:04:00 -> 2 min late -> 4.0
    expect(calculateAttendanceScore(scheduledStart, '2026-09-28T10:04:00.000Z', defaultStandupSettings).dailyScore).toBe(4.0);

    // 10:05:00 -> 3 min late -> 3.5
    expect(calculateAttendanceScore(scheduledStart, '2026-09-28T10:05:00.000Z', defaultStandupSettings).dailyScore).toBe(3.5);

    // 10:10:00 -> 8 min late -> 5.0 - (8 * 0.5) = 1.0
    expect(calculateAttendanceScore(scheduledStart, '2026-09-28T10:10:00.000Z', defaultStandupSettings).dailyScore).toBe(1.0);

    // 10:20:00 -> 18 min late -> 5.0 - (18 * 0.5) = -4.0
    expect(calculateAttendanceScore(scheduledStart, '2026-09-28T10:20:00.000Z', defaultStandupSettings).dailyScore).toBe(-4.0);
  });

  it('clamps daily score strictly at the configured -5.0 floor', () => {
    // 10:25:00 -> 23 min late -> 5.0 - (23 * 0.5) = -6.5 -> clamped to -5.0
    const res1 = calculateAttendanceScore(scheduledStart, '2026-09-28T10:25:00.000Z', defaultStandupSettings);
    expect(res1.dailyScore).toBe(-5.0);

    // 10:30:00 -> 28 min late -> 5.0 - (28 * 0.5) = -9.0 -> clamped to -5.0
    const res2 = calculateAttendanceScore(scheduledStart, '2026-09-28T10:30:00.000Z', defaultStandupSettings);
    expect(res2.dailyScore).toBe(-5.0);

    // 10:50:00 -> extremely late -> clamped to -5.0
    const res3 = calculateAttendanceScore(scheduledStart, '2026-09-28T10:50:00.000Z', defaultStandupSettings);
    expect(res3.dailyScore).toBe(-5.0);
  });

  it('handles absent, excused, and cancelled statuses correctly', () => {
    // Absent
    const resAbsent = calculateAttendanceScore(scheduledStart, undefined, defaultStandupSettings);
    expect(resAbsent.status).toBe('absent');
    expect(resAbsent.isOnTime).toBe(false);
    expect(resAbsent.dailyScore).toBe(0);

    // EOD missing penalty (-5.0 $WP)
    const eodSettings: MeetingTypeSettings = {
      ...defaultStandupSettings,
      absentScore: -5.0,
    };
    const resEodAbsent = calculateAttendanceScore(scheduledStart, undefined, eodSettings);
    expect(resEodAbsent.status).toBe('absent');
    expect(resEodAbsent.dailyScore).toBe(-5.0);

    // Excused
    const resExcused = calculateAttendanceScore(scheduledStart, undefined, defaultStandupSettings, 'excused');
    expect(resExcused.status).toBe('excused');
    expect(resExcused.dailyScore).toBe(0);

    // Cancelled
    const resCancelled = calculateAttendanceScore(scheduledStart, undefined, defaultStandupSettings, 'cancelled');
    expect(resCancelled.status).toBe('cancelled');
    expect(resCancelled.dailyScore).toBe(0);
  });
});
