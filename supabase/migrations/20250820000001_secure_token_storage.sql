-- =============================================
-- SECURE TOKEN STORAGE MIGRATION
-- EasyFlip.ai Multi-User Token Security System
-- =============================================

-- Enable necessary extensions for encryption
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types for token management
CREATE TYPE token_provider AS ENUM ('ebay_sandbox', 'ebay_production', 'paypal', 'stripe');
CREATE TYPE token_status AS ENUM ('active', 'expired', 'revoked', 'rotated');
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'rotate', 'revoke');
CREATE TYPE gdpr_request_type AS ENUM ('export', 'delete', 'rectify');
CREATE TYPE gdpr_status AS ENUM ('pending', 'processing', 'completed', 'rejected');

-- =============================================
-- ENCRYPTED TOKENS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS encrypted_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Token identification
  provider token_provider NOT NULL,
  token_name text NOT NULL, -- access_token, refresh_token, etc.
  
  -- Encrypted data (AES-256-GCM)
  encrypted_value bytea NOT NULL,
  encryption_iv bytea NOT NULL, -- Initialization Vector (16 bytes)
  encryption_tag bytea NOT NULL, -- Authentication tag (16 bytes)
  key_version integer NOT NULL DEFAULT 1, -- For key rotation
  
  -- Token metadata (encrypted separately)
  encrypted_metadata bytea, -- JSON data like scopes, expires_in
  metadata_iv bytea,
  metadata_tag bytea,
  
  -- Status and timing
  status token_status DEFAULT 'active',
  expires_at timestamptz,
  last_used_at timestamptz DEFAULT now(),
  
  -- Security tracking
  creation_ip inet,
  last_access_ip inet,
  access_count integer DEFAULT 0,
  
  -- Audit trail
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  rotated_from_id uuid REFERENCES encrypted_tokens(id),
  
  -- Constraints
  UNIQUE(user_id, provider, token_name),
  CHECK (length(encryption_iv) = 16),
  CHECK (length(encryption_tag) = 16)
);

-- =============================================
-- ENCRYPTION KEYS TABLE (HSM-like key management)
-- =============================================
CREATE TABLE IF NOT EXISTS encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Key identification
  key_version integer UNIQUE NOT NULL,
  key_purpose text NOT NULL DEFAULT 'token_encryption',
  
  -- Encrypted master key (encrypted with environment key)
  encrypted_key bytea NOT NULL,
  key_iv bytea NOT NULL,
  key_tag bytea NOT NULL,
  
  -- Key metadata
  algorithm text DEFAULT 'AES-256-GCM',
  key_length integer DEFAULT 256,
  
  -- Key lifecycle
  status text DEFAULT 'active', -- active, deprecated, revoked
  created_at timestamptz DEFAULT now(),
  activated_at timestamptz DEFAULT now(),
  deprecated_at timestamptz,
  revoked_at timestamptz,
  
  -- Key rotation
  previous_key_id uuid REFERENCES encryption_keys(id),
  
  CHECK (length(key_iv) = 16),
  CHECK (length(key_tag) = 16),
  CHECK (status IN ('active', 'deprecated', 'revoked'))
);

-- =============================================
-- TOKEN AUDIT LOG
-- =============================================
CREATE TABLE IF NOT EXISTS token_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to token (nullable for bulk operations)
  token_id uuid REFERENCES encrypted_tokens(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Audit details
  action audit_action NOT NULL,
  table_name text NOT NULL DEFAULT 'encrypted_tokens',
  
  -- Request context
  session_id text,
  request_id text,
  user_agent text,
  ip_address inet,
  
  -- Data changes (for compliance)
  old_values jsonb,
  new_values jsonb,
  
  -- Security context
  risk_score integer DEFAULT 0, -- 0-100 risk assessment
  anomaly_flags text[],
  
  -- Timing
  timestamp timestamptz DEFAULT now(),
  
  -- Compliance fields
  retention_until timestamptz DEFAULT (now() + interval '7 years'),
  anonymized boolean DEFAULT false
);

-- =============================================
-- GDPR COMPLIANCE TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Data subject
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  
  -- Request details
  request_type gdpr_request_type NOT NULL,
  request_description text,
  legal_basis text,
  
  -- Processing
  status gdpr_status DEFAULT 'pending',
  processor_user_id uuid REFERENCES auth.users(id),
  processing_notes text,
  
  -- Data handling
  data_categories text[] DEFAULT '{}', -- tokens, audit_logs, etc.
  export_data jsonb,
  deletion_confirmation boolean DEFAULT false,
  
  -- Timing and compliance
  requested_at timestamptz DEFAULT now(),
  processing_deadline timestamptz DEFAULT (now() + interval '30 days'),
  completed_at timestamptz,
  
  -- Audit trail
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- TOKEN ROTATION SCHEDULE
-- =============================================
CREATE TABLE IF NOT EXISTS token_rotation_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Target configuration
  provider token_provider NOT NULL,
  token_name text NOT NULL,
  
  -- Rotation policy
  rotation_interval_hours integer NOT NULL DEFAULT 168, -- 7 days
  max_age_hours integer NOT NULL DEFAULT 720, -- 30 days
  
  -- Warning thresholds
  warning_hours_before integer DEFAULT 24,
  critical_hours_before integer DEFAULT 6,
  
  -- Status
  enabled boolean DEFAULT true,
  last_rotation_at timestamptz,
  next_rotation_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(provider, token_name)
);

