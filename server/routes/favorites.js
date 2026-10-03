const express = require('express');
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Get customer favorites
router.get('/', requireAuth, (req, res) => {
  try {
    const favorites = db.prepare(`
      SELECT m.*, f.created_at as favorited_at
      FROM user_favorites f
      JOIN menu_items m ON f.menu_item_id = m.id
      WHERE f.user_id = ?
      ORDER BY f.id DESC
    `).all(req.user.id);

    const parsed = favorites.map(item => ({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : [],
      customizableOptions: item.customizable_options ? JSON.parse(item.customizable_options) : null
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Fetch favorites error:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add to favorites
router.post('/:menuItemId', requireAuth, (req, res) => {
  try {
    const itemId = parseInt(req.params.menuItemId, 10);
    const item = db.prepare('SELECT id, name FROM menu_items WHERE id = ?').get(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    db.prepare(`
      INSERT OR IGNORE INTO user_favorites (user_id, menu_item_id)
      VALUES (?, ?)
    `).run(req.user.id, itemId);

    res.status(201).json({ message: `Added ${item.name} to favorites ❤️` });
  } catch (err) {
    console.error('Add favorite error:', err);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Remove from favorites
router.delete('/:menuItemId', requireAuth, (req, res) => {
  try {
    const itemId = parseInt(req.params.menuItemId, 10);
    db.prepare('DELETE FROM user_favorites WHERE user_id = ? AND menu_item_id = ?').run(req.user.id, itemId);
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    console.error('Remove favorite error:', err);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;
