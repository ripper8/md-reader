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

  // 6. Custom Resume/CV command translations using brace-matching for nested safety
  md = replaceCommandWithBraceMatching(md, 'resumeSubheading', (p1, p2, p3, p4) => {
    return `<div class="resume-subheading">
  <div class="resume-row">
    <span class="resume-title">${p1.trim()}</span>
    <span class="resume-date">${p2.trim()}</span>
  </div>
  <div class="resume-row">
    <span class="resume-company">${p3.trim()}</span>
    <span class="resume-location">${p4.trim()}</span>
  </div>
</div>\n`;
  }, 4);

  md = replaceCommandWithBraceMatching(md, 'resumeProjectHeading', (p1, p2) => {
    return `<div class="resume-subheading">
  <div class="resume-row">
    <span class="resume-title">${p1.trim()}</span>
    <span class="resume-date">${p2.trim()}</span>
  </div>
</div>\n`;
  }, 2);

  md = replaceCommandWithBraceMatching(md, 'resumeItem', (desc) => {
    return `<li>${desc.trim()}</li>`;
  }, 1);

  // Strip resume list wrappers or translate them into HTML lists
  md = md.replace(/\\resumeSubHeadingListStart\b/g, '<div class="resume-subheading-list">');
  md = md.replace(/\\resumeSubHeadingListEnd\b/g, '</div>');
  md = md.replace(/\\resumeItemListStart\b/g, '<ul>');
  md = md.replace(/\\resumeItemListEnd\b/g, '</ul>');

  // 7. Translate sections using brace-matching
  md = replaceCommandWithBraceMatching(md, 'section', (title) => '# ' + title, 1);
  md = replaceCommandWithBraceMatching(md, 'subsection', (title) => '## ' + title, 1);
  md = replaceCommandWithBraceMatching(md, 'subsubsection', (title) => '### ' + title, 1);
  md = replaceCommandWithBraceMatching(md, 'paragraph', (title) => '#### ' + title, 1);

  // 8. Translate text styles using brace-matching (safe for nested styles)
  md = replaceCommandWithBraceMatching(md, 'textbf', (text) => '<strong>' + text.trim() + '</strong>', 1);
  md = replaceCommandWithBraceMatching(md, 'textb', (text) => '<strong>' + text.trim() + '</strong>', 1);
  md = replaceCommandWithBraceMatching(md, 'textit', (text) => '<em>' + text.trim() + '</em>', 1);
  md = replaceCommandWithBraceMatching(md, 'emph', (text) => '<em>' + text.trim() + '</em>', 1);
  md = replaceCommandWithBraceMatching(md, 'texttt', (text) => '<code>' + text.trim() + '</code>', 1);

  // 9. Strip formatting sizing / scshape / vspace commands (and trailing spaces)
  md = md.replace(/\\vspace\*?\{[^}]*\}/g, '');
  md = replaceCommandWithBraceMatching(md, 'small', (text) => text, 1);
  md = replaceCommandWithBraceMatching(md, 'Huge', (text) => text, 1);
  md = replaceCommandWithBraceMatching(md, 'large', (text) => text, 1);
  md = replaceCommandWithBraceMatching(md, 'tiny', (text) => text, 1);
  md = md.replace(/\\small\b\s*/g, '');
  md = md.replace(/\\Huge\b\s*/g, '');
  md = md.replace(/\\large\b\s*/g, '');
  md = md.replace(/\\tiny\b\s*/g, '');
  md = md.replace(/\\scshape\b\s*/g, '');
  md = md.replace(/\\bf\b\s*/g, '');
  md = md.replace(/\\it\b\s*/g, '');

  // 10. Translate links
  md = replaceCommandWithBraceMatching(md, 'href', (url, text) => `[${text.trim()}](${url.trim()})`, 2);
  md = replaceCommandWithBraceMatching(md, 'url', (url) => `[${url.trim()}](${url.trim()})`, 1);

  // 11. Translate Lists (using multiline anchors to clean leading spaces before list item bullets)
  md = md.replace(/\\begin\{(itemize|enumerate)\}/g, '');
  md = md.replace(/\\end\{(itemize|enumerate)\}/g, '');
  md = md.replace(/^[ \t]*\\item\s+/gm, '- ');

  // 12. Handle common environments (with standard blank lines around center divs to allow Markdown inside)
  md = md.replace(/\\begin\{quote\}/g, '> ');
  md = md.replace(/\\end\{quote\}/g, '');
  md = md.replace(/\\begin\{center\}/g, '<div class="center-text">\n\n');
  md = md.replace(/\\end\{center\}/g, '\n\n</div>');
  md = md.replace(/\\begin\{verbatim\}/g, '```');
  md = md.replace(/\\end\{verbatim\}/g, '```');
  md = md.replace(/\\begin\{tabular\*?\}(?:\{[^}]*\})?/g, '');
  md = md.replace(/\\end\{tabular\*?\}/g, '');

  // Handle \centerline{...}
  md = replaceCommandWithBraceMatching(md, 'centerline', (text) => `<div class="center-text">${text}</div>`, 1);

  // Handle \centering
  if (md.includes('\\centering')) {
    md = md.replace(/\\centering\s*/g, '<div class="center-text">\n\n');
    // We close the div before the first section or list or subheading list
    const firstStop = md.search(/\\section|\\resumeSubHeadingListStart|\\begin\{(itemize|enumerate)\}/);
    if (firstStop !== -1) {
      md = md.substring(0, firstStop) + '\n\n</div>\n\n' + md.substring(firstStop);
    } else {
      md = md + '\n\n</div>';
    }
  }

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

function replaceCommandWithBraceMatching(
  text: string,
  commandName: string,
  replacementFn: (...args: string[]) => string,
  numArgs: number = 1
): string {
  let result = text;
  const regex = new RegExp('\\\\' + commandName + '\\b', 'g');
  
  let match;
  while ((match = regex.exec(result)) !== null) {
    const commandStartIndex = match.index;
    let currentIndex = commandStartIndex + match[0].length;
    
    const args: string[] = [];
    let isMatchValid = true;
    
    for (let argIdx = 0; argIdx < numArgs; argIdx++) {
      while (currentIndex < result.length && /\s/.test(result[currentIndex])) {
        currentIndex++;
      }
      
      if (result[currentIndex] === '{') {
        const braceStartIndex = currentIndex;
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
        
        if (braceCount === 0) {
          const argContent = result.substring(braceStartIndex + 1, currentIndex - 1);
          args.push(argContent);
        } else {
          isMatchValid = false;
          break;
        }
      } else {
        isMatchValid = false;
        break;
      }
    }
    
    if (isMatchValid && args.length === numArgs) {
      const replacementText = replacementFn(...args);
      result = result.substring(0, commandStartIndex) + replacementText + result.substring(currentIndex);
      regex.lastIndex = 0;
    } else {
      regex.lastIndex = commandStartIndex + match[0].length;
    }
  }
  
  return result;
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
