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
