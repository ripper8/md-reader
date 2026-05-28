# Свободен Достъп и Управление на Историята: План за Изпълнение

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дадем на потребителя свободен достъп до приложението с красив начален Дашборд, съхраняващ история на разглежданите документи (закачени и скорошни) локално в LocalStorage, персонализирана според сесията на Jellyfin.

**Architecture:** Декуплираме Jellyfin оторизацията от зареждането на App; добавяме логин под формата на модален прозорец; създаваме Utility мениджър за историята; добавяме нов премиум компонент `Dashboard` за бързи действия и управление на файлове; и интегрираме автоматично записване на чернови.

**Tech Stack:** React, TypeScript, Vite, Vanilla CSS, Lucide Icons, LocalStorage API.

---

## 📁 План на Файловата Структура

*   `src/utils/history.ts` [NEW] — Мениджър на историята на документите.
*   `src/components/Dashboard.tsx` [NEW] — Премиум Дашборд за скорошни файлове, търсене и действия.
*   `src/components/Login.tsx` [MODIFY] — Трансформиране на логването в модален прозорец.
*   `src/components/Toolbar.tsx` [MODIFY] — Интеграция на бутон за вход (за анонимни) и управление на прозореца.
*   `src/App.tsx` [MODIFY] — Сесийно управление на историята, автоматично черновиране и превключване на изгледите.
*   `src/index.css` [MODIFY] — Специфични премиум CSS стилове за Дашборд, модал и анимации.

---

### Task 1: Създаване на Utility за История (`src/utils/history.ts`)

**Files:**
- Create: `src/utils/history.ts`

- [ ] **Step 1: Създаване на файла и дефиниране на интерфейса и функциите**

Специфицирайте следния пълен код в `src/utils/history.ts`:
```typescript
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
    const raw = localStorage.getItem(getHistoryKey(username));
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
  localStorage.setItem(getHistoryKey(username), JSON.stringify(sorted));
  return sorted;
};

export const removeFromHistory = (id: string, username: string | null): HistoryItem[] => {
  const items = getHistory(username);
  const filtered = items.filter(item => item.id !== id);
  localStorage.setItem(getHistoryKey(username), JSON.stringify(filtered));
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
  localStorage.setItem(getHistoryKey(username), JSON.stringify(updated));
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
  
  localStorage.setItem(getHistoryKey(username), JSON.stringify(userItems.sort((a, b) => b.lastOpened - a.lastOpened)));
  localStorage.removeItem(getHistoryKey(null)); // Изчистваме анонимната след сливане
};
```

- [ ] **Step 2: Комплитиране на файла и проверка**
Проверете дали файлът е записан успешно и няма синтактични грешки.

---

### Task 2: Добавяне на Дашборд и Модал Стилизация (`src/index.css`)

**Files:**
- Modify: `src/index.css` (Добавяне на стилове в края на файла)

- [ ] **Step 1: Добавяне на специфични премиум стилове за Dashboard и Login Modal**

