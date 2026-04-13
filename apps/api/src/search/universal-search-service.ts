/**
 * Universal Search Service - Advanced search across all entities
 *
 * This service provides comprehensive search functionality across:
 * - Tasks, Projects, Workspaces
 * - Messages, Comments, Files
 * - Users, Teams, Milestones
 *
 * Features:
 * - Full-text search with relevance ranking
 * - Faceted search and filtering
 * - Search suggestions and autocomplete
 * - Search history and saved searches
 * - Performance optimization with caching
 */

import { getDatabase } from "../database/connection";
import {
  taskTable,
  projectTable,
  workspaceTable,
  messageTable,
  userTable,
  notificationTable,
  milestoneTable,
  activityTable,
  attachmentTable
} from '../database/schema';
import { sql, eq, and, or, desc, asc, like, ilike } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';
import logger from '../utils/logger';

// Entity types that can be searched
export type SearchEntityType =
  | 'task'
  | 'project'
  | 'workspace'
  | 'message'
  | 'user'
  | 'file'
  | 'milestone'
  | 'comment'
  | 'all';

// Search query interface
export interface UniversalSearchQuery {
  query?: string;
  entityTypes?: SearchEntityType[];
  workspaceId?: string;
  projectId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  status?: string;
  priority?: string;
  assigneeId?: string;
  authorId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'title' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// Universal search result interface
export interface UniversalSearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  content: string;
  url: string;
  relevanceScore: number;
  matchHighlights: string[];
  metadata: {
    createdAt: string;
    updatedAt?: string;
    author?: {
      id: string;
      name: string;
      email: string;
    };
    workspace?: {
      id: string;
      name: string;
    };
    project?: {
      id: string;
      name: string;
    };
    status?: string;
    priority?: string;
    tags?: string[];
    fileType?: string;
    size?: number;
  };
}

// Search facets for filtering
export interface SearchFacet {
  name: string;
  label: string;
  values: Array<{
    value: string;
    label: string;
    count: number;
  }>;
}

// Search response with facets and pagination
export interface UniversalSearchResponse {
  results: UniversalSearchResult[];
  facets: SearchFacet[];
  totalCount: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    totalPages: number;
  };
  query: {
    original: string;
    processed: string;
    terms: string[];
    filters: Record<string, any>;
  };
  performance: {
    queryTime: number;
    fromCache: boolean;
    entityCounts: Record<SearchEntityType, number>;
  };
}

// Saved search interface
export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: UniversalSearchQuery;
  isPublic: boolean;
  createdAt: string;
  lastUsed: string;
  useCount: number;
}

// Search suggestion interface
export interface SearchSuggestion {
  text: string;
  type: 'query' | 'entity' | 'filter';
  entityType?: SearchEntityType;
  entityId?: string;
  score: number;
}

// Cache configuration
const searchCache = new LRUCache<string, UniversalSearchResponse>({
  max: 2000,
  ttl: 1000 * 60 * 10, // 10 minutes TTL
  allowStale: true,
  updateAgeOnGet: true,
});

const suggestionCache = new LRUCache<string, SearchSuggestion[]>({
  max: 1000,
  ttl: 1000 * 60 * 30, // 30 minutes TTL
});

export class UniversalSearchService {
  private static instance: UniversalSearchService;

  static getInstance(): UniversalSearchService {
    if (!this.instance) {
      this.instance = new UniversalSearchService();
    }
    return this.instance;
  }

