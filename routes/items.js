const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ── Middleware ────────────────────────────────────────────────────────────────

// Verifies the JWT token on protected routes
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // expects "Bearer <token>"
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Only allows admin users through
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ── US-3: View Item List ──────────────────────────────────────────────────────

// GET /items?search=keyboard&page=1
router.get('/', (req, res) => {
  const search = req.query.search || '';
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const items = db.prepare(
    'SELECT * FROM items WHERE name LIKE ? OR description LIKE ? LIMIT ? OFFSET ?'
  ).all(`%${search}%`, `%${search}%`, limit, offset);

  const total = db.prepare(
    'SELECT COUNT(*) as count FROM items WHERE name LIKE ? OR description LIKE ?'
  ).get(`%${search}%`, `%${search}%`);

  res.json({ items, page, total: total.count });
});

// ── US-4: Favourites ──────────────────────────────────────────────────────────

// GET /items/favourites - get current user's favourites
router.get('/favourites', authenticate, (req, res) => {
  const favs = db.prepare(`
    SELECT items.* FROM items
    JOIN favourites ON items.id = favourites.item_id
    WHERE favourites.user_id = ?
  `).all(req.user.userId);

  res.json({ favourites: favs });
});

// POST /items/favourites/:id - add to favourites
router.post('/favourites/:id', authenticate, (req, res) => {
  const itemId = parseInt(req.params.id);
  const userId = req.user.userId;

  // Check item exists
  const item = db.prepare('SELECT id FROM items WHERE id = ?').get(itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  // Check 50-item cap
  const count = db.prepare('SELECT COUNT(*) as count FROM favourites WHERE user_id = ?').get(userId);
  if (count.count >= 50) return res.status(400).json({ error: 'Favourites limit of 50 reached' });

  // Check already favourited
  const exists = db.prepare('SELECT id FROM favourites WHERE user_id = ? AND item_id = ?').get(userId, itemId);
  if (exists) return res.status(409).json({ error: 'Item already in favourites' });

  db.prepare('INSERT INTO favourites (user_id, item_id) VALUES (?, ?)').run(userId, itemId);
  res.status(201).json({ message: 'Added to favourites' });
});

// DELETE /items/favourites/:id - remove from favourites
router.delete('/favourites/:id', authenticate, (req, res) => {
  const itemId = parseInt(req.params.id);
  const result = db.prepare('DELETE FROM favourites WHERE user_id = ? AND item_id = ?').run(req.user.userId, itemId);

  if (result.changes === 0) return res.status(404).json({ error: 'Favourite not found' });
  res.json({ message: 'Removed from favourites' });
});

// ── US-5: Admin CRUD ──────────────────────────────────────────────────────────

// POST /items/admin - add new item
router.post('/admin', authenticate, adminOnly, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Item name is required' });

  const result = db.prepare('INSERT INTO items (name, description) VALUES (?, ?)').run(name, description || '');
  console.log(`[ADMIN] Item created: ${name} by user ${req.user.email}`);
  res.status(201).json({ message: 'Item created', itemId: result.lastInsertRowid });
});

// PUT /items/admin/:id - update item
router.put('/admin/:id', authenticate, adminOnly, (req, res) => {
  const { name, description } = req.body;
  const result = db.prepare('UPDATE items SET name = ?, description = ? WHERE id = ?')
    .run(name, description, req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  console.log(`[ADMIN] Item updated: id=${req.params.id} by user ${req.user.email}`);
  res.json({ message: 'Item updated' });
});

// DELETE /items/admin/:id - delete item
router.delete('/admin/:id', authenticate, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  console.log(`[ADMIN] Item deleted: id=${req.params.id} by user ${req.user.email}`);
  res.json({ message: 'Item deleted' });
});

module.exports = router;