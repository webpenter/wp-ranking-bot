import { extractMeetingCode, isGoogleMeetCall, getVisibleParticipantNames, getCurrentUserName } from './meet-detector';
import { repository } from '../storage/repository';
import { calculateAttendanceScore } from '../core/scoring';
import { formatTime12 } from '../core/date-utils';
import { Employee, Meeting, Settings } from '../core/types';

console.log('[WebPenter Standup Extension] Content script loaded on Google Meet.');

let observer: MutationObserver | null = null;
let pollInterval: any = null;
let currentMeetingCode: string | null = null;
let activeMeeting: Meeting | null = null;
let appSettings: Settings | null = null;
let allEmployees: Employee[] = [];
const recordedEmployeeIds = new Set<string>();
let widgetContainer: HTMLDivElement | null = null;

async function initContentScript() {
  if (!isGoogleMeetCall()) return;

  currentMeetingCode = extractMeetingCode();
  console.log('[WebPenter Standup Extension] Active Meet Code:', currentMeetingCode);

  await repository.initialize();
  appSettings = await repository.getSettings();
  allEmployees = await repository.getEmployees();

  // Determine today's meeting (Standup vs EOD)
  await ensureActiveMeeting();

  renderInMeetOverlayWidget();

  // Start continuous participant tracking
  startContinuousTracking();
}

async function ensureActiveMeeting(): Promise<Meeting | null> {
  const now = new Date();
  const currentHour = now.getHours();
  const isEod = currentHour >= 16;
  const meetingType = isEod ? 'eod' : 'standup';
  const typeSettings = isEod ? appSettings!.eod : appSettings!.standup;
  const todayStr = now.toISOString().split('T')[0];

  const meetings = await repository.getMeetings();
  let meet = meetings.find((m) => m.date === todayStr && m.type === meetingType);

  if (!meet) {
    const scheduledIso = `${todayStr}T${typeSettings.startTime}+05:00`;
    meet = {
      id: `meet-${meetingType}-${todayStr}`,
      code: `meet.google.com/${currentMeetingCode}`,
      title: isEod ? `Daily EOD — ${todayStr}` : `Daily Standup — ${todayStr}`,
      type: meetingType,
      date: todayStr,
      scheduledStart: scheduledIso,
      scheduledEnd: scheduledIso,
      status: 'completed',
      timezone: 'Asia/Karachi',
      createdAt: now.toISOString(),
    };
    await repository.saveMeeting(meet);
  }

  activeMeeting = meet;
  return meet;
}

