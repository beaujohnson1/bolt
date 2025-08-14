/**
 * Multi-Category AI Vision Detection System
 * Advanced item detection for electronics, books, kitchen items, DVDs, CDs, and more
 */

export interface CategoryMatch {
  category: string;
  subcategory?: string;
  confidence: number;
  matchType: 'visual' | 'text' | 'barcode' | 'hybrid';
  specificIdentifiers: string[];
  brandDetected?: string;
  modelDetected?: string;
  condition?: string;
}

export interface CategoryMapping {
  name: string;
  keywords: string[];
  visualPatterns: string[];
  brandList: string[];
  commonIdentifiers: string[];
  ebayCategory: string;
  processingType: 'standard' | 'barcode' | 'isbn' | 'upc' | 'model';
}

export class MultiCategoryDetector {
  private categoryMappings: CategoryMapping[] = [
    // Electronics
    {
      name: 'electronics',
      keywords: ['phone', 'smartphone', 'tablet', 'laptop', 'computer', 'tv', 'television', 'speaker', 'headphones', 'camera', 'gaming', 'console', 'xbox', 'playstation', 'nintendo', 'switch', 'iphone', 'ipad', 'macbook', 'dell', 'hp', 'lenovo', 'samsung', 'lg', 'sony'],
      visualPatterns: ['screen', 'keyboard', 'buttons', 'ports', 'charging cable', 'power cord', 'remote control', 'antenna'],
      brandList: ['Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Lenovo', 'Microsoft', 'Google', 'Nintendo', 'Xbox', 'PlayStation', 'Canon', 'Nikon', 'Bose', 'JBL', 'Beats'],
      commonIdentifiers: ['model number', 'serial number', 'part number', 'SKU', 'IMEI', 'MAC address'],
      ebayCategory: 'Consumer Electronics',
      processingType: 'upc'
    },
    
    // Books & Media
    {
      name: 'books_media',
      keywords: ['book', 'novel', 'textbook', 'manual', 'guide', 'dvd', 'blu-ray', 'cd', 'vinyl', 'record', 'album', 'music', 'movie', 'film', 'software', 'game'],
      visualPatterns: ['spine', 'cover', 'isbn', 'barcode', 'disc', 'case', 'jewel case', 'pages', 'binding'],
      brandList: ['Penguin', 'Random House', 'McGraw-Hill', 'Pearson', 'Disney', 'Warner Bros', 'Universal', 'Sony Pictures', 'Paramount', 'Columbia', 'Atlantic Records', 'Capitol Records'],
      commonIdentifiers: ['ISBN', 'UPC', 'catalog number', 'edition', 'copyright year', 'publisher'],
      ebayCategory: 'Books, Movies & Music',
      processingType: 'isbn'
    },
    
    // Home & Kitchen
    {
      name: 'home_garden',
      keywords: ['kitchen', 'cookware', 'appliance', 'blender', 'mixer', 'toaster', 'microwave', 'coffee', 'espresso', 'pot', 'pan', 'knife', 'utensil', 'plate', 'bowl', 'cup', 'mug', 'glass', 'vase', 'lamp', 'decor', 'furniture', 'chair', 'table'],
      visualPatterns: ['handle', 'cord', 'dial', 'button', 'display', 'base', 'lid', 'spout', 'blade'],
      brandList: ['KitchenAid', 'Cuisinart', 'Ninja', 'Vitamix', 'Instant Pot', 'Keurig', 'Nespresso', 'All-Clad', 'Calphalon', 'Lodge', 'Le Creuset', 'Pyrex', 'Corelle', 'Ikea'],
      commonIdentifiers: ['model number', 'capacity', 'wattage', 'voltage', 'dimensions'],
      ebayCategory: 'Home & Garden',
      processingType: 'upc'
    },
    
    // Toys & Games
    {
      name: 'toys_games',
      keywords: ['toy', 'doll', 'action figure', 'lego', 'puzzle', 'board game', 'card game', 'video game', 'educational', 'learning', 'baby', 'infant', 'toddler', 'plush', 'stuffed animal'],
      visualPatterns: ['colorful', 'plastic', 'soft', 'parts', 'pieces', 'ages', 'warning labels'],
      brandList: ['LEGO', 'Mattel', 'Hasbro', 'Fisher-Price', 'Barbie', 'Hot Wheels', 'Nerf', 'Play-Doh', 'Disney', 'Marvel', 'Pokemon', 'Monopoly', 'Scrabble'],
      commonIdentifiers: ['age range', 'item number', 'series', 'collection', 'character name'],
      ebayCategory: 'Toys & Hobbies',
      processingType: 'upc'
    },
    
    // Sports & Outdoors
    {
      name: 'sports_outdoors',
      keywords: ['sports', 'fitness', 'exercise', 'gym', 'workout', 'running', 'cycling', 'bike', 'camping', 'hiking', 'fishing', 'golf', 'tennis', 'basketball', 'football', 'soccer', 'baseball', 'swimming', 'water sports'],
      visualPatterns: ['athletic', 'mesh', 'breathable', 'waterproof', 'durable', 'grip', 'straps'],
      brandList: ['Nike', 'Adidas', 'Under Armour', 'Reebok', 'Puma', 'New Balance', 'Wilson', 'Spalding', 'Coleman', 'North Face', 'Patagonia', 'REI', 'Dick\'s'],
      commonIdentifiers: ['size', 'weight capacity', 'material', 'sport type', 'skill level'],
      ebayCategory: 'Sporting Goods',
      processingType: 'upc'
    },
    
    // Collectibles
    {
      name: 'collectibles',
      keywords: ['vintage', 'antique', 'rare', 'limited edition', 'collectible', 'memorabilia', 'signed', 'autograph', 'first edition', 'mint condition', 'original packaging', 'trading card', 'comic', 'figurine', 'statue'],
      visualPatterns: ['aged', 'patina', 'wear', 'original box', 'certificate', 'signature', 'hologram'],
      brandList: ['Topps', 'Panini', 'Upper Deck', 'Funko', 'Sideshow', 'Hot Toys', 'Marvel', 'DC Comics', 'Star Wars', 'Disney'],
      commonIdentifiers: ['year', 'edition', 'series', 'number', 'rarity', 'condition grade'],
      ebayCategory: 'Collectibles',
      processingType: 'standard'
    },
    
    // Jewelry & Accessories
    {
      name: 'jewelry',
      keywords: ['jewelry', 'necklace', 'bracelet', 'ring', 'earrings', 'watch', 'pendant', 'chain', 'gold', 'silver', 'platinum', 'diamond', 'gemstone', 'pearl', 'crystal'],
      visualPatterns: ['shiny', 'metallic', 'sparkling', 'clasp', 'setting', 'band', 'face', 'hands'],
      brandList: ['Rolex', 'Cartier', 'Tiffany', 'Pandora', 'Swarovski', 'Michael Kors', 'Fossil', 'Citizen', 'Seiko', 'Casio', 'Apple Watch'],
      commonIdentifiers: ['karat', 'carat', 'hallmark', 'serial number', 'model', 'movement type'],
      ebayCategory: 'Jewelry & Watches',
      processingType: 'standard'
    }
  ];

