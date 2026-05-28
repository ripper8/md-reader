import { Marked } from 'marked'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export const renderer = {
  heading({ text, depth }: { text: string; depth: number }) {
    const slug = slugify(text)
    return `<h${depth} id="${slug}">${text}</h${depth}>`
  },
  checkbox({ checked }: { checked: boolean }) {
    return `<input type="checkbox" ${checked ? 'checked' : ''} disabled />`
  },
  code({ text, lang }: { text: string; lang?: string }) {
    if (lang === 'mermaid') {
      const encodedCode = encodeURIComponent(text)
      return `<div class="mermaid-diagram-container" data-code="${encodedCode}"></div>`
    }
    const escapedText = escapeHtml(text)
    const languageClass = lang ? `class="language-${lang}"` : ''
    return `<pre><code ${languageClass}>${escapedText}</code></pre>`
  }
}

const markedInstance = new Marked({
  gfm: true,
  breaks: true,
})

markedInstance.use({ renderer })

export function parseMarkdown(content: string): string {
  return markedInstance.parse(content) as string
}
