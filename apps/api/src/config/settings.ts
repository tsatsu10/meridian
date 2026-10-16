/**
 * 🎛️ Centralized Application Settings
 *
 * Single source of truth for all application configuration.
 * ALL configuration should come from environment variables defined here.
 */
import logger from "../utils/logger";
import { DEFAULT_API_PORT } from "./default-api-port";
import { parseCorsOriginsEnv } from "./cors-origins";
import { computeEnableDemoAuthBypass } from "./demo-auth";

import "dotenv/config";

export interface AppSettings {
  // Environment
  nodeEnv: "development" | "production" | "test";
  isDemoMode: boolean;
  /**
   * Whether authentication may be bypassed for demo purposes.
   *
   * Requires DEMO_MODE, ALLOW_DEMO_AUTH_BYPASS, and an *explicit*
   * NODE_ENV of development or test. Unset NODE_ENV must not enable bypass
   * (loadSettings defaults nodeEnv to "development" for other settings —
   * that default is intentionally not used for this flag).
   */
  enableDemoAuthBypass: boolean;
  apiPort: number;
  host: string;

  // Authentication
  adminEmail: string;
  jwtSecret: string;
  encryptionKey: string;

  // Database
  databaseType: "sqlite" | "postgresql";
  databaseUrl: string;

  // Security
  corsOrigins: string[];

  // Features
  emailEnabled: boolean;
}

/**
 * Load and validate settings from environment
 */
function loadSettings(): AppSettings {
  const nodeEnv =
    (process.env.NODE_ENV as AppSettings["nodeEnv"]) || "development";
  const isDemoMode = process.env.DEMO_MODE === "true";
  const allowDemoAuthBypass = process.env.ALLOW_DEMO_AUTH_BYPASS === "true";

  const settings: AppSettings = {
    // Environment
    nodeEnv,
    isDemoMode,
    // Pass raw NODE_ENV — never the defaulted nodeEnv — so unset stays off.
    enableDemoAuthBypass: computeEnableDemoAuthBypass({
      demoMode: isDemoMode,
      allowDemoAuthBypass,
      nodeEnv: process.env.NODE_ENV,
    }),
    apiPort: Number.parseInt(
      process.env.API_PORT || String(DEFAULT_API_PORT),
      10,
    ),
    host: process.env.HOST || "localhost",

    // Authentication - SINGLE SOURCE OF TRUTH
    adminEmail: process.env.ADMIN_EMAIL || "admin@meridian.app",
    jwtSecret: process.env.JWT_SECRET || "meridian-dev-secret",
    encryptionKey: process.env.ENCRYPTION_KEY || "meridian-dev-encryption-key",

    // Database
    databaseType:
      (process.env.DATABASE_TYPE as AppSettings["databaseType"]) ||
      "postgresql",
    databaseUrl: process.env.DATABASE_URL || "",

    // Security — parseCorsOriginsEnv trims so spaced CSV entries work
    corsOrigins: parseCorsOriginsEnv(process.env.CORS_ORIGINS),

    // Features
    emailEnabled: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER),
  };

  // Validate critical settings
  if (!settings.databaseUrl) {
    logger.warn("⚠️  DATABASE_URL not set");
  }

  if (!settings.jwtSecret || settings.jwtSecret === "meridian-dev-secret") {
    if (settings.nodeEnv === "production") {
      throw new Error(
        "JWT_SECRET must be set to a strong value in production - refusing to start with the default secret",
      );
    }
    logger.warn("⚠️  Using default JWT_SECRET - not secure for production!");
  }

  if (
    !settings.encryptionKey ||
    settings.encryptionKey === "meridian-dev-encryption-key"
  ) {
    if (settings.nodeEnv === "production") {
      throw new Error(
        "ENCRYPTION_KEY must be set to a strong value in production - refusing to start with the default key",
      );
    }
    logger.warn("⚠️  Using default ENCRYPTION_KEY - not secure for production!");
  }

  return settings;
}

// Export singleton instance
export const appSettings = loadSettings();

/**
 * Helper function for backwards compatibility
 */
export function getSettings() {
  return {
    isDemoMode: appSettings.isDemoMode,
    adminEmail: appSettings.adminEmail,
  };
}

export default appSettings;
