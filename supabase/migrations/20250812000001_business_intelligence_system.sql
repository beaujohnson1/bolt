-- Business Intelligence and Revenue Optimization System
-- Migration for comprehensive business analytics and revenue tracking

-- Table to store daily business metrics snapshots
CREATE TABLE business_metrics_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  
  -- Revenue Metrics
  daily_revenue DECIMAL(10,2) DEFAULT 0,
  monthly_recurring_revenue DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  average_revenue_per_user DECIMAL(8,2) DEFAULT 0,
  
  -- User Metrics
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  churned_users INTEGER DEFAULT 0,
  user_growth_rate DECIMAL(5,2) DEFAULT 0,
  churn_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Product Metrics
  listings_generated INTEGER DEFAULT 0,
  items_analyzed INTEGER DEFAULT 0,
  average_listings_per_user DECIMAL(5,2) DEFAULT 0,
  ai_accuracy_rate DECIMAL(3,2) DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  
  -- Financial Metrics
  api_costs_cents INTEGER DEFAULT 0,
  infrastructure_costs_cents INTEGER DEFAULT 0,
  gross_margin DECIMAL(5,2) DEFAULT 0,
  customer_lifetime_value DECIMAL(8,2) DEFAULT 0,
  customer_acquisition_cost DECIMAL(8,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

-- Table to store revenue optimization recommendations
CREATE TABLE revenue_optimization_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('pricing', 'feature', 'user_experience', 'cost_reduction', 'market_expansion')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  potential_revenue_lift DECIMAL(10,2) DEFAULT 0,
  implementation_effort TEXT CHECK (implementation_effort IN ('low', 'medium', 'high')),
  timeline TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  -- Implementation tracking
  assigned_to TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  actual_revenue_impact DECIMAL(10,2),
  
  -- KPI tracking
  target_kpis JSONB,
  actual_kpis JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store pricing experiments and A/B tests
CREATE TABLE pricing_experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_name TEXT NOT NULL,
  description TEXT,
  
  -- Experiment parameters
  pricing_tier TEXT NOT NULL, -- 'freemium', 'basic', 'premium', 'enterprise'
  control_price DECIMAL(8,2) NOT NULL,
  test_price DECIMAL(8,2) NOT NULL,
  
  -- Targeting
  user_segment TEXT, -- 'all', 'new_users', 'existing_users', 'power_users'
  traffic_split DECIMAL(3,2) DEFAULT 0.5, -- 0.5 = 50/50 split
  
  -- Results
  control_users INTEGER DEFAULT 0,
  test_users INTEGER DEFAULT 0,
  control_revenue DECIMAL(10,2) DEFAULT 0,
  test_revenue DECIMAL(10,2) DEFAULT 0,
  control_conversion_rate DECIMAL(5,2) DEFAULT 0,
  test_conversion_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Statistical significance
  confidence_level DECIMAL(3,2),
  p_value DECIMAL(5,4),
  statistical_significance BOOLEAN DEFAULT FALSE,
  
  -- Experiment lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store user segmentation data
CREATE TABLE user_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Segmentation categories
  activity_segment TEXT CHECK (activity_segment IN ('power_user', 'regular_user', 'light_user', 'inactive')),
  revenue_segment TEXT CHECK (revenue_segment IN ('high_value', 'medium_value', 'low_value', 'free_user')),
  lifecycle_segment TEXT CHECK (lifecycle_segment IN ('new', 'growing', 'mature', 'declining', 'churned')),
  
  -- Behavioral metrics
  total_items_processed INTEGER DEFAULT 0,
  avg_items_per_month DECIMAL(5,2) DEFAULT 0,
  last_activity_date TIMESTAMP WITH TIME ZONE,
  engagement_score DECIMAL(3,2) DEFAULT 0, -- 0.0 to 1.0
  
  -- Revenue metrics
  total_revenue_generated DECIMAL(10,2) DEFAULT 0,
  monthly_revenue DECIMAL(8,2) DEFAULT 0,
  lifetime_value DECIMAL(10,2) DEFAULT 0,
  
  -- Predictive metrics
  churn_risk_score DECIMAL(3,2) DEFAULT 0, -- 0.0 to 1.0
  upsell_propensity DECIMAL(3,2) DEFAULT 0, -- 0.0 to 1.0
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track marketing channel performance
CREATE TABLE marketing_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_name TEXT NOT NULL, -- 'organic', 'paid', 'referral', 'partnership', 'content'
  
  -- Monthly metrics
  month DATE NOT NULL,
  visitors INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,
  paid_conversions INTEGER DEFAULT 0,
  
  -- Cost metrics
  marketing_spend DECIMAL(10,2) DEFAULT 0,
  cost_per_acquisition DECIMAL(8,2) DEFAULT 0,
  cost_per_click DECIMAL(5,2) DEFAULT 0,
  
  -- Revenue metrics
  revenue_generated DECIMAL(10,2) DEFAULT 0,
  customer_lifetime_value DECIMAL(8,2) DEFAULT 0,
  return_on_ad_spend DECIMAL(5,2) DEFAULT 0,
  
  -- Performance metrics
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  retention_rate DECIMAL(5,2) DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_name, month)
);

