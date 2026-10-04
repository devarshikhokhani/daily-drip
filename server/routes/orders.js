const express = require('express');
const { db } = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Helper to calculate queue position and estimated wait
function cleanItemName(item, custom = {}) {
  let name = (item.name || '').trim();
  if (name && !name.toLowerCase().includes('undefined') && name !== '') {
    return name;
  }
  const parts = [
    custom.size && !custom.size.toLowerCase().includes('undefined') ? custom.size : null,
    custom.flavor && custom.flavor !== 'None' && !custom.flavor.toLowerCase().includes('undefined') ? custom.flavor : null,
    custom.baseDrink && !custom.baseDrink.toLowerCase().includes('undefined') ? custom.baseDrink : 'Craft Specialty Coffee'
  ].filter(Boolean);
  return parts.join(' ').trim() || 'Craft Specialty Coffee';
}

function getQueueMetrics(orderId, createdAt) {
  // Count active orders placed before this order that are not completed
  const activeStatuses = ['new', 'accepted', 'preparing'];
  const placeholders = activeStatuses.map(() => '?').join(',');

  const beforeQuery = `
    SELECT COUNT(*) as count FROM orders
    WHERE status IN (${placeholders})
    AND (created_at < ? OR (created_at = ? AND id < ?))
  `;
  const ordersBefore = db.prepare(beforeQuery).get(...activeStatuses, createdAt, createdAt, orderId).count;

  // Each active order adds ~3-4 minutes
  const estimatedWait = Math.max(3, (ordersBefore + 1) * 3);

  return { ordersBefore, estimatedWait };
}

