# WebPenter Meet Standup & EOD Server & Headless Bot Deployment Guide

## 🚀 Overview
This repository contains the complete production Node.js server, React web dashboard, and autonomous Headless Google Meet Bot.

---

## 📦 What is Included:
1. **`server.js`**: Express server with REST API, SQLite/JSON database, and Slack integration.
2. **`bot/meet-bot.js`**: Puppeteer Headless Google Meet attendee tracking bot.
3. **`bot/scheduler.js`**: Cron scheduler configured for **09:58 AM (Standup)** and **05:58 PM (EOD)** in Pakistan Time (`Asia/Karachi`).
4. **`dist/`**: Pre-built React Web Dashboard and Chrome Extension assets.

---

## 🌐 How to Deploy on Hostinger (Step-by-Step):

### Option 1: Hostinger Cloud / VPS Hosting (Recommended)
1. **Upload Files**: Upload the project folder to `/var/www/webpenter-ranking` or your website root.
2. **Install Dependencies**:
   ```bash
   cd /var/www/webpenter-ranking
   npm install --production
   ```
3. **Install Chromium for Puppeteer** (if not pre-installed on VPS):
   ```bash
   sudo apt-get update
   sudo apt-get install -y chromium-browser libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
   ```
4. **Run with PM2 (24/7 background process)**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "webpenter-bot"
   pm2 save
   pm2 startup
   ```

---

### Option 2: Hostinger hPanel Node.js App Manager
1. In Hostinger hPanel, go to **Node.js**.
2. Set **Application Root**: `/public_html` (or your subdomain folder e.g. `ranking.webpenter.com`).
3. Set **Application Startup File**: `server.js`.
4. Set **Node.js Version**: `18.x`, `20.x`, or `22.x`.
5. Click **"Run NPM Install"** and click **"Restart Application"**.

---

## 🤖 How the Auto-Join Bot Works:
- At **09:58 AM PKT (Mon–Sat)**, the bot automatically launches in headless mode, joins `https://meet.google.com/jns-arbs-nyv`, records exact join timestamps of all team members entering the room, and saves them to the database.
- At **05:58 PM PKT (Mon–Fri)**, the bot repeats for EOD calls.
- At call completion, it formats and posts the daily report to **Slack `#daily-standup`**!

---

## 🔧 Useful Commands:
- **Test Bot Manually**:
  ```bash
  curl -X POST http://localhost:5000/api/bot/trigger -H "Content-Type: application/json" -d '{"meetLink":"https://meet.google.com/jns-arbs-nyv","durationMinutes":5}'
  ```
- **Check Bot Status**:
  ```bash
  curl http://localhost:5000/api/bot/status
  ```
