/*
  # Fix Union Type Error in Views
  
  This migration fixes the type mismatch error in the user_recent_activity view
  where platform_type array and text cannot be matched in UNION.
*/

-- Drop the existing view if it exists
DROP VIEW IF EXISTS user_recent_activity;

-- Recreate the view with proper type casting
CREATE OR REPLACE VIEW user_recent_activity AS
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

-- Log successful fix
DO $$
BEGIN
  RAISE NOTICE 'Fixed union type error in user_recent_activity view';
END $$;