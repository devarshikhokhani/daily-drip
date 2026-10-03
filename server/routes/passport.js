const express = require('express');
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Coffee Passport master list of international specialty drinks
const PASSPORT_GOALS = [
  { name: 'Double Ristretto Espresso', country: 'Italy', flag: '🇮🇹', notes: 'Short extraction, dense aromatic crema' },
  { name: 'Madagascar Vanilla Bean Latte', country: 'France', flag: '🇫🇷', notes: 'Micro-foamed whole milk with bourbon vanilla' },
  { name: 'Nitro Cold Brew Cascade', country: 'USA', flag: '🇺🇸', notes: 'Nitrogen tap infused 18-hour cold steeped roast' },
  { name: 'Cardamom Spiced Silk Cappuccino', country: 'India', flag: '🇮🇳', notes: 'Freshly crushed cardamom with dusted cinnamon' },
  { name: 'Ceremonial Uji Matcha Latte', country: 'Japan', flag: '🇯🇵', notes: 'Stone-ground Kyoto first flush with velvety milk' },
  { name: 'Dark Belgian Ganache Mocha', country: 'Belgium', flag: '🇧🇪', notes: 'Callebaut 70% melted chocolate espresso' },
  { name: 'Kyoto Style Slow Drip', country: 'Japan', flag: '🇯🇵', notes: 'Drop-by-drop cold glass tower extraction' },
  { name: 'Espresso Romano', country: 'Italy', flag: '🇮🇹', notes: 'Candied lemon peel paired with dark espresso' }
];

// Get user's passport
router.get('/', requireAuth, (req, res) => {
  try {
    const discovered = db.prepare(`
      SELECT item_name, country, flag, discovered_at
      FROM coffee_passport
      WHERE user_id = ?
      ORDER BY discovered_at DESC
    `).all(req.user.id);

    const discoveredSet = new Set(discovered.map(d => d.item_name));

    const fullPassport = PASSPORT_GOALS.map(goal => ({
      ...goal,
      discovered: discoveredSet.has(goal.name),
      discoveredAt: discovered.find(d => d.item_name === goal.name)?.discovered_at || null
    }));

    const totalDiscovered = fullPassport.filter(p => p.discovered).length;
    const progressPercent = Math.round((totalDiscovered / PASSPORT_GOALS.length) * 100);

    res.json({
      passport: fullPassport,
      totalDiscovered,
      totalGoals: PASSPORT_GOALS.length,
      progressPercent,
      isMasterExplorer: totalDiscovered >= PASSPORT_GOALS.length
    });
  } catch (err) {
    console.error('Fetch passport error:', err);
    res.status(500).json({ error: 'Failed to fetch Coffee Passport' });
  }
});

// Manual stamp claim (e.g. from drink page or tasting flight)
router.post('/claim', requireAuth, (req, res) => {
  try {
    const { itemName } = req.body;
    const goal = PASSPORT_GOALS.find(g => g.name.toLowerCase() === (itemName || '').toLowerCase());

    if (!goal) {
      return res.status(400).json({ error: 'Drink is not in the international passport catalog' });
    }

    db.prepare(`
      INSERT OR IGNORE INTO coffee_passport (user_id, item_name, country, flag)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, goal.name, goal.country, goal.flag);

    res.json({
      message: `🎉 Stamped! You discovered ${goal.name} (${goal.country} ${goal.flag})`,
      goal
    });
  } catch (err) {
    console.error('Claim passport error:', err);
    res.status(500).json({ error: 'Failed to claim passport stamp' });
  }
});

module.exports = router;
