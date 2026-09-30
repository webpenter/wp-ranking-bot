/**
 * Google Meet DOM detector and participant extraction
 */

export function extractMeetingCode(): string | null {
  const pathname = window.location.pathname.replace(/^\/+/, '');
  if (!pathname || /^(about|landing|terms|privacy|apps|get-started|help)/i.test(pathname)) {
    return null;
  }
  const match = pathname.match(/([a-z]{3}-[a-z]{4}-[a-z]{3}|[a-z0-9_-]{3,30})/i);
  return match ? match[1] : null;
}

export function isGoogleMeetCall(): boolean {
  return window.location.hostname.includes('meet.google.com') && extractMeetingCode() !== null;
}

/**
 * Finds all participant names visible in the Google Meet call DOM
 */
export function getVisibleParticipantNames(): string[] {
  const names = new Set<string>();
  const ignoredKeywords = new Set([
    'people', 'chat', 'details', 'activities', 'more options', 'mic', 'camera', 
    'turn on captions', 'raise hand', 'leave call', 'meeting details', 'everyone',
    'search for people', 'add people', 'host controls', 'you', 'host', 'presentation',
    'send a message', 'in-call messages', 'meeting host'
  ]);

  // 1. Participant tray / panel items & role listitems
  const participantElements = document.querySelectorAll(
    '[data-participant-id], [data-requested-participant-id], [aria-label*="participant" i], div[role="listitem"], span[class*="zWGUib"], div[class*="ZjFb7c"], div[class*="poVWob"]'
  );

  participantElements.forEach((el) => {
    const raw = (el.textContent || el.getAttribute('aria-label') || '').trim();
    if (!raw) return;

    // Take the first line (name is always first before status/mic info)
    const firstLine = raw.split('\n')[0].trim();
    const cleaned = cleanParticipantName(firstLine);
    if (isValidName(cleaned, ignoredKeywords)) {
      names.add(cleaned);
    }
  });

  // 2. Video tile overlay labels
  const labelElements = document.querySelectorAll(
    'div[data-self-name], span[jsname="Wvd9Cc"], div[data-name], div[jsname="skNjhb"], div[class*="poVWob"], div[class*="ZjFb7c"], span[class*="zWGUib"], div[data-participant-id] span'
  );
  labelElements.forEach((el) => {
    const raw = (el.getAttribute('data-self-name') || el.textContent || '').trim();
    if (!raw) return;

    const firstLine = raw.split('\n')[0].trim();
    const cleaned = cleanParticipantName(firstLine);
    if (isValidName(cleaned, ignoredKeywords)) {
      names.add(cleaned);
    }
  });

  return Array.from(names);
}

function cleanParticipantName(name: string): string {
  return name
    .replace(/\s*\((You|Host|Meeting host|Presentation|Joined by phone|Pinned)\)/gi, '')
    .replace(/\s*\(.*?\)/g, '')
    .trim();
}

function isValidName(name: string, ignored: Set<string>): boolean {
  if (!name || name.length < 2 || name.length > 50) return false;
  if (ignored.has(name.toLowerCase())) return false;
  // Exclude numbers-only or UI icon strings
  if (/^\d+$/.test(name) || /^(more_vert|mic|videocam|call_end|volume_off|closed_caption)$/i.test(name)) return false;
  return true;
}

/**
 * Extract current user's display name from Google Meet account button or title
 */
export function getCurrentUserName(): string | null {
  // Try finding account avatar tooltip or aria-label
  const accountBtn = document.querySelector('a[aria-label*="Google Account:"], a[aria-label*="Account"]');
  if (accountBtn) {
    const label = accountBtn.getAttribute('aria-label') || '';
    const match = label.match(/Google Account:\s*([^(\n]+)/i);
    if (match) return cleanParticipantName(match[1]);
  }

  // Fallback to self video tile name
  const selfTile = document.querySelector('div[data-self-name]');
  if (selfTile) {
    const name = selfTile.getAttribute('data-self-name') || selfTile.textContent;
    if (name) return cleanParticipantName(name);
  }

  return null;
}
