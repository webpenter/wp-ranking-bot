import React from 'react';
import { WeekSummary, Settings } from '../../../core/types';
import { IconUsers, IconCalendar, IconTrophy, IconAward, IconAlertTriangle, IconSparkles } from '../../../shared/icons';

export interface SummaryCardsProps {
  summary: WeekSummary;
  settings: Settings;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, settings }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-6">
      {/* Total Employees */}
      <div className="bg-slate-800/60 border border-slate-750/70 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Team Size</span>
          <IconUsers className="w-4 h-4 text-brand-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-white tracking-tight">{summary.totalEmployees}</span>
          <span className="text-xs text-slate-400">active</span>
        </div>
      </div>

      {/* Avg Attendance */}
      <div className="bg-slate-800/60 border border-slate-750/70 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Avg Attendance</span>
          <IconCalendar className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-emerald-400 tracking-tight">
            {summary.averageAttendancePercentage}%
          </span>
          <span className="text-xs text-slate-400">rate</span>
        </div>
      </div>

      {/* Meetings Held */}
      <div className="bg-slate-800/60 border border-slate-750/70 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Meetings Held</span>
          <IconCalendar className="w-4 h-4 text-purple-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-purple-300 tracking-tight">{summary.meetingsHeld}</span>
          <span className="text-xs text-slate-400">calls</span>
        </div>
      </div>

      {/* Eligible Employees */}
      <div className="bg-slate-800/60 border border-slate-750/70 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Eligible (≥{settings.minimumAttendancePercentage}%)</span>
          <IconAward className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-amber-300 tracking-tight">
            {summary.eligibleEmployeesCount}
          </span>
          <span className="text-xs text-slate-400">/ {summary.totalEmployees}</span>
        </div>
      </div>

      {/* Total $WP Awarded */}
      <div className="bg-slate-800/60 border border-slate-750/70 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Total {settings.currencySymbol}</span>
          <IconSparkles className="w-4 h-4 text-brand-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-brand-400 tracking-tight">
            +{summary.totalWPEarned.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400">{settings.currencySymbol}</span>
        </div>
      </div>

      {/* Total Fines / Deductions */}
      <div className="bg-slate-800/60 border border-slate-750/70 rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Salary Deductions</span>
          <IconAlertTriangle className="w-4 h-4 text-rose-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-rose-400 tracking-tight">
            {summary.totalFinesDeducted > 0 ? `${settings.salaryCurrency} ${summary.totalFinesDeducted}` : 'None'}
          </span>
        </div>
      </div>
    </div>
  );
};
