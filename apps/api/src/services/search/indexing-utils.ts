/**
 * Search Indexing Utilities
 * Helper functions to index existing data into search
 * Phase 0 - Advanced Search Implementation
 */

import { getDatabase } from '../../database/connection';
import { user, project, task, file, message } from '../../database/schema';
import { getSearchService } from './search-service';
import { eq } from 'drizzle-orm';
import logger from '../../utils/logger';

/**
 * Index all users
 */
export async function indexAllUsers(): Promise<number> {
  try {
    const db = getDatabase();
    logger.debug('📊 Indexing users...');
    
    const users = await db.select().from(user);
    const searchService = getSearchService();

    const documents = users.map((u) => ({
      id: u.id,
      type: 'user' as const,
      title: u.name || u.email,
      content: `${u.name} ${u.email} ${u.role || ''}`,
      workspaceId: u.workspaceId || 'default',
      createdAt: new Date(u.createdAt).getTime(),
      updatedAt: new Date(u.updatedAt || u.createdAt).getTime(),
      metadata: {
        email: u.email,
        name: u.name,
        role: u.role,
        avatar: u.avatar,
      },
    }));

    if (documents.length > 0) {
      await searchService.indexDocuments('user', documents);
    }

    logger.debug(`✅ Indexed ${documents.length} users`);
    return documents.length;
  } catch (error) {
    logger.error('❌ Failed to index users:', error);
    throw error;
  }
}

/**
 * Index all projects
 */
export async function indexAllProjects(): Promise<number> {
  try {
    const db = getDatabase();
    logger.debug('📊 Indexing projects...');
    
    const projects = await db.select().from(project);
    const searchService = getSearchService();

    const documents = projects.map((p) => ({
      id: p.id,
      type: 'project' as const,
      title: p.name,
      content: `${p.name} ${p.description || ''}`,
      workspaceId: p.workspaceId,
      createdAt: new Date(p.createdAt).getTime(),
      updatedAt: new Date(p.updatedAt || p.createdAt).getTime(),
      metadata: {
        description: p.description,
        status: p.status,
        ownerId: p.ownerId,
      },
    }));

    if (documents.length > 0) {
      await searchService.indexDocuments('project', documents);
    }

    logger.debug(`✅ Indexed ${documents.length} projects`);
    return documents.length;
  } catch (error) {
    logger.error('❌ Failed to index projects:', error);
    throw error;
  }
}

/**
 * Index all tasks
 */
export async function indexAllTasks(): Promise<number> {
  try {
    const db = getDatabase();
    logger.debug('📊 Indexing tasks...');
    
    const tasks = await db.select().from(task);
    const searchService = getSearchService();

    const documents = tasks.map((t) => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      content: `${t.title} ${t.description || ''}`,
      workspaceId: t.workspaceId || 'default',
      projectId: t.projectId,
      createdAt: new Date(t.createdAt).getTime(),
      updatedAt: new Date(t.updatedAt || t.createdAt).getTime(),
      metadata: {
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
      },
    }));

    if (documents.length > 0) {
      await searchService.indexDocuments('task', documents);
    }

    logger.debug(`✅ Indexed ${documents.length} tasks`);
    return documents.length;
  } catch (error) {
    logger.error('❌ Failed to index tasks:', error);
    throw error;
  }
}

/**
 * Index all files
 */
export async function indexAllFiles(): Promise<number> {
  try {
    const db = getDatabase();
    logger.debug('📊 Indexing files...');
    
    const files = await db.select().from(file);
    const searchService = getSearchService();

    const documents = files.map((f) => ({
      id: f.id,
      type: 'file' as const,
      title: f.fileName,
      content: `${f.fileName} ${f.originalName || ''}`,
      workspaceId: f.workspaceId,
      projectId: f.projectId,
      createdAt: new Date(f.createdAt).getTime(),
      updatedAt: new Date(f.createdAt).getTime(),
      metadata: {
        fileName: f.fileName,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        url: f.url,
      },
    }));

    if (documents.length > 0) {
      await searchService.indexDocuments('file', documents);
    }

    logger.debug(`✅ Indexed ${documents.length} files`);
    return documents.length;
  } catch (error) {
    logger.error('❌ Failed to index files:', error);
    throw error;
  }
}

