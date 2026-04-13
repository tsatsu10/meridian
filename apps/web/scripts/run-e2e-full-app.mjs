/**
 * Full-stack E2E: starts apps/api + Vite (via playwright.config webServer), then runs all specs under e2e/.
 *
 * Prerequisites:
 * - DATABASE_URL and JWT_SECRET (see apps/api/.env.example)
 * - Optional: API_PORT (default 3005), PLAYWRIGHT_BASE_URL (default http://localhost:5174)
 *
 * Usage: from apps/web → node scripts/run-e2e-full-app.mjs
 *        extra args are forwarded: node scripts/run-e2e-full-app.mjs e2e/full-system-journey.spec.ts
 */
import { spawnSync } from "node:child_process";

process.env.PLAYWRIGHT_START_API = "1";

const extra = process.argv.slice(2);
const args = ["playwright", "test", ...extra];

const r = spawnSync("npx", args, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(r.status ?? 1);
