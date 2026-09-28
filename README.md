# WebPenter Meet Standup & EOD Leaderboard ($WP)

An enterprise-grade Chrome Extension (Manifest V3) and companion Web Dashboard for tracking Google Meet daily standups, punctuality, attendance consistency, and weekly/monthly leaderboards under the foundational philosophy:

> **"CONSISTENCY FIRST. PUNCTUALITY SECOND."**  
> *First demonstrate consistent attendance (≥80%), then compete on punctuality. A person who attends only one meeting and is on time cannot outrank someone who attends every day.*

---

## 🚀 Key Features

1. **Deterministic Scoring Engine (`src/core/scoring.ts`)**:
   - **On-Time Reward**: `+5.0 $WP` (WebPenter currency).
   - **Grace Period**: 2 minutes (down to the exact second: `10:02:00` is ON TIME; `10:02:01` is LATE).
   - **Late Deduction**: `0.5 $WP` per minute late (`Math.ceil` rounding).
   - **Score Floor Clamp**: Configurable floor (e.g. `-5.0 $WP`), preventing unlimited score drops.
   - **Absence Handling**: Standup absence defaults to `0 $WP`; absences do not artificially dilute or inflate punctuality averages.

2. **Dual Meeting Tracking (Morning Standup + EOD)**:
   - Tracks both **Morning Standup** (10:00 AM) and **End Of Day (EOD)** (6:00 PM) on the same Google Meet link.
   - **EOD Rules**: Joining EOD earns positive `$WP`; **missing/skipping EOD incurs a mandatory fine/penalty** (default: `-5.0 $WP`).
   - **Configurable Active Days**: Multi-select active days for Morning Standup (e.g. Mon–Sat) and EOD (e.g. Mon–Fri) independently.

3. **Minus Points / Salary Deduction Warning System**:
   - Every negative `$WP` point translates to payroll salary deductions (e.g. `PKR 100` or `$10` per minus point).
   - Prominent policy notices in Slack reports and Dashboard headers:
     > ⚠️ *Policy Notice: Minus $WP balances result in payroll salary deductions. Please ensure on-time attendance.*

4. **1-Click Slack Integration (`src/core/slack-service.ts`)**:
   - **Daily Standup & EOD Reports**: 1-click dispatch to Slack channel (`#standup`) using Slack Block Kit with join timestamps, on-time badges, and missing attendee notices.
   - **Saturday Weekly Digest**: Weekly podium, full standings, and accumulated salary fine deductions.
   - **Month-End Grand Summary**: Monthly Grand Champion awards and HR payroll summary.
   - **Clipboard Fallback**: 1-click copy formatted Markdown if webhook is not configured yet.

5. **Saturday Weekly Leaderboard & Month-End Grand Champions**:
   - **Saturday Calculation Day**: Standup week closes on Saturday.
   - **Monthly Grand Podium**: Aggregates all weeks in the month to crown the **Top 3 Grand Champions (🥇, 🥈, 🥉)** for company rewards, plus monthly HR salary deduction totals.

6. **Chrome Extension (Manifest V3) & In-Meet Tracker**:
   - Automatic participant detection on `meet.google.com/*`.
   - Records first join timestamp (prevents double penalties on rejoins).
   - Floating in-meeting status widget.
   - Popup quick-view.

7. **Admin Settings & Audit Trail**:
   - Configurable scoring rules, schedule times, active days, fine rates, and Slack webhook.
   - Manual attendance corrections require a mandatory reason and are logged to an immutable audit trail (`who, when, old value, new value, reason`).

---

## 🛠️ Installation & Setup

### 1. Run in Development Mode
```bash
npm install
npm run dev
```
Open `http://localhost:3000` to view the full interactive Web Dashboard.

### 2. Run Automated Test Suite
```bash
npm test
```
Runs 18 unit and integration tests covering scoring formulas, boundary seconds, floor clamping, eligibility partitioning, and the prompt's fixture dataset.

### 3. Build for Chrome Extension & Web Hosting
```bash
npm run build
```
This builds production-ready files in the `dist/` directory.

---

## 📦 How to Host & Deploy

### A. Deploy to GitHub Pages (or Vercel / Netlify)
The Dashboard is a static Single Page App configured with relative paths (`base: './'`).

**Option 1: Deploy with `gh-pages`**
```bash
# Install gh-pages
npm install -D gh-pages

# Add script to package.json: "deploy": "gh-pages -d dist"
npm run build
npx gh-pages -d dist
```

**Option 2: Direct GitHub Actions / Repository Settings**
1. Push this repository to GitHub.
2. Go to **Settings → Pages** in your GitHub repository.
3. Select **Deploy from a branch** → Branch: `gh-pages` or `main /dist`.
4. Your live dashboard is now accessible at `https://<your-username>.github.io/webpenter-ranking/`!

---

### B. Load as Google Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked**.
4. Select the `dist/` directory from this project.
5. Pin the extension to your Chrome toolbar.
6. Whenever you join `meet.google.com`, the extension will automatically track your join timestamp and score!

---

## 🧪 Test Fixture Dataset Results

| Employee | Attended | Absent | Attendance % | Punctuality Avg | Total $WP | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **🥇 Zahid Khurshid** | 4/5 | 0 (1 exc) | 80% | **4.8 $WP** | 19.0 $WP | **Eligible** |
| **🥈 Ali Hassan** | 5/5 | 0 | 100% | **4.6 $WP** | 23.0 $WP | **Eligible** |
| **🥉 Ayub Khokhar** | 5/5 | 0 | 100% | **3.4 $WP** | 17.0 $WP | **Eligible** |
| **Mehtab Sain** | 4/5 | 1 | 80% | **0.5 $WP** | 2.0 $WP | **Eligible** |
| **Ahmad Raza** | 5/5 | 0 | 100% | **-5.0 $WP** | -25.0 $WP | **Eligible** |
| **Waqar Hussain** | 1/5 | 4 | 20% | 5.0 $WP | 5.0 $WP | **NOT ELIGIBLE** |
| **Fayyaz WebPenter** | 3/5 | 2 | 60% | 2.0 $WP | 6.0 $WP | **NOT ELIGIBLE** |
| **Muhammad Sadiq** | 3/5 | 2 | 60% | 1.7 $WP | 5.0 $WP | **NOT ELIGIBLE** |
| **Web Penter Inc** | 3/5 | 2 | 60% | 0.7 $WP | 2.0 $WP | **NOT ELIGIBLE** |
| **Fayyaz Ahmad** | 1/5 | 4 | 20% | 1.0 $WP | 1.0 $WP | **NOT ELIGIBLE** |

*Note: Waqar Hussain (20% attendance) is marked Ineligible and cannot enter the Top 3 despite a 5.0 single-meeting score, while consistent attendees are recognized and eligible.*

---

## 📄 License
MIT License • WebPenter Standup Ranking System
