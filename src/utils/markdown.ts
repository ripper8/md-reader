import { Marked } from 'marked'
import katex from 'katex'

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

// Inline Math Extension $math$
const inlineMath = {
  name: 'inlineMath',
  level: 'inline' as const,
  start(src: string) { return src.indexOf('$'); },
  tokenizer(src: string) {
    const match = src.match(/^\$((?:[^$]|\\\\[$])+)\$/);
    if (match) {
      return {
        type: 'inlineMath',
        raw: match[0],
        text: match[1]
      };
    }
    return undefined;
  },
  renderer(token: any) {
    return katex.renderToString(token.text, { displayMode: false, throwOnError: false });
  }
};

// Block Math Extension $$math$$
const blockMath = {
  name: 'blockMath',
  level: 'block' as const,
  start(src: string) { return src.indexOf('$$'); },
  tokenizer(src: string) {
    const match = src.match(/^\$\$([\s\S]+?)\$\$/);
    if (match) {
      return {
        type: 'blockMath',
        raw: match[0],
        text: match[1].trim()
      };
    }
    return undefined;
  },
  renderer(token: any) {
    return `<div class="katex-block">${katex.renderToString(token.text, { displayMode: true, throwOnError: false })}</div>`;
  }
};

const markedInstance = new Marked({
  gfm: true,
  breaks: true,
})

markedInstance.use({ renderer, extensions: [blockMath, inlineMath] })

export function parseMarkdown(content: string): string {
  return markedInstance.parse(content) as string
}
