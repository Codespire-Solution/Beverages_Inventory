# E2E Test Results (Playwright)

Automated end-to-end tests. Harness resets + reseeds the dev DB, logs in as admin, then runs.

**How to run:**
1. Start the app on 3002: `npm run dev -- -p 3002`
2. In another terminal: `npm run test:e2e` (HTML report: `npx playwright show-report`)

> ⚠️ Each run **wipes and reseeds** the dev database (by design).

---

## Phase 1 — Foundation ✅ COMPLETE (ran 2026-06-26)

| Item | Status | Notes |
|------|--------|-------|
| Playwright installed (+ Chromium) | ✅ | v1.61.1 |
| `prisma/seed-test.ts` rich seed | ✅ | 2 users, 5 units, 2 warehouses, 2 suppliers, 2 customers, 5 items, 1 SKU+recipe, 8 batches |
| `playwright.config.ts` | ✅ | baseURL 3002, workers:1, global-setup wired |
| `tests/global-setup.ts` (reset+seed+auth) | ✅ | `db push --force-reset --skip-generate` avoids Windows EPERM |
| Smoke: admin lands on dashboard | ✅ PASS | 11.0s |
| Smoke: items page shows seeded item (no 404) | ✅ PASS | 3.2s — also confirms the port-3002 api-client fix |

**Result: 2/2 passed (51.9s).** Harness proven; ready for Phase 2.

---

## Phase 2 — Core money-path ✅ COMPLETE (ran 2026-06-26)

**Result: 11/11 passed (24.2s)** — 9 Phase-2 + 2 smoke.

| Test | Status | Checks |
|------|--------|--------|
| Purchasing: PO → confirm → full receipt | ✅ | raw stock +500; PO becomes `fully_received` |
| Purchasing: empty PO rejected | ✅ | 400 on no items |
| Production: preview + FIFO + yield | ✅ | FIFO picks soonest-expiry lot (OC-A); yield 100% |
| Sales: tax totals | ✅ | 10×40 @5% → total 400, tax 20, grand 420 |
| Sales: multi-item totals | ✅ | 3×40 + 2×50 → 220 |
| Sales: FIFO delivery + decrement | ✅ | empties soonest-expiry lot first, decrements next |
| Sales: insufficient stock blocks delivery | ✅ | preview `allSufficient=false`; POST rejected |
| Sales: partial delivery | ✅ | order stays `confirmed`, fulfilledQuantity recorded |
| UI: create order via New Order screen | ✅ | shared CustomerOrderForm end-to-end |

### Bug found & FIXED during Phase 2
| Severity | Issue | Fix | File |
|----------|-------|-----|------|
| HIGH | Receiving goods never advanced PO status (stayed `confirmed`) — completion was checked against the pre-increment in-memory items, so `received >= ordered` was always false | Re-fetch PO items after the increments, then evaluate completion | `src/app/api/goods-receipts/route.ts` |

### Quirk flagged (not fixed — pre-existing)
- `preview-material-issue` computes `requiredQuantity = recipeQty × target ÷ 1000` (a hardcoded
  `/1000` conversion). With recipe 20ml × target 5 it reports `0.1`, not `100`. Looks like an
  incorrect unit conversion; left as-is and asserted as the app's actual behavior. Worth reviewing in Stage 3.

## Phase 3 — All remaining modules ✅ COMPLETE (ran 2026-06-26)

**Whole suite: 40/40 passed (1.1m)** — Phase 1 + 2 + 3 together.

| Area | Tests | Status |
|------|-------|--------|
| Master data (warehouse/supplier/customer/item/sku/recipe/unit): create + duplicate + missing-field | 7 | ✅ |
| Inventory: adjustment decrement, transfer move, over-transfer block, same-warehouse block, low-stock alert, expiring alert | 5 | ✅ |
| Users & roles: create/dup/weak-pw, no hash leak, reset→login, deactivate→login blocked, self-deactivate/demote 400, non-admin 403, anon 401, units-admin-only 403 | 8 | ✅ |
| Forecasting & reports: generate (+requires skuId), accuracy, 6 report endpoints return 200 | 4 | ✅ |
| Stage-2 UI: Users list, Item/SKU/Recipe detail pages render, Edit-order warning banner | 5 | ✅ |

### Bug found & FIXED during Phase 3
| Severity | Issue | Fix | File |
|----------|-------|-----|------|
| HIGH | Creating a SKU always failed (HTTP 500) — the route wrote a `sellingPrice` column that does not exist on the `Sku` model, so Prisma threw on every create | Removed the ghost `sellingPrice` field from the create payload | `src/app/api/skus/route.ts` |

---

## Overall

```
 Phase 1  Foundation     2 tests   ✅
 Phase 2  Money-path      9 tests   ✅   (+ found/fixed PO-status bug)
 Phase 3  All modules    29 tests   ✅   (+ found/fixed SKU-create 500 bug)
 ───────────────────────────────────────
 TOTAL                   40 tests   ✅  all green
 Real bugs caught by the suite & fixed: 2  (plus the /1000 quirk, fixed in Stage 3)
```

Run anytime with: `npm run dev -- -p 3002` then `npm run test:e2e`.

---

## Stage 3 — Hardening ✅ COMPLETE (2026-06-26)
- `npm run build` now **passes** (was blocked by 11 pre-existing TypeScript errors → 0).
  Fixed via: SKU/Customer type fields, `ConfirmDialog isDestructive` prop, `formatDate`
  optional format.
- **JWT security:** production now refuses to start without `JWT_SECRET` (dev keeps a fallback).
- **/1000 production quirk FIXED** across all 6 sites (preview, material-issue,
  material-availability, purchase-forecasts, 2 UI pages); production test updated to expect
  the correct `requiredQuantity` (100, not 0.1).
- Re-verified: `npm run build` ✅ 0 errors · `npm run test:e2e` ✅ 40/40 green.