Добавете следните CSS правила в края на `src/index.css`:
```css
/* ===================================================
   Dashboard Premium Aesthetics
   =================================================== */
.dashboard-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px var(--space-6);
  background: var(--bg-base);
  overflow-y: auto;
  min-height: calc(100vh - var(--toolbar-height) - var(--statusbar-height));
}

.dashboard-card {
  width: 100%;
  max-width: 860px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  position: relative;
  transition: border-color var(--transition-base);
}

.dashboard-card:hover {
  border-color: rgba(16, 185, 129, 0.15);
}

.dashboard-header {
  padding: 32px 32px 24px 32px;
  border-bottom: 1px solid var(--border);
  background: radial-gradient(circle at 100% 0%, var(--accent-dim) 0%, transparent 60%);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.dashboard-welcome {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
}

.dashboard-title-area h1 {
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.5px;
  margin-top: 4px;
}

.dashboard-welcome-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.dashboard-welcome-sub {
  color: var(--text-secondary);
  font-size: 13.5px;
  margin-top: 4px;
}

.dashboard-quick-actions {
  display: flex;
  gap: var(--space-2);
}

.dashboard-search-row {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  margin-top: 8px;
}

.dashboard-search-wrapper {
  position: relative;
  flex: 1;
}

.dashboard-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.dashboard-search-input {
  width: 100%;
  padding: 10px 16px 10px 38px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: 13px;
  outline: none;
  transition: all var(--transition-fast);
}

.dashboard-search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.dashboard-body {
  padding: 24px 32px 32px 32px;
}

.dashboard-section {
  margin-bottom: 28px;
}

.dashboard-section:last-child {
  margin-bottom: 0;
}

.dashboard-section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dashboard-section-title.pinned {
  color: var(--accent);
}

.dashboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dashboard-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.dashboard-item:hover {
  border-color: rgba(16, 185, 129, 0.2);
  background: var(--bg-hover);
  transform: translateY(-0.5px);
}

.dashboard-item.pinned {
  background: rgba(16, 185, 129, 0.03);
  border-color: rgba(16, 185, 129, 0.12);
}

.dashboard-item.pinned:hover {
  background: rgba(16, 185, 129, 0.06);
  border-color: rgba(16, 185, 129, 0.25);
}

.dashboard-item-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dashboard-item-icon {
  color: var(--accent);
}

.dashboard-item-name {
  color: var(--text-primary);
  font-size: 13.5px;
  font-weight: 600;
}

.dashboard-item-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.dashboard-item-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.dashboard-action-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.dashboard-action-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

[data-theme='light'] .dashboard-action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.dashboard-action-btn.pinned {
  color: var(--accent);
}

.dashboard-action-btn.pinned:hover {
  color: var(--accent-hover);
}

.dashboard-action-btn.delete:hover {
  color: var(--error);
  background: rgba(239, 68, 68, 0.08);
}

.dashboard-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-panel);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  font-style: italic;
}

/* ===================================================
   Modal Dialog Premium Styles (Login Overlay)
   =================================================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(11, 13, 16, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease-out;
}

[data-theme='light'] .modal-overlay {
  background: rgba(244, 245, 246, 0.7);
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  z-index: 20;
}

.modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

[data-theme='light'] .modal-close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

### Task 3: Създаване на Дашборд Компонента (`src/components/Dashboard.tsx`)

**Files:**
- Create: `src/components/Dashboard.tsx`

- [ ] **Step 1: Реализиране на пълния код на `Dashboard.tsx`**

Специфицирайте следния пълен код в `src/components/Dashboard.tsx`:
```typescript
import React, { useState, useMemo } from 'react'
import { FileText, FolderOpen, FilePlus, Pin, Trash2, Search, Sparkles } from 'lucide-react'
import { HistoryItem } from '../utils/history'

interface DashboardProps {
  history: HistoryItem[]
  username: string | null
  onOpenFile: () => void
  onNewFile: () => void
  onSelectFile: (content: string, fileName: string) => void
  onDeleteFile: (id: string) => void
  onTogglePin: (id: string) => void
}

