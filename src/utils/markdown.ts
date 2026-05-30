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

  // 1. Strip out LaTeX command definitions and preamble metadata blocks robustly
  md = stripCommandDefinitions(md);

  // 2. Globally remove preamble setup and package commands
  md = md.replace(/\\documentclass(?:\[[^\]]*\])?\{[^}]*\}/g, '');
  md = md.replace(/\\usepackage(?:\[[^\]]*\])?\{[^}]*\}/g, '');
  md = md.replace(/\\input\{[^}]*\}/g, '');
  md = md.replace(/\\geometry\{[^}]*\}/g, '');
  md = md.replace(/\\pagestyle\{[^}]*\}/g, '');
  md = md.replace(/\\fancyhf\{\}/g, '');
  md = md.replace(/\\fancyfoot\{[^}]*\}/g, '');
  md = md.replace(/\\fancyhead\{[^}]*\}/g, '');
  md = md.replace(/\\fancyhf\b/g, '');
  md = md.replace(/\\fancyfoot\b/g, '');
  md = md.replace(/\\fancyhead\b/g, '');
  md = md.replace(/\\setlength\{[^}]*\}\{[^}]*\}/g, '');
  md = md.replace(/\\addtolength\{[^}]*\}\{[^}]*\}/g, '');
  md = md.replace(/\\pdfgentounicode\s*=\s*\d+/g, '');
  md = md.replace(/\\pdfgentounicode\b/g, '');
  md = md.replace(/\\titleformat\*?\{[^}]*\}\s*\{[^}]*\}\s*\{[^}]*\}\s*\{[^}]*\}\s*\{[^}]*\}(?:\[[^\]]*\])?/g, '');

  // 3. Remove document environment markers globally (instead of cutting)
  md = md.replace(/\\begin\{document\}/g, '');
  md = md.replace(/\\end\{document\}/g, '');

  // 4. Remove standard preamble commands
  md = md.replace(/\\maketitle/g, '');
  md = md.replace(/\\tableofcontents/g, '');

  // 5. Custom Resume/CV command translations
  // \resumeSubheading{title}{dates}{company}{location}
  md = md.replace(/\\resumeSubheading\s*\{([^{}]*)\}\s*\{([^{}]*)\}\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_match, p1, p2, p3, p4) => {
    let res = `- **${p1.trim()}**`;
    const details = [];
    if (p3.trim()) details.push(`*${p3.trim()}*`);
    if (p4.trim()) details.push(p4.trim());
    if (p2.trim()) details.push(p2.trim());
    if (details.length > 0) {
      res += `\n  ${details.join(' | ')}`;
    }
    return res;
  });

  // \resumeProjectHeading{project}{role}
  md = md.replace(/\\resumeProjectHeading\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_match, p1, p2) => {
    let res = `- **${p1.trim()}**`;
    if (p2.trim()) res += ` — *${p2.trim()}*`;
    return res;
  });

  // \resumeItem{description}
  md = md.replace(/\\resumeItem\s*\{([^{}]*)\}/g, '  - $1');

  // Strip resume list wrappers
  md = md.replace(/\\resumeSubHeadingListStart\b/g, '');
  md = md.replace(/\\resumeSubHeadingListEnd\b/g, '');
  md = md.replace(/\\resumeItemListStart\b/g, '');
  md = md.replace(/\\resumeItemListEnd\b/g, '');

  // 6. Translate sections
  md = md.replace(/\\section\*?\{([^}]+)\}/g, '# $1');
  md = md.replace(/\\subsection\*?\{([^}]+)\}/g, '## $1');
  md = md.replace(/\\subsubsection\*?\{([^}]+)\}/g, '### $1');
  md = md.replace(/\\paragraph\*?\{([^}]+)\}/g, '#### $1');

  // 7. Translate text styles (including bold typo \textb with whitespace trimming)
  md = md.replace(/\\textb(?:f)?\{\s*([^}]+?)\s*\}/g, '**$1**');
  md = md.replace(/\\textit\{\s*([^}]+?)\s*\}/g, '*$1*');
  md = md.replace(/\\emph\{\s*([^}]+?)\s*\}/g, '*$1*');
  md = md.replace(/\\texttt\{\s*([^}]+?)\s*\}/g, '`$1`');

  // 8. Strip formatting sizing / scshape / vspace commands (and trailing spaces)
  md = md.replace(/\\vspace\*?\{[^}]*\}/g, '');
  md = md.replace(/\\small\{\s*([^}]+?)\s*\}/g, '$1');
  md = md.replace(/\\Huge\{\s*([^}]+?)\s*\}/g, '$1');
  md = md.replace(/\\large\{\s*([^}]+?)\s*\}/g, '$1');
  md = md.replace(/\\tiny\{\s*([^}]+?)\s*\}/g, '$1');
  md = md.replace(/\\small\b\s*/g, '');
  md = md.replace(/\\Huge\b\s*/g, '');
  md = md.replace(/\\large\b\s*/g, '');
  md = md.replace(/\\tiny\b\s*/g, '');
  md = md.replace(/\\scshape\b\s*/g, '');
  md = md.replace(/\\bf\b\s*/g, '');
  md = md.replace(/\\it\b\s*/g, '');

  // 9. Translate links
  md = md.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '[$2]($1)');
  md = md.replace(/\\url\{([^}]+)\}/g, '[$1]($1)');

  // 10. Translate Lists
  md = md.replace(/\\begin\{(itemize|enumerate)\}/g, '');
  md = md.replace(/\\end\{(itemize|enumerate)\}/g, '');
  md = md.replace(/\\item\s+/g, '- ');

  // 11. Handle common environments
  md = md.replace(/\\begin\{quote\}/g, '> ');
  md = md.replace(/\\end\{quote\}/g, '');
  md = md.replace(/\\begin\{center\}/g, '<div style="text-align: center;">');
  md = md.replace(/\\end\{center\}/g, '</div>');
  md = md.replace(/\\begin\{verbatim\}/g, '```');
  md = md.replace(/\\end\{verbatim\}/g, '```');
  md = md.replace(/\\begin\{tabular\*?\}(?:\{[^}]*\})?/g, '');
  md = md.replace(/\\end\{tabular\*?\}/g, '');

  // 12. Convert LaTeX delimiters \[ ... \] and \( ... \) to $$ and $
  md = md.replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$1$$$$');
  md = md.replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$');

  // 13. Double backslashes to newlines and alignment character & to space
  md = md.replace(/\\\\/g, '\n');
  md = md.replace(/&/g, ' ');
  md = md.replace(/\\hfill\b/g, ' ');

  // 14. Clean up comments starting with unescaped %
  md = md.split('\n').map(line => line.replace(/(?<!\\)%.*/g, '')).join('\n');
  md = md.replace(/\\%/g, '%');

  return md;
}

function stripCommandDefinitions(text: string): string {
  let result = text;
  const regex = /\\(?:new|renew)command\*?\{[^{}]*\}/g;
  let match;
  while ((match = regex.exec(result)) !== null) {
    const startIndex = match.index;
    let currentIndex = startIndex + match[0].length;
    if (result[currentIndex] === '[') {
      while (currentIndex < result.length && result[currentIndex] !== ']') {
        currentIndex++;
      }
      if (result[currentIndex] === ']') {
        currentIndex++;
      }
    }
    while (currentIndex < result.length && /\s/.test(result[currentIndex])) {
      currentIndex++;
    }
    if (result[currentIndex] === '{') {
      let braceCount = 1;
      currentIndex++;
      while (currentIndex < result.length && braceCount > 0) {
        if (result[currentIndex] === '{' && result[currentIndex - 1] !== '\\') {
          braceCount++;
        } else if (result[currentIndex] === '}' && result[currentIndex - 1] !== '\\') {
          braceCount--;
        }
        currentIndex++;
      }
      result = result.substring(0, startIndex) + result.substring(currentIndex);
      regex.lastIndex = 0;
    } else {
      break;
    }
  }
  return result;
}
