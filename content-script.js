// Enhanced Content Script for Multi-Page Project Selection with Persistence
console.log('🚀 Enhanced Content script loaded');

let selectedProjectIds = new Set();
let allDetectedProjects = [];
let overlayActive = false;
let selectionSessionId = null;

// Initialize session on script load
initializeSelectionSession();

// Message listener for communication with popup
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
    } 
    // NEW: Popup detection handlers
    else if (request.action === 'checkPopupStatus') {
        const popupStatus = checkIfPopupIsOpen();
        sendResponse({ success: true, popupStatus });
    } else if (request.action === 'getPopupProjectId') {
        const projectId = getProjectIdFromPopup();
        sendResponse({ success: true, projectId });
    }
    // NEW: Storage handlers via background script
    else if (request.action === 'storeSelectedIds') {
        storeSelectedIdsViaBackground(request.selectedIds);
        sendResponse({ success: true });
    } else if (request.action === 'getStoredIds') {
        getStoredIdsViaBackground((storedIds) => {
            sendResponse({ success: true, selectedIds: storedIds || [] });
        });
        return true; // Keep message channel open for async response
    }
});

// NEW: Check if popup is currently open
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

// NEW: Get project ID from open popup
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
    
    // Fallback: search in full popup text
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

// NEW: Storage functions via background script messaging
function storeSelectedIdsViaBackground(selectedIds) {
    try {
        chrome.runtime.sendMessage({
            action: 'storeSelectedIds',
            selectedIds: selectedIds
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Storage message error:', chrome.runtime.lastError);
                // Fallback: store in DOM
                window.selectedProjectIds = selectedIds;
            } else {
                console.log('Selected IDs stored via background script');
            }
        });
    } catch (error) {
        console.error('Error sending storage message:', error);
        // Fallback: store in DOM
        window.selectedProjectIds = selectedIds;
    }
}

function getStoredIdsViaBackground(callback) {
    try {
        chrome.runtime.sendMessage({
            action: 'getStoredIds'
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Retrieval message error:', chrome.runtime.lastError);
                // Fallback: get from DOM
                callback(window.selectedProjectIds || []);
            } else {
                callback(response.selectedIds || []);
            }
        });
    } catch (error) {
        console.error('Error getting stored IDs:', error);
        // Fallback: get from DOM
        callback(window.selectedProjectIds || []);
    }
}

// Initialize or restore selection session
async function initializeSelectionSession() {
    try {
        selectionSessionId = generateSessionId();
        selectedProjectIds = new Set();
        console.log(`🆕 Created new session ${selectionSessionId}`);
    } catch (error) {
        console.error('❌ Error initializing session:', error);
        selectionSessionId = generateSessionId();
        selectedProjectIds = new Set();
    }
}

// Generate unique session ID
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        // Extract title
        const titleSelectors = [
            'h3', 'h4', 'h5', '[class*="title"]', '[class*="name"]', '.project-title'
        ];
        
        for (const selector of titleSelectors) {
            const titleEl = container.querySelector(selector);
            if (titleEl?.textContent?.trim()) {
                info.title = titleEl.textContent.trim().substring(0, 50) + '...';
                break;
            }
        }
        
        const text = container.textContent || '';
        
        // Extract deadline
        const deadlineMatch = text.match(/closes?\s+in\s+(\d+)\s+days?/i) || 
                             text.match(/deadline[:\s]*([^,\n]+)/i);
        if (deadlineMatch) {
            info.deadline = deadlineMatch[1];
        }
        
        // Extract value
        const valueMatch = text.match(/\$[\d,.]+(M|K|k|m)?/i);
        if (valueMatch) {
            info.value = valueMatch[0];
        }
        
        // Extract trades count
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
    
    // Create overlay container with proper CSS
    const overlay = document.createElement('div');
    overlay.id = 'project-selection-overlay';
    overlay.innerHTML = `
        <div class="overlay-container">
            <div class="overlay-header">
                <h3>🎯 Select Projects to Scrape</h3>
                <div class="selection-counter">
                    <span id="selection-count">0</span> projects selected
                </div>
            </div>
            <div class="overlay-content">
                <p>Click on project rows below to select them. Selected projects will be highlighted in green.</p>
                <div class="overlay-buttons">
                    <button id="confirm-selection-btn" class="confirm-btn" disabled>
                        ✅ Confirm Selection (<span id="confirm-count">0</span>)
                    </button>
                    <button id="clear-selection-btn" class="clear-btn">
                        🗑️ Clear All
                    </button>
                    <button id="cancel-selection-btn" class="cancel-btn">
                        ❌ Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add comprehensive CSS styles
    const style = document.createElement('style');
    style.textContent = `
        #project-selection-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px;
            box-sizing: border-box;
        }
        
        .overlay-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            margin-top: 50px;
        }
        
        .overlay-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px 12px 0 0;
            text-align: center;
        }
        
        .overlay-header h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        
        .selection-counter {
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            font-size: 14px;
        }
        
        .overlay-content {
            padding: 25px;
        }
        
        .overlay-content p {
            margin: 0 0 20px 0;
            color: #666;
            line-height: 1.5;
        }
        
        .overlay-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .overlay-buttons button {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s ease;
            flex: 1;
            min-width: 120px;
        }
        
        .confirm-btn {
            background: #28a745;
            color: white;
        }
        
        .confirm-btn:hover:not(:disabled) {
            background: #218838;
            transform: translateY(-1px);
        }
        
        .confirm-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .clear-btn {
            background: #ffc107;
            color: #212529;
        }
        
        .clear-btn:hover {
            background: #e0a800;
            transform: translateY(-1px);
        }
        
        .cancel-btn {
            background: #dc3545;
            color: white;
        }
        
        .cancel-btn:hover {
            background: #c82333;
            transform: translateY(-1px);
        }
        
        .project-selected {
            background-color: #d4edda !important;
            border: 2px solid #28a745 !important;
            box-shadow: 0 0 10px rgba(40, 167, 69, 0.3) !important;
        }
        
        .project-row-clickable {
            cursor: pointer !important;
            transition: all 0.2s ease !important;
        }
        
        .project-row-clickable:hover {
            background-color: #f8f9fa !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    // Attach event listeners
    attachOverlayEventListeners();
    
    // Make project rows clickable
    makeProjectRowsClickable();
    
    // Update counter
    updateSelectionCounter();
}

