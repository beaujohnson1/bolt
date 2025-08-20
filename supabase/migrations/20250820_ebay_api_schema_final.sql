-- eBay API Integration Schema Migration (FINAL FIXED VERSION)
-- Purpose: Support hendt/ebay-api OAuth tokens and listing management

-- 1. OAuth States Table (CSRF protection)
CREATE TABLE IF NOT EXISTS oauth_states (
  id BIGSERIAL PRIMARY KEY,
  state VARCHAR(64) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- 2. User OAuth Tokens Table (Encrypted storage)
CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) DEFAULT 'ebay',
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  full_token_data_encrypted TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,
  scopes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Indexes for token management
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_user ON user_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_expires ON user_oauth_tokens(expires_at);

-- 3. eBay Listings Table
CREATE TABLE IF NOT EXISTS ebay_listings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id VARCHAR(20) UNIQUE,
  offer_id VARCHAR(50),
  sku VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2),
  quantity INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'active',
  category_id VARCHAR(20),
  listing_url TEXT,
  images JSONB,
  aspects JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_ebay_listings_user ON ebay_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_ebay_listings_sku ON ebay_listings(sku);
CREATE INDEX IF NOT EXISTS idx_ebay_listings_status ON ebay_listings(status);

-- 4. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  success BOOLEAN DEFAULT TRUE,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 5. Rate Limit Tracking Table
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_type VARCHAR(50) NOT NULL,
  request_count INTEGER DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, api_type)
);

-- 6. Listing Performance Metrics
CREATE TABLE IF NOT EXISTS listing_metrics (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT REFERENCES ebay_listings(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  questions INTEGER DEFAULT 0,
  best_offer_count INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  click_through_rate DECIMAL(5, 2),
  conversion_rate DECIMAL(5, 2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Pipeline Results Table (for AI to eBay workflow)
CREATE TABLE IF NOT EXISTS pipeline_results (
  id BIGSERIAL PRIMARY KEY,
  pipeline_id VARCHAR(100) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_data JSONB,
  listing_result JSONB,
  options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Pipeline Errors Table (for debugging)
CREATE TABLE IF NOT EXISTS pipeline_errors (
  id BIGSERIAL PRIMARY KEY,
  pipeline_id VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  error_message TEXT,
  error_stack TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Pipeline Metrics Table
CREATE TABLE IF NOT EXISTS pipeline_metrics (
  id BIGSERIAL PRIMARY KEY,
  pipeline_id VARCHAR(100) NOT NULL,
  images_processed INTEGER,
  processing_time INTEGER,
  success BOOLEAN,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebay_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own OAuth states" ON oauth_states;
DROP POLICY IF EXISTS "Service role can manage all OAuth states" ON oauth_states;
DROP POLICY IF EXISTS "Users can view their own tokens" ON user_oauth_tokens;
DROP POLICY IF EXISTS "Service role can manage all tokens" ON user_oauth_tokens;
DROP POLICY IF EXISTS "Users can view their own listings" ON ebay_listings;
DROP POLICY IF EXISTS "Users can create their own listings" ON ebay_listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON ebay_listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON ebay_listings;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view their own rate limits" ON rate_limit_tracking;
DROP POLICY IF EXISTS "Service role can manage rate limits" ON rate_limit_tracking;
DROP POLICY IF EXISTS "Users can view metrics for their listings" ON listing_metrics;
DROP POLICY IF EXISTS "Users can view their own pipeline results" ON pipeline_results;
DROP POLICY IF EXISTS "Service role can manage pipeline results" ON pipeline_results;
DROP POLICY IF EXISTS "Users can view their own pipeline errors" ON pipeline_errors;
DROP POLICY IF EXISTS "Service role can manage pipeline errors" ON pipeline_errors;
DROP POLICY IF EXISTS "Service role can manage pipeline metrics" ON pipeline_metrics;

-- OAuth States Policies
CREATE POLICY "Users can view their own OAuth states"
  ON oauth_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all OAuth states"
  ON oauth_states FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- User OAuth Tokens Policies
CREATE POLICY "Users can view their own tokens"
  ON user_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tokens"
  ON user_oauth_tokens FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- eBay Listings Policies
CREATE POLICY "Users can view their own listings"
  ON ebay_listings FOR SELECT
  USING (auth.uid() = user_id);

-- Fixed INSERT policy - only WITH CHECK is allowed for INSERT
CREATE POLICY "Users can create their own listings"
  ON ebay_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listings"
  ON ebay_listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own listings"
  ON ebay_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Audit Logs Policies
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Fixed INSERT policy for audit logs
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Rate Limit Tracking Policies
CREATE POLICY "Users can view their own rate limits"
  ON rate_limit_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage rate limits"
  ON rate_limit_tracking FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Listing Metrics Policies
CREATE POLICY "Users can view metrics for their listings"
  ON listing_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ebay_listings
      WHERE ebay_listings.id = listing_metrics.listing_id
      AND ebay_listings.user_id = auth.uid()
    )
  );

-- Pipeline Tables Policies
CREATE POLICY "Users can view their own pipeline results"
  ON pipeline_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage pipeline results"
  ON pipeline_results FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can view their own pipeline errors"
  ON pipeline_errors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage pipeline errors"
  ON pipeline_errors FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage pipeline metrics"
  ON pipeline_metrics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS update_user_oauth_tokens_updated_at ON user_oauth_tokens;
CREATE TRIGGER update_user_oauth_tokens_updated_at
  BEFORE UPDATE ON user_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_ebay_listings_updated_at ON ebay_listings;
CREATE TRIGGER update_ebay_listings_updated_at
  BEFORE UPDATE ON ebay_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to clean expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states
  WHERE expires_at < NOW()
  OR (used = TRUE AND created_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql;

-- Function to get user's active listings count
CREATE OR REPLACE FUNCTION get_user_active_listings_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM ebay_listings
    WHERE user_id = p_user_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE oauth_states IS 'Temporary storage for OAuth state parameters to prevent CSRF attacks';
COMMENT ON TABLE user_oauth_tokens IS 'Encrypted storage of user OAuth tokens for eBay API access';
COMMENT ON TABLE ebay_listings IS 'Track all eBay listings created through the platform';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for security and compliance';
COMMENT ON TABLE rate_limit_tracking IS 'Monitor API usage to prevent rate limit violations';
COMMENT ON TABLE listing_metrics IS 'Performance metrics for eBay listings';
COMMENT ON TABLE pipeline_results IS 'AI to eBay pipeline execution results';
COMMENT ON TABLE pipeline_errors IS 'Error tracking for pipeline debugging';
COMMENT ON TABLE pipeline_metrics IS 'Performance metrics for pipeline executions';

-- Grant permissions for service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ eBay API Integration Schema Created Successfully!';
  RAISE NOTICE '📊 Created 9 tables with RLS policies';
  RAISE NOTICE '🔒 Security policies are active';
  RAISE NOTICE '🚀 Ready for hendt/ebay-api integration';
END $$;