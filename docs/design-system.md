# Meridian — Brand & Design System

**Product:** Project management and team collaboration with real-time workflows, analytics, chat, and integrations.  
**Stack (UI):** React · Vite · TanStack Router · Tailwind CSS · shadcn-style tokens · persona-aware surfaces.

This document is the **brand and UX source of truth**. Implementation already maps heavily to `apps/web/src/index.css` (`--meridian-*`, shadcn variables) and `apps/web/tailwind.config.js`.

---

## 1. Brand narrative

| Pillar | Meaning |
|--------|--------|
| **Clarity** | Teams see priorities, progress, and blockers without noise. |
| **Alignment** | Work connects across projects, roles, and tools (integrations). |
| **Momentum** | Calm UI that supports fast execution—dashboards, not decoration. |

**Name:** *Meridian* — a reference line for orientation (longitude / “true north” for delivery). Avoid nautical clichés in copy; use language of **focus**, **baseline**, and **direction**.

**Voice:** Direct, professional, human. Prefer verbs (“Ship”, “Assign”, “Sync”) over hype.

---

## 2. Logo

### Concept

- **Logomark:** Great-circle / meridian arc with a vertical axis—suggests **alignment** and **global coherence** without literal globe imagery.
- **Palette:** Deep slate + electric blue accent (matches primary UI).

### Files

| Asset | Location |
|--------|-----------|
| PNG logomark (generated baseline) | `apps/web/public/meridian-logomark.png` |

### Usage rules

- **Minimum touch target** for app icon contexts: 24×24 px; prefer 32×32+.
- **Clear space:** padding ≥ 12% of the shorter side on all sides.
- **On dark backgrounds:** use a version with sufficient contrast (invert to light mark or add 1px subtle keyline if needed—export a `meridian-logomark-dark.png` when finalizing).
- **Do not** stretch, rotate, add drop shadows for “depth,” or place on busy photography without a scrim.

### Wordmark (spec—implement in Figma / SVG)

- **Type:** Geometric sans, semi-bold: **Inter** or **DM Sans** (Meridian currently uses Inter in settings).
- **Tracking:** default or slightly tightened (-1%) for “MERIDIAN” all-caps; title case “Meridian” for product chrome.
- **Case:** Product name **Meridian** (sentence case) in UI; **MERIDIAN** acceptable in marketing headers only.

---

## 3. Color system

### 3.1 Brand core

| Role | Token (CSS) | HSL / hex (reference) |
|------|----------------|------------------------|
| Primary 500 | `--meridian-primary-500` | hsl(217, 91%, 60%) ≈ `#3B82F6` |
| Primary 600 | `--meridian-primary-600` | Deeper for hover / emphasis |
| Neutral text | `--meridian-neutral-900` | Headings / primary body |
| Neutral muted | `--meridian-neutral-500` | Secondary labels |
| Surface | `--background-elevated` | Cards / panels |

**Optional brand accent (marketing only):** `#288cfa` (“Meridian blue” from internal docs)—if used, reserve for **hero gradients** or **logo** only; keep app chrome on `--meridian-primary-*` for consistency with `index.css`.

### 3.2 Semantic

| Role | Token |
|------|--------|
| Success | `--meridian-success-*` |
| Warning | `--meridian-warning-*` |
| Error / destructive | `--meridian-error-*` + `--destructive` |

### 3.3 Persona ribbons (existing)

Use for **contextual** chrome only (filters, badges, optional dashboard accents)—PM / TL / Exec / Dev / Design. Tokens: `--persona-*-primary` in `index.css`. Never rely on color alone for meaning (WCAG).

### 3.4 Dark mode

PWA `theme_color` is `#1a1a1a`. Dark theme tokens should mirror light semantics: same **primary** hue, lifted surfaces toward neutral 800–900, borders slightly lighter than background.

---

## 4. Typography

| Use | Font | Weight | Notes |
|-----|------|--------|--------|
| UI | **Inter** | 400 body, 500–600 controls, 700 sparingly | Already used in appearance settings. |
| Marketing / hero | Inter or **DM Sans** | 600–700 | Optional pairing for landing only. |
| Code / IDs | **JetBrains Mono** or **ui-monospace** | 400 | API keys, branch names, JSON. |

**Scale (Tailwind-aligned):**

- Display / page title: `text-3xl`–`text-4xl`, `font-semibold`, tight line-height.
- Section: `text-xl`–`text-2xl`, `font-semibold`.
- Body: `text-sm`–`text-base`, `leading-relaxed`.
- Meta / captions: `text-xs`–`text-sm`, `text-muted-foreground`.

---

## 5. Layout & spacing

- **Base unit:** 4 px (Tailwind default). Prefer **4, 8, 12, 16, 24, 32, 48** for vertical rhythm.
- **Container:** `max-w-screen-2xl` / dashboard max widths already in layout primitives.
- **Density:** Default **comfortable**; power views (tables, task lists) may use **compact** row height with same tap targets (min 44×44 px touch).

---

## 6. Shape, elevation, motion

- **Radius:** `--radius` (0.75rem) default; cards `rounded-xl` where design system components specify.
- **Shadows:** `--shadow-sm`–`--shadow-xl`; colored shadows (`--shadow-primary`, etc.) for **focused** interactive cards only.
- **Motion:** 150–220 ms ease-out for hovers; respect `prefers-reduced-motion`; no gratuitous parallax in app shell.

---

## 7. Components (implementation map)

| Area | Where it lives |
|------|----------------|
| Design-system primitives | `apps/web/src/components/ui/meridian-*.tsx`, `button`, `card`, … |
| Tokens | `apps/web/src/index.css` `:root` and `.dark` |
| Tailwind bridge | `apps/web/tailwind.config.js` |
| PWA / install | `apps/web/vite.config.ts` manifest |

**Patterns:** Primary actions = filled primary; secondary = outline or ghost; destructive = distinct red, never only “grayed out.”

---

## 8. Accessibility

- Text vs background: aim **≥ 4.5:1** body, **≥ 3:1** large UI text / icons.
- Focus: visible `ring` using `--ring` (primary); never `outline: none` without replacement.
- Tables: sticky headers + row hover; support keyboard nav for task rows.

---

## 9. Content & imagery

- **Illustrations:** Abstract geometry, soft gradients; avoid generic “people around laptop” stock.
- **Marketing:** Meridian logomark + wordmark; CTA primary blue; plenty of whitespace.

---

## 10. Next steps (design → ship)

1. Export **SVG** logomark + dark variant from the PNG reference in Figma.
2. Regenerate **favicon** / **android-chrome** sizes from final mark (`apps/web/public/`).
3. Add `meridian-logo.svg` and swap login shell / sidebar header to SVG for crisp scaling.
4. Align any stray `#288cfa` marketing-only usage with this doc.

---

*Document version: 1.0 — aligned with Meridian codebase audit (April 2026).*