export default function Dashboard({
  history,
  username,
  onOpenFile,
  onNewFile,
  onSelectFile,
  onDeleteFile,
  onTogglePin,
}: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return 'точно сега'
    if (mins < 60) return `преди ${mins} мин.`
    if (hours < 24) return `преди ${hours} часа`
    if (days === 1) return 'вчера'
    return `преди ${days} дни`
  }

  const filteredHistory = useMemo(() => {
    return history.filter(item =>
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [history, searchQuery])

  const pinnedItems = useMemo(() => {
    return filteredHistory.filter(item => item.isPinned)
  }, [filteredHistory])

  const recentItems = useMemo(() => {
    return filteredHistory.filter(item => !item.isPinned)
  }, [filteredHistory])

  return (
    <div className="dashboard-container">
      <div className="dashboard-card fade-in">
        {/* Header Block */}
        <div className="dashboard-header">
          <div className="dashboard-welcome">
            <div className="dashboard-title-area">
              <span className="dashboard-welcome-label">
                {username ? 'Персонална библиотека' : 'Локална библиотека'}
              </span>
              <h1>
                Радваме се да Ви видим,{' '}
                <span style={{ color: 'var(--accent)' }}>
                  {username ?? 'гост'}
                </span>
                !
              </h1>
              <p className="dashboard-welcome-sub">
                {username
                  ? `Разглеждате Вашите документи, синхронизирани с профил ${username}.`
                  : 'Вашата лична история на документите се съхранява сигурно във Вашия браузър.'}
              </p>
            </div>

            <div className="dashboard-quick-actions">
              <button className="btn btn-primary" onClick={onNewFile}>
                <FilePlus size={16} />
                <span>Нов Файл</span>
              </button>
              <button
                className="btn btn-ghost"
                onClick={onOpenFile}
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <FolderOpen size={16} />
                <span>Отвори Файл</span>
              </button>
            </div>
          </div>

          {/* Search Row */}
          <div className="dashboard-search-row">
            <div className="dashboard-search-wrapper">
              <Search size={16} className="dashboard-search-icon" />
              <input
                type="text"
                className="dashboard-search-input"
                placeholder="Търсене в историята по име на файл..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Library Body */}
        <div className="dashboard-body">
          {history.length === 0 ? (
            <div className="dashboard-empty">
              <Sparkles size={24} style={{ color: 'var(--accent)', marginBottom: '8px' }} />
              <p>Нямате скорошни файлове в историята. Отворете файл или създайте нов, за да започнете!</p>
            </div>
          ) : (
            <>
              {/* Pinned Section */}
              {pinnedItems.length > 0 && (
                <div className="dashboard-section">
                  <h3 className="dashboard-section-title pinned">
                    <Pin size={12} style={{ transform: 'rotate(45deg)' }} />
                    <span>Закачени документи</span>
                  </h3>
                  <div className="dashboard-list">
                    {pinnedItems.map(item => (
                      <div
                        key={item.id}
                        className="dashboard-item pinned"
                        onClick={() => onSelectFile(item.content, item.fileName)}
                      >
                        <div className="dashboard-item-info">
                          <FileText size={18} className="dashboard-item-icon" />
                          <div>
                            <span className="dashboard-item-name">{item.fileName}</span>
                            <div className="dashboard-item-meta">
                              {formatSize(item.sizeBytes)} • отворен {formatRelativeTime(item.lastOpened)}
                            </div>
                          </div>
                        </div>
                        <div className="dashboard-item-actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="dashboard-action-btn pinned"
                            onClick={() => onTogglePin(item.id)}
                            title="Откачи отгоре"
                          >
                            <Pin size={14} style={{ transform: 'rotate(45deg)' }} />
                          </button>
                          <button
                            className="dashboard-action-btn delete"
                            onClick={() => onDeleteFile(item.id)}
                            title="Изтрий от историята"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Section */}
              <div className="dashboard-section">
                <h3 className="dashboard-section-title">
                  <span>Скорошно отваряни</span>
                </h3>
                {recentItems.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '12px', paddingLeft: '8px' }}>
                    {searchQuery ? 'Няма намерени документи с това име.' : 'Няма други скорошни документи.'}
                  </p>
                ) : (
                  <div className="dashboard-list">
                    {recentItems.map(item => (
                      <div
                        key={item.id}
                        className="dashboard-item"
                        onClick={() => onSelectFile(item.content, item.fileName)}
                      >
                        <div className="dashboard-item-info">
                          <FileText size={18} className="dashboard-item-icon" style={{ color: 'var(--text-secondary)' }} />
                          <div>
                            <span className="dashboard-item-name">{item.fileName}</span>
                            <div className="dashboard-item-meta">
                              {formatSize(item.sizeBytes)} • отворен {formatRelativeTime(item.lastOpened)}
                            </div>
                          </div>
                        </div>
                        <div className="dashboard-item-actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="dashboard-action-btn"
                            onClick={() => onTogglePin(item.id)}
                            title="Закачи най-отгоре"
                          >
                            <Pin size={14} />
                          </button>
                          <button
                            className="dashboard-action-btn delete"
                            onClick={() => onDeleteFile(item.id)}
                            title="Изтрий от историята"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### Task 4: Трансформиране на Login в Модален Прозорец (`src/components/Login.tsx`)

**Files:**
- Modify: `src/components/Login.tsx`

- [ ] **Step 1: Преструктуриране на компонента за вграждане в модал и добавяне на Close бутон**

Подменете съдържанието на `src/components/Login.tsx` изцяло с новия код, който поддържа `onClose` бутон за затваряне и работи като модален overlay:
```typescript
import React, { useState } from 'react'
import { User, Lock, LogIn, AlertCircle, Eye, EyeOff, ShieldCheck, Server, X } from 'lucide-react'

interface LoginProps {
  onLoginSuccess: (token: string, username: string) => void
  onClose: () => void
}

export default function Login({ onLoginSuccess, onClose }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Моля, въведете потребителско име и парола.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('https://movies.acyapps.com/Users/AuthenticateByName', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'MediaBrowser Client="MDReader", Device="WebBrowser", DeviceId="mdreader-web-client", Version="1.0.0"'
        },
        body: JSON.stringify({
          Username: username.trim(),
          Pw: password
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Невалидно потребителско име или парола.')
        } else {
          throw new Error('Грешка при свързване с Jellyfin сървъра.')
        }
      }

      const data = await response.json()
      if (data.AccessToken && data.User) {
        onLoginSuccess(data.AccessToken, data.User.Name)
        onClose()
      } else {
        throw new Error('Сървърът върна непълен отговор.')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Възникна неочаквана грешка при влизане.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-card fade-in" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose} title="Затвори">
          <X size={18} />
        </button>

        <div className="login-header">
          <div className="login-logo">
            <ShieldCheck size={32} className="login-logo-icon" />
          </div>
          <h1 className="login-title">Вход в MDReader</h1>
          <p className="login-subtitle">Оторизация чрез Jellyfin сървър</p>
        </div>

        <div className="login-server-badge">
          <Server size={12} />
          <span>movies.acyapps.com</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error-alert animate-shake">
              <AlertCircle size={16} className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <div className="login-input-group">
            <label htmlFor="username">Потребителско име</label>
            <div className="login-input-wrapper">
              <User size={16} className="login-field-icon" />
              <input
                type="text"
                id="username"
                placeholder="Въведете потребителско име..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="password">Парола</label>
            <div className="login-input-wrapper">
              <Lock size={16} className="login-field-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Въведете парола..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`btn-login-submit ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="login-spinner"></span>
            ) : (
              <>
                <LogIn size={16} />
                <span>Влизане</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Връзката е защитена чрез SSL криптиране директно към Вашия Jellyfin сървър.</p>
        </div>
      </div>
    </div>
  )
}
```

---

### Task 5: Обновяване на Toolbar с Логин Модал Спусък (`src/components/Toolbar.tsx`)

**Files:**
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 1: Обновяване на Props и добавяне на Бутон за Вход (Login) за Анонимни Потребители**

Заменете първите 38 реда на `src/components/Toolbar.tsx`, за да добавите `onOpenLogin: () => void` prop:
```typescript
import type { ViewMode } from '../types'
import {
  FolderOpen, Save, FilePlus, Sun, Moon,
  BookMarked, PanelLeft, Rows, Columns, Download, Printer, PanelLeftOpen, LogOut, LogIn
} from 'lucide-react'

interface ToolbarProps {
  fileName: string | null
  isModified: boolean
  isDark: boolean
  viewMode: ViewMode
  hasSidebar: boolean
  username: string | null
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onNew: () => void
  onToggleTheme: () => void
  onViewMode: (mode: ViewMode) => void
  onToggleSidebar: () => void
  onExportHtml: () => void
  onPrint: () => void
  onLogout: () => void
  onOpenLogin: () => void
}

export default function Toolbar({
  fileName,
  isModified,
  isDark,
  viewMode,
  hasSidebar,
  username,
  onOpen,
  onSave,
  onNew,
  onToggleTheme,
  onViewMode,
  onToggleSidebar,
  onExportHtml,
  onPrint,
  onLogout,
  onOpenLogin,
}: ToolbarProps) {
```

- [ ] **Step 2: Рендиране на Бутона за Вход за анонимни потребители**

Заменете края на return блока (около редовете след бутона за тема) за изобразяване на бутон "Вход" или "Потребителски профил":
```typescript
      {username ? (
        <>
          <div className="toolbar-divider" />
          <div className="toolbar-user-profile" title={`Влязохте като ${username} в movies.acyapps.com`}>
            <div className="toolbar-user-avatar">
              {username.charAt(0)}
            </div>
            <span className="toolbar-user-name">{username}</span>
            <button
              className="btn btn-ghost btn-icon"
              onClick={onLogout}
              style={{ padding: '2px', marginLeft: '4px' }}
              title="Изход"
              aria-label="Изход"
            >
              <LogOut size={14} />
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="toolbar-divider" />
          <button
            id="btn-login-trigger"
            className="btn btn-ghost"
            onClick={onOpenLogin}
            style={{ color: 'var(--accent)', borderColor: 'var(--accent-glow)' }}
            title="Вход с Jellyfin"
            aria-label="Вход с Jellyfin"
          >
            <LogIn size={16} />
            <span>Вход</span>
          </button>
        </>
      )}
    </header>
  )
}
```

---

### Task 6: Интеграция на Състоянията и Авто-Сейв в `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Обновяване на Импорти и Добавяне на Новите Състояния**

Вкарайте импорти на `Dashboard` и `history` функциите, и добавете `isLoginModalOpen` състояние:
```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Upload, BookMarked, FolderOpen } from 'lucide-react'
import Toolbar from './components/Toolbar'
import type { ViewMode } from './types'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import Preview from './components/Preview'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import { parseMarkdown } from './utils/markdown'
import {
  HistoryItem,
  getHistory,
  saveToHistory,
  removeFromHistory,
  togglePinHistory,
  mergeAnonymousHistory
} from './utils/history'
import './index.css'
```

- [ ] **Step 2: Управление на Локалната История в App компонента**

Добавете следния управляващ блок състояния под `jellyfinUser` инициализацията в `App()`:
```typescript
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    return getHistory(localStorage.getItem('jellyfin-username'))
  })
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  // Обновяване на историята при смяна на потребител
  useEffect(() => {
    setHistory(getHistory(jellyfinUser))
  }, [jellyfinUser])

  const handleLoginSuccess = (token: string, username: string) => {
    // Преди да влезем, сливаме анонимната история в потребителската
    mergeAnonymousHistory(username)
    
    localStorage.setItem('jellyfin-token', token)
    localStorage.setItem('jellyfin-username', username)
    setJellyfinToken(token)
    setJellyfinUser(username)
  }

  const handleLogout = () => {
    localStorage.removeItem('jellyfin-token')
    localStorage.removeItem('jellyfin-username')
    setJellyfinToken(null)
    setJellyfinUser(null)
  }

  // История методи
  const handleSelectHistoryFile = (fileContent: string, name: string) => {
    setContent(fileContent)
    setFileName(name)
    setIsModified(false)
  }

  const handleDeleteHistoryFile = (id: string) => {
    const updated = removeFromHistory(id, jellyfinUser)
    setHistory(updated)
  }

  const handleTogglePinHistory = (id: string) => {
    const updated = togglePinHistory(id, jellyfinUser)
    setHistory(updated)
  }
```

- [ ] **Step 3: Имплементация на Автоматичното Запазване на Чернови (Auto-Save)**

Вмъкнете следния ефект за автоматично запазване в `App`:
```typescript
  // Автоматично запазване на чернова при промени
  useEffect(() => {
    if (!isModified || !fileName || content.trim() === '') return

    const timer = setTimeout(() => {
      const updated = saveToHistory(fileName, content, jellyfinUser)
      setHistory(updated)
      setIsModified(false) // Изчистваме modified флага след авто-сейв
    }, 3000) // 3 секунди дебънс

    return () => clearTimeout(timer)
  }, [content, fileName, isModified, jellyfinUser])
```

- [ ] **Step 4: Рендиране на Дашборда и Взаимодействие с Модала за Вход**

Променете изобразяването на App, подменяйки условния рендер за липса на логин и toolbar props:
```typescript
  const viewClass = viewMode === 'editor' ? 'view-editor-only' : viewMode === 'preview' ? 'view-preview-only' : ''
  const showDashboard = content.trim() === '' && !fileName

  return (
    <div
      className="app"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Toolbar
        fileName={fileName}
        isModified={isModified}
        isDark={isDark}
        viewMode={viewMode}
        hasSidebar={hasSidebar}
        username={jellyfinUser}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onNew={handleNew}
        onToggleTheme={toggleTheme}
        onViewMode={setViewMode}
        onToggleSidebar={() => setHasSidebar(s => !s)}
        onExportHtml={handleExportHtml}
        onPrint={handlePrint}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginOpen(true)}
      />
      <div className="app-body">
        {hasSidebar && !showDashboard && <Sidebar content={content} activeHeading={activeHeading} />}
        {showDashboard ? (
          <Dashboard
            history={history}
            username={jellyfinUser}
            onOpenFile={handleOpen}
            onNewFile={handleNew}
            onSelectFile={handleSelectHistoryFile}
            onDeleteFile={handleDeleteHistoryFile}
            onTogglePin={handleTogglePinHistory}
          />
        ) : (
          <main className={`editor-area ${viewClass}`}>
            <div className="pane" ref={editorPaneRef}>
              <div className="pane-header">
                <span className="pane-header-badge">Редактор</span>
              </div>
              <div className="editor-pane-content">
                <Editor value={content} onChange={handleContentChange} onScroll={setScrollRatio} isDark={isDark} />
              </div>
            </div>
            <div className="split-resizer" ref={resizerRef} role="separator" />
            <div className="pane" ref={previewPaneRef}>
              <div className="pane-header">
                <span className="pane-header-badge">Преглед</span>
              </div>
              <Preview content={content} scrollRatio={scrollRatio} isDark={isDark} viewMode={viewMode} />
            </div>
          </main>
        )}
      </div>

      {/* Login Modal Overlay */}
      {isLoginOpen && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onClose={() => setIsLoginOpen(false)}
        />
      )}
```

---

## 🏁 Верификация на Плана

1.  **TypeScript & Build Проверка:**
    *   Изпълнете `npm run build` за проверка на компилацията.
2.  **Тест на Основни Сценарии:**
    *   Отваряне в Свободен режим (Anonymous) -> Показване на Dashboard.
    *   Редактиране и затваряне -> Авто-сейв и поява в секция "Скорошни".
    *   Закачане (Pin) -> Поява в секция "Закачени".
    *   Влизане с Jellyfin (Login) през Toolbar -> Успешно автентикиране и сливане на анонимната история.
