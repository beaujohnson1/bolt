// Utility functions for item data processing
import { safeTrim, safeLower, safeUpper, isStr, nullIfUnknown, safeSlice, toStr, take, safeNumber, sSub } from './strings';
import { enhancedBrandDetector } from '../services/EnhancedBrandDetector';
import { enhancedSizeProcessor } from '../services/EnhancedSizeProcessor';

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
    // Clothing
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
    
    // Shoes
    'shoes': 'shoes',
    'sneakers': 'shoes',
    'boots': 'shoes',
    'sandals': 'shoes',
    'heels': 'shoes',
    'footwear': 'shoes',
    
    // Accessories
    'accessories': 'accessories',
    'bag': 'accessories',
    'purse': 'accessories',
    'backpack': 'accessories',
    'belt': 'accessories',
    'hat': 'accessories',
    'scarf': 'accessories',
    'sunglasses': 'accessories',
    
    // Electronics
    'electronics': 'electronics',
    'phone': 'electronics',
    'smartphone': 'electronics',
    'tablet': 'electronics',
    'laptop': 'electronics',
    'computer': 'electronics',
    'tv': 'electronics',
    'television': 'electronics',
    'speaker': 'electronics',
    'headphones': 'electronics',
    'camera': 'electronics',
    'gaming': 'electronics',
    'console': 'electronics',
    'xbox': 'electronics',
    'playstation': 'electronics',
    'nintendo': 'electronics',
    
    // Home & Garden
    'home_garden': 'home_garden',
    'kitchen': 'home_garden',
    'cookware': 'home_garden',
    'appliance': 'home_garden',
    'furniture': 'home_garden',
    'decor': 'home_garden',
    'lamp': 'home_garden',
    'vase': 'home_garden',
    'garden': 'home_garden',
    
    // Toys & Games
    'toys_games': 'toys_games',
    'toy': 'toys_games',
    'doll': 'toys_games',
    'action figure': 'toys_games',
    'lego': 'toys_games',
    'puzzle': 'toys_games',
    'board game': 'toys_games',
    'card game': 'toys_games',
    'video game': 'toys_games',
    
    // Sports & Outdoors
    'sports_outdoors': 'sports_outdoors',
    'sports': 'sports_outdoors',
    'fitness': 'sports_outdoors',
    'exercise': 'sports_outdoors',
    'gym': 'sports_outdoors',
    'camping': 'sports_outdoors',
    'hiking': 'sports_outdoors',
    'fishing': 'sports_outdoors',
    'golf': 'sports_outdoors',
    'tennis': 'sports_outdoors',
    'basketball': 'sports_outdoors',
    'football': 'sports_outdoors',
    'soccer': 'sports_outdoors',
    'baseball': 'sports_outdoors',
    
    // Books & Media
    'books_media': 'books_media',
    'book': 'books_media',
    'novel': 'books_media',
    'textbook': 'books_media',
    'manual': 'books_media',
    'dvd': 'books_media',
    'blu-ray': 'books_media',
    'cd': 'books_media',
    'vinyl': 'books_media',
    'record': 'books_media',
    'music': 'books_media',
    'movie': 'books_media',
    'film': 'books_media',
    
    // Jewelry
    'jewelry': 'jewelry',
    'watch': 'jewelry',
    'necklace': 'jewelry',
    'bracelet': 'jewelry',
    'ring': 'jewelry',
    'earrings': 'jewelry',
    
    // Collectibles
    'collectibles': 'collectibles',
    'vintage': 'collectibles',
    'antique': 'collectibles',
    'rare': 'collectibles',
    'limited edition': 'collectibles',
    'collectible': 'collectibles',
    'memorabilia': 'collectibles',
    'trading card': 'collectibles',
    'comic': 'collectibles',
    'figurine': 'collectibles'
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

