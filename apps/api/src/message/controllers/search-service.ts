// @epic-3.6-communication: Advanced message search with full-text indexing
import { eq, and, like, or, desc, asc, gte, lte, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../../database/connection";
import { messageTable, 
  channelTable, 
  channelMemberTable,
  userTable,
  attachmentTable } from "../../database/schema";
import logger from '../../utils/logger';
import { sql } from "drizzle-orm";

// Search validation schemas
export const messageSearchSchema = z.object({
  query: z.string().min(1, "Search query is required").max(500),
  channelIds: z.array(z.string()).optional(),
  userEmails: z.array(z.string()).optional(),
  messageTypes: z.array(z.enum(["text", "file", "system", "thread_reply"])).optional(),
  hasAttachments: z.boolean().optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(["relevance", "date_desc", "date_asc"]).default("relevance"),
  includeThreads: z.boolean().default(true),
  workspaceId: z.string().optional(),
});

export const advancedSearchSchema = z.object({
  query: z.string().optional(),
  filters: z.object({
    channels: z.array(z.string()).optional(),
    users: z.array(z.string()).optional(),
    messageTypes: z.array(z.string()).optional(),
    hasAttachments: z.boolean().optional(),
    hasReactions: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    isEdited: z.boolean().optional(),
    dateRange: z.object({
      start: z.string().transform(str => new Date(str)).optional(),
      end: z.string().transform(str => new Date(str)).optional(),
    }).optional(),
    mentions: z.array(z.string()).optional(),
  }).optional(),
  sort: z.object({
    field: z.enum(["date", "relevance", "user", "channel"]).default("relevance"),
    direction: z.enum(["asc", "desc"]).default("desc"),
  }).optional(),
  pagination: z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
  }).optional(),
});

// Search messages with full-text capabilities
export async function searchMessages(
  searchParams: z.infer<typeof messageSearchSchema>,
  userEmail: string
) {
  try {
    const db = getDatabase();
    const {
      query,
      channelIds,
      userEmails,
      messageTypes,
      hasAttachments,
      startDate,
      endDate,
      limit,
      offset,
      sortBy,
      includeThreads,
      workspaceId
    } = searchParams;

    // Base query with joins
    let baseQuery = db
      .select({
        id: messageTable.id,
        channelId: messageTable.channelId,
        userEmail: messageTable.userEmail,
        content: messageTable.content,
        messageType: messageTable.messageType,
        parentMessageId: messageTable.parentMessageId,
        mentions: messageTable.mentions,
        reactions: messageTable.reactions,
        attachments: messageTable.attachments,
        isEdited: messageTable.isEdited,
        isPinned: messageTable.isPinned,
        createdAt: messageTable.createdAt,
        editedAt: messageTable.editedAt,
        deletedAt: messageTable.deletedAt,
        // Join data
        channelName: channelTable.name,
        channelType: channelTable.type,
        userName: userTable.name,
        userAvatar: userTable.avatarUrl,
      })
      .from(messageTable)
      .leftJoin(channelTable, eq(messageTable.channelId, channelTable.id))
      .leftJoin(userTable, eq(messageTable.userEmail, userTable.email));

    // Build WHERE conditions
    const conditions = [];

    // Exclude deleted messages
    conditions.push(eq(messageTable.deletedAt, null));

    // Full-text search on content
    if (query) {
      // PostgreSQL text search using LIKE
      const searchTerms = query.split(' ').filter(term => term.length > 0);
      const searchConditions = searchTerms.map(term => 
        like(messageTable.content, `%${term}%`)
      );
      
      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions));
      }
    }

    // Channel filter
    if (channelIds && channelIds.length > 0) {
      conditions.push(inArray(messageTable.channelId, channelIds));
    }

    // User filter
    if (userEmails && userEmails.length > 0) {
      conditions.push(inArray(messageTable.userEmail, userEmails));
    }

    // Message type filter
    if (messageTypes && messageTypes.length > 0) {
      conditions.push(inArray(messageTable.messageType, messageTypes));
    }

    // Attachments filter
    if (hasAttachments !== undefined) {
      if (hasAttachments) {
        conditions.push(sql`${messageTable.attachments} IS NOT NULL AND ${messageTable.attachments} != '[]' AND ${messageTable.attachments} != ''`);
      } else {
        conditions.push(or(
          eq(messageTable.attachments, null),
          eq(messageTable.attachments, '[]'),
          eq(messageTable.attachments, '')
        ));
      }
    }

    // Date range filter
    if (startDate) {
      conditions.push(gte(messageTable.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(messageTable.createdAt, endDate));
    }

    // Thread filter
    if (!includeThreads) {
      conditions.push(eq(messageTable.parentMessageId, null));
    }

    // Workspace filter (through channel)
    if (workspaceId) {
      conditions.push(eq(channelTable.workspaceId, workspaceId));
    }

    // Apply conditions
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }

    // Apply sorting
    switch (sortBy) {
      case "date_desc":
        baseQuery = baseQuery.orderBy(desc(messageTable.createdAt));
        break;
      case "date_asc":
        baseQuery = baseQuery.orderBy(asc(messageTable.createdAt));
        break;
      case "relevance":
      default:
        // For relevance, we can add more sophisticated scoring later
        baseQuery = baseQuery.orderBy(desc(messageTable.createdAt));
        break;
    }

    // Apply pagination
    baseQuery = baseQuery.limit(limit).offset(offset);

    // Execute query
    const messages = await baseQuery;

    // Get total count for pagination
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(messageTable)
      .leftJoin(channelTable, eq(messageTable.channelId, channelTable.id));

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count: totalCount }] = await countQuery;

    // Process results
    const processedMessages = messages.map(message => ({
      ...message,
      mentions: message.mentions ? JSON.parse(message.mentions) : [],
      reactions: message.reactions ? JSON.parse(message.reactions) : [],
      attachments: message.attachments ? JSON.parse(message.attachments) : [],
      // Add search relevance score (simplified)
      relevanceScore: calculateRelevanceScore(message.content, query),
    }));

    return {
      messages: processedMessages,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      searchInfo: {
        query,
        resultCount: messages.length,
        totalMatches: totalCount,
        searchTime: Date.now(), // Add actual timing later
      },
    };
  } catch (error) {
    logger.error("Error searching messages:", error);
    throw new Error("Failed to search messages");
  }
}

