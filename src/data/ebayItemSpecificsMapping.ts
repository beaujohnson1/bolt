/**
 * eBay Item Specifics Mapping
 * 
 * Maps clothing item types to their relevant eBay item specifics fields.
 * This ensures only appropriate fields are shown for each garment type.
 */

export interface EbayItemSpecific {
  name: string;
  required: boolean;
  allowedValues?: string[];
  description?: string;
}

export interface CategoryMapping {
  itemTypes: string[];
  ebayCategory: string;
  categoryId?: number;
  specifics: EbayItemSpecific[];
}

// Common specifics used across multiple categories
const COMMON_SPECIFICS = {
  brand: { name: 'Brand', required: true },
  department: { 
    name: 'Department', 
    required: true, 
    allowedValues: ['Men', 'Women', 'Unisex Adult', 'Boys', 'Girls'] 
  },
  size: { name: 'Size', required: true },
  sizeType: { 
    name: 'Size Type', 
    required: true, 
    allowedValues: ['Regular', 'Plus', 'Petite', 'Big & Tall', 'Maternity'] 
  },
  color: { name: 'Color', required: false },
  material: { 
    name: 'Material', 
    required: false,
    allowedValues: ['Cotton', 'Polyester', 'Wool', 'Silk', 'Denim', 'Leather', 'Cashmere', 'Linen', 'Spandex', 'Viscose', 'Modal', 'Bamboo', 'Nylon', 'Rayon']
  },
  pattern: { 
    name: 'Pattern', 
    required: false,
    allowedValues: ['Solid', 'Striped', 'Plaid', 'Floral', 'Animal Print', 'Abstract', 'Geometric', 'Polka Dot', 'Paisley', 'Camouflage']
  },
  occasion: { 
    name: 'Occasion', 
    required: false,
    allowedValues: ['Casual', 'Business', 'Party', 'Wedding', 'Work', 'Travel', 'Beach', 'Athletic']
  },
  season: { 
    name: 'Season', 
    required: false,
    allowedValues: ['Spring', 'Summer', 'Fall', 'Winter', 'All Seasons']
  },
  style: { 
    name: 'Style', 
    required: false,
    allowedValues: ['Vintage', 'Classic', 'Modern', 'Bohemian', 'Preppy', 'Gothic', 'Streetwear', 'Minimalist']
  }
};

