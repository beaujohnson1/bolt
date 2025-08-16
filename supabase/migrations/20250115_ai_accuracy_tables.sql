-- AI Accuracy Tracking Tables
-- This migration creates comprehensive tables for tracking AI prediction accuracy

-- Table: ai_predictions
-- Tracks all AI predictions with actual vs predicted values
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Predicted values
  predicted_title TEXT,
  predicted_brand TEXT,
  predicted_size TEXT,
  predicted_condition TEXT,
  predicted_category TEXT,
  predicted_color TEXT,
  predicted_keywords TEXT[],
  predicted_specifics JSONB,
  
  -- Actual values (filled in when user makes corrections)
  actual_title TEXT,
  actual_brand TEXT,
  actual_size TEXT,
  actual_condition TEXT,
  actual_category TEXT,
  actual_color TEXT,
  actual_keywords TEXT[],
  actual_specifics JSONB,
  
  -- Accuracy scores (calculated on update)
  title_accuracy DECIMAL(3,2),
  brand_accuracy DECIMAL(3,2),
  size_accuracy DECIMAL(3,2),
  condition_accuracy DECIMAL(3,2),
  category_accuracy DECIMAL(3,2),
  color_accuracy DECIMAL(3,2),
  keywords_accuracy DECIMAL(3,2),
  specifics_accuracy DECIMAL(3,2),
  overall_accuracy DECIMAL(3,2),
  
  -- Performance metrics
  ai_confidence DECIMAL(3,2),
  openai_tokens_used INTEGER,
  google_vision_requests INTEGER,
  total_cost_cents INTEGER,
  image_urls TEXT[],
  ocr_text_length INTEGER,
  analysis_duration_ms INTEGER,
  
  -- Versioning
  prompt_version TEXT,
  model_used TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: ocr_extractions
-- Tracks OCR extraction quality and performance
CREATE TABLE IF NOT EXISTS ocr_extractions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_ocr_text TEXT,
  total_text_length INTEGER,
  
  -- Extracted data
  extracted_brands TEXT[],
  extracted_sizes TEXT[],
  extracted_materials TEXT[],
  extracted_care_instructions TEXT[],
  extracted_colors TEXT[],
  
  -- Quality metrics
  brand_found_in_ocr BOOLEAN DEFAULT FALSE,
  size_found_in_ocr BOOLEAN DEFAULT FALSE,
  material_found_in_ocr BOOLEAN DEFAULT FALSE,
  color_found_in_ocr BOOLEAN DEFAULT FALSE,
  
  -- Extraction methods
  brand_extraction_method TEXT,
  size_extraction_method TEXT,
  
  -- Performance
  google_vision_cost_cents DECIMAL(10,2),
  ocr_processing_time_ms INTEGER,
  extraction_accuracy_score DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: ebay_specifics_tracking
-- Tracks eBay item specifics compliance
CREATE TABLE IF NOT EXISTS ebay_specifics_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID REFERENCES ai_predictions(id) ON DELETE CASCADE,
  category_id TEXT,
  
  -- Specifics data
  required_specifics JSONB,
  predicted_specifics JSONB,
  missing_specifics TEXT[],
  
  -- Compliance metrics
  compliance_score DECIMAL(3,2),
  required_fields_count INTEGER,
  predicted_fields_count INTEGER,
  missing_fields_count INTEGER,
  
  -- Common fields tracking
  brand_required BOOLEAN DEFAULT FALSE,
  brand_predicted TEXT,
  size_required BOOLEAN DEFAULT FALSE,
  size_predicted TEXT,
  color_required BOOLEAN DEFAULT FALSE,
  color_predicted TEXT,
  material_required BOOLEAN DEFAULT FALSE,
  material_predicted TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: prompt_experiments
-- A/B testing for prompt optimization
CREATE TABLE IF NOT EXISTS prompt_experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_name TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  model_used TEXT,
  
  -- Performance metrics
  total_tests INTEGER DEFAULT 0,
  successful_tests INTEGER DEFAULT 0,
  avg_accuracy DECIMAL(3,2),
  avg_tokens_used INTEGER,
  avg_processing_time_ms INTEGER,
  avg_cost_cents DECIMAL(10,2),
  
  -- Field-specific performance
  brand_accuracy DECIMAL(3,2),
  size_accuracy DECIMAL(3,2),
  color_accuracy DECIMAL(3,2),
  condition_accuracy DECIMAL(3,2),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  winner BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: keyword_optimization
