import { SupabaseClient } from '@supabase/supabase-js';
import EbayApiService from './ebayApi';

interface EbayCategory {
  categoryId: string;
  categoryName: string;
  parentId?: string;
  categoryPath: string;
  isLeafCategory: boolean;
  categoryLevel: number;
  itemSpecifics?: ItemSpecific[];
}

interface ItemSpecific {
  name: string;
  maxValues: number;
  selectionMode: 'SelectionOnly' | 'FreeText' | 'SelectionOrFreeText';
  values: string[];
  helpText?: string;
  required: boolean;
}

interface CategorySuggestion extends EbayCategory {
  score: number;
  confidence: number;
}

export class EbayCategoryManager {
  private ebayApi: EbayApiService;
  private supabase: SupabaseClient;
  private categoryCache: Map<string, EbayCategory> = new Map();

  constructor(ebayApiService: EbayApiService, supabaseClient: SupabaseClient) {
    this.ebayApi = ebayApiService;
    this.supabase = supabaseClient;
  }

  /**
   * Initialize categories by fetching from eBay and caching in database
   */
  async initializeCategories(): Promise<void> {
    try {
      console.log('🔄 [CATEGORY-MANAGER] Initializing eBay categories...');
      
      // Check if we have recent cached data
      const { data: existingCategories, error } = await this.supabase
        .from('ebay_categories')
        .select('count')
        .gte('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (!error && existingCategories && existingCategories.length > 0) {
        console.log('✅ [CATEGORY-MANAGER] Categories already cached and recent');
        return;
      }

      // Fetch fresh categories from eBay
      const categories = await this.ebayApi.getCategories(3);
      console.log('✅ [CATEGORY-MANAGER] Categories initialized:', categories.length);
    } catch (error) {
      console.error('❌ [CATEGORY-MANAGER] Error initializing categories:', error);
      throw error;
    }
  }

  /**
   * Suggest best eBay category based on item details
   */
  async suggestCategory(
    title: string, 
    description: string = '', 
    itemSpecifics: Record<string, string> = {}
  ): Promise<CategorySuggestion[]> {
    try {
      console.log('🎯 [CATEGORY-MANAGER] Suggesting category for:', { title, description: description.substring(0, 50) });
      
      const suggestions = await this.ebayApi.suggestCategory(title, description, itemSpecifics.brand);
      
      // Convert to CategorySuggestion format
      const categorySuggestions: CategorySuggestion[] = suggestions.map(cat => ({
        ...cat,
        score: (cat as any).score || 5,
        confidence: Math.min(0.95, 0.5 + ((cat as any).score || 5) * 0.1)
      }));
      
      console.log('✅ [CATEGORY-MANAGER] Category suggestions generated:', categorySuggestions.length);
      return categorySuggestions;
    } catch (error) {
      console.error('❌ [CATEGORY-MANAGER] Error suggesting category:', error);
      
      // Return fallback suggestions
      return [{
        categoryId: '11450',
        categoryName: 'Clothing',
        categoryPath: 'Clothing, Shoes & Accessories > Clothing',
        isLeafCategory: true,
        categoryLevel: 2,
        score: 3,
        confidence: 0.3
      }];
    }
  }

  /**
   * Get item specifics for a category
   */
  async getCategorySpecifics(categoryId: string): Promise<ItemSpecific[]> {
    try {
      console.log('📋 [CATEGORY-MANAGER] Getting specifics for category:', categoryId);
      
      const specifics = await this.ebayApi.getCategorySpecifics(categoryId);
      
      console.log('✅ [CATEGORY-MANAGER] Category specifics retrieved:', specifics.length);
      return specifics;
    } catch (error) {
      console.error('❌ [CATEGORY-MANAGER] Error getting category specifics:', error);
      
      // Return basic fallback specifics
      return [
        {
          name: 'Brand',
          maxValues: 1,
          selectionMode: 'FreeText',
          values: [],
          required: true
        },
        {
          name: 'Size',
          maxValues: 1,
          selectionMode: 'SelectionOrFreeText',
          values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          required: false
        },
        {
          name: 'Color',
          maxValues: 1,
          selectionMode: 'FreeText',
          values: [],
          required: false
        },
        {
          name: 'Condition',
          maxValues: 1,
          selectionMode: 'SelectionOnly',
          values: ['New with tags', 'New without tags', 'Pre-owned'],
          required: true
        }
      ];
    }
  }

