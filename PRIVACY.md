# Privacy Policy for MDReader

**Last Updated:** May 29, 2026

At MDReader, we take your privacy very seriously. This Privacy Policy describes how the MDReader Google Chrome Extension handles your data.

## 1. No Personal Data Collection

MDReader operates **100% locally** in your web browser. 

- **No Remote Servers:** The extension does not connect to any remote servers, APIs, or databases.
- **No Data Transmission:** We do not collect, monitor, store, or transmit any of your personal data, files, document content, browsing history, or analytical data. Everything you view or edit stays strictly on your computer.

## 2. Local Browser Storage

MDReader utilizes standard local browser storage (such as the browser's `LocalStorage` API) solely for the following convenience features:
- Keeping track of your local document history list (Recent Files) so you can reopen them quickly on the Dashboard.
- Saving your preferred visual theme (Light Mode or Dark Mode).

This data is stored purely locally inside your browser's sandboxed environment and is never shared, transferred, or accessed by us or any third party.

## 3. Extension Permissions

MDReader requests minimal permissions required to function as a Markdown viewer:
- **`activeTab`**: Used temporarily to read the plain-text Markdown content of the active tab containing a `.md`, `.markdown`, or `.mdx` file, in order to display the MDReader editor.
- **Host Permissions (`file:///*`, `http://*`, `https://*`)**: Used strictly to inject the local content script on pages matching `.md`, `.markdown`, or `.mdx` files so they can be viewed interactively.

## 4. Contact

If you have any questions or concerns regarding this Privacy Policy, please open an issue in our open-source repository at [GitHub - ripper8/md-reader](https://github.com/ripper8/md-reader).
