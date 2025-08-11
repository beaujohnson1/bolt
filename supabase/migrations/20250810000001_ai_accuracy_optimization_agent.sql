-- AI Accuracy Optimization Agent Database Schema
-- This migration adds comprehensive tracking for AI performance optimization

-- Table to track every AI prediction and its accuracy
CREATE TABLE ai_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Original AI predictions
  predicted_title TEXT,
  predicted_brand TEXT,
  predicted_size TEXT,
  predicted_condition TEXT,
  predicted_category TEXT,
  predicted_color TEXT,
  predicted_keywords TEXT[],
  predicted_specifics JSONB,
  ai_confidence DECIMAL(3,2) NOT NULL,
  
  -- User corrections (ground truth)
  actual_title TEXT,
  actual_brand TEXT,
  actual_size TEXT,
  actual_condition TEXT,
  actual_category TEXT,
  actual_color TEXT,
  actual_keywords TEXT[],
  actual_specifics JSONB,
  
  -- Accuracy metrics
  title_accuracy DECIMAL(3,2),
  brand_accuracy DECIMAL(3,2),
  size_accuracy DECIMAL(3,2),
  condition_accuracy DECIMAL(3,2),
  category_accuracy DECIMAL(3,2),
  color_accuracy DECIMAL(3,2),
  keywords_accuracy DECIMAL(3,2),
  specifics_accuracy DECIMAL(3,2),
  overall_accuracy DECIMAL(3,2),
  
  -- Cost tracking
  openai_tokens_used INTEGER DEFAULT 0,
  google_vision_requests INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0,
  cost_per_accurate_field DECIMAL(8,2),
  
  -- Metadata
  image_urls TEXT[],
  ocr_text_length INTEGER,
  analysis_duration_ms INTEGER,
  prompt_version TEXT DEFAULT 'v1.0',
  model_used TEXT DEFAULT 'gpt-4-vision-preview',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track OCR extraction quality and optimization
CREATE TABLE ocr_extractions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID REFERENCES ai_predictions(id) ON DELETE CASCADE,
  
  -- OCR results
  raw_ocr_text TEXT,
  tag_texts TEXT[],
  cropped_texts TEXT[],
  total_text_length INTEGER,
  
  -- Extraction attempts
  extracted_brands TEXT[],
  extracted_sizes TEXT[],
  extracted_keywords TEXT[],
  extraction_confidence DECIMAL(3,2),
  
  -- Validation results
  brand_found_in_ocr BOOLEAN DEFAULT FALSE,
  size_found_in_ocr BOOLEAN DEFAULT FALSE,
  keywords_found_in_ocr INTEGER DEFAULT 0,
  brand_extraction_method TEXT, -- 'regex', 'ai', 'manual'
  size_extraction_method TEXT,
  
  -- Performance metrics
  google_vision_cost_cents INTEGER DEFAULT 0,
  ocr_processing_time_ms INTEGER DEFAULT 0,
  extraction_accuracy_score DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track eBay item specifics accuracy
