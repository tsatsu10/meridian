-- Fix missing hashed_password column in user table
-- This addresses the PostgresError: column "hashed_password" does not exist

-- Add the missing hashed_password column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'hashed_password'
    ) THEN
        ALTER TABLE "user" ADD COLUMN "hashed_password" VARCHAR;
        RAISE NOTICE 'Added hashed_password column to user table';
    ELSE
        RAISE NOTICE 'hashed_password column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user'
AND column_name = 'hashed_password';