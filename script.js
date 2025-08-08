document.addEventListener('DOMContentLoaded', async function() {
    console.log('Extension popup loaded');
    
    // Check if user is already authenticated
    const token = await getStoredToken();
    console.log('Stored token exists:', !!token);
    
    if (token) {
        try {
            const user = await verifyToken(token);
            if (user) {
                console.log('User verified:', user.email);
                showAuthenticatedUI(user);
                return;
            }
        } catch (error) {
            console.log('Token verification failed:', error);
            await clearStoredToken();
        }
    }
    
    // Show login form if no valid token
    showLoginForm();
});

// UI Management Functions
function showLoginForm() {
    console.log('Showing login form');
    hideAllForms();
    document.getElementById('login-form').style.display = 'block';
    clearErrors();
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    attachLoginEventListeners();
}

function showSignupForm() {
    console.log('Showing signup form');
    hideAllForms();
    document.getElementById('signup-form').style.display = 'block';
    clearErrors();
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    attachSignupEventListeners();
}

function showAuthenticatedUI(user) {
    console.log('Showing authenticated UI for:', user.email);
    hideAllForms();
    document.getElementById('authenticated-ui').style.display = 'block';
    updateCredentialStatus(user);
    clearErrors();
    attachAuthenticatedEventListeners();
}

function updateCredentialStatus(user) {
    const statusElement = document.getElementById('credential-status');
    const statusText = document.getElementById('credential-status-text');
    console.log('Updating credential status:', user.credentials_stored);
    
    if (user.credentials_stored) {
        statusElement.className = 'credential-status stored';
        statusText.textContent = '✓ EstimateOne credentials stored securely';
    } else {
        statusElement.className = 'credential-status not-stored';
        statusText.textContent = '⚠ EstimateOne credentials not stored. Please login again.';
    }
}

function showLoading() {
    console.log('Showing loading state');
    hideAllForms();
    document.getElementById('loading').style.display = 'block';
}

function hideAllForms() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('authenticated-ui').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
}

function clearErrors() {
    const errorElements = [
        'error-message',
        'signup-error-message',
        'scrape-error-message',
        'scrape-success-message'
    ];
    errorElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
            element.textContent = '';
        }
    });
}

function showError(elementId, message) {
    console.error('Error:', message);
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function showSuccess(elementId, message) {
    console.log('Success:', message);
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
    }
}

// Button State Management
function disableAllButtons() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
    });
}

function enableAllButtons() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
    });
}

// Event Listener Management
function attachLoginEventListeners() {
    const loginBtn = document.getElementById('login-btn');
    const showSignupBtn = document.getElementById('show-signup-btn');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const forgotPassword = document.getElementById('forgot-password');

    if (loginBtn) {
        loginBtn.replaceWith(loginBtn.cloneNode(true));
        document.getElementById('login-btn').addEventListener('click', handleLogin);
    }

    if (showSignupBtn) {
        showSignupBtn.replaceWith(showSignupBtn.cloneNode(true));
        document.getElementById('show-signup-btn').addEventListener('click', showSignupForm);
    }

    if (loginEmail) {
        loginEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }

    if (forgotPassword) {
        forgotPassword.addEventListener('click', () => {
            chrome.tabs.create({url: 'https://app.estimateone.com/auth/forgot-password'});
        });
    }
}

function attachSignupEventListeners() {
    const signupBtn = document.getElementById('signup-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const signupEmail = document.getElementById('signup-email');
    const signupPassword = document.getElementById('signup-password');

    if (signupBtn) {
        signupBtn.replaceWith(signupBtn.cloneNode(true));
        document.getElementById('signup-btn').addEventListener('click', handleSignup);
    }

    if (showLoginBtn) {
        showLoginBtn.replaceWith(showLoginBtn.cloneNode(true));
        document.getElementById('show-login-btn').addEventListener('click', showLoginForm);
    }

    if (signupEmail) {
        signupEmail.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSignup();
        });
    }

    if (signupPassword) {
        signupPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSignup();
        });
    }
}

