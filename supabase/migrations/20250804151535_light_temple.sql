/*
  # Add CTA button support to podcasts

  1. Changes
    - Add `cta_button` column to `podcasts` table
    - Column type: JSONB to store button configuration
    - Default value: NULL (optional field)

  2. Structure
    The cta_button column will store JSON objects with:
    - text: string (button text)
    - url: string (redirect URL)
    - enabled: boolean (whether CTA is active)
*/

-- Add cta_button column to podcasts table
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS cta_button jsonb DEFAULT NULL;