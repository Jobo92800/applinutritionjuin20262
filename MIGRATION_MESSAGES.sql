/*
  # Create messages table for user-admin communication

  IMPORTANT: Execute this SQL in your Supabase SQL Editor

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `user_name` (text, denormalized for display)
      - `user_email` (text, denormalized for display)
      - `subject` (text, message subject)
      - `message` (text, message content)
      - `status` (text, enum: 'new', 'in_progress', 'resolved', 'closed')
      - `priority` (text, enum: 'low', 'medium', 'high')
      - `admin_response` (text, nullable, admin's response)
      - `admin_id` (uuid, nullable, admin who responded)
      - `responded_at` (timestamptz, nullable, when admin responded)
      - `created_at` (timestamptz, when message was created)
      - `updated_at` (timestamptz, when message was last updated)

  2. Security
    - Enable RLS on `messages` table
    - Users can insert their own messages
    - Users can read their own messages
    - Admins can read all messages
    - Admins can update all messages
*/

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  admin_response text,
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can insert their own messages
DROP POLICY IF EXISTS "Users can create their own messages" ON messages;
CREATE POLICY "Users can create their own messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own messages
DROP POLICY IF EXISTS "Users can read their own messages" ON messages;
CREATE POLICY "Users can read their own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all messages
DROP POLICY IF EXISTS "Admins can read all messages" ON messages;
CREATE POLICY "Admins can read all messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update all messages
DROP POLICY IF EXISTS "Admins can update all messages" ON messages;
CREATE POLICY "Admins can update all messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
CREATE INDEX IF NOT EXISTS messages_status_idx ON messages(status);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_messages_updated_at_trigger ON messages;
CREATE TRIGGER update_messages_updated_at_trigger
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();
