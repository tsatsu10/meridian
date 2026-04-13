/**
 * Advanced Search Service
 * Full-text search using MeiliSearch
 * Phase 0 - Advanced Search Implementation
 */

import { MeiliSearch, Index } from 'meilisearch';
import logger from '../../utils/logger';

interface SearchConfig {
  host: string;
  apiKey: string;
}

interface SearchableDocument {
  id: string;
  type: 'user' | 'project' | 'task' | 'file' | 'message';
  title: string;
  content: string;
  workspaceId: string;
  projectId?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

interface SearchOptions {
  query: string;
  filters?: string;
  limit?: number;
  offset?: number;
  attributesToHighlight?: string[];
  attributesToRetrieve?: string[];
  sort?: string[];
}

interface SearchResult {
  hits: any[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
}

export class SearchService {
  private client: MeiliSearch;
  private indices: Map<string, Index> = new Map();

  constructor(config: SearchConfig) {
    this.client = new MeiliSearch({
      host: config.host,
      apiKey: config.apiKey,
    });
  }

  /**
   * Initialize search indices
   */
  async initialize(): Promise<void> {
    try {
      logger.debug('🔍 Initializing search indices...');

      // Create indices for each searchable type
      const indexNames = ['users', 'projects', 'tasks', 'files', 'messages'];

      for (const indexName of indexNames) {
        const index = this.client.index(indexName);
        this.indices.set(indexName, index);

        // Configure index settings
        await this.configureIndex(indexName, index);
      }

      logger.debug('✅ Search indices initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize search indices:', error);
      throw error;
    }
  }

  /**
   * Configure index settings
   */
  private async configureIndex(indexName: string, index: Index): Promise<void> {
    const commonSettings = {
      filterableAttributes: ['type', 'workspaceId', 'projectId', 'createdAt'],
      sortableAttributes: ['createdAt', 'updatedAt'],
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ],
    };

    switch (indexName) {
      case 'users':
        await index.updateSettings({
          ...commonSettings,
          searchableAttributes: ['title', 'content', 'email', 'name'],
          displayedAttributes: ['id', 'title', 'type', 'email', 'name', 'avatar'],
        });
        break;

      case 'projects':
        await index.updateSettings({
          ...commonSettings,
          searchableAttributes: ['title', 'content', 'description'],
          displayedAttributes: ['id', 'title', 'type', 'description', 'status'],
        });
        break;

      case 'tasks':
        await index.updateSettings({
          ...commonSettings,
          searchableAttributes: ['title', 'content', 'description'],
          displayedAttributes: ['id', 'title', 'type', 'description', 'status', 'priority'],
        });
        break;

      case 'files':
        await index.updateSettings({
          ...commonSettings,
          searchableAttributes: ['title', 'content', 'fileName', 'originalName'],
          displayedAttributes: ['id', 'title', 'type', 'fileName', 'mimeType', 'url'],
        });
        break;

      case 'messages':
        await index.updateSettings({
          ...commonSettings,
          searchableAttributes: ['content', 'title'],
          displayedAttributes: ['id', 'content', 'type', 'channelId', 'senderId'],
        });
        break;
    }
  }

  /**
   * Index a document
   */
  async indexDocument(
    type: string,
    document: SearchableDocument
  ): Promise<void> {
    try {
      const index = this.indices.get(`${type}s`);
      if (!index) {
        throw new Error(`Index for type "${type}" not found`);
      }

      await index.addDocuments([document], { primaryKey: 'id' });
    } catch (error) {
      logger.error(`❌ Failed to index ${type}:`, error);
      throw error;
    }
  }

