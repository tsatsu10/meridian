-- Rename integration_mapping internal entity column from legacy kaneo_id to meridian_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'integration_mapping'
      AND column_name = 'kaneo_id'
  ) THEN
    ALTER TABLE public.integration_mapping RENAME COLUMN kaneo_id TO meridian_id;
  END IF;
END $$;
