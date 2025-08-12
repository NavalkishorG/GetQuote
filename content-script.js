console.log('🚀 Enhanced Content script loaded');

let selectedProjectIds = new Set();
let allDetectedProjects = [];
let overlayActive = false;
let selectionSessionId = null;

// Extension configuration - replace with your actual API URL
const EXTENSION_CONFIG = {
    API_BASE_URL: 'http://localhost:8000', // Replace with your actual backend URL
    getRequestHeaders: () => ({
        'Content-Type': 'application/json'
    })
};

initializeSelectionSession();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Content script received message:', request.action);
    
    if (request.action === 'detectAllProjects') {
        const projects = detectAllProjectsOnPage();
        sendResponse({ success: true, projects });
    } else if (request.action === 'showSelectionOverlay') {
        showProjectSelectionOverlay();
        sendResponse({ success: true });
    } else if (request.action === 'hideSelectionOverlay') {
        hideProjectSelectionOverlay();
        sendResponse({ success: true });
    } else if (request.action === 'getSelectedProjects') {
        const selected = Array.from(selectedProjectIds);
        sendResponse({ success: true, selectedIds: selected });
    } else if (request.action === 'checkPopupStatus') {
        const popupStatus = checkIfPopupIsOpen();
        sendResponse({ success: true, popupStatus });
    } else if (request.action === 'getPopupProjectId') {
        const projectId = getProjectIdFromPopup();
        sendResponse({ success: true, projectId });
    } else if (request.action === 'clearStoredSelection') {
        clearStoredSelection();
        sendResponse({ success: true });
    }
    
    return true;
});

// Initialize or restore selection session
async function initializeSelectionSession() {
    try {
        selectionSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Load previously selected IDs from Chrome storage
        const storedIds = await loadSelectedIdsFromStorage();
        selectedProjectIds = new Set(storedIds);
        
        console.log(`🆕 Session ${selectionSessionId} initialized with ${selectedProjectIds.size} stored IDs`);
    } catch (error) {
        console.error('❌ Error initializing session:', error);
        selectedProjectIds = new Set();
    }
}

// Storage management functions
async function loadSelectedIdsFromStorage() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['selected_project_ids'], (result) => {
            const stored = result.selected_project_ids || [];
            console.log('📂 Loaded from storage:', stored);
            resolve(stored);
        });
    });
}

async function saveSelectedIdsToStorage(selectedIds) {
    return new Promise((resolve) => {
        const idsArray = Array.from(selectedIds);
        chrome.storage.local.set({ selected_project_ids: idsArray }, () => {
            console.log('💾 Saved to storage:', idsArray);
            resolve();
        });
    });
}

async function removeIdFromStorage(projectId) {
    const currentIds = await loadSelectedIdsFromStorage();
    const updatedIds = currentIds.filter(id => id !== projectId);
    await saveSelectedIdsToStorage(new Set(updatedIds));
    console.log('🗑️ Removed from storage:', projectId);
}

async function addIdToStorage(projectId) {
    const currentIds = await loadSelectedIdsFromStorage();
    const updatedIds = new Set([...currentIds, projectId]);
    await saveSelectedIdsToStorage(updatedIds);
    console.log('➕ Added to storage:', projectId);
}

function clearStoredSelection() {
    chrome.storage.local.remove(['selected_project_ids'], () => {
        selectedProjectIds.clear();
        console.log('🧹 Cleared all stored selections');
        
        // Update visual indicators
        document.querySelectorAll('.project-row-selected').forEach(row => {
            row.classList.remove('project-row-selected');
        });
        updateOverlayStatus();
    });
}

// Get auth token from storage
async function getAuthToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['auth_token'], (result) => {
            resolve(result.auth_token);
        });
    });
}