-- =============================================
-- SECURITY METRICS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS security_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time period
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  hour_bucket integer, -- 0-23 for hourly metrics
  
  -- Token metrics
  total_tokens_created integer DEFAULT 0,
  total_tokens_accessed integer DEFAULT 0,
  total_tokens_rotated integer DEFAULT 0,
  total_tokens_revoked integer DEFAULT 0,
  
  -- Security events
  failed_decryption_attempts integer DEFAULT 0,
  suspicious_access_patterns integer DEFAULT 0,
  anomalous_requests integer DEFAULT 0,
  
  -- Performance metrics
  avg_encryption_time_ms numeric(10,2) DEFAULT 0,
  avg_decryption_time_ms numeric(10,2) DEFAULT 0,
  
  -- Compliance metrics
  gdpr_requests_received integer DEFAULT 0,
  gdpr_requests_completed integer DEFAULT 0,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(metric_date, hour_bucket)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Encrypted tokens indexes
CREATE INDEX IF NOT EXISTS idx_encrypted_tokens_user_id ON encrypted_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_encrypted_tokens_provider ON encrypted_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_encrypted_tokens_status ON encrypted_tokens(status);
CREATE INDEX IF NOT EXISTS idx_encrypted_tokens_expires_at ON encrypted_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_encrypted_tokens_user_provider ON encrypted_tokens(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_encrypted_tokens_last_used ON encrypted_tokens(last_used_at);

-- Encryption keys indexes
CREATE INDEX IF NOT EXISTS idx_encryption_keys_version ON encryption_keys(key_version);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_status ON encryption_keys(status);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_created_at ON encryption_keys(created_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_token_audit_user_id ON token_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_token_audit_token_id ON token_audit_log(token_id);
CREATE INDEX IF NOT EXISTS idx_token_audit_action ON token_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_token_audit_timestamp ON token_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_token_audit_ip_address ON token_audit_log(ip_address);
CREATE INDEX IF NOT EXISTS idx_token_audit_retention ON token_audit_log(retention_until);

-- GDPR requests indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_deadline ON gdpr_requests(processing_deadline);

-- Security metrics indexes
CREATE INDEX IF NOT EXISTS idx_security_metrics_date ON security_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_security_metrics_hour ON security_metrics(metric_date, hour_bucket);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE encrypted_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_rotation_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;

-- Encrypted tokens policies
CREATE POLICY "Users can only access their own encrypted tokens"
  ON encrypted_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Encryption keys policies (service role only)
CREATE POLICY "Only service role can access encryption keys"
  ON encryption_keys FOR ALL
  TO service_role
  USING (true);

-- Audit log policies (read-only for users, full access for service)
CREATE POLICY "Users can read their own audit logs"
  ON token_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage audit logs"
  ON token_audit_log FOR ALL
  TO service_role
  USING (true);

-- GDPR requests policies
CREATE POLICY "Users can manage their own GDPR requests"
  ON gdpr_requests FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Token rotation schedule policies (service role only)
CREATE POLICY "Only service role can access rotation schedule"
  ON token_rotation_schedule FOR ALL
  TO service_role
  USING (true);

-- Security metrics policies (service role only)
CREATE POLICY "Only service role can access security metrics"
  ON security_metrics FOR ALL
  TO service_role
  USING (true);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_encrypted_tokens_updated_at BEFORE UPDATE ON encrypted_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_requests_updated_at BEFORE UPDATE ON gdpr_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_rotation_schedule_updated_at BEFORE UPDATE ON token_rotation_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update last_used_at on token access
CREATE OR REPLACE FUNCTION update_token_last_used()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_used_at = now();
  NEW.access_count = OLD.access_count + 1;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for token access tracking (only on SELECT operations via function)
-- This will be handled in application layer for better control

-- Function to audit token operations
CREATE OR REPLACE FUNCTION audit_token_operations()
RETURNS TRIGGER AS $$
DECLARE
  audit_action audit_action;
  old_vals jsonb;
  new_vals jsonb;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    audit_action = 'create';
    old_vals = NULL;
    new_vals = to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action = 'update';
    old_vals = to_jsonb(OLD);
    new_vals = to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    audit_action = 'delete';
    old_vals = to_jsonb(OLD);
    new_vals = NULL;
  END IF;

  -- Insert audit record
  INSERT INTO token_audit_log (
    token_id,
    user_id,
    action,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    audit_action,
    old_vals,
    new_vals
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Apply audit triggers
CREATE TRIGGER audit_encrypted_tokens_trigger
  AFTER INSERT OR UPDATE OR DELETE ON encrypted_tokens
  FOR EACH ROW EXECUTE FUNCTION audit_token_operations();

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Update status of expired tokens
  UPDATE encrypted_tokens 
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at IS NOT NULL 
    AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup operation
  INSERT INTO token_audit_log (
    user_id,
    action,
    table_name,
    new_values
  ) SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    'update',
    'encrypted_tokens',
    jsonb_build_object('expired_tokens_count', deleted_count);
  
  RETURN deleted_count;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to generate security metrics
CREATE OR REPLACE FUNCTION generate_security_metrics(target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO security_metrics (
    metric_date,
    total_tokens_created,
    total_tokens_accessed,
    total_tokens_rotated,
    total_tokens_revoked,
    failed_decryption_attempts,
    gdpr_requests_received,
    gdpr_requests_completed
  )
  SELECT 
    target_date,
    COUNT(*) FILTER (WHERE action = 'create'),
    COUNT(*) FILTER (WHERE action = 'read'),
    COUNT(*) FILTER (WHERE action = 'rotate'),
    COUNT(*) FILTER (WHERE action = 'revoke'),
    COUNT(*) FILTER (WHERE action = 'read' AND old_values->>'status' = 'error'),
    (SELECT COUNT(*) FROM gdpr_requests WHERE DATE(requested_at) = target_date),
    (SELECT COUNT(*) FROM gdpr_requests WHERE DATE(completed_at) = target_date)
  FROM token_audit_log
  WHERE DATE(timestamp) = target_date
  ON CONFLICT (metric_date, hour_bucket) 
  DO UPDATE SET
    total_tokens_created = EXCLUDED.total_tokens_created,
    total_tokens_accessed = EXCLUDED.total_tokens_accessed,
    total_tokens_rotated = EXCLUDED.total_tokens_rotated,
    total_tokens_revoked = EXCLUDED.total_tokens_revoked,
    failed_decryption_attempts = EXCLUDED.failed_decryption_attempts,
    gdpr_requests_received = EXCLUDED.gdpr_requests_received,
    gdpr_requests_completed = EXCLUDED.gdpr_requests_completed;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- =============================================
-- VIEWS FOR MONITORING
-- =============================================

-- Token health overview
CREATE OR REPLACE VIEW token_health_overview AS
SELECT 
  provider,
  status,
  COUNT(*) as token_count,
  COUNT(*) FILTER (WHERE expires_at < now() + interval '24 hours') as expiring_soon,
  COUNT(*) FILTER (WHERE last_used_at < now() - interval '7 days') as unused_recently,
  MIN(created_at) as oldest_token,
  MAX(last_used_at) as most_recent_use
FROM encrypted_tokens
GROUP BY provider, status;

-- Security dashboard view
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  CURRENT_DATE as report_date,
  (SELECT COUNT(*) FROM encrypted_tokens WHERE status = 'active') as active_tokens,
  (SELECT COUNT(*) FROM encrypted_tokens WHERE expires_at < now() + interval '24 hours') as tokens_expiring_soon,
  (SELECT COUNT(*) FROM token_audit_log WHERE DATE(timestamp) = CURRENT_DATE) as daily_token_operations,
  (SELECT COUNT(*) FROM gdpr_requests WHERE status = 'pending') as pending_gdpr_requests,
  (SELECT AVG(risk_score) FROM token_audit_log WHERE DATE(timestamp) = CURRENT_DATE) as avg_daily_risk_score;

-- =============================================
-- INITIAL ENCRYPTION KEY
-- =============================================

-- Insert initial encryption key (will be replaced by proper key generation)
INSERT INTO encryption_keys (
  key_version,
  encrypted_key,
  key_iv,
  key_tag,
  status
) VALUES (
  1,
  decode('0000000000000000000000000000000000000000000000000000000000000000', 'hex'), -- Placeholder
  decode('00000000000000000000000000000000', 'hex'), -- Placeholder IV
  decode('00000000000000000000000000000000', 'hex'), -- Placeholder tag
  'active'
);

-- Insert default rotation schedules
INSERT INTO token_rotation_schedule (provider, token_name, rotation_interval_hours, max_age_hours) VALUES
('ebay_production', 'access_token', 24, 168),      -- Rotate daily, max 7 days
('ebay_production', 'refresh_token', 168, 2160),   -- Rotate weekly, max 90 days
('ebay_sandbox', 'access_token', 48, 336),         -- Rotate every 2 days, max 14 days
('ebay_sandbox', 'refresh_token', 336, 2160);      -- Rotate bi-weekly, max 90 days

-- =============================================
-- COMPLETION LOG
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Secure Token Storage Migration Completed Successfully!';
  RAISE NOTICE 'Tables: encrypted_tokens, encryption_keys, token_audit_log, gdpr_requests, token_rotation_schedule, security_metrics';
  RAISE NOTICE 'Security: AES-256-GCM encryption, RLS policies, audit logging';
  RAISE NOTICE 'Compliance: GDPR request handling, data retention policies';
  RAISE NOTICE 'Monitoring: Security metrics, token health views, rotation schedules';
  RAISE NOTICE 'Ready for secure multi-user token storage!';
END $$;