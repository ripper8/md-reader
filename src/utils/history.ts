import { safeStorage } from './storage';

export interface HistoryItem {
  id: string;
  fileName: string;
  content: string;
  lastOpened: number;
  isPinned: boolean;
  sizeBytes: number;
}

const getHistoryKey = (username: string | null): string => {
  return `mdreader-history-${username ? username.toLowerCase().trim() : 'anonymous'}`;
};

export const getHistory = (username: string | null): HistoryItem[] => {
  try {
    const raw = safeStorage.getItem(getHistoryKey(username));
    if (!raw) return [];
    const items: HistoryItem[] = JSON.parse(raw);
    return items.sort((a, b) => b.lastOpened - a.lastOpened);
  } catch (e) {
    console.error('Failed to parse history', e);
    return [];
  }
};

export const saveToHistory = (
  fileName: string,
  content: string,
  username: string | null,
  isPinned: boolean = false
): HistoryItem[] => {
  const items = getHistory(username);
  const existingIndex = items.findIndex(item => item.fileName === fileName);
  
  const sizeBytes = new Blob([content]).size;
  const now = Date.now();
  
  if (existingIndex !== -1) {
    // Обновяваме съществуващия
    const existing = items[existingIndex];
    items[existingIndex] = {
      ...existing,
      content,
      lastOpened: now,
      sizeBytes,
    };
  } else {
    // Създаваме нов
    items.push({
      id: `doc-${now}-${Math.random().toString(36).substr(2, 9)}`,
      fileName,
      content,
      lastOpened: now,
      isPinned,
      sizeBytes
    });
  }
  
  const sorted = items.sort((a, b) => b.lastOpened - a.lastOpened);
  safeStorage.setItem(getHistoryKey(username), JSON.stringify(sorted));
  return sorted;
};

export const removeFromHistory = (id: string, username: string | null): HistoryItem[] => {
  const items = getHistory(username);
  const filtered = items.filter(item => item.id !== id);
  safeStorage.setItem(getHistoryKey(username), JSON.stringify(filtered));
  return filtered;
};

export const togglePinHistory = (id: string, username: string | null): HistoryItem[] => {
  const items = getHistory(username);
  const updated = items.map(item => {
    if (item.id === id) {
      return { ...item, isPinned: !item.isPinned };
    }
    return item;
  });
  safeStorage.setItem(getHistoryKey(username), JSON.stringify(updated));
  return updated.sort((a, b) => b.lastOpened - a.lastOpened);
};

export const mergeAnonymousHistory = (username: string): void => {
  const anon = getHistory(null);
  if (anon.length === 0) return;
  
  const userItems = getHistory(username);
  
  anon.forEach(anonItem => {
    const exists = userItems.some(userItem => userItem.fileName === anonItem.fileName);
    if (!exists) {
      userItems.push(anonItem);
    }
  });
  
  safeStorage.setItem(getHistoryKey(username), JSON.stringify(userItems.sort((a, b) => b.lastOpened - a.lastOpened)));
  safeStorage.removeItem(getHistoryKey(null)); // Изчистваме анонимната след сливане
};
