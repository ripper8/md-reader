import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorState } from '@codemirror/state'
import { useState, useEffect, useCallback } from 'react'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

interface EditorProps {
  value: string
  onChange: (value: string) => void
  onScroll?: (ratio: number) => void
  isDark: boolean
  fileName: string | null
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

// Custom High-Contrast Highlight Style for LaTeX and Markdown (Light Theme - Overleaf-like)
const customHighlightStyle = HighlightStyle.define([
  // Comments (green, italic)
  { tag: t.comment, color: '#008800', fontStyle: 'italic' },
  
  // LaTeX control sequences / commands (like \documentclass, \usepackage) - beautiful deep blue
  { tag: t.macroName, color: '#0000ee', fontWeight: 'bold' },
  { tag: t.keyword, color: '#0000ee', fontWeight: 'bold' },
  { tag: t.function(t.variableName), color: '#0000ee' },
  
  // LaTeX/Markdown brackets, braces, delimiters - elegant dark slate
  { tag: t.brace, color: '#2b2b2b', fontWeight: 'bold' },
  { tag: t.bracket, color: '#2b2b2b', fontWeight: 'bold' },
  { tag: t.squareBracket, color: '#2b2b2b', fontWeight: 'bold' },
  { tag: t.punctuation, color: '#2b2b2b' },
  
  // Arguments/strings inside braces - dark black
  { tag: t.string, color: '#000000' },
  { tag: t.content, color: '#000000' },
  
  // Key-value options inside [ ] brackets (like letterpaper, 11pt) - beautiful red/brown
  { tag: t.propertyName, color: '#b91c1c' },
  { tag: t.modifier, color: '#b91c1c' },
  
  // Math blocks (inline/block) - gorgeous purple
  { tag: t.special(t.string), color: '#7c3aed', fontStyle: 'italic' },
  
  // Markdown elements
  { tag: t.heading1, color: '#0f172a', fontWeight: 'bold', fontSize: '1.4em' },
  { tag: t.heading2, color: '#0f172a', fontWeight: 'bold', fontSize: '1.2em' },
  { tag: t.heading3, color: '#1e293b', fontWeight: 'bold', fontSize: '1.1em' },
  { tag: t.strong, fontWeight: 'bold', color: '#0f172a' },
  { tag: t.emphasis, fontStyle: 'italic', color: '#334155' },
  { tag: t.link, color: '#10b981', textDecoration: 'underline' },
  { tag: t.url, color: '#10b981' },
])

// Custom High-Contrast Highlight Style for LaTeX and Markdown (Dark Theme)
const customDarkHighlightStyle = HighlightStyle.define([
  // Comments (mint green, italic)
  { tag: t.comment, color: '#10b981', fontStyle: 'italic' },
  
  // LaTeX control sequences / commands - vibrant sky blue / purple
  { tag: t.macroName, color: '#60a5fa', fontWeight: 'bold' },
  { tag: t.keyword, color: '#a78bfa', fontWeight: 'bold' },
  { tag: t.function(t.variableName), color: '#60a5fa' },
  
  // LaTeX/Markdown brackets, braces, delimiters - soft grey
  { tag: t.brace, color: '#9ca3af', fontWeight: 'bold' },
  { tag: t.bracket, color: '#9ca3af', fontWeight: 'bold' },
  { tag: t.squareBracket, color: '#9ca3af', fontWeight: 'bold' },
  { tag: t.punctuation, color: '#cbd5e1' },
  
  // Arguments/strings inside braces - bright white/light grey
  { tag: t.string, color: '#f3f4f6' },
  { tag: t.content, color: '#f3f4f6' },
  
  // Options/Properties inside square brackets [...] - bright orange/yellow
  { tag: t.propertyName, color: '#f97316' },
  { tag: t.modifier, color: '#f97316' },
  
  // Math blocks - gorgeous violet
  { tag: t.special(t.string), color: '#d8b4fe', fontStyle: 'italic' },
  
  // Markdown elements
  { tag: t.heading1, color: '#f9fafb', fontWeight: 'bold', fontSize: '1.4em' },
  { tag: t.heading2, color: '#f9fafb', fontWeight: 'bold', fontSize: '1.2em' },
  { tag: t.heading3, color: '#f3f4f6', fontWeight: 'bold', fontSize: '1.1em' },
  { tag: t.strong, fontWeight: 'bold', color: '#ffffff' },
  { tag: t.emphasis, fontStyle: 'italic', color: '#e5e7eb' },
  { tag: t.link, color: '#34d399', textDecoration: 'underline' },
  { tag: t.url, color: '#34d399' },
])

export default function Editor({ value, onChange, onScroll, isDark, fileName }: EditorProps) {
  const [langExtension, setLangExtension] = useState<any[]>([])

  useEffect(() => {
    const loadLanguage = async () => {
      if (fileName?.endsWith('.tex')) {
        const latexLang = languages.find(l => l.name === 'LaTeX')
        if (latexLang) {
          const support = await latexLang.load()
          setLangExtension([support])
          return
        }
      }
      // Fallback to Markdown
      setLangExtension([markdown({ base: markdownLanguage, codeLanguages: languages })])
    }
    loadLanguage()
  }, [fileName])

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
        ...langExtension,
        syntaxHighlighting(isDark ? customDarkHighlightStyle : customHighlightStyle),
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
