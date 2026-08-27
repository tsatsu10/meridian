# Aurora auth surface — design

**Date:** 2026-07-28
**Status:** Approved, not yet implemented
**Scope:** Sign-in and sign-up in `apps/web`. No API changes.

## Problem

The auth pages are the only screens in Meridian still wearing a blue/purple/cyan
gradient with white glassmorphic cards. They match neither the Longitude mark
(navy `#1B2559` ring, teal `#2DD4BF` meridian line) nor the landing page, which
runs on a navy depth stack of `#0B1220` / `#12193F` / `#1B2559`. They are the
first screen a new user sees, and they look like a different product.

Separately, sign-in and sign-up are two disconnected pages with duplicated
chrome, and the shared `AuthLayout` hardcodes a palette that appears nowhere
else in the codebase.

## Decisions taken

| Decision | Choice | Why |
| --- | --- | --- |
| Brand latitude | Stay on-brand, push it forward | Fixes a real inconsistency instead of adding a third visual language |
| Flow | Unified surface, password-first, link-ready | Works today; magic links need SMTP, which is not configured |
| Art direction | Aurora depth | Chosen over "Instrument" and "Terminal-lucent" |
| Theme | Dark-only surface | Aurora over white is muddy; this is a full-bleed marketing-grade page |
| 2FA | Stays on its own route | It was hardened on 2026-07-27; restyle only, don't restructure |

## Non-negotiable constraint: no account enumeration

`apps/api/src/user/controllers/sign-in.ts` deliberately returns the identical
message for "no such user" and "wrong password", with a comment explaining that
distinguishing them lets a caller enumerate which addresses have accounts.

An email-first flow that asks the server "does this address exist?" and then
branches to either a password prompt or a sign-up prompt would leak exactly
that. **The design therefore never probes.** The user declares intent by
choosing "Create an account", and both paths look identical to an observer who
does not already know the answer.

Any future change to this flow must preserve that property.

## Routes

`/auth/sign-in` and `/auth/sign-up` both remain real routes and both render the
same component. The route seeds initial intent and nothing else.

Merging the surface does not require merging the URLs. Keeping them preserves
every deep link, landing-page CTA, post-sign-out redirect and route guard
already in the tree.

## Flow

**Step 01 — Identity.** Email input, `Continue`. Below: "New to Meridian?
Create an account", which switches intent to sign-up and re-renders step 02.

**Step 02 — Credential.** The email collapses into an editable chip (clicking
it returns to step 01 with the value preserved).

- Intent `sign-in`: password field, `Sign in`, forgot-password link.
- Intent `sign-up`: name field, password field, live strength meter, and
  `Create account`. The meter is the existing
  `components/auth/password-strength-indicator.tsx`, restyled — not a new one.

Submission uses the existing handlers and endpoints unchanged. On
`twoFactorRequired`, navigation to the existing `/auth/verify-2fa` route is
unchanged.

## Visual system

### Background — three layers

1. Base fill `#0B1220`.
2. Two radial blooms: teal `#2DD4BF` at 12% opacity, indigo `#1B2559` at 40%.
   Each drifts on its own loop (40s and 60s), animating `transform` only so the
   compositor handles it and no layout or paint is triggered.
3. Grain overlay at 3% opacity, to stop banding across the large gradient on
   wide displays. Implemented as an inline SVG `feTurbulence` data URI on a
   pseudo-element — no image request, and it tiles at any viewport size.

### Card

- `backdrop-filter: blur(24px)`
- Background `rgb(255 255 255 / 0.07)`
- Border `1px solid rgb(255 255 255 / 0.12)`
- Inset top highlight `inset 0 1px 0 rgb(255 255 255 / 0.10)`
- Shadow `0 32px 64px -16px rgb(0 0 0 / 0.55)`

### Depth

Card rotates up to ±2° on X and Y toward the pointer. Aurora layers parallax at
differing rates. Both are pointer-driven only; neither runs on touch.

### Type

Space Grotesk for the heading, Inter for everything else — both already loaded
via the existing Google Fonts link. No new font requests.

### Colour discipline

Teal is treated as light, not paint: focus rings, the primary CTA, the mark.
Never body text, never large fills.

### Motion

Step change is a 240ms cross-fade with an 8px rise, running alongside the email
chip collapse.

## Accessibility

- `prefers-reduced-motion: reduce` disables aurora drift, pointer tilt and the
  step transition. The surface renders static and fully usable.
- Every control has a visible teal focus ring. Focus is never suppressed.
- Real `<form>` elements with bound `<label>`s; Enter submits.
- `autocomplete="email"`, `"current-password"`, `"new-password"` as
  appropriate, so password managers work.
- Errors are associated via `aria-describedby` and announced with `aria-live`.
- All text meets at least 4.5:1 against the glass over navy.
- Error copy goes through `userMessage` (see the error-message standard).

## Components

New, in `apps/web/src/components/auth/`:

- `aurora-backdrop.tsx` — the three background layers, reduced-motion aware.
- `glass-panel.tsx` — the frosted card, owns the pointer tilt.
- `auth-surface.tsx` — the step machine: holds email, intent and step, renders
  the right step body.

Changed:

- `sign-in-form.tsx`, `sign-up-form.tsx` — reduced to step bodies. They keep
  their existing submit handlers and mutations.
- `layout.tsx` — the old gradient shell is removed; `auth-surface` replaces it.
- `forgot-password.tsx`, `verify-2fa.tsx` — restyled onto the new backdrop and
  panel. Logic untouched.

Each new component has one job, takes props rather than reaching into stores,
and can be rendered in isolation in a test.

## Explicitly untouched

- Every auth API call, endpoint, status code and error semantic.
- The identical-error behaviour that prevents enumeration.
- 2FA logic and its route.
- Forgot-password logic and its route.
- Session handling.

## Testing

**Unit**
- Step machine: identity → credential, chip click returns with email intact,
  intent seeded correctly from each route.
- The surface never issues a request during step 01 — the guarantee that it
  cannot leak account existence.
- Reduced-motion: backdrop renders without animation.
- Labels and autocomplete tokens present on every field.

**Regression**
- The existing auth test suites must pass unchanged.

**Manual click-through before calling it done**
- Sign in with valid credentials.
- Sign in with a wrong password; confirm the message is identical to signing in
  with an unknown address.
- Create an account.
- Forgot-password.
- A 2FA-enabled account through to the dashboard.
- Keyboard-only pass, and one pass with reduced-motion enabled.

## Risks

Auth is the flow that must not break. The mitigations are structural: no API
changes, no route changes, existing submit handlers reused rather than
rewritten, and the manual click-through above before this is considered
finished.

Secondary risk: `backdrop-filter` with a large blur can cost frames on low-end
GPUs. If the card proves expensive, the fallback is a solid navy card at 92%
opacity with no blur — visually close, and it drops the cost entirely.

## Out of scope

- Magic links and passwordless sign-in. The token rails exist
  (`email-verification-service.ts`, `email_verification_tokens`,
  `/verify-email`), but SMTP is not configured, so nothing email-delivered can
  be used or tested. The design leaves a seam: adding an "Email me a sign-in
  link" button to step 02 requires no restructuring.
- Light-mode variant of the auth surface.
- OAuth provider buttons.
