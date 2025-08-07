// Utility functions for item data processing
import { safeTrim, safeLower, safeUpper, isStr, nullIfUnknown, safeSlice, toStr, take, safeNumber } from './strings';

// Normalize condition values from AI to match database enum
export const normalizeCondition = (condition: string): string => {
  const trimmed = safeTrim(toStr(condition));
  if (!trimmed) return 'good';
  
  const normalized = safeLower(trimmed);
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
  const trimmed = safeTrim(toStr(category));
  if (!trimmed) return 'clothing';
  
  const normalized = safeLower(trimmed);
  
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
    'bracelet': 'jewelry'
  };
  
  return categoryMap[normalized] || 'other';
};

/**
 * Generate SKU based on item properties
 * @param item - Item object with brand, category, size properties
 * @returns Generated SKU string
 */
export const generateSKU = (item: { brand?: string; category?: string; size?: string }): string => {
  try {
    const brand = safeTrim(toStr(item.brand)) || 'UNK';
    const itemType = safeTrim(toStr(item.category)) || 'ITEM';
    const size = safeTrim(toStr(item.size)) || 'OS'; // OS = One Size
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    
    // Create SKU: BRAND-TYPE-SIZE-TIMESTAMP
    const sku = `${take(brand, 3).toUpperCase()}-${take(itemType, 3).toUpperCase()}-${safeUpper(size)}-${timestamp}`;
    
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
  const safePrice = safeNumber(price, 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(safePrice);
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const safeDateString = toStr(dateString);
  return new Date(safeDateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
// Get category path for eBay-style hierarchy
export const getCategoryPath = (category: string): string => {
  const safeCategory = safeTrim(category);
  const categoryPaths: { [key: string]: string } = {
    'clothing': 'Clothing, Shoes & Accessories > Clothing',
    'shoes': 'Clothing, Shoes & Accessories > Shoes',
    'accessories': 'Clothing, Shoes & Accessories > Accessories',
    'electronics': 'Consumer Electronics',
    'home_garden': 'Home & Garden',
    'toys_games': 'Toys & Hobbies',
    'sports_outdoors': 'Sporting Goods',
    'books_media': 'Books, Movies & Music',
    'jewelry': 'Jewelry & Watches',
    'collectibles': 'Collectibles',
    'other': 'Everything Else'
  };
  return categoryPaths[safeLower(safeCategory)] || 'Everything Else';
};

// Get item specifics for display
export const getItemSpecifics = (item: { brand?: string; size?: string; color?: string; model_number?: string }): string => {
  const specifics = [];
  const brand = safeTrim(toStr(item.brand));
  const size = safeTrim(toStr(item.size));
  const color = safeTrim(toStr(item.color));
  const model = safeTrim(toStr(item.model_number));
  
  if (brand) specifics.push(`Brand: ${brand}`);
  if (size) specifics.push(`Size: ${size}`);
  if (color) specifics.push(`Color: ${color}`);
  if (model) specifics.push(`Model: ${model}`);
  return specifics.join(', ') || '-';
};

// Known brands list for pre-extraction
const KNOWN_BRANDS = [
  'Lululemon', 'Nike', 'Adidas', 'North Face', 'Patagonia', 'Under Armour', 
  'Gap', 'Old Navy', 'H&M', 'Zara', 'Uniqlo', 'American Eagle', 'Hollister', 
  'Abercrombie', 'Banana Republic', 'J.Crew', 'Ann Taylor', 'LOFT', 'Express', 
  'Forever 21', 'Farm Rio', 'Free People', 'Anthropologie', 'Urban Outfitters', 
  'Madewell', 'Everlane', 'Reformation', 'Ganni', 'COS', 'Arket', 'Weekday',
  'Target', 'Walmart', 'Costco', 'Kirkland', 'Goodfellow', 'Universal Thread',
  'Wild Fable', 'Time and Tru', 'George', 'Champion', 'Hanes', 'Fruit of the Loom',
  'Calvin Klein', 'Tommy Hilfiger', 'Ralph Lauren', 'Polo', 'Lacoste', 'Hugo Boss',
  'Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Versace', 'Armani', 'Burberry'
];

/**
 * Extract size from OCR text using deterministic patterns
 * @param ocrText - Raw OCR text from clothing tags/labels
 * @returns Extracted size or null if not found
 */
export const extractSize = (ocrText: string): string | null => {
  const text = safeTrim(toStr(ocrText));
  if (!text) return null;
  
  try {
    const s = safeUpper(text).replace(/\s+/g, " ");
    
    // Alpha sizes (most common)
    const alpha = s.match(/\b(XXXS|XXS|XS|S|M|L|XL|XXL|2XL|3XL|4XL)\b/);
    if (alpha) {
      console.log('✅ [SIZE-EXTRACT] Found alpha size:', alpha[1]);
      return alpha[1];
    }
    
    // Waist x Length (jeans/pants)
    const wxl = s.match(/\b(?:W)?(\d{2})\s*[-xX\/]\s*(?:L)?(\d{2})\b/);
    if (wxl) {
      const size = `${wxl[1]}x${wxl[2]}`;
      console.log('✅ [SIZE-EXTRACT] Found waist x length size:', size);
      return size;
    }
    
    // Size label format
    const labeled = s.match(/SIZE[:\s-]*([A-Z0-9]{1,4})\b/);
    if (labeled) {
      console.log('✅ [SIZE-EXTRACT] Found labeled size:', labeled[1]);
      return labeled[1];
    }
    
    // Dress/numeric sizes
    const dress = s.match(/\b(0|00|2|4|6|8|10|12|14|16|18|20|22|24)\b/);
    if (dress) {
      console.log('✅ [SIZE-EXTRACT] Found numeric size:', dress[1]);
      return dress[1];
    }
    
    console.log('ℹ️ [SIZE-EXTRACT] No size pattern found in OCR text');
    return null;
  } catch (error) {
    console.error('❌ [SIZE-EXTRACT] Error extracting size:', error);
    return null;
  }
};

/**
 * Extract brand from OCR text using known brand list
 * @param ocrText - Raw OCR text from clothing tags/labels
 * @param brands - Array of known brand names to search for
 * @returns Extracted brand or null if not found
 */
export const extractBrand = (ocrText: string, brands: string[] = KNOWN_BRANDS): string | null => {
  const text = safeTrim(toStr(ocrText));
  if (!text) return null;
  
  try {
    const s = safeUpper(text);
    
    // Find exact brand matches (case-insensitive)
    const hit = brands.find(brand => s.includes(safeUpper(brand)));
    
    if (hit) {
      console.log('✅ [BRAND-EXTRACT] Found brand in OCR:', hit);
      return hit;
    }
    
    console.log('ℹ️ [BRAND-EXTRACT] No known brand found in OCR text');
    return null;
  } catch (error) {
    console.error('❌ [BRAND-EXTRACT] Error extracting brand:', error);
    return null;
  }
};

/**
 * Build clean title from extracted components
 * @param components - Object with brand, item_type, color, size, etc.
 * @returns Formatted title string
 */
export const buildTitle = (components: {
  brand?: string | null;
  item_type: string;
  color?: string | null;
  size?: string | null;
  gender?: string | null;
  fabric?: string | null;
}): string => {
  const brand = nullIfUnknown(components.brand);
  const itemType = safeTrim(toStr(components.item_type));
  const color = nullIfUnknown(components.color);
  const size = nullIfUnknown(components.size);
  const gender = nullIfUnknown(components.gender);
  const fabric = nullIfUnknown(components.fabric);
  
  const parts = [
    brand,
    gender && /men|women|kid/i.test(gender) ? `${cap(gender)}'s` : null,
    itemType,
    fabric,
    color,
    size ? `Size ${safeUpper(toStr(size))}` : "Size Unknown",
  ].filter(Boolean);
  
  const title = parts.join(" ");
  console.log('🏗️ [BUILD-TITLE] Built title:', title);
  return title;
};

// Helper function to capitalize first letter
const cap = (s: string): string => {
  const str = safeTrim(toStr(s));
  return str.charAt(0).toUpperCase() + safeSlice(str, 1).toLowerCase();
};