import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Employee, Meeting, AttendanceStatus, Settings } from '../../../core/types';
import { Modal } from '../../../shared/components/Modal';
import { calculateAttendanceScore } from '../../../core/scoring';
import { IconAlertTriangle, IconCheck, IconClock } from '../../../shared/icons';

export interface ManualCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  employee: Employee | null;
  meeting: Meeting | null;
  settings: Settings;
  onSaveCorrection: (
    recordId: string,
    updates: {
      status?: AttendanceStatus;
      joinedAt?: string;
      dailyScore?: number;
      minutesLate?: number;
      isOnTime?: boolean;
      notes?: string;
    },
    changedBy: string,
    reason: string
  ) => Promise<void>;
}

export const ManualCorrectionModal: React.FC<ManualCorrectionModalProps> = ({
  isOpen,
  onClose,
  record,
  employee,
  meeting,
  settings,
  onSaveCorrection,
}) => {
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [joinTimeStr, setJoinTimeStr] = useState<string>('10:00:00');
  const [score, setScore] = useState<number>(5.0);
  const [changedBy, setChangedBy] = useState<string>('Admin');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record && meeting) {
      setStatus(record.status);
      setScore(record.dailyScore);
      setReason('');
      setError(null);
      if (record.joinedAt) {
        const d = new Date(record.joinedAt);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        setJoinTimeStr(`${hh}:${mm}:${ss}`);
      } else {
        const schedD = new Date(meeting.scheduledStart);
        const hh = String(schedD.getHours()).padStart(2, '0');
        const mm = String(schedD.getMinutes()).padStart(2, '0');
        const ss = String(schedD.getSeconds()).padStart(2, '0');
        setJoinTimeStr(`${hh}:${mm}:${ss}`);
      }
    }
  }, [record, meeting]);

  if (!record || !employee || !meeting) return null;

  const typeSettings = meeting.type === 'eod' ? settings.eod : settings.standup;

  const handleRecalculate = () => {
    const meetingDate = meeting.date;
    const fullIso = `${meetingDate}T${joinTimeStr}.000Z`;
    const res = calculateAttendanceScore(meeting.scheduledStart, fullIso, typeSettings, status);
    setScore(res.dailyScore);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for this audit adjustment.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const meetingDate = meeting.date;
      const fullIso = status === 'absent' || status === 'excused' ? undefined : `${meetingDate}T${joinTimeStr}.000Z`;
      const calc = calculateAttendanceScore(meeting.scheduledStart, fullIso, typeSettings, status);

      await onSaveCorrection(
        record.id,
        {
          status,
          joinedAt: fullIso,
          dailyScore: score,
          minutesLate: calc.minutesLate,
          isOnTime: calc.isOnTime,
          notes: `Adjusted by ${changedBy}: ${reason}`,
        },
        changedBy,
        reason
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-white">
          <IconClock className="w-5 h-5 text-brand-400" />
          <span>Manual Attendance Correction</span>
        </div>
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info banner */}
        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
          <div>Employee: <strong className="text-white">{employee.name}</strong></div>
          <div className="mt-1">Meeting: <strong className="text-slate-200">{meeting.title} ({meeting.date})</strong></div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <IconAlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Status selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Attendance Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
          >
            <option value="present">Present (On Time)</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused (No penalty)</option>
          </select>
        </div>

        {/* Join Time */}
        {status !== 'absent' && status !== 'excused' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Exact Join Time (HH:MM:SS)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinTimeStr}
                onChange={(e) => setJoinTimeStr(e.target.value)}
                placeholder="10:00:21"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={handleRecalculate}
                className="px-3 py-2 bg-slate-750 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-650 transition"
              >
                Auto-Calc
              </button>
            </div>
          </div>
        )}

        {/* Score in $WP */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Daily Score ({settings.currencySymbol})
          </label>
          <input
            type="number"
            step="0.5"
            value={score}
            onChange={(e) => setScore(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Changed by */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Administrator Name</label>
          <input
            type="text"
            value={changedBy}
            onChange={(e) => setChangedBy(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Mandatory Reason */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Reason for Adjustment <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Internet disruption during morning standup, verified joined at 10:01 AM"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            required
          />
          <span className="text-[10px] text-slate-500 mt-1 block">
            This adjustment will be recorded permanently in the audit trail.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-lg shadow-lg shadow-brand-600/20 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save & Record Audit Log'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
