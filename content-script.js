// Enhanced Content Script for Multi-Page Project Selection with Persistence
console.log('🚀 Enhanced Content script loaded');

let selectedProjectIds = new Set();
let allDetectedProjects = [];
let overlayActive = false;
let selectionSessionId = null;
let currentPageProjects = [];

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
    else if (request.action === 'checkPopupStatus') {
        const popupStatus = checkIfPopupIsOpen();
        sendResponse({ success: true, popupStatus });
    } else if (request.action === 'getPopupProjectId') {
        const projectId = getProjectIdFromPopup();
        sendResponse({ success: true, projectId });
    }
    else if (request.action === 'storeSelectedIds') {
        storeSelectedIdsViaBackground(request.selectedIds);
        sendResponse({ success: true });
    } else if (request.action === 'getStoredIds') {
        getStoredIdsViaBackground((storedIds) => {
            sendResponse({ success: true, selectedIds: storedIds || [] });
        });
        return true;
    }
});

// Check if popup is currently open
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

// Get project ID from open popup
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

// Storage functions via background script
function storeSelectedIdsViaBackground(selectedIds) {
    try {
        chrome.runtime.sendMessage({
            action: 'storeSelectedIds',
            selectedIds: selectedIds
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('Storage message error:', chrome.runtime.lastError);
                window.selectedProjectIds = selectedIds;
            } else {
                console.log('Selected IDs stored via background script');
            }
        });
    } catch (error) {
        console.error('Error sending storage message:', error);
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
                callback(window.selectedProjectIds || []);
            } else {
                callback(response.selectedIds || []);
            }
        });
    } catch (error) {
        console.error('Error getting stored IDs:', error);
        callback(window.selectedProjectIds || []);
    }
}

// Initialize session
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

function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// UPDATED: Detect projects with multiple strategies for your HTML structure
function detectAllProjectsOnPage() {
    console.log('🔍 Detecting all projects on page...');
    const projects = [];
    
    // Strategy 1: Look for project IDs in element IDs and attributes (for your HTML structure)
    try {
        const projectIdElements = document.querySelectorAll('[id*="projectId_"], [for*="projectId_"]');
        console.log(`Found ${projectIdElements.length} elements with projectId_ pattern`);
        
        const foundProjectIds = new Set();
        
        projectIdElements.forEach((element, index) => {
            const idAttribute = element.getAttribute('id') || element.getAttribute('for') || '';
            const projectIdMatch = idAttribute.match(/projectId[_-](\d+)/);
            
            if (projectIdMatch) {
                const projectId = projectIdMatch[1];
                
                if (!foundProjectIds.has(projectId)) {
                    foundProjectIds.add(projectId);
                    
                    const projectContainer = element.closest('tr, tbody, .project-row, [class*="project"]') || 
                                           element.parentElement.parentElement.parentElement;
                    
                    const projectInfo = extractProjectInfo(projectContainer);
                    
                    projects.push({
                        id: projectId,
                        element: element,
                        container: projectContainer,
                        index: projects.length,
                        isAlreadySelected: selectedProjectIds.has(projectId),
                        ...projectInfo
                    });
                    
                    console.log(`📋 Project ${projects.length}: ID ${projectId} ${selectedProjectIds.has(projectId) ? '(Already Selected)' : ''}`);
                }
            }
        });
    } catch (error) {
        console.warn('⚠️ Strategy 1 failed:', error);
    }
    
    // Strategy 2: Original selector as fallback
    try {
        const originalElements = document.querySelectorAll('span.styles__projectId__a99146050623e131a1bf');
        console.log(`Found ${originalElements.length} elements with original selector`);
        
        originalElements.forEach((element, index) => {
            const projectId = element.textContent?.trim().match(/(\d+)/)?.[1];
            if (projectId && !projects.find(p => p.id === projectId)) {
                const projectContainer = element.closest('[class*="project"], .card, [class*="item"]') || 
                                       element.parentElement.parentElement;
                const projectInfo = extractProjectInfo(projectContainer);
                
                projects.push({
                    id: projectId,
                    element: element,
                    container: projectContainer,
                    index: projects.length,
                    isAlreadySelected: selectedProjectIds.has(projectId),
                    ...projectInfo
                });
                
                console.log(`📋 Project ${projects.length}: ID ${projectId} (from original selector)`);
            }
        });
    } catch (error) {
        console.warn('⚠️ Strategy 2 failed:', error);
    }
    
    allDetectedProjects = projects;
    currentPageProjects = projects;
    console.log(`✅ Detected ${projects.length} projects total, ${Array.from(selectedProjectIds).length} already selected`);
    
    return projects.map(p => ({
        id: p.id,
        title: p.title,
        deadline: p.deadline,
        value: p.value,
        trades: p.trades,
        isAlreadySelected: p.isAlreadySelected
    }));
}

