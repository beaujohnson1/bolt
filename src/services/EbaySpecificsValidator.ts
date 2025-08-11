import { getSupabase } from '../lib/supabase';
import { safeTrim, toStr, safeUpper } from '../utils/strings';

interface EbayAspect {
  aspectName: string;
  aspectRequired: boolean;
  aspectDataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE';
  aspectEnabledForVariations: boolean;
  aspectValues?: string[];
  aspectUsage?: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  aspectMaxValues?: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  completeness: number;
  accuracy: number;
  missingRequired: string[];
  invalidValues: Record<string, string>;
  optimizedSpecifics: Record<string, any>;
}

interface SpecificsPerformanceData {
  categoryId: string;
  totalValidations: number;
  avgCompleteness: number;
  avgAccuracy: number;
  commonErrors: string[];
  topMissingFields: string[];
  recommendedImprovements: string[];
}

export class EbaySpecificsValidator {
  private supabase;
  
  // eBay category-specific required and recommended fields
  private static readonly CATEGORY_SPECIFICS: Record<string, EbayAspect[]> = {
    // Men's Clothing (Category 1059)
    '1059': [
      { aspectName: 'Brand', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true, aspectUsage: 'REQUIRED' },
      { aspectName: 'Size Type', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true, aspectValues: ['Regular', 'Big & Tall', 'Husky', 'Slim', 'Athletic'] },
      { aspectName: 'Size', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true },
      { aspectName: 'Color', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true },
      { aspectName: 'Material', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectUsage: 'RECOMMENDED' },
      { aspectName: 'Style', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectUsage: 'OPTIONAL' },
      { aspectName: 'Sleeve Length', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: true, aspectValues: ['Short Sleeve', 'Long Sleeve', 'Sleeveless', '3/4 Sleeve'] },
      { aspectName: 'Fit', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: true, aspectValues: ['Regular', 'Slim', 'Relaxed', 'Athletic', 'Loose'] },
      { aspectName: 'Season', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectValues: ['Fall', 'Spring', 'Summer', 'Winter'] }
    ],
    
    // Women's Clothing (Category 15724)
    '15724': [
      { aspectName: 'Brand', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true, aspectUsage: 'REQUIRED' },
      { aspectName: 'Size Type', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true, aspectValues: ['Regular', 'Plus', 'Petite', 'Tall', 'Maternity'] },
      { aspectName: 'Size', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true },
      { aspectName: 'Color', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true },
      { aspectName: 'Material', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectUsage: 'RECOMMENDED' },
      { aspectName: 'Style', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectUsage: 'OPTIONAL' },
      { aspectName: 'Sleeve Length', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: true, aspectValues: ['Short Sleeve', 'Long Sleeve', 'Sleeveless', '3/4 Sleeve', 'Cap Sleeve'] },
      { aspectName: 'Neckline', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectValues: ['Crew Neck', 'V-Neck', 'Scoop Neck', 'Off Shoulder', 'Turtleneck'] },
      { aspectName: 'Occasion', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectValues: ['Casual', 'Formal', 'Business', 'Party', 'Wedding'] }
    ],
    
    // Athletic Apparel (Category 137084)
    '137084': [
      { aspectName: 'Brand', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true, aspectUsage: 'REQUIRED' },
      { aspectName: 'Size', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true, aspectUsage: 'REQUIRED' },
      { aspectName: 'Color', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: true, aspectUsage: 'REQUIRED' },
      { aspectName: 'Gender', aspectRequired: true, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectValues: ['Men', 'Women', 'Unisex'], aspectUsage: 'REQUIRED' },
      { aspectName: 'Activity', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectValues: ['Running', 'Yoga', 'CrossFit', 'Basketball', 'Tennis', 'Golf', 'Hiking'], aspectUsage: 'RECOMMENDED' },
      { aspectName: 'Features', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectValues: ['Moisture Wicking', 'Quick Dry', 'Stretch', 'Breathable', 'Anti-Odor'], aspectUsage: 'RECOMMENDED' },
      { aspectName: 'Material', aspectRequired: false, aspectDataType: 'STRING', aspectEnabledForVariations: false, aspectUsage: 'RECOMMENDED' }
    ]
  };

  private static readonly BRAND_VALIDATION = {
    // Top clothing brands with common misspellings
    'nike': ['nike', 'nkie', 'nikee'],
    'adidas': ['adidas', 'addidas', 'adiddas'],
    'lululemon': ['lululemon', 'lulu lemon', 'lulu-lemon'],
    'patagonia': ['patagonia', 'patagucci'],
    'north face': ['north face', 'northface', 'the north face'],
    'under armour': ['under armour', 'underarmour', 'under armor'],
    'calvin klein': ['calvin klein', 'ck', 'calvin klien'],
    'tommy hilfiger': ['tommy hilfiger', 'tommy', 'th']
  };

