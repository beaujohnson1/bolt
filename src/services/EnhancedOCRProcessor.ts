/**
 * Enhanced OCR Post-Processing System
 * Advanced text region classification and pattern recognition for clothing items
 */

export interface OCRRegion {
  text: string;
  confidence: number;
  category: 'brand' | 'size' | 'care' | 'material' | 'price' | 'model' | 'other';
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OCRProcessingResult {
  regions: OCRRegion[];
  extractedData: {
    brands: string[];
    sizes: string[];
    materials: string[];
    careInstructions: string[];
    modelNumbers: string[];
  };
  confidence: number;
  processingTime: number;
}

export class EnhancedOCRProcessor {
  private brandPatterns = [
    // Major clothing brands
    /\b(nike|adidas|puma|under armour|reebok|new balance|converse)\b/i,
    /\b(ralph lauren|polo|tommy hilfiger|calvin klein|hugo boss)\b/i,
    /\b(gap|old navy|banana republic|j\.crew|jcrew)\b/i,
    /\b(levi'?s|wrangler|lee|true religion|diesel)\b/i,
    /\b(north face|patagonia|columbia|rei|outdoor research)\b/i,
    /\b(lululemon|athleta|fabletics|sweaty betty)\b/i,
    /\b(zara|h&m|uniqlo|forever 21|urban outfitters)\b/i,
    /\b(american eagle|hollister|abercrombie|aeropostale)\b/i,
    /\b(champion|hanes|fruit of the loom|gildan)\b/i,
    /\b(carhartt|dickies|timberland|dr\.?\s?martens)\b/i
  ];

  private sizePatterns = [
    // Standard sizes
    /\b(xs|extra small|x-small)\b/i,
    /\b(sm?|small)\b/i,
    /\b(md?|medium|med)\b/i,
    /\b(lg?|large)\b/i,
    /\b(xl|extra large|x-large)\b/i,
    /\b(xxl|2xl|xx-large|2x-large)\b/i,
    /\b(xxxl|3xl|xxx-large|3x-large)\b/i,
    
    // Numeric sizes
    /\b(size\s+)?\d{1,2}(\.\d+)?\b/i,
    /\b\d{2,3}[lrws]?\b/i, // 32W, 34L, etc.
    
    // Measurements
    /\b\d{1,2}['"]?\s*(x|by|\×)\s*\d{1,2}['"]?\b/i,
    /\b\d{1,2}\.?\d*\s*(inch|in|cm|mm)\b/i
  ];

  private materialPatterns = [
    /\b(cotton|poly|polyester|wool|silk|linen|rayon|viscose)\b/i,
    /\b(spandex|elastane|lycra|modal|bamboo|cashmere)\b/i,
    /\b(denim|canvas|leather|suede|fleece|jersey)\b/i,
    /\b(\d{1,3}%\s*(cotton|poly|polyester|wool|silk|spandex))\b/i
  ];

  private carePatterns = [
    /\b(machine wash|hand wash|dry clean|do not wash)\b/i,
    /\b(tumble dry|air dry|hang dry|do not dry)\b/i,
    /\b(iron|do not iron|low heat|medium heat|high heat)\b/i,
    /\b(bleach|do not bleach|non-chlorine)\b/i
  ];

  /**
   * Process OCR text with enhanced pattern recognition
   */
  async processOCRText(ocrText: string): Promise<OCRProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Clean and normalize text
      const cleanedText = this.cleanOCRText(ocrText);
      
      // Split into regions and classify
      const regions = this.classifyTextRegions(cleanedText);
      
      // Extract structured data
      const extractedData = this.extractStructuredData(regions);
      
      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(regions);
      
      const processingTime = Date.now() - startTime;
      
      return {
        regions,
        extractedData,
        confidence,
        processingTime
      };
      
    } catch (error) {
      console.error('Enhanced OCR processing error:', error);
      return {
        regions: [],
        extractedData: {
          brands: [],
          sizes: [],
          materials: [],
          careInstructions: [],
          modelNumbers: []
        },
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Clean and normalize OCR text
   */
  private cleanOCRText(text: string): string {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Fix common OCR errors
      .replace(/[il1|]/g, 'I') // Common I/l/1 confusion
      .replace(/[o0]/g, 'O') // O/0 confusion
      .replace(/[5S]/g, 'S') // S/5 confusion
      // Normalize punctuation
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .trim();
  }

  /**
   * Classify text regions by content type
   */
  private classifyTextRegions(text: string): OCRRegion[] {
    const sentences = text.split(/[.!?;]/);
    const words = text.split(/\s+/);
    const regions: OCRRegion[] = [];

    // Process sentences for context
    sentences.forEach(sentence => {
      if (!sentence.trim()) return;
      
      const category = this.classifyTextCategory(sentence);
      const confidence = this.calculateRegionConfidence(sentence, category);
      
      regions.push({
        text: sentence.trim(),
        confidence,
        category
      });
    });

    // Process individual words for specific patterns
    words.forEach(word => {
      if (word.length < 2) return;
      
      const category = this.classifyWordCategory(word);
      if (category !== 'other') {
        const confidence = this.calculateWordConfidence(word, category);
        
        regions.push({
          text: word,
          confidence,
          category
        });
      }
    });

    return regions;
  }

  /**
   * Classify text category based on patterns
   */
  private classifyTextCategory(text: string): OCRRegion['category'] {
    // Brand detection
    if (this.brandPatterns.some(pattern => pattern.test(text))) {
      return 'brand';
    }
    
    // Size detection
    if (this.sizePatterns.some(pattern => pattern.test(text))) {
      return 'size';
    }
    
    // Material detection
    if (this.materialPatterns.some(pattern => pattern.test(text))) {
      return 'material';
    }
    
    // Care instruction detection
    if (this.carePatterns.some(pattern => pattern.test(text))) {
      return 'care';
    }
    
    // Price detection
    if (/\$\d+(\.\d{2})?|\d+\.\d{2}|price/i.test(text)) {
      return 'price';
    }
    
    // Model number detection
    if (/\b[A-Z0-9]{3,}\b|\bmodel\b|\bsku\b|\bstyle\b/i.test(text)) {
      return 'model';
    }
    
    return 'other';
  }

  /**
   * Classify individual word category
   */
  private classifyWordCategory(word: string): OCRRegion['category'] {
    // Single word brand detection
    if (this.brandPatterns.some(pattern => pattern.test(word))) {
      return 'brand';
    }
    
    // Single word size detection
    if (/^(xs|sm?|md?|lg?|xl{1,3}|[2-9]xl)$/i.test(word)) {
      return 'size';
    }
    
    // Numeric size
    if (/^\d{1,2}(\.\d)?$/.test(word)) {
      return 'size';
    }
    
    return 'other';
  }

  /**
   * Calculate confidence score for a region
   */
  private calculateRegionConfidence(text: string, category: OCRRegion['category']): number {
    let confidence = 0.5; // Base confidence
    
    switch (category) {
      case 'brand':
        // Higher confidence for exact brand matches
        if (this.brandPatterns.some(pattern => {
          const matches = text.match(pattern);
          return matches && matches[0].length > 3;
        })) {
          confidence = 0.9;
        } else {
          confidence = 0.7;
        }
        break;
        
      case 'size':
        // High confidence for standard size formats
        if (/^(xs|sm?|md?|lg?|xl{1,3})$/i.test(text.trim())) {
          confidence = 0.95;
        } else if (/^\d{1,2}$/.test(text.trim())) {
          confidence = 0.8;
        } else {
          confidence = 0.6;
        }
        break;
        
      case 'material':
        confidence = 0.8;
        break;
        
      case 'care':
        confidence = 0.7;
        break;
        
      case 'price':
        confidence = 0.9;
        break;
        
      case 'model':
        confidence = 0.6;
        break;
        
      default:
        confidence = 0.3;
    }
    
    // Adjust for text quality indicators
    if (text.length < 3) confidence *= 0.7;
    if (/[^a-zA-Z0-9\s.,%-]/.test(text)) confidence *= 0.8; // Special chars
    if (text.toUpperCase() === text && text.length > 1) confidence *= 1.1; // All caps
    
    return Math.min(1.0, Math.max(0.1, confidence));
  }

  /**
   * Calculate confidence for individual words
   */
  private calculateWordConfidence(word: string, category: OCRRegion['category']): number {
    let confidence = 0.8; // Higher base for single words
    
    if (category === 'brand') {
      confidence = 0.9;
    } else if (category === 'size') {
      confidence = 0.95;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Extract structured data from classified regions
   */
  private extractStructuredData(regions: OCRRegion[]): OCRProcessingResult['extractedData'] {
    const extractedData = {
      brands: [] as string[],
      sizes: [] as string[],
      materials: [] as string[],
      careInstructions: [] as string[],
      modelNumbers: [] as string[]
    };

    regions.forEach(region => {
      if (region.confidence < 0.5) return; // Skip low confidence regions
      
      switch (region.category) {
        case 'brand':
          const brandMatch = this.extractBrandFromText(region.text);
          if (brandMatch && !extractedData.brands.includes(brandMatch)) {
            extractedData.brands.push(brandMatch);
          }
          break;
          
        case 'size':
          const sizeMatch = this.extractSizeFromText(region.text);
          if (sizeMatch && !extractedData.sizes.includes(sizeMatch)) {
            extractedData.sizes.push(sizeMatch);
          }
          break;
          
        case 'material':
          const materials = this.extractMaterialsFromText(region.text);
          materials.forEach(material => {
            if (!extractedData.materials.includes(material)) {
              extractedData.materials.push(material);
            }
          });
          break;
          
        case 'care':
          if (!extractedData.careInstructions.includes(region.text)) {
            extractedData.careInstructions.push(region.text);
          }
          break;
          
        case 'model':
          const modelMatch = this.extractModelFromText(region.text);
          if (modelMatch && !extractedData.modelNumbers.includes(modelMatch)) {
            extractedData.modelNumbers.push(modelMatch);
          }
          break;
      }
    });

    return extractedData;
  }

  /**
   * Extract brand name from text
   */
  private extractBrandFromText(text: string): string | null {
    for (const pattern of this.brandPatterns) {
      const match = text.match(pattern);
      if (match) {
        return this.normalizeBrandName(match[0]);
      }
    }
    return null;
  }

  /**
   * Extract size from text
   */
  private extractSizeFromText(text: string): string | null {
    // Try standard size patterns first
    const standardMatch = text.match(/\b(xs|sm?|md?|lg?|xl{1,3}|[2-9]xl)\b/i);
    if (standardMatch) {
      return this.normalizeSizeName(standardMatch[0]);
    }
    
    // Try numeric sizes
    const numericMatch = text.match(/\b\d{1,2}(\.\d)?\b/);
    if (numericMatch) {
      return numericMatch[0];
    }
    
    return null;
  }

  /**
   * Extract materials from text
   */
  private extractMaterialsFromText(text: string): string[] {
    const materials: string[] = [];
    
    for (const pattern of this.materialPatterns) {
      const matches = text.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        matches.forEach(match => {
          const normalized = this.normalizeMaterialName(match);
          if (normalized && !materials.includes(normalized)) {
            materials.push(normalized);
          }
        });
      }
    }
    
    return materials;
  }

  /**
   * Extract model number from text
   */
  private extractModelFromText(text: string): string | null {
    const modelMatch = text.match(/\b[A-Z0-9]{3,}\b/);
    return modelMatch ? modelMatch[0] : null;
  }

  /**
   * Normalize brand name
   */
  private normalizeBrandName(brand: string): string {
    const normalized = brand.toLowerCase().trim();
    
    // Brand name corrections
    const corrections: Record<string, string> = {
      'polo': 'Polo Ralph Lauren',
      'j.crew': 'J.Crew',
      'jcrew': 'J.Crew',
      'levis': "Levi's",
      "levi's": "Levi's",
      'north face': 'The North Face',
      'dr.martens': 'Dr. Martens',
      'dr martens': 'Dr. Martens'
    };
    
    return corrections[normalized] || this.capitalizeWords(brand);
  }

  /**
   * Normalize size name
   */
  private normalizeSizeName(size: string): string {
    const normalized = size.toLowerCase().trim();
    
    const sizeMap: Record<string, string> = {
      'xs': 'Extra Small',
      'sm': 'Small',
      's': 'Small',
      'md': 'Medium',
      'm': 'Medium',
      'lg': 'Large',
      'l': 'Large',
      'xl': 'Extra Large',
      'xxl': '2X Large',
      '2xl': '2X Large',
      'xxxl': '3X Large',
      '3xl': '3X Large'
    };
    
    return sizeMap[normalized] || size.toUpperCase();
  }

  /**
   * Normalize material name
   */
  private normalizeMaterialName(material: string): string {
    const normalized = material.toLowerCase().trim();
    
    if (normalized.includes('%')) {
      return material; // Keep percentage format
    }
    
    const materialMap: Record<string, string> = {
      'poly': 'Polyester',
      'spandex': 'Spandex/Elastane'
    };
    
    return materialMap[normalized] || this.capitalizeWords(material);
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(regions: OCRRegion[]): number {
    if (regions.length === 0) return 0;
    
    const weightedScore = regions.reduce((sum, region) => {
      let weight = 1;
      
      // Weight important categories higher
      switch (region.category) {
        case 'brand': weight = 3; break;
        case 'size': weight = 2.5; break;
        case 'material': weight = 2; break;
        default: weight = 1;
      }
      
      return sum + (region.confidence * weight);
    }, 0);
    
    const totalWeight = regions.reduce((sum, region) => {
      switch (region.category) {
        case 'brand': return sum + 3;
        case 'size': return sum + 2.5;
        case 'material': return sum + 2;
        default: return sum + 1;
      }
    }, 0);
    
    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Capitalize words properly
   */
  private capitalizeWords(text: string): string {
    return text.replace(/\b\w+/g, word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      supportedBrands: this.brandPatterns.length * 5, // Approximate brands covered
      sizeFormats: this.sizePatterns.length,
      materialTypes: this.materialPatterns.length,
      careInstructions: this.carePatterns.length
    };
  }
}

export const enhancedOCRProcessor = new EnhancedOCRProcessor();