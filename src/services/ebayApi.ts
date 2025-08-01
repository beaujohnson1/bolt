// eBay API Integration Service
// This will handle all eBay API interactions for the MVP

interface EbayConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
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

  constructor(config: EbayConfig) {
    this.config = config;
  }

  // Authentication
  async authenticate(authCode: string): Promise<string> {
    const tokenUrl = this.config.sandbox 
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token';

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: this.config.redirectUri
      })
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  // Create a new listing
  async createListing(item: EbayItem): Promise<EbayListing> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with eBay');
    }

    const baseUrl = this.config.sandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';

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

    const response = await fetch(`${baseUrl}/ws/api.dll`, {
      method: 'POST',
      headers: {
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-DEV-NAME': this.config.clientId,
        'X-EBAY-API-APP-NAME': this.config.clientId,
        'X-EBAY-API-CERT-NAME': this.config.clientSecret,
        'X-EBAY-API-CALL-NAME': 'AddFixedPriceItem',
        'X-EBAY-API-SITEID': '0',
        'Content-Type': 'text/xml',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: this.buildXmlRequest('AddFixedPriceItem', listingData)
    });

    const xmlResponse = await response.text();
    const parsedResponse = this.parseXmlResponse(xmlResponse);
    
    return {
      itemId: parsedResponse.ItemID,
      title: item.title,
      price: item.price,
      status: 'ACTIVE',
      viewCount: 0,
      watchCount: 0,
      listingUrl: `https://www.ebay.com/itm/${parsedResponse.ItemID}`,
      endTime: parsedResponse.EndTime
    };
  }

  // Get user's active listings
  async getMyListings(): Promise<EbayListing[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with eBay');
    }

    const baseUrl = this.config.sandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';

    const response = await fetch(`${baseUrl}/sell/inventory/v1/inventory_item`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    return data.inventoryItems?.map((item: any) => ({
      itemId: item.sku,
      title: item.product.title,
      price: parseFloat(item.product.aspects.price[0]),
      status: item.availability.shipToLocationAvailability.quantity > 0 ? 'ACTIVE' : 'ENDED',
      viewCount: 0, // Would need separate API call
      watchCount: 0, // Would need separate API call
      listingUrl: `https://www.ebay.com/itm/${item.sku}`,
      endTime: item.availability.shipToLocationAvailability.availabilityDistributions[0].fulfillmentTime.value
    })) || [];
  }

  // Get sales/orders
  async getMySales(): Promise<EbaySale[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with eBay');
    }

    const baseUrl = this.config.sandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';

    const response = await fetch(`${baseUrl}/sell/fulfillment/v1/order`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
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

    const baseUrl = this.config.sandbox 
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';

    // eBay Managed Shipping - create shipping fulfillment
    const response = await fetch(`${baseUrl}/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment`, {
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

    const data = await response.json();
    
    return {
      labelUrl: `https://ebay.com/shipping/label/${orderId}`, // Mock URL
      trackingNumber: data.trackingNumber || `1Z${Math.random().toString(36).substr(2, 16).toUpperCase()}`
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