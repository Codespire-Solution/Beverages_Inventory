# Beverage Inventory UI Revamp — Design Spec

**Date:** 2026-06-29
**Status:** Approved (direction locked)
**Reference:** https://drinkanothr.com/
**Chosen direction:** Mockup A — Editorial (baseline), white theme
**Mockup of record:** `mockups/dashboard-a-editorial-cream.html`
**Entry surface:** `mockups/a5-login-splash.html`

---

## 1. Decision & scope

Re-skin the existing Next.js 14 beverage-ERP with an editorial, brand-led look derived from drinkanothr.com — a **"brand skin"** that keeps ERP information density intact. Purely visual: no functional, routing, API, or data-model changes. Light theme only (no dark mode). Register: **product** (design serves the data).

In scope: every dashboard page under `src/app/(dashboard)/`, the login page, shared components in `src/components/common/`, the dashboard layout/sidebar, and the styling foundation (`tailwind.config.js`, `globals.css`).

Out of scope: business logic, API routes, Prisma schema, auth flow, adding dependencies beyond fonts/icons.

---

## 2. Design tokens

Defined once in `tailwind.config.js` (theme.extend) and `globals.css` (CSS variables). Neutrals are warm-tinted; no pure `#fff`/`#000`.

| Token | Value | Role |
|---|---|---|
| `bg` | `#FCFBF8` | app background |
| `paper` | `#FFFFFF` | cards, table surfaces |
| `wash` | `#F6F1E8` | table headers, hover, subtle fills |
| `ink` | `#17150F` | text, sidebar active, buttons, marquee |
| `ink-60` | `#6B655A` | secondary text, labels |
| `accent` | `#E08A2B` | fills: primary buttons, dividers, chart |
| `accent-ink` | `#B0640C` | accent **text/links** (AA on white) |
| `line` | `#ECE6DA` | borders, dividers |
| `mint` | `#CFE6D0` | category tag: raw material |
| `berry` | `#F4C9D4` | category tag: packaging |
| `litchi` | `#F7D9BD` | category tag / pending status |
| `warn-bg / warn-ink` | `#FBEAD3 / #9A5A12` | low-stock, expired |
| `ok-bg / ok-ink` | `#D8EBD9 / #2F6135` | in-stock, fully received |

**Accent rule:** orange as a *fill* only; for orange *text* use `accent-ink` (contrast AA). Radius scale: pills (buttons/tags) full-round; cards/inputs `16px`/`12px`. One radius system, applied consistently.

---

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| Display / headings / KPI numbers | **Playfair Display** (500) | stand-in for the brand's Etna Condensed; drop-in real Etna later |
| Body / UI / tables | **Assistant** | exact brand match (open-source) |
| Labels / buttons / badges / mono numbers | **IBM Plex Mono** | exact brand match; uppercase, `letter-spacing .12–.15em`, `tnum` |

Self-host via `next/font` (no `<link>` to Google in production). Base body 15px, line-height 1.55, body measure ≤ 75ch. Hierarchy via scale + weight (≥1.25 step ratio).

---

## 4. Components (restyle in place)

- **Sidebar** (`(dashboard)/layout.tsx`): white, serif `ANOTHR` wordmark + mono `INVENTORY OS`, Phosphor line icons (replace emoji), active item = `ink` fill with orange icon, footer user block.
- **Top bar**: pill search, warehouse label, single primary pill CTA.
- **Marquee ticker**: ink band, mono uppercase, `/` separators, one per page (dashboard + login only).
- **Buttons** (`FormInput`/new `Button`): pill; variants ink (primary), ghost, accent. `:active{scale .97}`, custom ease-out.
- **Stat strip** (replaces KPI card grid): bordered divided row, serif numbers, mono deltas. Avoids the hero-metric / identical-card cliché.
- **Feature card**: one ink panel for a highlight (e.g. Finished Goods / valuation).
- **DataTable** (`components/common/DataTable.tsx`): `paper` surface, `wash` mono uppercase headers, hairline rows, hover tint, mono tabular figures, pill status badges.
- **StatusBadge / tags**: mono pills mapped to semantic colors (ok/pending/draft) and category pastels (raw/packaging).
- **Modal, FormInput, FormSelect, EmptyState, Toast, LoadingSpinner**: retint to tokens; inputs label-above, focus ring = accent, 44px+ targets, skeleton loaders.
- **Login** (`app/login/page.tsx`): A5 split splash — dark brand panel + white form, real demo creds.

---

## 5. Motion (emil-design-eng)

- Easing tokens: `--ease` `cubic-bezier(0.22,1,0.36,1)` (out), `--ease-io` for movement; marquee linear.
- Entrance: `opacity 0 + translateY(10px)` → settle, `.45s`, stagger ~70ms. Never `scale(0)`.
- Press: `:active scale(.97–.98)`. Hover: transform/opacity/color only (no layout props).
- Charts/bars reveal via `scaleX`. `prefers-reduced-motion: reduce` disables all animation/transition.

---

## 6. Accessibility

WCAG AA contrast (accent-ink for text), visible focus-visible rings, keyboard order, labels on inputs, `aria-label`/`role` on icon-only controls and the mini chart, tabular numbers to prevent shift, no color-only meaning (status has text + color).

---

## 7. Rollout order

1. **Foundation** — fonts via `next/font`; tokens in `tailwind.config.js` (replace Material-blue `primary` palette) + `globals.css`; install Phosphor icons.
2. **Shared components** — `src/components/common/*` (DataTable, Modal, Form*, StatusBadge, EmptyState, Toast, Button, LoadingSpinner).
3. **Shell** — `(dashboard)/layout.tsx` sidebar + top bar + marquee; `login/page.tsx`.
4. **Dashboard** — `(dashboard)/dashboard/page.tsx` (stat strip, feature card, panels, table) + `api/dashboard/stats` shape reused as-is.
5. **Master-data pages** — items, SKUs, recipes, warehouses, suppliers, customers, units, users (DataTable-driven; biggest propagation from step 2).
6. **Workflow pages** — purchase-orders, production, customer-orders, inventory, forecasting (forms + detail views).
7. **Reports** — retint Recharts to brand palette; export buttons.

Each step is verifiable in the running app (`npm run dev`) before moving on.

---

## 8. Risks / notes

- `tailwind.config.js` currently defines only a Material-blue `primary` scale; replacing it is safe since classes like `bg-primary-600` will remap to the new accent (audit usages during step 1).
- Real seeded data is sparse (₹4,500 value, 3 batches, 0 POs/orders) — ensure **empty states** are designed, not blank.
- Fonts: Playfair is a placeholder for licensed Etna Condensed; structured so Etna can drop in by swapping one `next/font` declaration.
- No git repo in this workspace, so the spec is not committed; it lives at this path.
