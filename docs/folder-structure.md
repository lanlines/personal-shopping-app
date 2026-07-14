# Folder Structure

Proposed structure:

- src/
  - app/ App entry, providers, theme
  - navigation/ React Navigation setup
  - db/ SQLite setup, migrations, repositories
  - features/ Feature-based modules
    - stores/
      - ui/
      - domain/
      - data/
    - items/
      - ui/
      - domain/
      - data/
    - pricing/
      - ui/
      - domain/
      - data/
    - transactions/
      - ui/
      - domain/
      - data/
  - components/ Reusable UI components
  - hooks/ Shared hooks
  - state/ Zustand stores
  - types/ Shared types
  - utils/ Small utilities

## Folder Explanations

- src/app: app bootstrap, providers, and app-level configuration.
- src/navigation: all navigation config and param types.
- src/db: SQLite initialization, migrations, and base repositories.
- src/features: feature-specific logic and UI; default location for business logic.
- src/components: reusable UI pieces shared across features.
- src/hooks: shared hooks that are not feature-specific.
- src/state: Zustand stores for UI state.
- src/types: cross-cutting types.
- src/utils: small, pure helpers.

## Business Logic Location

- Feature logic goes in src/features/<feature>/domain.
- Use cases call repositories in src/features/<feature>/data or src/db.
- UI logic stays in screen components.

## Where AI-Generated Code Should Go

- Drafts and experiments: docs/ai-notes (do not import into app).
- Production code: only after review and placement in the proper src folder.