  /**
   * Validate that item specifics meet category requirements
   */
  async validateCategoryChoice(
    categoryId: string, 
    itemSpecifics: Record<string, string>
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    try {
      console.log('✅ [CATEGORY-MANAGER] Validating category choice:', { categoryId, itemSpecifics });
      
      const requiredSpecifics = await this.getCategorySpecifics(categoryId);
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check required specifics
      requiredSpecifics
        .filter(spec => spec.required)
        .forEach(spec => {
          const value = itemSpecifics[spec.name];
          if (!value || value.trim() === '') {
            errors.push(`${spec.name} is required for this category`);
          }
        });
      
      // Check value constraints
      requiredSpecifics.forEach(spec => {
        const value = itemSpecifics[spec.name];
        if (value && spec.selectionMode === 'SelectionOnly' && spec.values.length > 0) {
          if (!spec.values.includes(value)) {
            warnings.push(`${spec.name} value "${value}" may not be accepted. Suggested values: ${spec.values.join(', ')}`);
          }
        }
      });
      
      const isValid = errors.length === 0;
      
      console.log('✅ [CATEGORY-MANAGER] Validation complete:', { isValid, errors: errors.length, warnings: warnings.length });
      
      return { isValid, errors, warnings };
    } catch (error) {
      console.error('❌ [CATEGORY-MANAGER] Error validating category:', error);
      return {
        isValid: false,
        errors: ['Unable to validate category requirements'],
        warnings: []
      };
    }
  }

  /**
   * Get all categories (with caching)
   */
  async getAllCategories(): Promise<EbayCategory[]> {
    try {
      console.log('📂 [CATEGORY-MANAGER] Getting all categories...');
      
      // Try to get from database cache first
      const { data: cachedCategories, error } = await this.supabase
        .from('ebay_categories')
        .select('*')
        .gte('last_updated', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // 7 days
      
      if (!error && cachedCategories && cachedCategories.length > 0) {
        console.log('✅ [CATEGORY-MANAGER] Using cached categories:', cachedCategories.length);
        return cachedCategories.map(this.mapCachedCategory);
      }
      
      // Fetch fresh data from eBay
      console.log('🔄 [CATEGORY-MANAGER] Fetching fresh categories from eBay...');
      const categories = await this.ebayApi.getCategories();
      
      console.log('✅ [CATEGORY-MANAGER] Categories retrieved:', categories.length);
      return categories;
    } catch (error) {
      console.error('❌ [CATEGORY-MANAGER] Error getting categories:', error);
      
      // Return fallback categories
      return [
        {
          categoryId: '11450',
          categoryName: 'Clothing',
          categoryPath: 'Clothing, Shoes & Accessories > Clothing',
          isLeafCategory: true,
          categoryLevel: 2
        },
        {
          categoryId: '93427',
          categoryName: 'Shoes',
          categoryPath: 'Clothing, Shoes & Accessories > Shoes',
          isLeafCategory: true,
          categoryLevel: 2
        }
      ];
    }
  }

  /**
   * Search categories by name or path
   */
  searchCategories(categories: EbayCategory[], searchTerm: string): EbayCategory[] {
    if (!searchTerm.trim()) return categories;
    
    const term = searchTerm.toLowerCase();
    return categories.filter(cat =>
      cat.categoryName.toLowerCase().includes(term) ||
      cat.categoryPath.toLowerCase().includes(term)
    );
  }

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string): Promise<EbayCategory | null> {
    try {
      const { data, error } = await this.supabase
        .from('ebay_categories')
        .select('*')
        .eq('category_id', categoryId)
        .single();
      
      if (error || !data) {
        console.log('⚠️ [CATEGORY-MANAGER] Category not found in cache:', categoryId);
        return null;
      }
      
      return this.mapCachedCategory(data);
    } catch (error) {
      console.error('❌ [CATEGORY-MANAGER] Error getting category by ID:', error);
      return null;
    }
  }

  private mapCachedCategory(cachedCat: any): EbayCategory {
    return {
      categoryId: cachedCat.category_id,
      categoryName: cachedCat.category_name,
      parentId: cachedCat.parent_id,
      categoryPath: cachedCat.category_path,
      isLeafCategory: cachedCat.is_leaf_category,
      categoryLevel: cachedCat.category_level,
      itemSpecifics: cachedCat.item_specifics || []
    };
  }
}

export default EbayCategoryManager;
export type { EbayCategory, ItemSpecific, CategorySuggestion };