import { withLoading, api } from './auth.js';

const form = document.getElementById('register-form');
const btn = document.getElementById('register-submit');
const feedback = document.getElementById('register-feedback');

const strengthBar = document.getElementById('strength-bar');
const strengthText = document.getElementById('strength-text');

function showMessage(msg, ok = false) {
  feedback.textContent = msg;
  feedback.classList.remove('error','ok');
  feedback.classList.add(ok ? 'ok' : 'error');
}

function scorePassword(pw='') {
  let score = 0;
  if (pw.length >= 8) score += 25;
  if (/[A-Z]/.test(pw)) score += 15;
  if (/[a-z]/.test(pw)) score += 15;
  if (/\d/.test(pw)) score += 20;
  if (/[^A-Za-z0-9]/.test(pw)) score += 25;
  return Math.min(100, score);
}

function updateStrength() {
  const pw = form.password.value;
  const s = scorePassword(pw);
  strengthBar.style.width = s + '%';
  if (s < 40) { strengthText.textContent = 'Weak password'; strengthText.style.color = '#ff6b6b'; }
  else if (s < 70) { strengthText.textContent = 'Okay — could be stronger'; strengthText.style.color = '#ffd166'; }
  else { strengthText.textContent = 'Strong password'; strengthText.style.color = '#00f0a8'; }
}

form.password.addEventListener('input', updateStrength);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  feedback.textContent = '';

  const firstName = form.firstName.value.trim();
  const lastName = form.lastName.value.trim();
  const email = form.email.value.trim();
  const phone = form.phone.value.trim();
  const location = form.location.value.trim();
  const role = form.role.value;
  const experience = form.experience.value;
  const portfolio = form.portfolio.value.trim();
  const password = form.password.value;
  const confirm = form.confirm.value;
  const terms = form.terms.checked;

  if (!firstName || !lastName) return showMessage('Please provide your full name.');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return showMessage('Please enter a valid email address.');
  if (!location) return showMessage('Please provide your city/province.');
  if (!role) return showMessage('Please select your main role.');
  if (!experience) return showMessage('Please select your experience level.');
  if (portfolio && !/^https?:\/\/.+/i.test(portfolio)) return showMessage('Please enter a valid portfolio URL (starting with http/https).');
  if (password.length < 8) return showMessage('Password must be at least 8 characters.');
  if (password !== confirm) return showMessage('Passwords do not match.');
  if (!terms) return showMessage('You must agree to the Terms and Privacy Policy.');

  try {
    withLoading(btn, true);
    const payload = { firstName, lastName, email, phone, location, role, experience, portfolio, password };
    const data = await api('/api/auth/register', 'POST', payload);

    // Example: expect { token, user }
    if (data.token) localStorage.setItem('vsx_token', data.token);
    showMessage('Account created. Redirecting…', true);

    // Redirect after success
    window.location.href = 'dashboard.html';
  } catch (err) {
    showMessage(err.message || 'Could not create your account. Please try again.');
  } finally {
    withLoading(btn, false);
  }
});

// Initialize initial meter state
updateStrength();
