/**
 * Project-scope restriction for routes that act on MANY projects at once.
 *
 * 🚨 `checkWorkspacePermission` returns `restrictedToProjectIds` for
 * project-scoped roles (project-manager / project-viewer, and custom roles
 * assigned with a projectIds list). Its own doc comment says callers operating
 * on multiple resources must apply that list themselves — the workspace check
 * confirms the caller may act *in the workspace*, not *on these projects*.
 *
 * The bulk project routes checked only `permission.allowed` and threw the list
 * away, so a role restricted to a single project could bulk-update or
 * bulk-delete every project in the workspace. `task/` and `modules/search/`
 * already honoured it; `project/` did not.
 */

/**
 * Returns the requested project ids the caller may NOT touch.
 *
 * An empty result means the request is entirely within scope. A null or
 * undefined `restrictedToProjectIds` means the caller has no project-level
 * restriction at all (workspace-wide role) — NOT that they may touch nothing.
 */
export function projectsOutsideRestriction(
  requestedProjectIds: string[],
  restrictedToProjectIds: string[] | null | undefined,
): string[] {
  if (!restrictedToProjectIds) return [];
  return requestedProjectIds.filter(
    (id) => !restrictedToProjectIds.includes(id),
  );
}

/** Uniform 403 body naming the projects that fell outside the caller's scope. */
export function projectRestrictionError(outOfScope: string[]) {
  return {
    error: "No access to these projects",
    projectIds: outOfScope,
    message:
      "Your role is restricted to specific projects; this request included projects outside that list.",
  };
}
