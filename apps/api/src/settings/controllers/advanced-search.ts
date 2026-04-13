/**
 * Advanced Search Controller
 * Handles workspace-wide search with filters and saved searches
 */

import { eq, and, or, like, sql, desc, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  projectTable,
  taskTable,
  userTable,
  messageTable,
  workspaceTable,
} from "../../database/schema";
import { createId } from "@paralleldrive/cuid2";

export interface SearchFilters {
  query?: string;
  types?: ('project' | 'task' | 'user' | 'message')[];
  status?: string[];
  priority?: string[];
  assignedTo?: string[];
  createdBy?: string[];
  startDate?: string;
  endDate?: string;
  tags?: string[];
}

export interface SearchResult {
  id: string;
  type: 'project' | 'task' | 'user' | 'message';
  title: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
  relevance: number;
}

export interface SavedSearch {
  id: string;
  workspaceId: string;
  userEmail: string;
  name: string;
  filters: SearchFilters;
  isPublic: boolean;
  createdAt: Date;
  lastUsed?: Date;
  useCount: number;
}

// Perform advanced search
export async function performSearch(
  workspaceId: string,
  filters: SearchFilters,
  limit: number = 50
): Promise<SearchResult[]> {
  const db = getDatabase();
  const results: SearchResult[] = [];
  
  const searchTypes = filters.types || ['project', 'task', 'user', 'message'];
  const query = filters.query?.toLowerCase() || '';
  
  // Search Projects
  if (searchTypes.includes('project')) {
    const projectWhere: any[] = [eq(projectTable.workspaceId, workspaceId)];
    
    if (query) {
      projectWhere.push(
        or(
          like(projectTable.name, `%${query}%`),
          like(projectTable.description, `%${query}%`)
        )
      );
    }
    
    if (filters.status && filters.status.length > 0) {
      projectWhere.push(inArray(projectTable.status, filters.status));
    }
    
    if (filters.createdBy && filters.createdBy.length > 0) {
      projectWhere.push(inArray(projectTable.ownerEmail, filters.createdBy));
    }
    
    const projects = await db
      .select()
      .from(projectTable)
      .where(and(...projectWhere))
      .limit(limit);
    
    results.push(...projects.map(p => ({
      id: p.id,
      type: 'project' as const,
      title: p.name,
      description: p.description || undefined,
      metadata: {
        status: p.status,
        owner: p.ownerEmail,
        memberCount: 0, // Would need to join
      },
      createdAt: p.createdAt,
      updatedAt: p.updatedAt || p.createdAt,
      relevance: calculateRelevance(query, p.name, p.description),
    })));
  }
  
  // Search Tasks
  if (searchTypes.includes('task')) {
    const taskWhere: any[] = [eq(taskTable.workspaceId, workspaceId)];
    
    if (query) {
      taskWhere.push(
        or(
          like(taskTable.title, `%${query}%`),
          like(taskTable.description, `%${query}%`)
        )
      );
    }
    
    if (filters.status && filters.status.length > 0) {
      taskWhere.push(inArray(taskTable.status, filters.status));
    }
    
    if (filters.priority && filters.priority.length > 0) {
      taskWhere.push(inArray(taskTable.priority, filters.priority));
    }
    
    if (filters.assignedTo && filters.assignedTo.length > 0) {
      taskWhere.push(inArray(taskTable.assignee, filters.assignedTo));
    }
    
    const tasks = await db
      .select()
      .from(taskTable)
      .where(and(...taskWhere))
      .limit(limit);
    
    results.push(...tasks.map(t => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      description: t.description || undefined,
      metadata: {
        status: t.status,
        priority: t.priority,
        assignee: t.assignee,
        projectId: t.projectId,
      },
      createdAt: t.createdAt,
      updatedAt: t.updatedAt || t.createdAt,
      relevance: calculateRelevance(query, t.title, t.description),
    })));
  }
  
  // Search Users
  if (searchTypes.includes('user')) {
    const userWhere: any[] = [];
    
    if (query) {
      userWhere.push(
        or(
          like(userTable.name, `%${query}%`),
          like(userTable.email, `%${query}%`)
        )
      );
    }
    
    const users = await db
      .select()
      .from(userTable)
      .where(userWhere.length > 0 ? and(...userWhere) : undefined)
      .limit(limit);
    
    results.push(...users.map(u => ({
      id: u.email,
      type: 'user' as const,
      title: u.name,
      description: u.email,
      metadata: {
        role: u.role,
        avatarUrl: u.avatarUrl,
      },
      createdAt: u.createdAt,
      relevance: calculateRelevance(query, u.name, u.email),
    })));
  }
  
  // Search Messages
  if (searchTypes.includes('message')) {
    const messageWhere: any[] = [eq(messageTable.workspaceId, workspaceId)];
    
    if (query) {
      messageWhere.push(like(messageTable.content, `%${query}%`));
    }
    
    if (filters.createdBy && filters.createdBy.length > 0) {
      messageWhere.push(inArray(messageTable.senderEmail, filters.createdBy));
    }
    
    const messages = await db
      .select()
      .from(messageTable)
      .where(and(...messageWhere))
      .limit(limit);
    
    results.push(...messages.map(m => ({
      id: m.id,
      type: 'message' as const,
      title: m.content.substring(0, 100),
      description: m.content,
      metadata: {
        sender: m.senderEmail,
        channelId: m.channelId,
      },
      createdAt: m.createdAt,
      relevance: calculateRelevance(query, m.content),
    })));
  }
  
  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);
  
  return results.slice(0, limit);
}

