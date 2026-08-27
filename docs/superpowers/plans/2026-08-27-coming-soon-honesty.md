# Coming-Soon Honesty Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate remaining “coming soon” / placeholder UX on filters, all-tasks, admin roles, and team settings by wiring existing APIs or hiding dead controls—no new product features invented.

**Architecture:** Same honesty rule as the system-audit remediation Phase 3 (hide-or-wire): **wire if an API/route already exists; hide if not**. Prefer redirects to real surfaces over duplicate stubs. Keep changes local to each UI surface; no RBAC redesign.

**Tech Stack:** Vite + React + TanStack Router/Query (web), existing Hono team/settings APIs, Vitest + Testing Library, Sonner toasts.

**Spec:** Investigation findings in this plan (session 2026-08-27). Pattern reference: system-audit remediation Task 7 (hide-or-wire) — that plan file may only exist on `backup/audit-remediation-all`; the rule is restated in Global Constraints below.

## Global Constraints

- **No demo-auth weakening.** Do not broaden `ALLOW_DEMO_AUTH_BYPASS` / `DEMO_MODE`.
- **YAGNI:** Do not build a filter visual builder, calendar sync, automation engine, or integrations product in this plan.
- **Hide-or-wire:** If there is no backend route, remove the control (and skip the orphaned query). Do not leave mutate UI against dead endpoints.
- **No “coming soon” / “will be implemented soon”** copy on the four named surfaces after Tasks 1–5 land.
- **Tests must stay green** for touched routes/components.
- **Commits:** Conventional Commits; only when the human asks.
- **Canonical roles UI:** `/dashboard/settings/roles-unified` (not `/dashboard/admin/roles`).
- **Team member API role string:** send `"member"` (lowercase) on create — matches `apps/api/src/team/index.ts` default. Do not send UI labels like `"Team Lead"`.

## Scope decision (Task 6)

**Task 6 is in scope for the first pass** (same honesty sweep). Calendar export/sync, analytics “Coming Soon”, and Add Integration are hide-only and cheap; include them so a final repo grep is clean.

---

## Investigation summary (codebase evidence)

| Surface | Location | What users see | Backend / existing path | Decision |
|---------|----------|----------------|-------------------------|----------|
| Filter templates | `apps/web/src/routes/dashboard/settings/filters.tsx` ~308 | Toast: “Full builder coming soon!” | `GET /settings/filters/templates` returns full `filterConfig`; `createFilterMutation` already creates saved filters | **Wire** — create saved filter from template |
| All-tasks default | `apps/web/src/routes/dashboard/all-tasks.tsx` ~674 | Toast: `` `${action} functionality coming soon!` `` | Menu only emits `view`/`edit`/`assign`/`duplicate`/`delete` — all handled | **Harden** — treat unknown action as error/log; no “coming soon” |
| Admin roles | `apps/web/src/routes/dashboard/admin/roles.tsx` | Placeholder card “Full functionality coming soon!” + dead Assign Role button | Real UI: `/dashboard/settings/roles-unified`; teams roles already redirects | **Redirect** |
| Team Add Member | `team-settings-modal-redesign.tsx` ~937 | Toast: “Add member functionality coming soon” | `POST /api/team/:teamId/members` `{ userId, role }`; `useGetWorkspaceUsers` exists | **Wire** — pick existing workspace user → POST members |
| Team Automations tab | same file ~1388–1505 + hooks | Create toasts; list/update/delete UI | Web hooks call `/team/:id/automations` but **no automations routes in `apps/api/src`** | **Hide entire Automations nav item** + stop querying |
| Calendar export/sync | `calendar.tsx` ~497–507; project `_layout.calendar.tsx` ~380 | “will be implemented soon” toasts | No export/sync API | **Hide** menu items |
| Analytics settings | `analytics.tsx` ~2589 | Button label “Coming Soon” | No auto-refresh prefs API | **Hide** the auto-refresh row |
| Add Integration | team modal ~1379 | Button with no handler | No team integrations create API | **Hide** button; keep empty copy |

---

## File map

| Task | Create | Modify |
|------|--------|--------|
| 1 Filters | — | `apps/web/src/routes/dashboard/settings/filters.tsx` |
| 2 All-tasks | — | `apps/web/src/routes/dashboard/all-tasks.tsx` |
| 3 Admin roles | — | `apps/web/src/routes/dashboard/admin/roles.tsx` |
| 4 Team add member | `apps/web/src/hooks/mutations/team/use-add-team-member.ts` | `team-settings-modal-redesign.tsx` |
| 5 Hide automations tab | — | `team-settings-modal-redesign.tsx` |
| 6 Bonus stubs | — | `calendar.tsx`, `_layout.calendar.tsx`, `analytics.tsx`, `team-settings-modal-redesign.tsx` |

