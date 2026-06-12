/*
  # Add key_points column to podcasts table

  1. Changes
    - Add `key_points` column to `podcasts` table
    - Column type: jsonb (to store array of strings)
    - Column is nullable (optional field)

  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover the new column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcasts' AND column_name = 'key_points'
  ) THEN
    ALTER TABLE podcasts ADD COLUMN key_points jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;