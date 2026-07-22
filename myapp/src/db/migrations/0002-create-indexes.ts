export const indexMigration = {
  version: 2,
  sql: `
    CREATE INDEX IF NOT EXISTS idx_items_favorite
      ON items(favorite);

    CREATE INDEX IF NOT EXISTS idx_store_items_store_id
      ON store_items(store_id);

    CREATE INDEX IF NOT EXISTS idx_store_items_item_id
      ON store_items(item_id);

    CREATE INDEX IF NOT EXISTS idx_shopping_sessions_store_id
      ON shopping_sessions(store_id);

    CREATE INDEX IF NOT EXISTS idx_shopping_sessions_created_at
      ON shopping_sessions(created_at);

    CREATE INDEX IF NOT EXISTS idx_shopping_sessions_finished_at
      ON shopping_sessions(finished_at);

    CREATE INDEX IF NOT EXISTS idx_session_items_session_id
      ON shopping_session_items(session_id);

    CREATE INDEX IF NOT EXISTS idx_session_items_item_id
      ON shopping_session_items(item_id);

    CREATE INDEX IF NOT EXISTS idx_session_items_purchased
      ON shopping_session_items(purchased);
  `,
};