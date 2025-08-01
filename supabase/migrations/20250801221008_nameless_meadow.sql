/*
  # Complete Home Sale Helper Database Schema
  
  This migration creates the complete database schema for the Home Sale Helper MVP application.
  It includes all tables, security policies, and initial data needed to run the application.
  
  ## Tables Created:
  1. **users** - Extended user profiles with subscription info
  2. **items** - Items that users want to sell with AI analysis
  3. **listings** - Active listings on various platforms
  4. **platform_listings** - Individual platform listing details
  5. **sales** - Completed sales transactions
  6. **notifications** - User notifications system
  7. **analytics** - User analytics and metrics
  8. **shipping_labels** - Shipping label tracking
  9. **user_subscriptions** - Subscription management
  10. **ai_analysis_cache** - Cache for AI analysis results
  
  ## Security:
  - Row Level Security (RLS) enabled on all tables
  - Policies for authenticated users to access their own data
  - Admin policies for system operations
  
  ## Features:
  - User management with subscription tiers
  - Item recognition and AI pricing
  - Multi-platform listing management
  - Sales tracking and fulfillment
  - Analytics and reporting
  - Notification system
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'commission');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
CREATE TYPE item_condition AS ENUM ('like_new', 'good', 'fair', 'poor');
CREATE TYPE item_category AS ENUM (
  'clothing', 'shoes', 'accessories', 'electronics', 'home_garden', 
  'toys_games', 'sports_outdoors', 'books_media', 'jewelry', 'collectibles', 'other'
);
CREATE TYPE platform_type AS ENUM ('ebay', 'facebook', 'poshmark', 'offerup', 'mercari');
CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold', 'ended', 'pending');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'refunded', 'failed');
CREATE TYPE shipping_status AS ENUM ('pending', 'label_created', 'shipped', 'delivered', 'returned');
CREATE TYPE notification_type AS ENUM ('sale', 'message', 'view', 'watcher', 'system', 'payment');

-- =============================================
-- USERS TABLE (Extended Profiles)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  avatar_url text,
  phone text,
  address jsonb DEFAULT '{}',
  
  -- Subscription info
  subscription_plan subscription_plan DEFAULT 'free',
  subscription_status subscription_status DEFAULT 'active',
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz,
  stripe_customer_id text,
  
  -- Usage tracking
  listings_used integer DEFAULT 0,
  listings_limit integer DEFAULT 5,
  monthly_revenue numeric(10,2) DEFAULT 0,
  total_sales integer DEFAULT 0,
  
  -- Settings
  notification_preferences jsonb DEFAULT '{"email": true, "push": true}',
  timezone text DEFAULT 'America/New_York',
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login_at timestamptz,
  is_active boolean DEFAULT true
);

-- =============================================
-- ITEMS TABLE (Items to Sell)
-- =============================================
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basic item info
  title text NOT NULL,
  description text,
  category item_category NOT NULL,
  condition item_condition NOT NULL,
  brand text,
  size text,
  color text,
  weight_oz numeric(8,2),
  
  -- Pricing
  suggested_price numeric(10,2) NOT NULL,
  price_range_min numeric(10,2),
  price_range_max numeric(10,2),
  final_price numeric(10,2),
  
  -- Images
  images text[] DEFAULT '{}',
  primary_image_url text,
  
  -- AI Analysis
  ai_confidence numeric(3,2) DEFAULT 0, -- 0.00 to 1.00
  ai_analysis jsonb DEFAULT '{}',
  ai_detected_category item_category,
  ai_detected_brand text,
  ai_detected_condition item_condition,
  ai_key_features text[] DEFAULT '{}',
  
  -- Market data
  market_comparisons jsonb DEFAULT '{}',
  estimated_sale_time_days integer,
  
  -- Status
  status text DEFAULT 'draft', -- draft, listed, sold, archived
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- LISTINGS TABLE (Multi-platform Listings)
-- =============================================
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Listing details
  title text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) NOT NULL,
  images text[] DEFAULT '{}',
  
  -- Platform selection
  platforms platform_type[] DEFAULT '{}',
  
  -- Status and metrics
  status listing_status DEFAULT 'draft',
  total_views integer DEFAULT 0,
  total_watchers integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  
  -- Timing
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  listed_at timestamptz,
  sold_at timestamptz,
  ended_at timestamptz
);

-- =============================================
-- PLATFORM_LISTINGS TABLE (Individual Platform Details)
-- =============================================
CREATE TABLE IF NOT EXISTS platform_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  platform platform_type NOT NULL,
  
  -- Platform-specific IDs and URLs
  external_id text NOT NULL,
  listing_url text NOT NULL,
  
  -- Platform-specific metrics
  views integer DEFAULT 0,
  watchers integer DEFAULT 0,
  messages integer DEFAULT 0,
  
  -- Platform-specific status
  status listing_status DEFAULT 'active',
  
  -- Platform-specific data
  platform_data jsonb DEFAULT '{}',
  
  -- Timing
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(listing_id, platform)
);

-- =============================================
-- SALES TABLE (Completed Sales)
-- =============================================
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  platform platform_type NOT NULL,
  
  -- Sale details
  item_title text NOT NULL,
  sale_price numeric(10,2) NOT NULL,
  
  -- Buyer information
  buyer_info jsonb NOT NULL DEFAULT '{}',
  shipping_address jsonb NOT NULL DEFAULT '{}',
  
  -- Payment tracking
  payment_status payment_status DEFAULT 'pending',
  payment_method text,
  payment_transaction_id text,
  
  -- Shipping tracking
  shipping_status shipping_status DEFAULT 'pending',
  shipping_method text,
  shipping_cost numeric(10,2) DEFAULT 0,
  tracking_number text,
  tracking_url text,
  
  -- Fees and profit calculation
  platform_fee numeric(10,2) DEFAULT 0,
  payment_fee numeric(10,2) DEFAULT 0,
  app_fee numeric(10,2) DEFAULT 0,
  shipping_fee numeric(10,2) DEFAULT 0,
  net_profit numeric(10,2) DEFAULT 0,
  
  -- Important dates
  sold_at timestamptz DEFAULT now(),
  shipped_at timestamptz,
  delivered_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- SHIPPING_LABELS TABLE (Label Management)
-- =============================================
CREATE TABLE IF NOT EXISTS shipping_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Label details
  carrier text NOT NULL, -- USPS, UPS, FedEx
  service_type text NOT NULL, -- Priority Mail, Ground, etc.
  tracking_number text UNIQUE NOT NULL,
  
  -- Label files
  label_url text NOT NULL,
  label_format text DEFAULT 'PDF', -- PDF, PNG, ZPL
  
  -- Shipping details
  from_address jsonb NOT NULL,
  to_address jsonb NOT NULL,
  package_weight_oz numeric(8,2),
  package_dimensions jsonb, -- {length, width, height}
  
  -- Costs
  label_cost numeric(10,2) NOT NULL,
  insurance_cost numeric(10,2) DEFAULT 0,
  
  -- Status
  status text DEFAULT 'created', -- created, printed, shipped, delivered
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  printed_at timestamptz,
  shipped_at timestamptz
);

-- =============================================
-- NOTIFICATIONS TABLE (User Notifications)
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification content
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  
  -- Related data
  related_id uuid, -- listing_id, sale_id, etc.
  action_url text,
  
  -- Status
  read boolean DEFAULT false,
  sent_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- USER_SUBSCRIPTIONS TABLE (Subscription Management)
-- =============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Stripe integration
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  stripe_price_id text,
  
  -- Subscription details
  plan subscription_plan NOT NULL,
  status subscription_status NOT NULL,
  
  -- Billing
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  
  -- Pricing
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd',
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  canceled_at timestamptz
);

-- =============================================
-- ANALYTICS TABLE (User Analytics)
-- =============================================
CREATE TABLE IF NOT EXISTS analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Time period
  period text NOT NULL, -- day, week, month, year
  start_date date NOT NULL,
  end_date date NOT NULL,
  
  -- Metrics
  total_revenue numeric(10,2) DEFAULT 0,
  total_sales integer DEFAULT 0,
  total_listings integer DEFAULT 0,
  average_sale_price numeric(10,2) DEFAULT 0,
  conversion_rate numeric(5,4) DEFAULT 0, -- 0.0000 to 1.0000
  average_time_to_sale_days numeric(8,2) DEFAULT 0,
  total_views integer DEFAULT 0,
  total_watchers integer DEFAULT 0,
  
  -- Platform breakdown
  platform_metrics jsonb DEFAULT '{}',
  category_metrics jsonb DEFAULT '{}',
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, period, start_date)
);

-- =============================================
-- AI_ANALYSIS_CACHE TABLE (Cache AI Results)
-- =============================================
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Image identification
  image_hash text UNIQUE NOT NULL,
  image_url text,
  
  -- AI results
  detected_category item_category,
  detected_brand text,
  detected_condition item_condition,
  confidence_score numeric(3,2),
  key_features text[] DEFAULT '{}',
  suggested_title text,
  suggested_description text,
  suggested_price numeric(10,2),
  
  -- Market data
  market_data jsonb DEFAULT '{}',
  
  -- Cache management
  hit_count integer DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_plan ON users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Items indexes
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_item_id ON listings(item_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);

-- Platform listings indexes
CREATE INDEX IF NOT EXISTS idx_platform_listings_listing_id ON platform_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_platform_listings_platform ON platform_listings(platform);
CREATE INDEX IF NOT EXISTS idx_platform_listings_external_id ON platform_listings(external_id);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_listing_id ON sales(listing_id);
CREATE INDEX IF NOT EXISTS idx_sales_platform ON sales(platform);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_sales_shipping_status ON sales(shipping_status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_period ON analytics(period);
CREATE INDEX IF NOT EXISTS idx_analytics_start_date ON analytics(start_date);

-- AI cache indexes
CREATE INDEX IF NOT EXISTS idx_ai_cache_image_hash ON ai_analysis_cache(image_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at ON ai_analysis_cache(expires_at);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Items policies
CREATE POLICY "Users can manage own items"
  ON items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Listings policies
CREATE POLICY "Users can manage own listings"
  ON listings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Platform listings policies
CREATE POLICY "Users can manage own platform listings"
  ON platform_listings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = platform_listings.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

-- Sales policies
CREATE POLICY "Users can manage own sales"
  ON sales FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Shipping labels policies
CREATE POLICY "Users can manage own shipping labels"
  ON shipping_labels FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can manage own notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- User subscriptions policies
CREATE POLICY "Users can read own subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Analytics policies
CREATE POLICY "Users can read own analytics"
  ON analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- AI cache policies (shared read access for efficiency)
CREATE POLICY "Authenticated users can read AI cache"
  ON ai_analysis_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage AI cache"
  ON ai_analysis_cache FOR ALL
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

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_listings_updated_at BEFORE UPDATE ON platform_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate net profit for sales
CREATE OR REPLACE FUNCTION calculate_net_profit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_profit = NEW.sale_price - COALESCE(NEW.platform_fee, 0) - COALESCE(NEW.payment_fee, 0) - COALESCE(NEW.app_fee, 0) - COALESCE(NEW.shipping_fee, 0);
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_sales_net_profit BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION calculate_net_profit();

-- Function to update user stats when sales are made
CREATE OR REPLACE FUNCTION update_user_stats_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users 
    SET 
      total_sales = total_sales + 1,
      monthly_revenue = monthly_revenue + NEW.net_profit
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_stats_on_sale_trigger AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_sale();

-- =============================================
-- INITIAL DATA / SEED DATA
-- =============================================

-- Insert default categories and their typical price ranges
INSERT INTO ai_analysis_cache (image_hash, detected_category, suggested_title, suggested_description, suggested_price, market_data, expires_at)
VALUES 
  ('default_clothing', 'clothing', 'Clothing Item', 'Quality clothing item in good condition', 25.00, '{"avg_price": 25, "range": [15, 45]}', now() + interval '1 year'),
  ('default_electronics', 'electronics', 'Electronic Device', 'Electronic device in working condition', 150.00, '{"avg_price": 150, "range": [75, 300]}', now() + interval '1 year'),
  ('default_shoes', 'shoes', 'Shoes', 'Comfortable shoes in good condition', 35.00, '{"avg_price": 35, "range": [20, 75]}', now() + interval '1 year'),
  ('default_home_garden', 'home_garden', 'Home & Garden Item', 'Useful home and garden item', 45.00, '{"avg_price": 45, "range": [20, 100]}', now() + interval '1 year'),
  ('default_toys_games', 'toys_games', 'Toy or Game', 'Fun toy or game for all ages', 20.00, '{"avg_price": 20, "range": [10, 50]}', now() + interval '1 year');

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for user dashboard summary
CREATE OR REPLACE VIEW user_dashboard_summary AS
SELECT 
  u.id as user_id,
  u.name,
  u.subscription_plan,
  u.listings_used,
  u.listings_limit,
  u.total_sales,
  u.monthly_revenue,
  COUNT(DISTINCT l.id) as active_listings,
  COUNT(DISTINCT s.id) as pending_shipments,
  COALESCE(SUM(l.total_views), 0) as total_views,
  COALESCE(SUM(l.total_watchers), 0) as total_watchers
FROM users u
LEFT JOIN listings l ON u.id = l.user_id AND l.status = 'active'
LEFT JOIN sales s ON u.id = s.user_id AND s.shipping_status = 'pending'
GROUP BY u.id, u.name, u.subscription_plan, u.listings_used, u.listings_limit, u.total_sales, u.monthly_revenue;

-- View for recent activity
CREATE OR REPLACE VIEW user_recent_activity AS
SELECT 
  'sale' as activity_type,
  s.user_id,
  s.item_title as title,
  s.sale_price as amount,
  s.platform,
  s.sold_at as activity_date
FROM sales s
WHERE s.sold_at >= now() - interval '30 days'

UNION ALL

SELECT 
  'listing' as activity_type,
  l.user_id,
  l.title,
  l.price as amount,
  array_to_string(l.platforms, ', ') as platform,
  l.listed_at as activity_date
FROM listings l
WHERE l.listed_at >= now() - interval '30 days'

ORDER BY activity_date DESC;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Home Sale Helper database schema created successfully!';
  RAISE NOTICE 'Tables created: users, items, listings, platform_listings, sales, shipping_labels, notifications, user_subscriptions, analytics, ai_analysis_cache';
  RAISE NOTICE 'Security: Row Level Security enabled on all tables with appropriate policies';
  RAISE NOTICE 'Performance: Indexes created for optimal query performance';
  RAISE NOTICE 'Features: Triggers for automatic calculations and data consistency';
  RAISE NOTICE 'Views: Dashboard and activity views for common queries';
  RAISE NOTICE 'Ready for Home Sale Helper MVP deployment!';
END $$;