  /**
   * Detect item category from image and text analysis
   */
  async detectCategory(
    imageAnalysis: any,
    ocrText: string,
    visualFeatures: string[] = []
  ): Promise<CategoryMatch[]> {
    const matches: CategoryMatch[] = [];
    
    console.log('🔍 [MULTI-CATEGORY] Analyzing item for category detection...');
    console.log('📝 [MULTI-CATEGORY] OCR text length:', ocrText.length);
    console.log('👁️ [MULTI-CATEGORY] Visual features:', visualFeatures.length);
    
    // Analyze each category
    for (const category of this.categoryMappings) {
      const match = await this.analyzeCategory(category, imageAnalysis, ocrText, visualFeatures);
      if (match && match.confidence > 0.3) { // Minimum confidence threshold
        matches.push(match);
      }
    }
    
    // Rank and return top matches
    const rankedMatches = this.rankMatches(matches);
    
    console.log('✅ [MULTI-CATEGORY] Detected categories:', rankedMatches.map(m => `${m.category} (${(m.confidence * 100).toFixed(1)}%)`));
    
    return rankedMatches;
  }

  /**
   * Analyze a specific category against the item
   */
  private async analyzeCategory(
    category: CategoryMapping,
    imageAnalysis: any,
    ocrText: string,
    visualFeatures: string[]
  ): Promise<CategoryMatch | null> {
    let confidence = 0;
    const specificIdentifiers: string[] = [];
    let matchType: CategoryMatch['matchType'] = 'text';
    let brandDetected: string | undefined;
    let modelDetected: string | undefined;
    
    const normalizedText = ocrText.toLowerCase();
    
    // 1. Keyword matching in OCR text
    const keywordMatches = category.keywords.filter(keyword => 
      normalizedText.includes(keyword.toLowerCase())
    );
    
    if (keywordMatches.length > 0) {
      confidence += (keywordMatches.length / category.keywords.length) * 0.4;
      specificIdentifiers.push(...keywordMatches);
      console.log(`🎯 [${category.name.toUpperCase()}] Keyword matches:`, keywordMatches);
    }
    
    // 2. Brand detection
    const brandMatches = category.brandList.filter(brand => 
      normalizedText.includes(brand.toLowerCase())
    );
    
    if (brandMatches.length > 0) {
      confidence += 0.3;
      brandDetected = brandMatches[0];
      specificIdentifiers.push(`Brand: ${brandDetected}`);
      console.log(`🏷️ [${category.name.toUpperCase()}] Brand detected:`, brandDetected);
    }
    
    // 3. Visual pattern matching
    const visualMatches = category.visualPatterns.filter(pattern => 
      visualFeatures.some(feature => feature.toLowerCase().includes(pattern.toLowerCase())) ||
      normalizedText.includes(pattern.toLowerCase())
    );
    
    if (visualMatches.length > 0) {
      confidence += (visualMatches.length / category.visualPatterns.length) * 0.2;
      specificIdentifiers.push(...visualMatches.map(v => `Visual: ${v}`));
      matchType = 'hybrid';
      console.log(`👁️ [${category.name.toUpperCase()}] Visual matches:`, visualMatches);
    }
    
    // 4. Identifier detection (model numbers, ISBNs, etc.)
    const identifierMatches = this.detectIdentifiers(ocrText, category);
    if (identifierMatches.length > 0) {
      confidence += 0.3;
      specificIdentifiers.push(...identifierMatches);
      if (identifierMatches.some(id => id.includes('Model:'))) {
        modelDetected = identifierMatches.find(id => id.includes('Model:'))?.split(':')[1]?.trim();
      }
      console.log(`🔢 [${category.name.toUpperCase()}] Identifiers found:`, identifierMatches);
    }
    
    // 5. Category-specific analysis
    const specificAnalysis = this.performSpecificAnalysis(category, ocrText, imageAnalysis);
    confidence += specificAnalysis.confidenceBoost;
    specificIdentifiers.push(...specificAnalysis.identifiers);
    
    if (confidence < 0.3) {
      return null;
    }
    
    return {
      category: category.name,
      subcategory: this.determineSubcategory(category, specificIdentifiers),
      confidence: Math.min(1.0, confidence),
      matchType,
      specificIdentifiers,
      brandDetected,
      modelDetected
    };
  }

