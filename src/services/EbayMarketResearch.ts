import { SupabaseClient } from '@supabase/supabase-js';
import EbayApiService from './ebayApi';

interface MarketResearchData {
  averagePrice: number;
  priceRange: { min: number; max: number };
  soldCount: number;
  activeListings: number;
  suggestedPrice: number;
  confidence: number;
  dataPoints: CompletedListing[];
}

interface CompletedListing {
  title: string;
  price: number;
  condition: string;
  endTime: string;
  watchCount?: number;
  bidCount?: number;
}

interface PricingStrategy {
  strategy: 'competitive' | 'premium' | 'quick_sale';
  multiplier: number;
  description: string;
}

export class EbayMarketResearch {
  private ebayApi: EbayApiService;
  private supabase: SupabaseClient;
  private researchCache: Map<string, MarketResearchData> = new Map();

  constructor(ebayApiService: EbayApiService, supabaseClient: SupabaseClient) {
    this.ebayApi = ebayApiService;
    this.supabase = supabaseClient;
  }

  /**
   * Get price suggestion based on market research
   */
  async getPriceSuggestion(
    title: string,
    categoryId: string,
    condition: string = 'Used',
    brand?: string,
    strategy: PricingStrategy['strategy'] = 'competitive'
  ): Promise<MarketResearchData> {
    try {
      const searchKey = this.generateSearchKey(title, categoryId, condition, brand);
      console.log('💰 [MARKET-RESEARCH] Getting price suggestion for:', searchKey);
      
      // Check cache first
      const cachedData = await this.getCachedResearch(searchKey);
      if (cachedData) {
        console.log('✅ [MARKET-RESEARCH] Using cached price research');
        return cachedData;
      }

      // Conduct fresh market research
      const research = await this.conductPriceResearch(title, categoryId, condition, brand);
      
      // Apply pricing strategy
      const adjustedResearch = this.applyPricingStrategy(research, strategy);
      
      // Cache the results
      await this.cacheResearch(searchKey, adjustedResearch);
      
      console.log('✅ [MARKET-RESEARCH] Price research completed:', {
        suggestedPrice: adjustedResearch.suggestedPrice,
        confidence: adjustedResearch.confidence,
        dataPoints: adjustedResearch.dataPoints.length
      });
      
      return adjustedResearch;
    } catch (error) {
      console.error('❌ [MARKET-RESEARCH] Error getting price suggestion:', error);
      return this.getFallbackPricing(title, condition);
    }
  }

  /**
   * Conduct comprehensive price research
   */
  private async conductPriceResearch(
    title: string,
    categoryId: string,
    condition: string,
    brand?: string
  ): Promise<MarketResearchData> {
    try {
      console.log('🔍 [MARKET-RESEARCH] Conducting price research...');
      
      // Build optimized search query
      const searchQuery = this.buildSearchQuery(title, brand);
      console.log('🔍 [MARKET-RESEARCH] Search query:', searchQuery);
      
      // Get completed items data
      const completedItems = await this.ebayApi.searchCompletedItems(searchQuery, categoryId);
      console.log('📊 [MARKET-RESEARCH] Found completed items:', completedItems.length);
      
      // Analyze pricing data
      const priceAnalysis = this.analyzePrices(completedItems, condition);
      
      return priceAnalysis;
    } catch (error) {
      console.error('❌ [MARKET-RESEARCH] Error conducting research:', error);
      throw error;
    }
  }

  /**
   * Build optimized search query from title and brand
   */
  private buildSearchQuery(title: string, brand?: string): string {
    // Remove common stop words and clean the title
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    
    const titleWords = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .split(' ')
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Limit to 5 most important words
    
    let query = titleWords.join(' ');
    
    // Add brand if not already included
    if (brand && !query.toLowerCase().includes(brand.toLowerCase())) {
      query = `${brand} ${query}`;
    }
    
    console.log('🔍 [MARKET-RESEARCH] Built search query:', query);
    return query.trim();
  }

