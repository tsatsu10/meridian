/**
 * 🏪 Widget Marketplace Controllers
 * 
 * Handles widget CRUD, marketplace browsing, ratings, and reviews
 */

import { getDatabase } from "../../database/connection";
import {
  dashboardWidgets,
  widgetRatings,
  widgetReviews,
  widgetAnalytics,
  widgetVersions,
  widgetCollections,
  reviewHelpfulness,
  users,
} from "../../database/schema";
import { eq, and, desc, like, or, sql, inArray, avg, count } from "drizzle-orm";
import logger from "../../utils/logger";
import { createId } from "@paralleldrive/cuid2";

/**
 * Get marketplace widgets with advanced filtering
 */
export async function getMarketplaceWidgets(
  workspaceId: string,
  options?: {
    category?: string;
    tags?: string[];
    search?: string;
    isPublic?: boolean;
    isPremium?: boolean;
    minRating?: number;
    sortBy?: "popular" | "rating" | "recent" | "name";
    limit?: number;
    offset?: number;
  }
) {
  const db = getDatabase();
  
  try {
    let conditions: any[] = [eq(dashboardWidgets.isActive, true)];
    
    // Only show public marketplace widgets by default
    if (options?.isPublic !== false) {
      conditions.push(eq(dashboardWidgets.isPublic, true));
    }
    
    // Filter by category
    if (options?.category && options.category !== "all") {
      conditions.push(eq(dashboardWidgets.category, options.category));
    }
    
    // Filter by premium status
    if (options?.isPremium !== undefined) {
      conditions.push(eq(dashboardWidgets.isPremium, options.isPremium));
    }
    
    // Search in name and description
    if (options?.search) {
      const searchPattern = `%${options.search.toLowerCase()}%`;
      conditions.push(
        or(
          sql`LOWER(${dashboardWidgets.name}) LIKE ${searchPattern}`,
          sql`LOWER(${dashboardWidgets.description}) LIKE ${searchPattern}`
        )
      );
    }
    
    // Filter by minimum rating
    if (options?.minRating) {
      conditions.push(sql`CAST(${dashboardWidgets.rating} AS DECIMAL) >= ${options.minRating}`);
    }
    
    // Determine sort order
    let orderBy: any;
    switch (options?.sortBy) {
      case "rating":
        orderBy = [desc(dashboardWidgets.rating), desc(dashboardWidgets.usageCount)];
        break;
      case "recent":
        orderBy = [desc(dashboardWidgets.createdAt)];
        break;
      case "name":
        orderBy = [dashboardWidgets.name];
        break;
      case "popular":
      default:
        orderBy = [desc(dashboardWidgets.usageCount), desc(dashboardWidgets.rating)];
    }
    
    const widgets = await db
      .select()
      .from(dashboardWidgets)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
    
    logger.info(`Retrieved ${widgets.length} marketplace widgets`);
    return widgets;
  } catch (error) {
    logger.error("Failed to get marketplace widgets:", error);
    throw new Error("Failed to fetch marketplace widgets");
  }
}

/**
 * Get widget by ID with reviews and ratings
 */
export async function getWidgetById(widgetId: string, userEmail?: string) {
  const db = getDatabase();
  
  try {
    // Get widget
    const [widget] = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.id, widgetId))
      .limit(1);
    
    if (!widget) {
      throw new Error("Widget not found");
    }
    
    // Get reviews with user details
    const reviews = await db
      .select({
        review: widgetReviews,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(widgetReviews)
      .leftJoin(users, eq(widgetReviews.userEmail, users.email))
      .where(eq(widgetReviews.widgetId, widgetId))
      .orderBy(desc(widgetReviews.helpfulCount), desc(widgetReviews.createdAt))
      .limit(10);
    
    // Get rating statistics
    const ratingStats = await db
      .select({
        avgRating: avg(widgetRatings.rating),
        totalRatings: count(widgetRatings.id),
        rating1: sql<number>`SUM(CASE WHEN ${widgetRatings.rating} = 1 THEN 1 ELSE 0 END)::int`,
        rating2: sql<number>`SUM(CASE WHEN ${widgetRatings.rating} = 2 THEN 1 ELSE 0 END)::int`,
        rating3: sql<number>`SUM(CASE WHEN ${widgetRatings.rating} = 3 THEN 1 ELSE 0 END)::int`,
        rating4: sql<number>`SUM(CASE WHEN ${widgetRatings.rating} = 4 THEN 1 ELSE 0 END)::int`,
        rating5: sql<number>`SUM(CASE WHEN ${widgetRatings.rating} = 5 THEN 1 ELSE 0 END)::int`,
      })
      .from(widgetRatings)
      .where(eq(widgetRatings.widgetId, widgetId));
    
    // Check if user has rated
    let userRating = null;
    if (userEmail) {
      const [rating] = await db
        .select()
        .from(widgetRatings)
        .where(
          and(
            eq(widgetRatings.widgetId, widgetId),
            eq(widgetRatings.userEmail, userEmail)
          )
        )
        .limit(1);
      userRating = rating;
    }
    
    return {
      widget,
      reviews,
      ratingStats: ratingStats[0] || {
        avgRating: 0,
        totalRatings: 0,
        rating1: 0,
        rating2: 0,
        rating3: 0,
        rating4: 0,
        rating5: 0,
      },
      userRating,
    };
  } catch (error) {
    logger.error("Failed to get widget:", error);
    throw error;
  }
}

