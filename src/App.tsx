import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Inbox,
  LayoutGrid,
  Moon,
  Plus,
  ShieldCheck,
  Sparkles,
  Sun,
  Wallet,
} from 'lucide-react';
import { CalendarPanel } from './components/CalendarPanel';
import { DashboardView } from './components/DashboardView';
import { FinanceView } from './components/FinanceView';
import { FocusTimerSheet } from './components/FocusTimerSheet';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { InboxView } from './components/InboxView';
import { PinLockScreen } from './components/PinLockScreen';
import { ProgressRing } from './components/ProgressRing';
import { ProgressView } from './components/ProgressView';
import { QuickAddSheet } from './components/QuickAddSheet';
import { QuickCaptureSheet } from './components/QuickCaptureSheet';
import { SecurityBackupSheet } from './components/SecurityBackupSheet';
import { TaskRow } from './components/TaskRow';
import { TransactionSheet } from './components/TransactionSheet';
import {
  createDefaultSecurity,
  DEFAULT_BUDGET,
} from './data/seedLifeData';
import {
  AppTab,
  BudgetConfig,
  CaptureSource,
  InboxItem,
  LivoraBackupPayload,
  SecuritySettings,
  Transaction,
} from './types/life';
import { CalendarViewMode, CATEGORIES, Task } from './types/task';
import {
  formatRelativeDayVi,
  formatShortDateVi,
  getNextRecurrenceDate,
  toISODate,
} from './utils/dateUtils';
import { parseQuickAmountVnd } from './utils/imageUtils';
import { parseSmartTaskInput } from './utils/smartParser';
import {
  createSyncChannel,
  loadLivoraState,
  PersistedLivoraState,
  saveLivoraState,
} from './utils/storage';

const THEME_KEY = 'livora_theme_v1';

interface ToastState {
  message: string;
  undoState?: PersistedLivoraState;
}

