# Stage 2 — Test Results

This folder holds the Stage 2 test cases and their results.

- **Detailed steps:** [`stage2-test-cases.md`](./stage2-test-cases.md)
- **This file:** summary results table + the bug-fix log.

## How to read the Status

| Status | Meaning |
|--------|---------|
| ✅ PASS | Verified this session — by TypeScript type-check, security/code review (2 independent agents), or direct code logic. No running-UI needed. |
| 🟦 READY | Code is complete and reviewed, but needs a human to click through the running app to confirm visually. **Not yet executed live.** |
| ❌ FAIL | Broken. (None.) |

> I have **not** clicked through the live UI, so visual/runtime tests are marked 🟦 READY,
> not falsely marked PASS. Say the word and I'll run the app and execute them live.

## Summary

```
 Total test cases : 42
 ✅ PASS          : 18   (static / type-check / security & code review)
 🟦 READY         : 24   (implemented + reviewed; awaiting your live click-through)
 ❌ FAIL          :  0
 Bugs found & fixed during verification : 8
```

## Results table

| ID | Scenario | Status | How verified / note |
|----|----------|--------|---------------------|
| TC-DB-01 | Delivered sale counts in Sales | 🟦 READY | Status logic fixed & code-verified; needs live data |
| TC-DB-02 | Fully-received PO counts | 🟦 READY | Logic fixed; needs live data |
| TC-DB-03 | Top SKUs includes delivered | 🟦 READY | Logic fixed; needs live data |
| TC-DB-04 | Delivered not overdue | 🟦 READY | Logic fixed; needs live data |
| TC-DB-05 | Confirmed past-due is overdue | 🟦 READY | Logic fixed; needs live data |
| TC-DB-06 | No invalid status strings | ✅ PASS | Code inspected; verifier confirmed all 5 metrics |
| TC-IT-01 | Item row opens detail | 🟦 READY | Page created + row-click fixed; live run pending |
| TC-IT-02 | Item stock table | 🟦 READY | Uses useItemStock; live run pending |
| TC-IT-03 | Item edit from detail | 🟦 READY | ItemForm modal wired; live run pending |
| TC-IT-04 | Item not found | 🟦 READY | Not-found branch present; live run pending |
| TC-SK-01 | SKU detail + recipe | 🟦 READY | Page created; live run pending |
| TC-SK-02 | SKU without recipe | 🟦 READY | Empty-state present; live run pending |
| TC-SK-03 | SKU back/edit nav | 🟦 READY | Per-design (Edit→list); live run pending |
| TC-RC-01 | Recipe detail | 🟦 READY | Page + useRecipe hook created; live run pending |
| TC-RC-02 | Recipe not found | 🟦 READY | Not-found branch present; live run pending |
| TC-EO-01 | New order save pending | 🟦 READY | Refactor preserved flow; live run pending |
| TC-EO-02 | New order create & confirm | ✅ PASS | Double-confirm removed (code) |
| TC-EO-03 | Edit pending order qty | 🟦 READY | Edit page + PUT recalcs totals; live run pending |
| TC-EO-04 | Edit item not falsely blocked | ✅ PASS | HIGH-1 stock-guard fix in code |
| TC-EO-05 | Warning on non-pending edit | 🟦 READY | Banner coded; live run pending |
| TC-EO-06 | Change customer persists | ✅ PASS | HIGH-3 — customerId added to PUT |
| TC-EO-07 | Cancel keeps delivery date | ✅ PASS | HIGH-2 — undefined sentinel in PUT |
| TC-EO-08 | Status backdoor closed | ✅ PASS | CRITICAL-2 — status whitelist added |
| TC-EO-09 | Cancel still works | ✅ PASS | `cancelled` whitelisted in PUT |
| TC-EO-10 | Edit button always visible | ✅ PASS | `canEdit = true` (code) |
| TC-US-01 | Nav visibility by role | 🟦 READY | Admin-only nav coded; live run pending |
| TC-US-02 | Create user | 🟦 READY | Endpoint+UI coded; live run pending |
| TC-US-03 | Duplicate email | ✅ PASS | P2002 → 400 handling (code) |
| TC-US-04 | Weak password | ✅ PASS | validatePassword (min 6) wired |
| TC-US-05 | Edit user | 🟦 READY | PUT partial update coded; live run pending |
| TC-US-06 | Reset password | 🟦 READY | PUT password+hash coded; live run pending |
| TC-US-07 | Deactivate user | 🟦 READY | Soft-delete coded; live login-block pending |
| TC-US-08 | Cannot self-deactivate | ✅ PASS | Guard present (code) |
| TC-US-09 | Cannot self-demote | ✅ PASS | LOW-1 guard added |
| TC-US-10 | Non-admin blocked (API) | ✅ PASS | Admin check on all 4 methods (verifier) |
| TC-US-11 | Unauthenticated blocked | ✅ PASS | 401 on missing token (code) |
| TC-US-12 | No password-hash leak | ✅ PASS | `userSelect` excludes hash (verifier) |
| TC-SE-01 | Secret set → no warning | 🟦 READY | Live run pending |
| TC-SE-02 | Secret missing → warns | ✅ PASS | console.warn added, non-blocking |
| TC-SE-03 | .env.example exists | ✅ PASS | File created with both vars |
| TC-XX-01 | No new type errors | ✅ PASS | `npx tsc --noEmit` filtered to changed files |
| TC-XX-02 | Corrupt session no crash | ✅ PASS | try/catch + redirect added |

## Bugs found during verification & fixed (8)

| # | Severity | Issue | Fix | File |
|---|----------|-------|-----|------|
| 1 | HIGH | Editing a pre-filled order item falsely blocked with "Insufficient stock: 0" | Only enforce stock check when stock is actually known | `components/customer-orders/CustomerOrderForm.tsx` |
| 2 | HIGH | Changing the customer on an edited order was silently dropped | Added `customerId` to PUT update | `api/customer-orders/[id]/route.ts` |
| 3 | HIGH | Cancelling an order wiped its expected delivery date | Undefined-sentinel so the field is left unchanged | `api/customer-orders/[id]/route.ts` |
| 4 | CRITICAL | Any authenticated user could PUT `status:'delivered'` to bypass workflow | Whitelist: only `pending`/`cancelled` allowed via general PUT | `api/customer-orders/[id]/route.ts` |
| 5 | HIGH | "Create & Confirm" created as confirmed then confirmed again (redundant) | Create as `pending`, then confirm once | `customer-orders/new/page.tsx` |
| 6 | HIGH | Order History tab used dead statuses (`fulfilled`) — never rendered | Aligned to `delivered` | `customer-orders/[id]/page.tsx` |
| 7 | MEDIUM | Corrupt `localStorage` user crashed the whole dashboard | Wrapped `JSON.parse` in try/catch → redirect to login | `(dashboard)/layout.tsx` |
| 8 | LOW | Admin could remove their own admin role and lock themselves out | Guard blocks self-demotion | `api/users/[id]/route.ts` |

Plus the originally-planned dashboard fix (overdue-deliveries also used an invalid status — corrected to `confirmed`).

## To execute the 🟦 READY tests live

1. Ensure `npm run dev` is running and you're logged in.
2. Walk the steps in `stage2-test-cases.md` for each 🟦 row.
3. Mark each ✅ / ❌ in the Status column.

(Optional) For the API/SEC rows, you can also test from the browser devtools console, e.g.
`fetch('/api/users', { headers: { Authorization: 'Bearer ' + localStorage.token } })`.
