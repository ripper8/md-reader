(function () {
  // 1. Get raw text of the file. Chrome automatically wraps plain text files in a <pre> element.
  const pre = document.querySelector('pre');
  if (!pre) return;
  const rawText = pre.textContent;

  // 2. Extract the file name from the URL path.
  const pathParts = window.location.pathname.split('/');
  const fileName = decodeURIComponent(pathParts[pathParts.length - 1] || 'document.md');

  // 3. Clear the document head and body to prepare for our iframe.
  document.documentElement.innerHTML = '';

  // 4. Create head element and add basic document styles to prevent scrolling or margins.
  const head = document.createElement('head');
  const title = document.createElement('title');
  title.textContent = `MDReader - ${fileName}`;
  
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      overflow: hidden !important;
      background-color: #12151a !important;
    }
    iframe {
      width: 100vw !important;
      height: 100vh !important;
      border: none !important;
      display: block !important;
    }
  `;
  head.appendChild(title);
  head.appendChild(style);
  document.documentElement.appendChild(head);

  // 5. Create body element.
  const body = document.createElement('body');
  document.documentElement.appendChild(body);

  // 6. Create the fullscreen iframe pointing to our extension index.html.
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('index.html');
  body.appendChild(iframe);

  // 7. Pass the raw markdown text and filename to our React app inside the iframe once it's ready.
  window.addEventListener('message', (event) => {
    // Listen for the iframe telling us it is ready to receive data
    if (event.data && event.data.type === 'MDREADER_READY') {
      iframe.contentWindow.postMessage({
        type: 'LOAD_MARKDOWN',
        content: rawText,
        fileName: fileName
      }, '*');
    }
  });
})();
