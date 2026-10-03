const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    // Allow role override only if explicitly requested, default to 'customer'
    const userRole = (role === 'admin' || role === 'staff') ? role : 'customer';

    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, avatar, favorite_coffee)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(normalizedEmail)}`;
    const result = insert.run(name.trim(), normalizedEmail, passwordHash, userRole, defaultAvatar, 'Espresso');

    const token = jwt.sign(
      { id: result.lastInsertRowid, email: normalizedEmail, role: userRole, name: name.trim() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: result.lastInsertRowid,
        name: name.trim(),
        email: normalizedEmail,
        role: userRole,
        avatar: defaultAvatar,
        favoriteCoffee: 'Espresso'
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Welcome back!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        favoriteCoffee: user.favorite_coffee
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user profile with live café stats
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, avatar, favorite_coffee, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Live statistics
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?').get(req.user.id).count;
    const completedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status = 'completed'").get(req.user.id).count;
    const dnaCount = db.prepare('SELECT COUNT(*) as count FROM coffee_dna WHERE user_id = ?').get(req.user.id).count;
    const passportCount = db.prepare('SELECT COUNT(*) as count FROM coffee_passport WHERE user_id = ?').get(req.user.id).count;
    const totalMenuItems = db.prepare('SELECT COUNT(*) as count FROM menu_items').get().count;

    // Latest Coffee DNA
    const latestDna = db.prepare('SELECT * FROM coffee_dna WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.user.id);

    // Recent orders
    const recentOrders = db.prepare(`
      SELECT id, order_number, table_number, status, total_amount, created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(req.user.id);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        favoriteCoffee: user.favorite_coffee,
        createdAt: user.created_at
      },
      stats: {
        totalOrders,
        completedOrders,
        dnaCount,
        passportCount,
        totalMenuItems,
        loyaltyPoints: completedOrders * 10,
        drinksUntilReward: Math.max(0, 5 - (completedOrders % 5))
      },
      latestDna,
      recentOrders
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Server error retrieving profile' });
  }
});

// Update profile
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { name, favoriteCoffee, avatar } = req.body;
    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (favoriteCoffee !== undefined) {
      updates.push('favorite_coffee = ?');
      params.push(favoriteCoffee);
    }
    if (avatar) {
      updates.push('avatar = ?');
      params.push(avatar);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No profile fields to update' });
    }

    params.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updatedUser = db.prepare('SELECT id, name, email, role, avatar, favorite_coffee FROM users WHERE id = ?').get(req.user.id);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Forgot password request
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Please provide your email address' });
  }

  const user = db.prepare('SELECT id, email, name FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user) {
    // Return standard success to prevent email enumeration
    return res.json({ message: 'If this email is registered, password reset instructions have been generated.' });
  }

  // Generate demo reset token valid for 1 hour
  const resetToken = jwt.sign({ id: user.id, purpose: 'reset-password' }, JWT_SECRET, { expiresIn: '1h' });

  res.json({
    message: 'Password reset link generated successfully.',
    resetToken,
    instructions: 'Use the reset password form with this secure token or follow the link.'
  });
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'reset-password') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, decoded.id);

    res.json({ message: 'Your password has been reset successfully. Please log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(400).json({ error: 'Reset token is invalid or expired. Please request a new one.' });
  }
});

module.exports = router;
