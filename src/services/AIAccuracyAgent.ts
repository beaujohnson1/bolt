import { getSupabase, type User } from '../lib/supabase';
import { analyzeClothingItem } from './openaiService';
import { extractSize, extractBrand } from '../utils/itemUtils';
import { visionClient } from '../lib/googleVision';

interface PredictionData {
  itemId: string;
  userId: string;
  predictedData: {
    title: string;
    brand: string | null;
    size: string | null;
    condition: string;
    category: string;
    color: string | null;
    keywords: string[];
    specifics: Record<string, any>;
  };
  confidence: number;
  imageUrls: string[];
  ocrText: string;
  promptVersion: string;
  modelUsed: string;
  analysisMetrics: {
    openaiTokens: number;
    googleVisionRequests: number;
    totalCostCents: number;
    analysisDurationMs: number;
  };
}

interface AccuracyFeedback {
  predictionId: string;
  actualData: {
    title?: string;
    brand?: string;
    size?: string;
    condition?: string;
    category?: string;
    color?: string;
    keywords?: string[];
    specifics?: Record<string, any>;
  };
  userCorrections: string[];
}

interface PerformanceMetrics {
  totalPredictions: number;
  avgAccuracy: number;
  avgCostCents: number;
  topFailingField: string;
  improvementTrend: number;
  costEfficiency: number;
  fieldAccuracies: {
    title: number;
    brand: number;
    size: number;
    condition: number;
    category: number;
    color: number;
    keywords: number;
    specifics: number;
  };
}

export class AIAccuracyAgent {
  private supabase;
  
  constructor() {
    this.supabase = getSupabase();
  }

