# My Shopping App

Offline-first mobile app for personal grocery and shopping expense tracking. No accounts, no cloud, no internet required — everything lives on the device.

## Goals

- Track shopping expenses in real time while shopping
- Compare item prices across different stores
- Stay within a shopping budget with a live progress bar
- Keep a local-only transaction history of all past trips

## Stack

- React Native + Expo
- TypeScript
- SQLite via `expo-sqlite`
- Expo Router (file-based navigation)
- `react-native-safe-area-context`

## Project Docs

- Architecture: docs/architecture.md
- Folder structure: docs/folder-structure.md
- Coding conventions: docs/conventions.md
- AI workflow: docs/ai-workflow.md
- AI agent rules: AGENTS.md

## Getting Started

The app lives in the `myapp/` folder.

```bash
cd myapp
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `i` for iOS simulator / `a` for Android emulator.

## Screens

| Screen | File | Description |
|---|---|---|
| Home | `home-screen.tsx` | Time-aware greeting, active session hero card, 2×2 quick action tiles, cart preview |
| Shopping Session | `shopping-session-screen.tsx` | Live session with item list, qty stepper, running total, budget progress |
| Transaction History | `transaction-history-screen.tsx` | All past and active sessions; tap completed session to view receipt modal |
| Store Details | `store-details-screen.tsx` | Store list; tap a store to open price management modal |
| Item Details | `item-details-screen.tsx` | Item catalog with cheapest price per item; tap to view/edit store prices |
| Quick Add | `quick-add-screen.tsx` | Fast item creation form |

## Features

### Shopping Session
- Select a store and set a budget to start a session
- Add items via inline bottom sheet — search catalog or type a new item name
- Catalog items auto-fill the last recorded price for that store
- Price is required (must be > 0) before an item can be added
- Qty stepper (− qty +) on each item card; decrementing to 0 removes the item
- Live running total and remaining budget visible at all times
- Budget progress bar turns red when over budget
- Finish session saves the trip to history

### Transaction History
- Filter sessions by All / Completed / Active
- Summary card shows total sessions, completed count, and filtered spending
- Tap a completed session → receipt modal (store, date, budget vs total, itemized list)
- Tap an active session → navigates back to the live shopping session screen

### Store Management
- Add, rename, and delete stores
- Tap a store card → bottom sheet modal with:
  - Stats: price link count, average price, visit count
  - Add or update a price for any item at that store
  - Full price history list
  - Recent shopping visits

### Item Catalog
- Full item list with cheapest price and store count shown inline on each card
- Tap an item → bottom sheet modal with:
  - 4-stat row: latest, cheapest, average price, store count
  - Price by store list with inline edit (tap Edit on any row to update price in place)
  - Favorite / delete actions

## Database Schema

All data is stored locally in SQLite. The schema is managed via versioned migrations in `src/db/migrations/`.

```
stores
  id, name, created_at

items
  id, name, image_path, favorite

store_items                          -- latest price per item per store
  id, store_id, item_id, latest_price, updated_at
  UNIQUE (store_id, item_id)

shopping_sessions
  id, store_id, budget, total, created_at, finished_at

shopping_session_items               -- items added during a session
  id, session_id, item_id, quantity, price, subtotal, purchased
  UNIQUE (session_id, item_id)       -- duplicate adds increment qty instead
```

## Data Layer

All database access goes through the repository pattern in `src/db/repositories/`. Every function returns a `Result<T>` type — either `{ ok: true, data }` or `{ ok: false, error }` — so errors are handled explicitly without try/catch at the screen level.

```
repositories/
  stores.repository.ts
  items.repository.ts
  store-items.repository.ts
  shopping-sessions.repository.ts
  shopping-session-items.repository.ts
```

## Key Behaviours

- **Offline-first** — no network calls, all data in local SQLite
- **Currency** — Philippine Peso (P), displayed as `P0.00`
- **Duplicate item guard** — adding an item already in the session increments its quantity instead of throwing a unique constraint error
- **Price required** — items cannot be added to a session with a price of 0 or empty; price field auto-focuses on validation failure
- **Focus refresh** — screens that show live data (home, session) use `useFocusEffect` so data reloads every time the screen comes into focus, not just on mount
- **Favorites** — items can be starred; favorites sort to the top of the item list

## UI Design Tokens

| Token | Value | Usage |
|---|---|---|
| Background | `#F7F7F2` | Screen background |
| Primary text | `#111111` | Headings, buttons |
| Secondary text | `#6B6B63` | Labels, meta |
| Border | `#E7E4DA` | Card borders |
| Stat block | `#F4F2E9` | Summary tiles |
| Secondary button | `#EDEADE` | Ghost buttons |
| Delete button | `#F5DDD8` | Destructive actions |
| Card radius | 16–24px | All cards |
| Sheet radius | 28–32px | Bottom sheet modals |

## Folder Structure

```
myapp/
  src/
    app/               # Expo Router screens
    components/        # Shared UI components (reserved)
    constants/
      theme.ts         # Design tokens
    db/
      migrations/      # Versioned SQL migrations
      repositories/    # Data access layer
      database.ts      # SQLite init + migration runner bootstrap
      migration-runner.ts
      result.ts        # Result<T> type
      types.ts         # Shared TypeScript interfaces
    hooks/             # Custom hooks (reserved)
```
