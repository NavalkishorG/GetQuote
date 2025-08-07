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
    // Clear form fields
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    // Re-attach event listeners for login form
    attachLoginEventListeners();
}

function showSignupForm() {
    console.log('Showing signup form');
    hideAllForms();
    document.getElementById('signup-form').style.display = 'block';
    clearErrors();
    // Clear form fields
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    // Re-attach event listeners for signup form
    attachSignupEventListeners();
}

function showAuthenticatedUI(user) {
    console.log('Showing authenticated UI for:', user.email);
    hideAllForms();
    document.getElementById('authenticated-ui').style.display = 'block';
    updateCredentialStatus(user);
    clearErrors();
    // Re-attach event listeners for authenticated UI
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

    // Remove existing listeners to prevent duplicates
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

    // Remove existing listeners to prevent duplicates
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
    const logoutBtn = document.getElementById('logout-btn');
    const scrapeTendersBtn = document.getElementById('scrape-tenders-btn');
    const checkCredentialsBtn = document.getElementById('check-credentials-btn');
    const detectProjectIdBtn = document.getElementById('detect-project-id-btn'); // NEW
    const viewDashboardBtn = document.getElementById('view-dashboard-btn');
    const closeDashboardBtn = document.getElementById('close-dashboard');

    // Remove existing listeners to prevent duplicates
    if (logoutBtn) {
        logoutBtn.replaceWith(logoutBtn.cloneNode(true));
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
    }

    if (scrapeTendersBtn) {
        scrapeTendersBtn.replaceWith(scrapeTendersBtn.cloneNode(true));
        document.getElementById('scrape-tenders-btn').addEventListener('click', handleScrapeTenders);
    }

    if (checkCredentialsBtn) {
        checkCredentialsBtn.replaceWith(checkCredentialsBtn.cloneNode(true));
        document.getElementById('check-credentials-btn').addEventListener('click', handleCheckCredentials);
    }

    // NEW: Add project ID detection listener
    if (detectProjectIdBtn) {
        detectProjectIdBtn.replaceWith(detectProjectIdBtn.cloneNode(true));
        document.getElementById('detect-project-id-btn').addEventListener('click', handleDetectProjectId);
    }

    // Dashboard event listeners
    if (viewDashboardBtn) {
        viewDashboardBtn.replaceWith(viewDashboardBtn.cloneNode(true));
        document.getElementById('view-dashboard-btn').addEventListener('click', handleViewDashboard);
    }

    if (closeDashboardBtn) {
        closeDashboardBtn.replaceWith(closeDashboardBtn.cloneNode(true));
        document.getElementById('close-dashboard').addEventListener('click', closeDashboard);
    }

    // Close dashboard when clicking overlay
    const dashboardModal = document.getElementById('dashboard-modal');
    if (dashboardModal) {
        dashboardModal.replaceWith(dashboardModal.cloneNode(true));
        document.getElementById('dashboard-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('dashboard-overlay')) {
                closeDashboard();
            }
        });
    }

    // Close dashboard with Escape key
    document.removeEventListener('keydown', handleEscapeKey);
    document.addEventListener('keydown', handleEscapeKey);
}

// NEW: Project ID Detection Handler
async function handleDetectProjectId() {
    console.log('Detect Project ID button clicked');
    disableAllButtons();
    
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tab.url.includes('estimateone.com')) {
            showError('scrape-error-message', 'Please navigate to an EstimateOne page first');
            return;
        }

        // Inject content script to detect project ID
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

// NEW: Content script function to detect project ID using Option 5 (robust fallback)
function detectProjectIdInPage() {
    console.log('🔍 Starting project ID detection...');
    
    // Option 5: Multiple selector fallback approach
    const selectors = [
        '.styles__projectId__f47058b1431204abe7ec',  // Direct class selector (most reliable)
        '[class*="projectId"]',                       // Any class containing "projectId"
        'span[title*="ID"]',                         // Span with title containing "ID"
        '#project-slider-header .styles__projectId__f47058b1431204abe7ec', // ID-based selector
        '.slide-pane__content .styles__projectId__f47058b1431204abe7ec'   // Within popup content
    ];

    // Try each selector in order of reliability
    for (const selector of selectors) {
        try {
            const element = document.querySelector(selector);
            if (element && element.textContent) {
                const text = element.textContent.trim();
                console.log(`✅ Found element with selector: ${selector}, text: ${text}`);
                
                // Extract just the ID number from text like "ID #169451"
                const idMatch = text.match(/(?:ID\s*#?\s*)?(\d+)/i);
                if (idMatch) {
                    const projectId = idMatch[1];
                    console.log(`🎯 Extracted project ID: ${projectId}`);
                    return projectId;
                }
            }
        } catch (error) {
            console.warn(`⚠️ Selector failed: ${selector}`, error);
            continue;
        }
    }

    // Fallback: Text-based search in popup content
    try {
        const popupContent = document.querySelector('.slide-pane__content');
        if (popupContent) {
            const fullText = popupContent.textContent || popupContent.innerText;
            const idMatch = fullText.match(/ID\s*#?\s*(\d+)/i);
            if (idMatch) {
                const projectId = idMatch[1];
                console.log(`🎯 Found project ID via text search: ${projectId}`);
                return projectId;
            }
        }
    } catch (error) {
        console.warn('⚠️ Text-based fallback failed:', error);
    }

    // Final fallback: XPath for text pattern matching
    try {
        const xpath = "//span[contains(text(), 'ID #') or contains(text(), 'ID#')]";
        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        if (result.singleNodeValue) {
            const text = result.singleNodeValue.textContent.trim();
            const idMatch = text.match(/ID\s*#?\s*(\d+)/i);
            if (idMatch) {
                const projectId = idMatch[1];
                console.log(`🎯 Found project ID via XPath: ${projectId}`);
                return projectId;
            }
        }
    } catch (error) {
        console.warn('⚠️ XPath fallback failed:', error);
    }

    console.log('❌ No project ID found');
    return null;
}

// Add this new function for escape key handling
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('dashboard-modal');
        if (modal && modal.style.display === 'flex') {
            closeDashboard();
        }
    }
}

// Dashboard Functions
function handleViewDashboard() {
    console.log('View dashboard button clicked');
    showDashboard();
}

function showDashboard() {
    console.log('Showing dashboard modal');
    const modal = document.getElementById('dashboard-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.transition = 'opacity 0.3s ease';
            modal.style.opacity = '1';
        }, 10);
    } else {
        console.error('Dashboard modal element not found');
    }
}

function closeDashboard() {
    console.log('Closing dashboard modal');
    const modal = document.getElementById('dashboard-modal');
    if (modal) {
        modal.style.transition = 'opacity 0.3s ease';
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
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
        // Verify we're still in the right state
        const token = await getStoredToken();
        if (!token) {
            showLoginForm();
            return;
        }

        // Show loading state immediately
        showLoading();
        
        // Try to logout from server
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

        // Always clear local token
        await clearStoredToken();
        console.log('Token cleared, showing login form');
        
        // Show login form with a small delay to ensure cleanup
        setTimeout(() => {
            showLoginForm();
        }, 100);
        
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if there's an error
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
        
        // Always return to authenticated UI, not stuck in loading
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

        // Get current tab URL
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

        // Always return to authenticated UI
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
        
        // Always return to authenticated UI, not stuck in loading
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
