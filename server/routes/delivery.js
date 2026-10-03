const express = require('express');
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Helper to sanitize items and prevent any 'undefined undefined' strings
function cleanItemName(item, custom) {
  if (item.name && !item.name.includes('undefined')) {
    return item.name.trim();
  }
  const parts = [
    custom.size || null,
    (custom.flavor && custom.flavor !== 'None' && custom.flavor !== 'Pure Coffee (No Flavor)') ? custom.flavor : null,
    custom.baseDrink || item.name || 'Craft Specialty Coffee'
  ].filter(Boolean);
  return parts.join(' ').replace(/undefined/g, '').trim() || 'Craft Specialty Coffee';
}

// 1. Place a new Online Delivery Order
router.post('/order', async (req, res) => {
  try {
    const {
      items,
      deliveryAddress,
      deliverySpeed = 'standard',
      paymentMethod = 'cod',
      saveAddress = false,
      notes = ''
    } = req.body;

    // Validate Items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your delivery cart is empty. Please add items before checking out.' });
    }

    // Validate Delivery Address
    if (!deliveryAddress || typeof deliveryAddress !== 'object') {
      return res.status(400).json({ error: 'Delivery address is required.' });
    }

    const { name, phone, address, apartment, area, city, pinCode, instructions } = deliveryAddress;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full recipient name is required for delivery.' });
    }

    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit delivery contact number.' });
    }

    if (!address || !address.trim()) {
      return res.status(400).json({ error: 'Street address / House details are required.' });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({ error: 'City is required for delivery routing.' });
    }

    const userId = req.user ? req.user.id : null;
    const finalGuestName = name.trim();

    // Calculate subtotal & validate items
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const basePrice = parseFloat(item.basePrice || item.price || 0);
      let itemPrice = basePrice;
      const custom = item.customization || {};

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

      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      const totalItemCost = itemPrice * qty;
      subtotal += totalItemCost;

      const itemName = cleanItemName(item, custom);

      validatedItems.push({
        menuItemId: item.menuItemId || item.id || null,
        name: itemName,
        basePrice: itemPrice,
        quantity: qty,
        customization: custom,
        itemTotal: totalItemCost
      });
    }

    // Delivery fee calculation
    let deliveryFee = deliverySpeed === 'priority' ? 65 : 40;
    if (subtotal >= 500 && deliverySpeed !== 'priority') {
      deliveryFee = 0; // Free delivery for orders over ₹500
    }

    const tax = Math.round(subtotal * 0.05); // 5% GST
    const totalAmount = subtotal + deliveryFee + tax;

    // Unique order number
    const maxOrder = db.prepare('SELECT MAX(order_number) as maxNum FROM orders').get();
    const nextOrderNumber = (maxOrder && maxOrder.maxNum) ? maxOrder.maxNum + 1 : 101;

    // Estimated delivery time (30 mins standard, 18 mins priority)
    const estimatedMinutes = deliverySpeed === 'priority' ? 18 : 30;

    const deliveryAddressJson = JSON.stringify({
      name: finalGuestName,
      phone: cleanPhone,
      address: address.trim(),
      apartment: apartment ? apartment.trim() : '',
      area: area ? area.trim() : '',
      city: city.trim(),
      pinCode: pinCode ? pinCode.trim() : '',
      instructions: instructions ? instructions.trim() : ''
    });

    // Save address for logged-in user if requested
    if (userId && saveAddress) {
      try {
        db.prepare('UPDATE users SET saved_address = ? WHERE id = ?').run(deliveryAddressJson, userId);
      } catch (addrErr) {
        console.error('Failed to save user address:', addrErr);
      }
    }

    // Insert Order into DB
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, guest_name, table_number, status, total_amount, payment_status,
        payment_method, estimated_wait_min, notes, order_type, delivery_address, delivery_fee,
        delivery_status, delivery_partner
      ) VALUES (?, ?, ?, NULL, 'new', ?, ?, ?, ?, ?, 'delivery', ?, ?, 'placed', 'Assigning courier partner...')
    `);

    const paymentStatus = paymentMethod === 'cod' ? 'pending_cod' : 'paid_demo';

    const orderResult = insertOrder.run(
      nextOrderNumber,
      userId,
      finalGuestName,
      totalAmount,
      paymentStatus,
      paymentMethod,
      estimatedMinutes,
      notes || null,
      deliveryAddressJson,
      deliveryFee
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
    }

    // Notification for staff
    db.prepare(`
      INSERT INTO notifications (user_id, role_target, title, message, type, link)
      VALUES (?, 'staff', ?, ?, 'order', ?)
    `).run(
      userId,
      `🛵 New Delivery Order #${nextOrderNumber}`,
      `${finalGuestName} placed delivery order for ₹${totalAmount} (${city})`,
      `/delivery/orders/${orderId}`
    );

    // Fetch complete created order
    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    const fullOrderPayload = {
      ...createdOrder,
      delivery_address: JSON.parse(createdOrder.delivery_address || '{}'),
      items: orderItems.map(i => ({
        ...i,
        customization: i.customization ? JSON.parse(i.customization) : null
      }))
    };

    // Socket.IO real-time emission
    const io = req.app.get('io');
    if (io) {
      io.emit('new_delivery_order', fullOrderPayload);
      io.emit('new_order', fullOrderPayload);
    }

    res.status(201).json({
      message: 'Online Delivery order placed successfully! Live tracking active.',
      order: fullOrderPayload,
      trackingUrl: `/delivery/orders/${orderId}`
    });
  } catch (err) {
    console.error('Create delivery order error:', err);
    res.status(500).json({ error: 'Failed to place delivery order. Please try again.' });
  }
});

