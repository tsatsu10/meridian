/**
 * AI Features Database Schema
 * Phase 6.1 - AI-Powered Features
 * 
 * Tables:
 * - ai_task_suggestion: AI-generated task suggestions
 * - ai_schedule_recommendation: Smart scheduling recommendations
 * - ai_document_summary: Document summarization results
 * - ai_chat_conversation: Chat assistant conversations
 * - ai_chat_message: Individual chat messages
 * - ai_usage_log: AI API usage tracking
 * - ai_training_data: User feedback for model improvement
 */

import { pgTable, text, timestamp, integer, boolean, json, uuid, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { tasks } from './tasks';
import { projects } from '../schema';

/**
 * AI Task Suggestions
 * Stores AI-generated suggestions for tasks
 */
export const aiTaskSuggestion = pgTable('ai_task_suggestion', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  
  // Suggestion details
  suggestedTitle: text('suggested_title').notNull(),
  suggestedDescription: text('suggested_description'),
  suggestedPriority: text('suggested_priority'), // 'low', 'medium', 'high', 'urgent'
  suggestedDueDate: timestamp('suggested_due_date'),
  suggestedAssigneeId: uuid('suggested_assignee_id').references(() => users.id),
  suggestedTags: json('suggested_tags').$type<string[]>().default([]),
  
  // AI metadata
  confidence: integer('confidence').notNull(), // 0-100
  reasoning: text('reasoning'), // Why AI suggested this
  relatedTaskIds: json('related_task_ids').$type<string[]>().default([]),
  
  // User interaction
  status: text('status').notNull().default('pending'), // 'pending', 'accepted', 'rejected', 'modified'
  userFeedback: text('user_feedback'),
  acceptedTaskId: uuid('accepted_task_id').references(() => tasks.id),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('ai_task_suggestion_user_id_idx').on(table.userId),
  projectIdIdx: index('ai_task_suggestion_project_id_idx').on(table.projectId),
  statusIdx: index('ai_task_suggestion_status_idx').on(table.status),
}));

/**
 * AI Schedule Recommendations
 * Smart scheduling suggestions based on workload, deadlines, dependencies
 */
export const aiScheduleRecommendation = pgTable('ai_schedule_recommendation', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  projectId: uuid('project_id').references(() => project.id, { onDelete: 'cascade' }),
  
  // Recommendation type
  type: text('type').notNull(), // 'task_order', 'deadline_adjustment', 'resource_allocation', 'break_reminder'
  
  // Recommendation details
  title: text('title').notNull(),
  description: text('description').notNull(),
  affectedTaskIds: json('affected_task_ids').$type<string[]>().default([]),
  suggestedChanges: json('suggested_changes').notNull(), // Structured data for changes
  
  // AI metadata
  confidence: integer('confidence').notNull(), // 0-100
  reasoning: text('reasoning'),
  estimatedImpact: text('estimated_impact'), // Time saved, reduced risk, etc.
  
  // Priority & urgency
  priority: text('priority').notNull().default('medium'), // 'low', 'medium', 'high'
  urgency: text('urgency'), // 'immediate', 'this_week', 'this_month'
  
  // User interaction
  status: text('status').notNull().default('pending'), // 'pending', 'accepted', 'rejected', 'applied'
  userFeedback: text('user_feedback'),
  appliedAt: timestamp('applied_at'),
  
  expiresAt: timestamp('expires_at'), // Recommendation expiry
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('ai_schedule_recommendation_user_id_idx').on(table.userId),
  projectIdIdx: index('ai_schedule_recommendation_project_id_idx').on(table.projectId),
  statusIdx: index('ai_schedule_recommendation_status_idx').on(table.status),
  typeIdx: index('ai_schedule_recommendation_type_idx').on(table.type),
}));

/**
 * AI Document Summaries
 * Stores AI-generated summaries of documents, messages, threads
 */
export const aiDocumentSummary = pgTable('ai_document_summary', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  
  // Source document
  sourceType: text('source_type').notNull(), // 'message_thread', 'project_description', 'task_comments', 'document'
  sourceId: uuid('source_id').notNull(),
  
  // Summary content
  summary: text('summary').notNull(),
  keyPoints: json('key_points').$type<string[]>().default([]),
  actionItems: json('action_items').$type<{
    text: string;
    assignee?: string;
    dueDate?: string;
  }[]>().default([]),
  
  // Metadata
  wordCount: integer('word_count'),
  compressionRatio: integer('compression_ratio'), // Percentage
  language: text('language').default('en'),
  
  // AI metadata
  model: text('model').notNull(), // e.g., 'gpt-4', 'gpt-3.5-turbo'
  tokensUsed: integer('tokens_used'),
  processingTime: integer('processing_time'), // milliseconds
  
  // User interaction
  helpful: boolean('helpful'), // User feedback
  userFeedback: text('user_feedback'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('ai_document_summary_user_id_idx').on(table.userId),
  sourceTypeIdx: index('ai_document_summary_source_type_idx').on(table.sourceType),
  sourceIdIdx: index('ai_document_summary_source_id_idx').on(table.sourceId),
}));

/**
 * AI Chat Conversations
 * Conversations with the AI assistant
 */
