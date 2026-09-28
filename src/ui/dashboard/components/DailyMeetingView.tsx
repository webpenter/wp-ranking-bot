import React, { useState } from 'react';
import { Meeting, AttendanceRecord, Employee, Settings, MeetingType } from '../../../core/types';
import { Badge } from '../../../shared/components/Badge';
import { formatDateLong, formatTime12 } from '../../../core/date-utils';
import { IconClock, IconSlack, IconCheck, IconAlertTriangle, IconEdit, IconUsers, IconSparkles } from '../../../shared/icons';

export interface DailyMeetingViewProps {
  meetingsInWeek: Meeting[];
  recordsInWeek: AttendanceRecord[];
  employees: Employee[];
  settings: Settings;
  isAdmin: boolean;
  onSendSlackReport: (meeting: Meeting, records: AttendanceRecord[]) => void;
  onManualEdit: (record: AttendanceRecord, employee: Employee, meeting: Meeting) => void;
  onRequireAdmin: () => void;
}

export const DailyMeetingView: React.FC<DailyMeetingViewProps> = ({
  meetingsInWeek,
  recordsInWeek,
  employees,
  settings,
  isAdmin,
  onSendSlackReport,
  onManualEdit,
  onRequireAdmin,
}) => {
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<MeetingType>('standup');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');

  // Filter meetings by type (standup / eod)
  const filteredMeetings = meetingsInWeek.filter((m) => m.type === meetingTypeFilter);

  // Auto-select first meeting if none selected or type changed
  const currentMeeting =
    filteredMeetings.find((m) => m.id === selectedMeetingId) ||
    filteredMeetings[0] ||
    meetingsInWeek[0];

  const currentRecords = currentMeeting
    ? recordsInWeek.filter((r) => r.meetingId === currentMeeting.id)
    : [];

  const empMap = new Map(employees.map((e) => [e.id, e]));

  // Split attendees into present (on-time & late) and absent/excused
  const presentRecords = currentRecords.filter((r) => r.status === 'present' || r.status === 'late');
  const absentRecords = currentRecords.filter((r) => r.status === 'absent');
  const excusedRecords = currentRecords.filter((r) => r.status === 'excused');

  // Sort present attendees:
  // 1. Daily score DESC
  // 2. JoinedAt ASC
  presentRecords.sort((a, b) => {
    if (b.dailyScore !== a.dailyScore) return b.dailyScore - a.dailyScore;
    const aTime = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
    const bTime = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
    return aTime - bTime;
  });

  const onTimeCount = presentRecords.filter((r) => r.isOnTime).length;
  const lateCount = presentRecords.filter((r) => !r.isOnTime).length;
  const totalEmployees = employees.filter((e) => e.active).length;
  const attendancePct = totalEmployees > 0 ? Math.round((presentRecords.length / totalEmployees) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Type Toggle & Day Selector */}
      <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        {/* Type Toggle: Standup vs EOD */}
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-750">
          <button
            onClick={() => {
              setMeetingTypeFilter('standup');
              const firstSu = meetingsInWeek.find((m) => m.type === 'standup');
              if (firstSu) setSelectedMeetingId(firstSu.id);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              meetingTypeFilter === 'standup'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>☀️ Morning Standup</span>
            <span className="text-[11px] opacity-75 font-mono">({settings.standup.startTime.substring(0, 5)})</span>
          </button>

          <button
            onClick={() => {
              setMeetingTypeFilter('eod');
              const firstEod = meetingsInWeek.find((m) => m.type === 'eod');
              if (firstEod) setSelectedMeetingId(firstEod.id);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              meetingTypeFilter === 'eod'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌆 End of Day (EOD)</span>
            <span className="text-[11px] opacity-75 font-mono">({settings.eod.startTime.substring(0, 5)})</span>
          </button>
        </div>

        {/* Meeting Day Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {filteredMeetings.map((m) => {
            const isSelected = currentMeeting?.id === m.id;
            const dateObj = new Date(m.scheduledStart);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = dateObj.getDate();

            return (
              <button
                key={m.id}
                onClick={() => setSelectedMeetingId(m.id)}
                className={`flex flex-col items-center min-w-[62px] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  isSelected
                    ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                    : 'bg-slate-800 border-slate-700/60 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <span className="text-[10px] uppercase font-bold opacity-80">{dayName}</span>
                <span className="text-sm font-black">{dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {currentMeeting ? (
        <div className="bg-slate-850/90 border border-slate-750 rounded-2xl overflow-hidden shadow-xl">
          {/* Meeting Banner */}
          <div className="p-5 border-b border-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/40">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl">
                  {currentMeeting.type === 'eod' ? '🌆' : '🏆'}
                </span>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {currentMeeting.title}
                </h2>
                <Badge variant={currentMeeting.type === 'eod' ? 'purple' : 'info'} size="sm">
                  {currentMeeting.type === 'eod' ? 'EOD Call' : 'Daily Standup'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                <span>📅 {formatDateLong(currentMeeting.scheduledStart)}</span>
                <span>•</span>
                <span>⏰ Scheduled: <strong className="text-slate-200">{formatTime12(currentMeeting.scheduledStart)}</strong></span>
                <span>•</span>
                <span>Grace: <strong className="text-emerald-400">{currentMeeting.type === 'eod' ? settings.eod.gracePeriodMinutes : settings.standup.gracePeriodMinutes}m</strong></span>
              </p>
            </div>

            {/* Actions: Send to Slack */}
            {isAdmin ? (
              <button
                onClick={() => onSendSlackReport(currentMeeting, currentRecords)}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 active:scale-95 shrink-0"
              >
                <IconSlack className="w-4 h-4" />
                <span>Send Report to Slack</span>
              </button>
            ) : (
              <button
                onClick={onRequireAdmin}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700 transition"
                title="Click to enter Admin PIN and broadcast to Slack"
              >
                <span>🔒 Send to Slack</span>
              </button>
            )}
          </div>

          {/* Metrics summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800 bg-slate-900/40 border-b border-slate-750">
            <div className="p-3.5 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">Attendance</span>
              <span className="text-lg font-black text-white">
                {presentRecords.length}/{totalEmployees} <span className="text-xs font-semibold text-emerald-400">({attendancePct}%)</span>
              </span>
            </div>
            <div className="p-3.5 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">On Time</span>
              <span className="text-lg font-black text-emerald-400">
                {onTimeCount} <span className="text-xs font-normal text-slate-400">joined</span>
              </span>
            </div>
            <div className="p-3.5 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">Late</span>
              <span className="text-lg font-black text-amber-400">
                {lateCount} <span className="text-xs font-normal text-slate-400">attendees</span>
              </span>
            </div>
            <div className="p-3.5 text-center">
              <span className="text-[11px] text-slate-400 uppercase font-semibold block">Absent / Missing</span>
              <span className="text-lg font-black text-rose-400">
                {absentRecords.length} <span className="text-xs font-normal text-slate-400">{currentMeeting.type === 'eod' ? '(-5 🪙 WP each)' : ''}</span>
              </span>
            </div>
          </div>

          {/* Attendees List */}
          <div className="p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <IconUsers className="w-4 h-4 text-brand-400" />
              Attendees & Join Timestamps
            </h3>

            <div className="space-y-2.5">
              {presentRecords.map((rec, idx) => {
                const emp = empMap.get(rec.employeeId);
                const name = emp ? emp.name : 'Unknown';
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                const joinTime = rec.joinedAt ? formatTime12(rec.joinedAt) : 'N/A';

                return (
                  <div
                    key={rec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-800/60 border border-slate-750/70 hover:border-slate-650 transition gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 text-center font-bold text-sm text-slate-300">
                        {medal}
                      </span>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          {name}
                          {idx < 3 && settings.enableDailyTop3Bonus && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              +{settings.dailyTop3BonusPoints[idx]} {settings.currencySymbol} Bonus
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <IconClock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Joined: <strong className="text-emerald-300 font-bold text-xs">{joinTime}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0">
                      {rec.isOnTime ? (
                        <Badge variant="success" size="sm" icon={<IconCheck className="w-3 h-3" />}>
                          On Time
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm" icon={<IconAlertTriangle className="w-3 h-3" />}>
                          {rec.minutesLate} min late
                        </Badge>
                      )}

                      <span className={`text-base font-black ${rec.dailyScore >= 0 ? 'text-amber-300' : 'text-rose-400'} min-w-[70px] text-right`}>
                        {rec.dailyScore >= 0 ? `+${rec.dailyScore.toFixed(1)}` : rec.dailyScore.toFixed(1)} <span className="text-xs font-semibold text-slate-300">{settings.currencySymbol}</span>
                      </span>

                      {/* Admin edit button */}
                      {emp && isAdmin && (
                        <button
                          onClick={() => onManualEdit(rec, emp, currentMeeting)}
                          title="Manual Admin Edit"
                          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700/60 rounded-lg transition"
                        >
                          <IconEdit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {presentRecords.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No attendees have joined this meeting yet.
                </div>
              )}
            </div>

            {/* Absent List */}
            {absentRecords.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-750">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-2">
                  <IconAlertTriangle className="w-4 h-4" />
                  Missing / Absent Members ({absentRecords.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {absentRecords.map((rec) => {
                    const emp = empMap.get(rec.employeeId);
                    const name = emp ? emp.name : 'Unknown';

                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/30 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-rose-200 block">{name}</span>
                          <span className="text-[10px] text-rose-400">
                            {rec.dailyScore < 0 ? `${rec.dailyScore.toFixed(1)} ${settings.currencySymbol} penalty • Did not join` : 'Unexcused Absent • Did not join'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {emp && (
                            <button
                              onClick={() => {
                                if (isAdmin) {
                                  onManualEdit(rec, emp, currentMeeting);
                                } else {
                                  onRequireAdmin();
                                }
                              }}
                              title={isAdmin ? "Mark as Approved Leave or Adjust" : "Enter Admin PIN to edit"}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition"
                            >
                              {isAdmin ? <IconEdit className="w-3 h-3" /> : <span>🔒</span>}
                              <span>Edit / Leave</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Approved Leave List */}
            {excusedRecords.length > 0 && (
              <div className="mt-6 pt-5 border-t border-slate-750">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                  <span>🌴</span>
                  Approved Leave / Excused ({excusedRecords.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {excusedRecords.map((rec) => {
                    const emp = empMap.get(rec.employeeId);
                    const name = emp ? emp.name : 'Unknown';

                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-cyan-200 block">{name}</span>
                          <span className="text-[10px] text-cyan-400">
                            Approved Leave (0 {settings.currencySymbol} • Excluded from denominator)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {emp && (
                            <button
                              onClick={() => {
                                if (isAdmin) {
                                  onManualEdit(rec, emp, currentMeeting);
                                } else {
                                  onRequireAdmin();
                                }
                              }}
                              title={isAdmin ? "Edit Record" : "Enter Admin PIN to edit"}
                              className="p-1 text-slate-400 hover:text-slate-200"
                            >
                              {isAdmin ? <IconEdit className="w-3.5 h-3.5" /> : <span className="text-xs">🔒</span>}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Fine Notice */}
          <div className="p-4 bg-slate-900/60 border-t border-slate-750 flex items-center gap-2.5 text-xs text-slate-400">
            <IconAlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {currentMeeting.type === 'eod'
                ? `Missing EOD incurs a mandatory penalty of ${settings.eod.absentScore} ${settings.currencySymbol}. Negative points equal salary deductions.`
                : `Grace period is ${settings.standup.gracePeriodMinutes} minutes. After grace, late penalty is ${settings.standup.latePenalty} ${settings.currencySymbol}/min down to ${settings.standup.minimumDailyScore} ${settings.currencySymbol} floor.`}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-400 bg-slate-850 rounded-2xl border border-slate-750">
          No scheduled meetings found for this date.
        </div>
      )}
    </div>
  );
};
