const express = require('express');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper to determine personality and calculate DNA % based on custom parameters
function computeDnaProfile(drinkName = '', customization = {}) {
  const {
    baseDrink = '',
    baseCoffee = '',
    strength = 'Normal',
    sweetness = 'Normal (50%)',
    milk = 'Regular Dairy Milk',
    temperature = 'Hot',
    flavor = 'Pure Coffee',
    addOns = []
  } = customization;

  const base = (baseDrink || baseCoffee || drinkName || '').toLowerCase();
  const milkStr = (milk || '').toLowerCase();
  const tempStr = (temperature || '').toLowerCase();
  const sweetStr = (sweetness || '').toLowerCase();
  const flavorStr = (flavor || '').toLowerCase();
  const addonsArr = Array.isArray(addOns) ? addOns : [];

  // Base Strength
  let strengthPct = 65;
  if (base.includes('espresso')) strengthPct = 95;
  else if (base.includes('cold brew')) strengthPct = 88;
  else if (base.includes('americano')) strengthPct = 80;
  else if (base.includes('cappuccino')) strengthPct = 75;
  else if (base.includes('latte') || base.includes('mocha')) strengthPct = 68;

  // Strength adjustment from prompt / addons
  if (strength === 'Intense' || strength === 'Extra Strong') {
    strengthPct = Math.min(99, strengthPct + 10);
  } else if (strength === 'Mild' || strength === 'Light') {
    strengthPct = Math.max(30, strengthPct - 20);
  }
  if (addonsArr.some(a => a.toLowerCase().includes('extra') || a.toLowerCase().includes('shot'))) {
    strengthPct = Math.min(99, strengthPct + 15);
  }

  // Sweetness calculation
  let sweetnessPct = 60;
  if (sweetStr.includes('no sugar') || sweetStr === 'none') sweetnessPct = 10;
  else if (sweetStr.includes('less') || sweetStr.includes('25%')) sweetnessPct = 38;
  else if (sweetStr.includes('extra') || sweetStr.includes('100%')) sweetnessPct = 90;

  if (flavorStr && flavorStr !== 'none' && flavorStr !== 'pure coffee') {
    sweetnessPct = Math.min(99, sweetnessPct + 8);
  }
  if (addonsArr.some(a => a.toLowerCase().includes('caramel') || a.toLowerCase().includes('chocolate') || a.toLowerCase().includes('cream'))) {
    sweetnessPct = Math.min(99, sweetnessPct + 6);
  }

  // Chill / Temperature calculation
  let chillPct = 15;
  if (tempStr.includes('iced') || tempStr.includes('cold') || base.includes('cold brew')) {
    chillPct = 88;
  } else if (tempStr.includes('warm')) {
    chillPct = 35;
  }

  // Creaminess calculation
  let creaminessPct = 85;
  if (milkStr === 'none' || (!milkStr && (base.includes('espresso') || base.includes('americano')))) {
    creaminessPct = 18;
  } else if (milkStr.includes('oat')) {
    creaminessPct = 82;
  } else if (milkStr.includes('almond')) {
    creaminessPct = 70;
  } else if (milkStr.includes('soy')) {
    creaminessPct = 68;
  }
  if (addonsArr.some(a => a.toLowerCase().includes('cream'))) {
    creaminessPct = Math.min(99, creaminessPct + 12);
  }

  // Energy
  let energyPct = 72;
  if (addonsArr.some(a => a.toLowerCase().includes('extra') || a.toLowerCase().includes('shot'))) {
    energyPct = 92;
  } else if (base.includes('cold brew') || base.includes('espresso')) {
    energyPct = 90;
  } else if (base.includes('americano') || base.includes('cappuccino')) {
    energyPct = 78;
  }

  // Personality name and flavor description
  let personalityName = 'THE COZY ACHIEVER';
  let flavorProfile = 'Velvety balanced coffee with smooth comforting microfoam and roasted undertones';

  if (chillPct >= 70 && energyPct >= 80) {
    personalityName = 'THE MIDNIGHT CATALYST';
    flavorProfile = 'Crisp, high-voltage cold brew rush with low acidity and dark chocolate hints';
  } else if (chillPct >= 70) {
    personalityName = 'THE POLAR OPTIMIST';
    flavorProfile = 'Playful, refreshing iced infusion with vibrant chill and smooth finish';
  } else if (strengthPct >= 80 && sweetnessPct <= 30) {
    personalityName = 'THE ARTISAN PURIST';
    flavorProfile = 'Bold, intense single-origin dark roast with bittersweet chocolate finish';
  } else if (creaminessPct >= 75 && sweetnessPct >= 60) {
    personalityName = 'THE VELVET STRATEGIST';
    flavorProfile = 'Rich dessert-like indulgence with golden caramel undertones and silky microfoam';
  } else if (sweetnessPct >= 70) {
    personalityName = 'THE SUNBURST OPTIMIST';
    flavorProfile = 'Bright, candied vanilla notes with playful warmth and cheerful lift';
  } else if (strengthPct >= 75) {
    personalityName = 'THE HIGH-VOLTAGE CRAFTSMAN';
    flavorProfile = 'Robust double-extracted espresso notes with focused stamina and crisp finish';
  } else if (creaminessPct >= 70) {
    personalityName = 'THE COZY ACHIEVER';
    flavorProfile = 'Velvety balanced coffee with smooth comforting microfoam and roasted undertones';
  }

  const clamp = v => Math.min(99, Math.max(10, Math.round(v)));

  return {
    personalityName,
    strengthPct: clamp(strengthPct),
    sweetnessPct: clamp(sweetnessPct),
    creaminessPct: clamp(creaminessPct),
    chillPct: clamp(chillPct),
    energyPct: clamp(energyPct),
    flavorProfile
  };
}

