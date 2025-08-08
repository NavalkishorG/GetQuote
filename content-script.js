// Content Script for Project Selection Overlay
console.log('🚀 Content script loaded');

let selectedProjectIds = new Set();
let allDetectedProjects = [];
let overlayActive = false;

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
                    ...projectInfo
                });
                
                console.log(`📋 Project ${index + 1}: ID ${projectId}`);
            }
        });
        
        allDetectedProjects = projects;
        console.log(`✅ Detected ${projects.length} projects total`);
        
        return projects.map(p => ({
            id: p.id,
            title: p.title,
            deadline: p.deadline,
            value: p.value,
            trades: p.trades
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

// Show visual selection overlay
function showProjectSelectionOverlay() {
    if (overlayActive) return;
    
    console.log('👁️ Showing selection overlay...');
    overlayActive = true;
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'project-selection-overlay';
    overlay.innerHTML = `
        <div class="selection-header">
            <h3>📋 Select Projects to Scrape</h3>
            <div class="selection-controls">
                <button id="select-all-btn">Select All</button>
                <button id="clear-all-btn">Clear All</button>
                <button id="confirm-selection-btn">Confirm (0)</button>
                <button id="cancel-selection-btn">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Add visual indicators to each project
    allDetectedProjects.forEach((project, index) => {
        addProjectSelectionIndicator(project, index);
    });
    
    // Attach event listeners
    attachOverlayEventListeners();
    
    console.log('✅ Overlay displayed with', allDetectedProjects.length, 'projects');
}

// Add selection indicator to individual project
function addProjectSelectionIndicator(project, index) {
    if (!project.container) return;
    
    // Create selection checkbox
    const indicator = document.createElement('div');
    indicator.className = 'project-selection-indicator';
    indicator.dataset.projectId = project.id;
    indicator.innerHTML = `
        <div class="selection-checkbox">
            <input type="checkbox" id="project-${project.id}">
            <label for="project-${project.id}">
                <span class="checkmark">✓</span>
            </label>
        </div>
        <div class="project-info">
            <strong>ID: ${project.id}</strong>
            <div class="project-details">
                <div>${project.title}</div>
                <div>💰 ${project.value} | 📅 ${project.deadline}</div>
            </div>
        </div>
    `;
    
    // Position and style the indicator
    const rect = project.container.getBoundingClientRect();
    project.container.style.position = 'relative';
    project.container.style.border = '2px dashed #007cba';
    project.container.style.borderRadius = '8px';
    
    // Add click handler to container
    project.container.addEventListener('click', () => toggleProjectSelection(project.id));
    project.container.style.cursor = 'pointer';
    
    // Insert indicator
    project.container.insertBefore(indicator, project.container.firstChild);
}

// Toggle project selection
function toggleProjectSelection(projectId) {
    const checkbox = document.querySelector(`#project-${projectId}`);
    const container = document.querySelector(`[data-project-id="${projectId}"]`)?.closest('[class*="project"], .card, [class*="item"]');
    
    if (selectedProjectIds.has(projectId)) {
        selectedProjectIds.delete(projectId);
        if (checkbox) checkbox.checked = false;
        if (container) {
            container.style.border = '2px dashed #007cba';
            container.style.backgroundColor = '';
        }
    } else {
        selectedProjectIds.add(projectId);
        if (checkbox) checkbox.checked = true;
        if (container) {
            container.style.border = '3px solid #28a745';
            container.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        }
    }
    
    updateSelectionCount();
    console.log('🔄 Selection toggled for project', projectId, 'Total selected:', selectedProjectIds.size);
}

// Update selection count in UI
function updateSelectionCount() {
    const confirmBtn = document.getElementById('confirm-selection-btn');
    if (confirmBtn) {
        confirmBtn.textContent = `Confirm (${selectedProjectIds.size})`;
        confirmBtn.disabled = selectedProjectIds.size === 0;
    }
}

// Attach event listeners to overlay controls
function attachOverlayEventListeners() {
    document.getElementById('select-all-btn')?.addEventListener('click', () => {
        allDetectedProjects.forEach(project => {
            selectedProjectIds.add(project.id);
            const checkbox = document.querySelector(`#project-${project.id}`);
            if (checkbox) checkbox.checked = true;
        });
        updateVisualSelection();
        updateSelectionCount();
    });
    
    document.getElementById('clear-all-btn')?.addEventListener('click', () => {
        selectedProjectIds.clear();
        allDetectedProjects.forEach(project => {
            const checkbox = document.querySelector(`#project-${project.id}`);
            if (checkbox) checkbox.checked = false;
        });
        updateVisualSelection();
        updateSelectionCount();
    });
    
    document.getElementById('confirm-selection-btn')?.addEventListener('click', () => {
        if (selectedProjectIds.size > 0) {
            // Send selected projects to popup
            chrome.runtime.sendMessage({
                action: 'projectsSelected',
                selectedIds: Array.from(selectedProjectIds)
            });
            hideProjectSelectionOverlay();
        }
    });
    
    document.getElementById('cancel-selection-btn')?.addEventListener('click', () => {
        hideProjectSelectionOverlay();
    });
}

// Update visual selection state
function updateVisualSelection() {
    allDetectedProjects.forEach(project => {
        const container = project.container;
        if (selectedProjectIds.has(project.id)) {
            container.style.border = '3px solid #28a745';
            container.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        } else {
            container.style.border = '2px dashed #007cba';
            container.style.backgroundColor = '';
        }
    });
}

// Hide selection overlay
function hideProjectSelectionOverlay() {
    console.log('👁️ Hiding selection overlay...');
    overlayActive = false;
    selectedProjectIds.clear();
    
    // Remove overlay
    const overlay = document.getElementById('project-selection-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Remove indicators and reset styling
    allDetectedProjects.forEach(project => {
        if (project.container) {
            project.container.style.border = '';
            project.container.style.backgroundColor = '';
            project.container.style.cursor = '';
            
            // Remove selection indicator
            const indicator = project.container.querySelector('.project-selection-indicator');
            if (indicator) {
                indicator.remove();
            }
        }
    });
    
    console.log('✅ Overlay hidden and cleanup completed');
}
