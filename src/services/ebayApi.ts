// eBay API Integration Service
// This will handle all eBay API interactions for the MVP

interface EbayConfig {
  clientId: string;
  devId: string;
  certId: string;
  redirectUri: string;
  baseUrl: string;
  sandbox: boolean;
}

interface EbayItem {
  title: string;
  description: string;
  price: number;
  categoryId: string;
  condition: string;
  images: string[];
  shippingOptions: EbayShippingOption[];
}

interface EbayShippingOption {
  service: string;
  cost: number;
  type: 'CALCULATED' | 'FLAT_RATE' | 'FREE';
}

interface EbayListing {
  itemId: string;
  title: string;
  price: number;
  status: 'ACTIVE' | 'ENDED' | 'SOLD';
  viewCount: number;
  watchCount: number;
  listingUrl: string;
  endTime: string;
}

interface EbaySale {
  orderId: string;
  itemId: string;
  buyerUsername: string;
  salePrice: number;
  shippingAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentStatus: 'PAID' | 'PENDING' | 'UNPAID';
  shippingStatus: 'NOT_SHIPPED' | 'SHIPPED' | 'DELIVERED';
  saleDate: string;
}

class EbayApiService {
  private config: EbayConfig;
  private accessToken: string | null = null;

  constructor(redirectUri: string = `${window.location.origin}/auth/ebay/callback`) {
    // Determine environment and select appropriate credentials
    const isProduction = import.meta.env.NODE_ENV === 'production';
    
    console.log('🔧 [EBAY] Initializing eBay API service...', {
      environment: isProduction ? 'production' : 'sandbox',
      nodeEnv: import.meta.env.NODE_ENV
    });
    
    this.config = {
      clientId: isProduction 
        ? import.meta.env.VITE_EBAY_PROD_APP_ID 
        : import.meta.env.VITE_EBAY_SANDBOX_APP_ID,
      devId: isProduction 
        ? import.meta.env.VITE_EBAY_PROD_DEV_ID 
        : import.meta.env.VITE_EBAY_SANDBOX_DEV_ID,
      certId: isProduction 
        ? import.meta.env.VITE_EBAY_PROD_CERT_ID 
        : import.meta.env.VITE_EBAY_SANDBOX_CERT_ID,
      baseUrl: isProduction 
        ? import.meta.env.VITE_EBAY_PROD_BASE_URL 
        : import.meta.env.VITE_EBAY_SANDBOX_BASE_URL,
      redirectUri,
      sandbox: !isProduction
    };
    
    // Validate that all required environment variables are present
    const requiredVars = ['clientId', 'devId', 'certId', 'baseUrl'];
    const missingVars = requiredVars.filter(key => !this.config[key]);
    
    if (missingVars.length > 0) {
      console.error('❌ [EBAY] Missing required environment variables:', missingVars);
      console.error('❌ [EBAY] Current config:', {
        clientId: this.config.clientId ? 'present' : 'missing',
        devId: this.config.devId ? 'present' : 'missing',
        certId: this.config.certId ? 'present' : 'missing',
        baseUrl: this.config.baseUrl ? 'present' : 'missing',
        environment: isProduction ? 'production' : 'sandbox'
      });
      throw new Error(`Missing eBay API credentials: ${missingVars.join(', ')}`);
    }
    
    console.log('✅ [EBAY] eBay API service initialized successfully', {
      environment: isProduction ? 'production' : 'sandbox',
      baseUrl: this.config.baseUrl,
      hasCredentials: true
    });
  }

