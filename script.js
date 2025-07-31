const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const forgotPassword = document.getElementById('forgotPassword');
const errorMsg = document.getElementById('error-msg');
const loginContainer = document.getElementById('login-container');
const authContainer = document.getElementById('authenticated-container');
const userNameSpan = document.getElementById('user-name');
const logoutLink = document.getElementById('logout-link');

loginBtn.addEventListener('click', () => {
  errorMsg.style.display = 'none';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    errorMsg.textContent = 'Please enter both Email and Password.';
    errorMsg.style.display = 'block';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';

  fetch('http://localhost:8000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
    .then(response => {
      if (!response.ok) throw new Error('Invalid credentials or server error');
      return response.json();
    })
    .then(data => {
      if (data.authenticated) {
        // Optionally set user name if provided by backend, fallback to email
        if (data.name) userNameSpan.textContent = data.name;
        else userNameSpan.textContent = email;

        loginContainer.style.display = 'none';
        authContainer.style.display = 'block';
      } else {
        errorMsg.textContent = 'Authentication failed. Please check your details.';
        errorMsg.style.display = 'block';
      }
    })
    .catch(err => {
      errorMsg.textContent = 'Error: ' + err.message;
      errorMsg.style.display = 'block';
    })
    .finally(() => {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    });
});

signupBtn.addEventListener('click', () => {
  alert('Redirecting to signup page (not implemented)');
});

forgotPassword.addEventListener('click', e => {
  e.preventDefault();
  alert('Forgot password flow (not implemented)');
});

// Logout: simple reset UI (for demo purposes)
logoutLink.addEventListener('click', e => {
  e.preventDefault();
  // Clear any session or tokens here if you have them
  authContainer.style.display = 'none';
  loginContainer.style.display = 'block';
  errorMsg.style.display = 'none';
  userNameSpan.textContent = 'John Doe';
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
});
