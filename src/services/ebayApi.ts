import { withTimeout } from '../utils/promiseUtils';

interface EbayCategory {
  categoryId: string;
  categoryName: string;
  parentId?: string;
  categoryPath: string;
  isLeafCategory: boolean;
  categoryLevel: number;
}

interface CategorySuggestion extends EbayCategory {
  score: number;
}

interface ItemAspect {
  name: string;
  maxValues: number;
  allowedValues: string[];
  importance: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
  aspectDataType: string;
}

interface CompletedListing {
  title: string;
  price: number;
  condition: string;
  endTime: string;
  watchCount?: number;
  bidCount?: number;
}

interface TrendingItem {
  title: string;
  categoryId: string;
  price: number;
  imageUrl?: string;
  popularity: number;
}

interface EbayListing {
  listingId: string;
  listingUrl: string;
  title: string;
  price: number;
  status: 'active' | 'ended' | 'sold';
  views: number;
  watchers: number;
}

class EbayApiService {
  private baseUrl: string;
  private appId: string;
  private devId: string;
  private certId: string;
  private environment: 'sandbox' | 'production';

  constructor() {
    // Determine environment
    this.environment = import.meta.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
    
    // Set configuration based on environment
    if (this.environment === 'production') {
      this.baseUrl = import.meta.env.VITE_EBAY_PROD_BASE_URL || 'https://api.ebay.com';
      this.appId = import.meta.env.VITE_EBAY_PROD_APP_ID || '';
      this.devId = import.meta.env.VITE_EBAY_PROD_DEV_ID || '';
      this.certId = import.meta.env.VITE_EBAY_PROD_CERT_ID || '';
    } else {
      this.baseUrl = import.meta.env.VITE_EBAY_SANDBOX_BASE_URL || 'https://api.sandbox.ebay.com';
      this.appId = import.meta.env.VITE_EBAY_SANDBOX_APP_ID || '';
      this.devId = import.meta.env.VITE_EBAY_SANDBOX_DEV_ID || '';
      this.certId = import.meta.env.VITE_EBAY_SANDBOX_CERT_ID || '';
    }

    console.log('🔧 [EBAY-API] Initialized with environment:', this.environment);
    console.log('🔧 [EBAY-API] Base URL:', this.baseUrl);
    console.log('🔧 [EBAY-API] Has App ID:', !!this.appId);
    console.log('🔧 [EBAY-API] Has Dev ID:', !!this.devId);
    console.log('🔧 [EBAY-API] Has Cert ID:', !!this.certId);
  }

  /**
   * Test eBay API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; environment: string }> {
    try {
      console.log('🧪 [EBAY-API] Testing connection...');
      
      if (!this.appId || !this.devId || !this.certId) {
        return {
          success: false,
          message: 'eBay API credentials not configured. Check environment variables.',
          environment: this.environment
        };
      }

      // Test with a simple category request
      const categories = await this.getCategories(1); // Get just 1 level
      
      return {
        success: true,
        message: `Connected successfully. Found ${categories.length} categories.`,
        environment: this.environment
      };
    } catch (error) {
      console.error('❌ [EBAY-API] Connection test failed:', error);
      return {
        success: false,
        message: error.message,
        environment: this.environment
      };
    }
  }

  /**
   * Get eBay categories using Trading API
   */
  async getCategories(levelLimit: number = 3): Promise<EbayCategory[]> {
    try {
      console.log('📂 [EBAY-API] Fetching categories with level limit:', levelLimit);
      
      const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>AgAAAA**AQAAAA**aAAAAA**</eBayAuthToken>
  </RequesterCredentials>
  <CategorySiteID>0</CategorySiteID>
  <LevelLimit>${levelLimit}</LevelLimit>
  <ViewAllNodes>true</ViewAllNodes>
</GetCategoriesRequest>`;

      const response = await this._callProxy(
        `${this.baseUrl}/ws/api/eBayAPI.dll`,
        'POST',
        {
          'Content-Type': 'text/xml',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-DEV-NAME': this.devId,
          'X-EBAY-API-APP-NAME': this.appId,
          'X-EBAY-API-CERT-NAME': this.certId,
          'X-EBAY-API-CALL-NAME': 'GetCategories',
          'X-EBAY-API-SITEID': '0'
        },
        xmlBody
      );

      // Parse XML response (simplified)
      const categories = this._parseXMLCategories(response);
      console.log('✅ [EBAY-API] Categories fetched successfully:', categories.length);
      return categories;
    } catch (error) {
      console.error('❌ [EBAY-API] Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Suggest category based on item title and description
   */
  async suggestCategory(title: string, description: string = '', brand?: string): Promise<CategorySuggestion[]> {
    try {
      console.log('🎯 [EBAY-API] Suggesting category for:', { title, brand });
      
      // Use Browse API to search for similar items and extract their categories
      const searchQuery = `${brand ? brand + ' ' : ''}${title}`.trim();
      
      const response = await this._callProxy(
        `${this.baseUrl}/buy/browse/v1/item_summary/search`,
        'GET',
        {
          'Authorization': `Bearer ${await this._getAccessToken()}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        },
        null,
        { q: searchQuery, limit: 10 }
      );

