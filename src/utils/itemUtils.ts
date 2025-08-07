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
    'electronics': 'electronics',
    'phone': 'electronics',
    'laptop': 'electronics',
    'tablet': 'electronics',
    'camera': 'electronics',
    'home & garden': 'home_garden',
    'home garden': 'home_garden',
    'furniture': 'home_garden',
    'decor': 'home_garden',
    'toys': 'toys_games',
    'games': 'toys_games',
    'toy': 'toys_games',
    'game': 'toys_games',
    'sports': 'sports_outdoors',
    'outdoor': 'sports_outdoors',
    'fitness': 'sports_outdoors',
    'books': 'books_media',
    'book': 'books_media',
    'media': 'books_media',
    'dvd': 'books_media',
    'cd': 'books_media',
    'collectibles': 'collectibles',
    'collectible': 'collectibles',
    'vintage': 'collectibles',
    'antique': 'collectibles'
  };
  
  return categoryMap[normalized] || 'other';
};

// Generate sequential SKU numbers
export const generateSKU = (index: number, prefix: string = 'SKU'): string => {
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