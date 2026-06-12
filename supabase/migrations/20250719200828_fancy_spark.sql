/*
  # Update recipes table to support multiple categories

  1. Changes
    - Rename `category` column to `categories` 
    - Change type from text to text[] (array of text)
    - Update existing data to convert single category to array format
    - Maintain backward compatibility

  2. Data Migration
    - Convert existing single category values to arrays
    - Preserve all existing data

  3. Notes
    - This migration is safe and preserves all existing data
    - The application will handle both old and new format during transition
*/

-- First, add the new categories column as an array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'categories'
  ) THEN
    ALTER TABLE recipes ADD COLUMN categories text[] DEFAULT '{}';
  END IF;
END $$;

-- Migrate existing data from category to categories
UPDATE recipes 
SET categories = ARRAY[category] 
WHERE categories IS NULL OR categories = '{}';

-- Remove the old category column (optional - can be kept for backward compatibility)
-- ALTER TABLE recipes DROP COLUMN IF EXISTS category;