/**
 * Rate a widget
 */
export async function rateWidget(
  widgetId: string,
  userEmail: string,
  rating: number
) {
  const db = getDatabase();
  
  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    
    // Check if widget exists
    const [widget] = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.id, widgetId))
      .limit(1);
    
    if (!widget) {
      throw new Error("Widget not found");
    }
    
    // Upsert rating (update if exists, insert if not)
    const existing = await db
      .select()
      .from(widgetRatings)
      .where(
        and(
          eq(widgetRatings.widgetId, widgetId),
          eq(widgetRatings.userEmail, userEmail)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing rating
      const [updated] = await db
        .update(widgetRatings)
        .set({ rating, updatedAt: new Date() })
        .where(eq(widgetRatings.id, existing[0].id))
        .returning();
      
      logger.info(`Updated rating for widget ${widgetId}`);
      
      // Recalculate average rating
      await recalculateWidgetRating(widgetId);
      
      return updated;
    } else {
      // Insert new rating
      const [newRating] = await db
        .insert(widgetRatings)
        .values({
          widgetId,
          userEmail,
          rating,
        })
        .returning();
      
      logger.info(`Added rating for widget ${widgetId}`);
      
      // Recalculate average rating
      await recalculateWidgetRating(widgetId);
      
      return newRating;
    }
  } catch (error) {
    logger.error("Failed to rate widget:", error);
    throw error;
  }
}

/**
 * Add a review for a widget
 */
export async function addWidgetReview(
  widgetId: string,
  userEmail: string,
  data: {
    title: string;
    content: string;
    rating: number;
  }
) {
  const db = getDatabase();
  
  try {
    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }
    
    // Check if widget exists
    const [widget] = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.id, widgetId))
      .limit(1);
    
    if (!widget) {
      throw new Error("Widget not found");
    }
    
    // Check if user has installed the widget (for verified review)
    const installed = await db
      .select()
      .from(require("../schema").userWidgetInstances)
      .where(
        and(
          eq(require("../schema").userWidgetInstances.widgetId, widgetId),
          eq(require("../schema").userWidgetInstances.userEmail, userEmail)
        )
      )
      .limit(1);
    
    // Create review
    const [review] = await db
      .insert(widgetReviews)
      .values({
        widgetId,
        userEmail,
        title: data.title,
        content: data.content,
        rating: data.rating,
        helpfulCount: 0,
        isVerifiedInstall: installed.length > 0,
      })
      .returning();
    
    // Also update/create rating
    await rateWidget(widgetId, userEmail, data.rating);
    
    logger.info(`Added review for widget ${widgetId}`);
    return review;
  } catch (error) {
    logger.error("Failed to add review:", error);
    throw error;
  }
}

/**
 * Mark review as helpful
 */
