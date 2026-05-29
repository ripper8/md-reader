# Design Spec: Remove Login Functionality and Unify Local History

This design document outlines the architecture and steps required to completely remove the Jellyfin-based login functionality and unify the document history into a single, local-only storage mechanism in MDReader.

## 1. Goals & Requirements

- **Local-Only Operation**: Remove all authentication interfaces, session states, and server-based login modals.
- **Unified Document History**: Store all document history in one local storage key (`mdreader-history`) without username partitions.
- **Automatic Migration**: Safely migrate legacy user histories (anonymous and user-specific) into the new unified list on startup, ensuring zero data loss for existing users.
- **Clean Codebase**: Completely remove obsolete files, components, styles, and dead code related to login and authentication.

## 2. Proposed Changes

### Component Details

---

#### 1. Document History Utility (`src/utils/history.ts`)

- **Change Type**: Modify
- **Key Modifications**:
  - Remove `username: string | null` from:
    - `getHistory()`
    - `saveToHistory()`
    - `removeFromHistory()`
    - `togglePinHistory()`
  - Remove `mergeAnonymousHistory()`.
  - Use `mdreader-history` as the single, universal history storage key.
  - Implement a new function `migrateLegacyHistory()` which:
    - Synchronously checks `localStorage`/`safeStorage` keys on application load.
    - Identifies any keys matching `mdreader-history-*` (e.g. `mdreader-history-anonymous` or user-specific ones like `mdreader-history-atanas`).
    - Merges their history item arrays, ensuring unique entries by comparing `fileName` (preferring the item with the most recent `lastOpened` timestamp).
    - Writes the merged and sorted results to the new `mdreader-history` key.
    - Safely deletes the legacy keys: `mdreader-history-*`, `jellyfin-token`, and `jellyfin-username`.
    - Returns the initial merged history array.

---

#### 2. Main Application (`src/App.tsx`)

- **Change Type**: Modify
- **Key Modifications**:
  - Remove state variables `jellyfinUser` and `isLoginOpen`.
  - Remove event handlers `handleLoginSuccess` and `handleLogout`.
  - Initialize the `history` state using the unified migration function:
    ```typescript
    const [history, setHistory] = useState<HistoryItem[]>(() => {
      return migrateLegacyHistory();
    });
    ```
  - Remove `jellyfinUser` dependency from the auto-save `useEffect` hook.
  - Simplify the properties passed to the `<Toolbar />` component (removing `username`, `onLogout`, `onOpenLogin`).
  - Remove the conditional rendering of the `<Login />` modal overlay.

---

#### 3. Navigation & Actions Toolbar (`src/components/Toolbar.tsx`)

- **Change Type**: Modify
- **Key Modifications**:
  - Remove `username`, `onLogout`, and `onOpenLogin` from `ToolbarProps` interface and destructuring.
  - Remove unused icon imports `LogIn` and `LogOut` from `lucide-react`.
  - Delete the entire profile/login block from the JSX layout (lines 183-217), keeping the layout terminated cleanly by the theme-toggle button.

---

#### 4. Dashboard View (`src/components/Dashboard.tsx`)

- **Change Type**: Modify
- **Key Modifications**:
  - Remove `username` from `DashboardProps` interface and destructuring.
  - Simplify header messages to be generic and warm:
    - Welcoming label: `"Локална библиотека"`
    - Title: `"Радваме се да Ви видим!"`
    - Subtitle: `"Вашата лична история на документите се съхранява сигурно във Вашия браузър."`

---

#### 5. Deletion of Login Component (`src/components/Login.tsx`)

- **Change Type**: Delete
- **Description**: Completely delete the `Login.tsx` file since all Jellyfin authentication views are no longer needed.

---

#### 6. Styles Cleanup (`src/index.css`)

- **Change Type**: Modify
- **Key Modifications**:
  - Remove all css styles defined under the comment `/* Login Page Styling (Jellyfin Integration) */` to the end of the file.

## 3. Verification Plan

### Manual Verification
1. Verify that the application builds successfully without type errors (`npm run build`).
2. Verify that `npm run lint` passes.
3. Simulate legacy localStorage entries (e.g. `mdreader-history-anonymous` and `mdreader-history-test`) in the browser, load the application, and verify that they are successfully migrated into a unified `mdreader-history` list.
4. Verify that legacy local storage keys are cleaned up.
5. Verify that the user interface correctly displays the generic Bulgarian greetings and lacks any login or logout buttons in the toolbar.
