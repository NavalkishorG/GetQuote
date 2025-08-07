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
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Login Form
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('show-signup-btn').addEventListener('click', showSignupForm);
    document.getElementById('login-email').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Signup Form
    document.getElementById('signup-btn').addEventListener('click', handleSignup);
    document.getElementById('show-login-btn').addEventListener('click', showLoginForm);
    document.getElementById('signup-email').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignup();
    });
    document.getElementById('signup-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSignup();
    });

    // Authenticated UI
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('scrape-tenders-btn').addEventListener('click', handleScrapeTenders);
    document.getElementById('check-credentials-btn').addEventListener('click', handleCheckCredentials);

    // Forgot Password
    document.getElementById('forgot-password').addEventListener('click', () => {
        chrome.tabs.create({url: 'https://app.estimateone.com/auth/forgot-password'});
    });
}

// UI Management Functions
function showLoginForm() {
    console.log('Showing login form');
    hideAllForms();
    document.getElementById('login-form').style.display = 'block';
    clearErrors();
    
    // Clear form fields
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

function showSignupForm() {
    console.log('Showing signup form');
    hideAllForms();
    document.getElementById('signup-form').style.display = 'block';
    clearErrors();
    
    // Clear form fields
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
}

function showAuthenticatedUI(user) {
    console.log('Showing authenticated UI for:', user.email);
    hideAllForms();
    document.getElementById('authenticated-ui').style.display = 'block';
    
    // Update UI with credential status
    updateCredentialStatus(user);
    clearErrors();
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

// Authentication Functions
async function handleLogin() {
    console.log('Login button clicked');
    
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

    try {
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
            
            // Show credential storage status
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
    }
}

async function handleSignup() {
    console.log('Signup button clicked');
    
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

    try {
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
    }
}

async function handleLogout() {
    console.log('Logout button clicked');
    
    try {
        const token = await getStoredToken();
        
        // Try to logout from server
        if (token) {
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
        }
        
        // Always clear local token and show login form
        await clearStoredToken();
        console.log('Token cleared, showing login form');
        showLoginForm();
        
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout even if there's an error
        await clearStoredToken();
        showLoginForm();
    }
}

async function handleCheckCredentials() {
    console.log('Check credentials button clicked');
    
    const token = await getStoredToken();
    if (!token) {
        showError('scrape-error-message', 'Please login first');
        return;
    }

    try {
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
        showError('scrape-error-message', 'Failed to check credential status');
    }
}

async function handleScrapeTenders() {
    console.log('Scrape tenders button clicked');
    
    const token = await getStoredToken();
    if (!token) {
        showError('scrape-error-message', 'Please login first');
        return;
    }

    try {
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

        showAuthenticatedUI({ credentials_stored: true });

        if (response.ok && data.status === 'success') {
            showSuccess('scrape-success-message', data.message);
        } else {
            showError('scrape-error-message', data.detail || 'Scraping failed');
        }
    } catch (error) {
        console.error('Scraping error:', error);
        showAuthenticatedUI({ credentials_stored: true });
        showError('scrape-error-message', 'Network error. Please try again.');
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
