import assert from 'node:assert'
import test from 'node:test'
import { parseMarkdown, translateLatexToMarkdown } from './markdown.ts'

test('inline math equation renders correctly', () => {
  const result = parseMarkdown('Inline $a^2 + b^2 = c^2$ equation')
  assert.match(result, /class="katex"/)
  assert.match(result, /<annotation encoding="application\/x-tex">a\^2 \+ b\^2 = c\^2<\/annotation>/)
});

test('block math equation renders correctly', () => {
  const result = parseMarkdown('$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$')
  assert.match(result, /class="katex-block"/)
  assert.match(result, /\\sum_\{i=1\}/)
});

test('translates LaTeX sections, text styles, and lists', () => {
  const latex = `
  \\documentclass{article}
  \\begin{document}
  \\section{Introduction}
  This is \\textbf{bold} and \\textit{italic}.
  \\begin{itemize}
    \\item First item
    \\item Second item
  \\end{itemize}
  \\end{document}
  `
  const result = translateLatexToMarkdown(latex)
  assert.match(result, /# Introduction/)
  assert.match(result, /<strong>bold<\/strong>/)
  assert.match(result, /<em>italic<\/em>/)
  assert.match(result, /- First item/)
});

test('translates math delimiters', () => {
  const latex = `
  \\begin{document}
  Inline math: \\(x+y\\)
  Block math: \\[A=B\\]
  \\end{document}
  `
  const result = translateLatexToMarkdown(latex)
  assert.match(result, /Inline math: \$x\+y\$/)
  assert.match(result, /Block math: \$\$A=B\$\$/)
});

test('translates custom resume commands and strips preamble', () => {
  const latex = `
  \\documentclass[letterpaper,11pt]{article}
  \\usepackage[empty]{fullpage}
  \\urlstyle{same}
  \\raggedbottom
  \\raggedright
  \\titleformat{\\section}{\\raggedright}{}{0em}{}[\\titlerule ]
  \\renewcommand\\labelitemii{\\vcenter{\\hbox{\\bullet}}}
  \\newcommand{\\resumeItem}[1]{\\item\\small{#1}}
  
  \\begin{document}
  \\begin{center}
    \\textb{\\Huge \\scshape Atanas Dimitrov} \\\\
    test@test.com | \\\\
    +359 878 984 499
  \\end{center}
  
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Senior Software Engineer}{2024 -- Present}
      {UniCredit Bulbank}{Sofia, Bulgaria}
      \\resumeItemListStart
        \\resumeItem{Developed new features}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd
  \\end{document}
  `
  const result = translateLatexToMarkdown(latex)
  
  // Verify preamble stripped
  assert.doesNotMatch(result, /\\documentclass/)
  assert.doesNotMatch(result, /\\usepackage/)
  assert.doesNotMatch(result, /\\urlstyle/)
  assert.doesNotMatch(result, /\\raggedbottom/)
  assert.doesNotMatch(result, /\\titleformat/)
  assert.doesNotMatch(result, /\\renewcommand/)
  assert.doesNotMatch(result, /\\newcommand/)
  
  // Verify custom resume commands translated
  assert.match(result, /<strong>Atanas Dimitrov<\/strong>/)
  assert.match(result, /<div class="resume-subheading-list">/)
  assert.match(result, /<div class="resume-subheading">/)
  assert.match(result, /<span class="resume-title">Senior Software Engineer<\/span>/)
  assert.match(result, /<span class="resume-date">2024 -- Present<\/span>/)
  assert.match(result, /<span class="resume-company">UniCredit Bulbank<\/span>/)
  assert.match(result, /<span class="resume-location">Sofia, Bulgaria<\/span>/)
  assert.match(result, /<ul>\s*<li>Developed new features<\/li>\s*<\/ul>/)
  
  // Verify single newlines joined while \\ is preserved
  assert.match(result, /test@test\.com\s*\|\s*\n\s*\+359 878 984 499/)
});

