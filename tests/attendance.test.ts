import { describe, it, expect } from 'vitest';
import { calculateWeeklyRankings } from '../src/core/ranking';
import { DEFAULT_SETTINGS } from '../src/core/mock-data';
import { Employee, Meeting, AttendanceRecord } from '../src/core/types';

describe('Attendance Percentage & Denominator Engine', () => {
  const emp1: Employee = { id: 'emp-1', name: 'Test Employee 1', active: true, createdAt: '2026-09-01T00:00:00Z' };

  it('excludes cancelled meetings from the attendance denominator', () => {
    // Week with 5 scheduled meetings, but 1 was cancelled (e.g. holiday)
    const meetings: Meeting[] = [
      { id: 'm1', code: '', title: 'M1', type: 'standup', date: '2026-09-21', scheduledStart: '2026-09-21T10:00:00Z', scheduledEnd: '2026-09-21T10:30:00Z', status: 'completed', timezone: 'UTC', createdAt: '' },
      { id: 'm2', code: '', title: 'M2', type: 'standup', date: '2026-09-22', scheduledStart: '2026-09-22T10:00:00Z', scheduledEnd: '2026-09-22T10:30:00Z', status: 'completed', timezone: 'UTC', createdAt: '' },
      { id: 'm3', code: '', title: 'M3', type: 'standup', date: '2026-09-23', scheduledStart: '2026-09-23T10:00:00Z', scheduledEnd: '2026-09-23T10:30:00Z', status: 'completed', timezone: 'UTC', createdAt: '' },
      { id: 'm4', code: '', title: 'M4', type: 'standup', date: '2026-09-24', scheduledStart: '2026-09-24T10:00:00Z', scheduledEnd: '2026-09-24T10:30:00Z', status: 'completed', timezone: 'UTC', createdAt: '' },
      { id: 'm5', code: '', title: 'M5 Cancelled', type: 'standup', date: '2026-09-25', scheduledStart: '2026-09-25T10:00:00Z', scheduledEnd: '2026-09-25T10:30:00Z', status: 'cancelled', timezone: 'UTC', createdAt: '' },
    ];

    // Employee attended 4 out of 4 non-cancelled meetings
    const records: AttendanceRecord[] = [
      { id: 'r1', meetingId: 'm1', employeeId: emp1.id, meetingType: 'standup', status: 'present', joinedAt: '2026-09-21T10:00:00Z', minutesLate: 0, dailyScore: 5, isOnTime: true, createdAt: '', updatedAt: '' },
      { id: 'r2', meetingId: 'm2', employeeId: emp1.id, meetingType: 'standup', status: 'present', joinedAt: '2026-09-22T10:00:00Z', minutesLate: 0, dailyScore: 5, isOnTime: true, createdAt: '', updatedAt: '' },
      { id: 'r3', meetingId: 'm3', employeeId: emp1.id, meetingType: 'standup', status: 'present', joinedAt: '2026-09-23T10:00:00Z', minutesLate: 0, dailyScore: 5, isOnTime: true, createdAt: '', updatedAt: '' },
      { id: 'r4', meetingId: 'm4', employeeId: emp1.id, meetingType: 'standup', status: 'present', joinedAt: '2026-09-24T10:00:00Z', minutesLate: 0, dailyScore: 5, isOnTime: true, createdAt: '', updatedAt: '' },
      { id: 'r5', meetingId: 'm5', employeeId: emp1.id, meetingType: 'standup', status: 'cancelled', joinedAt: undefined, minutesLate: 0, dailyScore: 0, isOnTime: false, createdAt: '', updatedAt: '' },
    ];

    const rankings = calculateWeeklyRankings([emp1], meetings, records, DEFAULT_SETTINGS);
    const r = rankings[0];

    // Denominator should be 4, present is 4 -> 100% attendance (not 4/5 = 80%)
    expect(r.totalScheduledMeetings).toBe(4);
    expect(r.presentMeetings).toBe(4);
    expect(r.attendancePercentage).toBe(100);
    expect(r.isEligible).toBe(true);
  });

  it('excludes excused meetings from denominator when configured', () => {
    const meetings: Meeting[] = [
      { id: 'm1', code: '', title: 'M1', type: 'standup', date: '2026-09-21', scheduledStart: '2026-09-21T10:00:00Z', scheduledEnd: '2026-09-21T10:30:00Z', status: 'completed', timezone: 'UTC', createdAt: '' },
      { id: 'm2', code: '', title: 'M2', type: 'standup', date: '2026-09-22', scheduledStart: '2026-09-22T10:00:00Z', scheduledEnd: '2026-09-22T10:30:00Z', status: 'completed', timezone: 'UTC', createdAt: '' },
      { id: 'm3', code: '', title: 'M3', type: 'standup', date: '2026-09-23', scheduledStart: '2026-09-23T10:00:00Z', scheduledEnd: '2026-09-23T10:30:00Z', status: 'completed', timezone: 'UTC', createdAt: '' },
      { id: 'm4', code: '', title: 'M4', type: 'standup', date: '2026-09-24', scheduledStart: '2026-09-24T10:00:00Z', scheduledEnd: '2026-09-24T10:30:00Z', status: 'completed', timezone: 'UTC', createdAt: '' },
      { id: 'm5', code: '', title: 'M5', type: 'standup', date: '2026-09-25', scheduledStart: '2026-09-25T10:00:00Z', scheduledEnd: '2026-09-25T10:30:00Z', status: 'completed', timezone: 'UTC', createdAt: '' },
    ];

    // Employee was present in 4 meetings, excused from 1 meeting
    const records: AttendanceRecord[] = [
      { id: 'r1', meetingId: 'm1', employeeId: emp1.id, meetingType: 'standup', status: 'present', joinedAt: '2026-09-21T10:00:00Z', minutesLate: 0, dailyScore: 5, isOnTime: true, createdAt: '', updatedAt: '' },
      { id: 'r2', meetingId: 'm2', employeeId: emp1.id, meetingType: 'standup', status: 'present', joinedAt: '2026-09-22T10:00:00Z', minutesLate: 0, dailyScore: 5, isOnTime: true, createdAt: '', updatedAt: '' },
      { id: 'r3', meetingId: 'm3', employeeId: emp1.id, meetingType: 'standup', status: 'present', joinedAt: '2026-09-23T10:00:00Z', minutesLate: 0, dailyScore: 5, isOnTime: true, createdAt: '', updatedAt: '' },
      { id: 'r4', meetingId: 'm4', employeeId: emp1.id, meetingType: 'standup', status: 'present', joinedAt: '2026-09-24T10:00:00Z', minutesLate: 0, dailyScore: 5, isOnTime: true, createdAt: '', updatedAt: '' },
      { id: 'r5', meetingId: 'm5', employeeId: emp1.id, meetingType: 'standup', status: 'excused', joinedAt: undefined, minutesLate: 0, dailyScore: 0, isOnTime: false, createdAt: '', updatedAt: '' },
    ];

    const rankings = calculateWeeklyRankings([emp1], meetings, records, {
      ...DEFAULT_SETTINGS,
      excludeExcusedFromDenominator: true,
    });
    const r = rankings[0];

    // 4 present / (5 scheduled - 1 excused) = 4/4 = 100% attendance!
    expect(r.presentMeetings).toBe(4);
    expect(r.excusedMeetings).toBe(1);
    expect(r.attendancePercentage).toBe(100);
  });
});
