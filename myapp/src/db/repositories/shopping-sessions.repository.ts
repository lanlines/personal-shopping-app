import { getDatabaseAsync } from "../database";
import { fail, ok, type Result } from "../result";
import type { ShoppingSession } from "../types";

type ShoppingSessionRow = {
  id: number;
  store_id: number;
  budget: number;
  total: number;
  created_at: string;
  finished_at: string | null;
};

function mapShoppingSession(row: ShoppingSessionRow): ShoppingSession {
  return {
    id: row.id,
    storeId: row.store_id,
    budget: row.budget,
    total: row.total,
    createdAt: row.created_at,
    finishedAt: row.finished_at,
  };
}

export async function createShoppingSession(input: {
  storeId: number;
  budget: number;
}): Promise<Result<ShoppingSession>> {
  try {
    const db = await getDatabaseAsync();
    const createdAt = new Date().toISOString();

    const result = await db.runAsync(
      `
      INSERT INTO shopping_sessions (store_id, budget, total, created_at, finished_at)
      VALUES (?, ?, ?, ?, NULL)
      `,
      [input.storeId, input.budget, 0, createdAt]
    );

    const created = await getShoppingSessionById(result.lastInsertRowId);
    if (!created.ok) {
      return created;
    }

    if (!created.data) {
      return fail("Shopping session was created but could not be loaded.");
    }

    return ok(created.data);
  } catch (error) {
    return fail(error);
  }
}

export async function getActiveShoppingSession(): Promise<
  Result<ShoppingSession | null>
> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<ShoppingSessionRow>(
      `
      SELECT id, store_id, budget, total, created_at, finished_at
      FROM shopping_sessions
      WHERE finished_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      `
    );

    return ok(row ? mapShoppingSession(row) : null);
  } catch (error) {
    return fail(error);
  }
}

export async function getShoppingSessionById(
  id: number
): Promise<Result<ShoppingSession | null>> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<ShoppingSessionRow>(
      `
      SELECT id, store_id, budget, total, created_at, finished_at
      FROM shopping_sessions
      WHERE id = ?
      `,
      [id]
    );

    return ok(row ? mapShoppingSession(row) : null);
  } catch (error) {
    return fail(error);
  }
}

export async function listShoppingSessions(): Promise<Result<ShoppingSession[]>> {
  try {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<ShoppingSessionRow>(
      `
      SELECT id, store_id, budget, total, created_at, finished_at
      FROM shopping_sessions
      ORDER BY created_at DESC
      `
    );

    return ok(rows.map(mapShoppingSession));
  } catch (error) {
    return fail(error);
  }
}

export async function listRecentShoppingSessions(
  limit: number
): Promise<Result<ShoppingSession[]>> {
  try {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<ShoppingSessionRow>(
      `
      SELECT id, store_id, budget, total, created_at, finished_at
      FROM shopping_sessions
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [limit]
    );

    return ok(rows.map(mapShoppingSession));
  } catch (error) {
    return fail(error);
  }
}

export async function updateShoppingSessionTotals(
  id: number,
  input: { total: number }
): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    await db.runAsync(
      "UPDATE shopping_sessions SET total = ? WHERE id = ?",
      [input.total, id]
    );
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function finishShoppingSession(id: number): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    const finishedAt = new Date().toISOString();

    await db.runAsync(
      "UPDATE shopping_sessions SET finished_at = ? WHERE id = ?",
      [finishedAt, id]
    );

    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteShoppingSession(id: number): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    await db.runAsync("DELETE FROM shopping_sessions WHERE id = ?", [id]);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}