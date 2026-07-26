import { getDatabaseAsync } from "../database";
import { fail, ok, type Result } from "../result";
import { toBoolean, toDbBool, type ShoppingSessionItem } from "../types";
import { updateShoppingSessionTotals } from "./shopping-sessions.repository";

type ShoppingSessionItemRow = {
  id: number;
  session_id: number;
  item_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  purchased: number;
};

function mapShoppingSessionItem(row: ShoppingSessionItemRow): ShoppingSessionItem {
  return {
    id: row.id,
    sessionId: row.session_id,
    itemId: row.item_id,
    quantity: row.quantity,
    price: row.price,
    subtotal: row.subtotal,
    purchased: toBoolean(row.purchased),
  };
}

async function recalculateSessionTotalAsync(sessionId: number): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ total: number }>(
      `
      SELECT COALESCE(SUM(subtotal), 0) AS total
      FROM shopping_session_items
      WHERE session_id = ?
      `,
      [sessionId]
    );

    await updateShoppingSessionTotals(sessionId, {
      total: row?.total ?? 0,
    });

    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function addSessionItem(input: {
  sessionId: number;
  itemId: number;
  quantity: number;
  price: number;
}): Promise<Result<ShoppingSessionItem>> {
  try {
    const db = await getDatabaseAsync();

    // If item already exists in this session, increment quantity instead of inserting
    const existing = await db.getFirstAsync<ShoppingSessionItemRow>(
      "SELECT id, session_id, item_id, quantity, price, subtotal, purchased FROM shopping_session_items WHERE session_id = ? AND item_id = ?",
      [input.sessionId, input.itemId]
    );

    if (existing) {
      const newQty = existing.quantity + input.quantity;
      const newSubtotal = newQty * input.price;
      await db.runAsync(
        "UPDATE shopping_session_items SET quantity = ?, price = ?, subtotal = ? WHERE id = ?",
        [newQty, input.price, newSubtotal, existing.id]
      );
      await recalculateSessionTotalAsync(input.sessionId);
      const updated = await getSessionItemById(existing.id);
      if (!updated.ok || !updated.data) return fail("Could not reload updated item.");
      return ok(updated.data);
    }

    const subtotal = input.quantity * input.price;
    const result = await db.runAsync(
      `
      INSERT INTO shopping_session_items
        (session_id, item_id, quantity, price, subtotal, purchased)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [input.sessionId, input.itemId, input.quantity, input.price, subtotal, toDbBool(false)]
    );

    const created = await getSessionItemById(result.lastInsertRowId);
    if (!created.ok) return created;
    if (!created.data) return fail("Shopping session item was created but could not be loaded.");

    await recalculateSessionTotalAsync(input.sessionId);
    return ok(created.data);
  } catch (error) {
    return fail(error);
  }
}

export async function getSessionItemById(
  id: number
): Promise<Result<ShoppingSessionItem | null>> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<ShoppingSessionItemRow>(
      `
      SELECT id, session_id, item_id, quantity, price, subtotal, purchased
      FROM shopping_session_items
      WHERE id = ?
      `,
      [id]
    );

    return ok(row ? mapShoppingSessionItem(row) : null);
  } catch (error) {
    return fail(error);
  }
}

export async function listItemsBySession(
  sessionId: number
): Promise<Result<ShoppingSessionItem[]>> {
  try {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<ShoppingSessionItemRow>(
      `
      SELECT id, session_id, item_id, quantity, price, subtotal, purchased
      FROM shopping_session_items
      WHERE session_id = ?
      ORDER BY purchased ASC, id ASC
      `,
      [sessionId]
    );

    return ok(rows.map(mapShoppingSessionItem));
  } catch (error) {
    return fail(error);
  }
}

export async function updateSessionItemQuantity(
  id: number,
  quantity: number
): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ session_id: number; price: number }>(
      "SELECT session_id, price FROM shopping_session_items WHERE id = ?",
      [id]
    );

    if (!row) return fail("Shopping session item not found.");

    const subtotal = quantity * row.price;
    await db.runAsync(
      "UPDATE shopping_session_items SET quantity = ?, subtotal = ? WHERE id = ?",
      [quantity, subtotal, id]
    );

    await recalculateSessionTotalAsync(row.session_id);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function decrementSessionItemQuantity(id: number): Promise<Result<"deleted" | "updated">> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ session_id: number; price: number; quantity: number }>(
      "SELECT session_id, price, quantity FROM shopping_session_items WHERE id = ?",
      [id]
    );

    if (!row) return fail("Shopping session item not found.");

    if (row.quantity <= 1) {
      await db.runAsync("DELETE FROM shopping_session_items WHERE id = ?", [id]);
      await recalculateSessionTotalAsync(row.session_id);
      return ok("deleted");
    }

    const newQty = row.quantity - 1;
    const subtotal = newQty * row.price;
    await db.runAsync(
      "UPDATE shopping_session_items SET quantity = ?, subtotal = ? WHERE id = ?",
      [newQty, subtotal, id]
    );
    await recalculateSessionTotalAsync(row.session_id);
    return ok("updated");
  } catch (error) {
    return fail(error);
  }
}

export async function updateSessionItemPrice(
  id: number,
  price: number
): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ session_id: number; quantity: number }>(
      "SELECT session_id, quantity FROM shopping_session_items WHERE id = ?",
      [id]
    );

    if (!row) {
      return fail("Shopping session item not found.");
    }

    const subtotal = row.quantity * price;

    await db.runAsync(
      "UPDATE shopping_session_items SET price = ?, subtotal = ? WHERE id = ?",
      [price, subtotal, id]
    );

    await recalculateSessionTotalAsync(row.session_id);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function markSessionItemPurchased(
  id: number,
  purchased: boolean
): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    await db.runAsync(
      "UPDATE shopping_session_items SET purchased = ? WHERE id = ?",
      [toDbBool(purchased), id]
    );
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteSessionItem(id: number): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<{ session_id: number }>(
      "SELECT session_id FROM shopping_session_items WHERE id = ?",
      [id]
    );

    if (!row) {
      return fail("Shopping session item not found.");
    }

    await db.runAsync("DELETE FROM shopping_session_items WHERE id = ?", [id]);
    await recalculateSessionTotalAsync(row.session_id);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}