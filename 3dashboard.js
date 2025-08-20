import { api, getToken, setToken } from './auth.js';

const API = 'http://localhost:4000/api';
const tokenKey = 'vsx_token';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function ensureAuthRedirect() {
  if (!getToken()) {
    // try silent refresh
    return fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error('no refresh'); return r.json(); })
      .then(j => { setToken(j.token); return true; })
      .catch(()=> { location.href = 'login.html'; });
  }
  return Promise.resolve(true);
}

/* Accept token via #token=... after OAuth */
(function pickUpHashToken(){
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const t = hash.get('token');
  if (t){ localStorage.setItem(tokenKey, t); history.replaceState(null,'',location.pathname); }
})();

async function loadMeAndFeed() {
  await ensureAuthRedirect();
  try {
    const me = await api('/me');
    paintUser(me.user);
    await loadFeed();
  } catch (err) {
    console.error(err);
    location.href = 'login.html';
  }
}

function paintUser(user) {
  $('#userName').textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Friend';
  $('#userRole').textContent = [user.role || 'Member', user.location || ''].filter(Boolean).join(' • ');
  const initials = (user.firstName?.[0]||'') + (user.lastName?.[0]||'');
  $('#avatar').textContent = initials || '👤';
}

async function loadFeed() {
  const feedEl = $('#feed');
  feedEl.innerHTML = `<article class="card skeleton"></article><article class="card skeleton"></article>`;
  try {
    const posts = await api('/posts');
    feedEl.innerHTML = '';
    if (!posts.length) feedEl.innerHTML = `<div class="card"><p class="muted">No posts yet. Be the first to share your work.</p></div>`;
    posts.forEach(p => renderPost(p));
  } catch (e) {
    console.error(e);
    feedEl.innerHTML = `<div class="card"><p class="muted">Could not load feed.</p></div>`;
  }
}

function renderPost(p) {
  const feed = $('#feed');
  const card = document.createElement('article');
  card.className = 'card post';
  const author = p.author || {};
  const name = `${author.firstName||''} ${author.lastName||''}`.trim() || 'Unknown';
  const meta = [author.role, author.location].filter(Boolean).join(' • ');
  const time = new Date(p.createdAt).toLocaleString();
  const likes = p.likes?.length || 0;

  card.innerHTML = `
    <div class="post-head">
      <div class="avatar small" aria-hidden="true">${(name.split(' ').map(s=>s[0]).join('').slice(0,2) || 'U')}</div>
      <div>
        <div class="name">${name}</div>
        <div class="meta">${meta} • ${time}</div>
      </div>
    </div>
    <div class="body">${(p.body||'').replace(/</g,'&lt;')}</div>
    ${p.media?.length ? p.media.map(m => m.type?.startsWith('video/') ? `<video class="media" controls src="${m.url}"></video>` : `<figure class="media"><img src="${m.url}" alt="${m.filename||''}"></figure>`).join('') : ''}
    <div class="actions">
      <button class="action likeBtn" data-id="${p._id}">Approve ❤️ <span class="like-count">(${likes})</span></button>
      <button class="action commentBtn" data-id="${p._id}">Comment 💬</button>
      <button class="action shareBtn" data-id="${p._id}">Share 🔗</button>
      <button class="action collabBtn" data-author="${p.author?._id}">Collaborate 🤝</button>
    </div>
    <div class="commentbox" data-post="${p._id}" hidden>
      <input type="text" placeholder="Write a comment…" />
      <button class="btn ghost postComment">Post</button>
    </div>
  `;
  feed.prepend(card);
}

// Composer logic
const fileInput = $('#composeFile');
const fileName = $('#fileName');
const preview = $('#preview');
const previewMedia = $('#previewMedia');