  /**
   * Universal search across all entities
   */
  async search(
    query: UniversalSearchQuery,
    requestingUserId: string
  ): Promise<UniversalSearchResponse> {
    const startTime = Date.now();

    // Generate cache key
    const cacheKey = this.generateCacheKey(query, requestingUserId);

    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        performance: {
          ...cached.performance,
          queryTime: Date.now() - startTime,
          fromCache: true,
        }
      };
    }

    try {
      const {
        query: searchText = '',
        entityTypes = ['all'],
        limit = 50,
        offset = 0,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = query;

      // Determine which entities to search
      const searchEntityTypes = entityTypes.includes('all')
        ? ['task', 'project', 'workspace', 'message', 'user', 'file', 'milestone'] as SearchEntityType[]
        : entityTypes;

      // Perform parallel searches across entity types
      const searchPromises = searchEntityTypes.map(entityType =>
        this.searchEntity(entityType, query, requestingUserId)
      );

      const entityResults = await Promise.all(searchPromises);

      // Combine and rank results
      const allResults = entityResults.flat();
      const rankedResults = this.rankAndSortResults(allResults, searchText, sortBy, sortOrder);

      // Apply pagination
      const paginatedResults = rankedResults.slice(offset, offset + limit);

      // Generate facets
      const facets = this.generateFacets(allResults, query);

      // Count results per entity type
      const entityCounts = this.countResultsByEntity(allResults);

      const response: UniversalSearchResponse = {
        results: paginatedResults,
        facets,
        totalCount: allResults.length,
        pagination: {
          limit,
          offset,
          hasMore: (offset + limit) < allResults.length,
          totalPages: Math.ceil(allResults.length / limit),
        },
        query: {
          original: searchText,
          processed: this.processSearchQuery(searchText),
          terms: this.extractSearchTerms(searchText),
          filters: this.extractFilters(query),
        },
        performance: {
          queryTime: Date.now() - startTime,
          fromCache: false,
          entityCounts,
        }
      };

      // Cache the result
      searchCache.set(cacheKey, response);

      return response;
    } catch (error) {
      logger.error('❌ Universal search error:', error);
      throw new Error('Search failed');
    }
  }

  /**
   * Search specific entity type
   */
  private async searchEntity(
    entityType: SearchEntityType,
    query: UniversalSearchQuery,
    requestingUserId: string
  ): Promise<UniversalSearchResult[]> {
    const db = getDatabase();
    const searchText = query.query || '';

    try {
      switch (entityType) {
        case 'task':
          return await this.searchTasks(db, query, requestingUserId);
        case 'project':
          return await this.searchProjects(db, query, requestingUserId);
        case 'workspace':
          return await this.searchWorkspaces(db, query, requestingUserId);
        case 'message':
          return await this.searchMessages(db, query, requestingUserId);
        case 'user':
          return await this.searchUsers(db, query, requestingUserId);
        case 'file':
          return await this.searchFiles(db, query, requestingUserId);
        case 'milestone':
          return await this.searchMilestones(db, query, requestingUserId);
        default:
          return [];
      }
    } catch (error) {
      logger.error(`❌ Error searching ${entityType}:`, error);
      return [];
    }
  }

  /**
   * Search tasks
   */
  private async searchTasks(db: any, query: UniversalSearchQuery, userId: string): Promise<UniversalSearchResult[]> {
    const { query: searchText = '', workspaceId, projectId, status, priority, assigneeId } = query;

    let whereConditions = [];

    // Text search
    if (searchText.trim()) {
      whereConditions.push(
        or(
          ilike(taskTable.title, `%${searchText}%`),
          ilike(taskTable.description, `%${searchText}%`)
        )
      );
    }

    // Filter conditions
    if (workspaceId) whereConditions.push(eq(taskTable.workspaceId, workspaceId));
    if (projectId) whereConditions.push(eq(taskTable.projectId, projectId));
    if (status) whereConditions.push(eq(taskTable.status, status));
    if (priority) whereConditions.push(eq(taskTable.priority, priority));
    if (assigneeId) whereConditions.push(eq(taskTable.assigneeId, assigneeId));

    const tasks = await db
      .select({
        id: taskTable.id,
        title: taskTable.title,
        description: taskTable.description,
        status: taskTable.status,
        priority: taskTable.priority,
        assigneeId: taskTable.assigneeId,
        projectId: taskTable.projectId,
        workspaceId: taskTable.workspaceId,
        createdAt: taskTable.createdAt,
        updatedAt: taskTable.updatedAt,
      })
      .from(taskTable)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(100);

    return tasks.map(task => ({
      id: task.id,
      type: 'task' as SearchEntityType,
      title: task.title,
      content: task.description || '',
      url: `/dashboard/workspace/${task.workspaceId}/project/${task.projectId}/task/${task.id}`,
      relevanceScore: this.calculateRelevanceScore(searchText, task.title, task.description),
      matchHighlights: this.extractHighlights(searchText, [task.title, task.description].join(' ')),
      metadata: {
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        status: task.status,
        priority: task.priority,
        workspace: { id: task.workspaceId, name: '' },
        project: { id: task.projectId, name: '' },
      },
    }));
  }

  /**
   * Search projects
   */
  private async searchProjects(db: any, query: UniversalSearchQuery, userId: string): Promise<UniversalSearchResult[]> {
    const { query: searchText = '', workspaceId } = query;

    let whereConditions = [];

    if (searchText.trim()) {
      whereConditions.push(
        or(
          ilike(projectTable.name, `%${searchText}%`),
          ilike(projectTable.description, `%${searchText}%`)
        )
      );
    }

    if (workspaceId) whereConditions.push(eq(projectTable.workspaceId, workspaceId));

    const projects = await db
      .select({
        id: projectTable.id,
        name: projectTable.name,
        description: projectTable.description,
        workspaceId: projectTable.workspaceId,
        createdAt: projectTable.createdAt,
        updatedAt: projectTable.updatedAt,
      })
      .from(projectTable)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(100);

    return projects.map(project => ({
      id: project.id,
      type: 'project' as SearchEntityType,
      title: project.name,
      content: project.description || '',
      url: `/dashboard/workspace/${project.workspaceId}/project/${project.id}`,
      relevanceScore: this.calculateRelevanceScore(searchText, project.name, project.description),
      matchHighlights: this.extractHighlights(searchText, [project.name, project.description].join(' ')),
      metadata: {
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        workspace: { id: project.workspaceId, name: '' },
      },
    }));
  }

  /**
   * Search messages (reuse existing functionality)
   */
  private async searchMessages(db: any, query: UniversalSearchQuery, userId: string): Promise<UniversalSearchResult[]> {
    const { query: searchText = '', workspaceId } = query;

    let whereConditions = [];

    if (searchText.trim()) {
      whereConditions.push(ilike(messageTable.content, `%${searchText}%`));
    }

    const messages = await db
      .select({
        id: messageTable.id,
        content: messageTable.content,
        userEmail: messageTable.userEmail,
        channelId: messageTable.channelId,
        createdAt: messageTable.createdAt,
      })
      .from(messageTable)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .limit(50);

    return messages.map(message => ({
      id: message.id,
      type: 'message' as SearchEntityType,
      title: `Message from ${message.userEmail}`,
      content: message.content,
      url: `/dashboard/chat?channel=${message.channelId}&message=${message.id}`,
      relevanceScore: this.calculateRelevanceScore(searchText, '', message.content),
      matchHighlights: this.extractHighlights(searchText, message.content),
      metadata: {
        createdAt: message.createdAt,
        author: { id: message.userEmail, name: message.userEmail, email: message.userEmail },
      },
    }));
  }

  /**
   * Search other entity types (placeholder implementations)
   */
  private async searchWorkspaces(db: any, query: UniversalSearchQuery, userId: string): Promise<UniversalSearchResult[]> {
    // Implementation for workspace search
    return [];
  }

  private async searchUsers(db: any, query: UniversalSearchQuery, userId: string): Promise<UniversalSearchResult[]> {
    // Implementation for user search
    return [];
  }

  private async searchFiles(db: any, query: UniversalSearchQuery, userId: string): Promise<UniversalSearchResult[]> {
    // Implementation for file search
    return [];
  }

  private async searchMilestones(db: any, query: UniversalSearchQuery, userId: string): Promise<UniversalSearchResult[]> {
    // Implementation for milestone search
    return [];
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(prefix: string, limit: number = 10): Promise<SearchSuggestion[]> {
    if (!prefix.trim() || prefix.length < 2) {
      return [];
    }

    const cacheKey = `suggestions:${prefix}:${limit}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const suggestions: SearchSuggestion[] = [];

      // Add entity-specific suggestions
      const entitySuggestions = await this.getEntitySuggestions(prefix, limit);
      suggestions.push(...entitySuggestions);

      // Add query suggestions from search history
      const querySuggestions = await this.getQuerySuggestions(prefix, limit);
      suggestions.push(...querySuggestions);

      // Sort by score and limit
      const sortedSuggestions = suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      suggestionCache.set(cacheKey, sortedSuggestions);
      return sortedSuggestions;
    } catch (error) {
      logger.error('❌ Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Save a search for later use
   */
  async saveSearch(userId: string, name: string, searchQuery: UniversalSearchQuery): Promise<SavedSearch> {
    const savedSearch: SavedSearch = {
      id: crypto.randomUUID(),
      userId,
      name,
      query: searchQuery,
      isPublic: false,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      useCount: 1,
    };

    // TODO: Implement database storage for saved searches

    return savedSearch;
  }

  /**
   * Get saved searches for a user
   */
  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    // TODO: Implement database retrieval of saved searches
    return [];
  }

  /**
   * Utility methods
   */
  private calculateRelevanceScore(searchText: string, title: string, content: string): number {
    if (!searchText.trim()) return 1.0;

    const terms = searchText.toLowerCase().split(/\s+/);
    const titleLower = title.toLowerCase();
    const contentLower = content?.toLowerCase() || '';

    let score = 0;

    terms.forEach(term => {
      // Title matches are worth more
      if (titleLower.includes(term)) {
        score += titleLower === term ? 3.0 : 2.0;
      }

      // Content matches
      if (contentLower.includes(term)) {
        score += 1.0;
      }
    });

    return Math.min(score, 5.0); // Cap at 5.0
  }

  private extractHighlights(searchText: string, content: string): string[] {
    if (!searchText.trim() || !content) return [];

    const terms = searchText.toLowerCase().split(/\s+/);
    const highlights: string[] = [];

    terms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        highlights.push(...matches);
      }
    });

    return [...new Set(highlights)];
  }

  private rankAndSortResults(
    results: UniversalSearchResult[],
    searchText: string,
    sortBy: string,
    sortOrder: string
  ): UniversalSearchResult[] {
    let sorted = [...results];

    switch (sortBy) {
      case 'relevance':
        sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
      case 'date':
        sorted.sort((a, b) => new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime());
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    if (sortOrder === 'asc') {
      sorted.reverse();
    }

    return sorted;
  }

  private generateFacets(results: UniversalSearchResult[], query: UniversalSearchQuery): SearchFacet[] {
    const facets: SearchFacet[] = [];

    // Entity type facet
    const entityCounts = this.countResultsByEntity(results);
    facets.push({
      name: 'entityType',
      label: 'Content Type',
      values: Object.entries(entityCounts).map(([type, count]) => ({
        value: type,
        label: this.formatEntityTypeLabel(type as SearchEntityType),
        count,
      })),
    });

    // Add more facets as needed (status, priority, etc.)

    return facets;
  }

  private countResultsByEntity(results: UniversalSearchResult[]): Record<SearchEntityType, number> {
    const counts: Record<string, number> = {};

    results.forEach(result => {
      counts[result.type] = (counts[result.type] || 0) + 1;
    });

    return counts as Record<SearchEntityType, number>;
  }

  private formatEntityTypeLabel(type: SearchEntityType): string {
    const labels: Record<SearchEntityType, string> = {
      task: 'Tasks',
      project: 'Projects',
      workspace: 'Workspaces',
      message: 'Messages',
      user: 'People',
      file: 'Files',
      milestone: 'Milestones',
      comment: 'Comments',
      all: 'All',
    };

    return labels[type] || type;
  }

  private async getEntitySuggestions(prefix: string, limit: number): Promise<SearchSuggestion[]> {
    // TODO: Implement entity-based suggestions
    return [];
  }

  private async getQuerySuggestions(prefix: string, limit: number): Promise<SearchSuggestion[]> {
    // TODO: Implement query suggestions from search history
    return [];
  }

  private processSearchQuery(query: string): string {
    return query.trim().toLowerCase();
  }

  private extractSearchTerms(search: string): string[] {
    return search
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0)
      .slice(0, 10);
  }

  private extractFilters(query: UniversalSearchQuery): Record<string, any> {
    const filters: Record<string, any> = {};

    if (query.entityTypes) filters.entityTypes = query.entityTypes;
    if (query.workspaceId) filters.workspaceId = query.workspaceId;
    if (query.projectId) filters.projectId = query.projectId;
    if (query.status) filters.status = query.status;
    if (query.priority) filters.priority = query.priority;
    if (query.dateFrom) filters.dateFrom = query.dateFrom;
    if (query.dateTo) filters.dateTo = query.dateTo;

    return filters;
  }

  private generateCacheKey(query: UniversalSearchQuery, userId: string): string {
    const keyData = { ...query, userId };
    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    searchCache.clear();
    suggestionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      searchCache: {
        size: searchCache.size,
        maxSize: searchCache.max,
      },
      suggestionCache: {
        size: suggestionCache.size,
        maxSize: suggestionCache.max,
      },
    };
  }
}

export default UniversalSearchService.getInstance();

