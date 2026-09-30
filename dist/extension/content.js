"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/extension/meet-detector.ts
  function extractMeetingCode() {
    const pathname = window.location.pathname.replace(/^\/+/, "");
    if (!pathname || /^(about|landing|terms|privacy|apps|get-started|help)/i.test(pathname)) {
      return null;
    }
    const match = pathname.match(/([a-z]{3}-[a-z]{4}-[a-z]{3}|[a-z0-9_-]{3,30})/i);
    return match ? match[1] : null;
  }
  function isGoogleMeetCall() {
    return window.location.hostname.includes("meet.google.com") && extractMeetingCode() !== null;
  }
  function getVisibleParticipantNames() {
    const names = /* @__PURE__ */ new Set();
    const ignoredKeywords = /* @__PURE__ */ new Set([
      "people",
      "chat",
      "details",
      "activities",
      "more options",
      "mic",
      "camera",
      "turn on captions",
      "raise hand",
      "leave call",
      "meeting details",
      "everyone",
      "search for people",
      "add people",
      "host controls",
      "you",
      "host",
      "presentation",
      "send a message",
      "in-call messages",
      "meeting host"
    ]);
    const participantElements = document.querySelectorAll(
      '[data-participant-id], [data-requested-participant-id], [aria-label*="participant" i], div[role="listitem"], span[class*="zWGUib"], div[class*="ZjFb7c"], div[class*="poVWob"]'
    );
    participantElements.forEach((el) => {
      const raw = (el.textContent || el.getAttribute("aria-label") || "").trim();
      if (!raw) return;
      const firstLine = raw.split("\n")[0].trim();
      const cleaned = cleanParticipantName(firstLine);
      if (isValidName(cleaned, ignoredKeywords)) {
        names.add(cleaned);
      }
    });
    const labelElements = document.querySelectorAll(
      'div[data-self-name], span[jsname="Wvd9Cc"], div[data-name], div[jsname="skNjhb"], div[class*="poVWob"], div[class*="ZjFb7c"], span[class*="zWGUib"], div[data-participant-id] span'
    );
    labelElements.forEach((el) => {
      const raw = (el.getAttribute("data-self-name") || el.textContent || "").trim();
      if (!raw) return;
      const firstLine = raw.split("\n")[0].trim();
      const cleaned = cleanParticipantName(firstLine);
      if (isValidName(cleaned, ignoredKeywords)) {
        names.add(cleaned);
      }
    });
    return Array.from(names);
  }
  function cleanParticipantName(name) {
    return name.replace(/\s*\((You|Host|Meeting host|Presentation|Joined by phone|Pinned)\)/gi, "").replace(/\s*\(.*?\)/g, "").trim();
  }
  function isValidName(name, ignored) {
    if (!name || name.length < 2 || name.length > 50) return false;
    if (ignored.has(name.toLowerCase())) return false;
    if (/^\d+$/.test(name) || /^(more_vert|mic|videocam|call_end|volume_off|closed_caption)$/i.test(name)) return false;
    return true;
  }
  function getCurrentUserName() {
    const accountBtn = document.querySelector('a[aria-label*="Google Account:"], a[aria-label*="Account"]');
    if (accountBtn) {
      const label = accountBtn.getAttribute("aria-label") || "";
      const match = label.match(/Google Account:\s*([^(\n]+)/i);
      if (match) return cleanParticipantName(match[1]);
    }
    const selfTile = document.querySelector("div[data-self-name]");
    if (selfTile) {
      const name = selfTile.getAttribute("data-self-name") || selfTile.textContent;
      if (name) return cleanParticipantName(name);
    }
    return null;
  }

  // src/storage/local-storage-adapter.ts
  var LocalStorageAdapter = class {
    isChromeStorage() {
      return typeof chrome !== "undefined" && typeof chrome.storage !== "undefined" && typeof chrome.storage.local !== "undefined";
    }
    async getItem(key) {
      if (this.isChromeStorage()) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            if (chrome.runtime.lastError) {
              console.warn("Chrome storage get error:", chrome.runtime.lastError);
              resolve(this.getFromLocalStorage(key));
            } else {
              resolve(result[key] !== void 0 ? result[key] : null);
            }
          });
        });
      }
      return this.getFromLocalStorage(key);
    }
    async setItem(key, value) {
      if (this.isChromeStorage()) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
              console.warn("Chrome storage set error:", chrome.runtime.lastError);
              this.setInLocalStorage(key, value);
            }
            resolve();
          });
        });
      }
      this.setInLocalStorage(key, value);
    }
    async removeItem(key) {
      if (this.isChromeStorage()) {
        return new Promise((resolve) => {
          chrome.storage.local.remove([key], () => {
            this.removeFromLocalStorage(key);
            resolve();
          });
        });
      }
      this.removeFromLocalStorage(key);
    }
    async clear() {
      if (this.isChromeStorage()) {
        return new Promise((resolve) => {
          chrome.storage.local.clear(() => {
            if (typeof localStorage !== "undefined") {
              localStorage.clear();
            }
            resolve();
          });
        });
      }
      if (typeof localStorage !== "undefined") {
        localStorage.clear();
      }
    }
    getFromLocalStorage(key) {
      if (typeof localStorage === "undefined") return null;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    setInLocalStorage(key, value) {
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error("LocalStorage write error:", e);
      }
    }
    removeFromLocalStorage(key) {
      if (typeof localStorage === "undefined") return;
      localStorage.removeItem(key);
    }
  };
  var storageAdapter = new LocalStorageAdapter();

  // src/storage/audit-logger.ts
  var AUDIT_LOG_KEY = "wp_meet_audit_logs";
  var AuditLogger = class {
    constructor(storage) {
      this.storage = storage;
    }
    async getAuditLogs() {
      const logs = await this.storage.getItem(AUDIT_LOG_KEY);
      return logs || [];
    }
    async logChange(recordId, employee, meeting, changedBy, oldValue, newValue, reason) {
      const logs = await this.getAuditLogs();
      const entry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        recordId,
        employeeId: employee.id,
        employeeName: employee.name,
        meetingId: meeting.id,
        meetingDate: meeting.date,
        meetingType: meeting.type,
        changedBy: changedBy || "Admin",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        oldValue,
        newValue,
        reason: reason || "Manual attendance adjustment"
      };
      logs.unshift(entry);
      await this.storage.setItem(AUDIT_LOG_KEY, logs);
      return entry;
    }
    async clearLogs() {
      await this.storage.setItem(AUDIT_LOG_KEY, []);
    }
  };

  // src/core/mock-data.ts
  var DEFAULT_SETTINGS = {
    currencySymbol: "\u{1FA99} WP",
    minimumAttendancePercentage: 80,
    excludeExcusedFromDenominator: true,
    timezone: "Asia/Karachi",
    finePerMinusPoint: 10,
    salaryCurrency: "PKR",
    weeklyCalculationDay: 6,
    // Saturday
    standup: {
      enabled: true,
      startTime: "10:00:00",
      onTimeScore: 5,
      gracePeriodMinutes: 2,
      latePenalty: 0.5,
      minimumDailyScore: -5,
      absentScore: -5,
      // Mandatory fine for unexcused standup absence
      activeDays: [1, 2, 3, 4, 5, 6]
      // Mon-Sat
    },
    eod: {
      enabled: true,
      startTime: "18:40:00",
      onTimeScore: 5,
      gracePeriodMinutes: 2,
      latePenalty: 0.5,
      minimumDailyScore: -5,
      absentScore: -5,
      // Mandatory fine for unexcused EOD absence
      activeDays: [1, 2, 3, 4, 5]
      // Mon-Fri
    },
    enableDailyTop3Bonus: true,
    dailyTop3BonusPoints: [3, 2, 1],
    slackWebhookUrl: "",
    slackChannel: "#daily-standup",
    slackAutoShareOnEnd: false,
    slackWarningMessageTemplate: "\u26A0\uFE0F *Policy Notice:* Minus \u{1FA99} WP coin balances result in payroll salary deductions (PKR 10 per minus point). Please ensure on-time attendance for all scheduled Standup & EOD calls.",
    adminPin: "webpenter2026"
  };
  var INITIAL_EMPLOYEES = [
    { id: "emp-ayub", name: "Ayub Khokhar", email: "ayub@webpenter.com", department: "Business Developer", active: true, createdAt: "2026-09-28T00:00:00Z" },
    { id: "emp-ali", name: "Ali Hassan", email: "ali@webpenter.com", department: "Business Developer", active: true, createdAt: "2026-09-28T00:00:00Z" },
    { id: "emp-zahid", name: "Zahid Khurshid", email: "zahid@webpenter.com", department: "Senior Software Engineer | Founder", active: true, createdAt: "2026-09-28T00:00:00Z" },
    { id: "emp-ahmad", name: "Ahmad Raza", email: "ahmad@webpenter.com", department: "Senior Software Developer", active: true, createdAt: "2026-09-28T00:00:00Z" },
    { id: "emp-mehtab", name: "Mehtab Sain", email: "mehtab@webpenter.com", department: "PHP Developer", active: true, createdAt: "2026-09-28T00:00:00Z" },
    { id: "emp-fayyaz-a", name: "Fayyaz Ahmad", email: "fayyaz.ahmad@webpenter.com", department: "Junior PHP Developer", active: true, createdAt: "2026-09-28T00:00:00Z" },
    { id: "emp-waqar", name: "Waqar Hussain", email: "waqar@webpenter.com", department: "Full Stack Developer", active: true, createdAt: "2026-09-28T00:00:00Z" },
    { id: "emp-sadiq", name: "Muhammad Sadiq", email: "sadiq@webpenter.com", department: "Full Stack Developer", active: true, createdAt: "2026-09-28T00:00:00Z" },
    { id: "emp-fayyaz-wp", name: "Fayyaz WebPenter", email: "fayyaz.wp@webpenter.com", department: "Management", active: true, createdAt: "2026-09-28T00:00:00Z" },
    { id: "emp-wp-inc", name: "Web Penter Inc.", email: "team@webpenter.com", department: "Management", active: true, createdAt: "2026-09-28T00:00:00Z" }
  ];
  function generateSeedData() {
    const employees = [...INITIAL_EMPLOYEES];
    const meetings = [];
    const records = [];
    const todayMeetingId = "meet-su-2026-09-28";
    const todayScheduled = "2026-09-28T10:00:00+05:00";
    meetings.push({
      id: todayMeetingId,
      code: "meet.google.com/jns-arbs-nyv",
      title: "Daily Standup \u2014 Monday, Sep 28",
      type: "standup",
      date: "2026-09-28",
      scheduledStart: todayScheduled,
      scheduledEnd: "2026-09-28T10:30:00+05:00",
      status: "completed",
      timezone: "Asia/Karachi",
      createdAt: todayScheduled
    });
    records.push({
      id: `rec-today-${todayMeetingId}-emp-ayub`,
      meetingId: todayMeetingId,
      employeeId: "emp-ayub",
      meetingType: "standup",
      status: "late",
      joinedAt: "2026-09-28T10:02:51+05:00",
      minutesLate: 1,
      dailyScore: 4.5,
      isOnTime: false,
      notes: "Joined at 10:02:51 AM (1 min late)",
      createdAt: todayScheduled,
      updatedAt: todayScheduled
    });
    records.push({
      id: `rec-today-${todayMeetingId}-emp-fayyaz-wp`,
      meetingId: todayMeetingId,
      employeeId: "emp-fayyaz-wp",
      meetingType: "standup",
      status: "late",
      joinedAt: "2026-09-28T10:03:21+05:00",
      minutesLate: 2,
      dailyScore: 4,
      isOnTime: false,
      notes: "Joined at 10:03:21 AM (2 min late)",
      createdAt: todayScheduled,
      updatedAt: todayScheduled
    });
    records.push({
      id: `rec-today-${todayMeetingId}-emp-wp-inc`,
      meetingId: todayMeetingId,
      employeeId: "emp-wp-inc",
      meetingType: "standup",
      status: "late",
      joinedAt: "2026-09-28T10:03:21+05:00",
      minutesLate: 2,
      dailyScore: 4,
      isOnTime: false,
      notes: "Joined at 10:03:21 AM (2 min late)",
      createdAt: todayScheduled,
      updatedAt: todayScheduled
    });
    records.push({
      id: `rec-today-${todayMeetingId}-emp-waqar`,
      meetingId: todayMeetingId,
      employeeId: "emp-waqar",
      meetingType: "standup",
      status: "late",
      joinedAt: "2026-09-28T10:04:21+05:00",
      minutesLate: 3,
      dailyScore: 3.5,
      isOnTime: false,
      notes: "Joined at 10:04:21 AM (3 min late)",
      createdAt: todayScheduled,
      updatedAt: todayScheduled
    });
    records.push({
      id: `rec-today-${todayMeetingId}-emp-ali`,
      meetingId: todayMeetingId,
      employeeId: "emp-ali",
      meetingType: "standup",
      status: "late",
      joinedAt: "2026-09-28T10:19:23+05:00",
      minutesLate: 18,
      dailyScore: -4,
      isOnTime: false,
      notes: "Joined at 10:19:23 AM (18 min late)",
      createdAt: todayScheduled,
      updatedAt: todayScheduled
    });
    records.push({
      id: `rec-today-${todayMeetingId}-emp-zahid`,
      meetingId: todayMeetingId,
      employeeId: "emp-zahid",
      meetingType: "standup",
      status: "late",
      joinedAt: "2026-09-28T10:19:23+05:00",
      minutesLate: 18,
      dailyScore: -4,
      isOnTime: false,
      notes: "Joined at 10:19:23 AM (18 min late)",
      createdAt: todayScheduled,
      updatedAt: todayScheduled
    });
    records.push({
      id: `rec-today-${todayMeetingId}-emp-ahmad`,
      meetingId: todayMeetingId,
      employeeId: "emp-ahmad",
      meetingType: "standup",
      status: "late",
      joinedAt: "2026-09-28T10:20:00+05:00",
      minutesLate: 19,
      dailyScore: -4.5,
      isOnTime: false,
      notes: "Joined at 10:20:00 AM (19 min late)",
      createdAt: todayScheduled,
      updatedAt: todayScheduled
    });
    records.push({
      id: `rec-today-${todayMeetingId}-emp-mehtab`,
      meetingId: todayMeetingId,
      employeeId: "emp-mehtab",
      meetingType: "standup",
      status: "late",
      joinedAt: "2026-09-28T10:20:15+05:00",
      minutesLate: 19,
      dailyScore: -4.5,
      isOnTime: false,
      notes: "Joined at 10:20:15 AM right after Ahmad Raza",
      createdAt: todayScheduled,
      updatedAt: todayScheduled
    });
    records.push({
      id: `rec-today-${todayMeetingId}-emp-sadiq`,
      meetingId: todayMeetingId,
      employeeId: "emp-sadiq",
      meetingType: "standup",
      status: "absent",
      joinedAt: void 0,
      minutesLate: 0,
      dailyScore: -5,
      isOnTime: false,
      notes: "Unexcused absence (-5.0 \u{1FA99} WP penalty)",
      createdAt: todayScheduled,
      updatedAt: todayScheduled
    });
    records.push({
      id: `rec-today-${todayMeetingId}-emp-fayyaz-a`,
      meetingId: todayMeetingId,
      employeeId: "emp-fayyaz-a",
      meetingType: "standup",
      status: "absent",
      joinedAt: void 0,
      minutesLate: 0,
      dailyScore: -5,
      isOnTime: false,
      notes: "Unexcused absence (-5.0 \u{1FA99} WP penalty)",
      createdAt: todayScheduled,
      updatedAt: todayScheduled
    });
    const eodMeetingId = "meet-eod-2026-09-28";
    const eodScheduled = "2026-09-28T18:40:00+05:00";
    meetings.push({
      id: eodMeetingId,
      code: "meet.google.com/jns-arbs-nyv",
      title: "Daily EOD \u2014 Monday, Sep 28",
      type: "eod",
      date: "2026-09-28",
      scheduledStart: eodScheduled,
      scheduledEnd: "2026-09-28T19:00:00+05:00",
      status: "completed",
      timezone: "Asia/Karachi",
      createdAt: eodScheduled
    });
    records.push({
      id: `rec-${eodMeetingId}-emp-ayub`,
      meetingId: eodMeetingId,
      employeeId: "emp-ayub",
      meetingType: "eod",
      status: "present",
      joinedAt: "2026-09-28T18:40:15+05:00",
      minutesLate: 0,
      dailyScore: 5,
      isOnTime: true,
      notes: "Joined at 6:40:15 PM (On Time)",
      createdAt: eodScheduled,
      updatedAt: eodScheduled
    });
    records.push({
      id: `rec-${eodMeetingId}-emp-ahmad`,
      meetingId: eodMeetingId,
      employeeId: "emp-ahmad",
      meetingType: "eod",
      status: "present",
      joinedAt: "2026-09-28T18:41:05+05:00",
      minutesLate: 0,
      dailyScore: 5,
      isOnTime: true,
      notes: "Joined at 6:41:05 PM (On Time within grace)",
      createdAt: eodScheduled,
      updatedAt: eodScheduled
    });
    records.push({
      id: `rec-${eodMeetingId}-emp-ali`,
      meetingId: eodMeetingId,
      employeeId: "emp-ali",
      meetingType: "eod",
      status: "present",
      joinedAt: "2026-09-28T18:41:30+05:00",
      minutesLate: 0,
      dailyScore: 5,
      isOnTime: true,
      notes: "Joined at 6:41:30 PM (On Time within grace)",
      createdAt: eodScheduled,
      updatedAt: eodScheduled
    });
    records.push({
      id: `rec-${eodMeetingId}-emp-fayyaz-wp`,
      meetingId: eodMeetingId,
      employeeId: "emp-fayyaz-wp",
      meetingType: "eod",
      status: "present",
      joinedAt: "2026-09-28T18:41:45+05:00",
      minutesLate: 0,
      dailyScore: 5,
      isOnTime: true,
      notes: "Joined at 6:41:45 PM (On Time within grace)",
      createdAt: eodScheduled,
      updatedAt: eodScheduled
    });
    records.push({
      id: `rec-${eodMeetingId}-emp-mehtab`,
      meetingId: eodMeetingId,
      employeeId: "emp-mehtab",
      meetingType: "eod",
      status: "present",
      joinedAt: "2026-09-28T18:42:00+05:00",
      minutesLate: 0,
      dailyScore: 5,
      isOnTime: true,
      notes: "Joined at 6:42:00 PM (On Time within grace)",
      createdAt: eodScheduled,
      updatedAt: eodScheduled
    });
    records.push({
      id: `rec-${eodMeetingId}-emp-zahid`,
      meetingId: eodMeetingId,
      employeeId: "emp-zahid",
      meetingType: "eod",
      status: "absent",
      joinedAt: void 0,
      minutesLate: 0,
      dailyScore: -5,
      isOnTime: false,
      notes: "Unexcused absence (-5.0 \u{1FA99} WP penalty)",
      createdAt: eodScheduled,
      updatedAt: eodScheduled
    });
    records.push({
      id: `rec-${eodMeetingId}-emp-waqar`,
      meetingId: eodMeetingId,
      employeeId: "emp-waqar",
      meetingType: "eod",
      status: "absent",
      joinedAt: void 0,
      minutesLate: 0,
      dailyScore: -5,
      isOnTime: false,
      notes: "Unexcused absence (-5.0 \u{1FA99} WP penalty)",
      createdAt: eodScheduled,
      updatedAt: eodScheduled
    });
    records.push({
      id: `rec-${eodMeetingId}-emp-sadiq`,
      meetingId: eodMeetingId,
      employeeId: "emp-sadiq",
      meetingType: "eod",
      status: "absent",
      joinedAt: void 0,
      minutesLate: 0,
      dailyScore: -5,
      isOnTime: false,
      notes: "Unexcused absence (-5.0 \u{1FA99} WP penalty)",
      createdAt: eodScheduled,
      updatedAt: eodScheduled
    });
    records.push({
      id: `rec-${eodMeetingId}-emp-fayyaz-a`,
      meetingId: eodMeetingId,
      employeeId: "emp-fayyaz-a",
      meetingType: "eod",
      status: "absent",
      joinedAt: void 0,
      minutesLate: 0,
      dailyScore: -5,
      isOnTime: false,
      notes: "Unexcused absence (-5.0 \u{1FA99} WP penalty)",
      createdAt: eodScheduled,
      updatedAt: eodScheduled
    });
    records.push({
      id: `rec-${eodMeetingId}-emp-wp-inc`,
      meetingId: eodMeetingId,
      employeeId: "emp-wp-inc",
      meetingType: "eod",
      status: "excused",
      joinedAt: void 0,
      minutesLate: 0,
      dailyScore: 0,
      isOnTime: false,
      notes: "Excused",
      createdAt: eodScheduled,
      updatedAt: eodScheduled
    });
    return {
      employees,
      meetings,
      records,
      settings: DEFAULT_SETTINGS
    };
  }

  // src/core/date-utils.ts
  function formatTime12(date, timeZone = "Asia/Karachi") {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone
    });
  }
  function getDiffInSeconds(scheduledTime, joinedTime) {
    const sched = typeof scheduledTime === "string" ? new Date(scheduledTime).getTime() : scheduledTime.getTime();
    const joined = typeof joinedTime === "string" ? new Date(joinedTime).getTime() : joinedTime.getTime();
    return Math.floor((joined - sched) / 1e3);
  }

  // src/core/scoring.ts
  function calculateAttendanceScore(scheduledStart, joinedAt, settings, forcedStatus) {
    if (forcedStatus === "excused") {
      return {
        status: "excused",
        isOnTime: false,
        minutesLate: 0,
        dailyScore: 0,
        diffSeconds: 0,
        graceSeconds: settings.gracePeriodMinutes * 60,
        explanation: "Excused from meeting"
      };
    }
    if (forcedStatus === "cancelled") {
      return {
        status: "cancelled",
        isOnTime: false,
        minutesLate: 0,
        dailyScore: 0,
        diffSeconds: 0,
        graceSeconds: settings.gracePeriodMinutes * 60,
        explanation: "Meeting was cancelled"
      };
    }
    if (forcedStatus === "absent" || !joinedAt && forcedStatus !== "present" && forcedStatus !== "late") {
      return {
        status: "absent",
        isOnTime: false,
        minutesLate: 0,
        dailyScore: settings.absentScore,
        diffSeconds: 0,
        graceSeconds: settings.gracePeriodMinutes * 60,
        explanation: settings.absentScore < 0 ? `Absent (${settings.absentScore} $WP penalty)` : `Absent (0 $WP)`
      };
    }
    if (!joinedAt) {
      return {
        status: "absent",
        isOnTime: false,
        minutesLate: 0,
        dailyScore: settings.absentScore,
        diffSeconds: 0,
        graceSeconds: settings.gracePeriodMinutes * 60,
        explanation: `Did not join (${settings.absentScore} $WP)`
      };
    }
    const diffSeconds = getDiffInSeconds(scheduledStart, joinedAt);
    const graceSeconds = Math.round(settings.gracePeriodMinutes * 60);
    if (diffSeconds <= graceSeconds) {
      return {
        status: "present",
        isOnTime: true,
        minutesLate: 0,
        dailyScore: settings.onTimeScore,
        diffSeconds,
        graceSeconds,
        explanation: diffSeconds <= 0 ? `Joined on time (+${settings.onTimeScore} $WP)` : `Joined within ${settings.gracePeriodMinutes}m grace period (+${settings.onTimeScore} $WP)`
      };
    }
    const lateSeconds = diffSeconds - graceSeconds;
    const minutesLate = Math.ceil(lateSeconds / 60);
    const rawScore = settings.onTimeScore - minutesLate * settings.latePenalty;
    const dailyScore = Math.max(rawScore, settings.minimumDailyScore);
    const isCapped = rawScore < settings.minimumDailyScore;
    const explanation = isCapped ? `${minutesLate} min late (Clamped to minimum floor: ${dailyScore} $WP)` : `${minutesLate} min late (-${(minutesLate * settings.latePenalty).toFixed(1)} $WP penalty = ${dailyScore.toFixed(1)} $WP)`;
    return {
      status: "late",
      isOnTime: false,
      minutesLate,
      dailyScore,
      diffSeconds,
      graceSeconds,
      explanation
    };
  }

  // src/storage/repository.ts
  var EMPLOYEES_KEY = "wp_meet_employees";
  var MEETINGS_KEY = "wp_meet_meetings";
  var RECORDS_KEY = "wp_meet_records";
  var SETTINGS_KEY = "wp_meet_settings";
  var SCHEMA_VERSION_KEY = "wp_meet_schema_version";
  var CURRENT_SCHEMA_VERSION = "3.5_fine_10pkr";
  var AppRepository = class {
    constructor(storage = storageAdapter) {
      this.storage = storage;
      __publicField(this, "auditLogger");
      this.auditLogger = new AuditLogger(storage);
    }
    /**
     * Initializes the repository with default data if empty.
     * Preserves existing employees, meetings, records, and settings across deployments/version updates.
     */
    async initialize() {
      const existingEmployees = await this.storage.getItem(EMPLOYEES_KEY);
      if (!existingEmployees || existingEmployees.length === 0) {
        await this.resetToSeedData();
        return;
      }
      const existingSettings = await this.storage.getItem(SETTINGS_KEY);
      if (existingSettings) {
        const merged = { ...DEFAULT_SETTINGS, ...existingSettings };
        await this.storage.setItem(SETTINGS_KEY, merged);
      }
      await this.storage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
    }
    async resetToSeedData() {
      const seed = generateSeedData();
      await this.storage.setItem(EMPLOYEES_KEY, seed.employees);
      await this.storage.setItem(MEETINGS_KEY, seed.meetings);
      await this.storage.setItem(RECORDS_KEY, seed.records);
      await this.storage.setItem(SETTINGS_KEY, seed.settings);
      await this.storage.setItem(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
      await this.auditLogger.clearLogs();
    }
    // ================= EMPLOYEES =================
    async getEmployees() {
      const data = await this.storage.getItem(EMPLOYEES_KEY);
      return data || [];
    }
    async saveEmployee(employee) {
      const list = await this.getEmployees();
      const existingIdx = list.findIndex((e) => e.id === employee.id);
      if (existingIdx >= 0) {
        list[existingIdx] = employee;
      } else {
        list.push(employee);
      }
      await this.storage.setItem(EMPLOYEES_KEY, list);
      return employee;
    }
    async deleteEmployee(id) {
      const list = await this.getEmployees();
      const filtered = list.filter((e) => e.id !== id);
      await this.storage.setItem(EMPLOYEES_KEY, filtered);
    }
    // ================= MEETINGS =================
    async getMeetings() {
      const data = await this.storage.getItem(MEETINGS_KEY);
      return data || [];
    }
    async getMeetingById(id) {
      const list = await this.getMeetings();
      return list.find((m) => m.id === id) || null;
    }
    async saveMeeting(meeting) {
      const list = await this.getMeetings();
      const existingIdx = list.findIndex((m) => m.id === meeting.id);
      if (existingIdx >= 0) {
        list[existingIdx] = meeting;
      } else {
        list.push(meeting);
      }
      await this.storage.setItem(MEETINGS_KEY, list);
      return meeting;
    }
    // ================= ATTENDANCE RECORDS =================
    async getAttendanceRecords() {
      const data = await this.storage.getItem(RECORDS_KEY);
      return data || [];
    }
    async getRecordsByMeetingId(meetingId) {
      const list = await this.getAttendanceRecords();
      return list.filter((r) => r.meetingId === meetingId);
    }
    async saveAttendanceRecord(record) {
      const list = await this.getAttendanceRecords();
      const existingIdx = list.findIndex((r) => r.id === record.id);
      if (existingIdx >= 0) {
        list[existingIdx] = { ...record, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      } else {
        list.push(record);
      }
      await this.storage.setItem(RECORDS_KEY, list);
      return record;
    }
    /**
     * Records a live participant join from Google Meet extension.
     * Uses FIRST join timestamp only to prevent double penalty or score dilution on re-joins.
     */
    async recordParticipantJoin(meetingId, employeeId, joinedAt = /* @__PURE__ */ new Date()) {
      const meeting = await this.getMeetingById(meetingId);
      if (!meeting) {
        throw new Error(`Meeting not found for id: ${meetingId}`);
      }
      const settings = await this.getSettings();
      const typeSettings = meeting.type === "eod" ? settings.eod : settings.standup;
      const list = await this.getAttendanceRecords();
      let record = list.find((r) => r.meetingId === meetingId && r.employeeId === employeeId);
      if (record && record.joinedAt) {
        return record;
      }
      const joinedIso = typeof joinedAt === "string" ? joinedAt : joinedAt.toISOString();
      const result = calculateAttendanceScore(meeting.scheduledStart, joinedIso, typeSettings);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (record) {
        record.status = result.status;
        record.joinedAt = joinedIso;
        record.minutesLate = result.minutesLate;
        record.dailyScore = result.dailyScore;
        record.isOnTime = result.isOnTime;
        record.notes = result.explanation;
        record.updatedAt = now;
      } else {
        record = {
          id: `rec-${meeting.type}-${meetingId}-${employeeId}`,
          meetingId,
          employeeId,
          meetingType: meeting.type,
          status: result.status,
          joinedAt: joinedIso,
          minutesLate: result.minutesLate,
          dailyScore: result.dailyScore,
          isOnTime: result.isOnTime,
          notes: result.explanation,
          createdAt: now,
          updatedAt: now
        };
        list.push(record);
      }
      await this.storage.setItem(RECORDS_KEY, list);
      return record;
    }
    /**
     * Manual admin attendance correction with compulsory audit logging.
     */
    async manualAttendanceCorrection(recordId, updates, changedBy, reason) {
      const list = await this.getAttendanceRecords();
      const record = list.find((r) => r.id === recordId);
      if (!record) {
        throw new Error(`Attendance record not found: ${recordId}`);
      }
      const employees = await this.getEmployees();
      const employee = employees.find((e) => e.id === record.employeeId) || {
        id: record.employeeId,
        name: "Unknown",
        active: true,
        createdAt: ""
      };
      const meeting = await this.getMeetingById(record.meetingId) || {
        id: record.meetingId,
        code: "",
        title: "Standup",
        type: record.meetingType,
        date: record.createdAt.split("T")[0],
        scheduledStart: record.createdAt,
        scheduledEnd: record.createdAt,
        status: "completed",
        timezone: "UTC",
        createdAt: record.createdAt
      };
      const oldValue = {
        status: record.status,
        joinedAt: record.joinedAt,
        dailyScore: record.dailyScore,
        minutesLate: record.minutesLate,
        isOnTime: record.isOnTime,
        notes: record.notes
      };
      Object.assign(record, updates, { updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      await this.auditLogger.logChange(
        record.id,
        employee,
        meeting,
        changedBy,
        oldValue,
        updates,
        reason
      );
      await this.storage.setItem(RECORDS_KEY, list);
      return record;
    }
    // ================= SETTINGS =================
    async getSettings() {
      const data = await this.storage.getItem(SETTINGS_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS;
    }
    async saveSettings(settings) {
      await this.storage.setItem(SETTINGS_KEY, settings);
      return settings;
    }
    // ================= EXPORT / IMPORT =================
    async exportFullDataJSON() {
      const [employees, meetings, records, settings, auditLogs] = await Promise.all([
        this.getEmployees(),
        this.getMeetings(),
        this.getAttendanceRecords(),
        this.getSettings(),
        this.auditLogger.getAuditLogs()
      ]);
      return JSON.stringify(
        {
          version: "1.0",
          exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
          employees,
          meetings,
          records,
          settings,
          auditLogs
        },
        null,
        2
      );
    }
    async importFullDataJSON(jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.employees) await this.storage.setItem(EMPLOYEES_KEY, data.employees);
        if (data.meetings) await this.storage.setItem(MEETINGS_KEY, data.meetings);
        if (data.records) await this.storage.setItem(RECORDS_KEY, data.records);
        if (data.settings) await this.storage.setItem(SETTINGS_KEY, data.settings);
        if (data.auditLogs) await this.storage.setItem("wp_meet_audit_logs", data.auditLogs);
        return true;
      } catch (e) {
        console.error("Import failed:", e);
        return false;
      }
    }
  };
  var repository = new AppRepository();

  // src/extension/content.ts
  console.log("[WebPenter Standup Extension] Content script loaded on Google Meet.");
  var observer = null;
  var pollInterval = null;
  var currentMeetingCode = null;
  var activeMeeting = null;
  var appSettings = null;
  var allEmployees = [];
  var recordedEmployeeIds = /* @__PURE__ */ new Set();
  var widgetContainer = null;
  async function initContentScript() {
    if (!isGoogleMeetCall()) return;
    currentMeetingCode = extractMeetingCode();
    console.log("[WebPenter Standup Extension] Active Meet Code:", currentMeetingCode);
    await repository.initialize();
    appSettings = await repository.getSettings();
    allEmployees = await repository.getEmployees();
    await ensureActiveMeeting();
    renderInMeetOverlayWidget();
    startContinuousTracking();
  }
  async function ensureActiveMeeting() {
    const now = /* @__PURE__ */ new Date();
    const currentHour = now.getHours();
    const isEod = currentHour >= 16;
    const meetingType = isEod ? "eod" : "standup";
    const typeSettings = isEod ? appSettings.eod : appSettings.standup;
    const todayStr = now.toISOString().split("T")[0];
    const meetings = await repository.getMeetings();
    let meet = meetings.find((m) => m.date === todayStr && m.type === meetingType);
    if (!meet) {
      const scheduledIso = `${todayStr}T${typeSettings.startTime}+05:00`;
      meet = {
        id: `meet-${meetingType}-${todayStr}`,
        code: `meet.google.com/${currentMeetingCode}`,
        title: isEod ? `Daily EOD \u2014 ${todayStr}` : `Daily Standup \u2014 ${todayStr}`,
        type: meetingType,
        date: todayStr,
        scheduledStart: scheduledIso,
        scheduledEnd: scheduledIso,
        status: "completed",
        timezone: "Asia/Karachi",
        createdAt: now.toISOString()
      };
      await repository.saveMeeting(meet);
    }
    activeMeeting = meet;
    return meet;
  }
  function renderInMeetOverlayWidget() {
    if (widgetContainer) return;
    widgetContainer = document.createElement("div");
    widgetContainer.id = "webpenter-meet-widget";
    widgetContainer.style.position = "fixed";
    widgetContainer.style.top = "16px";
    widgetContainer.style.right = "16px";
    widgetContainer.style.zIndex = "2147483647";
    widgetContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
    widgetContainer.style.backgroundColor = "rgba(15, 23, 42, 0.95)";
    widgetContainer.style.backdropFilter = "blur(12px)";
    widgetContainer.style.border = "1px solid rgba(59, 130, 246, 0.5)";
    widgetContainer.style.borderRadius = "12px";
    widgetContainer.style.padding = "8px 14px";
    widgetContainer.style.color = "#f8fafc";
    widgetContainer.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.7)";
    widgetContainer.style.display = "flex";
    widgetContainer.style.alignItems = "center";
    widgetContainer.style.gap = "10px";
    widgetContainer.style.fontSize = "12px";
    widgetContainer.style.transition = "all 0.3s ease";
    widgetContainer.innerHTML = `
    <div style="display:flex; align-items:center; gap:6px;">
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:#22c55e; box-shadow:0 0 8px #22c55e;"></span>
      <strong style="color:#60a5fa; font-weight:700;">WebPenter Tracker</strong>
    </div>
    <div style="height:14px; width:1px; background:rgba(255,255,255,0.2);"></div>
    <span id="wp-widget-status" style="color:#cbd5e1;">Live Tracking Active...</span>
    <button id="wp-scan-now-btn" style="background:#2563eb; color:#ffffff; border:none; border-radius:6px; padding:3px 8px; font-size:11px; font-weight:700; cursor:pointer; margin-left:4px;">Scan</button>
  `;
    document.body.appendChild(widgetContainer);
    const btn = document.getElementById("wp-scan-now-btn");
    if (btn) {
      btn.addEventListener("click", () => {
        console.log("[WebPenter Tracker] Manual scan triggered.");
        scanAndRecordParticipants();
      });
    }
  }
  function updateWidgetStatus(text, isLate = false) {
    const el = document.getElementById("wp-widget-status");
    if (el) {
      el.innerHTML = text;
      el.style.color = isLate ? "#fbbf24" : "#4ade80";
    }
  }
  function matchEmployeeByName(rawName) {
    if (!rawName) return null;
    const clean = rawName.toLowerCase().trim();
    const exact = allEmployees.find((e) => e.name.toLowerCase() === clean);
    if (exact) return exact;
    const contains = allEmployees.find(
      (e) => clean.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(clean)
    );
    if (contains) return contains;
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
    const now = /* @__PURE__ */ new Date();
    const nowIso = now.toISOString();
    const isEod = activeMeeting.type === "eod";
    const typeSettings = isEod ? appSettings.eod : appSettings.standup;
    for (const name of visibleNames) {
      const employee = matchEmployeeByName(name);
      const empId = employee ? employee.id : `emp-temp-${name.toLowerCase().replace(/\s+/g, "-")}`;
      if (recordedEmployeeIds.has(empId)) {
        continue;
      }
      recordedEmployeeIds.add(empId);
      let empRecord = employee;
      if (!empRecord) {
        empRecord = {
          id: empId,
          name,
          department: "Team Member",
          active: true,
          createdAt: nowIso
        };
        await repository.saveEmployee(empRecord);
        allEmployees.push(empRecord);
      }
      await repository.recordParticipantJoin(activeMeeting.id, empRecord.id, now);
      const scoreRes = calculateAttendanceScore(activeMeeting.scheduledStart, now, typeSettings);
      const timeFormatted = formatTime12(now);
      const scoreBadge = scoreRes.isOnTime ? `+${scoreRes.dailyScore} \u{1FA99} WP (On Time)` : `${scoreRes.dailyScore >= 0 ? "+" : ""}${scoreRes.dailyScore} \u{1FA99} WP (${scoreRes.minutesLate}m Late)`;
      console.log(`[WebPenter Tracker] \u2705 Recorded ${empRecord.name} at ${timeFormatted} -> ${scoreBadge}`);
      updateWidgetStatus(
        `Recorded: <strong>${empRecord.name}</strong> at ${timeFormatted} (${scoreBadge})`,
        !scoreRes.isOnTime
      );
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          type: "MEET_JOIN_DETECTED",
          payload: {
            meetCode: currentMeetingCode,
            userName: empRecord.name,
            employeeId: empRecord.id,
            joinedAt: nowIso,
            score: scoreRes.dailyScore,
            isOnTime: scoreRes.isOnTime,
            meetingType: activeMeeting.type
          }
        });
      }
      try {
        fetch("/api/attendance/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingId: activeMeeting.id,
            employeeId: empRecord.id,
            employeeName: empRecord.name,
            joinedAt: nowIso
          })
        }).catch(() => {
        });
      } catch (e) {
      }
    }
  }
  function startContinuousTracking() {
    scanAndRecordParticipants();
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(scanAndRecordParticipants, 2e3);
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      scanAndRecordParticipants();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContentScript);
  } else {
    initContentScript();
  }
  setInterval(() => {
    if (isGoogleMeetCall() && !widgetContainer) {
      initContentScript();
    }
  }, 2e3);
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === "FORCE_SCAN_PARTICIPANTS") {
        scanAndRecordParticipants().then(() => {
          sendResponse({ success: true, count: recordedEmployeeIds.size });
        });
        return true;
      }
    });
  }
})();
