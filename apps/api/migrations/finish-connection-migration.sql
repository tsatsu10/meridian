-- Finish user_connection migration
-- Add foreign key constraints with correct table name
ALTER TABLE user_connection DROP CONSTRAINT IF EXISTS user_connection_follower_id_user_id_fk;
ALTER TABLE user_connection DROP CONSTRAINT IF EXISTS user_connection_following_id_user_id_fk;
ALTER TABLE user_connection ADD CONSTRAINT user_connection_follower_id_user_id_fk 
  FOREIGN KEY (follower_id) REFERENCES "users"(id) ON DELETE CASCADE;
ALTER TABLE user_connection ADD CONSTRAINT user_connection_following_id_user_id_fk 
  FOREIGN KEY (following_id) REFERENCES "users"(id) ON DELETE CASCADE;

-- Make new columns NOT NULL after data migration
ALTER TABLE user_connection ALTER COLUMN follower_id SET NOT NULL;
ALTER TABLE user_connection ALTER COLUMN following_id SET NOT NULL;

-- Drop old columns from user_connection
ALTER TABLE user_connection DROP COLUMN IF EXISTS user_id;
ALTER TABLE user_connection DROP COLUMN IF EXISTS connected_user_id;
ALTER TABLE user_connection DROP COLUMN IF EXISTS connection_type;
ALTER TABLE user_connection DROP COLUMN IF EXISTS connected_at;
ALTER TABLE user_connection DROP COLUMN IF EXISTS metadata;

