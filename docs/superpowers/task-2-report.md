# Task 2 Report: Shared Component Restyle

## Files Changed

### New files
1. `src/components/common/icons.ts` -- NAV_ICONS map from phosphor-icons
2. `src/components/common/Button.tsx` -- new shared Button with primary/ghost/accent variants

### Restyled files (props unchanged)
3. `src/components/common/StatusBadge.tsx` -- brand token colors; pill shape retained
4. `src/components/common/DataTable.tsx` -- paper/wash/line styling; phosphor sort icons; skeleton loading
5. `src/components/common/FormInput.tsx` -- label class above, wash/line/accent control, warn-ink errors
6. `src/components/common/FormSelect.tsx` -- same as FormInput; appearance-none for custom look
7. `src/components/common/Modal.tsx` -- paper panel, rounded-2xl, ink/40 scrim, X phosphor icon
8. `src/components/common/EmptyState.tsx` -- serif heading, Tray phosphor icon, Button for action
9. `src/components/common/LoadingSpinner.tsx` -- skeleton pulse blocks replacing spinner
10. `src/components/common/Toast.tsx` -- bg-ink text-white; phosphor type icons; animate-slide-in kept
11. `src/components/common/ConfirmDialog.tsx` -- paper panel; Button variants; warn styling for danger/warning

## Public API Verification (all props preserved)

| Component | Exported props | Changed? |
|-----------|---------------|----------|
| DataTable | data, columns, onRowClick, loading, emptyMessage | No |
| Modal | isOpen, onClose, title, children, size | No |
| FormInput | label, name, type, value, onChange, error, required, placeholder, disabled, helperText, step, min, max | No |
| FormSelect | label, name, value, onChange, options, error, required, disabled, placeholder | No |
| StatusBadge | status, size | No |
| EmptyState | title, description, action | No |
| Toast | message, type, duration, onClose | No |
| ToastContainer | toasts, onRemove | No |
| LoadingSpinner | size, text | No |
| ConfirmDialog | isOpen, onClose, onConfirm, title, message, confirmText, cancelText, variant, isDestructive | No |
| Button (new) | All HTMLButtonAttributes + variant | New component, no existing consumers |
| NAV_ICONS (new) | -- export const map | New export, no existing consumers |

## Build Result

Command: `npx next build`
Result: PASS -- `Compiled successfully`, types valid, 31 static pages generated without errors.

## Concerns

1. **StatusBadge `size` prop**: The original component used `size` to vary font/padding. The restyled version uses a fixed token-based size (`font-mono text-[10px]`), making the `size` prop inert. The prop is still accepted (no API break) but has no visual effect. Consumers that relied on `sm`/`lg` size variants will see no difference. If size variation is needed, a follow-up can add size-conditional classes.

2. **FormSelect native appearance**: `appearance-none` was added to remove the native select arrow for consistent styling. No chevron icon replacement was added in this pass. A follow-up could wrap the select with a positioned CaretDown icon.

3. **DataTable last row border**: `last:border-0` is applied to both `<tr>` and `<td>`, which should suppress the bottom border on the final row. Because the wrapper already has `overflow-hidden` on `rounded-2xl`, this is mostly cosmetic but correct.

4. **Browserslist warnings**: Same stale caniuse-lite / baseline-browser-mapping warnings from Task 1 (cosmetic only, not errors).

## Fix wave 1

### Fix 1 — `src/components/common/FormSelect.tsx`
- Added CaretDown import from @phosphor-icons/react
- Wrapped select element in `<div className="relative">` container
- Added `pr-10` to select's className (preserving all existing classes)
- Added positioned CaretDown icon with `pointer-events-none` after select element

### Fix 2 — `src/components/common/Button.tsx`
- Changed accent variant text color from `text-ink` to `text-accent-ink`

### Build Result
Command: `npx next build`
Result: PASS -- `Compiled successfully`, no type errors, 31 static pages generated.