// Category-specific mappings
export const EBAY_CATEGORY_MAPPINGS: CategoryMapping[] = [
  // PANTS & TROUSERS
  {
    itemTypes: ['pants', 'trousers', 'slacks', 'chinos', 'khakis', 'dress pants', 'work pants'],
    ebayCategory: 'Clothing, Shoes & Accessories > Men\'s Clothing > Pants',
    specifics: [
      COMMON_SPECIFICS.brand,
      COMMON_SPECIFICS.department,
      { name: 'Type', required: true },
      COMMON_SPECIFICS.size,
      COMMON_SPECIFICS.sizeType,
      COMMON_SPECIFICS.color,
      COMMON_SPECIFICS.material,
      COMMON_SPECIFICS.pattern,
      { 
        name: 'Fit', 
        required: false,
        allowedValues: ['Slim', 'Regular', 'Relaxed', 'Straight', 'Bootcut', 'Tapered', 'Wide Leg']
      },
      { 
        name: 'Rise', 
        required: false,
        allowedValues: ['Low Rise', 'Mid Rise', 'High Rise']
      },
      { 
        name: 'Closure', 
        required: false,
        allowedValues: ['Button Fly', 'Zip Fly', 'Hook & Eye', 'Drawstring']
      },
      { 
        name: 'Features', 
        required: false,
        allowedValues: ['Pockets', 'Belt Loops', 'Pleats', 'Cuffs', 'Wrinkle Resistant']
      },
      COMMON_SPECIFICS.occasion,
      COMMON_SPECIFICS.season,
      COMMON_SPECIFICS.style
    ]
  },

  // JEANS
  {
    itemTypes: ['jeans', 'denim', 'denim pants'],
    ebayCategory: 'Clothing, Shoes & Accessories > Men\'s Clothing > Jeans',
    specifics: [
      COMMON_SPECIFICS.brand,
      COMMON_SPECIFICS.department,
      { name: 'Type', required: true },
      COMMON_SPECIFICS.size,
      COMMON_SPECIFICS.sizeType,
      COMMON_SPECIFICS.color,
      { 
        name: 'Material', 
        required: false,
        allowedValues: ['100% Cotton', 'Cotton Blend', 'Stretch Denim', 'Raw Denim', 'Selvedge Denim']
      },
      { 
        name: 'Wash', 
        required: false,
        allowedValues: ['Dark Wash', 'Medium Wash', 'Light Wash', 'Stone Wash', 'Acid Wash', 'Distressed', 'Raw']
      },
      { 
        name: 'Fit', 
        required: false,
        allowedValues: ['Skinny', 'Slim', 'Straight', 'Regular', 'Relaxed', 'Bootcut', 'Flare', 'Wide Leg']
      },
      { 
        name: 'Rise', 
        required: false,
        allowedValues: ['Low Rise', 'Mid Rise', 'High Rise']
      },
      { 
        name: 'Inseam', 
        required: false
      },
      { 
        name: 'Features', 
        required: false,
        allowedValues: ['Distressed', 'Ripped', 'Faded', 'Embroidered', 'Pockets', 'Belt Loops']
      },
      COMMON_SPECIFICS.occasion,
      COMMON_SPECIFICS.style
    ]
  },

  // SHIRTS & TOPS
  {
    itemTypes: ['shirt', 'dress shirt', 'button down', 'blouse', 'top', 'tunic'],
    ebayCategory: 'Clothing, Shoes & Accessories > Men\'s Clothing > Dress Shirts',
    specifics: [
      COMMON_SPECIFICS.brand,
      COMMON_SPECIFICS.department,
      { name: 'Type', required: true },
      COMMON_SPECIFICS.size,
      COMMON_SPECIFICS.sizeType,
      COMMON_SPECIFICS.color,
      COMMON_SPECIFICS.material,
      COMMON_SPECIFICS.pattern,
      { 
        name: 'Sleeve Length', 
        required: false,
        allowedValues: ['Long Sleeve', 'Short Sleeve', '3/4 Sleeve', 'Sleeveless']
      },
      { 
        name: 'Neckline', 
        required: false,
        allowedValues: ['Crew Neck', 'V-Neck', 'Scoop Neck', 'Boat Neck', 'Off Shoulder', 'High Neck', 'Cowl Neck', 'Button Down Collar', 'Spread Collar']
      },
      { 
        name: 'Fit', 
        required: false,
        allowedValues: ['Slim Fit', 'Regular Fit', 'Relaxed Fit', 'Tailored', 'Oversized']
      },
      { 
        name: 'Closure', 
        required: false,
        allowedValues: ['Button', 'Zip', 'Pullover', 'Snap', 'Hook & Eye', 'Tie']
      },
      { 
        name: 'Features', 
        required: false,
        allowedValues: ['Pockets', 'French Cuffs', 'Monogrammed', 'Wrinkle Free', 'Moisture Wicking']
      },
      COMMON_SPECIFICS.occasion,
      COMMON_SPECIFICS.season,
      COMMON_SPECIFICS.style
    ]
  },

  // T-SHIRTS
  {
    itemTypes: ['t-shirt', 'tee', 'tank top', 'tshirt', 'tank'],
    ebayCategory: 'Clothing, Shoes & Accessories > Men\'s Clothing > T-Shirts',
    specifics: [
      COMMON_SPECIFICS.brand,
      COMMON_SPECIFICS.department,
      { name: 'Type', required: true },
      COMMON_SPECIFICS.size,
      COMMON_SPECIFICS.sizeType,
      COMMON_SPECIFICS.color,
      COMMON_SPECIFICS.material,
      COMMON_SPECIFICS.pattern,
      { 
        name: 'Sleeve Length', 
        required: false,
        allowedValues: ['Short Sleeve', 'Long Sleeve', 'Sleeveless', 'Cap Sleeve']
      },
      { 
        name: 'Neckline', 
        required: false,
        allowedValues: ['Crew Neck', 'V-Neck', 'Scoop Neck', 'Henley', 'Tank']
      },
      { 
        name: 'Fit', 
        required: false,
        allowedValues: ['Slim Fit', 'Regular Fit', 'Relaxed Fit', 'Oversized']
      },
      { 
        name: 'Features', 
        required: false,
        allowedValues: ['Graphic Print', 'Logo', 'Embroidered', 'Vintage', 'Distressed', 'Pockets']
      },
      COMMON_SPECIFICS.occasion,
      COMMON_SPECIFICS.season,
      COMMON_SPECIFICS.style
    ]
  },

  // SHORTS
  {
    itemTypes: ['shorts', 'short pants', 'bermuda shorts', 'cargo shorts'],
    ebayCategory: 'Clothing, Shoes & Accessories > Men\'s Clothing > Shorts',
    specifics: [
      COMMON_SPECIFICS.brand,
      COMMON_SPECIFICS.department,
      { name: 'Type', required: true },
      COMMON_SPECIFICS.size,
      COMMON_SPECIFICS.sizeType,
      COMMON_SPECIFICS.color,
      COMMON_SPECIFICS.material,
      COMMON_SPECIFICS.pattern,
      { 
        name: 'Fit', 
        required: false,
        allowedValues: ['Slim', 'Regular', 'Relaxed', 'Cargo', 'Board', 'Athletic']
      },
      { 
        name: 'Inseam', 
        required: false,
        allowedValues: ['5"', '7"', '9"', '11"', '13"']
      },
      { 
        name: 'Closure', 
        required: false,
        allowedValues: ['Button Fly', 'Zip Fly', 'Drawstring', 'Elastic Waist']
      },
      { 
        name: 'Features', 
        required: false,
        allowedValues: ['Pockets', 'Cargo Pockets', 'Belt Loops', 'Quick Dry', 'Board Shorts']
      },
      COMMON_SPECIFICS.occasion,
      COMMON_SPECIFICS.season,
      COMMON_SPECIFICS.style
    ]
  },

  // JACKETS & OUTERWEAR
  {
    itemTypes: ['jacket', 'blazer', 'coat', 'outerwear', 'windbreaker', 'hoodie', 'sweatshirt'],
    ebayCategory: 'Clothing, Shoes & Accessories > Men\'s Clothing > Coats & Jackets',
    specifics: [
      COMMON_SPECIFICS.brand,
      COMMON_SPECIFICS.department,
      { name: 'Type', required: true },
      COMMON_SPECIFICS.size,
      COMMON_SPECIFICS.sizeType,
      COMMON_SPECIFICS.color,
      COMMON_SPECIFICS.material,
      COMMON_SPECIFICS.pattern,
      { 
        name: 'Sleeve Length', 
        required: false,
        allowedValues: ['Long Sleeve', 'Short Sleeve', '3/4 Sleeve']
      },
      { 
        name: 'Fit', 
        required: false,
        allowedValues: ['Slim Fit', 'Regular Fit', 'Relaxed Fit', 'Oversized']
      },
      { 
        name: 'Closure', 
        required: false,
        allowedValues: ['Zip', 'Button', 'Snap', 'Toggle', 'Pullover']
      },
      { 
        name: 'Features', 
        required: false,
        allowedValues: ['Hood', 'Pockets', 'Lined', 'Waterproof', 'Windproof', 'Insulated', 'Reflective']
      },
      { 
        name: 'Length', 
        required: false,
        allowedValues: ['Waist Length', 'Hip Length', 'Thigh Length', 'Knee Length', 'Long']
      },
      COMMON_SPECIFICS.occasion,
      COMMON_SPECIFICS.season,
      COMMON_SPECIFICS.style
    ]
  },

  // DRESSES
  {
    itemTypes: ['dress', 'gown', 'sundress', 'maxi dress', 'midi dress'],
    ebayCategory: 'Clothing, Shoes & Accessories > Women\'s Clothing > Dresses',
    specifics: [
      COMMON_SPECIFICS.brand,
      COMMON_SPECIFICS.department,
      { name: 'Type', required: true },
      COMMON_SPECIFICS.size,
      COMMON_SPECIFICS.sizeType,
      COMMON_SPECIFICS.color,
      COMMON_SPECIFICS.material,
      COMMON_SPECIFICS.pattern,
      { 
        name: 'Sleeve Length', 
        required: false,
        allowedValues: ['Long Sleeve', 'Short Sleeve', '3/4 Sleeve', 'Sleeveless', 'Cap Sleeve']
      },
      { 
        name: 'Neckline', 
        required: false,
        allowedValues: ['Crew Neck', 'V-Neck', 'Scoop Neck', 'Boat Neck', 'Off Shoulder', 'High Neck', 'Cowl Neck', 'Strapless', 'Halter']
      },
      { 
        name: 'Length', 
        required: false,
        allowedValues: ['Mini', 'Knee Length', 'Midi', 'Maxi', 'Tea Length']
      },
      { 
        name: 'Fit', 
        required: false,
        allowedValues: ['A-Line', 'Sheath', 'Fit & Flare', 'Bodycon', 'Shift', 'Empire Waist']
      },
      { 
        name: 'Closure', 
        required: false,
        allowedValues: ['Zip', 'Button', 'Pullover', 'Wrap', 'Lace Up']
      },
      { 
        name: 'Features', 
        required: false,
        allowedValues: ['Pockets', 'Lined', 'Embroidered', 'Sequined', 'Beaded', 'Pleated', 'Ruffled']
      },
      COMMON_SPECIFICS.occasion,
      COMMON_SPECIFICS.season,
      COMMON_SPECIFICS.style
    ]
  },

  // SKIRTS
  {
    itemTypes: ['skirt', 'mini skirt', 'maxi skirt', 'pencil skirt'],
    ebayCategory: 'Clothing, Shoes & Accessories > Women\'s Clothing > Skirts',
    specifics: [
      COMMON_SPECIFICS.brand,
      COMMON_SPECIFICS.department,
      { name: 'Type', required: true },
      COMMON_SPECIFICS.size,
      COMMON_SPECIFICS.sizeType,
      COMMON_SPECIFICS.color,
      COMMON_SPECIFICS.material,
      COMMON_SPECIFICS.pattern,
      { 
        name: 'Length', 
        required: false,
        allowedValues: ['Mini', 'Knee Length', 'Midi', 'Maxi', 'Tea Length']
      },
      { 
        name: 'Fit', 
        required: false,
        allowedValues: ['A-Line', 'Pencil', 'Pleated', 'Circle', 'Straight', 'Flared']
      },
      { 
        name: 'Closure', 
        required: false,
        allowedValues: ['Zip', 'Button', 'Elastic Waist', 'Hook & Eye', 'Wrap']
      },
      { 
        name: 'Features', 
        required: false,
        allowedValues: ['Pockets', 'Lined', 'Slit', 'High Waisted', 'Pleated']
      },
      COMMON_SPECIFICS.occasion,
      COMMON_SPECIFICS.season,
      COMMON_SPECIFICS.style
    ]
  }
];

