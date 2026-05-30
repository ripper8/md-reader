# Design Spec: High-Contrast LaTeX Preview and CodeMirror Syntax Highlighting Redesign

## Goal
Transform the LaTeX preview into a realistic, high-fidelity PDF-style document viewer, matching the elegant Times New Roman serif styling, dark-blue `#1F3864` uppercase sections with full-width horizontal lines, and two-column aligned job and project headings of the original Overleaf compiled CV. Concurrently, activate the custom Overleaf-like light/dark highlight styles inside the CodeMirror editor for `.tex` files.

## Proposed Changes

### 1. Editor Configuration
#### [MODIFY] [Editor.tsx](file:///Users/atanas/Documents/projects/MDReader/src/components/Editor.tsx)
- Update the `CodeMirror` component's `extensions` array to dynamically apply the defined highlight style using `@codemirror/language`'s `syntaxHighlighting` extension wrapper:
```typescript
extensions={[
  ...langExtension,
  syntaxHighlighting(isDark ? customDarkHighlightStyle : customHighlightStyle),
  EditorState.tabSize.of(2),
  EditorView.lineWrapping,
  scrollListener(),
]}
```

---

### 2. LaTeX-to-Markdown Preprocessor & CV Translators
#### [MODIFY] [markdown.ts](file:///Users/atanas/Documents/projects/MDReader/src/utils/markdown.ts)
- **Inline HTML Text Formatting**: Translate `\textbf`, `\textb`, `\textit`, `\emph`, and `\texttt` commands directly into their equivalent semantic HTML tags (`<strong>`, `<em>`, `<code>`) instead of Markdown stars/ticks. This ensures formatting is compiled properly by `marked` even when nested inside custom HTML block tags (such as flexbox rows).
- **Centering Support**: Add translations for `\centering` and `\centerline` commands.
  - Translate `\centerline{Text}` to `<div class="center-text">Text</div>`.
  - Translate `\centering` to a `<div class="center-text">` opening block, and scan/close the block right before the first section, list, or subheading list starts using string slicing.
- **Two-Column Aligned Headings**: Translate `\resumeSubheading` and `\resumeProjectHeading` into structured HTML flexbox rows:
```html
<div class="resume-subheading">
  <div class="resume-row">
    <span class="resume-title">Job/Project Title</span>
    <span class="resume-date">Date Range</span>
  </div>
  <div class="resume-row">
    <span class="resume-company">Company/Sub-Detail</span>
    <span class="resume-location">Location</span>
  </div>
</div>
```
- **Semantic Lists**: Translate `\resumeItemListStart` to `<ul>`, `\resumeItemListEnd` to `</ul>`, and `\resumeItem` to `<li>...</li>` directly. Translate `\resumeSubHeadingListStart` and `\resumeSubHeadingListEnd` to `<div class="resume-subheading-list">` and `</div>`.

---

### 3. Dynamic Page Viewer and Premium Aesthetics
#### [MODIFY] [Preview.tsx](file:///Users/atanas/Documents/projects/MDReader/src/components/Preview.tsx)
- In the `MarkdownContent` component, dynamically compute the `isTex` flag inside `useMemo` (which verifies `fileName?.endsWith('.tex')` or standard document preamble content).
- Pass this boolean to apply the specialized `.latex-document-theme` styling class to the outermost container:
```typescript
return (
  <div
    ref={containerRef}
    className={`md-preview ${isTex ? 'latex-document-theme' : ''}`}
    dangerouslySetInnerHTML={{ __html: html }}
  />
)
```

#### [MODIFY] [index.css](file:///Users/atanas/Documents/projects/MDReader/src/index.css)
- Implement a floating paper page theme inside the preview pane. Add the following rules under `.latex-document-theme`:
  - **Paper Page Layout**: White background (`#ffffff`), solid black text (`#000000`), max width of `800px`, centered in the canvas with elegant outer margins and box shadows.
  - **Serif Typography**: Set the primary font to Times New Roman, TeX Gyre Termes, Georgia, serif. Set font-size to `14px` and line-height to `1.45`.
  - **Overleaf Section Headings**: Format all `h1`, `h2`, and `h3` heading elements to match Overleaf's style: bold uppercase text, color `#1F3864` (deep accent navy blue), small-caps variant, and a solid thin border-bottom (`1.5px solid #1F3864`) that spans the entire page width.
  - **Resume Spacing and Bullet Lists**: Compact margins on lists and items. Bullet points rendered with list-style-type disc.
  - **Flexbox Grid Rows**: Add CSS rules for `.resume-subheading`, `.resume-row`, `.resume-title`, `.resume-date`, `.resume-company`, and `.resume-location` to align elements neatly on the left and right borders of the page using `justify-content: space-between`.

---

## Verification Plan

### Automated Tests
- Modify the test cases inside `src/utils/markdown.test.ts` to expect HTML tags (`<strong>` / `<em>`) instead of Markdown characters.
- Run `npx tsx src/utils/markdown.test.ts` to ensure all preprocessor unit tests pass without warnings.
- Run `npm run build` to confirm TypeScript compiles clean bundles.

### Manual Verification
- Open the application locally, drag and drop `Atanas_Dimitrov_CV.tex`, and verify:
  1. The Editor's text has beautiful, vibrant syntax highlighting exactly matching the Overleaf theme (blue commands, red bracket options, green italic comments).
  2. The Preview pane renders a gorgeous, floating white paper resume sheet, with the title centered, sections drawn with navy blue dividers, and job dates perfectly aligned on the right margin.
