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
const API_URL = "http://localhost:8000/supabase/login";  // adjust as needed

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
    const res = await fetch("http://localhost:8000/supabase/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Handle if user already exists or signup fails
      if(data && data.detail) {
        showError(data.detail);
      } else {
        showError("Signup failed. Try a different email.");
      }
      return;
    }

    // User created successfully
    alert("Signup successful! Please check your email to verify your account.");
    // Optionally, clear fields and switch to login view
   // emailInput.value = "";
    //passwordInput.value = "";

  } catch (err) {
    showError("Network or server error during signup.");
  } finally {
    signupBtn.disabled = false;
    signupBtn.textContent = "Signup";
  }
});


// Logout resets UI and clears session
logoutLink.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.clear();
  sessionStorage.clear();
  loginContainer.hidden = false;
  authContainer.hidden = true;

  //emailInput.value = "";
  //passwordInput.value = "";
  clearError();
});