function attachAuthenticatedEventListeners() {
    console.log('Attaching authenticated event listeners...');
    const logoutBtn = document.getElementById('logout-btn');
    const scrapeTendersBtn = document.getElementById('scrape-tenders-btn');
    const scrapeSelectedBtn = document.getElementById('scrape-selected-btn');
    const checkCredentialsBtn = document.getElementById('check-credentials-btn');
    const detectProjectIdBtn = document.getElementById('detect-project-id-btn');
    const viewDashboardBtn = document.getElementById('view-dashboard-btn');

    if (logoutBtn) {
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
    }

    if (scrapeTendersBtn) {
        scrapeTendersBtn.replaceWith(scrapeTendersBtn.cloneNode(true));
        document.getElementById('scrape-tenders-btn').addEventListener('click', handleScrapeTenders);
    }

    // NEW: Scrape Selected Projects button
    if (scrapeSelectedBtn) {
        scrapeSelectedBtn.replaceWith(scrapeSelectedBtn.cloneNode(true));
        document.getElementById('scrape-selected-btn').addEventListener('click', handleScrapeSelectedProjects);
    }

    if (checkCredentialsBtn) {
        checkCredentialsBtn.replaceWith(checkCredentialsBtn.cloneNode(true));
        document.getElementById('check-credentials-btn').addEventListener('click', handleCheckCredentials);
    }

    if (detectProjectIdBtn) {
        detectProjectIdBtn.replaceWith(detectProjectIdBtn.cloneNode(true));
        document.getElementById('detect-project-id-btn').addEventListener('click', handleDetectProjectId);
    }

    if (viewDashboardBtn) {
        viewDashboardBtn.replaceWith(viewDashboardBtn.cloneNode(true));
        document.getElementById('view-dashboard-btn').addEventListener('click', handleViewDashboard);
        console.log('Dashboard button listener attached');
    }
}

// Dashboard Functions
let dashboardWindowId = null;

async function handleViewDashboard() {
    console.log('View dashboard button clicked');
    try {
        chrome.windows.getCurrent(async (currentWindow) => {
            const targetURL = 'dashboard.html';
            
            chrome.windows.getAll({populate: true, windowTypes: ['popup']}, (windowArray) => {
                const queryURL = `chrome-extension://${chrome.runtime.id}/${targetURL}`;
                const existingDashboard = windowArray.find(window => 
                    window.tabs && window.tabs[0] && window.tabs[0].url === queryURL
                );
                
                if (existingDashboard) {
                    chrome.windows.update(existingDashboard.id, {focused: true});
                    console.log('Focused existing dashboard window');
                    return;
                }
                
                const width = Math.round(currentWindow.width * 0.7);
                const height = Math.round(currentWindow.height * 0.8);
                const left = Math.round((currentWindow.width - width) * 0.5 + currentWindow.left);
                const top = Math.round((currentWindow.height - height) * 0.5 + currentWindow.top);
                
                chrome.windows.create({
                    focused: true,
                    url: targetURL,
                    type: 'popup',
                    width: width,
                    height: height,
                    left: left,
                    top: top
                }, (newWindow) => {
                    if (newWindow) {
                        dashboardWindowId = newWindow.id;
                        console.log('Created new dashboard window:', dashboardWindowId);
                    } else {
                        console.error('Failed to create dashboard window');
                        showError('scrape-error-message', 'Failed to open dashboard window');
                    }
                });
            });
        });
    } catch (error) {
        console.error('Error opening dashboard:', error);
        showError('scrape-error-message', 'Failed to open dashboard window');
    }
}