// Advanced search with complex filters
export async function advancedMessageSearch(
  searchParams: z.infer<typeof advancedSearchSchema>,
  userEmail: string
) {
  try {
    const { query, filters, sort, pagination } = searchParams;
    
    // Convert to standard search format
    const standardSearch: z.infer<typeof messageSearchSchema> = {
      query: query || "",
      channelIds: filters?.channels,
      userEmails: filters?.users,
      messageTypes: filters?.messageTypes as any,
      hasAttachments: filters?.hasAttachments,
      startDate: filters?.dateRange?.start,
      endDate: filters?.dateRange?.end,
      limit: pagination?.limit || 20,
      offset: pagination?.offset || 0,
      sortBy: sort?.field === "date" 
        ? (sort.direction === "asc" ? "date_asc" : "date_desc")
        : "relevance",
    };

    const results = await searchMessages(standardSearch, userEmail);

    // Add advanced filters
    let filteredMessages = results.messages;

    // Filter by reactions
    if (filters?.hasReactions !== undefined) {
      filteredMessages = filteredMessages.filter(msg => {
        const hasReactions = msg.reactions && msg.reactions.length > 0;
        return filters.hasReactions ? hasReactions : !hasReactions;
      });
    }

    // Filter by pinned status
    if (filters?.isPinned !== undefined) {
      filteredMessages = filteredMessages.filter(msg => 
        Boolean(msg.isPinned) === filters.isPinned
      );
    }

    // Filter by edited status
    if (filters?.isEdited !== undefined) {
      filteredMessages = filteredMessages.filter(msg => 
        Boolean(msg.isEdited) === filters.isEdited
      );
    }

    // Filter by mentions
    if (filters?.mentions && filters.mentions.length > 0) {
      filteredMessages = filteredMessages.filter(msg => {
        const mentions = msg.mentions || [];
        return filters.mentions.some(email => mentions.includes(email));
      });
    }

    return {
      ...results,
      messages: filteredMessages,
      filters: filters,
      sort: sort,
    };
  } catch (error) {
    logger.error("Error in advanced message search:", error);
    throw new Error("Failed to perform advanced search");
  }
}

// Search within a specific channel
export async function searchChannelMessages(
  channelId: string,
  query: string,
  userEmail: string,
  options: {
    limit?: number;
    offset?: number;
    dateRange?: { start?: Date; end?: Date };
  } = {}
) {
  try {
    const searchParams: z.infer<typeof messageSearchSchema> = {
      query,
      channelIds: [channelId],
      limit: options.limit || 20,
      offset: options.offset || 0,
      startDate: options.dateRange?.start,
      endDate: options.dateRange?.end,
    };

    return await searchMessages(searchParams, userEmail);
  } catch (error) {
    logger.error("Error searching channel messages:", error);
    throw new Error("Failed to search channel messages");
  }
}

// Search for messages from a specific user
export async function searchUserMessages(
  targetUserEmail: string,
  query: string,
  requestingUserEmail: string,
  options: {
    limit?: number;
    offset?: number;
    channelIds?: string[];
  } = {}
) {
  try {
    const searchParams: z.infer<typeof messageSearchSchema> = {
      query,
      userEmails: [targetUserEmail],
      channelIds: options.channelIds,
      limit: options.limit || 20,
      offset: options.offset || 0,
    };

    return await searchMessages(searchParams, requestingUserEmail);
  } catch (error) {
    logger.error("Error searching user messages:", error);
    throw new Error("Failed to search user messages");
  }
}

