export type AppTab = 'dashboard' | 'calendar' | 'finance' | 'inbox' | 'progress';

export type TransactionType = 'expense' | 'income';
export type WalletType = 'cash' | 'bank';

export interface Wallet {
  id: string;
  name: string;
  type: WalletType;
  openingBalance: number;
  createdAt: string;
  balanceConfirmed?: boolean;
}

export interface Debtor {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface DebtEntry {
  id: string;
  transactionId: string;
  debtorId: string;
  amount: number;
  date: string;
  status: 'unpaid' | 'paid';
  paidAt?: string;
  proofPhoto?: string;
  note?: string;
}
export interface DebtSplit {
  debtorId: string;
  amount: number;
}
export interface DebtSplitDraft {
  name: string;
  amount: number;
}

export type FinanceCategory =
  | 'food'
  | 'transport'
  | 'housing'
  | 'shopping'
  | 'health'
  | 'entertainment'
  | 'salary'
  | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number; // VND
  title: string;
  category: FinanceCategory;
  date: string; // YYYY-MM-DD
  note?: string;
  receiptPhoto?: string; // Compressed JPEG data URL
  walletId?: string;
  isDebtSplit?: boolean;
  ownShare?: number;
  debtSplits?: DebtSplit[];
  debtSplitDrafts?: DebtSplitDraft[];
  createdAt: string;
}

export interface BudgetConfig {
  monthlyLimit: number;
  categoryLimits: Partial<Record<FinanceCategory, number>>;
  categoryLimitPercents?: Partial<Record<FinanceCategory, number>>;
}

export type CaptureSource = 'text' | 'voice' | 'image';

export interface InboxItem {
  id: string;
  source: CaptureSource;
  content: string;
  photo?: string;
  suggestedType?: 'task' | 'expense' | 'note';
  suggestedAmount?: number;
  createdAt: string;
}

export interface SecuritySettings {
  pinHash?: string; // simple SHA/encoded 4-digit PIN for local lock
  hideBalances: boolean;
  notificationsEnabled: boolean;
  lastSyncedAt: string;
}

export interface LivoraBackupPayload {
  version: number;
  exportedAt: string;
  tasks: import('./task').Task[];
  transactions: Transaction[];
  budget: BudgetConfig;
  inbox: InboxItem[];
  security: SecuritySettings;
  wallets?: Wallet[];
  debtors?: Debtor[];
  debts?: DebtEntry[];
}

export interface FinanceCategoryMeta {
  id: FinanceCategory;
  label: string;
  type: TransactionType | 'both';
  accentBar: string;
  accentText: string;
}

export const FINANCE_CATEGORIES: Record<FinanceCategory, FinanceCategoryMeta> = {
  food: {
    id: 'food',
    label: 'Ăn uống',
    type: 'expense',
    accentBar: 'bg-teal-600 dark:bg-teal-400',
    accentText: 'text-teal-700 dark:text-teal-300',
  },
  transport: {
    id: 'transport',
    label: 'Di chuyển',
    type: 'expense',
    accentBar: 'bg-sky-600 dark:bg-sky-400',
    accentText: 'text-sky-700 dark:text-sky-300',
  },
  housing: {
    id: 'housing',
    label: 'Nhà cửa & Hóa đơn',
    type: 'expense',
    accentBar: 'bg-amber-600 dark:bg-amber-400',
    accentText: 'text-amber-700 dark:text-amber-300',
  },
  shopping: {
    id: 'shopping',
    label: 'Mua sắm',
    type: 'expense',
    accentBar: 'bg-rose-600 dark:bg-rose-400',
    accentText: 'text-rose-700 dark:text-rose-300',
  },
  health: {
    id: 'health',
    label: 'Sức khỏe',
    type: 'expense',
    accentBar: 'bg-emerald-600 dark:bg-emerald-400',
    accentText: 'text-emerald-700 dark:text-emerald-300',
  },
  entertainment: {
    id: 'entertainment',
    label: 'Giải trí',
    type: 'expense',
    accentBar: 'bg-indigo-600 dark:bg-indigo-400',
    accentText: 'text-indigo-700 dark:text-indigo-300',
  },
  salary: {
    id: 'salary',
    label: 'Thu nhập / Lương',
    type: 'income',
    accentBar: 'bg-emerald-600 dark:bg-emerald-400',
    accentText: 'text-emerald-700 dark:text-emerald-300',
  },
  other: {
    id: 'other',
    label: 'Khác',
    type: 'both',
    accentBar: 'bg-slate-600 dark:bg-slate-400',
    accentText: 'text-slate-700 dark:text-slate-300',
  },
};
