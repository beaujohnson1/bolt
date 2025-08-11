-- Dynamic Pricing Agent Database Schema
-- This migration adds tables for tracking market prices and pricing recommendations

-- Table to store market price data from sold listings
CREATE TABLE market_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_query TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  condition TEXT,
  size TEXT,
  color TEXT,
  title TEXT NOT NULL,
  sold_price DECIMAL(10,2) NOT NULL,
  sold_date TIMESTAMP WITH TIME ZONE NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  platform TEXT DEFAULT 'ebay' NOT NULL,
  external_listing_id TEXT,
  listing_url TEXT,
  view_count INTEGER DEFAULT 0,
  bid_count INTEGER DEFAULT 0,
  watch_count INTEGER DEFAULT 0,
  days_to_sell INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store pricing recommendations for user items
CREATE TABLE pricing_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recommended_price DECIMAL(10,2) NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  price_range_min DECIMAL(10,2) NOT NULL,
  price_range_max DECIMAL(10,2) NOT NULL,
  market_data_points INTEGER NOT NULL DEFAULT 0,
  average_sold_price DECIMAL(10,2),
  median_sold_price DECIMAL(10,2),
  days_on_market_avg INTEGER,
  seasonality_factor DECIMAL(3,2) DEFAULT 1.0,
  demand_trend TEXT CHECK (demand_trend IN ('increasing', 'stable', 'decreasing')),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track pricing algorithm performance
CREATE TABLE pricing_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_price DECIMAL(10,2) NOT NULL,
  recommended_price DECIMAL(10,2) NOT NULL,
  actual_sold_price DECIMAL(10,2),
  days_to_sell INTEGER,
  views_generated INTEGER DEFAULT 0,
  watchers_generated INTEGER DEFAULT 0,
  price_accuracy_score DECIMAL(3,2),
  recommendation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sold_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store price tracking schedules
CREATE TABLE price_tracking_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  search_terms TEXT[] NOT NULL,
  category TEXT,
  brand TEXT,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  frequency_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_market_prices_brand_category ON market_prices(brand, category);
CREATE INDEX idx_market_prices_sold_date ON market_prices(sold_date);
CREATE INDEX idx_market_prices_search_query ON market_prices USING gin(to_tsvector('english', search_query));
CREATE INDEX idx_pricing_recommendations_item_id ON pricing_recommendations(item_id);
CREATE INDEX idx_pricing_recommendations_user_id ON pricing_recommendations(user_id);
CREATE INDEX idx_pricing_performance_item_id ON pricing_performance(item_id);
CREATE INDEX idx_price_tracking_jobs_next_run ON price_tracking_jobs(next_run_at) WHERE is_active = true;

-- Function to update pricing recommendations timestamp
CREATE OR REPLACE FUNCTION update_pricing_recommendations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for pricing recommendations updates
CREATE TRIGGER trigger_update_pricing_recommendations_timestamp
  BEFORE UPDATE ON pricing_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_pricing_recommendations_timestamp();

-- Function to calculate pricing statistics
CREATE OR REPLACE FUNCTION calculate_pricing_stats(
  p_brand TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_condition TEXT DEFAULT NULL,
  p_days_back INTEGER DEFAULT 90
)
RETURNS TABLE (
  avg_price DECIMAL(10,2),
  median_price DECIMAL(10,2),
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  total_sales INTEGER,
  avg_days_to_sell INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(sold_price), 2)::DECIMAL(10,2) as avg_price,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sold_price), 2)::DECIMAL(10,2) as median_price,
    MIN(sold_price) as min_price,
    MAX(sold_price) as max_price,
    COUNT(*)::INTEGER as total_sales,
    ROUND(AVG(days_to_sell))::INTEGER as avg_days_to_sell
  FROM market_prices 
  WHERE sold_date >= NOW() - INTERVAL '1 day' * p_days_back
    AND (p_brand IS NULL OR brand ILIKE p_brand)
    AND (p_category IS NULL OR category ILIKE p_category)
    AND (p_condition IS NULL OR condition ILIKE p_condition);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON market_prices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_performance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON price_tracking_jobs TO authenticated;

-- Row Level Security policies
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_tracking_jobs ENABLE ROW LEVEL SECURITY;

-- Market prices are publicly readable but only system can insert
CREATE POLICY "Market prices are publicly readable" ON market_prices FOR SELECT USING (true);
CREATE POLICY "Only system can insert market prices" ON market_prices FOR INSERT WITH CHECK (false);

-- Pricing recommendations are user-specific
CREATE POLICY "Users can view own pricing recommendations" ON pricing_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pricing recommendations" ON pricing_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pricing recommendations" ON pricing_recommendations FOR UPDATE USING (auth.uid() = user_id);

-- Pricing performance is user-specific
CREATE POLICY "Users can view own pricing performance" ON pricing_performance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pricing performance" ON pricing_performance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pricing performance" ON pricing_performance FOR UPDATE USING (auth.uid() = user_id);

-- Price tracking jobs are user-specific
CREATE POLICY "Users can view own price tracking jobs" ON price_tracking_jobs 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM items 
    WHERE items.id = price_tracking_jobs.item_id 
    AND items.user_id = auth.uid()
  )
);
CREATE POLICY "Users can manage own price tracking jobs" ON price_tracking_jobs 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM items 
    WHERE items.id = price_tracking_jobs.item_id 
    AND items.user_id = auth.uid()
  )
);