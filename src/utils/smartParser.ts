import { Task, TaskCategory, TaskPriority, TaskRecurrence } from '../types/task';
import { addDays, getWeekdayIndexMonStart, parseISODate, toISODate } from './dateUtils';

export interface ParsedTaskDraft {
  title: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  priority?: TaskPriority;
  category?: TaskCategory;
  recurrence?: TaskRecurrence;
  matchedTokens: string[];
}

function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

export function parseSmartTaskInput(rawInput: string, baseDateIso: string): ParsedTaskDraft {
  let working = rawInput.trim();
  const matchedTokens: string[] = [];

  let date: string | undefined;
  let time: string | undefined;
  let durationMinutes: number | undefined;
  let priority: TaskPriority | undefined;
  let category: TaskCategory | undefined;
  let recurrence: TaskRecurrence | undefined;

  // 1. Category tags (#cong-viec, #cv, #ca-nhan, #hoc-tap, #suc-khoe)
  const tagRegex = /#([^\s]+)/gi;
  working = working.replace(tagRegex, (full, tagBody) => {
    const norm = normalizeVietnamese(tagBody);
    if (norm.includes('cong') || norm === 'cv' || norm === 'work') {
      category = 'work';
      matchedTokens.push('Công việc');
      return '';
    }
    if (norm.includes('ca') || norm === 'cn' || norm === 'personal') {
      category = 'personal';
      matchedTokens.push('Cá nhân');
      return '';
    }
    if (norm.includes('hoc') || norm === 'ht' || norm === 'study') {
      category = 'study';
      matchedTokens.push('Học tập');
      return '';
    }
    if (norm.includes('suc') || norm.includes('khoe') || norm === 'sk' || norm === 'health') {
      category = 'health';
      matchedTokens.push('Sức khỏe');
      return '';
    }
    return full;
  });

  // 2. Priority (!cao, !high, !1, !tb, !thap)
  const prioRegex = /!(cao|high|1|tb|trung\s*binh|medium|2|thap|low|3)\b/gi;
  working = working.replace(prioRegex, (_, val) => {
    const norm = normalizeVietnamese(val);
    if (norm === 'cao' || norm === 'high' || norm === '1') {
      priority = 'high';
      matchedTokens.push('Ưu tiên cao');
    } else if (norm === 'thap' || norm === 'low' || norm === '3') {
      priority = 'low';
      matchedTokens.push('Nhẹ nhàng');
    } else {
      priority = 'medium';
      matchedTokens.push('Trung bình');
    }
    return '';
  });

  // 3. Duration (30p, 45 phut, 1h, 1.5h, 2g)
  const durRegex = /\b(\d+(?:[.,]\d+)?)\s*(p|phut|phút|m|h|g|gio|giờ)\b/gi;
  working = working.replace(durRegex, (full, numStr, unit) => {
    // Skip if it looks like clock time like 9h30 (handled next)
    const idx = working.indexOf(full);
    const after = working.slice(idx + full.length);
    if ((unit.toLowerCase() === 'h' || unit.toLowerCase() === 'g') && /^\d{1,2}/.test(after)) {
      return full;
    }
    const num = parseFloat(numStr.replace(',', '.'));
    const u = normalizeVietnamese(unit);
    if (u === 'h' || u === 'g' || u === 'gio') {
      durationMinutes = Math.max(15, Math.round(num * 60));
    } else {
      durationMinutes = Math.max(5, Math.round(num));
    }
    matchedTokens.push(`${durationMinutes} phút`);
    return '';
  });

  // 4. Time (14:30, 9h30, 9h, 08:00)
  const timeRegex = /\b([01]?\d|2[0-3])(?:[:h]([0-5]\d)|h)\b/i;
  const timeMatch = working.match(timeRegex);
  if (timeMatch) {
    const hh = String(parseInt(timeMatch[1], 10)).padStart(2, '0');
    const mm = timeMatch[2] ? timeMatch[2] : '00';
    time = `${hh}:${mm}`;
    matchedTokens.push(time);
    working = working.replace(timeMatch[0], '');
  }

  // 5. Recurrence (hàng ngày, mỗi tuần, hàng tháng, thứ 2-6)
  const workingNorm = normalizeVietnamese(working);
  if (/\b(hang ngay|moi ngay|daily)\b/.test(workingNorm)) {
    recurrence = 'daily';
    matchedTokens.push('Hàng ngày');
    working = working.replace(/\b(hàng ngày|hang ngay|mỗi ngày|moi ngay|daily)\b/gi, '');
  } else if (/\b(hang tuan|moi tuan|weekly)\b/.test(workingNorm)) {
    recurrence = 'weekly';
    matchedTokens.push('Hàng tuần');
    working = working.replace(/\b(hàng tuần|hang tuan|mỗi tuần|moi tuan|weekly)\b/gi, '');
  } else if (/\b(hang thang|moi thang|monthly)\b/.test(workingNorm)) {
    recurrence = 'monthly';
    matchedTokens.push('Hàng tháng');
    working = working.replace(/\b(hàng tháng|hang thang|mỗi tháng|moi thang|monthly)\b/gi, '');
  }

  // 6. Date expressions (hôm nay, ngày mai, ngày kia, thứ 2..7, chủ nhật, dd/mm)
  const normAfter = normalizeVietnamese(working);
  if (/\b(hom nay|today)\b/.test(normAfter)) {
    date = baseDateIso;
    matchedTokens.push('Hôm nay');
    working = working.replace(/\b(hôm nay|hom nay|today)\b/gi, '');
  } else if (/\b(ngay mai|mai|tomorrow)\b/.test(normAfter)) {
    date = addDays(baseDateIso, 1);
    matchedTokens.push('Ngày mai');
    working = working.replace(/\b(ngày mai|ngay mai|mai|tomorrow)\b/gi, '');
  } else if (/\b(ngay kia|mot)\b/.test(normAfter)) {
    date = addDays(baseDateIso, 2);
    matchedTokens.push('Ngày kia');
    working = working.replace(/\b(ngày kia|ngay kia)\b/gi, '');
  } else {
    const weekdayMatch = working.match(/\b(thứ\s*[2-7]|thu\s*[2-7]|t[2-7]|chủ\s*nhật|chu\s*nhat|cn)\b/i);
    if (weekdayMatch) {
      const token = normalizeVietnamese(weekdayMatch[0]).replace(/\s+/g, '');
      let targetIdx = 6; // CN
      if (token.includes('2')) targetIdx = 0;
      else if (token.includes('3')) targetIdx = 1;
      else if (token.includes('4')) targetIdx = 2;
      else if (token.includes('5')) targetIdx = 3;
      else if (token.includes('6')) targetIdx = 4;
      else if (token.includes('7')) targetIdx = 5;

      const currentIdx = getWeekdayIndexMonStart(baseDateIso);
      let delta = targetIdx - currentIdx;
      if (delta <= 0) delta += 7;
      date = addDays(baseDateIso, delta);
      matchedTokens.push(weekdayMatch[0].trim());
      working = working.replace(weekdayMatch[0], '');
    } else {
      const explicitDateMatch = working.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
      if (explicitDateMatch) {
        const day = parseInt(explicitDateMatch[1], 10);
        const month = parseInt(explicitDateMatch[2], 10);
        const baseD = parseISODate(baseDateIso);
        const year = explicitDateMatch[3]
          ? explicitDateMatch[3].length === 2
            ? 2000 + parseInt(explicitDateMatch[3], 10)
            : parseInt(explicitDateMatch[3], 10)
          : baseD.getFullYear();
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const parsed = new Date(year, month - 1, day);
          date = toISODate(parsed);
          matchedTokens.push(`${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`);
          working = working.replace(explicitDateMatch[0], '');
        }
      }
    }
  }

  const cleanTitle = working.replace(/\s{2,}/g, ' ').trim();

  return {
    title: cleanTitle,
    date,
    time,
    durationMinutes,
    priority,
    category,
    recurrence,
    matchedTokens,
  };
}

/**
 * Smart free-slot suggester: finds an available 30–60 min slot between 08:00 and 20:00
 */
export function suggestFreeTimeSlot(tasksOnDay: Task[]): string {
  const occupiedRanges = tasksOnDay
    .filter((t) => t.time && !t.completed)
    .map((t) => {
      const [h, m] = (t.time || '09:00').split(':').map(Number);
      const start = h * 60 + m;
      return [start, start + (t.durationMinutes || 30)] as const;
    })
    .sort((a, b) => a[0] - b[0]);

  const candidateStarts = [9 * 60, 10 * 60 + 30, 14 * 60, 15 * 60 + 30, 17 * 60, 19 * 60];
  for (const start of candidateStarts) {
    const end = start + 45;
    const conflict = occupiedRanges.some(([s, e]) => start < e && end > s);
    if (!conflict) {
      const hh = String(Math.floor(start / 60)).padStart(2, '0');
      const mm = String(start % 60).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  }
  return '09:00';
}
