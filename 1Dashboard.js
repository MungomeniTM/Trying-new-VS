/* Config */
const API = 'http://localhost:4000/api';
const tokenKey = 'vsx_token';

/* Utilities */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const token = () => localStorage.getItem(tokenKey);

/* Accept token via #token=... after OAuth */
(function pickUpHashToken(){
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const t = hash.get('token');
  if (t){ localStorage.setItem(tokenKey, t); history.replaceState(null,'',location.pathname); }
})();

/* Basic API client */
async function api(path, opts={}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers||{}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {})
    },
    credentials: 'include'
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message || 'Request failed');
  return res.json();
}

/* UI wiring */
const sidebar = $('#sidebar');
const hamburger = $('#hamburger');
hamburger?.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open');
  hamburger.classList.toggle('active', open);
  hamburger.setAttribute('aria-expanded', String(open));
});
$('#fab').addEventListener('click', () => { $('#composeText').focus(); scrollTo({ top: 0, behavior: 'smooth' }); });
$('#createPostSidebar').addEventListener('click', () => { $('#composeText').focus(); });

/* Logout */
$('#logout').addEventListener('click', async () => {
  localStorage.removeItem(tokenKey);
  try { await fetch(`${API}/auth/logout`, { method:'POST', credentials:'include' }); } catch {}
  location.href = 'login.html';
});

/* Location */
$('#enableGeo').addEventListener('click', () => {
  if (!navigator.geolocation) return alert('Geolocation not supported by your browser.');
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const ul = $('#nearbyList');
    ul.innerHTML = `
      <li>Construction crew needed • 3km away</li>
      <li>Solar install quote • 5km away</li>
      <li>Plumbing emergency • 8km away</li>
    `;
  }, () => alert('Could not get location.'));
});

/* Composer */
const fileInput = $('#composeFile');
const fileName = $('#fileName');
const preview = $('#preview');
const previewMedia = $('#previewMedia');

fileInput.addEventListener('change', () => {
  const f = fileInput.files?.[0];
  fileName.textContent = f ? f.name : 'No file chosen';
  renderPreview();
});
$('#previewBtn').addEventListener('click', (e) => {
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

/* Post submit (demo: local feed only; wire to /api/posts later) */
$('#postBtn').addEventListener('click', async () => {
  const text = $('#composeText').value.trim();
  if (!text && !fileInput.files?.length) return alert('Add text or a file.');
  const media = fileInput.files?.[0] ? { name: fileInput.files[0].name, type: fileInput.files[0].type } : null;

  // optimistic add
  addPost({
    name: currentUser.name || 'You',
    role: currentUser.role || 'Member',
    location: currentUser.location || '',
    time: 'Just now',
    body: text,
    media
  }, true);

  // reset
  $('#composeText').value = '';
  fileInput.value = '';
  fileName.textContent = 'No file chosen';
  preview.setAttribute('hidden','');

  // TODO: Send to backend with multipart upload
});

/* Load user + seed feed */
let currentUser = { name:'User' };
async function loadMe() {
  try {
    const { user } = await api('/me');
    currentUser = {
      id: user._id || user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User',
      email: user.email,
      role: user.role || '',
      location: user.location || '',
      portfolio: user.portfolio || ''
    };
  } catch (e) {
    // Try refresh
    try {
      const r = await fetch(`${API}/auth/refresh`, { method:'POST', credentials:'include' });
      if (r.ok) {
        const j = await r.json();
        localStorage.setItem(tokenKey, j.token);
        return loadMe();
      }
    } catch {}
    return location.replace('login.html');
  }

  // Paint UI
  $('#userName').textContent = currentUser.name;
  $('#userRole').textContent = [currentUser.role || 'Member', currentUser.location || ''].filter(Boolean).join(' • ');
  // avatar (initials)
  $('#avatar').textContent = (currentUser.name.split(' ').map(s=>s[0]).join('') || '👤').slice(0,2);

  // Seed feed
  const seed = [
    {
      name: 'Matodzi Magwabeni',
      role: 'Builder',
      location: 'Thohoyandou',
      time: '2d',
      body: "Here's a double storey we built in 7 months 💪🏽",
      media: { name:'sample-work.jpg', type:'image/jpeg' }
    },
    {
      name: 'Jane Doe',
      role: 'Interior Finishes',
      location: 'Midrand',
      time: '1d',
      body: 'Kitchen refurb demo: tiling + plumbing updates.',
      media: null
    }
  ];
  $('#feed').innerHTML = '';
  seed.forEach(p => addPost(p));
}

function addPost(p, mine=false) {
  const card = document.createElement('article');
  card.className = 'card post';

  card.innerHTML = `
    <div class="post-head">
      <div class="avatar small" aria-hidden="true">${(p.name||'U').split(' ').map(s=>s[0]).join('').slice(0,2)}</div>
      <div>
        <div class="name">${p.name || 'User'}${mine ? ' <span class="muted">(you)</span>' : ''}</div>
        <div class="meta">${[p.role, p.location].filter(Boolean).join(' • ')} • ${p.time || 'Just now'}</div>
      </div>
    </div>
    <div class="body">${(p.body||'').replace(/</g,'&lt;')}</div>
    ${p.media ? renderMedia(p.media) : ''}
    <div class="actions">
      <button class="action">Approve ❤️</button>
      <button class="action">Comment 💬</button>
      <button class="action">Share 🔗</button>
      <button class="action">Collaborate 🤝</button>
    </div>
    <div class="commentbox">
      <input type="text" placeholder="Write a comment…" />
      <button class="btn ghost">Post</button>
    </div>
  `;

  $('#feed').prepend(card);
}

function renderMedia(media){
  const isVideo = media.type?.startsWith('video/');
  if (isVideo) {
    return `<video class="media" controls src="" title="${media.name}"></video>`;
  }
  return `<figure class="media"><img alt="${media.name}" src="" /></figure>`;
}

/* Search form (no-op for now) */
$('.search')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#globalSearch').value.trim();
  if (q) location.href = `search.html?q=${encodeURIComponent(q)}`;
});

/* Kickoff */
loadMe();
