import React, { useEffect, useMemo, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { parseMarkdown, escapeHtml } from '../utils/markdown'

interface PreviewProps {
  content: string
  scrollRatio: number
  isDark: boolean
  viewMode: string
}

interface MarkdownContentProps {
  content: string
  isDark: boolean
  viewMode: string
  onDiagramClick: (svg: string) => void
}

// Separate memoized component for Markdown HTML and Mermaid rendering
const MarkdownContent = React.memo(({ content, isDark, viewMode, onDiagramClick }: MarkdownContentProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const html = useMemo(() => {
    try {
      return parseMarkdown(content)
    } catch {
      return '<p>Error rendering markdown.</p>'
    }
  }, [content])

  useEffect(() => {
    let isMounted = true

    const renderDiagrams = async () => {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
      })

      const containers = containerRef.current?.querySelectorAll('.mermaid-diagram-container')
      if (!containers || containers.length === 0) return

      for (let i = 0; i < containers.length; i++) {
        const container = containers[i] as HTMLDivElement
        // Clean all \r carriage returns to fix Windows CRLF / drag-and-drop parsing bugs
        const code = decodeURIComponent(container.getAttribute('data-code') || '').replace(/\r/g, '')
        const id = `mermaid-svg-${i}-${Date.now()}`

        try {
          const { svg } = await mermaid.render(id, code)
          if (isMounted) {
            container.innerHTML = svg
            // Attach click handler to open interactive modal
            container.onclick = () => {
              onDiagramClick(svg)
            }
          }
        } catch (err: unknown) {
          const error = err as Error
          console.error('Mermaid rendering failed:', error)

          const tempEl = document.getElementById(id)
          if (tempEl) tempEl.remove()
          const bindEl = document.getElementById(`d${id}`)
          if (bindEl) bindEl.remove()

          if (isMounted) {
            container.innerHTML = `
              <div class="mermaid-error-box">
                <div class="mermaid-error-title">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Синтактична грешка в диаграмата
                </div>
                <pre style="margin: 0; white-space: pre-wrap; font-family: inherit;">${escapeHtml(error.message || String(error))}</pre>
              </div>
            `
          }
        }
      }
    }

    renderDiagrams()

    return () => {
      isMounted = false
    }
  }, [html, isDark, viewMode, onDiagramClick])

  return (
    <div
      ref={containerRef}
      className="md-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
})

MarkdownContent.displayName = 'MarkdownContent'

export default function Preview({ content, scrollRatio, isDark, viewMode }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isProgrammaticScroll = useRef(false)

  // Interactive modal zoom & pan states
  const [modalState, setModalState] = useState({ isOpen: false, svgHtml: '' })
  const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    isProgrammaticScroll.current = true
    const maxScroll = el.scrollHeight - el.clientHeight
    el.scrollTop = scrollRatio * maxScroll
    const timer = setTimeout(() => { isProgrammaticScroll.current = false }, 100)
    return () => clearTimeout(timer)
  }, [scrollRatio])

  // Interactive Zoom & Pan event handlers
  const handleClose = () => {
    setModalState({ isOpen: false, svgHtml: '' })
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setZoomState(prev => ({
      ...prev,
      scale: Math.min(10, prev.scale * 1.25)
    }))
  }

  const handleZoomOut = () => {
    setZoomState(prev => ({
      ...prev,
      scale: Math.max(0.15, prev.scale / 1.25)
    }))
  }

  const handleReset = () => {
    setZoomState({ scale: 1, x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return // Left click only
    setIsDragging(true)
    setDragStart({
      x: e.clientX - zoomState.x,
      y: e.clientY - zoomState.y
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setZoomState(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }))
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const mouseX = e.clientX - rect.left - rect.width / 2
    const mouseY = e.clientY - rect.top - rect.height / 2

    const zoomFactor = 1.1
    const direction = e.deltaY < 0 ? 1 : -1

    setZoomState(prev => {
      let newScale = prev.scale * (direction > 0 ? zoomFactor : 1 / zoomFactor)
      newScale = Math.max(0.15, Math.min(10, newScale))

      const scaleChange = newScale / prev.scale
      const newX = mouseX - (mouseX - prev.x) * scaleChange
      const newY = mouseY - (mouseY - prev.y) * scaleChange

      return {
        scale: newScale,
        x: newX,
        y: newY
      }
    })
  }

  // Escape key handler to close the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    if (modalState.isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [modalState.isOpen])

  const handleDiagramClick = React.useCallback((svg: string) => {
    setModalState({ isOpen: true, svgHtml: svg })
    setZoomState({ scale: 1, x: 0, y: 0 })
  }, [])

  return (
    <>
      <div
        ref={containerRef}
        className="preview-pane-content fade-in"
        role="article"
        aria-label="Markdown preview"
      >
        <MarkdownContent
          content={content}
          isDark={isDark}
          viewMode={viewMode}
          onDiagramClick={handleDiagramClick}
        />
      </div>

      {modalState.isOpen && (
        <div className="mermaid-modal-overlay" onClick={handleClose}>
          {/* Glassmorphic floating action bar controls */}
          <div className="mermaid-modal-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="mermaid-modal-btn"
              onClick={handleZoomIn}
              title="Увеличаване (Zoom In)"
              aria-label="Zoom In"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <span className="mermaid-modal-zoom-badge">
              {Math.round(zoomState.scale * 100)}%
            </span>
            <button
              className="mermaid-modal-btn"
              onClick={handleZoomOut}
              title="Намаляване (Zoom Out)"
              aria-label="Zoom Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </button>
            <div className="mermaid-modal-divider"></div>
            <button
              className="mermaid-modal-btn"
              onClick={handleReset}
              title="Възстановяване (Reset Zoom)"
              aria-label="Reset Zoom"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            </button>
            <div className="mermaid-modal-divider"></div>
            <button
              className="mermaid-modal-btn"
              onClick={handleClose}
              title="Затваряне (Esc)"
              aria-label="Close Modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Draggable canvas */}
          <div
            className="mermaid-modal-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div
              className="mermaid-modal-content"
              style={{
                transform: `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform var(--transition-base)',
              }}
              dangerouslySetInnerHTML={{ __html: modalState.svgHtml }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  )
}


