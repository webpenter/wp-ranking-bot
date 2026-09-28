import { extractMeetingCode, isGoogleMeetCall, getVisibleParticipantNames, getCurrentUserName } from './meet-detector';
import { repository } from '../storage/repository';
import { calculateAttendanceScore } from '../core/scoring';
import { formatTime12 } from '../core/date-utils';

console.log('[WebPenter Standup Extension] Content script loaded on Google Meet.');

let observer: MutationObserver | null = null;
let currentMeetingCode: string | null = null;
let userJoinRecorded = false;
let widgetContainer: HTMLDivElement | null = null;

async function initContentScript() {
  if (!isGoogleMeetCall()) return;

  currentMeetingCode = extractMeetingCode();
  console.log('[WebPenter Standup Extension] Detected Meet Code:', currentMeetingCode);

  await repository.initialize();
  renderInMeetOverlayWidget();

  // Watch for DOM changes to detect participants joining
  startParticipantObserver();
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
  widgetContainer.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
  widgetContainer.style.backdropFilter = 'blur(8px)';
  widgetContainer.style.border = '1px solid rgba(59, 130, 246, 0.3)';
  widgetContainer.style.borderRadius = '12px';
  widgetContainer.style.padding = '10px 14px';
  widgetContainer.style.color = '#f8fafc';
  widgetContainer.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5)';
  widgetContainer.style.display = 'flex';
  widgetContainer.style.alignItems = 'center';
  widgetContainer.style.gap = '10px';
  widgetContainer.style.fontSize = '12px';
  widgetContainer.style.transition = 'all 0.3s ease';

  widgetContainer.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:#22c55e; box-shadow:0 0 8px #22c55e;"></span>
      <strong style="color:#60a5fa; font-weight:700;">WebPenter Tracking</strong>
    </div>
    <div style="height:14px; width:1px; background:rgba(255,255,255,0.2);"></div>
    <span id="wp-widget-status" style="color:#cbd5e1;">Detecting join time...</span>
  `;

  document.body.appendChild(widgetContainer);
}

function updateWidgetStatus(text: string, isLate: boolean = false) {
  const el = document.getElementById('wp-widget-status');
  if (el) {
    el.innerHTML = text;
    if (isLate) {
      el.style.color = '#fbbf24';
    } else {
      el.style.color = '#4ade80';
    }
  }
}

async function recordCurrentJoin() {
  if (userJoinRecorded) return;

  const now = new Date();
  const userName = getCurrentUserName() || 'Self';
  const settings = await repository.getSettings();

  // Find if today is Standup or EOD based on current hour
  const currentHour = now.getHours();
  const isEod = currentHour >= 16;
  const typeSettings = isEod ? settings.eod : settings.standup;

  // Build scheduled time for today
  const todayStr = now.toISOString().split('T')[0];
  const scheduledTimeStr = `${todayStr}T${typeSettings.startTime}.000Z`;

  const scoreRes = calculateAttendanceScore(scheduledTimeStr, now, typeSettings);
  userJoinRecorded = true;

  const pointsText = scoreRes.dailyScore >= 0 ? `+${scoreRes.dailyScore} $WP` : `${scoreRes.dailyScore} $WP`;
  const timeFormatted = formatTime12(now);
  const statusBadge = scoreRes.isOnTime ? '✅ On Time' : `⚠️ ${scoreRes.minutesLate}m Late`;

  updateWidgetStatus(
    `Joined at <strong>${timeFormatted}</strong> (${pointsText} • ${statusBadge})`,
    !scoreRes.isOnTime
  );

  // Send message to extension background worker
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      type: 'MEET_JOIN_DETECTED',
      payload: {
        meetCode: currentMeetingCode,
        userName,
        joinedAt: now.toISOString(),
        score: scoreRes.dailyScore,
        isOnTime: scoreRes.isOnTime,
        meetingType: isEod ? 'eod' : 'standup',
      },
    });
  }
}

function startParticipantObserver() {
  if (observer) observer.disconnect();

  observer = new MutationObserver(() => {
    // Attempt join detection
    const participants = getVisibleParticipantNames();
    if (participants.length > 0 && !userJoinRecorded) {
      recordCurrentJoin();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also try recording after a 2-second initial delay
  setTimeout(() => {
    recordCurrentJoin();
  }, 2000);
}

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}
