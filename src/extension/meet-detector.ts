/**
 * Google Meet DOM detector and participant extraction
 */

export function extractMeetingCode(): string | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1] : null;
}

export function isGoogleMeetCall(): boolean {
  return window.location.hostname === 'meet.google.com' && extractMeetingCode() !== null;
}

/**
 * Finds all participant names visible in the Google Meet call DOM
 */
export function getVisibleParticipantNames(): string[] {
  const names = new Set<string>();

  // 1. Participant tray / panel items (div[data-participant-id] or span[data-self-name])
  const participantElements = document.querySelectorAll(
    '[data-participant-id], [data-requested-participant-id], [aria-label*="participant"], div[role="listitem"]'
  );

  participantElements.forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length > 1 && text.length < 50 && !text.includes('\n')) {
      names.add(text);
    }
  });

  // 2. Video tile overlay labels
  const labelElements = document.querySelectorAll('div[data-self-name], span[jsname="Wvd9Cc"]');
  labelElements.forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length > 1 && text.length < 50) {
      names.add(text);
    }
  });

  return Array.from(names);
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
    if (match) return match[1].trim();
  }

  // Fallback to self video tile name
  const selfTile = document.querySelector('div[data-self-name]');
  if (selfTile) {
    const name = selfTile.getAttribute('data-self-name') || selfTile.textContent;
    if (name) return name.trim();
  }

  return null;
}
