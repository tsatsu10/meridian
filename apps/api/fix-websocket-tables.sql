-- Fix WebSocket database tables for PostgreSQL
-- This script creates the missing tables needed for WebSocket authentication

-- Create user_presence table
CREATE TABLE IF NOT EXISTS "user_presence" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_email" text NOT NULL REFERENCES "user"("email") ON DELETE CASCADE ON UPDATE CASCADE,
  "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" text NOT NULL DEFAULT 'offline',
  "last_seen" timestamp with time zone NOT NULL,
  "current_page" text,
  "socket_id" text,
  "custom_status_message" text,
  "custom_status_emoji" text,
  "status_expires_at" timestamp with time zone,
  "is_status_visible" boolean NOT NULL DEFAULT true,
  "last_activity_type" text,
  "last_activity_details" jsonb,
  "timezone" text,
  "working_hours" jsonb,
  "do_not_disturb_until" timestamp with time zone,
  "updated_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "action" text NOT NULL,
  "resource_type" text,
  "resource_id" text,
  "actor_id" text,
  "actor_email" text NOT NULL,
  "actor_type" text NOT NULL DEFAULT 'user',
  "workspace_id" text,
  "project_id" text,
  "old_values" jsonb,
  "new_values" jsonb,
  "changes" jsonb,
  "ip_address" text,
  "user_agent" text,
  "session_id" text,
  "request_id" text,
  "severity" text NOT NULL DEFAULT 'low',
  "category" text NOT NULL DEFAULT 'general',
  "description" text NOT NULL,
  "metadata" jsonb,
  "retention_policy" text NOT NULL DEFAULT 'standard',
  "is_system_generated" boolean NOT NULL DEFAULT false,
  "timestamp" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "date" text NOT NULL
);

-- Create message_delivery_status table
CREATE TABLE IF NOT EXISTS "message_delivery_status" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" text NOT NULL REFERENCES "message"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" text NOT NULL DEFAULT 'sent',
  "delivered_at" timestamp with time zone,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create direct_message_conversations table
CREATE TABLE IF NOT EXISTS "direct_message_conversations" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "participant1_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "participant2_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "workspace_id" text NOT NULL REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "last_message_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_archived" boolean NOT NULL DEFAULT false
);

-- Create missing indexes for performance
CREATE INDEX IF NOT EXISTS "idx_user_presence_user_workspace" ON "user_presence"("user_email", "workspace_id");
CREATE INDEX IF NOT EXISTS "idx_audit_log_timestamp" ON "audit_log"("timestamp");
CREATE INDEX IF NOT EXISTS "idx_audit_log_actor" ON "audit_log"("actor_email");
CREATE INDEX IF NOT EXISTS "idx_message_delivery_status_message" ON "message_delivery_status"("message_id");
CREATE INDEX IF NOT EXISTS "idx_direct_message_conversations_participants" ON "direct_message_conversations"("participant1_id", "participant2_id");

-- Verify tables were created
SELECT 'user_presence' as table_name, COUNT(*) as exists FROM information_schema.tables WHERE table_name = 'user_presence'
UNION ALL
SELECT 'audit_log' as table_name, COUNT(*) as exists FROM information_schema.tables WHERE table_name = 'audit_log'
UNION ALL
SELECT 'message_delivery_status' as table_name, COUNT(*) as exists FROM information_schema.tables WHERE table_name = 'message_delivery_status'
UNION ALL
SELECT 'direct_message_conversations' as table_name, COUNT(*) as exists FROM information_schema.tables WHERE table_name = 'direct_message_conversations';