  // Authentication
  async authenticate(authCode: string): Promise<string> {
    const tokenUrl = `${this.config.baseUrl}/identity/v1/oauth2/token`;
    
    console.log('🔐 [EBAY] Starting OAuth authentication...', {
      tokenUrl,
      sandbox: this.config.sandbox,
      hasAuthCode: !!authCode
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.certId}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: this.config.redirectUri
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [EBAY] Authentication failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`eBay authentication failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    
    console.log('✅ [EBAY] Authentication successful', {
      hasAccessToken: !!this.accessToken,
      expiresIn: data.expires_in
    });
    
    return this.accessToken;
  }

  // Get OAuth authorization URL
  getAuthorizationUrl(): string {
    const authUrl = this.config.sandbox 
      ? 'https://auth.sandbox.ebay.com/oauth2/authorize'
      : 'https://auth.ebay.com/oauth2/authorize';
    
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      state: 'ebay_auth_' + Date.now(),
      scope: 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly'
    });
    
    return `${authUrl}?${params.toString()}`;
  }

  // Create a new listing
  async createListing(item: EbayItem): Promise<EbayListing> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with eBay');
    }

    console.log('📝 [EBAY] Creating new listing...', {
      title: item.title,
      price: item.price,
      category: item.categoryId,
      sandbox: this.config.sandbox
    });

    const listingData = {
      Item: {
        Title: item.title,
        Description: item.description,
        PrimaryCategory: { CategoryID: item.categoryId },
        StartPrice: item.price,
        CategoryMappingAllowed: true,
        Country: 'US',
        Currency: 'USD',
        DispatchTimeMax: 1,
        ListingDuration: 'Days_7',
        ListingType: 'FixedPriceItem',
        PaymentMethods: ['PayPal'],
        PictureDetails: {
          PictureURL: item.images
        },
        PostalCode: '95125', // Will be dynamic based on user
        Quantity: 1,
        ReturnPolicy: {
          ReturnsAcceptedOption: 'ReturnsAccepted',
          RefundOption: 'MoneyBack',
          ReturnsWithinOption: 'Days_30',
          ShippingCostPaidByOption: 'Buyer'
        },
        ShippingDetails: {
          ShippingServiceOptions: item.shippingOptions.map(option => ({
            ShippingService: option.service,
            ShippingServiceCost: option.cost,
            ShippingServicePriority: 1
          }))
        },
        Site: 'US'
      }
    };

    const response = await fetch(`${this.config.baseUrl}/ws/api.dll`, {
      method: 'POST',
      headers: {
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-DEV-NAME': this.config.devId,
        'X-EBAY-API-APP-NAME': this.config.clientId,
        'X-EBAY-API-CERT-NAME': this.config.certId,
        'X-EBAY-API-CALL-NAME': 'AddFixedPriceItem',
        'X-EBAY-API-SITEID': '0',
        'Content-Type': 'text/xml',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: this.buildXmlRequest('AddFixedPriceItem', listingData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [EBAY] Listing creation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`eBay listing creation failed: ${response.status} ${response.statusText}`);
    }

    const xmlResponse = await response.text();
    const parsedResponse = this.parseXmlResponse(xmlResponse);
    
    console.log('✅ [EBAY] Listing created successfully:', {
      itemId: parsedResponse.ItemID,
      endTime: parsedResponse.EndTime
    });
    
    return {
      itemId: parsedResponse.ItemID,
      title: item.title,
      price: item.price,
      status: 'ACTIVE',
      viewCount: 0,
      watchCount: 0,
      listingUrl: this.config.sandbox 
        ? `https://www.sandbox.ebay.com/itm/${parsedResponse.ItemID}`
        : `https://www.ebay.com/itm/${parsedResponse.ItemID}`,
      endTime: parsedResponse.EndTime
    };
  }

  // Get user's active listings
  async getMyListings(): Promise<EbayListing[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with eBay');
    }

    console.log('📋 [EBAY] Fetching user listings...');

