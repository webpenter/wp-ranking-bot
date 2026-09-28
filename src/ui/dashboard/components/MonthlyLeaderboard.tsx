import React from 'react';
import { MonthlyEmployeeRanking, Settings } from '../../../core/types';
import { Badge } from '../../../shared/components/Badge';
import { IconAward, IconTrophy, IconCrown, IconSlack, IconAlertTriangle, IconSparkles } from '../../../shared/icons';

export interface MonthlyLeaderboardProps {
  monthlyRankings: MonthlyEmployeeRanking[];
  settings: Settings;
  monthLabel: string;
  onSendMonthlySlackReport: () => void;
  onSelectEmployee: (empId: string) => void;
}

export const MonthlyLeaderboard: React.FC<MonthlyLeaderboardProps> = ({
  monthlyRankings,
  settings,
  monthLabel,
  onSendMonthlySlackReport,
  onSelectEmployee,
}) => {
  const top3Winners = monthlyRankings.filter((r) => r.isMonthlyWinner);
  const totalDeductions = monthlyRankings.reduce((sum, r) => sum + r.totalSalaryDeduction, 0);
  const totalWPAccumulated = monthlyRankings.reduce((sum, r) => sum + r.totalWP, 0);

  return (
    <div className="space-y-6">
      {/* Month-End Grand Header & Slack Share */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-slate-850 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎉</span>
            <h2 className="text-xl font-black text-white tracking-tight">
              Month-End Grand Standup & EOD Awards
            </h2>
            <Badge variant="purple" size="sm">
              {monthLabel}
            </Badge>
          </div>
          <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl">
            Calculated across all completed weeks of the month. Company rewards are distributed to the Top 3 Grand Champions. Negative $WP balances reflect HR payroll salary deductions.
          </p>
        </div>

        <button
          onClick={onSendMonthlySlackReport}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 active:scale-95 shrink-0"
        >
          <IconSlack className="w-4 h-4" />
          <span>Send Month-End Report to Slack</span>
        </button>
      </div>

      {/* Grand Champions Podium */}
      {top3Winners.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          {top3Winners[1] && (
            <div
              onClick={() => onSelectEmployee(top3Winners[1].employee.id)}
              className="order-2 md:order-1 relative bg-gradient-to-b from-slate-800 to-slate-850 border border-slate-700 rounded-2xl p-5 shadow-xl text-center cursor-pointer hover:border-slate-500 transition"
            >
              <div className="text-3xl mb-1">🥈</div>
              <Badge variant="neutral" size="sm" className="mb-2">
                2nd Place Silver Winner
              </Badge>
              <h3 className="text-base font-bold text-white">{top3Winners[1].employee.name}</h3>
              <p className="text-xs text-slate-400">{top3Winners[1].employee.department || 'Team Member'}</p>

              <div className="mt-4 pt-3 border-t border-slate-750 grid grid-cols-3 text-center">
                <div>
                  <span className="block text-base font-black text-slate-200">{top3Winners[1].totalWP.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total {settings.currencySymbol}</span>
                </div>
                <div>
                  <span className="block text-base font-black text-emerald-400">{top3Winners[1].averagePunctualityScore.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Avg Score</span>
                </div>
                <div>
                  <span className="block text-base font-black text-blue-400">{top3Winners[1].attendancePercentage}%</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Attendance</span>
                </div>
              </div>
            </div>
          )}

          {/* 1st Place Grand Champion */}
          {top3Winners[0] && (
            <div
              onClick={() => onSelectEmployee(top3Winners[0].employee.id)}
              className="order-1 md:order-2 relative bg-gradient-to-b from-amber-500/20 via-slate-850 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl shadow-amber-500/10 text-center cursor-pointer hover:border-amber-400 transition transform hover:-translate-y-1"
            >
              <div className="text-4xl mb-1 animate-bounce">🥇</div>
              <Badge variant="warning" size="md" className="mb-2 font-bold">
                👑 Grand Champion of the Month
              </Badge>
              <h3 className="text-lg font-extrabold text-white">{top3Winners[0].employee.name}</h3>
              <p className="text-xs text-amber-200/80">{top3Winners[0].employee.department || 'Team Member'}</p>

              <div className="mt-4 pt-3 border-t border-amber-500/20 grid grid-cols-3 text-center">
                <div>
                  <span className="block text-lg font-black text-amber-300">{top3Winners[0].totalWP.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total {settings.currencySymbol}</span>
                </div>
                <div>
                  <span className="block text-lg font-black text-emerald-400">{top3Winners[0].averagePunctualityScore.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Avg Score</span>
                </div>
                <div>
                  <span className="block text-lg font-black text-blue-400">{top3Winners[0].attendancePercentage}%</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Attendance</span>
                </div>
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {top3Winners[2] && (
            <div
              onClick={() => onSelectEmployee(top3Winners[2].employee.id)}
              className="order-3 relative bg-gradient-to-b from-slate-800 to-slate-850 border border-slate-700 rounded-2xl p-5 shadow-xl text-center cursor-pointer hover:border-slate-500 transition"
            >
              <div className="text-3xl mb-1">🥉</div>
              <Badge variant="neutral" size="sm" className="mb-2">
                3rd Place Bronze Winner
              </Badge>
              <h3 className="text-base font-bold text-white">{top3Winners[2].employee.name}</h3>
              <p className="text-xs text-slate-400">{top3Winners[2].employee.department || 'Team Member'}</p>

              <div className="mt-4 pt-3 border-t border-slate-750 grid grid-cols-3 text-center">
                <div>
                  <span className="block text-base font-black text-slate-200">{top3Winners[2].totalWP.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total {settings.currencySymbol}</span>
                </div>
                <div>
                  <span className="block text-base font-black text-emerald-400">{top3Winners[2].averagePunctualityScore.toFixed(1)}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Avg Score</span>
                </div>
                <div>
                  <span className="block text-base font-black text-blue-400">{top3Winners[2].attendancePercentage}%</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Attendance</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Monthly HR & Payroll Summary Table */}
      <div className="bg-slate-850/90 border border-slate-750 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <IconTrophy className="w-5 h-5 text-indigo-400" />
              Monthly Rollup & Salary Fine Deductions
            </h3>
            <p className="text-xs text-slate-400">
              Aggregated across all standups & EOD calls in {monthLabel}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              Total Fines: <strong className="text-rose-400">{settings.salaryCurrency} {totalDeductions}</strong>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-750 bg-slate-900/50 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 w-14 text-center">Rank</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Monthly Attendance</th>
                <th className="py-3 px-4 text-center">Punctuality Avg</th>
                <th className="py-3 px-4 text-center">Weekly Breakdown</th>
                <th className="py-3 px-4 text-right">Total {settings.currencySymbol}</th>
                <th className="py-3 px-4 text-center">HR Fine Deduction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {monthlyRankings.map((row) => (
                <tr
                  key={row.employee.id}
                  onClick={() => onSelectEmployee(row.employee.id)}
                  className="hover:bg-slate-800/50 cursor-pointer transition"
                >
                  <td className="py-3.5 px-4 text-center font-bold">
                    {row.isMonthlyWinner ? (
                      <span className="text-base">
                        {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="inline-block w-6 h-6 rounded-full text-xs leading-6 text-center bg-slate-800 text-slate-400">
                        {row.rank}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white hover:text-brand-400 transition flex items-center gap-2">
                      {row.employee.name}
                      {row.isMonthlyWinner && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                          Company Reward
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{row.employee.department || 'Team Member'}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.attendancePercentage >= 80 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, row.attendancePercentage)}%` }}
                        />
                      </div>
                      <span className="font-bold text-slate-200">{row.attendancePercentage}%</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {row.presentMeetings}/{row.totalScheduledMeetings} calls attended
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center font-extrabold text-slate-200">
                    {row.averagePunctualityScore.toFixed(1)}
                  </td>

                  {/* Weekly breakdown badges */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {row.weeklyBreakdown.map((wb, idx) => (
                        <span
                          key={idx}
                          title={`${wb.weekLabel}: ${wb.pointsWP} $WP (${wb.attendancePct}% att)`}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            wb.pointsWP >= 15 ? 'bg-emerald-500/20 text-emerald-400' : wb.pointsWP >= 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          W{idx + 1}: {wb.pointsWP >= 0 ? `+${wb.pointsWP.toFixed(0)}` : wb.pointsWP.toFixed(0)}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right font-black text-slate-100">
                    <span className={row.totalWP >= 0 ? 'text-brand-400' : 'text-rose-400'}>
                      {row.totalWP >= 0 ? `+${row.totalWP.toFixed(1)}` : row.totalWP.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{settings.currencySymbol}</span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {row.totalSalaryDeduction > 0 ? (
                      <span className="text-xs font-bold text-rose-400 bg-rose-500/15 px-2.5 py-1 rounded-md border border-rose-500/30">
                        -{settings.salaryCurrency} {row.totalSalaryDeduction}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Clean Record
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
