// Background script for session management
chrome.runtime.onInstalled.addListener(() => {
    // Initialize session storage
    chrome.storage.session.set({ isInitialized: true });
  });
  