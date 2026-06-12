/*
  # Add categories column to recipes table

  1. Changes
    - Add `categories` column as text array to recipes table
    - Migrate existing `category` data to `categories` array
    - Keep `category` column for backward compatibility during transition

  2. Security
    - No changes to RLS policies needed
*/

-- Add the new categories column
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}';

-- Migrate existing category data to categories array
UPDATE recipes 
SET categories = CASE 
  WHEN category IS NOT NULL AND category != '' THEN ARRAY[category]
  ELSE '{}'::text[]
END
WHERE categories = '{}' OR categories IS NULL;

-- Update any existing records that might have empty categories
UPDATE recipes 
SET categories = '{}'::text[]
WHERE categories IS NULL;