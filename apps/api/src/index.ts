import { config } from "dotenv";
config({ path: "./.env" });
import { serveStatic } from "@hono/node-server/serve-static";
// import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Hono, type Context, type Next } from "hono";
// import { getCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
// Temporarily commenting out imports to isolate the startup issue
import analytics from "./analytics";
import teamAwareness from "./routes/team-awareness";
import attachment from "./attachment";
import reports from "./reports";
// integrations module (kept below, imported once)
// Import the new database connection system
import { getDatabase } from "./database/connection";
import label from "./label";
import { auth } from "./middlewares/auth";
import cacheHeaders from "./middlewares/cache-headers";
import notification from "./notification";
import project from "./project";
import task from "./task";
import timeEntry from "./time-entry";
import user from "./user";
import twoFactor from "./auth/routes/two-factor"; // Two-Factor Authentication
import emailVerificationRoutes from "./auth/routes/email-verification";
// import { validateSessionToken } from "./user/utils/validate-session-token";
import { appSettings } from "./config/settings";
import logger from "./utils/logger";
// import setDemoUser from "./utils/set-demo-user";
import workspaceSettings from "./workspace/settings";
import workspaceInvites from "./workspace/invites";
import workspace from "./workspace";
import workspaceUser from "./workspace-user";
import settings from "./settings";
import auditSettings from "./settings/audit";
import projectNotes from "./project-notes"; // @epic-5.1-project-notes: Project Notes System
import dashboard from "./dashboard";
import team from "./team";
import calendar from "./calendar"; // @epic-3.4-teams: Calendar and scheduling
import rbac from "./rbac";
import milestone from "./milestone";
import backlogCategory from "./backlog-category"; // Backlog categories for organizing backlog items
import profile from "./profile"; // Profile management
import smartProfile from "./routes/smart-profile"; // Smart profile features
import health from "./health"; // Phase 2.3.8: Health system API
import templates from "./templates"; // Project templates for professions
import userPreferences from "./user-preferences"; // User preferences (pinned projects, settings, etc.)
import apiKeys from "./api-keys"; // API key management (simple)
import errorReportingRoutes from "./routes/errors";
import upload from "./modules/upload"; // @epic-3.1-messaging: File upload for chat and tasks
import files from "./modules/files"; // @epic-3.1-messaging: File serving
import search from "./modules/search"; // @epic-3.1-messaging: Global search API
import systemHealth from "./modules/system-health"; // System health/readiness/liveness checks
import securityMetrics from "./security-metrics";
import monitoringRoutes from "./monitoring";
import quickCaptureRoutes from "./tasks/quick-capture"; // Security metrics and monitoring
import metricsRoutes from "./modules/metrics"; // Monitoring & metrics endpoint
import fileVersionsRoutes from "./modules/file-versions"; // File versioning API
// Removed old complex api-keys module - using simplified version
import goalsRoutes from "./goals/routes"; // @epic-goal-setting: Goals & OKRs management
import { startHttpServer } from "./server/serve-app";
import { userTable } from "./database/schema";
import { eq } from "drizzle-orm";
import favorites from "./favorites";
// 🛡️ Import error handling middleware
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";
import { DEFAULT_API_PORT } from "./config/default-api-port";
// 🔒 Import security middleware
import {
  securityHeaders,
  generalRateLimiter,
  authRateLimiter,
  sanitizeRequest,
  requestLogger,
  requestSizeLimit,
  sqlInjectionProtection,
  slowDown,
} from "./middlewares/security";

// Types are defined inline in the Hono context, no need to import User/Session

const app = new Hono<{
  Variables: {
    userEmail: string;
    userId?: string;
    workspaceId?: string;
    user?: { email: string; id: string; name?: string };
  };
}>();
// Computed centrally in config/settings.ts so that no individual router can
// define a looser "are we in demo mode" check than the app-wide auth gate.
const { isDemoMode, adminEmail, enableDemoAuthBypass } = appSettings;
// 🛡️ Register global error handler
app.onError(errorHandler);

// 🛡️ Register 404 handler
app.notFound(notFoundHandler);

