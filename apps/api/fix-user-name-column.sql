-- Add name column to user table if it doesn't exist
-- This ensures compatibility between schema and database

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user'
        AND column_name = 'name'
    ) THEN
        ALTER TABLE "user" ADD COLUMN "name" VARCHAR;
        RAISE NOTICE 'Added name column to user table';
    ELSE
        RAISE NOTICE 'name column already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user'
AND column_name = 'name';