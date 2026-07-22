import type { SQLiteDatabase } from "expo-sqlite";
import { coreTablesMigration } from "./migrations/0001-create-core-tables";
import { indexMigration } from "./migrations/0002-create-indexes";

const migrations = [coreTablesMigration, indexMigration];

export async function runMigrationsAsync(db: SQLiteDatabase): Promise<void> {
  const currentVersionRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );

  let currentVersion = currentVersionRow?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      await db.execAsync(migration.sql);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      currentVersion = migration.version;
    }
  }
}