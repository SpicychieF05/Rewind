export type RangePreset =
  | '1month'
  | '2months'
  | '3months'
  | '6months'
  | '1year'
  | '2years'
  | '3years'
  | '4years'
  | '5years';

export type Timeline =
  | { kind: 'range'; preset: RangePreset }
  | { kind: 'date'; date: string /* YYYY-MM-DD */ };

export interface RangePresetOption {
  value: RangePreset;
  label: string;
  group: 'months' | 'years';
}

export const RANGE_PRESETS: RangePresetOption[] = [
  { value: '1month',  label: 'Last 1 month',  group: 'months' },
  { value: '2months', label: 'Last 2 months', group: 'months' },
  { value: '3months', label: 'Last 3 months', group: 'months' },
  { value: '6months', label: 'Last 6 months', group: 'months' },
  { value: '1year',   label: 'Last 1 year',   group: 'years' },
  { value: '2years',  label: 'Last 2 years',  group: 'years' },
  { value: '3years',  label: 'Last 3 years',  group: 'years' },
  { value: '4years',  label: 'Last 4 years',  group: 'years' },
  { value: '5years',  label: 'Last 5 years',  group: 'years' },
];

export const YT_LAUNCH_DATE = '2005-04-23';

/**
 * Resolves the start date for a range preset from a reference date
 */
export function resolveRangeStart(preset: RangePreset, fromDate = new Date()): Date {
  const d = new Date(fromDate.getTime());
  switch (preset) {
    case '1month':
      d.setMonth(d.getMonth() - 1);
      break;
    case '2months':
      d.setMonth(d.getMonth() - 2);
      break;
    case '3months':
      d.setMonth(d.getMonth() - 3);
      break;
    case '6months':
      d.setMonth(d.getMonth() - 6);
      break;
    case '1year':
      d.setFullYear(d.getFullYear() - 1);
      break;
    case '2years':
      d.setFullYear(d.getFullYear() - 2);
      break;
    case '3years':
      d.setFullYear(d.getFullYear() - 3);
      break;
    case '4years':
      d.setFullYear(d.getFullYear() - 4);
      break;
    case '5years':
      d.setFullYear(d.getFullYear() - 5);
      break;
  }
  return d;
}

/**
 * Formats a Date object into local human-readable string (e.g. "20 Sep 2025")
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(`${date}T12:00:00`) : date;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a Timeline object into display trigger text
 */
export function formatTimeline(timeline: Timeline | null): string {
  if (!timeline) return '';
  if (timeline.kind === 'range') {
    const opt = RANGE_PRESETS.find((p) => p.value === timeline.preset);
    return opt ? opt.label : timeline.preset;
  }
  return formatDisplayDate(timeline.date);
}

/**
 * Formats a Date object into local YYYY-MM-DD string without UTC shift
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if a given YYYY-MM-DD string is selectable (between 2005-04-23 and today)
 */
export function isSelectableDate(dateStr: string): boolean {
  if (dateStr < YT_LAUNCH_DATE) return false;
  const today = formatLocalDate(new Date());
  return dateStr <= today;
}

/**
 * Calendar helpers for rendering pure calendar month grids
 */
export interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelectable: boolean;
}

export function getCalendarMonthDays(year: number, month: number): CalendarDay[] {
  // month is 0-indexed (0 = Jan, 11 = Dec)
  const todayStr = formatLocalDate(new Date());
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, dayNum);
    const dateStr = formatLocalDate(prevMonthDate);
    days.push({
      dateStr,
      dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelectable: isSelectableDate(dateStr),
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${year}-${mStr}-${dStr}`;
    days.push({
      dateStr,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelectable: isSelectableDate(dateStr),
    });
  }

  // Next month leading days to complete the 35 or 42 grid
  const remaining = (7 - (days.length % 7)) % 7;
  for (let n = 1; n <= remaining; n++) {
    const nextMonthDate = new Date(year, month + 1, n);
    const dateStr = formatLocalDate(nextMonthDate);
    days.push({
      dateStr,
      dayNum: n,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelectable: isSelectableDate(dateStr),
    });
  }

  return days;
}