// Known brands list for pre-extraction - expanded with additional brands
const KNOWN_BRANDS = [
  'Lululemon', 'Nike', 'Adidas', 'North Face', 'Patagonia', 'Under Armour', 
  'Gap', 'Old Navy', 'H&M', 'Zara', 'Uniqlo', 'American Eagle', 'Hollister', 
  'Abercrombie', 'Banana Republic', 'J.Crew', 'Ann Taylor', 'LOFT', 'Express', 
  'Forever 21', 'Farm Rio', 'Free People', 'Anthropologie', 'Urban Outfitters', 
  'Madewell', 'Everlane', 'Reformation', 'Ganni', 'COS', 'Arket', 'Weekday',
  'Target', 'Walmart', 'Costco', 'Kirkland', 'Goodfellow', 'Universal Thread',
  'Wild Fable', 'Time and Tru', 'George', 'Champion', 'Hanes', 'Fruit of the Loom',
  'Calvin Klein', 'Tommy Hilfiger', 'Ralph Lauren', 'Polo', 'Lacoste', 'Hugo Boss',
  'Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Versace', 'Armani', 'Burberry',
  'Stio', 'Wall Street Bull', 'Supreme', 'Off-White', 'Stone Island', 'Yeezy',
  'Balenciaga', 'Saint Laurent', 'Givenchy', 'Bottega Veneta', 'Moncler', 'Canada Goose',
  'Arc\'teryx', 'Columbia', 'REI', 'Outdoor Research', 'Mammut', 'Salomon',
  'Carhartt', 'Dickies', 'Wrangler', 'Levis', 'Lee', 'True Religion', 'Lucky Brand',
  'Diesel', 'G-Star', 'Pepe Jeans', 'Replay', 'Scotch & Soda', 'Nudie Jeans'
];

/**
 * Extract size from OCR text using enhanced size processing with comprehensive patterns
 * @param ocrText - Raw OCR text from clothing tags/labels
 * @param genderHint - Optional gender hint for better size matching
 * @param categoryHint - Optional category hint for better size matching
 * @returns Extracted size or null if not found
 */
export const extractSize = async (ocrText: string, genderHint?: string, categoryHint?: string): Promise<string | null> => {
  const text = safeTrim(toStr(ocrText));
  if (!text) return null;
  
  try {
    console.log('🔍 [SIZE-EXTRACT] Using enhanced size processor on OCR text:', text.substring(0, 100));
    
    // First try enhanced size processor with context hints
    const genderMapping: Record<string, any> = {
      'men': 'men',
      'male': 'men', 
      'man': 'men',
      'women': 'women',
      'female': 'women',
      'woman': 'women',
      'unisex': 'unisex',
      'kids': 'kids',
      'children': 'kids'
    };
    
    const categoryMapping: Record<string, any> = {
      'clothing': 'clothing',
      'shoes': 'shoes',
      'accessories': 'accessories'
    };
    
    const mappedGender = genderHint ? genderMapping[genderHint.toLowerCase()] : undefined;
    const mappedCategory = categoryHint ? categoryMapping[categoryHint.toLowerCase()] : 'clothing';
    
    // Try enhanced processing on individual tokens and phrases
    const sizeMatches = await enhancedSizeProcessor.processSize(text, mappedGender, mappedCategory);
    
    if (sizeMatches && sizeMatches.length > 0) {
      const topMatch = sizeMatches[0];
      console.log('✅ [SIZE-EXTRACT] Enhanced processor found size:', {
        size: topMatch.standardSize,
        confidence: topMatch.confidence,
        type: topMatch.sizeType,
        ebayCompliant: topMatch.ebayCompliant
      });
      return topMatch.standardSize;
    }
    
    // Fallback to legacy size extraction for edge cases
    console.log('🔄 [SIZE-EXTRACT] Enhanced processor found no matches, trying legacy patterns...');
    const legacySize = await extractSizeLegacy(text);
    if (legacySize) {
      console.log('✅ [SIZE-EXTRACT] Legacy extraction found size:', legacySize);
      return legacySize;
    }
    
    console.log('ℹ️ [SIZE-EXTRACT] No size pattern found in OCR text');
    return null;
  } catch (error) {
    console.error('❌ [SIZE-EXTRACT] Enhanced size extraction error:', error);
    
    // Final fallback to legacy extraction
    console.log('🔄 [SIZE-EXTRACT] Falling back to legacy size extraction');
    return await extractSizeLegacy(text);
  }
};

/**
 * Legacy size extraction function (fallback)
 * @param ocrText - Raw OCR text from clothing tags/labels
 * @returns Extracted size or null if not found
 */
