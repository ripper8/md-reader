import { safeStorage } from './storage';

export interface HistoryItem {
  id: string;
  fileName: string;
  content: string;
  lastOpened: number;
  isPinned: boolean;
  sizeBytes: number;
}

const HISTORY_KEY = 'mdreader-history';

export const getHistory = (): HistoryItem[] => {
  try {
    const raw = safeStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    return items.sort((a, b) => b.lastOpened - a.lastOpened);
  } catch (e) {
    console.error('Failed to parse history', e);
    return [];
  }
};

export const saveToHistory = (
  fileName: string,
  content: string,
  isPinned: boolean = false
): HistoryItem[] => {
  const items = getHistory();
  const existingIndex = items.findIndex(item => item.fileName === fileName);
  
  const sizeBytes = new Blob([content]).size;
  const now = Date.now();
  
  if (existingIndex !== -1) {
    const existing = items[existingIndex];
    items[existingIndex] = {
      ...existing,
      content,
      lastOpened: now,
      sizeBytes,
    };
  } else {
    items.push({
      id: `doc-${now}-${Math.random().toString(36).slice(2, 11)}`,
      fileName,
      content,
      lastOpened: now,
      isPinned,
      sizeBytes
    });
  }
  
  const sorted = items.sort((a, b) => b.lastOpened - a.lastOpened);
  safeStorage.setItem(HISTORY_KEY, JSON.stringify(sorted));
  return sorted;
};

export const removeFromHistory = (id: string): HistoryItem[] => {
  const items = getHistory();
  const filtered = items.filter(item => item.id !== id);
  safeStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  return filtered;
};

export const togglePinHistory = (id: string): HistoryItem[] => {
  const items = getHistory();
  const updated = items.map(item => {
    if (item.id === id) {
      return { ...item, isPinned: !item.isPinned };
    }
    return item;
  });
  safeStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated.sort((a, b) => b.lastOpened - a.lastOpened);
};

export const migrateLegacyHistory = (): HistoryItem[] => {
  const mergedMap = new Map<string, HistoryItem>();

  // 1. Process legacy entries in safeStorage (or localStorage)
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    const allKeys: string[] = [];
    
    if (storage) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith('mdreader-history-')) {
          allKeys.push(key);
        }
      }
    }

    // Sort keys to parse 'anonymous' first, then users so user records take preference
    allKeys.sort((a, b) => {
      if (a.includes('anonymous')) return -1;
      if (b.includes('anonymous')) return 1;
      return 0;
    });

    for (const key of allKeys) {
      try {
        const raw = safeStorage.getItem(key);
        if (raw) {
          const items = JSON.parse(raw);
          if (Array.isArray(items)) {
            for (const item of items) {
              const existing = mergedMap.get(item.fileName);
              if (!existing || item.lastOpened > existing.lastOpened) {
                mergedMap.set(item.fileName, item);
              }
            }
          }
        }
      } catch (e) {
        console.error(`Failed to parse legacy key ${key}`, e);
      }
    }

    // 2. Also load any existing unified history if any
    const existingUnified = getHistory();
    for (const item of existingUnified) {
      const existing = mergedMap.get(item.fileName);
      if (!existing || item.lastOpened > existing.lastOpened) {
        mergedMap.set(item.fileName, item);
      }
    }

    // 3. Write unified list back
    const sortedMerged = Array.from(mergedMap.values()).sort((a, b) => b.lastOpened - a.lastOpened);
    if (sortedMerged.length > 0) {
      safeStorage.setItem(HISTORY_KEY, JSON.stringify(sortedMerged));
    }

    // 4. Safely clean up old keys
    for (const key of allKeys) {
      safeStorage.removeItem(key);
    }
    safeStorage.removeItem('jellyfin-token');
    safeStorage.removeItem('jellyfin-username');

    return sortedMerged;
  } catch (e) {
    console.error('Migration failed, fallback to direct history load', e);
    return getHistory();
  }
};