---

### Task 1: Wire filter “Use template” to create a saved filter

**Files:**
- Modify: `apps/web/src/routes/dashboard/settings/filters.tsx`

**Interfaces:**
- Consumes: `templatesResponse?.data` from `GET /settings/filters/templates` (`FilterTemplate` in `apps/api/src/settings/controllers/filters.ts`: `id`, `name`, `description`, `filterType`, `filterConfig`, `category`).
- Produces: same payload as `handleCreateFilter` / `createFilterMutation`.

**Duplicate names:** If the user applies the same template twice, create again with the same `name` (API accepts duplicates today). Do not invent rename UI. Surface API errors via existing `createFilterMutation.onError`.

- [ ] **Step 1: Extend local `FilterTemplate` to include `filterConfig`**

```ts
interface FilterTemplate {
  id: string;
  name: string;
  description?: string;
  filterType: "projects" | "tasks" | "users" | "messages" | "files";
  filterConfig?: {
    logic: "AND" | "OR";
    conditions: Array<{ field: string; operator: string; value: unknown }>;
  };
  category?: string;
}
```

- [ ] **Step 2: Replace toast with create mutation**

```ts
const handleUseTemplate = (template: FilterTemplate) => {
  if (!currentWorkspace?.id) {
    toast.error("Select a workspace before using a filter template");
    return;
  }
  const allowedTypes = [
    "projects",
    "tasks",
    "users",
    "messages",
    "files",
  ] as const;
  type FilterType = (typeof allowedTypes)[number];
  if (!allowedTypes.includes(template.filterType as FilterType)) {
    toast.error("This template type is not supported");
    return;
  }
  createFilterMutation.mutate({
    name: template.name,
    description: template.description ?? "",
    filterType: template.filterType as FilterType,
    isPublic: false,
    filterConfig: template.filterConfig ?? {
      logic: "AND",
      conditions: [],
    },
  });
};
```

Rely on existing `createFilterMutation.onSuccess` for list refresh + success toast. Do not add a second success toast unless `onSuccess` is silent.

- [ ] **Step 3: Grep gate**

```bash
rg -i "coming soon" apps/web/src/routes/dashboard/settings/filters.tsx
```

Expected: no matches.

- [ ] **Step 4: Manual check**

Templates tab → Use template → Saved Filters shows a new filter with that name; no “coming soon” toast.

---

### Task 2: Harden all-tasks unknown-action path

**Files:**
- Modify: `apps/web/src/routes/dashboard/all-tasks.tsx` (~593–676)

**Interfaces:**
- Consumes: `action: string` from dropdown (`view` | `edit` | `assign` | `duplicate` | `delete` only today).
- Produces: no “coming soon” toast.

`logger` is already imported from `@/lib/logger` in this file.

- [ ] **Step 1: Replace default branch**

```ts
default: {
  logger.warn("Unhandled task action", { action, taskId: task.id });
  toast.error("That action isn't available for this task");
  break;
}
```

- [ ] **Step 2: Grep gate**

```bash
rg -i "coming soon" apps/web/src/routes/dashboard/all-tasks.tsx
```

Expected: no matches.

- [ ] **Step 3: Smoke**

All Tasks row menu: View / Edit / Assign / Duplicate / Delete still work.

---

### Task 3: Redirect `/dashboard/admin/roles` to real roles UI

**Files:**
- Modify: `apps/web/src/routes/dashboard/admin/roles.tsx`

**Interfaces:**
- Mirror: `apps/web/src/routes/dashboard/teams/$workspaceId/_layout.roles.tsx` (`Navigate` replace).
- Auth: dropping `RequirePermission` on this stub is intentional — the destination `roles-unified` enforces access. Redirect is public-route-safe.

- [ ] **Step 1: Replace placeholder page with redirect**

```tsx
import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Real role management lives at settings/roles-unified. */
export const Route = createFileRoute("/dashboard/admin/roles")({
  component: () => (
    <Navigate to="/dashboard/settings/roles-unified" replace />
  ),
});
```

Remove unused imports and `RoleManagementPage`.

- [ ] **Step 2: Grep gate**

```bash
rg -i "coming soon" apps/web/src/routes/dashboard/admin/roles.tsx
```

Expected: no matches.

- [ ] **Step 3: Navigate**

Visit `/dashboard/admin/roles` → lands on `/dashboard/settings/roles-unified`.

---

### Task 4: Wire Team Settings “Add Member”

**Files:**
- Create: `apps/web/src/hooks/mutations/team/use-add-team-member.ts`
- Modify: `apps/web/src/components/team/team-settings-modal-redesign.tsx`