const extractSizeLegacy = async (ocrText: string): Promise<string | null> => {
  const text = safeTrim(toStr(ocrText));
  if (!text) return null;
  
  try {
    const s = safeUpper(text).replace(/\s+/g, " ");
    console.log('🔍 [SIZE-EXTRACT-LEGACY] Analyzing OCR text:', s.substring(0, 100));
    
    // Common tag formats with size indicators
    const sizeIndicators = s.match(/(?:SIZE|SZ|TAILLE|TALLA|TAMAÑO)[:\s-]*([A-Z0-9\/]{1,6})\b/i);
    if (sizeIndicators) {
      console.log('✅ [SIZE-EXTRACT-LEGACY] Found size with indicator:', sizeIndicators[1]);
      return normalizeSize(sizeIndicators[1]);
    }
    
    // Alpha sizes with more variations (including full words)
    const alpha = s.match(/\b(XXXS|XXXSMALL|XXS|XXSMALL|XS|XSMALL|EXTRASMALL|SM|SMALL|S\b|MED|MEDIUM|M\b|LG|LARGE|L\b|XL|XLARGE|EXTRALARGE|XXL|XXLARGE|2XL|3XL|4XL|5XL)\b/);
    if (alpha) {
      console.log('✅ [SIZE-EXTRACT-LEGACY] Found alpha size:', alpha[1]);
      return normalizeSize(alpha[1]);
    }
    
    // Numeric dress/women's sizes - extended range
    const dress = s.match(/\b(00|0|2|4|6|8|10|12|14|16|18|20|22|24|26|28|30)\b/);
    if (dress && !s.match(/\b\d{2,4}[\s]*[MLG]\b/)) { // Avoid matching measurements
      console.log('✅ [SIZE-EXTRACT-LEGACY] Found numeric size:', dress[1]);
      return dress[1];
    }
    
    // Single letter matching for common sizes
    const singleLetter = s.match(/\b([SMLX]{1})\b/);
    if (singleLetter && !s.includes('WALL') && !s.includes('STREET') && !s.includes('BULL')) {
      console.log('✅ [SIZE-EXTRACT-LEGACY] Found single letter size:', singleLetter[1]);
      return singleLetter[1];
    }
    
    console.log('ℹ️ [SIZE-EXTRACT-LEGACY] No size pattern found in OCR text');
    return null;
  } catch (error) {
    console.error('❌ [SIZE-EXTRACT-LEGACY] Error extracting size:', error);
    return null;
  }
};

/**
 * Normalize size format for consistency - expands abbreviations to full size names
 * @param size - Raw size string
 * @returns Normalized size string with full names
 */
const normalizeSize = (size: string): string => {
  const s = safeUpper(safeTrim(toStr(size)));
  
  // Size mapping to expand abbreviations to full size names
  const sizeMap: { [key: string]: string } = {
    // Standard abbreviations to full names
    'XXXS': 'Extra Extra Extra Small',
    'XXS': 'Extra Extra Small', 
    'XS': 'Extra Small',
    'S': 'Small',
    'M': 'Medium',
    'L': 'Large',
    'XL': 'Extra Large',
    'XXL': 'Extra Extra Large',
    '2XL': 'Extra Extra Large',
    '3XL': 'Extra Extra Extra Large',
    '4XL': 'Extra Extra Extra Extra Large',
    '5XL': 'Extra Extra Extra Extra Extra Large',
    
    // Full names stay as full names
    'XXXSMALL': 'Extra Extra Extra Small',
    'XXSMALL': 'Extra Extra Small',
    'XSMALL': 'Extra Small',
    'EXTRASMALL': 'Extra Small',
    'SMALL': 'Small',
    'MEDIUM': 'Medium',
    'MED': 'Medium',
    'LARGE': 'Large',
    'XLARGE': 'Extra Large',
    'EXTRALARGE': 'Extra Large',
    'XXLARGE': 'Extra Extra Large'
  };
  
  // Return expanded size name if found, otherwise return original
  return sizeMap[s] || s;
};

/**
 * Extract brand from OCR text using enhanced brand detection with fuzzy matching
 * @param ocrText - Raw OCR text from clothing tags/labels
 * @param priceHint - Optional price hint for better brand matching
 * @param categoryHint - Optional category hint for better brand matching
 * @returns Extracted brand or null if not found
 */
