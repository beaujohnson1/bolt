// eBay Listing Validation Utility
// Validates listing data before sending to eBay API

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EbayListingData {
  title: string;
  description: string;
  price: number;
  condition: string;
  images: string[];
  category?: string;
  brand?: string;
  size?: string;
  color?: string;
  keywords?: string[];
}

/**
 * Validate eBay listing data to ensure it meets eBay requirements
 */
export function validateEbayListingData(data: EbayListingData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push('Title is required');
  } else if (data.title.length > 80) {
    errors.push('Title must be 80 characters or less');
  } else if (data.title.length < 10) {
    warnings.push('Title should be at least 10 characters for better visibility');
  }

  // Check for prohibited title content
  const prohibitedWords = ['new', 'brand new', 'sealed', 'mint', 'unused'];
  const titleLower = data.title.toLowerCase();
  prohibitedWords.forEach(word => {
    if (titleLower.includes(word) && data.condition !== 'new') {
      warnings.push(`Title contains "${word}" but condition is not "new" - this may cause listing issues`);
    }
  });

  // Description validation
  if (!data.description || data.description.trim().length === 0) {
    warnings.push('Description is recommended for better buyer engagement');
  } else if (data.description.length > 5000) {
    warnings.push('Description is very long and may be truncated in some views');
  }

  // Price validation
  if (!data.price || data.price <= 0) {
    errors.push('Price must be greater than 0');
  } else if (data.price < 1) {
    warnings.push('Very low prices may trigger eBay review');
  } else if (data.price > 10000) {
    warnings.push('High value items may require additional verification');
  }

  // Condition validation
  const validConditions = ['new', 'new_with_tags', 'new_without_tags', 'used_excellent', 'used_good', 'used_fair'];
  if (!data.condition || !validConditions.includes(data.condition)) {
    errors.push(`Condition must be one of: ${validConditions.join(', ')}`);
  }

  // Images validation
  if (!data.images || data.images.length === 0) {
    errors.push('At least one image is required');
  } else {
    if (data.images.length > 12) {
      warnings.push('eBay supports up to 12 images, extras will be ignored');
    }
    
    // Validate image URLs
    data.images.forEach((url, index) => {
      if (!url || !isValidUrl(url)) {
        errors.push(`Image ${index + 1} has invalid URL: ${url}`);
      } else if (!url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        warnings.push(`Image ${index + 1} should be JPG, PNG, or GIF format`);
      }
    });
  }

  // Brand validation
  if (data.brand && data.brand.length > 50) {
    warnings.push('Brand name should be 50 characters or less');
  }

  // Size validation
  if (data.size && data.size.length > 50) {
    warnings.push('Size should be 50 characters or less');
  }

  // Color validation
  if (data.color && data.color.length > 50) {
    warnings.push('Color should be 50 characters or less');
  }

  // Keywords validation
  if (data.keywords) {
    if (data.keywords.length > 20) {
      warnings.push('Consider limiting keywords to 20 or fewer for better relevance');
    }
    
    data.keywords.forEach(keyword => {
      if (keyword.length > 50) {
        warnings.push(`Keyword "${keyword}" is very long and may not be effective`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate eBay category ID
 */
export function validateEbayCategoryId(categoryId: string): boolean {
  // eBay category IDs are numeric strings
  return /^\d+$/.test(categoryId) && parseInt(categoryId) > 0;
}

/**
 * Validate business policy IDs
 */
export interface BusinessPolicies {
  fulfillment?: string;
  payment?: string;
  return?: string;
}

export function validateBusinessPolicies(policies: BusinessPolicies): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!policies.fulfillment && !policies.payment && !policies.return) {
    warnings.push('No business policies provided - using eBay defaults');
    return { isValid: true, errors, warnings };
  }

  // Validate policy ID format (should be numeric)
  const validatePolicyId = (id: string, type: string) => {
    if (id && !/^\d+$/.test(id)) {
      errors.push(`${type} policy ID must be numeric: ${id}`);
    }
  };

  if (policies.fulfillment) {
    validatePolicyId(policies.fulfillment, 'Fulfillment');
  }
  if (policies.payment) {
    validatePolicyId(policies.payment, 'Payment');
  }
  if (policies.return) {
    validatePolicyId(policies.return, 'Return');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate item specifics for eBay listing
 */
export interface ItemSpecific {
  name: string;
  value: string;
}

export function validateItemSpecifics(specifics: ItemSpecific[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!specifics || specifics.length === 0) {
    warnings.push('Item specifics help buyers find your item - consider adding some');
    return { isValid: true, errors, warnings };
  }

  // Check for duplicate names
  const namesSeen = new Set<string>();
  specifics.forEach((specific, index) => {
    if (!specific.name || specific.name.trim().length === 0) {
      errors.push(`Item specific ${index + 1} missing name`);
      return;
    }
    
    if (!specific.value || specific.value.trim().length === 0) {
      errors.push(`Item specific "${specific.name}" missing value`);
      return;
    }

    const normalizedName = specific.name.toLowerCase().trim();
    if (namesSeen.has(normalizedName)) {
      warnings.push(`Duplicate item specific name: "${specific.name}"`);
    }
    namesSeen.add(normalizedName);

    // Length validations
    if (specific.name.length > 65) {
      errors.push(`Item specific name too long (max 65 chars): "${specific.name}"`);
    }
    if (specific.value.length > 65) {
      errors.push(`Item specific value too long (max 65 chars): "${specific.value}"`);
    }
  });

  if (specifics.length > 30) {
    warnings.push('eBay supports up to 30 item specifics, extras may be ignored');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Comprehensive validation for complete eBay listing
 */
export function validateCompleteEbayListing(data: {
  listing: EbayListingData;
  categoryId?: string;
  businessPolicies?: BusinessPolicies;
  itemSpecifics?: ItemSpecific[];
}): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate core listing data
  const listingValidation = validateEbayListingData(data.listing);
  allErrors.push(...listingValidation.errors);
  allWarnings.push(...listingValidation.warnings);

  // Validate category
  if (data.categoryId && !validateEbayCategoryId(data.categoryId)) {
    allErrors.push(`Invalid eBay category ID: ${data.categoryId}`);
  }

  // Validate business policies
  if (data.businessPolicies) {
    const policiesValidation = validateBusinessPolicies(data.businessPolicies);
    allErrors.push(...policiesValidation.errors);
    allWarnings.push(...policiesValidation.warnings);
  }

  // Validate item specifics
  if (data.itemSpecifics) {
    const specificsValidation = validateItemSpecifics(data.itemSpecifics);
    allErrors.push(...specificsValidation.errors);
    allWarnings.push(...specificsValidation.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Helper function to validate URLs
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

/**
 * Format validation results for display
 */
export function formatValidationResults(result: ValidationResult): string {
  let output = '';
  
  if (result.errors.length > 0) {
    output += '❌ **Errors:**\n';
    result.errors.forEach(error => {
      output += `• ${error}\n`;
    });
    output += '\n';
  }

  if (result.warnings.length > 0) {
    output += '⚠️ **Warnings:**\n';
    result.warnings.forEach(warning => {
      output += `• ${warning}\n`;
    });
    output += '\n';
  }

  if (result.isValid && result.warnings.length === 0) {
    output += '✅ **All validations passed!**\n';
  } else if (result.isValid) {
    output += '✅ **Ready to list** (with warnings above)\n';
  } else {
    output += '❌ **Cannot list** - please fix errors above\n';
  }

  return output.trim();
}