// @epic-3.1-messaging: Enhanced search service with FTS5 and ranking
// @persona-sarah: PM needs fast, accurate search across all communications
// @persona-david: Team lead needs efficient search with relevance ranking

import { getDatabase } from "../database/connection";
import { users } from '../database/schema';
import { messageTable } from '../database/schema/messages';
import { sql, eq, and, desc, ilike } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';
import logger from '../utils/logger';

interface SearchQuery {
  search?: string;
  userEmail?: string;
  channelId?: string;
  messageType?: string;
  dateFrom?: string;
  dateTo?: string;
  isPinned?: boolean;
  limit?: number;
  offset?: number;
}

interface SearchResult {
  id: string;
  content: string;
  messageType: string;
  userEmail: string;
  userName?: string;
  channelId: string;
  createdAt: Date;
  isEdited: boolean;
  isPinned: boolean;
  relevanceScore: number;
  matchHighlights?: string[];
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  query: {
    terms: string[];
    filters: Record<string, any>;
  };
  performance: {
    queryTime: number;
    fromCache: boolean;
  };
}

// Cache configuration
const searchCache = new LRUCache<string, SearchResponse>({
  max: 1000, // Cache up to 1000 search results
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  allowStale: true,
  updateAgeOnGet: true,
});

export class SearchService {
  private static instance: SearchService;

  private getDb() {
    return getDatabase();
  }

  static getInstance(): SearchService {
    if (!this.instance) {
      this.instance = new SearchService();
    }
    return this.instance;
  }

  /**
   * Enhanced search using FTS5 with ranking and caching
   */
  async search(query: SearchQuery, requestingUserEmail: string): Promise<SearchResponse> {
    const startTime = Date.now();
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(query, requestingUserEmail);
    
    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        performance: {
          queryTime: Date.now() - startTime,
          fromCache: true,
        }
      };
    }

    const {
      search = '',
      userEmail,
      channelId,
      messageType,
      dateFrom,
      dateTo,
      isPinned,
      limit = 50,
      offset = 0
    } = query;

    try {
      let results: SearchResult[] = [];
      let totalCount = 0;

      if (search.trim()) {
        // PostgreSQL: ILIKE on message content (SQLite FTS5 tables are not used)
        const queryResult = await this.performRegularSearch(query, limit, offset, {
          text: search.trim(),
        });
        results = queryResult.results;
        totalCount = queryResult.totalCount;
      } else {
        const queryResult = await this.performRegularSearch(query, limit, offset);
        results = queryResult.results;
        totalCount = queryResult.totalCount;
      }

      const response: SearchResponse = {
        results,
        totalCount,
        pagination: {
          limit,
          offset,
          hasMore: results.length === limit && (offset + limit) < totalCount,
        },
        query: {
          terms: search ? this.extractSearchTerms(search) : [],
          filters: this.extractFilters(query),
        },
        performance: {
          queryTime: Date.now() - startTime,
          fromCache: false,
        }
      };

      // Cache the result
      searchCache.set(cacheKey, response);

      return response;
    } catch (error) {
      logger.error('❌ Search service error:', error);
      throw new Error('Search failed');
    }
  }

  /**
   * Get search suggestions based on query prefix
   */
  async getSuggestions(prefix: string, limit: number = 10): Promise<string[]> {
    if (!prefix.trim() || prefix.length < 2) {
      return [];
    }

    try {
      const pattern = `%${prefix}%`;
      const suggestionResult = await this.getDb()
        .select({ content: messageTable.content })
        .from(messageTable)
        .where(ilike(messageTable.content, pattern))
        .orderBy(desc(messageTable.createdAt))
        .limit(limit);

      return suggestionResult
        .map((row) => (row.content ?? '').slice(0, 100))
        .filter((suggestion) => suggestion.length > prefix.length)
        .slice(0, limit);
    } catch (error) {
      logger.error('❌ Error getting search suggestions:', error);
      return [];
    }
  }

  private async performRegularSearch(
    query: SearchQuery,
    limit: number,
    offset: number,
    options?: { text?: string }
  ): Promise<{ results: SearchResult[]; totalCount: number }> {
    const {
      userEmail,
      channelId,
      messageType,
      dateFrom,
      dateTo,
      isPinned
    } = query;

    let whereConditions = [];

    if (userEmail) {
      whereConditions.push(eq(users.email, userEmail));
    }
    if (channelId) {
      whereConditions.push(eq(messageTable.channelId, channelId));
    }
    if (messageType) {
      whereConditions.push(eq(messageTable.messageType, messageType));
    }
    if (dateFrom) {
      whereConditions.push(sql`${messageTable.createdAt} >= ${new Date(dateFrom).toISOString()}`);
    }
    if (dateTo) {
      whereConditions.push(sql`${messageTable.createdAt} <= ${new Date(dateTo).toISOString()}`);
    }
    if (isPinned !== undefined) {
      // Legacy filter: messages table has no is_pinned column; treat as no-op when false
      if (isPinned) {
        whereConditions.push(sql`1 = 0`);
      }
    }

    if (options?.text?.trim()) {
      const raw = options.text.trim();
      const likePattern = `%${raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      whereConditions.push(ilike(messageTable.content, likePattern));
    }

    const messages = await this.getDb()
      .select({
        id: messageTable.id,
        content: messageTable.content,
        messageType: messageTable.messageType,
        userEmail: users.email,
        channelId: messageTable.channelId,
        createdAt: messageTable.createdAt,
        isEdited: messageTable.isEdited,
      })
      .from(messageTable)
      .leftJoin(users, eq(messageTable.userId, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(messageTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const countResult = await this.getDb()
      .select({ count: sql`COUNT(*)` })
      .from(messageTable)
      .leftJoin(users, eq(messageTable.userId, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const totalCount = (countResult[0] as any)?.count || 0;

    const results: SearchResult[] = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      messageType: msg.messageType,
      userEmail: msg.userEmail ?? '',
      channelId: msg.channelId ?? '',
      createdAt: new Date(msg.createdAt),
      isEdited: msg.isEdited || false,
      isPinned: false,
      relevanceScore: 1.0, // Default relevance for non-FTS searches
    }));

    return { results, totalCount };
  }

  private generateCacheKey(query: SearchQuery, userEmail: string): string {
    const keyData = {
      ...query,
      requestingUser: userEmail,
    };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  private extractSearchTerms(search: string): string[] {
    return search
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0)
      .slice(0, 10); // Limit to 10 terms
  }

  private extractFilters(query: SearchQuery): Record<string, any> {
    const filters: Record<string, any> = {};
    
    if (query.userEmail) filters.userEmail = query.userEmail;
    if (query.channelId) filters.channelId = query.channelId;
    if (query.messageType) filters.messageType = query.messageType;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;
    if (query.isPinned !== undefined) filters.isPinned = query.isPinned;
    
    return filters;
  }

  private extractHighlights(highlightedContent: string): string[] {
    if (!highlightedContent) return [];
    
    const matches = highlightedContent.match(/<mark>.*?<\/mark>/g);
    return matches ? matches.map(match => match.replace(/<\/?mark>/g, '')) : [];
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    searchCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: searchCache.size,
      maxSize: searchCache.max,
      calculatedSize: searchCache.calculatedSize,
    };
  }
}

export default SearchService.getInstance();

