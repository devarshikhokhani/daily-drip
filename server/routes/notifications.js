const express = require('express');
const { db } = require('../db/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get notifications
router.get('/', authenticateToken, (req, res) => {
  try {
    let query = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];

    if (req.user) {
      if (req.user.role === 'admin' || req.user.role === 'staff') {
        query += " AND (user_id = ? OR role_target IN ('staff', 'admin', 'all'))";
        params.push(req.user.id);
      } else {
        query += " AND (user_id = ? OR role_target IN ('customer', 'all'))";
        params.push(req.user.id);
      }
    } else {
      query += " AND role_target = 'all'";
    }

    query += ' ORDER BY id DESC LIMIT 20';
    const list = db.prepare(query).all(...params);

    const unreadCount = list.filter(n => !n.read).length;

    res.json({ notifications: list, unreadCount });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('Read notification error:', err);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// Mark all as read
router.post('/mark-all-read', authenticateToken, (req, res) => {
  try {
    if (req.user) {
      db.prepare(`
        UPDATE notifications SET read = 1
        WHERE user_id = ? OR role_target = ? OR role_target = 'all'
      `).run(req.user.id, req.user.role);
    }
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

// Broadcast Staff / Emergency Café Alert
router.post('/alert', requireRole(['staff', 'admin']), (req, res) => {
  try {
    const { title, message, type = 'alert', tableNumber, orderNumber } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const insert = db.prepare(`
      INSERT INTO notifications (role_target, title, message, type)
      VALUES ('all', ?, ?, ?)
    `);
    insert.run(title, message, type);

    const io = req.app.get('io');
    if (io) {
      io.emit('live_cafe_alert', {
        title,
        message,
        type,
        tableNumber,
        orderNumber,
        timestamp: Date.now()
      });
    }

    res.json({ message: 'Live alert broadcast to all connected devices' });
  } catch (err) {
    console.error('Broadcast alert error:', err);
    res.status(500).json({ error: 'Failed to broadcast alert' });
  }
});

module.exports = router;
