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


// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'storeSelectedIds') {
        chrome.storage.local.set({selected_project_ids: request.selectedIds}, () => {
            console.log('Background: Stored selected IDs:', request.selectedIds);
            sendResponse({success: true});
        });
        return true; // Keep message channel open
    } else if (request.action === 'getStoredIds') {
        chrome.storage.local.get(['selected_project_ids'], (result) => {
            console.log('Background: Retrieved selected IDs:', result.selected_project_ids);
            sendResponse({selectedIds: result.selected_project_ids || []});
        });
        return true; // Keep message channel open
    }
});