function renderInMeetOverlayWidget() {
  if (widgetContainer) return;

  widgetContainer = document.createElement('div');
  widgetContainer.id = 'webpenter-meet-widget';
  widgetContainer.style.position = 'fixed';
  widgetContainer.style.top = '16px';
  widgetContainer.style.right = '16px';
  widgetContainer.style.zIndex = '99999';
  widgetContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  widgetContainer.style.backgroundColor = 'rgba(15, 23, 42, 0.92)';
  widgetContainer.style.backdropFilter = 'blur(10px)';
  widgetContainer.style.border = '1px solid rgba(59, 130, 246, 0.4)';
  widgetContainer.style.borderRadius = '12px';
  widgetContainer.style.padding = '10px 16px';
  widgetContainer.style.color = '#f8fafc';
  widgetContainer.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.6)';
  widgetContainer.style.display = 'flex';
  widgetContainer.style.alignItems = 'center';
  widgetContainer.style.gap = '10px';
  widgetContainer.style.fontSize = '12px';
  widgetContainer.style.transition = 'all 0.3s ease';

  widgetContainer.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:#22c55e; box-shadow:0 0 8px #22c55e;"></span>
      <strong style="color:#60a5fa; font-weight:700;">WebPenter Tracker</strong>
    </div>
    <div style="height:14px; width:1px; background:rgba(255,255,255,0.2);"></div>
    <span id="wp-widget-status" style="color:#cbd5e1;">Live Tracking Active...</span>
  `;

  document.body.appendChild(widgetContainer);
}

function updateWidgetStatus(text: string, isLate: boolean = false) {
  const el = document.getElementById('wp-widget-status');
  if (el) {
    el.innerHTML = text;
    el.style.color = isLate ? '#fbbf24' : '#4ade80';
  }
}

function matchEmployeeByName(rawName: string): Employee | null {
  if (!rawName) return null;
  const clean = rawName.toLowerCase().trim();

  // 1. Exact match
  const exact = allEmployees.find((e) => e.name.toLowerCase() === clean);
  if (exact) return exact;

  // 2. Contains match
  const contains = allEmployees.find(
    (e) => clean.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(clean)
  );
  if (contains) return contains;

  // 3. First and last name match
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    const matched = allEmployees.find((e) => {
      const eParts = e.name.toLowerCase().split(/\s+/);
      return parts[0] === eParts[0] && parts[parts.length - 1] === eParts[eParts.length - 1];
    });
    if (matched) return matched;
  }

  return null;
}

async function scanAndRecordParticipants() {
  if (!activeMeeting || !appSettings) return;

  const visibleNames = getVisibleParticipantNames();
  const selfName = getCurrentUserName();
  if (selfName && !visibleNames.includes(selfName)) {
    visibleNames.push(selfName);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const isEod = activeMeeting.type === 'eod';
  const typeSettings = isEod ? appSettings.eod : appSettings.standup;

  for (const name of visibleNames) {
    const employee = matchEmployeeByName(name);
    const empId = employee ? employee.id : `emp-temp-${name.toLowerCase().replace(/\s+/g, '-')}`;

    if (recordedEmployeeIds.has(empId)) {
      continue;
    }

    // First time seeing this participant in this meeting!
    recordedEmployeeIds.add(empId);

    // Save or register employee if not found
    let empRecord = employee;
    if (!empRecord) {
      empRecord = {
        id: empId,
        name,
        department: 'Team Member',
        active: true,
        createdAt: nowIso,
      };
      await repository.saveEmployee(empRecord);
      allEmployees.push(empRecord);
    }

    // Record join timestamp in local repository
    await repository.recordParticipantJoin(activeMeeting.id, empRecord.id, now);

    // Calculate score
    const scoreRes = calculateAttendanceScore(activeMeeting.scheduledStart, now, typeSettings);
    const timeFormatted = formatTime12(now);
    const scoreBadge = scoreRes.isOnTime
      ? `+${scoreRes.dailyScore} 🪙 WP (On Time)`
      : `${scoreRes.dailyScore >= 0 ? '+' : ''}${scoreRes.dailyScore} 🪙 WP (${scoreRes.minutesLate}m Late)`;

    console.log(`[WebPenter Tracker] ✅ Recorded ${empRecord.name} at ${timeFormatted} -> ${scoreBadge}`);

    updateWidgetStatus(
      `Recorded: <strong>${empRecord.name}</strong> at ${timeFormatted} (${scoreBadge})`,
      !scoreRes.isOnTime
    );

    // Send to background worker / server API
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'MEET_JOIN_DETECTED',
        payload: {
          meetCode: currentMeetingCode,
          userName: empRecord.name,
          employeeId: empRecord.id,
          joinedAt: nowIso,
          score: scoreRes.dailyScore,
          isOnTime: scoreRes.isOnTime,
          meetingType: activeMeeting.type,
        },
      });
    }

    // Also notify Alwaysdata / local server if online
    try {
      fetch('/api/attendance/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: activeMeeting.id,
          employeeId: empRecord.id,
          employeeName: empRecord.name,
          joinedAt: nowIso,
        }),
      }).catch(() => {});
    } catch (e) {}
  }
}

function startContinuousTracking() {
  // Initial immediate scan
  scanAndRecordParticipants();

  // Continuous polling every 2 seconds to catch late joiners immediately
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(scanAndRecordParticipants, 2000);

  // Mutation observer for instant DOM updates
  if (observer) observer.disconnect();
  observer = new MutationObserver(() => {
    scanAndRecordParticipants();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}
