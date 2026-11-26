import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Camera, Clock, Plus, Sparkles, Trash2, X } from 'lucide-react';
import {
  CATEGORIES,
  PRIORITY_LABELS,
  RECURRENCE_LABELS,
  REMINDER_OPTIONS,
  Subtask,
  Task,
  TaskCategory,
  TaskPriority,
  TaskRecurrence,
} from '../types/task';
import { addDays, formatShortDateVi } from '../utils/dateUtils';
import { compressImageFile } from '../utils/imageUtils';
import { parseSmartTaskInput, suggestFreeTimeSlot } from '../utils/smartParser';

interface QuickAddSheetProps {
  isOpen: boolean;
  editingTask: Task | null;
  defaultDate: string;
  defaultTitle?: string;
  defaultPhoto?: string;
  todayIso: string;
  allTasks: Task[];
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'createdAt' | 'focusMinutesLogged'>, editingId?: string) => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

export const QuickAddSheet: React.FC<QuickAddSheetProps> = ({
  isOpen,
  editingTask,
  defaultDate,
  defaultTitle,
  defaultPhoto,
  todayIso,
  allTasks,
  onClose,
  onSave,
}) => {
  const [rawTitle, setRawTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reminderMinutes, setReminderMinutes] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState<TaskCategory>('work');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [descriptionPhoto, setDescriptionPhoto] = useState<string | undefined>(undefined);
  const [proofPhoto, setProofPhoto] = useState<string | undefined>(undefined);
  const [useSmartParse, setUseSmartParse] = useState(true);

  const descPhotoRef = useRef<HTMLInputElement | null>(null);
  const proofPhotoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTask) {
      setRawTitle(editingTask.title);
      setNotes(editingTask.notes || '');
      setDate(editingTask.date);
      setTime(editingTask.time || '');
      setDurationMinutes(editingTask.durationMinutes);
      setReminderMinutes(editingTask.reminderMinutes);
      setPriority(editingTask.priority);
      setCategory(editingTask.category);
      setRecurrence(editingTask.recurrence);
      setSubtasks(editingTask.subtasks);
      setDescriptionPhoto(editingTask.descriptionPhoto);
      setProofPhoto(editingTask.proofPhoto);
      setUseSmartParse(false);
    } else {
      setRawTitle(defaultTitle || '');
      setNotes('');
      setDate(defaultDate);
      setTime('');
      setDurationMinutes(30);
      setReminderMinutes(15);
      setPriority('medium');
      setCategory('work');
      setRecurrence('none');
      setSubtasks([]);
      setDescriptionPhoto(defaultPhoto);
      setProofPhoto(undefined);
      setUseSmartParse(true);
    }
    setNewSubtask('');
  }, [isOpen, editingTask, defaultDate, defaultTitle, defaultPhoto]);

  const parsedPreview = useMemo(() => {
    if (!useSmartParse || !rawTitle.trim()) return null;
    return parseSmartTaskInput(rawTitle, todayIso);
  }, [useSmartParse, rawTitle, todayIso]);

  const suggestedSlot = useMemo(() => {
    const targetDate = parsedPreview?.date || date;
    const tasksOnDate = allTasks.filter((t) => t.date === targetDate);
    return suggestFreeTimeSlot(tasksOnDate);
  }, [allTasks, date, parsedPreview]);

  if (!isOpen) return null;

  const handlePhotoPick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | undefined) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setter(compressed);
    } catch {
      // Ignore error
    } finally {
      e.target.value = '';
    }
  };

  const handleAddSubtask = () => {
    const trimmed = newSubtask.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [
      ...prev,
      { id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: trimmed, completed: false },
    ]);
    setNewSubtask('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = useSmartParse ? parseSmartTaskInput(rawTitle, todayIso) : null;
    const finalTitle = (parsed?.title || rawTitle).trim();
    if (!finalTitle) return;

    const finalTime = parsed?.time || time || undefined;

    onSave(
      {
        title: finalTitle,
        notes: notes.trim() || undefined,
        date: parsed?.date || date,
        time: finalTime,
        durationMinutes: parsed?.durationMinutes || durationMinutes,
        reminderMinutes: finalTime ? reminderMinutes : undefined,
        priority: parsed?.priority || priority,
        category: parsed?.category || category,
        recurrence: parsed?.recurrence || recurrence,
        completed: editingTask ? editingTask.completed : false,
        completedAt: editingTask?.completedAt,
        subtasks,
        descriptionPhoto,
        proofPhoto,
      },
      editingTask?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <h2 id="sheet-title" className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {editingTask ? 'Chỉnh sửa công việc' : 'Thêm công việc & lịch trình'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Smart Title Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="task-title-input" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Tên công việc / Sự kiện
              </label>
              {!editingTask && (
                <button
                  type="button"
                  onClick={() => setUseSmartParse((v) => !v)}
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                    useSmartParse
                      ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60'
                      : 'text-slate-500 bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Nhận diện thông minh: {useSmartParse ? 'Bật' : 'Tắt'}</span>
                </button>
              )}
            </div>

            <input
              id="task-title-input"
              type="text"
              autoFocus
              required
              value={rawTitle}
              onChange={(e) => setRawTitle(e.target.value)}
              placeholder={
                useSmartParse
                  ? 'VD: Họp nhóm 14:30 ngày mai 45p !cao #cv'
                  : 'Nhập tên công việc...'
              }
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-[15px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />

            {useSmartParse && parsedPreview && parsedPreview.matchedTokens.length > 0 && (
              <p className="text-xs text-teal-700 dark:text-teal-300 leading-relaxed">
                Tự động nhận diện: {parsedPreview.matchedTokens.join(' · ')}
              </p>
            )}
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="task-date-input" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Ngày thực hiện
              </label>
              <div className="flex items-center gap-1.5 mb-1.5">
                {[
                  { label: 'Hôm nay', iso: todayIso },
                  { label: 'Ngày mai', iso: addDays(todayIso, 1) },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setDate(opt.iso)}
                    className={`min-h-[36px] px-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      date === opt.iso
                        ? 'bg-slate-900 dark:bg-teal-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input
                id="task-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 font-mono-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="task-time-input" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Khung giờ & Nhắc nhở
                </label>
                <button
                  type="button"
                  onClick={() => setTime(suggestedSlot)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-300 hover:underline"
                >
                  <Clock className="w-3 h-3" />
                  <span>Gợi ý ({suggestedSlot})</span>
                </button>
              </div>
              <input
                id="task-time-input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 font-mono-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <div className="relative flex items-center">
                <Bell className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  aria-label="Nhắc nhở trước giờ"
                  value={reminderMinutes === undefined ? '' : String(reminderMinutes)}
                  onChange={(e) =>
                    setReminderMinutes(e.target.value === '' ? undefined : Number(e.target.value))
                  }
                  className="w-full min-h-[40px] pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {REMINDER_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value === undefined ? '' : String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Photo description & Completion proof */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Hình ảnh mô tả & Minh chứng công việc
            </span>
            <input
              ref={descPhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoPick(e, setDescriptionPhoto)}
              className="hidden"
            />
            <input
              ref={proofPhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoPick(e, setProofPhoto)}
              className="hidden"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-2.5 flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-950/50">
                {descriptionPhoto ? (
                  <>
                    <img
                      src={descriptionPhoto}
                      alt="Ảnh mô tả công việc"
                      className="w-full h-24 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setDescriptionPhoto(undefined)}
                      className="text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      Xóa ảnh mô tả
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => descPhotoRef.current?.click()}
                    className="w-full min-h-[60px] flex flex-col items-center justify-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Chụp / Thêm ảnh mô tả</span>
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-2.5 flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-950/50">
                {proofPhoto ? (
                  <>
                    <img
                      src={proofPhoto}
                      alt="Ảnh minh chứng hoàn thành"
                      className="w-full h-24 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setProofPhoto(undefined)}
                      className="text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      Xóa minh chứng
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => proofPhotoRef.current?.click()}
                    className="w-full min-h-[60px] flex flex-col items-center justify-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
                    <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Lưu minh chứng xong việc</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Nhóm công việc
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CATEGORIES) as TaskCategory[]).map((catKey) => {
                const meta = CATEGORIES[catKey];
                const active = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`min-h-[44px] px-3 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'border-slate-900 dark:border-teal-500 bg-slate-900 dark:bg-teal-600 text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Mức độ ưu tiên
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`min-h-[44px] px-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      priority === p
                        ? 'border-slate-900 dark:border-teal-500 bg-slate-900 dark:bg-teal-600 text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {p === 'high' ? 'Cao' : p === 'medium' ? 'Vừa' : 'Thấp'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Thời lượng dự kiến
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDurationMinutes(mins)}
                    className={`min-h-[44px] px-3 rounded-xl font-mono-nums text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                      durationMinutes === mins
                        ? 'border-slate-900 dark:border-teal-500 bg-slate-900 dark:bg-teal-600 text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {mins}p
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <label htmlFor="task-recurrence" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Lặp lại định kỳ
            </label>
            <select
              id="task-recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              {(Object.keys(RECURRENCE_LABELS) as TaskRecurrence[]).map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Các bước nhỏ (Checklist)
            </span>
            {subtasks.length > 0 && (
              <div className="space-y-1.5">
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                      {sub.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSubtasks((prev) => prev.filter((s) => s.id !== sub.id))}
                      aria-label="Xóa bước nhỏ"
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Thêm bước nhỏ..."
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                aria-label="Thêm bước"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="task-notes" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Ghi chú
            </label>
            <textarea
              id="task-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thêm chi tiết hoặc tài liệu liên quan..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
            />
          </div>

          <div className="pt-2 pb-safe">
            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-teal-500 active:scale-[0.99] transition-all"
            >
              {editingTask
                ? 'Lưu thay đổi'
                : `Lưu công việc · ${formatShortDateVi(parsedPreview?.date || date)}`}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
              Mức độ: {PRIORITY_LABELS[parsedPreview?.priority || priority]} · Nhóm:{' '}
              {CATEGORIES[parsedPreview?.category || category].label}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