// Attach event listeners to overlay buttons
function attachOverlayEventListeners() {
    const confirmBtn = document.getElementById('confirm-selection-btn');
    const clearBtn = document.getElementById('clear-selection-btn');
    const cancelBtn = document.getElementById('cancel-selection-btn');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleConfirmSelection);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllSelections);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideProjectSelectionOverlay);
    }
}

// Handle confirm button click - UPDATED with storage
function handleConfirmSelection() {
    const selectedIds = Array.from(selectedProjectIds);
    
    if (selectedIds.length === 0) {
        alert('Please select at least one project');
        return;
    }
    
    console.log('📤 Sending selected project IDs:', selectedIds);
    
    // Store selected IDs first
    storeSelectedIdsViaBackground(selectedIds);
    
    // Send message to popup
    chrome.runtime.sendMessage({
        action: 'projectsSelected',
        selectedIds: selectedIds
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Message send error:', chrome.runtime.lastError);
            // Store in DOM as additional fallback
            window.selectedProjectIds = selectedIds;
        }
    });
    
    hideProjectSelectionOverlay();
}

// Make project rows clickable for selection
function makeProjectRowsClickable() {
    const projectRows = document.querySelectorAll('tbody.styles__tenderRow__b2e48989c7e9117bd552');
    
    projectRows.forEach((row, index) => {
        const projectIdElement = row.querySelector('span.styles__projectId__a99146050623e131a1bf');
        
        if (projectIdElement) {
            const projectId = projectIdElement.textContent?.trim().match(/(\d+)/)?.[1];
            
            if (projectId) {
                // Add visual indicators
                row.classList.add('project-row-clickable');
                
                // Check if already selected
                if (selectedProjectIds.has(projectId)) {
                    row.classList.add('project-selected');
                }
                
                // Add click handler
                row.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    toggleProjectSelection(projectId, row);
                });
            }
        }
    });
}

// Toggle project selection state
function toggleProjectSelection(projectId, rowElement) {
    if (selectedProjectIds.has(projectId)) {
        // Deselect
        selectedProjectIds.delete(projectId);
        rowElement.classList.remove('project-selected');
        console.log(`➖ Deselected project: ${projectId}`);
    } else {
        // Select
        selectedProjectIds.add(projectId);
        rowElement.classList.add('project-selected');
        console.log(`➕ Selected project: ${projectId}`);
    }
    
    updateSelectionCounter();
}

// Update selection counter in overlay
function updateSelectionCounter() {
    const countElement = document.getElementById('selection-count');
    const confirmCountElement = document.getElementById('confirm-count');
    const confirmBtn = document.getElementById('confirm-selection-btn');
    
    const count = selectedProjectIds.size;
    
    if (countElement) {
        countElement.textContent = count;
    }
    
    if (confirmCountElement) {
        confirmCountElement.textContent = count;
    }
    
    if (confirmBtn) {
        confirmBtn.disabled = count === 0;
    }
}

// Clear all selections
function clearAllSelections() {
    console.log('🗑️ Clearing all selections...');
    
    // Remove visual indicators
    document.querySelectorAll('.project-selected').forEach(row => {
        row.classList.remove('project-selected');
    });
    
    // Clear selection set
    selectedProjectIds.clear();
    
    // Update counter
    updateSelectionCounter();
    
    console.log('✅ All selections cleared');
}

// Hide project selection overlay
function hideProjectSelectionOverlay() {
    console.log('👁️ Selection overlay hidden');
    
    const overlay = document.getElementById('project-selection-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Remove clickable classes
    document.querySelectorAll('.project-row-clickable').forEach(row => {
        row.classList.remove('project-row-clickable');
    });
    
    // Remove selected classes
    document.querySelectorAll('.project-selected').forEach(row => {
        row.classList.remove('project-selected');
    });
    
    overlayActive = false;
}

// Listen for page navigation to clean up
window.addEventListener('beforeunload', () => {
    if (overlayActive) {
        hideProjectSelectionOverlay();
    }
});

// Auto-cleanup on URL change
let currentUrl = window.location.href;
setInterval(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        if (overlayActive) {
            hideProjectSelectionOverlay();
        }
        selectedProjectIds.clear();
    }
}, 1000);

console.log('✅ Enhanced content script loaded with storage support');