// Check if popup is open
function checkIfPopupIsOpen() {
    const popupSelectors = [
        '.slide-pane__content',
        '.ReactModal__Content',
        '[role="dialog"]',
        '.styles__slider__a65e8ea3f368640c502d',
        '.ReactModal__Overlay--after-open'
    ];

    for (const selector of popupSelectors) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                const computedStyle = window.getComputedStyle(element);
                const isVisible = computedStyle.display !== 'none' && 
                                computedStyle.visibility !== 'hidden' && 
                                computedStyle.opacity !== '0';
                
                if (isVisible) {
                    console.log(`✅ Popup is open with selector: ${selector}`);
                    return { isOpen: true, selector: selector, element: element };
                }
            }
        } catch (error) {
            console.warn(`⚠️ Popup check failed for selector: ${selector}`, error);
            continue;
        }
    }
    
    console.log('❌ No popup is currently open');
    return { isOpen: false };
}

function getProjectIdFromPopup() {
    const popupStatus = checkIfPopupIsOpen();
    if (!popupStatus.isOpen) {
        console.log('❌ No popup is open');
        return null;
    }

    const popupContainer = popupStatus.element;
    const popupProjectIdSelectors = [
        'span.styles__projectId__f47058b1431204abe7ec',
        'span.styles__projectId__a99146050623e131a1bf',
        '[class*="projectId"]',
        'span[title*="ID"]'
    ];

    for (const selector of popupProjectIdSelectors) {
        try {
            const element = popupContainer.querySelector(selector);
            if (element && element.textContent) {
                const text = element.textContent.trim();
                console.log(`✅ Found element within popup: ${selector}, text: ${text}`);
                const idMatch = text.match(/(?:ID\s*#?\s*)?(\d+)/i);
                if (idMatch) {
                    const projectId = idMatch[1];
                    console.log(`🎯 Extracted project ID from popup: ${projectId}`);
                    return projectId;
                }
            }
        } catch (error) {
            console.warn(`⚠️ Selector failed within popup: ${selector}`, error);
            continue;
        }
    }

    try {
        const fullText = popupContainer.textContent || popupContainer.innerText;
        const idMatch = fullText.match(/ID\s*#?\s*(\d+)/i);
        if (idMatch) {
            const projectId = idMatch[1];
            console.log(`🎯 Found project ID via text search within popup: ${projectId}`);
            return projectId;
        }
    } catch (error) {
        console.warn('⚠️ Text-based fallback failed within popup:', error);
    }

    console.log('❌ No project ID found within the open popup');
    return null;
}

// Detect all projects on the current page
function detectAllProjectsOnPage() {
    console.log('🔍 Detecting all projects on page...');
    const projects = [];
    const projectSelector = 'span.styles__projectId__a99146050623e131a1bf';

    try {
        const elements = document.querySelectorAll(projectSelector);
        console.log(`Found ${elements.length} project elements`);

        elements.forEach((element, index) => {
            const projectId = element.textContent?.trim().match(/(\d+)/)?.[1];
            if (projectId) {
                const projectContainer = element.closest('[class*="project"], .card, [class*="item"]') || 
                                      element.parentElement.parentElement;
                const projectInfo = extractProjectInfo(projectContainer);
                
                projects.push({
                    id: projectId,
                    element: element,
                    container: projectContainer,
                    index: index,
                    isAlreadySelected: selectedProjectIds.has(projectId),
                    ...projectInfo
                });
                
                console.log(`📋 Project ${index + 1}: ID ${projectId} ${selectedProjectIds.has(projectId) ? '(Already Selected)' : ''}`);
            }
        });

        allDetectedProjects = projects;
        console.log(`✅ Detected ${projects.length} projects total, ${Array.from(selectedProjectIds).length} already selected`);
        
        return projects.map(p => ({
            id: p.id,
            title: p.title,
            deadline: p.deadline,
            value: p.value,
            trades: p.trades,
            isAlreadySelected: p.isAlreadySelected
        }));
        
    } catch (error) {
        console.error('❌ Error detecting projects:', error);
        return [];
    }
}

// Extract additional project information from container
function extractProjectInfo(container) {
    if (!container) return {};

    const info = {
        title: 'Unknown Project',
        deadline: 'No deadline',
        value: 'No value',
        trades: 0
    };

    try {
        const titleSelectors = [
            'h3', 'h4', 'h5', 
            '[class*="title"]', 
            '[class*="name"]', 
            '.project-title'
        ];

        for (const selector of titleSelectors) {
            const titleEl = container.querySelector(selector);
            if (titleEl?.textContent?.trim()) {
                info.title = titleEl.textContent.trim().substring(0, 50) + '...';
                break;
            }
        }

        const text = container.textContent || '';
        const deadlineMatch = text.match(/closes?\s+in\s+(\d+)\s+days?/i) || 
                             text.match(/deadline[:\s]*([^,\n]+)/i);
        if (deadlineMatch) {
            info.deadline = deadlineMatch[1];
        }

        const valueMatch = text.match(/\$[\d,.]+(M|K|k|m)?/i);
        if (valueMatch) {
            info.value = valueMatch[0];
        }

        const tradeElements = container.querySelectorAll('[class*="trade"], [class*="category"]');
        info.trades = tradeElements.length;

    } catch (error) {
        console.warn('⚠️ Error extracting project info:', error);
    }

    return info;
}

// Show enhanced visual selection overlay with persistence
function showProjectSelectionOverlay() {
    if (overlayActive) return;
    
    console.log('👁️ Showing enhanced selection overlay...');
    overlayActive = true;

    // Remove existing overlay if any
    const existingOverlay = document.getElementById('project-selection-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'project-selection-overlay';
    overlay.innerHTML = `
        <style>
            #project-selection-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                border-bottom: 3px solid #4CAF50;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            .selection-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .selection-title {
                font-size: 18px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .selection-controls {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .selection-button {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .confirm-btn {
                background: #4CAF50;
                color: white;
            }
            
            .confirm-btn:hover {
                background: #45a049;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            }
            
            .confirm-btn:disabled {
                background: #cccccc;
                cursor: not-allowed;
                transform: none;
            }
            
            .confirm-btn.processing {
                background: #ff9800;
                cursor: not-allowed;
            }
            
            .clear-btn {
                background: #f44336;
                color: white;
            }
            
            .clear-btn:hover {
                background: #da190b;
            }
            
            .close-btn {
                background: #6c757d;
                color: white;
                padding: 6px 12px;
            }
            
            .close-btn:hover {
                background: #545b62;
            }
            
            .selection-info {
                background: rgba(255,255,255,0.2);
                padding: 10px;
                border-radius: 6px;
                margin-top: 10px;
                backdrop-filter: blur(10px);
            }
            
            .project-row-selected {
                background: linear-gradient(90deg, #4CAF50, #45a049) !important;
                transform: scale(1.02) !important;
                box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4) !important;
                border: 2px solid #4CAF50 !important;
                border-radius: 8px !important;
                transition: all 0.3s ease !important;
            }
            
            .project-row-selected * {
                color: white !important;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3) !important;
            }
            
            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .status-ready {
                background: #4CAF50;
                color: white;
            }
            
            .status-waiting {
                background: #ff9800;
                color: white;
            }
            
            .status-processing {
                background: #2196F3;
                color: white;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        </style>
        
        <div class="selection-header">
            <div class="selection-title">
                🎯 Project Selection Mode
                <span id="selection-status" class="status-indicator status-waiting">
                    ⏳ 0 Selected
                </span>
            </div>
            
            <div class="selection-controls">
                <button id="confirm-process-btn" class="selection-button confirm-btn" disabled>
                    🚀 Confirm & Process
                </button>
                <button id="clear-selection-btn" class="selection-button clear-btn">
                    🧹 Clear All
                </button>
                <button id="close-overlay-btn" class="selection-button close-btn">
                    ❌ Close
                </button>
            </div>
        </div>
        
        <div class="selection-info">
            📋 Click on project rows to select/deselect them. Selected projects are saved automatically and will be processed when you click "Confirm & Process".
        </div>
    `;

    document.body.appendChild(overlay);

    // Attach event listeners
    document.getElementById('confirm-process-btn').addEventListener('click', handleConfirmProcess);
    document.getElementById('clear-selection-btn').addEventListener('click', handleClearSelection);
    document.getElementById('close-overlay-btn').addEventListener('click', hideProjectSelectionOverlay);

    // Add click handlers to project rows
    attachProjectRowClickHandlers();
    
    // Update initial status
    updateOverlayStatus();
    
    console.log('✅ Selection overlay displayed successfully');
}

// Update overlay status display
function updateOverlayStatus() {
    const statusElement = document.getElementById('selection-status');
    const confirmButton = document.getElementById('confirm-process-btn');
    
    if (!statusElement || !confirmButton) return;
    
    const selectedCount = selectedProjectIds.size;
    
    if (selectedCount > 0) {
        statusElement.textContent = `✅ ${selectedCount} Selected`;
        statusElement.className = 'status-indicator status-ready';
        confirmButton.disabled = false;
    } else {
        statusElement.textContent = '⏳ 0 Selected';
        statusElement.className = 'status-indicator status-waiting';
        confirmButton.disabled = true;
    }
}

// UPDATED: Handle confirm and process button click - DIRECT API CALL
async function handleConfirmProcess() {
    const selectedIds = Array.from(selectedProjectIds);
    
    if (selectedIds.length === 0) {
        showTemporaryNotification('❌ No projects selected!', 3000);
        return;
    }

    console.log('🚀 Confirm & Process clicked with IDs:', selectedIds);
    
    // Update UI to show processing state
    const confirmButton = document.getElementById('confirm-process-btn');
    const statusElement = document.getElementById('selection-status');
    
    if (confirmButton) {
        confirmButton.disabled = true;
        confirmButton.classList.add('processing');
        confirmButton.innerHTML = '⏳ Processing...';
    }
    
    if (statusElement) {
        statusElement.textContent = '🔄 Processing...';
        statusElement.className = 'status-indicator status-processing';
    }
    
    try {
        // Get auth token from storage
        const token = await getAuthToken();
        
        if (!token) {
            showTemporaryNotification('❌ Please login first', 5000);
            return;
        }

        // Show processing notification
        showTemporaryNotification(`🚀 Processing ${selectedIds.length} selected projects...`, 3000);

        console.log('📤 Making direct API call to backend...');
        
        // DIRECT API CALL to backend
        const response = await fetch(`${EXTENSION_CONFIG.API_BASE_URL}/scrapper/scrape-project`, {
            method: 'POST',
            headers: {
                ...EXTENSION_CONFIG.getRequestHeaders(),
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                project_ids: selectedIds,
                url: "https://app.estimateone.com/tenders"
            })
        });

        const data = await response.json();
        console.log('📥 Backend response:', data);

        if (response.ok) {
            const processed = data.data?.processed || 0;
            const failed = data.data?.failed || 0;
            const total = selectedIds.length;

            if (data.status === 'success' && processed === total) {
                showTemporaryNotification(`🎉 Successfully processed all ${processed} projects!`, 5000);
            } else if (data.status === 'partial_success' || (processed > 0 && failed > 0)) {
                showTemporaryNotification(`✅ Processed ${processed}/${total} projects. ${failed} failed.`, 5000);
            } else {
                showTemporaryNotification(`❌ Failed to process projects: ${data.message || 'Unknown error'}`, 5000);
            }
        } else {
            const errorMsg = data.detail || data.message || 'Server error';
            showTemporaryNotification(`❌ Failed to process projects: ${errorMsg}`, 5000);
        }

        // Clear stored IDs after processing attempt
        await clearStoredSelection();
        
        // Hide overlay after processing
        setTimeout(() => {
            hideProjectSelectionOverlay();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error processing projects:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showTemporaryNotification('❌ Cannot connect to server. Please check your connection.', 5000);
        } else {
            showTemporaryNotification('❌ Network error. Please try again.', 5000);
        }
    } finally {
        // Reset button state
        if (confirmButton) {
            confirmButton.disabled = false;
            confirmButton.classList.remove('processing');
            confirmButton.innerHTML = '🚀 Confirm & Process';
        }
        
        if (statusElement) {
            updateOverlayStatus();
        }
    }
}

// Show temporary notification to user
function showTemporaryNotification(message, duration = 3000) {
    // Remove existing notification
    const existingNotification = document.getElementById('temp-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification
    const notification = document.createElement('div');
    notification.id = 'temp-notification';
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #333;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10002;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        max-width: 350px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
        if (style.parentNode) {
            style.remove();
        }
    }, duration);
}

// Handle clear selection
async function handleClearSelection() {
    selectedProjectIds.clear();
    await saveSelectedIdsToStorage(selectedProjectIds);
    
    // Remove visual indicators
    document.querySelectorAll('.project-row-selected').forEach(row => {
        row.classList.remove('project-row-selected');
    });
    
    updateOverlayStatus();
    showTemporaryNotification('🧹 All selections cleared', 2000);
    console.log('🧹 All selections cleared');
}

// Attach click handlers to project rows
function attachProjectRowClickHandlers() {
    const projectRows = document.querySelectorAll('tbody.styles__tenderRow__b2e48989c7e9117bd552');
    
    console.log(`🔗 Attaching click handlers to ${projectRows.length} project rows`);
    
    projectRows.forEach((row, index) => {
        const projectIdElement = row.querySelector('.styles__projectId__a99146050623e131a1bf');
        
        if (projectIdElement) {
            const projectId = projectIdElement.textContent?.trim().match(/(\d+)/)?.[1];
            
            if (projectId) {
                // Check if already selected and apply visual indicator
                if (selectedProjectIds.has(projectId)) {
                    row.classList.add('project-row-selected');
                }
                
                // Remove existing click handlers
                const newRow = row.cloneNode(true);
                row.parentNode.replaceChild(newRow, row);
                
                // Add new click handler
                newRow.addEventListener('click', async (event) => {
                    // Prevent default link clicks
                    event.preventDefault();
                    event.stopPropagation();
                    
                    await handleProjectRowClick(projectId, newRow);
                });
                
                console.log(`✅ Click handler attached to project ${projectId}`);
            }
        }
    });
}

// Handle project row click for selection
async function handleProjectRowClick(projectId, rowElement) {
    console.log(`🖱️ Project row clicked: ${projectId}`);
    
    if (selectedProjectIds.has(projectId)) {
        // Deselect
        selectedProjectIds.delete(projectId);
        rowElement.classList.remove('project-row-selected');
        await removeIdFromStorage(projectId);
        console.log(`➖ Deselected project: ${projectId}`);
        showTemporaryNotification(`➖ Deselected project ${projectId}`, 1500);
    } else {
        // Select
        selectedProjectIds.add(projectId);
        rowElement.classList.add('project-row-selected');
        await addIdToStorage(projectId);
        console.log(`➕ Selected project: ${projectId}`);
        showTemporaryNotification(`➕ Selected project ${projectId}`, 1500);
    }
    
    updateOverlayStatus();
    
    // Flash effect for feedback
    rowElement.style.transition = 'all 0.3s ease';
    rowElement.style.transform = 'scale(1.05)';
    setTimeout(() => {
        rowElement.style.transform = '';
    }, 200);
}

// Hide project selection overlay
function hideProjectSelectionOverlay() {
    console.log('🙈 Hiding selection overlay...');
    
    const overlay = document.getElementById('project-selection-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    overlayActive = false;
    console.log('✅ Selection overlay hidden');
}