**Interfaces:**
- Consumes: `POST /api/team/:teamId/members` body `{ userId: string; role?: string }` (`apps/api/src/team/index.ts` ~328–363). Default role `"member"`.
- Workspace directory: `useGetWorkspaceUsers({ workspaceId })` from `@/hooks/queries/workspace-users/use-get-workspace-users`.
- Do **not** open `invite-team-member-modal` (workspace invite, different product).

**Permission:** Modal has no `canManageTeamMembers` flag today. Gate only via API 403 + error toast (same as other member mutations). Do not invent a new permission UI in this task.

- [ ] **Step 1: Create mutation hook matching sibling team hooks**

```ts
// apps/web/src/hooks/mutations/team/use-add-team-member.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import { toast } from "sonner";
import { userMessage } from "@/lib/user-message";

interface AddTeamMemberData {
  teamId: string;
  userId: string;
  workspaceId: string;
  role?: string;
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      userId,
      role = "member",
    }: AddTeamMemberData) => {
      return fetchApi(`/team/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["teams", variables.workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["team-metrics", variables.workspaceId],
      });
      toast.success("Member added to team");
    },
    onError: (error) => {
      toast.error(userMessage(error, "add the team member"));
    },
  });
}
```

(`fetchApi` already sets `Content-Type: application/json` when missing.)

- [ ] **Step 2: Wire Dialog in `team-settings-modal-redesign.tsx`**

1. Import `useAddTeamMember` and `useGetWorkspaceUsers`.
2. State: `isAddMemberOpen` (boolean), `selectedUserId` (string | null).
3. When `open && team?.workspaceId`, call:

```ts
const { data: workspaceUsers = [] } = useGetWorkspaceUsers({
  workspaceId: team.workspaceId,
});
const addMemberMutation = useAddTeamMember();
```

4. Candidates = workspace users with a non-null `id` (`WorkspaceMember.id` from `get-workspace-users` may be null — skip those) whose `id` is **not** in `new Set(team.members.map((m) => m.id))`. That `id` is the user id for `POST .../members`.
5. Replace Add Member `onClick` toast with `setIsAddMemberOpen(true)`.
6. Dialog: list candidates (name + email), select one, Confirm calls:

```ts
addMemberMutation.mutate({
  teamId: team.id,
  userId: selectedUserId, // WorkspaceMember.id
  workspaceId: team.workspaceId,
  role: "member",
});
```

On success close dialog and clear `selectedUserId`. Parent that owns `team` must refresh from invalidated `["teams", workspaceId]` (same as remove-member).

7. Empty candidates: show “Everyone in this workspace is already on the team” and disable Confirm.

- [ ] **Step 3: Grep gate (Add Member toast gone; automation lines OK until Task 5)**

```bash
rg -i "Add member functionality coming soon" apps/web/src/components/team/team-settings-modal-redesign.tsx
```

Expected: no matches.

---

### Task 5: Hide Automations tab (dead API)

**Files:**
- Modify: `apps/web/src/components/team/team-settings-modal-redesign.tsx`

**Why hide the whole tab:** Create/list/update/delete all depend on `/team/:teamId/automations`, which does not exist in `apps/api/src`. Leaving list/update/delete UI is still dishonest.

- [ ] **Step 1: Remove Automations from `navigationSections`**

In the `"Automation"` section items array, remove the `{ id: "automations", ... }` entry. Leave Notifications and Integrations entries for now (Integrations empty CTA cleaned in Task 6).

- [ ] **Step 2: Stop orphaned queries/mutations**

Remove (or comment-free delete):
- `useGetTeamAutomations` call and imports
- `useUpdateAutomation` / `useDeleteAutomation` imports and usage
- The entire `{activeTab === "automations" && (...)}` block

If `activeTab` could still be `"automations"` from stale state, reset to `"overview"` when the tab id is unknown:

```ts
useEffect(() => {
  const validIds = new Set(
    navigationSections.flatMap((s) => s.items.map((i) => i.id)),
  );
  if (!validIds.has(activeTab)) setActiveTab("overview");
}, [activeTab]);
```

(Only add this if `activeTab` is not already validated.)

- [ ] **Step 3: Grep gate**

```bash
rg -i "coming soon|automation" apps/web/src/components/team/team-settings-modal-redesign.tsx
```

Expected: no “coming soon”; no automations UI/hooks remaining (Notifications may still mention “Automation” section title — rename section to “Connections” only if both automations are gone and it reads oddly; optional).

---

### Task 6: Calendar / analytics / integration stubs

**Files:**
- Modify: `apps/web/src/routes/dashboard/calendar.tsx`
- Modify: `apps/web/src/routes/dashboard/workspace/$workspaceId/project/$projectId/_layout.calendar.tsx`
- Modify: `apps/web/src/routes/dashboard/analytics.tsx`
- Modify: `apps/web/src/components/team/team-settings-modal-redesign.tsx`

- [ ] **Step 1: Calendar (dashboard)**

In `calendar.tsx`:
- Delete `exportCalendar` and `syncExternalCalendar` functions.
- Remove the Export and Sync `DropdownMenuItem`s that call them (~1223–1231).
- Keep Share (clipboard) as-is.

- [ ] **Step 2: Project calendar**

In `_layout.calendar.tsx`:
- Remove the export toast handler and its menu item the same way (grep `implemented soon` in that file).

- [ ] **Step 3: Analytics settings dialog**

In `analytics.tsx` (~2581–2592), remove the entire Auto-refresh row that contains the “Coming Soon” button. Keep Default Time Range and other real controls.

- [ ] **Step 4: Team integrations empty CTA**

In `team-settings-modal-redesign.tsx` integrations empty state (~1374–1382), remove the “Add Integration” `Button`. Leave:

```tsx
<p className="text-sm text-muted-foreground mb-4">
  No integrations connected
