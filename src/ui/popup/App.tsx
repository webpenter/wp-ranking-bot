import React, { useState, useEffect } from 'react';
import { repository } from '../../storage/repository';
import { Settings, Meeting, AttendanceRecord, Employee } from '../../core/types';
import { formatTime12, formatDateShort } from '../../core/date-utils';
import { generateDailySlackReport, SlackPayload } from '../../core/slack-service';
import { IconTrophy, IconClock, IconSlack, IconCheck, IconAlertTriangle } from '../../shared/icons';
import { SlackShareModal } from '../dashboard/components/SlackShareModal';

export const PopupApp: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [todayMeeting, setTodayMeeting] = useState<Meeting | null>(null);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [slackModal, setSlackModal] = useState<{
    isOpen: boolean;
    title: string;
    data: { payload: SlackPayload; markdownText: string } | null;
  }>({
    isOpen: false,
    title: '',
    data: null,
  });

  useEffect(() => {
    async function loadData() {
      await repository.initialize();
      const [stgs, meets, recs, emps] = await Promise.all([
        repository.getSettings(),
        repository.getMeetings(),
        repository.getAttendanceRecords(),
        repository.getEmployees(),
      ]);

      setSettings(stgs);
      setEmployees(emps);

      // Determine today's meeting (Standup vs EOD)
      const now = new Date();
      const currentHour = now.getHours();
      const isEod = currentHour >= 16;
      const meetingType = isEod ? 'eod' : 'standup';
      const typeSettings = isEod ? stgs.eod : stgs.standup;
      const todayStr = now.toISOString().split('T')[0];

      let meetToday = meets.find((m) => m.date === todayStr && m.type === meetingType);
      if (!meetToday && typeSettings.enabled) {
        const scheduledIso = `${todayStr}T${typeSettings.startTime}+05:00`;
        meetToday = {
          id: `meet-${meetingType}-${todayStr}`,
          code: 'meet.google.com/jns-arbs-nyv',
          title: isEod ? `Daily EOD — ${formatDateShort(todayStr)}` : `Daily Standup — ${formatDateShort(todayStr)}`,
          type: meetingType,
          date: todayStr,
          scheduledStart: scheduledIso,
          scheduledEnd: scheduledIso,
          status: 'completed',
          timezone: 'Asia/Karachi',
          createdAt: now.toISOString(),
        };
        await repository.saveMeeting(meetToday);
      }

      if (!meetToday) {
        meetToday = meets[meets.length - 1];
      }

      if (meetToday) {
        setTodayMeeting(meetToday);
        const allRecords = await repository.getAttendanceRecords();
        const mRecs = allRecords.filter((r) => r.meetingId === meetToday.id);
        setTodayRecords(mRecs);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const openFullDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    } else {
      window.open('./index.html', '_blank');
    }
  };

  const handleSlackShare = () => {
    if (!todayMeeting || !settings) return;
    const data = generateDailySlackReport(todayMeeting, todayRecords, employees, settings);
    setSlackModal({
      isOpen: true,
      title: todayMeeting.title,
      data,
    });
  };

  if (loading || !settings) {
    return (
      <div className="p-6 text-center text-xs text-slate-400">
        Loading WebPenter Standup...
      </div>
    );
  }

  const presentCount = todayRecords.filter((r) => r.status === 'present' || r.status === 'late').length;
  const onTimeCount = todayRecords.filter((r) => r.isOnTime).length;
  const lateCount = todayRecords.filter((r) => !r.isOnTime && (r.status === 'present' || r.status === 'late')).length;
  const totalEmployees = employees.filter((e) => e.active).length;

  return (
    <div className="p-4 space-y-4 bg-slate-900 text-slate-100 antialiased text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 text-white font-black text-xs flex items-center justify-center">
            WP
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">WebPenter Meet</h1>
            <span className="text-[10px] text-slate-400">Standup & EOD Tracker</span>
          </div>
        </div>

        <button
          onClick={openFullDashboard}
          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-brand-300 rounded-lg border border-slate-700 transition"
        >
          Open Dashboard ↗
        </button>
      </div>

      {/* Today's Status Box */}
      {todayMeeting ? (
        <div className="bg-slate-850 border border-slate-750 rounded-xl p-3.5 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <span>{todayMeeting.type === 'eod' ? '🌆' : '☀️'}</span>
              <span>{todayMeeting.title}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {formatTime12(todayMeeting.scheduledStart)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800">
            <div className="p-2 rounded-lg bg-slate-900/60">
              <span className="text-[10px] text-slate-400 block font-semibold">Present</span>
              <span className="text-sm font-black text-white">
                {presentCount}/{totalEmployees}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60">
              <span className="text-[10px] text-slate-400 block font-semibold">On-Time</span>
              <span className="text-sm font-black text-emerald-400">{onTimeCount}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60">
              <span className="text-[10px] text-slate-400 block font-semibold">Late</span>
              <span className="text-sm font-black text-amber-400">{lateCount}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-400">
              Grace Period: <strong className="text-emerald-400">{todayMeeting.type === 'eod' ? settings.eod.gracePeriodMinutes : settings.standup.gracePeriodMinutes} min</strong>
            </span>
            <button
              onClick={handleSlackShare}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition"
            >
              <IconSlack className="w-3.5 h-3.5" />
              <span>Slack Report</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-850 rounded-xl text-center text-slate-400">
          No standup scheduled for today.
        </div>
      )}

      {/* Policy reminder */}
      <div className="p-2.5 bg-slate-850/60 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-start gap-2">
        <IconAlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span>
          Consistency first: Minimum <strong className="text-amber-300">{settings.minimumAttendancePercentage}%</strong> attendance required for weekly Top 3 qualification. Minus 🪙 WP coins equal salary deductions.
        </span>
      </div>

      <SlackShareModal
        isOpen={slackModal.isOpen}
        onClose={() => setSlackModal({ isOpen: false, title: '', data: null })}
        reportTitle={slackModal.title}
        slackData={slackModal.data}
        settings={settings}
      />
    </div>
  );
};
