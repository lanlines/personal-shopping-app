import { getDatabaseAsync } from "../database";
import { fail, ok, type Result } from "../result";
import type { Store } from "../types";

type StoreRow = {
  id: number;
  name: string;
  created_at: string;
};

function mapStore(row: StoreRow): Store {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function createStore(name: string): Promise<Result<Store>> {
  try {
    const db = await getDatabaseAsync();
    const createdAt = new Date().toISOString();

    const result = await db.runAsync(
      "INSERT INTO stores (name, created_at) VALUES (?, ?)",
      [name.trim(), createdAt]
    );

    const created = await getStoreById(result.lastInsertRowId);
    if (!created.ok) {
      return created;
    }

    if (!created.data) {
      return fail("Store was created but could not be loaded.");
    }

    return ok(created.data);
  } catch (error) {
    return fail(error);
  }
}

export async function getStoreById(
  id: number
): Promise<Result<Store | null>> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<StoreRow>(
      "SELECT id, name, created_at FROM stores WHERE id = ?",
      [id]
    );

    return ok(row ? mapStore(row) : null);
  } catch (error) {
    return fail(error);
  }
}

export async function listStores(): Promise<Result<Store[]>> {
  try {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<StoreRow>(
      "SELECT id, name, created_at FROM stores ORDER BY name ASC"
    );

    return ok(rows.map(mapStore));
  } catch (error) {
    return fail(error);
  }
}

export async function updateStore(
  id: number,
  input: { name: string }
): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();

    await db.runAsync("UPDATE stores SET name = ? WHERE id = ?", [
      input.name.trim(),
      id,
    ]);

    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteStore(id: number): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    await db.runAsync("DELETE FROM stores WHERE id = ?", [id]);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}