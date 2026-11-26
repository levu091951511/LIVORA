import { TaskRecurrence } from '../types/task';

export const WEEKDAY_SHORT_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export const MONTH_NAMES_VI = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: string, delta: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function addMonths(iso: string, delta: number): string {
  const d = parseISODate(iso);
  const originalDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + delta);
  const daysInTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDay, daysInTargetMonth));
  return toISODate(d);
}

export function getStartOfWeek(iso: string): string {
  const d = parseISODate(iso);
  const day = d.getDay(); // 0 = Sun, 1 = Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

export function getWeekDates(anchorIso: string): string[] {
  const start = getStartOfWeek(anchorIso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export interface MonthGridCell {
  iso: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

export function getMonthGrid(year: number, monthIndex: number): MonthGridCell[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const firstWeekday = firstDayOfMonth.getDay(); // 0 = Sun
  const leadingDays = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const gridStart = new Date(year, monthIndex, 1 - leadingDays);

  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
  const totalDays = leadingDays + lastDayOfMonth.getDate();
  const totalCells = totalDays <= 35 ? 35 : 42;

  const cells: MonthGridCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    cells.push({
      iso: toISODate(cellDate),
      dayNumber: cellDate.getDate(),
      inCurrentMonth: cellDate.getMonth() === monthIndex,
    });
  }
  return cells;
}

export function formatRelativeDayVi(iso: string, todayIso: string): string {
  if (iso === todayIso) return 'Hôm nay';
  if (iso === addDays(todayIso, 1)) return 'Ngày mai';
  if (iso === addDays(todayIso, -1)) return 'Hôm qua';
  const d = parseISODate(iso);
  const weekdayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const weekdayFull = [
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
    'Chủ Nhật',
  ][weekdayIdx];
  return `${weekdayFull}, ${d.getDate()}/${d.getMonth() + 1}`;
}

export function formatShortDateVi(iso: string): string {
  const d = parseISODate(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatWeekRangeVi(anchorIso: string): string {
  const dates = getWeekDates(anchorIso);
  const first = parseISODate(dates[0]);
  const last = parseISODate(dates[6]);
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} Tháng ${first.getMonth() + 1}, ${first.getFullYear()}`;
  }
  return `${first.getDate()}/${first.getMonth() + 1} – ${last.getDate()}/${last.getMonth() + 1}, ${last.getFullYear()}`;
}

export function formatDurationVi(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} giờ` : `${h}g ${m}p`;
}

export function getNextRecurrenceDate(iso: string, recurrence: TaskRecurrence): string | null {
  if (recurrence === 'none') return null;
  if (recurrence === 'daily') return addDays(iso, 1);
  if (recurrence === 'weekly') return addDays(iso, 7);
  if (recurrence === 'monthly') return addMonths(iso, 1);
  if (recurrence === 'weekdays') {
    let next = addDays(iso, 1);
    while (true) {
      const day = parseISODate(next).getDay();
      if (day !== 0 && day !== 6) return next;
      next = addDays(next, 1);
    }
  }
  return null;
}

export function getWeekdayIndexMonStart(iso: string): number {
  const day = parseISODate(iso).getDay();
  return day === 0 ? 6 : day - 1;
}