export const extractBrand = async (ocrText: string, priceHint?: number, categoryHint?: string): Promise<string | null> => {
  const text = safeTrim(toStr(ocrText));
  if (!text) return null;
  
  try {
    console.log('🔍 [BRAND-EXTRACT] Using enhanced brand detector on OCR text:', text.substring(0, 100));
    
    // Use the enhanced brand detector with advanced algorithms
    const brandMatches = await enhancedBrandDetector.detectBrands(text, priceHint, categoryHint);
    
    if (brandMatches && brandMatches.length > 0) {
      const topMatch = brandMatches[0];
      console.log('✅ [BRAND-EXTRACT] Enhanced detection found brand:', {
        brand: topMatch.brand,
        confidence: topMatch.confidence,
        matchType: topMatch.matchType,
        originalText: topMatch.originalText
      });
      return topMatch.brand;
    }
    
    console.log('ℹ️ [BRAND-EXTRACT] Enhanced brand detector found no matches');
    return null;
  } catch (error) {
    console.error('❌ [BRAND-EXTRACT] Enhanced brand detection error:', error);
    
    // Fallback to legacy brand detection
    console.log('🔄 [BRAND-EXTRACT] Falling back to legacy brand detection');
    return extractBrandLegacy(ocrText);
  }
};

/**
 * Legacy brand extraction function (fallback)
 * @param ocrText - Raw OCR text from clothing tags/labels
 * @returns Extracted brand or null if not found
 */
const extractBrandLegacy = (ocrText: string): string | null => {
  const text = safeTrim(toStr(ocrText));
  if (!text) return null;
  
  try {
    const s = safeUpper(text).replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ');
    console.log('🔍 [BRAND-EXTRACT-LEGACY] Analyzing OCR text:', s.substring(0, 100));
    
    // First try exact matches (case-insensitive)
    const exactMatch = KNOWN_BRANDS.find(brand => s.includes(safeUpper(brand)));
    if (exactMatch) {
      console.log('✅ [BRAND-EXTRACT-LEGACY] Found exact brand match:', exactMatch);
      return exactMatch;
    }
    
    // Try partial matches for compound brand names
    const partialMatch = KNOWN_BRANDS.find(brand => {
      const brandWords = safeUpper(brand).split(/\s+/);
      return brandWords.length > 1 && brandWords.every(word => s.includes(word));
    });
    
    if (partialMatch) {
      console.log('✅ [BRAND-EXTRACT-LEGACY] Found partial brand match:', partialMatch);
      return partialMatch;
    }
    
    console.log('ℹ️ [BRAND-EXTRACT-LEGACY] No known brand found in OCR text');
    return null;
  } catch (error) {
    console.error('❌ [BRAND-EXTRACT-LEGACY] Error extracting brand:', error);
    return null;
  }
};

/**
 * Simple fuzzy string matching for OCR error tolerance
 * @param text - Input text to search in
 * @param pattern - Pattern to search for
 * @param threshold - Similarity threshold (0-1)
 * @returns True if fuzzy match found
 */
const fuzzyStringMatch = (text: string, pattern: string, threshold: number): boolean => {
  if (!text || !pattern) return false;
  
  // Calculate Levenshtein distance-based similarity
  const words = text.split(/\s+/);
  return words.some(word => {
    if (word.length < 2) return false;
    const similarity = calculateSimilarity(word, pattern);
    return similarity >= threshold;
  });
};

/**
 * Calculate string similarity (simplified)
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score (0-1)
 */
const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Extract condition from OCR text using clothing condition patterns
 * @param ocrText - Raw OCR text from clothing tags/labels
 * @returns Extracted condition or null if not found
 */
