import React, { useMemo } from 'react';
import { Flame, Timer, RotateCcw } from 'lucide-react';
import { CATEGORIES, Task, TaskCategory } from '../types/task';
import { addDays, getWeekDates, parseISODate, WEEKDAY_SHORT_VI } from '../utils/dateUtils';
import { ProgressRing } from './ProgressRing';

interface ProgressViewProps {
  tasks: Task[];
  todayIso: string;
  onClearAllData: () => boolean;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  tasks,
  todayIso,
  onClearAllData,
}) => {
  const weekDates = useMemo(() => getWeekDates(todayIso), [todayIso]);
  const monthPrefix = todayIso.slice(0, 7);

  const stats = useMemo(() => {
    const weekTasks = tasks.filter((t) => weekDates.includes(t.date));
    const weekDone = weekTasks.filter((t) => t.completed).length;
    const weekPercent = weekTasks.length === 0 ? 0 : Math.round((weekDone / weekTasks.length) * 100);

    const monthTasks = tasks.filter((t) => t.date.startsWith(monthPrefix));
    const monthDone = monthTasks.filter((t) => t.completed).length;
    const monthPercent = monthTasks.length === 0 ? 0 : Math.round((monthDone / monthTasks.length) * 100);

    const totalFocusMinutes = tasks.reduce((acc, t) => acc + (t.focusMinutesLogged || 0), 0);

    // Calculate consecutive days with >= 1 completed task ending today or yesterday
    let streak = 0;
    let cursor = todayIso;
    const hasTodayDone = tasks.some((t) => t.date === todayIso && t.completed);
    if (!hasTodayDone) {
      cursor = addDays(todayIso, -1);
    }
    while (true) {
      const doneOnDay = tasks.some((t) => t.date === cursor && t.completed);
      if (!doneOnDay) break;
      streak += 1;
      cursor = addDays(cursor, -1);
      if (streak > 365) break;
    }

    const byCategory = (Object.keys(CATEGORIES) as TaskCategory[]).map((catKey) => {
      const catTasks = tasks.filter((t) => t.category === catKey);
      const done = catTasks.filter((t) => t.completed).length;
      const total = catTasks.length;
      return {
        meta: CATEGORIES[catKey],
        done,
        total,
        percent: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    });

    const dailyBars = weekDates.map((iso, idx) => {
      const dayTasks = tasks.filter((t) => t.date === iso);
      const done = dayTasks.filter((t) => t.completed).length;
      const total = dayTasks.length;
      return {
        iso,
        label: WEEKDAY_SHORT_VI[idx],
        dayNum: parseISODate(iso).getDate(),
        done,
        total,
        percent: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    });

    return {
      weekDone,
      weekTotal: weekTasks.length,
      weekPercent,
      monthDone,
      monthTotal: monthTasks.length,
      monthPercent,
      totalFocusMinutes,
      streak,
      byCategory,
      dailyBars,
    };
  }, [tasks, weekDates, monthPrefix, todayIso]);

  return (
    <div className="space-y-4">
      {/* Week & Month Progress Rings */}
      <div className="grid grid-cols-2 gap-3">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Tuần này
            </span>
            <ProgressRing value={stats.weekPercent} size={48} strokeWidth={4.5} label={`${stats.weekPercent}%`} />
          </div>
          <div>
            <p className="font-mono-nums text-xl font-semibold text-slate-900 dark:text-slate-100">
              {stats.weekDone}/{stats.weekTotal}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              việc đã hoàn thành
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Tháng này
            </span>
            <ProgressRing
              value={stats.monthPercent}
              size={48}
              strokeWidth={4.5}
              progressClassName="stroke-sky-600 dark:stroke-sky-400"
              label={`${stats.monthPercent}%`}
            />
          </div>
          <div>
            <p className="font-mono-nums text-xl font-semibold text-slate-900 dark:text-slate-100">
              {stats.monthDone}/{stats.monthTotal}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              việc đã hoàn thành
            </p>
          </div>
        </section>
      </div>

      {/* Streak & Focus Time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-mono-nums text-lg font-semibold text-slate-900 dark:text-slate-100">
              {stats.streak} ngày
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Chuỗi duy trì
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-mono-nums text-lg font-semibold text-slate-900 dark:text-slate-100">
              {stats.totalFocusMinutes} phút
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Thời gian tập trung
            </p>
          </div>
        </div>
      </div>

      {/* 7-Day Completion Chart */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Nhịp độ hoàn thành trong tuần
          </h3>
          <span className="font-mono-nums text-xs text-slate-500 dark:text-slate-400">
            {stats.weekPercent}%
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 items-end h-36 pt-4">
          {stats.dailyBars.map((bar) => {
            const isToday = bar.iso === todayIso;
            const heightPercent = bar.total === 0 ? 8 : Math.max(14, bar.percent);
            return (
              <div key={bar.iso} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="font-mono-nums text-[10px] text-slate-500 dark:text-slate-400">
                  {bar.total > 0 ? `${bar.done}/${bar.total}` : '—'}
                </span>
                <div className="w-full max-w-[28px] flex-1 flex items-end bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                  <div
                    className={`w-full rounded-xl transition-all duration-300 ${
                      bar.total === 0
                        ? 'bg-slate-200 dark:bg-slate-700'
                        : isToday
                        ? 'bg-teal-600 dark:bg-teal-400'
                        : 'bg-slate-800 dark:bg-slate-300'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span
                  className={`text-[11px] font-medium ${
                    isToday
                      ? 'text-teal-700 dark:text-teal-300 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Category Breakdown */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3.5">
        <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          Tiến độ theo nhóm công việc
        </h3>
        <div className="space-y-3">
          {stats.byCategory.map(({ meta, done, total, percent }) => (
            <div key={meta.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {meta.label}
                </span>
                <span className="font-mono-nums text-slate-500 dark:text-slate-400">
                  {done}/{total} · {percent}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${meta.accentBar}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Clear all local data */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={onClearAllData}
          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Xóa sạch dữ liệu để bắt đầu mới</span>
        </button>
      </div>
    </div>
  );
};
