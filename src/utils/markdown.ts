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

  // 2. Aggressively remove preamble before \begin{document}
  const docBeginMatch = md.match(/\\begin\s*\{\s*document\s*\}/i);
  if (docBeginMatch && docBeginMatch.index !== undefined) {
    md = md.substring(docBeginMatch.index + docBeginMatch[0].length);
  }

  // 3. Globally remove preamble setup, package and document environment commands (fallbacks)
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
  md = md.replace(/\\titleformat\*?(\{[^}]*\})+(\[[^\]]*\])?/g, '');
  md = md.replace(/\\titlespacing\*?(\{[^}]*\})+/g, '');
  md = md.replace(/\\urlstyle\{[^}]*\}/g, '');
  md = md.replace(/\\raggedbottom\b/g, '');
  md = md.replace(/\\raggedright\b/g, '');

  // 4. Remove document environment markers globally (if still present)
  md = md.replace(/\\begin\{document\}/g, '');
  md = md.replace(/\\end\{document\}/g, '');

  // 5. Remove standard preamble commands
  md = md.replace(/\\maketitle/g, '');
  md = md.replace(/\\tableofcontents/g, '');

  // 6. Custom Resume/CV command translations
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

  // 7. Translate sections
  md = md.replace(/\\section\*?\{([^}]+)\}/g, '# $1');
  md = md.replace(/\\subsection\*?\{([^}]+)\}/g, '## $1');
  md = md.replace(/\\subsubsection\*?\{([^}]+)\}/g, '### $1');
  md = md.replace(/\\paragraph\*?\{([^}]+)\}/g, '#### $1');

  // 8. Translate text styles (including bold typo \textb with whitespace trimming)
  md = md.replace(/\\textb(?:f)?\{\s*([^}]+?)\s*\}/g, '**$1**');
  md = md.replace(/\\textit\{\s*([^}]+?)\s*\}/g, '*$1*');
  md = md.replace(/\\emph\{\s*([^}]+?)\s*\}/g, '*$1*');
  md = md.replace(/\\texttt\{\s*([^}]+?)\s*\}/g, '`$1`');

  // 9. Strip formatting sizing / scshape / vspace commands (and trailing spaces)
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

  // 10. Translate links
  md = md.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '[$2]($1)');
  md = md.replace(/\\url\{([^}]+)\}/g, '[$1]($1)');

  // 11. Translate Lists (using multiline anchors to clean leading spaces before list item bullets)
  md = md.replace(/\\begin\{(itemize|enumerate)\}/g, '');
  md = md.replace(/\\end\{(itemize|enumerate)\}/g, '');
  md = md.replace(/^[ \t]*\\item\s+/gm, '- ');

  // 12. Handle common environments
  md = md.replace(/\\begin\{quote\}/g, '> ');
  md = md.replace(/\\end\{quote\}/g, '');
  md = md.replace(/\\begin\{center\}/g, '<div style="text-align: center;">');
  md = md.replace(/\\end\{center\}/g, '</div>');
  md = md.replace(/\\begin\{verbatim\}/g, '```');
  md = md.replace(/\\end\{verbatim\}/g, '```');
  md = md.replace(/\\begin\{tabular\*?\}(?:\{[^}]*\})?/g, '');
  md = md.replace(/\\end\{tabular\*?\}/g, '');

  // 13. Convert LaTeX delimiters \[ ... \] and \( ... \) to $$ and $
  md = md.replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$1$$$$');
  md = md.replace(/\\\(([\s\S]+?)\\\)/g, '$$$1$$');

  // 14. Placeholders for literal backslashes to newlines and alignment character & to space
  md = md.replace(/\\\\/g, '___LINE_BREAK___');
  md = md.replace(/&/g, ' ');
  md = md.replace(/\\hfill\b/g, ' ');

  // 15. Normalize newlines: single newlines are treated as spaces in LaTeX (modeling LaTeX compiler newline behavior)
  const lines = md.split('\n');
  const processedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const trimmed = currentLine.trim();
    if (trimmed === '') {
      processedLines.push(currentLine);
      continue;
    }

    const isBlock = /^(?:#{1,6}\s+|-|\*|\d+\.|\s*-|\s*\*|>|```)/.test(trimmed);

    if (isBlock) {
      processedLines.push(currentLine);
    } else {
      const lastLineIndex = processedLines.length - 1;
      if (lastLineIndex >= 0 && 
          processedLines[lastLineIndex].trim() !== '' && 
          !processedLines[lastLineIndex].endsWith('___LINE_BREAK___') &&
          !/^(?:#{1,6}\s+|-|\*|\d+\.|\s*-|\s*\*|>|```)/.test(processedLines[lastLineIndex].trim())) {
        processedLines[lastLineIndex] = processedLines[lastLineIndex] + ' ' + trimmed;
      } else {
        processedLines.push(currentLine);
      }
    }
  }
  md = processedLines.join('\n');

  // Restore line breaks
  md = md.replace(/___LINE_BREAK___/g, '\n');

  // 16. Normalize leading whitespace to prevent indented code blocks (keeping code blocks intact)
  let inCodeBlock = false;
  md = md.split('\n').map(line => {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return line;
    }
    if (inCodeBlock) {
      return line;
    }
    const leadingSpaces = line.match(/^([ \t]*)/)?.[0] || '';
    if (leadingSpaces.length >= 4) {
      return '  ' + line.trimStart();
    }
    return line;
  }).join('\n');

  // 17. Clean up comments starting with unescaped %
  md = md.split('\n').map(line => line.replace(/(?<!\\)%.*/g, '')).join('\n');
  md = md.replace(/\\%/g, '%');

  return md;
}

function stripCommandDefinitions(text: string): string {
  let result = text;
  // Match both \newcommand{\macroName} and \newcommand\macroName (or renewcommand)
  const regex = /\\(?:new|renew)command\*?(?:\{[^{}]*\}|\\[a-zA-Z]+)/g;
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