export const extractCondition = (ocrText: string): string | null => {
  const text = safeTrim(toStr(ocrText));
  if (!text) return null;
  
  try {
    const s = safeUpper(text);
    console.log('🏷️ [CONDITION-EXTRACT] Analyzing OCR text for condition:', s.substring(0, 100));
    
    // New with tags patterns
    if (s.includes('NWT') || s.includes('NEW WITH TAGS') || s.includes('BRAND NEW') || s.includes('TAGS ATTACHED')) {
      console.log('✅ [CONDITION-EXTRACT] Found new with tags condition');
      return 'new';
    }
    
    // Like new patterns
    if (s.includes('LIKE NEW') || s.includes('EXCELLENT') || s.includes('MINT') || s.includes('PERFECT')) {
      console.log('✅ [CONDITION-EXTRACT] Found like new condition');
      return 'like_new';
    }
    
    // Gently used patterns
    if (s.includes('GENTLY USED') || s.includes('GOOD CONDITION') || s.includes('MINIMAL WEAR') || s.includes('LIGHT USE')) {
      console.log('✅ [CONDITION-EXTRACT] Found gently used condition');
      return 'good';
    }
    
    // Heavy wear patterns
    if (s.includes('HEAVY WEAR') || s.includes('SIGNS OF WEAR') || s.includes('WELL USED') || s.includes('FLAW') || 
        s.includes('STAIN') || s.includes('HOLE') || s.includes('DAMAGE') || s.includes('WORN')) {
      console.log('✅ [CONDITION-EXTRACT] Found heavy wear condition');
      return 'fair';
    }
    
    // Fair/poor condition patterns
    if (s.includes('FAIR') || s.includes('POOR') || s.includes('DAMAGED') || s.includes('TORN') || s.includes('RIPPED')) {
      console.log('✅ [CONDITION-EXTRACT] Found poor condition');
      return 'poor';
    }
    
    // Check for vintage/retro patterns (these are often in good condition)
    if (s.includes('VINTAGE') || s.includes('RETRO') || s.includes('CLASSIC') || s.includes('THROWBACK')) {
      console.log('✅ [CONDITION-EXTRACT] Found vintage item, assuming good condition');
      return 'good';
    }
    
    // Check for new item indicators (price tags, store tags, etc.)
    if (s.includes('$') || s.includes('PRICE') || s.includes('TAG') || s.includes('STORE')) {
      console.log('✅ [CONDITION-EXTRACT] Found price/tag indicators, likely good condition');
      return 'good';
    }
    
    console.log('ℹ️ [CONDITION-EXTRACT] No condition pattern found in OCR text, defaulting to good');
    return 'good'; // Default to good condition instead of null
  } catch (error) {
    console.error('❌ [CONDITION-EXTRACT] Error extracting condition:', error);
    return null;
  }
};

/**
 * Extract color from OCR text
 * @param ocrText - Raw OCR text from clothing tags/labels
 * @returns Extracted color or null if not found
 */
export const extractColor = (ocrText: string): string | null => {
  const text = safeTrim(toStr(ocrText));
  if (!text) return null;
  
  try {
    const s = safeUpper(text).replace(/\s+/g, " ");
    console.log('🎨 [COLOR-EXTRACT] Analyzing OCR text for color:', s.substring(0, 100));
    
    // Define comprehensive color patterns
    const colorPatterns = [
      // Basic colors
      /\b(BLACK|WHITE|GRAY|GREY|RED|BLUE|GREEN|YELLOW|ORANGE|PURPLE|PINK|BROWN|BEIGE|TAN|NAVY|MAROON)\b/,
      // Specific shades
      /\b(BLONDE?|BLOND|CREAM|IVORY|OFF-?WHITE|CHARCOAL|SILVER|GOLD|BRONZE|COPPER|RUST)\b/,
      // Fashion colors
      /\b(BURGUNDY|CRIMSON|SCARLET|TURQUOISE|TEAL|AQUA|LIME|OLIVE|KHAKI|DENIM|INDIGO)\b/,
      // Light/dark variations
      /\b(LIGHT|DARK|PALE|BRIGHT|DEEP|ROYAL|ELECTRIC|NEON)\s+(BLACK|WHITE|GRAY|GREY|RED|BLUE|GREEN|YELLOW|ORANGE|PURPLE|PINK|BROWN)\b/,
      // Multi-word colors
      /\b(FOREST\s+GREEN|NAVY\s+BLUE|ROYAL\s+BLUE|HOT\s+PINK|BABY\s+BLUE|POWDER\s+BLUE)\b/
    ];
    
    for (const pattern of colorPatterns) {
      const match = s.match(pattern);
      if (match) {
        const color = match[0].toLowerCase().replace(/\s+/g, ' ').trim();
        console.log('✅ [COLOR-EXTRACT] Found color:', color);
        return normalizeColor(color);
      }
    }
    
    console.log('ℹ️ [COLOR-EXTRACT] No color pattern found in OCR text');
    return null;
  } catch (error) {
    console.error('❌ [COLOR-EXTRACT] Error extracting color:', error);
    return null;
  }
};

/**
 * Normalize color names for consistency
 * @param color - Raw color string
 * @returns Normalized color string
 */
