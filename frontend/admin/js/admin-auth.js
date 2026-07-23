/**
 * Admin Authentication Script
 */

document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('loginForm');
  const submitBtn = document.getElementById('loginBtn');
  const alertContainer = document.getElementById('loginAlert');

  // Helper to show alert messages
  function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  }

  // 1. Session Check on Page Load
  // If the admin is already logged in, redirect them directly to the dashboard
  try {
    const checkResponse = await fetch('/api/admin/auth/me');
    if (checkResponse.ok) {
      window.location.href = 'dashboard.html';
      return;
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }

  if (!form) return;

  // 2. Handle Login Submission
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    showAlert(''); // clear old alert

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Simple validation
    if (!email || !password) {
      return showAlert('Please enter both email and password.');
    }

    submitBtn.disabled = true;
    submitBtn.innerText = 'Verifying...';

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const resData = await response.json();

      if (response.ok) {
        // Success: redirect to dashboard
        window.location.href = 'dashboard.html';
      } else {
        // Show error message
        showAlert(resData.message || 'Invalid email or password.');
      }
    } catch (err) {
      showAlert('A network error occurred. Please check your connection.');
      console.error('Login error:', err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Log In';
    }
  });
});
