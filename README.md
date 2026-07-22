# My Shopping App

Offline-first mobile app for personal grocery and shopping expense tracking. Simple, local-only MVP.

## Goals

- Track shopping expenses while shopping
- Compare item prices per store
- Stay within a shopping budget
- Keep local-only transaction history

## Stack

- React Native + Expo
- TypeScript
- SQLite (expo-sqlite)
- React Navigation

## Project Docs

- Architecture: docs/architecture.md
- Folder structure: docs/folder-structure.md
- Coding conventions: docs/conventions.md
- AI workflow: docs/ai-workflow.md
- AI agent rules: AGENTS.md

## MVP Feature Priorities

- Store management
- Item management
- Price per store
- Transaction history
- Offline database

## Shopping Flow

The app follows a simple offline-first shopping session flow:

1. Select a store
2. Enter a budget
3. Start the session
4. Add items while shopping
5. Track the live total
6. See the remaining budget
7. Finish the session
8. Save the trip to history

When a session is finished, it is stored locally in SQLite and appears in transaction history for later review.

## History Flow

Saved trips are shown in history with:

1. Shopping trip
2. Store
3. Date
4. Budget
5. Total
6. Tap to open
7. Purchased items

## Onboarding Copy

Welcome to your shopping session. Start by choosing a store and setting your budget, then begin adding items as you shop. The app keeps your running total and remaining budget visible so you can stay on track. When you finish, your trip is saved to history for easy review later.

## Getting Started

The app lives in the [myapp](myapp) folder, which contains the Expo project, app screens, and SQLite data layer. The root-level docs in [docs](docs) describe the architecture, folder structure, and MVP scope.
