/**
 * Widget marketplace seed — only widgets that exist in the web widget registry
 * and APIs that are still mounted.
 */

import { config } from "dotenv";
config();

import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../connection";
import {
  dashboardWidgets,
  widgetCollections,
  widgetReviews,
  widgetRatings,
  users,
} from "../schema";
import logger from "../../utils/logger";

const MERIDIAN_SYSTEM_EMAIL = "system@meridian.app";

const MARKETPLACE_WIDGETS = [
  {
    name: "OKR Tracker",
    description: "Objectives and key results for the workspace.",
    type: "card",
    category: "Goals",
    component: "okr-widget",
    defaultConfig: { period: "quarter" },
    configSchema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["month", "quarter", "year"], default: "quarter" },
      },
    },
    dataSource: "/api/goals",
    refreshInterval: 120,
    defaultSize: { width: 4, height: 5 },
    minSize: { width: 3, height: 4 },
    maxSize: { width: 6, height: 8 },
    icon: "target",
    tags: ["goals", "okr", "objectives"],
    isGlobal: true,
    isPublic: true,
    rating: "4.8",
    usageCount: 0,
    version: "1.0.0",
    isPremium: false,
    isActive: true,
  },
  {
    name: "Team Chat",
    description: "Recent messages and unread counts.",
    type: "feed",
    category: "Communication",
    component: "chat-widget",
    defaultConfig: { showUnread: true, limit: 10 },
    configSchema: { type: "object", properties: {} },
    dataSource: "/api/message",
    refreshInterval: 30,
    defaultSize: { width: 4, height: 6 },
    minSize: { width: 3, height: 4 },
    maxSize: { width: 6, height: 10 },
    icon: "message-square",
    tags: ["chat", "messages"],
    isGlobal: true,
    isPublic: true,
    rating: "4.7",
    usageCount: 0,
    version: "1.0.0",
    isPremium: false,
    isActive: true,
  },
  {
    name: "Skill Matrix",
    description: "Team skills matrix and endorsements.",
    type: "grid",
    category: "Team",
    component: "skill-matrix-widget",
    defaultConfig: { showGaps: true },
    configSchema: { type: "object", properties: {} },
    dataSource: "/api/team-awareness/skills/matrix",
    refreshInterval: 300,
    defaultSize: { width: 6, height: 6 },
    minSize: { width: 4, height: 4 },
    maxSize: { width: 8, height: 8 },
    icon: "users",
    tags: ["skills", "team"],
    isGlobal: true,
    isPublic: true,
    rating: "4.6",
    usageCount: 0,
    version: "1.0.0",
    isPremium: false,
    isActive: true,
  },
  {
    name: "Mood Analytics",
    description: "Workspace mood trends and morale.",
    type: "chart",
    category: "Team",
    component: "mood-analytics-widget",
    defaultConfig: { period: "week", anonymous: true },
    configSchema: { type: "object", properties: {} },
    dataSource: "/api/team-awareness/mood/stats",
    refreshInterval: 120,
    defaultSize: { width: 4, height: 4 },
    minSize: { width: 3, height: 3 },
    maxSize: { width: 6, height: 6 },
    icon: "smile",
    tags: ["mood", "wellbeing"],
    isGlobal: true,
    isPublic: true,
    rating: "4.5",
    usageCount: 0,
    version: "1.0.0",
    isPremium: false,
    isActive: true,
  },
  {
    name: "Security Dashboard",
    description: "Security metrics and alerts.",
    type: "card",
    category: "Security",
    component: "security-dashboard-widget",
    defaultConfig: { showAlerts: true },
    configSchema: { type: "object", properties: {} },
    dataSource: "/api/security",
    refreshInterval: 60,
    defaultSize: { width: 4, height: 5 },
    minSize: { width: 3, height: 4 },
    maxSize: { width: 6, height: 8 },
    icon: "shield",
    tags: ["security"],
    isGlobal: true,
    isPublic: true,
    rating: "4.6",
    usageCount: 0,
    version: "1.0.0",
    isPremium: false,
    isActive: true,
  },
  {
    name: "Project Health",
    description: "Project health indicators.",
    type: "metric",
    category: "Projects",
    component: "health-dashboard-widget",
    defaultConfig: { threshold: 70 },
    configSchema: { type: "object", properties: {} },
    dataSource: "/api/system-health",
    refreshInterval: 120,
    defaultSize: { width: 4, height: 4 },
    minSize: { width: 3, height: 3 },
    maxSize: { width: 6, height: 6 },
    icon: "activity",
    tags: ["health", "projects"],
    isGlobal: true,
    isPublic: true,
    rating: "4.5",
    usageCount: 0,
    version: "1.0.0",
    isPremium: false,
    isActive: true,
  },
  {
    name: "Unsplash Photo",
    description: "Photo of the day from Unsplash (requires ENABLE_GEO_WEATHER_UNSPLASH).",
    type: "media",
    category: "Content",
    component: "unsplash-photo-widget",
    defaultConfig: { defaultCategory: "random", showControls: true },
    configSchema: { type: "object", properties: {} },
    dataSource: "/api/unsplash/random",
    refreshInterval: 3600,
    defaultSize: { width: 4, height: 4 },
    minSize: { width: 3, height: 3 },
    maxSize: { width: 6, height: 6 },
    icon: "image",
    tags: ["media", "photos"],
    isGlobal: true,
    isPublic: true,
    rating: "4.4",
    usageCount: 0,
    version: "1.0.0",
    isPremium: false,
    isActive: true,
  },
  {
    name: "My Avatar",
    description: "Avatar preview and style switcher.",
    type: "card",
    category: "Profile",
    component: "dicebear-avatar-widget",
    defaultConfig: {},
    configSchema: { type: "object", properties: {} },
    dataSource: null,
    refreshInterval: 0,
    defaultSize: { width: 3, height: 3 },
    minSize: { width: 2, height: 2 },
    maxSize: { width: 4, height: 4 },
    icon: "user",
    tags: ["profile", "avatar"],
    isGlobal: true,
    isPublic: true,
    rating: "4.3",
    usageCount: 0,
    version: "1.0.0",
    isPremium: false,
    isActive: true,
  },
];

