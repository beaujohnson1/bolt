/**
 * AI to eBay Item Specifics Mapper
 * Converts AI analysis results to eBay-compliant item specifics
 */

import { EbaySpecificsValidator } from './EbaySpecificsValidator';
import { EnhancedEbayService } from './EnhancedEbayService';

interface AIAnalysisResult {
  title?: string;
  brand?: string;
  size?: string;
  color?: string;
  item_type?: string;
  condition?: string;
  description?: string;
  suggested_price?: number;
  keywords?: string[];
  key_features?: string[];
  model_number?: string;
  evidence?: any;
  ebay_item_specifics?: Record<string, any>;
  confidence?: number;
  gender?: string;
  material?: string;
  pattern?: string;
  fit?: string;
  closure?: string;
  sleeve_length?: string;
  neckline?: string;
  style_keywords?: string[];
  ebay_keywords?: string[];
}

interface EBayItemSpecific {
  name: string;
  value: string;
  confidence: number;
  source: 'ai_analysis' | 'ai_specific' | 'derived' | 'fallback';
  validationStatus: 'valid' | 'invalid' | 'unknown';
}

interface MappingResult {
  success: boolean;
  specifics: EBayItemSpecific[];
  categoryId?: string;
  categoryName?: string;
  validationSummary: {
    total: number;
    valid: number;
    invalid: number;
    unknown: number;
  };
  mappingMetadata: {
    aiConfidence: number;
    hasEBaySpecifics: boolean;
    sourceBreakdown: Record<string, number>;
    suggestions: string[];
  };
  errors?: string[];
  warnings?: string[];
}

export class AIToEBaySpecificsMapper {
  private validator: EbaySpecificsValidator;
  private enhancedEbay: EnhancedEbayService;
  
  // Standard eBay attribute mappings
  private readonly STANDARD_MAPPINGS: Record<string, string> = {
    'brand': 'Brand',
    'size': 'Size',
    'color': 'Color',
    'material': 'Material',
    'pattern': 'Pattern',
    'gender': 'Department',
    'fit': 'Fit',
    'closure': 'Closure',
    'sleeve_length': 'Sleeve Length',
    'neckline': 'Neckline',
    'item_type': 'Type',
    'model_number': 'Model',
    'style': 'Style'
  };

  // Color normalization mapping
  private readonly COLOR_MAPPINGS: Record<string, string> = {
    'navy blue': 'Navy',
    'dark blue': 'Navy',
    'light blue': 'Blue',
    'sky blue': 'Blue',
    'olive green': 'Olive',
    'forest green': 'Green',
    'lime green': 'Green',
    'dark green': 'Green',
    'burgundy': 'Maroon',
    'wine': 'Maroon',
    'crimson': 'Red',
    'scarlet': 'Red',
    'off white': 'White',
    'cream': 'Beige',
    'tan': 'Beige',
    'khaki': 'Beige',
    'charcoal': 'Gray',
    'grey': 'Gray',
    'silver': 'Gray',
    'gold': 'Yellow',
    'rose': 'Pink',
    'fuchsia': 'Pink',
    'magenta': 'Pink',
    'purple': 'Purple',
    'violet': 'Purple',
    'lavender': 'Purple',
    'orange': 'Orange',
    'coral': 'Orange',
    'peach': 'Orange'
  };

  // Size normalization mapping
  private readonly SIZE_MAPPINGS: Record<string, string> = {
    'extra small': 'XS',
    'x-small': 'XS',
    'x small': 'XS',
    'small': 'S',
    'medium': 'M',
    'large': 'L',
    'extra large': 'XL',
    'x-large': 'XL',
    'x large': 'XL',
    'double xl': 'XXL',
    'double x large': 'XXL',
    '2xl': 'XXL',
    '2x': 'XXL',
    'triple xl': '3XL',
    '3xl': '3XL',
    '3x': '3XL',
    'quadruple xl': '4XL',
    '4xl': '4XL',
    '4x': '4XL',
    '5xl': '5XL',
    '5x': '5XL'
  };

  // Department/Gender mappings
  private readonly DEPARTMENT_MAPPINGS: Record<string, string> = {
    'male': 'Men',
    'man': 'Men',
    'mens': 'Men',
    "men's": 'Men',
    'masculine': 'Men',
    'female': 'Women',
    'woman': 'Women',
    'womens': 'Women',
    "women's": 'Women',
    'feminine': 'Women',
    'ladies': 'Women',
    'girl': 'Girls',
    'girls': 'Girls',
    'boy': 'Boys',
    'boys': 'Boys',
    'unisex': 'Unisex Adult',
    'gender neutral': 'Unisex Adult',
    'baby': 'Baby & Toddler',
    'toddler': 'Baby & Toddler',
    'infant': 'Baby & Toddler'
  };

