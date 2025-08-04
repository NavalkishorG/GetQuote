// Cache UI elements
const loginContainer = document.getElementById("login-container");
const authContainer = document.getElementById("authenticated-container");
const errorMsg = document.getElementById("error-msg");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const userNameSpan = document.getElementById("user-name");

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const forgotPassword = document.getElementById("forgotPassword");
const logoutLink = document.getElementById("logout-link");

// Backend API URLs – set as per your backend
const LOGIN_API_URL = "http://localhost:8000/supabase/login";
const SIGNUP_API_URL = "http://localhost:8000/supabase/signup";

// Show error message helper
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
  console.warn("Show Error:", message);
}

// Clear error message helper
function clearError() {
  errorMsg.textContent = "";
  errorMsg.hidden = true;
}

// Show login UI, hide authenticated UI
function showLoginUI() {
  loginContainer.hidden = false;
  authContainer.hidden = true;
  clearError();
  console.log("Showing login UI");
}

// Show authenticated UI, hide login UI
async function showAuthenticatedUI(user) {
  const displayName = user?.user_metadata?.name || (user?.email ? user.email.split("@")[0] : "User");
  userNameSpan.textContent = displayName;
  loginContainer.hidden = true;
  authContainer.hidden = false;
  clearError();
  console.log("Showing authenticated UI for user:", displayName);

  try {
    await sessionStorage.set({
      isLoggedIn: true,
      user: user,
      accessToken: user.access_token || user.accessToken,
      expiresAt: Date.now() + ((user.expires_in || 3600) * 1000),
    });
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

// Session storage functions supporting Chrome extension and fallback for testing
const sessionStorage = {
  async set(data) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.session) {
      return new Promise((resolve) => {
        chrome.storage.session.set(data, resolve);
      });
    } else {
      for (const [key, value] of Object.entries(data)) {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      }
    }
  },

  async get(keys) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.session) {
      return new Promise((resolve) => {
        chrome.storage.session.get(keys, (result) => {
          resolve(result);
        });
      });
    } else {
      const result = {};
      for (const key of keys) {
        const value = window.sessionStorage.getItem(key);
        if (value) result[key] = JSON.parse(value);
      }
      return result;
    }
  },

  async remove(keys) {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.session) {
      return new Promise((resolve) => {
        chrome.storage.session.remove(keys, resolve);
      });
    } else {
      for (const key of keys) {
        window.sessionStorage.removeItem(key);
      }
    }
  },
};

// On popup load, check for existing session
const init = async () => {
  try {
    const result = await sessionStorage.get(["isLoggedIn", "user", "expiresAt"]);
    console.log("Session check result:", result);

    if (result && result.isLoggedIn && result.user && result.expiresAt > Date.now()) {
      showAuthenticatedUI(result.user);
      return;
    }

    if (result && (result.expiresAt <= Date.now() || !result.user)) {
      await sessionStorage.remove(["isLoggedIn", "user", "accessToken", "expiresAt"]);
    }

    showLoginUI();
  } catch (error) {
    console.error("Error initializing extension:", error);
    showLoginUI();
  }
};

// Start the extension
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Legacy localStorage token check (optional)
const checkLegacyAuth = async () => {
  const accessToken = localStorage.getItem("access_token");
  const userId = localStorage.getItem("user_uid");

  if (accessToken && userId) {
    try {
      const res = await fetch("http://localhost:8000/supabase/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          showAuthenticatedUI(data.user);
          return;
        }
      }
      localStorage.clear();
      showLoginUI();
    } catch (e) {
      console.error("Error verifying token:", e);
      showLoginUI();
    }
  } else {
    showLoginUI();
  }
};

if (window.location.href.includes("popup.html")) {
  checkLegacyAuth();
}

// Event Listener: Login
loginBtn.addEventListener("click", async () => {
  clearError();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError("Please enter both Email and Password.");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Logging in...";

  try {
    const res = await fetch(LOGIN_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errText = await res.text();
      showError(`Login failed: ${errText || "Invalid credentials or server error"}`);
      return;
    }

    const data = await res.json();

    if (data.authenticated) {
      await sessionStorage.set({
        isLoggedIn: true,
        user: data.user,
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      });

      showAuthenticatedUI(data.user);
    } else {
      showError("Authentication failed.");
    }
  } catch (error) {
    showError(error.message || "Network error during login.");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});

// Event Listener: Signup
signupBtn.addEventListener("click", async () => {
  clearError();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError("Please enter both Email and Password for signup.");
    return;
  }

  signupBtn.disabled = true;
  signupBtn.textContent = "Signing up...";

  try {
    const res = await fetch(SIGNUP_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data?.detail || "Signup failed. Try a different email.");
      return;
    }

    alert("Signup successful! Please check your email to verify your account.");

    emailInput.value = "";
    passwordInput.value = "";
  } catch (error) {
    showError(error.message || "Network or server error during signup.");
  } finally {
    signupBtn.disabled = false;
    signupBtn.textContent = "Signup";
  }
});

// Event Listener: Scan Tender Page Button
const scanTenderBtn = document.getElementById("scanTenderBtn");
const currentUrlContainer = document.getElementById("currentUrlContainer");
const currentPageUrl = document.getElementById("currentPageUrl");

if (scanTenderBtn) {
  scanTenderBtn.addEventListener("click", async () => {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.url) {
        // Display the URL in the popup
        currentPageUrl.textContent = tab.url;
        currentUrlContainer.classList.remove("hidden");
        
        // You can add additional logic here to process the tender page
        console.log("Current page URL:", tab.url);
      } else {
        currentPageUrl.textContent = "Could not retrieve the current page URL.";
        currentUrlContainer.classList.remove("hidden");
      }
    } catch (error) {
      console.error("Error getting current tab:", error);
      currentPageUrl.textContent = "Error: " + error.message;
      currentUrlContainer.classList.remove("hidden");
    }
  });
}

// Event Listener: Logout
logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    await sessionStorage.remove(["isLoggedIn", "user", "accessToken", "expiresAt"]);
    localStorage.clear();

    showLoginUI();

    emailInput.value = "";
    passwordInput.value = "";
    clearError();

    console.log("User logged out, session cleared.");

    setTimeout(() => {
      if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
        window.close();
      }
    }, 500);
  } catch (error) {
    console.error("Error during logout:", error);
  }
});