-- Table to store competitive intelligence
CREATE TABLE competitive_intelligence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_name TEXT NOT NULL,
  
  -- Pricing information
  pricing_model TEXT, -- 'subscription', 'per_listing', 'freemium'
  price_point DECIMAL(8,2),
  pricing_last_updated DATE,
  
  -- Market intelligence
  estimated_market_share DECIMAL(5,2),
  estimated_user_count INTEGER,
  estimated_revenue DECIMAL(12,2),
  
  -- Feature comparison
  features JSONB, -- JSON array of features
  strengths TEXT[],
  weaknesses TEXT[],
  
  -- Strategic intelligence
  recent_changes TEXT[],
  opportunity_areas TEXT[],
  threat_level TEXT CHECK (threat_level IN ('low', 'medium', 'high')),
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store revenue forecasts and projections
CREATE TABLE revenue_forecasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  forecast_date DATE NOT NULL,
  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('conservative', 'realistic', 'optimistic')),
  
  -- Time-based projections
  month_1_projection DECIMAL(10,2) NOT NULL,
  month_3_projection DECIMAL(10,2) NOT NULL,
  month_6_projection DECIMAL(10,2) NOT NULL,
  month_12_projection DECIMAL(10,2) NOT NULL,
  
  -- Key assumptions
  user_growth_rate DECIMAL(5,2),
  price_increase_rate DECIMAL(5,2),
  churn_rate DECIMAL(5,2),
  market_expansion_factor DECIMAL(3,2),
  
  -- Confidence metrics
  confidence_level DECIMAL(3,2),
  variance_range DECIMAL(5,2),
  
  -- Model parameters
  model_version TEXT DEFAULT 'v1.0',
  model_accuracy DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track business goals and KPIs
CREATE TABLE business_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('revenue', 'users', 'product', 'efficiency')),
  
  -- Goal definition
  target_value DECIMAL(12,2) NOT NULL,
  current_value DECIMAL(12,2) DEFAULT 0,
  unit TEXT NOT NULL, -- 'dollars', 'users', 'percent', 'count'
  
  -- Timeline
  target_date DATE NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE,
  
  -- Progress tracking
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  is_on_track BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  description TEXT,
  success_criteria TEXT,
  owner TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_business_metrics_date ON business_metrics_snapshots(date);
