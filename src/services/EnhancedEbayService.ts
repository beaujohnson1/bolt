import EbayApiService from './ebayApi';
import { EbayMarketResearch } from './EbayMarketResearch';
import { getSupabase } from '../lib/supabase';

interface CategorySpecific {
  name: string;
  importance: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN';
  allowedValues?: string[];
  maxValues: number;
  helpText?: string;
}

interface CategoryData {
  categoryId: string;
  categoryName: string;
  specifics: CategorySpecific[];
  suggestedCategories?: CategorySuggestion[];
}

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  confidence: number;
}

interface MarketPriceData {
  averagePrice: number;
  priceRange: { min: number; max: number };
  competitorCount: number;
  recentSales: Array<{
    price: number;
    condition: string;
    soldDate: string;
    daysToSell: number;
  }>;
  suggestedPrices: {
    quickSale: number;
    market: number;
    premium: number;
  };
}

export class EnhancedEbayService {
  private ebayApi: EbayApiService;
  private marketResearch: EbayMarketResearch;
  private cache: Map<string, any> = new Map();

  constructor() {
    this.ebayApi = new EbayApiService();
    const supabase = getSupabase();
    if (supabase) {
      this.marketResearch = new EbayMarketResearch(this.ebayApi, supabase);
    }
  }

