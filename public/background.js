// Listen for toolbar button clicks on the MDReader extension icon
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
