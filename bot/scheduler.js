import cron from 'node-cron';
import { runMeetingBot } from './meet-bot.js';

/**
 * Initializes Cron Jobs for Morning Standup & EOD Calls
 */
export function initScheduler(apiUrl = 'http://localhost:3000') {
  console.log('⏰ [Scheduler] Standup & EOD Auto-Join Scheduler Active.');

  // 1. Morning Standup: Runs Mon-Sat at 09:58 AM PKT (Asia/Karachi)
  // 2 minutes before 10:00 AM Standup
  cron.schedule(
    '58 9 * * 1-6',
    async () => {
      console.log('🔔 [Scheduler] Triggering 10:00 AM Morning Standup Bot...');
      try {
        const stateRes = await fetch(`${apiUrl}/api/state`);
        const state = await stateRes.json();
        if (state.settings?.standup?.enabled) {
          const meetLink = state.settings.meetLink || 'https://meet.google.com/jns-arbs-nyv';
          runMeetingBot({
            meetUrl: meetLink,
            durationMinutes: 32,
            apiUrl,
            botName: 'WebPenter Standup Bot',
          });
        }
      } catch (err) {
        console.error('[Scheduler Standup Error]', err.message);
      }
    },
    {
      timezone: 'Asia/Karachi',
    }
  );

  // 2. End of Day (EOD): Runs Mon-Fri at 05:58 PM PKT (Asia/Karachi)
  // 2 minutes before 06:00 PM EOD
  cron.schedule(
    '58 17 * * 1-5',
    async () => {
      console.log('🔔 [Scheduler] Triggering 06:00 PM End of Day (EOD) Bot...');
      try {
        const stateRes = await fetch(`${apiUrl}/api/state`);
        const state = await stateRes.json();
        if (state.settings?.eod?.enabled) {
          const meetLink = state.settings.meetLink || 'https://meet.google.com/jns-arbs-nyv';
          runMeetingBot({
            meetUrl: meetLink,
            durationMinutes: 32,
            apiUrl,
            botName: 'WebPenter EOD Bot',
          });
        }
      } catch (err) {
        console.error('[Scheduler EOD Error]', err.message);
      }
    },
    {
      timezone: 'Asia/Karachi',
    }
  );
}
