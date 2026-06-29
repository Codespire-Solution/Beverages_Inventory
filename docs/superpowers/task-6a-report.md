# Task 6a Report: Items / SKUs / Recipes Re-skin

## Status
Complete.

## Files Changed

### Pages
- `src/app/(dashboard)/items/page.tsx` — h1 serif header + accent rule, Button components replacing raw buttons, Upload/Plus icons replacing emojis
- `src/app/(dashboard)/items/[id]/page.tsx` — h1 serif header, bg-paper/rounded-2xl cards, ink-60 labels, bg-wash table heads, Button with Pencil/ArrowLeft icons
- `src/app/(dashboard)/skus/page.tsx` — h1 serif header, bg-paper/rounded-2xl card, Button for primary action and modal footers, border-line checkboxes
- `src/app/(dashboard)/skus/[id]/page.tsx` — h1 serif header, bg-paper/rounded-2xl cards, ink-60 labels, bg-wash table head, Button with Pencil/ArrowLeft
- `src/app/(dashboard)/recipes/page.tsx` — h1 serif header, bg-paper/rounded-2xl card, border-line inputs/selects, warn-bg error box, Button for all modal footers/action buttons, Pencil/Trash icons replacing emojis, ingredient table bg-wash
- `src/app/(dashboard)/recipes/[id]/page.tsx` — h1 serif header, bg-paper/rounded-2xl cards, ink-60 labels, bg-wash table head, Button with Pencil/ArrowLeft

### Components
- `src/components/items/ItemsList.tsx` — border-line/rounded-xl filters, Pencil/Trash icons replacing emojis, warn-bg/ok-bg toggle buttons, text-warn-ink low-stock highlight
- `src/components/items/ItemForm.tsx` — border-line checkbox, Button for Cancel/Submit
- `src/components/items/BulkUpload.tsx` — bg-wash instructions panel, border-line file input, ok-bg/warn-bg result panels, Button for all actions, Download icon replacing emoji, removed emojis from copy
- `src/components/skus/SKUsList.tsx` — border-line/rounded-xl filters, Pencil/Trash icons replacing emojis, warn-bg/ok-bg toggle buttons

## No Logic/Data Changes
No data fetching, hooks, API calls, route slugs, or form field `name` attributes were modified. All changes are purely visual class and markup updates.

## Build Result
`npx next build` — compiled successfully, 0 type errors, 31 static pages generated.

## Concerns
None. All 10 files updated cleanly. No files left unchanged (all had legacy gray/blue classes or emoji icons to address).