const normalizeColor = (color: string): string => {
  const c = safeTrim(toStr(color)).toLowerCase();
  
  const colorMap: { [key: string]: string } = {
    'blonde': 'Blonde',
    'blond': 'Blonde', 
    'grey': 'Gray',
    'navy blue': 'Navy',
    'royal blue': 'Royal Blue',
    'forest green': 'Forest Green',
    'hot pink': 'Hot Pink',
    'baby blue': 'Baby Blue',
    'powder blue': 'Powder Blue',
    'off white': 'Off White',
    'off-white': 'Off White'
  };
  
  return colorMap[c] || c.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

/**
 * Build eBay-optimized title from extracted components with 80-character limit
 * Format: Brand + Item Type + Gender + Size + Color + Style Keywords + Materials
 * @param components - Object with brand, item_type, color, size, etc.
 * @returns eBay-optimized title string (max 80 chars)
 */
export const buildTitle = (components: {
  brand?: string | null;
  item_type: string;
  color?: string | null;
  size?: string | null;
  gender?: string | null;
  material?: string | null;
  pattern?: string | null;
  fit?: string | null;
  closure?: string | null;
  sleeve_length?: string | null;
  neckline?: string | null;
  style_keywords?: string[];
  ebay_keywords?: string[];
  keywords?: string[];
}): string => {
  console.log('🏗️ [BUILD-TITLE] Starting eBay title optimization with components:', components);
  
  // Extract and clean components
  const brand = nullIfUnknown(components.brand);
  const itemType = safeTrim(toStr(components.item_type));
  const color = nullIfUnknown(components.color);
  const size = nullIfUnknown(components.size);
  const gender = nullIfUnknown(components.gender);
  const material = nullIfUnknown(components.material);
  const pattern = nullIfUnknown(components.pattern);
  const fit = nullIfUnknown(components.fit);
  const closure = nullIfUnknown(components.closure);
  const sleeveLength = nullIfUnknown(components.sleeve_length);
  const neckline = nullIfUnknown(components.neckline);
  
  // Combine all keyword sources and prioritize
  const allKeywords = [
    ...(components.style_keywords || []),
    ...(components.ebay_keywords || []),
    ...(components.keywords || [])
  ].filter(Boolean).map(k => safeTrim(toStr(k))).filter(k => k.length > 0);
  
  // Priority order for eBay titles (most important first)
  const titleParts = [];
  const usedWords = new Set(); // Track used words to prevent duplicates
  let remainingChars = 80;
  
  // Helper function to add parts without duplicating words
  const addUniquePart = (part, description) => {
    if (!part || remainingChars <= 0) return false;
    
    const cleanPart = safeTrim(toStr(part));
    if (!cleanPart || cleanPart.length > remainingChars - 1) return false;
    
    // Check for word overlaps (case-insensitive)
    const partWords = cleanPart.toLowerCase().split(/\s+/);
    const hasOverlap = partWords.some(word => usedWords.has(word));
    
    if (!hasOverlap) {
      titleParts.push(cleanPart);
      partWords.forEach(word => usedWords.add(word));
      remainingChars -= (cleanPart.length + 1); // +1 for space
      console.log(`✅ [BUILD-TITLE] Added ${description}:`, cleanPart);
      return true;
    } else {
      console.log(`⚠️ [BUILD-TITLE] Skipped ${description} due to word overlap:`, cleanPart);
      return false;
    }
  };
  
  // 1. Brand (highest priority)
  addUniquePart(brand, 'brand');
  
  // 2. Item Type (essential)
  addUniquePart(itemType, 'item type');
  
  // 3. Gender (very important for eBay search)
  addUniquePart(normalizeGenderForTitle(gender), 'gender');
  
  // 4. Size (critical for clothing)
  addUniquePart(size, 'size');
  
  // 5. Color (important for search)
  addUniquePart(color, 'color');
  
  // 6. Style descriptors (adds searchability)
  const styleDescriptors = [closure, fit, pattern, sleeveLength, neckline].filter(Boolean);
  for (const descriptor of styleDescriptors) {
    addUniquePart(descriptor, 'style descriptor');
  }
  
  // 7. Material (if space allows)
  addUniquePart(material, 'material');
  
  // 8. High-value keywords (trending/searchable terms) - use MORE keywords to fill title
  const prioritizedKeywords = prioritizeEbayKeywords(allKeywords);
  for (const keyword of prioritizedKeywords) {
    if (remainingChars <= 5) break; // Stop when we're close to limit
    addUniquePart(keyword, 'keyword');
  }
  
  // 9. Additional keywords to maximize eBay search visibility (up to 80 chars)
  if (remainingChars > 10) {
    const additionalKeywords = allKeywords.filter(k => 
      !prioritizedKeywords.includes(k) && 
      k.length <= remainingChars - 1 &&
      !usedWords.has(k.toLowerCase())
    );
    
    for (const keyword of additionalKeywords) {
      if (remainingChars <= 5) break;
      addUniquePart(keyword, 'additional keyword');
    }
  }
  
  const title = titleParts.join(' ');
  const finalTitle = title.length > 80 ? title.substring(0, 77) + '...' : title;
  
  console.log('✅ [BUILD-TITLE] eBay optimized title created:', finalTitle);
  console.log('📏 [BUILD-TITLE] Character count:', finalTitle.length, '/ 80');
  console.log('🔤 [BUILD-TITLE] Remaining characters:', 80 - finalTitle.length);
  
  return finalTitle;
};

/**
 * Normalize gender for eBay title format
 * @param gender - Raw gender string from AI
 * @returns Normalized gender for eBay titles
 */
const normalizeGenderForTitle = (gender: string): string | null => {
  const g = safeTrim(toStr(gender)).toLowerCase();
  
  const genderMap: { [key: string]: string } = {
    'men': 'Men',
    'male': 'Men', 
    'mens': 'Men',
    'man': 'Men',
    'women': 'Women',
    'female': 'Women',
    'womens': 'Women', 
    'woman': 'Women',
    'ladies': 'Women',
    'unisex': 'Unisex',
    'boys': 'Boys',
    'boy': 'Boys',
    'girls': 'Girls',
    'girl': 'Girls',
    'kids': 'Kids',
    'children': 'Kids'
  };
  
  return genderMap[g] || null;
};

/**
 * Prioritize eBay keywords for maximum search visibility
 * @param keywords - Array of keywords to prioritize
 * @returns Sorted keywords by eBay search importance
 */
const prioritizeEbayKeywords = (keywords: string[]): string[] => {
  if (!Array.isArray(keywords)) return [];
  
  // Define keyword priority tiers for eBay search
  const highPriorityTerms = [
    'vintage', 'rare', 'designer', 'luxury', 'premium', 'authentic',
    'new', 'nwt', 'preppy', 'casual', 'business', 'formal', 'athletic',
    'streetwear', 'trendy', 'classic', 'retro', 'boho', 'minimalist'
  ];
  
  const mediumPriorityTerms = [
    'cotton', 'wool', 'denim', 'leather', 'silk', 'cashmere',
    'button', 'zip', 'pullover', 'slim', 'regular', 'relaxed',
    'striped', 'plaid', 'solid', 'graphic', 'print', 'embroidered'
  ];
  
  const lowPriorityTerms = [
    'comfortable', 'stylish', 'modern', 'elegant', 'chic',
    'versatile', 'seasonal', 'everyday', 'office', 'weekend'
  ];
  
  // Sort keywords by priority tier
  const sortedKeywords = keywords.sort((a, b) => {
    const aLower = safeTrim(toStr(a)).toLowerCase();
    const bLower = safeTrim(toStr(b)).toLowerCase();
    
    const aPriority = highPriorityTerms.includes(aLower) ? 3 :
                     mediumPriorityTerms.includes(aLower) ? 2 :
                     lowPriorityTerms.includes(aLower) ? 1 : 0;
    
    const bPriority = highPriorityTerms.includes(bLower) ? 3 :
                     mediumPriorityTerms.includes(bLower) ? 2 :
                     lowPriorityTerms.includes(bLower) ? 1 : 0;
    
    // Higher priority first, then by length (shorter preferred for space efficiency)
    if (aPriority !== bPriority) return bPriority - aPriority;
    return a.length - b.length;
  });
  
  // Remove duplicates and return top 10 keywords (increased from 5 for better title filling)
  const uniqueKeywords = [...new Set(sortedKeywords.map(k => safeTrim(toStr(k))))];
  return uniqueKeywords.slice(0, 10);
};

// Helper function to capitalize first letter
const cap = (s: string): string => {
  const str = safeTrim(toStr(s));
  return str.charAt(0).toUpperCase() + sSub(str, 1).toLowerCase();
};