// @epic-3.2-settings: Demo data seeder for settings audit logging
import { getDatabase } from "../database/connection";
import { settingsAuditLogTable, userSettingsTable } from "../database/schema";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import logger from '../utils/logger';

export async function seedSettingsDemo() {
  const db = getDatabase();
  const demoUserEmail = "demo@example.com";
  
  try {
    // Clear existing demo data
    await db.delete(settingsAuditLogTable).where(eq(settingsAuditLogTable.userEmail, demoUserEmail));
    await db.delete(userSettingsTable).where(eq(userSettingsTable.userEmail, demoUserEmail));

    // Seed demo settings
    const demoSettings = [
      {
        userEmail: demoUserEmail,
        section: "appearance",
        settings: JSON.stringify({
          theme: "dark",
          fontSize: 16,
          sidebarCollapsed: false,
          density: "comfortable",
          animations: true,
          soundEffects: false,
          highContrast: false,
          reducedMotion: false,
          compactMode: false,
        }),
        version: 3,
        deviceId: "device_demo_123",
      },
      {
        userEmail: demoUserEmail,
        section: "notifications",
        settings: JSON.stringify({
          email: {
            taskAssigned: true,
            taskCompleted: true,
            taskOverdue: true,
            projectUpdates: false,
            teamInvitations: true,
            weeklyDigest: false,
            mentions: true,
            comments: true,
          },
          push: {
            taskAssigned: true,
            taskCompleted: false,
            taskOverdue: true,
            mentions: true,
            comments: false,
            directMessages: true,
            projectUpdates: false,
          },
          inApp: {
            taskAssigned: true,
            taskCompleted: true,
            taskOverdue: true,
            mentions: true,
            comments: true,
            directMessages: true,
            projectUpdates: true,
            teamActivity: false,
          },
          soundEnabled: false,
        }),
        version: 2,
        deviceId: "device_demo_456",
      },
    ];

    await db.insert(userSettingsTable).values(demoSettings);

    // Seed demo audit logs
    const now = new Date();
    const demoAuditLogs = [
      {
        userEmail: demoUserEmail,
        action: "UPDATE",
        section: "appearance",
        changes: JSON.stringify({
          theme: { from: "light", to: "dark" },
          fontSize: { from: 14, to: 16 },
        }),
        metadata: JSON.stringify({
          ip: "192.168.1.100",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
          sessionId: "session_demo_123",
        }),
        createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      },
      {
        userEmail: demoUserEmail,
        action: "PRESET_APPLIED",
        section: null,
        changes: JSON.stringify({
          presetId: "sarah-pm",
          presetName: "Sarah (PM)",
          customizations: {},
        }),
        metadata: JSON.stringify({
          ip: "192.168.1.100",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          sessionId: "session_demo_456",
        }),
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        userEmail: demoUserEmail,
        action: "UPDATE",
        section: "notifications",
        changes: JSON.stringify({
          "email.weeklyDigest": { from: true, to: false },
          "inApp.teamActivity": { from: true, to: false },
          soundEnabled: { from: true, to: false },
        }),
        metadata: JSON.stringify({
          ip: "10.0.0.50",
          userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
          sessionId: "session_demo_789",
        }),
        createdAt: new Date(now.getTime() - 30 * 60 * 1000),
      },
      {
        userEmail: demoUserEmail,
        action: "RESET",
        section: "security",
        changes: JSON.stringify({
          twoFactorEnabled: { from: true, to: false },
          loginNotifications: { from: false, to: true },
          sessionTimeout: { from: false, to: true },
          deviceTracking: { from: false, to: true },
          suspiciousActivityAlerts: { from: false, to: true },
        }),
        metadata: JSON.stringify({
          ip: "192.168.1.100",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          sessionId: "session_demo_abc",
        }),
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        userEmail: demoUserEmail,
        action: "EXPORT",
        section: null,
        changes: JSON.stringify({
          format: "json",
          sections: "all",
          filename: "meridian-settings-2024-01-15.json",
        }),
        metadata: JSON.stringify({
          ip: "192.168.1.100",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: "session_demo_def",
        }),
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        userEmail: demoUserEmail,
        action: "UPDATE",
        section: "profile",
        changes: JSON.stringify({
          name: { from: "Demo User", to: "Demo Meridian User" },
          jobTitle: { from: "", to: "Product Manager" },
          company: { from: "", to: "Meridian Inc." },
        }),
        metadata: JSON.stringify({
          ip: "203.0.113.42",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
          timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          sessionId: "session_demo_mobile",
        }),
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
    ];

    await db.insert(settingsAuditLogTable).values(demoAuditLogs);

    logger.debug("✅ Settings demo data seeded successfully");
    return true;
  } catch (error) {
    logger.error("❌ Failed to seed settings demo data:", error);
    return false;
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedSettingsDemo().then(() => process.exit(0));
} 
