import React from 'react';
import { Employee, WeeklyEmployeeRanking, AttendanceRecord, Meeting, Settings } from '../../../core/types';
import { Modal } from '../../../shared/components/Modal';
import { Badge } from '../../../shared/components/Badge';
import { formatDateLong, formatTime12 } from '../../../core/date-utils';
import { IconCheck, IconAlertTriangle, IconClock, IconCalendar, IconAward } from '../../../shared/icons';

export interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  ranking: WeeklyEmployeeRanking | null;
  records: AttendanceRecord[];
  meetings: Meeting[];
  settings: Settings;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  isOpen,
  onClose,
  employee,
  ranking,
  records,
  meetings,
  settings,
}) => {
  if (!employee) return null;

  const meetingMap = new Map(meetings.map((m) => [m.id, m]));
  const empRecords = records.filter((r) => r.employeeId === employee.id);

  // Sort records by meeting date DESC
  empRecords.sort((a, b) => {
    const mA = meetingMap.get(a.meetingId);
    const mB = meetingMap.get(b.meetingId);
    const dateA = mA ? new Date(mA.scheduledStart).getTime() : 0;
    const dateB = mB ? new Date(mB.scheduledStart).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-lg flex items-center justify-center">
            {employee.name.charAt(0)}
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              {employee.name}
              {ranking?.isEligible ? (
                <Badge variant="success" size="sm">
                  Eligible (Rank #{ranking.rank})
                </Badge>
              ) : (
                <Badge variant="warning" size="sm">
                  Not Eligible (Rank #{ranking?.rank || '-'})
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400">{employee.department || 'Team Member'} • {employee.email || 'webpenter.com'}</p>
          </div>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Metric Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Attendance %</span>
            <span className="text-xl font-black text-emerald-400">
              {ranking ? `${ranking.attendancePercentage}%` : '0%'}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {ranking?.presentMeetings || 0}/{ranking?.totalScheduledMeetings || 0} calls
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Punctuality Avg</span>
            <span className="text-xl font-black text-brand-400">
              {ranking?.averagePunctualityScore.toFixed(1) || '0.0'}
            </span>
            <span className="text-[10px] text-slate-400 block">present only</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total {settings.currencySymbol}</span>
            <span className={`text-xl font-black ${(ranking?.netPoints || 0) >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {(ranking?.netPoints || 0) >= 0 ? `+${ranking?.netPoints.toFixed(1)}` : ranking?.netPoints.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-400 block">net earned</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Salary Deduction</span>
            <span className={`text-xl font-black ${(ranking?.salaryDeductionAmount || 0) > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {(ranking?.salaryDeductionAmount || 0) > 0 ? `${settings.salaryCurrency} ${ranking?.salaryDeductionAmount}` : 'None'}
            </span>
            <span className="text-[10px] text-slate-400 block">negative points fine</span>
          </div>
        </div>

        {/* Punctuality Breakdown Pill */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <IconClock className="w-4 h-4 text-brand-400" />
            <span>Punctuality Breakdown:</span>
          </div>
          <div className="flex items-center gap-3 font-semibold">
            <span className="text-emerald-400">{ranking?.onTimeCount || 0} On Time</span>
            <span className="text-slate-600">•</span>
            <span className="text-amber-400">{ranking?.lateCount || 0} Late</span>
            <span className="text-slate-600">•</span>
            <span className="text-rose-400">{ranking?.absentMeetings || 0} Absent</span>
          </div>
        </div>

        {/* Meeting Attendance History List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <IconCalendar className="w-4 h-4 text-brand-400" />
            Meeting-by-Meeting History ({empRecords.length})
          </h4>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {empRecords.map((rec) => {
              const meeting = meetingMap.get(rec.meetingId);
              const title = meeting ? meeting.title : 'Standup Call';
              const dateStr = meeting ? formatDateLong(meeting.scheduledStart) : rec.createdAt.split('T')[0];
              const joinTime = rec.joinedAt ? formatTime12(rec.joinedAt) : 'Did not join';

              return (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-750 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-100 flex items-center gap-2">
                      <span>{rec.meetingType === 'eod' ? '🌆' : '☀️'} {title}</span>
                      <span className="text-[10px] text-slate-400">({dateStr})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Join Time: <strong className="text-slate-200">{joinTime}</strong>
                      {rec.notes && <span className="text-slate-400"> • {rec.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {rec.status === 'present' ? (
                      <Badge variant="success" size="sm">On Time</Badge>
                    ) : rec.status === 'late' ? (
                      <Badge variant="warning" size="sm">{rec.minutesLate}m Late</Badge>
                    ) : (
                      <Badge variant="danger" size="sm">Absent</Badge>
                    )}

                    <span className={`font-black text-sm min-w-[55px] text-right ${rec.dailyScore >= 0 ? 'text-brand-400' : 'text-rose-400'}`}>
                      {rec.dailyScore >= 0 ? `+${rec.dailyScore.toFixed(1)}` : rec.dailyScore.toFixed(1)} {settings.currencySymbol}
                    </span>
                  </div>
                </div>
              );
            })}

            {empRecords.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs">
                No attendance records logged for this employee.
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
