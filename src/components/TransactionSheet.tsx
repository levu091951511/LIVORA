import React, { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import {
  FINANCE_CATEGORIES,
  FinanceCategory,
  Transaction,
  TransactionType,
} from '../types/life';
import { compressImageFile, formatVnd } from '../utils/imageUtils';

interface TransactionSheetProps {
  isOpen: boolean;
  editingTx: Transaction | null;
  defaultTitle?: string;
  defaultAmount?: number;
  defaultReceiptPhoto?: string;
  todayIso: string;
  onClose: () => void;
  onSave: (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    editingId?: string
  ) => void;
}

const QUICK_AMOUNTS = [35000, 50000, 100000, 200000, 500000];

export const TransactionSheet: React.FC<TransactionSheetProps> = ({
  isOpen,
  editingTx,
  defaultTitle,
  defaultAmount,
  defaultReceiptPhoto,
  todayIso,
  onClose,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState<FinanceCategory>('food');
  const [date, setDate] = useState(todayIso);
  const [note, setNote] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | undefined>(undefined);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTx) {
      setType(editingTx.type);
      setTitle(editingTx.title);
      setAmountInput(String(editingTx.amount));
      setCategory(editingTx.category);
      setDate(editingTx.date);
      setNote(editingTx.note || '');
      setReceiptPhoto(editingTx.receiptPhoto);
    } else {
      setType('expense');
      setTitle(defaultTitle || '');
      setAmountInput(defaultAmount ? String(defaultAmount) : '');
      setCategory('food');
      setDate(todayIso);
      setNote('');
      setReceiptPhoto(defaultReceiptPhoto);
    }
  }, [isOpen, editingTx, defaultTitle, defaultAmount, defaultReceiptPhoto, todayIso]);

  if (!isOpen) return null;

  const parsedAmount = Math.max(0, Number(amountInput.replace(/[^\d]/g, '')) || 0);

  const handleReceiptPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setReceiptPhoto(compressed);
    } catch {
      // Ignore invalid image
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || parsedAmount <= 0) return;
    onSave(
      {
        type,
        amount: parsedAmount,
        title: title.trim(),
        category,
        date,
        note: note.trim() || undefined,
        receiptPhoto,
      },
      editingTx?.id
    );
    onClose();
  };

  const availableCategories = (Object.keys(FINANCE_CATEGORIES) as FinanceCategory[]).filter(
    (key) => {
      const meta = FINANCE_CATEGORIES[key];
      return meta.type === 'both' || meta.type === type;
    }
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-sheet-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 id="tx-sheet-title" className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {editingTx ? 'Chỉnh sửa giao dịch' : 'Ghi nhận thu chi'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Type Switch */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                if (category === 'salary') setCategory('food');
              }}
              className={`min-h-[42px] rounded-xl text-xs font-semibold transition-colors ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Khoản chi
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('salary');
              }}
              className={`min-h-[42px] rounded-xl text-xs font-semibold transition-colors ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Khoản thu
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label htmlFor="tx-amount" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Số tiền (VNĐ)
            </label>
            <input
              id="tx-amount"
              type="number"
              inputMode="numeric"
              min={1000}
              step={1000}
              required
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="VD: 150000"
              className="w-full min-h-[50px] px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-nums text-xl font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            {parsedAmount > 0 && (
              <p className="text-xs font-mono-nums text-teal-700 dark:text-teal-300">
                {formatVnd(parsedAmount)}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountInput(String(amt))}
                  className="min-h-[36px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono-nums font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  {amt / 1000}k
                </button>
              ))}
            </div>
          </div>

          {/* Title & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="tx-title" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Nội dung
              </label>
              <input
                id="tx-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Ăn tối, Đổ xăng..."
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="tx-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Ngày giao dịch
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-nums text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Danh mục
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableCategories.map((catKey) => {
                const meta = FINANCE_CATEGORIES[catKey];
                const active = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    className={`min-h-[42px] px-3 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                      active
                        ? 'border-slate-900 dark:border-teal-500 bg-slate-900 dark:bg-teal-600 text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Receipt Photo Capture */}
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Chụp & lưu hóa đơn
            </span>
            <input
              ref={receiptInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleReceiptPick}
              className="hidden"
            />
            {receiptPhoto ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-2.5 flex items-center gap-3 bg-slate-50 dark:bg-slate-950">
                <img
                  src={receiptPhoto}
                  alt="Ảnh hóa đơn"
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Đã đính kèm ảnh hóa đơn
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => receiptInputRef.current?.click()}
                      className="text-xs font-medium text-teal-700 dark:text-teal-300"
                    >
                      Chụp lại
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptPhoto(undefined)}
                      className="text-xs font-medium text-rose-600 dark:text-rose-400"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                className="w-full min-h-[52px] px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Chụp ảnh hoặc tải lên hóa đơn chi tiêu</span>
              </button>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label htmlFor="tx-note" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Ghi chú (tuỳ chọn)
            </label>
            <input
              id="tx-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Cửa hàng, người nhận..."
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="pt-2 pb-safe">
            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-teal-500 transition-colors"
            >
              {editingTx ? 'Lưu giao dịch' : 'Thêm giao dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
