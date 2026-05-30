import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorState } from '@codemirror/state'
import { useCallback } from 'react'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onScroll?: (ratio: number) => void
  isDark: boolean
  fileName?: string | null
}

// Graphite & Mint Light Theme
const lightTheme = EditorView.theme({
  '&': {
    background: '#ffffff',
    color: '#0f172a',
  },
  '.cm-content': { caretColor: '#059669' },
  '.cm-cursor': { borderLeftColor: '#059669' },
  '.cm-gutters': {
    backgroundColor: '#ffffff',
    color: '#94a3b8',
    border: 'none',
    borderRight: '1px solid rgba(16, 185, 129, 0.1)',
  },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(16, 185, 129, 0.05)' },
  '.cm-activeLine': { backgroundColor: 'rgba(16, 185, 129, 0.03)' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(16, 185, 129, 0.15) !important' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(16, 185, 129, 0.2) !important' },
})

// Graphite & Mint Dark Theme
const darkTheme = EditorView.theme({
  '&': {
    background: '#12151a',
    color: '#f3f4f6',
  },
  '.cm-content': { caretColor: '#10b981' },
  '.cm-cursor': { borderLeftColor: '#10b981' },
  '.cm-gutters': {
    backgroundColor: '#12151a',
    color: '#6b7280',
    border: 'none',
    borderRight: '1px solid rgba(16, 185, 129, 0.1)'
  },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(16, 185, 129, 0.08)' },
  '.cm-activeLine': { backgroundColor: 'rgba(16, 185, 129, 0.05)' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(16, 185, 129, 0.2) !important' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(16, 185, 129, 0.25) !important' },
})

const editorStyle = EditorView.theme({
  '&': { height: '100%' },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    lineHeight: '1.7',
    padding: '16px 0',
  },
})

export default function Editor({ value, onChange, onScroll, isDark }: EditorProps) {
  const handleScroll = useCallback((event: Event) => {
    const el = event.target as HTMLElement
    if (!el) return
    const ratio = el.scrollTop / (el.scrollHeight - el.clientHeight)
    onScroll?.(isNaN(ratio) ? 0 : ratio)
  }, [onScroll])

  const scrollListener = useCallback(() => {
    return EditorView.domEventHandlers({
      scroll(event) {
        handleScroll(event)
      },
    })
  }, [handleScroll])

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={isDark ? [darkTheme, editorStyle] : [lightTheme, editorStyle]}
      extensions={[
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        EditorState.tabSize.of(2),
        EditorView.lineWrapping,
        scrollListener(),
      ]}
      onChange={onChange}
      style={{ height: '100%' }}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightSpecialChars: true,
        foldGutter: false,
        drawSelection: true,
        dropCursor: true,
        allowMultipleSelections: false,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        rectangularSelection: false,
        crosshairCursor: false,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        closeBracketsKeymap: true,
        defaultKeymap: true,
        searchKeymap: true,
        historyKeymap: true,
        foldKeymap: false,
        completionKeymap: false,
        lintKeymap: false,
      }}
    />
  )
}
