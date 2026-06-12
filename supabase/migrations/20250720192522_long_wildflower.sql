/*
  # Add dietary preferences to recipes table

  1. Changes
    - Add `dietary_preferences` column to `recipes` table
    - Column type: text[] (array of text values)
    - Default value: empty array
    - Allow null values for backward compatibility

  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover the new column
*/

-- Add dietary_preferences column to recipes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'dietary_preferences'
  ) THEN
    ALTER TABLE recipes ADD COLUMN dietary_preferences text[] DEFAULT '{}';
  END IF;
END $$;