  /**
   * Track a new AI prediction for accuracy monitoring
   */
  async trackPrediction(data: PredictionData): Promise<string | null> {
    if (!this.supabase) {
      console.error('❌ [AI-ACCURACY] Supabase client not available');
      return null;
    }

    try {
      console.log('📊 [AI-ACCURACY] Tracking new prediction:', {
        itemId: data.itemId,
        confidence: data.confidence,
        modelUsed: data.modelUsed
      });

      // First, track OCR extraction quality
      const ocrExtractionId = await this.trackOCRExtraction(data);

      // Insert the main prediction record
      const { data: prediction, error } = await this.supabase
        .from('ai_predictions')
        .insert({
          item_id: data.itemId,
          user_id: data.userId,
          predicted_title: data.predictedData.title,
          predicted_brand: data.predictedData.brand,
          predicted_size: data.predictedData.size,
          predicted_condition: data.predictedData.condition,
          predicted_category: data.predictedData.category,
          predicted_color: data.predictedData.color,
          predicted_keywords: data.predictedData.keywords,
          predicted_specifics: data.predictedData.specifics,
          ai_confidence: data.confidence,
          openai_tokens_used: data.analysisMetrics.openaiTokens,
          google_vision_requests: data.analysisMetrics.googleVisionRequests,
          total_cost_cents: data.analysisMetrics.totalCostCents,
          image_urls: data.imageUrls,
          ocr_text_length: data.ocrText.length,
          analysis_duration_ms: data.analysisMetrics.analysisDurationMs,
          prompt_version: data.promptVersion,
          model_used: data.modelUsed
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [AI-ACCURACY] Failed to track prediction:', error);
        return null;
      }

      console.log('✅ [AI-ACCURACY] Prediction tracked successfully:', prediction.id);
      return prediction.id;

    } catch (error) {
      console.error('❌ [AI-ACCURACY] Error tracking prediction:', error);
      return null;
    }
  }

  /**
   * Track OCR extraction performance
   */
  private async trackOCRExtraction(data: PredictionData): Promise<string | null> {
    try {
      // Extract brand and size using our deterministic methods
      const extractedBrand = extractBrand(data.ocrText);
      const extractedSize = extractSize(data.ocrText);

      const { data: extraction, error } = await this.supabase!
        .from('ocr_extractions')
        .insert({
          raw_ocr_text: data.ocrText,
          total_text_length: data.ocrText.length,
          extracted_brands: extractedBrand ? [extractedBrand] : [],
          extracted_sizes: extractedSize ? [extractedSize] : [],
          brand_found_in_ocr: !!extractedBrand,
          size_found_in_ocr: !!extractedSize,
          brand_extraction_method: extractedBrand ? 'regex' : 'none',
          size_extraction_method: extractedSize ? 'regex' : 'none',
          google_vision_cost_cents: Math.ceil(data.analysisMetrics.googleVisionRequests * 1.5), // ~$1.50 per 1000 requests
          ocr_processing_time_ms: Math.floor(data.analysisMetrics.analysisDurationMs * 0.3), // Estimated 30% of total time
          extraction_accuracy_score: this.calculateExtractionAccuracy(
            { brand: extractedBrand, size: extractedSize },
            { brand: data.predictedData.brand, size: data.predictedData.size }
          )
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [AI-ACCURACY] Failed to track OCR extraction:', error);
        return null;
      }

      return extraction.id;
    } catch (error) {
      console.error('❌ [AI-ACCURACY] Error tracking OCR extraction:', error);
      return null;
    }
  }

  /**
   * Record user corrections to improve accuracy
   */
  async recordFeedback(feedback: AccuracyFeedback): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      console.log('📝 [AI-ACCURACY] Recording user feedback:', feedback.predictionId);

      // Update the prediction with actual values and calculate accuracies
      const { error } = await this.supabase
        .from('ai_predictions')
        .update({
          actual_title: feedback.actualData.title,
          actual_brand: feedback.actualData.brand,
          actual_size: feedback.actualData.size,
          actual_condition: feedback.actualData.condition,
          actual_category: feedback.actualData.category,
          actual_color: feedback.actualData.color,
          actual_keywords: feedback.actualData.keywords,
          actual_specifics: feedback.actualData.specifics
          // Note: accuracy fields will be calculated by the database trigger
        })
        .eq('id', feedback.predictionId);

      if (error) {
        console.error('❌ [AI-ACCURACY] Failed to record feedback:', error);
        return false;
      }

      // Log the corrections for analysis
      console.log('✅ [AI-ACCURACY] Feedback recorded with corrections:', feedback.userCorrections);
      
      return true;
    } catch (error) {
      console.error('❌ [AI-ACCURACY] Error recording feedback:', error);
      return false;
    }
  }

  /**
   * Get performance metrics for a user
   */
  async getPerformanceMetrics(userId: string, daysBack: number = 30): Promise<PerformanceMetrics | null> {
    if (!this.supabase) return null;

    try {
      console.log('📈 [AI-ACCURACY] Getting performance metrics for user:', userId);

      // Use the database function to get summary statistics
      const { data, error } = await this.supabase
        .rpc('get_ai_performance_summary', {
          p_user_id: userId,
          p_days_back: daysBack
        });

      if (error || !data || data.length === 0) {
        console.error('❌ [AI-ACCURACY] Failed to get performance metrics:', error);
        return null;
      }

      const summary = data[0];

      // Get detailed field accuracies
      const { data: predictions, error: predictionsError } = await this.supabase
        .from('ai_predictions')
        .select(`
          title_accuracy,
          brand_accuracy,
          size_accuracy,
          condition_accuracy,
          category_accuracy,
          color_accuracy,
          keywords_accuracy,
          specifics_accuracy
        `)
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
        .not('title_accuracy', 'is', null);

      if (predictionsError) {
        console.error('❌ [AI-ACCURACY] Failed to get field accuracies:', predictionsError);
      }

      // Calculate field-level averages
      const fieldAccuracies = this.calculateFieldAccuracies(predictions || []);

      const metrics: PerformanceMetrics = {
        totalPredictions: summary.total_predictions,
        avgAccuracy: summary.avg_accuracy,
        avgCostCents: summary.avg_cost_cents,
        topFailingField: summary.top_failing_field,
        improvementTrend: summary.improvement_trend,
        costEfficiency: this.calculateCostEfficiency(summary.avg_cost_cents, summary.avg_accuracy),
        fieldAccuracies
      };

      console.log('✅ [AI-ACCURACY] Performance metrics calculated:', {
        predictions: metrics.totalPredictions,
        accuracy: metrics.avgAccuracy,
        failingField: metrics.topFailingField
      });

      return metrics;
    } catch (error) {
      console.error('❌ [AI-ACCURACY] Error getting performance metrics:', error);
      return null;
    }
  }