  /**
   * Analyze pricing data from completed listings
   */
  private analyzePrices(completedItems: CompletedListing[], targetCondition: string): MarketResearchData {
    console.log('📊 [MARKET-RESEARCH] Analyzing prices for condition:', targetCondition);
    
    if (completedItems.length === 0) {
      console.log('⚠️ [MARKET-RESEARCH] No completed items found, using fallback');
      return {
        averagePrice: 25,
        priceRange: { min: 20, max: 35 },
        soldCount: 0,
        activeListings: 0,
        suggestedPrice: 25,
        confidence: 0.1,
        dataPoints: []
      };
    }

    // Filter by similar condition
    const conditionMap: Record<string, string[]> = {
      'new': ['new', 'brand new', 'new with tags', 'new without tags'],
      'like_new': ['like new', 'excellent', 'mint', 'near mint'],
      'good': ['good', 'very good', 'used', 'pre-owned'],
      'fair': ['fair', 'acceptable', 'worn'],
      'poor': ['poor', 'damaged', 'for parts']
    };

    const targetConditionLower = targetCondition.toLowerCase();
    const relevantConditions = Object.entries(conditionMap)
      .find(([key, values]) => 
        key === targetConditionLower || 
        values.some(val => targetConditionLower.includes(val))
      )?.[1] || [targetConditionLower];

    const relevantItems = completedItems.filter(item => 
      relevantConditions.some(cond => 
        item.condition.toLowerCase().includes(cond) ||
        cond.includes(item.condition.toLowerCase())
      )
    );

    console.log('📊 [MARKET-RESEARCH] Filtered items by condition:', {
      total: completedItems.length,
      relevant: relevantItems.length,
      targetCondition
    });

    const prices = relevantItems.map(item => item.price).filter(price => price > 0);
    
    if (prices.length === 0) {
      console.log('⚠️ [MARKET-RESEARCH] No relevant prices found, using fallback');
      return {
        averagePrice: 25,
        priceRange: { min: 20, max: 35 },
        soldCount: 0,
        activeListings: 0,
        suggestedPrice: 25,
        confidence: 0.2,
        dataPoints: completedItems
      };
    }

    // Statistical analysis
    prices.sort((a, b) => a - b);
    
    // Remove outliers (bottom 10% and top 10%)
    const trimmedPrices = prices.slice(
      Math.floor(prices.length * 0.1),
      Math.ceil(prices.length * 0.9)
    );
    
    const median = trimmedPrices[Math.floor(trimmedPrices.length / 2)];
    const average = trimmedPrices.reduce((sum, price) => sum + price, 0) / trimmedPrices.length;
    const min = Math.min(...trimmedPrices);
    const max = Math.max(...trimmedPrices);
    
    // Suggest price slightly below median for competitive advantage
    const suggestedPrice = Math.round(median * 0.95);
    
    // Calculate confidence based on data quality
    const confidence = Math.min(0.95, 0.3 + (trimmedPrices.length * 0.05));

    const analysis = {
      averagePrice: Math.round(average),
      priceRange: { min: Math.round(min), max: Math.round(max) },
      soldCount: relevantItems.length,
      activeListings: completedItems.length - relevantItems.length,
      suggestedPrice,
      confidence,
      dataPoints: completedItems
    };

    console.log('📊 [MARKET-RESEARCH] Price analysis complete:', {
      suggestedPrice: analysis.suggestedPrice,
      range: analysis.priceRange,
      confidence: analysis.confidence
    });

    return analysis;
  }

  /**
   * Apply pricing strategy adjustments
   */
  private applyPricingStrategy(
    research: MarketResearchData, 
    strategy: PricingStrategy['strategy']
  ): MarketResearchData {
    const strategies: Record<PricingStrategy['strategy'], PricingStrategy> = {
      competitive: {
        strategy: 'competitive',
        multiplier: 0.95,
        description: 'Price slightly below market average for faster sales'
      },
      premium: {
        strategy: 'premium',
        multiplier: 1.1,
        description: 'Price above market average for higher profit margins'
      },
      quick_sale: {
        strategy: 'quick_sale',
        multiplier: 0.85,
        description: 'Price well below market average for immediate sale'
      }
    };

    const selectedStrategy = strategies[strategy];
    const adjustedPrice = Math.round(research.suggestedPrice * selectedStrategy.multiplier);
    
    console.log('💡 [MARKET-RESEARCH] Applied pricing strategy:', {
      strategy: selectedStrategy.strategy,
      originalPrice: research.suggestedPrice,
      adjustedPrice,
      multiplier: selectedStrategy.multiplier
    });

    return {
      ...research,
      suggestedPrice: adjustedPrice
    };
  }

  /**
   * Generate cache key for market research
   */
  private generateSearchKey(title: string, categoryId: string, condition: string, brand?: string): string {
    const cleanTitle = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(' ')
      .slice(0, 3) // First 3 words
      .join('_');
    
    const key = `${cleanTitle}_${categoryId}_${condition.toLowerCase()}_${brand?.toLowerCase() || 'nobrand'}`;
    return key.substring(0, 100); // Limit length for database
  }

