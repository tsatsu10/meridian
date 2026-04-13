import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../database/connection";
import {
  favoritesTable,
  users,
  channelTable,
} from "../database/schema";
import { auth } from "../middlewares/auth";
import logger from "../utils/logger";

const app = new Hono<{
  Variables: {
    userId?: string;
    userEmail?: string;
  };
}>();

app.use("*", auth);

const createFavoriteSchema = z.object({
  type: z.enum(["user", "channel"]).default("user"),
  favoriteUserId: z.string().optional(),
  favoriteChannelId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

app.get("/", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();

    const favorites = await db
      .select({
        id: favoritesTable.id,
        userId: favoritesTable.userId,
        type: favoritesTable.type,
        favoriteUserId: favoritesTable.favoriteUserId,
        favoriteChannelId: favoritesTable.favoriteChannelId,
        metadata: favoritesTable.metadata,
        createdAt: favoritesTable.createdAt,
        updatedAt: favoritesTable.updatedAt,
      })
      .from(favoritesTable)
      .where(eq(favoritesTable.userId, userId))
      .orderBy(desc(favoritesTable.createdAt));

    return c.json({ favorites });
  } catch (error) {
    logger.error("Error fetching favorites:", error);
    return c.json({ error: "Failed to fetch favorites" }, 500);
  }
});

app.post(
  "/",
  zValidator("json", createFavoriteSchema),
  async (c) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { type, favoriteUserId, favoriteChannelId, metadata } =
      c.req.valid("json");

    if (type === "user" && !favoriteUserId) {
      return c.json(
        { error: "favoriteUserId is required for user favorites" },
        400,
      );
    }

    if (type === "channel" && !favoriteChannelId) {
      return c.json(
        { error: "favoriteChannelId is required for channel favorites" },
        400,
      );
    }

    try {
      const db = getDatabase();

      if (type === "user") {
        const targetUser = await db.query.users.findFirst({
          where: eq(users.id, favoriteUserId!),
        });

        if (!targetUser) {
          return c.json({ error: "Target user not found" }, 404);
        }
      }

      if (type === "channel") {
        const [targetChannel] = await db
          .select({ id: channelTable.id })
          .from(channelTable)
          .where(eq(channelTable.id, favoriteChannelId!))
          .limit(1);

        if (!targetChannel) {
          return c.json({ error: "Channel not found" }, 404);
        }
      }

      // Prevent duplicates
      const duplicateExists = await db
        .select({ id: favoritesTable.id })
        .from(favoritesTable)
        .where(
          and(
            eq(favoritesTable.userId, userId),
            eq(favoritesTable.type, type),
            type === "user"
              ? eq(favoritesTable.favoriteUserId, favoriteUserId!)
              : eq(favoritesTable.favoriteChannelId, favoriteChannelId!),
          ),
        )
        .limit(1);

      if (duplicateExists.length > 0) {
        return c.json({ error: "Favorite already exists" }, 409);
      }

      const [favorite] = await db
        .insert(favoritesTable)
        .values({
          id: createId(),
          userId,
          type,
          favoriteUserId: favoriteUserId ?? null,
          favoriteChannelId: favoriteChannelId ?? null,
          metadata: metadata ?? {},
        })
        .returning();

      return c.json({ favorite }, 201);
    } catch (error) {
      logger.error("Error creating favorite:", error);
      return c.json({ error: "Failed to create favorite" }, 500);
    }
  },
);

app.delete("/:favoriteId", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const favoriteId = c.req.param("favoriteId");

  try {
    const db = getDatabase();

    const [favorite] = await db
      .select({
        id: favoritesTable.id,
      })
      .from(favoritesTable)
      .where(
        and(
          eq(favoritesTable.id, favoriteId),
          eq(favoritesTable.userId, userId),
        ),
      )
      .limit(1);

    if (!favorite) {
      return c.json({ error: "Favorite not found" }, 404);
    }

    await db
      .delete(favoritesTable)
      .where(eq(favoritesTable.id, favoriteId));

    return c.json({ success: true });
  } catch (error) {
    logger.error("Error removing favorite:", error);
    return c.json({ error: "Failed to remove favorite" }, 500);
  }
});

app.delete("/user/:targetUserId", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const targetUserId = c.req.param("targetUserId");

  try {
    const db = getDatabase();

    const deleted = await db
      .delete(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, userId),
          eq(favoritesTable.type, "user"),
          eq(favoritesTable.favoriteUserId, targetUserId),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      return c.json({ error: "Favorite not found" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    logger.error("Error removing user favorite:", error);
    return c.json({ error: "Failed to remove favorite" }, 500);
  }
});

app.delete("/channel/:channelId", async (c) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const channelId = c.req.param("channelId");

  try {
    const db = getDatabase();

    const deleted = await db
      .delete(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, userId),
          eq(favoritesTable.type, "channel"),
          eq(favoritesTable.favoriteChannelId, channelId),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      return c.json({ error: "Favorite not found" }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    logger.error("Error removing channel favorite:", error);
    return c.json({ error: "Failed to remove favorite" }, 500);
  }
});

export default app;