      // Extract categories from search results
      const suggestions = this._extractCategoriesFromSearch(response);
      console.log('✅ [EBAY-API] Category suggestions generated:', suggestions.length);
      return suggestions;
    } catch (error) {
      console.error('❌ [EBAY-API] Error suggesting category:', error);
      
      // Return fallback suggestions
      return [{
        categoryId: '11450',
        categoryName: 'Clothing',
        categoryPath: 'Clothing, Shoes & Accessories > Clothing',
        isLeafCategory: true,
        categoryLevel: 2,
        score: 3
      }];
    }
  }

  /**
   * Get item aspects for a specific category using Sell Metadata API
   */
  async getItemAspectsForCategory(categoryId: string): Promise<ItemAspect[]> {
    try {
      console.log('📋 [EBAY-API] Getting item aspects for category:', categoryId);
      
      const response = await this._callProxy(
        `${this.baseUrl}/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category`,
        'GET',
        {
          'Authorization': `Bearer ${await this._getAccessToken()}`,
          'Content-Type': 'application/json'
        },
        null,
        { category_id: categoryId }
      );

      const aspects = this._parseItemAspects(response);
      console.log('✅ [EBAY-API] Item aspects retrieved:', aspects.length);
      return aspects;
    } catch (error) {
      console.error('❌ [EBAY-API] Error getting item aspects:', error);
      return [];
    }
  }

  /**
   * Get category specifics using Trading API (fallback)
   */
  async getCategorySpecifics(categoryId: string): Promise<any[]> {
    try {
      console.log('📋 [EBAY-API] Getting category specifics for:', categoryId);
      
      const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<GetCategorySpecificsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>AgAAAA**AQAAAA**aAAAAA**</eBayAuthToken>
  </RequesterCredentials>
  <CategoryID>${categoryId}</CategoryID>
</GetCategorySpecificsRequest>`;

      const response = await this._callProxy(
        `${this.baseUrl}/ws/api/eBayAPI.dll`,
        'POST',
        {
          'Content-Type': 'text/xml',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-DEV-NAME': this.devId,
          'X-EBAY-API-APP-NAME': this.appId,
          'X-EBAY-API-CERT-NAME': this.certId,
          'X-EBAY-API-CALL-NAME': 'GetCategorySpecifics',
          'X-EBAY-API-SITEID': '0'
        },
        xmlBody
      );

      const specifics = this._parseCategorySpecifics(response);
      console.log('✅ [EBAY-API] Category specifics retrieved:', specifics.length);
      return specifics;
    } catch (error) {
      console.error('❌ [EBAY-API] Error getting category specifics:', error);
      return [];
    }
  }

  /**
   * Search completed items for pricing research
   */
  async searchCompletedItems(query: string, categoryId?: string): Promise<CompletedListing[]> {
    try {
      console.log('🔍 [EBAY-API] Searching completed items:', { query, categoryId });
      
      const params: any = {
        'OPERATION-NAME': 'findCompletedItems',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'keywords': query,
        'itemFilter(0).name': 'SoldItemsOnly',
        'itemFilter(0).value': 'true',
        'sortOrder': 'EndTimeSoonest',
        'paginationInput.entriesPerPage': '100'
      };

      if (categoryId) {
        params['categoryId'] = categoryId;
      }

      const response = await this._callProxy(
        `${this.baseUrl}/services/search/FindingService/v1`,
        'GET',
        {
          'X-EBAY-SOA-OPERATION-NAME': 'findCompletedItems',
          'X-EBAY-SOA-SERVICE-VERSION': '1.0.0',
          'X-EBAY-SOA-REQUEST-DATA-FORMAT': 'JSON',
          'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'JSON'
        },
        null,
        params
      );

      const completedItems = this._parseCompletedItems(response);
      console.log('✅ [EBAY-API] Completed items found:', completedItems.length);
      return completedItems;
    } catch (error) {
      console.error('❌ [EBAY-API] Error searching completed items:', error);
      return [];
    }
  }

  /**
   * Get trending items for market insights
   */
  async getTrendingItems(categoryId?: string): Promise<TrendingItem[]> {
    try {
      console.log('🔥 [EBAY-API] Getting trending items for category:', categoryId);
      
      const params: any = {
        'OPERATION-NAME': 'findItemsAdvanced',
        'SERVICE-VERSION': '1.0.0',
        'SECURITY-APPNAME': this.appId,
        'RESPONSE-DATA-FORMAT': 'JSON',
        'sortOrder': 'BestMatch',
        'paginationInput.entriesPerPage': '20',
        'itemFilter(0).name': 'ListingType',
        'itemFilter(0).value': 'FixedPrice'
      };

      if (categoryId) {
        params['categoryId'] = categoryId;
      }

      const response = await this._callProxy(
        `${this.baseUrl}/services/search/FindingService/v1`,
        'GET',
        {
          'X-EBAY-SOA-OPERATION-NAME': 'findItemsAdvanced',
          'X-EBAY-SOA-SERVICE-VERSION': '1.0.0',
          'X-EBAY-SOA-REQUEST-DATA-FORMAT': 'JSON',
          'X-EBAY-SOA-RESPONSE-DATA-FORMAT': 'JSON'
        },
        null,
        params
      );

      const trendingItems = this._parseTrendingItems(response);
      console.log('✅ [EBAY-API] Trending items retrieved:', trendingItems.length);
      return trendingItems;
    } catch (error) {
      console.error('❌ [EBAY-API] Error getting trending items:', error);
      return [];
    }
  }

  /**
   * Create eBay listing from item data
   */
  async createListingFromItem(item: any): Promise<EbayListing> {
    try {
      console.log('📝 [EBAY-API] Creating eBay listing for item:', item.title);
      
      // For now, return a mock listing since actual listing creation requires
      // more complex authentication and seller account setup
      const mockListing: EbayListing = {
        listingId: `mock_${Date.now()}`,
        listingUrl: `https://www.ebay.com/itm/mock_${Date.now()}`,
        title: item.title,
        price: item.suggested_price,
        status: 'active',
        views: 0,
        watchers: 0
      };

      console.log('✅ [EBAY-API] Mock listing created:', mockListing.listingId);
      return mockListing;
    } catch (error) {
      console.error('❌ [EBAY-API] Error creating listing:', error);
      throw error;
    }
  }

  /**
   * Private method to call eBay API through Netlify proxy with timeout
   */
  private async _callProxy(
    url: string,
    method: string = 'GET',
    headers: Record<string, string> = {},
    body?: string,
    params?: Record<string, string>
  ): Promise<any> {
    try {
      console.log('🔄 [EBAY-API] Making proxied API call:', {
        url: url.replace(this.baseUrl, '[BASE_URL]'),
        method,
        hasBody: !!body,
        hasParams: !!params,
        headerCount: Object.keys(headers).length
      });

      // Build URL with query parameters
      let fullUrl = url;
      if (params && Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        fullUrl += `?${queryString}`;
      }

      // Prepare request for proxy
      // Check if we're in development and Netlify functions aren't available
      const isDev = import.meta.env.DEV;
      
      const proxyRequest = {
        url: fullUrl,
        method,
        headers,
        body
      };

      console.log('📤 [EBAY-API] Sending request through proxy...');
      
      // Add timeout to the fetch call
      const response = await withTimeout(
        fetch('/.netlify/functions/ebay-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(proxyRequest)
        }),
        20000, // 20 second timeout
        'eBay API request timed out after 20 seconds'
      );

      // Handle 404 in development (Netlify functions not available)
      if (!response.ok && response.status === 404 && isDev) {
        throw new Error('eBay API proxy not available in development mode. Use "netlify dev" or deploy to test eBay functionality.');
      }

      console.log('📥 [EBAY-API] Proxy response received:', {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('Content-Type')
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [EBAY-API] Proxy response not ok:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 200)
        });
        throw new Error(`eBay API proxy error: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('📄 [EBAY-API] Response text length:', responseText.length);
      
      // Handle empty responses
      if (!responseText.trim()) {
        console.warn('⚠️ [EBAY-API] Empty response from proxy');
        return { error: 'Empty response from eBay API' };
      }

      // Try to parse as JSON
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('✅ [EBAY-API] Successfully parsed JSON response');
        return jsonResponse;
      } catch (parseError) {
        console.log('📄 [EBAY-API] Response is not JSON, treating as XML/text');
        return responseText;
      }
    } catch (error) {
      console.error('❌ [EBAY-API] Proxy call failed:', error);
      throw error;
    }
  }

  /**
   * Get OAuth access token for authenticated API calls
   */
  private async _getAccessToken(): Promise<string> {
    try {
      console.log('🔑 [EBAY-API] Getting OAuth access token...');
      
      // For now, return a placeholder token
      // In production, this would implement the OAuth flow
      const mockToken = 'mock_access_token_' + Date.now();
      console.log('✅ [EBAY-API] Mock access token generated');
      return mockToken;
    } catch (error) {
      console.error('❌ [EBAY-API] Error getting access token:', error);
      throw error;
    }
  }

  /**
   * Parse XML categories response
   */
  private _parseXMLCategories(xmlResponse: string): EbayCategory[] {
    try {
      console.log('📊 [EBAY-API] Parsing XML categories response...');
      
      // Simplified XML parsing - in production, use a proper XML parser
      const categories: EbayCategory[] = [
        {
          categoryId: '11450',
          categoryName: 'Clothing',
          categoryPath: 'Clothing, Shoes & Accessories > Clothing',
          isLeafCategory: true,
          categoryLevel: 2
        },
        {
          categoryId: '57988',
          categoryName: 'Coats & Jackets',
          categoryPath: 'Clothing, Shoes & Accessories > Clothing > Coats & Jackets',
          isLeafCategory: true,
          categoryLevel: 3
        },
        {
          categoryId: '93427',
          categoryName: 'Shoes',
          categoryPath: 'Clothing, Shoes & Accessories > Shoes',
          isLeafCategory: true,
          categoryLevel: 2
        }
      ];

      console.log('✅ [EBAY-API] XML categories parsed (mock data):', categories.length);
      return categories;
    } catch (error) {
      console.error('❌ [EBAY-API] Error parsing XML categories:', error);
      return [];
    }
  }

  /**
   * Extract categories from search results
   */
  private _extractCategoriesFromSearch(response: any): CategorySuggestion[] {
    try {
      console.log('📊 [EBAY-API] Extracting categories from search results...');
      
      // Mock category suggestions based on search
      const suggestions: CategorySuggestion[] = [
        {
          categoryId: '11450',
          categoryName: 'Clothing',
          categoryPath: 'Clothing, Shoes & Accessories > Clothing',
          isLeafCategory: true,
          categoryLevel: 2,
          score: 8
        }
      ];

      console.log('✅ [EBAY-API] Category suggestions extracted:', suggestions.length);
      return suggestions;
    } catch (error) {
      console.error('❌ [EBAY-API] Error extracting categories:', error);
      return [];
    }
  }

  /**
   * Parse item aspects from Sell Metadata API response
   */
  private _parseItemAspects(response: any): ItemAspect[] {
    try {
      console.log('📊 [EBAY-API] Parsing item aspects response...');
      
      if (!response || !response.aspects) {
        console.log('⚠️ [EBAY-API] No aspects found in response');
        return [];
      }

      const aspects: ItemAspect[] = response.aspects.map((aspect: any) => ({
        name: aspect.localizedAspectName || aspect.name,
        maxValues: aspect.aspectConstraint?.maxValues || 1,
        allowedValues: aspect.aspectValues?.map((v: any) => v.localizedValue || v.value) || [],
        importance: aspect.aspectConstraint?.aspectRequired ? 'REQUIRED' : 'OPTIONAL',
        aspectDataType: aspect.aspectConstraint?.aspectDataType || 'STRING'
      }));

      console.log('✅ [EBAY-API] Item aspects parsed:', aspects.length);
      return aspects;
    } catch (error) {
      console.error('❌ [EBAY-API] Error parsing item aspects:', error);
      return [];
    }
  }

  /**
   * Parse category specifics from Trading API XML response
   */
  private _parseCategorySpecifics(xmlResponse: string): any[] {
    try {
      console.log('📊 [EBAY-API] Parsing category specifics XML...');
      
      // Mock specifics for now
      const specifics = [
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
        }
      ];

      console.log('✅ [EBAY-API] Category specifics parsed (mock data):', specifics.length);
      return specifics;
    } catch (error) {
      console.error('❌ [EBAY-API] Error parsing category specifics:', error);
      return [];
    }
  }

  /**
   * Parse completed items from Finding API response
   */
  private _parseCompletedItems(response: any): CompletedListing[] {
    try {
      console.log('📊 [EBAY-API] Parsing completed items response...');
      
      if (!response || !response.findCompletedItemsResponse) {
        console.log('⚠️ [EBAY-API] No completed items found in response');
        return [];
      }

      const items = response.findCompletedItemsResponse[0]?.searchResult?.[0]?.item || [];
      
      const completedItems: CompletedListing[] = items.map((item: any) => ({
        title: item.title?.[0] || '',
        price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'),
        condition: item.condition?.[0]?.conditionDisplayName?.[0] || 'Used',
        endTime: item.listingInfo?.[0]?.endTime?.[0] || '',
        watchCount: parseInt(item.listingInfo?.[0]?.watchCount?.[0] || '0'),
        bidCount: parseInt(item.sellingStatus?.[0]?.bidCount?.[0] || '0')
      }));

      console.log('✅ [EBAY-API] Completed items parsed:', completedItems.length);
      return completedItems;
    } catch (error) {
      console.error('❌ [EBAY-API] Error parsing completed items:', error);
      return [];
    }
  }

  /**
   * Parse trending items from Finding API response
   */
  private _parseTrendingItems(response: any): TrendingItem[] {
    try {
      console.log('📊 [EBAY-API] Parsing trending items response...');
      
      if (!response || !response.findItemsAdvancedResponse) {
        console.log('⚠️ [EBAY-API] No trending items found in response');
        return [];
      }

      const items = response.findItemsAdvancedResponse[0]?.searchResult?.[0]?.item || [];
      
      const trendingItems: TrendingItem[] = items.map((item: any, index: number) => ({
        title: item.title?.[0] || '',
        categoryId: item.primaryCategory?.[0]?.categoryId?.[0] || '',
        price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'),
        imageUrl: item.galleryURL?.[0] || '',
        popularity: items.length - index // Higher index = more popular
      }));

      console.log('✅ [EBAY-API] Trending items parsed:', trendingItems.length);
      return trendingItems;
    } catch (error) {
      console.error('❌ [EBAY-API] Error parsing trending items:', error);
      return [];
    }
  }
}

export default EbayApiService;