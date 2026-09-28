import { describe, it, expect } from 'vitest';
import { calculateMonthlyRankings } from '../src/core/monthly-ranking';
import { generateSeedData, DEFAULT_SETTINGS } from '../src/core/mock-data';

describe('Monthly Aggregation & Grand Podium', () => {
  it('aggregates multi-week standups and crowns Top 3 Monthly Grand Champions', () => {
    const { employees, meetings, records, settings } = generateSeedData();

    const monthlyRankings = calculateMonthlyRankings(
      employees,
      meetings,
      records,
      settings,
      '2026-09'
    );

    expect(monthlyRankings.length).toBe(employees.length);

    // Top 3 Winners must have isMonthlyWinner = true
    const grandWinners = monthlyRankings.filter((r) => r.isMonthlyWinner);
    expect(grandWinners.length).toBe(3);

    expect(monthlyRankings[0].rank).toBe(1);
    expect(monthlyRankings[0].rewardBadge).toContain('1st Place');
    expect(monthlyRankings[1].rank).toBe(2);
    expect(monthlyRankings[1].rewardBadge).toContain('2nd Place');
    expect(monthlyRankings[2].rank).toBe(3);
    expect(monthlyRankings[2].rewardBadge).toContain('3rd Place');
  });

  it('correctly calculates cumulative salary fine deductions for negative $WP balances', () => {
    const { employees, meetings, records, settings } = generateSeedData();

    const monthlyRankings = calculateMonthlyRankings(
      employees,
      meetings,
      records,
      settings,
      '2026-09'
    );

    // Find Ahmad Raza who has -5.0 scores on standups
    const ahmad = monthlyRankings.find((r) => r.employee.name === 'Ahmad Raza')!;
    expect(ahmad).toBeDefined();
    expect(ahmad.totalNegativeWP).toBeGreaterThan(0);
    expect(ahmad.totalSalaryDeduction).toBe(ahmad.totalNegativeWP * settings.finePerMinusPoint);
  });
});
