// @epic-3.7-task-integration: Channels schema with direct messaging support
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const channels = pgTable('channels', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  // @epic-4.1-direct-messaging: Direct messaging support
  channelType: text('channel_type').notNull().default('group'), // 'group', 'direct', 'public', 'private'
  isDirectMessage: boolean('is_direct_message').default(false).notNull(),
  // For direct messages, store the two participants
  participant1: text('participant1'), // userEmail of first participant
  participant2: text('participant2'), // userEmail of second participant
  // For group channels
  workspaceId: text('workspace_id'),
  createdBy: text('created_by'), // userEmail of creator
  isArchived: boolean('is_archived').default(false).notNull(),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Performance indexes for channel queries
  workspaceIdIdx: index('channels_workspace_id_idx').on(table.workspaceId),
  channelTypeIdx: index('channels_channel_type_idx').on(table.channelType),
  isDirectMessageIdx: index('channels_is_direct_message_idx').on(table.isDirectMessage),
  participant1Idx: index('channels_participant1_idx').on(table.participant1),
  participant2Idx: index('channels_participant2_idx').on(table.participant2),
  lastMessageAtIdx: index('channels_last_message_at_idx').on(table.lastMessageAt),
  // Composite index for finding DM channels between users
  participantsIdx: index('channels_participants_idx').on(table.participant1, table.participant2),
}));

// @epic-4.1-direct-messaging: Direct message conversations
export const directMessageConversations = pgTable('direct_message_conversations', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  workspaceId: text('workspace_id').notNull(),
  participant1Id: text('participant1_id').notNull(),
  participant2Id: text('participant2_id').notNull(),
  lastMessageAt: timestamp('last_message_at'),
  lastMessagePreview: text('last_message_preview'),
  isArchived: boolean('is_archived').default(false),
  metadata: text('metadata'), // JSON field for additional data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  // Performance indexes for DM conversation queries
  participant1Idx: index('dm_conversations_participant1_idx').on(table.participant1Id),
  participant2Idx: index('dm_conversations_participant2_idx').on(table.participant2Id),
  workspaceIdIdx: index('dm_conversations_workspace_id_idx').on(table.workspaceId),
  lastMessageAtIdx: index('dm_conversations_last_message_at_idx').on(table.lastMessageAt),
  // Composite index for finding conversations by participants
  participantsIdx: index('dm_conversations_participants_idx').on(table.participant1Id, table.participant2Id),
}));

// Export types
// TODO: Implement proper channel membership tracking
// Stub for backward compatibility - needs proper implementation
export const channelMemberships = pgTable('channel_memberships', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  channelId: text('channel_id').notNull(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  role: text('role').default('member'),  // 'admin', 'member', 'viewer'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  // lastReadAt: timestamp('last_read_at'), // TODO: Add when implementing read receipts
});

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
export type DirectMessageConversation = typeof directMessageConversations.$inferSelect;
export type NewDirectMessageConversation = typeof directMessageConversations.$inferInsert;
export type ChannelMembership = typeof channelMemberships.$inferSelect;
export type NewChannelMembership = typeof channelMemberships.$inferInsert; 
