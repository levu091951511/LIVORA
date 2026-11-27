import React, { useEffect, useRef, useState } from 'react';
import { Camera, Mic, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import {
  FINANCE_CATEGORIES,
  FinanceCategory,
  Transaction,
  TransactionType,
  Wallet,
  Debtor,
} from '../types/life';
import { compressImageFile, formatVnd, formatVndInput } from '../utils/imageUtils';

interface TransactionSheetProps {
  isOpen: boolean;
  editingTx: Transaction | null;
  defaultTitle?: string;
  defaultAmount?: number;
  defaultReceiptPhoto?: string;
  todayIso: string;
  wallets: Wallet[];
  debtors: Debtor[];
  onAddDebtor: (name: string) => void;
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
  wallets,
  debtors,
  onAddDebtor,
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
  const [walletId, setWalletId] = useState('cash');
  const [isDebtSplit, setIsDebtSplit] = useState(false);
  const [ownShare, setOwnShare] = useState('');
  const [debtRows, setDebtRows] = useState<Array<{ name: string; amount: string }>>([]);
  const [newDebtorName, setNewDebtorName] = useState('');
  const [micStatus, setMicStatus] = useState('');
  const [isListening, setIsListening] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const speechListenerRef = useRef<{ remove: () => Promise<void> } | null>(null);
  const speechTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTx) {
      setType(editingTx.type);
      setTitle(editingTx.title);
      setAmountInput(formatVndInput(editingTx.amount));
      setCategory(editingTx.category);
      setDate(editingTx.date);
      setNote(editingTx.note || '');
      setReceiptPhoto(editingTx.receiptPhoto);
      setWalletId(editingTx.walletId || 'cash');
      setIsDebtSplit(Boolean(editingTx.isDebtSplit)); setOwnShare(formatVndInput(editingTx.ownShare || '')); setDebtRows((editingTx.debtSplitDrafts || []).map((item) => ({ name: item.name, amount: formatVndInput(item.amount) }))); setNewDebtorName(''); setMicStatus('');
    } else {
      setType('expense');
      setTitle(defaultTitle || '');
      setAmountInput(defaultAmount ? String(defaultAmount) : '');
      setCategory('food');
      setDate(todayIso);
      setNote('');
      setReceiptPhoto(defaultReceiptPhoto);
      setWalletId('cash');
      setIsDebtSplit(false); setOwnShare(''); setDebtRows([]); setNewDebtorName(''); setMicStatus('');
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
        walletId,
        isDebtSplit,
        ownShare: isDebtSplit ? Number(ownShare.replace(/[^\d]/g, '')) || 0 : undefined,
        debtSplitDrafts: isDebtSplit ? debtRows.map((row) => ({ name: row.name.trim(), amount: Number(row.amount.replace(/[^\d]/g, '')) || 0 })).filter((item) => item.name && item.amount > 0) : undefined,
      },
      editingTx?.id
    );
    onClose();
  };

  const stopDictation = async () => {
    if (speechTimerRef.current) window.clearTimeout(speechTimerRef.current);
    speechTimerRef.current = null;
    try { await SpeechRecognition.stop(); } catch { /* Session may already have stopped. */ }
    await speechListenerRef.current?.remove();
    speechListenerRef.current = null;
    setIsListening(false);
    setMicStatus('');
  };
  const dictateTitle = async () => {
    if (isListening) { await stopDictation(); return; }
    if (!Capacitor.isNativePlatform()) { setMicStatus('Nhập giọng nói chỉ hoạt động trong APK.'); return; }
    try {
      const { available } = await SpeechRecognition.available();
      if (!available) { setMicStatus('Thiết bị chưa có dịch vụ nhận giọng nói.'); return; }
      let permission = await SpeechRecognition.checkPermissions();
      if (permission.speechRecognition !== 'granted') permission = await SpeechRecognition.requestPermissions();
      if (permission.speechRecognition !== 'granted') { setMicStatus('Bạn chưa cấp quyền micro.'); return; }
      setMicStatus('Đang nghe… hãy nói tiêu đề.');
      speechListenerRef.current = await SpeechRecognition.addListener('partialResults', ({ matches }) => { if (matches?.[0]) setTitle(matches[0]); });
      await SpeechRecognition.start({ language: 'vi-VN', maxResults: 1, partialResults: true, popup: false });
      setIsListening(true);
      speechTimerRef.current = window.setTimeout(() => { void stopDictation(); }, 10000);
    } catch { setMicStatus('Không thể mở micro. Kiểm tra quyền trong Cài đặt ứng dụng.'); }
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
              type="text"
              inputMode="numeric"
              min={1000}
              step={1000}
              required
              value={amountInput}
              onChange={(e) => setAmountInput(formatVndInput(e.target.value))}
              placeholder="VD: 150.000"
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
                  onClick={() => setAmountInput(formatVndInput(amt))}
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
              <div className="flex items-center justify-between"><label htmlFor="tx-title" className="block text-xs font-medium text-slate-600 dark:text-slate-400">Tiêu đề</label><button type="button" onClick={() => void dictateTitle()} className={`px-2 py-1 rounded-lg text-xs ${isListening ? 'bg-rose-100 text-rose-700' : 'text-teal-600'}`} aria-label="Nhập tiêu đề bằng giọng nói">{isListening ? 'Dừng nghe' : <Mic className="w-4 h-4" />}</button></div>
              <input
                id="tx-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Ăn tối, Đổ xăng..."
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              {micStatus && <p className="text-[11px] text-teal-700 dark:text-teal-300">{micStatus}</p>}
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

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Ví nhận / chi tiền</label>
            <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm">
              {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.type === 'cash' ? '💵 ' : '🏦 '}{wallet.name}</option>)}
            </select>
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
          {type === 'expense' && <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/20"><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={isDebtSplit} onChange={(e) => setIsDebtSplit(e.target.checked)} /> Ghi nợ / chia bill</label>{isDebtSplit && <><input inputMode="numeric" value={ownShare} onChange={(e) => setOwnShare(formatVndInput(e.target.value))} placeholder="Phần của tôi (0 nếu không tham gia)" className="w-full min-h-[40px] rounded-xl border border-amber-200 bg-white px-3 text-sm dark:bg-slate-950" /><div className="flex gap-1"><input value={newDebtorName} onChange={(e) => setNewDebtorName(e.target.value)} placeholder="Thêm người nợ mới" className="min-w-0 flex-1 min-h-[40px] rounded-xl border border-amber-200 bg-white px-3 text-sm dark:bg-slate-950" /><button type="button" onClick={() => { const name = newDebtorName.trim(); if (!name) return; onAddDebtor(name); setDebtRows((rows) => [...rows, { name, amount: '' }]); setNewDebtorName(''); }} className="rounded-xl bg-amber-600 px-3 text-xs font-semibold text-white">Thêm</button></div><p className="text-[11px] text-amber-800 dark:text-amber-200">Chọn từ danh bạ hoặc thêm người mới, rồi nhập phần tiền họ nợ.</p>{debtRows.map((row, index) => <div key={`${index}-${row.name}`} className="flex gap-1"><select value={row.name} onChange={(e) => setDebtRows((rows) => rows.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} className="min-w-0 flex-1 min-h-[40px] rounded-xl border border-amber-200 bg-white px-2 text-sm dark:bg-slate-950"><option value="">Chọn người nợ</option>{debtors.map((person) => <option key={person.id} value={person.name}>{person.name}</option>)}</select><input value={row.amount} onChange={(e) => setDebtRows((rows) => rows.map((item, i) => i === index ? { ...item, amount: formatVndInput(e.target.value) } : item))} inputMode="numeric" placeholder="Số tiền" className="w-28 min-h-[40px] rounded-xl border border-amber-200 bg-white px-2 text-sm dark:bg-slate-950" /><button type="button" onClick={() => setDebtRows((rows) => rows.filter((_, i) => i !== index))} className="px-2 text-xs text-rose-600">Xóa</button></div>)}<button type="button" onClick={() => setDebtRows((rows) => [...rows, { name: '', amount: '' }])} className="text-xs font-semibold text-amber-800 dark:text-amber-200">+ Thêm người từ danh bạ</button></>}</div>}

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