export const aiChatConversation = pgTable('ai_chat_conversation', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  
  // Conversation metadata
  title: text('title').notNull(),
  context: text('context'), // 'general', 'project:<id>', 'task:<id>'
  contextId: uuid('context_id'), // Related project/task ID
  
  // Conversation state
  status: text('status').notNull().default('active'), // 'active', 'archived', 'deleted'
  messageCount: integer('message_count').default(0).notNull(),
  
  // AI configuration
  model: text('model').default('gpt-4').notNull(),
  temperature: integer('temperature').default(70), // 0-100 (maps to 0.0-1.0)
  systemPrompt: text('system_prompt'),
  
  // Metadata
  lastMessageAt: timestamp('last_message_at'),
  totalTokensUsed: integer('total_tokens_used').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('ai_chat_conversation_user_id_idx').on(table.userId),
  statusIdx: index('ai_chat_conversation_status_idx').on(table.status),
  contextIdx: index('ai_chat_conversation_context_idx').on(table.context),
}));

/**
 * AI Chat Messages
 * Individual messages in AI conversations
 */
export const aiChatMessage = pgTable('ai_chat_message', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => aiChatConversation.id, { onDelete: 'cascade' }).notNull(),
  
  // Message content
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  
  // AI metadata (for assistant messages)
  model: text('model'),
  tokensUsed: integer('tokens_used'),
  finishReason: text('finish_reason'), // 'stop', 'length', 'content_filter'
  
  // User interaction
  rating: integer('rating'), // 1-5 stars
  helpful: boolean('helpful'),
  userFeedback: text('user_feedback'),
  
  // Related actions
  suggestedActions: json('suggested_actions').$type<{
    type: string;
    label: string;
    data: any;
  }[]>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index('ai_chat_message_conversation_id_idx').on(table.conversationId),
  roleIdx: index('ai_chat_message_role_idx').on(table.role),
}));

/**
 * AI Usage Log
 * Track AI API usage for cost monitoring and optimization
 */
export const aiUsageLog = pgTable('ai_usage_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  
  // Request details
  featureType: text('feature_type').notNull(), // 'task_suggestion', 'scheduling', 'summarization', 'chat'
  model: text('model').notNull(),
  endpoint: text('endpoint').notNull(),
  
  // Usage metrics
  promptTokens: integer('prompt_tokens').notNull(),
  completionTokens: integer('completion_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  
  // Cost tracking
  estimatedCost: integer('estimated_cost'), // In cents
  
  // Performance
  responseTime: integer('response_time'), // milliseconds
  success: boolean('success').default(true).notNull(),
  errorMessage: text('error_message'),
  
  // Context
  requestMetadata: json('request_metadata'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('ai_usage_log_user_id_idx').on(table.userId),
  featureTypeIdx: index('ai_usage_log_feature_type_idx').on(table.featureType),
  createdAtIdx: index('ai_usage_log_created_at_idx').on(table.createdAt),
}));

/**
 * AI Training Data
 * User feedback and interactions for model improvement
 */
export const aiTrainingData = pgTable('ai_training_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
  
  // Interaction type
  interactionType: text('interaction_type').notNull(), // 'task_suggestion_feedback', 'schedule_feedback', 'chat_rating'
  
  // Input/Output
  input: json('input').notNull(), // What we sent to AI
  output: json('output').notNull(), // What AI returned
  
  // User feedback
  userAction: text('user_action').notNull(), // 'accepted', 'rejected', 'modified', 'rated'
  userRating: integer('user_rating'), // 1-5
  userFeedbackText: text('user_feedback_text'),
  modifications: json('modifications'), // If user modified the AI suggestion
  
  // Context
  contextData: json('context_data'), // Additional context
  
  // Training flags
  useForTraining: boolean('use_for_training').default(true).notNull(),
  reviewed: boolean('reviewed').default(false).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('ai_training_data_user_id_idx').on(table.userId),
  interactionTypeIdx: index('ai_training_data_interaction_type_idx').on(table.interactionType),
  useForTrainingIdx: index('ai_training_data_use_for_training_idx').on(table.useForTraining),
}));

// Export types
export type AITaskSuggestion = typeof aiTaskSuggestion.$inferSelect;
export type NewAITaskSuggestion = typeof aiTaskSuggestion.$inferInsert;

export type AIScheduleRecommendation = typeof aiScheduleRecommendation.$inferSelect;
export type NewAIScheduleRecommendation = typeof aiScheduleRecommendation.$inferInsert;

export type AIDocumentSummary = typeof aiDocumentSummary.$inferSelect;
export type NewAIDocumentSummary = typeof aiDocumentSummary.$inferInsert;

export type AIChatConversation = typeof aiChatConversation.$inferSelect;
export type NewAIChatConversation = typeof aiChatConversation.$inferInsert;

export type AIChatMessage = typeof aiChatMessage.$inferSelect;
export type NewAIChatMessage = typeof aiChatMessage.$inferInsert;

export type AIUsageLog = typeof aiUsageLog.$inferSelect;
export type NewAIUsageLog = typeof aiUsageLog.$inferInsert;

export type AITrainingData = typeof aiTrainingData.$inferSelect;
export type NewAITrainingData = typeof aiTrainingData.$inferInsert;


