import { useState, useEffect } from 'react';
import EbayCategoryManager, { type EbayCategory } from '../services/EbayCategoryManager';
import EbayApiService from '../services/ebayApi';
import { getSupabase } from '../lib/supabase';

export const useEbayCategories = () => {
  const [categories, setCategories] = useState<EbayCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize eBay services
  const ebayService = new EbayApiService();
  const supabase = getSupabase();
  const categoryManager = supabase ? new EbayCategoryManager(ebayService, supabase) : null;


  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    
    if (!categoryManager) {
      setError('Database connection not available. Using fallback categories.');
      setCategories([
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
      ]);
      setLoading(false);
      return;
    }

    try {
      console.log('📂 [EBAY-CATEGORIES] Fetching categories from eBay API...');
      
      // Initialize categories if needed
      await categoryManager.initializeCategories();
      
      // Get all categories
      const fetchedCategories = await categoryManager.getAllCategories();
      setCategories(fetchedCategories);
      
      console.log('✅ [EBAY-CATEGORIES] Categories loaded:', fetchedCategories.length);
      
    } catch (error) {
      console.error('❌ [EBAY-CATEGORIES] Error fetching categories:', error);
      setError('Failed to load eBay categories. Using fallback data.');
      
      // Set fallback categories
      setCategories([
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
      ]);
    } finally {
      setLoading(false);
    }
  };

  const searchCategories = (searchTerm: string): EbayCategory[] => {
    return categoryManager.searchCategories(categories, searchTerm);
  };

  const getCategoryById = (id: string): EbayCategory | undefined => {
    return categories.find(cat => cat.categoryId === id);
  };

  const getCategoryPath = (id: string): string => {
    const category = getCategoryById(id);
    return category?.categoryPath || '';
  };

  const suggestCategory = async (title: string, description: string = '', brand?: string) => {
    try {
      if (!categoryManager) {
        console.error('❌ [EBAY-CATEGORIES] Category manager not available');
        return [];
      }
      
      return await categoryManager.suggestCategory(title, description, { brand });
    } catch (error) {
      console.error('❌ [EBAY-CATEGORIES] Error suggesting category:', error);
      return [];
    }
  };

  const getCategorySpecifics = async (categoryId: string) => {
    try {
      if (!categoryManager) {
        console.error('❌ [EBAY-CATEGORIES] Category manager not available');
        return [];
      }
      
      return await categoryManager.getCategorySpecifics(categoryId);
    } catch (error) {
      console.error('❌ [EBAY-CATEGORIES] Error getting category specifics:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    searchCategories,
    getCategoryById,
    getCategoryPath,
    refetch: fetchCategories,
    suggestCategory,
    getCategorySpecifics,
    categoryManager
  };
};