/**
 * Index all messages
 */
export async function indexAllMessages(): Promise<number> {
  try {
    const db = getDatabase();
    logger.debug('📊 Indexing messages...');
    
    const messages = await db.select().from(message);
    const searchService = getSearchService();

    const documents = messages.map((m) => ({
      id: m.id,
      type: 'message' as const,
      title: `Message from ${m.senderId}`,
      content: m.content,
      workspaceId: m.workspaceId,
      createdAt: new Date(m.createdAt).getTime(),
      updatedAt: new Date(m.updatedAt || m.createdAt).getTime(),
      metadata: {
        channelId: m.channelId,
        senderId: m.senderId,
      },
    }));

    if (documents.length > 0) {
      await searchService.indexDocuments('message', documents);
    }

    logger.debug(`✅ Indexed ${documents.length} messages`);
    return documents.length;
  } catch (error) {
    logger.error('❌ Failed to index messages:', error);
    throw error;
  }
}

/**
 * Index all data
 */
export async function indexAllData(): Promise<{
  users: number;
  projects: number;
  tasks: number;
  files: number;
  messages: number;
  total: number;
}> {
  logger.debug('🚀 Starting full data indexing...');

  const results = {
    users: 0,
    projects: 0,
    tasks: 0,
    files: 0,
    messages: 0,
    total: 0,
  };

  try {
    results.users = await indexAllUsers();
    results.projects = await indexAllProjects();
    results.tasks = await indexAllTasks();
    results.files = await indexAllFiles();
    results.messages = await indexAllMessages();

    results.total =
      results.users +
      results.projects +
      results.tasks +
      results.files +
      results.messages;

    logger.debug('✅ Full indexing complete:', results);
  } catch (error) {
    logger.error('❌ Full indexing failed:', error);
    throw error;
  }

  return results;
}

/**
 * Reindex specific workspace
 */
export async function reindexWorkspace(workspaceId: string): Promise<number> {
  logger.debug(`🔄 Reindexing workspace ${workspaceId}...`);
  
  let total = 0;

  try {
    const db = getDatabase();
    const searchService = getSearchService();

    // Reindex users
    const users = await db
      .select()
      .from(user)
      .where(eq(user.workspaceId, workspaceId));

    for (const u of users) {
      await searchService.indexDocument('user', {
        id: u.id,
        type: 'user',
        title: u.name || u.email,
        content: `${u.name} ${u.email}`,
        workspaceId,
        createdAt: new Date(u.createdAt).getTime(),
        updatedAt: new Date(u.updatedAt || u.createdAt).getTime(),
        metadata: { email: u.email, name: u.name },
      });
      total++;
    }

    // Reindex projects
    const projects = await db
      .select()
      .from(project)
      .where(eq(project.workspaceId, workspaceId));

    for (const p of projects) {
      await searchService.indexDocument('project', {
        id: p.id,
        type: 'project',
        title: p.name,
        content: `${p.name} ${p.description || ''}`,
        workspaceId,
        createdAt: new Date(p.createdAt).getTime(),
        updatedAt: new Date(p.updatedAt || p.createdAt).getTime(),
        metadata: { description: p.description, status: p.status },
      });
      total++;
    }

    logger.debug(`✅ Reindexed ${total} documents for workspace ${workspaceId}`);
  } catch (error) {
    logger.error('❌ Workspace reindexing failed:', error);
    throw error;
  }

  return total;
}

/**
 * Clear and rebuild all indices
 */
export async function rebuildAllIndices(): Promise<void> {
  logger.debug('🔨 Rebuilding all search indices...');

  try {
    const searchService = getSearchService();

    // Clear all indices
    await searchService.clearIndex('user');
    await searchService.clearIndex('project');
    await searchService.clearIndex('task');
    await searchService.clearIndex('file');
    await searchService.clearIndex('message');

    // Reindex all data
    await indexAllData();

    logger.debug('✅ All indices rebuilt successfully');
  } catch (error) {
    logger.error('❌ Failed to rebuild indices:', error);
    throw error;
  }
}



