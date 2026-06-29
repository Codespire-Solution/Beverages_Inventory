# Stage 2 — Detailed Test Cases

Covers all 5 features + the 8 bug fixes made during verification.

**Login for testing:** `admin@beverage.com` / `admin123` (admin).
To test non-admin behaviour, create a second user with role = `user` (see TC-US-02).

Legend for the **Type** column: `UI` = click through the screen · `API` = call the
endpoint directly (e.g. browser devtools / curl) · `SEC` = security check ·
`STATIC` = verifiable from the code/build.

---

## Fix 1 — Dashboard totals bug

| ID | Scenario | Steps | Expected result | Type |
|----|----------|-------|-----------------|------|
| TC-DB-01 | Delivered sale counts in "Sales this month" | Create an order, confirm it, deliver it fully (status=delivered). Open Dashboard. | Its grand total is included in "Sales this month" and cash-flow Sales. | UI |
| TC-DB-02 | Fully-received PO counts in purchases | Create a PO, confirm, receive all goods (status=fully_received). Open Dashboard. | Its total appears in cash-flow Purchases. | UI |
| TC-DB-03 | Top SKUs includes delivered orders | Deliver an order for SKU X. Open Dashboard. | SKU X appears in Top SKUs. | UI |
| TC-DB-04 | Delivered order is NOT overdue | Deliver an order whose expected date is in the past. Open Dashboard. | It is NOT counted in "overdue deliveries". | UI |
| TC-DB-05 | Confirmed past-due order IS overdue | Confirm (not deliver) an order with a past expected date. | It IS counted in "overdue deliveries". | UI |
| TC-DB-06 | No invalid status strings remain | Inspect `api/dashboard/stats/route.ts`. | Only `confirmed`/`delivered` (orders) and `confirmed`/`partially_received`/`fully_received` (POs); no `fulfilled`/`partially_fulfilled`/`received`. | STATIC |

## Fix 2 — Detail pages (kill 404s)

| ID | Scenario | Steps | Expected result | Type |
|----|----------|-------|-----------------|------|
| TC-IT-01 | Item row opens detail | Items list → click a row. | Navigates to `/items/{id}`; item details render (no 404). | UI |
| TC-IT-02 | Item stock shown | Open an item that has stock. | "Current stock" table lists warehouse, batch, qty, expiry. | UI |
| TC-IT-03 | Item edit from detail | On item detail click Edit → change a field → Save. | Modal saves; detail refreshes with new value. | UI |
| TC-IT-04 | Item not found | Visit `/items/999999`. | Shows a "not found" message, no crash. | UI |
| TC-SK-01 | SKU detail + recipe | SKUs list → click a SKU that has a recipe. | `/skus/{id}` shows SKU info + ingredient table. | UI |
| TC-SK-02 | SKU without recipe | Open a SKU with no recipe. | Shows empty-recipe message, no crash. | UI |
| TC-SK-03 | SKU back/edit nav | Click Back and Edit on SKU detail. | Back → `/skus`; Edit → `/skus` (list, per design). | UI |
| TC-RC-01 | Recipe detail | Recipes list → click a recipe. | `/recipes/{id}` shows header + ingredient table. | UI |
| TC-RC-02 | Recipe not found | Visit `/recipes/999999`. | "Not found" message, no crash. | UI |

## Fix 3 — Edit Customer Order (+ shared form)

| ID | Scenario | Steps | Expected result | Type |
|----|----------|-------|-----------------|------|
| TC-EO-01 | New order – save pending (no regression) | New Order → fill form → "Save as Pending". | Order created as `pending`; redirected to detail. | UI |
| TC-EO-02 | New order – create & confirm | New Order → fill → "Create & Confirm". | Order created and ends as `confirmed` (confirmed exactly once). | UI |
| TC-EO-03 | Edit pending order qty | Open pending order → Edit → change a qty → Save. | Saved; detail totals recalculated correctly. | UI |
| TC-EO-04 | Edit existing line item not falsely blocked | In edit, click ✏️ on a pre-filled item, change qty, Update. | Item updates; NO false "Insufficient stock: 0" error. (HIGH-1) | UI |
| TC-EO-05 | Warning on non-pending edit | Open a confirmed/delivered order → Edit. | Yellow warning banner shown above the form. | UI |
| TC-EO-06 | Change customer persists | In edit, change the Customer dropdown → Save → reopen. | New customer is saved (not silently dropped). (HIGH-3) | UI |
| TC-EO-07 | Cancel keeps delivery date | Open an order with an expected delivery date → Cancel it → reopen. | Expected delivery date is still present (not wiped). (HIGH-2) | API/UI |
| TC-EO-08 | Status backdoor closed | `PUT /api/customer-orders/{id}` with body `{status:'delivered'}`. | 400 "Invalid status change…". (CRITICAL-2) | SEC |
| TC-EO-09 | Cancel still works | `PUT /api/customer-orders/{id}` with `{status:'cancelled'}`. | Succeeds (cancel path preserved). | API |
| TC-EO-10 | Edit button always visible | Open orders of each status. | Edit button shows for pending, confirmed, and delivered. | UI |