// NEW: Handle Scrape Selected Projects
async function handleScrapeSelectedProjects() {
    console.log('🎯 Scrape Selected Projects button clicked');
    disableAllButtons();
    
    try {
        const token = await getStoredToken();
        if (!token) {
            showError('scrape-error-message', 'Please login first');
            showLoginForm();
            return;
        }

        // Get current tab
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab.url.includes('estimateone.com')) {
            showError('scrape-error-message', 'Please navigate to an EstimateOne page first');
            return;
        }

        // Try to inject content script first, then send message
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content-script.js']
            });
            
            // Small delay to ensure script is loaded
            await new Promise(resolve => setTimeout(resolve, 500));
            
            showSuccess('scrape-success-message', '🔍 Detecting projects on page...');
            
            const detectResponse = await chrome.tabs.sendMessage(tab.id, {
                action: 'detectAllProjects'
            });

            if (!detectResponse || !detectResponse.success || detectResponse.projects.length === 0) {
                showError('scrape-error-message', 'No projects found on this page');
                return;
            }

            showSuccess('scrape-success-message', 
                `✅ Found ${detectResponse.projects.length} projects. Click on projects to select them.`);

            // Show selection overlay
            await chrome.tabs.sendMessage(tab.id, {
                action: 'showSelectionOverlay'
            });

            // Listen for user selection
            chrome.runtime.onMessage.addListener(handleProjectSelection);
            
            showSuccess('scrape-success-message', 
                '👆 Select projects on the page, then click "Confirm" in the overlay');

        } catch (contentScriptError) {
            console.error('Content script error:', contentScriptError);
            showError('scrape-error-message', 'Failed to load project selection interface. Please refresh the page and try again.');
        }

    } catch (error) {
        console.error('❌ Error in scrape selected projects:', error);
        showError('scrape-error-message', 'Failed to initialize project selection');
    } finally {
        enableAllButtons();
    }
}

// NEW: Handle project selection from content script
async function handleProjectSelection(request, sender, sendResponse) {
    if (request.action === 'projectsSelected') {
        console.log('📋 Projects selected:', request.selectedIds);
        
        try {
            const token = await getStoredToken();
            if (!token) {
                showError('scrape-error-message', 'Session expired. Please login again.');
                return;
            }

            if (request.selectedIds.length === 0) {
                showError('scrape-error-message', 'No projects selected');
                return;
            }

            // Show progress
            showSuccess('scrape-success-message', 
                `🚀 Processing ${request.selectedIds.length} selected projects...`);

            // Process selected projects
            await processSelectedProjects(request.selectedIds, token);

        } catch (error) {
            console.error('❌ Error processing selected projects:', error);
            showError('scrape-error-message', 'Failed to process selected projects');
        }
    }
}

// NEW: Process selected projects
async function processSelectedProjects(selectedIds, token) {
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < selectedIds.length; i++) {
        const projectId = selectedIds[i];
        
        try {
            showSuccess('scrape-success-message', 
                `⏳ Processing project ${i + 1}/${selectedIds.length}: ID ${projectId}`);

            // Call your existing scraping API with specific project ID
            const response = await fetch(`${window.ExtensionConfig.API_BASE_URL}/scrapper/scrape-project`, {
                method: 'POST',
                headers: {
                    ...window.ExtensionConfig.getRequestHeaders(),
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    project_id: projectId,
                    url: window.location.href
                })
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                successCount++;
                console.log(`✅ Project ${projectId} processed successfully`);
            } else {
                errorCount++;
                console.log(`❌ Project ${projectId} failed:`, data.detail);
            }

            // Small delay between requests to avoid rate limiting
            if (i < selectedIds.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

        } catch (error) {
            errorCount++;
            console.error(`❌ Network error for project ${projectId}:`, error);
        }
    }

    // Show final results
    if (successCount > 0 && errorCount === 0) {
        showSuccess('scrape-success-message', 
            `🎉 Successfully processed all ${successCount} selected projects!`);
    } else if (successCount > 0 && errorCount > 0) {
        showSuccess('scrape-success-message', 
            `✅ Processed ${successCount}/${selectedIds.length} projects. ${errorCount} failed.`);
    } else {
        showError('scrape-error-message', 
            `❌ Failed to process any projects. ${errorCount}/${selectedIds.length} errors.`);
    }

    // Clean up - remove the message listener
    chrome.runtime.onMessage.removeListener(handleProjectSelection);
}

