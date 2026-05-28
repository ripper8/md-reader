import { useMemo, useState } from 'react'
import { ChevronsUpDown, ListTree, PanelTop } from 'lucide-react'

interface HeadingItem {
  level: number
  text: string
  id: string
  line?: number
}

interface SidebarProps {
  content: string
  activeHeading: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function parseHeadings(md: string): HeadingItem[] {
  const lines = md.split('\n')
  const items: HeadingItem[] = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)$/)
    if (m) {
      const text = m[2].replace(/\*\*|__|\*|_|~~|`/g, '').trim()
      items.push({ level: m[1].length, text, id: slugify(text), line: i })
    }
  }
  return items
}

function calcStats(content: string) {
  const text = content.replace(/```[\s\S]*?```/g, '').replace(/[#*_`~>\[\]]/g, '')
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
  const chars = content.length
  const readMin = Math.max(1, Math.ceil(words / 200))
  const lines = content === '' ? 0 : content.split('\n').length
  return { words, chars, readMin, lines }
}

export default function Sidebar({ content, activeHeading }: SidebarProps) {
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [statsOpen, setStatsOpen] = useState(true)

  const headings = useMemo(() => parseHeadings(content), [content])
  const stats = useMemo(() => calcStats(content), [content])

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const levelClass: Record<number, string> = {
    1: 'outline-h1',
    2: 'outline-h2',
    3: 'outline-h3',
    4: 'outline-h4',
    5: 'outline-h4',
    6: 'outline-h4',
  }

  return (
    <aside className="sidebar" aria-label="Sidebar navigation">
      <div className="sidebar-header">
        <span>Explorer</span>
      </div>
      <div className="sidebar-content">

        {/* Outline Section */}
        <div className="sidebar-section">
          <button
            className="sidebar-section-title"
            onClick={() => setOutlineOpen(o => !o)}
            aria-expanded={outlineOpen}
          >
            <ListTree size={14} />
            <span>Outline</span>
            <ChevronsUpDown size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </button>

          {outlineOpen && (
            <ul className="outline-list fade-in" role="navigation" aria-label="Document outline">
              {headings.length === 0 ? (
                <li style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                  No headings in document.
                </li>
              ) : (
                headings.map((h, i) => (
                  <li
                    key={`${h.id}-${i}`}
                    className={`outline-item ${levelClass[h.level] ?? ''} ${activeHeading === h.id ? 'active' : ''}`}
                    onClick={() => scrollToHeading(h.id)}
                    title={h.text}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && scrollToHeading(h.id)}
                  >
                    <span className="outline-item-text">{h.text}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Stats Section */}
        <div className="sidebar-section">
          <button
            className="sidebar-section-title"
            onClick={() => setStatsOpen(o => !o)}
            aria-expanded={statsOpen}
          >
            <PanelTop size={14} />
            <span>Statistics</span>
            <ChevronsUpDown size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </button>

          {statsOpen && (
            <div className="stats-grid fade-in" aria-label="Document statistics">
              <div className="stat-card">
                <div className="stat-value">{stats.words.toLocaleString()}</div>
                <div className="stat-label">Words</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.chars.toLocaleString()}</div>
                <div className="stat-label">Characters</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.lines.toLocaleString()}</div>
                <div className="stat-label">Lines</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.readMin} min</div>
                <div className="stat-label">Read</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </aside>
  )
}
