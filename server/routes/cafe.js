const express = require('express');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate a random 4-digit numeric code
function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Host creates or gets active Café World Session
router.post('/session', authenticateToken, (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const forceNew = req.body && req.body.forceNew;

    if (!forceNew) {
      // Check if there's an existing active session with code
      const existing = db.prepare(`
        SELECT * FROM cafe_sessions
        WHERE status = 'active' AND datetime(expires_at) > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
      `).get();

      if (existing) {
        return res.json({
          session: {
            ...existing,
            currentDraft: existing.current_draft ? JSON.parse(existing.current_draft) : null
          }
        });
      }
    }

    // Create new temporary session
    const sessionId = `sess_${Date.now()}`;
    let code = generateCode();

    // Ensure code uniqueness
    while (db.prepare("SELECT id FROM cafe_sessions WHERE code = ? AND status = 'active'").get(code)) {
      code = generateCode();
    }

    const defaultDraft = JSON.stringify({
      baseDrink: 'Artisan Smoked Hazelnut Latte',
      size: 'Large (480ml)',
      milk: 'Oat Milk (Barista Blend)',
      sweetness: 'Normal (50%)',
      temperature: 'Hot',
      flavor: 'Roasted Hazelnut',
      addOns: ['Extra Espresso Shot'],
      tableNumber: 7
    });

    const insert = db.prepare(`
      INSERT INTO cafe_sessions (id, code, status, created_by, connected_devices, current_draft, expires_at)
      VALUES (?, ?, 'active', ?, 1, ?, datetime('now', '+3 hours'))
    `);

    insert.run(sessionId, code, userId, defaultDraft);

    const created = db.prepare('SELECT * FROM cafe_sessions WHERE id = ?').get(sessionId);

    res.status(201).json({
      session: {
        ...created,
        currentDraft: JSON.parse(created.current_draft)
      }
    });
  } catch (err) {
    console.error('Create café session error:', err);
    res.status(500).json({ error: 'Failed to create café session' });
  }
});

// Join / lookup session by 4-digit code
router.get('/session/code/:code', (req, res) => {
  try {
    const code = req.params.code.trim();

    // Refresh demo session 4827 so it remains active
    if (code === '4827') {
      db.prepare(`
        UPDATE cafe_sessions
        SET expires_at = datetime('now', '+3 hours'), status = 'active'
        WHERE code = '4827'
      `).run();
    }

    const session = db.prepare(`
      SELECT * FROM cafe_sessions
      WHERE code = ? AND status = 'active' AND datetime(expires_at) > datetime('now')
    `).get(code);

    if (!session) {
      const expiredSession = db.prepare('SELECT id, status, expires_at FROM cafe_sessions WHERE code = ?').get(code);
      if (expiredSession) {
        return res.status(404).json({ error: 'This café session has expired. Please ask the barista for a fresh session code or scan the new QR.' });
      }
      return res.status(404).json({ error: 'Café session not found. Please verify the code shown on the café screen.' });
    }

    res.json({
      session: {
        ...session,
        currentDraft: session.current_draft ? JSON.parse(session.current_draft) : null
      }
    });
  } catch (err) {
    console.error('Fetch session by code error:', err);
    res.status(500).json({ error: 'Failed to join session' });
  }
});

// Lookup session by session ID
router.get('/session/:id', (req, res) => {
  try {
    const session = db.prepare('SELECT * FROM cafe_sessions WHERE id = ?').get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      session: {
        ...session,
        currentDraft: session.current_draft ? JSON.parse(session.current_draft) : null
      }
    });
  } catch (err) {
    console.error('Fetch session error:', err);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

// Update live shared draft (sweetness, temp, milk, size, etc.)
router.put('/session/:id/draft', (req, res) => {
  try {
    const { draft, sourceDevice = 'customer' } = req.body;
    if (!draft) {
      return res.status(400).json({ error: 'Draft configuration is required' });
    }

    const session = db.prepare('SELECT * FROM cafe_sessions WHERE id = ?').get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const draftStr = JSON.stringify(draft);
    db.prepare('UPDATE cafe_sessions SET current_draft = ? WHERE id = ?').run(draftStr, req.params.id);

    // Broadcast two-way update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`session_${session.id}`).emit('live_draft_updated', {
        draft,
        sourceDevice,
        timestamp: Date.now()
      });
    }

    res.json({ message: 'Draft updated', draft });
  } catch (err) {
    console.error('Update draft error:', err);
    res.status(500).json({ error: 'Failed to update live draft' });
  }
});

// Send Cup Design Drawing to Café
router.post('/session/:id/cup-design', (req, res) => {
  try {
    const { drawingData, artistName } = req.body;
    if (!drawingData) {
      return res.status(400).json({ error: 'Drawing data is required' });
    }

    const session = db.prepare('SELECT * FROM cafe_sessions WHERE id = ?').get(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Broadcast cup design to café world room
    const io = req.app.get('io');
    if (io) {
      io.to(`session_${session.id}`).emit('new_cup_design', {
        drawingData,
        artistName: artistName || 'Customer Artist',
        timestamp: Date.now()
      });
    }

    res.json({ message: 'Design received! Displaying on Café World screen.' });
  } catch (err) {
    console.error('Cup design send error:', err);
    res.status(500).json({ error: 'Failed to send cup design' });
  }
});

// Update Order / Session Preparation Status (Live Loop)
router.post('/session/:id/status', (req, res) => {
  try {
    const { status, tableNumber = 7, orderId } = req.body;
    const allowed = ['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed values: ${allowed.join(', ')}` });
    }

    let order = null;
    if (orderId) {
      order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    } else {
      order = db.prepare(`
        SELECT * FROM orders
        WHERE (cafe_session_id = ? OR table_number = ?) AND status != 'completed'
        ORDER BY id DESC LIMIT 1
      `).get(req.params.id, tableNumber);
    }

    const io = req.app.get('io');

    if (order) {
      db.prepare(`
        UPDATE orders
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, order.id);

      if (['completed', 'cancelled'].includes(status) && order.table_number) {
        db.prepare(`
          UPDATE cafe_tables
          SET status = 'available', active_order_id = NULL
          WHERE table_number = ?
        `).run(order.table_number);
      }

      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

      const payload = {
        ...updated,
        items: items.map(i => ({
          ...i,
          customization: i.customization ? JSON.parse(i.customization) : null
        }))
      };

      if (io) {
        io.emit('order_status_updated', payload);
        io.to(`session_${req.params.id}`).emit('session_order_updated', payload);

        if (status === 'ready') {
          io.emit('order_ready_alert', {
            orderNumber: updated.order_number,
            guestName: updated.guest_name,
            tableNumber: updated.table_number
          });
        }
      }

      return res.json({ message: `Order #${updated.order_number} marked as ${status}`, order: payload });
    }

    // Even if no order placed yet, broadcast simulation status to session room
    if (io) {
      const payload = {
        status,
        table_number: tableNumber,
        cafe_session_id: req.params.id
      };
      io.emit('order_status_updated', payload);
      io.to(`session_${req.params.id}`).emit('session_order_updated', payload);
      if (status === 'ready') {
        io.emit('order_ready_alert', {
          orderNumber: 104,
          guestName: 'Café Customer',
          tableNumber
        });
      }
    }

    res.json({ message: `Café session status marked as ${status}` });
  } catch (err) {
    console.error('Session status update error:', err);
    res.status(500).json({ error: 'Failed to update session status' });
  }
});

module.exports = router;
