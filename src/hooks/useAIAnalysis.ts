import { buildItemSpecificsFromEbayPayload } from '../ebay/specificsAdapter'; // <--- Import the new adapter
import { sTrim } from '../utils/strings'; // <--- Import sTrim
import { useState } from 'react';
import { analyzeClothingItem } from '../services/openaiService.js';
import EbayApiService from '../services/ebayApi';
import EbayCategoryManager from '../services/EbayCategoryManager';
import EbayMarketResearch from '../services/EbayMarketResearch';
import { withRetry } from '../utils/promiseUtils'; // Import withRetry
import { supabase } from '../lib/supabase';

interface AnalysisOptions {
  sku?: string;
  photos?: string[];
  includeMarketResearch?: boolean;
  includeCategoryAnalysis?: boolean;
}

interface AnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
  marketResearch?: any;
  categoryAnalysis?: any;
}

export const useAIAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Initialize eBay services
  const ebayService = new EbayApiService();
  const categoryManager = new EbayCategoryManager(ebayService, supabase);
  const marketResearch = new EbayMarketResearch(ebayService, supabase);

  const analyzeItem = async (imageUrl: string, options: AnalysisOptions = {}): Promise<AnalysisResult> => {
    console.log('🤖 [AI-ANALYSIS] Starting analysis for:', { imageUrl: imageUrl.substring(0, 50) + '...', options });
    setIsAnalyzing(true);
    setAnalysisError(null);

    // Declare all variables outside try block to prevent ReferenceError
    let aiData: any = null;
    let marketResearchData: any = null;
    let categoryAnalysisData: any = null;
    let enhancedData: any = null;
    
    try {
      console.log('🤖 [AI-ANALYSIS] Calling OpenAI service...');
      
      // Use the existing OpenAI service with retry logic
      const result = await withRetry(
        () => analyzeClothingItem(imageUrl, {
          includeEbayAspects: options.includeCategoryAnalysis || false,
          sku: options.sku
        }),
        2, // Reduced retries to avoid long waits
        2000 // 2 second delay between retries
      );

      console.log('📊 [AI-ANALYSIS] OpenAI service result:', result);
      
      if (!result.success) {
        console.error('❌ [AI-ANALYSIS] OpenAI service returned unsuccessful result:', result.error);
        // Check if this is a validation failure from server
        if (result.error === 'AI_JSON_VALIDATION_FAILED') {
          console.error('❌ [AI-ANALYSIS] Server-side validation failed:', result.issues);
          throw new Error(`AI response validation failed: ${result.issues?.map(i => i.message).join(', ') || 'Invalid schema'}`);
        }
        throw new Error(result.error || 'OpenAI analysis returned unsuccessful result');
      }

      console.log('✅ [AI-ANALYSIS] OpenAI analysis successful');
      
      // Extract AI data from the result
      aiData = result.analysis || result.data;
      
      if (!aiData) {
        console.error('❌ [AI-ANALYSIS] No analysis data in successful result');
        throw new Error('OpenAI analysis returned no data');
      }

      // Step 2: Enhanced eBay integration (if requested)

      if (options.includeMarketResearch && aiData.title) {
        try {
          console.log('💰 [AI-ANALYSIS] Conducting market research...');
          marketResearchData = await marketResearch.getPriceSuggestion(
            aiData.title,
            '11450', // Default to clothing category
            aiData.condition || 'good',
            aiData.brand
          );
          console.log('✅ [AI-ANALYSIS] Market research complete');
        } catch (error) {
          console.error('❌ [AI-ANALYSIS] Market research failed:', error);
          // Don't throw - continue without market research
        }
      }

      if (options.includeCategoryAnalysis && aiData.title) {
        try {
          console.log('🎯 [AI-ANALYSIS] Analyzing category suggestions...');
          const categoryOptions = await categoryManager.suggestCategory(
            aiData.title,
            aiData.description || '',
            { brand: aiData.brand }
          );
          
          categoryAnalysisData = {
            suggestions: categoryOptions,
            recommended: categoryOptions[0] || null
          };
          console.log('✅ [AI-ANALYSIS] Category analysis complete');
        } catch (error) {
          console.error('❌ [AI-ANALYSIS] Category analysis failed:', error);
          // Don't throw - continue without category analysis
        }
      }

      // Step 3: Combine all analysis results
      enhancedData = {
        ...aiData,
        // Override price with market research if available
        suggested_price: marketResearchData?.suggestedPrice || aiData.suggested_price || aiData.price || 25,
        price_range: marketResearchData?.priceRange || { min: 20, max: 35 },
        // Add category information
        recommended_category: categoryAnalysisData?.recommended || null,
        category_options: categoryAnalysisData?.suggestions || [],
        // Add market insights
        market_confidence: marketResearchData?.confidence || 0.5,
        sold_count: marketResearchData?.soldCount || 0,
        source: 'ai_analysis'
      };

      console.log('✅ [AI-ANALYSIS] Enhanced data created successfully');
      
      return {
        success: true,
        data: enhancedData,
        marketResearch: marketResearchData,
        categoryAnalysis: categoryAnalysisData
      };
    } catch (error) {
      console.error('❌ [AI-ANALYSIS] Analysis failed:', error);
      setAnalysisError(error.message);
      
      // Create fallback data to prevent complete failure
      const fallbackData = {
        title: 'Item - Manual Review Required',
        brand: 'Unknown',
        size: 'Unknown',
        condition: 'good',
        category: 'other',
        color: 'Various',
        suggested_price: 25,
        price: 25,
        confidence: 0.1,
        key_features: ['manual review required'],
        keywords: ['item', 'manual review'],
        source: 'fallback',
        error_message: error.message
      };
      
      return {
        success: false,
        data: enhancedData || aiData || fallbackData,
        marketResearch: marketResearchData,
        categoryAnalysis: categoryAnalysisData,
        error: error.message
      };
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeBatch = async (items: Array<{ imageUrl: string; options?: AnalysisOptions }>): Promise<AnalysisResult[]> => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      console.log('🤖 [AI-ANALYSIS] Starting batch analysis for', items.length, 'items');

      const results: AnalysisResult[] = [];

      // Process items sequentially to avoid rate limits
      for (const item of items) {
        try {
          const result = await analyzeItem(item.imageUrl, {
            ...item.options,
            includeMarketResearch: true,
            includeCategoryAnalysis: true
          });
          results.push(result);
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay for eBay API
        } catch (error) {
          results.push({
            success: false,
            error: error.message
          });
        }
      }

      console.log('✅ [AI-ANALYSIS] Batch analysis complete:', results.length);
      return results;

    } catch (error) {
      console.error('❌ [AI-ANALYSIS] Batch analysis failed:', error);
      setAnalysisError(error.message);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeItem,
    analyzeBatch,
    isAnalyzing,
    analysisError,
    // Expose eBay services for direct use
    ebayService,
    categoryManager,
    marketResearch
  };
};