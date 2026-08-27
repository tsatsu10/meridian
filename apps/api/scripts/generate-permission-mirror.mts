/**
 * Regenerates apps/web/src/lib/permissions/backend-matrix.generated.ts from
 * this app's ROLE_PERMISSIONS, which is the authority for what the server
 * actually enforces.
 *
 * Run after changing src/constants/rbac.ts:
 *
 *   npx tsx scripts/generate-permission-mirror.mts
 *
 * The web app composes its matrix as
 * BASE_PERMISSIONS -> FRONTEND_ONLY_ROLE_PERMISSIONS -> BACKEND_ROLE_PERMISSIONS,
 * so the backend layer wins every shared key. Frontend-only keys (chat, video,
 * billing, dashboards — things the backend has no concept of) are read back
 * out of the existing generated file so regeneration never drops them.
 *
 * src/constants/__tests__/frontend-permission-parity.test.ts fails if this
 * file is stale.
 */

import fs from "node:fs";
import path from "node:path";
import { ROLE_PERMISSIONS } from "../src/constants/rbac";
import { FRONTEND_ONLY_ROLE_PERMISSIONS } from "../../web/src/lib/permissions/backend-matrix.generated";

const OUT = path.join(
  "..",
  "web",
  "src",
  "lib",
  "permissions",
  "backend-matrix.generated.ts",
);

const roles = Object.keys(
  ROLE_PERMISSIONS,
) as (keyof typeof ROLE_PERMISSIONS)[];

const backendKeys = [
  ...new Set(
    roles.flatMap((role) =>
      Object.keys(ROLE_PERMISSIONS[role] as Record<string, boolean>),
    ),
  ),
].sort();

const frontendOnlyKeys = [
  ...new Set(
    Object.values(FRONTEND_ONLY_ROLE_PERMISSIONS).flatMap((permissions) =>
      Object.keys(permissions),
    ),
  ),
]
  .filter((key) => !backendKeys.includes(key))
  .sort();

function literal(entries: [string, boolean][]): string {
  return entries.map(([k, v]) => `    ${k}: ${v},`).join("\n");
}

function block(
  pick: (role: (typeof roles)[number]) => [string, boolean][],
): string {
  return roles
    .map((role) => `  ${JSON.stringify(role)}: {\n${literal(pick(role))}\n  },`)
    .join("\n");
}

const backend = block((role) => {
  const source = ROLE_PERMISSIONS[role] as Record<string, boolean>;
  return backendKeys.map((key) => [key, source[key] === true]);
});

const frontendOnly = block((role) => {
  const source = (FRONTEND_ONLY_ROLE_PERMISSIONS[role] ?? {}) as Record<
    string,
    boolean
  >;
  return frontendOnlyKeys.map((key) => [key, source[key] === true]);
});

const contents = `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 * Regenerate with: apps/api > npx tsx scripts/generate-permission-mirror.mts
 *
 * \`BACKEND_ROLE_PERMISSIONS\` mirrors apps/api/src/constants/rbac.ts, which is
 * the authority: it is what the server actually enforces. The web app used to
 * keep its own hand-maintained copy of this matrix and the two drifted badly —
 * 290 disagreements across 11 roles, 231 of them cases where the UI offered an
 * action the server would refuse. That is the misleading-UI bug class this
 * codebase has already hit more than once.
 *
 * \`FRONTEND_ONLY_ROLE_PERMISSIONS\` holds the ${frontendOnlyKeys.length} keys the web app defines
 * that the backend has no concept of (chat, video, billing, dashboards). They
 * are preserved across regeneration and gate UI-only affordances; nothing on
 * the server reads them.
 *
 * A drift test in
 * apps/api/src/constants/__tests__/frontend-permission-parity.test.ts fails if
 * this file falls out of sync.
 */

import type { UserRole } from "./types";

export const BACKEND_ROLE_PERMISSIONS: Record<
  UserRole,
  Record<string, boolean>
> = {
${backend}
};

export const FRONTEND_ONLY_ROLE_PERMISSIONS: Record<
  UserRole,
  Record<string, boolean>
> = {
${frontendOnly}
};
`;

fs.writeFileSync(OUT, contents);
console.log(
  `regenerated ${OUT}: ${roles.length} roles, ${backendKeys.length} backend keys, ${frontendOnlyKeys.length} frontend-only keys`,
);
