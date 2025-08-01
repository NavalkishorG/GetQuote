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

// Backend API URL
const API_URL = "http://localhost:8000/api/login";  // adjust as needed

// Helper to show error
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.hidden = false;
}

// Helper to clear error
function clearError() {
  errorMsg.textContent = "";
  errorMsg.hidden = true;
}

// Perform login
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
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      throw new Error("Invalid credentials or server error");
    }

    const data = await res.json();

    if (data.authenticated) {
      // Store tokens and user id in sessionStorage/localStorage as appropriate
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      sessionStorage.setItem("user_uid", data.user.id);

      userNameSpan.textContent = data.user.user_metadata.name || data.user.email.split("@")[0];

      // Show authenticated UI, hide login UI
      loginContainer.hidden = true;
      authContainer.hidden = false;
    } else {
      showError("Authentication failed.");
    }
  } catch (error) {
    showError(error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Login";
  }
});

// Signup and Forgot Password handlers (simple alert placeholders)
signupBtn.addEventListener("click", () => {
  alert("Signup flow not implemented yet.");
});

forgotPassword.addEventListener("click", (e) => {
  e.preventDefault();
  alert("Forgot password flow not implemented yet.");
});

// Logout resets UI and clears session
logoutLink.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.clear();
  sessionStorage.clear();
  loginContainer.hidden = false;
  authContainer.hidden = true;

  emailInput.value = "";
  passwordInput.value = "";
  clearError();
});
