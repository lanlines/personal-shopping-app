# Architecture

## Overview

Use a simple feature-first structure with a thin UI layer, explicit use cases, and a repository-driven SQLite data layer.

UI (screens, components) -> use cases (feature logic) -> repositories (SQLite) -> database

## Offline-First Strategy

- All writes persist to SQLite immediately.
- UI reads from SQLite-derived data.
- If a screen needs transient state, keep it in a small store (Zustand).
- Migrations are mandatory for schema changes.

## State Management

- Zustand for UI and session state (filters, active cart, draft items).
- Domain data is stored in SQLite and queried as needed.
- Derived totals should be computed from query results, not cached in memory.

## Database Architecture

Tables (MVP):

- stores (id, name, notes, created_at)
- items (id, name, unit, created_at)
- store_prices (id, store_id, item_id, price, unit, updated_at)
- transactions (id, store_id, total, budget, created_at)
- transaction_items (id, transaction_id, item_id, quantity, price, line_total)

Rules:

- Use integer primary keys.
- Use foreign keys for relations.
- Store timestamps as ISO strings.

## Feature Organization

Each feature should contain:

- ui: screens and feature-specific components
- domain: use cases and pure logic
- data: repository wrappers for feature-level queries

## Example Data Flow

1. User updates quantity in cart.
2. UI dispatches use case: updateCartItem.
3. Use case writes to SQLite via repository.
4. Screen queries updated cart and renders totals.

## Error Handling

- Repository returns a Result object: { ok: true, data } or { ok: false, error }.
- UI shows user-friendly messages only for actions; background failures are logged.
