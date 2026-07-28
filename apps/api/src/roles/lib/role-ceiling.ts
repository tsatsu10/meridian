/**
 * How high a role an actor is allowed to hand out.
 *
 * There are two different ceilings here, and which one applies depends on
 * whether both sides of the comparison are BUILT-IN roles. The split is not
 * a convenience — it is forced by the shape of the data:
 *
 * BOTH SIDES BUILT-IN → compare ROLE_HIERARCHY levels.
 *   The eleven built-in roles are an intentionally ordered ladder, NOT a
 *   permission lattice, and ordering is the comparison they were designed
 *   around — so "at or below my own level" is the rule that matches them.
 *
 *   HISTORY, because this branch used to be load-bearing for a second reason:
 *   `workspace-manager` was NOT a superset of the other built-ins. It lacked
 *   `canManageDepartment` (department-head) and `canViewAssignedTasks` /
 *   `canUpdateAssignedTasks` (contractor), so a pure subset ceiling rejected
 *   those two roles for EVERY possible actor and made them permanently
 *   unassignable and unclonable. `workspace-manager` is now a true superset
 *   (pinned by constants/__tests__/role-coherence.test.ts), so that specific
 *   trap is gone — but the hierarchy comparison stays, because it is still
 *   the right yardstick for an ordered ladder and it keeps this branch
 *   independent of how the matrix happens to be filled in.
 *
 * EITHER SIDE CUSTOM → compare permission sets (findExcessPermissions).
 *   A custom role has no hierarchy level, and — crucially — its permission
 *   list is chosen by whoever created it. The subset ceiling is the only
 *   thing standing between "a custom role that happens to grant
 *   canManageRoles" and "that role's holder assigning workspace-manager to
 *   themselves." Exempting built-in TARGETS wholesale (e.g. an
 *   `isSystemRoleId(target)` bypass) would reopen exactly that hole, which
 *   is why the hierarchy branch requires the ACTOR to be built-in too: only
 *   then is there a real level to measure against.
 *
 * Both branches are ceilings on the same question ("can you hand this out?"),
 * they just measure it with the right yardstick for the operands.
 */

import { ROLE_HIERARCHY } from "../../constants/rbac";
import type { UserRole } from "../../types/rbac";
import { isSystemRoleId } from "./system-roles";

/**
 * True when the hierarchy ceiling applies — i.e. the actor's role and the
 * role being handed out are BOTH built-in. Anything else (either side a
 * custom role, either side missing) keeps the permission-subset ceiling.
 */
export function usesHierarchyCeiling(
  actorRole: string | null | undefined,
  targetRole: string | null | undefined,
): boolean {
  return (
    typeof actorRole === "string" &&
    isSystemRoleId(actorRole) &&
    typeof targetRole === "string" &&
    isSystemRoleId(targetRole)
  );
}

/**
 * The hierarchy ceiling itself: an actor may hand out a built-in role at or
 * below their own level. Only meaningful when `usesHierarchyCeiling` is true.
 */
export function hierarchyCeilingAllows(
  actorRole: string,
  targetRole: string,
): boolean {
  const actorLevel = ROLE_HIERARCHY[actorRole as UserRole] ?? 0;
  const targetLevel = ROLE_HIERARCHY[targetRole as UserRole] ?? 0;
  return targetLevel <= actorLevel;
}
