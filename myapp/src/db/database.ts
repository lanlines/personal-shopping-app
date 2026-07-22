import * as SQLite from "expo-sqlite";
import { runMigrationsAsync } from "./migration-runner";

const DATABASE_NAME = "my-shopping-app.db";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabaseAsync(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await db.execAsync("PRAGMA foreign_keys = ON;");
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await runMigrationsAsync(db);
      return db;
    })();
  }

  return databasePromise;
}