# Task 6b Report — Master-Data Pages Re-skin

## Files Changed (7)

**Pages:**
- `src/app/(dashboard)/warehouses/page.tsx`
- `src/app/(dashboard)/suppliers/page.tsx`
- `src/app/(dashboard)/customers/page.tsx`
- `src/app/(dashboard)/users/page.tsx`

**Components:**
- `src/components/warehouses/WarehousesList.tsx`
- `src/components/suppliers/SuppliersList.tsx`
- `src/components/customers/CustomersList.tsx`

## Changes Applied

### A. Page-header pattern
All four pages updated:
- `<h2 className="text-3xl font-bold text-gray-800">` → `<h1 className="font-serif font-medium text-4xl">`
- Accent underline `<div className="h-[3px] w-16 bg-accent mt-3" />` added
- Subtitle changed to `text-ink-60`
- Primary action `<button>` replaced with `<Button variant="primary">` + `<Plus size={14} />` icon
- Cancel/ghost buttons replaced with `<Button variant="ghost">`

### B. Class-mapping codemod
- `bg-white` → `bg-paper`
- `text-gray-800` / `text-gray-900` / `text-gray-700` → `text-ink`
- `text-gray-600` → `text-ink-60`
- `border-gray-300` → `border-line`
- `rounded-lg` (cards) → `rounded-2xl`; `rounded-md` / `rounded-lg` (inputs) → `rounded-xl`
- Emoji action icons → `@phosphor-icons/react` (`Pencil`, `Trash`, `Package`, `Key`)
- Hand-rolled yellow/green status buttons → `bg-warn-bg text-warn-ink` / `bg-ok-bg text-ok-ink`
- Edit button: `bg-blue-100 text-blue-700` → `bg-wash text-accent-ink`
- Delete button: `bg-red-100 text-red-700` → `bg-warn-bg text-warn-ink`

## Logic Preservation
- No data fetching, hooks, API calls, or route slugs changed
- All prop names and component interfaces unchanged
- Users page admin-role logic fully preserved: `handleToggleStatus` deactivate-confirm flow, `activateUser` direct call, `handleConfirmDeactivate`, `handleFormSubmit` admin/user role branching, FormSelect role options (`user`/`admin`), password reset flow — all intact

## Build Result
`npx next build` — compiled successfully, no type errors, 31/31 static pages generated.

## Concerns
None. All seven files compile cleanly and match the 6a pattern exactly.

---

## Fix wave 1: Token cleanup

**Replacements made (13 files):**
- `text-primary-600` → `accent-accent` (2 replacements per file on checkboxes)
- `focus:ring-primary-500` → `focus:ring-accent` (2 replacements per file on checkboxes and search inputs)

**Files updated:**
1. src/app/(dashboard)/warehouses/page.tsx
2. src/app/(dashboard)/suppliers/page.tsx
3. src/app/(dashboard)/customers/page.tsx
4. src/app/(dashboard)/skus/page.tsx
5. src/app/(dashboard)/recipes/page.tsx
6. src/app/(dashboard)/users/page.tsx
7. src/components/items/ItemForm.tsx
8. src/components/items/BulkUpload.tsx
9. src/components/items/ItemsList.tsx
10. src/components/skus/SKUsList.tsx
11. src/components/warehouses/WarehousesList.tsx
12. src/components/suppliers/SuppliersList.tsx
13. src/components/customers/CustomersList.tsx

**Build result:** `npx next build` compiled successfully, no type errors (exit code 0).