CREATE TABLE ebay_specifics_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID REFERENCES ai_predictions(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  
  -- Required specifics tracking
  required_specifics JSONB, -- What eBay requires for this category
  predicted_specifics JSONB, -- What AI predicted
  actual_specifics JSONB, -- What user corrected to
  
  -- Accuracy metrics
  required_fields_predicted INTEGER DEFAULT 0,
  required_fields_correct INTEGER DEFAULT 0,
  optional_fields_predicted INTEGER DEFAULT 0,
  optional_fields_correct INTEGER DEFAULT 0,
  
  -- Field-level accuracy
  brand_required BOOLEAN DEFAULT FALSE,
  brand_predicted TEXT,
  brand_correct BOOLEAN DEFAULT FALSE,
  
  size_required BOOLEAN DEFAULT FALSE,
  size_predicted TEXT,
  size_correct BOOLEAN DEFAULT FALSE,
  
  color_required BOOLEAN DEFAULT FALSE,
  color_predicted TEXT,
  color_correct BOOLEAN DEFAULT FALSE,
  
  material_required BOOLEAN DEFAULT FALSE,
  material_predicted TEXT,
  material_correct BOOLEAN DEFAULT FALSE,
  
  -- Performance scoring
  specifics_completeness_score DECIMAL(3,2),
  specifics_accuracy_score DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track prompt optimization experiments
CREATE TABLE prompt_experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_name TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  
  -- Experiment parameters
  prompt_text TEXT NOT NULL,
  model_used TEXT NOT NULL DEFAULT 'gpt-4-vision-preview',
  temperature DECIMAL(2,1) DEFAULT 0.1,
  max_tokens INTEGER DEFAULT 1500,
  
  -- Performance metrics
  total_tests INTEGER DEFAULT 0,
  avg_accuracy DECIMAL(3,2) DEFAULT 0,
  avg_cost_cents INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  
  -- A/B test results
  control_group_accuracy DECIMAL(3,2),
  test_group_accuracy DECIMAL(3,2),
  statistical_significance DECIMAL(3,2),
  
  -- Status
  status TEXT CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for keyword extraction optimization
CREATE TABLE keyword_optimization (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID REFERENCES ai_predictions(id) ON DELETE CASCADE,
  
  -- Keyword sources
  ocr_keywords TEXT[],
  ai_keywords TEXT[],
  combined_keywords TEXT[],
  final_keywords TEXT[], -- What user approved
  
  -- Quality metrics
  ocr_keyword_quality DECIMAL(3,2), -- How many OCR keywords were kept
  ai_keyword_quality DECIMAL(3,2), -- How many AI keywords were kept
  keyword_relevance_score DECIMAL(3,2),
  
  -- eBay optimization
  ebay_search_volume JSONB, -- Estimated search volume per keyword
  keyword_competition_score JSONB, -- Competition level per keyword
  title_keyword_density DECIMAL(3,2),
  
  -- Performance tracking
  keywords_driving_views INTEGER DEFAULT 0,
  keywords_driving_sales INTEGER DEFAULT 0,
  keyword_roi_score DECIMAL(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_predictions_user_id ON ai_predictions(user_id);
CREATE INDEX idx_ai_predictions_created_at ON ai_predictions(created_at);
CREATE INDEX idx_ai_predictions_accuracy ON ai_predictions(overall_accuracy);
CREATE INDEX idx_ocr_extractions_prediction_id ON ocr_extractions(prediction_id);
CREATE INDEX idx_ebay_specifics_category ON ebay_specifics_tracking(category_id);
CREATE INDEX idx_prompt_experiments_status ON prompt_experiments(status);
CREATE INDEX idx_keyword_optimization_prediction_id ON keyword_optimization(prediction_id);

-- Function to calculate accuracy scores
CREATE OR REPLACE FUNCTION calculate_field_accuracy(predicted TEXT, actual TEXT)
RETURNS DECIMAL(3,2) AS $$
BEGIN
  -- Handle null cases
  IF predicted IS NULL AND actual IS NULL THEN
    RETURN 1.0;
  END IF;
  
  IF predicted IS NULL OR actual IS NULL THEN
    RETURN 0.0;
  END IF;
  
  -- Exact match
  IF LOWER(TRIM(predicted)) = LOWER(TRIM(actual)) THEN
    RETURN 1.0;
  END IF;
  
  -- Partial match using similarity
  IF similarity(LOWER(predicted), LOWER(actual)) > 0.8 THEN
    RETURN similarity(LOWER(predicted), LOWER(actual));
  END IF;
  
  RETURN 0.0;
END;
$$ LANGUAGE plpgsql;

-- Function to update accuracy metrics
CREATE OR REPLACE FUNCTION update_prediction_accuracy()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate individual field accuracies
  NEW.title_accuracy = calculate_field_accuracy(NEW.predicted_title, NEW.actual_title);
  NEW.brand_accuracy = calculate_field_accuracy(NEW.predicted_brand, NEW.actual_brand);
  NEW.size_accuracy = calculate_field_accuracy(NEW.predicted_size, NEW.actual_size);
  NEW.condition_accuracy = calculate_field_accuracy(NEW.predicted_condition, NEW.actual_condition);
  NEW.category_accuracy = calculate_field_accuracy(NEW.predicted_category, NEW.actual_category);
  NEW.color_accuracy = calculate_field_accuracy(NEW.predicted_color, NEW.actual_color);
  
  -- Calculate overall accuracy
  NEW.overall_accuracy = (
    COALESCE(NEW.title_accuracy, 0) * 0.3 +
    COALESCE(NEW.brand_accuracy, 0) * 0.2 +
    COALESCE(NEW.size_accuracy, 0) * 0.15 +
    COALESCE(NEW.condition_accuracy, 0) * 0.1 +
    COALESCE(NEW.category_accuracy, 0) * 0.15 +
    COALESCE(NEW.color_accuracy, 0) * 0.1
  );
  
  -- Calculate cost per accurate field
  IF NEW.overall_accuracy > 0 AND NEW.total_cost_cents > 0 THEN
    NEW.cost_per_accurate_field = NEW.total_cost_cents / NEW.overall_accuracy;
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for accuracy calculation
CREATE TRIGGER trigger_update_prediction_accuracy
  BEFORE INSERT OR UPDATE ON ai_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_prediction_accuracy();

-- Function to get AI performance summary
CREATE OR REPLACE FUNCTION get_ai_performance_summary(
  p_user_id UUID DEFAULT NULL,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_predictions INTEGER,
  avg_accuracy DECIMAL(3,2),
  avg_cost_cents INTEGER,
  top_failing_field TEXT,
  improvement_trend DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_predictions,
    ROUND(AVG(overall_accuracy), 2)::DECIMAL(3,2) as avg_accuracy,
    ROUND(AVG(total_cost_cents))::INTEGER as avg_cost_cents,
    (
      SELECT field_name FROM (
        SELECT 'title' as field_name, AVG(title_accuracy) as avg_acc
        UNION SELECT 'brand', AVG(brand_accuracy)
        UNION SELECT 'size', AVG(size_accuracy)
        UNION SELECT 'condition', AVG(condition_accuracy)
        UNION SELECT 'category', AVG(category_accuracy)
        UNION SELECT 'color', AVG(color_accuracy)
      ) t ORDER BY avg_acc LIMIT 1
    ) as top_failing_field,
    0.0::DECIMAL(3,2) as improvement_trend -- TODO: Calculate trend
  FROM ai_predictions 
  WHERE created_at >= NOW() - INTERVAL '1 day' * p_days_back
    AND (p_user_id IS NULL OR user_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_predictions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ocr_extractions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ebay_specifics_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON prompt_experiments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON keyword_optimization TO authenticated;

-- Row Level Security policies
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ebay_specifics_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_optimization ENABLE ROW LEVEL SECURITY;

-- AI predictions are user-specific
CREATE POLICY "Users can manage own AI predictions" ON ai_predictions 
FOR ALL USING (auth.uid() = user_id);

-- OCR extractions inherit from predictions
CREATE POLICY "Users can manage own OCR extractions" ON ocr_extractions 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM ai_predictions 
    WHERE ai_predictions.id = ocr_extractions.prediction_id 
    AND ai_predictions.user_id = auth.uid()
  )
);

-- eBay specifics tracking inherits from predictions
CREATE POLICY "Users can manage own eBay specifics tracking" ON ebay_specifics_tracking 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM ai_predictions 
    WHERE ai_predictions.id = ebay_specifics_tracking.prediction_id 
    AND ai_predictions.user_id = auth.uid()
  )
);

-- Prompt experiments are global (for system optimization)
CREATE POLICY "Users can view prompt experiments" ON prompt_experiments FOR SELECT USING (true);
CREATE POLICY "Only system can manage prompt experiments" ON prompt_experiments 
FOR INSERT, UPDATE, DELETE USING (false);

-- Keyword optimization inherits from predictions  
CREATE POLICY "Users can manage own keyword optimization" ON keyword_optimization 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM ai_predictions 
    WHERE ai_predictions.id = keyword_optimization.prediction_id 
    AND ai_predictions.user_id = auth.uid()
  )
);