export async function markReviewHelpful(
  reviewId: string,
  userEmail: string,
  isHelpful: boolean
) {
  const db = getDatabase();
  
  try {
    // Check if already marked
    const existing = await db
      .select()
      .from(reviewHelpfulness)
      .where(
        and(
          eq(reviewHelpfulness.reviewId, reviewId),
          eq(reviewHelpfulness.userEmail, userEmail)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      // Update existing
      await db
        .update(reviewHelpfulness)
        .set({ isHelpful })
        .where(eq(reviewHelpfulness.id, existing[0].id));
    } else {
      // Create new
      await db.insert(reviewHelpfulness).values({
        reviewId,
        userEmail,
        isHelpful,
      });
    }
    
    // Recalculate helpful count
    const helpful = await db
      .select({ count: count() })
      .from(reviewHelpfulness)
      .where(
        and(
          eq(reviewHelpfulness.reviewId, reviewId),
          eq(reviewHelpfulness.isHelpful, true)
        )
      );
    
    await db
      .update(widgetReviews)
      .set({ helpfulCount: helpful[0]?.count || 0 })
      .where(eq(widgetReviews.id, reviewId));
    
    logger.info(`Marked review ${reviewId} as ${isHelpful ? 'helpful' : 'not helpful'}`);
  } catch (error) {
    logger.error("Failed to mark review helpful:", error);
    throw error;
  }
}

/**
 * Get widget collections
 */
export async function getWidgetCollections(options?: {
  category?: string;
  isPublic?: boolean;
}) {
  const db = getDatabase();
  
  try {
    let conditions: any[] = [];
    
    if (options?.isPublic !== false) {
      conditions.push(eq(widgetCollections.isPublic, true));
    }
    
    if (options?.category) {
      conditions.push(eq(widgetCollections.category, options.category));
    }
    
    const collections = await db
      .select()
      .from(widgetCollections)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(widgetCollections.installCount));
    
    // Enrich with widget details
    const enriched = await Promise.all(
      collections.map(async (collection) => {
        const widgetIds = collection.widgetIds as string[];
        
        const widgets = await db
          .select()
          .from(dashboardWidgets)
          .where(inArray(dashboardWidgets.id, widgetIds));
        
        return {
          ...collection,
          widgets,
        };
      })
    );
    
    return enriched;
  } catch (error) {
    logger.error("Failed to get widget collections:", error);
    throw error;
  }
}

/**
 * Track widget analytics event
 */
export async function trackWidgetEvent(
  widgetId: string,
  userEmail: string,
  workspaceId: string,
  eventType: "view" | "install" | "uninstall" | "configure" | "error" | "render",
  metadata?: any,
  performanceMs?: number
) {
  const db = getDatabase();
  
  try {
    await db.insert(widgetAnalytics).values({
      widgetId,
      userEmail,
      workspaceId,
      eventType,
      metadata,
      performanceMs,
    });
    
    logger.debug(`Tracked ${eventType} event for widget ${widgetId}`);
  } catch (error) {
    // Don't throw on analytics errors - log and continue
    logger.warn("Failed to track widget event:", error);
  }
}

/**
 * Get widget analytics for creators
 */
