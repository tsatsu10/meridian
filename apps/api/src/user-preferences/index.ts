import { Hono } from "hono";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getDatabase } from "../database/connection";
import { userPreferencesTable, users } from "../database/schema";
import { eq } from "drizzle-orm";
import logger from "../utils/logger";
import { requireSelf } from "./utils/require-self";

const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_BACKGROUND_DIMENSION = 2560; // Plenty for a full-bleed desktop background

const app = new Hono();

// Get user preferences
app.get("/", async (c) => {
  try {
    const { userEmail, workspaceId } = c.req.query();

    const auth = requireSelf(c, userEmail);
    if (!auth.ok) {
      return auth.response;
    }
    const ownerEmail = auth.userEmail;

    const db = getDatabase();

    // First, get the user ID from email
    const user = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get user preferences
    const preferences = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, user.id),
    });

    if (!preferences) {
      // Return default preferences if none exist
      return c.json({
        pinnedProjects: [],
        dashboardLayout: {},
        theme: "system",
        notifications: {},
        settings: {},
      });
    }

    return c.json(preferences);
  } catch (error) {
    logger.error("Error fetching user preferences:", error);
    return c.json({ error: "Failed to fetch preferences" }, 500);
  }
});

// Update user preferences (upsert)
app.post("/", async (c) => {
  logger.debug("[User Preferences] POST request received");
  logger.debug(
    "[User Preferences] Content-Type:",
    c.req.header("Content-Type"),
  );
  logger.debug(
    "[User Preferences] Content-Length:",
    c.req.header("Content-Length"),
  );
  logger.debug("[User Preferences] Method:", c.req.method);

  try {
    // Get cached body from parent middleware
    // Body is properly passed from HTTP server level
    const body = await c.req.json();
    logger.debug(
      "[User Preferences] ✅ Body parsed successfully:",
      JSON.stringify(body, null, 2),
    );

    const {
      userEmail,
      pinnedProjects,
      dashboardLayout,
      theme,
      notifications,
      settings,
    } = body;

    const auth = requireSelf(c, userEmail);
    if (!auth.ok) {
      return auth.response;
    }
    const ownerEmail = auth.userEmail;

    logger.debug("[User Preferences] Looking up user by email:", userEmail);

    const db = getDatabase();

    // First, get the user ID from email
    const user = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail),
    });

    if (!user) {
      logger.error("[User Preferences] User not found for email:", userEmail);
      return c.json({ error: "User not found" }, 404);
    }

    logger.debug("[User Preferences] Found user", {
      id: user.id,
      email: user.email,
    });

    // Check if preferences exist
    const existing = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, user.id),
    });

    logger.debug(
      "[User Preferences] Existing preferences:",
      existing ? "found" : "not found",
    );

    if (existing) {
      // Update existing preferences
      logger.debug(
        "[User Preferences] Updating existing preferences for user:",
        user.id,
      );
      const updated = await db
        .update(userPreferencesTable)
        .set({
          pinnedProjects:
            pinnedProjects !== undefined
              ? pinnedProjects
              : existing.pinnedProjects,
          dashboardLayout:
            dashboardLayout !== undefined
              ? dashboardLayout
              : existing.dashboardLayout,
          theme: theme || existing.theme,
          notifications:
            notifications !== undefined
              ? notifications
              : existing.notifications,
          settings: settings !== undefined ? settings : existing.settings,
          updatedAt: new Date(),
        })
        .where(eq(userPreferencesTable.userId, user.id))
        .returning();

      logger.debug("[User Preferences] Successfully updated preferences");
      return c.json(updated[0]);
    }
    // Create new preferences
    logger.debug(
      "[User Preferences] Creating new preferences for user:",
      user.id,
    );
    const created = await db
      .insert(userPreferencesTable)
      .values({
        userId: user.id,
        pinnedProjects: pinnedProjects || [],
        dashboardLayout: dashboardLayout || {},
        theme: theme || "system",
        notifications: notifications || {},
        settings: settings || {},
      })
      .returning();

    logger.debug("[User Preferences] Successfully created preferences");
    return c.json(created[0]);
  } catch (error) {
    logger.error("Error updating user preferences:", error);
    return c.json({ error: "Failed to update preferences" }, 500);
  }
});

