Recommended MVP Screens

1. Splash / Loading Screen

Purpose:

App logo
Initialize local database
Load cached data

Minimal only.

2. Home / Dashboard Screen

Display:

List of stores
Recently updated items per store
Quick access to shopping history

Each store card should display:

Store name
Latest recorded items and prices

Actions:

Add Store
Start Shopping
Open Store Details
View Shopping History

3. Store Screen
   Show:
   List of stores
   Store-specific price history
   list of items
   button for item details

4. Shopping Session Screen

Think of this like:

“Current grocery cart tracker”

Features:
Running total
Remaining budget
List of added items
Edit/delete item
Mark purchased
Compare expected vs actual

This becomes VERY useful in real grocery shopping.

5. Add Item Screen (Most Important)

This is your core feature.

Fields:
Item name
Quantity
Price
Store
Category
Notes
Optional photo/barcode
UX Goal:

User should add an item in under 5 seconds.

Important:

AI should help here later:

auto-suggest item names
auto-suggest previous prices
detect duplicates
suggest cheapest store

6. History / Transactions Screen
   Features:
   Daily/weekly/monthly history
   Search
   Filter by store/category
   Total spending

7. Item Details Screen

Purpose:
Track historical prices.

Show:
Item name
Price history
Stores bought from
Cheapest recorded price
Last purchased date

This solves your earlier problem:

confusing labels and inconsistent pricing.

Later you can even:

attach shelf photos
barcode matching
OCR price recognition

basic ui flow :

Dashboard
↓
Start Shopping Session
↓
Add Items
↓
Track Running Total
↓
Save Session
↓
View History & Analytics
