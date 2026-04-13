// Test critical imports step by step
import { config } from "dotenv";
config();

console.log("✅ 1. dotenv loaded");

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

console.log("✅ 2. Hono imports loaded");

import { eq } from "drizzle-orm";
import db from "./src/database";
import { users, userTable } from "./src/database/schema-minimal";

console.log("✅ 3. Database imports loaded");

import getSettings from "./src/utils/get-settings";

console.log("✅ 4. Settings loaded");

const { isDemoMode } = getSettings();
console.log(`✅ 5. Demo mode: ${isDemoMode}`);

const app = new Hono();

app.use("*", cors({
  credentials: true,
  origin: (origin) => origin || "*",
}));

console.log("✅ 6. Basic app setup complete");

// Test basic endpoints
app.get("/", (c) => c.json({ message: "Core server works", demoMode: isDemoMode }));
app.get("/test", (c) => c.json({ message: "Test endpoint works" }));

console.log("✅ 7. Basic routes registered");

// Now try to start the server
serve({
  fetch: app.fetch,
  port: 1337,
}, (info) => {
  console.log(`🚀 Core server running at http://localhost:${info.port}`);
});