// Calculate relevance score
function calculateRelevance(query: string, ...fields: (string | null | undefined)[]): number {
  if (!query) return 1;
  
  let score = 0;
  const queryLower = query.toLowerCase();
  
  for (const field of fields) {
    if (!field) continue;
    
    const fieldLower = field.toLowerCase();
    
    // Exact match: highest score
    if (fieldLower === queryLower) {
      score += 100;
    }
    // Starts with: high score
    else if (fieldLower.startsWith(queryLower)) {
      score += 50;
    }
    // Contains: medium score
    else if (fieldLower.includes(queryLower)) {
      score += 25;
    }
    
    // Word boundary match: bonus
    const words = fieldLower.split(/\s+/);
    if (words.some(word => word === queryLower)) {
      score += 15;
    }
  }
  
  return score;
}

// Get search suggestions
export async function getSearchSuggestions(
  workspaceId: string,
  query: string,
  limit: number = 10
): Promise<string[]> {
  const db = getDatabase();
  const suggestions: Set<string> = new Set();
  
  if (!query || query.length < 2) return [];
  
  const queryLower = query.toLowerCase();
  
  // Project names
  const projects = await db
    .select({ name: projectTable.name })
    .from(projectTable)
    .where(and(
      eq(projectTable.workspaceId, workspaceId),
      like(projectTable.name, `%${query}%`)
    ))
    .limit(5);
  
  projects.forEach(p => suggestions.add(p.name));
  
  // Task titles
  const tasks = await db
    .select({ title: taskTable.title })
    .from(taskTable)
    .where(and(
      eq(taskTable.workspaceId, workspaceId),
      like(taskTable.title, `%${query}%`)
    ))
    .limit(5);
  
  tasks.forEach(t => suggestions.add(t.title));
  
  // User names
  const users = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(like(userTable.name, `%${query}%`))
    .limit(5);
  
  users.forEach(u => suggestions.add(u.name));
  
  return Array.from(suggestions).slice(0, limit);
}

// Mock saved searches storage (would use database table in production)
const savedSearchesStore: Map<string, SavedSearch[]> = new Map();

// Get saved searches for user
export async function getSavedSearches(
  workspaceId: string,
  userEmail: string
): Promise<SavedSearch[]> {
  const key = `${workspaceId}:${userEmail}`;
  return savedSearchesStore.get(key) || [];
}

// Save search
export async function saveSearch(
  workspaceId: string,
  userEmail: string,
  name: string,
  filters: SearchFilters,
  isPublic: boolean = false
): Promise<SavedSearch> {
  const key = `${workspaceId}:${userEmail}`;
  const searches = savedSearchesStore.get(key) || [];
  
  const newSearch: SavedSearch = {
    id: createId(),
    workspaceId,
    userEmail,
    name,
    filters,
    isPublic,
    createdAt: new Date(),
    useCount: 0,
  };
  
  searches.push(newSearch);
  savedSearchesStore.set(key, searches);
  
  return newSearch;
}

// Update saved search
export async function updateSavedSearch(
  workspaceId: string,
  userEmail: string,
  searchId: string,
  updates: Partial<Pick<SavedSearch, 'name' | 'filters' | 'isPublic'>>
): Promise<SavedSearch> {
  const key = `${workspaceId}:${userEmail}`;
  const searches = savedSearchesStore.get(key) || [];
  
  const search = searches.find(s => s.id === searchId);
  if (!search) {
    throw new Error('Saved search not found');
  }
  
  Object.assign(search, updates);
  savedSearchesStore.set(key, searches);
  
  return search;
}

// Delete saved search
export async function deleteSavedSearch(
  workspaceId: string,
  userEmail: string,
  searchId: string
): Promise<void> {
  const key = `${workspaceId}:${userEmail}`;
  const searches = savedSearchesStore.get(key) || [];
  
  const filtered = searches.filter(s => s.id !== searchId);
  savedSearchesStore.set(key, filtered);
}

// Record search usage
export async function recordSearchUsage(
  workspaceId: string,
  userEmail: string,
  searchId: string
): Promise<void> {
  const key = `${workspaceId}:${userEmail}`;
  const searches = savedSearchesStore.get(key) || [];
  
  const search = searches.find(s => s.id === searchId);
  if (search) {
    search.useCount++;
    search.lastUsed = new Date();
    savedSearchesStore.set(key, searches);
  }
}


