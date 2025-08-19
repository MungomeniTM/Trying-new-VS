const feed = document.getElementById('feed');
const createPostBtn = document.getElementById('createPostBtn');
const postText = document.getElementById('postText');
const postMedia = document.getElementById('postMedia');
const token = localStorage.getItem('jwt'); // JWT after login
const socket = io('http://localhost:5000');

// Fetch feed
async function loadFeed() {
    const res = await axios.get('/api/posts', { headers:{ Authorization:`Bearer ${token}` } });
    feed.innerHTML = '';
    res.data.forEach(post => {
        const postEl = document.createElement('div');
        postEl.className = 'post';
        postEl.innerHTML = `
            <div class="post-header">
                <img src="${post.user.profilePic || 'assets/default.png'}" alt="">
                <strong>${post.user.name}</strong> <span>• ${post.user.skills.join(', ')}</span>
            </div>
            <div class="post-body">
                <p>${post.text || ''}</p>
                ${post.media.map(m => m.endsWith('.mp4') ? `<video controls src="${m}"></video>` : `<img src="${m}">`).join('')}
            </div>
            <div class="post-actions">
                <button onclick="approvePost('${post._id}')">Approve ❤️🤝 (${post.likes.length})</button>
                <button onclick="openComments('${post._id}')">Comment 💬 (${post.comments.length})</button>
                <button onclick="sharePost('${post._id}')">Share 🔁</button>
                <button onclick="collabRequest('${post.user._id}')">Collaborate 🤝</button>
            </div>
        `;
        feed.appendChild(postEl);
    });
}
loadFeed();

// Create Post
createPostBtn.addEventListener('click', async () => {
    const formData = new FormData();
    formData.append('text', postText.value);
    for(let i=0;i<postMedia.files.length;i++){ formData.append('media', postMedia.files[i]); }
    await axios.post('/api/posts', formData, { headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'multipart/form-data' } });
    postText.value=''; postMedia.value=''; loadFeed();
});

// Approve
async function approvePost(postId){
    await axios.post(`/api/posts/${postId}/approve`, {}, { headers:{ Authorization:`Bearer ${token}` } });
    loadFeed();
}

// Share
async function sharePost(postId){
    await axios.post(`/api/posts/${postId}/share`, {}, { headers:{ Authorization:`Bearer ${token}` } });
    alert('Post shared!');
}

// Collaborate
async function collabRequest(userId){
    await axios.post(`/api/collaborate`, { receiverId:userId }, { headers:{ Authorization:`Bearer ${token}` } });
    alert('Collaboration request sent!');
}

// Comments Modal
const commentModal = document.getElementById('commentModal');
const commentsList = document.getElementById('commentsList');
const commentInput = document.getElementById('commentInput');
const sendCommentBtn = document.getElementById('sendCommentBtn');
let activePostId;

function openComments(postId){
    activePostId = postId;
    commentModal.style.display='block';
    loadComments(postId);
}

document.querySelector('.closeBtn').onclick = () => commentModal.style.display='none';

// Load comments
async function loadComments(postId){
    const res = await axios.get(`/api/posts/${postId}/comments`, { headers:{ Authorization:`Bearer ${token}` } });
    commentsList.innerHTML = res.data.map(c => `<p><strong>${c.user.name}:</strong> ${c.text}</p>`).join('');
}

// Send comment
sendCommentBtn.addEventListener('click', async () => {
    await axios.post(`/api/posts/${activePostId}/comment`, { text:commentInput.value }, { headers:{ Authorization:`Bearer ${token}` } });
    commentInput.value='';
    loadComments(activePostId);
});

// Real-time messaging example
socket.on('receiveMessage', msg => alert(`New message from ${msg.fromName}: ${msg.content}`));