  /**
   * Get comprehensive category data including specifics and suggestions
   */
  async getCategoryData(
    itemTitle: string,
    brand?: string,
    itemType?: string
  ): Promise<CategoryData> {
    try {
      console.log('📂 [ENHANCED-EBAY] Getting category data for:', { itemTitle, brand, itemType });
      
      const cacheKey = `category_${itemTitle}_${brand || 'nobrand'}_${itemType || 'notype'}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        console.log('✅ [ENHANCED-EBAY] Using cached category data');
        return this.cache.get(cacheKey);
      }

      // Step 1: Suggest categories based on the item
      const categorySuggestions = await this.ebayApi.suggestCategory(itemTitle, '', brand);
      console.log('📋 [ENHANCED-EBAY] Category suggestions:', categorySuggestions.length);

      // Step 2: Use the best suggestion or fallback to clothing
      const bestCategory = categorySuggestions[0] || {
        categoryId: '11450', // Clothing fallback
        categoryName: 'Clothing',
        categoryPath: 'Clothing, Shoes & Accessories > Clothing',
        isLeafCategory: true,
        categoryLevel: 2,
        score: 0.5
      };

      // Step 3: Get item specifics for the category
      const categorySpecifics = await this.getCategorySpecifics(bestCategory.categoryId);

      const categoryData: CategoryData = {
        categoryId: bestCategory.categoryId,
        categoryName: bestCategory.categoryName,
        specifics: categorySpecifics,
        suggestedCategories: categorySuggestions.map(cat => ({
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          categoryPath: cat.categoryPath || cat.categoryName,
          confidence: cat.score / 10 // Convert to 0-1 scale
        }))
      };

      // Cache the result
      this.cache.set(cacheKey, categoryData);
      
      console.log('✅ [ENHANCED-EBAY] Category data compiled:', {
        category: categoryData.categoryName,
        specificsCount: categoryData.specifics.length,
        suggestionsCount: categoryData.suggestedCategories?.length || 0
      });

      return categoryData;
    } catch (error) {
      console.error('❌ [ENHANCED-EBAY] Error getting category data:', error);
      
      // Return fallback data
      return {
        categoryId: '11450',
        categoryName: 'Clothing',
        specifics: this.getFallbackSpecifics(),
        suggestedCategories: []
      };
    }
  }

  /**
   * Get item specifics for a category with enhanced data
   */
  private async getCategorySpecifics(categoryId: string): Promise<CategorySpecific[]> {
    try {
      console.log('📋 [ENHANCED-EBAY] Getting specifics for category:', categoryId);
      
      // Try the modern Sell Metadata API first
      const aspects = await this.ebayApi.getItemAspectsForCategory(categoryId);
      
      if (aspects && aspects.length > 0) {
        console.log('✅ [ENHANCED-EBAY] Got aspects from Sell Metadata API:', aspects.length);
        
        return aspects.map(aspect => ({
          name: aspect.name,
          importance: aspect.importance,
          dataType: this.normalizeDataType(aspect.aspectDataType),
          allowedValues: aspect.allowedValues.length > 0 ? aspect.allowedValues : undefined,
          maxValues: aspect.maxValues,
          helpText: this.getHelpTextForAspect(aspect.name)
        }));
      }

      // Fallback to Trading API
      console.log('🔄 [ENHANCED-EBAY] Falling back to Trading API for specifics...');
      const tradingSpecifics = await this.ebayApi.getCategorySpecifics(categoryId);
      
      if (tradingSpecifics && tradingSpecifics.length > 0) {
        console.log('✅ [ENHANCED-EBAY] Got specifics from Trading API:', tradingSpecifics.length);
        
        return tradingSpecifics.map(specific => ({
          name: specific.name,
          importance: specific.required ? 'REQUIRED' : 'RECOMMENDED',
          dataType: 'STRING',
          allowedValues: specific.values && specific.values.length > 0 ? specific.values : undefined,
          maxValues: specific.maxValues || 1,
          helpText: this.getHelpTextForAspect(specific.name)
        }));
      }

      // If both APIs fail, return enhanced fallback based on category
      console.log('⚠️ [ENHANCED-EBAY] No API specifics found, using enhanced fallback');
      return this.getEnhancedFallbackSpecifics(categoryId);
      
    } catch (error) {
      console.error('❌ [ENHANCED-EBAY] Error getting category specifics:', error);
      return this.getFallbackSpecifics();
    }
  }

  /**
   * Get market pricing data for an item
   */
  async getMarketPricing(
    title: string,
    categoryId: string,
    condition: string = 'Used',
    brand?: string
  ): Promise<MarketPriceData> {
    try {
      console.log('💰 [ENHANCED-EBAY] Getting market pricing for:', { title, categoryId, condition, brand });
      
      if (!this.marketResearch) {
        throw new Error('Market research service not available');
      }

      // Get comprehensive market research
      const research = await this.marketResearch.getPriceSuggestion(title, categoryId, condition, brand);
      
      // Get additional competitor analysis
      const competitorData = await this.analyzeCompetition(title, categoryId, brand);
      
      return {
        averagePrice: research.averagePrice,
        priceRange: research.priceRange,
        competitorCount: competitorData.totalCompetitors,
        recentSales: research.dataPoints.slice(0, 10).map(item => ({
          price: item.price,
          condition: item.condition,
          soldDate: item.endTime,
          daysToSell: this.calculateDaysToSell(item.endTime)
        })),
        suggestedPrices: {
          quickSale: Math.round(research.suggestedPrice * 0.85),
          market: research.suggestedPrice,
          premium: Math.round(research.suggestedPrice * 1.15)
        }
      };
    } catch (error) {
      console.error('❌ [ENHANCED-EBAY] Error getting market pricing:', error);
      
      // Return fallback pricing
      return {
        averagePrice: 25,
        priceRange: { min: 20, max: 35 },
        competitorCount: 0,
        recentSales: [],
        suggestedPrices: {
          quickSale: 22,
          market: 25,
          premium: 30
        }
      };
    }
  }

  /**
   * Analyze competition for better pricing insights
   */
  private async analyzeCompetition(title: string, categoryId: string, brand?: string): Promise<{
    totalCompetitors: number;
    averageCompetitorPrice: number;
    priceDistribution: { low: number; medium: number; high: number };
  }> {
    try {
      // Use eBay Finding API to get current active listings
      const trendingItems = await this.ebayApi.getTrendingItems(categoryId);
      
      const relevantItems = trendingItems.filter(item => {
        const titleLower = title.toLowerCase();
        const itemTitleLower = item.title.toLowerCase();
        
        // Check for common words or brand match
        const titleWords = titleLower.split(' ').filter(word => word.length > 3);
        const hasCommonWords = titleWords.some(word => itemTitleLower.includes(word));
        const hasBrandMatch = brand && itemTitleLower.includes(brand.toLowerCase());
        
        return hasCommonWords || hasBrandMatch;
      });

      const prices = relevantItems.map(item => item.price);
      const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
      
      // Calculate price distribution
      const sortedPrices = prices.sort((a, b) => a - b);
      const lowThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.33)] || 0;
      const highThreshold = sortedPrices[Math.floor(sortedPrices.length * 0.67)] || 0;
      
      const priceDistribution = {
        low: prices.filter(p => p <= lowThreshold).length,
        medium: prices.filter(p => p > lowThreshold && p <= highThreshold).length,
        high: prices.filter(p => p > highThreshold).length
      };

      return {
        totalCompetitors: relevantItems.length,
        averageCompetitorPrice: Math.round(averagePrice),
        priceDistribution
      };
    } catch (error) {
      console.error('❌ [ENHANCED-EBAY] Error analyzing competition:', error);
      return {
        totalCompetitors: 0,
        averageCompetitorPrice: 0,
        priceDistribution: { low: 0, medium: 0, high: 0 }
      };
    }
  }

  /**
   * Get enhanced fallback specifics based on category
   */
  private getEnhancedFallbackSpecifics(categoryId: string): CategorySpecific[] {
    const clothingSpecifics: CategorySpecific[] = [
      {
        name: 'Brand',
        importance: 'REQUIRED',
        dataType: 'STRING',
        maxValues: 1,
        helpText: 'The manufacturer or designer of the item'
      },
      {
        name: 'Size',
        importance: 'REQUIRED',
        dataType: 'STRING',
        allowedValues: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL'],
        maxValues: 1,
        helpText: 'The size of the clothing item'
      },
      {
        name: 'Color',
        importance: 'REQUIRED',
        dataType: 'STRING',
        allowedValues: ['Black', 'White', 'Gray', 'Blue', 'Red', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Beige', 'Navy', 'Maroon', 'Olive', 'Teal', 'Multi-Color'],
        maxValues: 2,
        helpText: 'The primary color(s) of the item'
      },
      {
        name: 'Department',
        importance: 'RECOMMENDED',
        dataType: 'STRING',
        allowedValues: ['Men', 'Women', 'Unisex Adult', 'Girls', 'Boys', 'Baby & Toddler'],
        maxValues: 1,
        helpText: 'The intended gender/age group for this item'
      },
      {
        name: 'Material',
        importance: 'RECOMMENDED',
        dataType: 'STRING',
        allowedValues: ['Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Denim', 'Leather', 'Nylon', 'Spandex', 'Rayon', 'Blend'],
        maxValues: 3,
        helpText: 'The primary materials the item is made from'
      },
      {
        name: 'Style',
        importance: 'RECOMMENDED',
        dataType: 'STRING',
        allowedValues: ['Casual', 'Formal', 'Business', 'Athletic', 'Vintage', 'Bohemian', 'Gothic', 'Punk', 'Classic'],
        maxValues: 2,
        helpText: 'The style or aesthetic of the item'
      },
      {
        name: 'Season',
        importance: 'OPTIONAL',
        dataType: 'STRING',
        allowedValues: ['Spring', 'Summer', 'Fall', 'Winter', 'All Seasons'],
        maxValues: 2,
        helpText: 'The season(s) this item is suitable for'
      },
      {
        name: 'Occasion',
        importance: 'OPTIONAL',
        dataType: 'STRING',
        allowedValues: ['Casual', 'Work', 'Party', 'Wedding', 'Sports', 'Travel', 'Everyday', 'Special Occasion'],
        maxValues: 3,
        helpText: 'The occasions this item is suitable for'
      },
      {
        name: 'Pattern',
        importance: 'OPTIONAL',
        dataType: 'STRING',
        allowedValues: ['Solid', 'Striped', 'Floral', 'Geometric', 'Abstract', 'Animal Print', 'Plaid', 'Polka Dot'],
        maxValues: 1,
        helpText: 'The pattern on the item'
      },
      {
        name: 'Features',
        importance: 'OPTIONAL',
        dataType: 'STRING',
        allowedValues: ['Pockets', 'Hood', 'Drawstring', 'Elastic Waist', 'Belt Loops', 'Buttons', 'Zipper', 'Lined', 'Waterproof', 'Breathable'],
        maxValues: 5,
        helpText: 'Special features of the item'
      }
    ];

    // Return category-specific specifics or default to clothing
    switch (categoryId) {
      case '11450': // Clothing
      case '57988': // Coats & Jackets  
      case '11483': // Jeans
        return clothingSpecifics;
      
      case '93427': // Shoes
        return [
          ...clothingSpecifics.filter(s => ['Brand', 'Size', 'Color', 'Department', 'Material', 'Style'].includes(s.name)),
          {
            name: 'Shoe Size',
            importance: 'REQUIRED',
            dataType: 'STRING',
            allowedValues: ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '13.5', '14', '15'],
            maxValues: 1,
            helpText: 'The numerical shoe size'
          },
          {
            name: 'Width',
            importance: 'RECOMMENDED',
            dataType: 'STRING',
            allowedValues: ['Narrow', 'Medium', 'Wide', 'Extra Wide'],
            maxValues: 1,
            helpText: 'The width fitting of the shoe'
          }
        ];
        
      default:
        return clothingSpecifics;
    }
  }

  /**
   * Basic fallback specifics
   */
  private getFallbackSpecifics(): CategorySpecific[] {
    return [
      {
        name: 'Brand',
        importance: 'REQUIRED',
        dataType: 'STRING',
        maxValues: 1,
        helpText: 'The manufacturer or brand of the item'
      },
      {
        name: 'Condition',
        importance: 'REQUIRED',
        dataType: 'STRING',
        allowedValues: ['New with tags', 'New without tags', 'New with defects', 'Excellent', 'Good', 'Fair', 'Poor'],
        maxValues: 1,
        helpText: 'The condition of the item'
      },
      {
        name: 'Color',
        importance: 'RECOMMENDED',
        dataType: 'STRING',
        maxValues: 2,
        helpText: 'The primary color(s) of the item'
      },
      {
        name: 'Size',
        importance: 'RECOMMENDED',
        dataType: 'STRING',
        maxValues: 1,
        helpText: 'The size of the item'
      }
    ];
  }

  /**
   * Normalize data type from eBay API response
   */
  private normalizeDataType(apiDataType: string): 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' {
    switch (apiDataType?.toUpperCase()) {
      case 'NUMERIC':
      case 'NUMBER':
        return 'NUMBER';
      case 'DATE':
        return 'DATE';
      case 'BOOLEAN':
        return 'BOOLEAN';
      default:
        return 'STRING';
    }
  }

  /**
   * Get helpful text for common aspects
   */
  private getHelpTextForAspect(aspectName: string): string | undefined {
    const helpTexts: Record<string, string> = {
      'Brand': 'The manufacturer or designer of the item',
      'Size': 'The size of the item (e.g., S, M, L, XL)',
      'Color': 'The primary color of the item',
      'Material': 'What the item is made from (e.g., Cotton, Polyester)',
      'Style': 'The style or design aesthetic (e.g., Casual, Formal)',
      'Pattern': 'The pattern on the item (e.g., Solid, Striped)',
      'Season': 'The season this item is suitable for',
      'Department': 'The intended gender/age group (e.g., Men, Women)',
      'Occasion': 'When this item would be worn (e.g., Casual, Work)',
      'Features': 'Special features of the item (e.g., Pockets, Waterproof)'
    };

    return helpTexts[aspectName];
  }

  /**
   * Calculate days to sell from end time
   */
  private calculateDaysToSell(endTime: string): number {
    try {
      const endDate = new Date(endTime);
      const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // Assume 7-day listing
      const daysToSell = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      return Math.max(1, daysToSell);
    } catch {
      return 7; // Default to 7 days
    }
  }

  /**
   * Test the eBay connection and environment
   */
  async testConnection(): Promise<{
    success: boolean;
    environment: string;
    message: string;
    hasProduction: boolean;
  }> {
    try {
      const connectionTest = await this.ebayApi.testConnection();
      
      return {
        success: connectionTest.success,
        environment: connectionTest.environment,
        message: connectionTest.message,
        hasProduction: connectionTest.environment === 'production'
      };
    } catch (error) {
      return {
        success: false,
        environment: 'unknown',
        message: error.message,
        hasProduction: false
      };
    }
  }
}

export default EnhancedEbayService;
export type { CategoryData, CategorySpecific, MarketPriceData, CategorySuggestion };