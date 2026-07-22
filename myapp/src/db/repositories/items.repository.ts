import { getDatabaseAsync } from "../database";
import { fail, ok, type Result } from "../result";
import { toBoolean, toDbBool, type Item } from "../types";

type ItemRow = {
  id: number;
  name: string;
  image_path: string | null;
  favorite: number;
};

function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    imagePath: row.image_path,
    favorite: toBoolean(row.favorite),
  };
}

export async function createItem(input: {
  name: string;
  imagePath?: string | null;
  favorite?: boolean;
}): Promise<Result<Item>> {
  try {
    const db = await getDatabaseAsync();

    const result = await db.runAsync(
      "INSERT INTO items (name, image_path, favorite) VALUES (?, ?, ?)",
      [
        input.name.trim(),
        input.imagePath ?? null,
        toDbBool(input.favorite ?? false),
      ]
    );

    const created = await getItemById(result.lastInsertRowId);
    if (!created.ok) {
      return created;
    }

    if (!created.data) {
      return fail("Item was created but could not be loaded.");
    }

    return ok(created.data);
  } catch (error) {
    return fail(error);
  }
}

export async function getItemById(id: number): Promise<Result<Item | null>> {
  try {
    const db = await getDatabaseAsync();
    const row = await db.getFirstAsync<ItemRow>(
      "SELECT id, name, image_path, favorite FROM items WHERE id = ?",
      [id]
    );

    return ok(row ? mapItem(row) : null);
  } catch (error) {
    return fail(error);
  }
}

export async function listItems(): Promise<Result<Item[]>> {
  try {
    const db = await getDatabaseAsync();
    const rows = await db.getAllAsync<ItemRow>(
      "SELECT id, name, image_path, favorite FROM items ORDER BY favorite DESC, name ASC"
    );

    return ok(rows.map(mapItem));
  } catch (error) {
    return fail(error);
  }
}

export async function searchItems(query: string): Promise<Result<Item[]>> {
  try {
    const db = await getDatabaseAsync();
    const search = `%${query.trim()}%`;
    const rows = await db.getAllAsync<ItemRow>(
      "SELECT id, name, image_path, favorite FROM items WHERE name LIKE ? ORDER BY favorite DESC, name ASC",
      [search]
    );

    return ok(rows.map(mapItem));
  } catch (error) {
    return fail(error);
  }
}

export async function updateItem(
  id: number,
  input: {
    name?: string;
    imagePath?: string | null;
    favorite?: boolean;
  }
): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    if (input.name !== undefined) {
      updates.push("name = ?");
      params.push(input.name.trim());
    }

    if (input.imagePath !== undefined) {
      updates.push("image_path = ?");
      params.push(input.imagePath);
    }

    if (input.favorite !== undefined) {
      updates.push("favorite = ?");
      params.push(toDbBool(input.favorite));
    }

    if (updates.length === 0) {
      return fail("No fields were provided for update.");
    }

    params.push(id);

    await db.runAsync(`UPDATE items SET ${updates.join(", ")} WHERE id = ?`, params);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function toggleFavorite(
  id: number,
  favorite: boolean
): Promise<Result<void>> {
  return updateItem(id, { favorite });
}

export async function deleteItem(id: number): Promise<Result<void>> {
  try {
    const db = await getDatabaseAsync();
    await db.runAsync("DELETE FROM items WHERE id = ?", [id]);
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}