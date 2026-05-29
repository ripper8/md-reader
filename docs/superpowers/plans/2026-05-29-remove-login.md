# Remove Login and Unify Storage History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Jellyfin-based login views and state, and unify user document history into a single, local-only browser storage with automatic backward-compatible migration.

**Architecture:** 
1. Re-architect the history utility (`history.ts`) to use a universal storage key `mdreader-history` and implement a synchronous initialization migration function `migrateLegacyHistory` that merges all legacy histories.
2. Cleanse the state of `App.tsx` and strip the layout of `<Login />` modal overlays.
3. Purge properties and conditional buttons from the navigation `<Toolbar />` and welcome views on `<Dashboard />`.
4. Delete the deprecated component file `Login.tsx` and all obsolete login style rules in `index.css`.

**Tech Stack:** TypeScript, React, Vite, LocalStorage API, Lucide-React.

---

### Task 1: Re-architect history utility and write migration logic

**Files:**
- Modify: `src/utils/history.ts`

- [ ] **Step 1: Write the updated implementation in `src/utils/history.ts`**
  Replace the contents of `src/utils/history.ts` to use a unified storage key `mdreader-history`, delete `mergeAnonymousHistory`, and add `migrateLegacyHistory` that searches for and merges all legacy `mdreader-history-*` histories.
  
  ```typescript
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
        id: `doc-${now}-${Math.random().toString(36).substr(2, 9)}`,
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
      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mdreader-history-')) {
          allKeys.push(key);
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
            const items: HistoryItem[] = JSON.parse(raw);
            for (const item of items) {
              const existing = mergedMap.get(item.fileName);
              if (!existing || item.lastOpened > existing.lastOpened) {
                mergedMap.set(item.fileName, item);
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
  ```

- [ ] **Step 2: Verify the compilation**
  Run: `npm run build`
  Expected: Builds or only shows typescript errors in `App.tsx` or `Dashboard.tsx` due to changed method signatures of history utility (which we will resolve in subsequent tasks).

- [ ] **Step 3: Commit history changes**
  Run:
  ```bash
  git add src/utils/history.ts
  git commit -m "refactor: simplify history utility and implement automatic legacy storage migration"
  ```

---

### Task 2: Simplify application core state and remove login overlays

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Refactor `src/App.tsx` state, effects, and JSX structure**
  Modify `src/App.tsx` to remove `jellyfinUser` and `isLoginOpen` state hooks, eliminate authentication handlers, initialize the `history` using the automatic migration function, update the history auto-save effect, remove the props from `Toolbar`, and delete the render of `<Login />`.
  
  Replace imports:
  ```typescript
  import {
    getHistory,
    saveToHistory,
    removeFromHistory,
    togglePinHistory,
    mergeAnonymousHistory
  } from './utils/history'
  ```
  with:
  ```typescript
  import {
    saveToHistory,
    removeFromHistory,
    togglePinHistory,
    migrateLegacyHistory
  } from './utils/history'
  ```
  Remove:
  ```typescript
  import Login from './components/Login'
  ```
  
  Update state hooks:
  ```typescript
  export default function App() {
    const { isDark, toggle: toggleTheme } = useTheme()
    const [history, setHistory] = useState<HistoryItem[]>(() => {
      return migrateLegacyHistory()
    })
  ```
  
  Delete:
  - `jellyfinUser` state hook.
  - `isLoginOpen` state hook.
  - `handleLoginSuccess` function.
  - `handleLogout` function.
  - `useEffect` for changing `history` list when `jellyfinUser` changes.
  
  Update auto-save `useEffect` hook:
  ```typescript
  // Debounced auto-save effect for edited documents (saves changes after 3s of inactivity)
  useEffect(() => {
    if (!isModified || !fileName || content.trim() === '') return

    const timer = setTimeout(() => {
      const updated = saveToHistory(fileName, content)
      setHistory(updated)
      setIsModified(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [content, fileName, isModified])
  ```
  
  Update file selection/manipulation handlers:
  ```typescript
  const handleDeleteHistoryFile = (id: string) => {
    const updated = removeFromHistory(id)
    setHistory(updated)
  }

  const handleTogglePinHistory = (id: string) => {
    const updated = togglePinHistory(id)
    setHistory(updated)
  }
  ```
  
  Update `<Toolbar>` component instantiation:
  ```typescript
  <Toolbar
    fileName={fileName}
    isModified={isModified}
    isDark={isDark}
    viewMode={viewMode}
    hasSidebar={hasSidebar}
    onOpen={handleOpen}
    onSave={handleSave}
    onSaveAs={handleSaveAs}
    onNew={handleNew}
    onToggleTheme={toggleTheme}
    onViewMode={setViewMode}
    onToggleSidebar={() => setHasSidebar(s => !s)}
    onExportHtml={handleExportHtml}
    onPrint={handlePrint}
  />
  ```
  
  Update `<Dashboard>` component instantiation:
  ```typescript
  <Dashboard
    history={history}
    onOpenFile={handleOpen}
    onNewFile={handleNew}
    onSelectFile={handleSelectHistoryFile}
    onDeleteFile={handleDeleteHistoryFile}
    onTogglePin={handleTogglePinHistory}
  />
  ```
  
  Remove bottom `<Login />` modal overlay render:
  ```typescript
  {/* Login Modal Overlay */}
  {isLoginOpen && (
    <Login
      onLoginSuccess={handleLoginSuccess}
      onClose={() => setIsLoginOpen(false)}
    />
  )}
  ```

