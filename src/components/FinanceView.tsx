import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import {
  BudgetConfig,
  FINANCE_CATEGORIES,
  FinanceCategory,
  Transaction,
  TransactionType,
  Wallet,
  DebtEntry,
  Debtor,
} from '../types/life';
import { addMonths, formatShortDateVi, MONTH_NAMES_VI, parseISODate } from '../utils/dateUtils';
import { compressImageFile, formatVnd } from '../utils/imageUtils';
import { DebtView } from './DebtView';

interface FinanceViewProps {
  transactions: Transaction[];
  wallets: Wallet[];
  budget: BudgetConfig;
  todayIso: string;
  hideBalances: boolean;
  onToggleHideBalances: () => void;
  onUpdateBudget: (next: BudgetConfig) => void;
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onAttachReceipt: (txId: string, photoDataUrl: string) => void;
  onPreviewPhoto: (src: string, caption: string) => void;
  debtors: Debtor[];
  debts: DebtEntry[];
  onAddDebtor: (name: string) => void;
  onAddDebt: (debtorId: string, amount: number, note: string) => void;
  onToggleDebt: (id: string) => void;
  onAttachProof: (id: string, photo: string) => void;
  onDeleteDebts: (ids: string[]) => void;
  onDeleteDebtor: (id: string) => void;
  onOpenWalletSetup: () => void;
  onPreviewDebtProof: (debt: DebtEntry) => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  wallets,
  budget,
  todayIso,
  hideBalances,
  onToggleHideBalances,
  onUpdateBudget,
  onOpenNewTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onAttachReceipt,
  onPreviewPhoto,
  debtors,
  debts,
  onAddDebtor,
  onAddDebt,
  onToggleDebt,
  onAttachProof,
  onDeleteDebts,
  onDeleteDebtor,
  onOpenWalletSetup,
  onPreviewDebtProof,
}) => {
  const [monthAnchor, setMonthAnchor] = useState(todayIso);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState(todayIso);
  const [customEnd, setCustomEnd] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState(String(budget.monthlyLimit));
  const quickReceiptRef = useRef<HTMLInputElement | null>(null);
  const [targetTxForReceipt, setTargetTxForReceipt] = useState<string | null>(null);

  const monthPrefix = monthAnchor.slice(0, 7);
  const parsedAnchor = parseISODate(monthAnchor);
  const monthLabel = `${MONTH_NAMES_VI[parsedAnchor.getMonth()]}, ${parsedAnchor.getFullYear()}`;

  const monthStats = useMemo(() => {
    const anchor = parseISODate(monthAnchor);
    const start = period === 'day' ? monthAnchor : period === 'week' ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - ((anchor.getDay() + 6) % 7)).toISOString().slice(0, 10) : period === 'year' ? `${anchor.getFullYear()}-01-01` : period === 'custom' ? customStart : `${monthPrefix}-01`;
    const end = period === 'day' ? monthAnchor : period === 'week' ? new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + (6 - ((anchor.getDay() + 6) % 7))).toISOString().slice(0, 10) : period === 'year' ? `${anchor.getFullYear()}-12-31` : period === 'custom' ? customEnd : `${monthPrefix}-31`;
    const inMonth = transactions.filter((t) => t.date >= start && t.date <= end);
    const income = inMonth
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = inMonth
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;
    const budgetPercent =
      budget.monthlyLimit <= 0
        ? 0
        : Math.round((expense / budget.monthlyLimit) * 100);

    const byCategory = (Object.keys(FINANCE_CATEGORIES) as FinanceCategory[])
      .filter((k) => FINANCE_CATEGORIES[k].type !== 'income')
      .map((catKey) => {
        const spent = inMonth
          .filter((t) => t.type === 'expense' && t.category === catKey)
          .reduce((sum, t) => sum + t.amount, 0);
        const percentage = budget.categoryLimitPercents?.[catKey];
        const cap = percentage === undefined ? (budget.categoryLimits[catKey] || 0) : Math.round(budget.monthlyLimit * percentage / 100);
        const pct = cap > 0 ? Math.round((spent / cap) * 100) : 0;
        return {
          meta: FINANCE_CATEGORIES[catKey],
          spent,
          cap,
          pct, percentage,
        };
      })
      .filter((c) => c.spent > 0 || c.cap > 0);

    const filtered = inMonth
      .filter((t) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

    return { income, expense, balance, budgetPercent, byCategory, filtered };
  }, [transactions, monthPrefix, budget, typeFilter, period, monthAnchor, customStart, customEnd]);

  // Current balance always uses the complete transaction history, not the selected report period.
  const walletSummary = useMemo(() => {
    const details = wallets.map((wallet) => {
      const related = transactions.filter((transaction) => transaction.walletId === wallet.id);
      const income = related.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + transaction.amount, 0);
      const expense = related.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + transaction.amount, 0);
      return { wallet, income, expense, balance: wallet.openingBalance + income - expense };
    });
    return {
      details,
      opening: details.reduce((sum, item) => sum + item.wallet.openingBalance, 0),
      income: details.reduce((sum, item) => sum + item.income, 0),
      expense: details.reduce((sum, item) => sum + item.expense, 0),
      balance: details.reduce((sum, item) => sum + item.balance, 0),
    };
  }, [wallets, transactions]);

  const handleSaveMonthlyLimit = () => {
    const val = Math.max(500000, Number(limitDraft.replace(/[^\d]/g, '')) || budget.monthlyLimit);
    onUpdateBudget({ ...budget, monthlyLimit: val });
    setEditingLimit(false);
  };

  const handleReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetTxForReceipt) return;
    try {
      const compressed = await compressImageFile(file);
      onAttachReceipt(targetTxForReceipt, compressed);
    } catch {
      // Ignore error
    } finally {
      e.target.value = '';
      setTargetTxForReceipt(null);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={quickReceiptRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleReceiptChange}
        className="hidden"
      />

      {/* Month Switcher & Add CTA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonthAnchor((m) => addMonths(m, -1))}
            aria-label="Tháng trước"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 px-1">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={() => setMonthAnchor((m) => addMonths(m, 1))}
            aria-label="Tháng sau"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleHideBalances}
            aria-label={hideBalances ? 'Hiện số tiền' : 'Ẩn số tiền'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
          >
            {hideBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenNewTransaction}
            className="min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-800 dark:hover:bg-teal-500 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Ghi thu chi</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2">
        {([{ id: 'day', label: 'Ngày' }, { id: 'week', label: 'Tuần' }, { id: 'month', label: 'Tháng' }, { id: 'year', label: 'Năm' }, { id: 'custom', label: 'Tùy chọn' }] as const).map((item) => <button key={item.id} type="button" onClick={() => setPeriod(item.id)} className={`min-h-[34px] px-3 rounded-lg text-xs font-medium ${period === item.id ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>{item.label}</button>)}
        {period === 'custom' && <><input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="min-h-[34px] rounded-lg border border-slate-200 px-2 text-xs dark:bg-slate-950 dark:border-slate-700" /><span className="text-xs">đến</span><input type="date" value={customEnd} min={customStart} onChange={(e) => setCustomEnd(e.target.value)} className="min-h-[34px] rounded-lg border border-slate-200 px-2 text-xs dark:bg-slate-950 dark:border-slate-700" /></>}
      </div>

      {/* Balance & Monthly Budget Card */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">Ví tiền</h3><p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Số dư được tự động cộng/trừ theo mọi giao dịch.</p></div><button type="button" onClick={onOpenWalletSetup} className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Sửa số dư đầu kỳ</button></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {walletSummary.details.map(({ wallet, income, expense, balance }) => <div key={wallet.id} className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-3"><p className="text-xs text-slate-500">{wallet.type === 'cash' ? '💵 Tiền mặt' : '🏦 Tài khoản'} · {wallet.name}</p><p className="font-mono-nums text-lg font-semibold text-slate-900 dark:text-slate-100">{formatVnd(balance, hideBalances)}</p><p className="mt-1 text-[10px] text-slate-500">Đầu kỳ {formatVnd(wallet.openingBalance, hideBalances)} + thu {formatVnd(income, hideBalances)} − chi {formatVnd(expense, hideBalances)}</p></div>)}
        </div>
        <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-3 dark:border-teal-900/60 dark:bg-teal-950/20"><div className="flex items-center justify-between"><p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tổng số dư thực tế</p><p className="font-mono-nums text-lg font-bold text-teal-700 dark:text-teal-300">{formatVnd(walletSummary.balance, hideBalances)}</p></div><p className="mt-1 text-[10px] text-slate-500">Tổng đầu kỳ {formatVnd(walletSummary.opening, hideBalances)} + tổng thu {formatVnd(walletSummary.income, hideBalances)} − tổng chi {formatVnd(walletSummary.expense, hideBalances)}. Bằng tổng số dư các ví.</p></div>
      </section>

      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Số dư tháng</p>
            <p className="font-mono-nums text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
              {formatVnd(monthStats.balance, hideBalances)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tổng thu</p>
            <p className="font-mono-nums text-lg font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
              +{formatVnd(monthStats.income, hideBalances)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tổng chi</p>
            <p className="font-mono-nums text-lg font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
              -{formatVnd(monthStats.expense, hideBalances)}
            </p>
          </div>
        </div>

        {/* Monthly Budget Bar */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Ngân sách chi tiêu tháng
            </span>

            {editingLimit ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={limitDraft}
                  onChange={(e) => setLimitDraft(e.target.value)}
                  className="w-32 min-h-[36px] px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-nums text-xs"
                />
                <button
                  type="button"
                  onClick={handleSaveMonthlyLimit}
                  className="min-h-[36px] px-3 rounded-lg bg-slate-900 dark:bg-teal-600 text-white text-xs font-medium"
                >
                  Lưu
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLimitDraft(String(budget.monthlyLimit));
                  setEditingLimit(true);
                }}
                className="text-xs font-mono-nums text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 inline-flex items-center gap-1"
              >
                <span>
                  {formatVnd(monthStats.expense, hideBalances)} / {formatVnd(budget.monthlyLimit, hideBalances)}
                </span>
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                monthStats.budgetPercent >= 100
                  ? 'bg-rose-600 dark:bg-rose-400'
                  : monthStats.budgetPercent >= 80
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-teal-600 dark:bg-teal-400'
              }`}
              style={{ width: `${Math.min(100, monthStats.budgetPercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {monthStats.budgetPercent >= 100
                ? 'Cảnh báo: Đã vượt hạn mức ngân sách tháng'
                : monthStats.budgetPercent >= 80
                ? 'Lưu ý: Đã dùng hơn 80% ngân sách'
                : 'Ngân sách đang trong tầm kiểm soát'}
            </span>
            <span className="font-mono-nums font-semibold text-slate-800 dark:text-slate-200">
              {monthStats.budgetPercent}%
            </span>
          </div>
        </div>
      </section>

      {/* Category Spending Breakdown */}
      {monthStats.byCategory.length > 0 && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Chi tiêu theo danh mục
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {monthStats.byCategory.map(({ meta, spent, cap, pct, percentage }) => (
              <div key={meta.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {meta.label}
                  </span>
                  <span className="font-mono-nums text-slate-500 dark:text-slate-400">
                    {formatVnd(spent, hideBalances)}
                    {cap > 0 && !hideBalances ? ` / ${Math.round(cap / 1000)}k` : ''}
                  </span>
                </div>
                <label className="flex items-center gap-1 text-[10px] text-slate-500">Hạn mức <input type="number" min="0" max="100" value={percentage ?? Math.round((cap / Math.max(1, budget.monthlyLimit)) * 100)} onChange={(e) => onUpdateBudget({ ...budget, categoryLimitPercents: { ...budget.categoryLimitPercents, [meta.id]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) } })} className="w-12 rounded border border-slate-200 bg-transparent px-1 text-right dark:border-slate-700" />%</label>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      pct >= 100 ? 'bg-rose-500' : meta.accentBar
                    }`}
                    style={{ width: `${cap > 0 ? Math.min(100, pct) : spent > 0 ? 45 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transactions List & Receipt Archive */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Lịch sử giao dịch & Hóa đơn
          </h3>

          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'expense', label: 'Chi tiêu' },
                { id: 'income', label: 'Thu nhập' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  typeFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {monthStats.filtered.length === 0 ? (
          <div className="py-8 text-center space-y-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Chưa có giao dịch nào trong tháng này.
            </p>
            <button
              type="button"
              onClick={onOpenNewTransaction}
              className="min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm khoản đầu tiên</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthStats.filtered.map((tx) => {
              const cat = FINANCE_CATEGORIES[tx.category];
              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {tx.receiptPhoto ? (
                      <button
                        type="button"
                        onClick={() => onPreviewPhoto(tx.receiptPhoto!, `Hóa đơn: ${tx.title}`)}
                        aria-label={`Xem hóa đơn ${tx.title}`}
                        className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0"
                      >
                        <img
                          src={tx.receiptPhoto}
                          alt={`Hóa đơn ${tx.title}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetTxForReceipt(tx.id);
                          quickReceiptRef.current?.click();
                        }}
                        title="Chụp ảnh hóa đơn"
                        aria-label={`Đính ảnh hóa đơn cho ${tx.title}`}
                        className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 flex items-center justify-center shrink-0 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    )}

                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {tx.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono-nums">{formatShortDateVi(tx.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span className={cat.accentText}>{cat.label}</span>
                        {tx.receiptPhoto && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300">
                              <Receipt className="w-3 h-3" />
                              <span>Đã lưu hóa đơn</span>
                            </span>
                          </>
                        )}
                      </div>
                      {tx.note && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {tx.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span
                      className={`font-mono-nums text-sm font-semibold ${
                        tx.type === 'income'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatVnd(tx.amount, hideBalances)}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        aria-label={`Sửa ${tx.title}`}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        aria-label={`Xóa ${tx.title}`}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <DebtView debtors={debtors} debts={debts} transactions={transactions} todayIso={todayIso} onAddDebtor={onAddDebtor} onAddDebt={onAddDebt} onToggleDebt={onToggleDebt} onAttachProof={onAttachProof} onDeleteDebts={onDeleteDebts} onDeleteDebtor={onDeleteDebtor} onPreviewProof={onPreviewDebtProof} />
    </div>
  );
};
