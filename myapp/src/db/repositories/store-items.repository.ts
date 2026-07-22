import { getDatabaseAsync } from "../database";
import { fail, ok, type Result } from "../result";
import type { StoreItem } from "../types";

type StoreItemRow = {
  id: number;
  store_id: number;
  item_id: number;
  latest_price: number;
  updated_at: string;
};

function mapStoreItem(row: StoreItemRow): StoreItem {
  return {
    id: row.id,
    storeId: row.store_id,
    itemId: row.item_id,
    latestPrice: row.latest_price,
    updatedAt: row.updated_at,
  };
}

export async function upsertStoreItemPrice(input: {
  storeId: number;
  itemId: number;
  latestPrice: number;
}): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    const updatedAt = new Date().toISOString();

    await db.runAsync(
      `
      INSERT INTO store_items (store_id, item_id, latest_price, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(store_id, item_id)
      DO UPDATE SET
        latest_price = excluded.latest_price,
        updated_at = excluded.updated_at
      `,
      [input.storeId, input.itemId, input.latestPrice, updatedAt]
    );

    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function getLatestPriceForItemAtStore(
  storeId: number,
  itemId: number
): Promise<Result<number | null>> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ latest_price: number }>(
      "SELECT latest_price FROM store_items WHERE store_id = ? AND item_id = ?",
      [storeId, itemId]
    );

    return ok(row ? row.latest_price : null);
  } catch (error) {
    return fail(error);
  }
}

export async function listPricesByStore(
  storeId: number
): Promise<
  Result<
    Array<{
      itemId: number;
      itemName: string;
      latestPrice: number;
      updatedAt: string;
    }>
  >
> {
  try {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<{
      item_id: number;
      item_name: string;
      latest_price: number;
      updated_at: string;
    }>(
      `
      SELECT
        si.item_id,
        i.name AS item_name,
        si.latest_price,
        si.updated_at
      FROM store_items si
      JOIN items i ON i.id = si.item_id
      WHERE si.store_id = ?
      ORDER BY i.name ASC
      `,
      [storeId]
    );

    return ok(
      rows.map((row) => ({
        itemId: row.item_id,
        itemName: row.item_name,
        latestPrice: row.latest_price,
        updatedAt: row.updated_at,
      }))
    );
  } catch (error) {
    return fail(error);
  }
}

export async function listPriceHistoryForItem(
  itemId: number
): Promise<
  Result<
    Array<{
      storeId: number;
      storeName: string;
      latestPrice: number;
      updatedAt: string;
    }>
  >
> {
  try {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<{
      store_id: number;
      store_name: string;
      latest_price: number;
      updated_at: string;
    }>(
      `
      SELECT
        si.store_id,
        s.name AS store_name,
        si.latest_price,
        si.updated_at
      FROM store_items si
      JOIN stores s ON s.id = si.store_id
      WHERE si.item_id = ?
      ORDER BY si.updated_at DESC
      `,
      [itemId]
    );

    return ok(
      rows.map((row) => ({
        storeId: row.store_id,
        storeName: row.store_name,
        latestPrice: row.latest_price,
        updatedAt: row.updated_at,
      }))
    );
  } catch (error) {
    return fail(error);
  }
}

export async function deleteStoreItemLink(
  storeId: number,
  itemId: number
): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    await db.runAsync(
      "DELETE FROM store_items WHERE store_id = ? AND item_id = ?",
      [storeId, itemId]
    );
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}