/*
  # Fix Users Table RLS Policies
  
  This migration fixes the Row Level Security policies for the users table
  to allow authenticated users to insert their own profile during signup.
  
  ## Changes:
  1. Add policy to allow authenticated users to insert their own profile
  2. Ensure existing policies work correctly
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Log successful fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed RLS policies for users table - users can now insert their own profiles';
END $$;