import { withLoading, api } from './auth.js';

const form = document.getElementById('login-form');
const btn = document.getElementById('login-submit');
const feedback = document.getElementById('login-feedback');

function showMessage(msg, ok = false) {
  feedback.textContent = msg;
  feedback.classList.remove('error','ok');
  feedback.classList.add(ok ? 'ok' : 'error');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  feedback.textContent = '';

  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    showMessage('Please enter a valid email address.');
    form.email.focus();
    return;
  }
  if (!password || password.length < 6) {
    showMessage('Password must be at least 6 characters.');
    form.password.focus();
    return;
  }

  try {
    withLoading(btn, true);
    const remember = form.remember.checked;
    const data = await api('/api/auth/login', 'POST', { email, password, remember });

    // Example: expect { token, user } OR set cookie via server
    if (data.token) localStorage.setItem('vsx_token', data.token);
    showMessage('Login successful. Redirecting…', true);

    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  } catch (err) {
    showMessage(err.message || 'Could not sign in. Please try again.');
  } finally {
    withLoading(btn, false);
  }
});
