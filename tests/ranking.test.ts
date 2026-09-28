import { describe, it, expect } from 'vitest';
import { calculateWeeklyRankings } from '../src/core/ranking';
import { generateSeedData, DEFAULT_SETTINGS } from '../src/core/mock-data';
import { Employee, Meeting, AttendanceRecord } from '../src/core/types';

describe('Weekly Ranking & Eligibility Algorithm', () => {
  it('correctly ranks the Sep 28 real standup meeting and penalizes unexcused absences', () => {
    const { employees, meetings, records, settings } = generateSeedData();

    const suMeetings = meetings.filter((m) => m.type === 'standup');
    const suMeetingIds = new Set(suMeetings.map((m) => m.id));
    const suRecords = records.filter((r) => suMeetingIds.has(r.meetingId));

    const rankings = calculateWeeklyRankings(employees, suMeetings, suRecords, settings);

    // 1. Ayub Khokhar joined with 4.5 pts (Rank #1)
    expect(rankings[0].employee.name).toBe('Ayub Khokhar');
    expect(rankings[0].rank).toBe(1);
    expect(rankings[0].isEligible).toBe(true);
    expect(rankings[0].totalPoints).toBe(4.5);

    // Unexcused absentees (Muhammad Sadiq, Fayyaz Ahmad) have -5.0 $WP penalty and PKR 100 fine
    const sadiq = rankings.find((r) => r.employee.name === 'Muhammad Sadiq')!;
    expect(sadiq).toBeDefined();
    expect(sadiq.absentMeetings).toBe(1);
    expect(sadiq.negativePoints).toBe(5.0);
    expect(sadiq.salaryDeductionAmount).toBe(100); // 5 * 20 PKR fine
  });

  it('explicitly verifies Consistency First: high attendance (5/5, 3.0 avg) outranks low attendance (1/5, 5.0 avg)', () => {
    const empA: Employee = { id: 'emp-a', name: 'Employee A', active: true, createdAt: '2026-09-01T00:00:00Z' };
    const empB: Employee = { id: 'emp-b', name: 'Employee B', active: true, createdAt: '2026-09-01T00:00:00Z' };

    const meetings: Meeting[] = [1, 2, 3, 4, 5].map((day) => ({
      id: `m-${day}`,
      code: 'meet',
      title: `Standup ${day}`,
      type: 'standup',
      date: `2026-09-2${day}`,
      scheduledStart: `2026-09-2${day}T10:00:00.000Z`,
      scheduledEnd: `2026-09-2${day}T10:30:00.000Z`,
      status: 'completed',
      timezone: 'UTC',
      createdAt: '2026-09-01T00:00:00Z',
    }));

    // Employee A attends all 5 with 3.0 score each
    const recordsA: AttendanceRecord[] = meetings.map((m) => ({
      id: `rec-a-${m.id}`,
      meetingId: m.id,
      employeeId: empA.id,
      meetingType: 'standup',
      status: 'late',
      joinedAt: `${m.date}T10:06:00.000Z`,
      minutesLate: 4,
      dailyScore: 3.0,
      isOnTime: false,
      createdAt: m.scheduledStart,
      updatedAt: m.scheduledStart,
    }));

    // Employee B attends 1 meeting with 5.0 score, absent in remaining 4 (-5.0 each)
    const recordsB: AttendanceRecord[] = [
      {
        id: `rec-b-1`,
        meetingId: meetings[0].id,
        employeeId: empB.id,
        meetingType: 'standup',
        status: 'present',
        joinedAt: `${meetings[0].date}T10:00:00.000Z`,
        minutesLate: 0,
        dailyScore: 5.0,
        isOnTime: true,
        createdAt: meetings[0].scheduledStart,
        updatedAt: meetings[0].scheduledStart,
      },
      ...meetings.slice(1).map((m) => ({
        id: `rec-b-${m.id}`,
        meetingId: m.id,
        employeeId: empB.id,
        meetingType: 'standup' as const,
        status: 'absent' as const,
        joinedAt: undefined,
        minutesLate: 0,
        dailyScore: -5.0, // Fine for absence
        isOnTime: false,
        createdAt: m.scheduledStart,
        updatedAt: m.scheduledStart,
      })),
    ];

    const rankings = calculateWeeklyRankings([empA, empB], meetings, [...recordsA, ...recordsB], DEFAULT_SETTINGS);

    const resA = rankings.find((r) => r.employee.id === empA.id)!;
    const resB = rankings.find((r) => r.employee.id === empB.id)!;

    expect(resA.isEligible).toBe(true);
    expect(resA.attendancePercentage).toBe(100);
    expect(resA.averagePunctualityScore).toBe(3.0);
    expect(resA.rank).toBe(1);

    expect(resB.isEligible).toBe(false);
    expect(resB.attendancePercentage).toBe(20);
    expect(resB.averagePunctualityScore).toBe(5.0);
    expect(resB.rank).toBe(2);

    expect(resA.rank).toBeLessThan(resB.rank);
  });
});
