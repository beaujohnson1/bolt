import { getSupabase } from '../lib/supabase';
import { extractSize, extractBrand } from '../utils/itemUtils';
import { safeTrim, toStr, safeUpper } from '../utils/strings';
import { visionClient } from '../lib/googleVision';

interface KeywordExtractionResult {
  ocrKeywords: string[];
  aiKeywords: string[];
  combinedKeywords: string[];
  relevanceScores: Record<string, number>;
  extractionMethods: Record<string, 'ocr' | 'ai' | 'hybrid'>;
  qualityScore: number;
}

interface EbayKeywordData {
  keyword: string;
  searchVolume: number;
  competitionLevel: 'low' | 'medium' | 'high';
  avgPrice: number;
  conversionRate: number;
}

export class OCRKeywordOptimizer {
  private supabase;
  private static readonly CLOTHING_KEYWORDS = [
    // Brands (most searched)
    'nike', 'adidas', 'lululemon', 'patagonia', 'north face', 'under armour',
    'gap', 'old navy', 'zara', 'h&m', 'uniqlo', 'american eagle',
    'hollister', 'abercrombie', 'banana republic', 'j crew',
    
    // Item types
    'jacket', 'coat', 'shirt', 'blouse', 'dress', 'pants', 'jeans',
    'sweater', 'hoodie', 'cardigan', 'blazer', 'skirt', 'shorts',
    'tank top', 'polo', 't-shirt', 'sweatshirt',
    
    // Materials & Features
    'cotton', 'wool', 'polyester', 'denim', 'leather', 'silk',
    'fleece', 'cashmere', 'linen', 'vintage', 'rare', 'limited edition',
    'waterproof', 'windbreaker', 'thermal', 'athletic', 'workout',
    
    // Styles & Occasions
    'business', 'casual', 'formal', 'party', 'wedding', 'summer',
    'winter', 'spring', 'fall', 'outdoor', 'hiking', 'running',
    
    // Colors (high-impact)
    'black', 'white', 'blue', 'red', 'gray', 'navy', 'pink',
    'green', 'brown', 'tan', 'purple', 'yellow', 'orange',
    
    // Size indicators
    'xl', 'large', 'medium', 'small', 'xs', 'plus size', 'petite',
    'tall', 'regular', 'slim fit', 'relaxed fit'
  ];
  
  private static readonly KEYWORD_PATTERNS = {
    brand: /\b(nike|adidas|lululemon|patagonia|north\s*face|under\s*armour|gap|old\s*navy|zara|h&m|uniqlo|american\s*eagle|hollister|abercrombie|banana\s*republic|j\s*crew|calvin\s*klein|tommy\s*hilfiger|ralph\s*lauren|polo|lacoste|hugo\s*boss|gucci|prada|louis\s*vuitton|chanel|versace|armani|burberry)\b/i,
    material: /\b(cotton|wool|polyester|denim|leather|silk|fleece|cashmere|linen|nylon|spandex|rayon|modal|bamboo)\b/i,
    style: /\b(vintage|retro|modern|classic|trendy|bohemian|minimalist|streetwear|preppy|gothic|punk|grunge)\b/i,
    feature: /\b(waterproof|windbreaker|thermal|insulated|breathable|moisture\s*wicking|quick\s*dry|stretch|wrinkle\s*resistant)\b/i,
    season: /\b(summer|winter|spring|fall|autumn|holiday|christmas|valentine|beach|vacation)\b/i
  };

  constructor() {
    this.supabase = getSupabase();
  }

  /**
   * Extract and optimize keywords from OCR text and AI analysis
   */
  async optimizeKeywordExtraction(
    ocrText: string, 
    aiKeywords: string[], 
    itemType: string,
    brand?: string | null,
    color?: string | null
  ): Promise<KeywordExtractionResult> {
    console.log('🔍 [KEYWORD-OPTIMIZER] Starting keyword optimization...', {
      ocrTextLength: ocrText.length,
      aiKeywordCount: aiKeywords.length,
      itemType,
      brand,
      color
    });

    try {
      // Step 1: Extract keywords from OCR using multiple methods
      const ocrKeywords = this.extractFromOCR(ocrText);
      
      // Step 2: Combine and deduplicate
      const combinedKeywords = this.combineKeywords(ocrKeywords, aiKeywords, itemType, brand, color);
      
      // Step 3: Score relevance and commercial value
      const relevanceScores = await this.scoreKeywordRelevance(combinedKeywords, itemType);
      
      // Step 4: Determine extraction methods
      const extractionMethods = this.determineExtractionMethods(combinedKeywords, ocrKeywords, aiKeywords);
      
      // Step 5: Calculate overall quality score
      const qualityScore = this.calculateQualityScore(combinedKeywords, relevanceScores);

      const result: KeywordExtractionResult = {
        ocrKeywords,
        aiKeywords,
        combinedKeywords,
        relevanceScores,
        extractionMethods,
        qualityScore
      };

      console.log('✅ [KEYWORD-OPTIMIZER] Optimization complete:', {
        ocrKeywords: ocrKeywords.length,
        aiKeywords: aiKeywords.length,
        combined: combinedKeywords.length,
        qualityScore
      });

      return result;
    } catch (error) {
      console.error('❌ [KEYWORD-OPTIMIZER] Error optimizing keywords:', error);
      
      // Return fallback result
      return {
        ocrKeywords: [],
        aiKeywords,
        combinedKeywords: aiKeywords,
        relevanceScores: {},
        extractionMethods: {},
        qualityScore: 0.5
      };
    }
  }

