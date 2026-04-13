-- Migration: Create Team Messages Tables
-- Date: 2025-11-02
-- Description: Add tables for team messaging with reactions and read status

-- ============================================================================
-- Team Messages Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_messages (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'announcement', 'system')),
  
  -- Threading
  reply_to_id TEXT REFERENCES team_messages(id) ON DELETE SET NULL,
  thread_count TEXT DEFAULT '0',
  
  -- Metadata
  mentions JSONB DEFAULT '[]'::jsonb,
  attachments JSONB,
  metadata JSONB,
  
  -- Edit/Delete status
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS team_messages_team_id_idx ON team_messages(team_id);
CREATE INDEX IF NOT EXISTS team_messages_user_email_idx ON team_messages(user_email);
CREATE INDEX IF NOT EXISTS team_messages_created_at_idx ON team_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS team_messages_reply_to_idx ON team_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS team_messages_type_idx ON team_messages(message_type);
CREATE INDEX IF NOT EXISTS team_messages_team_created_idx ON team_messages(team_id, created_at DESC);

-- ============================================================================
-- Team Message Reactions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES team_messages(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (length(emoji) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS team_reactions_message_id_idx ON team_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS team_reactions_user_email_idx ON team_message_reactions(user_email);

-- Unique constraint: One emoji per user per message
CREATE UNIQUE INDEX IF NOT EXISTS team_reactions_unique_idx 
  ON team_message_reactions(message_id, user_email, emoji);

-- ============================================================================
-- Team Message Read Status Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_message_read_status (
  message_id TEXT NOT NULL REFERENCES team_messages(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  PRIMARY KEY (message_id, user_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS team_read_status_message_id_idx ON team_message_read_status(message_id);
CREATE INDEX IF NOT EXISTS team_read_status_user_email_idx ON team_message_read_status(user_email);
CREATE INDEX IF NOT EXISTS team_read_status_message_user_idx ON team_message_read_status(message_id, user_email);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE team_messages IS 'Team channel messages with threading and reactions';
COMMENT ON TABLE team_message_reactions IS 'Emoji reactions to team messages';
COMMENT ON TABLE team_message_read_status IS 'Tracking which users have read which messages';

COMMENT ON COLUMN team_messages.content IS 'Message content, max 2000 characters';
COMMENT ON COLUMN team_messages.message_type IS 'Type: text, file, announcement, or system';
COMMENT ON COLUMN team_messages.is_deleted IS 'Soft delete flag';
COMMENT ON COLUMN team_message_reactions.emoji IS 'Unicode emoji character';

