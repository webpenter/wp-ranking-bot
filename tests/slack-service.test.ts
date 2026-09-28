import { describe, it, expect } from 'vitest';
import {
  generateDailySlackReport,
  generateWeeklySlackReport,
  generateMonthlySlackReport,
} from '../src/core/slack-service';
import { generateSeedData, DEFAULT_SETTINGS } from '../src/core/mock-data';
import { calculateWeeklyRankings } from '../src/core/ranking';
import { calculateMonthlyRankings } from '../src/core/monthly-ranking';

describe('Slack Report Service', () => {
  const { employees, meetings, records, settings } = generateSeedData();

  it('generates 1-click Daily Standup Slack report with attendees and fine warning banner', () => {
    const standupMeeting = meetings.find((m) => m.type === 'standup')!;
    const meetRecords = records.filter((r) => r.meetingId === standupMeeting.id);

    const { payload, markdownText } = generateDailySlackReport(
      standupMeeting,
      meetRecords,
      employees,
      settings
    );

    expect(payload.channel).toBe('#daily-standup');
    expect(payload.blocks.length).toBeGreaterThan(3);

    // Markdown text must contain title, join times, and policy warning
    expect(markdownText).toContain('Daily Standup Report');
    expect(markdownText).toContain('Ali Hassan');
    expect(markdownText).toContain('Policy Notice:');
    expect(markdownText).toContain('Minus $WP balances result in payroll salary deductions');
  });

  it('generates Saturday Weekly Leaderboard Slack digest', () => {
    const suMeetings = meetings.filter((m) => m.type === 'standup');
    const suMeetingIds = new Set(suMeetings.map((m) => m.id));
    const suRecords = records.filter((r) => suMeetingIds.has(r.meetingId));

    const rankings = calculateWeeklyRankings(employees, suMeetings, suRecords, settings);
    const { payload, markdownText } = generateWeeklySlackReport('Sep 21 – Sep 27, 2026', rankings, settings);

    expect(markdownText).toContain('Saturday Weekly Leaderboard');
    expect(markdownText).toContain('Top 3 Punctuality Champions');
    expect(markdownText).toContain('Ali Hassan');
    expect(markdownText).toContain('Waqar Hussain');
    expect(markdownText).toContain('Not Eligible');
    expect(markdownText).toContain('payroll salary deductions');
  });

  it('generates Month-End Grand Champions Slack report', () => {
    const monthlyRankings = calculateMonthlyRankings(employees, meetings, records, settings, '2026-09');
    const { payload, markdownText } = generateMonthlySlackReport('September 2026', monthlyRankings, settings);

    expect(markdownText).toContain('Monthly Grand Champions');
    expect(markdownText).toContain('Grand Champion');
    expect(markdownText).toContain('Fine Deduction');
  });
});
