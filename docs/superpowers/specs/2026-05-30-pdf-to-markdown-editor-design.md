# PDF-to-Markdown Editor Design Specification

**Status:** APPROVED
**Date:** 2026-05-30
**Topic:** Semantic PDF Reading, Editing, and Export Support in MDReader

---

## 1. Feature Overview

MDReader is an offline-first Markdown and LaTeX document reader/editor. This feature adds the ability to open existing compiled PDF (`.pdf`) documents, extract their text content client-side using `pdfjs-dist`, and translate it into clean, editable Markdown inside the text editor. 

The user can edit the document's structure, text, and formatting using MDReader's premium markdown editor and live preview tools. When finished, they can export the result back to a pixel-perfect, vector-based PDF file or save the Markdown text source.

---

## 2. User Experience & Interface Redesign

### A. Opening PDF Files
- The user can select a `.pdf` file via the standard file picker (under the "Open" menu in Toolbar) or drag-and-drop a `.pdf` directly onto the application window.
- The drag-and-drop overlay is updated to reflect support for PDF: *"Supports .md, .markdown, .mdx, .tex, and .pdf"*.

### B. Skeleton Loader
- During PDF parsing (which can take a few seconds for large documents), the CodeMirror editor pane is replaced with a clean skeleton loader and status indicator reading: *"Extracting text from PDF pages..."*.

### C. Editor & Preview Mode
- The extracted text is loaded directly into the CodeMirror editor.
- The editor active language is set to **Markdown** to support live formatting.
- The active file name is updated to display the PDF filename (e.g. `document.pdf`).
- An info badge `[Mode: PDF Edit]` is displayed in the status bar or editor header to signal the active session.

---

## 3. Technical Architecture & Data Flow

### A. Library Dependencies
- **pdfjs-dist:** Mozilla's open-source library for rendering and parsing PDF documents client-side.
- To comply with strict Content Security Policy (CSP) rules for Chrome Extensions, we configure the library to run entirely offline without external script loading. The Vite bundler will pack the PDF.js Web Worker locally inside the `/dist` directory.

### B. Text Extraction Engine (`src/utils/pdf.ts`)
We create a dedicated helper utility to read and extract structured text from a PDF's binary representation:

```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Configured with local Vite-bundled worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let extractedText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Sort text items by vertical positioning (y-coordinate) then horizontal (x-coordinate)
    const items = textContent.items as any[];
    
    // Simple line reconstruction heuristics
    let pageText = `\n\n<!-- Page ${i} -->\n\n`;
    let lastY = -1;
    let line = '';

    for (const item of items) {
      const currentY = item.transform[5]; // Y-position on page canvas
      
      if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
        // Vertical offset indicates new line
        pageText += line.trim() + '\n';
        line = item.str + ' ';
      } else {
        line += item.str + ' ';
      }
      lastY = currentY;
    }
    pageText += line.trim() + '\n';
    
    // Apply basic markdown structure conversion (heuristics)
    // E.g., convert lines starting with bullet dots into list items
    pageText = pageText.split('\n').map(l => {
      const trimmed = l.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('▪') || trimmed.startsWith('-')) {
        return '- ' + trimmed.substring(1).trim();
      }
      return l;
    }).join('\n');

    extractedText += pageText;
  }

  return extractedText.trim();
}
```

---

## 4. Save and Export Options

### A. Saving Source
- Clicking "Save As" allows downloading the edited text as a standard `.md` or `.tex` document.

### B. Native Print-to-PDF Vector Export
- We introduce a dedicated **"Export to PDF"** action in the Toolbar and Sidebar.
- Clicking the action invokes the browser's native PDF compiler:
  ```typescript
  window.print();
  ```
- We define high-fidelity print styles in `src/index.css` using the `@media print` query:
  - Completely hides all UI toolbars, sidebars, editors, resize gutters, and buttons (`display: none !important`).
  - Sets the preview pane container to full-width, removes background colors, shadows, and margins, and sets standard letter/A4 padding.
  - Generates a vector-based, selectable PDF document with working links and perfect high-resolution KaTeX math formulas.

---

## 5. Verification Plan

### Automated Verification
- Write a unit test `src/utils/pdf.test.ts` mocking `pdfjs-dist` to verify structured line-joining and bullet list markdown conversion.
- Run `npm run build` to confirm the Vite bundler packs `pdf.worker.min.mjs` successfully inside `/dist`.

### Manual Verification
- Drag a `.pdf` file into the active editor interface.
- Confirm that the text content is extracted cleanly, formatted into Markdown lists/headings, and displayed in the CodeMirror editor.
- Edit the text, click "Export to PDF", and confirm the browser's print preview shows a beautifully styled, high-fidelity printable page with zero UI panels visible.
