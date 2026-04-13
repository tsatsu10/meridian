-- Add missing columns to user_profile table
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS headline TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS allow_direct_messages BOOLEAN DEFAULT true;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS profile_verified BOOLEAN DEFAULT false;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS connection_count INTEGER DEFAULT 0;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS endorsement_count INTEGER DEFAULT 0;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0;
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMP WITH TIME ZONE;

-- Add missing columns to user_experience table
ALTER TABLE user_experience ADD COLUMN IF NOT EXISTS achievements TEXT;
ALTER TABLE user_experience ADD COLUMN IF NOT EXISTS company_logo TEXT;
ALTER TABLE user_experience ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Change date columns in user_experience to text
ALTER TABLE user_experience ALTER COLUMN start_date TYPE TEXT;
ALTER TABLE user_experience ALTER COLUMN end_date TYPE TEXT;

-- Add missing columns to user_education table
ALTER TABLE user_education ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE user_education ADD COLUMN IF NOT EXISTS activities TEXT;
ALTER TABLE user_education ADD COLUMN IF NOT EXISTS school_logo TEXT;
ALTER TABLE user_education ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Change date columns in user_education to text
ALTER TABLE user_education ALTER COLUMN start_date TYPE TEXT;
ALTER TABLE user_education ALTER COLUMN end_date TYPE TEXT;

-- Add missing columns to user_skill table
ALTER TABLE user_skill ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE user_skill ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE user_skill ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Add missing columns to user_connection table
ALTER TABLE user_connection ADD COLUMN IF NOT EXISTS follower_id TEXT;
ALTER TABLE user_connection ADD COLUMN IF NOT EXISTS following_id TEXT;

-- Copy data from old columns to new ones in user_connection
UPDATE user_connection SET follower_id = user_id WHERE follower_id IS NULL AND user_id IS NOT NULL;
UPDATE user_connection SET following_id = connected_user_id WHERE following_id IS NOT NULL AND connected_user_id IS NOT NULL;

-- Add foreign key constraints
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

