# Chrome Extension Branding and Quick Start Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Chrome Extension to feature high-quality custom branding icons and a clickable toolbar icon that launches the MDReader full editor in a new browser tab.

**Architecture:**
1. Generate a high-resolution branded document reader master icon using Image Generator and resize it natively into 16, 32, 48, and 128px PNG files using macOS `sips` inside the `public/icons/` folder.
2. Build `public/background.js` containing a Manifest V3 background service worker listening to extension toolbar actions.
3. Update `public/manifest.json` to register the new icons, action launcher, and service worker.

**Tech Stack:** Chrome Extension Manifest V3 API, macOS `sips` CLI, Image Generation.

---

### Task 1: Generate custom branding artwork and resize into four PNG sizes

**Files:**
- Create: `public/icons/` (Folder)
- Create: `public/icon-master.png` (High-res artwork generated)
- Create: `public/icons/icon-16.png`
- Create: `public/icons/icon-32.png`
- Create: `public/icons/icon-48.png`
- Create: `public/icons/icon-128.png`

- [ ] **Step 1: Generate high-resolution master artwork**
  Use the image generation tool to create a gorgeous master icon named `icon_master_logo` at `/Users/atanas/Documents/projects/MDReader/public/icon-master.png`.
  Prompt: `"A modern minimalist square app logo for a markdown reader, flat style, rich emerald green and deep indigo neon gradient, showing a clean styled page with structured document headings and a subtle pen outline, vector art style, isolated black background"`

- [ ] **Step 2: Create directory `public/icons/`**
  Run: `mkdir -p public/icons`
  Expected: Folder created successfully.

- [ ] **Step 3: Crop and resize the master image into required extension sizes**
  Use the built-in macOS `sips` command to resize the generated master icon:
  Run:
  ```bash
  sips -z 16 16 public/icon-master.png --out public/icons/icon-16.png && \
  sips -z 32 32 public/icon-master.png --out public/icons/icon-32.png && \
  sips -z 48 48 public/icon-master.png --out public/icons/icon-48.png && \
  sips -z 128 128 public/icon-master.png --out public/icons/icon-128.png
  ```
  Expected: Four perfectly cropped PNG files are populated inside `public/icons/`.

- [ ] **Step 4: Verify files exist and clean up master logo**
  Run: `ls -la public/icons`
  Expected: Lists four files from 16 to 128.
  Run: `rm public/icon-master.png` (Keep the workspace tidy).

- [ ] **Step 5: Commit icon assets**
  Run:
  ```bash
  git add public/icons/
  git commit -m "design: add premium emerald/indigo branded icons in standard sizes"
  ```

---

### Task 2: Create background service worker launcher

**Files:**
- Create: `public/background.js`

- [ ] **Step 1: Write `public/background.js`**
  Create a new file `public/background.js` and add a MV3 Chrome Action listener to open the editor page in a new browser tab:
  
  ```javascript
  // Listen for toolbar button clicks on the MDReader extension icon
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  });
  ```

- [ ] **Step 2: Commit service worker**
  Run:
  ```bash
  git add public/background.js
  git commit -m "feat: add extension service worker launcher to open editor in new tabs"
  ```

---

### Task 3: Update extension manifest registry

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Update `public/manifest.json` with icons and workers**
  Modify `public/manifest.json` to register the new service worker under `"background"`, icons under `"icons"`, and action toolbar properties under `"action"`.
  
  Replace the entire content of `public/manifest.json` with the following clean V3 structure:
  ```json
  {
    "manifest_version": 3,
    "name": "MDReader - Interactive Markdown & Mermaid Viewer",
    "version": "1.0.0",
    "description": "Преглеждайте и редактирайте Markdown файлове с красиви Mermaid диаграми директно в Chrome.",
    "permissions": [
      "activeTab"
    ],
    "icons": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    "action": {
      "default_icon": {
        "16": "icons/icon-16.png",
        "32": "icons/icon-32.png",
        "48": "icons/icon-48.png",
        "128": "icons/icon-128.png"
      },
      "default_title": "Отвори MDReader Табло"
    },
    "background": {
      "service_worker": "background.js"
    },
    "content_scripts": [
      {
        "matches": [
          "file:///*/*.md",
          "file:///*/*.markdown",
          "file:///*/*.mdx",
          "http://*/*.md",
          "https://*/*.md",
          "http://*/*.markdown",
          "https://*/*.markdown"
        ],
        "js": [
          "content.js"
        ],
        "run_at": "document_end"
      }
    ],
    "web_accessible_resources": [
      {
        "resources": [
          "index.html",
          "assets/*"
        ],
        "matches": [
          "<all_urls>"
        ]
      }
    ]
  }
  ```

- [ ] **Step 2: Run build and lint verification**
  Run: `npm run build`
  Expected: The build succeeds, and all files (`background.js`, `manifest.json`, `icons/`, etc.) exist correctly inside `dist/`.
  Run: `npm run lint`
  Expected: Passes with no warnings.

- [ ] **Step 3: Commit manifest updates**
  Run:
  ```bash
  git add public/manifest.json
  git commit -m "config: update extension manifest to register branded icons and action launcher"
  ```
