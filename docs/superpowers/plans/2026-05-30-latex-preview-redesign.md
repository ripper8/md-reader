# High-Contrast LaTeX Preview and CodeMirror Syntax Highlighting Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the LaTeX preview into an elegant PDF-style document viewer (Times New Roman typography, navy blue accent borders, flexbox two-column job alignment) and activate high-contrast Overleaf-style syntax highlighting in the CodeMirror editor.

**Architecture:** We will enhance our existing custom marked translators in `src/utils/markdown.ts` to output clean HTML tags (`<strong>`/`<em>`/`<li>`/flexbox rows) for perfect rendering. We will then dynamically apply a `.latex-document-theme` class to the preview wrapper in `src/components/Preview.tsx` and write a high-fidelity CSS print document layout in `src/index.css`. Finally, we will configure syntax ocoloring inside `src/components/Editor.tsx`.

**Tech Stack:** TypeScript, React, CodeMirror 6, marked, KaTeX, CSS.

---

### Task 1: Enable Editor High-Contrast LaTeX Syntax Highlighting

**Files:**
- Modify: `src/components/Editor.tsx`

- [ ] **Step 1: Apply syntaxHighlighting in Editor.tsx**

Open `src/components/Editor.tsx` and modify the `<CodeMirror>` component call around lines 176-187 to apply the custom light and dark high-contrast highlighting style definitions using the `syntaxHighlighting` extension.
Modify lines 180-185:
```typescript
      extensions={[
        ...langExtension,
        syntaxHighlighting(isDark ? customDarkHighlightStyle : customHighlightStyle),
        EditorState.tabSize.of(2),
        EditorView.lineWrapping,
        scrollListener(),
      ]}
```

- [ ] **Step 2: Verify build and lint**

Run: `npx eslint src/components/Editor.tsx`
Expected: Passes without errors or warnings.

Run: `npm run build`
Expected: Production bundles compile successfully.

- [ ] **Step 3: Commit**

Run:
```bash
git add src/components/Editor.tsx
git commit -m "feat: enable custom Overleaf-like light and dark syntax highlighting in CodeMirror editor"
```

---

### Task 2: Implement LaTeX Preprocessor Enhancements for Centering, Flex Rows, and Semantic HTML Lists

**Files:**
- Modify: `src/utils/markdown.ts`

- [ ] **Step 1: Rewrite translators in markdown.ts**

Open `src/utils/markdown.ts` and modify `translateLatexToMarkdown(tex: string): string` to:
1. Translate inline styling (`textbf`, `textb`, `textit`, `emph`, `texttt`) into HTML tags (`<strong>`, `<em>`, `<code>`) to ensure they compile correctly when nested inside block elements.
2. Implement `\centerline` and `\centering` translations to center headers cleanly.
3. Translate `resumeSubheading` and `resumeProjectHeading` to structured HTML flex columns.
4. Translate `resumeItem` to `<li>...</li>` list items, and list starts/ends to `<ul>` and `</ul>` tags.

Update lines 135-210 in `src/utils/markdown.ts` to use the following translations:
```typescript
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
```

Also add `\centerline` and `\centering` replacement logic around lines 198-202 (inside Step 12 Handle common environments replacement block):
```typescript
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
```

- [ ] **Step 2: Verify lint**

Run: `npx eslint src/utils/markdown.ts`
Expected: Clean with no linting errors.

---

### Task 3: Update and Run Unit Tests

**Files:**
- Modify: `src/utils/markdown.test.ts`

- [ ] **Step 1: Align unit tests with HTML tags**

Open `src/utils/markdown.test.ts` and modify the CV preprocessor assertions to verify the semantic HTML tag output instead of standard Markdown stars:
Modify lines 17-98:
```typescript
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
  \end{center}
  
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
  assert.match(result, /<div class="resume-subheading">/)
  assert.match(result, /<span class="resume-title">Senior Software Engineer<\/span>/)
  assert.match(result, /<span class="resume-company">UniCredit Bulbank<\/span>/)
  assert.match(result, /<li>Developed new features<\/li>/)
});
```

- [ ] **Step 2: Run the test suite**

Run: `npx tsx src/utils/markdown.test.ts`
Expected: All 5 tests pass successfully.

- [ ] **Step 3: Commit preprocessor and test updates**

Run:
```bash
git add src/utils/markdown.ts src/utils/markdown.test.ts
git commit -m "feat: enhance preprocessor to output robust semantic HTML for LaTeX CV layouts with aligned tests"
```

---

### Task 4: Add Dynamic LaTeX Document Class to Preview Pane

**Files:**
- Modify: `src/components/Preview.tsx`

- [ ] **Step 1: Dynamically compute and apply latex theme class in Preview.tsx**

