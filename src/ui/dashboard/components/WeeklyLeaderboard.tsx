import React, { useState } from 'react';
import { WeeklyEmployeeRanking, Settings, AttendanceRecord } from '../../../core/types';
import { Badge } from '../../../shared/components/Badge';
import { Tooltip } from '../../../shared/components/Tooltip';
import { formatTime12 } from '../../../core/date-utils';
import { IconTrophy, IconCrown, IconSearch, IconAlertTriangle, IconCheck, IconXCircle, IconClock, IconSparkles } from '../../../shared/icons';

export interface WeeklyLeaderboardProps {
  rankings: WeeklyEmployeeRanking[];
  settings: Settings;
  recordsInWeek?: AttendanceRecord[];
  onSelectEmployee: (empId: string) => void;
}

export const WeeklyLeaderboard: React.FC<WeeklyLeaderboardProps> = ({
  rankings,
  settings,
  recordsInWeek = [],
  onSelectEmployee,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'eligible' | 'ineligible'>('all');

  const eligibleTop3 = rankings.filter((r) => r.isEligible).slice(0, 3);

  const filteredRankings = rankings.filter((r) => {
    const matchesSearch =
      r.employee.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.employee.department && r.employee.department.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;
    if (filter === 'eligible') return r.isEligible;
    if (filter === 'ineligible') return !r.isEligible;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top 3 Podium Cards */}
      {eligibleTop3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 pt-2">
          {/* 2nd Place (Silver) */}
          {eligibleTop3[1] && (
            <div
              onClick={() => onSelectEmployee(eligibleTop3[1].employee.id)}
              className="order-2 md:order-1 relative bg-gradient-to-b from-slate-800/90 to-slate-850 border border-slate-700/80 rounded-2xl p-5 shadow-xl hover:border-slate-500 cursor-pointer transition transform hover:-translate-y-1"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-400 text-slate-900 font-black text-sm flex items-center justify-center shadow-lg">
                2
              </div>
              <div className="text-center mt-2">
                <div className="text-2xl mb-1">🥈</div>
                <h3 className="font-bold text-white text-base truncate">{eligibleTop3[1].employee.name}</h3>
                <p className="text-xs text-slate-400">{eligibleTop3[1].employee.department || 'Team Member'}</p>
                
                <div className="mt-4 pt-3 border-t border-slate-750 flex items-center justify-around text-center">
                  <div>
                    <span className="block text-lg font-black text-slate-200">
                      {eligibleTop3[1].netPoints.toFixed(1)} <span className="text-xs font-semibold text-brand-400">{settings.currencySymbol}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Score</span>
                  </div>
                  <div className="h-7 w-px bg-slate-700/60" />
                  <div>
                    <span className="block text-lg font-black text-emerald-400">
                      {eligibleTop3[1].averagePunctualityScore.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Punctuality Avg</span>
                  </div>
                  <div className="h-7 w-px bg-slate-700/60" />
                  <div>
                    <span className="block text-lg font-black text-blue-400">
                      {eligibleTop3[1].attendancePercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Attended</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place (Gold Champion) */}
          {eligibleTop3[0] && (
            <div
              onClick={() => onSelectEmployee(eligibleTop3[0].employee.id)}
              className="order-1 md:order-2 relative bg-gradient-to-b from-amber-500/10 via-slate-850 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl shadow-amber-500/10 hover:border-amber-400 cursor-pointer transition transform hover:-translate-y-1.5"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-base flex items-center justify-center shadow-lg shadow-amber-400/30">
                1
              </div>
              <div className="text-center mt-2">
                <div className="text-3xl mb-1 animate-bounce">🥇</div>
                <Badge variant="warning" size="sm" className="mb-1 font-bold">
                  Weekly Champion
                </Badge>
                <h3 className="font-extrabold text-white text-lg truncate">{eligibleTop3[0].employee.name}</h3>
                <p className="text-xs text-amber-200/70">{eligibleTop3[0].employee.department || 'Team Member'}</p>

                <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-around text-center">
                  <div>
                    <span className="block text-xl font-black text-amber-300">
                      {eligibleTop3[0].netPoints.toFixed(1)} <span className="text-xs font-semibold text-amber-400">{settings.currencySymbol}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Score</span>
                  </div>
                  <div className="h-7 w-px bg-amber-500/20" />
                  <div>
                    <span className="block text-xl font-black text-emerald-400">
                      {eligibleTop3[0].averagePunctualityScore.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Punctuality Avg</span>
                  </div>
                  <div className="h-7 w-px bg-amber-500/20" />
                  <div>
                    <span className="block text-xl font-black text-blue-400">
                      {eligibleTop3[0].attendancePercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Attended</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place (Bronze) */}
          {eligibleTop3[2] && (
            <div
              onClick={() => onSelectEmployee(eligibleTop3[2].employee.id)}
              className="order-3 relative bg-gradient-to-b from-slate-800/90 to-slate-850 border border-slate-700/80 rounded-2xl p-5 shadow-xl hover:border-slate-500 cursor-pointer transition transform hover:-translate-y-1"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center shadow-lg">
                3
              </div>
              <div className="text-center mt-2">
                <div className="text-2xl mb-1">🥉</div>
                <h3 className="font-bold text-white text-base truncate">{eligibleTop3[2].employee.name}</h3>
                <p className="text-xs text-slate-400">{eligibleTop3[2].employee.department || 'Team Member'}</p>

                <div className="mt-4 pt-3 border-t border-slate-750 flex items-center justify-around text-center">
                  <div>
                    <span className="block text-lg font-black text-slate-200">
                      {eligibleTop3[2].netPoints.toFixed(1)} <span className="text-xs font-semibold text-brand-400">{settings.currencySymbol}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Score</span>
                  </div>
                  <div className="h-7 w-px bg-slate-700/60" />
                  <div>
                    <span className="block text-lg font-black text-emerald-400">
                      {eligibleTop3[2].averagePunctualityScore.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Punctuality Avg</span>
                  </div>
                  <div className="h-7 w-px bg-slate-700/60" />
                  <div>
                    <span className="block text-lg font-black text-blue-400">
                      {eligibleTop3[2].attendancePercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Attended</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard Table Container */}
      <div className="bg-slate-850/80 border border-slate-750 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-750/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <IconTrophy className="w-5 h-5 text-brand-400" />
              Weekly Standings
            </h2>
            <p className="text-xs text-slate-400">
              Ranked by: Consistency (≥{settings.minimumAttendancePercentage}%) → Punctuality Avg → Attendance % → On-Time Count
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Search */}
            <div className="relative">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 w-44 sm:w-56"
              />
            </div>

            {/* Filter pills */}
            <div className="flex rounded-lg bg-slate-800 p-1 border border-slate-700 text-xs font-medium">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md transition ${filter === 'all' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All ({rankings.length})
              </button>
              <button
                onClick={() => setFilter('eligible')}
                className={`px-2.5 py-1 rounded-md transition ${filter === 'eligible' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Eligible ({rankings.filter((r) => r.isEligible).length})
              </button>
              <button
                onClick={() => setFilter('ineligible')}
                className={`px-2.5 py-1 rounded-md transition ${filter === 'ineligible' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Not Eligible ({rankings.filter((r) => !r.isEligible).length})
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-750 bg-slate-900/50 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4 text-center">Punctuality Avg</th>
                <th className="py-3 px-4 text-center">On Time / Late</th>
                <th className="py-3 px-4 text-right">Total {settings.currencySymbol}</th>
                <th className="py-3 px-4 text-center">Salary Fine</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRankings.map((row) => {
                const isTop3 = row.rank <= 3 && row.isEligible;
                const medal = row.rank === 1 && row.isEligible ? '🥇' : row.rank === 2 && row.isEligible ? '🥈' : row.rank === 3 && row.isEligible ? '🥉' : null;

                return (
                  <tr
                    key={row.employee.id}
                    onClick={() => onSelectEmployee(row.employee.id)}
                    className={`hover:bg-slate-800/50 cursor-pointer transition ${!row.isEligible ? 'bg-slate-900/40 opacity-80' : ''}`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center font-bold">
                      {medal ? (
                        <span className="text-base">{medal}</span>
                      ) : (
                        <span className={`inline-block w-6 h-6 rounded-full text-xs leading-6 text-center ${row.isEligible ? 'bg-slate-800 text-slate-300' : 'bg-slate-850 text-slate-500'}`}>
                          {row.rank}
                        </span>
                      )}
                    </td>

                    {/* Employee */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white hover:text-brand-400 transition flex items-center gap-2">
                        {row.employee.name}
                        {!row.isEligible && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                            Ineligible
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{row.employee.department || 'Team Member'}</div>
                      
                      {/* Join Timestamp Badge */}
                      {(() => {
                        const empRecs = recordsInWeek.filter((r) => r.employeeId === row.employee.id);
                        const joinWithTime = empRecs.find((r) => r.joinedAt);
                        if (joinWithTime && joinWithTime.joinedAt) {
                          return (
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono text-emerald-300">
                              <IconClock className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Joined: <strong>{formatTime12(joinWithTime.joinedAt)}</strong></span>
                              {joinWithTime.minutesLate > 0 ? (
                                <span className="text-amber-400 font-sans text-[10px] font-semibold">({joinWithTime.minutesLate}m late)</span>
                              ) : (
                                <span className="text-emerald-400 font-sans text-[10px] font-bold">(On Time)</span>
                              )}
                            </div>
                          );
                        }
                        if (empRecs.some((r) => r.status === 'absent')) {
                          return (
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-rose-400 font-mono">
                              <span>❌ Did not join (Absent)</span>
                            </div>
                          );
                        }
                        if (empRecs.some((r) => r.status === 'excused')) {
                          return (
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-cyan-300 font-mono">
                              <span>🌴 Approved Leave</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </td>

                    {/* Attendance Ratio & % */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${row.attendancePercentage >= 80 ? 'bg-emerald-500' : row.attendancePercentage >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, row.attendancePercentage)}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-200">{row.attendancePercentage}%</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {row.presentMeetings}/{row.totalScheduledMeetings} present {row.absentMeetings > 0 && `(${row.absentMeetings} absent)`}
                      </span>
                    </td>

                    {/* Punctuality Avg */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-sm font-extrabold ${row.averagePunctualityScore >= 4 ? 'text-emerald-400' : row.averagePunctualityScore >= 2 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {row.averagePunctualityScore.toFixed(1)}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {row.presentMeetings > 0 ? `across ${row.presentMeetings} mtgs` : 'no joins'}
                      </span>
                    </td>

                    {/* On Time / Late */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold">
                        <span className="text-emerald-400">{row.onTimeCount} on-time</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-amber-400">{row.lateCount} late</span>
                      </div>
                    </td>

                    {/* Total Net Points */}
                    <td className="py-3.5 px-4 text-right">
                      <span className={`text-sm font-black ${row.netPoints >= 0 ? 'text-brand-400' : 'text-rose-400'}`}>
                        {row.netPoints >= 0 ? `+${row.netPoints.toFixed(1)}` : row.netPoints.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">{settings.currencySymbol}</span>
                    </td>

                    {/* Salary Fine */}
                    <td className="py-3.5 px-4 text-center">
                      {row.salaryDeductionAmount > 0 ? (
                        <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          -{settings.salaryCurrency} {row.salaryDeductionAmount}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono">—</span>
                      )}
                    </td>

                    {/* Eligibility Badge with Tooltip */}
                    <td className="py-3.5 px-4 text-center">
                      {row.isEligible ? (
                        <Badge variant="success" size="sm" icon={<IconCheck className="w-3 h-3" />}>
                          Eligible
                        </Badge>
                      ) : (
                        <Tooltip content={row.ineligibilityReason || 'Attendance below required threshold'}>
                          <Badge variant="warning" size="sm" icon={<IconAlertTriangle className="w-3 h-3" />}>
                            Not Eligible
                          </Badge>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredRankings.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    No employees found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Policy Warning */}
        <div className="p-4 bg-slate-900/70 border-t border-slate-750/80 flex items-center gap-3 text-xs text-slate-400">
          <IconAlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <strong className="text-slate-200">Ranking Principle: </strong>
            Employees must attend at least <span className="text-amber-300 font-semibold">{settings.minimumAttendancePercentage}%</span> of scheduled meetings to qualify for the weekly Top 3 leaderboard. Negative 🪙 WP coin balances are deducted from monthly salary at <span className="text-rose-400 font-semibold">{settings.salaryCurrency} {settings.finePerMinusPoint}</span>/point.
          </div>
        </div>
      </div>
    </div>
  );
};
