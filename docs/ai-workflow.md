# AI-Assisted Development Workflow

## Planning

- Define one feature at a time.
- List inputs, outputs, and screens.
- Identify affected folders before coding.

## Task Chunking

- Split work into small, testable tasks.
- Each task should touch a small number of files.

## Prompting Tips

- State the goal, stack, and constraints.
- Provide the file list to change.
- Include expected inputs/outputs.
- Ask for incremental steps and minimal diffs.

## Review AI Output

- Check for architecture violations.
- Ensure DB access goes through repositories.
- Validate TypeScript types.
- Verify UI uses SQLite-derived data.

## Avoid Context Overload

- Limit prompts to one feature or one slice.
- Provide only necessary file context.
- Ask the AI to summarize risks and open questions.

## What AI Handles Well

- Boilerplate generation
- CRUD repository functions
- Simple UI layouts
- Repetitive wiring

## What Requires Manual Review

- Data modeling decisions
- Navigation flow
- User experience and copy
- Performance and edge cases

## Task Breakdown Strategy

Feature: Shopping Session

1. Create DB schema/migration
2. Add TypeScript types
3. Add repository CRUD
4. Add use cases
5. Add UI components
6. Build screen layout
7. Compute totals and validation
8. Add tests

This structure keeps each step small and lets AI focus on one layer at a time, which improves correctness.

## Reusable Prompt Templates

### Screen Creation

Goal: Build a screen for <feature>.
Constraints: Offline-only, use repository queries.
Files: <list of files>
Expected UI: <layout and states>

### Database Model

Create SQLite schema for <feature>.
Include migrations and TypeScript types.

### CRUD Logic

Add repository functions for <entity>.
Return Result objects and use parameterized queries.

### Reusable Component

Create a <ComponentName> component.
Props: <props list>. Keep presentational only.

### Refactor

Refactor <file> for clarity.
Do not change behavior.

### Debugging

Investigate bug: <description>.
List hypotheses and minimal code changes.

### Hooks

Create a hook for <use case>.
Keep side effects in repository.

### Forms

Implement form for <entity> with validation.
No external form library for MVP.

### Offline Storage

Add offline persistence for <entity> using SQLite.

### Architecture Review

Review changes against AGENTS.md rules and docs/architecture.md.
List violations and fixes.
