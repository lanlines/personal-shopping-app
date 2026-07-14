# Skill: Screen Creation

## Purpose

Create feature screens that compose components and call use cases.

## Usage Rules

- Screen reads data from repository queries.
- Keep logic in hooks or use cases.

## Conventions

- Screen file name: <feature>-screen.tsx.
- One screen per file.

## Example Prompts

- Create a Transactions screen with list, empty state, and total.
- Add a Store Details screen with recent prices.

## Mistakes to Avoid

- Direct DB queries inside components.
- Excessive local state for persisted data.
