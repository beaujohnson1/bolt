/*
  # EasyFlip Complete Database Setup
  
  This creates the complete database schema for EasyFlip MVP
  in your new secure Supabase project.
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
CREATE TABLE users (
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
CREATE TABLE items (
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
  ai_confidence numeric(3,2) DEFAULT 0,
  ai_analysis jsonb DEFAULT '{}',
  ai_detected_category item_category,
  ai_detected_brand text,
  ai_detected_condition item_condition,
  ai_key_features text[] DEFAULT '{}',
  
  -- Market data
  market_comparisons jsonb DEFAULT '{}',
  estimated_sale_time_days integer,
  
  -- Status
  status text DEFAULT 'draft',
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- LISTINGS TABLE (Multi-platform Listings)
-- =============================================
CREATE TABLE listings (
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
-- SALES TABLE (Completed Sales)
-- =============================================
CREATE TABLE sales (
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
-- NOTIFICATIONS TABLE (User Notifications)
-- =============================================
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification content
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  
  -- Related data
  related_id uuid,
  action_url text,
  
  -- Status
  read boolean DEFAULT false,
  sent_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

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

-- Sales policies
CREATE POLICY "Users can manage own sales"
  ON sales FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can manage own notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

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

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate net profit
CREATE OR REPLACE FUNCTION calculate_net_profit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.net_profit = NEW.sale_price - COALESCE(NEW.platform_fee, 0) - COALESCE(NEW.payment_fee, 0) - COALESCE(NEW.app_fee, 0) - COALESCE(NEW.shipping_fee, 0);
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_sales_net_profit BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION calculate_net_profit();

-- Success message
SELECT 'EasyFlip database setup complete! 🎉' as status;