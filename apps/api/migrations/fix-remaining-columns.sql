-- Fix user_education table
ALTER TABLE user_education ADD COLUMN IF NOT EXISTS location TEXT;

-- Fix user_skill table - add level column
ALTER TABLE user_skill ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Fix user_connection table - ensure NOT NULL constraints are properly set
-- First, ensure follower_id and following_id have data
UPDATE user_connection 
SET follower_id = user_id 
WHERE follower_id IS NULL AND user_id IS NOT NULL;

UPDATE user_connection 
SET following_id = connected_user_id 
WHERE following_id IS NULL AND connected_user_id IS NOT NULL;

