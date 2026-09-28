import React, { useEffect, useState } from 'react';
import { IconClock, IconCalendar, IconSlack, IconTrophy, IconUsers, IconSettings, IconAward } from '../../../shared/icons';
import { Settings } from '../../../core/types';

export interface HeaderProps {
  currentTab: 'weekly' | 'daily' | 'monthly' | 'settings' | 'audit';
  onTabChange: (tab: 'weekly' | 'daily' | 'monthly' | 'settings' | 'audit') => void;
  selectedWeekKey: string;
  onWeekChange: (weekKey: string) => void;
  availableWeeks: { weekKey: string; label: string }[];
  selectedMonthKey: string;
  onMonthChange: (monthKey: string) => void;
  availableMonths: { monthKey: string; label: string }[];
  settings: Settings;
  onOpenSlackShare: () => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  selectedWeekKey,
  onWeekChange,
  availableWeeks,
  selectedMonthKey,
  onMonthChange,
  availableMonths,
  settings,
  onOpenSlackShare,
  isAdmin,
  onToggleAdmin,
}) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white font-black text-xl tracking-tighter">
              WP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  WebPenter Standup & EOD Leaderboard
                </h1>
                <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                  {settings.currencySymbol} Rewards
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Consistency First • Punctuality Second • Google Meet Tracker
              </p>
            </div>
          </div>

          {/* Controls: Clock & Week/Month Selector & 1-Click Slack */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Live Clock */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-mono text-slate-300">
              <IconClock className="w-3.5 h-3.5 text-brand-400" />
              <span>{timeStr || '10:00:00 AM'}</span>
            </div>

            {/* Week or Month dropdown based on active tab */}
            {currentTab === 'monthly' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200">
                <IconCalendar className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  value={selectedMonthKey}
                  onChange={(e) => onMonthChange(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  {availableMonths.map((m) => (
                    <option key={m.monthKey} value={m.monthKey} className="bg-slate-800 text-white">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200">
                <IconCalendar className="w-3.5 h-3.5 text-brand-400" />
                <select
                  value={selectedWeekKey}
                  onChange={(e) => onWeekChange(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
                >
                  {availableWeeks.map((w) => (
                    <option key={w.weekKey} value={w.weekKey} className="bg-slate-800 text-white">
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Admin Login / Logout Badge */}
            <button
              onClick={onToggleAdmin}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                isAdmin
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
              }`}
              title={isAdmin ? 'Click to Lock / Logout of Admin Mode' : 'Click to enter Admin PIN'}
            >
              <span>{isAdmin ? '🔓 Admin Mode (Active)' : '🔒 Admin Login'}</span>
            </button>

            {/* 1-Click Slack Button */}
            {isAdmin && (
              <button
                onClick={onOpenSlackShare}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                <IconSlack className="w-4 h-4" />
                <span>1-Click Slack</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 pt-1 border-t border-slate-800/60 no-scrollbar">
          <button
            onClick={() => onTabChange('weekly')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              currentTab === 'weekly'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <IconTrophy className="w-4 h-4" />
            <span>Weekly Leaderboard</span>
          </button>

          <button
            onClick={() => onTabChange('daily')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              currentTab === 'daily'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <IconCalendar className="w-4 h-4" />
            <span>Daily Standup & EOD</span>
          </button>

          <button
            onClick={() => onTabChange('monthly')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              currentTab === 'monthly'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <IconAward className="w-4 h-4 text-amber-300" />
            <span>Month-End Grand Winners</span>
          </button>

          <button
            onClick={() => {
              if (isAdmin) {
                onTabChange('settings');
              } else {
                onToggleAdmin();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              currentTab === 'settings'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <IconSettings className="w-4 h-4" />
            <span>{isAdmin ? 'Admin Settings' : '🔒 Settings'}</span>
          </button>

          <button
            onClick={() => {
              if (isAdmin) {
                onTabChange('audit');
              } else {
                onToggleAdmin();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
              currentTab === 'audit'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <IconUsers className="w-4 h-4" />
            <span>{isAdmin ? 'Audit Trail' : '🔒 Audit Trail'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
