# Landing page redesign — design spec

**Date:** 2026-07-26
**Component:** `apps/web/src/components/landing/LandingPage.tsx`
**Status:** Approved by user, ready for implementation

## Problem

The current landing page fabricates most of its content: fake usage stats (50K+ teams,
99.9% uptime, 2M+ tasks, <100ms response), a customer-logo strip implying Microsoft/Google/
Slack/Notion/Figma/Stripe are customers, three invented customer testimonials, a "Real-Time
Collaboration" badge and chat/video-conferencing features that don't exist in the codebase,
a placeholder "Interactive demo coming soon" box instead of real product screenshots, and a
three-tier pricing table ($12/user/month Professional, custom Enterprise) advertising a
purchase flow that cannot happen — there is no billing/Stripe/subscription code anywhere in
`apps/api`. Recent commit history on this repo has specifically been about removing this
exact class of fake/non-functional UI elsewhere in the product (fake notification badges,
fake success toasts, faked 2FA, etc.), so shipping more of it on the landing page would be a
direct regression against that effort.

## Verified facts used to build the new copy

- **RBAC is real**: 11 roles defined in `apps/api/src/types/rbac.ts` — guest, stakeholder,
  contractor, client, member, team-lead, project-viewer, project-manager, workspace-viewer,
  department-head, workspace-manager. Enforcement confirmed via prior audits (privilege
  escalation fix, authMiddleware fix, frontend RBAC override fix — all merged to main).
- **No real-time layer**: this fork removed WebSocket during the Kaneo→Meridian migration.
  No live chat, video conferencing, or live presence features exist anywhere in
  `apps/web/src/components`.
- **No billing system**: no Stripe/subscription/checkout code in `apps/api/src`. Sign-up
  creates a free account with no paywall.
- **No LICENSE file** at repo root — "open source" is not a claim we can make.
- **Real features confirmed present**: Kanban board, List, Calendar, Timeline, Backlog,
  Milestones, subtasks (`dashboard/workspace/.../project/$projectId/*` routes); Analytics
  overview/projects/teams/insights tabs with predictive forecasts
  (`dashboard/analytics.tsx`); Teams pages with health score, workload balance, people
  directory (`dashboard/teams.tsx`); 2FA (`verify-2fa.tsx`, fixed and working), audit logs
  (`dashboard/audit.tsx`, `settings/audit-logs.tsx`), session management
  (`security/session-management-widget.tsx`).
- **Not verifiable / dropped**: migration tools from Jira/Asana/Trello/Monday, SOC 2/GDPR
  certification (a GDPR widget exists in-app but that's not the same as being certified),
  offline PWA support.

## Section-by-section design

1. **Nav** — unchanged structure (logo, Features/Roles/FAQ anchors, Sign In / Get Started).
   Pricing anchor removed since the section is gone. Drop the "v2.0" badge (meaningless).

2. **Hero**
   - Headline: "Project management with permission boundaries built in" (short, outcome-led).
   - Subhead: one sentence on the 11 roles + real view list (Kanban, list, calendar,
     timeline, analytics).
   - Single primary CTA: "Get Started Free" → `/auth/sign-up`. No secondary "Watch Demo"
     button (no video exists; research shows single-CTA pages convert meaningfully better).
   - Hero visual: real dashboard screenshot inside the existing browser-chrome frame
     component, replacing the animated placeholder box.
   - Removed: "trusted by 50,000+ teams" line, customer-logo strip, fake stat tiles,
     "Real-Time Collaboration" badge.
   - Optional small honest fact-strip under the CTA: "11 built-in roles · Kanban, list,
     calendar & timeline · Built-in analytics" (factual product facts, not business metrics).

3. **Roles section** — keep the existing interactive role-selector pattern (click a role,
   see its detail card). Rebuild the role list from the real 11 RBAC roles and rewrite each
   role's feature bullets to real scoped capabilities (e.g. project visibility scope, task
   assignment ability, analytics access level) instead of invented items like "Billing
   Management" or "Global Analytics."

4. **Features** — four real categories replacing the current four:
   - Plan & Track: Kanban board, List view, Calendar, Timeline, Backlog, Milestones,
     subtasks/dependencies.
   - Analytics & Insights: executive dashboard, team performance charts, risk detection,
     predictive forecasts.
   - Teams & Access: 11-role RBAC, team health scoring, workload balance, people directory.
   - Security: 2FA, audit logs, session management.
   - Removed categories: "Automation & AI" (auto-assignment, AI insights as a category name —
     not real) and "Collaboration" (chat, video, live presence, collaborative docs — not
     real).

5. **Real product screenshots** — a dedicated section with 2-3 framed screenshots (Board,
   Analytics, Teams grid) captured from the running app, replacing the single vague hero
   placeholder.

6. **Testimonials → removed.** Replaced with a short "Why teams pick Meridian" section of
   factual, benefit-framed statements with no impersonated speakers/quotes.

7. **Pricing → removed entirely.** Page flows from features/screenshots straight to the
   closing CTA section. No invented tiers or prices.

8. **FAQ → rewritten.** Drop questions/answers about migration tools, SOC 2/GDPR
   certification, and offline PWA support. Replace with honest Q&A about the role system,
   security features that exist (2FA, audit logs), and self-hosting.

9. **Footer** — trim dead links (Blog, Careers, Press Kit, Changelog, social icons pointing
   to `#`) down to what's real: product nav anchors and sign-in/up links.

## Non-goals

- No changes to color/typography tokens — the existing blue (light mode) → purple (dark
  mode) primary already matches `index.css` design tokens; only content/claims change.
- No changes to any other route or component besides `LandingPage.tsx`.
- No new backend work — this is a copy/content/screenshot swap on an existing page.

## Verification plan

- Load `/` in both light and dark theme, confirm no broken links/anchors.
- Confirm every remaining claim on the page traces to a real, grep-verified feature.
- Responsive check at mobile width.
