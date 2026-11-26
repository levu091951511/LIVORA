import React, { useEffect, useState } from 'react';
import { Check, Pause, Play, RotateCcw, X } from 'lucide-react';
import { Task } from '../types/task';
import { ProgressRing } from './ProgressRing';

interface FocusTimerSheetProps {
  task: Task | null;
  onClose: () => void;
  onLogMinutes: (taskId: string, minutes: number, markComplete: boolean) => void;
}

const PRESETS = [15, 25, 45];

export const FocusTimerSheet: React.FC<FocusTimerSheetProps> = ({
  task,
  onClose,
  onLogMinutes,
}) => {
  const [presetMinutes, setPresetMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!task) return;
    const initial = Math.min(45, Math.max(15, task.durationMinutes || 25));
    const closest = PRESETS.reduce((prev, curr) =>
      Math.abs(curr - initial) < Math.abs(prev - initial) ? curr : prev
    );
    setPresetMinutes(closest);
    setSecondsLeft(closest * 60);
    setRunning(false);
  }, [task]);

  useEffect(() => {
    if (!running || !task) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, task]);

  if (!task) return null;

  const totalSeconds = presetMinutes * 60;
  const elapsedMinutes = Math.max(1, Math.round((totalSeconds - secondsLeft) / 60));
  const progressPercent = totalSeconds === 0 ? 0 : ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const handleSelectPreset = (mins: number) => {
    setRunning(false);
    setPresetMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Phiên tập trung"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-medium text-teal-700 dark:text-teal-300">
              Chế độ tập trung
            </span>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 mt-0.5 break-words">
              {task.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets */}
        <div className="flex items-center justify-center gap-2">
          {PRESETS.map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => handleSelectPreset(mins)}
              className={`min-h-[40px] px-4 rounded-xl font-mono-nums text-xs font-medium transition-colors ${
                presetMinutes === mins
                  ? 'bg-slate-900 dark:bg-teal-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {mins} phút
            </button>
          ))}
        </div>

        {/* Circular Timer */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative flex items-center justify-center">
            <ProgressRing
              value={progressPercent}
              size={180}
              strokeWidth={8}
              progressClassName="stroke-teal-600 dark:stroke-teal-400"
            />
            <div className="absolute text-center">
              <span className="font-mono-nums text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {mm}:{ss}
              </span>
              <span className="block text-xs text-slate-400 dark:text-slate-500 mt-1">
                {running ? 'Đang tập trung' : secondsLeft === 0 ? 'Hoàn tất phiên' : 'Sẵn sàng'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setSecondsLeft(presetMinutes * 60);
            }}
            aria-label="Đặt lại đồng hồ"
            className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="flex-1 min-h-[48px] px-6 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-teal-500 transition-colors"
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{running ? 'Tạm dừng' : 'Bắt đầu'}</span>
          </button>
        </div>

        {/* Complete & Save */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 pb-safe">
          <button
            type="button"
            onClick={() => {
              onLogMinutes(task.id, elapsedMinutes, false);
              onClose();
            }}
            className="flex-1 min-h-[44px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Lưu {elapsedMinutes}p & đóng
          </button>
          <button
            type="button"
            onClick={() => {
              onLogMinutes(task.id, elapsedMinutes, true);
              onClose();
            }}
            className="flex-1 min-h-[44px] px-3 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Hoàn thành việc</span>
          </button>
        </div>
      </div>
    </div>
  );
};
