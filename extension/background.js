"use strict";
(() => {
  // src/extension/background.ts
  chrome.runtime.onInstalled.addListener(() => {
    console.log("[WebPenter Standup Background] Extension installed successfully.");
    setupStandupAlarms();
  });
  function setupStandupAlarms() {
    chrome.alarms.create("check-standup-alarm", {
      periodInMinutes: 1
      // Periodic check for standup and Saturday weekly report
    });
  }
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "check-standup-alarm") {
      const now = /* @__PURE__ */ new Date();
      const day = now.getDay();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      if (day === 6 && hours === 12 && minutes === 0) {
        if (chrome.notifications) {
          chrome.notifications.create("sat-weekly-report", {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "\u{1F451} Saturday Weekly Standup Report is Ready!",
            message: "Weekly scores & salary deduction reports are ready for review and Slack dispatch.",
            priority: 2
          });
        }
      }
    }
  });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "MEET_JOIN_DETECTED") {
      console.log("[Background] Join detected:", message.payload);
      if (chrome.action) {
        chrome.action.setBadgeText({ text: "LIVE" });
        chrome.action.setBadgeBackgroundColor({ color: "#22c55e" });
      }
      sendResponse({ received: true });
      return true;
    }
    if (message.type === "SEND_SLACK_WEBHOOK") {
      const { webhookUrl, payload } = message.payload || {};
      if (!webhookUrl) {
        sendResponse({ success: false, message: "No webhook URL provided." });
        return true;
      }
      fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }).then(async (res) => {
        if (res.ok) {
          sendResponse({ success: true, message: "Report successfully posted to Slack channel!" });
        } else {
          const text = await res.text();
          sendResponse({ success: false, message: `Slack API error (${res.status}): ${text}` });
        }
      }).catch((err) => {
        sendResponse({ success: false, message: `Failed to reach Slack: ${err.message || String(err)}` });
      });
      return true;
    }
    return true;
  });
})();