  /**
   * Get optimization recommendations based on performance data
   */
  async getOptimizationRecommendations(userId: string): Promise<string[]> {
    const metrics = await this.getPerformanceMetrics(userId);
    if (!metrics) return ['Unable to analyze performance data'];

    const recommendations: string[] = [];

    // Accuracy-based recommendations
    if (metrics.avgAccuracy < 0.7) {
      recommendations.push('🎯 Overall accuracy is below 70%. Consider updating the AI prompt or using higher resolution images.');
    }

    // Field-specific recommendations
    if (metrics.fieldAccuracies.brand < 0.6) {
      recommendations.push('🏷️ Brand detection is struggling. Ensure clothing tags are clearly visible and well-lit.');
    }

    if (metrics.fieldAccuracies.size < 0.5) {
      recommendations.push('📏 Size extraction needs improvement. Focus on clear photos of size tags and labels.');
    }

    if (metrics.fieldAccuracies.keywords < 0.6) {
      recommendations.push('🔤 Keyword extraction could be better. Include close-up shots of care labels and brand tags.');
    }

    // Cost-efficiency recommendations
    if (metrics.costEfficiency < 0.1) {
      recommendations.push('💰 AI costs are high relative to accuracy. Consider batch processing or reducing image resolution.');
    }

    // Top failing field recommendation
    if (metrics.topFailingField) {
      recommendations.push(`⚠️ Focus on improving ${metrics.topFailingField} detection - it's your lowest performing field.`);
    }

    // Default recommendations if performance is good
    if (recommendations.length === 0) {
      recommendations.push('✅ AI performance looks good! Keep taking clear, well-lit photos for best results.');
      recommendations.push('📊 Consider A/B testing new prompts to push accuracy even higher.');
    }

    return recommendations;
  }

  /**
   * Track eBay item specifics accuracy
   */
  async trackEbaySpecifics(predictionId: string, categoryId: string, requiredSpecifics: Record<string, any>, predictedSpecifics: Record<string, any>): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('ebay_specifics_tracking')
        .insert({
          prediction_id: predictionId,
          category_id: categoryId,
          required_specifics: requiredSpecifics,
          predicted_specifics: predictedSpecifics,
          required_fields_predicted: Object.keys(requiredSpecifics).length,
          brand_required: 'Brand' in requiredSpecifics,
          brand_predicted: predictedSpecifics.Brand,
          size_required: 'Size' in requiredSpecifics,
          size_predicted: predictedSpecifics.Size,
          color_required: 'Color' in requiredSpecifics,
          color_predicted: predictedSpecifics.Color,
          material_required: 'Material' in requiredSpecifics,
          material_predicted: predictedSpecifics.Material
        });

