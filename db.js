const Database = require('better-sqlite3');

const db = new Database('./catalogue.db');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS favourites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
  );
`);

// Seed some sample items if the table is empty
const count = db.prepare('SELECT COUNT(*) as count FROM items').get();
if (count.count === 0) {
  const insert = db.prepare('INSERT INTO items (name, description) VALUES (?, ?)');
  insert.run('Laptop', 'A powerful laptop for developers');
  insert.run('Keyboard', 'Mechanical keyboard with RGB lighting');
  insert.run('Monitor', '4K ultra-wide monitor');
  insert.run('Mouse', 'Ergonomic wireless mouse');
  insert.run('Headphones', 'Noise-cancelling over-ear headphones');
  insert.run('Webcam', 'HD webcam for video calls');
  insert.run('Desk Lamp', 'LED desk lamp with adjustable brightness');
  insert.run('USB Hub', '7-port USB 3.0 hub');
  insert.run('Chair Mat', 'Anti-static chair mat for hard floors');
  insert.run('Cable Organiser', 'Velcro cable ties and organisers');
  insert.run('Standing Desk', 'Electric height-adjustable standing desk');
  insert.run('Webcam Cover', 'Privacy cover for laptop webcam');
}

module.exports = db;