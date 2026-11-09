// ---------- helpers ----------
function formatDate(iso) {
  return new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}
// Build elements with textContent so visitors can't inject HTML/scripts
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ---------- PUBLIC API: DummyJSON random quote (Home page) ----------
async function loadQuote() {
  const q = document.getElementById('quote');
  const a = document.getElementById('quote-author');
  q.textContent = 'Loading quote...';
  try {
    const res = await fetch('https://dummyjson.com/quotes/random');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    q.textContent = '"' + data.quote + '"';
    a.textContent = '— ' + data.author;
  } catch {
    q.textContent = '"Keep going, you are doing great."';
    a.textContent = '— (offline backup quote)';
  }
}

// ---------- Home: latest posts ----------
async function loadLatest() {
  const box = document.getElementById('latest');
  const posts = await (await fetch('/api/posts')).json();
  if (!posts.length) { box.appendChild(el('p', 'muted', 'No posts yet. Be the first on the Blog page!')); return; }
  posts.slice(0, 3).forEach(p => {
    const card = el('div', 'post');
    card.appendChild(el('h3', '', p.title));
    card.appendChild(el('p', 'muted', 'by ' + p.author + ' · ' + formatDate(p.date)));
    card.appendChild(el('p', '', p.body.length > 150 ? p.body.slice(0, 150) + '...' : p.body));
    box.appendChild(card);
  });
}

// ---------- Blog page ----------
function renderComment(c) {
  const d = el('div', 'comment');
  d.appendChild(el('strong', '', c.author));
  d.appendChild(el('span', 'muted', '  ' + formatDate(c.date)));
  d.appendChild(el('div', '', c.text));
  return d;
}

function renderPost(p) {
  const card = el('article', 'post');
  card.appendChild(el('h3', '', p.title));
  card.appendChild(el('p', 'muted', 'by ' + p.author + ' · ' + formatDate(p.date)));
  card.appendChild(el('p', '', p.body));

  const box = el('div', 'comments');
  box.appendChild(el('strong', '', 'Comments'));
  const list = el('div');
  p.comments.forEach(c => list.appendChild(renderComment(c)));
  box.appendChild(list);

  const form = el('form', 'comment-form');
  const name = el('input'); name.placeholder = 'Name (optional)'; name.maxLength = 40;
  const text = el('input'); text.placeholder = 'Write a comment...'; text.maxLength = 500; text.required = true;
  const btn = el('button', 'btn small', 'Comment'); btn.type = 'submit';
  form.append(name, text, btn);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const res = await fetch('/api/posts/' + p.id + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: name.value, text: text.value })
    });
    if (res.ok) { list.appendChild(renderComment(await res.json())); text.value = ''; }
  });
  box.appendChild(form);
  card.appendChild(box);
  return card;
}

async function loadPosts() {
  const wrap = document.getElementById('posts');
  wrap.innerHTML = '';
  const res = await fetch('/api/posts');
  if (!res.ok) throw new Error('Unable to load posts.');
  const posts = await res.json();
  if (!posts.length) wrap.appendChild(el('p', 'muted', 'No posts yet. Write the first one!'));
  posts.forEach(p => wrap.appendChild(renderPost(p)));
}

function setupPostForm() {
  const form = document.getElementById('post-form');
  const msg = document.getElementById('post-msg');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    msg.textContent = 'Publishing...';
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: document.getElementById('p-author').value,
          title: document.getElementById('p-title').value,
          body: document.getElementById('p-body').value
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to publish post.');
      form.reset();
      msg.textContent = 'Posted!';
      try {
        await loadPosts();
      } catch {
        msg.textContent = 'Posted, but the posts list could not be refreshed.';
      }
    } catch (error) {
      msg.textContent = error instanceof TypeError
        ? 'Could not connect to the blog server. Start it with "npm start" from the my-blog folder, then try again.'
        : error.message;
    }
  });
}

// ---------- run the right code for the right page ----------
if (document.getElementById('quote')) {
  loadQuote();
  document.getElementById('new-quote').addEventListener('click', loadQuote);
  loadLatest();
}
if (document.getElementById('posts')) {
  setupPostForm();
  loadPosts().catch(() => {
    document.getElementById('posts').appendChild(
      el('p', 'muted', 'Could not load posts. Make sure the blog server is running with "npm start".')
    );
  });
}
