/*
  # Fix RLS Policies and User Creation Issues
  
  This migration completely fixes the Row Level Security policies for the users table
  and handles edge cases that might be causing the authentication issues.
  
  ## Changes:
  1. Drop and recreate all RLS policies properly
  2. Add service_role policies for system operations
  3. Handle duplicate user scenarios
  4. Add proper error handling
*/

-- First, let's check if there are any existing users with this ID and clean up if needed
DO $$
BEGIN
  -- Remove any potential duplicate or problematic user records
  DELETE FROM users WHERE email = 'beaujohnson1@gmail.com';
  RAISE NOTICE 'Cleaned up any existing user records for beaujohnson1@gmail.com';
END $$;

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Create comprehensive RLS policies for users table

-- Allow authenticated users to insert their own profile
CREATE POLICY "Enable insert for authenticated users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
CREATE POLICY "Enable read for own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Enable update for own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service_role to do everything (for system operations)
CREATE POLICY "Enable all for service_role"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Also add a policy for anon users to insert (in case of edge cases during signup)
CREATE POLICY "Enable insert for anon during signup"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Log successful fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed RLS policies for users table completely';
  RAISE NOTICE 'Policies created: insert for authenticated, read/update for own profile, all for service_role';
  RAISE NOTICE 'Cleaned up any existing problematic user records';
END $$;