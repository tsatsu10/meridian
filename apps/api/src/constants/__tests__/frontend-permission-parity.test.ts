/**
 * The web app must agree with the server about who can do what.
 *
 * apps/web kept a hand-maintained copy of the role→permission matrix, and it
 * drifted to 290 disagreements across the 11 roles. 231 of those were cases
 * where the UI granted a permission the server denies — the app offering
 * buttons for actions that would be refused, which is the misleading-UI bug
 * class this codebase has hit repeatedly (see the RBAC provider force-override
 * and the hooks.ts gating bug).
 *
 * The web matrix is now composed so the backend layer is applied last and
 * always wins, from a generated mirror of this file. These tests fail if the
 * mirror falls out of sync — regenerate it after changing ROLE_PERMISSIONS.
 *
 * The web app additionally defines UI-only permission keys (chat, video,
 * billing, dashboards) that the backend has no concept of. Those are expected
 * and are deliberately NOT asserted here; nothing on the server reads them.
 */

import { describe, expect, it } from "vitest";
import { ROLE_HIERARCHY, ROLE_PERMISSIONS } from "../rbac";
import {
  BACKEND_ROLE_PERMISSIONS,
  FRONTEND_ONLY_ROLE_PERMISSIONS,
} from "../../../../web/src/lib/permissions/backend-matrix.generated";
import {
  ROLE_HIERARCHY as WEB_ROLE_HIERARCHY,
  ROLE_PERMISSIONS as WEB_ROLE_PERMISSIONS,
} from "../../../../web/src/lib/permissions/definitions";

const ROLES = Object.keys(
  ROLE_PERMISSIONS,
) as (keyof typeof ROLE_PERMISSIONS)[];

const BACKEND_KEYS = [
  ...new Set(
    ROLES.flatMap((role) =>
      Object.keys(ROLE_PERMISSIONS[role] as Record<string, boolean>),
    ),
  ),
].sort();

describe("web/API permission parity", () => {
  it("covers every backend role", () => {
    expect(Object.keys(BACKEND_ROLE_PERMISSIONS).sort()).toEqual(
      [...ROLES].sort(),
    );
  });

  // The generated mirror must be a faithful copy. If this fails, the mirror is
  // stale — regenerate it rather than editing it by hand.
  it("the generated mirror matches the backend matrix exactly", () => {
    for (const role of ROLES) {
      const backend = ROLE_PERMISSIONS[role] as Record<string, boolean>;
      const mirrored = BACKEND_ROLE_PERMISSIONS[role];

      for (const key of BACKEND_KEYS) {
        expect(
          mirrored[key] === true,
          `${role}.${key}: backend=${backend[key] === true}, mirror=${mirrored[key] === true}`,
        ).toBe(backend[key] === true);
      }
    }
  });

  // The composed matrix the UI actually reads. This is the assertion that
  // matters: it is what gates buttons and menu items.
  it("the web matrix grants exactly what the backend grants, for every shared key", () => {
    const disagreements: string[] = [];

    for (const role of ROLES) {
      const backend = ROLE_PERMISSIONS[role] as Record<string, boolean>;
      const web = WEB_ROLE_PERMISSIONS[role] as unknown as Record<
        string,
        boolean
      >;

      for (const key of BACKEND_KEYS) {
        const server = backend[key] === true;
        const ui = web[key] === true;
        if (server !== ui) {
          disagreements.push(
            `${role}.${key}: server=${server}, ui=${ui}${
              ui && !server ? "  <-- UI offers what the server denies" : ""
            }`,
          );
        }
      }
    }

    expect(disagreements, disagreements.join("\n")).toEqual([]);
  });

  it("keeps the frontend-only keys disjoint from the backend's", () => {
    const frontendOnly = new Set(
      Object.values(FRONTEND_ONLY_ROLE_PERMISSIONS).flatMap((permissions) =>
        Object.keys(permissions),
      ),
    );

    const overlap = [...frontendOnly].filter((key) =>
      BACKEND_KEYS.includes(key),
    );

    // An overlapping key would be silently overridden by the backend layer,
    // making the frontend-only entry a lie about what the UI does.
    expect(
      overlap,
      `these keys exist on both sides: ${overlap.join(", ")}`,
    ).toEqual([]);
  });

  // hasMinimumRole() on the web reads its own copy of the ladder. A mismatch
  // means the UI gates features at a different rank than requireRole does.
  it("the role hierarchies agree", () => {
    expect(WEB_ROLE_HIERARCHY).toEqual(ROLE_HIERARCHY);
  });

  // Guards the ordering rule itself: a read-only role must never outrank a
  // role that can write at the same scope.
  it("no viewer outranks a manager", () => {
    expect(ROLE_HIERARCHY["project-viewer"]).toBeLessThan(
      ROLE_HIERARCHY["project-manager"],
    );
    expect(ROLE_HIERARCHY["project-viewer"]).toBeLessThan(
      ROLE_HIERARCHY["team-lead"],
    );
    expect(ROLE_HIERARCHY["workspace-viewer"]).toBeLessThan(
      ROLE_HIERARCHY["workspace-manager"],
    );
    expect(ROLE_HIERARCHY["workspace-viewer"]).toBeLessThan(
      ROLE_HIERARCHY["project-manager"],
    );
  });
});
