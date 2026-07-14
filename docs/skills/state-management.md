# Skill: State Management

## Purpose

Manage ephemeral UI state with Zustand.

## Usage Rules

- Persisted data stays in SQLite.
- Store only UI state and temporary drafts.

## Conventions

- Store files in src/state.
- Expose selectors for derived values.

## Example Prompts

- Create a cartDraft store with item ids and quantities.
- Add a filter state for store list.

## Mistakes to Avoid

- Duplicating DB data in stores.
- Large, monolithic stores.
