# Meridian — product brief (canonical)

**Claims in marketing, landing copy, and demos must match this page or be removed.**

This file is the **single in-repo source of truth** for product intent. Engineering details live in `apps/web/docs/` and API docs; **personas, ICP, wedge, and promises** are defined here only.

---

## 1. Problem

**[TBD — discovery]** Replace with one paragraph in this form, backed by interviews:

> When \<situation\>, \<user\> struggles with \<outcome\> because \<constraint\>.

*Current state:* The app ships a broad “project management for every role” narrative in `apps/web/src/components/landing/LandingPage.tsx` without a validated problem statement tied to one situation.

---

## 2. Who (primary ICP)

**[TBD — discovery]** One primary ICP first (role, company size, geography, buyer vs user, budget motion).

*Secondary ICP:* optional, after primary is evidenced.

*Current state:* Landing roles (`Workspace Manager`, `Department Head`, `Project Manager`, etc.) are **UI/marketing personas**, not research-backed ICPs.

---

## 3. Today (incumbent workflow)

**[TBD — discovery]** Name real tools + rituals (e.g. “Jira + Slack + spreadsheet”) and **five bullets** for “last week’s workflow.”

*Seed from existing copy only (not validated):* FAQ mentions migration from **Asana, Trello, Jira, Monday.com** — treat these as *hypothesis competitors*, not confirmed user stacks, until interviews say otherwise.

---

## 4. Why the status quo is not good enough

**[TBD — discovery]** Measurable pain (time lost, errors, rework, visibility gaps, compliance, cost) and **why** listed tools do not close the gap **for the named ICP**.

*Risk:* `LandingPage.tsx` includes social proof and scale stats (e.g. team counts, uptime, latency) that are **not evidenced** in this repo; they must not inform strategy until sourced or removed from marketing.

---

## 5. Product surface alignment (after sections 1–4 are evidence-backed)

- [ ] Hero, onboarding, and empty states repeat the **same problem sentence** and **same primary ICP** as this brief.
- [ ] Roadmap and metrics trace to the **wedge outcome** (one north-star), not every feature category in the landing grid.
- [ ] Audit landing FAQ/feature list vs shipped behavior (e.g. “built-in video,” migrations, compliance claims) and **trim or qualify** copy where implementation does not match.

---

## 6. Discovery next step (before more positioning work)

Run **5–10 interviews** with people who match the **hypothesis** ICP (or two small cohorts if unsure). Ask for **last week’s workflow** and **last failure** (missed date, duplicate work, status black hole, etc.). Replace sections 1–4 with **recurring themes + frequency**, not aspirational adjectives.
