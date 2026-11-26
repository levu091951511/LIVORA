import React, { useRef, useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Pencil,
  Play,
  Repeat,
  Trash2,
} from 'lucide-react';
import { CATEGORIES, PRIORITY_LABELS, RECURRENCE_LABELS, Task } from '../types/task';
import { formatDurationVi, formatShortDateVi } from '../utils/dateUtils';
import { compressImageFile } from '../utils/imageUtils';

interface TaskRowProps {
  task: Task;
  todayIso: string;
  showDate?: boolean;
  onToggleComplete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStartFocus: (task: Task) => void;
  onAttachProofPhoto: (taskId: string, photoDataUrl: string) => void;
  onPreviewPhoto: (src: string, caption: string) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  todayIso,
  showDate = false,
  onToggleComplete,
  onToggleSubtask,
  onEdit,
  onDelete,
  onStartFocus,
  onAttachProofPhoto,
  onPreviewPhoto,
}) => {
  const [expanded, setExpanded] = useState(false);
  const proofInputRef = useRef<HTMLInputElement | null>(null);
  const category = CATEGORIES[task.category];
  const isOverdue = !task.completed && task.date < todayIso;
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const hasAnyPhoto = Boolean(task.descriptionPhoto || task.proofPhoto);

  const handleProofSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      onAttachProofPhoto(task.id, compressed);
      setExpanded(true);
    } catch {
      // Ignore invalid image
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div
      className={`group rounded-2xl border transition-colors duration-150 ${
        task.completed
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/70'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => onToggleComplete(task.id)}
          aria-label={task.completed ? `Bỏ đánh dấu hoàn thành: ${task.title}` : `Đánh dấu hoàn thành: ${task.title}`}
          className="min-w-[44px] min-h-[44px] -ml-1 flex items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 shrink-0"
        >
          <span
            className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-150 ${
              task.completed
                ? 'bg-teal-600 border-teal-600 text-white dark:bg-teal-500 dark:border-teal-500'
                : task.priority === 'high'
                ? 'border-amber-500 dark:border-amber-400 bg-white dark:bg-slate-950'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950'
            }`}
          >
            {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.75]" />}
          </span>
        </button>

        <div className="flex-1 min-w-0 py-1">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-left flex-1 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded"
            >
              <p
                className={`text-[15px] font-medium leading-snug break-words ${
                  task.completed
                    ? 'line-through text-slate-400 dark:text-slate-500'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {task.title}
              </p>
            </button>

            <div className="flex items-center shrink-0 -mr-1">
              {!task.completed && (
                <button
                  type="button"
                  onClick={() => onStartFocus(task)}
                  aria-label={`Tập trung làm: ${task.title}`}
                  title="Bắt đầu đếm giờ tập trung"
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-teal-700 hover:bg-teal-50 dark:text-slate-400 dark:hover:text-teal-300 dark:hover:bg-teal-950/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                aria-label={expanded ? 'Thu gọn chi tiết' : 'Xem chi tiết'}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            {task.time && (
              <>
                <span className={`font-mono-nums font-medium ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {task.time}
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}

            {showDate && (
              <>
                <span className={`font-mono-nums ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-medium' : ''}`}>
                  {isOverdue ? `Quá hạn ${formatShortDateVi(task.date)}` : formatShortDateVi(task.date)}
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}

            <span className={category.accentText}>{category.label}</span>

            <span aria-hidden="true">·</span>
            <span className="font-mono-nums">{formatDurationVi(task.durationMinutes)}</span>

            {task.reminderMinutes !== undefined && !task.completed && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300">
                  <Bell className="w-3 h-3" />
                  <span>{task.reminderMinutes === 0 ? 'Đúng giờ' : `Trước ${task.reminderMinutes}p`}</span>
                </span>
              </>
            )}

            {task.priority === 'high' && !task.completed && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 dark:text-amber-400 font-medium">
                  {PRIORITY_LABELS[task.priority]}
                </span>
              </>
            )}

            {task.recurrence !== 'none' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Repeat className="w-3 h-3" />
                  <span>{RECURRENCE_LABELS[task.recurrence]}</span>
                </span>
              </>
            )}

            {hasAnyPhoto && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <ImageIcon className="w-3 h-3" />
                  <span>{task.proofPhoto ? 'Có minh chứng' : 'Có ảnh mô tả'}</span>
                </span>
              </>
            )}

            {task.subtasks.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-nums">
                  {completedSubtasks}/{task.subtasks.length} bước nhỏ
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded detail drawer */}
      {expanded && (
        <div className="px-4 pb-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-3">
          {task.notes && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {task.notes}
            </p>
          )}

          {/* Photo Attachments (Description & Completion Proof) */}
          {(task.descriptionPhoto || task.proofPhoto) && (
            <div className="grid grid-cols-2 gap-2.5">
              {task.descriptionPhoto && (
                <button
                  type="button"
                  onClick={() => onPreviewPhoto(task.descriptionPhoto!, `Ảnh mô tả: ${task.title}`)}
                  className="group/img relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 text-left"
                >
                  <img
                    src={task.descriptionPhoto}
                    alt={`Ảnh mô tả ${task.title}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-24 object-cover"
                  />
                  <span className="block px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80">
                    Ảnh mô tả
                  </span>
                </button>
              )}

              {task.proofPhoto && (
                <button
                  type="button"
                  onClick={() => onPreviewPhoto(task.proofPhoto!, `Minh chứng hoàn thành: ${task.title}`)}
                  className="group/img relative rounded-xl overflow-hidden border border-teal-200 dark:border-teal-800 text-left"
                >
                  <img
                    src={task.proofPhoto}
                    alt={`Minh chứng ${task.title}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-24 object-cover"
                  />
                  <span className="block px-2 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60">
                    Ảnh minh chứng
                  </span>
                </button>
              )}
            </div>
          )}

          {task.subtasks.length > 0 && (
            <div className="space-y-1">
              {task.subtasks.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onToggleSubtask(task.id, sub.id)}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      sub.completed
                        ? 'bg-teal-600 border-teal-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {sub.completed && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </span>
                  <span
                    className={`text-sm ${
                      sub.completed
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {sub.title}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <input
              ref={proofInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleProofSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => proofInputRef.current?.click()}
              className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{task.proofPhoto ? 'Đổi ảnh minh chứng' : 'Chụp minh chứng'}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(task)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Sửa</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