  /**
   * Detect specific identifiers (UPC, ISBN, model numbers, etc.)
   */
  private detectIdentifiers(text: string, category: CategoryMapping): string[] {
    const identifiers: string[] = [];
    
    // UPC/EAN codes (12-13 digits)
    const upcPattern = /\b\d{12,13}\b/g;
    const upcMatches = text.match(upcPattern);
    if (upcMatches && category.processingType === 'upc') {
      identifiers.push(...upcMatches.map(upc => `UPC: ${upc}`));
    }
    
    // ISBN (books)
    const isbnPattern = /(?:ISBN[-\s]?(?:13|10)?:?\s?)?(?:97[89][-\s]?)?\d{1,5}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d{1,7}[-\s]?\d{1,5}[-\s]?\d/g;
    const isbnMatches = text.match(isbnPattern);
    if (isbnMatches && category.processingType === 'isbn') {
      identifiers.push(...isbnMatches.map(isbn => `ISBN: ${isbn}`));
    }
    
    // Model numbers (electronics)
    const modelPattern = /(?:Model|Part|SKU|P\/N)[\s#:]*([\w\-]+)/gi;
    const modelMatches = text.matchAll(modelPattern);
    for (const match of modelMatches) {
      identifiers.push(`Model: ${match[1]}`);
    }
    
    // Serial numbers
    const serialPattern = /(?:Serial|S\/N)[\s#:]*([\w\-]+)/gi;
    const serialMatches = text.matchAll(serialPattern);
    for (const match of serialMatches) {
      identifiers.push(`Serial: ${match[1]}`);
    }
    
    return identifiers;
  }

  /**
   * Perform category-specific analysis
   */
  private performSpecificAnalysis(
    category: CategoryMapping, 
    ocrText: string, 
    imageAnalysis: any
  ): { confidenceBoost: number; identifiers: string[] } {
    const identifiers: string[] = [];
    let confidenceBoost = 0;
    
    switch (category.name) {
      case 'electronics':
        // Look for technical specifications
        const specs = ['GB', 'TB', 'MHz', 'GHz', 'mAh', 'V', 'W', 'Bluetooth', 'WiFi', 'USB'];
        const specMatches = specs.filter(spec => ocrText.includes(spec));
        if (specMatches.length > 0) {
          confidenceBoost += 0.2;
          identifiers.push(...specMatches.map(spec => `Spec: ${spec}`));
        }
        break;
        
      case 'books_media':
        // Look for publication info
        const pubInfo = ['Edition', 'Copyright', '©', 'Publisher', 'Pages', 'Hardcover', 'Paperback'];
        const pubMatches = pubInfo.filter(info => ocrText.toLowerCase().includes(info.toLowerCase()));
        if (pubMatches.length > 0) {
          confidenceBoost += 0.2;
          identifiers.push(...pubMatches.map(info => `Publication: ${info}`));
        }
        break;
        
      case 'home_garden':
        // Look for capacity, dimensions, materials
        const homeSpecs = ['Cup', 'Quart', 'Liter', 'Dishwasher Safe', 'Microwave Safe', 'BPA Free'];
        const homeMatches = homeSpecs.filter(spec => ocrText.includes(spec));
        if (homeMatches.length > 0) {
          confidenceBoost += 0.15;
          identifiers.push(...homeMatches.map(spec => `Feature: ${spec}`));
        }
        break;
        
      case 'toys_games':
        // Look for age recommendations, safety warnings
        const toySpecs = ['Ages', 'Years', 'Adult', 'Choking Hazard', 'CPSIA', 'CE Mark'];
        const toyMatches = toySpecs.filter(spec => ocrText.includes(spec));
        if (toyMatches.length > 0) {
          confidenceBoost += 0.15;
          identifiers.push(...toyMatches.map(spec => `Safety: ${spec}`));
        }
        break;
    }
    
    return { confidenceBoost, identifiers };
  }

  /**
   * Determine subcategory based on identifiers
   */
  private determineSubcategory(category: CategoryMapping, identifiers: string[]): string | undefined {
    const identifierText = identifiers.join(' ').toLowerCase();
    
    switch (category.name) {
      case 'electronics':
        if (identifierText.includes('phone') || identifierText.includes('iphone')) return 'Mobile Phones';
        if (identifierText.includes('laptop') || identifierText.includes('computer')) return 'Computers';
        if (identifierText.includes('tv') || identifierText.includes('television')) return 'TVs';
        if (identifierText.includes('gaming') || identifierText.includes('console')) return 'Video Games';
        break;
        
      case 'books_media':
        if (identifierText.includes('dvd') || identifierText.includes('blu-ray')) return 'Movies';
        if (identifierText.includes('cd') || identifierText.includes('vinyl')) return 'Music';
        if (identifierText.includes('game') || identifierText.includes('software')) return 'Video Games';
        return 'Books';
        
      case 'home_garden':
        if (identifierText.includes('kitchen') || identifierText.includes('cook')) return 'Kitchen';
        if (identifierText.includes('furniture')) return 'Furniture';
        if (identifierText.includes('garden') || identifierText.includes('outdoor')) return 'Garden';
        break;
    }
    
    return undefined;
  }

  /**
   * Rank matches by relevance and confidence
   */
  private rankMatches(matches: CategoryMatch[]): CategoryMatch[] {
    return matches
      .filter(match => match.confidence > 0.2) // Filter low confidence
      .sort((a, b) => {
        // Primary sort: confidence
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        
        // Secondary sort: number of specific identifiers
        return b.specificIdentifiers.length - a.specificIdentifiers.length;
      })
      .slice(0, 3); // Return top 3 matches
  }

  /**
   * Get supported categories
   */
  getSupportedCategories(): string[] {
    return this.categoryMappings.map(cat => cat.name);
  }

  /**
   * Get category mapping info
   */
  getCategoryInfo(categoryName: string): CategoryMapping | null {
    return this.categoryMappings.find(cat => cat.name === categoryName) || null;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      totalCategories: this.categoryMappings.length,
      totalBrands: this.categoryMappings.reduce((sum, cat) => sum + cat.brandList.length, 0),
      totalKeywords: this.categoryMappings.reduce((sum, cat) => sum + cat.keywords.length, 0),
      categoriesByType: this.categoryMappings.reduce((acc, cat) => {
        acc[cat.processingType] = (acc[cat.processingType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      supportedIdentifiers: ['UPC', 'ISBN', 'Model Numbers', 'Serial Numbers', 'Technical Specs']
    };
  }
}

export const multiCategoryDetector = new MultiCategoryDetector();