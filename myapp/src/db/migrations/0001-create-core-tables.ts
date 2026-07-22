export const coreTablesMigration = {
  version: 1,
  sql: `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      image_path TEXT,
      favorite INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS store_items (
      id INTEGER PRIMARY KEY NOT NULL,
      store_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      latest_price REAL NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      UNIQUE (store_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS shopping_sessions (
      id INTEGER PRIMARY KEY NOT NULL,
      store_id INTEGER NOT NULL,
      budget REAL NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      finished_at TEXT,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS shopping_session_items (
      id INTEGER PRIMARY KEY NOT NULL,
      session_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      purchased INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES shopping_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
      UNIQUE (session_id, item_id)
    );
  `,
};