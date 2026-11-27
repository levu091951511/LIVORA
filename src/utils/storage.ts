import { BudgetConfig, DebtEntry, Debtor, InboxItem, SecuritySettings, Transaction, Wallet } from '../types/life';
import { Task } from '../types/task';

const DB_NAME = 'livora_db_v1';
const STORE_NAME = 'kv_store';
const STATE_KEY = 'livora_state_v1';
const LEGACY_TASKS_KEY = 'nhip_tasks_v1';
const CHANNEL_NAME = 'livora_sync_channel_v1';

export interface PersistedLivoraState {
  tasks: Task[];
  transactions: Transaction[];
  budget: BudgetConfig;
  inbox: InboxItem[];
  security: SecuritySettings;
  wallets?: Wallet[];
  debtors?: Debtor[];
  debts?: DebtEntry[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadLivoraState(): Promise<Partial<PersistedLivoraState> | null> {
  try {
    const db = await openDatabase();
    const result = await new Promise<Partial<PersistedLivoraState> | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve((req.result as Partial<PersistedLivoraState>) || null);
      req.onerror = () => reject(req.error);
    });
    if (result) return result;
  } catch {
    // Fallback to localStorage below
  }

  try {
    const fallback = localStorage.getItem(STATE_KEY);
    if (fallback) return JSON.parse(fallback);
    const legacy = localStorage.getItem(LEGACY_TASKS_KEY);
    if (legacy) {
      const parsedTasks = JSON.parse(legacy);
      if (Array.isArray(parsedTasks)) {
        return { tasks: parsedTasks };
      }
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

export async function saveLivoraState(state: PersistedLivoraState): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(state, STATE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota exceeded in fallback
    }
  }
}

export function createSyncChannel(onRemoteUpdate: (state: PersistedLivoraState) => void) {
  if (typeof BroadcastChannel === 'undefined') {
    return {
      broadcast: (_state: PersistedLivoraState) => {},
      close: () => {},
    };
  }
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    if (event.data && event.data.type === 'SYNC_STATE' && event.data.payload) {
      onRemoteUpdate(event.data.payload as PersistedLivoraState);
    }
  };
  return {
    broadcast: (state: PersistedLivoraState) => {
      try {
        channel.postMessage({ type: 'SYNC_STATE', payload: state });
      } catch {
        // Ignore serialization issues
      }
    },
    close: () => channel.close(),
  };
}

export function encodePin(pin: string): string {
  return btoa(`livora-pin:${pin}`);
}
