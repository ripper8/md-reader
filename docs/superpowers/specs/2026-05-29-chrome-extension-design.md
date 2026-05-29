# Design Spec: Chrome Extension Branding and Quick Start Launcher

This design document outlines the additions and modifications required to upgrade the MDReader Chrome Extension into a premium productivity tool, adding professional PNG icons, an Action toolbar launcher, and a background service worker to open the application in a new tab.

## 1. Goals & Requirements

- **Professional Branding**: Add dedicated PNG icons in standard dimensions (16x16, 32x32, 48x48, 128x128) using a high-quality minimalist document reader design.
- **Quick-Start Toolbar Action**: Enable the extension toolbar icon to act as a clickable button in Google Chrome.
- **Service Worker integration**: Implement a background service worker to launch the MDReader dashboard in a new tab when the extension toolbar action button is clicked.
- **MV3 Compliance**: Strictly adhere to Chrome Extension Manifest V3 specifications.

## 2. Proposed Changes

### Component Details

---

#### 1. Extension Manifest (`public/manifest.json`)

- **Change Type**: Modify
- **Key Modifications**:
  - Register `"icons"` in the root of the manifest.
  - Add the `"action"` object to define the extension toolbar button, its default icons, and hover tooltip text.
  - Add the `"background"` object with `"service_worker"` pointing to `background.js` to handle extension lifecycle actions.
  - Keep existing `"content_scripts"` and `"web_accessible_resources"` intact.

---

#### 2. Background Service Worker (`public/background.js`)

- **Change Type**: New
- **Description**: Add a lightweight extension service worker to intercept toolbar extension button clicks and launch `index.html` inside a new browser tab.
- **Code Content**:
  ```javascript
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  });
  ```

---

#### 3. Branded Icons (`public/icons/`)

- **Change Type**: New
- **Description**: Add a new sub-folder `public/icons/` and populate it with four formatted PNG icons:
  - `icon-16.png`
  - `icon-32.png`
  - `icon-48.png`
  - `icon-128.png`
- **Branding Artwork**: Emerald green and deep indigo glowing gradient document reader logo.

## 3. Verification Plan

### Manual Verification
1. Verify that `npm run build` succeeds and copies `background.js`, `manifest.json`, and `icons/` into `dist/`.
2. Open `chrome://extensions/` in Google Chrome and verify that the unpacked `dist` folder loads correctly.
3. Verify that the extension's toolbar icon shows the newly generated custom document reader logo instead of Chrome's generic gray puzzle piece.
4. Click on the extension's toolbar icon and verify that it opens the MDReader Dashboard in a new full browser tab.
