# CaféOS — Feature Specification

This document describes every feature in CaféOS, who can access it, which plan it requires, and its core behaviour. Use this as the single source of truth when building, reviewing, or testing features.

---

## Table of Contents

- [Platform Admin Portal](#platform-admin-portal)
- [Shop Registration & Onboarding](#shop-registration--onboarding)
- [Sale Quota Engine](#sale-quota-engine)
- [POS — Point of Sale](#pos--point-of-sale)
- [Product Management](#product-management)
- [Stock Management](#stock-management)
- [Income & Expense](#income--expense)
- [Reports](#reports)
- [User Management](#user-management)
- [Billing & Packages](#billing--packages)
- [In-App Chat](#in-app-chat)
- [Auth & Permissions](#auth--permissions)
- [Notifications & Alerts](#notifications--alerts)

---

## Platform Admin Portal

**Access:** Platform owner only  
**URL:** `/admin`

### Package management
- Create a new subscription package with a custom name, sale limit (or unlimited), and list of enabled modules.
- Edit an existing package: rename, change sale limit, enable/disable modules.
- Delete a package only if no active shops are on it.
- Reorder packages for display on the public pricing/registration page.

### Shop management
- View all registered shops with their current plan, sale count (current month), and status (active / suspended).
- Drill into any shop to view their full profile, sale history, and current users.
- Manually override a shop's monthly sale quota (increase or decrease) with a reason note.
- Suspend or reactivate a shop. Suspended shops cannot log in or create sales.
- Hard-delete a shop and all its data (requires confirmation + password re-entry).

### Platform reports
- View aggregated metrics across all shops: total sales, active shops, plan distribution, monthly revenue.
- Filter by date range, plan type, or country/region.
- Export platform-level report as CSV.

---

## Shop Registration & Onboarding

**Access:** Public (unauthenticated)

### Registration flow
1. Shop fills in: business name, owner name, email, password, and country.
2. Account is created and assigned the **Free** plan automatically.
3. Owner receives a verification email and is redirected to the shop dashboard on confirmation.
4. A first-run onboarding checklist guides them through: add first product → make a test sale → invite a staff member.

### Shop profile
- Shop name, logo (image upload), address, phone, currency, and timezone.
- These settings are editable by the shop owner at any time from Settings.

---

## Sale Quota Engine

**Access:** Automatic — no user action required  
**Plans:** All plans

### Counting rules
- 1 completed order = 1 sale, regardless of the number of items in the order.
- Voided or refunded orders do not decrement the counter once counted (to prevent gaming).
- The counter resets to 0 at 00:00 on the 1st of each calendar month (shop's local timezone).

### Counter display
- A persistent counter widget is shown in the dashboard header for all roles except Kitchen.
- Format: `312 / 500 sales used · 18 days until reset`
- Colour coding: green below 70%, amber at 70–90%, red above 90%.

### Limit enforcement
- When the counter reaches the plan limit, the "Create sale" button is disabled.
- An inline upgrade prompt appears on the POS screen: `You've reached your 500-sale limit for this month. Upgrade to Business to continue.`
- All other modules remain fully functional when blocked.
- Platform owner can grant a temporary quota increase from the admin portal without changing the shop's plan.

---

## POS — Point of Sale

**Access:** Platform owner, shop owner, manager, cashier  
**Plans:** All plans (blocked when quota reached)

### Order creation
- Select products from the menu grid (searchable, filterable by category).
- Adjust quantity per line item.
- Add order notes (e.g. "oat milk", "no sugar").
- Apply a discount — percentage or fixed amount — with an optional reason (manager and above only).
- See real-time subtotal, discount, tax, and total before confirming.

### Sale completion
- Confirm sale to increment the quota counter and generate an invoice.
- Choose payment method: cash, card, QR/e-wallet, or split payment.
- For cash: enter amount tendered and see change to return.
- Print receipt or share a digital receipt link.

### Void & refund
- Manager and above can void a sale within the same business day.
- Refund (full or partial) can be applied after the day closes.
- Voided/refunded sales are marked in reports but the counter is not decremented.

### Kitchen display
- A separate full-screen kitchen view lists active orders with item names and notes.
- Kitchen staff can mark individual orders as "ready".
- New orders appear in real time (polling or WebSocket).

---

## Product Management

**Access:** Platform owner, shop owner, manager  
**Plans:** All plans

### Products
- Create a product with: name, description, price, category, image, and SKU (optional).
- Toggle a product active/inactive — inactive products are hidden from the POS grid.
- Set a product as "out of stock" manually — shown with a badge on the POS but still selectable (for pre-orders).
- Duplicate a product to create variants quickly.

### Categories
- Create and name categories (e.g. Hot Drinks, Cold Drinks, Food, Add-ons).
- Assign a colour and sort order to each category.
- Drag-and-drop reordering of categories and products within categories.

### Modifiers / add-ons
- Create modifier groups (e.g. "Milk type": Whole, Oat, Almond).
- Mark a modifier group as required or optional.
- Attach modifier groups to one or more products.
- Modifiers appear as selectable options in the POS during order creation.

---

## Stock Management

**Access:** View — all roles except Kitchen; Edit — platform owner, shop owner, manager  
**Plans:** All plans

### Inventory items
- Each product can be linked to one or more stock ingredients/items.
- Define unit of measure (g, ml, pcs, kg, etc.) and reorder threshold.
- Set a cost price per unit for margin tracking.

### Stock adjustments
- Receive new stock: add quantity and record supplier name and purchase price.
- Manual adjustment (wastage, correction) with a reason note.
- Full adjustment history log per item, with timestamp and user.

### Low-stock alerts
- When an item falls below its reorder threshold, it appears on the low-stock alert list.
- Optional email notification to the shop owner.
- Alerts are visible on the dashboard home page.

### Stock deduction
- When a sale is completed, stock quantities are automatically deducted based on the product-to-ingredient mapping.
- If a product's required ingredient is at zero, a warning is shown during order creation (non-blocking).

---

## Income & Expense

**Access:** Platform owner, shop owner, manager  
**Plans:** Business and Unlimited only (locked on Free)

### Income entries
- Sales revenue is recorded automatically from completed POS transactions.
- Manual income entries can be added (e.g. catering, event revenue) with date, amount, category, and note.

### Expense entries
- Create an expense with: date, amount, category (ingredients, rent, utilities, salaries, other), vendor name, and note.
- Attach a receipt photo or document.
- Approval workflow: manager creates, shop owner approves or rejects.

### Ledger view
- Chronological list of all income and expense entries.
- Filter by date range, type (income/expense), and category.
- Running balance shown per row.

### Summary
- Monthly income vs. expense summary with net profit/loss.
- Category breakdown for expenses.

---

## Reports

**Access:** Platform owner, shop owner, manager  
**Plans:** Basic reports — all plans; Full reports + export — Business and Unlimited only

### Basic reports (Free plan)
- Today's sales: total transactions, total revenue, top 5 products.
- No date range selection, no export.

### Full reports (Business & Unlimited)
- **Sales report:** date range selector, total sales count, total revenue, average order value, busiest hours chart, best-selling products table.
- **Product report:** sales volume and revenue per product, per category.
- **Staff report:** sales count and revenue per cashier.
- **Stock report:** current stock levels, low-stock items, stock movement history.
- **Income & expense report:** P&L summary by month, expense breakdown by category.

### Export
- Export any report as PDF (formatted, branded with shop name/logo) or CSV (raw data).
- Export is disabled on the Free plan — clicking shows an upgrade prompt.

---

## User Management

**Access:** Invite/assign roles — platform owner and shop owner only  
**Plans:** All plans (no user count cap on any plan)

### Invite staff
- Shop owner enters the staff member's email and selects a role (manager, cashier, kitchen).
- An invitation email is sent with a sign-up link pre-scoped to the shop.
- Pending invitations are listed and can be cancelled.

### Role assignment
- Role can be changed at any time by the shop owner.
- A user can only belong to one shop (unless invited to another separately).

### Deactivate staff
- Shop owner can deactivate a staff account — they cannot log in but their history is retained.
- Reactivation is possible at any time.

### Staff list
- View all staff with name, email, role, last login, and status (active/pending/inactive).

---

## Billing & Packages

**Access:** View and manage — shop owner only  
**Plans:** All plans

> **Note:** Automated payment API integration is deferred. All paid plan activations are handled manually by the platform owner via chat and KHQR payment. This section describes the full intended flow.

### Current plan view
- Shows plan name, sale limit, current month usage, and renewal date.
- Displays which modules are included and which are locked.
- Shows a clear upgrade CTA when the shop is on the Free plan or has hit their quota.

### Upgrade request flow (manual — no payment API)

The upgrade process is intentionally manual for the initial launch:

1. **Shop owner clicks "Upgrade plan"** from the billing page or the quota-blocked POS prompt.
2. **Contact options are presented** — the shop owner chooses how they want to reach the platform owner:
   - **Telegram** — opens a pre-filled Telegram message with their shop name and chosen plan (configurable Telegram username in platform settings).
   - **In-app chat** — opens a built-in chat thread directly with the platform owner (see [In-App Chat](#in-app-chat) below).
3. **Platform owner receives the request** via whichever channel was chosen, discusses pricing and confirms the plan.
4. **Payment is made via KHQR** — the platform owner shares a KHQR code (static or dynamic) for the shop owner to scan and pay using any KHQR-compatible banking app.
5. **Shop owner sends payment confirmation** (screenshot or transaction reference) through the same chat channel.
6. **Platform owner manually activates the plan** from the admin portal — selecting the shop, choosing the new plan, and setting the expiry date.
7. **Plan activates instantly** — new sale limit and unlocked modules take effect immediately. The shop owner sees a confirmation banner in their dashboard.

### In-app chat

- A lightweight chat thread between the shop owner and the platform owner.
- Accessible from the billing page and from the quota-blocked POS prompt.
- The platform owner sees all open chat threads in the admin portal under a "Messages" section, with unread badges.
- Supports text messages and image attachments (for payment screenshots).
- Chat history is persisted per shop — the platform owner can review the full conversation at any time.
- No third-party chat service required for the initial version; built using simple database-backed polling (upgradeable to WebSocket later).

### Telegram contact

- The platform owner configures their Telegram username or a group invite link in platform settings.
- When a shop clicks "Contact via Telegram", the browser opens `https://t.me/<username>?text=Hi, I'd like to upgrade [Shop Name] to the [Plan] plan.`
- No bot or API integration required — this is a plain deep link.

### KHQR payment

- KHQR is Cambodia's national QR payment standard, supported by all major Cambodian banking apps (ABA, ACLEDA, Wing, Pi Pay, etc.).
- The platform owner generates a KHQR code (from their bank app) for the correct amount and shares it via chat.
- No KHQR API integration is needed at this stage — the QR image is shared manually as an attachment in chat.
- Future phase: generate dynamic KHQR codes programmatically using the NBC (National Bank of Cambodia) KHQR SDK.

### Downgrade

- Downgrade requests are also handled via chat.
- Downgrade takes effect at the start of the next billing month to avoid mid-month disruption.
- Platform owner updates the plan in the admin portal on the renewal date.

### Invoice history
- List of all billing invoices with date, plan, amount, and status (paid / pending / unpaid).
- Platform owner manually creates an invoice record when activating a plan.
- Shop owner can download each invoice as PDF from their billing page.

---

## Auth & Permissions

### Authentication
- Email and password login with bcrypt hashing.
- JWT session tokens via NextAuth.js.
- "Remember me" option (30-day session vs. session-only).
- Password reset via email link (expires in 1 hour).
- Prisma schema uses `provider = "mysql"` with `referentialIntegrity = "prisma"` for PlanetScale compatibility.

### Permission enforcement
- Every API route checks the user's role and shop membership before processing.
- Module-level locks are enforced server-side — not just in the UI.
- Plan-level locks (Income/Expense, export, advanced reports) are checked against the shop's active plan on every request.
- Quota check on sale creation: the counter is read and incremented atomically inside a MySQL transaction (`SELECT ... FOR UPDATE`) to prevent race conditions under concurrent requests.

---

## Notifications & Alerts

### In-app alerts
- Sale quota approaching (at 90%): warning banner on dashboard and POS.
- Sale quota reached: blocking prompt on POS with upgrade CTA linking to billing page / chat.
- Low stock items: badge on the stock menu item and list on dashboard home.
- New in-app chat message: unread badge on the chat icon in the nav bar.

### Email notifications
- New staff invitation.
- Password reset link.
- Monthly sale quota summary (sent on the 1st of each month to shop owner).
- Low stock alert (optional, configured in settings).
- Platform owner: new shop registered.
- Platform owner: new in-app chat message received (if chat tab is not open).

### Admin portal alerts
- Unread message badge on the Messages section for each shop thread.
- New upgrade request from a shop (shown as a pinned message in the chat thread).
- Plan activated confirmation (auto-message sent to shop after platform owner activates).

---

*Last updated: March 2026. This document should be updated whenever a feature is added, changed, or removed.*
