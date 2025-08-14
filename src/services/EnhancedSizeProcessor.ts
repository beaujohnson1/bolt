/**
 * Enhanced Size Standardization System
 * Advanced size processing with eBay-compliant formatting and multi-format support
 */

export interface SizeMatch {
  standardSize: string;
  originalInput: string;
  confidence: number;
  sizeType: 'letter' | 'numeric' | 'measurement' | 'international' | 'age';
  gender?: 'men' | 'women' | 'unisex' | 'kids';
  category?: 'clothing' | 'shoes' | 'accessories';
  ebayCompliant: boolean;
}

export interface SizeMapping {
  input: string | RegExp;
  output: string;
  gender?: 'men' | 'women' | 'unisex' | 'kids';
  category?: 'clothing' | 'shoes' | 'accessories';
  confidence: number;
}

export class EnhancedSizeProcessor {
  private letterSizeMappings: SizeMapping[] = [
    // Standard Letter Sizes
    { input: /^(xs|extra\s?small|x-small)$/i, output: 'Extra Small', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    { input: /^(sm?|small)$/i, output: 'Small', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    { input: /^(md?|medium|med)$/i, output: 'Medium', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    { input: /^(lg?|large)$/i, output: 'Large', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    { input: /^(xl|extra\s?large|x-large)$/i, output: 'Extra Large', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    { input: /^(xxl|2xl|xx-large|2x-large)$/i, output: '2X Large', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    { input: /^(xxxl|3xl|xxx-large|3x-large)$/i, output: '3X Large', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    { input: /^(4xl|xxxxl|4x-large)$/i, output: '4X Large', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    { input: /^(5xl|xxxxxl|5x-large)$/i, output: '5X Large', confidence: 0.95, gender: 'unisex', category: 'clothing' },

    // Plus Size Variations
    { input: /^(1x|plus\s?1x)$/i, output: '1X', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^(2x|plus\s?2x)$/i, output: '2X', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^(3x|plus\s?3x)$/i, output: '3X', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^(4x|plus\s?4x)$/i, output: '4X', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^(5x|plus\s?5x)$/i, output: '5X', confidence: 0.9, gender: 'women', category: 'clothing' }
  ];

  private numericSizeMappings: SizeMapping[] = [
    // Women's Clothing Sizes
    { input: /^0$/, output: '0', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^2$/, output: '2', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^4$/, output: '4', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^6$/, output: '6', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^8$/, output: '8', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^10$/, output: '10', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^12$/, output: '12', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^14$/, output: '14', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^16$/, output: '16', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^18$/, output: '18', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^20$/, output: '20', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^22$/, output: '22', confidence: 0.9, gender: 'women', category: 'clothing' },
    { input: /^24$/, output: '24', confidence: 0.9, gender: 'women', category: 'clothing' },

    // Men's Shirt Sizes (neck sizes)
    { input: /^(14|14\.5|15|15\.5|16|16\.5|17|17\.5|18|18\.5|19|19\.5|20)$/, output: '$1', confidence: 0.85, gender: 'men', category: 'clothing' },

    // Waist Sizes (both men and women)
    { input: /^(2[4-9]|3[0-9]|4[0-8])$/, output: '$1', confidence: 0.8, gender: 'unisex', category: 'clothing' }
  ];

  private shoeSizeMappings: SizeMapping[] = [
    // US Shoe Sizes
    { input: /^(3|3\.5|4|4\.5|5|5\.5|6|6\.5|7|7\.5|8|8\.5|9|9\.5|10|10\.5|11|11\.5|12|12\.5|13|13\.5|14|14\.5|15|15\.5|16)$/, output: '$1', confidence: 0.9, gender: 'unisex', category: 'shoes' }
  ];

  private measurementMappings: SizeMapping[] = [
    // Pants Size Patterns - HIGHEST PRIORITY
    // Standard waist x length format (32x34, 30x32, etc)
    { input: /^(\d{2,3})\s*[xX×]\s*(\d{2,3})$/i, output: '$1x$2', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    
    // W32L34 format
    { input: /^[Ww](\d{2,3})[Ll](\d{2,3})$/i, output: '$1x$2', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    
    // 32W 34L format
    { input: /^(\d{2,3})\s*[Ww]\s*(\d{2,3})\s*[Ll]$/i, output: '$1x$2', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    
    // Waist 32 Length 34 format
    { input: /^waist[:\s]*(\d{2,3})\s*length[:\s]*(\d{2,3})$/i, output: '$1x$2', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    
    // 32/34 format (slash separator)
    { input: /^(\d{2,3})\/(\d{2,3})$/i, output: '$1x$2', confidence: 0.9, gender: 'unisex', category: 'clothing' },
    
    // Size: 32x34 format (with prefix)
    { input: /^(?:size|sz)[:\s]*(\d{2,3})\s*[xX×]\s*(\d{2,3})$/i, output: '$1x$2', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    
    // W: 32 L: 34 format
    { input: /^[Ww][:\s]*(\d{2,3})\s*[Ll][:\s]*(\d{2,3})$/i, output: '$1x$2', confidence: 0.95, gender: 'unisex', category: 'clothing' },
    
    // Chest/Bust measurements
    { input: /^(\d{2,3})\s?(cm|centimeter)s?$/i, output: '$1cm', confidence: 0.8, gender: 'unisex', category: 'clothing' },
    { input: /^(\d{1,2})\s?(in|inch|")$/i, output: '$1"', confidence: 0.8, gender: 'unisex', category: 'clothing' },
    
    // Single waist measurements (when length not specified)
    { input: /^(\d{2,3})\s?cm\s?(waist|w)$/i, output: '$1cm waist', confidence: 0.85, gender: 'unisex', category: 'clothing' },
    { input: /^(\d{1,2})\s?(in|inch|")\s?(waist|w)$/i, output: '$1" waist', confidence: 0.85, gender: 'unisex', category: 'clothing' },
    { input: /^waist[:\s]*(\d{2,3})$/i, output: '$1" waist', confidence: 0.85, gender: 'unisex', category: 'clothing' },
    { input: /^[Ww][:\s]*(\d{2,3})$/i, output: '$1" waist', confidence: 0.85, gender: 'unisex', category: 'clothing' },
    
    // Single length/inseam measurements
    { input: /^(\d{2,3})\s?cm\s?(length|l|inseam)$/i, output: '$1cm length', confidence: 0.8, gender: 'unisex', category: 'clothing' },
    { input: /^(\d{1,2})\s?(in|inch|")\s?(length|l|inseam)$/i, output: '$1" length', confidence: 0.8, gender: 'unisex', category: 'clothing' },
    { input: /^(?:length|inseam)[:\s]*(\d{2,3})$/i, output: '$1" length', confidence: 0.8, gender: 'unisex', category: 'clothing' },
    { input: /^[Ll][:\s]*(\d{2,3})$/i, output: '$1" length', confidence: 0.8, gender: 'unisex', category: 'clothing' }
  ];

  private internationalSizeMappings: SizeMapping[] = [
    // European Pants Sizes (Men's)
    { input: /^(4[4-9]|5[0-9]|6[0-4])$/, output: 'EU $1', confidence: 0.7, gender: 'men', category: 'clothing' },
    
    // European Pants Sizes (Women's)  
    { input: /^(3[4-9]|4[0-9]|5[0-6])$/, output: 'EU $1', confidence: 0.7, gender: 'women', category: 'clothing' },
    
    // European size with explicit prefix
    { input: /^(?:eu|eur|european)[:\s]*(\d{2})$/i, output: 'EU $1', confidence: 0.85, gender: 'unisex', category: 'clothing' },
    
    // UK Sizes
    { input: /^uk\s?(\d{1,2})$/i, output: 'UK $1', confidence: 0.8, gender: 'unisex', category: 'clothing' },
    
    // French sizing (common for pants)
    { input: /^(?:fr|french)[:\s]*(\d{2})$/i, output: 'FR $1', confidence: 0.8, gender: 'unisex', category: 'clothing' },
    
    // Italian sizing
    { input: /^(?:it|ita|italian)[:\s]*(\d{2})$/i, output: 'IT $1', confidence: 0.8, gender: 'unisex', category: 'clothing' },
    
    // Japanese Sizes
    { input: /^(?:jp|jpn|japanese)[:\s]*(\d{1,2})$/i, output: 'JP $1', confidence: 0.8, gender: 'unisex', category: 'clothing' }
  ];

  private ageSizeMappings: SizeMapping[] = [
    // Baby sizes
    { input: /^(nb|newborn)$/i, output: 'Newborn', confidence: 0.95, gender: 'kids', category: 'clothing' },
    { input: /^(0-3|0-3m|0-3\s?months?)$/i, output: '0-3 Months', confidence: 0.95, gender: 'kids', category: 'clothing' },
    { input: /^(3-6|3-6m|3-6\s?months?)$/i, output: '3-6 Months', confidence: 0.95, gender: 'kids', category: 'clothing' },
    { input: /^(6-9|6-9m|6-9\s?months?)$/i, output: '6-9 Months', confidence: 0.95, gender: 'kids', category: 'clothing' },
    { input: /^(9-12|9-12m|9-12\s?months?)$/i, output: '9-12 Months', confidence: 0.95, gender: 'kids', category: 'clothing' },
    { input: /^(12-18|12-18m|12-18\s?months?)$/i, output: '12-18 Months', confidence: 0.95, gender: 'kids', category: 'clothing' },
    { input: /^(18-24|18-24m|18-24\s?months?)$/i, output: '18-24 Months', confidence: 0.95, gender: 'kids', category: 'clothing' },

    // Toddler sizes
    { input: /^(2t|2\s?toddler)$/i, output: '2T', confidence: 0.95, gender: 'kids', category: 'clothing' },
    { input: /^(3t|3\s?toddler)$/i, output: '3T', confidence: 0.95, gender: 'kids', category: 'clothing' },
    { input: /^(4t|4\s?toddler)$/i, output: '4T', confidence: 0.95, gender: 'kids', category: 'clothing' },
    { input: /^(5t|5\s?toddler)$/i, output: '5T', confidence: 0.95, gender: 'kids', category: 'clothing' },

    // Kids sizes
    { input: /^(xs|4-5|4\/5)$/i, output: 'XS (4-5)', confidence: 0.9, gender: 'kids', category: 'clothing' },
    { input: /^(sm?|6-7|6\/7)$/i, output: 'S (6-7)', confidence: 0.9, gender: 'kids', category: 'clothing' },
    { input: /^(md?|8-10|8\/10)$/i, output: 'M (8-10)', confidence: 0.9, gender: 'kids', category: 'clothing' },
    { input: /^(lg?|12-14|12\/14)$/i, output: 'L (12-14)', confidence: 0.9, gender: 'kids', category: 'clothing' },
    { input: /^(xl|16-18|16\/18)$/i, output: 'XL (16-18)', confidence: 0.9, gender: 'kids', category: 'clothing' }
  ];

  /**
   * Process and standardize size input
   */
  async processSize(
    input: string,
    genderHint?: 'men' | 'women' | 'unisex' | 'kids',
    categoryHint?: 'clothing' | 'shoes' | 'accessories'
  ): Promise<SizeMatch[]> {
    const matches: SizeMatch[] = [];
    const normalizedInput = this.normalizeInput(input);
    
    console.log('📏 [SIZE-PROCESSOR] Processing size:', input);
    
    // Try different size formats
    const allMappings = [
      ...this.letterSizeMappings,
      ...this.numericSizeMappings,
      ...this.shoeSizeMappings,
      ...this.measurementMappings,
      ...this.internationalSizeMappings,
      ...this.ageSizeMappings
    ];

    for (const mapping of allMappings) {
      const match = this.testMapping(normalizedInput, mapping, genderHint, categoryHint);
      if (match) {
        matches.push(match);
      }
    }

    // Rank and filter matches
    const rankedMatches = this.rankMatches(matches, genderHint, categoryHint);
    
    console.log('✅ [SIZE-PROCESSOR] Found sizes:', rankedMatches.map(m => m.standardSize));
    
    return rankedMatches;
  }

  /**
   * Test a mapping against input
   */
  private testMapping(
    input: string,
    mapping: SizeMapping,
    genderHint?: string,
    categoryHint?: string
  ): SizeMatch | null {
    let match: RegExpMatchArray | null = null;
    
    if (mapping.input instanceof RegExp) {
      match = input.match(mapping.input);
    } else {
      if (input.toLowerCase() === mapping.input.toLowerCase()) {
        match = [input];
      }
    }
    
    if (!match) return null;
    
    // Calculate confidence based on context matching
    let confidence = mapping.confidence;
    
    // Boost confidence for matching gender
    if (genderHint && mapping.gender === genderHint) {
      confidence *= 1.2;
    } else if (genderHint && mapping.gender && mapping.gender !== genderHint && mapping.gender !== 'unisex') {
      confidence *= 0.7;
    }
    
    // Boost confidence for matching category
    if (categoryHint && mapping.category === categoryHint) {
      confidence *= 1.1;
    }
    
    // Determine size type
    const sizeType = this.determineSizeType(mapping);
    
    // Generate standardized output
    let standardSize = mapping.output;
    if (match.length > 1) {
      // Replace captured groups
      for (let i = 1; i < match.length; i++) {
        standardSize = standardSize.replace(`$${i}`, match[i]);
      }
    }
    
    return {
      standardSize,
      originalInput: input,
      confidence: Math.min(1.0, confidence),
      sizeType,
      gender: mapping.gender,
      category: mapping.category,
      ebayCompliant: this.isEbayCompliant(standardSize, sizeType)
    };
  }

  /**
   * Determine size type from mapping
   */
  private determineSizeType(mapping: SizeMapping): SizeMatch['sizeType'] {
    if (this.letterSizeMappings.includes(mapping)) return 'letter';
    if (this.numericSizeMappings.includes(mapping)) return 'numeric';
    if (this.shoeSizeMappings.includes(mapping)) return 'numeric';
    if (this.measurementMappings.includes(mapping)) return 'measurement';
    if (this.internationalSizeMappings.includes(mapping)) return 'international';
    if (this.ageSizeMappings.includes(mapping)) return 'age';
    return 'letter';
  }

  /**
   * Check if size format is eBay compliant
   */
  private isEbayCompliant(size: string, type: SizeMatch['sizeType']): boolean {
    // eBay prefers standardized formats
    const compliantPatterns = [
      /^(Extra Small|Small|Medium|Large|Extra Large|[2-5]X Large)$/,
      /^[0-9]+(\.[0-9]+)?$/,
      /^[0-9]+(cm|"|in)(\s+(waist|length))?$/i,
      /^(EU|UK|JP)\s+[0-9]+$/,
      /^[0-9]+-[0-9]+\s+Months$/,
      /^[0-9]+T$/,
      /^(XS|S|M|L|XL)\s+\([0-9]+-[0-9]+\)$/
    ];
    
    return compliantPatterns.some(pattern => pattern.test(size));
  }

  /**
   * Rank matches by relevance
   */
  private rankMatches(
    matches: SizeMatch[],
    genderHint?: string,
    categoryHint?: string
  ): SizeMatch[] {
    // Remove duplicates (keep highest confidence)
    const uniqueMatches = new Map<string, SizeMatch>();
    
    matches.forEach(match => {
      const key = `${match.standardSize}_${match.sizeType}`;
      const existing = uniqueMatches.get(key);
      if (!existing || match.confidence > existing.confidence) {
        uniqueMatches.set(key, match);
      }
    });
    
    return Array.from(uniqueMatches.values())
      .filter(match => match.confidence > 0.4) // Minimum confidence
      .sort((a, b) => {
        // Primary sort: eBay compliance
        if (a.ebayCompliant !== b.ebayCompliant) {
          return a.ebayCompliant ? -1 : 1;
        }
        
        // Secondary sort: confidence
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        
        // Tertiary sort: prefer more specific types
        const typePreference = ['letter', 'numeric', 'age', 'measurement', 'international'];
        const aIndex = typePreference.indexOf(a.sizeType);
        const bIndex = typePreference.indexOf(b.sizeType);
        return aIndex - bIndex;
      })
      .slice(0, 3); // Return top 3 matches
  }

  /**
   * Normalize input text
   */
  private normalizeInput(input: string): string {
    return input
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.-]/g, '') // Keep only alphanumeric, spaces, dots, dashes
      .toLowerCase();
  }

  /**
   * Convert size to eBay-optimized format
   */
  optimizeForEbay(size: string, gender?: string, category?: string): string {
    // Process the size to get standardized format
    const matches = this.processSize(size, gender as any, category as any);
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      if (bestMatch.ebayCompliant) {
        return bestMatch.standardSize;
      }
    }
    
    // Fallback to original size if no good match
    return size;
  }

  /**
   * Get size conversion chart
   */
  getSizeConversions(size: string): Record<string, string> {
    const conversions: Record<string, string> = {};
    
    // Letter to numeric conversions (women's clothing)
    const letterToNumeric: Record<string, string> = {
      'Extra Small': '0-2',
      'Small': '4-6',
      'Medium': '8-10',
      'Large': '12-14',
      'Extra Large': '16-18',
      '2X Large': '20-22',
      '3X Large': '24-26'
    };
    
    // Add conversions if available
    if (letterToNumeric[size]) {
      conversions['Numeric'] = letterToNumeric[size];
    }
    
    return conversions;
  }

  /**
   * Validate size input
   */
  validateSize(size: string): {
    isValid: boolean;
    suggestions: string[];
    issues: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check for common issues
    if (size.length < 1) {
      issues.push('Size cannot be empty');
      return { isValid: false, suggestions: [], issues };
    }
    
    if (size.length > 20) {
      issues.push('Size too long (max 20 characters)');
    }
    
    if (/[^a-zA-Z0-9\s.-]/.test(size)) {
      issues.push('Contains invalid characters');
      suggestions.push('Remove special characters except dots and dashes');
    }
    
    // Try to process the size
    const matches = this.processSize(size);
    
    if (matches.length === 0) {
      issues.push('Unrecognized size format');
      suggestions.push('Try standard formats like: S, M, L, XL, or numeric sizes');
    } else if (!matches[0].ebayCompliant) {
      suggestions.push(`Consider using: ${matches[0].standardSize}`);
    }
    
    return {
      isValid: issues.length === 0,
      suggestions,
      issues
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      totalMappings: [
        ...this.letterSizeMappings,
        ...this.numericSizeMappings,
        ...this.shoeSizeMappings,
        ...this.measurementMappings,
        ...this.internationalSizeMappings,
        ...this.ageSizeMappings
      ].length,
      mappingsByType: {
        letter: this.letterSizeMappings.length,
        numeric: this.numericSizeMappings.length,
        shoes: this.shoeSizeMappings.length,
        measurement: this.measurementMappings.length,
        international: this.internationalSizeMappings.length,
        age: this.ageSizeMappings.length
      },
      supportedGenders: ['men', 'women', 'unisex', 'kids'],
      supportedCategories: ['clothing', 'shoes', 'accessories']
    };
  }
}

export const enhancedSizeProcessor = new EnhancedSizeProcessor();