      if (error) {
        console.error('❌ [AI-ACCURACY] Failed to track eBay specifics:', error);
      }
    } catch (error) {
      console.error('❌ [AI-ACCURACY] Error tracking eBay specifics:', error);
    }
  }

  /**
   * Run a prompt A/B test experiment
   */
  async createPromptExperiment(experimentName: string, newPrompt: string, testImageUrls: string[]): Promise<string | null> {
    if (!this.supabase) return null;

    try {
      console.log('🧪 [AI-ACCURACY] Creating prompt experiment:', experimentName);

      // Insert experiment record
      const { data: experiment, error } = await this.supabase
        .from('prompt_experiments')
        .insert({
          experiment_name: experimentName,
          prompt_version: `exp_${Date.now()}`,
          prompt_text: newPrompt,
          model_used: 'gpt-4o-mini'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [AI-ACCURACY] Failed to create experiment:', error);
        return null;
      }

      // TODO: Implement actual A/B testing logic
      console.log('✅ [AI-ACCURACY] Experiment created:', experiment.id);
      return experiment.id;
    } catch (error) {
      console.error('❌ [AI-ACCURACY] Error creating experiment:', error);
      return null;
    }
  }

  // Helper methods

  private calculateExtractionAccuracy(extracted: {brand: string | null, size: string | null}, predicted: {brand: string | null, size: string | null}): number {
    let score = 0;
    let total = 0;

    if (predicted.brand !== null) {
      total++;
      if (extracted.brand && extracted.brand.toLowerCase() === predicted.brand.toLowerCase()) {
        score++;
      }
    }

    if (predicted.size !== null) {
      total++;
      if (extracted.size && extracted.size.toLowerCase() === predicted.size.toLowerCase()) {
        score++;
      }
    }

    return total > 0 ? score / total : 1.0;
  }

  private calculateFieldAccuracies(predictions: any[]): PerformanceMetrics['fieldAccuracies'] {
    if (predictions.length === 0) {
      return {
        title: 0, brand: 0, size: 0, condition: 0, 
        category: 0, color: 0, keywords: 0, specifics: 0
      };
    }

    const avgField = (field: string) => {
      const values = predictions.map(p => p[field]).filter(v => v !== null);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };

    return {
      title: avgField('title_accuracy'),
      brand: avgField('brand_accuracy'),
      size: avgField('size_accuracy'),
      condition: avgField('condition_accuracy'),
      category: avgField('category_accuracy'),
      color: avgField('color_accuracy'),
      keywords: avgField('keywords_accuracy'),
      specifics: avgField('specifics_accuracy')
    };
  }

  private calculateCostEfficiency(avgCostCents: number, avgAccuracy: number): number {
    if (avgCostCents === 0) return 0;
    return avgAccuracy / (avgCostCents / 100); // Accuracy per dollar
  }
}

// Create singleton instance
export const aiAccuracyAgent = new AIAccuracyAgent();

// Hook into existing AI analysis pipeline
export const enhancedAnalyzeClothingItem = async (imageUrls: string | string[], options: any = {}) => {
  const startTime = Date.now();
  
  try {
    // Call the original analysis function
    const result = await analyzeClothingItem(imageUrls, options);
    
    if (result.success && result.analysis && options.userId) {
      const analysisTime = Date.now() - startTime;
      
      // Track this prediction for accuracy monitoring
      const predictionData: PredictionData = {
        itemId: options.itemId || 'temp_' + Date.now(),
        userId: options.userId,
        predictedData: {
          title: result.analysis.title || '',
          brand: result.analysis.brand,
          size: result.analysis.size,
          condition: result.analysis.condition || 'good',
          category: result.analysis.category || 'clothing',
          color: result.analysis.color,
          keywords: result.analysis.keywords || [],
          specifics: result.analysis.ebay_item_specifics || {}
        },
        confidence: result.analysis.confidence || 0.5,
        imageUrls: Array.isArray(imageUrls) ? imageUrls : [imageUrls],
        ocrText: result.preprocessing?.ocrText || '',
        promptVersion: 'v1.0',
        modelUsed: 'gpt-4o-mini',
        analysisMetrics: {
          openaiTokens: result.usage?.total_tokens || 0,
          googleVisionRequests: 1, // Assume 1 Google Vision request per analysis
          totalCostCents: Math.ceil((result.usage?.total_tokens || 0) * 0.01), // Rough cost estimate
          analysisDurationMs: analysisTime
        }
      };

      const predictionId = await aiAccuracyAgent.trackPrediction(predictionData);
      
      // Add prediction ID to result for feedback tracking
      result.predictionId = predictionId;
    }
    
    return result;
  } catch (error) {
    console.error('❌ [AI-ACCURACY] Error in enhanced analysis:', error);
    return await analyzeClothingItem(imageUrls, options); // Fallback to original
  }
};