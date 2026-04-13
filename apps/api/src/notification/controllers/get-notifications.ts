import { desc, eq, count, and, or, ilike, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { notificationTable } from "../../database/schema";

async function getNotifications(
  userEmail: string,
  options: {
    limit?: number;
    offset?: number;
    includeArchived?: boolean;
    // Phase 2: Enhanced filtering
    type?: string; // Filter by notification type
    types?: string[]; // Filter by multiple types
    isRead?: boolean; // Filter by read/unread
    priority?: string; // Filter by priority
    search?: string; // Search in title/content
  } = {}
) {
  const db = getDatabase();
  const { 
    limit = 50, 
    offset = 0, 
    includeArchived = false,
    type,
    types,
    isRead,
    priority,
    search,
  } = options;

  // Build where conditions
  const conditions = [eq(notificationTable.userEmail, userEmail)];
  
  // Archive filter
  if (!includeArchived) {
    conditions.push(eq(notificationTable.isArchived, false));
  }
  
  // Phase 2: Type filtering
  if (type) {
    conditions.push(eq(notificationTable.type, type));
  } else if (types && types.length > 0) {
    conditions.push(inArray(notificationTable.type, types));
  }
  
  // Phase 2: Read/Unread filtering
  if (isRead !== undefined) {
    conditions.push(eq(notificationTable.isRead, isRead));
  }
  
  // Phase 2: Priority filtering
  if (priority) {
    conditions.push(eq(notificationTable.priority, priority));
  }
  
  // Phase 2: Search functionality
  if (search && search.trim()) {
    conditions.push(
      or(
        ilike(notificationTable.title, `%${search}%`),
        ilike(notificationTable.content, `%${search}%`),
        ilike(notificationTable.message, `%${search}%`)
      )
    );
  }

  const whereConditions = and(...conditions);

  // Get notifications with pagination
  const notifications = await db
    .select()
    .from(notificationTable)
    .where(whereConditions)
    .orderBy(desc(notificationTable.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination info
  const [totalResult] = await db
    .select({ count: count() })
    .from(notificationTable)
    .where(whereConditions);

  // Phase 2: Get unread count
  const [unreadResult] = await db
    .select({ count: count() })
    .from(notificationTable)
    .where(
      and(
        eq(notificationTable.userEmail, userEmail),
        eq(notificationTable.isRead, false),
        eq(notificationTable.isArchived, false)
      )
    );

  return {
    notifications,
    pagination: {
      total: totalResult?.count || 0,
      limit,
      offset,
      hasMore: (offset + notifications.length) < (totalResult?.count || 0),
    },
    unreadCount: unreadResult?.count || 0,
  };
}

export default getNotifications;

