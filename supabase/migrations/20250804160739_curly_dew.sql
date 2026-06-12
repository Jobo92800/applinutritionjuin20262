/*
  # Add cta_button2 column to podcasts table

  1. New Column
    - `cta_button2` (jsonb, nullable)
      - Stores the second call-to-action button configuration
      - Contains: text, url, enabled properties
      - Optional field for podcasts

  2. Safety
    - Uses IF NOT EXISTS to prevent errors on re-run
    - Column is nullable to maintain compatibility with existing data
    - JSONB type for efficient storage and querying of structured data

  This migration adds support for a second call-to-action button in podcasts,
  allowing content creators to include multiple action buttons per episode.
*/

-- Add cta_button2 column to podcasts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'podcasts' AND column_name = 'cta_button2'
  ) THEN
    ALTER TABLE podcasts ADD COLUMN cta_button2 jsonb DEFAULT NULL;
  END IF;
END $$;