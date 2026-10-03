const express = require('express');
const { db } = require('../db/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all tables with live status and active order details
router.get('/', (req, res) => {
  try {
    const tables = db.prepare('SELECT * FROM cafe_tables ORDER BY table_number ASC').all();

    const enriched = tables.map(t => {
      let activeOrder = null;
      if (t.active_order_id) {
        activeOrder = db.prepare(`
          SELECT id, order_number, guest_name, status, total_amount, estimated_wait_min, created_at
          FROM orders WHERE id = ?
        `).get(t.active_order_id);

        if (activeOrder) {
          const items = db.prepare('SELECT name, quantity FROM order_items WHERE order_id = ?').all(activeOrder.id);
          activeOrder.items = items;
        }
      }
      return {
        ...t,
        activeOrder
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Fetch tables error:', err);
    res.status(500).json({ error: 'Failed to retrieve tables' });
  }
});

// Update table status (Staff / Admin)
router.patch('/:tableNumber/status', requireRole(['staff', 'admin']), (req, res) => {
  try {
    const { status, notes } = req.body;
    const allowed = ['available', 'occupied', 'reserved'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }

    const tableNum = parseInt(req.params.tableNumber, 10);
    const table = db.prepare('SELECT * FROM cafe_tables WHERE table_number = ?').get(tableNum);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const activeOrderId = status === 'available' ? null : table.active_order_id;

    db.prepare(`
      UPDATE cafe_tables
      SET status = ?, active_order_id = ?, notes = COALESCE(?, notes)
      WHERE table_number = ?
    `).run(status, activeOrderId, notes || null, tableNum);

    const updated = db.prepare('SELECT * FROM cafe_tables WHERE table_number = ?').get(tableNum);

    const io = req.app.get('io');
    if (io) {
      io.emit('table_status_changed', { tableNumber: tableNum, status, activeOrderId });
    }

    res.json({ message: `Table ${tableNum} updated to ${status}`, table: updated });
  } catch (err) {
    console.error('Update table error:', err);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Reserve table
router.post('/:tableNumber/reserve', (req, res) => {
  try {
    const { reservedBy, notes } = req.body;
    const tableNum = parseInt(req.params.tableNumber, 10);

    const table = db.prepare('SELECT * FROM cafe_tables WHERE table_number = ?').get(tableNum);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    if (table.status === 'occupied') {
      return res.status(400).json({ error: `Table ${tableNum} is currently occupied` });
    }

    db.prepare(`
      UPDATE cafe_tables
      SET status = 'reserved', reserved_by = ?, notes = ?
      WHERE table_number = ?
    `).run(reservedBy || 'Café Guest', notes || 'Reserved via Daily Drip Portal', tableNum);

    const updated = db.prepare('SELECT * FROM cafe_tables WHERE table_number = ?').get(tableNum);

    const io = req.app.get('io');
    if (io) {
      io.emit('table_status_changed', { tableNumber: tableNum, status: 'reserved', reservedBy });
    }

    res.json({ message: `Table ${tableNum} successfully reserved for ${reservedBy || 'Guest'}`, table: updated });
  } catch (err) {
    console.error('Reserve table error:', err);
    res.status(500).json({ error: 'Failed to reserve table' });
  }
});

module.exports = router;