// Add debug logging middleware FIRST
// app.use("*", async (c, next) => {
//   logger.debug(`🌐 API Request: ${c.req.method} ${c.req.url}`);
//   await next();
// });

// CRITICAL: Body buffering must run FIRST before CORS or any other middleware
// Body buffering is now handled at HTTP server level (see startServer function)

// 🔒 SECURITY: Apply security headers to all routes
app.use("*", securityHeaders);

// 🔒 SECURITY: Request size limit (10MB max)
app.use("*", requestSizeLimit(10 * 1024 * 1024));

// 🔒 SECURITY: SQL injection protection
app.use("*", sqlInjectionProtection);

// 🔒 SECURITY: Request sanitization
app.use("*", sanitizeRequest);

// 📊 LOGGING: Request logging for auditing
app.use("*", requestLogger);

// ⚡ Add response compression for better performance
app.use("*", compress());

// ⚡ Add caching headers for better performance
app.use("*", cacheHeaders());

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow specific origins from environment or localhost for development
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5200",
        "https://meridian.app",
        "https://www.meridian.app",
      ];

      if (allowedOrigins.includes(origin || "")) {
        return origin;
      }

      // SECURITY: this reflected ANY http://localhost:<port> origin, with
      // no environment check, combined with credentials:true below — live
      // in production too. A request whose Origin header claimed to be
      // localhost would be trusted with cookies. Dev convenience only.
      if (
        process.env.NODE_ENV !== "production" &&
        origin?.startsWith("http://localhost:")
      ) {
        return origin;
      }

      // No match: deny (return undefined) rather than defaulting to a
      // fixed dev origin, which would do the same credentialed-reflection
      // for every unmatched request in production.
      return undefined;
    },
    credentials: true,
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  }),
);

// Apply authentication middleware before routes
if (!enableDemoAuthBypass) {
  app.use("*", async (c, next) => {
    const path = c.req.path;
    const isPublicUserRoute =
      path === "/api/users/sign-in" ||
      path === "/api/users/sign-up" ||
      path === "/api/users/me" ||
      // Liveness probe only — /api/health subpaths expose project data and stay gated.
      path === "/api/health" ||
      // Completes login for 2FA-enabled accounts, reached right after
      // /sign-in withholds the session cookie — the browser has no session
      // yet at this point, so this route can't sit behind the auth gate.
      // Safe to expose: it authenticates the caller itself via the signed
      // pendingToken minted by /sign-in (see auth/utils/pending-2fa-token.ts),
      // not via a pre-existing session.
      path === "/api/auth/two-factor/verify-login" ||
      path === "/api/2fa/verify-login";

    // Allow unauthenticated access to auth bootstrap endpoints.
    if (isPublicUserRoute) {
      await next();
      return;
    }

    await auth(c, next);
  });
  logger.info("🔐 Authentication middleware enabled");
} else {
  // Demo mode middleware - set admin user for all requests
  logger.warn("⚠️ Demo auth bypass enabled for local/test environment");
  app.use("*", async (c, next) => {
    // Use the configured admin email from settings
    c.set("userEmail", adminEmail);

    // Look up userId for the admin user
    try {
      // Import database connection dynamically
      const { getDatabase } = await import("./database/connection");
      let db: ReturnType<typeof getDatabase>;
      try {
        db = getDatabase();
      } catch (dbError) {
        // Continue without userId - the endpoint should handle this gracefully
        await next();
        return;
      }

      if (!db) {
        // Continue without userId - the endpoint should handle this gracefully
        await next();
        return;
      }

      const users = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.email, adminEmail))
        .limit(1);

      if (users.length > 0 && users[0]) {
        c.set("userId", users[0].id);
      }
    } catch (error) {
      logger.error("Error looking up admin user in demo mode:", error);
      // Continue without userId - let the endpoint handle missing user gracefully
    }

    await next();
  });
}

