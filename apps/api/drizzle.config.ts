import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { type Config, defineConfig } from "drizzle-kit";

// Load apps/api/.env even if drizzle-kit’s cwd differs from apps/api
const configDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(configDir, ".env") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) {
  throw new Error(
    "DATABASE_URL is missing. Set it in apps/api/.env (copy from .env.example).",
  );
}
if (databaseUrl.includes("YOUR_PASSWORD")) {
  throw new Error(
    'DATABASE_URL still contains the placeholder YOUR_PASSWORD. Edit apps/api/.env and set the real password for PostgreSQL user "postgres" (the one you use in psql). If your password has @ or : characters, URL-encode them (e.g. @ → %40).',
  );
}

export default defineConfig({
  out: "./drizzle",
  // These two entries cover all 111 tables — do NOT add the other
  // src/database/schema/*.ts subfiles here.
  //
  // schema.ts is the main schema AND a barrel: it re-exports rbac-unified,
  // files, goals, team-awareness and smart-profile (see its `export *` lines),
  // and drizzle-kit follows those re-exports, so those subfiles' tables are
  // already picked up. Listing them again would define the same SQL tables
  // twice and drizzle-kit errors out — team-awareness.ts is the sharpest edge,
  // since its kudos/user_skills/user_status share table names with schema.ts's
  // own locals.
  //
  // email-verification.ts is NOT re-exported by the barrel, so it needs its
  // own entry — its auth token tables were invisible to drizzle-kit (and
  // therefore missing from the database) until wired in here.
  //
  // tasks.ts and users.ts are deliberately absent: they duplicate schema.ts's
  // users/tasks tables and exist only so files.ts can reference them as FK
  // targets without importing the whole barrel (a circular-import workaround).
  schema: [
    "./src/database/schema.ts",
    "./src/database/schema/email-verification.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
}) satisfies Config;