// Live Rush Meter status
router.get('/rush', (req, res) => {
  try {
    const activeCount = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE status IN ('new', 'accepted', 'preparing')
    `).get().count;

    let level = 'not_busy';
    let label = 'NOT BUSY';
    let color = 'green';
    let waitMinutes = 5;

    if (activeCount >= 6) {
      level = 'very_busy';
      label = 'VERY BUSY';
      color = 'red';
      waitMinutes = Math.min(35, 15 + activeCount * 3);
    } else if (activeCount >= 3) {
      level = 'moderately_busy';
      label = 'MODERATELY BUSY';
      color = 'orange';
      waitMinutes = 12;
    }

    res.json({
      activeCount,
      level,
      label,
      color,
      waitMinutes,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Fetch rush error:', err);
    res.status(500).json({ error: 'Failed to calculate rush status' });
  }
});

// Smart Café Queue
router.get('/queue', (req, res) => {
  try {
    const activeOrders = db.prepare(`
      SELECT id, order_number, guest_name, table_number, status, total_amount, estimated_wait_min, created_at
      FROM orders
      WHERE status IN ('new', 'accepted', 'preparing', 'ready')
      ORDER BY id ASC
    `).all();

    res.json({
      activeOrders,
      totalInQueue: activeOrders.length
    });
  } catch (err) {
    console.error('Fetch queue error:', err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// Café Remembers You - Get user's usual order
router.get('/user/usual', requireAuth, (req, res) => {
  try {
    // Find the latest completed or any past order of this user
    const lastOrder = db.prepare(`
      SELECT id, order_number, total_amount, table_number, created_at
      FROM orders
      WHERE user_id = ? AND status != 'cancelled'
      ORDER BY id DESC
      LIMIT 1
    `).get(req.user.id);

    if (!lastOrder) {
      return res.json({ usual: null });
    }

    const items = db.prepare(`
      SELECT * FROM order_items WHERE order_id = ?
    `).all(lastOrder.id);

    const parsedItems = items.map(i => ({
      ...i,
      customization: i.customization ? JSON.parse(i.customization) : null
    }));

    res.json({
      usual: {
        orderNumber: lastOrder.order_number,
        items: parsedItems,
        totalAmount: lastOrder.total_amount,
        lastOrderedAt: lastOrder.created_at
      }
    });
  } catch (err) {
    console.error('Fetch usual error:', err);
    res.status(500).json({ error: 'Failed to fetch usual order' });
  }
});

// Create Order (customer or guest)
router.post('/', async (req, res) => {
  try {
    const {
      items,
      tableNumber,
      guestName,
      notes,
      cupDesignData,
      cafeSessionId,
      coffeeDnaId,
      paymentMethod = 'demo_pay'
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your cart is empty. Please add items before ordering.' });
    }

    const userId = req.user ? req.user.id : null;
    const finalGuestName = req.user ? req.user.name : (guestName || 'Guest Explorer');

    // Calculate subtotal from items
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const basePrice = parseFloat(item.basePrice || item.price || 0);
      let itemPrice = basePrice;
      const custom = item.customization || {};

      // Dynamic pricing additions
      if (custom.size && custom.size.includes('Medium')) itemPrice += 30;
      if (custom.size && custom.size.includes('Large')) itemPrice += 60;
      if (custom.milk && (custom.milk.includes('Oat') || custom.milk.includes('Almond'))) itemPrice += 35;
      if (custom.milk && custom.milk.includes('Soy')) itemPrice += 25;
      if (custom.flavor && !custom.flavor.includes('Pure') && !custom.flavor.includes('No Flavor')) itemPrice += 25;
      if (Array.isArray(custom.addOns)) {
        for (const addOn of custom.addOns) {
          if (addOn.includes('Extra')) itemPrice += 40;
          else if (addOn.includes('Whipped')) itemPrice += 30;
          else if (addOn.includes('Caramel') || addOn.includes('Chocolate')) itemPrice += 20;
          else if (addOn.includes('Cinnamon')) itemPrice += 10;
        }
      }

      const qty = parseInt(item.quantity || 1, 10);
      const totalItemCost = itemPrice * qty;
      subtotal += totalItemCost;

      validatedItems.push({
        menuItemId: item.menuItemId || item.id || null,
        name: cleanItemName(item, custom),
        basePrice: itemPrice,
        quantity: qty,
        customization: custom,
        itemTotal: totalItemCost
      });
    }

    const tax = Math.round(subtotal * 0.05); // 5% GST
    const totalAmount = subtotal + tax;

    // Generate unique order number (next integer from max)
    const maxOrder = db.prepare('SELECT MAX(order_number) as maxNum FROM orders').get();
    const nextOrderNumber = (maxOrder && maxOrder.maxNum) ? maxOrder.maxNum + 1 : 101;

    // Calculate initial estimated wait time based on current active orders
    const activeCount = db.prepare(`
      SELECT COUNT(*) as count FROM orders
      WHERE status IN ('new', 'accepted', 'preparing')
    `).get().count;
    const estimatedWaitMin = Math.max(5, (activeCount + 1) * 3);

    // Insert Order
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, guest_name, table_number, status, total_amount, payment_status,
        payment_method, estimated_wait_min, cup_design_data, cafe_session_id, coffee_dna_id, notes
      ) VALUES (?, ?, ?, ?, 'new', ?, 'paid', ?, ?, ?, ?, ?, ?)
    `);

    const orderResult = insertOrder.run(
      nextOrderNumber,
      userId,
      finalGuestName,
      tableNumber ? parseInt(tableNumber, 10) : null,
      totalAmount,
      paymentMethod,
      estimatedWaitMin,
      cupDesignData || null,
      cafeSessionId || null,
      coffeeDnaId || null,
      notes || null
    );

    const orderId = orderResult.lastInsertRowid;

    // Insert Order Items
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, name, base_price, quantity, customization, item_total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const vItem of validatedItems) {
      insertItem.run(
        orderId,
        vItem.menuItemId,
        vItem.name,
        vItem.basePrice,
        vItem.quantity,
        JSON.stringify(vItem.customization),
        vItem.itemTotal
      );

      // Auto-Passport discovery: If user is authenticated and item matches menu with country, claim it!
      if (userId && vItem.menuItemId) {
        const menuItem = db.prepare('SELECT name, origin_country, origin_flag FROM menu_items WHERE id = ?').get(vItem.menuItemId);
        if (menuItem && menuItem.origin_country) {
          try {
            db.prepare(`
              INSERT OR IGNORE INTO coffee_passport (user_id, item_name, country, flag)
              VALUES (?, ?, ?, ?)
            `).run(userId, menuItem.name, menuItem.origin_country, menuItem.origin_flag || '☕');
          } catch (passErr) {
            // ignore duplicate passport entries
          }
        }
      }
    }

    // Update table status to occupied if table number provided
    if (tableNumber) {
      const parsedTableNum = parseInt(tableNumber, 10);
      db.prepare(`
        UPDATE cafe_tables
        SET status = 'occupied', active_order_id = ?, reserved_by = ?, notes = ?
        WHERE table_number = ?
      `).run(orderId, finalGuestName, `Order #${nextOrderNumber} (${finalGuestName})`, parsedTableNum);
    }

    // Add In-App Notification
    db.prepare(`
      INSERT INTO notifications (user_id, role_target, title, message, type, link)
      VALUES (?, 'staff', ?, ?, 'order', ?)
    `).run(
      userId,
      `New Order #${nextOrderNumber}`,
      `${finalGuestName} placed an order for ₹${totalAmount}${tableNumber ? ` (Table ${tableNumber})` : ''}`,
      `/orders/${orderId}`
    );

    // Fetch complete newly created order
    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    const orderPayload = {
      ...createdOrder,
      items: orderItems.map(i => ({
        ...i,
        customization: i.customization ? JSON.parse(i.customization) : null
      })),
      ordersBefore: activeCount,
      estimatedWaitMin
    };

    // Emit Real-time event via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('new_order', orderPayload);
      if (cafeSessionId) {
        io.to(`session_${cafeSessionId}`).emit('session_order_placed', orderPayload);
      }
      // Broadcast table update
      if (tableNumber) {
        io.emit('table_status_changed', {
          tableNumber: parseInt(tableNumber, 10),
          status: 'occupied',
          activeOrderId: orderId,
          reservedBy: finalGuestName,
          notes: `Order #${nextOrderNumber} (${finalGuestName})`
        });
      }
    }

    res.status(201).json({
      message: 'Order placed successfully! Coffee is in the smart queue.',
      order: orderPayload
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user orders or all orders (Staff/Admin)
router.get('/', (req, res) => {
  try {
    const isStaffOrAdmin = req.user && (req.user.role === 'staff' || req.user.role === 'admin');
    const { status, limit = 50 } = req.query;

    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (!isStaffOrAdmin) {
      // Must be authenticated to see their own orders
      if (!req.user) {
        return res.status(401).json({ error: 'Please sign in to view your orders' });
      }
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const orders = db.prepare(query).all(...params);

    const fullOrders = orders.map(ord => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(ord.id);
      return {
        ...ord,
        items: items.map(i => ({
          ...i,
          customization: i.customization ? JSON.parse(i.customization) : null
        }))
      };
    });

    res.json(fullOrders);
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

// Get Single Order with live queue info
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const { ordersBefore, estimatedWait } = getQueueMetrics(order.id, order.created_at);

    res.json({
      ...order,
      items: items.map(i => ({
        ...i,
        customization: i.customization ? JSON.parse(i.customization) : null
      })),
      ordersBefore: ['ready', 'completed', 'cancelled'].includes(order.status) ? 0 : ordersBefore,
      estimatedWaitMin: ['ready', 'completed', 'cancelled'].includes(order.status) ? 0 : estimatedWait
    });
  } catch (err) {
    console.error('Fetch single order error:', err);
    res.status(500).json({ error: 'Failed to retrieve order' });
  }
});

// Update Order Status (Staff / Admin)
// Workflow: new -> accepted -> preparing -> ready -> completed (or cancelled)
router.patch('/:id/status', requireRole(['staff', 'admin']), (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed values: ${allowed.join(', ')}` });
    }

    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    db.prepare(`
      UPDATE orders
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, req.params.id);

    // If completed or cancelled, free up associated table
    if (['completed', 'cancelled'].includes(status) && existing.table_number) {
      db.prepare(`
        UPDATE cafe_tables
        SET status = 'available', active_order_id = NULL, reserved_by = NULL, notes = NULL
        WHERE table_number = ?
      `).run(existing.table_number);
    }

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(updatedOrder.id);

    const payload = {
      ...updatedOrder,
      items: items.map(i => ({
        ...i,
        customization: i.customization ? JSON.parse(i.customization) : null
      }))
    };

    // Emit Realtime event
    const io = req.app.get('io');
    if (io) {
      io.emit('order_status_updated', payload);

      if (updatedOrder.cafe_session_id) {
        io.to(`session_${updatedOrder.cafe_session_id}`).emit('session_order_updated', payload);
      }

      // If status is ready, broadcast celebratory notification
      if (status === 'ready') {
        io.emit('order_ready_alert', {
          orderNumber: updatedOrder.order_number,
          guestName: updatedOrder.guest_name,
          tableNumber: updatedOrder.table_number
        });
      }

      // If table freed up
      if (['completed', 'cancelled'].includes(status) && existing.table_number) {
        io.emit('table_status_changed', { tableNumber: existing.table_number, status: 'available', activeOrderId: null });
      }
    }

    res.json({ message: `Order #${existing.order_number} marked as ${status}`, order: payload });
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Toggle Urgent Alert (Staff / Admin)
router.post('/:id/urgent', requireRole(['staff', 'admin']), (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const newUrgent = existing.is_urgent ? 0 : 1;
    db.prepare('UPDATE orders SET is_urgent = ? WHERE id = ?').run(newUrgent, req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('urgent_order_alert', {
        orderId: existing.id,
        orderNumber: existing.order_number,
        isUrgent: newUrgent === 1,
        tableNumber: existing.table_number
      });
    }

    res.json({ message: newUrgent ? 'Order flagged as URGENT' : 'Urgency flag cleared', isUrgent: newUrgent === 1 });
  } catch (err) {
    console.error('Urgent toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle urgency' });
  }
});

module.exports = router;
