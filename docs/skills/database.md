# Skill: Database

## Purpose

Design and implement SQLite schema, migrations, and repository functions.

## Usage Rules

- Use parameterized queries only.
- Add migrations for any schema change.
- Return Result objects from repositories.

## Conventions

- Tables and columns use snake_case.
- Timestamps stored as ISO strings.

## Example Prompts

- Create migrations and repository functions for store_prices.
- Add a query to compute total by transaction.

## Mistakes to Avoid

- Accessing SQLite directly from UI.
- Skipping migrations.
- Duplicating SQLite state in stores.