export default function App() {
  const todayIso = useMemo(() => toISODate(new Date()), []);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<BudgetConfig>(DEFAULT_BUDGET);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [security, setSecurity] = useState<SecuritySettings>(() => createDefaultSecurity());
  const [hydrated, setHydrated] = useState(false);
  const [locked, setLocked] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  const [quickInput, setQuickInput] = useState('');
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskPrefill, setTaskPrefill] = useState<{ title?: string; photo?: string }>({});

  const [txSheetOpen, setTxSheetOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txPrefill, setTxPrefill] = useState<{
    title?: string;
    amount?: number;
    photo?: string;
  }>({});

  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureSource>('text');
  const [convertingInboxId, setConvertingInboxId] = useState<string | null>(null);

  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; caption: string } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const syncChannelRef = useRef<ReturnType<typeof createSyncChannel> | null>(null);
  const isRemoteSyncRef = useRef(false);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Hydrate from IndexedDB / localStorage on mount & subscribe to cross-tab sync
  useEffect(() => {
    let mounted = true;
    loadLivoraState().then((saved) => {
      if (!mounted) return;
      if (saved) {
        if (Array.isArray(saved.tasks)) setTasks(saved.tasks);
        if (Array.isArray(saved.transactions)) setTransactions(saved.transactions);
        if (saved.budget) setBudget(saved.budget);
        if (Array.isArray(saved.inbox)) setInbox(saved.inbox);
        if (saved.security) {
          setSecurity(saved.security);
          if (saved.security.pinHash) {
            setLocked(true);
          }
        }
      }
      setHydrated(true);
    });

    const channel = createSyncChannel((remote) => {
      isRemoteSyncRef.current = true;
      setTasks(remote.tasks);
      setTransactions(remote.transactions);
      setBudget(remote.budget);
      setInbox(remote.inbox);
      setSecurity(remote.security);
    });
    syncChannelRef.current = channel;

    return () => {
      mounted = false;
      channel.close();
    };
  }, []);

  // Persist state to IndexedDB + BroadcastChannel
  useEffect(() => {
    if (!hydrated) return;
    if (isRemoteSyncRef.current) {
      isRemoteSyncRef.current = false;
      return;
    }
    const payload: PersistedLivoraState = {
      tasks,
      transactions,
      budget,
      inbox,
      security,
    };
    saveLivoraState(payload);
    syncChannelRef.current?.broadcast(payload);
  }, [hydrated, tasks, transactions, budget, inbox, security]);

  // Theme class sync
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore
    }
  }, [darkMode]);

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Reminder checker every 30s
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const nowToday = toISODate(now);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      for (const task of tasks) {
        if (
          task.completed ||
          task.date !== nowToday ||
          !task.time ||
          task.reminderMinutes === undefined
        ) {
          continue;
        }
        const [hh, mm] = task.time.split(':').map(Number);
        const triggerAt = hh * 60 + mm - task.reminderMinutes;
        const key = `${task.id}-${task.date}-${task.time}`;
        if (nowMinutes >= triggerAt && nowMinutes <= triggerAt + 1 && !notifiedIdsRef.current.has(key)) {
          notifiedIdsRef.current.add(key);
          const msg = `Nhắc nhở (${task.time}): ${task.title}`;
          setToast({ message: msg });
          if (
            security.notificationsEnabled &&
            typeof Notification !== 'undefined' &&
            Notification.permission === 'granted'
          ) {
            try {
              new Notification('LIVORA Nhắc lịch trình', { body: msg });
            } catch {
              // Ignore notification failure
            }
          }
        }
      }
    };

    checkReminders();
    const interval = window.setInterval(checkReminders, 30000);
    return () => window.clearInterval(interval);
  }, [tasks, security.notificationsEnabled]);

  const snapshotCurrentState = (): PersistedLivoraState => ({
    tasks,
    transactions,
    budget,
    inbox,
    security,
  });

  const showToast = (message: string, undoState?: PersistedLivoraState) => {
    setToast({ message, undoState });
  };

  const quickParsed = useMemo(() => {
    if (!quickInput.trim()) return null;
    return parseSmartTaskInput(quickInput, selectedDate);
  }, [quickInput, selectedDate]);

  const selectedDayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.date === selectedDate)
      .slice()
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const prioOrder = { high: 0, medium: 1, low: 2 };
        if (prioOrder[a.priority] !== prioOrder[b.priority]) {
          return prioOrder[a.priority] - prioOrder[b.priority];
        }
        return (a.time || '99:99').localeCompare(b.time || '99:99');
      });
  }, [tasks, selectedDate]);

  const selectedDayDone = selectedDayTasks.filter((t) => t.completed).length;
  const selectedDayPercent =
    selectedDayTasks.length === 0
      ? 0
      : Math.round((selectedDayDone / selectedDayTasks.length) * 100);

  // Task handlers
  const handleToggleComplete = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const nextCompleted = !target.completed;
    let extraRecurringTask: Task | null = null;

    if (nextCompleted && target.recurrence !== 'none') {
      const nextDate = getNextRecurrenceDate(target.date, target.recurrence);
      if (nextDate) {
        const alreadyExists = tasks.some(
          (t) => t.title === target.title && t.date === nextDate && !t.completed
        );
        if (!alreadyExists) {
          extraRecurringTask = {
            ...target,
            id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            date: nextDate,
            completed: false,
            completedAt: undefined,
            focusMinutesLogged: 0,
            proofPhoto: undefined,
            subtasks: target.subtasks.map((s) => ({ ...s, completed: false })),
            createdAt: new Date().toISOString(),
          };
        }
      }
    }

    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : undefined,
            }
          : t
      );
      return extraRecurringTask ? [extraRecurringTask, ...updated] : updated;
    });

    if (extraRecurringTask) {
      showToast(`Đã xong! Tự tạo lịch lặp vào ${formatShortDateVi(extraRecurringTask.date)}.`);
    }
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed: !s.completed } : s
              ),
            }
          : t
      )
    );
  };

  const handleAttachProofPhoto = (taskId: string, photoDataUrl: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, proofPhoto: photoDataUrl } : t))
    );
    showToast('Đã lưu ảnh minh chứng cho công việc.');
  };

  const handleSaveTask = (
    taskData: Omit<Task, 'id' | 'createdAt' | 'focusMinutesLogged'>,
    editingId?: string
  ) => {
    if (editingId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, ...taskData } : t))
      );
      showToast('Đã cập nhật công việc.');
    } else {
      const newTask: Task = {
        ...taskData,
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        focusMinutesLogged: 0,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
      setSelectedDate(newTask.date);
      if (convertingInboxId) {
        setInbox((prev) => prev.filter((item) => item.id !== convertingInboxId));
        setConvertingInboxId(null);
      }
      showToast(`Đã thêm "${newTask.title}" vào ${formatShortDateVi(newTask.date)}.`);
    }
    setEditingTask(null);
    setTaskPrefill({});
  };

  const handleInlineQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const parsed = parseSmartTaskInput(quickInput, selectedDate);
    const title = (parsed.title || quickInput).trim();
    if (!title) return;

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      date: parsed.date || selectedDate,
      time: parsed.time,
      reminderMinutes: parsed.time ? 15 : undefined,
      durationMinutes: parsed.durationMinutes || 30,
      priority: parsed.priority || 'medium',
      category: parsed.category || 'work',
      recurrence: parsed.recurrence || 'none',
      completed: false,
      subtasks: [],
      focusMinutesLogged: 0,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    setSelectedDate(newTask.date);
    setQuickInput('');
    showToast(`Đã thêm "${newTask.title}" (${formatShortDateVi(newTask.date)}).`);
  };

  const handleDeleteTask = (taskId: string) => {
    const prevSnapshot = snapshotCurrentState();
    const removed = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (removed) {
      showToast(`Đã xóa "${removed.title}".`, prevSnapshot);
    }
  };

  const handleRescheduleOverdueToToday = () => {
    const prevSnapshot = snapshotCurrentState();
    setTasks((prev) =>
      prev.map((t) =>
        !t.completed && t.date < todayIso ? { ...t, date: todayIso } : t
      )
    );
    setSelectedDate(todayIso);
    showToast('Đã chuyển công việc quá hạn sang hôm nay.', prevSnapshot);
  };

  const handleLogFocusMinutes = (
    taskId: string,
    minutes: number,
    markComplete: boolean
  ) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              focusMinutesLogged: (t.focusMinutesLogged || 0) + minutes,
              completed: markComplete ? true : t.completed,
              completedAt: markComplete ? new Date().toISOString() : t.completedAt,
            }
          : t
      )
    );
    showToast(
      markComplete
        ? `Hoàn thành công việc (+${minutes} phút tập trung).`
        : `Đã lưu ${minutes} phút tập trung.`
    );
  };

  // Finance handlers
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    if (editingId) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === editingId ? { ...t, ...txData } : t))
      );
      showToast('Đã cập nhật giao dịch.');
    } else {
      const newTx: Transaction = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);
      if (convertingInboxId) {
        setInbox((prev) => prev.filter((item) => item.id !== convertingInboxId));
        setConvertingInboxId(null);
      }
      showToast(`Đã lưu khoản ${txData.type === 'income' ? 'thu' : 'chi'} "${txData.title}".`);
    }
    setEditingTx(null);
    setTxPrefill({});
  };

  const handleDeleteTransaction = (txId: string) => {
    const prevSnapshot = snapshotCurrentState();
    const removed = transactions.find((t) => t.id === txId);
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    if (removed) {
      showToast(`Đã xóa giao dịch "${removed.title}".`, prevSnapshot);
    }
  };

  const handleAttachReceipt = (txId: string, photoDataUrl: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, receiptPhoto: photoDataUrl } : t))
    );
    showToast('Đã lưu ảnh hóa đơn.');
  };

  // Inbox & Quick Capture handlers
  const handleSaveToInbox = (payload: {
    source: CaptureSource;
    content: string;
    photo?: string;
    suggestedType: 'task' | 'expense' | 'note';
    suggestedAmount?: number;
  }) => {
    const item: InboxItem = {
      id: `inb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...payload,
      createdAt: new Date().toISOString(),
    };
    setInbox((prev) => [item, ...prev]);
    showToast('Đã lưu vào Hộp thư chờ xử lý.');
  };

  // Backup & Sync handlers
  const handleExportBackup = () => {
    const payload: LivoraBackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
      transactions,
      budget,
      inbox,
      security,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `livora-backup-${todayIso}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (payload: LivoraBackupPayload) => {
    setTasks(payload.tasks);
    setTransactions(payload.transactions);
    if (payload.budget) setBudget(payload.budget);
    if (Array.isArray(payload.inbox)) setInbox(payload.inbox);
    if (payload.security) {
      setSecurity({ ...payload.security, lastSyncedAt: new Date().toISOString() });
    }
    showToast('Đã khôi phục toàn bộ dữ liệu thành công.');
  };

  const handleSyncNow = () => {
    const nextSecurity = { ...security, lastSyncedAt: new Date().toISOString() };
    setSecurity(nextSecurity);
    const payload: PersistedLivoraState = {
      tasks,
      transactions,
      budget,
      inbox,
      security: nextSecurity,
    };
    saveLivoraState(payload);
    syncChannelRef.current?.broadcast(payload);
  };

  const handleClearAllData = () => {
    const confirmed = window.confirm(
      'Xóa toàn bộ công việc, giao dịch, hộp thư và cài đặt bảo mật? Thao tác này không thể hoàn tác.'
    );
    if (!confirmed) return false;
    setTasks([]);
    setTransactions([]);
    setBudget(DEFAULT_BUDGET);
    setInbox([]);
    setSecurity(createDefaultSecurity());
    setLocked(false);
    setSelectedDate(todayIso);
    showToast('Đã xóa sạch toàn bộ dữ liệu. Bạn có thể bắt đầu mới.');
    return true;
  };

  const openCreateTask = (prefill?: { title?: string; photo?: string }) => {
    setEditingTask(null);
    setTaskPrefill(prefill || {});
    setTaskSheetOpen(true);
  };

  const openCreateTx = (prefill?: { title?: string; amount?: number; photo?: string }) => {
    setEditingTx(null);
    setTxPrefill(prefill || {});
    setTxSheetOpen(true);
  };

  const openQuickCapture = (mode: CaptureSource) => {
    setCaptureMode(mode);
    setCaptureOpen(true);
  };

  const desktopNavItems: {
    id: AppTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: <LayoutGrid className="w-5 h-5" /> },
    { id: 'calendar', label: 'Lịch & Công việc', icon: <Calendar className="w-5 h-5" /> },
    { id: 'finance', label: 'Thu chi & Ngân sách', icon: <Wallet className="w-5 h-5" /> },
    {
      id: 'inbox',
      label: 'Hộp thư chờ',
      icon: <Inbox className="w-5 h-5" />,
      badge: inbox.length > 0 ? inbox.length : undefined,
    },
    { id: 'progress', label: 'Thống kê tiến độ', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  if (locked && security.pinHash) {
    return (
      <PinLockScreen
        expectedPinHash={security.pinHash}
        onUnlock={() => setLocked(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* Mobile Compact Top Header (<= 52px) */}
      <header className="lg:hidden sticky top-0 z-30 h-[52px] px-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
          LIVORA
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            aria-label={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => setSecurityOpen(true)}
            aria-label="Đồng bộ, sao lưu và bảo mật"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Responsive Container */}
      <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-[252px_1fr] lg:gap-6 lg:px-6 lg:py-6">
        {/* Desktop Left Navigation Sidebar */}
        <aside className="hidden lg:flex flex-col justify-between sticky top-6 h-[calc(100vh-3rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4">
          <div className="space-y-5">
            <div className="flex items-center justify-between px-2 pt-1">
              <div>
                <span className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 block">
                  LIVORA
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  Cuộc sống, đơn giản hơn.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                aria-label={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => openQuickCapture('text')}
              className="w-full min-h-[46px] px-4 rounded-2xl bg-slate-900 dark:bg-teal-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Ghi nhận nhanh</span>
            </button>

            <nav className="space-y-1" aria-label="Điều hướng chính">
              {desktopNavItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="inline-flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="font-mono-nums text-xs text-amber-700 dark:text-amber-400 font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Security & Category Summary */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="px-2 space-y-1.5">
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Việc đang mở theo nhóm
              </p>
              {Object.values(CATEGORIES).map((cat) => {
                const openCount = tasks.filter(
                  (t) => t.category === cat.id && !t.completed
                ).length;
                return (
                  <div key={cat.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300">{cat.label}</span>
                    <span className="font-mono-nums text-slate-500 dark:text-slate-400">
                      {openCount}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSecurityOpen(true)}
              className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-2 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Đồng bộ & Bảo mật</span>
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="px-4 pt-4 pb-24 lg:p-0 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              tasks={tasks}
              transactions={transactions}
              budget={budget}
              inbox={inbox}
              todayIso={todayIso}
              hideBalances={security.hideBalances}
              onNavigateTab={setActiveTab}
              onOpenQuickCapture={openQuickCapture}
              onOpenNewTask={() => {
                setSelectedDate(todayIso);
                openCreateTask();
              }}
              onOpenNewExpense={() => openCreateTx()}
              onToggleComplete={handleToggleComplete}
              onToggleSubtask={handleToggleSubtask}
              onEditTask={(t) => {
                setEditingTask(t);
                setTaskSheetOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onStartFocus={(t) => setFocusTask(t)}
              onAttachProofPhoto={handleAttachProofPhoto}
              onPreviewPhoto={(src, caption) => setLightbox({ src, caption })}
              onRescheduleOverdueToToday={handleRescheduleOverdueToToday}
            />
          )}

          {activeTab === 'calendar' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-7 space-y-4">
                <CalendarPanel
                  tasks={tasks}
                  selectedDate={selectedDate}
                  todayIso={todayIso}
                  viewMode={calendarMode}
                  onChangeViewMode={setCalendarMode}
                  onSelectDate={setSelectedDate}
                />

                {/* Inline Smart Quick-Add Bar */}
                <form
                  onSubmit={handleInlineQuickAdd}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 ml-2 shrink-0" />
                    <input
                      type="text"
                      value={quickInput}
                      onChange={(e) => setQuickInput(e.target.value)}
                      placeholder='Thêm nhanh: "Gặp khách 10:00 mai 45p !cao #cv"'
                      className="flex-1 min-h-[40px] bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none min-w-0"
                    />
                    <button
                      type="submit"
                      disabled={!quickInput.trim()}
                      className="min-h-[40px] px-4 rounded-xl bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold disabled:opacity-40 hover:bg-slate-800 dark:hover:bg-teal-500 transition-colors whitespace-nowrap shrink-0"
                    >
                      Thêm
                    </button>
                  </div>
                  {quickParsed && quickParsed.matchedTokens.length > 0 && (
                    <p className="text-[11px] text-teal-700 dark:text-teal-300 px-2 pb-0.5">
                      Nhận diện: {quickParsed.matchedTokens.join(' · ')}
                    </p>
                  )}
                </form>
              </div>

              <section
                aria-label="Công việc trong ngày đã chọn"
                className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {formatRelativeDayVi(selectedDate, todayIso)}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono-nums mt-0.5">
                      {selectedDayTasks.length > 0
                        ? `Hoàn thành ${selectedDayDone}/${selectedDayTasks.length} công việc`
                        : 'Chưa có công việc nào'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selectedDayTasks.length > 0 && (
                      <ProgressRing
                        value={selectedDayPercent}
                        size={42}
                        strokeWidth={4}
                        label={`${selectedDayPercent}%`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => openCreateTask()}
                      aria-label="Thêm công việc cho ngày này"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {selectedDayTasks.length === 0 ? (
                  <div className="py-8 text-center space-y-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Ngày {formatShortDateVi(selectedDate)} đang trống lịch.
                    </p>
                    <button
                      type="button"
                      onClick={() => openCreateTask()}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Lên lịch công việc</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDayTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        todayIso={todayIso}
                        onToggleComplete={handleToggleComplete}
                        onToggleSubtask={handleToggleSubtask}
                        onEdit={(t) => {
                          setEditingTask(t);
                          setTaskSheetOpen(true);
                        }}
                        onDelete={handleDeleteTask}
                        onStartFocus={(t) => setFocusTask(t)}
                        onAttachProofPhoto={handleAttachProofPhoto}
                        onPreviewPhoto={(src, caption) => setLightbox({ src, caption })}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="max-w-3xl mx-auto lg:mx-0">
              <FinanceView
                transactions={transactions}
                budget={budget}
                todayIso={todayIso}
                hideBalances={security.hideBalances}
                onToggleHideBalances={() =>
                  setSecurity((s) => ({ ...s, hideBalances: !s.hideBalances }))
                }
                onUpdateBudget={setBudget}
                onOpenNewTransaction={() => openCreateTx()}
                onEditTransaction={(tx) => {
                  setEditingTx(tx);
                  setTxSheetOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onAttachReceipt={handleAttachReceipt}
                onPreviewPhoto={(src, caption) => setLightbox({ src, caption })}
              />
            </div>
          )}

          {activeTab === 'inbox' && (
            <div className="max-w-3xl mx-auto lg:mx-0">
              <InboxView
                items={inbox}
                onOpenQuickCapture={openQuickCapture}
                onConvertToTask={(item) => {
                  setConvertingInboxId(item.id);
                  setSelectedDate(todayIso);
                  openCreateTask({ title: item.content, photo: item.photo });
                }}
                onConvertToExpense={(item) => {
                  setConvertingInboxId(item.id);
                  openCreateTx({
                    title: item.content,
                    amount: item.suggestedAmount || parseQuickAmountVnd(item.content),
                    photo: item.photo,
                  });
                }}
                onDeleteItem={(id) => {
                  const prevSnapshot = snapshotCurrentState();
                  setInbox((prev) => prev.filter((x) => x.id !== id));
                  showToast('Đã xóa mục khỏi hộp thư.', prevSnapshot);
                }}
                onPreviewPhoto={(src, caption) => setLightbox({ src, caption })}
              />
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="max-w-3xl mx-auto lg:mx-0">
              <ProgressView
                tasks={tasks}
                todayIso={todayIso}
                onClearAllData={handleClearAllData}
              />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (5 Ergonomic Thumb Destinations) */}
      <nav
        aria-label="Thanh điều hướng ứng dụng"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/92 dark:bg-slate-900/92 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-16 px-1">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'dashboard'
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
              Tổng quan
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'calendar'
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
              Lịch & Việc
            </span>
          </button>

          <button
            type="button"
            onClick={() => openQuickCapture('text')}
            aria-label="Ghi nhận nhanh"
            className="min-h-[48px] flex flex-col items-center justify-center rounded-xl text-slate-900 dark:text-white"
          >
            <span className="w-9 h-9 rounded-full bg-slate-900 dark:bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Plus className="w-5 h-5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'finance'
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
              Thu chi
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inbox')}
            className={`relative min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
              activeTab === 'inbox'
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="relative">
              <Inbox className="w-5 h-5" />
              {inbox.length > 0 && (
                <span className="absolute -top-1 -right-2 font-mono-nums text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {inbox.length}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
              Hộp thư
            </span>
          </button>
        </div>
      </nav>

      {/* Undoable Toast Feedback */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-40 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3">
          <p className="text-xs sm:text-sm leading-snug">{toast.message}</p>
          {toast.undoState && (
            <button
              type="button"
              onClick={() => {
                setTasks(toast.undoState!.tasks);
                setTransactions(toast.undoState!.transactions);
                setBudget(toast.undoState!.budget);
                setInbox(toast.undoState!.inbox);
                setToast(null);
              }}
              className="min-h-[36px] px-2.5 rounded-lg text-xs font-semibold text-teal-300 hover:bg-white/10 whitespace-nowrap shrink-0"
            >
              Hoàn tác
            </button>
          )}
        </div>
      )}

      {/* Task Create / Edit Bottom Sheet */}
      <QuickAddSheet
        isOpen={taskSheetOpen}
        editingTask={editingTask}
        defaultDate={selectedDate}
        defaultTitle={taskPrefill.title}
        defaultPhoto={taskPrefill.photo}
        todayIso={todayIso}
        allTasks={tasks}
        onClose={() => {
          setTaskSheetOpen(false);
          setEditingTask(null);
          setTaskPrefill({});
          setConvertingInboxId(null);
        }}
        onSave={handleSaveTask}
      />

      {/* Transaction Create / Edit Sheet */}
      <TransactionSheet
        isOpen={txSheetOpen}
        editingTx={editingTx}
        defaultTitle={txPrefill.title}
        defaultAmount={txPrefill.amount}
        defaultReceiptPhoto={txPrefill.photo}
        todayIso={todayIso}
        onClose={() => {
          setTxSheetOpen(false);
          setEditingTx(null);
          setTxPrefill({});
          setConvertingInboxId(null);
        }}
        onSave={handleSaveTransaction}
      />

      {/* Quick Capture Sheet (Text / Voice / Camera) */}
      <QuickCaptureSheet
        isOpen={captureOpen}
        initialMode={captureMode}
        onClose={() => setCaptureOpen(false)}
        onSaveToInbox={handleSaveToInbox}
        onConvertToTask={(prefill) => openCreateTask(prefill)}
        onConvertToExpense={(prefill) => openCreateTx(prefill)}
      />

      {/* Focus Timer Sheet */}
      <FocusTimerSheet
        task={focusTask}
        onClose={() => setFocusTask(null)}
        onLogMinutes={handleLogFocusMinutes}
      />

      {/* Security, Sync & Backup Sheet */}
      <SecurityBackupSheet
        isOpen={securityOpen}
        security={security}
        counts={{
          tasks: tasks.length,
          transactions: transactions.length,
          inbox: inbox.length,
        }}
        onClose={() => setSecurityOpen(false)}
        onUpdateSecurity={setSecurity}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        onSyncNow={handleSyncNow}
        onLockNow={() => setLocked(true)}
        onClearAllData={handleClearAllData}
      />

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        src={lightbox?.src || null}
        caption={lightbox?.caption}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
