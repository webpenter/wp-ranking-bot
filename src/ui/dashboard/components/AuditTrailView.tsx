import React, { useState } from 'react';
import { AuditLogEntry } from '../../../core/types';
import { formatDateLong, formatTime12 } from '../../../core/date-utils';
import { IconUsers, IconSearch, IconAlertCircle, IconClock } from '../../../shared/icons';

export interface AuditTrailViewProps {
  auditLogs: AuditLogEntry[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ auditLogs }) => {
  const [search, setSearch] = useState('');

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      log.changedBy.toLowerCase().includes(search.toLowerCase()) ||
      log.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-850 border border-slate-750 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/40">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <IconUsers className="w-5 h-5 text-brand-400" />
              Administrative Audit Trail
            </h2>
            <p className="text-xs text-slate-400">
              Immutable history of manual attendance score corrections and status changes
            </p>
          </div>

          <div className="relative">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-750 bg-slate-900/50 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Meeting Date</th>
                <th className="py-3 px-4">Changed By</th>
                <th className="py-3 px-4">Adjustment Details</th>
                <th className="py-3 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => {
                const dateObj = new Date(log.timestamp);
                const timeStr = formatTime12(dateObj);
                const dateStr = formatDateLong(dateObj);

                return (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                      <div>{dateStr}</div>
                      <div className="text-[10px] text-slate-500">{timeStr}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white">
                      {log.employeeName}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {log.meetingDate} ({log.meetingType === 'eod' ? 'EOD' : 'Standup'})
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-brand-300">
                      {log.changedBy}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Status:</span>
                        <span className="line-through text-rose-400 font-mono">{log.oldValue.status || 'N/A'}</span>
                        <span>→</span>
                        <span className="text-emerald-400 font-bold font-mono">{log.newValue.status || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-400">Score:</span>
                        <span className="line-through text-slate-400 font-mono">{log.oldValue.dailyScore ?? 'N/A'}</span>
                        <span>→</span>
                        <span className="text-amber-300 font-bold font-mono">{log.newValue.dailyScore ?? 'N/A'} 🪙 WP</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300 max-w-xs">
                      {log.reason}
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                    No audit records logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
