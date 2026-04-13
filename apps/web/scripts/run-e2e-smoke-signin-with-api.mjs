import { spawnSync } from "node:child_process";

process.env.PLAYWRIGHT_START_API = "1";

const r = spawnSync(
  "npx",
  ["playwright", "test", "e2e/smoke-sign-in.spec.ts", "--project=chromium"],
  { stdio: "inherit", shell: true, env: process.env },
);

process.exit(r.status ?? 1);