## Fix 4 — Manage Users (admin only)

| ID | Scenario | Steps | Expected result | Type |
|----|----------|-------|-----------------|------|
| TC-US-01 | Nav visibility by role | Log in as admin, then as a `user`. | "Users" menu shows for admin only. | UI |
| TC-US-02 | Create user | Users → Add User → name/email/password/role=user → Save. | User appears in the list. | UI |
| TC-US-03 | Duplicate email | Add a user with an existing email. | 400 "Email already exists"; not created. | UI |
| TC-US-04 | Weak password | Add a user with a 3-char password. | Validation error (min 6); not created. | UI |
| TC-US-05 | Edit user | Edit a user's name/role → Save. | Changes persist; password unchanged if blank. | UI |
| TC-US-06 | Reset password | Reset a user's password → log in as that user with the new password. | Login succeeds with new password. | UI |
| TC-US-07 | Deactivate user | Deactivate a user → try to log in as them. | Login blocked / account inactive. | UI |
| TC-US-08 | Cannot self-deactivate | As admin, try to deactivate your own account. | 400 "You cannot deactivate your own account." | UI/SEC |
| TC-US-09 | Cannot self-demote | As admin, try to change your own role to `user`. | 400 "You cannot remove your own admin role." (LOW-1) | UI/SEC |
| TC-US-10 | Non-admin blocked (API) | As a `user`, call `GET/POST/PUT/DELETE /api/users…`. | 403 Forbidden on every method. | SEC |
| TC-US-11 | Unauthenticated blocked | Call `/api/users` with no token. | 401 Unauthorized. | SEC |
| TC-US-12 | No password hash leak | Inspect any `/api/users` response. | `passwordHash` never present. | SEC |

## Fix 5 — Security (JWT secret)

| ID | Scenario | Steps | Expected result | Type |
|----|----------|-------|-----------------|------|
| TC-SE-01 | Secret set → no warning | Start app with `JWT_SECRET` set. | No insecure-default warning; login works. | UI |
| TC-SE-02 | Secret missing → warns, not blocks | Start app with `JWT_SECRET` unset. | Console warns; app still starts (per chosen design). | STATIC |
| TC-SE-03 | Env template exists | Open `.env.example`. | Documents `DATABASE_URL` and `JWT_SECRET`. | STATIC |

## Cross-cutting / robustness

| ID | Scenario | Steps | Expected result | Type |
|----|----------|-------|-----------------|------|
| TC-XX-01 | No new type errors | Run `npx tsc --noEmit` and filter to changed files. | No new errors attributable to Stage 2 code. | STATIC |
| TC-XX-02 | Corrupt session no crash | Set `localStorage.user` to invalid JSON, reload a dashboard page. | Redirects to `/login` instead of crashing. (MED-2) | UI |

---

## Known pre-existing issues (NOT Stage 2 — flagged for Stage 3)

These exist in code we did not change; listed so they aren't mistaken for regressions:
- `npm run build` fails type-check due to pre-existing errors (`ConfirmDialog isDestructive`
  prop in customer-orders/forecasting/production/purchase-orders detail pages; `SKU` type
  missing fields; `Customer.taxRate`; `api/skus` `sellingPrice`). Runs fine in `npm run dev`.
- Hardcoded JWT fallback `'your-secret-key'` remains by explicit product decision (no startup block).
- `sku.sellingPrice` / `customer.creditLimit` referenced in the order form but absent from the
  schema (dead inputs) — pre-existed in the original New Order form.
- Dashboard `stats` uses some N+1 query loops (performance, not correctness).
