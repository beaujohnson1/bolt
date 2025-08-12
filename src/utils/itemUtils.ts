// Utility functions for item data processing
import { safeTrim, safeLower, safeUpper, isStr, nullIfUnknown, safeSlice, toStr, take, safeNumber, sSub } from './strings';

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
 * Extract size from OCR text using comprehensive patterns for clothing tags
 * @param ocrText - Raw OCR text from clothing tags/labels
 * @returns Extracted size or null if not found
 */
export const extractSize = (ocrText: string): string | null => {
  const text = safeTrim(toStr(ocrText));
  if (!text) return null;
  
  try {
    const s = safeUpper(text).replace(/\s+/g, " ");
    console.log('🔍 [SIZE-EXTRACT] Analyzing OCR text:', s.substring(0, 100));
    
    // Common tag formats with size indicators
    const sizeIndicators = s.match(/(?:SIZE|SZ|TAILLE|TALLA|TAMAÑO)[:\s-]*([A-Z0-9\/]{1,6})\b/i);
    if (sizeIndicators) {
      console.log('✅ [SIZE-EXTRACT] Found size with indicator:', sizeIndicators[1]);
      return normalizeSize(sizeIndicators[1]);
    }
    
    // Alpha sizes with more variations (including full words)
    const alpha = s.match(/\b(XXXS|XXXSMALL|XXS|XXSMALL|XS|XSMALL|EXTRASMALL|SM|SMALL|S\b|MED|MEDIUM|M\b|LG|LARGE|L\b|XL|XLARGE|EXTRALARGE|XXL|XXLARGE|2XL|3XL|4XL|5XL)\b/);
    if (alpha) {
      console.log('✅ [SIZE-EXTRACT] Found alpha size:', alpha[1]);
      return normalizeSize(alpha[1]);
    }
    
    // More aggressive partial matching for common sizes (especially for OCR errors)
    if (s.includes('MEDIUM') || s.includes('MED ')) {
      console.log('✅ [SIZE-EXTRACT] Found partial match for MEDIUM');
      return 'M';
    }
    if (s.includes('SMALL') && !s.includes('XSMALL')) {
      console.log('✅ [SIZE-EXTRACT] Found partial match for SMALL');
      return 'S';
    }
    if (s.includes('LARGE') && !s.includes('XLARGE')) {
      console.log('✅ [SIZE-EXTRACT] Found partial match for LARGE');
      return 'L';
    }
    
    // European/International sizes
    const european = s.match(/\b(XXS|XS|S|M|L|XL|XXL)\s*[-\/]\s*(\d{2,3})\b/);
    if (european) {
      const size = `${european[1]}-${european[2]}`;
      console.log('✅ [SIZE-EXTRACT] Found European size:', size);
      return size;
    }
    
    // Waist x Length (jeans/pants) - more flexible
    const wxl = s.match(/\b(?:W)?\s*(\d{1,2})\s*[-xX\/×]\s*(?:L)?\s*(\d{1,2})\b/);
    if (wxl && parseInt(wxl[1]) >= 24 && parseInt(wxl[1]) <= 50 && parseInt(wxl[2]) >= 26 && parseInt(wxl[2]) <= 38) {
      const size = `${wxl[1]}x${wxl[2]}`;
      console.log('✅ [SIZE-EXTRACT] Found waist x length size:', size);
      return size;
    }
    
    // Numeric dress/women's sizes - extended range
    const dress = s.match(/\b(00|0|2|4|6|8|10|12|14|16|18|20|22|24|26|28|30)\b/);
    if (dress && !s.match(/\b\d{2,4}[\s]*[MLG]\b/)) { // Avoid matching measurements
      console.log('✅ [SIZE-EXTRACT] Found numeric size:', dress[1]);
      return dress[1];
    }
    
    // Kids sizes
    const kids = s.match(/\b(\d{1,2}[YT]|\d{1,2}\s*[YT]|TODDLER|INFANT|NEWBORN|NB)\b/);
    if (kids) {
      console.log('✅ [SIZE-EXTRACT] Found kids size:', kids[1]);
      return kids[1];
    }
    
    // Shoe sizes (US)
    const shoes = s.match(/\b(\d{1,2}(?:\.5)?)\s*(?:US|USA|D|B|M|W)?\b/);
    if (shoes && parseFloat(shoes[1]) >= 4 && parseFloat(shoes[1]) <= 18) {
      console.log('✅ [SIZE-EXTRACT] Found shoe size:', shoes[1]);
      return shoes[1];
    }
    
    // Size ranges (e.g., S/M, L/XL)
    const range = s.match(/\b([SMLX]{1,3})\s*[\/]\s*([SMLX]{1,3})\b/);
    if (range) {
      const size = `${range[1]}/${range[2]}`;
      console.log('✅ [SIZE-EXTRACT] Found size range:', size);
      return size;
    }
    
    // Final fallback: single letter matching for common sizes (very aggressive)
    const singleLetter = s.match(/\b([SMLX]{1})\b/);
    if (singleLetter && !s.includes('WALL') && !s.includes('STREET') && !s.includes('BULL')) {
      console.log('✅ [SIZE-EXTRACT] Found single letter size:', singleLetter[1]);
      return singleLetter[1];
    }
    
    console.log('ℹ️ [SIZE-EXTRACT] No size pattern found in OCR text');
    return null;
  } catch (error) {
    console.error('❌ [SIZE-EXTRACT] Error extracting size:', error);
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
 * Extract brand from OCR text using known brand list with fuzzy matching
 * @param ocrText - Raw OCR text from clothing tags/labels
 * @param brands - Array of known brand names to search for
 * @returns Extracted brand or null if not found
 */
export const extractBrand = (ocrText: string, brands: string[] = KNOWN_BRANDS): string | null => {
  const text = safeTrim(toStr(ocrText));
  if (!text) return null;
  
  try {
    const s = safeUpper(text).replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ');
    console.log('🔍 [BRAND-EXTRACT] Analyzing OCR text:', s.substring(0, 100));
    
    // First try exact matches (case-insensitive)
    const exactMatch = brands.find(brand => s.includes(safeUpper(brand)));
    if (exactMatch) {
      console.log('✅ [BRAND-EXTRACT] Found exact brand match:', exactMatch);
      return exactMatch;
    }
    
    // Try partial matches for compound brand names
    const partialMatch = brands.find(brand => {
      const brandWords = safeUpper(brand).split(/\s+/);
      return brandWords.length > 1 && brandWords.every(word => s.includes(word));
    });
    
    if (partialMatch) {
      console.log('✅ [BRAND-EXTRACT] Found partial brand match:', partialMatch);
      return partialMatch;
    }
    
    // Try fuzzy matching for common OCR errors
    const fuzzyMatch = brands.find(brand => {
      const brandUpper = safeUpper(brand);
      return fuzzyStringMatch(s, brandUpper, 0.8); // 80% similarity threshold
    });
    
    if (fuzzyMatch) {
      console.log('✅ [BRAND-EXTRACT] Found fuzzy brand match:', fuzzyMatch);
      return fuzzyMatch;
    }
    
    console.log('ℹ️ [BRAND-EXTRACT] No known brand found in OCR text');
    return null;
  } catch (error) {
    console.error('❌ [BRAND-EXTRACT] Error extracting brand:', error);
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
    
    console.log('ℹ️ [CONDITION-EXTRACT] No condition pattern found in OCR text');
    return null;
  } catch (error) {
    console.error('❌ [CONDITION-EXTRACT] Error extracting condition:', error);
    return null;
  }
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
  let remainingChars = 80;
  
  // 1. Brand (highest priority)
  if (brand && remainingChars > 0) {
    const brandPart = safeTrim(brand);
    if (brandPart.length <= remainingChars - 1) {
      titleParts.push(brandPart);
      remainingChars -= (brandPart.length + 1); // +1 for space
    }
  }
  
  // 2. Item Type (essential)
  if (itemType && remainingChars > 0) {
    const itemPart = safeTrim(itemType);
    if (itemPart.length <= remainingChars - 1) {
      titleParts.push(itemPart);
      remainingChars -= (itemPart.length + 1);
    }
  }
  
  // 3. Gender (very important for eBay search)
  if (gender && remainingChars > 0) {
    const genderPart = normalizeGenderForTitle(gender);
    if (genderPart && genderPart.length <= remainingChars - 1) {
      titleParts.push(genderPart);
      remainingChars -= (genderPart.length + 1);
    }
  }
  
  // 4. Size (critical for clothing)
  if (size && remainingChars > 0) {
    const sizePart = safeTrim(toStr(size));
    if (sizePart.length <= remainingChars - 1) {
      titleParts.push(sizePart);
      remainingChars -= (sizePart.length + 1);
    }
  }
  
  // 5. Color (important for search)
  if (color && remainingChars > 0) {
    const colorPart = safeTrim(color);
    if (colorPart.length <= remainingChars - 1) {
      titleParts.push(colorPart);
      remainingChars -= (colorPart.length + 1);
    }
  }
  
  // 6. Style descriptors (adds searchability)
  const styleDescriptors = [closure, fit, pattern, sleeveLength, neckline].filter(Boolean);
  for (const descriptor of styleDescriptors) {
    if (remainingChars > 0) {
      const descriptorPart = safeTrim(toStr(descriptor));
      if (descriptorPart.length <= remainingChars - 1) {
        titleParts.push(descriptorPart);
        remainingChars -= (descriptorPart.length + 1);
      }
    }
  }
  
  // 7. High-value keywords (trending/searchable terms)
  const prioritizedKeywords = prioritizeEbayKeywords(allKeywords);
  for (const keyword of prioritizedKeywords) {
    if (remainingChars > 0) {
      const keywordPart = safeTrim(keyword);
      if (keywordPart.length <= remainingChars - 1) {
        titleParts.push(keywordPart);
        remainingChars -= (keywordPart.length + 1);
      }
    }
  }
  
  // 8. Material (if space allows)
  if (material && remainingChars > 0) {
    const materialPart = safeTrim(material);
    if (materialPart.length <= remainingChars - 1) {
      titleParts.push(materialPart);
      remainingChars -= (materialPart.length + 1);
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
  
  // Remove duplicates and return top 5 keywords
  const uniqueKeywords = [...new Set(sortedKeywords.map(k => safeTrim(toStr(k))))];
  return uniqueKeywords.slice(0, 5);
};

// Helper function to capitalize first letter
const cap = (s: string): string => {
  const str = safeTrim(toStr(s));
  return str.charAt(0).toUpperCase() + sSub(str, 1).toLowerCase();
};