/**
 * Get relevant eBay item specifics for a given item type
 */
export function getEbaySpecificsForItemType(itemType: string): EbayItemSpecific[] {
  if (!itemType) return [];
  
  const normalizedType = itemType.toLowerCase().trim();
  
  // Find matching category mapping
  const mapping = EBAY_CATEGORY_MAPPINGS.find(category => 
    category.itemTypes.some(type => 
      normalizedType.includes(type) || type.includes(normalizedType)
    )
  );
  
  if (mapping) {
    return mapping.specifics;
  }
  
  // Default fallback for unknown item types
  return [
    COMMON_SPECIFICS.brand,
    COMMON_SPECIFICS.department,
    { name: 'Type', required: true },
    COMMON_SPECIFICS.size,
    COMMON_SPECIFICS.sizeType,
    COMMON_SPECIFICS.color,
    COMMON_SPECIFICS.material,
    COMMON_SPECIFICS.pattern,
    COMMON_SPECIFICS.occasion,
    COMMON_SPECIFICS.season,
    COMMON_SPECIFICS.style
  ];
}

/**
 * Get eBay category for a given item type
 */
export function getEbayCategoryForItemType(itemType: string): string {
  if (!itemType) return 'Clothing, Shoes & Accessories';
  
  const normalizedType = itemType.toLowerCase().trim();
  
  const mapping = EBAY_CATEGORY_MAPPINGS.find(category => 
    category.itemTypes.some(type => 
      normalizedType.includes(type) || type.includes(normalizedType)
    )
  );
  
  return mapping?.ebayCategory || 'Clothing, Shoes & Accessories';
}

/**
 * Validate if a field is relevant for the given item type
 */
export function isFieldRelevantForItemType(fieldName: string, itemType: string): boolean {
  const relevantFields = getEbaySpecificsForItemType(itemType);
  return relevantFields.some(field => field.name === fieldName);
}