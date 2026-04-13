// @epic-3.6-communication: Group chat and channel management
import { WebSocketMessage } from '../websocket-server';
import { getDatabase } from '../../database/connection';
import { messageTable, channelTable, channelMemberTable } from '../../database/schema';
import { eq, and, or } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export interface ChannelData {
  name: string;
  description?: string;
  isPrivate: boolean;
  members: string[]; // Array of user emails
}

export interface ChannelMemberData {
  userEmail: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

class ChannelHandler {
  private static instance: ChannelHandler;

  private constructor() {}

  public static getInstance(): ChannelHandler {
    if (!ChannelHandler.instance) {
      ChannelHandler.instance = new ChannelHandler();
    }
    return ChannelHandler.instance;
  }

  public async createChannel(message: WebSocketMessage<ChannelData>): Promise<string> {
    const db = getDatabase();
    const { name, description = '', isPrivate, members } = message.data!;

    // Create channel
    const channelId = createId();
    await db.insert(channelTable).values({
      id: channelId,
      name,
      description,
      isPrivate,
      createdBy: message.userEmail,
      createdAt: new Date(),
    });

    // Add members
    const memberPromises = members.map(userEmail =>
      db.insert(channelMemberTable).values({
        channelId,
        userEmail,
        role: userEmail === message.userEmail ? 'owner' : 'member',
        joinedAt: new Date(),
      })
    );

    await Promise.all(memberPromises);

    // Create welcome message
    await db.insert(messageTable).values({
      id: createId(),
      channelId,
      userEmail: message.userEmail,
      content: `Channel "${name}" created by ${message.userEmail}`,
      messageType: 'system',
      createdAt: new Date(),
    });

    return channelId;
  }

  public async addMembers(channelId: string, members: string[], addedBy: string): Promise<void> {
    const db = getDatabase();
    
    // Verify channel exists and user has permission
    const channel = await this.getChannelWithMemberRole(channelId, addedBy);
    if (!channel || !['owner', 'admin'].includes(channel.role)) {
      throw new Error('Unauthorized to add members');
    }

    // Add new members
    const memberPromises = members.map(userEmail =>
      db.insert(channelMemberTable).values({
        channelId,
        userEmail,
        role: 'member',
        joinedAt: new Date(),
      })
    );

    await Promise.all(memberPromises);

    // Create system message
    await db.insert(messageTable).values({
      id: createId(),
      channelId,
      userEmail: addedBy,
      content: `${members.join(', ')} added to channel by ${addedBy}`,
      messageType: 'system',
      createdAt: new Date(),
    });
  }

  public async removeMembers(channelId: string, members: string[], removedBy: string): Promise<void> {
    const db = getDatabase();
    
    // Verify channel exists and user has permission
    const channel = await this.getChannelWithMemberRole(channelId, removedBy);
    if (!channel || !['owner', 'admin'].includes(channel.role)) {
      throw new Error('Unauthorized to remove members');
    }

    // Cannot remove the owner
    const owner = await db
      .select()
      .from(channelMemberTable)
      .where(
        and(
          eq(channelMemberTable.channelId, channelId),
          eq(channelMemberTable.role, 'owner')
        )
      )
      .get();

    if (members.includes(owner.userEmail)) {
      throw new Error('Cannot remove channel owner');
    }

    // Remove members
    await db
      .delete(channelMemberTable)
      .where(
        and(
          eq(channelMemberTable.channelId, channelId),
          or(...members.map(m => eq(channelMemberTable.userEmail, m)))
        )
      );

    // Create system message
    await db.insert(messageTable).values({
      id: createId(),
      channelId,
      userEmail: removedBy,
      content: `${members.join(', ')} removed from channel by ${removedBy}`,
      messageType: 'system',
      createdAt: new Date(),
    });
  }

  public async updateChannelSettings(
    channelId: string,
    settings: Partial<ChannelData>,
    updatedBy: string
  ): Promise<void> {
    const db = getDatabase();
    // Verify channel exists and user has permission
    const channel = await this.getChannelWithMemberRole(channelId, updatedBy);
    if (!channel || !['owner', 'admin'].includes(channel.role)) {
      throw new Error('Unauthorized to update channel settings');
    }

    // Update channel
    await db
      .update(channelTable)
      .set({
        name: settings.name,
        description: settings.description,
        isPrivate: settings.isPrivate,
        updatedAt: new Date(),
      })
      .where(eq(channelTable.id, channelId));

    // Create system message
    await db.insert(messageTable).values({
      id: createId(),
      channelId,
      userEmail: updatedBy,
      content: `Channel settings updated by ${updatedBy}`,
      messageType: 'system',
      createdAt: new Date(),
    });
  }

  public async getChannelMembers(channelId: string): Promise<ChannelMemberData[]> {
    const db = getDatabase();
    const members = await db
      .select()
      .from(channelMemberTable)
      .where(eq(channelMemberTable.channelId, channelId));

    return members.map(m => ({
      userEmail: m.userEmail,
      role: m.role as 'owner' | 'admin' | 'member',
      joinedAt: m.joinedAt,
    }));
  }

  private async getChannelWithMemberRole(channelId: string, userEmail: string): Promise<{ channel: any; role: string } | null> {
    const db = getDatabase();
    const member = await db
      .select()
      .from(channelMemberTable)
      .where(
        and(
          eq(channelMemberTable.channelId, channelId),
          eq(channelMemberTable.userEmail, userEmail)
        )
      )
      .get();

    if (!member) return null;

    const channel = await db
      .select()
      .from(channelTable)
      .where(eq(channelTable.id, channelId))
      .get();

    return channel ? { channel, role: member.role } : null;
  }
}

export const channelHandler = ChannelHandler.getInstance(); 