const WIDGET_COLLECTIONS = [
  {
    name: "Workspace essentials",
    description: "Goals, chat, team insights, and health",
    widgetNames: [
      "OKR Tracker",
      "Team Chat",
      "Skill Matrix",
      "Mood Analytics",
      "Project Health",
    ],
    isGlobal: true,
    isPublic: true,
    category: "Starter",
    tags: ["starter", "workspace"],
  },
];

export async function seedWidgetMarketplace() {
  await initializeDatabase();
  const db = getDatabase();

  try {
    logger.info("🏪 Starting widget marketplace seed (trimmed set)...");

    let systemUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, MERIDIAN_SYSTEM_EMAIL))
      .limit(1);

    let systemUserId: string;
    if (systemUsers.length === 0) {
      const { hashPassword } = await import("../../auth/password");
      const hashedPassword = await hashPassword("System@2024!SecurePassword");

      const [systemUser] = await db
        .insert(users)
        .values({
          email: MERIDIAN_SYSTEM_EMAIL,
          name: "Meridian System",
          password: hashedPassword,
          role: "admin",
        })
        .returning();
      systemUserId = systemUser.id;
    } else {
      systemUserId = systemUsers[0].id;
    }

    const widgetIdMap: Record<string, string> = {};

    for (const widget of MARKETPLACE_WIDGETS) {
      const widgetId = createId();
      widgetIdMap[widget.name] = widgetId;

      await db.insert(dashboardWidgets).values({
        id: widgetId,
        name: widget.name,
        description: widget.description,
        type: widget.type,
        category: widget.category,
        component: widget.component,
        defaultConfig: widget.defaultConfig,
        configSchema: widget.configSchema || null,
        dataSource: widget.dataSource ?? null,
        refreshInterval: widget.refreshInterval,
        defaultSize: widget.defaultSize,
        minSize: widget.minSize,
        maxSize: widget.maxSize,
        thumbnail: null,
        icon: widget.icon,
        isGlobal: widget.isGlobal,
        isPublic: widget.isPublic,
        workspaceId: null,
        usageCount: widget.usageCount,
        rating: widget.rating || null,
        tags: widget.tags,
        version: widget.version,
        isActive: widget.isActive,
        isPremium: widget.isPremium || false,
        createdBy: systemUserId,
      });
    }

    logger.info(`✅ Seeded ${MARKETPLACE_WIDGETS.length} marketplace widgets`);

    for (const collection of WIDGET_COLLECTIONS) {
      const widgetIds = collection.widgetNames
        .map((name) => widgetIdMap[name])
        .filter(Boolean);

      if (widgetIds.length > 0) {
        await db.insert(widgetCollections).values({
          name: collection.name,
          description: collection.description,
          workspaceId: null,
          widgetIds,
          isGlobal: collection.isGlobal,
          isPublic: collection.isPublic,
          category: collection.category,
          thumbnail: null,
          installCount: 0,
          tags: collection.tags,
          createdBy: systemUserId,
        });
      }
    }

    logger.info(`✅ Seeded ${WIDGET_COLLECTIONS.length} widget collections`);

    const topWidgets = ["OKR Tracker", "Team Chat", "Skill Matrix"];
    for (const widgetName of topWidgets) {
      const widgetId = widgetIdMap[widgetName];
      if (!widgetId) continue;

      for (const rating of [5, 5, 4, 5, 4]) {
        await db.insert(widgetRatings).values({
          widgetId,
          userEmail: MERIDIAN_SYSTEM_EMAIL,
          rating,
        });
      }

      await db.insert(widgetReviews).values({
        widgetId,
        userEmail: MERIDIAN_SYSTEM_EMAIL,
        title: "Works well",
        content: `${widgetName} integrates cleanly with the dashboard.`,
        rating: 5,
        helpfulCount: 8,
        isVerifiedInstall: true,
      });
    }

    logger.info("✅ Widget marketplace seed complete");
  } catch (error) {
    logger.error("❌ Failed to seed widget marketplace:", error);
    throw error;
  }
}