// Database readiness middleware
const databaseMiddleware = async (c: Context, next: Next) => {
  if (!databaseReady) {
    logger.debug("⏳ Database not ready yet, waiting...");
    // Wait for database to be ready
    let attempts = 0;
    while (!databaseReady && attempts < 30) {
      // Wait up to 30 seconds
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!databaseReady) {
      logger.error("❌ Database initialization timeout");
      return c.json(
        { error: "Database not ready. Please try again later." },
        503,
      );
    }
  }

  await next();
};

// Apply database readiness middleware to all API routes
app.use("/api/*", databaseMiddleware);

// 🔒 SECURITY: Apply general rate limiting to all API routes
app.use("/api/*", generalRateLimiter);

// 🔒 SECURITY: Apply slow-down to prevent abuse
app.use("/api/*", slowDown.middleware);

// Define route handlers with consistent /api/ prefix
const userRoute = app.route("/api/users", user);
const twoFactorRoute = app.route("/api/auth/two-factor", twoFactor); // 2FA endpoints
const authEmailVerificationRoute = app.route(
  "/api/auth",
  emailVerificationRoutes,
); // Email verification endpoints
const workspaceRoute = app.route("/api/workspaces", workspace);
const workspaceUserRoute = app.route("/api/workspace-user", workspaceUser);
const projectRoute = app.route("/api/projects", project);
const taskRoute = app.route("/api/tasks", task);
const teamAwarenessRoute = app.route("/api/team-awareness", teamAwareness);
const attachmentRoute = app.route("/api/attachment", attachment);
const timeEntryRoute = app.route("/api/time-entry", timeEntry);
const labelRoute = app.route("/api/label", label);
const notificationRoute = app.route("/api/notification", notification);
const settingsRoute = app.route("/api/settings", settings);
const auditSettingsRoute = app.route("/api/settings/audit", auditSettings);
const projectNotesRoute = app.route("/api/project-notes", projectNotes); // @epic-5.1-project-notes: Project Notes API
const dashboardRoute = app.route("/api/dashboard", dashboard);
const teamRoute = app.route("/api/team", team);
const favoritesRoute = app.route("/api/favorites", favorites);
const calendarRoute = app.route("/api/calendar", calendar); // @epic-3.4-teams: Calendar and scheduling
const rbacRoute = app.route("/api/rbac", rbac);
const milestoneRoute = app.route("/api/milestone", milestone);
const reportsRoute = app.route("/api/reports", reports);
// Removed old integrations route (duplicate) - using newer simple version above
const backlogCategoryRoute = app.route(
  "/api/backlog-categories",
  backlogCategory,
); // Backlog categories
const backlogThemeRoute = app.route("/api/backlog-themes", backlogCategory); // Backward compatibility alias
const profileRoute = app.route("/api/profile", profile); // Profile management
const smartProfileRoute = app.route("/api/smart-profile", smartProfile); // Smart profile features
const analyticsRoute = app.route("/api/analytics", analytics); // @epic-3.1-analytics: Project and workspace analytics
const healthRoute = app.route("/api/health", health); // Phase 2.3.8: Health system API
const templatesRoute = app.route("/api/templates", templates); // Project templates for professions
const userPreferencesRoute = app.route(
  "/api/user-preferences",
  userPreferences,
); // User preferences (pinned projects, settings, etc.)
const apiKeysRoute = app.route("/api/api-keys", apiKeys); // API key management
const errorReportingRoute = app.route("/api/errors", errorReportingRoutes);
const uploadRoute = app.route("/api/upload", upload); // @epic-3.1-messaging: File upload
const filesRoute = app.route("/api/files", files); // @epic-3.1-messaging: File serving
const searchRoute = app.route("/api/search", search); // @epic-3.1-messaging: Global search
const workspaceSettingsRoute = app.route(
  "/api/workspace/settings",
  workspaceSettings,
);
const workspaceInvitesRoute = app.route(
  "/api/workspace/invites",
  workspaceInvites,
);
const systemHealthRoute = app.route("/api/system-health", systemHealth); // System health/readiness/liveness probes
const securityMetricsRoute = app.route("/api/security", securityMetrics);
const monitoringRoute = app.route("/api/monitoring", monitoringRoutes);
const quickCaptureRoute = app.route(
  "/api/tasks/quick-capture",
  quickCaptureRoutes,
); // Security metrics and monitoring
const metricsRoute = app.route("/api/metrics", metricsRoutes); // Monitoring & metrics (Prometheus compatible)
const fileVersionsRoute = app.route("/api/file-versions", fileVersionsRoutes); // File versioning API
// Removed duplicate api-keys route - using /api/settings/api-keys instead
const goalsRoute = app.route("/api/goals", goalsRoutes); // @epic-goal-setting: Goals & OKRs management
// Favorites: use `/api/favorites` only (web uses API_BASE_URL `/api/...`). Legacy `/favorites` mount removed.

