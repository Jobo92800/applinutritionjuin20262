/*
  # Add onboarding_complete column to profiles table

  1. Changes
    - Add `onboarding_complete` column to `profiles` table
    - Set default value to `false` for new users
    - Update existing users to have `false` as default

  2. Security
    - No RLS changes needed as existing policies cover this column
*/

-- Add onboarding_complete column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

-- Update existing users to have onboarding_complete = false
UPDATE profiles 
SET onboarding_complete = false 
WHERE onboarding_complete IS NULL;