CREATE INDEX idx_revenue_optimization_type_priority ON revenue_optimization_recommendations(type, priority);
CREATE INDEX idx_pricing_experiments_status ON pricing_experiments(status);
CREATE INDEX idx_user_segments_user_id ON user_segments(user_id);
CREATE INDEX idx_user_segments_activity ON user_segments(activity_segment, revenue_segment);
CREATE INDEX idx_marketing_channels_month ON marketing_channels(month);
CREATE INDEX idx_competitive_intelligence_updated ON competitive_intelligence(last_updated);
CREATE INDEX idx_revenue_forecasts_date_type ON revenue_forecasts(forecast_date, forecast_type);
CREATE INDEX idx_business_goals_status_priority ON business_goals(status, priority);

-- Function to calculate user segment
CREATE OR REPLACE FUNCTION calculate_user_segment(
  p_user_id UUID,
  p_total_items INTEGER,
  p_monthly_revenue DECIMAL
)
RETURNS TABLE (
  activity_segment TEXT,
  revenue_segment TEXT,
  engagement_score DECIMAL
) AS $$
BEGIN
  -- Determine activity segment
  IF p_total_items >= 50 THEN
    activity_segment := 'power_user';
  ELSIF p_total_items >= 10 THEN
    activity_segment := 'regular_user';
  ELSIF p_total_items >= 1 THEN
    activity_segment := 'light_user';
  ELSE
    activity_segment := 'inactive';
  END IF;

  -- Determine revenue segment
  IF p_monthly_revenue >= 50 THEN
    revenue_segment := 'high_value';
  ELSIF p_monthly_revenue >= 20 THEN
    revenue_segment := 'medium_value';
  ELSIF p_monthly_revenue >= 5 THEN
    revenue_segment := 'low_value';
  ELSE
    revenue_segment := 'free_user';
  END IF;

  -- Calculate engagement score
  engagement_score := LEAST(1.0, 
    (p_total_items::DECIMAL / 100) * 0.7 + 
    (p_monthly_revenue / 100) * 0.3
  );

  RETURN QUERY SELECT 
    calculate_user_segment.activity_segment,
    calculate_user_segment.revenue_segment,
    calculate_user_segment.engagement_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update business metrics daily
CREATE OR REPLACE FUNCTION update_daily_business_metrics()
RETURNS VOID AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  user_count INTEGER;
  active_user_count INTEGER;
  total_items INTEGER;
  avg_accuracy DECIMAL;
BEGIN
  -- Get user metrics
  SELECT COUNT(*) INTO user_count FROM users;
  
  SELECT COUNT(*) INTO active_user_count 
  FROM users 
  WHERE last_seen >= current_date - INTERVAL '30 days';
  
  -- Get product metrics
  SELECT COUNT(*) INTO total_items 
  FROM items 
  WHERE DATE(created_at) = current_date;
  
  SELECT AVG(overall_accuracy) INTO avg_accuracy
  FROM ai_predictions
  WHERE DATE(created_at) = current_date;

  -- Insert or update daily snapshot
  INSERT INTO business_metrics_snapshots (
    date,
    total_users,
    active_users,
    listings_generated,
    ai_accuracy_rate
  ) VALUES (
    current_date,
    user_count,
    active_user_count,
    total_items,
    COALESCE(avg_accuracy, 0)
  )
  ON CONFLICT (date) 
  DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    listings_generated = EXCLUDED.listings_generated,
    ai_accuracy_rate = EXCLUDED.ai_accuracy_rate,
    created_at = NOW();

  RAISE NOTICE 'Updated business metrics for %', current_date;
END;
$$ LANGUAGE plpgsql;

-- Function to generate revenue forecast
CREATE OR REPLACE FUNCTION generate_revenue_forecast(
  p_current_mrr DECIMAL DEFAULT 1000,
  p_growth_rate DECIMAL DEFAULT 0.15,
  p_forecast_type TEXT DEFAULT 'realistic'
)
RETURNS UUID AS $$
DECLARE
  forecast_id UUID;
  growth_multiplier DECIMAL;