</p>
```

Do not add new create UI. Leaving the Integrations tab + GET hook is acceptable for this task if GET may 404 quietly; do not expand scope to delete the tab unless the query already hard-fails the modal.

- [ ] **Step 5: Repo grep**

```bash
rg -i "coming soon|will be implemented soon" apps/web/src --glob "!**/__tests__/**"
```

Expected: no matches in product UI.

---

## Phase gate checklist

```bash
rg -i "coming soon|will be implemented soon" apps/web/src --glob "!**/__tests__/**"
npm exec --workspace=@meridian/web -- tsc --noEmit -p tsconfig.app.json
npx biome check \
  apps/web/src/routes/dashboard/settings/filters.tsx \
  apps/web/src/routes/dashboard/all-tasks.tsx \
  apps/web/src/routes/dashboard/admin/roles.tsx \
  apps/web/src/components/team/team-settings-modal-redesign.tsx \
  apps/web/src/hooks/mutations/team/use-add-team-member.ts \
  apps/web/src/routes/dashboard/calendar.tsx \
  apps/web/src/routes/dashboard/analytics.tsx
```

Also typecheck the project calendar path if touched:

```bash
npx biome check "apps/web/src/routes/dashboard/workspace/\$workspaceId/project/\$projectId/_layout.calendar.tsx"
```

---

## Suggested PR sequence

1. **PR 1:** Tasks 1–3 (filters + all-tasks + admin redirect)  
2. **PR 2:** Tasks 4–5 (add member + hide automations)  
3. **PR 3:** Task 6 (calendar / analytics / integration hide)  

Or one PR if the sweep stays small.

---

## Self-review (plan vs investigation)

| Finding | Task |
|---------|------|
| Filter template toast despite `filterConfig` on API | Task 1 |
| All-tasks unreachable default “coming soon” | Task 2 |
| Admin roles placeholder vs roles-unified | Task 3 |
| Add Member toast despite POST members | Task 4 |
| Automation UI against missing API | Task 5 (hide tab) |
| Calendar / analytics / integration stubs | Task 6 (in scope) |
| TipTap / calendar sync / automation engine | Explicit non-goals |

**Audit fixes applied (2026-08-27):** Task 4 aligned with `useRemoveMember` invalidation/args; role `"member"`; concrete Dialog + `useGetWorkspaceUsers`; Task 5 hides entire Automations tab; Spec pointer fixed; Task 6 in scope; placeholders removed.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-08-27-coming-soon-honesty.md`.

### PR notes (post-audit)

- **Create Event (global calendar):** Beyond Task 6’s export/sync bullets — the stub create modal / “New Event” / date-cell create affordances were removed so the honesty grep gate stays clean (copy said “will be implemented soon”). Not a calendar product feature; call this out in the PR summary so reviewers don’t treat it as accidental scope creep.
- **Integrations tab:** Task 6 only required hiding Add Integration. Follow-up audit: no team integrations routes in `apps/api` → hide entire Integrations nav/query (same rule as Automations).
- **Teams bulk delete:** Delete Selected in bulk mode removed — no batch delete API.
- **Team settings dialogs:** Add Member is a sibling Dialog; settings uses `modal={!isAddMemberOpen}` so Escape/overlay don’t fight.
- **Role casing:** UI Title Case ↔ API lowercase via `toUiTeamRole` / `toApiTeamRole` (aliases include `team-lead` / `team_lead`).
- **Save vs members:** Overview Save merges live `team.members` so add/remove/role during edit is not wiped.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
