/**
 * Admin Profile Controller
 */

document.addEventListener('DOMContentLoaded', async function () {
  const changePasswordForm = document.getElementById('changePasswordForm');
  const savePasswordBtn = document.getElementById('savePasswordBtn');
  const profileAlert = document.getElementById('profileAlert');

  // Helper to show alert messages
  function showAlert(message, type = 'danger') {
    profileAlert.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    profileAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // 1. Auth Guard and Logout Setup
  async function checkAuth() {
    try {
      const response = await fetch('/api/admin/auth/me');
      if (!response.ok) {
        window.location.href = 'login.html';
      }
    } catch (err) {
      window.location.href = 'login.html';
    }
  }

  await checkAuth();

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      try {
        const response = await fetch('/api/admin/auth/logout', { method: 'POST' });
        if (response.ok) {
          window.location.href = 'login.html';
        }
      } catch (err) {
        console.error('Logout failed:', err);
      }
    });
  }

  // =========================================================================
  // 2. LOAD PROFILE & SECURITY ATTEMPTS
  // =========================================================================
  async function loadProfile() {
    try {
      const response = await fetch('/api/admin/auth/me');
      if (!response.ok) throw new Error('Failed to load profile');
      const res = await response.json();

      if (res.success && res.data) {
        const admin = res.data.admin;
        const attempts = res.data.loginAttempts || [];

        // Profile details
        document.getElementById('profName').innerText = admin.full_name;
        document.getElementById('profEmail').innerText = admin.email;
        document.getElementById('profRole').innerText = admin.role.toUpperCase();

        const lastLogin = admin.last_login_at
          ? new Date(admin.last_login_at).toLocaleString('en-IN')
          : 'First login session';
        document.getElementById('profLastLogin').innerText = lastLogin;

        // Login history table
        const historyBody = document.getElementById('loginHistoryBody');
        if (attempts.length === 0) {
          historyBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No login logs available.</td></tr>`;
          return;
        }

        historyBody.innerHTML = '';
        attempts.forEach(att => {
          const time = new Date(att.attempt_time).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          }) + ' ' + new Date(att.attempt_time).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit'
          });

          const successBadge = att.was_successful === 1
            ? '<span class="badge badge-completed" style="padding: 2px 6px;">SUCCESS</span>'
            : '<span class="badge badge-not_interested" style="padding: 2px 6px;">FAILED</span>';

          historyBody.innerHTML += `
            <tr>
              <td style="color: var(--text-muted); font-size: 0.8rem;">${time}</td>
              <td>${att.ip_address}</td>
              <td>${successBadge}</td>
            </tr>
          `;
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }

  // =========================================================================
  // 3. CHANGE PASSWORD FORM HANDLER
  // =========================================================================
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      showAlert('', 'danger'); // clear alerts

      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      // Validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        return showAlert('All password fields are required.');
      }

      if (newPassword.length < 8) {
        return showAlert('New password must be at least 8 characters long.');
      }

      if (newPassword !== confirmPassword) {
        return showAlert('New passwords do not match. Please verify.');
      }

      savePasswordBtn.disabled = true;
      savePasswordBtn.innerText = 'Updating password...';

      try {
        const response = await fetch('/api/admin/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword })
        });

        const resData = await response.json();

        if (response.ok) {
          showAlert('Password changed successfully! Logging you out in 2 seconds...', 'success');
          changePasswordForm.reset();
          
          // Auto logout after password change for session invalidation safety
          setTimeout(async () => {
            await fetch('/api/admin/auth/logout', { method: 'POST' });
            window.location.href = 'login.html';
          }, 2000);
        } else {
          showAlert(resData.message || 'Failed to change password. Please check your inputs.');
        }
      } catch (err) {
        showAlert('A network error occurred. Please try again.');
        console.error('Password change error:', err);
      } finally {
        savePasswordBtn.disabled = false;
        savePasswordBtn.innerText = 'Update Password';
      }
    });
  }

  loadProfile();
});
