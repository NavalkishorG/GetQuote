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
    // NEW: Only these 2 new message handlers for popup detection
    else if (request.action === 'checkPopupStatus') {
        const popupStatus = checkIfPopupIsOpen();
        sendResponse({ success: true, popupStatus });
    } else if (request.action === 'getPopupProjectId') {
        const projectId = getProjectIdFromPopup();
        sendResponse({ success: true, projectId });
    }
});

// NEW: Check if popup is currently open (ONLY functionality addition)
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

// NEW: Get project ID from open popup (ONLY functionality addition)
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

// Initialize or restore selection session
async function initializeSelectionSession() {
    try {
        const sessionData = await getStorageData('projectSelectionSession');
        if (sessionData && sessionData.sessionId) {
            selectionSessionId = sessionData.sessionId;
            selectedProjectIds = new Set(sessionData.selectedIds || []);
            console.log(`🔄 Restored session ${selectionSessionId} with ${selectedProjectIds.size} selected projects`);
        } else {
            selectionSessionId = generateSessionId();
            selectedProjectIds = new Set();
            await saveSelectionSession();
            console.log(`🆕 Created new session ${selectionSessionId}`);
        }
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

// Save current selection session to storage
async function saveSelectionSession() {
    try {
        const sessionData = {
            sessionId: selectionSessionId,
            selectedIds: Array.from(selectedProjectIds),
            lastUpdated: Date.now(),
            currentUrl: window.location.href
        };
        await setStorageData('projectSelectionSession', sessionData);
        console.log(`💾 Saved session with ${selectedProjectIds.size} projects`);
    } catch (error) {
        console.error('❌ Error saving session:', error);
    }
}

// Clear selection session
async function clearSelectionSession() {
    try {
        selectedProjectIds.clear();
        await removeStorageData('projectSelectionSession');
        console.log('🗑️ Selection session cleared');
    } catch (error) {
        console.error('❌ Error clearing session:', error);
    }
}

// Storage helper functions
function getStorageData(key) {
    return new Promise((resolve) => {
        chrome.storage.session.get([key], (result) => {
            resolve(result[key]);
        });
    });
}

function setStorageData(key, value) {
    return new Promise((resolve) => {
        chrome.storage.session.set({[key]: value}, resolve);
    });
}

function removeStorageData(key) {
    return new Promise((resolve) => {
        chrome.storage.session.remove([key], resolve);
    });
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
                const projectContainer = element.closest('[class*="project"], .card, [class*="item"]') || element.parentElement.parentElement;
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
        const deadlineMatch = text.match(/closes?\s+in\s+(\d+)\s+days?/i) || text.match(/deadline[:\s]*([^,\n]+)/i);
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
    
    // Create overlay container with proper CSS
    const overlay = document.createElement('div');
    overlay.id = 'project-selection-overlay';
    overlay.innerHTML = `
        <style>
            #project-selection-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                z-index: 999999 !important;
                background: rgba(0, 0, 0, 0.85) !important;
                backdrop-filter: blur(8px) !important;
                padding: 20px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
            }
            .selection-header {
                background: white !important;
                padding: 20px !important;
                border-radius: 15px !important;
                box-shadow: 0 15px 35px rgba(0,0,0,0.3) !important;
                text-align: center !important;
            }
            .selection-status {
                margin: 15px 0 !important;
                font-size: 14px !important;
                color: #666 !important;
            }
            .selection-controls {
                display: flex !important;
                gap: 10px !important;
                justify-content: center !important;
                flex-wrap: wrap !important;
                margin-top: 20px !important;
            }
            .selection-controls button {
                padding: 10px 15px !important;
                border: none !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                font-weight: bold !important;
                font-size: 14px !important;
                transition: all 0.3s !important;
            }
            .refresh-btn { background: #17a2b8 !important; color: white !important; }
            #select-all-btn { background: #28a745 !important; color: white !important; }
            #clear-all-btn { background: #dc3545 !important; color: white !important; }
            #view-selected-btn { background: #6f42c1 !important; color: white !important; }
            #confirm-selection-btn { background: #007bff !important; color: white !important; }
            #confirm-selection-btn:disabled { background: #ccc !important; cursor: not-allowed !important; }
            #cancel-selection-btn { background: #6c757d !important; color: white !important; }
            .project-selection-indicator {
                position: absolute !important;
                background: white !important;
                border: 2px solid #007bff !important;
                border-radius: 15px !important;
                padding: 20px !important;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
                z-index: 1001 !important;
                min-width: 350px !important;
                max-width: 400px !important;
                font-size: 14px !important;
                cursor: pointer !important;
                line-height: 1.4 !important;
            }
            .project-selection-indicator.selected {
                background: #e8f5e8 !important;
                border: 3px solid #28a745 !important;
            }
            .selection-checkbox input[type="checkbox"] {
                display: inline-block !important;
                width: 20px !important;
                height: 20px !important;
                margin-right: 10px !important;
                cursor: pointer !important;
                transform: scale(1.5) !important;
            }
            .project-id-display {
                font-size: 18px !important;
                font-weight: bold !important;
                color: #000 !important;
                margin-bottom: 8px !important;
                width: 100% !important;
            }
            .selected-status {
                color: #28a745 !important;
                font-weight: bold !important;
                font-size: 14px !important;
                margin-top: 8px !important;
                text-align: center !important;
                background: #e8f5e8 !important;
                padding: 6px !important;
                border-radius: 4px !important;
            }
        </style>
        <div class="selection-header">
            <h3>🎯 Multi-Page Project Selection</h3>
            <div class="selection-status">
                <span id="selection-count">${selectedProjectIds.size} projects selected across all pages</span><br>
                <span id="current-page-count">0 projects on current page</span>
            </div>
            <div class="selection-controls">
                <button id="refresh-projects-btn" class="refresh-btn">🔄 Refresh Current Page</button>
                <button id="select-all-btn">✅ Select All on Page</button>
                <button id="clear-all-btn">❌ Clear All Selections</button>
                <button id="view-selected-btn">👁️ View Selected IDs</button>
                <button id="confirm-selection-btn" ${selectedProjectIds.size === 0 ? 'disabled' : ''}>
                    ✔️ Confirm ${selectedProjectIds.size} Selected
                </button>
                <button id="cancel-selection-btn">❌ Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // FIXED: Attach event handlers
    attachOverlayEventHandlers();
    
    // Detect and mark projects on current page
    refreshCurrentPageProjects();
}

// FIXED: Attach overlay event handlers
function attachOverlayEventHandlers() {
    // Refresh button
    document.getElementById('refresh-projects-btn')?.addEventListener('click', () => {
        console.log('🔄 Refresh button clicked');
        refreshCurrentPageProjects();
        showNotification('🔄 Page refreshed! Projects re-detected while preserving selections.', 'success');
    });
    
    // Select all button
    document.getElementById('select-all-btn')?.addEventListener('click', selectAllProjectsOnPage);
    
    // Clear all button
    document.getElementById('clear-all-btn')?.addEventListener('click', clearAllSelections);
    
    // View selected button
    document.getElementById('view-selected-btn')?.addEventListener('click', showSelectedProjectsList);
    
    // FIXED: Confirm button - send only selected IDs
    document.getElementById('confirm-selection-btn')?.addEventListener('click', () => {
        const selectedIds = Array.from(selectedProjectIds);
        console.log(`📤 SENDING ONLY SELECTED: ${selectedIds.length} projects:`, selectedIds);
        
        // Send ONLY selected project IDs to popup/script.js
        chrome.runtime.sendMessage({
            action: 'projectsSelected',
            selectedIds: selectedIds // This contains only user-selected IDs
        });
        
        hideProjectSelectionOverlay();
    });
    
    // Cancel button
    document.getElementById('cancel-selection-btn')?.addEventListener('click', hideProjectSelectionOverlay);
}

// NEW: Refresh current page projects while preserving selections
function refreshCurrentPageProjects() {
    console.log('🔄 Refreshing current page projects...');
    
    // Clear existing indicators
    document.querySelectorAll('.project-selection-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Re-detect projects on current page
    const currentPageProjects = detectAllProjectsOnPage();
    let currentPageCount = 0;
    
    // Add selection indicators to all detected projects
    allDetectedProjects.forEach((project, index) => {
        currentPageCount++;
        addProjectSelectionIndicator(project, index);
    });
    
    // Update counters
    updateSelectionCounters(currentPageCount);
    
    console.log(`✅ Refreshed: Found ${currentPageCount} projects on current page, ${selectedProjectIds.size} total selected`);
}

// Update selection counters in overlay
function updateSelectionCounters(currentPageCount) {
    const selectionCountEl = document.getElementById('selection-count');
    const currentPageCountEl = document.getElementById('current-page-count');
    const confirmBtn = document.getElementById('confirm-selection-btn');
    
    if (selectionCountEl) {
        selectionCountEl.textContent = `${selectedProjectIds.size} projects selected across all pages`;
    }
    
    if (currentPageCountEl) {
        currentPageCountEl.textContent = `${currentPageCount} projects on current page`;
    }
    
    if (confirmBtn) {
        confirmBtn.disabled = selectedProjectIds.size === 0;
        confirmBtn.textContent = `✔️ Confirm ${selectedProjectIds.size} Selected`;
    }
}

// FIXED: Add selection indicator to project
function addProjectSelectionIndicator(project, index) {
    if (!project.container) return;
    
    const isSelected = selectedProjectIds.has(project.id);
    
    // Create selection indicator
    const indicator = document.createElement('div');
    indicator.className = 'project-selection-indicator' + (isSelected ? ' selected' : '');
    indicator.innerHTML = `
        <div class="selection-controls-wrapper">
            <div class="selection-checkbox">
                <input type="checkbox" id="project-${project.id}" ${isSelected ? 'checked' : ''}>
                <label for="project-${project.id}" style="display: flex; align-items: center; cursor: pointer; width: 100%;">
                    <div class="project-id-display">
                        🆔 PROJECT ID: <span style="color: #007bff; font-size: 20px;">${project.id}</span>
                    </div>
                </label>
            </div>
            <div class="project-details-section" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                <div style="font-size: 12px; color: #666; line-height: 1.4;">
                    📋 <strong>Title:</strong> ${project.title}<br>
                    ⏰ <strong>Deadline:</strong> ${project.deadline}<br>
                    💰 <strong>Value:</strong> ${project.value}
                </div>
                ${isSelected ? '<div class="selected-status">✅ SELECTED</div>' : ''}
            </div>
        </div>
    `;
    
    // Position indicator relative to project container
    const rect = project.container.getBoundingClientRect();
    indicator.style.position = 'absolute';
    indicator.style.top = (window.scrollY + rect.top - 10) + 'px';
    indicator.style.left = (window.scrollX + rect.right + 10) + 'px';
    indicator.style.zIndex = '999999';
    
    // FIXED: Add click handler for checkbox
    const checkbox = indicator.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggleProjectSelection(project.id, e.target.checked);
    });
    
    // Add click handler for the whole indicator
    indicator.addEventListener('click', (e) => {
        if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
            toggleProjectSelection(project.id, checkbox.checked);
        }
    });
    
    // Add to page
    document.body.appendChild(indicator);
    
    // Store reference
    indicator.setAttribute('data-project-id', project.id);
    project.container.setAttribute('data-project-id', project.id);
}

// Toggle project selection with persistence
async function toggleProjectSelection(projectId, isSelected) {
    if (isSelected) {
        selectedProjectIds.add(projectId);
        console.log(`✅ Selected project ${projectId}`);
    } else {
        selectedProjectIds.delete(projectId);
        console.log(`❌ Deselected project ${projectId}`);
    }
    
    // Save to persistent storage
    await saveSelectionSession();
    
    // Update UI
    updateProjectIndicator(projectId, isSelected);
    updateSelectionCounters(allDetectedProjects.length);
}

// Update individual project indicator
function updateProjectIndicator(projectId, isSelected) {
    const indicator = document.querySelector(`[data-project-id="${projectId}"].project-selection-indicator`);
    if (!indicator) return;
    
    const checkbox = indicator.querySelector('input[type="checkbox"]');
    const selectedStatus = indicator.querySelector('.selected-status');
    
    if (checkbox) {
        checkbox.checked = isSelected;
    }
    
    // Update styling
    if (isSelected) {
        indicator.classList.add('selected');
        
        // Add selected status if not exists
        if (!selectedStatus) {
            const detailsSection = indicator.querySelector('.project-details-section');
            if (detailsSection) {
                detailsSection.innerHTML += '<div class="selected-status">✅ SELECTED</div>';
            }
        }
    } else {
        indicator.classList.remove('selected');
        
        // Remove selected status
        if (selectedStatus) {
            selectedStatus.remove();
        }
    }
}

// Select all projects on current page
async function selectAllProjectsOnPage() {
    console.log('✅ Selecting all projects on current page...');
    
    for (const project of allDetectedProjects) {
        selectedProjectIds.add(project.id);
        updateProjectIndicator(project.id, true);
    }
    
    await saveSelectionSession();
    updateSelectionCounters(allDetectedProjects.length);
    showNotification(`✅ Selected all ${allDetectedProjects.length} projects on current page!`, 'success');
}

// Clear all selections across all pages
async function clearAllSelections() {
    console.log('🗑️ Clearing all selections...');
    
    // Clear from current page indicators
    for (const project of allDetectedProjects) {
        updateProjectIndicator(project.id, false);
    }
    
    // Clear from storage
    selectedProjectIds.clear();
    await saveSelectionSession();
    updateSelectionCounters(allDetectedProjects.length);
    showNotification('🗑️ All selections cleared across all pages!', 'info');
}

// Show list of selected project IDs
function showSelectedProjectsList() {
    const selectedIds = Array.from(selectedProjectIds);
    
    if (selectedIds.length === 0) {
        showNotification('No projects selected yet!', 'info');
        return;
    }
    
    const idsList = selectedIds.sort((a, b) => parseInt(a) - parseInt(b)).join(', ');
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'selected-projects-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        z-index: 1000002;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 25px; border-radius: 15px; 
                    box-shadow: 0 15px 35px rgba(0,0,0,0.3); max-width: 600px; max-height: 500px; 
                    overflow-y: auto; margin: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #333;">📋 Selected Projects (${selectedIds.length})</h3>
                <button id="close-modal-btn" style="background: #dc3545; color: white; border: none; 
                        width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 16px; 
                        display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; font-family: monospace; 
                        font-size: 14px; max-height: 300px; overflow-y: auto; word-wrap: break-word;">
                ${selectedIds.map(id => `<span style="display: inline-block; background: #007bff; color: white; 
                    padding: 4px 8px; margin: 2px; border-radius: 4px;">${id}</span>`).join('')}
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <button id="copy-ids-btn" style="background: #28a745; color: white; border: none; 
                        padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-right: 10px;">
                    📋 Copy IDs
                </button>
                <button id="close-modal-btn-2" style="background: #6c757d; color: white; border: none; 
                        padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add working event listeners
    const closeModal = () => {
        if (modal.parentElement) {
            modal.remove();
        }
    };
    
    modal.querySelector('#close-modal-btn').addEventListener('click', closeModal);
    modal.querySelector('#close-modal-btn-2').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Copy functionality
    modal.querySelector('#copy-ids-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(idsList).then(() => {
            showNotification('Project IDs copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy IDs', 'error');
        });
    });
}

// Hide selection overlay
function hideProjectSelectionOverlay() {
    const overlay = document.getElementById('project-selection-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Remove all selection indicators
    document.querySelectorAll('.project-selection-indicator').forEach(indicator => {
        indicator.remove();
    });
    
    // Reset project containers
    document.querySelectorAll('[data-project-id]').forEach(container => {
        container.removeAttribute('data-project-id');
    });
    
    overlayActive = false;
    console.log('👁️ Selection overlay hidden');
}

// Show notification to user
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
        top: '20px',
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
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 4000);
}

console.log('✅ Enhanced multi-page project selection script loaded successfully');
