export type TaskPriority = 'high' | 'medium' | 'low';

export type TaskCategory = 'work' | 'personal' | 'study' | 'health';

export type TaskRecurrence = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export type CalendarViewMode = 'week' | 'month';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}
export interface LocalAttachment {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  date: string; // YYYY-MM-DD local date
  time?: string; // HH:mm
  durationMinutes: number;
  reminderMinutes?: number; // undefined = none, 0 = at time, 10, 30, 60
  priority: TaskPriority;
  category: TaskCategory;
  recurrence: TaskRecurrence;
  completed: boolean;
  completedAt?: string;
  subtasks: Subtask[];
  focusMinutesLogged: number;
  descriptionPhoto?: string; // Photo describing the task
  attachment?: LocalAttachment;
  proofPhoto?: string; // Completion proof photo
  proofAttachment?: LocalAttachment;
  createdAt: string;
}

export interface CategoryMeta {
  id: TaskCategory;
  label: string;
  accentText: string;
  accentBar: string;
  accentSurface: string;
}

export const CATEGORIES: Record<TaskCategory, CategoryMeta> = {
  work: {
    id: 'work',
    label: 'Công việc',
    accentText: 'text-teal-700 dark:text-teal-300',
    accentBar: 'bg-teal-600 dark:bg-teal-400',
    accentSurface: 'bg-teal-50 dark:bg-teal-950/50',
  },
  personal: {
    id: 'personal',
    label: 'Cá nhân',
    accentText: 'text-sky-700 dark:text-sky-300',
    accentBar: 'bg-sky-600 dark:bg-sky-400',
    accentSurface: 'bg-sky-50 dark:bg-sky-950/50',
  },
  study: {
    id: 'study',
    label: 'Học tập',
    accentText: 'text-amber-700 dark:text-amber-300',
    accentBar: 'bg-amber-600 dark:bg-amber-400',
    accentSurface: 'bg-amber-50 dark:bg-amber-950/50',
  },
  health: {
    id: 'health',
    label: 'Sức khỏe',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    accentBar: 'bg-emerald-600 dark:bg-emerald-400',
    accentSurface: 'bg-emerald-50 dark:bg-emerald-950/50',
  },
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'Ưu tiên cao',
  medium: 'Trung bình',
  low: 'Nhẹ nhàng',
};

export const RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  none: 'Không lặp',
  daily: 'Hàng ngày',
  weekdays: 'Thứ 2 – Thứ 6',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
};

export const REMINDER_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: 'Không nhắc nhở' },
  { value: 0, label: 'Đúng giờ' },
  { value: 10, label: 'Trước 10 phút' },
  { value: 30, label: 'Trước 30 phút' },
  { value: 60, label: 'Trước 1 giờ' },
];