-- Tracks keyword extraction and optimization
CREATE TABLE IF NOT EXISTS keyword_optimization (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID REFERENCES ai_predictions(id) ON DELETE CASCADE,
  
  -- Keyword sources
  ocr_keywords TEXT[],
  ai_keywords TEXT[],
  combined_keywords TEXT[],
  final_keywords TEXT[],
  
  -- Quality metrics
  ocr_keyword_quality DECIMAL(3,2),
  ai_keyword_quality DECIMAL(3,2),
  keyword_relevance_score DECIMAL(3,2),
  
  -- eBay performance (simulated or actual)
  ebay_search_volume JSONB,
  keyword_competition_score JSONB,
  title_keyword_density DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: benchmark_targets
-- Industry benchmark targets for AI accuracy
CREATE TABLE IF NOT EXISTS benchmark_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric TEXT NOT NULL UNIQUE,
  target_value DECIMAL(5,2) NOT NULL,
  minimum_value DECIMAL(5,2),
  excellence_value DECIMAL(5,2),
  category TEXT,
  priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  timeframe TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: benchmark_scores
-- Current benchmark scores and trends
CREATE TABLE IF NOT EXISTS benchmark_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID REFERENCES benchmark_targets(id) ON DELETE CASCADE,
  current_value DECIMAL(5,2),
  score INTEGER,
  status TEXT CHECK (status IN ('excellent', 'good', 'warning', 'critical')),
  gap DECIMAL(5,2),
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_predictions_user_id ON ai_predictions(user_id);
CREATE INDEX idx_ai_predictions_created_at ON ai_predictions(created_at);
CREATE INDEX idx_ai_predictions_overall_accuracy ON ai_predictions(overall_accuracy);
CREATE INDEX idx_ebay_specifics_prediction_id ON ebay_specifics_tracking(prediction_id);
CREATE INDEX idx_keyword_optimization_prediction_id ON keyword_optimization(prediction_id);
CREATE INDEX idx_prompt_experiments_active ON prompt_experiments(is_active);
CREATE INDEX idx_benchmark_scores_status ON benchmark_scores(status);

-- Function to calculate accuracy scores when actual values are updated
CREATE OR REPLACE FUNCTION calculate_accuracy_scores()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate individual field accuracies
  IF NEW.actual_brand IS NOT NULL THEN
    NEW.brand_accuracy := CASE 
      WHEN LOWER(NEW.predicted_brand) = LOWER(NEW.actual_brand) THEN 1.0
      ELSE 0.0
    END;
  END IF;
  
  IF NEW.actual_size IS NOT NULL THEN
    NEW.size_accuracy := CASE 
      WHEN LOWER(NEW.predicted_size) = LOWER(NEW.actual_size) THEN 1.0
      ELSE 0.0
    END;
  END IF;
  
  IF NEW.actual_color IS NOT NULL THEN
    NEW.color_accuracy := CASE 
      WHEN LOWER(NEW.predicted_color) = LOWER(NEW.actual_color) THEN 1.0
      ELSE 0.0
    END;
  END IF;
  
  IF NEW.actual_condition IS NOT NULL THEN
    NEW.condition_accuracy := CASE 
      WHEN LOWER(NEW.predicted_condition) = LOWER(NEW.actual_condition) THEN 1.0
      ELSE 0.0
    END;
  END IF;
  
  IF NEW.actual_category IS NOT NULL THEN
    NEW.category_accuracy := CASE 
      WHEN LOWER(NEW.predicted_category) = LOWER(NEW.actual_category) THEN 1.0
      ELSE 0.0
    END;
  END IF;
  
  -- Calculate title accuracy (similarity based)
  IF NEW.actual_title IS NOT NULL AND NEW.predicted_title IS NOT NULL THEN
    NEW.title_accuracy := similarity(NEW.predicted_title, NEW.actual_title);
  END IF;
  
  -- Calculate overall accuracy
  NEW.overall_accuracy := (
    COALESCE(NEW.brand_accuracy, 0) +
    COALESCE(NEW.size_accuracy, 0) +
    COALESCE(NEW.color_accuracy, 0) +
    COALESCE(NEW.condition_accuracy, 0) +
    COALESCE(NEW.category_accuracy, 0) +
    COALESCE(NEW.title_accuracy, 0)
  ) / NULLIF(
    (CASE WHEN NEW.brand_accuracy IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN NEW.size_accuracy IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN NEW.color_accuracy IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN NEW.condition_accuracy IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN NEW.category_accuracy IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN NEW.title_accuracy IS NOT NULL THEN 1 ELSE 0 END), 0
  );
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate accuracy on update
CREATE TRIGGER calculate_accuracy_on_update
  BEFORE UPDATE ON ai_predictions
  FOR EACH ROW
  WHEN (NEW.actual_brand IS DISTINCT FROM OLD.actual_brand OR
        NEW.actual_size IS DISTINCT FROM OLD.actual_size OR
        NEW.actual_color IS DISTINCT FROM OLD.actual_color OR
        NEW.actual_condition IS DISTINCT FROM OLD.actual_condition OR
        NEW.actual_category IS DISTINCT FROM OLD.actual_category OR
        NEW.actual_title IS DISTINCT FROM OLD.actual_title)
  EXECUTE FUNCTION calculate_accuracy_scores();

-- Function to get AI performance summary
CREATE OR REPLACE FUNCTION get_ai_performance_summary(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_predictions BIGINT,
  avg_accuracy DECIMAL,
  avg_cost_cents DECIMAL,
  top_failing_field TEXT,
  improvement_trend DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_predictions,
    AVG(overall_accuracy) as avg_accuracy,
    AVG(total_cost_cents)::DECIMAL as avg_cost_cents,
    CASE 
      WHEN AVG(brand_accuracy) < AVG(size_accuracy) AND 
           AVG(brand_accuracy) < AVG(color_accuracy) THEN 'brand'
      WHEN AVG(size_accuracy) < AVG(color_accuracy) THEN 'size'
      ELSE 'color'
    END as top_failing_field,
    (AVG(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN overall_accuracy END) -
     AVG(CASE WHEN created_at <= NOW() - INTERVAL '7 days' THEN overall_accuracy END))::DECIMAL 
     as improvement_trend
  FROM ai_predictions
  WHERE user_id = p_user_id
    AND created_at > NOW() - (p_days_back || ' days')::INTERVAL
    AND overall_accuracy IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Insert default benchmark targets
INSERT INTO benchmark_targets (metric, target_value, minimum_value, excellence_value, category, priority, description, timeframe)
VALUES 
  ('overall_accuracy', 90.0, 80.0, 95.0, 'accuracy', 'critical', 'Overall AI prediction accuracy', '30d'),
  ('brand_detection', 95.0, 85.0, 98.0, 'accuracy', 'critical', 'Brand detection accuracy', '30d'),
  ('size_extraction', 92.0, 85.0, 96.0, 'accuracy', 'high', 'Size extraction accuracy', '30d'),
  ('title_quality', 85.0, 75.0, 92.0, 'quality', 'high', 'Title generation quality', '30d'),
  ('ocr_accuracy', 88.0, 80.0, 94.0, 'accuracy', 'high', 'OCR text extraction accuracy', '30d'),
  ('processing_time', 5000, 8000, 3000, 'performance', 'medium', 'Average processing time (ms)', '7d'),
  ('cost_per_item', 5.0, 10.0, 3.0, 'cost', 'medium', 'Average cost per item (cents)', '30d'),
  ('ebay_compliance', 95.0, 90.0, 99.0, 'compliance', 'critical', 'eBay item specifics compliance', '30d'),
  ('keyword_relevance', 85.0, 75.0, 92.0, 'quality', 'medium', 'Keyword relevance score', '30d'),
  ('user_correction_rate', 10.0, 20.0, 5.0, 'quality', 'low', 'User correction rate (%)', '30d')
ON CONFLICT (metric) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebay_specifics_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_optimization ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own AI predictions"
  ON ai_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI predictions"
  ON ai_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI predictions"
  ON ai_predictions FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON ai_predictions TO authenticated;
GRANT ALL ON ocr_extractions TO authenticated;
GRANT ALL ON ebay_specifics_tracking TO authenticated;
GRANT ALL ON prompt_experiments TO authenticated;
GRANT ALL ON keyword_optimization TO authenticated;
GRANT SELECT ON benchmark_targets TO authenticated;
GRANT SELECT ON benchmark_scores TO authenticated;