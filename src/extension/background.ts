/**
 * Chrome Extension Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[WebPenter Standup Background] Extension installed successfully.');
  setupStandupAlarms();
});

function setupStandupAlarms() {
  chrome.alarms.create('check-standup-alarm', {
    periodInMinutes: 1, // Periodic check for standup and Saturday weekly report
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'check-standup-alarm') {
    // Check scheduled times and trigger Chrome notifications
    const now = new Date();
    const day = now.getDay(); // 6 = Saturday
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Saturday Weekly Leaderboard Notification Reminder at 12:00 PM
    if (day === 6 && hours === 12 && minutes === 0) {
      if (chrome.notifications) {
        chrome.notifications.create('sat-weekly-report', {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '👑 Saturday Weekly Standup Report is Ready!',
          message: 'Weekly scores & salary deduction reports are ready for review and Slack dispatch.',
          priority: 2,
        });
      }
    }
  }
});

// Listen for messages from content script, popup, or dashboard
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'MEET_JOIN_DETECTED') {
    console.log('[Background] Join detected:', message.payload);

    // Update extension badge
    if (chrome.action) {
      chrome.action.setBadgeText({ text: 'LIVE' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
    }

    sendResponse({ received: true });
    return true;
  }

  if (message.type === 'SEND_SLACK_WEBHOOK') {
    const { webhookUrl, payload } = message.payload || {};
    if (!webhookUrl) {
      sendResponse({ success: false, message: 'No webhook URL provided.' });
      return true;
    }

    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        if (res.ok) {
          sendResponse({ success: true, message: 'Report successfully posted to Slack channel!' });
        } else {
          const text = await res.text();
          sendResponse({ success: false, message: `Slack API error (${res.status}): ${text}` });
        }
      })
      .catch((err) => {
        sendResponse({ success: false, message: `Failed to reach Slack: ${err.message || String(err)}` });
      });

    return true; // async sendResponse
  }

  return true;
});
