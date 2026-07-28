/**
 * How high a role an actor is allowed to hand out.
 *
 * There are two different ceilings here, and which one applies depends on
 * whether both sides of the comparison are BUILT-IN roles. The split is not
 * a convenience — it is forced by the shape of the data:
 *
 * BOTH SIDES BUILT-IN → compare ROLE_HIERARCHY levels.
 *   The eleven built-in roles are an intentionally ordered ladder, NOT a
 *   permission lattice. `workspace-manager` (level 10) is the only role that
 *   grants canManageRoles, so it is the only role that can reach an assign
 *   or clone route at all — yet it is not a superset of every other role:
 *   `contractor` grants canViewAssignedTasks and canUpdateAssignedTasks and
 *   `department-head` grants canManageDepartment, none of which
 *   workspace-manager holds (see ROLE_PERMISSIONS). A pure subset ceiling
 *   therefore rejects those two roles for EVERY possible actor, making them
 *   permanently unassignable and unclonable. Ordering is the comparison the
 *   built-ins were actually designed around, so "at or below my own level"
 *   is the rule that matches them.
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
