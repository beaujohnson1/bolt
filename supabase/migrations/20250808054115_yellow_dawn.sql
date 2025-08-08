```sql
-- Fix Security Advisor Issues (Version 2)

-- Fix: Security Definer View (public.user_recent_activity)
-- Drop the existing view
DROP VIEW IF EXISTS user_recent_activity;

-- Recreate the view without SECURITY INVOKER initially
CREATE OR REPLACE VIEW user_recent_activity AS
SELECT * FROM (
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
) AS subquery;

-- Now, alter the view to set SECURITY INVOKER
ALTER VIEW user_recent_activity SET (security_invoker = true);

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
  RAASE NOTICE '  - user_recent_activity view created and then altered to SECURITY INVOKER';
  RAISE NOTICE '  - RLS enabled on brand_keywords with proper policies';
  RAISE NOTICE '  - RLS enabled on trending_keywords with proper policies';
  RAISE NOTICE '  - RLS enabled on system_logs with proper policies';
  RAISE NOTICE 'Your database is now more secure and compliant!';
END $$;
```