/*
  # Fix Security Advisor Issues
  
  This migration addresses the security vulnerabilities identified in the Supabase Security Advisor:
  
  ## Issues Fixed:
  1. **Security Definer View**: Changed user_recent_activity view to SECURITY INVOKER
  2. **RLS Disabled**: Enabled Row Level Security on brand_keywords table
  3. **RLS Disabled**: Enabled Row Level Security on trending_keywords table  
  4. **RLS Disabled**: Enabled Row Level Security on system_logs table
  
  ## Security Changes:
  - All tables now have proper RLS policies
  - Authenticated users can read data
  - Service role can manage all operations
  - Views execute with invoker permissions (not definer)
*/

-- Fix: Security Definer View (public.user_recent_activity)
-- Drop the existing view if it exists
DROP VIEW IF EXISTS user_recent_activity;

-- Recreate the view with SECURITY INVOKER (safer than SECURITY DEFINER)
CREATE OR REPLACE VIEW user_recent_activity 
SECURITY INVOKER -- This ensures the view runs with the permissions of the user executing it
AS
SELECT 
  'sale' as activity_type,
  s.user_id,
  s.item_title as title,
  s.sale_price as amount,
  s.platform::text as platform,
  s.sold_at as activity_date
FROM sales s
WHERE s.sold_at >= now() - interval '30 days'

UNION ALL

SELECT 
  'listing' as activity_type,
  l.user_id,
  l.title,
  l.price as amount,
  array_to_string(l.platforms::text[], ', ') as platform,
  l.listed_at as activity_date
FROM listings l
WHERE l.listed_at >= now() - interval '30 days'

ORDER BY activity_date DESC;

-- Fix: RLS Disabled in Public (public.brand_keywords)
ALTER TABLE brand_keywords ENABLE ROW LEVEL SECURITY;

-- Create policies for brand_keywords
CREATE POLICY "brand_keywords_select_authenticated"
  ON brand_keywords FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "brand_keywords_manage_service_role"
  ON brand_keywords FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Fix: RLS Disabled in Public (public.trending_keywords)
ALTER TABLE trending_keywords ENABLE ROW LEVEL SECURITY;

-- Create policies for trending_keywords
CREATE POLICY "trending_keywords_select_authenticated"
  ON trending_keywords FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "trending_keywords_manage_service_role"
  ON trending_keywords FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Fix: RLS Disabled in Public (public.system_logs)
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for system_logs
CREATE POLICY "system_logs_select_authenticated"
  ON system_logs FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "system_logs_manage_service_role"
  ON system_logs FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Security Advisor issues fixed successfully!';
  RAISE NOTICE 'Changes applied:';
  RAISE NOTICE '  - user_recent_activity view changed to SECURITY INVOKER';
  RAISE NOTICE '  - RLS enabled on brand_keywords with proper policies';
  RAISE NOTICE '  - RLS enabled on trending_keywords with proper policies';
  RAISE NOTICE '  - RLS enabled on system_logs with proper policies';
  RAISE NOTICE 'Your database is now more secure and compliant!';
END $$;