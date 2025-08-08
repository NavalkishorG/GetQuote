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
});

// Initialize or restore selection session
async function initializeSelectionSession() {
    try {
        // Generate unique session ID if not exists
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
                // Find the parent project container
                const projectContainer = element.closest('[class*="project"], .card, [class*="item"]') || 
                                       element.parentElement.parentElement;
                
                // Extract additional project info
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
        // Try to find project title
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
        
        // Try to find deadline
        const text = container.textContent || '';
        const deadlineMatch = text.match(/closes?\s+in\s+(\d+)\s+days?/i) || 
                             text.match(/deadline[:\s]*([^,\n]+)/i);
        if (deadlineMatch) {
            info.deadline = deadlineMatch[1];
        }
        
        // Try to find value
        const valueMatch = text.match(/\$[\d,.]+(M|K|k|m)?/i);
        if (valueMatch) {
            info.value = valueMatch[0];
        }
        
        // Count trades
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
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'project-selection-overlay';
    overlay.innerHTML = `
        <div class="selection-header">
            <h3>🎯 Multi-Page Project Selection</h3>
            <div class="selection-status">
                <span id="selection-count">${selectedProjectIds.size} projects selected across all pages</span>
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
    
    // Apply enhanced styles
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        zIndex: '999999',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    });
    
    document.body.appendChild(overlay);
    
    // Add event listeners for enhanced controls
    attachEnhancedOverlayEventListeners();
    
    // Detect and mark projects on current page
    refreshCurrentPageProjects();
}

// Attach event listeners for enhanced overlay controls
function attachEnhancedOverlayEventListeners() {
    // Refresh button - NEW FEATURE
    document.getElementById('refresh-projects-btn')?.addEventListener('click', () => {
        console.log('🔄 Refresh button clicked');
        refreshCurrentPageProjects();
        showNotification('🔄 Page refreshed! Projects re-detected while preserving selections.', 'success');
    });
    
    document.getElementById('select-all-btn')?.addEventListener('click', selectAllProjectsOnPage);
    document.getElementById('clear-all-btn')?.addEventListener('click', clearAllSelections);
    document.getElementById('view-selected-btn')?.addEventListener('click', showSelectedProjectsList);
    document.getElementById('confirm-selection-btn')?.addEventListener('click', confirmSelection);
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

// Add selection indicator to project
function addProjectSelectionIndicator(project, index) {
    if (!project.container) return;
    
    const isSelected = selectedProjectIds.has(project.id);
    
    // Create selection indicator
    const indicator = document.createElement('div');
    indicator.className = 'project-selection-indicator';
    indicator.innerHTML = `
        <div class="selection-checkbox">
            <input type="checkbox" id="project-${project.id}" ${isSelected ? 'checked' : ''} style="display: block; width: 18px; height: 18px; margin-right: 8px;">
            <label for="project-${project.id}" style="display: flex; align-items: center; cursor: pointer; font-size: 14px;">
                <div class="checkmark-container" style="margin-right: 10px;">
                    <span class="checkmark" style="font-size: 16px; color: ${isSelected ? '#28a745' : '#ccc'};">${isSelected ? '✅' : '☐'}</span>
                </div>
                <div class="project-info" style="flex: 1;">
                    <div style="font-size: 16px; font-weight: bold; color: #000; margin-bottom: 4px;">
                        🆔 PROJECT ID: ${project.id}
                    </div>
                    <div style="font-size: 12px; color: #666; line-height: 1.3;">
                        📋 ${project.title}<br>
                        ⏰ ${project.deadline}<br>
                        💰 ${project.value}
                    </div>
                    ${isSelected ? '<div style="color: #28a745; font-weight: bold; font-size: 12px; margin-top: 4px;">✅ SELECTED</div>' : ''}
                </div>
            </label>
        </div>
    `;
    
            // Style the indicator
    Object.assign(indicator.style, {
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        background: isSelected ? '#e8f5e8' : 'white',
        border: isSelected ? '3px solid #28a745' : '2px solid #007bff',
        borderRadius: '12px',
        padding: '15px',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
        zIndex: '1000',
        minWidth: '320px',
        maxWidth: '400px',
        fontSize: '14px',
        cursor: 'pointer'
    });

    
    
    // Add click handler for selection toggle
    const checkbox = indicator.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (e) => {
        toggleProjectSelection(project.id, e.target.checked);
    });
    
    // Position indicator relative to project container
    project.container.style.position = 'relative';
    project.container.appendChild(indicator);
    
    // Add data attribute for easier identification
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
    const container = document.querySelector(`[data-project-id="${projectId}"]`);
    if (!container) return;
    
    const indicator = container.querySelector('.project-selection-indicator');
    const checkbox = indicator?.querySelector('input[type="checkbox"]');
    const checkmark = indicator?.querySelector('.checkmark');
    const selectedStatus = indicator?.querySelector('div[style*="color: #28a745"]');
    
    if (indicator && checkbox && checkmark) {
        checkbox.checked = isSelected;
        checkmark.textContent = isSelected ? '✅' : '☐';
        checkmark.style.color = isSelected ? '#28a745' : '#ccc';
        
        // Update styling
        indicator.style.background = isSelected ? '#e8f5e8' : 'white';
        indicator.style.border = isSelected ? '3px solid #28a745' : '2px solid #007bff';
        
        // Update selected status text
        if (isSelected && !selectedStatus) {
            const projectInfo = indicator.querySelector('.project-info');
            if (projectInfo) {
                projectInfo.innerHTML += '<div style="color: #28a745; font-weight: bold; font-size: 12px; margin-top: 4px;">✅ SELECTED</div>';
            }
        } else if (!isSelected && selectedStatus) {
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
    const message = `Selected Project IDs (${selectedIds.length}):\n\n${idsList}`;
    
    // Create modal to show selected IDs
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 20px; border-radius: 10px; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 1000000; max-width: 500px; max-height: 400px; overflow-y: auto;">
            <h3>📋 Selected Projects (${selectedIds.length})</h3>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px; max-height: 250px; overflow-y: auto;">
                ${idsList}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Close
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Confirm selection and send to popup
async function confirmSelection() {
    const selectedIds = Array.from(selectedProjectIds);
    console.log(`✔️ Confirming selection of ${selectedIds.length} projects:`, selectedIds);
    
    if (selectedIds.length === 0) {
        showNotification('No projects selected!', 'error');
        return;
    }
    
    // Send message to popup/background script
    chrome.runtime.sendMessage({
        action: 'projectsSelected',
        selectedIds: selectedIds,
        sessionId: selectionSessionId
    });
    
    // Clear session after confirmation
    await clearSelectionSession();
    
    // Hide overlay
    hideProjectSelectionOverlay();
    
    showNotification(`🎉 Successfully confirmed ${selectedIds.length} projects for processing!`, 'success');
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
        container.style.position = '';
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

// Listen for page navigation to restore selections
window.addEventListener('beforeunload', async () => {
    if (selectedProjectIds.size > 0) {
        await saveSelectionSession();
        console.log('💾 Saved selections before page unload');
    }
});

// Auto-restore selections when returning to a page
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        if (selectedProjectIds.size > 0) {
            console.log(`🔄 Page loaded with ${selectedProjectIds.size} existing selections`);
        }
    }, 1000);
});

console.log('✅ Enhanced multi-page project selection script loaded successfully');
