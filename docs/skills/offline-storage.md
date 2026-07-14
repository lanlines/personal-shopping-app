# Skill: Offline Storage

## Purpose

Ensure all data is stored locally in SQLite and accessible offline.

## Usage Rules

- Writes go to SQLite first.
- Reads use repository query functions.

## Conventions

- Add migrations for schema changes.
- Use Result objects for errors.

## Example Prompts

- Add offline storage for transactions.
- Implement a repository query for item prices per store.

## Mistakes to Avoid

- Storing data only in memory.
- Skipping error handling in repositories.
