# Screen Architecture

The application should maintain a minimal and fast screen structure.

Avoid creating unnecessary screens.

Each screen should have:

- one clear purpose
- minimal interactions
- fast navigation
- lightweight UI

---

# Screen Definitions

## 1. splash-screen.tsx

## Purpose

Initialize the app and local storage.

## Responsibilities

- load local database
- initialize cached session
- load settings/preferences
- redirect to appropriate screen

## UI Rules

Must remain minimal.

Display only:

- app logo
- loading indicator
- optional app tagline

Avoid:

- animations longer than 1–2 seconds
- onboarding logic in MVP
- unnecessary text

---

## 2. home-screen.tsx

## Purpose

Primary entry point of the application.

This should feel lightweight and action-focused.

---

## Must Display

- current shopping session summary
- today's/month spending
- recent items
- quick access actions

---

## Main Actions

- continue shopping session
- quick add item
- view history
- search items

---

## UI Rules

Prioritize:

- quick scanning
- clear totals
- large touch targets

Avoid:

- analytics-heavy dashboards
- too many cards
- excessive charts

---

## Recommended Layout

Top:

- greeting/title
- current budget summary

Middle:

- current session card
- recent items

Bottom:

- quick actions
- floating add button

---

## 3. shopping-session-screen.tsx

## Purpose

Core grocery tracking experience.

This is the most important screen in the app.

---

## Must Display

- running total
- remaining budget
- shopping item list
- add item action

---

## Main Actions

- add item
- edit item
- delete item
- mark purchased
- finish session

---

## UX Rules

The running total should always remain visible.

User interactions must feel:

- instant
- lightweight
- low friction

---

## Avoid

- complex menus
- deep navigation
- dense layouts

---

## Recommended Layout

Top:

- current total
- remaining budget

Middle:

- shopping items list

Bottom:

- floating add button
- session actions

---

## 4. quick-add-screen.tsx

## IMPORTANT

This should eventually become:

- bottom sheet
  OR
- modal component

instead of a full standalone screen.

---

## Purpose

Allow users to add grocery items within seconds.

---

## Required Inputs

- item name
- price

---

## Optional Inputs

- quantity
- category
- notes
- store
- barcode/photo

---

## UX Goal

Adding an item should take:
3–5 seconds maximum.

---

## Smart UX Features

The UI should support future:

- autocomplete suggestions
- recent items
- previous prices
- frequent purchases

---

## Avoid

- long forms
- multi-step flows
- excessive validation

---

## 5. transaction-history-screen.tsx

## Purpose

Review completed grocery trips and spending history.

---

## Must Display

- shopping sessions grouped by date
- total spending
- item count
- store information

---

## Features

- search
- filter by store
- filter by date
- session details

---

## UI Rules

History should feel:

- clean
- readable
- timeline-oriented

Avoid:

- spreadsheet-like layouts
- dense finance tables

---

## Recommended Card Example

- grocery trip date
- store name
- total amount
- number of items

---

## 6. item-details-screen.tsx

## Purpose

Track item pricing history and purchase patterns.

This is a high-value screen.

---

## Must Display

- item name
- latest price
- cheapest recorded price
- average price
- recent store purchases

---

## Future Support

Design should support:

- barcode support
- shelf photos
- OCR recognition
- AI price analysis

---

## Recommended Layout

Top:

- item image/icon
- item title

Middle:

- price summary cards

Bottom:

- price history timeline

---

## 7. store-details-screen.tsx

## Purpose

Provide lightweight store-specific insights.

---

## Must Display

- store name
- recent visits
- average spending
- recent purchased items

---

## Features

- store-specific price history
- recent shopping sessions
- favorite items purchased

---

## UI Rules

Keep this screen lightweight.

Avoid:

- complicated analytics
- overly detailed reports
- excessive graphs

---

# Global Screen Rules

All screens must support:

- empty states
- loading states
- offline states
- error states

---

# Navigation Rules

Preferred navigation:

- bottom tabs
- stack navigation only when necessary

Avoid:

- nested stacks
- deep navigation trees

---

# Component Rules

All screens should reuse:

- cards
- buttons
- typography
- spacing
- list components

Avoid duplicating styles between screens.

---

# Performance Rules

All screens must prioritize:

- fast rendering
- minimal re-renders
- responsive touch interactions

The app should always feel:

- fast
- simple
- stress-free
