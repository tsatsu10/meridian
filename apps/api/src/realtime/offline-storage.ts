// @epic-3.6-communication: Offline message storage and sync
import { WebSocketMessage } from './websocket-server';
import { getDatabase } from '../database/connection';
import { messageTable } from '../database/schema';
import { eq, and, gte } from 'drizzle-orm';
import logger from '../utils/logger';

interface OfflineMessage {
  message: WebSocketMessage;
  timestamp: Date;
  synced: boolean;
}

class OfflineStorage {
  private static instance: OfflineStorage;
  private storage: Map<string, OfflineMessage[]> = new Map(); // channelId -> messages
  private lastSyncTimestamp: Map<string, Date> = new Map(); // channelId -> lastSync

  private constructor() {
    // Start periodic sync
    setInterval(() => this.syncMessages(), 60000); // Sync every minute
  }

  public static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  public async storeMessage(channelId: string, message: WebSocketMessage): Promise<void> {
    const db = getDatabase();
    
    if (!this.storage.has(channelId)) {
      this.storage.set(channelId, []);
    }

    const messages = this.storage.get(channelId)!;
    messages.push({
      message,
      timestamp: new Date(),
      synced: false,
    });

    // Store in database with offline flag
    await db
      .update(messageTable)
      .set({
        isEdited: true,
        editedAt: new Date(),
        metadata: JSON.stringify({ offline: true, storedAt: new Date() }),
      })
      .where(eq(messageTable.id, message.id));
  }

  public async getUnsentMessages(channelId: string): Promise<WebSocketMessage[]> {
    const messages = this.storage.get(channelId) || [];
    return messages
      .filter(m => !m.synced)
      .map(m => m.message);
  }

  public async markAsSynced(channelId: string, messageIds: string[]): Promise<void> {
    const db = getDatabase();
    const messages = this.storage.get(channelId);
    if (!messages) return;

    // Mark messages as synced
    messages.forEach(m => {
      if (messageIds.includes(m.message.id)) {
        m.synced = true;
      }
    });

    // Update last sync timestamp
    this.lastSyncTimestamp.set(channelId, new Date());

    // Update messages in database
    await Promise.all(
      messageIds.map(id =>
        db
          .update(messageTable)
          .set({
            isEdited: true,
            editedAt: new Date(),
            metadata: JSON.stringify({ synced: true, syncedAt: new Date() }),
          })
          .where(eq(messageTable.id, id))
      )
    );

    // Clean up synced messages older than 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.storage.set(
      channelId,
      messages.filter(m => !m.synced || m.timestamp > yesterday)
    );
  }

  private async syncMessages(): Promise<void> {
    const db = getDatabase();
    
    for (const [channelId, messages] of this.storage.entries()) {
      const unsynced = messages.filter(m => !m.synced);
      if (unsynced.length === 0) continue;

      try {
        // Get last sync timestamp
        const lastSync = this.lastSyncTimestamp.get(channelId) || new Date(0);

        // Get messages from database since last sync
        const dbMessages = await db
          .select()
          .from(messageTable)
          .where(
            and(
              eq(messageTable.channelId, channelId),
              gte(messageTable.createdAt, lastSync)
            )
          );

        // Detect conflicts (same message ID with different content)
        const conflicts = unsynced.filter(m =>
          dbMessages.some(
            dbm =>
              dbm.id === m.message.id && dbm.content !== m.message.content
          )
        );

        if (conflicts.length > 0) {
          // Handle conflicts by keeping server version and marking local as synced
          await this.markAsSynced(
            channelId,
            conflicts.map(c => c.message.id)
          );
        }

        // Sync remaining messages
        const nonConflicting = unsynced.filter(
          m => !conflicts.some(c => c.message.id === m.message.id)
        );

        await this.markAsSynced(
          channelId,
          nonConflicting.map(m => m.message.id)
        );
      } catch (error) {
        logger.error('Failed to sync messages:', error);
        // Will retry on next sync interval
      }
    }
  }
}

export const offlineStorage = OfflineStorage.getInstance(); 
