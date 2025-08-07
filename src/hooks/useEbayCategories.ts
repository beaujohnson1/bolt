import { useState, useEffect } from 'react';

interface EbayCategory {
  id: string;
  name: string;
  path: string;
  parentId?: string;
  leafCategory: boolean;
}

export const useEbayCategories = () => {
  const [categories, setCategories] = useState<EbayCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock eBay categories for now - in production this would fetch from eBay API
  const mockCategories: EbayCategory[] = [
    {
      id: '11450',
      name: 'Clothing',
      path: 'Clothing, Shoes & Accessories > Clothing',
      leafCategory: false
    },
    {
      id: '57988',
      name: 'Coats & Jackets',
      path: 'Clothing, Shoes & Accessories > Clothing > Coats & Jackets',
      parentId: '11450',
      leafCategory: true
    },
    {
      id: '57990',
      name: 'Shirts',
      path: 'Clothing, Shoes & Accessories > Clothing > Shirts',
      parentId: '11450',
      leafCategory: true
    },
    {
      id: '57989',
      name: 'Pants',
      path: 'Clothing, Shoes & Accessories > Clothing > Pants',
      parentId: '11450',
      leafCategory: true
    },
    {
      id: '63861',
      name: 'Dresses',
      path: 'Clothing, Shoes & Accessories > Clothing > Dresses',
      parentId: '11450',
      leafCategory: true
    },
    {
      id: '93427',
      name: 'Shoes',
      path: 'Clothing, Shoes & Accessories > Shoes',
      leafCategory: false
    },
    {
      id: '169291',
      name: 'Accessories',
      path: 'Clothing, Shoes & Accessories > Accessories',
      leafCategory: false
    }
  ];

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📂 [EBAY-CATEGORIES] Fetching categories...');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCategories(mockCategories);
      console.log('✅ [EBAY-CATEGORIES] Categories loaded:', mockCategories.length);
      
    } catch (error) {
      console.error('❌ [EBAY-CATEGORIES] Error fetching categories:', error);
      setError('Failed to load eBay categories');
    } finally {
      setLoading(false);
    }
  };

  const searchCategories = (searchTerm: string): EbayCategory[] => {
    if (!searchTerm.trim()) return categories;
    
    const term = searchTerm.toLowerCase();
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(term) ||
      cat.path.toLowerCase().includes(term)
    );
  };

  const getCategoryById = (id: string): EbayCategory | undefined => {
    return categories.find(cat => cat.id === id);
  };

  const getCategoryPath = (id: string): string => {
    const category = getCategoryById(id);
    return category?.path || '';
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
    refetch: fetchCategories
  };
};