  /**
   * Get cached research data
   */
  private async getCachedResearch(searchKey: string): Promise<MarketResearchData | null> {
    try {
      const { data, error } = await this.supabase
        .from('market_research_cache')
        .select('*')
        .eq('search_key', searchKey)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        averagePrice: data.average_price,
        priceRange: { 
          min: data.price_range_min, 
          max: data.price_range_max 
        },
        soldCount: data.sold_count,
        activeListings: data.active_listings,
        suggestedPrice: data.suggested_price,
        confidence: data.confidence_score,
        dataPoints: data.data_points || []
      };
    } catch (error) {
      console.error('❌ [MARKET-RESEARCH] Error getting cached research:', error);
      return null;
    }
  }

  /**
   * Cache research results
   */
  private async cacheResearch(searchKey: string, research: MarketResearchData): Promise<void> {
    try {
      await this.supabase
        .from('market_research_cache')
        .upsert({
          search_key: searchKey,
          average_price: research.averagePrice,
          price_range_min: research.priceRange.min,
          price_range_max: research.priceRange.max,
          sold_count: research.soldCount,
          active_listings: research.activeListings,
          suggested_price: research.suggestedPrice,
          confidence_score: research.confidence,
          data_points: research.dataPoints,
          last_updated: new Date().toISOString(),
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString() // 6 hours
        });
      
      console.log('✅ [MARKET-RESEARCH] Research cached successfully');
    } catch (error) {
      console.error('❌ [MARKET-RESEARCH] Error caching research:', error);
    }
  }

  /**
   * Get fallback pricing when research fails
   */
  private getFallbackPricing(title: string, condition: string): MarketResearchData {
    // Rule-based fallback pricing
    const basePrices: Record<string, number> = {
      'electronics': 75,
      'clothing': 25,
      'shoes': 35,
      'jewelry': 40,
      'home': 30,
      'toys': 15,
      'books': 10
    };

    const conditionMultipliers: Record<string, number> = {
      'new': 1.0,
      'like_new': 0.85,
      'good': 0.7,
      'fair': 0.5,
      'poor': 0.3
    };

    // Determine category from title
    const titleLower = title.toLowerCase();
    let basePrice = 25; // Default
    
    for (const [category, price] of Object.entries(basePrices)) {
      if (titleLower.includes(category)) {
        basePrice = price;
        break;
      }
    }

    // Apply condition multiplier
    const conditionLower = condition.toLowerCase();
    const multiplier = Object.entries(conditionMultipliers)
      .find(([key]) => conditionLower.includes(key))?.[1] || 0.7;

    const suggestedPrice = Math.round(basePrice * multiplier);
    
    console.log('🔄 [MARKET-RESEARCH] Using fallback pricing:', {
      basePrice,
      multiplier,
      suggestedPrice,
      condition
    });

    return {
      averagePrice: suggestedPrice,
      priceRange: { 
        min: Math.round(suggestedPrice * 0.8), 
        max: Math.round(suggestedPrice * 1.3) 
      },
      soldCount: 0,
      activeListings: 0,
      suggestedPrice,
      confidence: 0.3,
      dataPoints: []
    };
  }

  /**
   * Get market insights for a category
   */
  async getCategoryInsights(categoryId: string): Promise<{
    averagePrice: number;
    totalListings: number;
    competitionLevel: 'low' | 'medium' | 'high';
    recommendedStrategy: PricingStrategy['strategy'];
  }> {
    try {
      console.log('📈 [MARKET-RESEARCH] Getting category insights for:', categoryId);
      
      // This would typically involve more complex analysis
      // For now, return basic insights
      return {
        averagePrice: 35,
        totalListings: 1250,
        competitionLevel: 'medium',
        recommendedStrategy: 'competitive'
      };
    } catch (error) {
      console.error('❌ [MARKET-RESEARCH] Error getting category insights:', error);
      return {
        averagePrice: 25,
        totalListings: 0,
        competitionLevel: 'medium',
        recommendedStrategy: 'competitive'
      };
    }
  }

  /**
   * Get trending keywords for better SEO
   */
  async getTrendingKeywords(categoryId: string, limit: number = 10): Promise<string[]> {
    try {
      console.log('🔥 [MARKET-RESEARCH] Getting trending keywords for category:', categoryId);
      
      // This would analyze recent successful listings to extract trending keywords
      // For now, return category-specific keywords
      const categoryKeywords: Record<string, string[]> = {
        '11450': ['fashion', 'style', 'trendy', 'comfortable', 'quality', 'authentic'],
        '57988': ['warm', 'winter', 'outdoor', 'cozy', 'stylish', 'durable'],
        '93427': ['comfortable', 'walking', 'athletic', 'casual', 'durable', 'stylish']
      };
      
      const keywords = categoryKeywords[categoryId] || ['quality', 'authentic', 'excellent', 'fast shipping'];
      
      console.log('✅ [MARKET-RESEARCH] Trending keywords:', keywords);
      return keywords.slice(0, limit);
    } catch (error) {
      console.error('❌ [MARKET-RESEARCH] Error getting trending keywords:', error);
      return ['quality', 'authentic', 'excellent condition'];
    }
  }

  /**
   * Validate pricing against eBay policies
   */
  validatePricing(price: number, categoryId: string): {
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;

    // Basic validation rules
    if (price < 0.99) {
      isValid = false;
      warnings.push('Price must be at least $0.99 for eBay listings');
    }

    if (price > 99999) {
      isValid = false;
      warnings.push('Price exceeds eBay maximum of $99,999');
    }

    // Category-specific suggestions
    if (categoryId === '11450' && price > 200) {
      suggestions.push('High-priced clothing items may benefit from detailed measurements and brand authentication');
    }

    if (price < 10) {
      suggestions.push('Consider bundling low-priced items to increase value and reduce shipping costs');
    }

    return { isValid, warnings, suggestions };
  }
}

export default EbayMarketResearch;
export type { MarketResearchData, CompletedListing, PricingStrategy };