import React, { useMemo } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarArrowUp,
  Camera,
  CheckCircle2,
  Inbox,
  Mic,
  Plus,
  Type,
  Wallet,
} from 'lucide-react';
import {
  AppTab,
  BudgetConfig,
  CaptureSource,
  InboxItem,
  Transaction,
} from '../types/life';
import { Task } from '../types/task';
import { formatRelativeDayVi, getWeekDates } from '../utils/dateUtils';
import { formatVnd } from '../utils/imageUtils';
import { ProgressRing } from './ProgressRing';
import { TaskRow } from './TaskRow';

interface DashboardViewProps {
  tasks: Task[];
  transactions: Transaction[];
  budget: BudgetConfig;
  inbox: InboxItem[];
  todayIso: string;
  hideBalances: boolean;
  onNavigateTab: (tab: AppTab) => void;
  onOpenQuickCapture: (mode: CaptureSource) => void;
  onOpenNewTask: () => void;
  onOpenNewExpense: () => void;
  onToggleComplete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStartFocus: (task: Task) => void;
  onAttachProofPhoto: (taskId: string, photoDataUrl: string) => void;
  onPreviewPhoto: (src: string, caption: string) => void;
  onRescheduleOverdueToToday: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  transactions,
  budget,
  inbox,
  todayIso,
  hideBalances,
  onNavigateTab,
  onOpenQuickCapture,
  onOpenNewTask,
  onOpenNewExpense,
  onToggleComplete,
  onToggleSubtask,
  onEditTask,
  onDeleteTask,
  onStartFocus,
  onAttachProofPhoto,
  onPreviewPhoto,
  onRescheduleOverdueToToday,
}) => {
  const monthPrefix = todayIso.slice(0, 7);
  const weekDates = useMemo(() => getWeekDates(todayIso), [todayIso]);

  const summary = useMemo(() => {
    const todayTasks = tasks.filter((t) => t.date === todayIso);
    const todayDone = todayTasks.filter((t) => t.completed).length;
    const todayPercent =
      todayTasks.length === 0 ? 0 : Math.round((todayDone / todayTasks.length) * 100);

    const overdue = tasks.filter((t) => !t.completed && t.date < todayIso);

    const upcomingReminders = todayTasks
      .filter((t) => !t.completed && t.time && t.reminderMinutes !== undefined)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    const monthTransactions = transactions.filter((t) => t.date.startsWith(monthPrefix));
    const monthIncome = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const budgetPercent =
      budget.monthlyLimit <= 0
        ? 0
        : Math.round((monthExpense / budget.monthlyLimit) * 100);

    const weekTasks = tasks.filter((t) => weekDates.includes(t.date));
    const weekDone = weekTasks.filter((t) => t.completed).length;
    const weekPercent =
      weekTasks.length === 0 ? 0 : Math.round((weekDone / weekTasks.length) * 100);

    const openTodayTasks = todayTasks
      .slice()
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return (a.time || '99:99').localeCompare(b.time || '99:99');
      })
      .slice(0, 4);

    return {
      todayTasks,
      todayDone,
      todayPercent,
      overdue,
      upcomingReminders,
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      budgetPercent,
      weekDone,
      weekTotal: weekTasks.length,
      weekPercent,
      openTodayTasks,
    };
  }, [tasks, transactions, budget, todayIso, monthPrefix, weekDates]);

  return (
    <div className="space-y-4">
      {/* LIVORA Welcome Banner with Slogan */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-teal-700 dark:text-teal-300">
            All-in-One Life Management · {formatRelativeDayVi(todayIso, todayIso)}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Cuộc sống, đơn giản hơn.
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lịch trình, công việc, thu chi ngân sách và ghi nhận nhanh trong một nhịp.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenNewTask}
            className="min-h-[44px] px-4 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-800 dark:hover:bg-teal-500 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm việc</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewExpense}
            className="min-h-[44px] px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Wallet className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Ghi thu chi</span>
          </button>
        </div>
      </section>

      {/* Active Reminder Strip */}
      {summary.upcomingReminders.length > 0 && (
        <section className="bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Bell className="w-4 h-4 text-teal-700 dark:text-teal-300 shrink-0" />
            <p className="text-xs text-teal-950 dark:text-teal-100 truncate">
              <span className="font-semibold">Nhắc nhở hôm nay:</span>{' '}
              <span className="font-mono-nums font-medium">{summary.upcomingReminders[0].time}</span>{' '}
              · {summary.upcomingReminders[0].title}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('calendar')}
            className="text-xs font-semibold text-teal-800 dark:text-teal-300 whitespace-nowrap shrink-0 hover:underline"
          >
            Xem lịch
          </button>
        </section>
      )}

      {/* Overdue Alert */}
      {summary.overdue.length > 0 && (
        <section className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-200">
              {summary.overdue.length} công việc quá hạn chưa hoàn thành
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300/80">
              Dời nhanh về hôm nay để giữ nhịp kế hoạch.
            </p>
          </div>
          <button
            type="button"
            onClick={onRescheduleOverdueToToday}
            className="min-h-[42px] px-4 rounded-xl bg-amber-900 dark:bg-amber-500 text-white dark:text-slate-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <CalendarArrowUp className="w-4 h-4" />
            <span>Dời sang hôm nay</span>
          </button>
        </section>
      )}

      {/* 3-in-1 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Today & Week Schedule */}
        <button
          type="button"
          onClick={() => onNavigateTab('calendar')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 text-left flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Công việc hôm nay</span>
            </div>
            <p className="font-mono-nums text-xl font-semibold text-slate-900 dark:text-slate-100">
              {summary.todayDone}/{summary.todayTasks.length}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-nums">
              Tuần này: {summary.weekDone}/{summary.weekTotal} ({summary.weekPercent}%)
            </p>
          </div>
          <ProgressRing value={summary.todayPercent} size={52} strokeWidth={4.5} label={`${summary.todayPercent}%`} />
        </button>

        {/* Card 2: Monthly Finance & Budget */}
        <button
          type="button"
          onClick={() => onNavigateTab('finance')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 text-left flex flex-col justify-between gap-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Wallet className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Chi tiêu tháng</span>
            </span>
            <span className="font-mono-nums text-xs font-semibold text-slate-700 dark:text-slate-300">
              {summary.budgetPercent}% ngân sách
            </span>
          </div>
          <p className="font-mono-nums text-xl font-semibold text-slate-900 dark:text-slate-100">
            {formatVnd(summary.monthExpense, hideBalances)}
          </p>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                summary.budgetPercent >= 100
                  ? 'bg-rose-500'
                  : summary.budgetPercent >= 80
                  ? 'bg-amber-500'
                  : 'bg-sky-600 dark:bg-sky-400'
              }`}
              style={{ width: `${Math.min(100, summary.budgetPercent)}%` }}
            />
          </div>
        </button>

        {/* Card 3: Inbox Pending Queue */}
        <button
          type="button"
          onClick={() => onNavigateTab('inbox')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 text-left flex flex-col justify-between gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Inbox className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Hộp thư chờ xử lý</span>
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <p className="font-mono-nums text-xl font-semibold text-slate-900 dark:text-slate-100">
            {inbox.length} ghi nhận
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {inbox.length > 0 ? inbox[0].content : 'Không có mục nào chờ phân loại'}
          </p>
        </button>
      </div>

      {/* Quick Capture Bar (Text / Voice / Camera) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Ghi nhận nhanh
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Lưu ngay bằng chữ, giọng nói hoặc ảnh
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onOpenQuickCapture('text')}
            className="min-h-[48px] px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Type className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Văn bản</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickCapture('voice')}
            className="min-h-[48px] px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Mic className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Giọng nói</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickCapture('image')}
            className="min-h-[48px] px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Camera className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Ảnh / Hóa đơn</span>
          </button>
        </div>
      </section>

      {/* Today's Priority Task Preview */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Lịch trình & Việc hôm nay
          </h2>
          <button
            type="button"
            onClick={() => onNavigateTab('calendar')}
            className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline inline-flex items-center gap-1"
          >
            <span>Mở lịch tuần/tháng</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {summary.openTodayTasks.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            Hôm nay chưa có đầu việc nào. Chạm “Thêm việc” để bắt đầu.
          </p>
        ) : (
          <div className="space-y-2.5">
            {summary.openTodayTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                todayIso={todayIso}
                onToggleComplete={onToggleComplete}
                onToggleSubtask={onToggleSubtask}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onStartFocus={onStartFocus}
                onAttachProofPhoto={onAttachProofPhoto}
                onPreviewPhoto={onPreviewPhoto}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
