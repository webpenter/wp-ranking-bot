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
      headless: 'new', // Modern headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--mute-audio',
        '--disable-blink-features=AutomationControlled',
      ],
      defaultViewport: { width: 1280, height: 800 },
    });

    const page = await browser.newPage();

    // Block video stream and image bandwidth
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Grant camera and microphone permissions automatically
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(new URL(meetUrl).origin, ['camera', 'microphone']);

    console.log('[Bot] Navigating to Google Meet room...');
    await page.goto(meetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for initial meet UI
    await new Promise((r) => setTimeout(r, 4000));

    // Fill bot name in the name input field if present
    try {
      const nameInputSelector = 'input[type="text"], input[aria-label*="name" i]';
      const nameInput = await page.$(nameInputSelector);
      if (nameInput) {
        await nameInput.type(botName, { delay: 50 });
        console.log(`[Bot] Entered name: ${botName}`);
      }
    } catch (e) {
      // Ignore if signed-in or no name input
    }

    // Click "Ask to join" or "Join now"
    try {
      const joinButtons = await page.$$('button');
      for (const btn of joinButtons) {
        const text = await page.evaluate((el) => el.innerText || el.getAttribute('aria-label') || '', btn);
        if (/ask to join|join now|join meeting/i.test(text)) {
          await btn.click();
          console.log('[Bot] Clicked Join button!');
          break;
        }
      }
    } catch (e) {
      console.log('[Bot] Join button search completed.');
    }

    // Wait 5s for room entry
    await new Promise((r) => setTimeout(r, 5000));

    // Attempt to open the "People" panel so all participants DOM is visible
    try {
      const peopleButtons = await page.$$('button[aria-label*="people" i], button[aria-label*="everyone" i], button[aria-label*="participants" i]');
      if (peopleButtons.length > 0) {
        await peopleButtons[0].click();
        console.log('[Bot] Opened People panel.');
      }
    } catch (e) {
      // Panel might already be open
    }

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
