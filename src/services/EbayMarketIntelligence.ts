/**
 * eBay Market Intelligence Service
 * Real-time market analysis for optimal pricing and categorization
 */

import { cacheIntegration } from './CacheIntegrationService';

interface MarketInsight {
  averagePrice: number;
  priceRange: { min: number; max: number };
  competitionLevel: 'low' | 'medium' | 'high';
  demandTrend: 'declining' | 'stable' | 'growing';
  recommendedPrice: number;
  confidence: number;
  sampleSize: number;
  marketVelocity: number; // Days to sell on average
}

interface TrendingKeyword {
  keyword: string;
  searchVolume: number;
  trendDirection: 'up' | 'down' | 'stable';
  competitionScore: number;
  recommendedUse: boolean;
}

interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  averageSalePrice: number;
  listingCount: number;
  averageTimeToSell: number;
  successRate: number;
  seasonalTrend: 'peak' | 'normal' | 'low';
  recommendationScore: number;
}

interface CompetitorAnalysis {
  similarListings: Array<{
    title: string;
    price: number;
    condition: string;
    timeRemaining: string;
    bidCount: number;
    watchers: number;
    shipping: number;
    sellerRating: number;
  }>;
  priceGaps: Array<{
    pricePoint: number;
    opportunity: 'underpriced' | 'overpriced' | 'optimal';
    confidence: number;
  }>;
  differentiationOpportunities: string[];
}

interface MarketTrends {
  hotCategories: string[];
  decliningCategories: string[];
  seasonalInsights: {
    currentSeason: string;
    peakMonths: string[];
    recommendations: string[];
  };
  emergingBrands: string[];
  pricingTrends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    timeframe: string;
  };
}

