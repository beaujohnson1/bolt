// Utility functions for item data processing

// Normalize condition values from AI to match database enum
export const normalizeCondition = (condition: string): string => {
  if (!condition) return 'good';
  
  const normalized = condition.toLowerCase().trim();
  const conditionMap: { [key: string]: string } = {
    'new': 'like_new',
    'like new': 'like_new',
    'excellent': 'like_new',
    'very good': 'good',
    'good': 'good',
    'fair': 'fair',
    'poor': 'poor',
    'damaged': 'poor'
  };
  
  return conditionMap[normalized] || 'good';
};

// Normalize category values from AI to match database enum
export const normalizeCategory = (category: string): string => {
  if (!category) return 'clothing';
  
  const normalized = category.toLowerCase().trim();
  
  // Map AI responses to database enum values
  const categoryMap: { [key: string]: string } = {
    'clothing': 'clothing',
    'leather jacket': 'clothing',
    'jacket': 'clothing',
    'coat': 'clothing',
    'shirt': 'clothing',
    'blouse': 'clothing',
    'dress': 'clothing',
    'pants': 'clothing',
    'jeans': 'clothing',
    'sweater': 'clothing',
    'hoodie': 'clothing',
    'top': 'clothing',
    'bottom': 'clothing',
    'shoes': 'shoes',
    'sneakers': 'shoes',
    'boots': 'shoes',
    'sandals': 'shoes',
    'heels': 'shoes',
    'accessories': 'accessories',
    'jewelry': 'jewelry',
    'watch': 'jewelry',
    'necklace': 'jewelry',
    'bracelet': 'jewelry',
/**
 * Generate SKU based on item properties
 * @param item - Item object with brand, category, size properties
 * @returns Generated SKU string
 */
export const generateSKU = (item: { brand?: string; category?: string; size?: string }): string => {
  try {
    const brand = item.brand || 'UNK';
    const itemType = item.category || 'ITEM';
    const size = item.size || 'OS'; // OS = One Size
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    
    // Create SKU: BRAND-TYPE-SIZE-TIMESTAMP
    const sku = `${brand.substring(0, 3).toUpperCase()}-${itemType.substring(0, 3).toUpperCase()}-${size.toUpperCase()}-${timestamp}`;
    
    console.log('✅ [SKU] Generated SKU:', sku, 'for item:', item);
    return sku;
    
  } catch (error) {
    console.error('❌ [SKU] Error generating SKU:', error);
    // Fallback SKU
    const fallbackSku = `ITEM-${Date.now().toString().slice(-8)}`;
    console.log('🔄 [SKU] Using fallback SKU:', fallbackSku);
    return fallbackSku;
  }
};

/**
 * Generate sequential SKU numbers (legacy function for backwards compatibility)
 * @param index - Sequential index number
 * @param prefix - SKU prefix (default: 'SKU')
 * @returns Sequential SKU string
 */
export const generateSequentialSKU = (index: number, prefix: string = 'SKU'): string => {
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
};

// Format price for display
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};

// Format date for display
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
  return categoryMap[normalized] || 'other';
};

// Generate sequential SKU numbers
export const generateSequentialSKU = (index: number, prefix: string = 'SKU'): string => {
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
};

// Format price for display
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};

// Format date for display
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};