// Enhanced project info extraction for your HTML structure  
function extractProjectInfo(container) {
    if (!container) return {
        title: 'Unknown Project',
        deadline: 'No deadline',
        value: 'No value',
        trades: 0
    };
    
    const info = {
        title: 'Unknown Project',
        deadline: 'No deadline', 
        value: 'No value',
        trades: 0
    };
    
    try {
        const text = container.textContent || container.innerText || '';
        
        // Extract budget/value from your HTML structure
        const budgetElement = container.querySelector('.styles__budgetRange__b101ae22d71fd54397d0, [class*="budget"], [class*="range"]');
        if (budgetElement) {
            info.value = budgetElement.textContent.trim();
        } else {
            const valueMatch = text.match(/\$[\d,.]+(M|K|k|m)?/i);
            if (valueMatch) {
                info.value = valueMatch[0];
            }
        }
        
        // Extract deadline from date elements
        const dateElement = container.querySelector('.styles__projectDate__efdf1ddef6a4526d58ac, [class*="date"], [class*="deadline"]');
        if (dateElement) {
            info.deadline = dateElement.textContent.trim();
        } else {
            const deadlineMatch = text.match(/(\d{1,2}\s+\w{3}(?:\s+\d{2,4})?)/i);
            if (deadlineMatch) {
                info.deadline = deadlineMatch[1];
            }
        }
        
        // Extract title from various possible sources
        const titleSelectors = [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            '[class*="title"]', '[class*="name"]', '[class*="project"]'
        ];
        
        for (const selector of titleSelectors) {
            const titleEl = container.querySelector(selector);
            if (titleEl?.textContent?.trim() && titleEl.textContent.trim().length > 3) {
                info.title = titleEl.textContent.trim().substring(0, 50);
                if (info.title.length === 50) info.title += '...';
                break;
            }
        }
        
        if (info.title === 'Unknown Project') {
            const keywordElement = container.querySelector('span');
            if (keywordElement?.textContent?.includes('Construction')) {
                info.title = 'Construction Project';
            }
        }
        
        const tradeElements = container.querySelectorAll('[class*="trade"], [class*="category"], [class*="builder"]');
        info.trades = tradeElements.length;
        
    } catch (error) {
        console.warn('⚠️ Error extracting project info:', error);
    }
    
    return info;
}

