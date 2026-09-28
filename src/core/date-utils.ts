/**
 * Date and time utilities for standup & EOD attendance calculations
 */

export function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

export function formatTime24(date: Date | string, timeZone: string = 'Asia/Karachi'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  });
}

export function formatTime12(date: Date | string, timeZone: string = 'Asia/Karachi'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone,
  });
}

export function formatDateShort(date: Date | string, timeZone: string = 'Asia/Karachi'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone,
  });
}

export function formatDateLong(date: Date | string, timeZone: string = 'Asia/Karachi'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  });
}

export function getDayOfWeekIndex(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
}

/**
 * Returns difference in whole seconds between join time and scheduled time
 */
export function getDiffInSeconds(scheduledTime: string | Date, joinedTime: string | Date): number {
  const sched = typeof scheduledTime === 'string' ? new Date(scheduledTime).getTime() : scheduledTime.getTime();
  const joined = typeof joinedTime === 'string' ? new Date(joinedTime).getTime() : joinedTime.getTime();
  return Math.floor((joined - sched) / 1000);
}

/**
 * Generate standard week range key e.g. "2026-W39" and date range label e.g. "Sep 21 – Sep 27, 2026"
 */
export function getWeekInfo(date: Date | string, endDayOfWeek = 6): {
  weekKey: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;     // "Sep 21 – Sep 27, 2026"
} {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const currentDay = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  // If endDayOfWeek is 6 (Saturday), the week starts on Sunday (0) or Monday (1)
  // Standard business week closing on Saturday: Monday to Saturday (6 days) or Sunday to Saturday (7 days)
  // Let's compute distance back to Monday (1)
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  // Closing day (e.g. Saturday = +5 days from Monday, or Sunday = +6 days)
  const endOffset = endDayOfWeek === 6 ? 5 : 6;
  const closingDay = new Date(monday);
  closingDay.setDate(monday.getDate() + endOffset);
  closingDay.setHours(23, 59, 59, 999);

  const startStr = monday.toISOString().split('T')[0];
  const endStr = closingDay.toISOString().split('T')[0];

  const month1 = monday.toLocaleDateString('en-US', { month: 'short' });
  const day1 = monday.getDate();
  const month2 = closingDay.toLocaleDateString('en-US', { month: 'short' });
  const day2 = closingDay.getDate();
  const year = closingDay.getFullYear();

  const label = month1 === month2
    ? `${month1} ${day1} – ${day2}, ${year}`
    : `${month1} ${day1} – ${month2} ${day2}, ${year}`;

  // ISO Week Number
  const tempDate = new Date(monday.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  const weekKey = `${tempDate.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  return {
    weekKey,
    startDate: startStr,
    endDate: endStr,
    label,
  };
}

/**
 * Get Month key "YYYY-MM" and label "September 2026"
 */
export function getMonthInfo(date: Date | string): { monthKey: string; label: string; year: number; month: number } {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { monthKey, label, year, month };
}
