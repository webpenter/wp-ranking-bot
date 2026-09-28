import React, { useState } from 'react';
import { Settings, Employee } from '../../../core/types';
import { sendSlackWebhook } from '../../../core/slack-service';
import { IconSlack, IconUsers, IconAlertTriangle, IconCheck, IconRefresh, IconEdit } from '../../../shared/icons';
import { Modal } from '../../../shared/components/Modal';

export interface AdminSettingsProps {
  settings: Settings;
  employees: Employee[];
  onSaveSettings: (newSettings: Settings) => Promise<void>;
  onSaveEmployee: (employee: Employee) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onResetSeedData: () => Promise<void>;
  onExportData: () => Promise<void>;
  onImportData: (jsonStr: string) => Promise<boolean>;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  employees,
  onSaveSettings,
  onSaveEmployee,
  onDeleteEmployee,
  onResetSeedData,
  onExportData,
  onImportData,
}) => {
  const [currentSettingsTab, setCurrentSettingsTab] = useState<'standup' | 'eod' | 'leaderboard' | 'slack' | 'employees' | 'data'>('standup');
  const [formSettings, setFormSettings] = useState<Settings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // New Employee state
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpDept, setNewEmpDept] = useState('Engineering');

  // Edit Employee state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const DAYS = [
    { idx: 1, name: 'Monday' },
    { idx: 2, name: 'Tuesday' },
    { idx: 3, name: 'Wednesday' },
    { idx: 4, name: 'Thursday' },
    { idx: 5, name: 'Friday' },
    { idx: 6, name: 'Saturday' },
    { idx: 0, name: 'Sunday' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    await onSaveSettings(formSettings);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleToggleDay = (type: 'standup' | 'eod', dayIdx: number) => {
    const currentDays = [...formSettings[type].activeDays];
    const exists = currentDays.includes(dayIdx);
    const updatedDays = exists
      ? currentDays.filter((d) => d !== dayIdx)
      : [...currentDays, dayIdx].sort((a, b) => a - b);

    setFormSettings({
      ...formSettings,
      [type]: {
        ...formSettings[type],
        activeDays: updatedDays,
      },
    });
  };

  const handleTestSlack = async () => {
    setTestResult(null);
    if (!formSettings.slackWebhookUrl) {
      setTestResult({
        success: false,
        message: 'Please enter a Slack Webhook URL first.',
      });
      return;
    }

    const payload = {
      channel: formSettings.slackChannel || '#standup',
      text: '🔔 Test notification from WebPenter Meet Standup & EOD Extension!',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔔 WebPenter Slack Connection Test',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Your Slack Webhook integration is working successfully! Standup & EOD reports will be sent to this channel.',
          },
        },
      ],
    };

    const res = await sendSlackWebhook(formSettings.slackWebhookUrl, payload);
    setTestResult(res);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      name: newEmpName.trim(),
      email: newEmpEmail.trim() || undefined,
      department: newEmpDept,
      active: true,
      createdAt: new Date().toISOString(),
    };

    await onSaveEmployee(newEmp);
    setNewEmpName('');
    setNewEmpEmail('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-850 border border-slate-750 rounded-2xl overflow-hidden shadow-xl">
        {/* Settings Sub-nav */}
        <div className="flex items-center gap-1.5 p-3 sm:p-4 border-b border-slate-750 bg-slate-900/60 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setCurrentSettingsTab('standup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentSettingsTab === 'standup' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            ☀️ Standup Rules
          </button>
          <button
            onClick={() => setCurrentSettingsTab('eod')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentSettingsTab === 'eod' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            🌆 EOD Rules
          </button>
          <button
            onClick={() => setCurrentSettingsTab('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentSettingsTab === 'leaderboard' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Leaderboard & Salary Fines
          </button>
          <button
            onClick={() => setCurrentSettingsTab('slack')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentSettingsTab === 'slack' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            💬 Slack Webhook
          </button>
          <button
            onClick={() => setCurrentSettingsTab('employees')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentSettingsTab === 'employees' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Team Management
          </button>
          <button
            onClick={() => setCurrentSettingsTab('data')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              currentSettingsTab === 'data' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            💾 Data & Reset
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {/* TAB 1: STANDUP RULES */}
          {currentSettingsTab === 'standup' && (
            <div className="space-y-5 max-w-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Morning Standup Scoring & Schedule
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Standup Start Time</label>
                  <input
                    type="text"
                    value={formSettings.standup.startTime}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        standup: { ...formSettings.standup, startTime: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">24-hour format e.g. 10:00:00</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">On-Time Score ($WP)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formSettings.standup.onTimeScore}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        standup: { ...formSettings.standup, onTimeScore: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formSettings.standup.gracePeriodMinutes}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        standup: { ...formSettings.standup, gracePeriodMinutes: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Employees within grace receive full on-time score.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Late Penalty ($WP/Minute)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formSettings.standup.latePenalty}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        standup: { ...formSettings.standup, latePenalty: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Deducted per minute after grace period.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Minimum Daily Score Floor ($WP)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formSettings.standup.minimumDailyScore}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        standup: { ...formSettings.standup, minimumDailyScore: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold text-rose-400 focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Scores can NEVER fall below this floor (e.g. -5.0).</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Absent Standup Score ($WP)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formSettings.standup.absentScore}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        standup: { ...formSettings.standup, absentScore: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Standup absence default is 0 $WP.</span>
                </div>
              </div>

              {/* Active Standup Days checkboxes */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Active Standup Days of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const isChecked = formSettings.standup.activeDays.includes(d.idx);
                    return (
                      <button
                        key={d.idx}
                        type="button"
                        onClick={() => handleToggleDay('standup', d.idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                          isChecked
                            ? 'bg-brand-600 border-brand-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {isChecked ? '✓ ' : ''}{d.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EOD RULES */}
          {currentSettingsTab === 'eod' && (
            <div className="space-y-5 max-w-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                End of Day (EOD) Rules & Fine Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">EOD Start Time</label>
                  <input
                    type="text"
                    value={formSettings.eod.startTime}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        eod: { ...formSettings.eod, startTime: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">24-hour format e.g. 18:00:00 (6:00 PM)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">On-Time Reward ($WP)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formSettings.eod.onTimeScore}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        eod: { ...formSettings.eod, onTimeScore: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold text-emerald-400 focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Missing EOD Penalty ($WP)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formSettings.eod.absentScore}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        eod: { ...formSettings.eod, absentScore: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold text-rose-400 focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">
                    Mandatory minus deduction if missing EOD (e.g. -5.0 $WP).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">EOD Grace Period (Minutes)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formSettings.eod.gracePeriodMinutes}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        eod: { ...formSettings.eod, gracePeriodMinutes: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Active EOD Days checkboxes */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Days where EOD is Mandatory (Configurable)
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => {
                    const isChecked = formSettings.eod.activeDays.includes(d.idx);
                    return (
                      <button
                        key={d.idx}
                        type="button"
                        onClick={() => handleToggleDay('eod', d.idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {isChecked ? '✓ ' : ''}{d.name}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-slate-500 mt-1.5 block">
                  On days where EOD is unselected, no EOD meeting will be scheduled and no absence penalty will occur.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: LEADERBOARD & SALARY FINES */}
          {currentSettingsTab === 'leaderboard' && (
            <div className="space-y-5 max-w-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Leaderboard Eligibility & Payroll Deductions
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Minimum Attendance for Top 3 (%)
                  </label>
                  <input
                    type="number"
                    value={formSettings.minimumAttendancePercentage}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        minimumAttendancePercentage: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">
                    Employees below this threshold cannot enter the weekly Top 3.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fine per Minus Point
                  </label>
                  <input
                    type="number"
                    value={formSettings.finePerMinusPoint}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        finePerMinusPoint: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold text-rose-400 focus:border-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Salary deduction per negative $WP point.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Salary Currency</label>
                  <input
                    type="text"
                    value={formSettings.salaryCurrency}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        salaryCurrency: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-semibold focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Weekly Calculation Closing Day</label>
                  <select
                    value={formSettings.weeklyCalculationDay}
                    onChange={(e) =>
                      setFormSettings({
                        ...formSettings,
                        weeklyCalculationDay: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    <option value="6">Saturday (Standard)</option>
                    <option value="5">Friday</option>
                    <option value="0">Sunday</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Grand Champions Reward Description
                </label>
                <textarea
                  value={formSettings.monthlyGrandRewardNotes || ''}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      monthlyGrandRewardNotes: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 4: SLACK WEBHOOK */}
          {currentSettingsTab === 'slack' && (
            <div className="space-y-5 max-w-2xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <IconSlack className="w-5 h-5 text-emerald-400" />
                Slack Channel Webhook Integration
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Slack Incoming Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                  value={formSettings.slackWebhookUrl || ''}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      slackWebhookUrl: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Slack Channel Name</label>
                <input
                  type="text"
                  placeholder="#standup"
                  value={formSettings.slackChannel || ''}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      slackChannel: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Warning Notice Template (Shown at Bottom of Reports)
                </label>
                <textarea
                  value={formSettings.slackWarningMessageTemplate || ''}
                  onChange={(e) =>
                    setFormSettings({
                      ...formSettings,
                      slackWarningMessageTemplate: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestSlack}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
                >
                  Test Slack Connection
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  }`}
                >
                  {testResult.success ? <IconCheck className="w-4 h-4" /> : <IconAlertTriangle className="w-4 h-4" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TEAM MANAGEMENT */}
          {currentSettingsTab === 'employees' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  Add New Team Member
                </h3>
                <form onSubmit={handleAddEmployee} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newEmpEmail}
                    onChange={(e) => setNewEmpEmail(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="text"
                    placeholder="Department"
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-lg transition"
                  >
                    + Add Member
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  Active Team Roster ({employees.length})
                </h3>
                <div className="divide-y divide-slate-800 border border-slate-750 rounded-xl overflow-hidden bg-slate-900/40">
                  {employees.map((emp) => (
                    <div key={emp.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/40 text-xs gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{emp.name}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-850 text-slate-300 border border-slate-700 font-medium">
                            {emp.department || 'General'}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          {emp.email ? emp.email : 'No email configured'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingEmployee(emp)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition flex items-center gap-1"
                        >
                          <IconEdit className="w-3.5 h-3.5 text-brand-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSaveEmployee({ ...emp, active: !emp.active })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                            emp.active
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {emp.active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteEmployee(emp.id)}
                          className="text-rose-400 hover:text-rose-300 px-2 py-1 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DATA & RESET */}
          {currentSettingsTab === 'data' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  Seed Data Fixture (Original Prompt Dataset)
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Resets the database to the test fixture containing Ali Hassan, Zahid Khurshid, Ayub, Waqar (ineligible), Ahmad Raza, and all test standups.
                </p>
                <button
                  type="button"
                  onClick={onResetSeedData}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 hover:border-rose-700 text-rose-300 text-xs font-bold transition border border-slate-700"
                >
                  <IconRefresh className="w-4 h-4" />
                  <span>Reset to Prompt Fixtures</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                  Backup & Restore
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onExportData}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition"
                  >
                    Export Full JSON
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save Settings Footer */}
          <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between">
            <div>
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                  <IconCheck className="w-4 h-4" />
                  Settings saved successfully!
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition shadow-lg shadow-brand-600/20 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <Modal
          isOpen={editingEmployee !== null}
          onClose={() => setEditingEmployee(null)}
          title={
            <div className="flex items-center gap-2 text-white">
              <IconEdit className="w-5 h-5 text-brand-400" />
              <span>Edit Team Member Details</span>
            </div>
          }
          maxWidth="md"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onSaveEmployee(editingEmployee);
              setEditingEmployee(null);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                value={editingEmployee.name}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Designation / Role</label>
              <input
                type="text"
                value={editingEmployee.department || ''}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                placeholder="e.g. Senior Frontend Engineer, Team Lead"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={editingEmployee.email || ''}
                onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                placeholder="employee@webpenter.com"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition shadow-lg shadow-brand-600/20"
              >
                Save Details
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
