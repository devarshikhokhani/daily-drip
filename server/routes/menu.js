const express = require('express');
const { db } = require('../db/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    res.json(categories);
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get featured menu items for landing page
router.get('/featured', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT * FROM menu_items
      WHERE available = 1
      ORDER BY id ASC
      LIMIT 6
    `).all();

    const parsed = items.map(item => ({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : [],
      customizableOptions: item.customizable_options ? JSON.parse(item.customizable_options) : null
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Fetch featured items error:', err);
    res.status(500).json({ error: 'Failed to fetch featured drinks' });
  }
});

// Get all menu items with search & filter
router.get('/', (req, res) => {
  try {
    const { category, search, all } = req.query;
    let query = 'SELECT * FROM menu_items WHERE 1=1';
    const params = [];

    // If not admin requesting all, only show available items
    if (all !== 'true') {
      query += ' AND available = 1';
    }

    if (category && category !== 'all') {
      query += ' AND category_slug = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ? OR origin_country LIKE ?)';
      params.push(term, term, term, term);
    }

    query += ' ORDER BY id ASC';

    const items = db.prepare(query).all(...params);

    const parsed = items.map(item => ({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : [],
      customizableOptions: item.customizable_options ? JSON.parse(item.customizable_options) : null
    }));

    res.json(parsed);
  } catch (err) {
    console.error('Fetch menu error:', err);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get single menu item
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({
      ...item,
      tags: item.tags ? JSON.parse(item.tags) : [],
      customizableOptions: item.customizable_options ? JSON.parse(item.customizable_options) : null
    });
  } catch (err) {
    console.error('Fetch single item error:', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Admin: Add new menu item
router.post('/', requireRole(['admin']), (req, res) => {
  try {
    const {
      categorySlug,
      name,
      description,
      basePrice,
      imageUrl,
      available = 1,
      tags = [],
      customizableOptions,
      originCountry,
      originFlag
    } = req.body;

    if (!categorySlug || !name || basePrice === undefined) {
      return res.status(400).json({ error: 'Category, name, and base price are required' });
    }

    const insert = db.prepare(`
      INSERT INTO menu_items (
        category_slug, name, description, base_price, image_url, available, tags, customizable_options, origin_country, origin_flag
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      categorySlug,
      name.trim(),
      description || '',
      parseFloat(basePrice),
      imageUrl || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600',
      available ? 1 : 0,
      JSON.stringify(tags || []),
      customizableOptions ? JSON.stringify(customizableOptions) : null,
      originCountry || 'Specialty',
      originFlag || '☕'
    );

    const newItem = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(result.lastInsertRowid);

    // Notify connected clients via global socket if available
    const io = req.app.get('io');
    if (io) {
      io.emit('menu_updated', { action: 'create', item: newItem });
    }

    res.status(201).json({
      message: 'Item added successfully',
      item: {
        ...newItem,
        tags: newItem.tags ? JSON.parse(newItem.tags) : [],
        customizableOptions: newItem.customizable_options ? JSON.parse(newItem.customizable_options) : null
      }
    });
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

// Admin: Update menu item
router.put('/:id', requireRole(['admin']), (req, res) => {
  try {
    const {
      categorySlug,
      name,
      description,
      basePrice,
      imageUrl,
      available,
      tags,
      customizableOptions,
      originCountry,
      originFlag
    } = req.body;

    const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const update = db.prepare(`
      UPDATE menu_items SET
        category_slug = COALESCE(?, category_slug),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        base_price = COALESCE(?, base_price),
        image_url = COALESCE(?, image_url),
        available = COALESCE(?, available),
        tags = COALESCE(?, tags),
        customizable_options = COALESCE(?, customizable_options),
        origin_country = COALESCE(?, origin_country),
        origin_flag = COALESCE(?, origin_flag)
      WHERE id = ?
    `);

    update.run(
      categorySlug,
      name ? name.trim() : null,
      description,
      basePrice !== undefined ? parseFloat(basePrice) : null,
      imageUrl,
      available !== undefined ? (available ? 1 : 0) : null,
      tags ? JSON.stringify(tags) : null,
      customizableOptions ? JSON.stringify(customizableOptions) : null,
      originCountry,
      originFlag,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('menu_updated', { action: 'update', item: updated });
    }

    res.json({
      message: 'Item updated successfully',
      item: {
        ...updated,
        tags: updated.tags ? JSON.parse(updated.tags) : [],
        customizableOptions: updated.customizable_options ? JSON.parse(updated.customizable_options) : null
      }
    });
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Admin/Staff: Toggle item availability & channels (Dine-in / Delivery)
router.patch('/:id/availability', requireRole(['admin', 'staff']), (req, res) => {
  try {
    const { available, delivery_available, dine_in_available } = req.body;
    if (available !== undefined) {
      db.prepare('UPDATE menu_items SET available = ? WHERE id = ?').run(available ? 1 : 0, req.params.id);
    }
    if (delivery_available !== undefined) {
      db.prepare('UPDATE menu_items SET delivery_available = ? WHERE id = ?').run(delivery_available ? 1 : 0, req.params.id);
    }
    if (dine_in_available !== undefined) {
      db.prepare('UPDATE menu_items SET dine_in_available = ? WHERE id = ?').run(dine_in_available ? 1 : 0, req.params.id);
    }
    const item = db.prepare('SELECT id, name, available, delivery_available, dine_in_available FROM menu_items WHERE id = ?').get(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('menu_updated', { action: 'availability', item });
    }

    res.json({ message: 'Availability updated', item });
  } catch (err) {
    console.error('Toggle availability error:', err);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

// Admin: Delete item
router.delete('/:id', requireRole(['admin']), (req, res) => {
  try {
    const existing = db.prepare('SELECT id, name FROM menu_items WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Item not found' });
    }

    db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('menu_updated', { action: 'delete', id: req.params.id });
    }

    res.json({ message: `Item "${existing.name}" removed successfully` });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

module.exports = router;