export async function getWidgetAnalytics(
  widgetId: string,
  period?: "day" | "week" | "month" | "all"
) {
  const db = getDatabase();
  
  try {
    // Calculate time filter
    let timeCondition: any = eq(widgetAnalytics.widgetId, widgetId);
    
    if (period && period !== "all") {
      const days = period === "day" ? 1 : period === "week" ? 7 : 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      timeCondition = and(
        eq(widgetAnalytics.widgetId, widgetId),
        sql`${widgetAnalytics.timestamp} >= ${since}`
      );
    }
    
    // Get event counts
    const events = await db
      .select({
        eventType: widgetAnalytics.eventType,
        count: count(),
        avgPerformance: avg(widgetAnalytics.performanceMs),
      })
      .from(widgetAnalytics)
      .where(timeCondition)
      .groupBy(widgetAnalytics.eventType);
    
    // Get unique users
    const uniqueUsers = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${widgetAnalytics.userEmail})::int` })
      .from(widgetAnalytics)
      .where(timeCondition);
    
    return {
      events,
      uniqueUsers: uniqueUsers[0]?.count || 0,
      period,
    };
  } catch (error) {
    logger.error("Failed to get widget analytics:", error);
    throw error;
  }
}

/**
 * Create new widget (for widget studio)
 */
export async function createWidget(
  userEmail: string,
  data: {
    name: string;
    description: string;
    type: string;
    category: string;
    component: string;
    defaultConfig: any;
    configSchema?: any;
    dataSource?: string;
    refreshInterval?: number;
    defaultSize?: any;
    minSize?: any;
    maxSize?: any;
    icon?: string;
    tags?: string[];
    isPublic?: boolean;
    isPremium?: boolean;
  }
) {
  const db = getDatabase();
  
  try {
    // Get user
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    
    if (!user) {
      throw new Error("User not found");
    }
    
    // Create widget
    const [widget] = await db
      .insert(dashboardWidgets)
      .values({
        name: data.name,
        description: data.description,
        type: data.type,
        category: data.category,
        component: data.component,
        defaultConfig: data.defaultConfig,
        configSchema: data.configSchema || null,
        dataSource: data.dataSource || null,
        refreshInterval: data.refreshInterval || 60,
        defaultSize: data.defaultSize || { width: 4, height: 4 },
        minSize: data.minSize || { width: 2, height: 2 },
        maxSize: data.maxSize || { width: 12, height: 12 },
        thumbnail: null,
        icon: data.icon || null,
        isGlobal: false, // User-created widgets are not global
        isPublic: data.isPublic || false,
        workspaceId: null, // TODO: Get from user's workspace
        usageCount: 0,
        rating: null,
        tags: data.tags || [],
        version: "1.0.0",
        isActive: false, // Needs review before activation
        isPremium: data.isPremium || false,
        createdBy: user.id,
      })
      .returning();
    
    logger.info(`Created widget ${widget.id} by ${userEmail}`);
    return widget;
  } catch (error) {
    logger.error("Failed to create widget:", error);
    throw error;
  }
}

/**
 * Update widget (creator only)
 */
export async function updateWidget(
  widgetId: string,
  userEmail: string,
  updates: Partial<typeof dashboardWidgets.$inferInsert>
) {
  const db = getDatabase();
  
  try {
    // Get widget and verify ownership
    const [widget] = await db
      .select({
        widget: dashboardWidgets,
        creatorEmail: users.email,
      })
      .from(dashboardWidgets)
      .leftJoin(users, eq(dashboardWidgets.createdBy, users.id))
      .where(eq(dashboardWidgets.id, widgetId))
      .limit(1);
    
    if (!widget) {
      throw new Error("Widget not found");
    }
    
    if (widget.creatorEmail !== userEmail) {
      throw new Error("Unauthorized: Only the widget creator can update it");
    }
    
    // Update widget
    const [updated] = await db
      .update(dashboardWidgets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(dashboardWidgets.id, widgetId))
      .returning();
    
    logger.info(`Updated widget ${widgetId}`);
    return updated;
  } catch (error) {
    logger.error("Failed to update widget:", error);
    throw error;
  }
}

/**
 * Delete widget (creator only, if no active installations)
 */
export async function deleteWidget(widgetId: string, userEmail: string) {
  const db = getDatabase();
  
  try {
    // Get widget and verify ownership
    const [widget] = await db
      .select({
        widget: dashboardWidgets,
        creatorEmail: users.email,
      })
      .from(dashboardWidgets)
      .leftJoin(users, eq(dashboardWidgets.createdBy, users.id))
      .where(eq(dashboardWidgets.id, widgetId))
      .limit(1);
    
    if (!widget) {
      throw new Error("Widget not found");
    }
    
    if (widget.creatorEmail !== userEmail) {
      throw new Error("Unauthorized: Only the widget creator can delete it");
    }
    
    // Check if widget has active installations
    const userWidgetInstances = require("../schema").userWidgetInstances;
    const instances = await db
      .select({ count: count() })
      .from(userWidgetInstances)
      .where(eq(userWidgetInstances.widgetId, widgetId));
    
    if ((instances[0]?.count || 0) > 0) {
      throw new Error("Cannot delete widget with active installations. Deactivate it instead.");
    }
    
    // Soft delete - deactivate instead of deleting
    await db
      .update(dashboardWidgets)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dashboardWidgets.id, widgetId));
    
    logger.info(`Deactivated widget ${widgetId}`);
  } catch (error) {
    logger.error("Failed to delete widget:", error);
    throw error;
  }
}

/**
 * Helper: Recalculate widget average rating
 */
async function recalculateWidgetRating(widgetId: string) {
  const db = getDatabase();
  
  try {
    const result = await db
      .select({ avgRating: avg(widgetRatings.rating) })
      .from(widgetRatings)
      .where(eq(widgetRatings.widgetId, widgetId));
    
    const avgRating = result[0]?.avgRating || 0;
    
    await db
      .update(dashboardWidgets)
      .set({ rating: avgRating.toFixed(1) })
      .where(eq(dashboardWidgets.id, widgetId));
    
    logger.debug(`Recalculated rating for widget ${widgetId}: ${avgRating}`);
  } catch (error) {
    logger.error("Failed to recalculate widget rating:", error);
  }
}

/**
 * Get marketplace categories with counts
 */
export async function getWidgetCategories() {
  const db = getDatabase();
  
  try {
    const categories = await db
      .select({
        category: dashboardWidgets.category,
        count: count(),
        avgRating: avg(dashboardWidgets.rating),
      })
      .from(dashboardWidgets)
      .where(
        and(
          eq(dashboardWidgets.isActive, true),
          eq(dashboardWidgets.isPublic, true)
        )
      )
      .groupBy(dashboardWidgets.category)
      .orderBy(desc(count()));
    
    return categories;
  } catch (error) {
    logger.error("Failed to get widget categories:", error);
    throw error;
  }
}

