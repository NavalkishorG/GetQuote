// Background script for session management
chrome.runtime.onInstalled.addListener(() => {
    // Initialize session storage
    chrome.storage.session.set({ isInitialized: true });
  });
  

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'storeSelectedIds') {
      chrome.storage.local.set({selected_project_ids: request.selectedIds}, () => {
          sendResponse({success: true});
      });
      return true;
  } else if (request.action === 'getSelectedIds') {
      chrome.storage.local.get(['selected_project_ids'], (result) => {
          sendResponse({selectedIds: result.selected_project_ids || []});
      });
      return true;
  }
});
