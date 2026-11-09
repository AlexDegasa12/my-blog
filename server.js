const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- tiny "database" (a JSON file) ----
function readPosts() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function savePosts(posts) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2));
}
const clean = (v, max) => String(v || '').trim().slice(0, max);

// ---- routes ----
app.get('/api/posts', (req, res) => {
  res.json(readPosts());
});

app.post('/api/posts', (req, res) => {
  const author = clean(req.body.author, 40) || 'Anonymous';
  const title = clean(req.body.title, 100);
  const body = clean(req.body.body, 2000);
  if (!title || !body) return res.status(400).json({ error: 'Title and message are required.' });

  const posts = readPosts();
  const post = { id: Date.now(), author, title, body, date: new Date().toISOString(), comments: [] };
  posts.unshift(post);
  try {
    savePosts(posts);
  } catch (error) {
    console.error('Failed to save post:', error);
    return res.status(500).json({ error: 'Unable to save post. Check that data.json is writable.' });
  }
  res.status(201).json(post);
});

app.post('/api/posts/:id/comments', (req, res) => {
  const author = clean(req.body.author, 40) || 'Anonymous';
  const text = clean(req.body.text, 500);
  if (!text) return res.status(400).json({ error: 'Comment cannot be empty.' });

  const posts = readPosts();
  const post = posts.find(p => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const comment = { author, text, date: new Date().toISOString() };
  post.comments.push(comment);
  savePosts(posts);
  res.status(201).json(comment);
});

app.listen(PORT, () => console.log(`Blog running at http://localhost:${PORT}`));