// Generate & save Coffee DNA
router.post('/', authenticateToken, (req, res) => {
  try {
    const { drinkName, customization = {}, id: customId } = req.body;

    if (!drinkName) {
      return res.status(400).json({ error: 'Drink name is required to compute Coffee DNA' });
    }

    const dnaProfile = computeDnaProfile(drinkName, customization);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dnaId = customId || `DNA-${randomSuffix}`;
    const userId = req.user ? req.user.id : null;

    const insert = db.prepare(`
      INSERT OR REPLACE INTO coffee_dna (
        id, user_id, drink_name, personality_name, strength_pct, sweetness_pct,
        creaminess_pct, chill_pct, energy_pct, flavor_profile, customization
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      dnaId,
      userId,
      drinkName,
      dnaProfile.personalityName,
      dnaProfile.strengthPct,
      dnaProfile.sweetnessPct,
      dnaProfile.creaminessPct,
      dnaProfile.chillPct,
      dnaProfile.energyPct,
      dnaProfile.flavorProfile,
      JSON.stringify(customization)
    );

    const record = db.prepare('SELECT * FROM coffee_dna WHERE id = ?').get(dnaId);

    res.status(201).json({
      message: 'Coffee DNA generated successfully',
      dna: {
        ...record,
        customization: JSON.parse(record.customization)
      }
    });
  } catch (err) {
    console.error('Create Coffee DNA error:', err);
    res.status(500).json({ error: 'Failed to generate Coffee DNA' });
  }
});

// Latest created Coffee DNA endpoint
router.get('/latest/record', (req, res) => {
  try {
    const record = db.prepare(`
      SELECT d.*, u.name as creator_name
      FROM coffee_dna d
      LEFT JOIN users u ON d.user_id = u.id
      ORDER BY d.created_at DESC, d.rowid DESC LIMIT 1
    `).get();

    if (!record) {
      return res.status(404).json({ error: 'No Coffee DNA found' });
    }

    res.json({
      ...record,
      customization: JSON.parse(record.customization)
    });
  } catch (err) {
    console.error('Fetch latest Coffee DNA error:', err);
    res.status(500).json({ error: 'Failed to retrieve latest Coffee DNA' });
  }
});

// Public Shareable Coffee DNA endpoint (No Auth Required for QR scanning across phones!)
router.get('/:id', (req, res) => {
  try {
    const record = db.prepare(`
      SELECT d.*, u.name as creator_name
      FROM coffee_dna d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `).get(req.params.id);

    if (!record) {
      return res.status(404).json({ error: 'Coffee DNA profile not found' });
    }

    res.json({
      ...record,
      customization: JSON.parse(record.customization)
    });
  } catch (err) {
    console.error('Fetch Coffee DNA error:', err);
    res.status(500).json({ error: 'Failed to retrieve Coffee DNA' });
  }
});

// Get user's saved DNA profiles
router.get('/user/all', authenticateToken, (req, res) => {
  try {
    if (!req.user) {
      return res.json([]);
    }
    const dnas = db.prepare('SELECT * FROM coffee_dna WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(dnas.map(d => ({ ...d, customization: JSON.parse(d.customization) })));
  } catch (err) {
    console.error('Fetch user DNAs error:', err);
    res.status(500).json({ error: 'Failed to fetch saved Coffee DNAs' });
  }
});

module.exports = router;