Open `src/components/Preview.tsx`. In the `MarkdownContent` component, extract the `isTex` flag into a separate `useMemo` so it can be applied to the container `className`.
Modify lines 94-100:
```typescript
  const isTex = useMemo(() => {
    return fileName?.endsWith('.tex') || content.includes('\\documentclass') || content.includes('\\begin{document}')
  }, [content, fileName])

  return (
    <div
      ref={containerRef}
      className={`md-preview ${isTex ? 'latex-document-theme' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
```

- [ ] **Step 2: Verify build and lint**

Run: `npx eslint src/components/Preview.tsx`
Expected: Clean.

Run: `npm run build`
Expected: Compiles with no errors.

- [ ] **Step 3: Commit**

Run:
```bash
git add src/components/Preview.tsx
git commit -m "feat: dynamically apply latex-document-theme class in Preview pane"
```

---

### Task 5: Implement High-Fidelity PDF Floating Page CSS Styles

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add LaTeX PDF styling rules to index.css**

Open `src/index.css` and append the floating page, Times New Roman typography, accent navy rules, and two-column aligned subheadings CSS rules at the very bottom of the file (after line 1318):
```css
/* ==========================================================================
   LaTeX PDF-Style Resume Page Theme (.latex-document-theme)
   ========================================================================== */

.md-preview.latex-document-theme {
  max-width: 820px;
  margin: 20px auto;
  padding: 45px 55px;
  background: #ffffff !important;
  color: #000000 !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  font-family: 'Times New Roman', Times, 'TeX Gyre Termes', Georgia, serif !important;
  line-height: 1.45 !important;
  font-size: 14.2px !important;
  text-align: justify;
}

/* Float page centered inside canvas background wrapper */
.preview-pane-content:has(.latex-document-theme) {
  background: #f3f4f6 !important;
  display: flex !important;
  justify-content: center !important;
  padding: 15px 0 !important;
  overflow-y: auto !important;
}

/* For dark mode, canvas background is dark slate but floating page is always paper white */
.is-dark .preview-pane-content:has(.latex-document-theme) {
  background: #0f1115 !important;
}

/* Headings: Overleaf Uppercase Section Accent-Blue Borders */
.latex-document-theme h1,
.latex-document-theme h2,
.latex-document-theme h3 {
  font-family: 'Times New Roman', Times, 'TeX Gyre Termes', Georgia, serif !important;
  font-variant: small-caps;
  color: #1f3864 !important; /* Overleaf Dark Accent Blue */
  border-bottom: 1.5px solid #1f3864 !important;
  padding-bottom: 2px;
  margin-top: 18px !important;
  margin-bottom: 8px !important;
  font-size: 15.5px !important;
  font-weight: bold !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: transparent !important;
}

/* Centered Header block support */
.latex-document-theme .center-text {
  text-align: center !important;
  margin-bottom: 16px;
  width: 100%;
}
.latex-document-theme .center-text * {
  text-align: center !important;
}

.latex-document-theme .center-text strong {
  font-size: 24px !important;
  font-weight: bold;
  color: #1f3864 !important;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-family: 'Times New Roman', Times, 'TeX Gyre Termes', Georgia, serif !important;
}

/* Compact bullet lists */
.latex-document-theme ul {
  margin-top: 4px !important;
  margin-bottom: 6px !important;
  padding-left: 22px !important;
  list-style-type: disc !important;
}

.latex-document-theme li {
  margin-bottom: 4px !important;
  line-height: 1.4 !important;
  color: #000000 !important;
  list-style-type: disc !important;
  font-size: 13.5px !important;
  font-family: 'Times New Roman', Times, 'TeX Gyre Termes', Georgia, serif !important;
}

/* Flexbox Two-column Aligned Resume Subheading Block */
.latex-document-theme .resume-subheading {
  margin-bottom: 8px;
  margin-top: 10px;
  width: 100%;
}

.latex-document-theme .resume-row {
  display: flex !important;
  justify-content: space-between !important;
  align-items: baseline !important;
  line-height: 1.35 !important;
  width: 100%;
}

.latex-document-theme .resume-title {
  font-weight: bold;
  font-size: 14.2px;
  color: #000000 !important;
}

.latex-document-theme .resume-date {
  font-weight: bold;
  font-size: 13.5px;
  color: #000000 !important;
  text-align: right;
}

.latex-document-theme .resume-company {
  font-style: italic;
  font-size: 13.5px;
  color: #000000 !important;
}

.latex-document-theme .resume-location {
  font-style: italic;
  font-size: 13.5px;
  color: #000000 !important;
  text-align: right;
}

/* Force dark mode preview scrollbar colors to blend */
.is-dark .preview-pane-content:has(.latex-document-theme)::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}
.is-dark .preview-pane-content:has(.latex-document-theme)::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

- [ ] **Step 2: Verify compile build**

Run: `npm run build`
Expected: Compiles flawlessly with clean output in `/dist`.

- [ ] **Step 3: Commit**

Run:
```bash
git add src/index.css
git commit -m "feat: implement high-fidelity floating paper PDF page theme for LaTeX document preview"
```