// @epic-2.1-files: Serve uploaded files (e.g. profile pictures).
//
// This was commented out, which meant an upload's returned
// /uploads/profile-pictures/... URL always 404'd and the image never rendered.
//
// These are user-supplied files, so they are served defensively: nosniff stops
// the browser inferring an active content type, and the CSP sandbox neutralises
// anything that does get interpreted as a document (e.g. SVG or HTML). Requests
// still pass through the global auth middleware above, so uploads are not
// publicly enumerable.
app.use("/uploads/*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Content-Security-Policy", "default-src 'none'; sandbox");
  c.header("Cross-Origin-Resource-Policy", "same-site");
});

app.use("/uploads/*", serveStatic({ root: "./" }));

// Database ready flag
let databaseReady = false;

// Initialize database with migrations
async function initializeDatabase() {
  try {
    logger.debug("🗄️  Initializing database...");

    // Import and initialize the database connection
    const { initializeDatabase: initDb } = await import(
      "./database/connection"
    );

    // Initialize the database connection first
    logger.debug("⏳ Calling initDb()...");
    await initDb();
    logger.debug("✅ initDb() completed");

    // Skip migrations - schema is managed with drizzle-kit push
    logger.debug(
      "ℹ️  Using drizzle-kit push for schema management (no migrations)",
    );

    // Ensure admin user exists in demo mode
    if (isDemoMode) {
      try {
        logger.info("Ensuring admin user exists...");
        // Import ensureAdminUser after database is initialized
        const { ensureAdminUser } = await import("./utils/ensure-admin-user");
        await ensureAdminUser();
        logger.info("Admin user verified");
      } catch (adminError) {
        logger.error("Failed to ensure admin user:", adminError);
        throw adminError;
      }
    }

    databaseReady = true;
    logger.info("Database initialization complete, ready to serve requests");
  } catch (error) {
    logger.error("❌ Database initialization failed:", error);
    logger.error(
      "Error details:",
      error instanceof Error ? error.message : String(error),
    );
    logger.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    throw error;
  }
}

