// Updated background.js
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.session.set({ isInitialized: true });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action);
    
    if (request.action === 'storeSelectedIds') {
        chrome.storage.local.set({selected_project_ids: request.selectedIds}, () => {
            console.log('Background: Stored selected IDs:', request.selectedIds);
            sendResponse({success: true});
        });
        return true;
    } 
    else if (request.action === 'getStoredIds') {
        chrome.storage.local.get(['selected_project_ids'], (result) => {
            console.log('Background: Retrieved selected IDs:', result.selected_project_ids);
            sendResponse({selectedIds: result.selected_project_ids || []});
        });
        return true;
    }
    else if (request.action === 'processSelectedProjectsNow') {
        // Forward this to the popup if it's open, or handle it directly
        console.log('Background: Processing selected projects:', request.selectedIds);
        
        // Try to find and message the popup
        chrome.runtime.getViews({type: 'popup'}).forEach(view => {
            if (view.handleImmediateProcessing) {
                view.handleImmediateProcessing(request.selectedIds);
            }
        });
        
        sendResponse({success: true});
        return true;
    }
});