- [ ] **Step 2: Commit App changes**
  Run:
  ```bash
  git add src/App.tsx
  git commit -m "feat: simplify App core state, remove auth handlers, and eliminate login overlays"
  ```

---

### Task 3: Simplify toolbar navigation layout

**Files:**
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: Clean and update `src/components/Toolbar.tsx`**
  Modify the `ToolbarProps` interface and destructured arguments to remove `username`, `onLogout`, and `onOpenLogin`. Remove obsolete lucide icon imports (`LogIn`, `LogOut`). Remove the conditional user profile / login action blocks at the bottom of the toolbar component JSX.
  
  Update imports:
  ```typescript
  import {
    FolderOpen, Save, FilePlus, Sun, Moon,
    BookMarked, PanelLeft, Rows, Columns, Download, Printer, PanelLeftOpen
  } from 'lucide-react'
  ```
  
  Update interface:
  ```typescript
  interface ToolbarProps {
    fileName: string | null
    isModified: boolean
    isDark: boolean
    viewMode: ViewMode
    hasSidebar: boolean
    onOpen: () => void
    onSave: () => void
    onSaveAs: () => void
    onNew: () => void
    onToggleTheme: () => void
    onViewMode: (mode: ViewMode) => void
    onToggleSidebar: () => void
    onExportHtml: () => void
    onPrint: () => void
  }
  ```
  
  Update component parameters:
  ```typescript
  export default function Toolbar({
    fileName,
    isModified,
    isDark,
    viewMode,
    hasSidebar,
    onOpen,
    onSave,
    onNew,
    onToggleTheme,
    onViewMode,
    onToggleSidebar,
    onExportHtml,
    onPrint,
  }: ToolbarProps) {
  ```
  
  Remove user profile / login buttons at the end of JSX (lines 183-217), making sure the JSX ends exactly with the theme-toggle button:
  ```typescript
        <button
          id="btn-toggle-theme"
          className="btn btn-ghost btn-icon"
          onClick={onToggleTheme}
          data-tooltip={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>
    )
  }
  ```

- [ ] **Step 2: Commit Toolbar changes**
  Run:
  ```bash
  git add src/components/Toolbar.tsx
  git commit -m "feat: simplify navigation toolbar and remove profile and login actions"
  ```

---

### Task 4: Simplify dashboard welcome texts and headers

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Simplify `src/components/Dashboard.tsx` welcome headers**
  Remove `username` from `DashboardProps` and simplify all conditional username labels and headings to use welcoming local-only text.
  
  Update interface:
  ```typescript
  interface DashboardProps {
    history: HistoryItem[]
    onOpenFile: () => void
    onNewFile: () => void
    onSelectFile: (content: string, fileName: string) => void
    onDeleteFile: (id: string) => void
    onTogglePin: (id: string) => void
  }
  ```
  
  Update component parameters:
  ```typescript
  export default function Dashboard({
    history,
    onOpenFile,
    onNewFile,
    onSelectFile,
    onDeleteFile,
    onTogglePin,
  }: DashboardProps) {
  ```
  
  Update welcome headers to utilize static local text:
  ```typescript
            <div className="dashboard-title-area">
              <span className="dashboard-welcome-label">
                Локална библиотека
              </span>
              <h1>
                Радваме се да Ви видим!
              </h1>
              <p className="dashboard-welcome-sub">
                Вашата лична история на документите се съхранява сигурно във Вашия браузър.
              </p>
            </div>
  ```

- [ ] **Step 2: Commit Dashboard changes**
  Run:
  ```bash
  git add src/components/Dashboard.tsx
  git commit -m "feat: customize dashboard welcoming texts for local-only storage"
  ```

---

### Task 5: Delete deprecated login component and purge stylesheet

**Files:**
- Delete: `src/components/Login.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Delete `src/components/Login.tsx`**
  Run: `rm src/components/Login.tsx` (or delete the file using filesystem commands)

- [ ] **Step 2: Delete login style rules in `src/index.css`**
  Remove all CSS styling located under the comment `/* Login Page Styling (Jellyfin Integration) */` down to the very end of the file.

- [ ] **Step 3: Run final linting and compilation verification**
  Run: `npm run lint`
  Expected: Passes with no typescript or linter warnings/errors.
  Run: `npm run build`
  Expected: Compilation passes perfectly and creates production builds in `dist/`.

- [ ] **Step 4: Commit deletion and styling purges**
  Run:
  ```bash
  git rm src/components/Login.tsx
  git add src/index.css
  git commit -m "cleanup: delete Login component and purge obsolete login styles from index.css"
  ```
