import { BudgetConfig, InboxItem, SecuritySettings, Transaction } from '../types/life';
import { addDays } from '../utils/dateUtils';

export function createSeedTransactions(todayIso: string): Transaction[] {
  const nowIso = new Date().toISOString();
  const monthStart = `${todayIso.slice(0, 7)}-01`;

  return [
    {
      id: 'tx-1',
      type: 'income',
      amount: 24500000,
      title: 'Lương tháng chính thức',
      category: 'salary',
      date: monthStart,
      note: 'Chuyển khoản định kỳ hàng tháng',
      createdAt: nowIso,
    },
    {
      id: 'tx-2',
      type: 'expense',
      amount: 5500000,
      title: 'Tiền thuê nhà & phí quản lý',
      category: 'housing',
      date: addDays(monthStart, 2),
      note: 'Đã thanh toán qua chuyển khoản',
      createdAt: nowIso,
    },
    {
      id: 'tx-3',
      type: 'expense',
      amount: 145000,
      title: 'Cơm trưa & cà phê làm việc',
      category: 'food',
      date: todayIso,
      note: 'Họp cùng nhóm thiết kế',
      createdAt: nowIso,
    },
    {
      id: 'tx-4',
      type: 'expense',
      amount: 320000,
      title: 'Đổ xăng & gửi xe tuần',
      category: 'transport',
      date: addDays(todayIso, -1),
      createdAt: nowIso,
    },
    {
      id: 'tx-5',
      type: 'expense',
      amount: 480000,
      title: 'Mua sách chuyên ngành & sổ tay',
      category: 'shopping',
      date: addDays(todayIso, -2),
      createdAt: nowIso,
    },
    {
      id: 'tx-6',
      type: 'expense',
      amount: 260000,
      title: 'Vitamin & đồ tập thể thao',
      category: 'health',
      date: addDays(todayIso, -3),
      createdAt: nowIso,
    },
  ];
}

export const DEFAULT_BUDGET: BudgetConfig = {
  monthlyLimit: 12000000,
  categoryLimits: {
    food: 3500000,
    transport: 1200000,
    housing: 6000000,
    shopping: 1500000,
    health: 1000000,
    entertainment: 1000000,
  },
};

export function createSeedInbox(): InboxItem[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: 'inb-1',
      source: 'voice',
      content: 'Nhắc gọi điện đặt lịch bảo dưỡng xe thứ 7 lúc 9 giờ sáng',
      suggestedType: 'task',
      createdAt: nowIso,
    },
    {
      id: 'inb-2',
      source: 'text',
      content: 'Mua trà xanh & sữa hạt siêu thị hết 185k',
      suggestedType: 'expense',
      suggestedAmount: 185000,
      createdAt: nowIso,
    },
  ];
}

export function createDefaultSecurity(): SecuritySettings {
  return {
    hideBalances: false,
    notificationsEnabled: false,
    lastSyncedAt: new Date().toISOString(),
  };
}