BEGIN
  -- Adjust growth rate based on forecast type
  CASE p_forecast_type
    WHEN 'conservative' THEN growth_multiplier := 0.7;
    WHEN 'optimistic' THEN growth_multiplier := 1.4;
    ELSE growth_multiplier := 1.0; -- realistic
  END CASE;

  -- Insert forecast
  INSERT INTO revenue_forecasts (
    forecast_date,
    forecast_type,
    month_1_projection,
    month_3_projection,
    month_6_projection,
    month_12_projection,
    user_growth_rate,
    confidence_level
  ) VALUES (
    CURRENT_DATE,
    p_forecast_type,
    p_current_mrr * (1 + (p_growth_rate * growth_multiplier)),
    p_current_mrr * POWER(1 + (p_growth_rate * growth_multiplier), 3),
    p_current_mrr * POWER(1 + (p_growth_rate * growth_multiplier), 6),
    p_current_mrr * POWER(1 + (p_growth_rate * growth_multiplier), 12),
    p_growth_rate * growth_multiplier,
    CASE p_forecast_type 
      WHEN 'conservative' THEN 0.85
      WHEN 'optimistic' THEN 0.65
      ELSE 0.75
    END
  ) RETURNING id INTO forecast_id;

  RETURN forecast_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE business_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_optimization_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_goals ENABLE ROW LEVEL SECURITY;

-- Policies (admin-only access for most business intelligence data)
CREATE POLICY "Admin users can manage business metrics" ON business_metrics_snapshots FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admin users can manage recommendations" ON revenue_optimization_recommendations FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admin users can manage pricing experiments" ON pricing_experiments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Users can view own segment data" ON user_segments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin users can manage all segment data" ON user_segments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admin users can manage marketing data" ON marketing_channels FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admin users can manage competitive intelligence" ON competitive_intelligence FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admin users can manage forecasts" ON revenue_forecasts FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

CREATE POLICY "Admin users can manage business goals" ON business_goals FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON business_metrics_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON revenue_optimization_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON pricing_experiments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_segments TO authenticated;
GRANT SELECT ON marketing_channels TO authenticated;
GRANT SELECT ON competitive_intelligence TO authenticated;
GRANT SELECT ON revenue_forecasts TO authenticated;
GRANT SELECT ON business_goals TO authenticated;

-- Insert initial business goals
INSERT INTO business_goals (goal_name, category, target_value, unit, target_date, description, priority) VALUES
('Reach $10K Monthly Recurring Revenue', 'revenue', 10000, 'dollars', '2025-12-31', 'Primary business objective for sustainable growth', 'high'),
('Acquire 1000 Active Users', 'users', 1000, 'count', '2025-06-30', 'Build strong user base for network effects', 'high'),
('Achieve 90% AI Accuracy', 'product', 90, 'percent', '2025-04-30', 'Improve AI accuracy for better user satisfaction', 'medium'),
('Reduce API Costs by 30%', 'efficiency', 30, 'percent', '2025-03-31', 'Optimize cost structure for better margins', 'medium');

-- Insert initial competitive intelligence
INSERT INTO competitive_intelligence (competitor_name, pricing_model, price_point, features, strengths, weaknesses, threat_level) VALUES
('ListingAI Pro', 'subscription', 19.99, '["AI titles", "Photo optimization", "Basic analytics"]', '{"Simple interface", "Fast processing"}', '{"Limited platforms", "No bulk features"}', 'medium'),
('eBay Quick List', 'subscription', 14.99, '["Templates", "Bulk upload", "eBay integration"]', '{"Official eBay integration", "Template library"}', '{"No AI optimization", "Limited photo processing"}', 'medium'),
('SellBot', 'subscription', 39.99, '["Full automation", "Multi-platform", "Advanced analytics"]', '{"Full automation", "Multi-platform support"}', '{"Complex setup", "High price point"}', 'high');

-- Create initial revenue forecast
SELECT generate_revenue_forecast(1000, 0.25, 'conservative');
SELECT generate_revenue_forecast(1000, 0.25, 'realistic');
SELECT generate_revenue_forecast(1000, 0.25, 'optimistic');