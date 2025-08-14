/**
 * Enhanced Brand Detection Algorithm
 * Advanced brand recognition with fuzzy matching and context awareness
 */

export interface BrandMatch {
  brand: string;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'partial' | 'context';
  originalText: string;
  priceRange?: {
    min: number;
    max: number;
  };
  category?: string;
}

export interface BrandDatabase {
  name: string;
  aliases: string[];
  priceRange: { min: number; max: number };
  categories: string[];
  patterns: RegExp[];
  popularity: number; // 1-10 scale
}

export class EnhancedBrandDetector {
  private brandDatabase: BrandDatabase[] = [
    // Premium Athletic
    {
      name: 'Nike',
      aliases: ['nike', 'swoosh'],
      priceRange: { min: 20, max: 300 },
      categories: ['athletic', 'shoes', 'activewear'],
      patterns: [/\bnike\b/i, /swoosh/i],
      popularity: 10
    },
    {
      name: 'Adidas',
      aliases: ['adidas', 'three stripes'],
      priceRange: { min: 25, max: 350 },
      categories: ['athletic', 'shoes', 'activewear'],
      patterns: [/\badidas\b/i, /\bad[il]das\b/i],
      popularity: 9
    },
    {
      name: 'Under Armour',
      aliases: ['under armour', 'ua', 'underarmour'],
      priceRange: { min: 15, max: 200 },
      categories: ['athletic', 'activewear'],
      patterns: [/\bunder\s?armou?r\b/i, /\bua\b/i],
      popularity: 8
    },

    // Designer/Premium
    {
      name: 'Polo Ralph Lauren',
      aliases: ['polo', 'ralph lauren', 'rl', 'polo ralph lauren'],
      priceRange: { min: 30, max: 500 },
      categories: ['casual', 'dress', 'polo'],
      patterns: [/\bpolo\b/i, /\bralph\s?lauren\b/i, /\brl\b/i],
      popularity: 9
    },
    {
      name: 'Tommy Hilfiger',
      aliases: ['tommy hilfiger', 'tommy', 'th'],
      priceRange: { min: 20, max: 300 },
      categories: ['casual', 'dress'],
      patterns: [/\btommy\s?hilfiger\b/i, /\btommy\b/i, /\bth\b/i],
      popularity: 8
    },
    {
      name: 'Calvin Klein',
      aliases: ['calvin klein', 'ck'],
      priceRange: { min: 15, max: 250 },
      categories: ['casual', 'underwear', 'dress'],
      patterns: [/\bcalvin\s?klein\b/i, /\bck\b/i],
      popularity: 8
    },
    {
      name: 'Hugo Boss',
      aliases: ['hugo boss', 'boss'],
      priceRange: { min: 40, max: 600 },
      categories: ['dress', 'casual'],
      patterns: [/\bhugo\s?boss\b/i, /\bboss\b/i],
      popularity: 7
    },

    // Denim
    {
      name: "Levi's",
      aliases: ['levis', "levi's", 'levi'],
      priceRange: { min: 20, max: 150 },
      categories: ['denim', 'casual'],
      patterns: [/\blevi'?s\b/i, /\blevi\b/i],
      popularity: 9
    },
    {
      name: 'Wrangler',
      aliases: ['wrangler'],
      priceRange: { min: 15, max: 100 },
      categories: ['denim', 'workwear'],
      patterns: [/\bwrangler\b/i],
      popularity: 7
    },
    {
      name: 'True Religion',
      aliases: ['true religion', 'tr'],
      priceRange: { min: 50, max: 300 },
      categories: ['denim', 'premium'],
      patterns: [/\btrue\s?religion\b/i, /\btr\b/i],
      popularity: 6
    },

    // Fast Fashion
    {
      name: 'H&M',
      aliases: ['h&m', 'hm'],
      priceRange: { min: 5, max: 80 },
      categories: ['fast fashion', 'casual'],
      patterns: [/\bh&m\b/i, /\bhm\b/i],
      popularity: 8
    },
    {
      name: 'Zara',
      aliases: ['zara'],
      priceRange: { min: 10, max: 200 },
      categories: ['fast fashion', 'dress'],
      patterns: [/\bzara\b/i],
      popularity: 8
    },
    {
      name: 'Forever 21',
      aliases: ['forever 21', 'f21'],
      priceRange: { min: 5, max: 60 },
      categories: ['fast fashion', 'young'],
      patterns: [/\bforever\s?21\b/i, /\bf21\b/i],
      popularity: 7
    },

    // Outdoor/Athletic
    {
      name: 'The North Face',
      aliases: ['north face', 'tnf'],
      priceRange: { min: 30, max: 400 },
      categories: ['outdoor', 'athletic'],
      patterns: [/\b(?:the\s)?north\s?face\b/i, /\btnf\b/i],
      popularity: 8
    },
    {
      name: 'Patagonia',
      aliases: ['patagonia'],
      priceRange: { min: 25, max: 500 },
      categories: ['outdoor', 'sustainable'],
      patterns: [/\bpatagonia\b/i],
      popularity: 7
    },
    {
      name: 'Columbia',
      aliases: ['columbia'],
      priceRange: { min: 20, max: 250 },
      categories: ['outdoor', 'athletic'],
      patterns: [/\bcolumbia\b/i],
      popularity: 7
    },

    // Streetwear/Youth
    {
      name: 'Champion',
      aliases: ['champion'],
      priceRange: { min: 10, max: 100 },
      categories: ['athletic', 'streetwear'],
      patterns: [/\bchampion\b/i],
      popularity: 7
    },
    {
      name: 'Supreme',
      aliases: ['supreme'],
      priceRange: { min: 50, max: 1000 },
      categories: ['streetwear', 'luxury'],
      patterns: [/\bsupreme\b/i],
      popularity: 6
    },

    // Department Store Brands
    {
      name: 'Gap',
      aliases: ['gap'],
      priceRange: { min: 10, max: 150 },
      categories: ['casual', 'basic'],
      patterns: [/\bgap\b/i],
      popularity: 8
    },
    {
      name: 'Old Navy',
      aliases: ['old navy'],
      priceRange: { min: 5, max: 60 },
      categories: ['casual', 'basic'],
      patterns: [/\bold\s?navy\b/i],
      popularity: 7
    },
    {
      name: 'Banana Republic',
      aliases: ['banana republic', 'br'],
      priceRange: { min: 15, max: 200 },
      categories: ['business casual', 'dress'],
      patterns: [/\bbanana\s?republic\b/i, /\bbr\b/i],
      popularity: 7
    },

    // Luxury Athletic
    {
      name: 'Lululemon',
      aliases: ['lululemon'],
      priceRange: { min: 40, max: 300 },
      categories: ['activewear', 'yoga', 'luxury'],
      patterns: [/\blululemon\b/i],
      popularity: 8
    },
    {
      name: 'Athleta',
      aliases: ['athleta'],
      priceRange: { min: 25, max: 200 },
      categories: ['activewear', 'yoga'],
      patterns: [/\bathleta\b/i],
      popularity: 6
    },

    // Additional Popular Brands
    {
      name: 'Puma',
      aliases: ['puma'],
      priceRange: { min: 15, max: 200 },
      categories: ['athletic', 'streetwear'],
      patterns: [/\bpuma\b/i],
      popularity: 8
    },
    {
      name: 'Reebok',
      aliases: ['reebok', 'rbk'],
      priceRange: { min: 15, max: 150 },
      categories: ['athletic', 'activewear'],
      patterns: [/\breebok\b/i, /\brbk\b/i],
      popularity: 7
    },
    {
      name: 'New Balance',
      aliases: ['new balance', 'nb'],
      priceRange: { min: 20, max: 250 },
      categories: ['athletic', 'shoes'],
      patterns: [/\bnew\s?balance\b/i, /\bnb\b/i],
      popularity: 7
    },
    {
      name: 'ASICS',
      aliases: ['asics'],
      priceRange: { min: 20, max: 200 },
      categories: ['athletic', 'running'],
      patterns: [/\basics\b/i],
      popularity: 7
    },

    // More Denim Brands
    {
      name: 'Lee',
      aliases: ['lee'],
      priceRange: { min: 15, max: 100 },
      categories: ['denim', 'casual'],
      patterns: [/\blee\b/i],
      popularity: 7
    },
    {
      name: 'Lucky Brand',
      aliases: ['lucky brand', 'lucky'],
      priceRange: { min: 30, max: 200 },
      categories: ['denim', 'premium'],
      patterns: [/\blucky\s?brand\b/i, /\blucky\b/i],
      popularity: 6
    },
    {
      name: '7 For All Mankind',
      aliases: ['7 for all mankind', '7fam', 'seven'],
      priceRange: { min: 50, max: 300 },
      categories: ['denim', 'premium'],
      patterns: [/\b7\s?for\s?all\s?mankind\b/i, /\b7fam\b/i],
      popularity: 6
    },
    {
      name: 'American Eagle',
      aliases: ['american eagle', 'ae', 'aeo'],
      priceRange: { min: 15, max: 100 },
      categories: ['denim', 'casual', 'young'],
      patterns: [/\bamerican\s?eagle\b/i, /\baeo?\b/i],
      popularity: 7
    },
    {
      name: 'Hollister',
      aliases: ['hollister', 'hco'],
      priceRange: { min: 15, max: 100 },
      categories: ['casual', 'young', 'beach'],
      patterns: [/\bhollister\b/i, /\bhco\b/i],
      popularity: 7
    },
    {
      name: 'Abercrombie & Fitch',
      aliases: ['abercrombie', 'a&f', 'anf'],
      priceRange: { min: 20, max: 150 },
      categories: ['casual', 'preppy'],
      patterns: [/\babercrombie(?:\s?&\s?fitch)?\b/i, /\ba&f\b/i, /\banf\b/i],
      popularity: 7
    },

    // Workwear & Outdoor
    {
      name: 'Carhartt',
      aliases: ['carhartt'],
      priceRange: { min: 25, max: 200 },
      categories: ['workwear', 'outdoor'],
      patterns: [/\bcarhartt\b/i],
      popularity: 8
    },
    {
      name: 'Dickies',
      aliases: ['dickies'],
      priceRange: { min: 15, max: 100 },
      categories: ['workwear', 'streetwear'],
      patterns: [/\bdickies\b/i],
      popularity: 7
    },
    {
      name: 'Timberland',
      aliases: ['timberland', 'timbs'],
      priceRange: { min: 30, max: 250 },
      categories: ['outdoor', 'boots', 'casual'],
      patterns: [/\btimberland\b/i, /\btimbs\b/i],
      popularity: 7
    },
    {
      name: 'L.L.Bean',
      aliases: ['llbean', 'l.l.bean', 'll bean'],
      priceRange: { min: 20, max: 200 },
      categories: ['outdoor', 'preppy'],
      patterns: [/\bl\.?l\.?bean\b/i],
      popularity: 6
    },

    // Target Brands
    {
      name: 'Goodfellow & Co',
      aliases: ['goodfellow', 'goodfellow & co'],
      priceRange: { min: 8, max: 50 },
      categories: ['casual', 'basic', 'target'],
      patterns: [/\bgoodfellow(?:\s?&\s?co)?\b/i],
      popularity: 6
    },
    {
      name: 'Universal Thread',
      aliases: ['universal thread'],
      priceRange: { min: 8, max: 40 },
      categories: ['casual', 'women', 'target'],
      patterns: [/\buniversal\s?thread\b/i],
      popularity: 5
    },
    {
      name: 'Wild Fable',
      aliases: ['wild fable'],
      priceRange: { min: 5, max: 35 },
      categories: ['young', 'trendy', 'target'],
      patterns: [/\bwild\s?fable\b/i],
      popularity: 5
    },

    // Fast Fashion & Youth
    {
      name: 'Shein',
      aliases: ['shein'],
      priceRange: { min: 3, max: 50 },
      categories: ['fast fashion', 'trendy'],
      patterns: [/\bshein\b/i],
      popularity: 7
    },
    {
      name: 'Fashion Nova',
      aliases: ['fashion nova'],
      priceRange: { min: 5, max: 60 },
      categories: ['fast fashion', 'trendy'],
      patterns: [/\bfashion\s?nova\b/i],
      popularity: 6
    },
    {
      name: 'Boohoo',
      aliases: ['boohoo'],
      priceRange: { min: 5, max: 50 },
      categories: ['fast fashion', 'young'],
      patterns: [/\bboohoo\b/i],
      popularity: 5
    },
    {
      name: 'ASOS',
      aliases: ['asos'],
      priceRange: { min: 10, max: 150 },
      categories: ['fast fashion', 'trendy'],
      patterns: [/\basos\b/i],
      popularity: 7
    },

    // Department Store & Mall Brands
    {
      name: 'J.Crew',
      aliases: ['j.crew', 'jcrew', 'j crew'],
      priceRange: { min: 20, max: 200 },
      categories: ['preppy', 'business casual'],
      patterns: [/\bj\.?crew\b/i],
      popularity: 7
    },
    {
      name: 'Ann Taylor',
      aliases: ['ann taylor'],
      priceRange: { min: 20, max: 150 },
      categories: ['women', 'business', 'dress'],
      patterns: [/\bann\s?taylor\b/i],
      popularity: 6
    },
    {
      name: 'Express',
      aliases: ['express'],
      priceRange: { min: 15, max: 150 },
      categories: ['business casual', 'trendy'],
      patterns: [/\bexpress\b/i],
      popularity: 7
    },
    {
      name: 'Uniqlo',
      aliases: ['uniqlo'],
      priceRange: { min: 10, max: 100 },
      categories: ['basic', 'casual', 'minimalist'],
      patterns: [/\buniqlo\b/i],
      popularity: 8
    },
    {
      name: 'Anthropologie',
      aliases: ['anthropologie', 'anthro'],
      priceRange: { min: 30, max: 300 },
      categories: ['bohemian', 'women', 'unique'],
      patterns: [/\banthropologie\b/i, /\banthro\b/i],
      popularity: 6
    },

    // Luxury & Designer
    {
      name: 'Gucci',
      aliases: ['gucci'],
      priceRange: { min: 100, max: 5000 },
      categories: ['luxury', 'designer'],
      patterns: [/\bgucci\b/i],
      popularity: 8
    },
    {
      name: 'Louis Vuitton',
      aliases: ['louis vuitton', 'lv'],
      priceRange: { min: 200, max: 10000 },
      categories: ['luxury', 'designer'],
      patterns: [/\blouis\s?vuitton\b/i, /\blv\b/i],
      popularity: 8
    },
    {
      name: 'Prada',
      aliases: ['prada'],
      priceRange: { min: 150, max: 5000 },
      categories: ['luxury', 'designer'],
      patterns: [/\bprada\b/i],
      popularity: 7
    },
    {
      name: 'Versace',
      aliases: ['versace'],
      priceRange: { min: 100, max: 5000 },
      categories: ['luxury', 'designer'],
      patterns: [/\bversace\b/i],
      popularity: 7
    },
    {
      name: 'Burberry',
      aliases: ['burberry'],
      priceRange: { min: 100, max: 3000 },
      categories: ['luxury', 'british', 'designer'],
      patterns: [/\bburberry\b/i],
      popularity: 7
    },
    {
      name: 'Coach',
      aliases: ['coach'],
      priceRange: { min: 50, max: 800 },
      categories: ['premium', 'accessories'],
      patterns: [/\bcoach\b/i],
      popularity: 7
    },
    {
      name: 'Michael Kors',
      aliases: ['michael kors', 'mk'],
      priceRange: { min: 30, max: 500 },
      categories: ['premium', 'accessories'],
      patterns: [/\bmichael\s?kors\b/i, /\bmk\b/i],
      popularity: 7
    },
    {
      name: 'Kate Spade',
      aliases: ['kate spade'],
      priceRange: { min: 30, max: 400 },
      categories: ['premium', 'women', 'accessories'],
      patterns: [/\bkate\s?spade\b/i],
      popularity: 6
    },

    // Sports Teams & Brands
    {
      name: 'Fanatics',
      aliases: ['fanatics'],
      priceRange: { min: 15, max: 150 },
      categories: ['sports', 'fan gear'],
      patterns: [/\bfanatics\b/i],
      popularity: 5
    },
    {
      name: 'Mitchell & Ness',
      aliases: ['mitchell & ness', 'mitchell and ness'],
      priceRange: { min: 30, max: 300 },
      categories: ['sports', 'vintage', 'jerseys'],
      patterns: [/\bmitchell\s?&\s?ness\b/i],
      popularity: 5
    },

    // Vintage & Specialty
    {
      name: 'Pendleton',
      aliases: ['pendleton'],
      priceRange: { min: 30, max: 300 },
      categories: ['wool', 'outdoor', 'heritage'],
      patterns: [/\bpendleton\b/i],
      popularity: 5
    },
    {
      name: 'Woolrich',
      aliases: ['woolrich'],
      priceRange: { min: 30, max: 400 },
      categories: ['outdoor', 'wool', 'heritage'],
      patterns: [/\bwoolrich\b/i],
      popularity: 5
    }
  ];

  /**
   * Detect brands from text with advanced matching algorithms
   */
  async detectBrands(
    text: string, 
    priceHint?: number,
    categoryHint?: string
  ): Promise<BrandMatch[]> {
    const matches: BrandMatch[] = [];
    const normalizedText = this.normalizeText(text);
    
    console.log('🔍 [BRAND-DETECTOR] Analyzing text:', text);
    
    // Try different matching strategies
    for (const brand of this.brandDatabase) {
      // 1. Exact pattern matching
      const exactMatch = this.findExactMatch(normalizedText, brand);
      if (exactMatch) {
        matches.push(exactMatch);
        continue;
      }
      
      // 2. Fuzzy matching for OCR errors
      const fuzzyMatch = this.findFuzzyMatch(normalizedText, brand);
      if (fuzzyMatch) {
        matches.push(fuzzyMatch);
        continue;
      }
      
      // 3. Partial matching
      const partialMatch = this.findPartialMatch(normalizedText, brand);
      if (partialMatch) {
        matches.push(partialMatch);
      }
    }
    
    // Filter and rank matches
    const filteredMatches = this.filterAndRankMatches(
      matches, 
      priceHint, 
      categoryHint
    );
    
    console.log('✅ [BRAND-DETECTOR] Found brands:', filteredMatches.map(m => m.brand));
    
    return filteredMatches;
  }

  /**
   * Find exact pattern matches
   */
  private findExactMatch(text: string, brand: BrandDatabase): BrandMatch | null {
    for (const pattern of brand.patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          brand: brand.name,
          confidence: 0.95,
          matchType: 'exact',
          originalText: match[0],
          priceRange: brand.priceRange,
          category: brand.categories[0]
        };
      }
    }
    return null;
  }

  /**
   * Find fuzzy matches to handle OCR errors
   */
  private findFuzzyMatch(text: string, brand: BrandDatabase): BrandMatch | null {
    const words = text.split(/\s+/);
    
    for (const alias of brand.aliases) {
      for (const word of words) {
        const similarity = this.calculateStringSimilarity(
          word.toLowerCase(), 
          alias.toLowerCase()
        );
        
        // Lower threshold for better OCR error tolerance
        if (similarity > 0.65 && word.length >= 3) {
          const confidence = 0.6 + (similarity - 0.65) * 1.2; // 0.6 to 0.9
          
          return {
            brand: brand.name,
            confidence,
            matchType: 'fuzzy',
            originalText: word,
            priceRange: brand.priceRange,
            category: brand.categories[0]
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Find partial matches for incomplete text
   */
  private findPartialMatch(text: string, brand: BrandDatabase): BrandMatch | null {
    for (const alias of brand.aliases) {
      if (alias.length < 4) continue; // Skip short aliases for partial matching
      
      // Check if text contains significant portion of brand name
      if (text.toLowerCase().includes(alias.toLowerCase().substring(0, 4)) &&
          alias.length >= 5) {
        return {
          brand: brand.name,
          confidence: 0.6,
          matchType: 'partial',
          originalText: alias.substring(0, 4),
          priceRange: brand.priceRange,
          category: brand.categories[0]
        };
      }
    }
    
    return null;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }
    
    const maxLen = Math.max(str1.length, str2.length);
    const distance = matrix[str2.length][str1.length];
    return 1 - (distance / maxLen);
  }

  /**
   * Filter and rank matches by relevance
   */
  private filterAndRankMatches(
    matches: BrandMatch[], 
    priceHint?: number,
    categoryHint?: string
  ): BrandMatch[] {
    // Remove duplicates (keep highest confidence)
    const uniqueMatches = new Map<string, BrandMatch>();
    
    matches.forEach(match => {
      const existing = uniqueMatches.get(match.brand);
      if (!existing || match.confidence > existing.confidence) {
        uniqueMatches.set(match.brand, match);
      }
    });
    
    let filteredMatches = Array.from(uniqueMatches.values());
    
    // Apply price-based filtering if hint provided
    if (priceHint && priceHint > 0) {
      filteredMatches = filteredMatches.map(match => {
        const priceMatch = this.calculatePriceCompatibility(match, priceHint);
        return {
          ...match,
          confidence: match.confidence * priceMatch
        };
      });
    }
    
    // Apply category-based boosting if hint provided
    if (categoryHint) {
      filteredMatches = filteredMatches.map(match => {
        const categoryMatch = this.calculateCategoryCompatibility(match, categoryHint);
        return {
          ...match,
          confidence: match.confidence * categoryMatch
        };
      });
    }
    
    // Sort by confidence and popularity
    return filteredMatches
      .filter(match => match.confidence > 0.4) // Minimum confidence threshold
      .sort((a, b) => {
        // Primary sort: confidence
        if (Math.abs(a.confidence - b.confidence) > 0.1) {
          return b.confidence - a.confidence;
        }
        
        // Secondary sort: brand popularity
        const brandA = this.brandDatabase.find(b => b.name === a.brand);
        const brandB = this.brandDatabase.find(b => b.name === b.brand);
        return (brandB?.popularity || 0) - (brandA?.popularity || 0);
      })
      .slice(0, 3); // Return top 3 matches
  }

  /**
   * Calculate price compatibility score
   */
  private calculatePriceCompatibility(match: BrandMatch, price: number): number {
    if (!match.priceRange) return 1.0;
    
    const { min, max } = match.priceRange;
    
    if (price >= min && price <= max) {
      return 1.0; // Perfect match
    }
    
    if (price < min) {
      // Price too low - gradually reduce confidence
      const ratio = price / min;
      return Math.max(0.3, ratio);
    }
    
    if (price > max) {
      // Price too high - could be premium version
      const ratio = max / price;
      return Math.max(0.5, ratio);
    }
    
    return 1.0;
  }

  /**
   * Calculate category compatibility score
   */
  private calculateCategoryCompatibility(match: BrandMatch, category: string): number {
    if (!match.category) return 1.0;
    
    const categoryLower = category.toLowerCase();
    const brandCategories = this.brandDatabase
      .find(b => b.name === match.brand)?.categories || [];
    
    // Direct category match
    if (brandCategories.some(cat => cat.toLowerCase().includes(categoryLower))) {
      return 1.2; // Boost confidence
    }
    
    // Related category match
    const relatedCategories: Record<string, string[]> = {
      'athletic': ['activewear', 'sports', 'gym'],
      'casual': ['everyday', 'basic', 'relaxed'],
      'dress': ['formal', 'business', 'professional'],
      'outdoor': ['hiking', 'camping', 'adventure']
    };
    
    for (const [key, related] of Object.entries(relatedCategories)) {
      if (brandCategories.includes(key) && 
          related.some(rel => categoryLower.includes(rel))) {
        return 1.1; // Small boost
      }
    }
    
    return 1.0; // No penalty for unrelated categories
  }

  /**
   * Normalize text for better matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s&]/g, ' ') // Remove special chars except &
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get brand suggestions based on partial input
   */
  getBrandSuggestions(partialText: string, limit: number = 5): string[] {
    const normalized = partialText.toLowerCase();
    
    const suggestions = this.brandDatabase
      .filter(brand => 
        brand.aliases.some(alias => 
          alias.toLowerCase().startsWith(normalized)
        )
      )
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
      .map(brand => brand.name);
    
    return suggestions;
  }

  /**
   * Get brand information
   */
  getBrandInfo(brandName: string): BrandDatabase | null {
    return this.brandDatabase.find(brand => 
      brand.name.toLowerCase() === brandName.toLowerCase()
    ) || null;
  }

  /**
   * Add custom brand to database
   */
  addCustomBrand(brand: BrandDatabase): void {
    // Check if brand already exists
    const existing = this.brandDatabase.find(b => 
      b.name.toLowerCase() === brand.name.toLowerCase()
    );
    
    if (!existing) {
      this.brandDatabase.push(brand);
      console.log('✅ [BRAND-DETECTOR] Added custom brand:', brand.name);
    } else {
      console.log('⚠️ [BRAND-DETECTOR] Brand already exists:', brand.name);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      totalBrands: this.brandDatabase.length,
      brandsByCategory: this.brandDatabase.reduce((acc, brand) => {
        brand.categories.forEach(cat => {
          acc[cat] = (acc[cat] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>),
      averageAliases: this.brandDatabase.reduce((sum, brand) => 
        sum + brand.aliases.length, 0) / this.brandDatabase.length,
      priceRanges: {
        budget: this.brandDatabase.filter(b => b.priceRange.max <= 50).length,
        midRange: this.brandDatabase.filter(b => 
          b.priceRange.max > 50 && b.priceRange.max <= 200).length,
        premium: this.brandDatabase.filter(b => b.priceRange.max > 200).length
      }
    };
  }
}

export const enhancedBrandDetector = new EnhancedBrandDetector();