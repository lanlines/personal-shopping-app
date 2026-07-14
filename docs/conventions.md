# Coding Conventions

## Naming

- Files: kebab-case (shopping-cart-screen.tsx)
- Folders: kebab-case
- Components: PascalCase (ShoppingCartScreen)
- Functions/vars: camelCase
- Types/interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE

## TypeScript

- Prefer type aliases for unions and object shapes.
- Use interfaces for props and public contracts.
- Avoid any; use unknown with narrowing when needed.
- Explicit return types for exported functions.

## React Components

- Function components only.
- Props interface named <ComponentName>Props.
- Keep components small; move logic to hooks or domain use cases.

## Folder and File Rules

- Feature code lives under src/features/<feature>.
- Reusable UI in src/components.
- Keep index.ts barrel files minimal.

## Database Naming

- Tables: snake_case plural (store_prices).
- Columns: snake_case.
- Foreign keys: <table>\_id.

## Imports

Order:

1. React and React Native
2. Third-party libraries
3. Internal absolute imports
4. Relative imports

## Error Handling

- Repository returns Result objects.
- No silent failures; log errors in repositories.
- UI shows errors only for user-triggered actions.
