import React, { useRef, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Download,
  EyeOff,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { LivoraBackupPayload, SecuritySettings } from '../types/life';
import { encodePin } from '../utils/storage';

interface SecurityBackupSheetProps {
  isOpen: boolean;
  security: SecuritySettings;
  counts: { tasks: number; transactions: number; inbox: number };
  onClose: () => void;
  onUpdateSecurity: (next: SecuritySettings) => void;
  onExportBackup: () => void;
  onImportBackup: (payload: LivoraBackupPayload) => void;
  onSyncNow: () => void;
  onLockNow: () => void;
  onClearAllData: () => boolean;
}

export const SecurityBackupSheet: React.FC<SecurityBackupSheetProps> = ({
  isOpen,
  security,
  counts,
  onClose,
  onUpdateSecurity,
  onExportBackup,
  onImportBackup,
  onSyncNow,
  onLockNow,
  onClearAllData,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput)) {
      setStatusMessage('Mã PIN phải gồm đúng 4 chữ số.');
      return;
    }
    onUpdateSecurity({
      ...security,
      pinHash: encodePin(pinInput),
    });
    setPinInput('');
    setStatusMessage('Đã bật khóa bảo mật bằng mã PIN 4 số.');
  };

  const handleDisablePin = () => {
    onUpdateSecurity({
      ...security,
      pinHash: undefined,
    });
    setStatusMessage('Đã tắt khóa mã PIN.');
  };

  const handleToggleNotifications = async () => {
    if (security.notificationsEnabled) {
      onUpdateSecurity({ ...security, notificationsEnabled: false });
      return;
    }
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        onUpdateSecurity({ ...security, notificationsEnabled: true });
        setStatusMessage('Đã bật thông báo nhắc nhở lịch trình.');
      } else {
        setStatusMessage('Trình duyệt chưa cấp quyền thông báo, nhắc nhở vẫn hiển thị trong ứng dụng.');
      }
    } else {
      onUpdateSecurity({ ...security, notificationsEnabled: true });
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as LivoraBackupPayload;
        if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.transactions)) {
          setStatusMessage('Tệp sao lưu không đúng định dạng LIVORA.');
          return;
        }
        onImportBackup(parsed);
        setStatusMessage('Đã khôi phục toàn bộ dữ liệu từ bản sao lưu.');
      } catch {
        setStatusMessage('Không thể đọc tệp JSON sao lưu.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const lastSyncedLabel = new Date(security.lastSyncedAt).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Đồng bộ, sao lưu và bảo mật dữ liệu"
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
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Đồng bộ, Sao lưu & Bảo mật
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-safe">
          {statusMessage && (
            <div className="rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 px-3.5 py-2.5 text-xs text-teal-800 dark:text-teal-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Sync Status */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Đồng bộ dữ liệu tức thì
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono-nums">
                  Lưu trữ IndexedDB · Lần cuối: {lastSyncedLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSyncNow();
                  setStatusMessage('Đã đồng bộ & kiểm tra toàn vẹn dữ liệu.');
                }}
                className="min-h-[40px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đồng bộ</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-nums">
              Hiện có {counts.tasks} công việc · {counts.transactions} giao dịch · {counts.inbox} mục hộp thư
            </p>
          </section>

          {/* Backup & Restore */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Sao lưu & Khôi phục toàn bộ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Xuất tệp JSON chứa cả lịch trình, thu chi, hóa đơn và ảnh minh chứng.
              </p>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileImport}
              className="hidden"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onExportBackup();
                  setStatusMessage('Đã tải xuống tệp sao lưu LIVORA.');
                }}
                className="min-h-[44px] px-3 rounded-xl bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Xuất bản sao lưu</span>
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Upload className="w-4 h-4" />
                <span>Khôi phục từ tệp</span>
              </button>
            </div>
          </section>

          {/* Security & Privacy */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3.5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Bảo mật & Quyền riêng tư
            </h3>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <EyeOff className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Ẩn số tiền & số dư tài chính
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Che số liệu khi dùng ở nơi công cộng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSecurity({ ...security, hideBalances: !security.hideBalances })
                }
                className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-colors ${
                  security.hideBalances
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {security.hideBalances ? 'Đang ẩn' : 'Đang hiện'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Thông báo nhắc lịch trình
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Gửi nhắc nhở trước giờ sự kiện
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleNotifications}
                className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-colors ${
                  security.notificationsEnabled
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {security.notificationsEnabled ? 'Đang bật' : 'Tắt'}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Khóa ứng dụng bằng mã PIN 4 số
                  </span>
                </div>
                {security.pinHash && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLockNow();
                    }}
                    className="text-xs font-semibold text-teal-700 dark:text-teal-300 hover:underline"
                  >
                    Khóa ngay
                  </button>
                )}
              </div>

              {security.pinHash ? (
                <button
                  type="button"
                  onClick={handleDisablePin}
                  className="w-full min-h-[42px] rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  Tắt khóa mã PIN
                </button>
              ) : (
                <form onSubmit={handleSetPin} className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Nhập 4 số PIN..."
                    className="flex-1 min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono-nums text-sm tracking-widest"
                  />
                  <button
                    type="submit"
                    className="min-h-[42px] px-4 rounded-xl bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold whitespace-nowrap"
                  >
                    Đặt PIN
                  </button>
                </form>
              )}
            </div>
          </section>

          {/* Clear all local data */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                if (onClearAllData()) {
                  setStatusMessage('Đã xóa sạch dữ liệu để bắt đầu mới.');
                }
              }}
              className="min-h-[42px] px-4 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa sạch toàn bộ dữ liệu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