  /**
   * Index multiple documents
   */
  async indexDocuments(
    type: string,
    documents: SearchableDocument[]
  ): Promise<void> {
    try {
      const index = this.indices.get(`${type}s`);
      if (!index) {
        throw new Error(`Index for type "${type}" not found`);
      }

      await index.addDocuments(documents, { primaryKey: 'id' });
      logger.debug(`✅ Indexed ${documents.length} ${type}(s)`);
    } catch (error) {
      logger.error(`❌ Failed to index ${type}s:`, error);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async updateDocument(
    type: string,
    document: Partial<SearchableDocument> & { id: string }
  ): Promise<void> {
    try {
      const index = this.indices.get(`${type}s`);
      if (!index) {
        throw new Error(`Index for type "${type}" not found`);
      }

      await index.updateDocuments([document], { primaryKey: 'id' });
    } catch (error) {
      logger.error(`❌ Failed to update ${type}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(type: string, id: string): Promise<void> {
    try {
      const index = this.indices.get(`${type}s`);
      if (!index) {
        throw new Error(`Index for type "${type}" not found`);
      }

      await index.deleteDocument(id);
    } catch (error) {
      logger.error(`❌ Failed to delete ${type}:`, error);
      throw error;
    }
  }

  /**
   * Search across a specific type
   */
  async search(
    type: string,
    options: SearchOptions
  ): Promise<SearchResult> {
    try {
      const index = this.indices.get(`${type}s`);
      if (!index) {
        throw new Error(`Index for type "${type}" not found`);
      }

      const result = await index.search(options.query, {
        filter: options.filters,
        limit: options.limit || 20,
        offset: options.offset || 0,
        attributesToHighlight: options.attributesToHighlight || ['title', 'content'],
        attributesToRetrieve: options.attributesToRetrieve || ['*'],
        sort: options.sort,
      });

      return result as SearchResult;
    } catch (error) {
      logger.error(`❌ Search failed for ${type}:`, error);
      throw error;
    }
  }

  /**
   * Search across all types
   */
  async searchAll(options: SearchOptions): Promise<{
    [key: string]: SearchResult;
  }> {
    const results: { [key: string]: SearchResult } = {};

    const types = ['users', 'projects', 'tasks', 'files', 'messages'];

    await Promise.all(
      types.map(async (type) => {
        try {
          results[type] = await this.search(type, options);
        } catch (error) {
          logger.error(`Failed to search ${type}:`, error);
          results[type] = {
            hits: [],
            query: options.query,
            processingTimeMs: 0,
            limit: options.limit || 20,
            offset: options.offset || 0,
            estimatedTotalHits: 0,
          };
        }
      })
    );

    return results;
  }

  /**
   * Get search suggestions/autocomplete
   */
  async getSuggestions(
    type: string,
    query: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      const result = await this.search(type, {
        query,
        limit,
        attributesToRetrieve: ['title'],
      });

      return result.hits.map((hit: any) => hit.title).filter(Boolean);
    } catch (error) {
      logger.error('❌ Failed to get suggestions:', error);
      return [];
    }
  }

  /**
   * Clear all documents from an index
   */
  async clearIndex(type: string): Promise<void> {
    try {
      const index = this.indices.get(`${type}s`);
      if (!index) {
        throw new Error(`Index for type "${type}" not found`);
      }

      await index.deleteAllDocuments();
      logger.debug(`✅ Cleared ${type}s index`);
    } catch (error) {
      logger.error(`❌ Failed to clear ${type}s index:`, error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getStats(type: string): Promise<any> {
    try {
      const index = this.indices.get(`${type}s`);
      if (!index) {
        throw new Error(`Index for type "${type}" not found`);
      }

      return await index.getStats();
    } catch (error) {
      logger.error(`❌ Failed to get stats for ${type}:`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.health();
      return health.status === 'available';
    } catch (error) {
      logger.error('❌ Search service health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let searchServiceInstance: SearchService | null = null;

export function getSearchService(config?: SearchConfig): SearchService {
  if (!searchServiceInstance && config) {
    searchServiceInstance = new SearchService(config);
  }

  if (!searchServiceInstance) {
    throw new Error('Search service not initialized. Please provide config on first call.');
  }

  return searchServiceInstance;
}

export async function initializeSearchService(config: SearchConfig): Promise<SearchService> {
  const service = getSearchService(config);
  await service.initialize();
  return service;
}


