import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const HOST = process.env.IP || '::';
const PORT = parseInt(process.env.PORT || process.env.ALWAYSDATA_HTTPD_PORT || '8100', 10);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Safe bot loader
let runMeetingBot = async () => ({ success: false, message: 'Bot not initialized' });
let getBotStatus = () => ({ isRunning: false, message: 'Bot status unavailable' });

try {
  const botMod = await import('./bot/meet-bot.js');
  runMeetingBot = botMod.runMeetingBot;
  getBotStatus = botMod.getBotStatus;
} catch (e) {
  console.log('[Info] Puppeteer bot running in lightweight API mode.');
}

app.use(cors());
app.use(express.json());

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default Seed Data
const DEFAULT_SETTINGS = {
  currencySymbol: '🪙 WP',
  minimumAttendancePercentage: 80,
  excludeExcusedFromDenominator: true,
  timezone: 'Asia/Karachi',
  finePerMinusPoint: 10,
  salaryCurrency: 'PKR',
  weeklyCalculationDay: 6,
  standup: {
    enabled: true,
    startTime: '10:00:00',
    onTimeScore: 5,
    gracePeriodMinutes: 2,
    latePenalty: 0.5,
    minimumDailyScore: -5,
    absentScore: -5,
    activeDays: [1, 2, 3, 4, 5, 6],
  },
  eod: {
    enabled: true,
    startTime: '18:40:00',
    onTimeScore: 5,
    gracePeriodMinutes: 2,
    latePenalty: 0.5,
    minimumDailyScore: -5,
    absentScore: -5,
    activeDays: [1, 2, 3, 4, 5],
  },
  enableDailyTop3Bonus: true,
  dailyTop3BonusPoints: [3, 2, 1],
  monthlyGrandRewardNotes: '🏆 Top 3 Monthly Grand Champions receive company rewards + performance bonuses.',
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || '',
  slackChannel: '#daily-standup',
  slackAutoShareOnEnd: true,
  slackWarningMessageTemplate: '⚠️ *Policy Notice:* Minus 🪙 WP coin balances result in payroll salary deductions (PKR 10 per minus point). Please ensure on-time attendance for all scheduled Standup & EOD calls.',
  meetLink: 'https://meet.google.com/jns-arbs-nyv',
};

const DEFAULT_EMPLOYEES = [
  { id: 'emp-ayub', name: 'Ayub Khokhar', email: 'ayub@webpenter.com', department: 'Business Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-ali', name: 'Ali Hassan', email: 'ali@webpenter.com', department: 'Business Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-zahid', name: 'Zahid Khurshid', email: 'zahid@webpenter.com', department: 'Senior Software Engineer | Founder', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-ahmad', name: 'Ahmad Raza', email: 'ahmad@webpenter.com', department: 'Senior Software Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-mehtab', name: 'Mehtab Sain', email: 'mehtab@webpenter.com', department: 'PHP Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-fayyaz-a', name: 'Fayyaz Ahmad', email: 'fayyaz.ahmad@webpenter.com', department: 'Junior PHP Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-waqar', name: 'Waqar Hussain', email: 'waqar@webpenter.com', department: 'Full Stack Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-sadiq', name: 'Muhammad Sadiq', email: 'sadiq@webpenter.com', department: 'Full Stack Developer', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-fayyaz-wp', name: 'Fayyaz WebPenter', email: 'fayyaz.wp@webpenter.com', department: 'Management', active: true, createdAt: '2026-09-28T00:00:00Z' },
  { id: 'emp-wp-inc', name: 'Web Penter Inc.', email: 'team@webpenter.com', department: 'Management', active: true, createdAt: '2026-09-28T00:00:00Z' },
];

function loadDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb = {
      version: '3.2',
      employees: DEFAULT_EMPLOYEES,
      meetings: [
        {
          id: 'meet-su-2026-09-28',
          code: 'meet.google.com/jns-arbs-nyv',
          title: 'Daily Standup — Monday, Sep 28',
          type: 'standup',
          date: '2026-09-28',
          scheduledStart: '2026-09-28T10:00:00.000Z',
          scheduledEnd: '2026-09-28T10:30:00.000Z',
          status: 'completed',
          timezone: 'Asia/Karachi',
          createdAt: '2026-09-28T10:00:00.000Z',
        },
      ],
      records: [
        { id: 'rec-1', meetingId: 'meet-su-2026-09-28', employeeId: 'emp-ayub', meetingType: 'standup', status: 'late', joinedAt: '2026-09-28T10:02:51.000Z', minutesLate: 1, dailyScore: 4.5, isOnTime: false, notes: 'Joined 10:02:51 AM', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z' },
        { id: 'rec-2', meetingId: 'meet-su-2026-09-28', employeeId: 'emp-fayyaz-wp', meetingType: 'standup', status: 'late', joinedAt: '2026-09-28T10:03:21.000Z', minutesLate: 2, dailyScore: 4.0, isOnTime: false, notes: 'Joined 10:03:21 AM', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z' },
        { id: 'rec-3', meetingId: 'meet-su-2026-09-28', employeeId: 'emp-wp-inc', meetingType: 'standup', status: 'late', joinedAt: '2026-09-28T10:03:21.000Z', minutesLate: 2, dailyScore: 4.0, isOnTime: false, notes: 'Joined 10:03:21 AM', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z' },
        { id: 'rec-4', meetingId: 'meet-su-2026-09-28', employeeId: 'emp-waqar', meetingType: 'standup', status: 'late', joinedAt: '2026-09-28T10:04:21.000Z', minutesLate: 3, dailyScore: 3.5, isOnTime: false, notes: 'Joined 10:04:21 AM', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z' },
        { id: 'rec-5', meetingId: 'meet-su-2026-09-28', employeeId: 'emp-ali', meetingType: 'standup', status: 'late', joinedAt: '2026-09-28T10:19:23.000Z', minutesLate: 18, dailyScore: -4.0, isOnTime: false, notes: 'Joined 10:19:23 AM', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z' },
        { id: 'rec-6', meetingId: 'meet-su-2026-09-28', employeeId: 'emp-zahid', meetingType: 'standup', status: 'late', joinedAt: '2026-09-28T10:19:23.000Z', minutesLate: 18, dailyScore: -4.0, isOnTime: false, notes: 'Joined 10:19:23 AM', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z' },
        { id: 'rec-7', meetingId: 'meet-su-2026-09-28', employeeId: 'emp-ahmad', meetingType: 'standup', status: 'late', joinedAt: '2026-09-28T10:20:00.000Z', minutesLate: 19, dailyScore: -4.5, isOnTime: false, notes: 'Joined 10:20:00 AM', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z' },
        { id: 'rec-8', meetingId: 'meet-su-2026-09-28', employeeId: 'emp-mehtab', meetingType: 'standup', status: 'late', joinedAt: '2026-09-28T10:20:15.000Z', minutesLate: 19, dailyScore: -4.5, isOnTime: false, notes: 'Joined 10:20:15 AM', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z' },
        { id: 'rec-9', meetingId: 'meet-su-2026-09-28', employeeId: 'emp-sadiq', meetingType: 'standup', status: 'absent', joinedAt: null, minutesLate: 0, dailyScore: -5.0, isOnTime: false, notes: 'Unexcused absence', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z' },
        { id: 'rec-10', meetingId: 'meet-su-2026-09-28', employeeId: 'emp-fayyaz-a', meetingType: 'standup', status: 'absent', joinedAt: null, minutesLate: 0, dailyScore: -5.0, isOnTime: false, notes: 'Unexcused absence', createdAt: '2026-09-28T10:00:00.000Z', updatedAt: '2026-09-28T10:00:00.000Z' },
      ],
      settings: DEFAULT_SETTINGS,
      auditLogs: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function saveDatabase(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Punctuality scoring helper
function calculateScore(scheduledStartIso, joinedAtIso, settings) {
  const sched = new Date(scheduledStartIso).getTime();
  const joined = new Date(joinedAtIso).getTime();
  const diffSec = (joined - sched) / 1000;
  const graceSec = (settings.gracePeriodMinutes || 2) * 60;

  if (diffSec <= graceSec) {
    return { status: 'present', isOnTime: true, minutesLate: 0, dailyScore: settings.onTimeScore || 5.0 };
  }

  const lateSec = diffSec - graceSec;
  const minutesLate = Math.ceil(lateSec / 60);
  const score = Math.max(
    (settings.onTimeScore || 5.0) - minutesLate * (settings.latePenalty || 0.5),
    settings.minimumDailyScore || -5.0
  );

  return { status: 'late', isOnTime: false, minutesLate, dailyScore: score };
}

// ================= API ENDPOINTS =================

// 1. Get Full System State
app.get('/api/state', (req, res) => {
  const db = loadDatabase();
  res.json(db);
});

// 2. Record Participant Join (Earliest Timestamp Wins)
app.post('/api/attendance/join', (req, res) => {
  const { meetingId, employeeName, employeeId, joinedAt = new Date().toISOString() } = req.body;
  const db = loadDatabase();

  let employee = db.employees.find(
    (e) => e.id === employeeId || (employeeName && e.name.toLowerCase().trim() === employeeName.toLowerCase().trim())
  );

  if (!employee && employeeName) {
    // Auto-register new team member if found in meeting
    employee = {
      id: `emp-${Date.now()}`,
      name: employeeName.trim(),
      department: 'Engineering',
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.employees.push(employee);
  }

  if (!employee) {
    return res.status(400).json({ error: 'Employee not identified.' });
  }

  let meeting = db.meetings.find((m) => m.id === meetingId);
  if (!meeting) {
    // Use active or today's meeting
    const todayStr = new Date().toISOString().split('T')[0];
    meeting = db.meetings.find((m) => m.date === todayStr) || db.meetings[db.meetings.length - 1];
  }

  if (!meeting) {
    return res.status(404).json({ error: 'No active meeting found.' });
  }

  const typeSettings = meeting.type === 'eod' ? db.settings.eod : db.settings.standup;
  let record = db.records.find((r) => r.meetingId === meeting.id && r.employeeId === employee.id);

  // If already recorded with earlier timestamp, protect it (Earliest Timestamp Locking!)
  if (record && record.joinedAt && new Date(record.joinedAt) <= new Date(joinedAt)) {
    return res.json({ success: true, protected: true, record });
  }

  const calc = calculateScore(meeting.scheduledStart, joinedAt, typeSettings);

  if (record) {
    record.status = calc.status;
    record.joinedAt = joinedAt;
    record.minutesLate = calc.minutesLate;
    record.dailyScore = calc.dailyScore;
    record.isOnTime = calc.isOnTime;
    record.updatedAt = new Date().toISOString();
  } else {
    record = {
      id: `rec-${Date.now()}-${employee.id}`,
      meetingId: meeting.id,
      employeeId: employee.id,
      meetingType: meeting.type,
      status: calc.status,
      joinedAt,
      minutesLate: calc.minutesLate,
      dailyScore: calc.dailyScore,
      isOnTime: calc.isOnTime,
      notes: calc.isOnTime ? 'Joined on time' : `${calc.minutesLate}m late`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.records.push(record);
  }

  saveDatabase(db);
  console.log(`[Join Recorded] ${employee.name} at ${joinedAt} (${calc.dailyScore} $WP)`);
  res.json({ success: true, record, employee });
});

// 3. Manual Correction & Approved Leave
app.post('/api/attendance/correction', (req, res) => {
  const { recordId, updates, changedBy = 'Admin', reason = '' } = req.body;
  const db = loadDatabase();

  const record = db.records.find((r) => r.id === recordId);
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }

  const employee = db.employees.find((e) => e.id === record.employeeId) || { name: 'Unknown' };
  const meeting = db.meetings.find((m) => m.id === record.meetingId) || { title: 'Meeting' };

  const auditEntry = {
    id: `audit-${Date.now()}`,
    recordId,
    employeeId: record.employeeId,
    employeeName: employee.name,
    meetingId: record.meetingId,
    meetingDate: meeting.date,
    meetingType: record.meetingType,
    changedBy,
    timestamp: new Date().toISOString(),
    oldValue: { ...record },
    newValue: updates,
    reason,
  };

  Object.assign(record, updates, { updatedAt: new Date().toISOString() });
  db.auditLogs.unshift(auditEntry);
  saveDatabase(db);

  res.json({ success: true, record, auditEntry });
});

// 4. Save Settings
app.post('/api/settings', (req, res) => {
  const db = loadDatabase();
  db.settings = { ...db.settings, ...req.body };
  saveDatabase(db);
  res.json({ success: true, settings: db.settings });
});

// 5. Employee CRUD
app.post('/api/employees', (req, res) => {
  const db = loadDatabase();
  const emp = req.body;
  const idx = db.employees.findIndex((e) => e.id === emp.id);
  if (idx >= 0) {
    db.employees[idx] = { ...db.employees[idx], ...emp };
  } else {
    db.employees.push({ id: `emp-${Date.now()}`, active: true, createdAt: new Date().toISOString(), ...emp });
  }
  saveDatabase(db);
  res.json({ success: true, employees: db.employees });
});

app.delete('/api/employees/:id', (req, res) => {
  const db = loadDatabase();
  db.employees = db.employees.filter((e) => e.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true, employees: db.employees });
});

// 6. Trigger Google Meet Headless Bot Manually
app.post('/api/bot/trigger', async (req, res) => {
  const { meetLink, durationMinutes } = req.body;
  const db = loadDatabase();
  const link = meetLink || db.settings.meetLink || 'https://meet.google.com/jns-arbs-nyv';

  try {
    // Start bot asynchronously
    runMeetingBot({
      meetUrl: link,
      durationMinutes: durationMinutes || 30,
      apiUrl: `http://localhost:${PORT}`,
    }).catch((err) => console.error('[Bot Error]', err));

    res.json({ success: true, message: `Bot launched for meeting: ${link}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bot/status', (req, res) => {
  res.json(getBotStatus());
});

// 7. Dispatch to Slack from Server
app.post('/api/slack/send', async (req, res) => {
  const { payload, webhookUrl } = req.body;
  const db = loadDatabase();
  const url = webhookUrl || db.settings.slackWebhookUrl;

  if (!url) {
    return res.status(400).json({ error: 'Slack Webhook URL not configured.' });
  }

  try {
    const slackRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (slackRes.ok) {
      res.json({ success: true, message: 'Report posted to Slack!' });
    } else {
      const errText = await slackRes.text();
      res.status(500).json({ error: `Slack API returned ${slackRes.status}: ${errText}` });
    }
  } catch (err) {
    res.status(500).json({ error: `Failed to reach Slack: ${err.message}` });
  }
});

// Serve frontend static build
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(distDir, 'index.html'));
    } else {
      next();
    }
  });
}

// Start Server & Scheduler
app.listen(PORT, HOST, async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 WebPenter Standup & EOD Server Running on ${HOST}:${PORT}`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  try {
    const schedMod = await import('./bot/scheduler.js');
    schedMod.initScheduler(`http://localhost:${PORT}`);
  } catch (e) {
    console.log('[Info] Scheduler running in lightweight mode.');
  }
});
