import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import Toolbar from './components/Toolbar'
import type { ViewMode } from './types'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import Preview from './components/Preview'
import Dashboard from './components/Dashboard'
import { parseMarkdown, translateLatexToMarkdown } from './utils/markdown'
import {
  saveToHistory,
  removeFromHistory,
  togglePinHistory,
  migrateLegacyHistory
} from './utils/history'
import type { HistoryItem } from './utils/history'
import { safeStorage } from './utils/storage'
import { extractTextFromPdf } from './utils/pdf'
import './index.css'

const DEFAULT_CONTENT = `# Welcome to MDReader 👋

A fast, beautiful Markdown editor and reader built for local use.

## Features

- **Split-pane view** — live preview as you type
- **Drag & Drop** — just drop a \`.md\` file anywhere
- **Table of Contents** — navigate headings from the sidebar
- **Dark / Light theme** — switch anytime
- **Export to HTML** — one click export

## Getting Started

Use the **Open** button (or \`Ctrl+O\`) to open a Markdown file, or start typing right here.

You can also **drag and drop** any \`.md\` file from your computer into this window.

## Markdown Examples

### Code Blocks

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`
}
\`\`\`

### Tables

| Feature | Status |
|---|---|
| Editor | ✅ Done |
| Preview | ✅ Done |
`

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    const saved = safeStorage.getItem('md-theme')
    if (saved !== null) {
      return saved === 'dark'
    }
    return !window.matchMedia('(prefers-color-scheme: light)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    safeStorage.setItem('md-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return { isDark, toggle: () => setIsDark(d => !d) }
}

