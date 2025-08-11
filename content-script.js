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

// Add selection indicator to project - COMPLETE FIXED VERSION
function addProjectSelectionIndicator(project, index) {
    if (!project.container) return;
    
    const isSelected = selectedProjectIds.has(project.id);
    
    // Create selection indicator
    const indicator = document.createElement('div');
    indicator.className = 'project-selection-indicator';
    indicator.innerHTML = `
        <div class="selection-controls-wrapper">
            <div class="selection-checkbox">
                <input type="checkbox" id="project-${project.id}" ${isSelected ? 'checked' : ''} 
                       style="display: inline-block !important; width: 20px; height: 20px; margin-right: 10px; cursor: pointer; transform: scale(1.5);">
                <label for="project-${project.id}" style="display: flex; align-items: center; cursor: pointer; width: 100%;">
                    <div class="project-id-display" style="font-size: 18px; font-weight: bold; color: #000; margin-bottom: 8px; width: 100%;">
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
                ${isSelected ? '<div class="selected-status" style="color: #28a745; font-weight: bold; font-size: 14px; margin-top: 8px; text-align: center; background: #e8f5e8; padding: 6px; border-radius: 4px;">✅ SELECTED</div>' : ''}
            </div>
        </div>
    `;

    // Style the indicator with better dimensions
    Object.assign(indicator.style, {
        position: 'absolute',
        top: '-25px',
        right: '-25px',
        background: isSelected ? '#e8f5e8' : 'white',
        border: isSelected ? '3px solid #28a745' : '2px solid #007bff',
        borderRadius: '15px',
        padding: '20px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        zIndex: '1001',
        minWidth: '350px',
        maxWidth: '400px',
        fontSize: '14px',
        cursor: 'pointer',
        lineHeight: '1.4'
    });

    // Add click handler for selection toggle - THIS WAS MISSING!
    const checkbox = indicator.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (e) => {
        toggleProjectSelection(project.id, e.target.checked);
    });
    
    // Position indicator relative to project container - THIS WAS MISSING!
    project.container.style.position = 'relative';
    project.container.appendChild(indicator);
    
    // Add data attribute for easier identification - THIS WAS MISSING!
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

// Update individual project indicator - FIXED VERSION
function updateProjectIndicator(projectId, isSelected) {
    const container = document.querySelector(`[data-project-id="${projectId}"]`);
    if (!container) return;
    
    const indicator = container.querySelector('.project-selection-indicator');
    const checkbox = indicator?.querySelector('input[type="checkbox"]');
    const selectedStatus = indicator?.querySelector('.selected-status');
    
    if (indicator && checkbox) {
        checkbox.checked = isSelected;
        
        // Update styling
        indicator.style.background = isSelected ? '#e8f5e8' : 'white';
        indicator.style.border = isSelected ? '3px solid #28a745' : '2px solid #007bff';
        
        // Update selected status text
        if (isSelected && !selectedStatus) {
            const detailsSection = indicator.querySelector('.project-details-section');
            if (detailsSection) {
                detailsSection.innerHTML += '<div class="selected-status" style="color: #28a745; font-weight: bold; font-size: 14px; margin-top: 8px; text-align: center; background: #e8f5e8; padding: 6px; border-radius: 4px;">✅ SELECTED</div>';
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

// Show list of selected project IDs with working close button - FIXED VERSION
function showSelectedProjectsList() {
    const selectedIds = Array.from(selectedProjectIds);
    
    if (selectedIds.length === 0) {
        showNotification('No projects selected yet!', 'info');
        return;
    }
    
    const idsList = selectedIds.sort((a, b) => parseInt(a) - parseInt(b)).join(', ');
    
    // Create modal with proper event handling
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
    
    // Multiple ways to close the modal
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
    
    // ESC key to close
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
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