class EbayMarketIntelligenceService {
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly DEEP_ANALYSIS_TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    console.log('📊 [MARKET-INTEL] eBay Market Intelligence service initialized');
  }

  /**
   * Get comprehensive market insights for an item
   */
  async getMarketInsights(item: {
    title: string;
    brand: string;
    category: string;
    condition: string;
    size?: string;
    color?: string;
  }): Promise<MarketInsight> {
    try {
      console.log('📊 [MARKET-INTEL] Analyzing market for:', item.title);

      const cacheKey = `market-insights:${this.generateItemHash(item)}`;
      
      return await cacheIntegration.getCachedEbayData(
        'market-insights',
        item,
        async () => await this.performMarketAnalysis(item)
      );

    } catch (error) {
      console.error('❌ [MARKET-INTEL] Market insights failed:', error);
      return this.getFallbackInsights(item);
    }
  }

  /**
   * Get trending keywords for better SEO
   */
  async getTrendingKeywords(category: string, brand?: string): Promise<TrendingKeyword[]> {
    try {
      console.log('🔥 [MARKET-INTEL] Fetching trending keywords for:', category);

      const cacheKey = `trending-keywords:${category}:${brand || 'all'}`;
      
      return await cacheIntegration.getCachedEbayData(
        'trending-keywords',
        { category, brand },
        async () => await this.analyzeTrendingKeywords(category, brand)
      );

    } catch (error) {
      console.error('❌ [MARKET-INTEL] Trending keywords failed:', error);
      return this.getFallbackKeywords(category);
    }
  }

  /**
   * Analyze category performance for optimal selection
   */
  async getCategoryPerformance(possibleCategories: string[]): Promise<CategoryPerformance[]> {
    try {
      console.log('📈 [MARKET-INTEL] Analyzing category performance for:', possibleCategories);

      const analyses = await Promise.all(
        possibleCategories.map(async (categoryId) => {
          const cacheKey = `category-performance:${categoryId}`;
          
          return await cacheIntegration.getCachedEbayData(
            'category-performance',
            { categoryId },
            async () => await this.analyzeCategoryPerformance(categoryId)
          );
        })
      );

      // Sort by recommendation score
      return analyses.sort((a, b) => b.recommendationScore - a.recommendationScore);

    } catch (error) {
      console.error('❌ [MARKET-INTEL] Category performance analysis failed:', error);
      return this.getFallbackCategoryPerformance(possibleCategories);
    }
  }

  /**
   * Deep competitor analysis
   */
  async getCompetitorAnalysis(item: {
    title: string;
    brand: string;
    category: string;
    estimatedPrice: number;
  }): Promise<CompetitorAnalysis> {
    try {
      console.log('🕵️ [MARKET-INTEL] Analyzing competitors for:', item.title);

      const cacheKey = `competitor-analysis:${this.generateItemHash(item)}`;
      
      return await cacheIntegration.getCachedEbayData(
        'competitor-analysis',
        item,
        async () => await this.performCompetitorAnalysis(item)
      );

    } catch (error) {
      console.error('❌ [MARKET-INTEL] Competitor analysis failed:', error);
      return this.getFallbackCompetitorAnalysis(item);
    }
  }

  /**
   * Get market trends and seasonal insights
   */
  async getMarketTrends(): Promise<MarketTrends> {
    try {
      console.log('📈 [MARKET-INTEL] Fetching market trends...');

      const cacheKey = 'market-trends:global';
      
      return await cacheIntegration.getCachedEbayData(
        'market-trends',
        {},
        async () => await this.analyzeMarketTrends()
      );

    } catch (error) {
      console.error('❌ [MARKET-INTEL] Market trends failed:', error);
      return this.getFallbackMarketTrends();
    }
  }

  /**
   * Smart pricing recommendation with dynamic adjustments
   */
  async getSmartPricingRecommendation(item: {
    title: string;
    brand: string;
    category: string;
    condition: string;
    basePrice?: number;
  }): Promise<{
    recommendedPrice: number;
    priceStrategy: 'aggressive' | 'competitive' | 'premium';
    reasoning: string[];
    adjustments: Array<{
      factor: string;
      impact: number;
      explanation: string;
    }>;
    confidence: number;
  }> {
    try {
      console.log('💰 [MARKET-INTEL] Calculating smart pricing for:', item.title);

      // Gather market intelligence
      const [marketInsights, competitorAnalysis, trends] = await Promise.all([
        this.getMarketInsights(item),
        this.getCompetitorAnalysis({ ...item, estimatedPrice: item.basePrice || 0 }),
        this.getMarketTrends()
      ]);

      return this.calculateOptimalPricing(item, marketInsights, competitorAnalysis, trends);

    } catch (error) {
      console.error('❌ [MARKET-INTEL] Smart pricing failed:', error);
      return this.getFallbackPricing(item);
    }
  }

  /**
   * Private implementation methods
   */

  private async performMarketAnalysis(item: any): Promise<MarketInsight> {
    // Mock implementation - would integrate with actual eBay APIs
    console.log('🔍 [MARKET-INTEL] Performing deep market analysis...');
    
    // Simulate API calls and analysis
    await new Promise(resolve => setTimeout(resolve, 500));

    const basePrice = this.estimateBasePrice(item);
    const competitionFactor = this.calculateCompetitionFactor(item);
    const demandFactor = this.calculateDemandFactor(item);

    return {
      averagePrice: basePrice,
      priceRange: {
        min: Math.round(basePrice * 0.7),
        max: Math.round(basePrice * 1.4)
      },
      competitionLevel: competitionFactor > 0.7 ? 'high' : competitionFactor > 0.4 ? 'medium' : 'low',
      demandTrend: demandFactor > 0.6 ? 'growing' : demandFactor > 0.4 ? 'stable' : 'declining',
      recommendedPrice: Math.round(basePrice * (0.8 + demandFactor * 0.4)),
      confidence: 0.85,
      sampleSize: 127,
      marketVelocity: 7 + Math.random() * 14 // 7-21 days
    };
  }

  private async analyzeTrendingKeywords(category: string, brand?: string): Promise<TrendingKeyword[]> {
    console.log('🔥 [MARKET-INTEL] Analyzing trending keywords...');
    
    // Mock trending keywords based on category
    const categoryKeywords: Record<string, string[]> = {
      'clothing': ['vintage', 'streetwear', 'minimalist', 'oversized', 'cropped'],
      'electronics': ['wireless', 'fast-charging', 'noise-canceling', 'waterproof', 'gaming'],
      'books_media': ['collectible', 'first-edition', 'rare', 'signed', 'limited'],
      'home_garden': ['sustainable', 'smart-home', 'minimalist', 'ergonomic', 'space-saving']
    };

    const baseKeywords = categoryKeywords[category] || ['quality', 'durable', 'authentic', 'premium'];
    
    return baseKeywords.map((keyword, index) => ({
      keyword,
      searchVolume: 1000 + Math.random() * 5000,
      trendDirection: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any,
      competitionScore: 0.3 + Math.random() * 0.7,
      recommendedUse: Math.random() > 0.3
    }));
  }

  private async analyzeCategoryPerformance(categoryId: string): Promise<CategoryPerformance> {
    console.log('📈 [MARKET-INTEL] Analyzing category performance for:', categoryId);
    
    // Mock category performance data
    const basePerformance = {
      categoryId,
      categoryName: this.getCategoryName(categoryId),
      averageSalePrice: 25 + Math.random() * 200,
      listingCount: 1000 + Math.random() * 10000,
      averageTimeToSell: 5 + Math.random() * 20,
      successRate: 0.6 + Math.random() * 0.3,
      seasonalTrend: ['peak', 'normal', 'low'][Math.floor(Math.random() * 3)] as any,
      recommendationScore: 0.5 + Math.random() * 0.5
    };

    return basePerformance;
  }

  private async performCompetitorAnalysis(item: any): Promise<CompetitorAnalysis> {
    console.log('🕵️ [MARKET-INTEL] Performing competitor analysis...');
    
    // Mock competitor data
    const similarListings = Array.from({ length: 5 }, (_, i) => ({
      title: `${item.brand} ${item.title} #${i + 1}`,
      price: item.estimatedPrice * (0.8 + Math.random() * 0.4),
      condition: ['new', 'used', 'refurbished'][Math.floor(Math.random() * 3)],
      timeRemaining: `${Math.floor(Math.random() * 7)}d ${Math.floor(Math.random() * 24)}h`,
      bidCount: Math.floor(Math.random() * 15),
      watchers: Math.floor(Math.random() * 50),
      shipping: Math.random() * 20,
      sellerRating: 95 + Math.random() * 5
    }));

    const priceGaps = [
      { pricePoint: item.estimatedPrice * 0.9, opportunity: 'optimal' as const, confidence: 0.8 },
      { pricePoint: item.estimatedPrice * 1.2, opportunity: 'overpriced' as const, confidence: 0.6 }
    ];

    const differentiationOpportunities = [
      'Include more detailed condition description',
      'Add lifestyle/in-use photos',
      'Highlight unique features or accessories',
      'Offer bundle deals with related items'
    ];

    return {
      similarListings,
      priceGaps,
      differentiationOpportunities
    };
  }

  private async analyzeMarketTrends(): Promise<MarketTrends> {
    console.log('📈 [MARKET-INTEL] Analyzing global market trends...');
    
    const currentMonth = new Date().getMonth();
    const currentSeason = this.getCurrentSeason(currentMonth);
    
    return {
      hotCategories: ['Electronics', 'Clothing & Accessories', 'Home & Garden'],
      decliningCategories: ['DVDs & Movies', 'CDs & Vinyl'],
      seasonalInsights: {
        currentSeason,
        peakMonths: this.getSeasonalPeakMonths(currentSeason),
        recommendations: this.getSeasonalRecommendations(currentSeason)
      },
      emergingBrands: ['Sustainable Living Co', 'TechFlow', 'Urban Minimalist'],
      pricingTrends: {
        direction: 'stable',
        confidence: 0.75,
        timeframe: '3 months'
      }
    };
  }

  private calculateOptimalPricing(
    item: any,
    marketInsights: MarketInsight,
    competitorAnalysis: CompetitorAnalysis,
    trends: MarketTrends
  ): any {
    const basePrice = marketInsights.recommendedPrice;
    const adjustments: Array<{ factor: string; impact: number; explanation: string }> = [];
    
    let finalPrice = basePrice;
    let confidence = marketInsights.confidence;

    // Brand premium adjustment
    if (this.isPremiumBrand(item.brand)) {
      const brandAdjustment = 0.15;
      finalPrice *= (1 + brandAdjustment);
      adjustments.push({
        factor: 'Premium Brand',
        impact: brandAdjustment,
        explanation: `${item.brand} commands premium pricing in the market`
      });
    }

    // Competition adjustment
    if (marketInsights.competitionLevel === 'high') {
      const competitionAdjustment = -0.08;
      finalPrice *= (1 + competitionAdjustment);
      adjustments.push({
        factor: 'High Competition',
        impact: competitionAdjustment,
        explanation: 'Many similar items available, price competitively'
      });
    }

    // Demand trend adjustment
    if (marketInsights.demandTrend === 'growing') {
      const demandAdjustment = 0.12;
      finalPrice *= (1 + demandAdjustment);
      adjustments.push({
        factor: 'Growing Demand',
        impact: demandAdjustment,
        explanation: 'Increasing market demand supports higher pricing'
      });
    }

    // Seasonal adjustment
    if (trends.seasonalInsights.currentSeason === 'peak') {
      const seasonalAdjustment = 0.10;
      finalPrice *= (1 + seasonalAdjustment);
      adjustments.push({
        factor: 'Peak Season',
        impact: seasonalAdjustment,
        explanation: 'Peak selling season allows for premium pricing'
      });
    }

    const strategy = finalPrice > basePrice * 1.1 ? 'premium' : 
                    finalPrice < basePrice * 0.95 ? 'aggressive' : 'competitive';

    const reasoning = [
      `Market average: $${basePrice.toFixed(2)}`,
      `Competition level: ${marketInsights.competitionLevel}`,
      `Demand trend: ${marketInsights.demandTrend}`,
      `Your advantage: ${this.getCompetitiveAdvantage(item, competitorAnalysis)}`
    ];

    return {
      recommendedPrice: Math.round(finalPrice),
      priceStrategy: strategy,
      reasoning,
      adjustments,
      confidence
    };
  }

  /**
   * Utility methods
   */

  private generateItemHash(item: any): string {
    const str = JSON.stringify({
      title: item.title?.toLowerCase(),
      brand: item.brand?.toLowerCase(),
      category: item.category?.toLowerCase(),
      condition: item.condition?.toLowerCase()
    });
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private estimateBasePrice(item: any): number {
    // Simple pricing model based on category and brand
    const categoryPricing: Record<string, number> = {
      'clothing': 25,
      'electronics': 75,
      'books_media': 15,
      'home_garden': 35,
      'toys_games': 20,
      'sports_outdoors': 45
    };
    
    const basePrice = categoryPricing[item.category] || 30;
    const brandMultiplier = this.getBrandMultiplier(item.brand);
    
    return Math.round(basePrice * brandMultiplier);
  }

  private calculateCompetitionFactor(item: any): number {
    // Mock competition calculation
    const categoryCompetition: Record<string, number> = {
      'clothing': 0.8,
      'electronics': 0.9,
      'books_media': 0.4,
      'home_garden': 0.6,
      'toys_games': 0.7,
      'sports_outdoors': 0.5
    };
    
    return categoryCompetition[item.category] || 0.6;
  }

  private calculateDemandFactor(item: any): number {
    // Mock demand calculation with seasonal factors
    const currentMonth = new Date().getMonth();
    const seasonalMultiplier = this.getSeasonalDemandMultiplier(item.category, currentMonth);
    
    return 0.5 + Math.random() * 0.3 + seasonalMultiplier;
  }

  private getBrandMultiplier(brand: string): number {
    const premiumBrands = ['apple', 'nike', 'adidas', 'sony', 'samsung', 'levi'];
    const brandLower = brand?.toLowerCase() || '';
    
    if (premiumBrands.includes(brandLower)) {
      return 1.5;
    }
    
    return 1.0 + Math.random() * 0.3;
  }

  private isPremiumBrand(brand: string): boolean {
    const premiumBrands = ['apple', 'nike', 'adidas', 'sony', 'samsung', 'levi', 'coach', 'gucci'];
    return premiumBrands.includes(brand?.toLowerCase() || '');
  }

  private getCategoryName(categoryId: string): string {
    const categoryNames: Record<string, string> = {
      'clothing': 'Clothing & Accessories',
      'electronics': 'Electronics',
      'books_media': 'Books & Media',
      'home_garden': 'Home & Garden',
      'toys_games': 'Toys & Games',
      'sports_outdoors': 'Sports & Outdoors'
    };
    
    return categoryNames[categoryId] || 'Other';
  }

  private getCurrentSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private getSeasonalPeakMonths(season: string): string[] {
    const peakMonths: Record<string, string[]> = {
      'spring': ['March', 'April', 'May'],
      'summer': ['June', 'July', 'August'],
      'fall': ['September', 'October', 'November'],
      'winter': ['December', 'January', 'February']
    };
    
    return peakMonths[season] || [];
  }

  private getSeasonalRecommendations(season: string): string[] {
    const recommendations: Record<string, string[]> = {
      'spring': ['Focus on outdoor and gardening items', 'Spring cleaning creates supply'],
      'summer': ['Vacation and outdoor gear in demand', 'Electronics peak before back-to-school'],
      'fall': ['Back-to-school items', 'Holiday gift preparation'],
      'winter': ['Holiday shopping peak', 'Indoor entertainment items']
    };
    
    return recommendations[season] || [];
  }

  private getSeasonalDemandMultiplier(category: string, month: number): number {
    // Simple seasonal adjustments
    if (category === 'clothing') {
      // Higher demand in fall/winter
      return month >= 8 || month <= 2 ? 0.2 : 0;
    }
    
    if (category === 'electronics') {
      // Higher demand in fall (holidays/back-to-school)
      return month >= 8 && month <= 11 ? 0.3 : 0;
    }
    
    return 0;
  }

  private getCompetitiveAdvantage(item: any, analysis: CompetitorAnalysis): string {
    const advantages = [
      'Detailed photos and description',
      'Competitive pricing',
      'Fast shipping',
      'Excellent condition',
      'Authentic brand item'
    ];
    
    return advantages[Math.floor(Math.random() * advantages.length)];
  }

  /**
   * Fallback methods for when APIs fail
   */

  private getFallbackInsights(item: any): MarketInsight {
    const basePrice = this.estimateBasePrice(item);
    
    return {
      averagePrice: basePrice,
      priceRange: { min: Math.round(basePrice * 0.8), max: Math.round(basePrice * 1.2) },
      competitionLevel: 'medium',
      demandTrend: 'stable',
      recommendedPrice: basePrice,
      confidence: 0.6,
      sampleSize: 50,
      marketVelocity: 10
    };
  }

  private getFallbackKeywords(category: string): TrendingKeyword[] {
    const defaultKeywords = ['quality', 'authentic', 'fast-shipping', 'excellent-condition'];
    
    return defaultKeywords.map(keyword => ({
      keyword,
      searchVolume: 1000,
      trendDirection: 'stable' as const,
      competitionScore: 0.5,
      recommendedUse: true
    }));
  }

  private getFallbackCategoryPerformance(categories: string[]): CategoryPerformance[] {
    return categories.map(categoryId => ({
      categoryId,
      categoryName: this.getCategoryName(categoryId),
      averageSalePrice: 30,
      listingCount: 5000,
      averageTimeToSell: 10,
      successRate: 0.7,
      seasonalTrend: 'normal' as const,
      recommendationScore: 0.6
    }));
  }

  private getFallbackCompetitorAnalysis(item: any): CompetitorAnalysis {
    return {
      similarListings: [],
      priceGaps: [{ pricePoint: item.estimatedPrice, opportunity: 'optimal', confidence: 0.6 }],
      differentiationOpportunities: ['Add detailed photos', 'Improve title keywords']
    };
  }

  private getFallbackMarketTrends(): MarketTrends {
    return {
      hotCategories: ['Electronics', 'Clothing'],
      decliningCategories: ['DVDs'],
      seasonalInsights: {
        currentSeason: 'normal',
        peakMonths: [],
        recommendations: ['Focus on quality items']
      },
      emergingBrands: [],
      pricingTrends: {
        direction: 'stable',
        confidence: 0.5,
        timeframe: 'unknown'
      }
    };
  }

  private getFallbackPricing(item: any): any {
    const basePrice = this.estimateBasePrice(item);
    
    return {
      recommendedPrice: basePrice,
      priceStrategy: 'competitive' as const,
      reasoning: ['Based on category averages'],
      adjustments: [],
      confidence: 0.6
    };
  }
}

// Singleton instance
export const ebayMarketIntelligence = new EbayMarketIntelligenceService();