// FIXED: Show NON-BLOCKING overlay that allows page interaction
function showProjectSelectionOverlay() {
    if (overlayActive) {
        console.log('⚠️ Overlay already active, refreshing instead of recreating...');
        refreshCurrentPageWithOverlay();
        return;
    }
    
    console.log('👁️ Showing non-blocking selection overlay...');
    overlayActive = true;
    
    // Create HEADER-ONLY overlay (not full screen)
    const overlay = document.createElement('div');
    overlay.id = 'project-selection-overlay';
    overlay.innerHTML = `
        <div class="selection-header">
            <h3>🎯 Multi-Page Project Selection</h3>
            <div class="selection-status">
                <span id="selection-count">${selectedProjectIds.size} projects selected across all pages</span><br>
                <span id="current-page-count">0 projects on current page</span>
            </div>
            <div class="selection-controls">
                <button id="refresh-projects-btn" class="refresh-btn">🔄 Refresh</button>
                <button id="select-all-btn">✅ Select All</button>
                <button id="clear-all-btn">❌ Clear All</button>
                <button id="view-selected-btn">👁️ View Selected</button>
                <button id="confirm-selection-btn" ${selectedProjectIds.size === 0 ? 'disabled' : ''}>
                    ✔️ Confirm & Process ${selectedProjectIds.size} Selected
                </button>
                <button id="cancel-selection-btn">❌ Cancel</button>
            </div>
        </div>
    `;
    
    // FIXED: Non-blocking CSS - NO full screen background, NO pointer-events blocking
    const style = document.createElement('style');
    style.textContent = `
        #project-selection-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 999999 !important;
            padding: 10px !important;
            pointer-events: none !important; /* KEY FIX: Overlay itself doesn't block clicks */
        }
        
        .selection-header {
            background: rgba(255, 255, 255, 0.98) !important;
            padding: 15px !important;
            border-radius: 10px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2) !important;
            text-align: center !important;
            border: 2px solid #007bff !important;
            pointer-events: auto !important; /* Only the header captures clicks */
            backdrop-filter: blur(3px) !important;
        }
        
        .selection-header h3 {
            margin: 0 0 10px 0 !important;
            color: #007bff !important;
            font-size: 16px !important;
        }
        
        .selection-status {
            margin: 10px 0 !important;
            font-size: 13px !important;
            color: #666 !important;
        }
        
        .selection-controls {
            display: flex !important;
            gap: 8px !important;
            justify-content: center !important;
            flex-wrap: wrap !important;
            margin-top: 15px !important;
        }
        
        .selection-controls button {
            padding: 8px 12px !important;
            border: none !important;
            border-radius: 6px !important;
            cursor: pointer !important;
            font-weight: bold !important;
            font-size: 12px !important;
            transition: all 0.3s !important;
            white-space: nowrap !important;
        }
        
        .refresh-btn { background: #17a2b8 !important; color: white !important; }
        .refresh-btn:hover { background: #138496 !important; }
        
        #select-all-btn { background: #28a745 !important; color: white !important; }
        #select-all-btn:hover { background: #218838 !important; }
        
        #clear-all-btn { background: #dc3545 !important; color: white !important; }
        #clear-all-btn:hover { background: #c82333 !important; }
        
        #view-selected-btn { background: #6f42c1 !important; color: white !important; }
        #view-selected-btn:hover { background: #5a32a3 !important; }
        
        #confirm-selection-btn { background: #28a745 !important; color: white !important; }
        #confirm-selection-btn:hover:not(:disabled) { background: #218838 !important; }
        #confirm-selection-btn:disabled { background: #ccc !important; cursor: not-allowed !important; }
        
        #cancel-selection-btn { background: #6c757d !important; color: white !important; }
        #cancel-selection-btn:hover { background: #545b62 !important; }
        
        /* Project row highlighting - DIRECT on existing elements */
        .project-row-selectable {
            position: relative !important;
            transition: all 0.3s ease !important;
            cursor: pointer !important;
        }
        
        .project-row-selectable:hover {
            background-color: rgba(0, 123, 255, 0.08) !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15) !important;
        }
        
        .project-row-selectable.selected {
            background-color: rgba(40, 167, 69, 0.12) !important;
            border-left: 4px solid #28a745 !important;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.25) !important;
        }
        
        .project-row-selectable.selected:hover {
            background-color: rgba(40, 167, 69, 0.18) !important;
        }
        
        /* Selection badge */
        .selection-badge {
            position: absolute !important;
            top: 5px !important;
            right: 5px !important;
            background: #28a745 !important;
            color: white !important;
            padding: 3px 8px !important;
            border-radius: 10px !important;
            font-size: 10px !important;
            font-weight: bold !important;
            z-index: 1000 !important;
            pointer-events: none !important;
        }
        
        /* Ensure dropdowns and interactive elements remain functional */
        .interestLevelDropdown, 
        [role="combobox"],
        .reactSelect__control,
        input, button, a, select {
            pointer-events: auto !important;
            position: relative !important;
            z-index: 1001 !important;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    
    // Attach event listeners
    attachOverlayEventListeners();
    
    // Make project rows selectable DIRECTLY (no floating indicators)
    makeProjectRowsSelectable();
    
    // Update counter
    updateSelectionCounter();
    
    // Set up persistent page change detection
    setupPageChangeDetection();
}

// FIXED: Make project rows directly selectable without floating indicators
function makeProjectRowsSelectable() {
    // Remove existing selection classes
    document.querySelectorAll('.project-row-selectable').forEach(el => {
        el.classList.remove('project-row-selectable', 'selected');
    });
    document.querySelectorAll('.selection-badge').forEach(el => el.remove());
    
    const projects = detectAllProjectsOnPage();
    console.log(`🎯 Making ${projects.length} project rows selectable...`);
    
    projects.forEach((project) => {
        // Find the table row containing this project
        let projectRow = null;
        
        if (project.container) {
            projectRow = project.container.closest('tr') || project.container;
        } else if (project.element) {
            projectRow = project.element.closest('tr, tbody, [class*="project"], [class*="tender"]');
        }
        
        // Fallback: Look for tr containing the project ID
        if (!projectRow) {
            const allRows = document.querySelectorAll('tr, tbody');
            for (const row of allRows) {
                if (row.innerHTML.includes(project.id)) {
                    projectRow = row;
                    break;
                }
            }
        }
        
        if (projectRow) {
            console.log(`✅ Found row for project ${project.id}`);
            
            // Make row selectable
            projectRow.classList.add('project-row-selectable');
            projectRow.setAttribute('data-project-id', project.id);
            
            // Add selection state
            if (selectedProjectIds.has(project.id)) {
                projectRow.classList.add('selected');
                
                // Add selected badge
                const badge = document.createElement('div');
                badge.className = 'selection-badge';
                badge.textContent = '✅ SELECTED';
                projectRow.style.position = 'relative';
                projectRow.appendChild(badge);
            }
            
            // Add click handler with event delegation
            const clickHandler = (e) => {
                // Prevent interfering with dropdowns, links, buttons
                if (e.target.tagName === 'A' || 
                    e.target.tagName === 'BUTTON' || 
                    e.target.tagName === 'INPUT' || 
                    e.target.tagName === 'SELECT' ||
                    e.target.closest('.interestLevelDropdown') ||
                    e.target.closest('[role="combobox"]')) {
                    return; // Allow normal interaction
                }
                
                e.preventDefault();
                e.stopPropagation();
                toggleProjectSelection(project.id, projectRow);
            };
            
            // Remove existing listeners to prevent duplicates
            projectRow.removeEventListener('click', clickHandler);
            // Add new listener
            projectRow.addEventListener('click', clickHandler);
        } else {
            console.warn(`⚠️ Could not find row for project ${project.id}`);
        }
    });
    
    updateCurrentPageCount();
}

// Toggle project selection
function toggleProjectSelection(projectId, rowElement) {
    if (selectedProjectIds.has(projectId)) {
        // Deselect
        selectedProjectIds.delete(projectId);
        rowElement.classList.remove('selected');
        const badge = rowElement.querySelector('.selection-badge');
        if (badge) badge.remove();
        console.log(`➖ Deselected project: ${projectId}`);
    } else {
        // Select
        selectedProjectIds.add(projectId);
        rowElement.classList.add('selected');
        
        // Add badge
        let badge = rowElement.querySelector('.selection-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'selection-badge';
            badge.textContent = '✅ SELECTED';
            rowElement.style.position = 'relative';
            rowElement.appendChild(badge);
        }
        console.log(`➕ Selected project: ${projectId}`);
    }
    
    updateSelectionCounter();
    updateCurrentPageCount();
    
    // Store selections
    storeSelectedIdsViaBackground(Array.from(selectedProjectIds));
}

// Attach event listeners to overlay buttons
function attachOverlayEventListeners() {
    const confirmBtn = document.getElementById('confirm-selection-btn');
    const clearBtn = document.getElementById('clear-all-btn');
    const cancelBtn = document.getElementById('cancel-selection-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    const refreshBtn = document.getElementById('refresh-projects-btn');
    const viewSelectedBtn = document.getElementById('view-selected-btn');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleConfirmSelection);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllSelections);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideProjectSelectionOverlay);
    }
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllOnCurrentPage);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshCurrentPage);
    }
    
    if (viewSelectedBtn) {
        viewSelectedBtn.addEventListener('click', showSelectedProjectsList);
    }
}

// Select all projects on current page
function selectAllOnCurrentPage() {
    console.log('🎯 Selecting all projects on current page...');
    
    currentPageProjects.forEach(project => {
        if (!selectedProjectIds.has(project.id)) {
            selectedProjectIds.add(project.id);
        }
    });
    
    makeProjectRowsSelectable();
    updateSelectionCounter();
    updateCurrentPageCount();
    
    storeSelectedIdsViaBackground(Array.from(selectedProjectIds));
    
    console.log(`✅ Selected all ${currentPageProjects.length} projects on current page`);
}

// Refresh current page projects
function refreshCurrentPage() {
    console.log('🔄 Refreshing current page projects...');
    
    const projects = detectAllProjectsOnPage();
    makeProjectRowsSelectable();
    updateSelectionCounter();
    updateCurrentPageCount();
    
    console.log(`✅ Refreshed page - found ${projects.length} projects`);
}

// NEW: Refresh current page while maintaining overlay
function refreshCurrentPageWithOverlay() {
    console.log('🔄 Refreshing current page while maintaining overlay...');
    
    // Don't recreate overlay, just refresh the projects
    const projects = detectAllProjectsOnPage();
    makeProjectRowsSelectable();
    updateSelectionCounter();
    updateCurrentPageCount();
    
    console.log(`✅ Page refreshed with overlay maintained - found ${projects.length} projects`);
    
    // Show notification to user
    showNotification(`🔄 Page refreshed - found ${projects.length} projects. ${selectedProjectIds.size} total selected.`, 'info');
}

// Show list of selected projects
function showSelectedProjectsList() {
    const selectedList = Array.from(selectedProjectIds);
    
    if (selectedList.length === 0) {
        alert('No projects selected yet.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: white !important;
        padding: 20px !important;
        border-radius: 10px !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
        z-index: 1000000 !important;
        max-width: 80% !important;
        max-height: 80% !important;
        overflow: auto !important;
        pointer-events: auto !important;
    `;
    
    modal.innerHTML = `
        <h3>Selected Projects (${selectedList.length})</h3>
        <div style="max-height: 300px; overflow-y: auto; margin: 10px 0;">
            ${selectedList.map(id => `<div style="padding: 5px; border-bottom: 1px solid #eee;">Project ID: ${id}</div>`).join('')}
        </div>
        <button id="close-modal" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('close-modal').addEventListener('click', () => {
        modal.remove();
    });
}

// FIXED: Handle confirm button click - Now processes projects immediately
function handleConfirmSelection() {
    const selectedIds = Array.from(selectedProjectIds);
    
    if (selectedIds.length === 0) {
        alert('Please select at least one project');
        return;
    }
    
    console.log('📤 Confirm button clicked - Processing selected project IDs:', selectedIds);
    
    // Store selected IDs
    storeSelectedIdsViaBackground(selectedIds);
    
    // NEW: Send message to popup to actually process the projects
    chrome.runtime.sendMessage({
        action: 'processSelectedProjectsNow', // New action for immediate processing
        selectedIds: selectedIds
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Message send error:', chrome.runtime.lastError);
            // Fallback: store in DOM
            window.selectedProjectIds = selectedIds;
        } else {
            console.log('✅ Projects sent for processing');
        }
    });
    
    // Hide overlay after sending for processing
    hideProjectSelectionOverlay();
}

// Update selection counter
function updateSelectionCounter() {
    const countElement = document.getElementById('selection-count');
    const confirmBtn = document.getElementById('confirm-selection-btn');
    
    const count = selectedProjectIds.size;
    
    if (countElement) {
        countElement.textContent = `${count} projects selected across all pages`;
    }
    
    if (confirmBtn) {
        confirmBtn.disabled = count === 0;
        confirmBtn.innerHTML = `✔️ Confirm & Process ${count} Selected`;
    }
}

// Update current page count
function updateCurrentPageCount() {
    const countElement = document.getElementById('current-page-count');
    const currentPageSelected = currentPageProjects.filter(p => selectedProjectIds.has(p.id)).length;
    
    if (countElement) {
        countElement.textContent = `${currentPageSelected}/${currentPageProjects.length} projects selected on current page`;
    }
}

// Clear all selections
function clearAllSelections() {
    console.log('🗑️ Clearing all selections...');
    
    selectedProjectIds.clear();
    
    makeProjectRowsSelectable();
    updateSelectionCounter();
    updateCurrentPageCount();
    
    storeSelectedIdsViaBackground([]);
    
    console.log('✅ All selections cleared');
}

// Hide project selection overlay
function hideProjectSelectionOverlay() {
    console.log('👁️ Selection overlay hidden');
    
    const overlay = document.getElementById('project-selection-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Remove selection classes from project rows
    document.querySelectorAll('.project-row-selectable').forEach(el => {
        el.classList.remove('project-row-selectable', 'selected');
    });
    document.querySelectorAll('.selection-badge').forEach(el => el.remove());
    
    overlayActive = false;
    
    // Clean up page change observer
    if (window.pageChangeObserver) {
        window.pageChangeObserver.disconnect();
        window.pageChangeObserver = null;
    }
}

// FIXED: Enhanced setup for page change detection with overlay persistence
function setupPageChangeDetection() {
    if (window.pageChangeObserver) {
        window.pageChangeObserver.disconnect();
    }
    
    let currentUrl = window.location.href;
    
    const checkUrlChange = () => {
        if (window.location.href !== currentUrl) {
            console.log('🔄 Page URL changed, maintaining overlay...');
            const previousUrl = currentUrl;
            currentUrl = window.location.href;
            
            // Small delay to let new content load
            setTimeout(() => {
                if (overlayActive) {
                    console.log('✅ Overlay was active, maintaining it on new page...');
                    
                    // Re-detect projects on new page while keeping overlay
                    refreshCurrentPageWithOverlay();
                } else {
                    console.log('❌ Overlay was not active, not showing on new page');
                }
            }, 1500); // Increased delay for EstimateOne page loads
        }
    };
    
    // Check URL changes every 500ms for faster detection
    const urlCheckInterval = setInterval(checkUrlChange, 500);
    
    // Enhanced DOM change detection
    window.pageChangeObserver = new MutationObserver((mutations) => {
        let shouldRefresh = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        // Check for project elements or page content changes
                        if (node.querySelector && (
                            node.querySelector('span.styles__projectId__a99146050623e131a1bf') || 
                            node.querySelector('[id*="projectId_"]') ||
                            node.querySelector('tbody') ||
                            node.querySelector('.styles__tenderRow__b2e48989c7e9117bd552')
                        )) {
                            shouldRefresh = true;
                        }
                    }
                });
            }
        });
        
        if (shouldRefresh && overlayActive) {
            console.log('🔄 DOM changed, refreshing project selection while maintaining overlay...');
            clearTimeout(window.refreshTimeout);
            window.refreshTimeout = setTimeout(() => {
                refreshCurrentPageWithOverlay();
            }, 800); // Slightly longer delay for DOM stability
        }
    });
    
    // Observe with more comprehensive settings
    window.pageChangeObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false, // Don't watch attributes to reduce noise
        characterData: false // Don't watch text changes
    });
    
    // Enhanced cleanup
    window.addEventListener('beforeunload', () => {
        clearInterval(urlCheckInterval);
        if (window.pageChangeObserver) {
            window.pageChangeObserver.disconnect();
        }
    });
}

// NEW: Show notification to user
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        info: '#2196f3',
        warning: '#ff9800'
    };
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '80px', // Below the overlay header
        right: '20px',
        background: colors[type] || colors.info,
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: '1000001',
        fontSize: '14px',
        fontWeight: '600',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (overlayActive) {
        hideProjectSelectionOverlay();
    }
});

console.log('✅ Enhanced content script loaded with non-blocking overlay support');