  private static readonly SIZE_STANDARDIZATION = {
    // Standardize size variations
    'XS': ['xs', 'extra small', 'xsmall'],
    'S': ['s', 'small'],
    'M': ['m', 'medium', 'med'],
    'L': ['l', 'large'],
    'XL': ['xl', 'extra large', 'xlarge'],
    'XXL': ['xxl', '2xl', 'extra extra large']
  };

  private static readonly COLOR_STANDARDIZATION = {
    'Black': ['black', 'blk', 'charcoal black'],
    'White': ['white', 'wht', 'off white', 'cream white'],
    'Blue': ['blue', 'blu', 'navy blue', 'royal blue'],
    'Red': ['red', 'crimson', 'cherry red'],
    'Gray': ['gray', 'grey', 'charcoal'],
    'Green': ['green', 'forest green', 'olive'],
    'Brown': ['brown', 'tan', 'khaki', 'beige']
  };

  constructor() {
    this.supabase = getSupabase();
  }

  /**
   * Validate AI-generated item specifics against eBay requirements
   */
  async validateItemSpecifics(
    categoryId: string,
    aiSpecifics: Record<string, any>,
    itemData: {
      title: string;
      brand?: string;
      size?: string;
      color?: string;
      condition?: string;
    }
  ): Promise<ValidationResult> {
    console.log('✅ [EBAY-VALIDATOR] Validating item specifics:', {
      categoryId,
      specificsCount: Object.keys(aiSpecifics).length,
      itemData
    });

    try {
      const categoryAspects = this.getCategoryAspects(categoryId);
      const errors: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];
      const missingRequired: string[] = [];
      const invalidValues: Record<string, string> = {};
      const optimizedSpecifics: Record<string, any> = { ...aiSpecifics };

      // Validate required fields
      const requiredAspects = categoryAspects.filter(aspect => aspect.aspectRequired || aspect.aspectUsage === 'REQUIRED');
      
      for (const aspect of requiredAspects) {
        const providedValue = aiSpecifics[aspect.aspectName];
        
        if (!providedValue || safeTrim(toStr(providedValue)) === '') {
          missingRequired.push(aspect.aspectName);
          errors.push(`Missing required field: ${aspect.aspectName}`);
          
          // Try to fill from item data
          const inferredValue = this.inferFromItemData(aspect.aspectName, itemData);
          if (inferredValue) {
            optimizedSpecifics[aspect.aspectName] = inferredValue;
            suggestions.push(`Inferred ${aspect.aspectName}: ${inferredValue} from item data`);
          }
        }
      }

      // Validate field values against allowed values
      for (const aspect of categoryAspects) {
        const providedValue = safeTrim(toStr(aiSpecifics[aspect.aspectName]));
        
        if (providedValue && aspect.aspectValues) {
          const normalizedValue = this.normalizeValue(aspect.aspectName, providedValue);
          const isValid = aspect.aspectValues.some(allowedValue => 
            allowedValue.toLowerCase() === normalizedValue.toLowerCase()
          );
          
          if (!isValid) {
            const suggestion = this.findClosestMatch(normalizedValue, aspect.aspectValues);
            invalidValues[aspect.aspectName] = providedValue;
            warnings.push(`Invalid value for ${aspect.aspectName}: "${providedValue}". Suggested: "${suggestion}"`);
            optimizedSpecifics[aspect.aspectName] = suggestion;
          } else {
            optimizedSpecifics[aspect.aspectName] = normalizedValue;
          }
        }
      }

      // Standardize common fields
      optimizedSpecifics.Brand = this.standardizeBrand(optimizedSpecifics.Brand || itemData.brand);
      optimizedSpecifics.Size = this.standardizeSize(optimizedSpecifics.Size || itemData.size);
      optimizedSpecifics.Color = this.standardizeColor(optimizedSpecifics.Color || itemData.color);

      // Add recommended fields if missing
      const recommendedAspects = categoryAspects.filter(aspect => aspect.aspectUsage === 'RECOMMENDED');
      for (const aspect of recommendedAspects) {
        if (!optimizedSpecifics[aspect.aspectName]) {
          const suggestion = this.suggestRecommendedValue(aspect.aspectName, itemData);
          if (suggestion) {
            suggestions.push(`Consider adding ${aspect.aspectName}: ${suggestion}`);
          }
        }
      }

      // Calculate metrics
      const totalFields = categoryAspects.length;
      const providedFields = Object.keys(optimizedSpecifics).filter(key => 
        optimizedSpecifics[key] && safeTrim(toStr(optimizedSpecifics[key])) !== ''
      ).length;
      
      const completeness = totalFields > 0 ? providedFields / totalFields : 0;
      const accuracy = errors.length === 0 ? 1.0 : Math.max(0, 1 - (errors.length / totalFields));

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        completeness,
        accuracy,
        missingRequired,
        invalidValues,
        optimizedSpecifics
      };

