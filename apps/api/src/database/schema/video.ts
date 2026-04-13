/**
 * Video Communication Schema
 * Phase 4.1 - Video Communication System
 */

import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';

/**
 * Video Rooms - Meeting rooms
 */
export const videoRoom = pgTable('video_room', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull(),
  projectId: uuid('project_id'),
  taskId: uuid('task_id'),
  roomName: text('room_name').notNull(),
  roomType: text('room_type').default('meeting'), // meeting, interview, daily-standup, presentation
  status: text('status').default('scheduled'), // scheduled, active, ended
  scheduledStartTime: timestamp('scheduled_start_time'),
  scheduledEndTime: timestamp('scheduled_end_time'),
  actualStartTime: timestamp('actual_start_time'),
  actualEndTime: timestamp('actual_end_time'),
  hostId: uuid('host_id').notNull(),
  maxParticipants: integer('max_participants').default(50),
  isRecording: boolean('is_recording').default(false),
  recordingUrl: text('recording_url'),
  settings: jsonb('settings').default({}), // Camera, mic, screen share settings
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * Video Participants - Users in rooms
 */
export const videoParticipant = pgTable('video_participant', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull(),
  userId: uuid('user_id').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').default('participant'), // host, moderator, participant, viewer
  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at'),
  connectionStatus: text('connection_status').default('connected'), // connected, disconnected, reconnecting
  permissions: jsonb('permissions').default({}), // Can share screen, mute others, etc.
  isCameraOn: boolean('is_camera_on').default(true),
  isMicOn: boolean('is_mic_on').default(true),
  isSharingScreen: boolean('is_sharing_screen').default(false),
  networkQuality: integer('network_quality'), // 0-5 quality score
  metadata: jsonb('metadata').default({}),
});

/**
 * Video Recordings - Stored recordings
 */
export const videoRecording = pgTable('video_recording', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  fileUrl: text('file_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration'), // Seconds
  fileSize: integer('file_size'), // Bytes
  format: text('format').default('mp4'),
  resolution: text('resolution'), // 720p, 1080p, etc.
  startedBy: uuid('started_by').notNull(),
  recordedAt: timestamp('recorded_at').notNull(),
  processingStatus: text('processing_status').default('processing'), // processing, completed, failed
  viewCount: integer('view_count').default(0),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Video Invitations - Meeting invites
 */
export const videoInvitation = pgTable('video_invitation', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull(),
  invitedUserId: uuid('invited_user_id'),
  invitedEmail: text('invited_email'), // For external guests
  invitedBy: uuid('invited_by').notNull(),
  status: text('status').default('pending'), // pending, accepted, declined, expired
  accessToken: text('access_token'), // For guest access
  expiresAt: timestamp('expires_at'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Video Call Analytics - Usage stats
 */
export const videoCallAnalytics = pgTable('video_call_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: uuid('room_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
  totalParticipants: integer('total_participants'),
  peakParticipants: integer('peak_participants'),
  totalDuration: integer('total_duration'), // Seconds
  averageNetworkQuality: integer('average_network_quality'),
  screenShareDuration: integer('screen_share_duration'), // Seconds
  recordingDuration: integer('recording_duration'), // Seconds
  participantMinutes: integer('participant_minutes'), // Total minutes across all participants
  qualityIssues: jsonb('quality_issues').default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

/**
 * Video Settings - User preferences
 */
export const videoSettings = pgTable('video_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  defaultCameraOn: boolean('default_camera_on').default(true),
  defaultMicOn: boolean('default_mic_on').default(true),
  defaultSpeaker: text('default_speaker'),
  defaultMicrophone: text('default_microphone'),
  defaultCamera: text('default_camera'),
  backgroundBlur: boolean('background_blur').default(false),
  virtualBackground: text('virtual_background'),
  noiseSuppression: boolean('noise_suppression').default(true),
  echoCancellation: boolean('echo_cancellation').default(true),
  preferredQuality: text('preferred_quality').default('auto'), // auto, 720p, 1080p
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type VideoRoom = typeof videoRoom.$inferSelect;
export type VideoParticipant = typeof videoParticipant.$inferSelect;
export type VideoRecording = typeof videoRecording.$inferSelect;
export type VideoInvitation = typeof videoInvitation.$inferSelect;
export type VideoCallAnalytics = typeof videoCallAnalytics.$inferSelect;
export type VideoSettings = typeof videoSettings.$inferSelect;


