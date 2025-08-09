/*
  # Create Market Research Cache Table
  
  This migration creates the market_research_cache table that is required
  for caching eBay pricing research data.
  
  ## Changes:
  1. Create market_research_cache table
  2. Add indexes for performance
  3. Enable RLS with appropriate policies
*/

-- Create market_research_cache table
CREATE TABLE IF NOT EXISTS market_research_cache (
  search_key TEXT PRIMARY KEY,
  average_price NUMERIC(10,2),
  price_range_min NUMERIC(10,2),
  price_range_max NUMERIC(10,2),
  sold_count INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  suggested_price NUMERIC(10,2),
  confidence_score NUMERIC(3,2) DEFAULT 0.5,
  data_points JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 hours')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_research_cache_search_key ON market_research_cache(search_key);
CREATE INDEX IF NOT EXISTS idx_market_research_cache_expires_at ON market_research_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_market_research_cache_last_updated ON market_research_cache(last_updated);

-- Enable RLS
ALTER TABLE market_research_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated read access to market_research_cache"
  ON market_research_cache FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Allow service_role full access to market_research_cache"
  ON market_research_cache FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Market research cache table created successfully!';
  RAISE NOTICE 'Table: market_research_cache with proper indexes and RLS policies';
  RAISE NOTICE 'Ready for eBay pricing research caching!';
END $$;