  constructor() {
    this.validator = new EbaySpecificsValidator();
    this.enhancedEbay = new EnhancedEbayService();
  }

  /**
   * Map AI analysis result to eBay item specifics
   */
  async mapAIToEBaySpecifics(
    aiResult: AIAnalysisResult,
    categoryId?: string
  ): Promise<MappingResult> {
    try {
      console.log('🔄 [AI-MAPPER] Starting AI to eBay specifics mapping');
      console.log('📊 [AI-MAPPER] AI confidence:', aiResult.confidence);

      const specifics: EBayItemSpecific[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      // Step 1: Determine category if not provided
      let targetCategoryId = categoryId;
      let categoryName = 'Unknown';
      
      if (!targetCategoryId && aiResult.title) {
        try {
          const categoryData = await this.enhancedEbay.getCategoryData(
            aiResult.title,
            aiResult.brand,
            aiResult.item_type
          );
          targetCategoryId = categoryData.categoryId;
          categoryName = categoryData.categoryName;
          console.log(`🎯 [AI-MAPPER] Category determined: ${categoryName} (${targetCategoryId})`);
        } catch (error) {
          console.warn('⚠️ [AI-MAPPER] Category determination failed:', error);
          targetCategoryId = '11450'; // Default to clothing
          categoryName = 'Clothing';
        }
      }

      // Step 2: Map standard AI fields to eBay specifics
      await this.mapStandardFields(aiResult, specifics, errors, warnings);

      // Step 3: Map AI-specific eBay item specifics
      this.mapAISpecifics(aiResult, specifics, errors, warnings);

      // Step 4: Derive additional specifics from keywords and features
      this.deriveSpecificsFromKeywords(aiResult, specifics, suggestions);

      // Step 5: Validate specifics against eBay category requirements
      if (targetCategoryId) {
        await this.validateAgainstCategory(specifics, targetCategoryId, errors, warnings);
      }

      // Step 6: Normalize and clean up specifics
      this.normalizeSpecifics(specifics);

      // Step 7: Generate validation summary
      const validationSummary = this.generateValidationSummary(specifics);

      // Step 8: Generate mapping metadata
      const mappingMetadata = this.generateMappingMetadata(aiResult, specifics, suggestions);

      console.log('✅ [AI-MAPPER] Mapping completed:', {
        totalSpecifics: specifics.length,
        validSpecifics: validationSummary.valid,
        aiConfidence: aiResult.confidence,
        categoryId: targetCategoryId
      });

      return {
        success: true,
        specifics,
        categoryId: targetCategoryId,
        categoryName,
        validationSummary,
        mappingMetadata,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      console.error('❌ [AI-MAPPER] Mapping failed:', error);
      return {
        success: false,
        specifics: [],
        validationSummary: { total: 0, valid: 0, invalid: 0, unknown: 0 },
        mappingMetadata: {
          aiConfidence: aiResult.confidence || 0,
          hasEBaySpecifics: false,
          sourceBreakdown: {},
          suggestions: []
        },
        errors: [error.message]
      };
    }
  }

  /**
   * Map standard AI fields to eBay specifics
   */
  private async mapStandardFields(
    aiResult: AIAnalysisResult,
    specifics: EBayItemSpecific[],
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    console.log('📋 [AI-MAPPER] Mapping standard fields');

    // Map each standard field
    for (const [aiField, ebayField] of Object.entries(this.STANDARD_MAPPINGS)) {
      const value = aiResult[aiField as keyof AIAnalysisResult];
      
      if (value && typeof value === 'string' && value.toLowerCase() !== 'unknown') {
        let normalizedValue = this.normalizeValue(aiField, value);
        
        // Skip if normalization resulted in empty value
        if (!normalizedValue) {
          warnings.push(`Skipped empty value for ${ebayField} after normalization`);
          continue;
        }

        const specific: EBayItemSpecific = {
          name: ebayField,
          value: normalizedValue,
          confidence: this.calculateFieldConfidence(aiField, value, aiResult.confidence || 0.5),
          source: 'ai_analysis',
          validationStatus: 'unknown'
        };

        specifics.push(specific);
        console.log(`✅ [AI-MAPPER] Mapped ${aiField} -> ${ebayField}: ${normalizedValue}`);
      }
    }

    // Handle special cases
    await this.handleSpecialCases(aiResult, specifics, warnings);
  }

  /**
   * Map AI-specific eBay item specifics
   */
  private mapAISpecifics(
    aiResult: AIAnalysisResult,
    specifics: EBayItemSpecific[],
    errors: string[],
    warnings: string[]
  ): void {
    if (!aiResult.ebay_item_specifics) {
      return;
    }

    console.log('🎯 [AI-MAPPER] Mapping AI-generated eBay specifics');

    Object.entries(aiResult.ebay_item_specifics).forEach(([key, value]) => {
      if (value && value !== 'unknown' && value !== 'Unknown' && typeof value === 'string') {
        // Format key to proper eBay specific name
        const formattedKey = this.formatSpecificName(key);
        const normalizedValue = String(value).trim();

        // Check if we already have this specific from standard mapping
        const existingIndex = specifics.findIndex(s => 
          s.name.toLowerCase() === formattedKey.toLowerCase()
        );

        if (existingIndex !== -1) {
          // Update existing specific if AI version has higher confidence
          const existing = specifics[existingIndex];
          if (existing.source === 'ai_analysis') {
            warnings.push(`Updating ${formattedKey} from AI specifics: ${existing.value} -> ${normalizedValue}`);
            specifics[existingIndex] = {
              ...existing,
              value: normalizedValue,
              confidence: Math.max(existing.confidence, 0.8),
              source: 'ai_specific'
            };
          }
        } else {
          // Add new specific
          const specific: EBayItemSpecific = {
            name: formattedKey,
            value: normalizedValue,
            confidence: 0.8, // AI-generated specifics have good confidence
            source: 'ai_specific',
            validationStatus: 'unknown'
          };

          specifics.push(specific);
          console.log(`✅ [AI-MAPPER] Added AI specific ${formattedKey}: ${normalizedValue}`);
        }
      }
    });
  }

  /**
   * Derive additional specifics from keywords and features
   */
  private deriveSpecificsFromKeywords(
    aiResult: AIAnalysisResult,
    specifics: EBayItemSpecific[],
    suggestions: string[]
  ): void {
    console.log('🔍 [AI-MAPPER] Deriving specifics from keywords and features');

    const allKeywords = [
      ...(aiResult.keywords || []),
      ...(aiResult.style_keywords || []),
      ...(aiResult.ebay_keywords || []),
      ...(aiResult.key_features || [])
    ];

    // Look for style/occasion keywords
    const styleKeywords = this.extractStyleKeywords(allKeywords);
    if (styleKeywords.length > 0) {
      const existing = specifics.find(s => s.name.toLowerCase() === 'style');
      if (!existing) {
        specifics.push({
          name: 'Style',
          value: styleKeywords[0], // Use the first/most relevant
          confidence: 0.6,
          source: 'derived',
          validationStatus: 'unknown'
        });
        console.log(`✅ [AI-MAPPER] Derived Style: ${styleKeywords[0]}`);
      }
    }

    // Look for occasion keywords
    const occasionKeywords = this.extractOccasionKeywords(allKeywords);
    if (occasionKeywords.length > 0) {
      const existing = specifics.find(s => s.name.toLowerCase() === 'occasion');
      if (!existing) {
        specifics.push({
          name: 'Occasion',
          value: occasionKeywords[0],
          confidence: 0.6,
          source: 'derived',
          validationStatus: 'unknown'
        });
        console.log(`✅ [AI-MAPPER] Derived Occasion: ${occasionKeywords[0]}`);
      }
    }

    // Look for season keywords
    const seasonKeywords = this.extractSeasonKeywords(allKeywords);
    if (seasonKeywords.length > 0) {
      const existing = specifics.find(s => s.name.toLowerCase() === 'season');
      if (!existing) {
        specifics.push({
          name: 'Season',
          value: seasonKeywords[0],
          confidence: 0.6,
          source: 'derived',
          validationStatus: 'unknown'
        });
        console.log(`✅ [AI-MAPPER] Derived Season: ${seasonKeywords[0]}`);
      }
    }

    // Generate suggestions for missing important specifics
    this.generateMissingSpecificsSuggestions(specifics, suggestions);
  }

  /**
   * Validate specifics against eBay category requirements
   */
  private async validateAgainstCategory(
    specifics: EBayItemSpecific[],
    categoryId: string,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    try {
      console.log(`🔍 [AI-MAPPER] Validating specifics against category: ${categoryId}`);

      // Get category specifics from enhanced eBay service
      const categoryData = await this.enhancedEbay.getCategoryData('', '', '');
      const categorySpecifics = categoryData.specifics;

      // Validate each specific
      for (const specific of specifics) {
        const categorySpecific = categorySpecifics.find(cs => 
          cs.name.toLowerCase() === specific.name.toLowerCase()
        );

        if (categorySpecific) {
          // Check if value is in allowed values
          if (categorySpecific.allowedValues && categorySpecific.allowedValues.length > 0) {
            const isValidValue = categorySpecific.allowedValues.some(allowed => 
              allowed.toLowerCase() === specific.value.toLowerCase()
            );

            if (isValidValue) {
              specific.validationStatus = 'valid';
            } else {
              specific.validationStatus = 'invalid';
              warnings.push(`Value "${specific.value}" not in allowed values for ${specific.name}. Allowed: ${categorySpecific.allowedValues.slice(0, 5).join(', ')}`);
            }
          } else {
            specific.validationStatus = 'valid'; // No restrictions
          }
        } else {
          specific.validationStatus = 'unknown'; // Not a standard category specific
        }
      }

      // Check for missing required specifics
      const requiredSpecifics = categorySpecifics.filter(cs => cs.importance === 'REQUIRED');
      for (const required of requiredSpecifics) {
        const hasSpecific = specifics.some(s => 
          s.name.toLowerCase() === required.name.toLowerCase()
        );

        if (!hasSpecific) {
          warnings.push(`Missing required specific: ${required.name}`);
        }
      }

    } catch (error) {
      console.warn('⚠️ [AI-MAPPER] Category validation failed:', error);
      warnings.push('Could not validate against category specifics');
    }
  }

  /**
   * Normalize value based on field type
   */
  private normalizeValue(field: string, value: string): string {
    const normalizedValue = value.trim();

    switch (field) {
      case 'color':
        return this.normalizeColor(normalizedValue);
      case 'size':
        return this.normalizeSize(normalizedValue);
      case 'gender':
        return this.normalizeDepartment(normalizedValue);
      case 'brand':
        return this.normalizeBrand(normalizedValue);
      default:
        return this.capitalizeWords(normalizedValue);
    }
  }

  /**
   * Normalize color values
   */
  private normalizeColor(color: string): string {
    const normalized = color.toLowerCase();
    return this.COLOR_MAPPINGS[normalized] || this.capitalizeWords(color);
  }

  /**
   * Normalize size values
   */
  private normalizeSize(size: string): string {
    const normalized = size.toLowerCase().replace(/\s+/g, ' ').trim();
    return this.SIZE_MAPPINGS[normalized] || size.toUpperCase();
  }

  /**
   * Normalize department/gender values
   */
  private normalizeDepartment(gender: string): string {
    const normalized = gender.toLowerCase();
    return this.DEPARTMENT_MAPPINGS[normalized] || this.capitalizeWords(gender);
  }

  /**
   * Normalize brand values
   */
  private normalizeBrand(brand: string): string {
    // Keep original casing for brands
    return brand.trim();
  }

  /**
   * Capitalize words properly
   */
  private capitalizeWords(text: string): string {
    return text.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Format specific name for eBay
   */
  private formatSpecificName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Calculate field confidence
   */
  private calculateFieldConfidence(field: string, value: string, baseConfidence: number): number {
    let confidence = baseConfidence;

    // Boost confidence for certain fields
    if (['brand', 'color', 'size'].includes(field)) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }

    // Reduce confidence for vague values
    const vagueValues = ['various', 'mixed', 'assorted', 'other', 'unknown', 'n/a'];
    if (vagueValues.includes(value.toLowerCase())) {
      confidence = Math.max(confidence - 0.3, 0.1);
    }

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Handle special cases
   */
  private async handleSpecialCases(
    aiResult: AIAnalysisResult,
    specifics: EBayItemSpecific[],
    warnings: string[]
  ): Promise<void> {
    // Handle condition mapping
    if (aiResult.condition) {
      const conditionMapping: Record<string, string> = {
        'like_new': 'New with tags',
        'excellent': 'New without tags',
        'good': 'Excellent',
        'fair': 'Good',
        'poor': 'Acceptable'
      };

      const ebayCondition = conditionMapping[aiResult.condition] || this.capitalizeWords(aiResult.condition);
      
      specifics.push({
        name: 'Condition',
        value: ebayCondition,
        confidence: 0.9,
        source: 'ai_analysis',
        validationStatus: 'valid'
      });
    }

    // Handle multi-color items
    const colorSpecific = specifics.find(s => s.name === 'Color');
    if (colorSpecific && colorSpecific.value.includes(',')) {
      // Split multi-color into primary color
      const colors = colorSpecific.value.split(',').map(c => c.trim());
      colorSpecific.value = colors[0]; // Use primary color
      if (colors.length > 1) {
        warnings.push(`Multi-color detected, using primary color: ${colors[0]}. Additional colors: ${colors.slice(1).join(', ')}`);
      }
    }
  }

  /**
   * Extract style keywords
   */
  private extractStyleKeywords(keywords: string[]): string[] {
    const styleKeywords = [
      'casual', 'formal', 'business', 'athletic', 'vintage', 'bohemian', 
      'gothic', 'punk', 'classic', 'modern', 'retro', 'sporty', 'elegant',
      'trendy', 'chic', 'minimalist', 'boho', 'preppy', 'edgy'
    ];

    return keywords.filter(keyword => 
      styleKeywords.some(style => keyword.toLowerCase().includes(style))
    ).map(keyword => this.capitalizeWords(keyword));
  }

  /**
   * Extract occasion keywords
   */
  private extractOccasionKeywords(keywords: string[]): string[] {
    const occasionKeywords = [
      'casual', 'work', 'party', 'wedding', 'sports', 'travel', 
      'everyday', 'special occasion', 'date', 'formal', 'business'
    ];

    return keywords.filter(keyword => 
      occasionKeywords.some(occasion => keyword.toLowerCase().includes(occasion))
    ).map(keyword => this.capitalizeWords(keyword));
  }

  /**
   * Extract season keywords
   */
  private extractSeasonKeywords(keywords: string[]): string[] {
    const seasonKeywords = [
      'spring', 'summer', 'fall', 'autumn', 'winter', 'all season'
    ];

    return keywords.filter(keyword => 
      seasonKeywords.some(season => keyword.toLowerCase().includes(season))
    ).map(keyword => this.capitalizeWords(keyword));
  }

  /**
   * Generate missing specifics suggestions
   */
  private generateMissingSpecificsSuggestions(
    specifics: EBayItemSpecific[],
    suggestions: string[]
  ): void {
    const existingNames = specifics.map(s => s.name.toLowerCase());
    const importantSpecifics = ['Brand', 'Size', 'Color', 'Department', 'Material', 'Style'];

    importantSpecifics.forEach(specific => {
      if (!existingNames.includes(specific.toLowerCase())) {
        suggestions.push(`Consider adding ${specific} if applicable`);
      }
    });
  }

  /**
   * Normalize specifics values
   */
  private normalizeSpecifics(specifics: EBayItemSpecific[]): void {
    specifics.forEach(specific => {
      // Remove duplicates
      specific.value = specific.value.trim();
      
      // Ensure proper capitalization
      if (specific.name !== 'Brand') { // Keep brand casing as-is
        specific.value = this.capitalizeWords(specific.value);
      }
    });
  }

  /**
   * Generate validation summary
   */
  private generateValidationSummary(specifics: EBayItemSpecific[]): {
    total: number;
    valid: number;
    invalid: number;
    unknown: number;
  } {
    const summary = { total: specifics.length, valid: 0, invalid: 0, unknown: 0 };
    
    specifics.forEach(specific => {
      switch (specific.validationStatus) {
        case 'valid':
          summary.valid++;
          break;
        case 'invalid':
          summary.invalid++;
          break;
        default:
          summary.unknown++;
          break;
      }
    });

    return summary;
  }

  /**
   * Generate mapping metadata
   */
  private generateMappingMetadata(
    aiResult: AIAnalysisResult,
    specifics: EBayItemSpecific[],
    suggestions: string[]
  ): {
    aiConfidence: number;
    hasEBaySpecifics: boolean;
    sourceBreakdown: Record<string, number>;
    suggestions: string[];
  } {
    const sourceBreakdown: Record<string, number> = {};
    
    specifics.forEach(specific => {
      sourceBreakdown[specific.source] = (sourceBreakdown[specific.source] || 0) + 1;
    });

    return {
      aiConfidence: aiResult.confidence || 0.5,
      hasEBaySpecifics: !!(aiResult.ebay_item_specifics && Object.keys(aiResult.ebay_item_specifics).length > 0),
      sourceBreakdown,
      suggestions
    };
  }
}

export default AIToEBaySpecificsMapper;
export type { AIAnalysisResult, EBayItemSpecific, MappingResult };