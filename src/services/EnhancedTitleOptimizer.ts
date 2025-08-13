/**
 * Enhanced Title Optimization Engine
 * SEO-optimized eBay title generation with keyword strategy and A/B testing
 */

export interface TitleOptimization {
  optimizedTitle: string;
  originalTitle: string;
  confidence: number;
  seoScore: number;
  keywordCount: number;
  characterCount: number;
  improvements: string[];
  keywords: string[];
  titleVariations: TitleVariation[];
}

export interface TitleVariation {
  title: string;
  type: 'primary' | 'keyword_optimized' | 'brand_focused' | 'descriptive' | 'action_oriented';
  score: number;
  reasoning: string;
}

export interface TitleComponents {
  brand?: string;
  itemType: string;
  gender?: string;
  size?: string;
  color?: string;
  material?: string;
  condition?: string;
  keywords: string[];
  style?: string;
  season?: string;
}

export class EnhancedTitleOptimizer {
  private readonly MAX_TITLE_LENGTH = 80;
  private readonly MIN_TITLE_LENGTH = 20;
  
  // High-value eBay keywords by category
  private keywordDatabase = {
    clothing: {
      high_value: ['vintage', 'designer', 'luxury', 'premium', 'authentic', 'rare', 'limited'],
      descriptive: ['soft', 'comfortable', 'stylish', 'trendy', 'classic', 'modern', 'elegant'],
      seasonal: ['summer', 'winter', 'spring', 'fall', 'holiday', 'beach', 'warm', 'cool'],
      style: ['casual', 'formal', 'business', 'party', 'everyday', 'special', 'work'],
      fit: ['slim', 'regular', 'loose', 'fitted', 'relaxed', 'tailored', 'stretch'],
      condition: ['new', 'like new', 'excellent', 'good', 'vintage', 'used', 'pre-owned']
    },
    shoes: {
      high_value: ['leather', 'suede', 'authentic', 'comfort', 'athletic', 'running', 'walking'],
      descriptive: ['comfortable', 'durable', 'stylish', 'lightweight', 'breathable', 'waterproof'],
      style: ['casual', 'dress', 'athletic', 'formal', 'outdoor', 'indoor', 'sport'],
      features: ['cushioned', 'arch support', 'slip-resistant', 'steel toe', 'memory foam']
    },
    accessories: {
      high_value: ['genuine', 'authentic', 'handmade', 'artisan', 'unique', 'statement'],
      descriptive: ['elegant', 'versatile', 'adjustable', 'durable', 'lightweight'],
      style: ['minimalist', 'bohemian', 'classic', 'modern', 'vintage', 'contemporary']
    }
  };

  // eBay trending keywords (updated regularly)
  private trendingKeywords = [
    'sustainable', 'eco-friendly', 'organic', 'recycled', 'upcycled',
    'boho', 'minimalist', 'oversized', 'cropped', 'high-waisted',
    'athleisure', 'streetwear', 'cottagecore', 'y2k', 'retro',
    'plus size', 'petite', 'tall', 'curvy', 'maternity',
    'work from home', 'zoom ready', 'travel', 'packable'
  ];

