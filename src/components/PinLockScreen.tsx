import React, { useState } from 'react';
import { Delete, ShieldCheck } from 'lucide-react';
import { encodePin } from '../utils/storage';

interface PinLockScreenProps {
  expectedPinHash: string;
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  expectedPinHash,
  onUnlock,
}) => {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (entered.length >= 4) return;
    const next = entered + digit;
    setEntered(next);
    setError(false);

    if (next.length === 4) {
      if (encodePin(next) === expectedPinHash) {
        onUnlock();
      } else {
        setError(true);
        window.setTimeout(() => setEntered(''), 350);
      }
    }
  };

  const handleBackspace = () => {
    setEntered((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            LIVORA đang khóa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {error ? 'Mã PIN chưa đúng, vui lòng thử lại' : 'Nhập mã PIN 4 số để tiếp tục'}
          </p>
        </div>

        {/* 4 PIN dots */}
        <div className="flex items-center justify-center gap-4">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-colors ${
                error
                  ? 'bg-rose-500'
                  : i < entered.length
                  ? 'bg-teal-600 dark:bg-teal-400'
                  : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="min-h-[56px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono-nums text-lg font-semibold text-slate-900 dark:text-slate-100 active:scale-95 transition-transform"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="min-h-[56px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono-nums text-lg font-semibold text-slate-900 dark:text-slate-100 active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Xóa số"
            className="min-h-[56px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
