-- =============================================
-- AI KEYWORD OPTIMIZATION SYSTEM - SUPABASE SCHEMA
-- =============================================

-- 1. Brand Keywords Master Table
CREATE TABLE IF NOT EXISTS brand_keywords (
  id SERIAL PRIMARY KEY,
  brand TEXT NOT NULL,
  category TEXT, -- 'dress', 'top', 'pants', etc.
  style_name TEXT, -- 'Farm Rio Maxi Dress', 'Lululemon Align Tank', etc.
  keywords JSONB NOT NULL, -- ["bohemian", "flowy", "festival", "hippie"]
  search_volume INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  seasonal_boost JSONB, -- {"summer": 1.5, "festival_season": 2.0}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(brand, category, style_name)
);

-- 2. Photo Analysis & Keyword Suggestions
CREATE TABLE IF NOT EXISTS photo_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  item_id UUID REFERENCES items(id),
  image_url TEXT NOT NULL,
  detected_brand TEXT,
  detected_category TEXT,
  detected_style TEXT,
  detected_size TEXT,
  detected_color TEXT,
  detected_condition TEXT,
  original_keywords JSONB, -- AI's initial suggestions
  suggested_keywords JSONB, -- Final keyword recommendations
  user_approved_keywords JSONB, -- What user actually used
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  listing_platform TEXT, -- 'ebay', 'poshmark', 'facebook', etc.
  listing_id TEXT, -- For tracking performance
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Keyword Performance Tracking
CREATE TABLE IF NOT EXISTS keyword_performance (
  id SERIAL PRIMARY KEY,
  photo_analysis_id UUID REFERENCES photo_analysis(id),
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  messages INTEGER DEFAULT 0,
  sold BOOLEAN DEFAULT FALSE,
  sale_price DECIMAL(10,2),
  days_to_sell INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Trending Keywords (Auto-updated)
CREATE TABLE IF NOT EXISTS trending_keywords (
  id SERIAL PRIMARY KEY,
  keyword TEXT NOT NULL,
  category TEXT,
  trend_score INTEGER DEFAULT 0,
  search_volume INTEGER DEFAULT 0,
  week_start DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. User Keyword Preferences
CREATE TABLE IF NOT EXISTS user_keyword_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  preferred_keywords JSONB, -- User's go-to keywords
  blocked_keywords JSONB, -- Keywords they don't want
  auto_approve BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 6. System Logs for tracking auto-promotions
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add new column to existing items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'ai_suggested_keywords'
  ) THEN
    ALTER TABLE items ADD COLUMN ai_suggested_keywords TEXT[];
  END IF;
END $$;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_brand_keywords_brand ON brand_keywords(brand);
CREATE INDEX IF NOT EXISTS idx_brand_keywords_category ON brand_keywords(category);
CREATE INDEX IF NOT EXISTS idx_photo_analysis_user ON photo_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_analysis_item ON photo_analysis(item_id);
CREATE INDEX IF NOT EXISTS idx_photo_analysis_brand ON photo_analysis(detected_brand);
CREATE INDEX IF NOT EXISTS idx_keyword_performance_keyword ON keyword_performance(keyword);
CREATE INDEX IF NOT EXISTS idx_trending_keywords_week ON trending_keywords(week_start);

-- =============================================
-- SAMPLE DATA - FARM RIO EXAMPLE
-- =============================================

INSERT INTO brand_keywords (brand, category, style_name, keywords, search_volume, conversion_rate) VALUES
('Farm Rio', 'dress', 'Maxi Dress', '["bohemian", "brazilian", "colorful", "flowy", "resort", "vacation", "festival", "boho", "tropical", "summer", "beach", "vacation wear"]', 850, 0.12),
('Farm Rio', 'dress', 'Mini Dress', '["boho chic", "brazilian", "party", "festival", "colorful", "flowy", "bohemian", "summer", "vacation", "resort"]', 620, 0.15),
('Lululemon', 'leggings', 'Align Pant', '["athletic", "yoga", "workout", "buttery soft", "high waisted", "squat proof", "gym", "athleisure", "activewear"]', 1200, 0.18),
('Lululemon', 'top', 'Align Tank', '["yoga", "workout", "athletic", "soft", "built in bra", "activewear", "gym", "athleisure"]', 980, 0.16),
('Nike', 'sneakers', 'Air Force 1', '["classic", "streetwear", "casual", "white sneakers", "basketball", "retro", "iconic"]', 1500, 0.14),
('North Face', 'jacket', 'Puffer Jacket', '["outdoor", "hiking", "winter", "warm", "adventure", "mountain", "cold weather", "insulated"]', 750, 0.13),
('Gap', 'pants', 'Straight Fit', '["casual", "everyday", "classic", "comfortable", "work", "versatile", "timeless", "basic"]', 680, 0.11),
('Gap', 'jeans', 'Straight Fit', '["denim", "casual", "everyday", "classic", "comfortable", "versatile", "timeless", "basic"]', 720, 0.13)
ON CONFLICT (brand, category, style_name) DO NOTHING;

-- =============================================
-- FUNCTIONS FOR KEYWORD SUGGESTIONS
-- =============================================

-- Function to get keyword suggestions based on detected items
CREATE OR REPLACE FUNCTION get_keyword_suggestions(
  p_brand TEXT,
  p_category TEXT DEFAULT NULL,
  p_style TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(DISTINCT keyword_item)
  INTO result
  FROM (
    SELECT jsonb_array_elements_text(keywords) as keyword_item
    FROM brand_keywords 
    WHERE LOWER(brand) = LOWER(p_brand)
    AND (p_category IS NULL OR LOWER(category) = LOWER(p_category))
    AND (p_style IS NULL OR LOWER(style_name) ILIKE '%' || LOWER(p_style) || '%')
    ORDER BY conversion_rate DESC, search_volume DESC
    LIMIT 20
  ) keywords_list;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to track keyword performance
CREATE OR REPLACE FUNCTION update_keyword_performance(
  p_photo_analysis_id UUID,
  p_views INTEGER DEFAULT 0,
  p_watchers INTEGER DEFAULT 0,
  p_messages INTEGER DEFAULT 0,
  p_sold BOOLEAN DEFAULT FALSE,
  p_sale_price DECIMAL DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE keyword_performance 
  SET 
    views = GREATEST(views, p_views),
    watchers = GREATEST(watchers, p_watchers),
    messages = GREATEST(messages, p_messages),
    sold = p_sold OR sold,
    sale_price = COALESCE(p_sale_price, sale_price),
    days_to_sell = CASE 
      WHEN p_sold AND NOT sold THEN EXTRACT(DAYS FROM NOW() - created_at)::INTEGER
      ELSE days_to_sell
    END
  WHERE photo_analysis_id = p_photo_analysis_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE photo_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keyword_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_performance ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own photo analysis" ON photo_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photo analysis" ON photo_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photo analysis" ON photo_analysis
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences" ON user_keyword_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own keyword performance" ON keyword_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photo_analysis 
      WHERE photo_analysis.id = keyword_performance.photo_analysis_id 
      AND photo_analysis.user_id = auth.uid()
    )
  );

-- =============================================
-- AUTO-PROMOTION FUNCTIONS
-- =============================================

-- Function to analyze user keyword patterns and auto-promote brands
CREATE OR REPLACE FUNCTION auto_promote_brand_keywords(
  min_submissions INTEGER DEFAULT 15,
  min_approval_rate DECIMAL DEFAULT 0.60
) RETURNS TABLE(
  promoted_brand TEXT,
  promoted_category TEXT,
  new_keywords JSONB,
  submission_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH brand_analysis AS (
    -- Analyze user-approved keywords for each brand/category combo
    SELECT 
      detected_brand,
      detected_category,
      jsonb_array_elements_text(user_approved_keywords) as keyword,
      COUNT(*) as submissions,
      COUNT(*) FILTER (WHERE user_approved_keywords ? jsonb_array_elements_text(user_approved_keywords)) as approvals
    FROM photo_analysis 
    WHERE detected_brand IS NOT NULL 
    AND detected_category IS NOT NULL 
    AND user_approved_keywords IS NOT NULL
    AND created_at > NOW() - INTERVAL '90 days' -- Only recent data
    GROUP BY detected_brand, detected_category, keyword
    HAVING COUNT(*) >= min_submissions
  ),
  keyword_stats AS (
    -- Calculate approval rates for each keyword
    SELECT 
      detected_brand,
      detected_category,
      keyword,
      submissions,
      (approvals::DECIMAL / submissions) as approval_rate,
      COUNT(*) OVER (PARTITION BY detected_brand, detected_category) as total_submissions
    FROM brand_analysis
    WHERE (approvals::DECIMAL / submissions) >= min_approval_rate
  ),
  promotable_brands AS (
    -- Group approved keywords by brand/category
    SELECT 
      detected_brand,
      detected_category,
      jsonb_agg(keyword ORDER BY approval_rate DESC) as keywords,
      MAX(total_submissions) as submission_count
    FROM keyword_stats
    GROUP BY detected_brand, detected_category
    HAVING MAX(total_submissions) >= min_submissions
  )
  -- Insert new brand keywords and return results
  INSERT INTO brand_keywords (brand, category, keywords, search_volume, conversion_rate, created_at)
  SELECT 
    detected_brand,
    detected_category,
    keywords,
    submission_count * 10, -- Estimated search volume
    0.10, -- Default conversion rate
    NOW()
  FROM promotable_brands
  WHERE NOT EXISTS (
    -- Don't duplicate existing entries
    SELECT 1 FROM brand_keywords bk 
    WHERE bk.brand = detected_brand 
    AND bk.category = detected_category
  )
  ON CONFLICT (brand, category, style_name) DO UPDATE SET
    keywords = EXCLUDED.keywords,
    search_volume = EXCLUDED.search_volume,
    updated_at = NOW()
  RETURNING brand, category, keywords, search_volume;
END;
$$ LANGUAGE plpgsql;

-- Function to get brands ready for promotion (preview before auto-promoting)
CREATE OR REPLACE FUNCTION preview_promotable_brands(
  min_submissions INTEGER DEFAULT 15
) RETURNS TABLE(
  brand TEXT,
  category TEXT,
  submission_count BIGINT,
  top_keywords JSONB,
  ready_for_promotion BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH submission_stats AS (
    SELECT 
      detected_brand,
      detected_category,
      COUNT(*) as submissions,
      jsonb_agg(DISTINCT jsonb_array_elements_text(user_approved_keywords)) as all_keywords
    FROM photo_analysis 
    WHERE detected_brand IS NOT NULL 
    AND detected_category IS NOT NULL 
    AND user_approved_keywords IS NOT NULL
    AND created_at > NOW() - INTERVAL '90 days'
    GROUP BY detected_brand, detected_category
  )
  SELECT 
    detected_brand,
    detected_category,
    submissions,
    all_keywords,
    submissions >= min_submissions
  FROM submission_stats
  WHERE NOT EXISTS (
    SELECT 1 FROM brand_keywords bk 
    WHERE bk.brand = detected_brand 
    AND bk.category = detected_category
  )
  ORDER BY submissions DESC;
END;
$$ LANGUAGE plpgsql;

-- Scheduled function to run auto-promotion weekly
CREATE OR REPLACE FUNCTION weekly_auto_promotion() RETURNS VOID AS $$
BEGIN
  -- Run auto-promotion with default thresholds
  PERFORM auto_promote_brand_keywords(15, 0.60);
  
  -- Log the promotion activity
  INSERT INTO system_logs (action, details, created_at) 
  VALUES (
    'auto_promotion', 
    jsonb_build_object(
      'promoted_count', (SELECT COUNT(*) FROM auto_promote_brand_keywords(15, 0.60)),
      'timestamp', NOW()
    ),
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'AI Keyword Optimization System schema created successfully!';
  RAISE NOTICE 'Tables created: brand_keywords, photo_analysis, keyword_performance, trending_keywords, user_keyword_preferences, system_logs';
  RAISE NOTICE 'Functions created: get_keyword_suggestions, update_keyword_performance, auto_promote_brand_keywords, preview_promotable_brands';
  RAISE NOTICE 'Sample data inserted for Farm Rio, Lululemon, Nike, North Face, Gap';
  RAISE NOTICE 'Ready for keyword optimization integration!';
END $$;