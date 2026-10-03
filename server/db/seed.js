const bcrypt = require('bcryptjs');
const { db, initSchema } = require('./database');

async function seed() {
  initSchema();
  console.log('🌱 Seeding database...');

  // 1. Settings
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('cafe_name', 'Daily Drip Smart Café');
  insertSetting.run('cafe_tagline', 'Your Coffee. Your Way.');
  insertSetting.run('tax_rate', '0.05'); // 5% GST/tax
  insertSetting.run('prep_time_per_order', '4'); // 4 min base prep

  // 2. Users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt);
    const staffPass = await bcrypt.hash('barista123', salt);
    const custPass = await bcrypt.hash('coffee123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, avatar, favorite_coffee)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'Elena Rostova',
      'admin@dailydrip.cafe',
      adminPass,
      'admin',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'Madagascar Vanilla Bean Latte'
    );

    insertUser.run(
      'Marco Vance',
      'barista@dailydrip.cafe',
      staffPass,
      'staff',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      'Double Ristretto'
    );

    insertUser.run(
      'Aria Chen',
      'customer@dailydrip.cafe',
      custPass,
      'customer',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      'Classic Roman Velvet Cappuccino'
    );

    console.log('✓ Users seeded: admin@dailydrip.cafe, barista@dailydrip.cafe, customer@dailydrip.cafe');
  }

  // 3. Categories
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)');
    const cats = [
      ['Espresso', 'espresso', 'Coffee', 1],
      ['Latte', 'latte', 'Milk', 2],
      ['Cappuccino', 'cappuccino', 'CupSoda', 3],
      ['Cold Coffee', 'cold-coffee', 'IceCream', 4],
      ['Mocha', 'mocha', 'Sparkles', 5],
      ['Tea', 'tea', 'Leaf', 6],
      ['Matcha', 'matcha', 'Feather', 7],
      ['Snacks', 'snacks', 'Sandwich', 8],
      ['Desserts', 'desserts', 'Cake', 9],
    ];
    for (const c of cats) {
      insertCat.run(c[0], c[1], c[2], c[3]);
    }
    console.log('✓ Categories seeded');
  }

  // 4. Menu Items
  const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu_items').get().count;
  if (menuCount === 0) {
    const insertMenu = db.prepare(`
      INSERT INTO menu_items (category_slug, name, description, base_price, image_url, available, tags, customizable_options, origin_country, origin_flag)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const standardCustomizations = JSON.stringify({
      sizes: [
        { name: 'Small (240ml)', priceModifier: 0 },
        { name: 'Medium (360ml)', priceModifier: 30 },
        { name: 'Large (480ml)', priceModifier: 60 }
      ],
      milks: [
        { name: 'Regular Dairy Milk', priceModifier: 0 },
        { name: 'Oat Milk (Barista Blend)', priceModifier: 35 },
        { name: 'Almond Milk (Unsweetened)', priceModifier: 35 },
        { name: 'Soy Milk (Organic)', priceModifier: 25 }
      ],
      sweetness: ['No Sugar', 'Less (25%)', 'Normal (50%)', 'Extra (100%)'],
      temperatures: ['Hot', 'Warm', 'Iced'],
      flavors: [
        { name: 'Pure Coffee (No Flavor)', priceModifier: 0 },
        { name: 'Madagascar Vanilla', priceModifier: 25 },
        { name: 'Artisan Salted Caramel', priceModifier: 25 },
        { name: 'Roasted Hazelnut', priceModifier: 25 },
        { name: 'Dark Chocolate Ganache', priceModifier: 30 },
        { name: 'Swiss Mocha', priceModifier: 30 }
      ],
      addOns: [
        { name: 'Extra Espresso Shot', price: 40 },
        { name: 'Fresh Whipped Cream', price: 30 },
        { name: 'Artisan Caramel Drizzle', price: 20 },
        { name: 'Dark Chocolate Curls', price: 20 },
        { name: 'Ceylon Cinnamon Dust', price: 10 }
      ]
    });

    const items = [
      // Espresso
      [
        'espresso',
        'Double Ristretto Espresso',
        'Intense, sweet, short-extracted double shot pulling the densest aromatic oils from single-origin Ethiopian beans.',
        140,
        'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Signature', 'Bold', 'Pure']),
        standardCustomizations,
        'Italy',
        '🇮🇹'
      ],
      [
        'espresso',
        'Espresso Romano',
        'Traditional espresso served with a twist of candied lemon peel to balance bright citrus acidity and deep crema.',
        155,
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Classic', 'Citrus', 'Robust']),
        standardCustomizations,
        'Italy',
        '🇮🇹'
      ],
      // Latte
      [
        'latte',
        'Madagascar Vanilla Bean Latte',
        'Velvety steamed milk poured over micro-foamed espresso and infused with real crushed Madagascar bourbon vanilla.',
        210,
        'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Bestseller', 'Smooth', 'Aromatic']),
        standardCustomizations,
        'France',
        '🇫🇷'
      ],
      [
        'latte',
        'Artisan Smoked Hazelnut Latte',
        'Roasted hazelnut syrup with slow-steamed whole or plant milk, crowned with delicate hazelnut crunch.',
        225,
        'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Nutty', 'Warm', 'Creamy']),
        standardCustomizations,
        'France',
        '🇫🇷'
      ],
      // Cappuccino
      [
        'cappuccino',
        'Classic Roman Velvet Cappuccino',
        'The gold standard: equal thirds of dense espresso, steamed whole milk, and cloud-like velvety microfoam.',
        185,
        'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Traditional', 'Velvety', 'Balanced']),
        standardCustomizations,
        'Italy',
        '🇮🇹'
      ],
      [
        'cappuccino',
        'Cardamom Spiced Silk Cappuccino',
        'Freshly crushed Malabar green cardamom steeped into espresso, topped with dusted cinnamon froth.',
        205,
        'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Spiced', 'Aromatic', 'Artisan']),
        standardCustomizations,
        'India',
        '🇮🇳'
      ],
      // Cold Coffee
      [
        'cold-coffee',
        'Nitro Cold Brew Cascade',
        '18-hour cold steeped single-origin coffee nitrogen-infused on tap for a Guinness-like silky head.',
        230,
        'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Cold', 'Nitro', 'Zero Acid']),
        standardCustomizations,
        'USA',
        '🇺🇸'
      ],
      [
        'cold-coffee',
        'Kyoto Style Slow Drip',
        'Extracted drop-by-drop over 12 hours through glass towers, highlighting floral jasmine and stone fruit notes.',
        250,
        'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Craft', 'Rare', 'Refreshing']),
        standardCustomizations,
        'Japan',
        '🇯🇵'
      ],
      // Mocha
      [
        'mocha',
        'Dark Belgian Ganache Mocha',
        'Melted 70% Belgian Callebaut chocolate melted into double espresso and warm silky milk.',
        240,
        'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Decadent', 'Chocolate', 'Rich']),
        standardCustomizations,
        'Belgium',
        '🇧🇪'
      ],
      // Tea
      [
        'tea',
        'Royal Darjeeling First Flush',
        'The champagne of teas: light golden muscatel liquor hand-plucked from Himalayan high estates.',
        160,
        'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Floral', 'Delicate', 'Organic']),
        standardCustomizations,
        'India',
        '🇮🇳'
      ],
      // Matcha
      [
        'matcha',
        'Ceremonial Uji Matcha Latte',
        'Stone-ground first harvest green tea from Kyoto whisked with hot bamboo chasen and folded with creamy oat milk.',
        260,
        'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Antioxidant', 'Zen', 'Kyoto']),
        standardCustomizations,
        'Japan',
        '🇯🇵'
      ],
      // Snacks
      [
        'snacks',
        'Truffle Mushroom Sourdough Toast',
        'Artisan sourdough toasted crisp with sautéed wild mushrooms, white truffle oil, and shaved aged parmesan.',
        290,
        'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Savory', 'Crispy', 'Chef Special']),
        JSON.stringify({ options: ['Regular Sourdough', 'Gluten-Free (+₹30)'] }),
        'France',
        '🇫🇷'
      ],
      [
        'snacks',
        'Golden Flaky Butter Croissant',
        'Hand-laminated French butter pastry, baked golden with infinite crisp, buttery layers.',
        150,
        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Bakery', 'Warm', 'French']),
        JSON.stringify({ options: ['Plain Warm', 'With Strawberry Jam (+₹20)', 'With Nutella (+₹35)'] }),
        'France',
        '🇫🇷'
      ],
      // Desserts
      [
        'desserts',
        'Espresso Tiramisu Jar',
        'Savoiardi ladyfingers soaked in Daily Drip ristretto espresso, layered with airy mascarpone mousse.',
        240,
        'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Sweet', 'Coffee-Infused', 'Classic']),
        JSON.stringify({ options: ['Single Serving'] }),
        'Italy',
        '🇮🇹'
      ],
      [
        'desserts',
        'Basque Burnt Cheesecake Slice',
        'Caramelized deeply on top with a molten custard center, served with berry coulis.',
        260,
        'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop',
        1,
        JSON.stringify(['Creamy', 'Decadent', 'Gluten-Free']),
        JSON.stringify({ options: ['Single Slice'] }),
        'Spain',
        '🇪🇸'
      ]
    ];

    for (const item of items) {
      insertMenu.run(...item);
    }
    console.log('✓ Menu items seeded (15 specialty items across 9 categories)');
  }

  // 5. Tables
  const tableCount = db.prepare('SELECT COUNT(*) as count FROM cafe_tables').get().count;
  if (tableCount === 0) {
    const insertTable = db.prepare('INSERT INTO cafe_tables (table_number, capacity, status, notes) VALUES (?, ?, ?, ?)');
    insertTable.run(1, 2, 'available', 'Cozy window seat with garden view');
    insertTable.run(2, 2, 'occupied', 'Bar counter corner - Order #101 active');
    insertTable.run(3, 4, 'available', 'Center booth with charging outlets');
    insertTable.run(4, 4, 'available', 'Oak wood square table');
    insertTable.run(5, 6, 'reserved', 'Reserved for Evening Book Club at 6 PM');
    insertTable.run(6, 2, 'available', 'Sunny quiet alcove');
    insertTable.run(7, 4, 'occupied', 'Table 07 - Demo Session Active');
    insertTable.run(8, 2, 'available', 'Espresso bar stool');
    insertTable.run(9, 4, 'available', 'Patio outdoor umbrella table');
    insertTable.run(10, 6, 'available', 'Community work table');
    console.log('✓ Tables 1-10 seeded');
  }

  // 6. Seed Coffee DNA for Aria Chen
  const dnaCount = db.prepare('SELECT COUNT(*) as count FROM coffee_dna').get().count;
  if (dnaCount === 0) {
    const insertDNA = db.prepare(`
      INSERT INTO coffee_dna (id, user_id, drink_name, personality_name, strength_pct, sweetness_pct, creaminess_pct, chill_pct, energy_pct, flavor_profile, customization)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDNA.run(
      'DNA-8492',
      3, // Aria Chen
      'Madagascar Vanilla Bean Latte',
      'THE COZY ACHIEVER',
      72,
      64,
      81,
      20,
      76,
      'Velvet Cream, Bourbon Vanilla & Golden Caramel with bold espresso backbone',
      JSON.stringify({
        baseDrink: 'Madagascar Vanilla Bean Latte',
        size: 'Large (480ml)',
        milk: 'Oat Milk (Barista Blend)',
        sweetness: 'Normal (50%)',
        temperature: 'Hot',
        flavor: 'Madagascar Vanilla',
        addOns: ['Extra Espresso Shot', 'Ceylon Cinnamon Dust']
      })
    );
    console.log('✓ Coffee DNA seeded (DNA-8492: THE COZY ACHIEVER)');
  }

  // 7. Seed Coffee Passport for Aria Chen
  const passportCount = db.prepare('SELECT COUNT(*) as count FROM coffee_passport').get().count;
  if (passportCount === 0) {
    const insertPassport = db.prepare('INSERT INTO coffee_passport (user_id, item_name, country, flag) VALUES (?, ?, ?, ?)');
    insertPassport.run(3, 'Double Ristretto Espresso', 'Italy', '🇮🇹');
    insertPassport.run(3, 'Madagascar Vanilla Bean Latte', 'France', '🇫🇷');
    insertPassport.run(3, 'Nitro Cold Brew Cascade', 'USA', '🇺🇸');
    insertPassport.run(3, 'Cardamom Spiced Silk Cappuccino', 'India', '🇮🇳');
    console.log('✓ Coffee Passport seeded (4 drinks discovered for Aria Chen)');
  }

  // 8. Seed Sample Orders
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  if (orderCount === 0) {
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_number, user_id, guest_name, table_number, status, total_amount, payment_status, estimated_wait_min, notes, coffee_dna_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `);
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, menu_item_id, name, base_price, quantity, customization, item_total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Past completed order 1
    const o1 = insertOrder.run(101, 3, 'Aria Chen', 2, 'completed', 245, 'paid', 0, 'No plastic lid please', 'DNA-8492', '-2 hours');
    insertOrderItem.run(
      o1.lastInsertRowid,
      3,
      'Madagascar Vanilla Bean Latte',
      210,
      1,
      JSON.stringify({ size: 'Large (480ml)', milk: 'Oat Milk', sweetness: 'Normal (50%)', addOns: ['Ceylon Cinnamon Dust'] }),
      245
    );

    // Past completed order 2
    const o2 = insertOrder.run(102, 3, 'Aria Chen', 3, 'completed', 390, 'paid', 0, 'Hot please', null, '-1 day');
    insertOrderItem.run(
      o2.lastInsertRowid,
      5,
      'Classic Roman Velvet Cappuccino',
      185,
      1,
      JSON.stringify({ size: 'Medium (360ml)', sweetness: 'Less (25%)' }),
      185
    );
    insertOrderItem.run(
      o2.lastInsertRowid,
      11,
      'Cardamom Spiced Silk Cappuccino',
      205,
      1,
      JSON.stringify({ size: 'Medium (360ml)' }),
      205
    );

    // Active order 103 (Preparing)
    const o3 = insertOrder.run(103, 3, 'Aria Chen', 7, 'preparing', 290, 'paid', 6, 'Demo session order', 'DNA-8492', '-5 minutes');
    insertOrderItem.run(
      o3.lastInsertRowid,
      7,
      'Nitro Cold Brew Cascade',
      230,
      1,
      JSON.stringify({ size: 'Medium (360ml)', sweetness: 'No Sugar', temperature: 'Iced', addOns: ['Extra Espresso Shot'] }),
      290
    );

    console.log('✓ Realistic historical & active sample orders seeded');
  }

  // 9. Seed Active Café Session
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM cafe_sessions').get().count;
  if (sessionCount === 0) {
    const insertSession = db.prepare(`
      INSERT INTO cafe_sessions (id, code, status, created_by, connected_devices, current_draft, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+2 hours'))
    `);

    insertSession.run(
      'sess_demo_4827',
      '4827',
      'active',
      1, // Admin Elena
      2,
      JSON.stringify({
        baseDrink: 'Artisan Smoked Hazelnut Latte',
        size: 'Large',
        milk: 'Oat',
        sweetness: 'Normal',
        temperature: 'Hot',
        flavor: 'Hazelnut',
        addOns: ['Extra Shot', 'Caramel']
      })
    );
    console.log('✓ Active demo Café Session seeded with Code: 4827');
  }

  console.log('🎉 Seeding successfully completed!');
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = seed;
