const express = require('express');
const { db } = require('../db/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all tables with live status and active order details
router.get('/', (req, res) => {
  try {
    let tables = db.prepare('SELECT * FROM cafe_tables ORDER BY table_number ASC').all();

    // Auto-populate if cafe_tables is empty
    if (!tables || tables.length === 0) {
      const insertTable = db.prepare('INSERT OR IGNORE INTO cafe_tables (table_number, capacity, status, reserved_by, notes) VALUES (?, ?, ?, ?, ?)');
      insertTable.run(1, 2, 'available', null, 'Cozy window seat with garden view');
      insertTable.run(2, 2, 'available', null, 'Bar counter corner with quick access');
      insertTable.run(3, 4, 'available', null, 'Center booth with charging outlets');
      insertTable.run(4, 4, 'available', null, 'Oak wood square table');
      insertTable.run(5, 6, 'reserved', 'Evening Book Club', 'Reserved for Evening Book Club at 6 PM');
      insertTable.run(6, 2, 'available', null, 'Sunny quiet alcove');
      insertTable.run(7, 4, 'occupied', 'Table 07 Session', 'Table 07 - Demo Session Active');
      insertTable.run(8, 2, 'available', null, 'Espresso bar stool');
      insertTable.run(9, 4, 'available', null, 'Patio outdoor umbrella table');
      insertTable.run(10, 6, 'available', null, 'Community work table with power strip');
      tables = db.prepare('SELECT * FROM cafe_tables ORDER BY table_number ASC').all();
    }

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
      } else {
        // Also check if any recent active order is assigned to this table
        const orderForTable = db.prepare(`
          SELECT id, order_number, guest_name, status, total_amount, estimated_wait_min, created_at
          FROM orders
          WHERE table_number = ? AND status IN ('new', 'accepted', 'preparing', 'ready')
          ORDER BY id DESC LIMIT 1
        `).get(t.table_number);

        if (orderForTable) {
          const items = db.prepare('SELECT name, quantity FROM order_items WHERE order_id = ?').all(orderForTable.id);
          orderForTable.items = items;
          activeOrder = orderForTable;
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
    const { status, notes, reservedBy } = req.body;
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
    const finalReservedBy = status === 'available' ? null : (reservedBy !== undefined ? reservedBy : (status === 'reserved' ? (table.reserved_by || 'Café Guest') : table.reserved_by));
    const finalNotes = status === 'available' ? null : (notes !== undefined ? notes : table.notes);

    db.prepare(`
      UPDATE cafe_tables
      SET status = ?, active_order_id = ?, reserved_by = ?, notes = ?
      WHERE table_number = ?
    `).run(status, activeOrderId, finalReservedBy, finalNotes, tableNum);

    const updated = db.prepare('SELECT * FROM cafe_tables WHERE table_number = ?').get(tableNum);

    const io = req.app.get('io');
    if (io) {
      io.emit('table_status_changed', {
        tableNumber: tableNum,
        status,
        activeOrderId,
        reservedBy: finalReservedBy,
        notes: finalNotes,
        table: updated
      });
    }

    res.json({ message: `Table ${tableNum} updated to ${status}`, table: updated });
  } catch (err) {
    console.error('Update table error:', err);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

// Reserve table (Customer / Staff / Admin)
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

    const guestName = reservedBy || 'Café Guest';
    const resNotes = notes || 'Reserved via Daily Drip Portal';

    db.prepare(`
      UPDATE cafe_tables
      SET status = 'reserved', reserved_by = ?, notes = ?
      WHERE table_number = ?
    `).run(guestName, resNotes, tableNum);

    const updated = db.prepare('SELECT * FROM cafe_tables WHERE table_number = ?').get(tableNum);

    const io = req.app.get('io');
    if (io) {
      io.emit('table_status_changed', {
        tableNumber: tableNum,
        status: 'reserved',
        reservedBy: guestName,
        notes: resNotes,
        table: updated
      });
    }

    res.json({ message: `Table ${tableNum} successfully reserved for ${guestName}`, table: updated });
  } catch (err) {
    console.error('Reserve table error:', err);
    res.status(500).json({ error: 'Failed to reserve table' });
  }
});

// Release table back to available
router.post('/:tableNumber/release', (req, res) => {
  try {
    const tableNum = parseInt(req.params.tableNumber, 10);
    const table = db.prepare('SELECT * FROM cafe_tables WHERE table_number = ?').get(tableNum);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    db.prepare(`
      UPDATE cafe_tables
      SET status = 'available', active_order_id = NULL, reserved_by = NULL, notes = NULL
      WHERE table_number = ?
    `).run(tableNum);

    const updated = db.prepare('SELECT * FROM cafe_tables WHERE table_number = ?').get(tableNum);

    const io = req.app.get('io');
    if (io) {
      io.emit('table_status_changed', {
        tableNumber: tableNum,
        status: 'available',
        activeOrderId: null,
        reservedBy: null,
        notes: null,
        table: updated
      });
    }

    res.json({ message: `Table ${tableNum} is now available`, table: updated });
  } catch (err) {
    console.error('Release table error:', err);
    res.status(500).json({ error: 'Failed to release table' });
  }
});

module.exports = router;
