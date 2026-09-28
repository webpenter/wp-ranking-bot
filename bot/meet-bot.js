import puppeteer from 'puppeteer';

let currentBotSession = {
  isRunning: false,
  meetUrl: null,
  startedAt: null,
  attendeesCaptured: [],
};

export function getBotStatus() {
  return currentBotSession;
}

/**
 * Runs the Headless Google Meet Attendance Bot
 */
export async function runMeetingBot({
  meetUrl = 'https://meet.google.com/jns-arbs-nyv',
  durationMinutes = 30,
  apiUrl = 'http://localhost:3000',
  botName = 'WebPenter Standup Bot',
}) {
  if (currentBotSession.isRunning) {
    console.log('[Bot] Session already in progress.');
    return;
  }

  console.log(`\n🤖 [WebPenter Bot] Launching Headless Bot for: ${meetUrl}`);
  currentBotSession = {
    isRunning: true,
    meetUrl,
    startedAt: new Date().toISOString(),
    attendeesCaptured: [],
  };

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Launch visible or background browser without Google bot block
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--mute-audio',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800',
      ],
      defaultViewport: { width: 1280, height: 800 },
    });

    const page = await browser.newPage();

    // Set real desktop User Agent to prevent Google Meet redirecting to marketing page
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    );

    // Evade webdriver detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Grant camera and microphone permissions automatically
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(new URL(meetUrl).origin, ['camera', 'microphone']);

    console.log('[Bot] Navigating to Google Meet room...');
    await page.goto(meetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait 3s for Google Meet pre-join screen to stabilize
    await new Promise((r) => setTimeout(r, 3000));

    // Turn off camera & mic using Google Meet native hotkeys (Ctrl + E and Ctrl + D)
    try {
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyD'); // Mute Mic
      await page.keyboard.press('KeyE'); // Turn off Camera
      await page.keyboard.up('Control');
      console.log('[Bot] Muted microphone and turned off camera via shortcuts.');
    } catch (e) {}

    await new Promise((r) => setTimeout(r, 1500));

    // Fill bot name in the name input field if present (for non-signed-in guests)
    try {
      const nameInput = await page.$('input[type="text"], input[aria-label*="name" i], input[placeholder*="name" i]');
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type(botName, { delay: 30 });
        console.log(`[Bot] Entered name: ${botName}`);
      }
    } catch (e) {}

    await new Promise((r) => setTimeout(r, 1500));

    // Click "Join now" or "Ask to join" button
    try {
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, span[role="button"], div[role="button"]'));
        for (const btn of buttons) {
          const text = (btn.innerText || btn.textContent || btn.getAttribute('aria-label') || '').trim().toLowerCase();
          if (text === 'join now' || text === 'ask to join' || text.includes('join now') || text.includes('ask to join') || text === 'join') {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (clicked) {
        console.log('[Bot] Clicked Join button!');
      } else {
        console.log('[Bot] Join button search completed (might be auto-admitted).');
      }
    } catch (e) {
      console.log('[Bot] Join button search error:', e.message);
    }

    // Wait 5s for room entry
    await new Promise((r) => setTimeout(r, 5000));

    // Attempt to open the "People" panel so all participants DOM is visible
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"]'));
        for (const btn of buttons) {
          const aria = (btn.getAttribute('aria-label') || btn.innerText || '').toLowerCase();
          if (aria.includes('people') || aria.includes('everyone') || aria.includes('participants') || aria.includes('show everyone')) {
            btn.click();
            break;
          }
        }
      });
      console.log('[Bot] Requested People panel toggle.');
    } catch (e) {}

    console.log('[Bot] 👁️ Live Attendance Tracking Started...');

    const capturedNames = new Set();
    const startTime = Date.now();
    const durationMs = durationMinutes * 60 * 1000;

    // Polling loop to detect and capture participant names every 2 seconds
    while (Date.now() - startTime < durationMs) {
      try {
        const namesOnScreen = await page.evaluate(() => {
          const list = [];
          // Select participant items from Meet DOM
          const elements = document.querySelectorAll(
            '[data-participant-id], div[role="listitem"], [data-requested-participant-id], div[aria-label*="participant" i], span[class*="zWGUib"], div[class*="ZjFb7c"]'
          );

          elements.forEach((el) => {
            const text = (el.innerText || el.getAttribute('aria-label') || '').trim();
            if (text && text.length > 2 && text.length < 50) {
              const lines = text.split('\n');
              const candidate = lines[0].replace(/\(You\)/gi, '').replace(/\(Host\)/gi, '').trim();
              if (candidate && !/people|chat|details|activities|more options|mic|camera|leave call|bot/i.test(candidate)) {
                list.push(candidate);
              }
            }
          });
          return Array.from(new Set(list));
        });

        for (const name of namesOnScreen) {
          if (!capturedNames.has(name)) {
            capturedNames.add(name);
            const joinedAt = new Date().toISOString();
            currentBotSession.attendeesCaptured.push({ name, joinedAt });
            console.log(`[Bot] ✅ New Join Captured: "${name}" at ${joinedAt}`);

            // Send to Server API
            try {
              await fetch(`${apiUrl}/api/attendance/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  employeeName: name,
                  joinedAt,
                }),
              });
            } catch (postErr) {
              console.error('[Bot API Error]', postErr.message);
            }
          }
        }
      } catch (pollErr) {
        // Continue tracking loop
      }

      await new Promise((r) => setTimeout(r, 2500));
    }

    console.log(`[Bot] 🏁 Meeting duration completed (${durationMinutes} mins). Exiting.`);
  } catch (err) {
    console.error('[Bot Error]', err);
  } finally {
    currentBotSession.isRunning = false;
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

// Auto-run if executed directly via node
if (process.argv[1] && process.argv[1].includes('meet-bot.js')) {
  const meetUrl = process.argv[2] || process.env.MEET_URL || 'https://meet.google.com/jns-arbs-nyv';
  const duration = parseInt(process.argv[3] || '35', 10);
  console.log(`[Bot Runner] Starting meeting bot for: ${meetUrl} (${duration} mins)`);
  runMeetingBot({ meetUrl, durationMinutes: duration });
}
