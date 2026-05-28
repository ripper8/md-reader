import type { ViewMode } from '../types'
import {
  FolderOpen, Save, FilePlus, Sun, Moon,
  BookMarked, PanelLeft, Rows, Columns, Download, Printer, PanelLeftOpen, LogOut
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
}: ToolbarProps) {
  return (
    <header className="toolbar" role="toolbar" aria-label="Main toolbar">
      <div className="toolbar-group">
        <button
          id="btn-toggle-sidebar"
          className={`btn btn-ghost btn-icon ${hasSidebar ? 'active' : ''}`}
          onClick={onToggleSidebar}
          data-tooltip="Toggle Sidebar"
          aria-label="Toggle Sidebar"
          aria-pressed={hasSidebar}
        >
          <PanelLeftOpen size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          id="btn-new-file"
          className="btn btn-ghost btn-icon"
          onClick={onNew}
          data-tooltip="New File"
          aria-label="New File"
        >
          <FilePlus size={18} />
        </button>
        <button
          id="btn-open-file"
          className="btn btn-ghost btn-icon"
          onClick={onOpen}
          data-tooltip="Open File (Ctrl+O)"
          aria-label="Open markdown file"
        >
          <FolderOpen size={18} />
        </button>
        <button
          id="btn-save-file"
          className="btn btn-ghost btn-icon"
          onClick={onSave}
          disabled={!isModified}
          data-tooltip="Save (Ctrl+S)"
          aria-label="Save file"
        >
          <Save size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* View Mode */}
      <div className="toolbar-group" role="group" aria-label="View mode">
        <button
          id="btn-view-editor"
          className={`btn btn-ghost btn-icon ${viewMode === 'editor' ? 'active' : ''}`}
          onClick={() => onViewMode('editor')}
          data-tooltip="Editor View"
          aria-label="Editor only view"
          aria-pressed={viewMode === 'editor'}
        >
          <PanelLeft size={18} />
        </button>
        <button
          id="btn-view-split"
          className={`btn btn-ghost btn-icon ${viewMode === 'split' ? 'active' : ''}`}
          onClick={() => onViewMode('split')}
          data-tooltip="Split View"
          aria-label="Split view"
          aria-pressed={viewMode === 'split'}
        >
          <Columns size={18} />
        </button>
        <button
          id="btn-view-preview"
          className={`btn btn-ghost btn-icon ${viewMode === 'preview' ? 'active' : ''}`}
          onClick={() => onViewMode('preview')}
          data-tooltip="Preview View"
          aria-label="Preview only view"
          aria-pressed={viewMode === 'preview'}
        >
          <Rows size={18} />
        </button>
      </div>
      
      <div className="toolbar-logo" aria-label="MDReader">
        <BookMarked size={20} />
        <span>MDReader</span>
      </div>

      <div className="toolbar-spacer" />

      {/* File name display */}
      {fileName && (
        <div className="toolbar-filename">
          <span>{fileName}</span>
          {isModified && (
            <span className="modified-dot" title="Unsaved changes" aria-label="Unsaved changes" />
          )}
        </div>
      )}

      <div className="toolbar-spacer" />

      {/* Export */}
      <div className="toolbar-group">
        <button
          id="btn-export-html"
          className="btn btn-ghost btn-icon"
          onClick={onExportHtml}
          data-tooltip="Export as HTML"
          aria-label="Export as HTML"
        >
          <Download size={18} />
        </button>
        <button
          id="btn-print"
          className="btn btn-ghost btn-icon"
          onClick={onPrint}
          data-tooltip="Print / Save PDF"
          aria-label="Print"
        >
          <Printer size={18} />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Theme */}
      <button
        id="btn-toggle-theme"
        className="btn btn-ghost btn-icon"
        onClick={onToggleTheme}
        data-tooltip={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {username && (
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
      )}
    </header>
  )
}
