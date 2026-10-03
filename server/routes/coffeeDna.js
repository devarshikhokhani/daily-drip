const express = require('express');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper to determine personality and calculate DNA % based on custom parameters
function computeDnaProfile(drinkName, customization = {}) {
  const {
    strength = 'Normal',
    sweetness = 'Normal (50%)',
    milk = 'Regular Dairy Milk',
    temperature = 'Hot',
    flavor = 'Pure Coffee',
    addOns = []
  } = customization;

  let strengthPct = 65;
  let sweetnessPct = 50;
  let creaminessPct = 60;
  let chillPct = 20;
  let energyPct = 70;

  // Strength adjustment
  if (strength === 'Intense' || strength === 'Extra Strong') {
    strengthPct = 88;
    energyPct += 15;
  } else if (strength === 'Mild' || strength === 'Light') {
    strengthPct = 45;
  }
  if (addOns.some(a => a.toLowerCase().includes('extra') || a.toLowerCase().includes('shot'))) {
    strengthPct += 12;
    energyPct += 18;
  }

  // Sweetness adjustment
  if (sweetness.includes('No Sugar')) sweetnessPct = 10;
  else if (sweetness.includes('Less') || sweetness.includes('25%')) sweetnessPct = 35;
  else if (sweetness.includes('Extra') || sweetness.includes('100%')) sweetnessPct = 90;
  else sweetnessPct = 60;

  // Temperature / Chill
  if (temperature.toLowerCase().includes('iced') || temperature.toLowerCase().includes('cold')) {
    chillPct = 85;
  } else if (temperature.toLowerCase().includes('warm')) {
    chillPct = 35;
  } else {
    chillPct = 15;
  }

  // Creaminess
  if (milk.toLowerCase().includes('oat') || milk.toLowerCase().includes('almond')) creaminessPct = 78;
  else if (milk.toLowerCase().includes('dairy') || milk.toLowerCase().includes('whole')) creaminessPct = 82;
  else if (milk.toLowerCase().includes('none') || drinkName.toLowerCase().includes('espresso') || drinkName.toLowerCase().includes('americano')) creaminessPct = 15;

  if (addOns.some(a => a.toLowerCase().includes('cream'))) creaminessPct += 15;

  // Flavor profile & Personality name generator
  let personalityName = 'THE COZY ACHIEVER';
  let flavorProfile = 'Velvety sweetness with smooth roasted notes';

  if (chillPct >= 70 && energyPct >= 80) {
    personalityName = 'THE MIDNIGHT CATALYST';
    flavorProfile = 'Crisp, high-voltage cold brew rush with low acidity';
  } else if (creaminessPct >= 80 && sweetnessPct >= 65) {
    personalityName = 'THE VELVET STRATEGIST';
    flavorProfile = 'Rich dessert-like indulgence with golden caramel undertones';
  } else if (strengthPct >= 80 && sweetnessPct <= 30) {
    personalityName = 'THE ARTISAN PURIST';
    flavorProfile = 'Bold, intense single-origin dark roast with bittersweet chocolate finish';
  } else if (drinkName.toLowerCase().includes('matcha') || drinkName.toLowerCase().includes('tea')) {
    personalityName = 'THE ZEN BOTANIST';
    flavorProfile = 'Ground earthy antioxidants and calming L-theanine harmony';
  } else if (sweetnessPct >= 70) {
    personalityName = 'THE SUNBURST OPTIMIST';
    flavorProfile = 'Bright, candied vanilla notes with playful warmth';
  }

  // Clamp percentages between 10 and 99
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
    const { drinkName, customization = {} } = req.body;

    if (!drinkName) {
      return res.status(400).json({ error: 'Drink name is required to compute Coffee DNA' });
    }

    const dnaProfile = computeDnaProfile(drinkName, customization);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dnaId = `DNA-${randomSuffix}`;
    const userId = req.user ? req.user.id : null;

    const insert = db.prepare(`
      INSERT INTO coffee_dna (
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