// Start the server with proper async handling
async function startServer() {
  try {
    const port = Number(process.env.API_PORT) || DEFAULT_API_PORT;

    logger.debug(`🚀 Starting HTTP server on port ${port}...`);

    // Serve the Hono app. Body handling is deliberately left to
    // @hono/node-server — the previous hand-rolled createServer buffered
    // bodies itself and only did so for "application/json", which meant every
    // multipart upload reached Hono with no body at all (500 "Failed to parse
    // body as FormData") and any binary payload was corrupted by being
    // buffered as a UTF-8 string. See server/serve-app.ts.
    startHttpServer(app, port, () => {
      logger.debug(`🏃 Server is running at http://localhost:${port}`);

      // Phase 2: Start digest schedulers
      try {
        const {
          digestScheduler,
        } = require("./notification/services/digest-scheduler");
        digestScheduler.start();
        logger.debug("📅 Digest schedulers initialized");
      } catch (error) {
        logger.error("⚠️ Failed to start digest schedulers:", error);
      }

      // Phase 2: Start alert rule scheduler
      try {
        const {
          ruleScheduler,
        } = require("./notification/services/rules/rule-scheduler");
        ruleScheduler.start();
        logger.debug("🔔 Alert rule scheduler initialized");
      } catch (error) {
        logger.error("⚠️ Failed to start alert rule scheduler:", error);
      }

      // @epic-4.1-analytics: Start scheduled analytics reports scheduler
      try {
        const { scheduledReportsScheduler } = require("./reports/scheduler");
        scheduledReportsScheduler.start();
        logger.debug("📊 Scheduled reports scheduler initialized");
      } catch (error) {
        logger.error("⚠️ Failed to start scheduled reports scheduler:", error);
      }
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Add a simple health endpoint
// Health check endpoint moved to /api/health route (see healthRoute above)

// Add a simple /api/user/me endpoint for development
app.get("/api/user/me", (c) => {
  return c.json({
    id: "demo-user-id",
    email: "admin@meridian.app",
    name: "Demo Admin User",
    role: "admin",
    avatar: null,
    timezone: "UTC",
    language: "en",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

// Temporarily commenting out debug auth endpoint to isolate startup issues
// app.get("/debug/auth", async (c) => {
//   logger.debug("🔍 Debug auth endpoint called");

//   const sessionCookie = getCookie(c, "session");
//   const userEmail = c.get("userEmail");

//   logger.debug("Session cookie:", sessionCookie ? "EXISTS" : "MISSING");
//   logger.debug("UserEmail from context:", userEmail || "NOT SET");

//   if (!sessionCookie) {
//     return c.json({
//       status: "NO_SESSION_COOKIE",
//       message: "No session cookie found",
//       userEmail: userEmail || null,
//       authenticated: !!userEmail,
//       demoMode: isDemoMode
//     });
//   }

//   const { session, user } = await validateSessionToken(sessionCookie);

//   if (!session || !user) {
//     return c.json({
//       status: "INVALID_SESSION",
//       message: "Session token is invalid or expired",
//       userEmail: userEmail || null,
//       authenticated: false,
//       demoMode: isDemoMode
//     });
//   }

//   return c.json({
//     status: "VALID_SESSION",
//     message: "Session is valid",
//     userEmail: (user as any)?.email || "",
//     userName: (user as any)?.name || "",
//     expiresAt: (session as any)?.expiresAt || new Date(),
//     authenticated: true,
//     demoMode: isDemoMode
//   });
// });

// Backward compatibility aliases for old singular routes
// These ensure existing frontend code continues to work
app.route("/api/project", project); // Alias for /api/projects
app.route("/api/task", task); // Alias for /api/tasks
app.route("/api/workspace", workspace); // Alias for /api/workspaces
app.route("/api/user", user); // Alias for /api/users
app.route("/api/workspace-users", workspaceUser); // Alias for /api/workspace-user (plural support)
app.route("/api/teams", team); // Alias for /api/team (plural support)
app.route("/api/2fa", twoFactor); // Alias for legacy /api/2fa frontend calls

// Initialize database and start the server
(async () => {
  try {
    logger.debug("🚀 Starting server initialization...");

    // 🔒 CRITICAL SECURITY: Guard demo auth bypass.
    if (isDemoMode && !enableDemoAuthBypass) {
      logger.warn(
        "⚠️ DEMO_MODE is true, but auth bypass is disabled. Set ALLOW_DEMO_AUTH_BYPASS=true in development/test to enable bypass.",
      );
    }
    if (process.env.NODE_ENV === "production" && isDemoMode) {
      logger.error(
        "❌ FATAL SECURITY ERROR: DEMO_MODE cannot be enabled in production",
      );
      logger.error(
        "SECURITY VIOLATION: Attempted to start production server with DEMO_MODE=true",
      );
      process.exit(1);
    }
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_DEMO_AUTH_BYPASS === "true"
    ) {
      logger.error(
        "❌ FATAL SECURITY ERROR: ALLOW_DEMO_AUTH_BYPASS cannot be enabled in production",
      );
      process.exit(1);
    }

    await initializeDatabase();
    logger.debug("✅ Database initialized");

    await startServer();
    logger.debug("✅ Server started successfully");
  } catch (error) {
    logger.error("❌ Failed to initialize application:", error);
    logger.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    process.exit(1);
  }
})();

export default app;

export type AppType = typeof userRoute;
