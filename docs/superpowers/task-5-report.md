# Task 5 Report: Dashboard Page Body Rebuild (Mockup A)

## API Fields Bound to Each Block

| Block | API Fields Used |
|-------|----------------|
| Page header | `new Date()` for date/greeting (no API field needed) |
| Stat cell 1 - Inventory Value | `stats.inventoryValue`, `stats.slowMovingCount` |
| Stat cell 2 - Sales This Month | `stats.salesThisMonth`, `stats.cashFlow.net` |
| Stat cell 3 - Finished Goods | `stats.additionalMetrics.finishedGoodsCount` |
| Stat cell 4 - Attention Needed | `stats.lowStockCount + stats.additionalMetrics.expiringItems` |
| Feature card (left) | `stats.cashFlow.net`, `stats.cashFlow.sales`, `stats.cashFlow.purchases`, `stats.additionalMetrics.pendingOrders` |
| List panel (right) | `stats.topSKUs[]` (skuId, sku, skuCode, quantity) |
| Recent Activity table | `stats.recentActivity[]` (reference, type, description, date, status) |
| Alerts strip | `stats.alerts[]` (type, message, link) |

## Blocks Included / Omitted

- **Page header** (date + serif h1 + orange rule): included
- **Stat strip (4 cells)**: included - bound to inventoryValue, salesThisMonth, finishedGoodsCount, lowStockCount+expiringItems
- **Feature card (dark ink)**: included - highlights cashFlow.net as headline metric with accent Button
- **List panel**: included - shows topSKUs; renders EmptyState when topSKUs is empty
- **Value-by-category bar**: OMITTED - the API does not return any category breakdown of inventory value; fabricating splits was prohibited
- **Recent activity table**: included - bound to recentActivity[]; renders EmptyState when list is empty; uses StatusBadge for status column

## EmptyState Usage

- Top SKUs panel: shown when `stats.topSKUs.length === 0`
- Recent Activity section: shown when `stats.recentActivity` is empty or undefined

## Date Filter Controls

Preserved the existing date filter inputs and Refresh button (functional parity), restyled to brand tokens.

## Build Result

`npx next build` - compiled successfully, no type errors, 31 static pages generated. Dashboard route: 12 kB / 99.5 kB first load JS.

## Concerns

- The `recharts` dependency (LineChart/BarChart) from the original page is no longer imported in the new page; the bundle is slightly smaller. If charts are re-added later, recharts is still installed.
- `animate-rise` is applied via Tailwind class (`animate-rise`) with inline `animationDelay` style; this requires the keyframe to be defined in global CSS or Tailwind config (assumed set up in Task 1 brand tokens).
- No server-side category breakdown exists for a stacked bar; the block was correctly omitted per spec.

## Fix wave 1

### Fix 1: Activity "Type" badge consistency
Extracted `ActivityTypeTag` component at top of file (after imports) with tone mapping for type variants (purchase→litchi, production→mint, sale→berry, adjustment→wash, transfer→wash). Replaced inline badge JSX in activity table's Type cell with component call `<ActivityTypeTag type={activity.type} />`. Table logic unchanged.

### Fix 2: Button styling for Clear/Refresh
Converted raw `<button>` elements (lines 153–167) to `<Button variant="ghost">` for Clear and Refresh controls. Preserved `onClick` handlers and text exactly; no behavioral changes.

### Fix 3: Suppress empty record count
Added conditional render `{recentActivity.length > 0 && <span...>}` around the "{n} records" label in Recent Activity header (line 382). Count only displays when there are records.

### Build result
`npx next build` compiled successfully; no type errors; 31 static pages generated; dashboard route: 12 kB / 99.6 kB.
