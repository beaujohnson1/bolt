import { analyzeClothingItem } from './openaiService';
import { EnhancedBrandDetector } from './EnhancedBrandDetector';
import { EnhancedSizeProcessor } from './EnhancedSizeProcessor';
import { EnhancedOCRProcessor } from './EnhancedOCRProcessor';
import { OCRKeywordOptimizer } from './OCRKeywordOptimizer';
import { aiAccuracyAgent } from './AIAccuracyAgent';
import { visionClient } from '../lib/googleVision';

interface ImageAnalysisResult {
  brand?: string;
  size?: string;
  color?: string;
  condition?: string;
  category?: string;
  material?: string;
  style?: string;
  keywords: string[];
  confidence: number;
  ocrText: string;
}

interface MultiImageResult {
  combinedAnalysis: ImageAnalysisResult;
  individualResults: ImageAnalysisResult[];
  bestImage: number;
  processingTime: number;
  accuracyScore: number;
  optimizationSuggestions: string[];
}

export class EnhancedMultiImageProcessor {
  private brandDetector: EnhancedBrandDetector;
  private sizeProcessor: EnhancedSizeProcessor;
  private ocrProcessor: EnhancedOCRProcessor;
  private keywordOptimizer: OCRKeywordOptimizer;
  
  private readonly MAX_CONCURRENT_IMAGES = 10; // Increased from 5
  private readonly IMAGE_QUALITY_THRESHOLD = 0.7;
  private readonly MIN_TEXT_LENGTH = 10;

  constructor() {
    this.brandDetector = new EnhancedBrandDetector();
    this.sizeProcessor = new EnhancedSizeProcessor();
    this.ocrProcessor = new EnhancedOCRProcessor();
    this.keywordOptimizer = new OCRKeywordOptimizer();
  }

  /**
   * Process multiple images with enhanced accuracy techniques
   */
  async processMultipleImages(
    imageUrls: string[],
    userId?: string,
    itemId?: string
  ): Promise<MultiImageResult> {
    const startTime = Date.now();
    
    console.log('🖼️ [MULTI-IMAGE] Processing', imageUrls.length, 'images');
    
    try {
      // Step 1: Pre-process and assess image quality
      const qualityScores = await this.assessImageQuality(imageUrls);
      const validImages = imageUrls.filter((_, idx) => qualityScores[idx] >= this.IMAGE_QUALITY_THRESHOLD);
      
      if (validImages.length === 0) {
        console.warn('⚠️ [MULTI-IMAGE] No images passed quality threshold, using all');
        validImages.push(...imageUrls);
      }
      
      // Step 2: Process images in parallel with optimized batching
      const batchSize = Math.min(this.MAX_CONCURRENT_IMAGES, validImages.length);
      const results = await this.processBatch(validImages.slice(0, batchSize));
      
      // Step 3: Combine and reconcile results
      const combinedAnalysis = await this.combineResults(results);
      
      // Step 4: Find the best image for primary analysis
      const bestImageIndex = this.findBestImage(results);
      
      // Step 5: Calculate accuracy score
      const accuracyScore = await this.calculateAccuracyScore(combinedAnalysis, results);
      
      // Step 6: Generate optimization suggestions
      const suggestions = await this.generateOptimizationSuggestions(
        combinedAnalysis,
        results,
        qualityScores
      );
      
      // Step 7: Track with AI Accuracy Agent if user provided
      if (userId) {
        await this.trackAnalysis(combinedAnalysis, imageUrls, userId, itemId);
      }
      
      const processingTime = Date.now() - startTime;
      
      console.log('✅ [MULTI-IMAGE] Processing complete:', {
        images: validImages.length,
        time: processingTime,
        accuracy: accuracyScore
      });
      
      return {
        combinedAnalysis,
        individualResults: results,
        bestImage: bestImageIndex,
        processingTime,
        accuracyScore,
        optimizationSuggestions: suggestions
      };
      
    } catch (error) {
      console.error('❌ [MULTI-IMAGE] Processing error:', error);
      throw error;
    }
  }

