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
  // schema.ts is the main schema; email-verification.ts holds the auth token
  // tables that live code inserts into — they were invisible to drizzle-kit
  // (and therefore missing from the database) until wired in here.
  schema: ["./src/database/schema.ts", "./src/database/schema/email-verification.ts"],
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
}) satisfies Config;