// Toggle project pin (helper endpoint)
app.post("/toggle-pin", async (c) => {
  try {
    const { userEmail, projectId } = await c.req.json();

    const auth = requireSelf(c, userEmail);
    if (!auth.ok) {
      return auth.response;
    }
    const ownerEmail = auth.userEmail;

    if (!projectId) {
      return c.json({ error: "Missing projectId" }, 400);
    }

    const db = getDatabase();

    // First, get the user ID from email
    const user = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get current preferences
    const existing = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, user.id),
    });

    let currentPinned: string[] = [];

    if (existing?.pinnedProjects) {
      currentPinned = Array.isArray(existing.pinnedProjects)
        ? existing.pinnedProjects
        : [];
    }

    // Toggle the project ID
    const newPinned = currentPinned.includes(projectId)
      ? currentPinned.filter((id: string) => id !== projectId)
      : [...currentPinned, projectId];

    if (existing) {
      // Update existing
      const updated = await db
        .update(userPreferencesTable)
        .set({
          pinnedProjects: newPinned,
          updatedAt: new Date(),
        })
        .where(eq(userPreferencesTable.userId, user.id))
        .returning();

      return c.json({
        pinnedProjects: updated[0]?.pinnedProjects ?? newPinned,
        isPinned: newPinned.includes(projectId),
      });
    }
    // Create new
    const created = await db
      .insert(userPreferencesTable)
      .values({
        userId: user.id,
        pinnedProjects: newPinned,
      })
      .returning();

    return c.json({
      pinnedProjects: created[0]?.pinnedProjects ?? newPinned,
      isPinned: newPinned.includes(projectId),
    });
  } catch (error) {
    logger.error("Error toggling project pin:", error);
    return c.json({ error: "Failed to toggle pin" }, 500);
  }
});

// ===== APPEARANCE SETTINGS ENDPOINTS =====

// Get appearance settings (accessibility, background, fonts)
app.get("/appearance/:userEmail", async (c) => {
  try {
    const { userEmail } = c.req.param();

    const auth = requireSelf(c, userEmail);
    if (!auth.ok) {
      return auth.response;
    }
    const ownerEmail = auth.userEmail;

    const db = getDatabase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const preferences = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, user.id),
    });

    if (!preferences?.settings) {
      // Return default appearance settings
      return c.json({
        settings: {
          largeText: false,
          enhancedFocus: false,
          screenReaderMode: false,
          keyboardNavigation: false,
        },
      });
    }

    return c.json({ settings: preferences.settings });
  } catch (error) {
    logger.error("Error fetching appearance settings:", error);
    return c.json({ error: "Failed to fetch appearance settings" }, 500);
  }
});

// Update appearance/accessibility settings
app.patch("/appearance/:userEmail", async (c) => {
  try {
    const { userEmail } = c.req.param();
    const body = await c.req.json();

    const auth = requireSelf(c, userEmail);
    if (!auth.ok) {
      return auth.response;
    }
    const ownerEmail = auth.userEmail;

    const db = getDatabase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const existing = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, user.id),
    });

    const currentSettings =
      (existing?.settings as Record<string, unknown>) || {};
    const updatedSettings = { ...currentSettings, ...body };

    if (existing) {
      const updated = await db
        .update(userPreferencesTable)
        .set({
          settings: updatedSettings,
          updatedAt: new Date(),
        })
        .where(eq(userPreferencesTable.userId, user.id))
        .returning();

      logger.debug("[Appearance] Updated settings for user:", userEmail);
      return c.json({ settings: updated[0]?.settings ?? {} });
    }
    const created = await db
      .insert(userPreferencesTable)
      .values({
        userId: user.id,
        settings: updatedSettings,
      })
      .returning();

    logger.debug("[Appearance] Created settings for user:", userEmail);
    return c.json({ settings: created[0]?.settings ?? {} });
  } catch (error) {
    logger.error("Error updating appearance settings:", error);
    return c.json({ error: "Failed to update appearance settings" }, 500);
  }
});

