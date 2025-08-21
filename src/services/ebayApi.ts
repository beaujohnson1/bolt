import { withTimeout } from '../utils/promiseUtils';
import { 
  EbayBusinessPolicies, 
  EbayBusinessPolicyIds, 
  EbayFulfillmentPolicy, 
  EbayPaymentPolicy, 
  EbayReturnPolicy 
} from '../types/index';

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

  // Public getter for environment
  get currentEnvironment(): 'sandbox' | 'production' {
    return this.environment;
  }

  constructor() {
    // Determine environment - Use production if explicitly set or if we're in a deployed environment
    this.environment = import.meta.env.VITE_EBAY_USE_PRODUCTION === 'true' || 
                      import.meta.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
    
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
   * Verify Trading API capabilities available with current configuration
   */
  async verifyTradingAPICapabilities(): Promise<{ 
    capabilities: string[]; 
    requiresAuth: string[];
    environment: string;
    isConfigured: boolean;
  }> {
    const capabilities = [
      'GetCategories - Browse eBay category structure',
      'GetCategorySpecifics - Get required item attributes',
      'GetItem - Retrieve item details',
      'GetMyeBayBuying - Get user buying activity',
      'GetSearchResults - Search eBay listings'
    ];

    const requiresAuth = [
      'AddItem - Create new listings',
      'ReviseItem - Update existing listings', 
      'EndItem - End listings early',
      'GetMyeBaySelling - Get user selling activity',
      'AddFixedPriceItem - Create fixed-price listings',
      'VerifyAddItem - Validate listing before creation'
    ];

    return {
      capabilities,
      requiresAuth,
      environment: this.environment,
      isConfigured: !!(this.appId && this.devId && this.certId)
    };
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

      // Check if we're in development mode without Netlify functions
      const isDev = import.meta.env.DEV;
      
      if (isDev) {
        // In development, just verify credentials are present
        return {
          success: true,
          message: 'eBay API credentials configured. Use "netlify dev" to test full functionality.',
          environment: this.environment
        };
      }

      // Test with a simple category request in production/netlify environment
      const categories = await this.getCategories(1, false); // Get just 1 level without auth

      return {
        success: true,
        message: `Connected successfully. Found ${categories.length} categories.`,
        environment: this.environment
      };
    } catch (error) {
      console.error('❌ [EBAY-API] Connection test failed:', error);
      
      // Check if this is an OAuth authentication error
      if (error.message && error.message.includes('No valid eBay OAuth token available')) {
        return {
          success: false,
          message: 'eBay API configured but user authentication required. Click "Test eBay OAuth Flow" to authenticate.',
          environment: this.environment
        };
      }

      // Check if this is the development proxy error
      if (error.message && error.message.includes('eBay API proxy not available in development mode')) {
        return {
          success: true,
          message: 'eBay API credentials configured. Use "netlify dev" to test full functionality.',
          environment: this.environment
        };
      }
      
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
  async getCategories(levelLimit: number = 3, requireAuth: boolean = false): Promise<EbayCategory[]> {
    try {
      console.log('📂 [EBAY-API] Fetching categories with level limit:', levelLimit);
      
      let accessToken = null;
      
      // Only get OAuth token if authentication is required
      if (requireAuth) {
        accessToken = await this._getAccessToken();
      }
    
    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <CategorySiteID>0</CategorySiteID>
  <LevelLimit>${levelLimit}</LevelLimit>
  <ViewAllNodes>true</ViewAllNodes>
</GetCategoriesRequest>`;

      const headers = {
        'Content-Type': 'text/xml',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-DEV-NAME': this.devId,
        'X-EBAY-API-APP-NAME': this.appId,
        'X-EBAY-API-CERT-NAME': this.certId,
        'X-EBAY-API-CALL-NAME': 'GetCategories',
        'X-EBAY-API-SITEID': '0'
      };
      
      // Only add OAuth token if we have one
      if (accessToken) {
        headers['X-EBAY-API-IAF-TOKEN'] = accessToken;
      }

      const response = await this._callProxy(
        `${this.baseUrl}/ws/api.dll`,
        'POST',
        headers,
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
      
      // Get OAuth access token for authenticated request
      const accessToken = await this._getAccessToken();
      
      const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<GetCategorySpecificsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <CategoryID>${categoryId}</CategoryID>
</GetCategorySpecificsRequest>`;

      const response = await this._callProxy(
        `${this.baseUrl}/ws/api.dll`,
        'POST',
        {
          'Content-Type': 'text/xml',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-DEV-NAME': this.devId,
          'X-EBAY-API-APP-NAME': this.appId,
          'X-EBAY-API-CERT-NAME': this.certId,
          'X-EBAY-API-CALL-NAME': 'GetCategorySpecifics',
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-IAF-TOKEN': accessToken
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
      
      // In development mode, return mock data instead of throwing
      if (import.meta.env.DEV && error.message && error.message.includes('eBay API proxy not available in development mode')) {
        console.log('🔧 [EBAY-API] Returning mock trending items for development');
        return [
          {
            title: 'Vintage Nike Air Jordan 1 Retro High',
            categoryId: '15709',
            price: 150.00,
            imageUrl: 'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg',
            popularity: 95
          },
          {
            title: 'Apple iPhone 14 Pro Max 256GB',
            categoryId: '9355',
            price: 899.99,
            imageUrl: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg',
            popularity: 92
          },
          {
            title: 'Levi\'s 501 Original Fit Jeans',
            categoryId: '11483',
            price: 45.00,
            imageUrl: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg',
            popularity: 88
          },
          {
            title: 'Sony WH-1000XM4 Wireless Headphones',
            categoryId: '14969',
            price: 249.99,
            imageUrl: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg',
            popularity: 85
          },
          {
            title: 'Coach Leather Handbag',
            categoryId: '169291',
            price: 125.00,
            imageUrl: 'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg',
            popularity: 82
          }
        ];
      }
      
      throw error;
    }
  }

  /**
   * Get all business policies for the seller
   */
  async getAllBusinessPolicies(): Promise<EbayBusinessPolicies> {
    try {
      console.log('🏢 [EBAY-API] Fetching all business policies...');
      
      const accessToken = await this.getAccessToken();
      if (accessToken === 'dev_mode_bypass_token') {
        console.log('🏢 [EBAY-API] Dev mode - returning mock policies');
        return this._getMockBusinessPolicies();
      }

      // Fetch all policy types in parallel
      const [fulfillmentResponse, paymentResponse, returnResponse] = await Promise.all([
        this._callProxy(
          `${this.baseUrl}/sell/account/v1/fulfillment_policy`,
          'GET',
          {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        ),
        this._callProxy(
          `${this.baseUrl}/sell/account/v1/payment_policy`,
          'GET',
          {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        ),
        this._callProxy(
          `${this.baseUrl}/sell/account/v1/return_policy`,
          'GET',
          {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        )
      ]);

      const fulfillmentPolicies = this._parseFulfillmentPolicies(fulfillmentResponse?.fulfillmentPolicies || []);
      const paymentPolicies = this._parsePaymentPolicies(paymentResponse?.paymentPolicies || []);
      const returnPolicies = this._parseReturnPolicies(returnResponse?.returnPolicies || []);

      const result: EbayBusinessPolicies = {
        fulfillmentPolicies,
        paymentPolicies,
        returnPolicies
      };

      console.log('✅ [EBAY-API] Business policies retrieved:', {
        fulfillment: fulfillmentPolicies.length,
        payment: paymentPolicies.length,
        return: returnPolicies.length
      });

      // Cache policies for quick access
      this._cacheBusinessPolicies(result);

      return result;
    } catch (error) {
      console.error('❌ [EBAY-API] Error fetching business policies:', error);
      
      // Return mock policies in case of error for development
      if (import.meta.env.DEV) {
        console.log('🔧 [EBAY-API] Returning mock policies for development');
        return this._getMockBusinessPolicies();
      }
      
      throw error;
    }
  }

  /**
   * Get business policy IDs for listing creation (backwards compatibility)
   */
  async getBusinessPolicies(): Promise<{shipping?: string, payment?: string, return?: string}> {
    try {
      const policyIds = await this.getBusinessPolicyIds();
      return {
        shipping: policyIds.fulfillmentPolicyId,
        payment: policyIds.paymentPolicyId,
        return: policyIds.returnPolicyId
      };
    } catch (error) {
      console.error('❌ [EBAY-API] Error in getBusinessPolicies:', error);
      return {};
    }
  }

  /**
   * Get default business policy IDs for listing creation
   */
  async getBusinessPolicyIds(): Promise<EbayBusinessPolicyIds> {
    try {
      console.log('🏢 [EBAY-API] Getting business policy IDs...');
      
      const accessToken = await this.getAccessToken();
      if (accessToken === 'dev_mode_bypass_token') {
        console.log('🏢 [EBAY-API] Dev mode - returning mock policy IDs');
        return {
          fulfillmentPolicyId: 'MOCK_FULFILLMENT_POLICY_ID',
          paymentPolicyId: 'MOCK_PAYMENT_POLICY_ID',
          returnPolicyId: 'MOCK_RETURN_POLICY_ID'
        };
      }

      // Check if we have cached policies
      const cachedPolicies = this._getCachedBusinessPolicies();
      if (cachedPolicies) {
        return this._extractDefaultPolicyIds(cachedPolicies);
      }

      // Fetch policies if not cached
      const policies = await this.getAllBusinessPolicies();
      return this._extractDefaultPolicyIds(policies);
    } catch (error) {
      console.error('❌ [EBAY-API] Error getting business policy IDs:', error);
      
      // Return empty object in case of error
      return {};
    }
  }

  /**
   * Get fulfillment policies
   */
  async getFulfillmentPolicies(): Promise<EbayFulfillmentPolicy[]> {
    try {
      console.log('📦 [EBAY-API] Fetching fulfillment policies...');
      
      const accessToken = await this.getAccessToken();
      if (accessToken === 'dev_mode_bypass_token') {
        return this._getMockBusinessPolicies().fulfillmentPolicies;
      }

      const response = await this._callProxy(
        `${this.baseUrl}/sell/account/v1/fulfillment_policy`,
        'GET',
        {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      );

      return this._parseFulfillmentPolicies(response?.fulfillmentPolicies || []);
    } catch (error) {
      console.error('❌ [EBAY-API] Error fetching fulfillment policies:', error);
      return [];
    }
  }

  /**
   * Get payment policies
   */
  async getPaymentPolicies(): Promise<EbayPaymentPolicy[]> {
    try {
      console.log('💳 [EBAY-API] Fetching payment policies...');
      
      const accessToken = await this.getAccessToken();
      if (accessToken === 'dev_mode_bypass_token') {
        return this._getMockBusinessPolicies().paymentPolicies;
      }

      const response = await this._callProxy(
        `${this.baseUrl}/sell/account/v1/payment_policy`,
        'GET',
        {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      );

      return this._parsePaymentPolicies(response?.paymentPolicies || []);
    } catch (error) {
      console.error('❌ [EBAY-API] Error fetching payment policies:', error);
      return [];
    }
  }

  /**
   * Get return policies
   */
  async getReturnPolicies(): Promise<EbayReturnPolicy[]> {
    try {
      console.log('🔄 [EBAY-API] Fetching return policies...');
      
      const accessToken = await this.getAccessToken();
      if (accessToken === 'dev_mode_bypass_token') {
        return this._getMockBusinessPolicies().returnPolicies;
      }

      const response = await this._callProxy(
        `${this.baseUrl}/sell/account/v1/return_policy`,
        'GET',
        {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      );

      return this._parseReturnPolicies(response?.returnPolicies || []);
    } catch (error) {
      console.error('❌ [EBAY-API] Error fetching return policies:', error);
      return [];
    }
  }

  /**
   * Create eBay listing from item data
   */
  async createListingFromItem(item: any): Promise<EbayListing> {
    try {
      console.log('📝 [EBAY-API] Creating eBay listing for item:', item.title);
      console.log('📝 [EBAY-API] Environment:', this.environment);
      console.log('📝 [EBAY-API] Using production credentials:', this.environment === 'production');
      
      // Get OAuth access token for authenticated request
      const accessToken = await this._getAccessToken();
      console.log('📝 [EBAY-API] Received access token type:', accessToken === 'dev_mode_bypass_token' ? 'MOCK_TOKEN' : 'REAL_TOKEN');
      
      // Only use mock mode if absolutely no real token is available
      if (accessToken === 'dev_mode_bypass_token') {
        console.log('🔧 [EBAY-API] MOCK MODE: Creating demo eBay listing (no real API call)');
        console.log('🔧 [EBAY-API] This is NOT a real eBay listing - no actual listing will be created');
        
        const mockItemId = `MOCK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const ebayListing: EbayListing = {
          listingId: mockItemId,
          listingUrl: `https://www.ebay.com/itm/${mockItemId}`,
          title: item.title,
          price: item.suggested_price || item.final_price,
          status: 'active',
          views: 0,
          watchers: 0
        };

        console.log('✅ [EBAY-API] Mock eBay listing created successfully:', ebayListing.listingId);
        console.log('⚠️ [EBAY-API] WARNING: This is only a DEMO listing, not posted to real eBay');
        return ebayListing;
      }
      
      console.log('🚀 [EBAY-API] REAL MODE: Creating actual eBay listing with real API call');
      console.log('🚀 [EBAY-API] Access token preview:', accessToken.substring(0, 50) + '...');
      
      // Suggest category if not provided
      let categoryId = item.ai_analysis?.ebay_category_id;
      if (!categoryId) {
        console.log('🎯 [EBAY-API] No category provided, suggesting category...');
        const suggestions = await this.suggestCategory(item.title, item.description, item.brand);
        categoryId = suggestions.length > 0 ? suggestions[0].categoryId : '11450'; // Default to clothing
      }

      // Build item specifics from AI analysis
      const itemSpecifics = this._buildItemSpecifics(item);

      // Get Business Policy IDs - use provided policies or fetch default ones
      let businessPolicies;
      if (item.businessPolicies && 
          (item.businessPolicies.fulfillment || item.businessPolicies.payment || item.businessPolicies.return)) {
        console.log('🏢 [EBAY-API] Using provided business policies:', item.businessPolicies);
        businessPolicies = {
          shipping: item.businessPolicies.fulfillment,
          payment: item.businessPolicies.payment,
          return: item.businessPolicies.return
        };
      } else {
        console.log('🏢 [EBAY-API] Fetching default business policy IDs for listing...');
        const businessPolicyIds = await this.getBusinessPolicyIds();
        console.log('🏢 [EBAY-API] Default business policy IDs retrieved:', businessPolicyIds);
        
        // Convert to legacy format for XML building
        businessPolicies = {
          shipping: businessPolicyIds.fulfillmentPolicyId,
          payment: businessPolicyIds.paymentPolicyId,
          return: businessPolicyIds.returnPolicyId
        };
      }

      // Create eBay listing using Trading API
      const xmlBody = this._buildListingXML({
        title: item.title,
        description: item.description || '',
        categoryId,
        price: item.suggested_price || item.final_price,
        condition: this._mapConditionToEbay(item.condition),
        images: item.images || [],
        brand: item.brand,
        size: item.size,
        color: item.color,
        itemSpecifics,
        keywords: item.ai_suggested_keywords || [],
        businessPolicies
      });

      console.log('📦 [EBAY-API] Sending listing XML to eBay...');

      const response = await this._callProxy(
        `${this.baseUrl}/ws/api.dll`,
        'POST',
        {
          'Content-Type': 'text/xml',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-DEV-NAME': this.devId,
          'X-EBAY-API-APP-NAME': this.appId,
          'X-EBAY-API-CERT-NAME': this.certId,
          'X-EBAY-API-CALL-NAME': 'AddFixedPriceItem',
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-IAF-TOKEN': accessToken
        },
        xmlBody
      );

      // Parse the response
      const listingResult = this._parseAddItemResponse(response);
      
      if (listingResult.error) {
        throw new Error(`eBay listing creation failed: ${listingResult.error}`);
      }

      const ebayListing: EbayListing = {
        listingId: listingResult.itemId,
        listingUrl: `https://www.ebay.com/itm/${listingResult.itemId}`,
        title: item.title,
        price: item.suggested_price || item.final_price,
        status: 'active',
        views: 0,
        watchers: 0
      };

      console.log('✅ [EBAY-API] eBay listing created successfully:', ebayListing.listingId);
      return ebayListing;
    } catch (error) {
      console.error('❌ [EBAY-API] Error creating listing:', error);
      
      // Return mock listing in development or if API fails
      if (import.meta.env.DEV || error.message.includes('No valid eBay OAuth token')) {
        console.log('🔧 [EBAY-API] Returning mock listing for development/demo');
        const mockListing: EbayListing = {
          listingId: `demo_${Date.now()}`,
          listingUrl: `https://www.ebay.com/itm/demo_${Date.now()}`,
          title: item.title,
          price: item.suggested_price || item.final_price,
          status: 'active',
          views: 0,
          watchers: 0
        };
        return mockListing;
      }
      
      throw error;
    }
  }

  /**
   * Parse fulfillment policies from eBay API response
   */
  private _parseFulfillmentPolicies(policies: any[]): EbayFulfillmentPolicy[] {
    try {
      return policies.map(policy => ({
        policyId: policy.fulfillmentPolicyId,
        policyName: policy.name || 'Unnamed Fulfillment Policy',
        policyType: 'FULFILLMENT' as const,
        description: policy.description,
        marketplaceId: policy.marketplaceId || 'EBAY_US',
        categoryTypes: policy.categoryTypes || [],
        freightShipping: policy.freightShipping,
        globalShipping: policy.globalShipping,
        handlingTime: policy.handlingTime,
        localPickup: policy.localPickup,
        pickupDropOff: policy.pickupDropOff,
        shipToLocations: policy.shipToLocations,
        shippingOptions: policy.shippingOptions
      }));
    } catch (error) {
      console.error('❌ [EBAY-API] Error parsing fulfillment policies:', error);
      return [];
    }
  }

  /**
   * Parse payment policies from eBay API response
   */
  private _parsePaymentPolicies(policies: any[]): EbayPaymentPolicy[] {
    try {
      return policies.map(policy => ({
        policyId: policy.paymentPolicyId,
        policyName: policy.name || 'Unnamed Payment Policy',
        policyType: 'PAYMENT' as const,
        description: policy.description,
        marketplaceId: policy.marketplaceId || 'EBAY_US',
        categoryTypes: policy.categoryTypes || [],
        immediatePayRequired: policy.immediatePayRequired,
        paymentInstructions: policy.paymentInstructions,
        paymentMethods: policy.paymentMethods
      }));
    } catch (error) {
      console.error('❌ [EBAY-API] Error parsing payment policies:', error);
      return [];
    }
  }

  /**
   * Parse return policies from eBay API response
   */
  private _parseReturnPolicies(policies: any[]): EbayReturnPolicy[] {
    try {
      return policies.map(policy => ({
        policyId: policy.returnPolicyId,
        policyName: policy.name || 'Unnamed Return Policy',
        policyType: 'RETURN' as const,
        description: policy.description,
        marketplaceId: policy.marketplaceId || 'EBAY_US',
        categoryTypes: policy.categoryTypes || [],
        extendedHolidayReturnsOffered: policy.extendedHolidayReturnsOffered,
        refundMethod: policy.refundMethod,
        restockingFeePercentage: policy.restockingFeePercentage,
        returnInstructions: policy.returnInstructions,
        returnMethod: policy.returnMethod,
        returnPeriod: policy.returnPeriod,
        returnShippingCostPayer: policy.returnShippingCostPayer,
        returnsAccepted: policy.returnsAccepted
      }));
    } catch (error) {
      console.error('❌ [EBAY-API] Error parsing return policies:', error);
      return [];
    }
  }

  /**
   * Get mock business policies for development
   */
  private _getMockBusinessPolicies(): EbayBusinessPolicies {
    return {
      fulfillmentPolicies: [{
        policyId: 'MOCK_FULFILLMENT_POLICY_ID',
        policyName: 'Default Shipping Policy',
        policyType: 'FULFILLMENT',
        description: 'Mock fulfillment policy for development',
        marketplaceId: 'EBAY_US',
        categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS', default: true }],
        freightShipping: false,
        globalShipping: true,
        handlingTime: { value: 1, unit: 'BUSINESS_DAY' },
        localPickup: false,
        pickupDropOff: false
      }],
      paymentPolicies: [{
        policyId: 'MOCK_PAYMENT_POLICY_ID',
        policyName: 'Default Payment Policy',
        policyType: 'PAYMENT',
        description: 'Mock payment policy for development',
        marketplaceId: 'EBAY_US',
        categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS', default: true }],
        immediatePayRequired: false,
        paymentInstructions: 'Payment through eBay checkout',
        paymentMethods: [
          { paymentMethodType: 'PAYPAL' },
          { paymentMethodType: 'CREDIT_CARD' }
        ]
      }],
      returnPolicies: [{
        policyId: 'MOCK_RETURN_POLICY_ID',
        policyName: 'Default Return Policy',
        policyType: 'RETURN',
        description: 'Mock return policy for development',
        marketplaceId: 'EBAY_US',
        categoryTypes: [{ name: 'ALL_EXCLUDING_MOTORS', default: true }],
        extendedHolidayReturnsOffered: false,
        refundMethod: 'MONEY_BACK',
        returnInstructions: 'Item must be returned in original condition',
        returnPeriod: { value: 30, unit: 'DAY' },
        returnShippingCostPayer: 'BUYER',
        returnsAccepted: true
      }]
    };
  }

  /**
   * Cache business policies in localStorage
   */
  private _cacheBusinessPolicies(policies: EbayBusinessPolicies): void {
    try {
      const cacheData = {
        policies,
        timestamp: Date.now(),
        environment: this.environment
      };
      localStorage.setItem('ebay_business_policies', JSON.stringify(cacheData));
      console.log('📦 [EBAY-API] Business policies cached successfully');
    } catch (error) {
      console.warn('⚠️ [EBAY-API] Failed to cache business policies:', error);
    }
  }

  /**
   * Get cached business policies
   */
  private _getCachedBusinessPolicies(): EbayBusinessPolicies | null {
    try {
      const cached = localStorage.getItem('ebay_business_policies');
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      
      // Check if cache is valid (not older than 1 hour and same environment)
      const isExpired = Date.now() - cacheData.timestamp > 3600000; // 1 hour
      const wrongEnvironment = cacheData.environment !== this.environment;
      
      if (isExpired || wrongEnvironment) {
        localStorage.removeItem('ebay_business_policies');
        console.log('🗑️ [EBAY-API] Cleared expired/invalid business policy cache');
        return null;
      }

      console.log('📦 [EBAY-API] Using cached business policies');
      return cacheData.policies;
    } catch (error) {
      console.warn('⚠️ [EBAY-API] Failed to get cached business policies:', error);
      localStorage.removeItem('ebay_business_policies');
      return null;
    }
  }

  /**
   * Extract default policy IDs from business policies
   */
  private _extractDefaultPolicyIds(policies: EbayBusinessPolicies): EbayBusinessPolicyIds {
    try {
      // Find default policies (first one or one marked as default)
      const fulfillmentPolicy = policies.fulfillmentPolicies.find(p => 
        p.categoryTypes?.some(ct => ct.default)
      ) || policies.fulfillmentPolicies[0];

      const paymentPolicy = policies.paymentPolicies.find(p => 
        p.categoryTypes?.some(ct => ct.default)
      ) || policies.paymentPolicies[0];

      const returnPolicy = policies.returnPolicies.find(p => 
        p.categoryTypes?.some(ct => ct.default)
      ) || policies.returnPolicies[0];

      const result: EbayBusinessPolicyIds = {
        fulfillmentPolicyId: fulfillmentPolicy?.policyId,
        paymentPolicyId: paymentPolicy?.policyId,
        returnPolicyId: returnPolicy?.policyId
      };

      console.log('🎯 [EBAY-API] Extracted default policy IDs:', result);
      return result;
    } catch (error) {
      console.error('❌ [EBAY-API] Error extracting policy IDs:', error);
      return {};
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

      // Handle 404/403 in development (Netlify functions not available)
      if (!response.ok && (response.status === 404 || response.status === 403) && isDev) {
        console.warn('⚠️ [EBAY-API] Development mode: eBay API calls blocked');
        // Return mock success for development to prevent app crashes
        return { 
          success: false, 
          error: 'Development mode - use "netlify dev" for eBay API',
          mockData: true 
        };
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
   * Public method to get access token (for use by other services)
   */
  async getAccessToken(): Promise<string> {
    return this._getAccessToken();
  }

  /**
   * Get OAuth access token for authenticated API calls
   */
  private async _getAccessToken(): Promise<string> {
    try {
      console.log('🔑 [EBAY-API] Getting OAuth access token...');
      console.log('🔑 [EBAY-API] Environment:', this.environment);
      console.log('🔑 [EBAY-API] Base URL:', this.baseUrl);
      
      // First try to get token from OAuth service which handles all storage formats
      try {
        const { default: ebayOAuth } = await import('./ebayOAuth');
        const serviceToken = await ebayOAuth.getValidAccessToken();
        if (serviceToken && serviceToken !== 'dev_mode_bypass_token') {
          console.log('✅ [EBAY-API] OAuth access token retrieved from service');
          return serviceToken;
        }
      } catch (serviceError) {
        console.warn('⚠️ [EBAY-API] OAuth service error:', serviceError);
      }
      
      // Fallback: Check for OAuth tokens from localStorage (stored by OAuth flow)
      const oauthTokens = localStorage.getItem('ebay_oauth_tokens');
      console.log('🔑 [EBAY-API] OAuth tokens in localStorage:', !!oauthTokens);
      
      if (oauthTokens) {
        try {
          const tokenData = JSON.parse(oauthTokens);
          console.log('🔑 [EBAY-API] Token data parsed:', {
            hasAccessToken: !!tokenData.access_token,
            expiresAt: tokenData.expires_at,
            currentTime: Date.now(),
            isExpired: tokenData.expires_at ? Date.now() >= tokenData.expires_at : false
          });
          
          if (tokenData.access_token) {
            // Check if token is expired
            const isExpired = tokenData.expires_at && Date.now() >= tokenData.expires_at;
            
            if (isExpired) {
              console.log('⚠️ [EBAY-API] OAuth token is expired, attempting refresh...');
              // Try to get a fresh token through the OAuth service
              try {
                const { default: ebayOAuth } = await import('./ebayOAuth');
                const freshToken = await ebayOAuth.getValidAccessToken();
                if (freshToken && freshToken !== 'dev_mode_bypass_token') {
                  console.log('✅ [EBAY-API] Successfully refreshed expired token');
                  return freshToken;
                }
              } catch (refreshError) {
                console.warn('⚠️ [EBAY-API] Token refresh failed, using expired token:', refreshError);
              }
            }
            
            console.log(isExpired ? 
              '⚠️ [EBAY-API] Using EXPIRED OAuth token (letting eBay validate)' : 
              '✅ [EBAY-API] Using VALID OAuth token from localStorage'
            );
            console.log('✅ [EBAY-API] Token preview:', tokenData.access_token.substring(0, 50) + '...');
            console.log('🚀 [EBAY-API] Making REAL eBay API CALL with OAuth token');
            return tokenData.access_token;
          }
        } catch (e) {
          console.warn('❌ [EBAY-API] Failed to parse OAuth tokens from localStorage:', e);
        }
      }
      
      // Check for manually entered token as fallback
      const manualToken = localStorage.getItem('ebay_manual_token');
      console.log('🔑 [EBAY-API] Manual token in localStorage:', !!manualToken);
      
      if (manualToken && manualToken !== 'dev_mode_bypass_token') {
        console.log('✅ [EBAY-API] Using manual token');
        console.log('✅ [EBAY-API] Manual token preview:', manualToken.substring(0, 50) + '...');
        return manualToken;
      }
      
      // Import OAuth service dynamically to avoid circular dependencies
      const { default: ebayOAuth } = await import('./ebayOAuth');
      const token = await ebayOAuth.getValidAccessToken();
      
      if (token && token !== 'dev_mode_bypass_token') {
        console.log('✅ [EBAY-API] OAuth access token retrieved from service');
        return token;
      }
      
      // Only use development mode if no real tokens are available
      if (!oauthTokens && !manualToken) {
        console.log('⚠️ [EBAY-API] No real tokens available, will create mock listing in dev mode');
        return 'dev_mode_bypass_token';
      }
      
      throw new Error('No valid eBay OAuth token available. Please authenticate first.');
    } catch (error) {
      console.error('❌ [EBAY-API] Error getting access token:', error);
      
      // Only fall back to dev mode if we absolutely have no tokens
      const hasAnyToken = localStorage.getItem('ebay_oauth_tokens') || localStorage.getItem('ebay_manual_token');
      console.log('🔑 [EBAY-API] Has any token:', !!hasAnyToken);
      console.log('🔑 [EBAY-API] Is DEV environment:', !!import.meta.env.DEV);
      
      if (import.meta.env.DEV && !hasAnyToken) {
        console.log('🔧 [EBAY-API] Development mode fallback: creating mock listing');
        return 'dev_mode_bypass_token';
      }
      
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

  /**
   * Build item specifics from AI analysis
   */
  private _buildItemSpecifics(item: any): Array<{name: string, value: string}> {
    const specifics: Array<{name: string, value: string}> = [];
    
    // Add basic specifics
    if (item.brand) {
      specifics.push({ name: 'Brand', value: item.brand });
    }
    
    if (item.size) {
      specifics.push({ name: 'Size', value: item.size });
    }
    
    if (item.color) {
      specifics.push({ name: 'Color', value: item.color });
    }
    
    if (item.model_number) {
      specifics.push({ name: 'Model', value: item.model_number });
    }

    // Add eBay-specific item specifics from AI analysis
    if (item.ai_analysis?.ebay_item_specifics) {
      Object.entries(item.ai_analysis.ebay_item_specifics).forEach(([key, value]) => {
        if (value && value !== 'unknown' && value !== 'Unknown') {
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          specifics.push({ name: formattedKey, value: String(value) });
        }
      });
    }

    console.log('📋 [EBAY-API] Built item specifics:', specifics.length);
    return specifics;
  }

  /**
   * Map internal condition to eBay condition codes
   */
  private _mapConditionToEbay(condition: string): string {
    const conditionMap: Record<string, string> = {
      'like_new': '1000', // New with tags
      'excellent': '1500', // New without tags
      'good': '3000', // Used
      'fair': '4000', // Good
      'poor': '5000'  // Acceptable
    };
    
    return conditionMap[condition] || '3000'; // Default to Used
  }

  /**
   * Build eBay listing XML for AddFixedPriceItem
   */
  private _buildListingXML(listingData: {
    title: string;
    description: string;
    categoryId: string;
    price: number;
    condition: string;
    images: string[];
    brand?: string;
    size?: string;
    color?: string;
    itemSpecifics: Array<{name: string, value: string}>;
    keywords: string[];
    businessPolicies?: {shipping?: string, payment?: string, return?: string};
  }): string {
    const { 
      title, description, categoryId, price, condition, images, 
      itemSpecifics, keywords, businessPolicies 
    } = listingData;

    // Build pictures XML
    const picturesXML = images.slice(0, 12).map(imageUrl => 
      `<PictureURL>${this._escapeXML(imageUrl)}</PictureURL>`
    ).join('');

    // Build item specifics XML
    const itemSpecificsXML = itemSpecifics.map(specific => `
      <NameValueList>
        <Name>${this._escapeXML(specific.name)}</Name>
        <Value>${this._escapeXML(specific.value)}</Value>
      </NameValueList>
    `).join('');

    // Enhanced description with keywords
    const enhancedDescription = this._buildEnhancedDescription(description, keywords);

    // Build business policies or fallback to legacy fields
    let businessPolicyXML = '';
    let legacyFieldsXML = '';

    if (businessPolicies && (businessPolicies.shipping || businessPolicies.payment || businessPolicies.return)) {
      console.log('🏢 [EBAY-API] Using Business Policies in XML');
      // Use Business Policies
      if (businessPolicies.shipping) {
        businessPolicyXML += `<ShippingProfileID>${businessPolicies.shipping}</ShippingProfileID>`;
      }
      if (businessPolicies.payment) {
        businessPolicyXML += `<PaymentProfileID>${businessPolicies.payment}</PaymentProfileID>`;
      }
      if (businessPolicies.return) {
        businessPolicyXML += `<ReturnProfileID>${businessPolicies.return}</ReturnProfileID>`;
      }
    } else {
      console.log('🏢 [EBAY-API] Using legacy fields in XML (no business policies found)');
      // Fallback to legacy fields if no business policies
      legacyFieldsXML = `
    <PaymentMethods>PayPal</PaymentMethods>
    <PaymentMethods>VisaMC</PaymentMethods>
    <PaymentMethods>AmEx</PaymentMethods>
    <PaymentMethods>Discover</PaymentMethods>
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>USPSMedia</ShippingService>
        <ShippingServiceCost>0.00</ShippingServiceCost>
      </ShippingServiceOptions>
    </ShippingDetails>
    <ReturnPolicy>
      <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
      <RefundOption>MoneyBack</RefundOption>
      <ReturnsWithinOption>Days_30</ReturnsWithinOption>
      <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
    </ReturnPolicy>`;
    }

    const xmlBody = `<?xml version="1.0" encoding="utf-8"?>
<AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <Item>
    <Title>${this._escapeXML(title)}</Title>
    <Description><![CDATA[${enhancedDescription}]]></Description>
    <PrimaryCategory>
      <CategoryID>${categoryId}</CategoryID>
    </PrimaryCategory>
    <StartPrice>${price}</StartPrice>
    <ConditionID>${condition}</ConditionID>
    <Currency>USD</Currency>
    <Country>US</Country>
    <Location>United States</Location>
    <Quantity>1</Quantity>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <PictureDetails>
      ${picturesXML}
    </PictureDetails>
    <ItemSpecifics>
      ${itemSpecificsXML}
    </ItemSpecifics>
    ${businessPolicyXML}
    ${legacyFieldsXML}
  </Item>
</AddFixedPriceItemRequest>`;

    console.log('📦 [EBAY-API] Built listing XML with', images.length, 'images,', itemSpecifics.length, 'specifics, and', businessPolicies ? 'Business Policies' : 'Legacy Fields');
    return xmlBody;
  }

  /**
   * Build enhanced HTML description with SEO optimization
   */
  private _buildEnhancedDescription(description: string, keywords: string[]): string {
    const keywordString = keywords.slice(0, 10).join(' ');
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">Item Description</h2>
        <p style="line-height: 1.6; color: #555;">${this._escapeHTML(description)}</p>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <h3 style="color: #333; margin-top: 0;">Why Choose This Item?</h3>
          <ul style="color: #555;">
            <li>✅ Authentic and genuine item</li>
            <li>✅ Fast and secure shipping</li>
            <li>✅ 30-day return policy</li>
            <li>✅ Professional seller with high ratings</li>
          </ul>
        </div>
        
        <div style="margin-top: 20px; font-size: 12px; color: #888;">
          <p>Keywords: ${this._escapeHTML(keywordString)}</p>
        </div>
      </div>
    `;
  }

  /**
   * Escape XML special characters
   */
  private _escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Escape HTML special characters  
   */
  private _escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Parse AddItem response from eBay Trading API
   */
  private _parseAddItemResponse(xmlResponse: string): { itemId?: string; error?: string } {
    try {
      console.log('📊 [EBAY-API] Parsing AddItem response...');
      
      // Simple XML parsing for item ID
      const itemIdMatch = xmlResponse.match(/<ItemID>(\d+)<\/ItemID>/);
      const errorMatch = xmlResponse.match(/<LongMessage>(.*?)<\/LongMessage>/);
      const ackMatch = xmlResponse.match(/<Ack>(.*?)<\/Ack>/);
      
      if (ackMatch && ackMatch[1] === 'Success' && itemIdMatch) {
        console.log('✅ [EBAY-API] Listing created successfully, Item ID:', itemIdMatch[1]);
        return { itemId: itemIdMatch[1] };
      }
      
      if (errorMatch) {
        console.error('❌ [EBAY-API] eBay API error:', errorMatch[1]);
        return { error: errorMatch[1] };
      }
      
      console.error('❌ [EBAY-API] Unknown response format');
      return { error: 'Unknown response format from eBay API' };
    } catch (error) {
      console.error('❌ [EBAY-API] Error parsing AddItem response:', error);
      return { error: `Response parsing failed: ${error.message}` };
    }
  }
}

export default EbayApiService;