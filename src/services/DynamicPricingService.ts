import { getSupabase } from '../lib/supabase';
import EbayApiService from './ebayApi';
import { withTimeout, withRetry } from '../utils/promiseUtils';

export interface MarketPrice {
  id?: string;
  search_query: string;
  brand?: string;
  category?: string;
  condition?: string;
  size?: string;
  color?: string;
  title: string;
  sold_price: number;
  sold_date: string;
  shipping_cost?: number;
  platform: string;
  external_listing_id?: string;
  listing_url?: string;
  view_count?: number;
  bid_count?: number;
  watch_count?: number;
  days_to_sell?: number;
}

export interface PricingRecommendation {
  id?: string;
  item_id: string;
  user_id: string;
  recommended_price: number;
  confidence_score: number;
  price_range_min: number;
  price_range_max: number;
  market_data_points: number;
  average_sold_price?: number;
  median_sold_price?: number;
  days_on_market_avg?: number;
  seasonality_factor?: number;
  demand_trend?: 'increasing' | 'stable' | 'decreasing';
  insights?: string[];
}

export interface PricingInsights {
  recommendation: PricingRecommendation;
  marketData: MarketPrice[];
  competitiveAnalysis: {
    similarListingsCount: number;
    avgCompetitorPrice: number;
    pricePosition: 'below' | 'competitive' | 'above';
  };
  seasonalityFactor: number;
  demandTrend: 'increasing' | 'stable' | 'decreasing';
  bestTimeToList?: {
    dayOfWeek: string;
    timeOfDay: string;
  };
}

class DynamicPricingService {
  private ebayService: EbayApiService;

  constructor() {
    this.ebayService = new EbayApiService();
  }

