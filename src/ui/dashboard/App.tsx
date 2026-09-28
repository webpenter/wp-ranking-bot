import React, { useState, useEffect } from 'react';
import { repository } from '../../storage/repository';
import { Employee, Meeting, AttendanceRecord, Settings } from '../../core/types';
import { calculateWeeklyRankings, calculateWeekSummary } from '../../core/ranking';
import { calculateMonthlyRankings } from '../../core/monthly-ranking';
import { getWeekInfo, getMonthInfo } from '../../core/date-utils';
import { generateDailySlackReport, generateWeeklySlackReport, generateMonthlySlackReport, SlackPayload } from '../../core/slack-service';

// Components
import { Header } from './components/Header';
import { SummaryCards } from './components/SummaryCards';
import { WeeklyLeaderboard } from './components/WeeklyLeaderboard';
import { DailyMeetingView } from './components/DailyMeetingView';
import { MonthlyLeaderboard } from './components/MonthlyLeaderboard';
import { AdminSettings } from './components/AdminSettings';
import { AuditTrailView } from './components/AuditTrailView';
import { EmployeeProfileModal } from './components/EmployeeProfileModal';
import { ManualCorrectionModal } from './components/ManualCorrectionModal';
import { SlackShareModal } from './components/SlackShareModal';
import { AdminAuthModal } from './components/AdminAuthModal';

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Admin Security / Viewer Mode
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('wp_is_admin') === 'true';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<'settings' | 'audit' | null>(null);

  // Navigation
  const [currentTab, setCurrentTab] = useState<'weekly' | 'daily' | 'monthly' | 'settings' | 'audit'>('weekly');
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>('2026-W40');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('2026-09');

  // Modals state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<{
    record: AttendanceRecord;
    employee: Employee;
    meeting: Meeting;
  } | null>(null);
  const [slackModalData, setSlackModalData] = useState<{
    isOpen: boolean;
    title: string;
    data: { payload: SlackPayload; markdownText: string } | null;
  }>({
    isOpen: false,
    title: '',
    data: null,
  });

  const loadAllData = async () => {
    await repository.initialize();
    const [emps, meets, recs, stgs, logs] = await Promise.all([
      repository.getEmployees(),
      repository.getMeetings(),
      repository.getAttendanceRecords(),
      repository.getSettings(),
      repository.auditLogger.getAuditLogs(),
    ]);

    setEmployees(emps);
    setMeetings(meets);
    setRecords(recs);
    setSettings(stgs);
    setAuditLogs(logs);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-300 tracking-wide">Loading WebPenter Standup Leaderboard...</span>
        </div>
      </div>
    );
  }

  // Available Weeks & Months computed from meetings
  const weekMap = new Map<string, { weekKey: string; label: string }>();
  const monthMap = new Map<string, { monthKey: string; label: string }>();

  // Ensure current week (Sep 28 - Oct 4) and previous week (Sep 21 - 27) are present
  const currentWeek = getWeekInfo('2026-09-28', settings.weeklyCalculationDay);
  weekMap.set(currentWeek.weekKey, currentWeek);
  const prevWeek = getWeekInfo('2026-09-21', settings.weeklyCalculationDay);
  weekMap.set(prevWeek.weekKey, prevWeek);

  const defaultMonth = getMonthInfo('2026-09-28');
  monthMap.set(defaultMonth.monthKey, defaultMonth);

  meetings.forEach((m) => {
    const w = getWeekInfo(m.date, settings.weeklyCalculationDay);
    weekMap.set(w.weekKey, w);
    const mo = getMonthInfo(m.date);
    monthMap.set(mo.monthKey, mo);
  });

  const availableWeeks = Array.from(weekMap.values()).sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  const availableMonths = Array.from(monthMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  // Filter meetings & records for selected week
  const meetingsInWeek = meetings.filter((m) => {
    const { weekKey } = getWeekInfo(m.date, settings.weeklyCalculationDay);
    return weekKey === selectedWeekKey;
  });
  const meetingIdsInWeek = new Set(meetingsInWeek.map((m) => m.id));
  const recordsInWeek = records.filter((r) => meetingIdsInWeek.has(r.meetingId));

  // Compute Weekly Rankings & Summary
  const weeklyRankings = calculateWeeklyRankings(employees, meetingsInWeek, recordsInWeek, settings);
  const currentWeekInfo = availableWeeks.find((w) => w.weekKey === selectedWeekKey) || currentWeek;
  const weekSummary = calculateWeekSummary(weeklyRankings, meetingsInWeek, selectedWeekKey, currentWeekInfo.label);

  // Compute Monthly Rankings
  const meetingsInMonth = meetings.filter((m) => {
    const { monthKey } = getMonthInfo(m.date);
    return monthKey === selectedMonthKey;
  });
  const meetingIdsInMonth = new Set(meetingsInMonth.map((m) => m.id));
  const recordsInMonth = records.filter((r) => meetingIdsInMonth.has(r.meetingId));
  const currentMonthInfo = availableMonths.find((m) => m.monthKey === selectedMonthKey) || defaultMonth;
  const monthlyRankings = calculateMonthlyRankings(employees, meetingsInMonth, recordsInMonth, settings, selectedMonthKey);

  // Handlers
  const handleSaveSettings = async (newSettings: Settings) => {
    await repository.saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleSaveEmployee = async (emp: Employee) => {
    await repository.saveEmployee(emp);
    const emps = await repository.getEmployees();
    setEmployees(emps);
  };

  const handleDeleteEmployee = async (id: string) => {
    await repository.deleteEmployee(id);
    const emps = await repository.getEmployees();
    setEmployees(emps);
  };

  const handleResetSeedData = async () => {
    await repository.resetToSeedData();
    await loadAllData();
  };

  const handleManualAttendanceCorrection = async (
    recordId: string,
    updates: any,
    changedBy: string,
    reason: string
  ) => {
    await repository.manualAttendanceCorrection(recordId, updates, changedBy, reason);
    const [recs, logs] = await Promise.all([
      repository.getAttendanceRecords(),
      repository.auditLogger.getAuditLogs(),
    ]);
    setRecords(recs);
    setAuditLogs(logs);
  };

  const handleExportData = async () => {
    const jsonStr = await repository.exportFullDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webpenter-standup-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = async (jsonStr: string) => {
    const ok = await repository.importFullDataJSON(jsonStr);
    if (ok) await loadAllData();
    return ok;
  };

  // Slack Handlers
  const handleOpenWeeklySlack = () => {
    const data = generateWeeklySlackReport(currentWeekInfo.label, weeklyRankings, settings, recordsInWeek, meetingsInWeek);
    setSlackModalData({
      isOpen: true,
      title: `Weekly Leaderboard (${currentWeekInfo.label})`,
      data,
    });
  };

  const handleOpenDailySlack = (meeting: Meeting, meetRecords: AttendanceRecord[]) => {
    const data = generateDailySlackReport(meeting, meetRecords, employees, settings);
    setSlackModalData({
      isOpen: true,
      title: meeting.title,
      data,
    });
  };

  const handleOpenMonthlySlack = () => {
    const data = generateMonthlySlackReport(currentMonthInfo.label, monthlyRankings, settings);
    setSlackModalData({
      isOpen: true,
      title: `Monthly Grand Champions (${currentMonthInfo.label})`,
      data,
    });
  };

  // Admin handlers
  const handleToggleAdmin = () => {
    if (isAdmin) {
      sessionStorage.removeItem('wp_is_admin');
      setIsAdmin(false);
      if (currentTab === 'settings' || currentTab === 'audit') {
        setCurrentTab('weekly');
      }
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    sessionStorage.setItem('wp_is_admin', 'true');
    setIsAdmin(true);
    setIsAuthModalOpen(false);
    if (pendingTab) {
      setCurrentTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleTabChange = (tab: 'weekly' | 'daily' | 'monthly' | 'settings' | 'audit') => {
    if ((tab === 'settings' || tab === 'audit') && !isAdmin) {
      setPendingTab(tab);
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentTab(tab);
  };

  // Profile modal data
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId) || null;
  const selectedEmpRanking = weeklyRankings.find((r) => r.employee.id === selectedEmployeeId) || null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
      {/* App Header */}
      <Header
        currentTab={currentTab}
        onTabChange={handleTabChange}
        selectedWeekKey={selectedWeekKey}
        onWeekChange={setSelectedWeekKey}
        availableWeeks={availableWeeks}
        selectedMonthKey={selectedMonthKey}
        onMonthChange={setSelectedMonthKey}
        availableMonths={availableMonths}
        settings={settings}
        onOpenSlackShare={handleOpenWeeklySlack}
        isAdmin={isAdmin}
        onToggleAdmin={handleToggleAdmin}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Weekly Leaderboard View */}
        {currentTab === 'weekly' && (
          <div>
            <SummaryCards summary={weekSummary} settings={settings} />
            <WeeklyLeaderboard
              rankings={weeklyRankings}
              settings={settings}
              recordsInWeek={recordsInWeek}
              onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
            />
          </div>
        )}

        {/* Daily Standup & EOD View */}
        {currentTab === 'daily' && (
          <DailyMeetingView
            meetingsInWeek={meetingsInWeek}
            recordsInWeek={recordsInWeek}
            employees={employees}
            settings={settings}
            isAdmin={isAdmin}
            onSendSlackReport={handleOpenDailySlack}
            onManualEdit={(rec, emp, meet) => {
              if (isAdmin) {
                setCorrectionTarget({ record: rec, employee: emp, meeting: meet });
              } else {
                setIsAuthModalOpen(true);
              }
            }}
            onRequireAdmin={() => setIsAuthModalOpen(true)}
          />
        )}

        {/* Month-End Grand Winners View */}
        {currentTab === 'monthly' && (
          <MonthlyLeaderboard
            monthlyRankings={monthlyRankings}
            settings={settings}
            monthLabel={currentMonthInfo.label}
            isAdmin={isAdmin}
            onSendMonthlySlackReport={handleOpenMonthlySlack}
            onSelectEmployee={(empId) => setSelectedEmployeeId(empId)}
            onRequireAdmin={() => setIsAuthModalOpen(true)}
          />
        )}

        {/* Admin Settings View */}
        {currentTab === 'settings' && (
          <AdminSettings
            settings={settings}
            employees={employees}
            onSaveSettings={handleSaveSettings}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onResetSeedData={handleResetSeedData}
            onExportData={handleExportData}
            onImportData={handleImportData}
          />
        )}

        {/* Audit Trail View */}
        {currentTab === 'audit' && <AuditTrailView auditLogs={auditLogs} />}
      </main>

      {/* Modals */}
      <EmployeeProfileModal
        isOpen={selectedEmployeeId !== null}
        onClose={() => setSelectedEmployeeId(null)}
        employee={selectedEmployee}
        ranking={selectedEmpRanking}
        records={records}
        meetings={meetings}
        settings={settings}
      />

      <ManualCorrectionModal
        isOpen={correctionTarget !== null}
        onClose={() => setCorrectionTarget(null)}
        record={correctionTarget?.record || null}
        employee={correctionTarget?.employee || null}
        meeting={correctionTarget?.meeting || null}
        settings={settings}
        onSaveCorrection={handleManualAttendanceCorrection}
      />

      <SlackShareModal
        isOpen={slackModalData.isOpen}
        onClose={() => setSlackModalData({ isOpen: false, title: '', data: null })}
        reportTitle={slackModalData.title}
        slackData={slackModalData.data}
        settings={settings}
      />

      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingTab(null);
        }}
        onSuccess={handleAuthSuccess}
        correctPin={settings.adminPin || 'webpenter2026'}
      />
    </div>
  );
};
