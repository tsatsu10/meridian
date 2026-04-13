-- Add performance indexes for profile tables
-- These indexes will significantly improve query performance

-- user_experience indexes
CREATE INDEX IF NOT EXISTS idx_user_experience_user_id ON user_experience(user_id);
CREATE INDEX IF NOT EXISTS idx_user_experience_created_at ON user_experience(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_experience_user_current ON user_experience(user_id, is_current) WHERE is_current = true;

-- user_education indexes
CREATE INDEX IF NOT EXISTS idx_user_education_user_id ON user_education(user_id);
CREATE INDEX IF NOT EXISTS idx_user_education_created_at ON user_education(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_education_user_current ON user_education(user_id, is_current) WHERE is_current = true;

-- user_skill indexes
CREATE INDEX IF NOT EXISTS idx_user_skill_user_id ON user_skill(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_category ON user_skill(category);
CREATE INDEX IF NOT EXISTS idx_user_skill_user_level ON user_skill(user_id, level DESC);

-- user_connection indexes
CREATE INDEX IF NOT EXISTS idx_user_connection_follower ON user_connection(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_connection_following ON user_connection(following_id);
CREATE INDEX IF NOT EXISTS idx_user_connection_status ON user_connection(follower_id, status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_experience_order ON user_experience(user_id, "order", created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_education_order ON user_education(user_id, "order", created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_skill_order ON user_skill(user_id, "order", endorsements DESC);