fileInput?.addEventListener('change', () => {
  const f = fileInput.files?.[0];
  fileName.textContent = f ? f.name : 'No file chosen';
  renderPreview();
});
$('#previewBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  preview.toggleAttribute('hidden');
  if (!preview.hasAttribute('hidden')) renderPreview();
});
function renderPreview(){
  previewMedia.innerHTML = '';
  const f = fileInput.files?.[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  if (f.type.startsWith('video/')) {
    const v = document.createElement('video'); v.controls = true; v.src = url;
    previewMedia.appendChild(v);
  } else {
    const img = new Image(); img.src = url; img.alt = 'Preview';
    previewMedia.appendChild(img);
  }
}

// Post submit wired to /api/posts (text + simple media metadata)
$('#postBtn')?.addEventListener('click', async () => {
  const text = $('#composeText').value.trim();
  const file = fileInput.files?.[0];
  if (!text && !file) return alert('Add text or a file.');
  const media = file ? [{ filename: file.name, type: file.type, url: '' }] : [];
  try {
    const created = await api('/posts', { method: 'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ body: text, media }) });
    // optimistic render uses returned post
    renderPost(created);
    $('#composeText').value = '';
    fileInput.value = '';
    fileName.textContent = 'No file chosen';
    preview.setAttribute('hidden','');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    console.error(e); alert('Could not create post');
  }
});

// Delegated actions (approve, comment toggle, share, collaborate)
document.addEventListener('click', async (ev) => {
  const likeBtn = ev.target.closest('.likeBtn');
  if (likeBtn) {
    const postId = likeBtn.dataset.id;
    try {
      const j = await api(`/posts/${postId}/approve`, { method: 'POST' });
      likeBtn.querySelector('.like-count').textContent = `(${j.likes})`;
    } catch (e) { console.error(e); }
    return;
  }

  const commentBtn = ev.target.closest('.commentBtn');
  if (commentBtn) {
    const postCard = commentBtn.closest('.post');
    const postId = commentBtn.dataset.id;
    const box = document.querySelector(`.commentbox[data-post="${postId}"]`);
    if (box) box.hidden = !box.hidden;
    return;
  }

  const postComment = ev.target.closest('.postComment');
  if (postComment) {
    const box = postComment.closest('.commentbox');
    const postId = box.dataset.post;
    const input = box.querySelector('input');
    const txt = input.value.trim();
    if (!txt) return;
    // TODO: send to /posts/:id/comments
    input.value = '';
    alert('Comment posted (UI-only demo).');
    return;
  }

  const shareBtn = ev.target.closest('.shareBtn');
  if (shareBtn) {
    const postId = shareBtn.dataset.id;
    navigator.clipboard?.writeText(`${location.origin}/posts/${postId}`).then(()=> alert('Share link copied!')).catch(()=> alert('Copy failed'));
    return;
  }

  const collabBtn = ev.target.closest('.collabBtn');
  if (collabBtn) {
    const target = collabBtn.dataset.author;
    if (!target) return alert('Cannot collaborate with unknown user.');
    try {
      const j = await api(`/collab/${target}`, { method: 'POST' });
      alert('Collaboration request sent!');
    } catch (e) { console.error(e); alert('Failed to send collaboration request'); }
    return;
  }
});

// Sidebar & misc wiring
$('#hamburger')?.addEventListener('click', () => {
  const sidebar = $('#sidebar');
  const open = sidebar.classList.toggle('open');
  $('#hamburger').classList.toggle('active', open);
  $('#hamburger').setAttribute('aria-expanded', String(open));
});
$('#fab')?.addEventListener('click', () => { $('#composeText').focus(); window.scrollTo({ top:0, behavior:'smooth' }); });
$('#createPostSidebar')?.addEventListener('click', () => { $('#composeText').focus(); });
$('#logout')?.addEventListener('click', async () => {
  try { await fetch(`${API}/auth/logout`, { method:'POST', credentials:'include' }); } catch {}
  localStorage.removeItem(tokenKey);
  location.href = 'login.html';
});
$('#enableGeo')?.addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition(pos => {
    $('#nearbyList').innerHTML = `<li>Projects near ${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}</li>`;
  }, ()=> alert('Location denied'));
});

loadMeAndFeed();
