/**
 * 🎨 Widget Instance Controllers
 * 
 * Handles user widget installations, configuration, and dashboard management
 */

import { getDatabase } from "../../database/connection";
import {
  userWidgetInstances,
  dashboardWidgets,
  users,
  widgetCollections,
} from "../../database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import logger from "../../utils/logger";
import { trackWidgetEvent } from "./widgets";

/**
 * Install widget to user's dashboard
 */
export async function installWidget(
  userEmail: string,
  workspaceId: string,
  widgetId: string,
  options: {
    dashboardId?: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    config?: any;
  }
) {
  const db = getDatabase();

  try {
    logger.info("Installing widget:", {
      userEmail,
      workspaceId,
      widgetId,
      dashboardId: options.dashboardId,
      hasPosition: !!options.position,
      hasSize: !!options.size
    });

    // Verify widget exists and is active
    const [widget] = await db
      .select()
      .from(dashboardWidgets)
      .where(
        and(
          eq(dashboardWidgets.id, widgetId),
          eq(dashboardWidgets.isActive, true)
        )
      )
      .limit(1);

    if (!widget) {
      logger.error("Widget not found:", { widgetId });
      throw new Error("Widget not found or inactive");
    }

    logger.info("Widget found:", { widgetId, name: widget.name });
    
    // Check if already installed
    const existing = await db
      .select()
      .from(userWidgetInstances)
      .where(
        and(
          eq(userWidgetInstances.widgetId, widgetId),
          eq(userWidgetInstances.userEmail, userEmail),
          eq(userWidgetInstances.workspaceId, workspaceId)
        )
      )
      .limit(1);
    
    if (existing.length > 0) {
      throw new Error("Widget already installed");
    }
    
    // Calculate next available position if not provided
    let position = options.position;
    if (!position) {
      const maxY = await db
        .select({ max: sql<number>`COALESCE(MAX(CAST(${userWidgetInstances.position}->>'y' AS INTEGER)), 0)::int` })
        .from(userWidgetInstances)
        .where(
          and(
            eq(userWidgetInstances.userEmail, userEmail),
            eq(userWidgetInstances.workspaceId, workspaceId)
          )
        );
      
      position = { x: 0, y: (maxY[0]?.max || 0) + 1 };
    }
    
    // Create instance
    const [instance] = await db
      .insert(userWidgetInstances)
      .values({
        widgetId,
        userEmail,
        workspaceId,
        dashboardId: options.dashboardId || null,
        position,
        size: options.size || widget.defaultSize || { width: 4, height: 4 },
        config: options.config || widget.defaultConfig || {},
        filters: {},
        isVisible: true,
        isPinned: false,
        order: 0,
      })
      .returning();
    
    // Increment usage count
    await db
      .update(dashboardWidgets)
      .set({ 
        usageCount: sql`${dashboardWidgets.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(dashboardWidgets.id, widgetId));
    
    // Track analytics event
    await trackWidgetEvent(widgetId, userEmail, workspaceId, "install");
    
    logger.info(`Widget ${widgetId} installed for user ${userEmail}`);
    return instance;
  } catch (error) {
    logger.error("Failed to install widget:", error);
    throw error;
  }
}

/**
 * Get user's installed widgets
 */
export async function getUserWidgetInstances(
  userEmail: string,
  workspaceId: string,
  dashboardId?: string
) {
  const db = getDatabase();
  
  try {
    let conditions: any[] = [
      eq(userWidgetInstances.userEmail, userEmail),
      eq(userWidgetInstances.workspaceId, workspaceId),
    ];
    
    if (dashboardId) {
      conditions.push(eq(userWidgetInstances.dashboardId, dashboardId));
    }
    
    // Join with widget definitions
    const instances = await db
      .select({
        id: userWidgetInstances.id,
        widgetId: userWidgetInstances.widgetId,
        position: userWidgetInstances.position,
        size: userWidgetInstances.size,
        config: userWidgetInstances.config,
        filters: userWidgetInstances.filters,
        isVisible: userWidgetInstances.isVisible,
        isPinned: userWidgetInstances.isPinned,
        order: userWidgetInstances.order,
        createdAt: userWidgetInstances.createdAt,
        updatedAt: userWidgetInstances.updatedAt,
        // Widget details
        widgetName: dashboardWidgets.name,
        widgetDescription: dashboardWidgets.description,
        widgetType: dashboardWidgets.type,
        widgetCategory: dashboardWidgets.category,
        widgetComponent: dashboardWidgets.component,
        widgetDataSource: dashboardWidgets.dataSource,
        widgetRefreshInterval: dashboardWidgets.refreshInterval,
        widgetIcon: dashboardWidgets.icon,
        widgetMinSize: dashboardWidgets.minSize,
        widgetMaxSize: dashboardWidgets.maxSize,
      })
      .from(userWidgetInstances)
      .leftJoin(dashboardWidgets, eq(userWidgetInstances.widgetId, dashboardWidgets.id))
      .where(and(...conditions))
      .orderBy(userWidgetInstances.order, userWidgetInstances.createdAt);
    
    logger.info(`Retrieved ${instances.length} widget instances for ${userEmail}`);
    return instances;
  } catch (error) {
    logger.error("Failed to get user widget instances:", error);
    throw error;
  }
}

/**
 * Update widget instance
 */
export async function updateWidgetInstance(
  instanceId: string,
  userEmail: string,
  updates: {
    position?: any;
    size?: any;
    config?: any;
    filters?: any;
    isVisible?: boolean;
    isPinned?: boolean;
    order?: number;
  }
) {
  const db = getDatabase();
  
  try {
    // Verify ownership
    const [instance] = await db
      .select()
      .from(userWidgetInstances)
      .where(
        and(
          eq(userWidgetInstances.id, instanceId),
          eq(userWidgetInstances.userEmail, userEmail)
        )
      )
      .limit(1);
    
    if (!instance) {
      throw new Error("Widget instance not found or unauthorized");
    }
    
    // Update instance
    const [updated] = await db
      .update(userWidgetInstances)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(userWidgetInstances.id, instanceId))
      .returning();
    
    // Track analytics event if config changed
    if (updates.config) {
      await trackWidgetEvent(
        instance.widgetId,
        userEmail,
        instance.workspaceId,
        "configure",
        updates.config
      );
    }
    
    logger.info(`Updated widget instance ${instanceId}`);
    return updated;
  } catch (error) {
    logger.error("Failed to update widget instance:", error);
    throw error;
  }
}

/**
 * Uninstall widget
 */
export async function uninstallWidget(instanceId: string, userEmail: string) {
  const db = getDatabase();
  
  try {
    // Verify ownership
    const [instance] = await db
      .select()
      .from(userWidgetInstances)
      .where(
        and(
          eq(userWidgetInstances.id, instanceId),
          eq(userWidgetInstances.userEmail, userEmail)
        )
      )
      .limit(1);
    
    if (!instance) {
      throw new Error("Widget instance not found or unauthorized");
    }
    
    // Delete instance
    await db
      .delete(userWidgetInstances)
      .where(eq(userWidgetInstances.id, instanceId));
    
    // Decrement usage count
    await db
      .update(dashboardWidgets)
      .set({ 
        usageCount: sql`GREATEST(${dashboardWidgets.usageCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(dashboardWidgets.id, instance.widgetId));
    
    // Track analytics event
    await trackWidgetEvent(
      instance.widgetId,
      userEmail,
      instance.workspaceId,
      "uninstall"
    );
    
    logger.info(`Widget instance ${instanceId} uninstalled`);
  } catch (error) {
    logger.error("Failed to uninstall widget:", error);
    throw error;
  }
}

/**
 * Reorder user's widgets
 */
export async function reorderWidgets(
  userEmail: string,
  workspaceId: string,
  widgetOrder: string[] // Array of instance IDs in desired order
) {
  const db = getDatabase();
  
  try {
    // Verify all instances belong to user
    const instances = await db
      .select()
      .from(userWidgetInstances)
      .where(
        and(
          eq(userWidgetInstances.userEmail, userEmail),
          eq(userWidgetInstances.workspaceId, workspaceId)
        )
      );
    
    // Update order for each instance
    for (let i = 0; i < widgetOrder.length; i++) {
      const instanceId = widgetOrder[i];
      const instance = instances.find(inst => inst.id === instanceId);
      
      if (instance) {
        await db
          .update(userWidgetInstances)
          .set({ order: i, updatedAt: new Date() })
          .where(eq(userWidgetInstances.id, instanceId));
      }
    }
    
    logger.info(`Reordered ${widgetOrder.length} widgets for ${userEmail}`);
  } catch (error) {
    logger.error("Failed to reorder widgets:", error);
    throw error;
  }
}

/**
 * Bulk install widgets (for collections)
 */
export async function installWidgetCollection(
  collectionId: string,
  userEmail: string,
  workspaceId: string
) {
  const db = getDatabase();
  
  try {
    // Get collection
    const [collection] = await db
      .select()
      .from(widgetCollections)
      .where(eq(widgetCollections.id, collectionId))
      .limit(1);
    
    if (!collection) {
      throw new Error("Collection not found");
    }
    
    const widgetIds = collection.widgetIds as string[];
    const installed = [];
    
    // Install each widget in the collection
    for (let i = 0; i < widgetIds.length; i++) {
      const widgetId = widgetIds[i];
      
      try {
        const instance = await installWidget(userEmail, workspaceId, widgetId, {
          position: { x: (i % 3) * 4, y: Math.floor(i / 3) * 4 }, // Grid layout
        });
        installed.push(instance);
      } catch (error) {
        // Skip if already installed or error
        logger.warn(`Skipped widget ${widgetId} in collection install:`, error);
      }
    }
    
    // Increment collection install count
    await db
      .update(widgetCollections)
      .set({ installCount: sql`${widgetCollections.installCount} + 1` })
      .where(eq(widgetCollections.id, collectionId));
    
    logger.info(`Installed collection ${collectionId} with ${installed.length} widgets`);
    return installed;
  } catch (error) {
    logger.error("Failed to install widget collection:", error);
    throw error;
  }
}

/**
 * Update multiple widget positions (for drag-and-drop)
 */
export async function batchUpdatePositions(
  userEmail: string,
  workspaceId: string,
  updates: Array<{ instanceId: string; position: { x: number; y: number }; size?: { width: number; height: number } }>
) {
  const db = getDatabase();
  
  try {
    // Verify all instances belong to user
    const instanceIds = updates.map(u => u.instanceId);
    const instances = await db
      .select()
      .from(userWidgetInstances)
      .where(
        and(
          eq(userWidgetInstances.userEmail, userEmail),
          eq(userWidgetInstances.workspaceId, workspaceId)
        )
      );
    
    // Update each instance
    for (const update of updates) {
      const instance = instances.find(inst => inst.id === update.instanceId);
      
      if (instance) {
        await db
          .update(userWidgetInstances)
          .set({
            position: update.position,
            size: update.size || instance.size,
            updatedAt: new Date(),
          })
          .where(eq(userWidgetInstances.id, update.instanceId));
      }
    }
    
    logger.info(`Batch updated ${updates.length} widget positions for ${userEmail}`);
  } catch (error) {
    logger.error("Failed to batch update widget positions:", error);
    throw error;
  }
}