  // Stop words to avoid in titles
  private stopWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must'
  ];

  /**
   * Optimize title for eBay with SEO and keyword strategy
   */
  async optimizeTitle(components: TitleComponents): Promise<TitleOptimization> {
    console.log('🏷️ [TITLE-OPTIMIZER] Optimizing title with components:', components);
    
    try {
      // Generate base title
      const baseTitle = this.buildBaseTitle(components);
      
      // Generate multiple title variations
      const variations = this.generateTitleVariations(components);
      
      // Select best variation
      const bestVariation = this.selectBestVariation(variations);
      
      // Calculate metrics
      const seoScore = this.calculateSEOScore(bestVariation.title, components);
      const keywordCount = this.countKeywords(bestVariation.title);
      const improvements = this.identifyImprovements(baseTitle, bestVariation.title);
      const keywords = this.extractKeywords(bestVariation.title, components);
      
      const optimization: TitleOptimization = {
        optimizedTitle: bestVariation.title,
        originalTitle: baseTitle,
        confidence: bestVariation.score / 100,
        seoScore,
        keywordCount,
        characterCount: bestVariation.title.length,
        improvements,
        keywords,
        titleVariations: variations
      };
      
      console.log('✅ [TITLE-OPTIMIZER] Generated optimized title:', bestVariation.title);
      console.log('📊 [TITLE-OPTIMIZER] SEO Score:', seoScore, 'Keywords:', keywordCount);
      
      return optimization;
      
    } catch (error) {
      console.error('❌ [TITLE-OPTIMIZER] Error optimizing title:', error);
      
      // Fallback to basic title
      const fallbackTitle = this.buildBasicTitle(components);
      return {
        optimizedTitle: fallbackTitle,
        originalTitle: fallbackTitle,
        confidence: 0.5,
        seoScore: 50,
        keywordCount: 3,
        characterCount: fallbackTitle.length,
        improvements: [],
        keywords: [],
        titleVariations: []
      };
    }
  }

  /**
   * Build base title from components
   */
  private buildBaseTitle(components: TitleComponents): string {
    const parts: string[] = [];
    
    // Core structure: Brand + Item Type + Gender + Size + Color + Keywords
    if (components.brand) parts.push(components.brand);
    if (components.itemType) parts.push(components.itemType);
    if (components.gender && this.isGenderRelevant(components.gender)) {
      parts.push(this.formatGender(components.gender));
    }
    if (components.size) parts.push(`Size ${components.size}`);
    if (components.color) parts.push(components.color);
    if (components.material && components.material !== components.itemType) {
      parts.push(components.material);
    }
    
    // Add top keywords
    const topKeywords = components.keywords.slice(0, 3);
    parts.push(...topKeywords);
    
    return parts.join(' ').substring(0, this.MAX_TITLE_LENGTH);
  }

  /**
   * Generate multiple title variations with different strategies
   */
  private generateTitleVariations(components: TitleComponents): TitleVariation[] {
    const variations: TitleVariation[] = [];
    
    // 1. Primary variation (balanced approach)
    variations.push(this.createPrimaryVariation(components));
    
    // 2. Keyword-optimized variation
    variations.push(this.createKeywordOptimizedVariation(components));
    
    // 3. Brand-focused variation
    if (components.brand) {
      variations.push(this.createBrandFocusedVariation(components));
    }
    
    // 4. Descriptive variation
    variations.push(this.createDescriptiveVariation(components));
    
    // 5. Action-oriented variation
    variations.push(this.createActionOrientedVariation(components));
    
    return variations;
  }

  /**
   * Create primary balanced variation
   */
  private createPrimaryVariation(components: TitleComponents): TitleVariation {
    const parts: string[] = [];
    
    // Optimal order for eBay search
    if (components.brand) parts.push(components.brand);
    if (components.itemType) parts.push(components.itemType);
    if (components.gender && this.isGenderRelevant(components.gender)) {
      parts.push(this.formatGender(components.gender));
    }
    if (components.size) parts.push(`Size ${components.size}`);
    if (components.color) parts.push(components.color);
    
    // Add high-value keywords
    const keywords = this.selectHighValueKeywords(components, 3);
    parts.push(...keywords);
    
    const title = this.truncateToLimit(parts.join(' '));
    const score = this.scoreTitle(title, components);
    
    return {
      title,
      type: 'primary',
      score,
      reasoning: 'Balanced approach optimizing for brand recognition and search visibility'
    };
  }

  /**
   * Create keyword-optimized variation
   */
  private createKeywordOptimizedVariation(components: TitleComponents): TitleVariation {
    const parts: string[] = [];
    
    // Start with highest search volume keywords
    const topKeywords = this.selectHighValueKeywords(components, 5);
    
    if (components.brand) parts.push(components.brand);
    if (components.itemType) parts.push(components.itemType);
    
    // Prioritize keywords over details
    parts.push(...topKeywords);
    
    if (components.size) parts.push(components.size);
    if (components.color) parts.push(components.color);
    
    const title = this.truncateToLimit(parts.join(' '));
    const score = this.scoreTitle(title, components) + 10; // Bonus for keyword density
    
    return {
      title,
      type: 'keyword_optimized',
      score,
      reasoning: 'Maximizes keyword density for search algorithm optimization'
    };
  }

  /**
   * Create brand-focused variation
   */
  private createBrandFocusedVariation(components: TitleComponents): TitleVariation {
    const parts: string[] = [];
    
    // Lead with brand for brand recognition
    if (components.brand) {
      parts.push(components.brand);
      parts.push(components.itemType || 'Item');
    }
    
    // Add authenticty keywords
    parts.push('Authentic');
    
    if (components.gender && this.isGenderRelevant(components.gender)) {
      parts.push(this.formatGender(components.gender));
    }
    if (components.size) parts.push(`Size ${components.size}`);
    if (components.color) parts.push(components.color);
    if (components.condition) parts.push(components.condition);
    
    const title = this.truncateToLimit(parts.join(' '));
    const score = this.scoreTitle(title, components) + 5; // Brand bonus
    
    return {
      title,
      type: 'brand_focused',
      score,
      reasoning: 'Emphasizes brand authenticity and recognition for brand-conscious buyers'
    };
  }

  /**
   * Create descriptive variation
   */
  private createDescriptiveVariation(components: TitleComponents): TitleVariation {
    const parts: string[] = [];
    
    if (components.brand) parts.push(components.brand);
    if (components.itemType) parts.push(components.itemType);
    
    // Add descriptive adjectives
    const descriptiveKeywords = this.selectDescriptiveKeywords(components, 4);
    parts.push(...descriptiveKeywords);
    
    if (components.size) parts.push(`Size ${components.size}`);
    if (components.color) parts.push(components.color);
    if (components.material) parts.push(components.material);
    
    const title = this.truncateToLimit(parts.join(' '));
    const score = this.scoreTitle(title, components);
    
    return {
      title,
      type: 'descriptive',
      score,
      reasoning: 'Rich descriptions to attract buyers looking for specific features'
    };
  }

  /**
   * Create action-oriented variation
   */
  private createActionOrientedVariation(components: TitleComponents): TitleVariation {
    const parts: string[] = [];
    
    // Start with action words
    const actionWords = ['Perfect', 'Must-Have', 'Stunning', 'Amazing'];
    parts.push(actionWords[Math.floor(Math.random() * actionWords.length)]);
    
    if (components.brand) parts.push(components.brand);
    if (components.itemType) parts.push(components.itemType);
    if (components.size) parts.push(`Size ${components.size}`);
    if (components.color) parts.push(components.color);
    
    // Add urgency/value keywords
    const urgencyKeywords = ['Rare', 'Limited', 'Exclusive', 'Premium'];
    parts.push(urgencyKeywords[Math.floor(Math.random() * urgencyKeywords.length)]);
    
    const title = this.truncateToLimit(parts.join(' '));
    const score = this.scoreTitle(title, components) - 5; // Slightly lower for being salesy
    
    return {
      title,
      type: 'action_oriented',
      score,
      reasoning: 'Creates urgency and emotional appeal to drive immediate action'
    };
  }

  /**
   * Select best variation based on scoring
   */
  private selectBestVariation(variations: TitleVariation[]): TitleVariation {
    return variations.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  /**
   * Score title based on multiple factors
   */
  private scoreTitle(title: string, components: TitleComponents): number {
    let score = 0;
    
    // Length optimization (65-75 characters is ideal)
    const idealLength = 70;
    const lengthDiff = Math.abs(title.length - idealLength);
    score += Math.max(0, 25 - lengthDiff); // Max 25 points for length
    
    // Keyword density
    score += this.countKeywords(title) * 5; // 5 points per keyword
    
    // Brand presence
    if (components.brand && title.toLowerCase().includes(components.brand.toLowerCase())) {
      score += 15;
    }
    
    // Essential components
    if (components.size && title.toLowerCase().includes(components.size.toLowerCase())) {
      score += 10;
    }
    if (components.color && title.toLowerCase().includes(components.color.toLowerCase())) {
      score += 10;
    }
    if (components.itemType && title.toLowerCase().includes(components.itemType.toLowerCase())) {
      score += 15;
    }
    
    // Trending keywords bonus
    const trendingCount = this.trendingKeywords.filter(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    score += trendingCount * 8;
    
    // Readability (avoid too many capital letters)
    const capsRatio = (title.match(/[A-Z]/g) || []).length / title.length;
    if (capsRatio < 0.3) score += 5; // Bonus for readable titles
    
    return Math.min(100, score); // Cap at 100
  }

  /**
   * Calculate SEO score
   */
  private calculateSEOScore(title: string, components: TitleComponents): number {
    let score = 0;
    
    // Keyword optimization (40% of score)
    const keywordScore = Math.min(40, this.countKeywords(title) * 8);
    score += keywordScore;
    
    // Length optimization (20% of score)
    const lengthScore = title.length >= 50 && title.length <= 75 ? 20 : 
                       title.length >= 40 && title.length <= 80 ? 15 : 10;
    score += lengthScore;
    
    // Brand presence (15% of score)
    const brandScore = components.brand && 
                      title.toLowerCase().includes(components.brand.toLowerCase()) ? 15 : 0;
    score += brandScore;
    
    // Essential details (15% of score)
    let detailScore = 0;
    if (components.size && title.includes(components.size)) detailScore += 5;
    if (components.color && title.includes(components.color)) detailScore += 5;
    if (components.itemType && title.includes(components.itemType)) detailScore += 5;
    score += detailScore;
    
    // Trending keywords (10% of score)
    const trendingScore = Math.min(10, this.trendingKeywords.filter(keyword => 
      title.toLowerCase().includes(keyword.toLowerCase())
    ).length * 2);
    score += trendingScore;
    
    return Math.min(100, score);
  }

  /**
   * Count relevant keywords in title
   */
  private countKeywords(title: string): number {
    const words = title.toLowerCase().split(/\s+/);
    const allKeywords = [
      ...Object.values(this.keywordDatabase).flatMap(cat => Object.values(cat).flat()),
      ...this.trendingKeywords
    ];
    
    return words.filter(word => 
      allKeywords.some(keyword => keyword.toLowerCase() === word) ||
      word.length > 4 // Assume longer words are descriptive keywords
    ).length;
  }

  /**
   * Extract keywords from title
   */
  private extractKeywords(title: string, components: TitleComponents): string[] {
    const words = title.toLowerCase().split(/\s+/);
    const keywords: string[] = [];
    
    const allKeywords = [
      ...Object.values(this.keywordDatabase).flatMap(cat => Object.values(cat).flat()),
      ...this.trendingKeywords
    ];
    
    words.forEach(word => {
      if (allKeywords.some(keyword => keyword.toLowerCase() === word) ||
          (word.length > 4 && !this.stopWords.includes(word))) {
        keywords.push(word);
      }
    });
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  /**
   * Select high-value keywords
   */
  private selectHighValueKeywords(components: TitleComponents, limit: number): string[] {
    const keywords: string[] = [];
    const category = this.determineCategoryForKeywords(components.itemType);
    
    // Add high-value keywords for the category
    if (this.keywordDatabase[category]) {
      keywords.push(...this.keywordDatabase[category].high_value.slice(0, 2));
      keywords.push(...this.keywordDatabase[category].descriptive.slice(0, 2));
    }
    
    // Add trending keywords
    keywords.push(...this.trendingKeywords.slice(0, 2));
    
    // Add component-specific keywords
    if (components.style) keywords.push(components.style);
    if (components.season) keywords.push(components.season);
    if (components.material) keywords.push(components.material);
    
    return keywords.slice(0, limit);
  }

  /**
   * Select descriptive keywords
   */
  private selectDescriptiveKeywords(components: TitleComponents, limit: number): string[] {
    const keywords: string[] = [];
    const category = this.determineCategoryForKeywords(components.itemType);
    
    if (this.keywordDatabase[category]) {
      keywords.push(...this.keywordDatabase[category].descriptive);
      if (this.keywordDatabase[category].style) {
        keywords.push(...this.keywordDatabase[category].style);
      }
    }
    
    return keywords.slice(0, limit);
  }

  /**
   * Determine category for keyword selection
   */
  private determineCategoryForKeywords(itemType: string): keyof typeof this.keywordDatabase {
    const lowerItemType = itemType.toLowerCase();
    
    if (lowerItemType.includes('shoe') || lowerItemType.includes('boot') || 
        lowerItemType.includes('sneaker') || lowerItemType.includes('sandal')) {
      return 'shoes';
    }
    
    if (lowerItemType.includes('bag') || lowerItemType.includes('watch') || 
        lowerItemType.includes('jewelry') || lowerItemType.includes('accessory')) {
      return 'accessories';
    }
    
    return 'clothing';
  }

  /**
   * Check if gender is relevant for title
   */
  private isGenderRelevant(gender: string): boolean {
    return gender && gender.toLowerCase() !== 'unisex' && gender.toLowerCase() !== 'unknown';
  }

  /**
   * Format gender for title
   */
  private formatGender(gender: string): string {
    const formatted = gender.toLowerCase();
    switch (formatted) {
      case 'men': return "Men's";
      case 'women': return "Women's";
      case 'kids': return "Kids'";
      case 'boys': return "Boys'";
      case 'girls': return "Girls'";
      default: return gender;
    }
  }

  /**
   * Truncate title to character limit
   */
  private truncateToLimit(title: string): string {
    if (title.length <= this.MAX_TITLE_LENGTH) {
      return title;
    }
    
    // Truncate at last complete word
    const truncated = title.substring(0, this.MAX_TITLE_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > this.MIN_TITLE_LENGTH ? 
           truncated.substring(0, lastSpace) : 
           truncated;
  }

  /**
   * Build basic fallback title
   */
  private buildBasicTitle(components: TitleComponents): string {
    const parts: string[] = [];
    
    if (components.brand) parts.push(components.brand);
    if (components.itemType) parts.push(components.itemType);
    if (components.size) parts.push(`Size ${components.size}`);
    if (components.color) parts.push(components.color);
    
    return this.truncateToLimit(parts.join(' '));
  }

  /**
   * Identify improvements made
   */
  private identifyImprovements(original: string, optimized: string): string[] {
    const improvements: string[] = [];
    
    if (optimized.length > original.length) {
      improvements.push('Added descriptive keywords');
    }
    
    if (this.countKeywords(optimized) > this.countKeywords(original)) {
      improvements.push('Increased keyword density');
    }
    
    if (optimized.length >= 50 && optimized.length <= 75) {
      improvements.push('Optimized title length for SEO');
    }
    
    if (optimized !== original) {
      improvements.push('Improved search visibility');
    }
    
    return improvements;
  }

  /**
   * Get title performance predictions
   */
  getPredictedPerformance(title: string): {
    searchVisibility: number;
    clickThroughRate: number;
    conversionPotential: number;
    overallScore: number;
  } {
    const keywordCount = this.countKeywords(title);
    const lengthScore = title.length >= 50 && title.length <= 75 ? 1 : 0.8;
    
    const searchVisibility = Math.min(100, keywordCount * 15 + lengthScore * 20);
    const clickThroughRate = Math.min(100, title.length * 1.2 + keywordCount * 10);
    const conversionPotential = Math.min(100, keywordCount * 12 + (title.includes('Authentic') ? 20 : 0));
    
    const overallScore = (searchVisibility + clickThroughRate + conversionPotential) / 3;
    
    return {
      searchVisibility,
      clickThroughRate,
      conversionPotential,
      overallScore
    };
  }

  /**
   * Get A/B testing recommendations
   */
  getABTestingRecommendations(components: TitleComponents): {
    titleA: string;
    titleB: string;
    testHypothesis: string;
    metrics: string[];
  } {
    const variations = this.generateTitleVariations(components);
    const primaryVariation = variations.find(v => v.type === 'primary');
    const keywordVariation = variations.find(v => v.type === 'keyword_optimized');
    
    return {
      titleA: primaryVariation?.title || this.buildBasicTitle(components),
      titleB: keywordVariation?.title || this.buildBasicTitle(components),
      testHypothesis: 'Keyword-optimized titles will achieve higher search visibility',
      metrics: ['Click-through rate', 'Search impressions', 'Conversion rate', 'Average sale price']
    };
  }
}

export const enhancedTitleOptimizer = new EnhancedTitleOptimizer();