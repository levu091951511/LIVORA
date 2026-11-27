import React, { useEffect, useState } from 'react';
import { Wallet } from '../types/life';

interface WalletBalanceSetupSheetProps {
  isOpen: boolean;
  wallets: Wallet[];
  onSave: (wallets: Wallet[]) => void;
}

export const WalletBalanceSetupSheet: React.FC<WalletBalanceSetupSheetProps> = ({
  isOpen,
  wallets,
  onSave,
}) => {
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setAmounts(Object.fromEntries(wallets.map((wallet) => [wallet.id, String(wallet.openingBalance || '')])));
  }, [isOpen, wallets]);

  if (!isOpen) return null;

  const save = () => {
    onSave(wallets.map((wallet) => {
      const actualBalance = Math.max(0, Number((amounts[wallet.id] || '0').replace(/[^\d]/g, '')) || 0);
      return { ...wallet, openingBalance: actualBalance, balanceConfirmed: true };
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-sm">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 p-5 space-y-4">
        <div><p className="text-lg font-bold text-slate-900 dark:text-slate-100">Thiết lập số dư đầu kỳ</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Nhập số tiền đang có khi bắt đầu dùng. Từ đây Livora tự động cộng/trừ từ các giao dịch, không điều chỉnh số dư thủ công.</p></div>
        {wallets.map((wallet) => <div key={wallet.id} className="space-y-1.5"><label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{wallet.type === 'cash' ? '💵 Tiền mặt' : '🏦 Tài khoản'} · {wallet.name}</label><input autoFocus={wallet.id === wallets[0]?.id} inputMode="numeric" value={amounts[wallet.id] || ''} onChange={(e) => setAmounts((prev) => ({ ...prev, [wallet.id]: e.target.value }))} placeholder="0" className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono-nums text-lg dark:border-slate-700 dark:bg-slate-950" /></div>)}
        <button type="button" onClick={save} className="w-full min-h-[48px] rounded-2xl bg-teal-600 text-sm font-bold text-white">Lưu số dư & bắt đầu sử dụng</button>
      </div>
    </div>
  );
};
