import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { CalendarViewMode, CATEGORIES, Task } from '../types/task';
import {
  addDays,
  addMonths,
  formatWeekRangeVi,
  getMonthGrid,
  getWeekDates,
  MONTH_NAMES_VI,
  parseISODate,
  WEEKDAY_SHORT_VI,
} from '../utils/dateUtils';
import { ProgressRing } from './ProgressRing';

interface CalendarPanelProps {
  tasks: Task[];
  selectedDate: string;
  todayIso: string;
  viewMode: CalendarViewMode;
  onChangeViewMode: (mode: CalendarViewMode) => void;
  onSelectDate: (iso: string) => void;
}

export const CalendarPanel: React.FC<CalendarPanelProps> = ({
  tasks,
  selectedDate,
  todayIso,
  viewMode,
  onChangeViewMode,
  onSelectDate,
}) => {
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const existing = map.get(task.date) ?? [];
      existing.push(task);
      map.set(task.date, existing);
    }
    return map;
  }, [tasks]);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const selectedParsed = useMemo(() => parseISODate(selectedDate), [selectedDate]);

  const monthGrid = useMemo(
    () => getMonthGrid(selectedParsed.getFullYear(), selectedParsed.getMonth()),
    [selectedParsed]
  );

  // Compute progress for the active period (Week or Month)
  const periodStats = useMemo(() => {
    if (viewMode === 'week') {
      const weekTasks = weekDates.flatMap((d) => tasksByDate.get(d) ?? []);
      const done = weekTasks.filter((t) => t.completed).length;
      const total = weekTasks.length;
      return {
        label: 'Tiến độ tuần',
        done,
        total,
        percent: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    } else {
      const yearMonthPrefix = selectedDate.slice(0, 7);
      const monthTasks = tasks.filter((t) => t.date.startsWith(yearMonthPrefix));
      const done = monthTasks.filter((t) => t.completed).length;
      const total = monthTasks.length;
      return {
        label: 'Tiến độ tháng',
        done,
        total,
        percent: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    }
  }, [viewMode, weekDates, tasksByDate, tasks, selectedDate]);

  const handlePrev = () => {
    if (viewMode === 'week') {
      onSelectDate(addDays(selectedDate, -7));
    } else {
      onSelectDate(addMonths(selectedDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      onSelectDate(addDays(selectedDate, 7));
    } else {
      onSelectDate(addMonths(selectedDate, 1));
    }
  };

  const headerTitle =
    viewMode === 'week'
      ? formatWeekRangeVi(selectedDate)
      : `${MONTH_NAMES_VI[selectedParsed.getMonth()]}, ${selectedParsed.getFullYear()}`;

  return (
    <section
      aria-label="Lịch công việc"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4"
    >
      {/* Top Calendar Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={handlePrev}
            aria-label={viewMode === 'week' ? 'Tuần trước' : 'Tháng trước'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
            {headerTitle}
          </h2>

          <button
            type="button"
            onClick={handleNext}
            aria-label={viewMode === 'week' ? 'Tuần sau' : 'Tháng sau'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedDate !== todayIso && (
            <button
              type="button"
              onClick={() => onSelectDate(todayIso)}
              className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors whitespace-nowrap shrink-0"
            >
              Hôm nay
            </button>
          )}

          {/* Segmented control: Week | Month */}
          <div
            role="tablist"
            aria-label="Chế độ hiển thị lịch"
            className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'week'}
              onClick={() => onChangeViewMode('week')}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Tuần
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'month'}
              onClick={() => onChangeViewMode('month')}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Tháng
            </button>
          </div>
        </div>
      </div>

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDates.map((iso, idx) => {
              const dayTasks = tasksByDate.get(iso) ?? [];
              const doneCount = dayTasks.filter((t) => t.completed).length;
              const totalCount = dayTasks.length;
              const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
              const isSelected = iso === selectedDate;
              const isToday = iso === todayIso;
              const dayNum = parseISODate(iso).getDate();

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onSelectDate(iso)}
                  aria-label={`${WEEKDAY_SHORT_VI[idx]} ngày ${dayNum}, ${doneCount}/${totalCount} công việc hoàn thành`}
                  aria-pressed={isSelected}
                  className={`min-h-[82px] sm:min-h-[96px] py-2 px-1 rounded-2xl flex flex-col items-center justify-between transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-teal-600 text-white'
                      : isToday
                      ? 'bg-teal-50/80 dark:bg-teal-950/40 text-slate-900 dark:text-slate-100 border border-teal-200 dark:border-teal-800'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`text-[11px] font-medium ${
                      isSelected
                        ? 'text-slate-300 dark:text-teal-100'
                        : isToday
                        ? 'text-teal-700 dark:text-teal-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {WEEKDAY_SHORT_VI[idx]}
                  </span>

                  <div className="relative flex items-center justify-center my-0.5">
                    <ProgressRing
                      value={totalCount > 0 ? percent : 0}
                      size={36}
                      strokeWidth={3}
                      trackClassName={
                        isSelected
                          ? 'stroke-white/20'
                          : totalCount > 0
                          ? 'stroke-slate-200 dark:stroke-slate-700'
                          : 'stroke-transparent'
                      }
                      progressClassName={
                        isSelected
                          ? 'stroke-teal-400 dark:stroke-white'
                          : percent === 100
                          ? 'stroke-emerald-600 dark:stroke-emerald-400'
                          : 'stroke-teal-600 dark:stroke-teal-400'
                      }
                    />
                    <span className="absolute font-mono-nums text-xs sm:text-sm font-semibold">
                      {dayNum}
                    </span>
                  </div>

                  <span
                    className={`font-mono-nums text-[10px] leading-none ${
                      isSelected
                        ? 'text-slate-300 dark:text-teal-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {totalCount > 0 ? `${doneCount}/${totalCount}` : '—'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Weekly workload overview strip */}
          <div className="hidden sm:grid grid-cols-7 gap-2 pt-1">
            {weekDates.map((iso) => {
              const dayTasks = (tasksByDate.get(iso) ?? [])
                .slice()
                .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
              const isSelected = iso === selectedDate;
              return (
                <div
                  key={`preview-${iso}`}
                  onClick={() => onSelectDate(iso)}
                  className={`cursor-pointer rounded-xl p-2 min-h-[76px] border transition-colors ${
                    isSelected
                      ? 'border-teal-300 dark:border-teal-700 bg-teal-50/40 dark:bg-teal-950/20'
                      : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  {dayTasks.length === 0 ? (
                    <span className="text-[11px] text-slate-400 dark:text-slate-600 block text-center mt-4">
                      Trống
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((t) => (
                        <div key={t.id} className="flex items-center gap-1 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              t.completed ? 'bg-slate-300 dark:bg-slate-600' : CATEGORIES[t.category].accentBar
                            }`}
                          />
                          <span
                            className={`text-[11px] truncate ${
                              t.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <span className="block font-mono-nums text-[10px] text-slate-400 dark:text-slate-500 pl-2.5">
                          +{dayTasks.length - 3} việc
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_SHORT_VI.map((day) => (
              <div
                key={day}
                className="py-1 text-[11px] font-medium text-slate-400 dark:text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {monthGrid.map((cell) => {
              const dayTasks = tasksByDate.get(cell.iso) ?? [];
              const totalCount = dayTasks.length;
              const doneCount = dayTasks.filter((t) => t.completed).length;
              const percent = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
              const isSelected = cell.iso === selectedDate;
              const isToday = cell.iso === todayIso;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => onSelectDate(cell.iso)}
                  aria-label={`Ngày ${cell.dayNumber}, ${doneCount}/${totalCount} việc hoàn thành`}
                  aria-pressed={isSelected}
                  className={`min-h-[52px] sm:min-h-[64px] p-1.5 rounded-xl flex flex-col items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-teal-600 text-white'
                      : isToday
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-100 border border-teal-200 dark:border-teal-800'
                      : cell.inCurrentMonth
                      ? 'bg-slate-50/70 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <span
                    className={`font-mono-nums text-xs sm:text-sm font-medium ${
                      isToday && !isSelected ? 'text-teal-700 dark:text-teal-300 font-semibold' : ''
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {totalCount > 0 ? (
                    <div className="w-full space-y-1">
                      <span
                        className={`block font-mono-nums text-[10px] leading-none text-center ${
                          isSelected
                            ? 'text-slate-200 dark:text-teal-100'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {doneCount}/{totalCount}
                      </span>
                      <div
                        className={`w-full h-1 rounded-full overflow-hidden ${
                          isSelected ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSelected
                              ? 'bg-teal-400 dark:bg-white'
                              : percent === 100
                              ? 'bg-emerald-600 dark:bg-emerald-400'
                              : 'bg-teal-600 dark:bg-teal-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="h-3" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Period Progress Summary Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarDays className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
              {periodStats.label}:{' '}
              <span className="font-mono-nums font-semibold text-slate-900 dark:text-slate-100">
                {periodStats.done}/{periodStats.total}
              </span>{' '}
              công việc
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-24 sm:w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 dark:bg-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${periodStats.percent}%` }}
            />
          </div>
          <span className="font-mono-nums text-xs font-semibold text-slate-900 dark:text-slate-100 w-9 text-right">
            {periodStats.percent}%
          </span>
        </div>
      </div>
    </section>
  );
};