  /**
   * Assess image quality using various metrics
   */
  private async assessImageQuality(imageUrls: string[]): Promise<number[]> {
    const scores: number[] = [];
    
    for (const url of imageUrls) {
      let score = 0.5; // Base score
      
      try {
        // Check if image is accessible
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          score += 0.2;
        }
        
        // Check file size (prefer larger, clearer images)
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 100000) {
          score += 0.15;
        }
        
        // Check image type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('image')) {
          score += 0.15;
        }
        
      } catch (error) {
        console.warn('⚠️ [QUALITY] Could not assess image:', url);
        score = 0.3; // Low score for inaccessible images
      }
      
      scores.push(Math.min(1, score));
    }
    
    return scores;
  }

  /**
   * Process a batch of images in parallel
   */
  private async processBatch(imageUrls: string[]): Promise<ImageAnalysisResult[]> {
    const promises = imageUrls.map(url => this.processSingleImage(url));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, idx) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error('❌ [BATCH] Failed to process image', idx, result.reason);
        return this.getEmptyResult();
      }
    });
  }

  /**
   * Process a single image with all enhancement techniques
   */
  private async processSingleImage(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      // Step 1: Extract text using enhanced OCR
      const ocrResult = await this.ocrProcessor.processImage(imageUrl);
      const ocrText = ocrResult.fullText || '';
      
      // Step 2: Detect brand with multiple methods
      const brandResult = await this.brandDetector.detectBrand(ocrText, {
        imageUrl,
        useVisualDetection: true,
        useFuzzyMatching: true,
        confidenceThreshold: 0.6
      });
      
      // Step 3: Extract size with context
      const sizeResult = await this.sizeProcessor.extractSize(ocrText, {
        category: 'clothing',
        brand: brandResult.brand
      });
      
      // Step 4: Detect material and care instructions
      const materials = this.extractMaterials(ocrText);
      const material = materials[0] || undefined;
      
      // Step 5: Assess condition from visual and text cues
      const condition = await this.assessCondition(imageUrl, ocrText);
      
      // Step 6: Detect color (placeholder - would use computer vision)
      const color = await this.detectColor(imageUrl);
      
      // Step 7: Categorize item
      const category = this.categorizeItem(ocrText, brandResult.brand);
      
      // Step 8: Extract style descriptors
      const style = this.extractStyle(ocrText);
      
      // Step 9: Optimize keywords
      const keywordResult = await this.keywordOptimizer.optimizeKeywordExtraction(
        ocrText,
        [],
        category || 'clothing',
        brandResult.brand,
        color
      );
      
      // Step 10: Calculate confidence
      const confidence = this.calculateConfidence({
        brand: brandResult.confidence,
        size: sizeResult.confidence,
        ocr: ocrResult.confidence || 0.5,
        keywords: keywordResult.qualityScore
      });
      
      return {
        brand: brandResult.brand,
        size: sizeResult.size,
        color,
        condition,
        category,
        material,
        style,
        keywords: keywordResult.combinedKeywords,
        confidence,
        ocrText
      };
      
    } catch (error) {
      console.error('❌ [SINGLE-IMAGE] Processing error:', error);
      return this.getEmptyResult();
    }
  }

  /**
   * Combine results from multiple images intelligently
   */
  private async combineResults(results: ImageAnalysisResult[]): Promise<ImageAnalysisResult> {
    // Use voting and confidence weighting to determine best values
    
    // Brand: Use highest confidence detection
    const brand = this.selectBestValue(results, 'brand');
    
    // Size: Use most common or highest confidence
    const size = this.selectBestValue(results, 'size');
    
    // Color: Use most common
    const color = this.selectMostCommon(results, 'color');
    
    // Condition: Use worst detected (conservative approach)
    const condition = this.selectWorstCondition(results);
    
    // Category: Use most specific
    const category = this.selectMostSpecific(results, 'category');
    
    // Material: Combine all unique materials found
    const materials = this.combineUnique(results, 'material');
    
    // Style: Combine unique styles
    const styles = this.combineUnique(results, 'style');
    
    // Keywords: Merge and deduplicate
    const allKeywords = results.flatMap(r => r.keywords);
    const uniqueKeywords = Array.from(new Set(allKeywords));
    
    // OCR Text: Combine all unique text
    const combinedOCR = results.map(r => r.ocrText).join(' ');
    
    // Overall confidence: Weighted average
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    return {
      brand,
      size,
      color,
      condition,
      category,
      material: materials[0],
      style: styles[0],
      keywords: uniqueKeywords.slice(0, 20),
      confidence: avgConfidence,
      ocrText: combinedOCR
    };
  }

  /**
   * Find the best image based on analysis quality
   */
  private findBestImage(results: ImageAnalysisResult[]): number {
    let bestIndex = 0;
    let bestScore = 0;
    
    results.forEach((result, idx) => {
      let score = result.confidence;
      
      // Bonus for having brand
      if (result.brand && result.brand !== 'Unbranded') score += 0.2;
      
      // Bonus for having size
      if (result.size) score += 0.15;
      
      // Bonus for longer OCR text (more information)
      if (result.ocrText.length > 50) score += 0.1;
      
      // Bonus for having keywords
      if (result.keywords.length > 5) score += 0.1;
      
      if (score > bestScore) {
        bestScore = score;
        bestIndex = idx;
      }
    });
    
    return bestIndex;
  }

  /**
   * Calculate overall accuracy score
   */
  private async calculateAccuracyScore(
    combined: ImageAnalysisResult,
    individual: ImageAnalysisResult[]
  ): Promise<number> {
    let score = 0;
    let factors = 0;
    
    // Brand detection
    if (combined.brand && combined.brand !== 'Unbranded') {
      score += 0.25;
      factors++;
    }
    
    // Size extraction
    if (combined.size) {
      score += 0.2;
      factors++;
    }
    
    // Color detection
    if (combined.color) {
      score += 0.15;
      factors++;
    }
    
    // Condition assessment
    if (combined.condition) {
      score += 0.1;
      factors++;
    }
    
    // Category classification
    if (combined.category && combined.category !== 'clothing') {
      score += 0.1;
      factors++;
    }
    
    // Keyword quality
    if (combined.keywords.length >= 8) {
      score += 0.15;
      factors++;
    }
    
    // OCR quality
    if (combined.ocrText.length > 100) {
      score += 0.05;
      factors++;
    }
    
    return factors > 0 ? score : 0;
  }

  /**
   * Generate optimization suggestions based on analysis
   */
  private async generateOptimizationSuggestions(
    combined: ImageAnalysisResult,
    individual: ImageAnalysisResult[],
    qualityScores: number[]
  ): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Image quality suggestions
    const lowQualityCount = qualityScores.filter(s => s < this.IMAGE_QUALITY_THRESHOLD).length;
    if (lowQualityCount > 0) {
      suggestions.push(`📸 ${lowQualityCount} image(s) have low quality. Take clearer, well-lit photos`);
    }
    
    // Brand detection suggestions
    if (!combined.brand || combined.brand === 'Unbranded') {
      suggestions.push('🏷️ No brand detected. Include clear shots of brand tags and logos');
    }
    
    // Size extraction suggestions
    if (!combined.size) {
      suggestions.push('📏 Size not detected. Photograph size labels clearly');
    }
    
    // OCR quality suggestions
    if (combined.ocrText.length < 50) {
      suggestions.push('📝 Limited text extracted. Include close-ups of all text labels');
    }
    
    // Multiple angle suggestions
    if (individual.length < 3) {
      suggestions.push('🔄 Add more photos from different angles for better analysis');
    }
    
    // Consistency suggestions
    const brandVariations = new Set(individual.map(r => r.brand).filter(Boolean));
    if (brandVariations.size > 1) {
      suggestions.push('⚠️ Conflicting brand detections. Ensure all photos are of the same item');
    }
    
    return suggestions;
  }

  /**
   * Track analysis with AI Accuracy Agent
   */
  private async trackAnalysis(
    analysis: ImageAnalysisResult,
    imageUrls: string[],
    userId: string,
    itemId?: string
  ): Promise<void> {
    try {
      await aiAccuracyAgent.trackPrediction({
        itemId: itemId || `temp_${Date.now()}`,
        userId,
        predictedData: {
          title: this.generateTitle(analysis),
          brand: analysis.brand || null,
          size: analysis.size || null,
          condition: analysis.condition || 'Good',
          category: analysis.category || 'Clothing',
          color: analysis.color || null,
          keywords: analysis.keywords,
          specifics: {
            material: analysis.material,
            style: analysis.style
          }
        },
        confidence: analysis.confidence,
        imageUrls,
        ocrText: analysis.ocrText,
        promptVersion: 'enhanced_multi_v1',
        modelUsed: 'ensemble',
        analysisMetrics: {
          openaiTokens: 0,
          googleVisionRequests: imageUrls.length,
          totalCostCents: Math.ceil(imageUrls.length * 1.5),
          analysisDurationMs: 0
        }
      });
    } catch (error) {
      console.error('❌ [TRACKING] Failed to track analysis:', error);
    }
  }

  // Helper methods

  private extractMaterials(text: string): string[] {
    const materials = [
      'cotton', 'polyester', 'wool', 'silk', 'leather', 'denim',
      'cashmere', 'linen', 'nylon', 'spandex', 'rayon', 'modal'
    ];
    
    return materials.filter(material => 
      new RegExp(`\\b${material}\\b`, 'i').test(text)
    );
  }

  private async assessCondition(imageUrl: string, ocrText: string): Promise<string> {
    if (/new with tags|nwt/i.test(ocrText)) return 'New with tags';
    if (/new without tags|nwot/i.test(ocrText)) return 'New without tags';
    if (/like new|excellent/i.test(ocrText)) return 'Like New';
    if (/good|gently/i.test(ocrText)) return 'Good';
    return 'Pre-owned';
  }

  private async detectColor(imageUrl: string): Promise<string> {
    // Placeholder - would use computer vision API
    const colors = ['Black', 'Blue', 'White', 'Gray', 'Red', 'Green', 'Navy', 'Brown'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private categorizeItem(text: string, brand?: string): string {
    const categories = {
      'shirt': /\b(shirt|tee|blouse|top)\b/i,
      'pants': /\b(pants|jeans|trousers|slacks)\b/i,
      'dress': /\b(dress|gown|sundress)\b/i,
      'jacket': /\b(jacket|coat|blazer|hoodie)\b/i,
      'shoes': /\b(shoes|sneakers|boots|sandals)\b/i
    };
    
    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(text)) return category;
    }
    
    return 'clothing';
  }

  private extractStyle(text: string): string | undefined {
    const styles = [
      'vintage', 'retro', 'modern', 'classic', 'casual',
      'formal', 'athletic', 'streetwear', 'bohemian'
    ];
    
    for (const style of styles) {
      if (new RegExp(`\\b${style}\\b`, 'i').test(text)) {
        return style;
      }
    }
    
    return undefined;
  }

  private selectBestValue(results: ImageAnalysisResult[], field: keyof ImageAnalysisResult): any {
    const values = results
      .filter(r => r[field] !== undefined && r[field] !== null)
      .sort((a, b) => b.confidence - a.confidence);
    
    return values.length > 0 ? values[0][field] : undefined;
  }

  private selectMostCommon(results: ImageAnalysisResult[], field: keyof ImageAnalysisResult): any {
    const values = results
      .map(r => r[field])
      .filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) return undefined;
    
    const counts = new Map();
    values.forEach(v => {
      counts.set(v, (counts.get(v) || 0) + 1);
    });
    
    let maxCount = 0;
    let mostCommon = values[0];
    
    counts.forEach((count, value) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    });
    
    return mostCommon;
  }

  private selectWorstCondition(results: ImageAnalysisResult[]): string {
    const conditionOrder = [
      'Pre-owned',
      'Good',
      'Like New',
      'New without tags',
      'New with tags'
    ];
    
    let worstIndex = conditionOrder.length;
    
    results.forEach(r => {
      if (r.condition) {
        const index = conditionOrder.indexOf(r.condition);
        if (index !== -1 && index < worstIndex) {
          worstIndex = index;
        }
      }
    });
    
    return worstIndex < conditionOrder.length ? conditionOrder[worstIndex] : 'Pre-owned';
  }

  private selectMostSpecific(results: ImageAnalysisResult[], field: keyof ImageAnalysisResult): any {
    const values = results
      .map(r => r[field])
      .filter(v => v !== undefined && v !== null && v !== 'clothing');
    
    return values.length > 0 ? values[0] : 'clothing';
  }

  private combineUnique(results: ImageAnalysisResult[], field: keyof ImageAnalysisResult): string[] {
    const values = new Set<string>();
    
    results.forEach(r => {
      const value = r[field];
      if (value && typeof value === 'string') {
        values.add(value);
      }
    });
    
    return Array.from(values);
  }

  private calculateConfidence(scores: Record<string, number>): number {
    const weights = {
      brand: 0.3,
      size: 0.25,
      ocr: 0.25,
      keywords: 0.2
    };
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    Object.entries(scores).forEach(([key, score]) => {
      const weight = weights[key as keyof typeof weights] || 0.1;
      weightedSum += score * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  private generateTitle(analysis: ImageAnalysisResult): string {
    const parts = [];
    
    // Core information (brand, item type, size, color)
    if (analysis.brand && analysis.brand !== 'Unbranded') {
      parts.push(analysis.brand);
    }
    
    if (analysis.category && analysis.category !== 'clothing') {
      parts.push(analysis.category.charAt(0).toUpperCase() + analysis.category.slice(1));
    } else {
      // Default to generic item type if category is just "clothing"
      parts.push('Item');
    }
    
    // Add gender hint if available in keywords
    const genderKeywords = ['mens', 'men', 'womens', 'women', 'unisex'];
    const foundGender = analysis.keywords.find(k => 
      genderKeywords.some(g => k.toLowerCase().includes(g))
    );
    if (foundGender) {
      parts.push(foundGender.charAt(0).toUpperCase() + foundGender.slice(1));
    }
    
    if (analysis.size) {
      parts.push(analysis.size);
    }
    
    if (analysis.color) {
      parts.push(analysis.color);
    }
    
    // Build base title
    let title = parts.join(' ');
    
    // Add relevant keywords to fill up to 80 characters
    const remainingSpace = 80 - title.length;
    if (remainingSpace > 5 && analysis.keywords.length > 0) {
      // Priority keywords for eBay optimization
      const priorityKeywords = analysis.keywords.filter(keyword => {
        const kw = keyword.toLowerCase();
        return !parts.some(part => part.toLowerCase().includes(kw)) && // Not already in title
               kw.length > 2 && // Not too short
               kw.length < 15 && // Not too long
               !['item', 'clothing', 'the', 'and', 'or', 'with', 'for'].includes(kw) && // Not generic
               /^[a-zA-Z0-9\s-]+$/.test(kw); // Only alphanumeric
      });
      
      let additionalKeywords = [];
      let currentLength = title.length;
      
      for (const keyword of priorityKeywords) {
        const spacedKeyword = ` ${keyword}`;
        if (currentLength + spacedKeyword.length <= 80) {
          additionalKeywords.push(keyword);
          currentLength += spacedKeyword.length;
        } else {
          break;
        }
      }
      
      if (additionalKeywords.length > 0) {
        title += ' ' + additionalKeywords.join(' ');
      }
    }
    
    // Add condition indicator if space allows
    if (analysis.condition && analysis.condition.includes('New')) {
      const nwtText = ' NWT';
      if (title.length + nwtText.length <= 80) {
        title += nwtText;
      }
    }
    
    // Ensure we don't exceed 80 characters
    return title.substring(0, 80).trim();
  }

  private getEmptyResult(): ImageAnalysisResult {
    return {
      keywords: [],
      confidence: 0,
      ocrText: ''
    };
  }
}

// Export singleton instance
export const enhancedMultiImageProcessor = new EnhancedMultiImageProcessor();