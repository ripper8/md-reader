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

export function translateLatexToMarkdown(tex: string): string {
  let md = tex;

  // 1. Remove preamble: everything before \begin{document}
  const docBeginIndex = md.indexOf('\\begin{document}');
  if (docBeginIndex !== -1) {
    md = md.substring(docBeginIndex + '\\begin{document}'.length);
  }

  // 2. Remove document ending
  md = md.replace(/\\end\{document\}[\s\S]*/g, '');

  // 3. Remove standard preamble commands
  md = md.replace(/\\maketitle/g, '');
  md = md.replace(/\\tableofcontents/g, '');

  // 4. Translate sections
  md = md.replace(/\\section\*?\{([^}]+)\}/g, '# $1');
  md = md.replace(/\\subsection\*?\{([^}]+)\}/g, '## $1');
  md = md.replace(/\\subsubsection\*?\{([^}]+)\}/g, '### $1');
  md = md.replace(/\\paragraph\*?\{([^}]+)\}/g, '#### $1');

  // 5. Translate text styles
  md = md.replace(/\\textbf\{([^}]+)\}/g, '**$1**');
  md = md.replace(/\\textit\{([^}]+)\}/g, '*$1*');
  md = md.replace(/\\emph\{([^}]+)\}/g, '*$1*');
  md = md.replace(/\\texttt\{([^}]+)\}/g, '`$1`');

  // 6. Translate links
  md = md.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '[$2]($1)');
  md = md.replace(/\\url\{([^}]+)\}/g, '[$1]($1)');

  // 7. Translate Lists
  md = md.replace(/\\begin\{(itemize|enumerate)\}/g, '');
  md = md.replace(/\\end\{(itemize|enumerate)\}/g, '');
  md = md.replace(/\\item\s+/g, '- ');

  // 8. Handle common environments
  md = md.replace(/\\begin\{quote\}/g, '> ');
  md = md.replace(/\\end\{quote\}/g, '');
  md = md.replace(/\\begin\{center\}/g, '<div style="text-align: center;">');
  md = md.replace(/\\end\{center\}/g, '</div>');
  md = md.replace(/\\begin\{verbatim\}/g, '```');
  md = md.replace(/\\end\{verbatim\}/g, '```');

  // 9. Convert LaTeX delimiters \[ ... \] and \( ... \) to $$ and $
  md = md.replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$1$$$$');
  md = md.replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$');

  // 10. Clean up comments starting with unescaped %
  md = md.split('\n').map(line => line.replace(/(?<!\\)%.*/g, '')).join('\n');
  md = md.replace(/\\%/g, '%');

  return md;
}