// Get search suggestions based on query
export async function getSearchSuggestions(
  partialQuery: string,
  userEmail: string,
  maxSuggestions: number = 10
) {
  try {
    const db = getDatabase();
    if (partialQuery.length < 2) {
      return { suggestions: [] };
    }

    // Get recent search terms (simplified - in production use a search history table)
    const recentMessages = await db
      .select({
        content: messageTable.content,
        userEmail: messageTable.userEmail,
        channelId: messageTable.channelId,
      })
      .from(messageTable)
      .where(
        and(
          like(messageTable.content, `%${partialQuery}%`),
          eq(messageTable.deletedAt, null)
        )
      )
      .orderBy(desc(messageTable.createdAt))
      .limit(maxSuggestions * 2);

    // Extract relevant terms
    const suggestions = new Set<string>();
    const queryLower = partialQuery.toLowerCase();

    for (const message of recentMessages) {
      const words = message.content.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.includes(queryLower) && word.length > 2 && suggestions.size < maxSuggestions) {
          suggestions.add(word);
        }
      }
    }

    return {
      suggestions: Array.from(suggestions).slice(0, maxSuggestions),
      query: partialQuery,
    };
  } catch (error) {
    logger.error("Error getting search suggestions:", error);
    throw new Error("Failed to get search suggestions");
  }
}

// Get popular search terms
export async function getPopularSearchTerms(
  userEmail: string,
  timeframeDays: number = 30,
  maxTerms: number = 10
) {
  try {
    const db = getDatabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframeDays);

    // Get frequent words from recent messages
    const recentMessages = await db
      .select({
        content: messageTable.content,
      })
      .from(messageTable)
      .where(
        and(
          gte(messageTable.createdAt, startDate),
          eq(messageTable.deletedAt, null)
        )
      )
      .limit(1000);

    // Simple word frequency analysis
    const wordCount = new Map<string, number>();
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);

    for (const message of recentMessages) {
      const words = message.content
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word));

      for (const word of words) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    }

    // Sort by frequency and return top terms
    const popularTerms = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTerms)
      .map(([term, count]) => ({ term, count }));

    return {
      popularTerms,
      timeframe: `${timeframeDays} days`,
      totalMessages: recentMessages.length,
    };
  } catch (error) {
    logger.error("Error getting popular search terms:", error);
    throw new Error("Failed to get popular search terms");
  }
}

// Calculate search relevance score (simplified)
function calculateRelevanceScore(content: string, query: string): number {
  if (!query || !content) return 0;

  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 0);

  let score = 0;
  let totalTerms = queryTerms.length;

  for (const term of queryTerms) {
    // Exact match
    if (contentLower.includes(term)) {
      score += 1;
      
      // Boost for word boundaries
      const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i');
      if (wordBoundaryRegex.test(content)) {
        score += 0.5;
      }
      
      // Boost for position (earlier = better)
      const position = contentLower.indexOf(term);
      if (position < 50) score += 0.3;
      else if (position < 100) score += 0.1;
    }
  }

  return totalTerms > 0 ? (score / totalTerms) * 100 : 0;
}

// Search message attachments
export async function searchMessageAttachments(
  query: string,
  userEmail: string,
  options: {
    fileTypes?: string[];
    channelIds?: string[];
    limit?: number;
    offset?: number;
  } = {}
) {
  try {
    const db = getDatabase();
    // Search messages that have attachments matching the query
    const messages = await db
      .select({
        id: messageTable.id,
        channelId: messageTable.channelId,
        userEmail: messageTable.userEmail,
        content: messageTable.content,
        attachments: messageTable.attachments,
        createdAt: messageTable.createdAt,
        channelName: channelTable.name,
        userName: userTable.name,
      })
      .from(messageTable)
      .leftJoin(channelTable, eq(messageTable.channelId, channelTable.id))
      .leftJoin(userTable, eq(messageTable.userEmail, userTable.email))
      .where(
        and(
          sql`${messageTable.attachments} IS NOT NULL`,
          sql`${messageTable.attachments} != '[]'`,
          like(messageTable.attachments, `%${query}%`),
          eq(messageTable.deletedAt, null),
          options.channelIds ? inArray(messageTable.channelId, options.channelIds) : sql`1=1`
        )
      )
      .orderBy(desc(messageTable.createdAt))
      .limit(options.limit || 20)
      .offset(options.offset || 0);

    // Process and filter attachments
    const results = messages.map(message => {
      const attachments = message.attachments ? JSON.parse(message.attachments) : [];
      const matchingAttachments = attachments.filter((att: any) => {
        const nameMatch = att.name?.toLowerCase().includes(query.toLowerCase());
        const typeMatch = !options.fileTypes || options.fileTypes.includes(att.type);
        return nameMatch && typeMatch;
      });

      return {
        ...message,
        attachments: matchingAttachments,
        totalAttachments: attachments.length,
        matchingAttachments: matchingAttachments.length,
      };
    }).filter(msg => msg.matchingAttachments > 0);

    return {
      results,
      query,
      totalResults: results.length,
    };
  } catch (error) {
    logger.error("Error searching message attachments:", error);
    throw new Error("Failed to search message attachments");
  }
}

