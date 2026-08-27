/**
 * The bulk project routes (POST /bulk/update, POST /bulk/delete) call
 * `projectsOutsideRestriction` with the requested ids and the
 * `restrictedToProjectIds` returned by checkWorkspacePermission, and return
 * 403 when the result is non-empty. Before that, they checked only
 * `permission.allowed` and discarded the restriction, so a role scoped to one
 * project could bulk-update or bulk-delete every project in the workspace.
 *
 * The null case is the one that decides whether the fix is safe to ship: a
 * workspace-wide role has NO restriction, and must not be blocked by it.
 */

import { describe, expect, it } from "vitest";
import {
  projectRestrictionError,
  projectsOutsideRestriction,
} from "../project-restriction";

describe("projectsOutsideRestriction", () => {
  // A workspace-wide role carries no restriction. Reading null as "may touch
  // nothing" would lock every unrestricted admin out of bulk operations.
  it("returns nothing when the caller has no restriction (null)", () => {
    expect(projectsOutsideRestriction(["a", "b"], null)).toEqual([]);
  });

  it("returns nothing when the caller has no restriction (undefined)", () => {
    expect(projectsOutsideRestriction(["a", "b"], undefined)).toEqual([]);
  });

  it("returns nothing when every requested project is in scope", () => {
    expect(projectsOutsideRestriction(["a", "b"], ["a", "b", "c"])).toEqual([]);
  });

  // THE bug: one out-of-scope id in a batch must block the whole request.
  it("names the projects outside the restriction", () => {
    expect(projectsOutsideRestriction(["a", "x", "y"], ["a", "b"])).toEqual([
      "x",
      "y",
    ]);
  });

  it("blocks a request made entirely of out-of-scope projects", () => {
    expect(projectsOutsideRestriction(["x"], ["a"])).toEqual(["x"]);
  });

  // An empty restriction list means "scoped to no projects", so EVERY
  // requested project is out of scope — the fail-closed reading, and the
  // opposite of the `null` case above. Note checkWorkspacePermission collapses
  // an empty projectIds array to null before returning, so this state does not
  // arise from that caller today; the helper still has to answer it safely.
  it("treats an empty restriction list as granting no projects", () => {
    expect(projectsOutsideRestriction(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("returns nothing for an empty request", () => {
    expect(projectsOutsideRestriction([], ["a"])).toEqual([]);
  });
});

describe("projectRestrictionError", () => {
  it("names the offending projects so the caller can tell which were refused", () => {
    const body = projectRestrictionError(["x", "y"]);

    expect(body.projectIds).toEqual(["x", "y"]);
    expect(body.error).toBe("No access to these projects");
  });
});
