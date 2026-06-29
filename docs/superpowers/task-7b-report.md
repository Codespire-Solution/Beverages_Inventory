# Task 7b Report — Production Pages Re-skin

## Status
COMPLETE

## Files Changed
- `src/app/(dashboard)/production/page.tsx`
- `src/app/(dashboard)/production/new/page.tsx`
- `src/app/(dashboard)/production/[id]/page.tsx`
- `src/app/(dashboard)/production/[id]/issue-materials/page.tsx`
- `src/app/(dashboard)/production/[id]/receive-finished/page.tsx`

## Build Result
`npx next build` — compiled successfully, 0 type errors, 31/31 static pages generated.

## Changes Applied
- **Change A (page-header):** All 5 pages updated: `<h2>` replaced with `<h1 className="font-serif font-medium text-4xl">` + accent underbar `<div className="h-[3px] w-16 bg-accent mt-3" />`. Primary action buttons replaced with `<Button variant="primary">`, back/cancel buttons with `<Button variant="ghost">`.
- **Change B (class-mapping):** `bg-white` → `bg-paper`; `bg-gray-50/100/blue-50` → `bg-wash`; `text-gray-900/800/700` → `text-ink`; `text-gray-600/500/400` → `text-ink-60`; `border-gray-200/300` → `border-line`; `rounded-lg` cards → `rounded-2xl`; `rounded-md` inputs left to FormInput component (internal); `text-primary-600/blue-600` links → `text-accent-ink`; `focus:ring-primary-500/blue-500` → `focus:ring-accent`; hand-rolled red/green status inline divs → `bg-ok-bg text-ok-ink` / `bg-warn-bg text-warn-ink`; `bg-blue-50 border-blue-200` info panels → `bg-wash border-line`. Phosphor icons imported: `Plus`, `Flask`, `Package`, `Check`, `ArrowLeft`.
- Emoji status indicators (`✓`, `⚠`) removed from inline copy.
- Em-dash in "Material Calculation & FIFO Preview" heading replaced with "and".
- Title dash separator in issue-materials and receive-finished pages changed from ` – ` to `. ` (period).

## Concerns
- `rounded-md` inside `FormInput`/`FormSelect` shared components was not touched per scope (only these 5 files). If inputs still appear with small radius, a follow-up to the shared components would be needed.
- Yellow-band metrics (`text-yellow-600`, `bg-yellow-50`) kept as-is since no brand token was specified for the mid-warning tier.
