import { useState, useEffect, useCallback } from 'react';
import { ebayMarketIntelligence } from '../services/EbayMarketIntelligence';

interface MarketIntelligenceHook {
  marketInsights: any;
  trendingKeywords: any[];
  categoryPerformance: any[];
  competitorAnalysis: any;
  smartPricing: any;
  marketTrends: any;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  getPricingRecommendation: (item: any) => Promise<any>;
  getCategoryRecommendations: (categories: string[]) => Promise<any[]>;
}

export const useMarketIntelligence = (item?: {
  title?: string;
  brand?: string;
  category?: string;
  condition?: string;
  size?: string;
  color?: string;
}): MarketIntelligenceHook => {
  const [marketInsights, setMarketInsights] = useState(null);
  const [trendingKeywords, setTrendingKeywords] = useState([]);
  const [categoryPerformance, setCategoryPerformance] = useState([]);
  const [competitorAnalysis, setCompetitorAnalysis] = useState(null);
  const [smartPricing, setSmartPricing] = useState(null);
  const [marketTrends, setMarketTrends] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!item || !item.title || !item.brand || !item.category) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('📊 [MARKET-HOOK] Refreshing market intelligence for:', item.title);

      // Parallel data fetching for performance
      const [insights, keywords, trends, pricing] = await Promise.allSettled([
        ebayMarketIntelligence.getMarketInsights(item),
        ebayMarketIntelligence.getTrendingKeywords(item.category, item.brand),
        ebayMarketIntelligence.getMarketTrends(),
        ebayMarketIntelligence.getSmartPricingRecommendation({
          title: item.title,
          brand: item.brand,
          category: item.category,
          condition: item.condition || 'used'
        })
      ]);

      // Update state with successful results
      if (insights.status === 'fulfilled') {
        setMarketInsights(insights.value);
      } else {
        console.warn('Market insights failed:', insights.reason);
      }

      if (keywords.status === 'fulfilled') {
        setTrendingKeywords(keywords.value);
      } else {
        console.warn('Trending keywords failed:', keywords.reason);
      }

      if (trends.status === 'fulfilled') {
        setMarketTrends(trends.value);
      } else {
        console.warn('Market trends failed:', trends.reason);
      }

      if (pricing.status === 'fulfilled') {
        setSmartPricing(pricing.value);
      } else {
        console.warn('Smart pricing failed:', pricing.reason);
      }

      console.log('✅ [MARKET-HOOK] Market intelligence refresh complete');

    } catch (err) {
      console.error('❌ [MARKET-HOOK] Market intelligence refresh failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load market data');
    } finally {
      setIsLoading(false);
    }
  }, [item]);

  const getPricingRecommendation = useCallback(async (pricingItem: any) => {
    try {
      setIsLoading(true);
      console.log('💰 [MARKET-HOOK] Getting pricing recommendation for:', pricingItem.title);

      const pricing = await ebayMarketIntelligence.getSmartPricingRecommendation(pricingItem);
      setSmartPricing(pricing);
      
      return pricing;
    } catch (err) {
      console.error('❌ [MARKET-HOOK] Pricing recommendation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to get pricing recommendation');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCategoryRecommendations = useCallback(async (categories: string[]) => {
    try {
      setIsLoading(true);
      console.log('📈 [MARKET-HOOK] Getting category recommendations for:', categories);

      const performance = await ebayMarketIntelligence.getCategoryPerformance(categories);
      setCategoryPerformance(performance);
      
      return performance;
    } catch (err) {
      console.error('❌ [MARKET-HOOK] Category recommendations failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to get category recommendations');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh data when item changes
  useEffect(() => {
    if (item && item.title && item.brand && item.category) {
      refreshData();
    }
  }, [item?.title, item?.brand, item?.category, refreshData]);

  return {
    marketInsights,
    trendingKeywords,
    categoryPerformance,
    competitorAnalysis,
    smartPricing,
    marketTrends,
    isLoading,
    error,
    refreshData,
    getPricingRecommendation,
    getCategoryRecommendations
  };
};

// Hook for global market trends (doesn't require specific item)
export const useGlobalMarketTrends = () => {
  const [trends, setTrends] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🌍 [GLOBAL-TRENDS] Fetching global market trends...');
      const globalTrends = await ebayMarketIntelligence.getMarketTrends();
      setTrends(globalTrends);
      console.log('✅ [GLOBAL-TRENDS] Global trends loaded');
    } catch (err) {
      console.error('❌ [GLOBAL-TRENDS] Failed to load global trends:', err);
      setError(err instanceof Error ? err.message : 'Failed to load market trends');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return {
    trends,
    isLoading,
    error,
    refreshTrends: fetchTrends
  };
};

// Hook for keyword optimization
export const useKeywordOptimization = (category: string, brand?: string) => {
  const [keywords, setKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getOptimizedKeywords = useCallback(async (currentKeywords: string[] = []) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 [KEYWORD-OPT] Optimizing keywords for:', category);
      
      const [trending, currentPerformance] = await Promise.all([
        ebayMarketIntelligence.getTrendingKeywords(category, brand),
        // Could add keyword performance analysis here
        Promise.resolve([])
      ]);

      // Combine trending keywords with current ones
      const optimizedKeywords = trending
        .filter(kw => kw.recommendedUse)
        .sort((a, b) => b.searchVolume - a.searchVolume)
        .slice(0, 10);

      setKeywords(optimizedKeywords);
      return optimizedKeywords;

    } catch (err) {
      console.error('❌ [KEYWORD-OPT] Keyword optimization failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to optimize keywords');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [category, brand]);

  return {
    keywords,
    isLoading,
    error,
    getOptimizedKeywords
  };
};

// Hook for competitive pricing
export const useCompetitivePricing = () => {
  const [pricingData, setPricingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzePricing = useCallback(async (item: {
    title: string;
    brand: string;
    category: string;
    condition: string;
    currentPrice?: number;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('💰 [COMPETITIVE-PRICING] Analyzing pricing for:', item.title);

      const [marketInsights, competitorAnalysis, smartPricing] = await Promise.all([
        ebayMarketIntelligence.getMarketInsights(item),
        ebayMarketIntelligence.getCompetitorAnalysis({
          ...item,
          estimatedPrice: item.currentPrice || 0
        }),
        ebayMarketIntelligence.getSmartPricingRecommendation(item)
      ]);

      const pricingAnalysis = {
        marketInsights,
        competitorAnalysis,
        smartPricing,
        recommendations: {
          optimal: smartPricing.recommendedPrice,
          aggressive: Math.round(smartPricing.recommendedPrice * 0.9),
          premium: Math.round(smartPricing.recommendedPrice * 1.15),
          strategy: smartPricing.priceStrategy
        }
      };

      setPricingData(pricingAnalysis);
      return pricingAnalysis;

    } catch (err) {
      console.error('❌ [COMPETITIVE-PRICING] Pricing analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze pricing');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    pricingData,
    isLoading,
    error,
    analyzePricing
  };
};

// Hook for category optimization
export const useCategoryOptimization = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimizeCategory = useCallback(async (
    possibleCategories: string[],
    itemDetails: { title: string; brand: string; description?: string }
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📂 [CATEGORY-OPT] Optimizing category selection for:', itemDetails.title);

      const categoryPerformance = await ebayMarketIntelligence.getCategoryPerformance(possibleCategories);
      
      // Add item-specific scoring
      const optimizedRecommendations = categoryPerformance.map(category => ({
        ...category,
        itemFitScore: calculateItemFit(category, itemDetails),
        finalScore: category.recommendationScore * calculateItemFit(category, itemDetails)
      })).sort((a, b) => b.finalScore - a.finalScore);

      setRecommendations(optimizedRecommendations);
      return optimizedRecommendations;

    } catch (err) {
      console.error('❌ [CATEGORY-OPT] Category optimization failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to optimize category');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    recommendations,
    isLoading,
    error,
    optimizeCategory
  };
};

// Helper function for category-item fit calculation
function calculateItemFit(category: any, itemDetails: any): number {
  // Simple scoring based on title/description keywords
  const categoryKeywords: Record<string, string[]> = {
    'clothing': ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'sweater'],
    'electronics': ['phone', 'computer', 'tablet', 'camera', 'headphones', 'speaker'],
    'books_media': ['book', 'dvd', 'cd', 'vinyl', 'magazine', 'novel'],
    'home_garden': ['kitchen', 'furniture', 'decor', 'tools', 'appliance', 'bedding'],
    'toys_games': ['toy', 'game', 'puzzle', 'action figure', 'board game', 'collectible'],
    'sports_outdoors': ['sports', 'outdoor', 'fitness', 'camping', 'bike', 'exercise']
  };

  const keywords = categoryKeywords[category.categoryId] || [];
  const itemText = `${itemDetails.title} ${itemDetails.description || ''}`.toLowerCase();
  
  const matchCount = keywords.filter(keyword => itemText.includes(keyword)).length;
  return Math.min(1.0, matchCount / keywords.length + 0.5);
}