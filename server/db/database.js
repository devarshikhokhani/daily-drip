const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'dailydrip.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      avatar TEXT,
      favorite_coffee TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      icon TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      base_price REAL NOT NULL,
      image_url TEXT,
      available INTEGER DEFAULT 1,
      tags TEXT,
      customizable_options TEXT,
      origin_country TEXT,
      origin_flag TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number INTEGER NOT NULL UNIQUE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      guest_name TEXT,
      table_number INTEGER,
      status TEXT DEFAULT 'new',
      total_amount REAL NOT NULL,
      payment_status TEXT DEFAULT 'paid',
      payment_method TEXT DEFAULT 'demo_pay',
      estimated_wait_min INTEGER DEFAULT 10,
      cup_design_data TEXT,
      cafe_session_id TEXT,
      coffee_dna_id TEXT,
      notes TEXT,
      is_urgent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      base_price REAL NOT NULL,
      quantity INTEGER DEFAULT 1,
      customization TEXT,
      item_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coffee_dna (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      drink_name TEXT NOT NULL,
      personality_name TEXT NOT NULL,
      strength_pct INTEGER NOT NULL,
      sweetness_pct INTEGER NOT NULL,
      creaminess_pct INTEGER NOT NULL,
      chill_pct INTEGER NOT NULL,
      energy_pct INTEGER NOT NULL,
      flavor_profile TEXT NOT NULL,
      customization TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coffee_passport (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      country TEXT NOT NULL,
      flag TEXT NOT NULL,
      discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, item_name)
    );

    CREATE TABLE IF NOT EXISTS cafe_tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number INTEGER UNIQUE NOT NULL,
      capacity INTEGER DEFAULT 2,
      status TEXT DEFAULT 'available',
      active_order_id INTEGER,
      reserved_by TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS cafe_sessions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'active',
      created_by INTEGER REFERENCES users(id),
      connected_devices INTEGER DEFAULT 1,
      current_draft TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, menu_item_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role_target TEXT DEFAULT 'customer',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Run schema migrations for delivery & cleanups
  try {
    const orderCols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);
    if (!orderCols.includes('order_type')) {
      db.exec("ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'dine_in'");
    }
    if (!orderCols.includes('delivery_address')) {
      db.exec("ALTER TABLE orders ADD COLUMN delivery_address TEXT");
    }
    if (!orderCols.includes('delivery_fee')) {
      db.exec("ALTER TABLE orders ADD COLUMN delivery_fee REAL DEFAULT 0");
    }
    if (!orderCols.includes('delivery_status')) {
      db.exec("ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT 'pending'");
    }
    if (!orderCols.includes('delivery_partner')) {
      db.exec("ALTER TABLE orders ADD COLUMN delivery_partner TEXT");
    }
    if (!orderCols.includes('delivered_at')) {
      db.exec("ALTER TABLE orders ADD COLUMN delivered_at DATETIME");
    }

    const menuCols = db.prepare('PRAGMA table_info(menu_items)').all().map(c => c.name);
    if (!menuCols.includes('delivery_available')) {
      db.exec("ALTER TABLE menu_items ADD COLUMN delivery_available INTEGER DEFAULT 1");
    }
    if (!menuCols.includes('dine_in_available')) {
      db.exec("ALTER TABLE menu_items ADD COLUMN dine_in_available INTEGER DEFAULT 1");
    }

    const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
    if (!userCols.includes('saved_address')) {
      db.exec("ALTER TABLE users ADD COLUMN saved_address TEXT");
    }

    // Fix historical order items with undefined in name
    db.exec(`
      UPDATE order_items
      SET name = REPLACE(REPLACE(name, 'undefined undefined ', ''), 'undefined ', '')
      WHERE name LIKE '%undefined%';
    `);

    // Ensure rich café food items exist for online delivery
    const insertFood = db.prepare(`
      INSERT OR IGNORE INTO menu_items (category_slug, name, description, base_price, image_url, available, delivery_available, dine_in_available, tags, origin_country, origin_flag)
      VALUES (?, ?, ?, ?, ?, 1, 1, 1, ?, ?, ?)
    `);

    const foodItems = [
      ['snacks', 'Smoked Herb Chicken & Pesto Panini', 'Artisanal grilled sourdough with slow-roasted herb chicken, Genovese basil pesto, and fresh buffalo mozzarella.', 320, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop', '["Chef Special", "Gourmet", "High Protein"]', 'Italy', '🇮🇹'],
      ['snacks', 'Avocado & Sun-Dried Tomato Tartine', 'Crusty rustic country loaf topped with smashed Hass avocado, Kalamata olives, balsamic glaze, and microgreens.', 280, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop', '["Vegan", "Fresh", "Healthy"]', 'France', '🇫🇷'],
      ['snacks', 'Chipotle Grilled Paneer Wrap', 'Tandoor-marinated cottage cheese cubes folded with crunchy bell peppers, chipotle aioli, and caramelized onions.', 260, 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&auto=format&fit=crop', '["Vegetarian", "Spicy", "Warm"]', 'India', '🇮🇳'],
      ['snacks', 'Artisan Smash Brioche Burger', 'Handcrafted plant-protein or spiced chicken patty topped with aged cheddar, caramelized shallots, and house café sauce on a toasted brioche bun.', 340, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop', '["Bestseller", "Savory", "Hearty"]', 'USA', '🇺🇸'],
      ['desserts', 'Almond Frangipane Pain Au Chocolat', 'Double-baked French laminated pastry filled with dark Belgian chocolate batons and sweet almond frangipane cream.', 190, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop', '["Bakery", "Flaky", "Sweet"]', 'France', '🇫🇷'],
      ['desserts', 'Salted Caramel Pecan Cookie', 'Giant soft-baked brown butter cookie loaded with roasted Georgia pecans and sea salt caramel molten center.', 130, 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop', '["Freshly Baked", "Indulgent"]', 'USA', '🇺🇸'],
      ['espresso', 'Caffè Americano Reserve', 'Single-origin Colombian espresso drawn long over hot filtered water, unveiling subtle citrus zest and bittersweet cocoa finish.', 160, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop', '["Classic", "Pure", "Smooth"]', 'Colombia', '🇨🇴'],
      ['latte', 'Spanish Iced Cortado', 'Double shot of dark roasted espresso layered with chilled condensed milk and velvety whole milk over ice.', 210, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop', '["Cold", "Caramelized", "Velvety"]', 'Spain', '🇪🇸']
    ];

    for (const item of foodItems) {
      const exists = db.prepare('SELECT id FROM menu_items WHERE name = ?').get(item[1]);
      if (!exists) {
        insertFood.run(item[0], item[1], item[2], item[3], item[4], item[5], item[6], item[7]);
      }
    }

    // Ensure default cafe tables 1-10 exist
    const tableCount = db.prepare('SELECT COUNT(*) as count FROM cafe_tables').get()?.count || 0;
    if (tableCount === 0) {
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
      console.log('✓ Default cafe tables 1-10 initialized');
    }

    // Ensure sample delivery order exists so delivery option has orders alongside cafe orders
    const deliveryOrderCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_type = 'delivery'").get()?.count || 0;
    if (deliveryOrderCount === 0) {
      try {
        const insOrder = db.prepare(`
          INSERT INTO orders (
            order_number, user_id, guest_name, table_number, status, total_amount, payment_status,
            payment_method, estimated_wait_min, notes, order_type, delivery_address, delivery_fee,
            delivery_status, delivery_partner, created_at
          ) VALUES (?, NULL, 'Aria Chen', NULL, 'completed', 380, 'paid', 'cod', 0, 'Ring doorbell twice', 'delivery', ?, 40, 'delivered', 'Vikram S. (Electric Scooter)', datetime('now', '-1 hour'))
        `);
        const delivRes = insOrder.run(
          104,
          JSON.stringify({
            name: 'Aria Chen',
            phone: '9876543210',
            address: '42 Lotus Boulevard, Apt 4B',
            area: 'Indiranagar',
            city: 'Bengaluru',
            pinCode: '560038',
            instructions: 'Ring doorbell twice'
          })
        );
        const insItem = db.prepare(`
          INSERT INTO order_items (order_id, menu_item_id, name, base_price, quantity, customization, item_total)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        insItem.run(
          delivRes.lastInsertRowid,
          3,
          'Madagascar Vanilla Bean Latte',
          210,
          1,
          JSON.stringify({ size: 'Large (480ml)', milk: 'Oat Milk' }),
          210
        );
        insItem.run(
          delivRes.lastInsertRowid,
          205,
          'Smoked Herb Chicken & Pesto Panini',
          130,
          1,
          JSON.stringify({ heated: 'Warm' }),
          130
        );
        console.log('✓ Sample delivered roastery order initialized');
      } catch (delivErr) {
        console.warn('Sample delivery order seed note:', delivErr.message);
      }
    }
  } catch (mErr) {
    console.error('Schema migration note:', mErr.message);
  }
}

initSchema();

module.exports = { db, initSchema };