// 2. Get delivery order tracking details
router.get('/orders/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Delivery order not found.' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    let parsedAddress = {};
    try {
      parsedAddress = JSON.parse(order.delivery_address || '{}');
    } catch (_) {}

    res.json({
      ...order,
      delivery_address: parsedAddress,
      items: items.map(i => ({
        ...i,
        customization: i.customization ? JSON.parse(i.customization) : null
      }))
    });
  } catch (err) {
    console.error('Fetch delivery tracking error:', err);
    res.status(500).json({ error: 'Failed to fetch delivery status.' });
  }
});

// 3. Update delivery order status (Staff / Admin Kitchen & Dispatch)
router.patch('/orders/:id/status', (req, res) => {
  try {
    const { delivery_status, delivery_partner, estimated_wait_min } = req.body;
    const allowed = ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

    if (!delivery_status || !allowed.includes(delivery_status)) {
      return res.status(400).json({ error: `Invalid delivery status. Allowed: ${allowed.join(', ')}` });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Map delivery_status to base order status
    let baseStatus = 'new';
    if (delivery_status === 'accepted') baseStatus = 'accepted';
    else if (delivery_status === 'preparing') baseStatus = 'preparing';
    else if (delivery_status === 'ready' || delivery_status === 'out_for_delivery') baseStatus = 'ready';
    else if (delivery_status === 'delivered') baseStatus = 'completed';
    else if (delivery_status === 'cancelled') baseStatus = 'cancelled';

    let partner = delivery_partner || order.delivery_partner;
    if (delivery_status === 'out_for_delivery' && (!partner || partner.includes('Assigning'))) {
      partner = 'Vikram Singh • EV Express (4.9★)';
    }

    const deliveredAt = delivery_status === 'delivered' ? new Date().toISOString() : order.delivered_at;
    const waitMin = estimated_wait_min !== undefined ? estimated_wait_min : order.estimated_wait_min;

    db.prepare(`
      UPDATE orders
      SET delivery_status = ?, status = ?, delivery_partner = ?, delivered_at = ?, estimated_wait_min = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(delivery_status, baseStatus, partner, deliveredAt, waitMin, order.id);

    // In-app notification for the customer
    if (order.user_id) {
      let notifyMsg = `Your delivery order #${order.order_number} is now ${delivery_status.replace(/_/g, ' ')}.`;
      if (delivery_status === 'out_for_delivery') {
        notifyMsg = `🛵 Courier is on the way with your Daily Drip order #${order.order_number}!`;
      } else if (delivery_status === 'delivered') {
        notifyMsg = `🎉 Your Daily Drip order #${order.order_number} has been delivered. Enjoy your brew!`;
      }

      try {
        db.prepare(`
          INSERT INTO notifications (user_id, role_target, title, message, type, link)
          VALUES (?, 'customer', ?, ?, 'delivery', ?)
        `).run(order.user_id, `Delivery Update: #${order.order_number}`, notifyMsg, `/delivery/orders/${order.id}`);
      } catch (nErr) {}
    }

    // Updated order payload
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    const payload = {
      ...updated,
      delivery_address: JSON.parse(updated.delivery_address || '{}'),
      items: items.map(i => ({
        ...i,
        customization: i.customization ? JSON.parse(i.customization) : null
      }))
    };

    // Emit live real-time events via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('delivery_status_updated', payload);
      io.emit('order_status_updated', payload);
      io.to(`delivery_${order.id}`).emit('delivery_status_updated', payload);
    }

    res.json({
      message: `Delivery status updated to ${delivery_status}`,
      order: payload
    });
  } catch (err) {
    console.error('Update delivery status error:', err);
    res.status(500).json({ error: 'Failed to update delivery status.' });
  }
});

// 4. Get all delivery orders (Staff / Admin)
router.get('/all', (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let query = "SELECT * FROM orders WHERE order_type = 'delivery'";
    const params = [];

    if (status && status !== 'all') {
      query += ' AND delivery_status = ?';
      params.push(status);
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const orders = db.prepare(query).all(...params);

    const full = orders.map(ord => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(ord.id);
      return {
        ...ord,
        delivery_address: JSON.parse(ord.delivery_address || '{}'),
        items: items.map(i => ({
          ...i,
          customization: i.customization ? JSON.parse(i.customization) : null
        }))
      };
    });

    res.json(full);
  } catch (err) {
    console.error('Fetch all deliveries error:', err);
    res.status(500).json({ error: 'Failed to fetch delivery orders.' });
  }
});

// 5. Get saved address for current user
router.get('/user/address', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT saved_address FROM users WHERE id = ?').get(req.user.id);
    if (!user || !user.saved_address) {
      return res.json({ savedAddress: null });
    }
    res.json({ savedAddress: JSON.parse(user.saved_address) });
  } catch (err) {
    console.error('Fetch saved address error:', err);
    res.status(500).json({ error: 'Failed to fetch address' });
  }
});

// 6. Save address for current user
router.put('/user/address', requireAuth, (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: 'Address payload is required' });
    }
    const jsonStr = JSON.stringify(address);
    db.prepare('UPDATE users SET saved_address = ? WHERE id = ?').run(jsonStr, req.user.id);
    res.json({ message: 'Address saved successfully', savedAddress: address });
  } catch (err) {
    console.error('Save address error:', err);
    res.status(500).json({ error: 'Failed to save address' });
  }
});

module.exports = router;
