# Technical Specification: LaTeX and Math Rendering Support

This design document outlines the architecture, components, and implementation plan for adding full LaTeX (`.tex` files) and mathematical equations (KaTeX) rendering support to **MDReader**.

---

## 1. Goal Description

Currently, MDReader is a reader and editor for Markdown (`.md`, `.markdown`, `.mdx`) files. Users need the ability to read and write LaTeX documents (`.tex`), as well as render complex mathematical equations (using KaTeX syntax like `$...$` and `$$...$$`) inside both Markdown and LaTeX documents.

To preserve the extension's high performance and offline-first nature, this feature must run 100% locally without external CDN dependencies (complying with Chrome extension security policies).

---

## 2. Architecture & Parser Support

We will use the **KaTeX** library to render LaTeX math.

### Dependencies
- **katex** (v0.16.x or latest compatible)
- **@types/katex** (development dependency)

### CSS Styling
We import KaTeX CSS locally in `src/index.css` to ensure full offline support:
```css
@import "katex/dist/katex.min.css";
```

### Parser Extensions (`src/utils/markdown.ts`)
We will create a custom tokenizer and renderer extension for the `marked` library to handle math equations before standard markdown rules apply:
1. **`inlineMath`**:
   - Matches `$formula$` (where formula does not contain newlines or unescaped `$`).
   - Renders using `katex.renderToString(formula, { displayMode: false, throwOnError: false })`.
2. **`blockMath`**:
   - Matches `$$formula$$`.
   - Renders using `katex.renderToString(formula, { displayMode: true, throwOnError: false })`.

This ensures mathematical symbols (like `_`, `*`, `\`) inside equations are protected from being parsed as Markdown italics, bolding, or line breaks.

---

## 3. File System & File Types

We will expand file pickers and drag-and-drop actions to treat `.tex` files as first-class citizens alongside `.md` files.

### File Open and Save Pickers (`src/App.tsx`)
- **`handleOpen`**: Update file picker configuration to include LaTeX:
  ```typescript
  types: [
    { description: 'All Supported Reader Files', accept: { 'text/markdown': ['.md', '.markdown', '.mdx'], 'text/x-tex': ['.tex'] } },
    { description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.mdx'] } },
    { description: 'LaTeX', accept: { 'text/x-tex': ['.tex'] } }
  ]
  ```
- **`handleSaveAs`**: Suggest the appropriate extension (`.tex` or `.md`) based on the currently open file.
- **`handleDrop`**: Update drag-and-drop filters to accept `.tex` files.
- **Drag UI**: Update overlay messages to explicitly show `.tex` support.

### Chrome Extension Integration (`public/manifest.json` & `public/content.js`)
- Update `manifest.json` `content_scripts` to load the extension for files matching `file:///*/*.tex`, `http://*/*.tex`, and `https://*/*.tex`.

---

## 4. Editor Dynamic Syntax Highlighting (`src/components/Editor.tsx`)

CodeMirror has built-in LaTeX highlighting mode under the name `LaTeX` (alias `tex`, internally using the `stex` legacy mode) in `@codemirror/language-data`.
- We pass the `fileName` prop to the `Editor` component.
- In `Editor.tsx`, we use a React `useEffect` to check if `fileName` ends with `.tex`.
  - If so, we dynamically load and apply the `LaTeX` mode from `@codemirror/language-data`.
  - Otherwise, we fall back to the default `markdown` mode.

---

## 5. LaTeX-to-Markdown Translator (`src/utils/markdown.ts`)

To support a rich Preview pane and automatically leverage MDReader's existing Sidebar, Table of Contents, and scroll synchronization, we will translate `.tex` files into a Markdown representation before parsing them.

### Translation Rules:
1. **Preamble Stripping**: Remove everything before `\begin{document}` and after `\end{document}`.
2. **Boilerplate Cleanups**: Remove `\maketitle`, `\tableofcontents`, etc.
3. **Math Blocks**: Convert standard LaTeX math display blocks `\[ ... \]` to `$$ ... $$` and inline math `\( ... \)` to `$ ... $`.
4. **Sections**:
   - `\section{Title}` ➔ `# Title`
   - `\subsection{Title}` ➔ `## Title`
   - `\subsubsection{Title}` ➔ `### Title`
5. **Text Formatting**:
   - `\textbf{text}` ➔ `**text**`
   - `\textit{text}` or `\emph{text}` ➔ `*text*`
   - `\texttt{code}` ➔ `` `code` ``
6. **Links**:
   - `\href{url}{text}` ➔ `[text](url)`
   - `\url{url}` ➔ `[url](url)`
7. **Lists**:
   - Remove `\begin{itemize}`, `\end{itemize}`, `\begin{enumerate}`, `\end{enumerate}` environments.
   - Replace `\item` with `- ` bullet points.
8. **Environments**:
   - `\begin{quote}` ➔ `> `
   - `\begin{center}` ➔ `<div style="text-align: center;">`
   - `\begin{verbatim}` ➔ Markdown code block ` ``` `
9. **Comments**: Strip comments starting with unescaped `%`.

---

## 6. Verification Plan

### Automated/Unit Verification:
- Add a new set of tests for `translateLatexToMarkdown` and math parsing to verify:
  - Correct conversion of sections, list items, bolding, and links.
  - Proper parsing of simple and complex math formulas (subscripts, fractions, symbols) without Markdown interference.

### Manual UI Verification:
- Launch `npm run dev` and test:
  - Opening a standard `.tex` document with mathematical equations.
  - Verifying the Preview pane displays math formulas and document structure correctly.
  - Verifying the Sidebar (Table of Contents) dynamically populates with LaTeX sections.
  - Verifying scroll synchronization works smoothly.
  - Testing drag-and-drop of a `.tex` file.
  - Verifying dynamic syntax highlighting in the CodeMirror editor when switching between `.md` and `.tex` files.