  /**
   * Generate pricing recommendations for an item
   */
  async generatePricingRecommendation(
    itemId: string,
    userId: string,
    itemData: {
      title: string;
      brand?: string;
      category?: string;
      condition?: string;
      size?: string;
      color?: string;
    }
  ): Promise<PricingInsights> {
    try {
      console.log('🎯 [PRICING] Generating pricing recommendation for item:', itemId);

      // Call our Netlify function instead of doing all the work client-side
      const response = await withTimeout(
        fetch('/.netlify/functions/pricing-agent/recommend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            itemId,
            userId,
            itemData
          })
        }),
        30000,
        'Pricing recommendation request timed out'
      );

      if (!response.ok) {
        throw new Error(`Pricing agent failed with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate pricing recommendation');
      }

      // Transform the response into our expected format
      const insights: PricingInsights = {
        recommendation: {
          ...result.recommendation,
          item_id: itemId,
          user_id: userId
        },
        marketData: result.marketData || [],
        competitiveAnalysis: result.competitiveAnalysis,
        seasonalityFactor: result.recommendation.seasonality_factor || 1.0,
        demandTrend: result.recommendation.demand_trend || 'stable',
        bestTimeToList: result.bestTimeToList
      };

      // Save recommendation to database
      await this.saveRecommendation(insights.recommendation);

      // Save market data if we have any
      if (insights.marketData.length > 0) {
        await this.saveMarketData(insights.marketData);
      }

      console.log('✅ [PRICING] Pricing recommendation generated successfully');
      return insights;

    } catch (error) {
      console.error('❌ [PRICING] Error generating pricing recommendation:', error);
      throw error;
    }
  }

  /**
   * Scrape market data from eBay sold listings
   */
  private async scrapeMarketData(itemData: {
    title: string;
    brand?: string;
    category?: string;
    condition?: string;
    size?: string;
    color?: string;
  }): Promise<MarketPrice[]> {
    try {
      console.log('🔍 [PRICING] Scraping market data for:', itemData.title);

      // Build search queries with different specificity levels
      const searchQueries = this.buildSearchQueries(itemData);
      const allMarketData: MarketPrice[] = [];

      for (const query of searchQueries) {
        try {
          console.log('🔍 [PRICING] Searching sold listings for:', query);
          
          const soldListings = await withRetry(
            () => withTimeout(
              this.ebayService.searchCompletedItems(query, itemData.category),
              30000,
              'eBay sold listings search timed out'
            ),
            2,
            1000
          );

          // Convert eBay listings to MarketPrice format
          const marketPrices = soldListings.map(listing => ({
            search_query: query,
            brand: itemData.brand,
            category: itemData.category,
            condition: listing.condition || itemData.condition,
            size: itemData.size,
            color: itemData.color,
            title: listing.title,
            sold_price: listing.price,
            sold_date: listing.endTime,
            shipping_cost: 0, // eBay API doesn't always provide this
            platform: 'ebay',
            view_count: listing.watchCount || 0,
            bid_count: listing.bidCount || 0,
            watch_count: listing.watchCount || 0,
            days_to_sell: this.calculateDaysToSell(listing.endTime)
          }));

          allMarketData.push(...marketPrices);
          console.log(`📊 [PRICING] Found ${marketPrices.length} sold listings for "${query}"`);

        } catch (error) {
          console.warn(`⚠️ [PRICING] Failed to search for "${query}":`, error.message);
          continue;
        }
      }

      // Remove duplicates and sort by relevance
      const uniqueMarketData = this.deduplicateMarketData(allMarketData);
      const sortedData = this.sortByRelevance(uniqueMarketData, itemData);

      console.log(`✅ [PRICING] Market data collection complete: ${sortedData.length} unique listings`);
      return sortedData.slice(0, 50); // Limit to most relevant 50 listings

    } catch (error) {
      console.error('❌ [PRICING] Error scraping market data:', error);
      
      // Return empty array instead of throwing to allow graceful degradation
      return [];
    }
  }

  /**
   * Build search queries with different specificity levels
   */
  private buildSearchQueries(itemData: {
    title: string;
    brand?: string;
    category?: string;
    condition?: string;
    size?: string;
    color?: string;
  }): string[] {
    const queries: string[] = [];

    // Most specific: brand + key terms + size
    if (itemData.brand && itemData.size) {
      const keyTerms = this.extractKeyTerms(itemData.title);
      queries.push(`${itemData.brand} ${keyTerms} ${itemData.size}`);
    }

    // Medium specific: brand + key terms
    if (itemData.brand) {
      const keyTerms = this.extractKeyTerms(itemData.title);
      queries.push(`${itemData.brand} ${keyTerms}`);
    }

    // Less specific: key terms + category
    const keyTerms = this.extractKeyTerms(itemData.title);
    if (itemData.category) {
      queries.push(`${keyTerms} ${itemData.category}`);
    }

    // Fallback: just key terms
    queries.push(keyTerms);

    return queries.filter(q => q.trim().length > 0);
  }

  /**
   * Extract key terms from item title
   */
  private extractKeyTerms(title: string): string {
    // Remove common stop words and extract meaningful terms
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 4); // Take top 4 most relevant words

    return words.join(' ');
  }

  /**
   * Analyze pricing patterns from market data
   */
  private analyzePricingPatterns(marketData: MarketPrice[]): {
    averagePrice: number;
    medianPrice: number;
    priceRange: { min: number; max: number };
    averageDaysToSell: number;
    totalDataPoints: number;
  } {
    if (marketData.length === 0) {
      return {
        averagePrice: 0,
        medianPrice: 0,
        priceRange: { min: 0, max: 0 },
        averageDaysToSell: 0,
        totalDataPoints: 0
      };
    }

    const prices = marketData.map(item => item.sold_price).sort((a, b) => a - b);
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const medianPrice = prices[Math.floor(prices.length / 2)];
    const daysToSell = marketData.filter(item => item.days_to_sell).map(item => item.days_to_sell!);
    const averageDaysToSell = daysToSell.length > 0 
      ? daysToSell.reduce((sum, days) => sum + days, 0) / daysToSell.length 
      : 7;

    // Filter out outliers (bottom 10% and top 10%)
    const q10 = Math.floor(prices.length * 0.1);
    const q90 = Math.floor(prices.length * 0.9);
    const filteredPrices = prices.slice(q10, q90);

    return {
      averagePrice,
      medianPrice,
      priceRange: {
        min: Math.min(...filteredPrices),
        max: Math.max(...filteredPrices)
      },
      averageDaysToSell,
      totalDataPoints: marketData.length
    };
  }

  /**
   * Calculate seasonality factor based on historical data
   */
  private async calculateSeasonalityFactor(category: string): Promise<number> {
    try {
      const currentMonth = new Date().getMonth() + 1;
      
      // Seasonal multipliers by category and month
      const seasonalFactors: { [key: string]: { [month: number]: number } } = {
        'clothing': {
          1: 0.8,  // January - post-holiday low
          2: 0.85, // February
          3: 1.0,  // March - spring fashion
          4: 1.1,  // April
          5: 1.0,  // May
          6: 0.9,  // June - summer clearance
          7: 0.8,  // July
          8: 1.0,  // August - back to school
          9: 1.2,  // September - fall fashion
          10: 1.1, // October
          11: 1.3, // November - holiday shopping
          12: 1.0  // December
        },
        'shoes': {
          1: 0.9, 2: 0.9, 3: 1.1, 4: 1.2, 5: 1.0, 6: 0.9,
          7: 0.8, 8: 1.1, 9: 1.3, 10: 1.1, 11: 1.2, 12: 1.0
        },
        'default': {
          1: 0.9, 2: 0.95, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0,
          7: 0.95, 8: 1.0, 9: 1.05, 10: 1.1, 11: 1.2, 12: 1.0
        }
      };

      const categoryKey = category.toLowerCase() in seasonalFactors ? category.toLowerCase() : 'default';
      return seasonalFactors[categoryKey][currentMonth] || 1.0;

    } catch (error) {
      console.warn('⚠️ [PRICING] Error calculating seasonality factor:', error);
      return 1.0;
    }
  }

  /**
   * Calculate demand trend from recent market data
   */
  private calculateDemandTrend(marketData: MarketPrice[]): 'increasing' | 'stable' | 'decreasing' {
    if (marketData.length < 10) return 'stable';

    // Sort by sold date
    const sortedData = marketData.sort((a, b) => 
      new Date(a.sold_date).getTime() - new Date(b.sold_date).getTime()
    );

    // Compare recent vs older prices
    const recentHalf = sortedData.slice(-Math.floor(sortedData.length / 2));
    const olderHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));

    const recentAvg = recentHalf.reduce((sum, item) => sum + item.sold_price, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((sum, item) => sum + item.sold_price, 0) / olderHalf.length;

    const priceChange = (recentAvg - olderAvg) / olderAvg;

    if (priceChange > 0.1) return 'increasing';
    if (priceChange < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate recommended price based on analysis
   */
  private calculateRecommendedPrice(
    itemData: any,
    pricingAnalysis: any,
    seasonalityFactor: number,
    demandTrend: 'increasing' | 'stable' | 'decreasing'
  ): Omit<PricingRecommendation, 'item_id' | 'user_id'> {
    const basePrice = pricingAnalysis.medianPrice || pricingAnalysis.averagePrice;
    
    // Adjust for demand trend
    let demandMultiplier = 1.0;
    if (demandTrend === 'increasing') demandMultiplier = 1.05;
    if (demandTrend === 'decreasing') demandMultiplier = 0.95;

    // Calculate recommended price
    const recommendedPrice = Math.round(basePrice * seasonalityFactor * demandMultiplier * 100) / 100;
    
    // Calculate confidence based on data quality
    const confidenceScore = Math.min(
      0.95, 
      0.3 + (pricingAnalysis.totalDataPoints * 0.02) // More data = higher confidence
    );

    // Calculate price range (±15%)
    const rangeMultiplier = 0.15;
    const priceRangeMin = Math.round(recommendedPrice * (1 - rangeMultiplier) * 100) / 100;
    const priceRangeMax = Math.round(recommendedPrice * (1 + rangeMultiplier) * 100) / 100;

    return {
      recommended_price: recommendedPrice,
      confidence_score: confidenceScore,
      price_range_min: priceRangeMin,
      price_range_max: priceRangeMax,
      market_data_points: pricingAnalysis.totalDataPoints,
      average_sold_price: pricingAnalysis.averagePrice,
      median_sold_price: pricingAnalysis.medianPrice,
      days_on_market_avg: Math.round(pricingAnalysis.averageDaysToSell)
    };
  }

  /**
   * Analyze competition for similar items
   */
  private async analyzeCompetition(itemData: any): Promise<{
    similarListingsCount: number;
    avgCompetitorPrice: number;
    pricePosition: 'below' | 'competitive' | 'above';
  }> {
    try {
      // This would typically search current active listings, not sold ones
      // For now, return mock data
      return {
        similarListingsCount: 15,
        avgCompetitorPrice: 45.99,
        pricePosition: 'competitive'
      };
    } catch (error) {
      console.warn('⚠️ [PRICING] Error analyzing competition:', error);
      return {
        similarListingsCount: 0,
        avgCompetitorPrice: 0,
        pricePosition: 'competitive'
      };
    }
  }

  /**
   * Calculate best time to list based on sold data patterns
   */
  private calculateBestListingTime(marketData: MarketPrice[]): {
    dayOfWeek: string;
    timeOfDay: string;
  } | undefined {
    if (marketData.length < 5) return undefined;

    // Analyze sold dates to find patterns
    const dayPattern: { [key: string]: number } = {};
    const timePattern: { [key: string]: number } = {};

    marketData.forEach(item => {
      const soldDate = new Date(item.sold_date);
      const dayOfWeek = soldDate.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = soldDate.getHours();
      
      dayPattern[dayOfWeek] = (dayPattern[dayOfWeek] || 0) + 1;
      
      let timeOfDay;
      if (hour < 6) timeOfDay = 'early morning';
      else if (hour < 12) timeOfDay = 'morning';
      else if (hour < 17) timeOfDay = 'afternoon';
      else if (hour < 21) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      timePattern[timeOfDay] = (timePattern[timeOfDay] || 0) + 1;
    });

    const bestDay = Object.entries(dayPattern).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Sunday';
    const bestTime = Object.entries(timePattern).sort(([,a], [,b]) => b - a)[0]?.[0] || 'evening';

    return {
      dayOfWeek: bestDay,
      timeOfDay: bestTime
    };
  }

  /**
   * Save pricing recommendation to database
   */
  private async saveRecommendation(recommendation: PricingRecommendation): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      const { error } = await supabase
        .from('pricing_recommendations')
        .upsert(recommendation, {
          onConflict: 'item_id'
        });

      if (error) throw error;

      console.log('✅ [PRICING] Pricing recommendation saved to database');
    } catch (error) {
      console.error('❌ [PRICING] Error saving pricing recommendation:', error);
    }
  }

  /**
   * Save market data to database
   */
  private async saveMarketData(marketData: MarketPrice[]): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      // Insert in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < marketData.length; i += batchSize) {
        const batch = marketData.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('market_prices')
          .insert(batch);

        if (error) {
          console.warn('⚠️ [PRICING] Error saving market data batch:', error);
          continue;
        }
      }

      console.log('✅ [PRICING] Market data saved to database');
    } catch (error) {
      console.error('❌ [PRICING] Error saving market data:', error);
    }
  }

  /**
   * Helper methods
   */
  private calculateDaysToSell(endTime: string): number {
    try {
      // Assume 7-day listing duration as default
      const soldDate = new Date(endTime);
      const listingDate = new Date(soldDate.getTime() - (7 * 24 * 60 * 60 * 1000));
      return Math.floor((soldDate.getTime() - listingDate.getTime()) / (24 * 60 * 60 * 1000));
    } catch {
      return 7; // Default assumption
    }
  }

  private deduplicateMarketData(marketData: MarketPrice[]): MarketPrice[] {
    const seen = new Set<string>();
    return marketData.filter(item => {
      const key = `${item.title}-${item.sold_price}-${item.sold_date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private sortByRelevance(marketData: MarketPrice[], itemData: any): MarketPrice[] {
    return marketData.sort((a, b) => {
      let scoreA = 0, scoreB = 0;

      // Brand match bonus
      if (itemData.brand && a.brand?.toLowerCase() === itemData.brand.toLowerCase()) scoreA += 3;
      if (itemData.brand && b.brand?.toLowerCase() === itemData.brand.toLowerCase()) scoreB += 3;

      // Size match bonus
      if (itemData.size && a.size?.toLowerCase() === itemData.size.toLowerCase()) scoreA += 2;
      if (itemData.size && b.size?.toLowerCase() === itemData.size.toLowerCase()) scoreB += 2;

      // Condition match bonus
      if (itemData.condition && a.condition?.toLowerCase() === itemData.condition.toLowerCase()) scoreA += 1;
      if (itemData.condition && b.condition?.toLowerCase() === itemData.condition.toLowerCase()) scoreB += 1;

      // Recent sale bonus
      const now = Date.now();
      const ageA = now - new Date(a.sold_date).getTime();
      const ageB = now - new Date(b.sold_date).getTime();
      if (ageA < ageB) scoreA += 1;
      if (ageB < ageA) scoreB += 1;

      return scoreB - scoreA;
    });
  }

  /**
   * Get existing pricing recommendation for an item
   */
  async getPricingRecommendation(itemId: string): Promise<PricingRecommendation | null> {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('pricing_recommendations')
        .select('*')
        .eq('item_id', itemId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || null;
    } catch (error) {
      console.error('❌ [PRICING] Error getting pricing recommendation:', error);
      return null;
    }
  }

  /**
   * Update pricing recommendation
   */
  async updatePricingRecommendation(itemId: string, updates: Partial<PricingRecommendation>): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      const { error } = await supabase
        .from('pricing_recommendations')
        .update(updates)
        .eq('item_id', itemId);

      if (error) throw error;

      console.log('✅ [PRICING] Pricing recommendation updated');
    } catch (error) {
      console.error('❌ [PRICING] Error updating pricing recommendation:', error);
      throw error;
    }
  }
}

export default DynamicPricingService;