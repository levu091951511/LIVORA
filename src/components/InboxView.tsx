import React from 'react';
import {
  Camera,
  CheckSquare,
  Inbox,
  Mic,
  Plus,
  Receipt,
  Trash2,
  Type,
} from 'lucide-react';
import { CaptureSource, InboxItem } from '../types/life';
import { formatVnd } from '../utils/imageUtils';

interface InboxViewProps {
  items: InboxItem[];
  onOpenQuickCapture: (mode: CaptureSource) => void;
  onConvertToTask: (item: InboxItem) => void;
  onConvertToExpense: (item: InboxItem) => void;
  onDeleteItem: (id: string) => void;
  onPreviewPhoto: (src: string, caption: string) => void;
}

export const InboxView: React.FC<InboxViewProps> = ({
  items,
  onOpenQuickCapture,
  onConvertToTask,
  onConvertToExpense,
  onDeleteItem,
  onPreviewPhoto,
}) => {
  const sourceLabel = (source: CaptureSource) => {
    if (source === 'voice') return 'Giọng nói';
    if (source === 'image') return 'Hình ảnh';
    return 'Văn bản';
  };

  const sourceIcon = (source: CaptureSource) => {
    if (source === 'voice') return <Mic className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
    if (source === 'image') return <Camera className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
    return <Type className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Hộp thư chờ xử lý
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Nơi tập trung mọi ghi nhận nhanh trước khi phân loại thành công việc hoặc thu chi.
            </p>
          </div>
          <span className="font-mono-nums text-sm font-semibold text-teal-700 dark:text-teal-300 shrink-0">
            {items.length} mục
          </span>
        </div>

        {/* 3 Quick Capture Launchers */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onOpenQuickCapture('text')}
            className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Type className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Ghi chữ</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickCapture('voice')}
            className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Mic className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Giọng nói</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenQuickCapture('image')}
            className="min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Camera className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Chụp ảnh</span>
          </button>
        </div>
      </section>

      {/* Pending Items List */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Hộp thư đang sạch sẽ
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chụp nhanh hóa đơn, đọc ghi chú bằng giọng nói hoặc ghi ý tưởng bất kỳ lúc nào.
          </p>
          <button
            type="button"
            onClick={() => onOpenQuickCapture('text')}
            className="min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Ghi nhận nhanh</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const createdLabel = new Date(item.createdAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <article
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        {sourceIcon(item.source)}
                        <span>{sourceLabel(item.source)}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-nums">{createdLabel}</span>
                      {item.suggestedAmount && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-nums font-medium text-amber-700 dark:text-amber-400">
                            {formatVnd(item.suggestedAmount)}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-[15px] font-medium text-slate-900 dark:text-slate-100 leading-snug break-words">
                      {item.content}
                    </p>
                  </div>

                  {item.photo && (
                    <button
                      type="button"
                      onClick={() => onPreviewPhoto(item.photo!, item.content)}
                      className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0"
                    >
                      <img
                        src={item.photo}
                        alt={item.content}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}
                </div>

                {/* Triage Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onConvertToTask(item)}
                      className="min-h-[40px] px-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors whitespace-nowrap"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Chuyển thành Việc</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onConvertToExpense(item)}
                      className="min-h-[40px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Chuyển thành Chi tiêu</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteItem(item.id)}
                    aria-label="Xóa khỏi hộp thư"
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