      console.log('✅ [EBAY-VALIDATOR] Validation complete:', {
        isValid: result.isValid,
        completeness: result.completeness,
        accuracy: result.accuracy,
        errorsCount: errors.length,
        warningsCount: warnings.length
      });

      return result;

    } catch (error) {
      console.error('❌ [EBAY-VALIDATOR] Validation error:', error);
      
      return {
        isValid: false,
        errors: ['Validation system error'],
        warnings: [],
        suggestions: [],
        completeness: 0,
        accuracy: 0,
        missingRequired: [],
        invalidValues: {},
        optimizedSpecifics: aiSpecifics
      };
    }
  }

  /**
   * Track validation performance for analytics
   */
  async trackValidationPerformance(
    predictionId: string,
    categoryId: string,
    validation: ValidationResult
  ): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase
        .from('ebay_specifics_tracking')
        .insert({
          prediction_id: predictionId,
          category_id: categoryId,
          required_specifics: this.getRequiredSpecificsForCategory(categoryId),
          predicted_specifics: validation.optimizedSpecifics,
          specifics_completeness_score: validation.completeness,
          specifics_accuracy_score: validation.accuracy,
          required_fields_predicted: Object.keys(validation.optimizedSpecifics).length,
          required_fields_correct: validation.missingRequired.length === 0 ? 1 : 0,
          brand_required: true,
          brand_predicted: validation.optimizedSpecifics.Brand,
          brand_correct: !validation.invalidValues.Brand,
          size_required: true,
          size_predicted: validation.optimizedSpecifics.Size,
          size_correct: !validation.invalidValues.Size,
          color_required: true,
          color_predicted: validation.optimizedSpecifics.Color,
          color_correct: !validation.invalidValues.Color
        });

      console.log('✅ [EBAY-VALIDATOR] Performance tracking saved');
    } catch (error) {
      console.error('❌ [EBAY-VALIDATOR] Error tracking performance:', error);
    }
  }

  /**
   * Get category-specific performance analytics
   */
  async getCategoryPerformance(categoryId: string, daysBack: number = 30): Promise<SpecificsPerformanceData | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('ebay_specifics_tracking')
        .select('*')
        .eq('category_id', categoryId)
        .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

      if (error || !data) {
        console.error('❌ [EBAY-VALIDATOR] Error getting category performance:', error);
        return null;
      }

      const totalValidations = data.length;
      const avgCompleteness = data.reduce((acc, row) => acc + (row.specifics_completeness_score || 0), 0) / totalValidations;
      const avgAccuracy = data.reduce((acc, row) => acc + (row.specifics_accuracy_score || 0), 0) / totalValidations;

      // Analyze common issues
      const brandAccuracy = data.filter(row => row.brand_correct).length / totalValidations;
      const sizeAccuracy = data.filter(row => row.size_correct).length / totalValidations;
      const colorAccuracy = data.filter(row => row.color_correct).length / totalValidations;

      const commonErrors: string[] = [];
      if (brandAccuracy < 0.8) commonErrors.push('Brand detection accuracy is low');
      if (sizeAccuracy < 0.7) commonErrors.push('Size extraction needs improvement');
      if (colorAccuracy < 0.6) commonErrors.push('Color identification is inconsistent');

      const topMissingFields: string[] = [];
      if (data.filter(row => !row.brand_predicted).length > totalValidations * 0.2) {
        topMissingFields.push('Brand');
      }
      if (data.filter(row => !row.size_predicted).length > totalValidations * 0.3) {
        topMissingFields.push('Size');
      }
      if (data.filter(row => !row.color_predicted).length > totalValidations * 0.2) {
        topMissingFields.push('Color');
      }

      const recommendedImprovements: string[] = [];
      if (avgCompleteness < 0.7) {
        recommendedImprovements.push('Focus on capturing all required item specifics in photos');
      }
      if (avgAccuracy < 0.8) {
        recommendedImprovements.push('Improve AI prompt to better extract standard eBay values');
      }
      if (topMissingFields.length > 0) {
        recommendedImprovements.push(`Prioritize clear photos of ${topMissingFields.join(', ')} information`);
      }

      return {
        categoryId,
        totalValidations,
        avgCompleteness,
        avgAccuracy,
        commonErrors,
        topMissingFields,
        recommendedImprovements
      };

    } catch (error) {
      console.error('❌ [EBAY-VALIDATOR] Error analyzing category performance:', error);
      return null;
    }
  }

  /**
   * Get validation recommendations based on performance data
   */
  getValidationRecommendations(validation: ValidationResult): string[] {
    const recommendations: string[] = [];

    if (validation.completeness < 0.7) {
      recommendations.push('📝 Fill in more item specifics to improve listing visibility on eBay');
    }

    if (validation.missingRequired.length > 0) {
      recommendations.push(`⚠️ Add required fields: ${validation.missingRequired.join(', ')}`);
    }

    if (Object.keys(validation.invalidValues).length > 0) {
      recommendations.push('🔧 Fix invalid values - eBay requires exact matches from their allowed values list');
    }

    if (validation.completeness > 0.8 && validation.accuracy > 0.9) {
      recommendations.push('✅ Excellent item specifics! This listing should perform well on eBay');
    }

    if (validation.suggestions.length > 0) {
      recommendations.push('💡 Consider the suggested improvements to optimize your listing');
    }

    return recommendations;
  }

  // Helper Methods

  private getCategoryAspects(categoryId: string): EbayAspect[] {
    return EbaySpecificsValidator.CATEGORY_SPECIFICS[categoryId] || EbaySpecificsValidator.CATEGORY_SPECIFICS['1059'];
  }

  private getRequiredSpecificsForCategory(categoryId: string): Record<string, any> {
    const aspects = this.getCategoryAspects(categoryId);
    const required: Record<string, any> = {};
    
    aspects
      .filter(aspect => aspect.aspectRequired || aspect.aspectUsage === 'REQUIRED')
      .forEach(aspect => {
        required[aspect.aspectName] = aspect.aspectValues || null;
      });
    
    return required;
  }

  private inferFromItemData(aspectName: string, itemData: any): string | null {
    const dataMap: Record<string, string | undefined> = {
      'Brand': itemData.brand,
      'Size': itemData.size,
      'Color': itemData.color,
      'Condition': itemData.condition
    };

    return dataMap[aspectName] || null;
  }

  private normalizeValue(aspectName: string, value: string): string {
    const trimmed = safeTrim(toStr(value));
    
    // Aspect-specific normalization
    switch (aspectName.toLowerCase()) {
      case 'brand':
        return this.standardizeBrand(trimmed);
      case 'size':
        return this.standardizeSize(trimmed);
      case 'color':
        return this.standardizeColor(trimmed);
      default:
        return trimmed;
    }
  }

  private standardizeBrand(brand?: string): string {
    if (!brand) return '';
    
    const brandLower = brand.toLowerCase().trim();
    
    for (const [standardBrand, variants] of Object.entries(EbaySpecificsValidator.BRAND_VALIDATION)) {
      if (variants.includes(brandLower)) {
        return this.toTitleCase(standardBrand);
      }
    }
    
    return this.toTitleCase(brand);
  }

  private standardizeSize(size?: string): string {
    if (!size) return '';
    
    const sizeLower = size.toLowerCase().trim();
    
    for (const [standardSize, variants] of Object.entries(EbaySpecificsValidator.SIZE_STANDARDIZATION)) {
      if (variants.includes(sizeLower)) {
        return standardSize;
      }
    }
    
    return safeUpper(size);
  }

  private standardizeColor(color?: string): string {
    if (!color) return '';
    
    const colorLower = color.toLowerCase().trim();
    
    for (const [standardColor, variants] of Object.entries(EbaySpecificsValidator.COLOR_STANDARDIZATION)) {
      if (variants.includes(colorLower)) {
        return standardColor;
      }
    }
    
    return this.toTitleCase(color);
  }

  private findClosestMatch(value: string, allowedValues: string[]): string {
    const valueLower = value.toLowerCase();
    
    // Try exact match first
    const exactMatch = allowedValues.find(allowed => allowed.toLowerCase() === valueLower);
    if (exactMatch) return exactMatch;
    
    // Try partial match
    const partialMatch = allowedValues.find(allowed => 
      allowed.toLowerCase().includes(valueLower) || valueLower.includes(allowed.toLowerCase())
    );
    if (partialMatch) return partialMatch;
    
    // Return first allowed value as fallback
    return allowedValues[0];
  }

  private suggestRecommendedValue(aspectName: string, itemData: any): string | null {
    switch (aspectName) {
      case 'Material':
        return 'Cotton'; // Default material suggestion
      case 'Style':
        return 'Casual'; // Default style suggestion
      case 'Season':
        return 'All Season'; // Default season suggestion
      case 'Fit':
        return 'Regular'; // Default fit suggestion
      default:
        return null;
    }
  }

  private toTitleCase(str: string): string {
    return safeTrim(toStr(str))
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

// Export singleton instance
export const ebaySpecificsValidator = new EbaySpecificsValidator();