// Toggle password visibility buttons (shared)
document.querySelectorAll('.toggle-pass').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-target');
    const input = document.getElementById(id);
    if (!input) return;
    const showing = input.getAttribute('type') === 'text';
    input.setAttribute('type', showing ? 'password' : 'text');
    btn.textContent = showing ? 'Show' : 'Hide';
    btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    input.focus();
  });
});

// Minimal helper to disable/enable a button with loading text
export function withLoading(btn, isLoading) {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.label = btn.querySelector('.btn-label')?.textContent || '';
    btn.querySelector('.btn-label').textContent = btn.dataset.loading || 'Please wait…';
    btn.setAttribute('disabled', 'true');
  } else {
    btn.querySelector('.btn-label').textContent = btn.dataset.label || 'Submit';
    btn.removeAttribute('disabled');
  }
}

// Fetch wrapper with JSON + basic error handling
export async function api(url, method, data) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
    credentials: 'include'
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { message: text || 'Unexpected response' }; }
  if (!res.ok) {
    throw new Error(json.message || 'Request failed');
  }
  return json;
}
