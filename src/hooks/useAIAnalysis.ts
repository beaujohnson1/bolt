import { useState } from 'react';
import { analyzeClothingItem } from '../services/openaiService.js';

interface AnalysisOptions {
  sku?: string;
  photos?: string[];
}

interface AnalysisResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const useAIAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const analyzeItem = async (imageUrl: string, options: AnalysisOptions = {}): Promise<AnalysisResult> => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      console.log('🤖 [AI-ANALYSIS] Starting analysis for:', { imageUrl: imageUrl.substring(0, 50) + '...', options });

      // Use the existing OpenAI service
      const result = await analyzeClothingItem(imageUrl);

      if (!result.success) {
        throw new Error(result.error || 'AI analysis failed');
      }

      console.log('✅ [AI-ANALYSIS] Analysis complete:', result);

      return {
        success: true,
        data: result.analysis || result.data
      };

    } catch (error) {
      console.error('❌ [AI-ANALYSIS] Analysis failed:', error);
      setAnalysisError(error.message);
      
      return {
        success: false,
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
          const result = await analyzeItem(item.imageUrl, item.options);
          results.push(result);
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
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
    analysisError
  };
};