/*
  # Create eBay Cache Tables for Categories and Market Research
  
  This migration creates tables to cache eBay API responses for better performance
  and reduced API usage.
  
  ## Tables Created:
  1. **ebay_categories** - Cache for eBay category tree data
  2. **market_research_cache** - Cache for pricing research results
  
  ## Security:
  - Row Level Security enabled with appropriate policies
  - Service role access for API operations
  - Authenticated user read access
*/

-- Create ebay_categories table for caching category tree data
CREATE TABLE IF NOT EXISTS ebay_categories (
  category_id TEXT PRIMARY KEY,
  category_name TEXT NOT NULL,
  parent_id TEXT,
  category_path TEXT NOT NULL,
  is_leaf_category BOOLEAN NOT NULL DEFAULT false,
  category_level INTEGER NOT NULL DEFAULT 0,
  category_features JSONB DEFAULT '{}',
  item_specifics JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Create market_research_cache table for caching pricing data
CREATE TABLE IF NOT EXISTS market_research_cache (
  search_key TEXT PRIMARY KEY,
  average_price NUMERIC(10,2),
  price_range_min NUMERIC(10,2),
  price_range_max NUMERIC(10,2),
  sold_count INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  suggested_price NUMERIC(10,2),
  confidence_score NUMERIC(3,2) DEFAULT 0.5,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  data_points JSONB DEFAULT '{}', -- Store raw completed listing data
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 hours')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ebay_categories_parent_id ON ebay_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_ebay_categories_path ON ebay_categories(category_path);
CREATE INDEX IF NOT EXISTS idx_ebay_categories_leaf ON ebay_categories(is_leaf_category);
CREATE INDEX IF NOT EXISTS idx_market_research_expires ON market_research_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_market_research_updated ON market_research_cache(last_updated);

-- Enable RLS on both tables
ALTER TABLE ebay_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_research_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ebay_categories
CREATE POLICY "Allow authenticated read access to ebay_categories"
  ON ebay_categories FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Allow service_role full access to ebay_categories"
  ON ebay_categories FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Create RLS policies for market_research_cache
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
  RAISE NOTICE 'eBay cache tables created successfully!';
  RAISE NOTICE 'Tables: ebay_categories, market_research_cache';
  RAISE NOTICE 'Indexes created for optimal performance';
  RAISE NOTICE 'RLS policies configured for security';
  RAISE NOTICE 'Ready for eBay API integration!';
END $$;