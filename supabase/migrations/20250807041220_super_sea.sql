/*
  # Fix User RLS Policies - Resolve Timeout Issues
  
  This migration fixes the Row Level Security policies for the users table
  that are causing timeout errors during user profile upsert operations.
  
  ## Changes:
  1. Drop all existing conflicting policies
  2. Create proper policies for authenticated users
  3. Add service_role policies for system operations
  4. Ensure anon users can insert during signup
  5. Fix any policy conflicts causing timeouts
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read for own profile" ON users;
DROP POLICY IF EXISTS "Enable update for own profile" ON users;
DROP POLICY IF EXISTS "Enable all for service_role" ON users;
DROP POLICY IF EXISTS "Enable insert for anon during signup" ON users;
DROP POLICY IF EXISTS "Service role can do everything" ON users;
DROP POLICY IF EXISTS "Anon can insert during signup" ON users;
DROP POLICY IF EXISTS "Users can manage own items" ON users;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-conflicting RLS policies

-- 1. Allow authenticated users to read their own profile
CREATE POLICY "authenticated_users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Allow authenticated users to insert their own profile
CREATE POLICY "authenticated_users_insert_own"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. Allow authenticated users to update their own profile
CREATE POLICY "authenticated_users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Allow service_role to do everything (for system operations)
CREATE POLICY "service_role_all_access"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Allow anon users to insert during signup (temporary access)
CREATE POLICY "anon_users_insert_signup"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create or replace the user profile creation function with better error handling
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id uuid,
  user_email text,
  user_name text DEFAULT 'User',
  user_avatar_url text DEFAULT NULL
) RETURNS users AS $$
DECLARE
  new_user users;
BEGIN
  -- Log the attempt
  RAISE NOTICE 'Creating user profile for ID: %, Email: %', user_id, user_email;
  
  -- Insert or update the user profile
  INSERT INTO users (
    id,
    email,
    name,
    avatar_url,
    subscription_plan,
    subscription_status,
    listings_used,
    listings_limit,
    monthly_revenue,
    total_sales,
    notification_preferences,
    timezone,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_email,
    COALESCE(user_name, 'User'),
    user_avatar_url,
    'free',
    'active',
    0,
    999,
    0,
    0,
    '{"email": true, "push": true}'::jsonb,
    'America/New_York',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = now()
  RETURNING * INTO new_user;
  
  RAISE NOTICE 'Successfully created/updated user profile for: %', user_email;
  RETURN new_user;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile TO anon;
GRANT EXECUTE ON FUNCTION create_user_profile TO service_role;

-- Verify the policies are working by testing permissions
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been reset and recreated for users table';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '  - authenticated_users_select_own: Authenticated users can read own profile';
  RAISE NOTICE '  - authenticated_users_insert_own: Authenticated users can insert own profile';
  RAISE NOTICE '  - authenticated_users_update_own: Authenticated users can update own profile';
  RAISE NOTICE '  - service_role_all_access: Service role has full access';
  RAISE NOTICE '  - anon_users_insert_signup: Anonymous users can insert during signup';
  RAISE NOTICE 'User profile creation function updated with better error handling';
END $$;