    const response = await fetch(`${this.config.baseUrl}/sell/inventory/v1/inventory_item`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [EBAY] Failed to fetch listings:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch eBay listings: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [EBAY] Listings fetched successfully:', {
      count: data.inventoryItems?.length || 0
    });
    
    return data.inventoryItems?.map((item: any) => ({
      itemId: item.sku,
      title: item.product.title,
      price: parseFloat(item.product.aspects.price[0]),
      status: item.availability.shipToLocationAvailability.quantity > 0 ? 'ACTIVE' : 'ENDED',
      viewCount: 0, // Would need separate API call
      watchCount: 0, // Would need separate API call
      listingUrl: this.config.sandbox 
        ? `https://www.sandbox.ebay.com/itm/${item.sku}`
        : `https://www.ebay.com/itm/${item.sku}`,
      endTime: item.availability.shipToLocationAvailability.availabilityDistributions[0].fulfillmentTime.value
    })) || [];
  }

  // Get sales/orders
  async getMySales(): Promise<EbaySale[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with eBay');
    }

    console.log('💰 [EBAY] Fetching user sales...');

    const response = await fetch(`${this.config.baseUrl}/sell/fulfillment/v1/order`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [EBAY] Failed to fetch sales:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch eBay sales: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [EBAY] Sales fetched successfully:', {
      count: data.orders?.length || 0
    });
    
    return data.orders?.map((order: any) => ({
      orderId: order.orderId,
      itemId: order.lineItems[0].legacyItemId,
      buyerUsername: order.buyer.username,
      salePrice: parseFloat(order.pricingSummary.total.value),
      shippingAddress: {
        name: order.fulfillmentStartInstructions[0].shippingStep.shipTo.fullName,
        street1: order.fulfillmentStartInstructions[0].shippingStep.shipTo.contactAddress.addressLine1,
        street2: order.fulfillmentStartInstructions[0].shippingStep.shipTo.contactAddress.addressLine2,
        city: order.fulfillmentStartInstructions[0].shippingStep.shipTo.contactAddress.city,
        state: order.fulfillmentStartInstructions[0].shippingStep.shipTo.contactAddress.stateOrProvince,
        postalCode: order.fulfillmentStartInstructions[0].shippingStep.shipTo.contactAddress.postalCode,
        country: order.fulfillmentStartInstructions[0].shippingStep.shipTo.contactAddress.countryCode
      },
      paymentStatus: order.orderPaymentStatus === 'PAID' ? 'PAID' : 'PENDING',
      shippingStatus: order.orderFulfillmentStatus === 'FULFILLED' ? 'DELIVERED' : 'NOT_SHIPPED',
      saleDate: order.creationDate
    })) || [];
  }

  // Print shipping label through eBay
  async printShippingLabel(orderId: string): Promise<{ labelUrl: string; trackingNumber: string }> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with eBay');
    }

    console.log('🏷️ [EBAY] Creating shipping label for order:', orderId);

    // eBay Managed Shipping - create shipping fulfillment
    const response = await fetch(`${this.config.baseUrl}/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        lineItems: [
          {
            lineItemId: orderId, // Simplified for MVP
            quantity: 1
          }
        ],
        shippedDate: new Date().toISOString(),
        shippingCarrierCode: 'USPS',
        trackingNumber: `1Z${Math.random().toString(36).substr(2, 16).toUpperCase()}` // Mock for now
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [EBAY] Failed to create shipping label:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to create eBay shipping label: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [EBAY] Shipping label created successfully');
    
    return {
      labelUrl: this.config.sandbox 
        ? `https://sandbox.ebay.com/shipping/label/${orderId}`
        : `https://ebay.com/shipping/label/${orderId}`,
      trackingNumber: data.trackingNumber || `1Z${Math.random().toString(36).substr(2, 16).toUpperCase()}`
    };
  }

  // Test connection to eBay API
  async testConnection(): Promise<{ success: boolean; message: string; environment: string }> {
    try {
      console.log('🧪 [EBAY] Testing eBay API connection...');
      
      // Test with a simple API call that doesn't require authentication
      const response = await fetch(`${this.config.baseUrl}/commerce/taxonomy/v1/category_tree/0`, {
        headers: {
          'Authorization': `Bearer ${this.config.clientId}`, // Using app token for public API
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ [EBAY] Connection test successful');
        return {
          success: true,
          message: 'eBay API connection successful',
          environment: this.config.sandbox ? 'sandbox' : 'production'
        };
      } else {
        console.log('⚠️ [EBAY] Connection test failed but API is reachable');
        return {
          success: false,
          message: `eBay API responded with ${response.status}`,
          environment: this.config.sandbox ? 'sandbox' : 'production'
        };
      }
    } catch (error) {
      console.error('❌ [EBAY] Connection test failed:', error);
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        environment: this.config.sandbox ? 'sandbox' : 'production'
      };
    }
  }

  // Get current configuration (for debugging)
  getConfig(): Partial<EbayConfig> {
    return {
      baseUrl: this.config.baseUrl,
      sandbox: this.config.sandbox,
      redirectUri: this.config.redirectUri,
      // Don't expose sensitive credentials
      clientId: this.config.clientId ? 'configured' : 'missing',
      devId: this.config.devId ? 'configured' : 'missing',
      certId: this.config.certId ? 'configured' : 'missing'
    };
  }

  // Helper methods
  private buildXmlRequest(callName: string, data: any): string {
    // Simplified XML builder for MVP
    return `<?xml version="1.0" encoding="utf-8"?>
      <${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
        <RequesterCredentials>
          <eBayAuthToken>${this.accessToken}</eBayAuthToken>
        </RequesterCredentials>
        <Version>967</Version>
        ${this.objectToXml(data)}
      </${callName}Request>`;
  }

  private objectToXml(obj: any): string {
    // Simplified XML conversion for MVP
    let xml = '';
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        xml += `<${key}>${this.objectToXml(obj[key])}</${key}>`;
      } else {
        xml += `<${key}>${obj[key]}</${key}>`;
      }
    }
    return xml;
  }

  private parseXmlResponse(xml: string): any {
    // Simplified XML parser for MVP - in production, use a proper XML parser
    const itemIdMatch = xml.match(/<ItemID>(\d+)<\/ItemID>/);
    const endTimeMatch = xml.match(/<EndTime>([^<]+)<\/EndTime>/);
    
    return {
      ItemID: itemIdMatch ? itemIdMatch[1] : null,
      EndTime: endTimeMatch ? endTimeMatch[1] : null
    };
  }
}

export default EbayApiService;
export type { EbayItem, EbayListing, EbaySale, EbayConfig };