  /**
   * Extract keywords from OCR text using pattern matching and NLP techniques
   */
  private extractFromOCR(ocrText: string): string[] {
    const text = safeTrim(toStr(ocrText));
    if (!text) return [];

    const keywords: Set<string> = new Set();
    const textUpper = safeUpper(text);

    // Method 1: Pattern-based extraction
    Object.entries(OCRKeywordOptimizer.KEYWORD_PATTERNS).forEach(([category, pattern]) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = safeTrim(match.toLowerCase());
          if (cleaned && cleaned.length > 2) {
            keywords.add(cleaned);
          }
        });
      }
    });

    // Method 2: Brand extraction with context
    const brandMatch = extractBrand(text);
    if (brandMatch) {
      keywords.add(brandMatch.toLowerCase());
    }

    // Method 3: Size extraction with variants
    const sizeMatch = extractSize(text);
    if (sizeMatch) {
      keywords.add(sizeMatch.toLowerCase());
      // Add size variants
      this.getSizeVariants(sizeMatch).forEach(variant => keywords.add(variant));
    }

    // Method 4: Care instruction keywords (indicate quality/material)
    const careInstructions = this.extractCareInstructions(text);
    careInstructions.forEach(instruction => keywords.add(instruction));

    // Method 5: High-value terms from clothing tags
    const highValueTerms = this.extractHighValueTerms(text);
    highValueTerms.forEach(term => keywords.add(term));

    // Method 6: Material and fabric detection
    const materials = this.extractMaterials(text);
    materials.forEach(material => keywords.add(material));

    const result = Array.from(keywords).filter(kw => kw.length > 2);
    
    console.log('🔍 [OCR-EXTRACT] Extracted from OCR:', result);
    return result;
  }

  /**
   * Combine keywords from different sources intelligently
   */
  private combineKeywords(
    ocrKeywords: string[], 
    aiKeywords: string[], 
    itemType: string,
    brand?: string | null,
    color?: string | null
  ): string[] {
    const combined: Set<string> = new Set();

    // Add high-confidence OCR keywords
    ocrKeywords.forEach(kw => combined.add(kw.toLowerCase()));

    // Add AI keywords, but validate against OCR for brand/size
    aiKeywords.forEach(kw => {
      const lowered = kw.toLowerCase();
      // Skip if it contradicts OCR findings
      if (this.isValidKeyword(lowered, ocrKeywords, itemType)) {
        combined.add(lowered);
      }
    });

    // Add essential keywords if missing
    if (brand && !this.hasKeywordVariant(Array.from(combined), brand)) {
      combined.add(brand.toLowerCase());
    }

    if (color && !this.hasKeywordVariant(Array.from(combined), color)) {
      combined.add(color.toLowerCase());
    }

    // Add item type if missing
    const itemTypeClean = safeTrim(itemType.toLowerCase());
    if (itemTypeClean && !combined.has(itemTypeClean)) {
      combined.add(itemTypeClean);
    }

    // Add high-performing generic keywords for the item type
    this.getHighPerformingKeywords(itemType).forEach(kw => combined.add(kw));

    return Array.from(combined).slice(0, 15); // Limit to 15 for eBay optimization
  }

  /**
   * Score keywords based on relevance and commercial value
   */
  private async scoreKeywordRelevance(keywords: string[], itemType: string): Promise<Record<string, number>> {
    const scores: Record<string, number> = {};

    for (const keyword of keywords) {
      let score = 0.5; // Base score

      // Brand names get high scores
      if (this.isBrandName(keyword)) {
        score += 0.3;
      }

      // Exact item type match gets high score
      if (keyword === itemType.toLowerCase()) {
        score += 0.2;
      }

      // High-value terms get bonus
      if (this.isHighValueTerm(keyword)) {
        score += 0.15;
      }

      // Size indicators get bonus
      if (this.isSizeIndicator(keyword)) {
        score += 0.1;
      }

      // Commercial keywords (materials, features) get bonus
      if (this.isCommercialKeyword(keyword)) {
        score += 0.1;
      }

      // Penalize very common/generic words
      if (this.isGenericWord(keyword)) {
        score -= 0.2;
      }

      scores[keyword] = Math.max(0, Math.min(1, score));
    }

    return scores;
  }

  /**
   * Track keyword performance in the database
   */
  async trackKeywordOptimization(
    predictionId: string,
    result: KeywordExtractionResult,
    finalKeywords: string[]
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      // Simulate eBay search data (in production, this would come from eBay API)
      const ebaySearchData = this.simulateEbaySearchData(finalKeywords);

      await this.supabase
        .from('keyword_optimization')
        .insert({
          prediction_id: predictionId,
          ocr_keywords: result.ocrKeywords,
          ai_keywords: result.aiKeywords,
          combined_keywords: result.combinedKeywords,
          final_keywords: finalKeywords,
          ocr_keyword_quality: this.calculateOCRQuality(result),
          ai_keyword_quality: this.calculateAIQuality(result),
          keyword_relevance_score: result.qualityScore,
          ebay_search_volume: ebaySearchData,
          keyword_competition_score: this.calculateCompetitionScores(finalKeywords),
          title_keyword_density: this.calculateKeywordDensity(finalKeywords)
        });

      console.log('✅ [KEYWORD-OPTIMIZER] Performance tracking saved');
    } catch (error) {
      console.error('❌ [KEYWORD-OPTIMIZER] Error tracking performance:', error);
    }
  }

  /**
   * Get keyword optimization recommendations
   */
  getOptimizationRecommendations(result: KeywordExtractionResult): string[] {
    const recommendations: string[] = [];

    if (result.qualityScore < 0.6) {
      recommendations.push('📸 Take clearer photos of clothing tags and labels to improve keyword extraction');
    }

    if (result.ocrKeywords.length < 3) {
      recommendations.push('🔍 Include close-up shots of brand tags, size labels, and care instructions');
    }

    const brandCount = result.combinedKeywords.filter(kw => this.isBrandName(kw)).length;
    if (brandCount === 0) {
      recommendations.push('🏷️ Brand keywords are missing - ensure brand tags are visible and well-lit');
    }

    const materialCount = result.combinedKeywords.filter(kw => this.isMaterialKeyword(kw)).length;
    if (materialCount === 0) {
      recommendations.push('🧵 Add material/fabric keywords by photographing care labels');
    }

    const highValueCount = result.combinedKeywords.filter(kw => this.isHighValueTerm(kw)).length;
    if (highValueCount < 2) {
      recommendations.push('💰 Include more descriptive keywords like "vintage", "limited edition", or "rare" if applicable');
    }

    if (result.combinedKeywords.length > 12) {
      recommendations.push('✂️ Consider reducing keyword count - eBay titles perform best with 10-12 targeted keywords');
    }

    return recommendations;
  }

  // Helper Methods

  private extractCareInstructions(text: string): string[] {
    const instructions: string[] = [];
    const patterns = [
      /machine\s*wash/i,
      /hand\s*wash/i,
      /dry\s*clean/i,
      /tumble\s*dry/i,
      /air\s*dry/i,
      /do\s*not\s*bleach/i,
      /iron\s*low/i,
      /delicate/i
    ];

    patterns.forEach(pattern => {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        if (match) {
          instructions.push(match[0].toLowerCase().replace(/\s+/g, ' ').trim());
        }
      }
    });

    return instructions;
  }

  private extractHighValueTerms(text: string): string[] {
    const highValueTerms = [
      'vintage', 'rare', 'limited edition', 'exclusive', 'designer',
      'handmade', 'artisan', 'premium', 'luxury', 'collectible',
      'deadstock', 'nwt', 'new with tags', 'unused'
    ];

    return highValueTerms.filter(term => 
      new RegExp(`\\b${term}\\b`, 'i').test(text)
    );
  }

  private extractMaterials(text: string): string[] {
    const materials = [
      'cotton', 'wool', 'polyester', 'nylon', 'spandex', 'elastane',
      'rayon', 'modal', 'bamboo', 'linen', 'silk', 'cashmere',
      'fleece', 'denim', 'leather', 'suede', 'canvas'
    ];

    return materials.filter(material => 
      new RegExp(`\\b${material}\\b`, 'i').test(text)
    );
  }

  private getSizeVariants(size: string): string[] {
    const variants: string[] = [];
    const sizeUpper = safeUpper(size);
    
    // Add common size variants
    const sizeMap: Record<string, string[]> = {
      'XS': ['extra small'],
      'S': ['small'],
      'M': ['medium'],
      'L': ['large'],
      'XL': ['extra large'],
      'XXL': ['2xl', 'extra extra large']
    };

    if (sizeMap[sizeUpper]) {
      variants.push(...sizeMap[sizeUpper]);
    }

    return variants;
  }

  private getHighPerformingKeywords(itemType: string): string[] {
    const performanceMap: Record<string, string[]> = {
      'jacket': ['outerwear', 'coat', 'windbreaker'],
      'shirt': ['top', 'blouse', 'button up'],
      'pants': ['trousers', 'bottoms', 'slacks'],
      'dress': ['formal', 'party', 'cocktail'],
      'shoes': ['footwear', 'sneakers', 'boots']
    };

    const itemLower = itemType.toLowerCase();
    return performanceMap[itemLower] || [];
  }

  private isValidKeyword(keyword: string, ocrKeywords: string[], itemType: string): boolean {
    // Basic validation - can be enhanced with more sophisticated logic
    return keyword.length > 2 && keyword.length < 25;
  }

  private hasKeywordVariant(keywords: string[], target: string): boolean {
    const targetLower = target.toLowerCase();
    return keywords.some(kw => 
      kw.includes(targetLower) || targetLower.includes(kw)
    );
  }

  private isBrandName(keyword: string): boolean {
    return OCRKeywordOptimizer.KEYWORD_PATTERNS.brand.test(keyword);
  }

  private isHighValueTerm(keyword: string): boolean {
    const highValueTerms = ['vintage', 'rare', 'limited', 'designer', 'premium', 'luxury'];
    return highValueTerms.some(term => keyword.includes(term));
  }

  private isSizeIndicator(keyword: string): boolean {
    const sizePattern = /\b(xs|small|medium|large|xl|xxl|\d+x\d+|\d+)\b/i;
    return sizePattern.test(keyword);
  }

  private isCommercialKeyword(keyword: string): boolean {
    return OCRKeywordOptimizer.KEYWORD_PATTERNS.material.test(keyword) ||
           OCRKeywordOptimizer.KEYWORD_PATTERNS.feature.test(keyword);
  }

  private isMaterialKeyword(keyword: string): boolean {
    return OCRKeywordOptimizer.KEYWORD_PATTERNS.material.test(keyword);
  }

  private isGenericWord(keyword: string): boolean {
    const genericWords = ['clothing', 'item', 'piece', 'wear', 'fashion', 'style'];
    return genericWords.includes(keyword);
  }

  private determineExtractionMethods(
    combined: string[], 
    ocr: string[], 
    ai: string[]
  ): Record<string, 'ocr' | 'ai' | 'hybrid'> {
    const methods: Record<string, 'ocr' | 'ai' | 'hybrid'> = {};

    combined.forEach(keyword => {
      const inOcr = ocr.includes(keyword);
      const inAi = ai.includes(keyword);

      if (inOcr && inAi) {
        methods[keyword] = 'hybrid';
      } else if (inOcr) {
        methods[keyword] = 'ocr';
      } else {
        methods[keyword] = 'ai';
      }
    });

    return methods;
  }

  private calculateQualityScore(keywords: string[], relevanceScores: Record<string, number>): number {
    if (keywords.length === 0) return 0;

    const avgRelevance = Object.values(relevanceScores).reduce((a, b) => a + b, 0) / keywords.length;
    const brandBonus = keywords.some(kw => this.isBrandName(kw)) ? 0.1 : 0;
    const materialBonus = keywords.some(kw => this.isMaterialKeyword(kw)) ? 0.05 : 0;

    return Math.min(1, avgRelevance + brandBonus + materialBonus);
  }

  private calculateOCRQuality(result: KeywordExtractionResult): number {
    const ocrContribution = result.ocrKeywords.length / result.combinedKeywords.length;
    return Math.min(1, ocrContribution);
  }

  private calculateAIQuality(result: KeywordExtractionResult): number {
    const aiContribution = result.aiKeywords.length / result.combinedKeywords.length;
    return Math.min(1, aiContribution);
  }

  private simulateEbaySearchData(keywords: string[]): Record<string, number> {
    // In production, this would call eBay's Completed Listings API
    const searchData: Record<string, number> = {};
    keywords.forEach(keyword => {
      // Simulate search volume based on keyword characteristics
      searchData[keyword] = Math.floor(Math.random() * 10000) + 100;
    });
    return searchData;
  }

  private calculateCompetitionScores(keywords: string[]): Record<string, number> {
    const scores: Record<string, number> = {};
    keywords.forEach(keyword => {
      // Simulate competition level (0-1, where 1 is high competition)
      scores[keyword] = Math.random();
    });
    return scores;
  }

  private calculateKeywordDensity(keywords: string[]): number {
    // Calculate how many keywords would fit in a typical eBay title (80 chars)
    const totalLength = keywords.join(' ').length;
    return Math.min(1, totalLength / 80);
  }
}

// Export singleton instance
export const ocrKeywordOptimizer = new OCRKeywordOptimizer();