// Project ID Detection Handler
async function handleDetectProjectId() {
    console.log('Detect Project ID button clicked');
    disableAllButtons();
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab.url.includes('estimateone.com')) {
            showError('scrape-error-message', 'Please navigate to an EstimateOne page first');
            return;
        }

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: detectProjectIdInPage
        });

        const projectId = results[0].result;
        if (projectId) {
            showSuccess('scrape-success-message', `ID = ${projectId}`);
        } else {
            showError('scrape-error-message', 'No popup');
        }

    } catch (error) {
        console.error('Project ID detection error:', error);
        showError('scrape-error-message', 'Failed to detect project ID');
    } finally {
        enableAllButtons();
    }
}

// Content script function for project ID detection
function detectProjectIdInPage() {
    console.log('🔍 Starting project ID detection...');
    
    // STEP 1: First check if ANY popup is actually open
    const popupSelectors = [
        '.slide-pane__content',
        '.ReactModal__Content',
        '[role="dialog"]',
        '.styles__slider__a65e8ea3f368640c502d',
        '.ReactModal__Overlay--after-open'
    ];

    let isPopupOpen = false;
    let popupContainer = null;

    for (const selector of popupSelectors) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                const computedStyle = window.getComputedStyle(element);
                const isVisible = computedStyle.display !== 'none' &&
                                computedStyle.visibility !== 'hidden' &&
                                computedStyle.opacity !== '0';

                if (isVisible) {
                    console.log(`✅ Found open popup with selector: ${selector}`);
                    isPopupOpen = true;
                    popupContainer = element;
                    break;
                }
            }
        } catch (error) {
            console.warn(`⚠️ Popup check failed for selector: ${selector}`, error);
            continue;
        }
    }

    // STEP 2: If popup is open, detect project ID within popup
    if (isPopupOpen && popupContainer) {
        console.log('✅ Popup is open, proceeding with ID detection within popup...');

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

        try {
            const xpath = ".//span[contains(text(), 'ID #') or contains(text(), 'ID#') or contains(@class, 'projectId')]";
            const result = document.evaluate(xpath, popupContainer, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            if (result.singleNodeValue) {
                const text = result.singleNodeValue.textContent.trim();
                const idMatch = text.match(/(?:ID\s*#?\s*)?(\d+)/i);
                if (idMatch) {
                    const projectId = idMatch[1];
                    console.log(`🎯 Found project ID via XPath within popup: ${projectId}`);
                    return projectId;
                }
            }
        } catch (error) {
            console.warn('⚠️ XPath fallback failed within popup:', error);
        }

        console.log('❌ No project ID found within the open popup');
        return null;
    }

    // STEP 3: If no popup is open, fetch ALL project IDs in DOM ORDER
    console.log('❌ No popup is open - fetching project IDs in DOM ORDER');
    
    const projectIds = [];
    const specificSelector = 'span.styles__projectId__a99146050623e131a1bf';
    
    try {
        console.log(`🔍 Searching with selector: ${specificSelector}`);
        const elements = document.querySelectorAll(specificSelector);
        console.log(`🔍 Found ${elements.length} elements with selector: ${specificSelector}`);
        
        elements.forEach((element, index) => {
            const text = element.textContent?.trim();
            if (text && text.length > 0) {
                const idMatch = text.match(/(\d+)/);
                if (idMatch) {
                    const projectId = idMatch[1];
                    if (!projectIds.includes(projectId)) {
                        projectIds.push(projectId);
                        console.log(`📋 Project ID ${projectIds.length} (DOM order): ${projectId}`);
                    }
                }
            }
        });
        
        console.log(`✅ Successfully extracted ${projectIds.length} unique project IDs in DOM ORDER`);
        console.log('📝 Project IDs in DOM order:', projectIds);
        
        return projectIds;
        
    } catch (error) {
        console.error('❌ Error extracting project IDs from specific selector:', error);
        return [];
    }
}

// Authentication Functions
async function handleLogin() {
    console.log('Login button clicked');
    disableAllButtons();
    try {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        console.log('Login attempt for email:', email);

        if (!email || !password) {
            showError('error-message', 'Please enter both email and password');
            return;
        }

        if (!isValidEmail(email)) {
            showError('error-message', 'Please enter a valid email address');
            return;
        }

        showLoading();
        console.log('Sending login request...');

        const response = await fetch(`${window.ExtensionConfig.API_BASE_URL}/supabase/login`, {
            method: 'POST',
            headers: window.ExtensionConfig.getRequestHeaders(),
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('Login response:', {
            status: response.status,
            authenticated: data.authenticated,
            credentials_stored: data.credentials_stored
        });

        if (response.ok && data.authenticated) {
            console.log('Login successful, storing token...');
            await storeToken(data.access_token);
            const credentialMessage = data.credentials_stored
                ? "Login successful! EstimateOne credentials stored securely."
                : "Login successful! Note: Credential storage failed - some features may be limited.";

            showAuthenticatedUI({
                ...data.user,
                credentials_stored: data.credentials_stored
            });

            if (data.credentials_stored) {
                showSuccess('scrape-success-message', credentialMessage);
            } else {
                showError('scrape-error-message', credentialMessage);
            }
        } else {
            console.error('Login failed:', data.detail);
            showLoginForm();
            showError('error-message', data.detail || 'Login failed');
        }
    } catch (error) {
        console.error('Login network error:', error);
        showLoginForm();
        showError('error-message', 'Network error. Please check your connection.');
    } finally {
        enableAllButtons();
    }
}

async function handleSignup() {
    console.log('Signup button clicked');
    disableAllButtons();
    try {
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value.trim();
        console.log('Signup attempt for email:', email);

        if (!email || !password) {
            showError('signup-error-message', 'Please enter both email and password');
            return;
        }

        if (!isValidEmail(email)) {
            showError('signup-error-message', 'Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            showError('signup-error-message', 'Password must be at least 6 characters long');
            return;
        }

        showLoading();
        console.log('Sending signup request...');

        const response = await fetch(`${window.ExtensionConfig.API_BASE_URL}/supabase/signup`, {
            method: 'POST',
            headers: window.ExtensionConfig.getRequestHeaders(),
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log('Signup response:', { status: response.status, success: data.success });

        if (response.ok && data.success) {
            console.log('Signup successful');
            showLoginForm();
            showSuccess('error-message', 'Account created successfully! Please login to store your credentials.');
        } else {
            console.error('Signup failed:', data.detail);
            showSignupForm();
            showError('signup-error-message', data.detail || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup network error:', error);
        showSignupForm();
        showError('signup-error-message', 'Network error. Please check your connection.');
    } finally {
        enableAllButtons();
    }
}

async function handleLogout() {
    console.log('Logout button clicked');
    disableAllButtons();
    try {
        const token = await getStoredToken();
        if (!token) {
            showLoginForm();
            return;
        }

        showLoading();
        try {
            await fetch(`${window.ExtensionConfig.API_BASE_URL}/supabase/logout`, {
                method: 'POST',
                headers: {
                    ...window.ExtensionConfig.getRequestHeaders(),
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('Server logout successful');
        } catch (error) {
            console.log('Server logout failed, but continuing with client logout:', error);
        }

        await clearStoredToken();
        console.log('Token cleared, showing login form');
        setTimeout(() => {
            showLoginForm();
        }, 100);
    } catch (error) {
        console.error('Logout error:', error);
        await clearStoredToken();
        setTimeout(() => {
            showLoginForm();
        }, 100);
    } finally {
        enableAllButtons();
    }
}

async function handleCheckCredentials() {
    console.log('Check credentials button clicked');
    disableAllButtons();
    try {
        const token = await getStoredToken();
        if (!token) {
            showError('scrape-error-message', 'Please login first');
            showLoginForm();
            return;
        }

        console.log('Checking credentials status...');
        const response = await fetch(`${window.ExtensionConfig.API_BASE_URL}/supabase/credentials/status`, {
            headers: {
                ...window.ExtensionConfig.getRequestHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log('Credentials status:', data);

        if (data.credentials_stored) {
            showSuccess('scrape-success-message', data.message);
            updateCredentialStatus({ credentials_stored: true });
        } else {
            showError('scrape-error-message', data.message);
            updateCredentialStatus({ credentials_stored: false });
        }
    } catch (error) {
        console.error('Credential check error:', error);
        const token = await getStoredToken();
        if (token) {
            try {
                const user = await verifyToken(token);
                if (user) {
                    showAuthenticatedUI(user);
                } else {
                    showLoginForm();
                }
            } catch {
                showLoginForm();
            }
        } else {
            showLoginForm();
        }
        showError('scrape-error-message', 'Failed to check credential status');
    } finally {
        enableAllButtons();
    }
}

async function handleScrapeTenders() {
    console.log('Scrape tenders button clicked');
    disableAllButtons();
    try {
        const token = await getStoredToken();
        if (!token) {
            showError('scrape-error-message', 'Please login first');
            showLoginForm();
            return;
        }

        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        const url = tab.url;
        console.log('Current tab URL:', url);

        if (!url.includes('estimateone.com')) {
            showError('scrape-error-message', 'Please navigate to an EstimateOne page first');
            return;
        }

        showLoading();
        console.log('Sending scrape request...');

        const response = await fetch(`${window.ExtensionConfig.API_BASE_URL}/scrapper/scrape-tenders`, {
            method: 'POST',
            headers: {
                ...window.ExtensionConfig.getRequestHeaders(),
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();
        console.log('Scrape response:', { status: response.status, data: data.status });

        const user = await verifyToken(token);
        if (user) {
            showAuthenticatedUI(user);
        } else {
            showLoginForm();
            return;
        }

        if (response.ok && data.status === 'success') {
            showSuccess('scrape-success-message', data.message);
        } else {
            showError('scrape-error-message', data.detail || 'Scraping failed');
        }
    } catch (error) {
        console.error('Scraping error:', error);
        const token = await getStoredToken();
        if (token) {
            try {
                const user = await verifyToken(token);
                if (user) {
                    showAuthenticatedUI(user);
                } else {
                    showLoginForm();
                }
            } catch {
                showLoginForm();
            }
        } else {
            showLoginForm();
        }
        showError('scrape-error-message', 'Network error. Please try again.');
    } finally {
        enableAllButtons();
    }
}

// Token Management Functions
async function storeToken(token) {
    console.log('Storing token...');
    return new Promise((resolve) => {
        chrome.storage.local.set({auth_token: token}, () => {
            console.log('Token stored successfully');
            resolve();
        });
    });
}

async function getStoredToken() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['auth_token'], (result) => {
            resolve(result.auth_token);
        });
    });
}

async function clearStoredToken() {
    console.log('Clearing stored token...');
    return new Promise((resolve) => {
        chrome.storage.local.remove(['auth_token'], () => {
            console.log('Token cleared successfully');
            resolve();
        });
    });
}

async function verifyToken(token) {
    console.log('Verifying token...');
    try {
        const response = await fetch(`${window.ExtensionConfig.API_BASE_URL}/supabase/me`, {
            headers: {
                ...window.ExtensionConfig.getRequestHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            console.log('Token verification successful for:', userData.email);
            return userData;
        } else {
            console.log('Token verification failed:', response.status);
        }
        return null;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

// Utility Functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
