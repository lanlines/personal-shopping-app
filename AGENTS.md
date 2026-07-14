# AI Agent Guide

## Project Overview

Offline-first mobile app for personal grocery and shopping expense tracking. Simple, local-only MVP.

## Stack

- React Native + Expo
- TypeScript
- SQLite (expo-sqlite)
- React Navigation

## Architecture Rules

- Feature-first structure under src/features.
- UI -> use case -> repository -> SQLite.
- All data writes go to SQLite first; UI reads from SQLite-derived state.
- Keep modules small and single-purpose.

## Data Layer Rules

- Access SQLite only through repository functions in src/db.
- Use parameterized queries only.
- Add migrations when schema changes.
- No network sync for MVP.

## State Management Rules

- Use Zustand for UI state and ephemeral session state.
- Derive lists and totals from SQLite reads; do not duplicate DB state in memory.
- Keep stores thin; avoid business logic in React components.

## Navigation Rules

- Use typed navigation params.
- Keep screens focused; use feature-level components.

## Coding Standards

- TypeScript strict typing; no implicit any.
- Prefer functions over classes.
- Pure functions in domain logic; keep side effects in data layer.

## File Modification Guidelines

- Touch only files required for the task.
- Avoid cross-cutting edits unless requested.
- Keep diffs small; one logical change per file.

## Naming Conventions

- Files: kebab-case for components and screens (e.g., shopping-cart-screen.tsx).
- Folders: kebab-case.
- Types and interfaces: PascalCase.
- Functions and variables: camelCase.

## Constraints

- MVP scope only; avoid overengineering.
- Local-only data.
- Keep bundle lightweight.

## AI Task Execution Rules

- Start with a short plan and file list.
- Create or edit the minimum number of files.
- Add brief comments only where logic is non-obvious.
- Include example usage when introducing new APIs.

## Definition of Done

- Builds without TypeScript errors.
- Uses repository functions for all DB operations.
- UI reflects SQLite state.
- No unused exports or dead code.