export default function App() {
  const { isDark, toggle: toggleTheme } = useTheme()
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    return migrateLegacyHistory()
  })

  const handleSelectHistoryFile = (fileContent: string, name: string) => {
    fileHandleRef.current = null
    setContent(fileContent)
    setFileName(name)
    setIsModified(false)
  }

  const handleDeleteHistoryFile = (id: string) => {
    const updated = removeFromHistory(id)
    setHistory(updated)
  }

  const handleTogglePinHistory = (id: string) => {
    const updated = togglePinHistory(id)
    setHistory(updated)
  }

  const [content, setContent] = useState(() => {
    console.log('Reading from safeStorage (content):', safeStorage.getItem('md-content')?.substring(0, 20) + '...');
    return safeStorage.getItem('md-content') ?? DEFAULT_CONTENT
  })
  const [fileName, setFileName] = useState<string | null>(() => {
    console.log('Reading from safeStorage (fileName):', safeStorage.getItem('md-filename'));
    return safeStorage.getItem('md-filename') ?? 'welcome.md'
  })
  const [isModified, setIsModified] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [hasSidebar, setHasSidebar] = useState(true)
  const [scrollRatio, setScrollRatio] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)
  const [activeHeading, setActiveHeading] = useState('')

  useEffect(() => {
    console.log('Writing to safeStorage (content):', content.substring(0, 20) + '...');
    console.log('Writing to safeStorage (fileName):', fileName);
    safeStorage.setItem('md-content', content)
    if (fileName) {
      safeStorage.setItem('md-filename', fileName)
    } else {
      safeStorage.removeItem('md-filename')
    }
  }, [content, fileName])

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

  const fileHandleRef = useRef<FileSystemFileHandle | null>(null)
  const resizerRef = useRef<HTMLDivElement>(null)
  const editorPaneRef = useRef<HTMLDivElement>(null)
  const previewPaneRef = useRef<HTMLDivElement>(null)
  const dragCounterRef = useRef(0)

  // Listen for Chrome Extension load messages and communicate readiness
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'LOAD_MARKDOWN') {
        setContent(event.data.content)
        setFileName(event.data.fileName)
        setIsModified(false)
      }
    }
    window.addEventListener('message', handleMessage)

    // Notify parent frame (Chrome Extension content script) that we are ready
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'MDREADER_READY' }, '*')
    }

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  const handleContentChange = useCallback((val: string) => {
    setContent(val)
    setIsModified(true)
  }, [])

  const handleOpen = useCallback(async () => {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          { 
            description: 'All Supported Reader Files', 
            accept: { 
              'text/markdown': ['.md', '.markdown', '.mdx'], 
              'text/x-tex': ['.tex'],
              'application/pdf': ['.pdf']
            } 
          },
          { description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.mdx'] } },
          { description: 'LaTeX', accept: { 'text/x-tex': ['.tex'] } },
          { description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }
        ],
        multiple: false,
      })
      const file: File = await handle.getFile()
      fileHandleRef.current = handle
      setFileName(file.name)
      
      if (file.name.endsWith('.pdf')) {
        setIsExtractingPdf(true)
        try {
          const buffer = await file.arrayBuffer()
          const text = await extractTextFromPdf(buffer)
          setContent(text)
          const updated = saveToHistory(file.name, text)
          setHistory(updated)
        } catch (err) {
          console.error("PDF text extraction failed:", err)
          alert("Неуспешно извличане на текст от PDF файл.")
        } finally {
          setIsExtractingPdf(false)
        }
      } else {
        const text = await file.text()
        setContent(text)
      }
      setIsModified(false)
    } catch { /* User cancelled */ }
  }, [])

  const handleSaveAs = useCallback(async () => {
    try {
      const isTex = fileName?.endsWith('.tex')
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName ?? (isTex ? 'document.tex' : 'document.md'),
        types: [
          isTex 
            ? { description: 'LaTeX', accept: { 'text/x-tex': ['.tex'] } }
            : { description: 'Markdown', accept: { 'text/markdown': ['.md'] } },
          { description: 'Markdown', accept: { 'text/markdown': ['.md'] } },
          { description: 'LaTeX', accept: { 'text/x-tex': ['.tex'] } }
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      fileHandleRef.current = handle
      const file: File = await handle.getFile()
      setFileName(file.name)
      setIsModified(false)
    } catch { /* User cancelled */ }
  }, [content, fileName])

  const handleSave = useCallback(async () => {
    if (!fileHandleRef.current) {
      await handleSaveAs()
      return
    }
    try {
      const writable = await (fileHandleRef.current as any).createWritable()
      await writable.write(content)
      await writable.close()
      setIsModified(false)
    } catch (e) {
      console.error('Save failed', e)
    }
  }, [content, handleSaveAs])

  const handleNew = useCallback(() => {
    fileHandleRef.current = null
    setContent('')
    setFileName('untitled.md')
    setIsModified(false)
  }, [])

  const handleExportHtml = useCallback(() => {
    const isTex = fileName?.endsWith('.tex') || content.includes('\\documentclass') || content.includes('\\begin{document}')
    const parsedContent = isTex ? translateLatexToMarkdown(content) : content
    const html = `<!DOCTYPE html>
<html lang="bg" style="color-scheme: ${isDark ? 'dark' : 'light'};">
<head>
<meta charset="UTF-8" />
<title>${fileName ?? 'document'}</title>
<style>
:root { --font-preview-body: 'Lora', serif; --font-preview-heading: 'Playfair Display', serif; }
body { font-family: var(--font-preview-body); max-width: 820px; margin: 40px auto; padding: 0 20px; line-height: 1.8; font-size: 16px; color: ${isDark ? '#f3f4f6' : '#1e293b'}; background-color: ${isDark ? '#12151a' : '#ffffff'}; }
h1,h2,h3,h4 { font-family: var(--font-preview-heading); }
pre { background: ${isDark ? '#1e293b' : '#f8fafc'}; border: 1px solid ${isDark ? '#374151' : '#e2e8f0'}; padding: 16px; border-radius: 8px; overflow-x: auto; }
code { font-family: 'IBM Plex Mono', monospace; }
table { border-collapse: collapse; width: 100%; }
th, td { border-bottom: 1px solid ${isDark ? '#374151' : '#e2e8f0'}; padding: 12px 16px; text-align: left; }
th { color: ${isDark ? '#f3f4f6' : '#1e293b'}; }
blockquote { border-left: 3px solid #4f46e5; margin: 0; padding: 8px 16px; background: ${isDark ? '#1e293b' : '#f1f5f9'}; }
.mermaid-diagram-container { display: flex; justify-content: center; margin: 1.5rem 0; padding: 1rem; background-color: ${isDark ? '#12151a' : '#ffffff'}; border: 1px solid ${isDark ? '#374151' : '#e2e8f0'}; border-radius: 8px; overflow-x: auto; }
</style>
</head>
<body>
${parseMarkdown(parsedContent)}

<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: false, theme: '${isDark ? 'dark' : 'default'}' });
  
  const containers = document.querySelectorAll('.mermaid-diagram-container');
  for (let i = 0; i < containers.length; i++) {
    const container = containers[i];
    const code = decodeURIComponent(container.getAttribute('data-code') || '').replace(/\\r/g, '');
    const id = 'mermaid-svg-' + i;
    try {
      const { svg } = await mermaid.render(id, code);
      container.innerHTML = svg;
    } catch (err) {
      container.innerHTML = '<pre style="color: red; padding: 10px; border: 1px solid red;">Грешка при рендиране на диаграмата: ' + err.message + '</pre>';
    }
  }
</script>
</body>
</html>`
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (fileName?.replace(/\.md$/, '') ?? 'document') + '.html'
    a.click()
    URL.revokeObjectURL(url)
  }, [content, fileName, isDark])

  const handlePrint = useCallback(() => window.print(), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && e.key === 's') { e.preventDefault(); handleSave() }
      if (e.ctrlKey && e.shiftKey && e.key === 'S') { e.preventDefault(); handleSaveAs() }
      if (e.ctrlKey && e.key === 'o') { e.preventDefault(); handleOpen() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave, handleSaveAs, handleOpen])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    if (Array.from(e.dataTransfer.items).some(i => i.kind === 'file')) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !file.name.match(/\.(md|markdown|mdx|tex|pdf)$/i)) return
    fileHandleRef.current = null
    setFileName(file.name)

    if (file.name.endsWith('.pdf')) {
      setIsExtractingPdf(true)
      try {
        const buffer = await file.arrayBuffer()
        const text = await extractTextFromPdf(buffer)
        setContent(text)
        const updated = saveToHistory(file.name, text)
        setHistory(updated)
      } catch (err) {
        console.error("PDF drag-drop extraction failed:", err)
        alert("Неуспешно извличане на текст от PDF.")
      } finally {
        setIsExtractingPdf(false)
      }
    } else {
      const text = await file.text()
      setContent(text)
    }
    setIsModified(false)
  }, [])

  useEffect(() => {
    const resizer = resizerRef.current
    if (!resizer) return

    let isDragging = false
    let startX = 0
    let startEditorWidth = 0

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true
      startX = e.clientX
      startEditorWidth = editorPaneRef.current?.offsetWidth ?? 0
      resizer.classList.add('dragging')
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const container = editorPaneRef.current?.parentElement
      if (!container) return
      const delta = e.clientX - startX
      const containerWidth = container.offsetWidth
      const newEditorWidth = Math.max(200, Math.min(containerWidth - 200, startEditorWidth + delta))
      const pct = (newEditorWidth / containerWidth) * 100
      editorPaneRef.current!.style.flex = `0 0 ${pct}%`
      previewPaneRef.current!.style.flex = `0 0 ${100 - pct}%`
    }

    const onMouseUp = () => {
      if (!isDragging) return
      isDragging = false
      resizer.classList.remove('dragging')
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    resizer.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      resizer.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  useEffect(() => {
    const container = previewPaneRef.current?.querySelector('.preview-pane-content')
    if (!container) return
    const headings = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6'))
    if (!headings.length) return
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) setActiveHeading(visible[0].target.id)
      },
      { root: container, rootMargin: '-10% 0px -80% 0px' }
    )
    headings.forEach(h => observer.observe(h))
    return () => observer.disconnect()
  }, [content, viewMode])

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
        onOpen={handleOpen}
        onSave={handleSave}
        onNew={handleNew}
        onToggleTheme={toggleTheme}
        onViewMode={setViewMode}
        onToggleSidebar={() => setHasSidebar(s => !s)}
        onExportHtml={handleExportHtml}
        onPrint={handlePrint}
      />
      <div className="app-body">
        {hasSidebar && !showDashboard && <Sidebar content={fileName?.endsWith('.tex') || content.includes('\\documentclass') || content.includes('\\begin{document}') ? translateLatexToMarkdown(content) : content} activeHeading={activeHeading} />}
        {showDashboard ? (
          <Dashboard
            history={history}
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
                <span className="pane-header-badge">Editor</span>
              </div>
              <div className="editor-pane-content">
                {isExtractingPdf ? (
                  <div className="pdf-loader-container">
                    <div className="pdf-loader-spinner"></div>
                    <div className="pdf-loader-text">Екстрахиране на текст от PDF страници...</div>
                    <div className="pdf-loader-subtext">Това може да отнеме няколко секунди за по-големи файлове.</div>
                  </div>
                ) : (
                  <Editor value={content} onChange={handleContentChange} onScroll={setScrollRatio} isDark={isDark} fileName={fileName} />
                )}
              </div>
            </div>
            <div className="split-resizer" ref={resizerRef} role="separator" />
            <div className="pane" ref={previewPaneRef}>
              <div className="pane-header">
                <span className="pane-header-badge">Preview</span>
              </div>
              <Preview content={content} scrollRatio={scrollRatio} isDark={isDark} viewMode={viewMode} fileName={fileName} />
            </div>
          </main>
        )}
      </div>
      <footer className="statusbar" role="status">
        <div className="statusbar-item">
          <FileText size={12} />
          {fileName ?? 'No file'}
          {isModified && ' (modified)'}
          {fileName?.endsWith('.pdf') && <span className="pdf-mode-badge" style={{ marginLeft: 8, background: 'var(--accent)', color: 'var(--text-on-accent)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>PDF Режим</span>}
        </div>
        <div className="statusbar-spacer" />
        <div className="statusbar-item">UTF-8</div>
        <div className="statusbar-item">{content.split('\n').length} Lines</div>
        <div className="statusbar-item">{isDark ? 'Dark Mode' : 'Light Mode'}</div>
      </footer>
      <div className={`drag-overlay ${isDragOver ? 'active' : ''}`}>
        <div className="drag-overlay-box">
          <Upload size={56} className="drag-overlay-icon" />
          <div className="drag-overlay-text">Drop your Markdown, LaTeX or PDF file</div>
          <div className="drag-overlay-subtext">Supports .md, .markdown, .mdx, .tex, and .pdf</div>
        </div>
      </div>
    </div>
  )
}
