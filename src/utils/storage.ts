// Memory fallback for environments where localStorage is blocked (e.g. Chrome Extension inside file:/// iframe)
const memoryStore: Record<string, string> = {};

let isStorageAvailable = false;
try {
  const testKey = '__storage_test__';
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
  isStorageAvailable = true;
} catch (e) {
  console.warn('localStorage is not available. Using in-memory fallback storage.', e);
  isStorageAvailable = false;
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (isStorageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.error(`Failed to get item "${key}" from localStorage`, e);
      }
    }
    return memoryStore[key] !== undefined ? memoryStore[key] : null;
  },

  setItem(key: string, value: string): void {
    if (isStorageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.error(`Failed to set item "${key}" in localStorage`, e);
      }
    }
    memoryStore[key] = String(value);
  },

  removeItem(key: string): void {
    if (isStorageAvailable) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        console.error(`Failed to remove item "${key}" from localStorage`, e);
      }
    }
    delete memoryStore[key];
  }
};
