import { useState, useRef, useEffect } from 'react'
import type { ViewMode } from '../types'
import {
  FolderOpen, Save, FilePlus, Sun, Moon,
  BookMarked, PanelLeft, Rows, Columns, Download, Printer, PanelLeftOpen
} from 'lucide-react'

interface ToolbarProps {
  fileName: string | null
  isModified: boolean
  isDark: boolean
  viewMode: ViewMode
  hasSidebar: boolean
  onOpen: () => void
  onSave: () => void
  onNew: () => void
  onToggleTheme: () => void
  onViewMode: (mode: ViewMode) => void
  onToggleSidebar: () => void
  onExportHtml: () => void
  onPrint: () => void
}

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
  const [isExportOpen, setIsExportOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsExportOpen(false)
      }
    }
    if (isExportOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isExportOpen])

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

      {/* Unified Export Dropdown Menu */}
      <div className="toolbar-group dropdown-container" ref={dropdownRef}>
        <button
          id="btn-export-menu"
          className={`btn btn-ghost btn-icon ${isExportOpen ? 'active' : ''}`}
          onClick={() => setIsExportOpen(!isExportOpen)}
          data-tooltip="Export Document"
          aria-label="Export Document"
          aria-expanded={isExportOpen}
        >
          <Download size={18} />
        </button>

        {isExportOpen && (
          <div className="toolbar-dropdown-menu fade-in">
            <button
              className="dropdown-item"
              onClick={() => {
                onExportHtml()
                setIsExportOpen(false)
              }}
            >
              <Download size={15} />
              <span>HTML документ (.html)</span>
            </button>
            <button
              className="dropdown-item"
              onClick={() => {
                onPrint()
                setIsExportOpen(false)
              }}
            >
              <Printer size={15} />
              <span>PDF документ (.pdf)</span>
            </button>
          </div>
        )}
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
    </header>
  )
}
