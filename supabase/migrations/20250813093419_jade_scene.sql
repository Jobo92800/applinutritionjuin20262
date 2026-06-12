/*
  # Add variants column to recipes table

  1. Schema Changes
    - Add `variants` column to `recipes` table
      - Type: jsonb (to store array of recipe variants)
      - Default: empty array []
      - Nullable: true

  2. Purpose
    - Allow recipes to have multiple variants with different calorie targets
    - Each variant contains adjusted ingredients and nutrition information
    - Enables flexible recipe customization for different dietary needs
*/

-- Add variants column to recipes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'variants'
  ) THEN
    ALTER TABLE recipes ADD COLUMN variants jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;