// Upload and save background image
app.post("/background/upload", async (c) => {
  try {
    const sessionEmail = c.get("userEmail");
    if (typeof sessionEmail !== "string" || sessionEmail === "") {
      return c.json({ error: "Authentication required" }, 401);
    }

    // Get the uploaded file
    const body = await c.req.parseBody();
    const file = body.file as File;

    if (!file) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    // Validate file size (max 10MB)
    if (file.size > MAX_BACKGROUND_BYTES) {
      return c.json({ error: "File size must be less than 10MB" }, 400);
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return c.json(
        { error: "Only JPEG, PNG, WebP, and GIF images are allowed" },
        400,
      );
    }

    const db = getDatabase();
    const user = await db.query.users.findFirst({
      where: eq(users.email, sessionEmail),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const uploadDir = join(process.cwd(), "uploads", "backgrounds");
    await mkdir(uploadDir, { recursive: true });

    // Always .webp — sharp re-encodes below, so the uploaded file's own name
    // and extension are both meaningless and unsafe to interpolate into a
    // path. user.id is a server-issued cuid.
    const fileName = `${user.id}-${Date.now()}.webp`;
    const filePath = join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      // This used to base64 the raw bytes into a data: URL that the PATCH
      // below then stored in the settings JSONB — a 10MB upload became ~13MB
      // of base64 in one column, re-sent on every preferences read. Writing a
      // re-encoded file and storing only its URL keeps the row small, and the
      // re-encode is also what proves the bytes are really an image (the MIME
      // type above is client-supplied).
      await sharp(buffer)
        .rotate()
        .resize(MAX_BACKGROUND_DIMENSION, MAX_BACKGROUND_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toFile(filePath);
    } catch (sharpError) {
      logger.warn(
        "[Background] Rejected upload that sharp could not decode:",
        sharpError,
      );
      return c.json(
        {
          error: "Invalid image. Please upload a valid JPEG, PNG, WebP or GIF",
        },
        415,
      );
    }

    const imageUrl = `/uploads/backgrounds/${fileName}`;
    logger.debug("[Background] Stored background image at", imageUrl);

    return c.json({
      imageUrl,
      success: true,
    });
  } catch (error) {
    logger.error("Error uploading background image:", error);
    return c.json({ error: "Failed to upload background image" }, 500);
  }
});

// Update background preferences
app.patch("/background/:userEmail", async (c) => {
  try {
    const { userEmail } = c.req.param();
    const body = await c.req.json();
    const {
      backgroundImage,
      backgroundPosition,
      backgroundBlur,
      backgroundOpacity,
    } = body;

    const auth = requireSelf(c, userEmail);
    if (!auth.ok) {
      return auth.response;
    }
    const ownerEmail = auth.userEmail;

    const db = getDatabase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const existing = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, user.id),
    });

    const currentSettings =
      (existing?.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      backgroundImage:
        backgroundImage !== undefined
          ? backgroundImage
          : currentSettings.backgroundImage,
      backgroundPosition:
        backgroundPosition || currentSettings.backgroundPosition || "center",
      backgroundBlur:
        backgroundBlur !== undefined
          ? backgroundBlur
          : currentSettings.backgroundBlur || 0,
      backgroundOpacity:
        backgroundOpacity !== undefined
          ? backgroundOpacity
          : currentSettings.backgroundOpacity || 100,
    };

    if (existing) {
      const updated = await db
        .update(userPreferencesTable)
        .set({
          settings: updatedSettings,
          updatedAt: new Date(),
        })
        .where(eq(userPreferencesTable.userId, user.id))
        .returning();

      logger.debug(
        "[Background] Updated background preferences for user:",
        userEmail,
      );
      return c.json({
        success: true,
        settings: updated[0]?.settings ?? {},
      });
    }
    const created = await db
      .insert(userPreferencesTable)
      .values({
        userId: user.id,
        settings: updatedSettings,
      })
      .returning();

    logger.debug(
      "[Background] Created background preferences for user:",
      userEmail,
    );
    return c.json({
      success: true,
      settings: created[0]?.settings ?? {},
    });
  } catch (error) {
    logger.error("Error updating background preferences:", error);
    return c.json({ error: "Failed to update background preferences" }, 500);
  }
});

// Update font preferences
app.patch("/fonts/:userEmail", async (c) => {
  try {
    const { userEmail } = c.req.param();
    const body = await c.req.json();
    const { fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } =
      body;

    const auth = requireSelf(c, userEmail);
    if (!auth.ok) {
      return auth.response;
    }
    const ownerEmail = auth.userEmail;

    const db = getDatabase();

    const user = await db.query.users.findFirst({
      where: eq(users.email, ownerEmail),
    });

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    const existing = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, user.id),
    });

    const currentSettings =
      (existing?.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      fontFamily: fontFamily || currentSettings.fontFamily || "Inter",
      fontSize:
        fontSize !== undefined ? fontSize : currentSettings.fontSize || 14,
      fontWeight:
        fontWeight !== undefined
          ? fontWeight
          : currentSettings.fontWeight || 400,
      lineHeight:
        lineHeight !== undefined
          ? lineHeight
          : currentSettings.lineHeight || 1.5,
      letterSpacing:
        letterSpacing !== undefined
          ? letterSpacing
          : currentSettings.letterSpacing || 0,
    };

    if (existing) {
      const updated = await db
        .update(userPreferencesTable)
        .set({
          settings: updatedSettings,
          updatedAt: new Date(),
        })
        .where(eq(userPreferencesTable.userId, user.id))
        .returning();

      logger.debug("[Fonts] Updated font preferences for user:", userEmail);
      return c.json({
        success: true,
        settings: updated[0]?.settings ?? {},
      });
    }
    const created = await db
      .insert(userPreferencesTable)
      .values({
        userId: user.id,
        settings: updatedSettings,
      })
      .returning();

    logger.debug("[Fonts] Created font preferences for user:", userEmail);
    return c.json({
      success: true,
      settings: created[0]?.settings ?? {},
    });
  } catch (error) {
    logger.error("Error updating font preferences:", error);
    return c.json({ error: "Failed to update font preferences" }, 500);
  }
});

export default app;
