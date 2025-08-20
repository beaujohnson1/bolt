import eBayApi from 'ebay-api';
import { EBayApiService } from './EBayApiService';
import { EBayTokenService } from './EBayTokenService';

/**
 * Complete eBay listing service using hendt/ebay-api
 * Handles the full workflow from AI-processed photos to live eBay listings
 */
export class EBayListingService {
  private ebayApi: eBayApi;
  private tokenService: EBayTokenService;
  
  constructor(private apiService: EBayApiService) {
    this.ebayApi = apiService.getApi();
    this.tokenService = new EBayTokenService();
  }
  
  /**
   * Create a complete eBay listing from AI-processed product data
   */
  async createListing(
    productData: AIProcessedProduct,
    userId: string
  ): Promise<ListingResult> {
    try {
      // Get user tokens and set credentials
      const tokens = await this.tokenService.getTokens(userId);
      if (!tokens) {
        throw new Error('User not authenticated with eBay');
      }
      
      await this.apiService.setUserCredentials(tokens, userId);
      
      // Step 1: Upload images to eBay Picture Service
      console.log('Uploading images to eBay...');
      const imageUrls = await this.uploadImages(productData.images);
      
      // Step 2: Create inventory item with SKU
      const sku = this.generateSKU(productData);
      console.log(`Creating inventory item with SKU: ${sku}`);
      
      await this.ebayApi.sell.inventory.createOrReplaceInventoryItem(sku, {
        availability: {
          shipToLocationAvailability: {
            quantity: productData.quantity || 1
          }
        },
        condition: this.mapCondition(productData.condition),
        product: {
          title: this.optimizeTitle(productData.title),
          description: this.enhanceDescription(productData.aiGeneratedDescription),
          aspects: this.mapAspects(productData.aiExtractedFeatures),
          imageUrls: imageUrls,
          upc: productData.barcode,
          brand: productData.brand
        },
        packageWeightAndSize: this.getPackageDetails(productData)
      });
      
      // Step 3: Create offer for the inventory item
      console.log('Creating offer...');
      const offer = await this.ebayApi.sell.inventory.createOffer({
        sku: sku,
        marketplaceId: 'EBAY_US',
        format: 'FIXED_PRICE',
        availableQuantity: productData.quantity || 1,
        categoryId: productData.suggestedCategoryId || await this.findBestCategory(productData),
        listingDescription: this.createListingDescription(productData),
        listingPolicies: await this.getListingPolicies(userId),
        pricingSummary: {
          price: {
            value: productData.suggestedPrice.toString(),
            currency: 'USD'
          }
        },
        merchantLocationKey: await this.getMerchantLocation(userId)
      });
      
      // Step 4: Publish the offer to create a live listing
      console.log('Publishing to eBay...');
      const publishResult = await this.ebayApi.sell.inventory.publishOffer(
        offer.offerId
      );
      
      // Step 5: Store listing details for tracking
      await this.storeListingDetails(userId, {
        itemId: publishResult.listingId,
        offerId: offer.offerId,
        sku: sku,
        title: productData.title,
        price: productData.suggestedPrice,
        status: 'active'
      });
      
      return {
        success: true,
        itemId: publishResult.listingId,
        offerId: offer.offerId,
        sku: sku,
        listingUrl: `https://www.ebay.com/itm/${publishResult.listingId}`,
        warnings: publishResult.warnings || []
      };
      
    } catch (error) {
      console.error('Listing creation error:', error);
      throw new Error(`Failed to create eBay listing: ${error.message}`);
    }
  }
  
  /**
   * Upload images to eBay Picture Service
   */
  private async uploadImages(images: ProcessedImage[]): Promise<string[]> {
    const uploadPromises = images.map(async (image, index) => {
      try {
        const response = await this.ebayApi.trading.UploadSiteHostedPictures({
          ExtensionInDays: 30,
          PictureName: `Image_${index + 1}`,
          PictureSet: 'Supersize'
        }, {
          hook: (xml: string) => {
            const FormData = require('form-data');
            const form = new FormData();
            form.append('XML Payload', xml, 'payload.xml');
            form.append('dummy', image.buffer, {
              filename: image.filename || `image_${index + 1}.jpg`,
              contentType: image.mimeType || 'image/jpeg'
            });
            
            return {
              body: form,
              headers: form.getHeaders()
            };
          }
        });
        
        return response.SiteHostedPictureDetails.FullURL;
      } catch (error) {
        console.error(`Failed to upload image ${index + 1}:`, error);
        throw error;
      }
    });
    
    return Promise.all(uploadPromises);
  }
  
  /**
   * Map AI-extracted features to eBay aspects
   */
  private mapAspects(features: AIExtractedFeatures): Record<string, string[]> {
    const aspects: Record<string, string[]> = {};
    
    // Standard aspects
    if (features.brand) aspects['Brand'] = [features.brand];
    if (features.color) aspects['Color'] = [features.color];
    if (features.material) aspects['Material'] = [features.material];
    if (features.size) aspects['Size'] = [features.size];
    if (features.style) aspects['Style'] = [features.style];
    if (features.pattern) aspects['Pattern'] = [features.pattern];
    
    // Clothing-specific
    if (features.sleeveLength) aspects['Sleeve Length'] = [features.sleeveLength];
    if (features.neckline) aspects['Neckline'] = [features.neckline];
    if (features.fit) aspects['Fit'] = [features.fit];
    
    // Electronics-specific
    if (features.model) aspects['Model'] = [features.model];
    if (features.storage) aspects['Storage Capacity'] = [features.storage];
    if (features.connectivity) aspects['Connectivity'] = features.connectivity;
    
    // Add custom aspects from AI analysis
    Object.entries(features.customAspects || {}).forEach(([key, value]) => {
      if (value && !aspects[key]) {
        aspects[key] = Array.isArray(value) ? value : [value];
      }
    });
    
    return aspects;
  }
  
  /**
   * Optimize title for eBay search (80 character limit)
   */
  private optimizeTitle(title: string): string {
    // Remove common filler words if title is too long
    if (title.length > 80) {
      title = title
        .replace(/\b(the|a|an|and|or|but|in|on|at|to|for)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Truncate if still too long
    if (title.length > 80) {
      title = title.substring(0, 77) + '...';
    }
    
    return title;
  }
  
  /**
   * Map condition strings to eBay condition IDs
   */
  private mapCondition(condition: string): string {
    const conditionMap: Record<string, string> = {
      'NEW': '1000',
      'NEW_WITH_TAGS': '1000',
      'NEW_WITHOUT_TAGS': '1500',
      'LIKE_NEW': '2000',
      'VERY_GOOD': '3000',
      'GOOD': '4000',
      'ACCEPTABLE': '5000',
      'FOR_PARTS': '7000'
    };
    
    return conditionMap[condition] || '3000'; // Default to VERY_GOOD
  }
  
  /**
   * Generate SKU for inventory tracking
   */
  private generateSKU(productData: AIProcessedProduct): string {
    const timestamp = Date.now().toString(36);
    const brandCode = (productData.brand || 'XX').substring(0, 2).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    return `${brandCode}-${timestamp}-${random}`;
  }
  
  /**
   * Get user's listing policies
   */
  private async getListingPolicies(userId: string): Promise<any> {
    // In production, fetch from user settings or eBay account
    return {
      fulfillmentPolicyId: process.env.EBAY_FULFILLMENT_POLICY_ID,
      paymentPolicyId: process.env.EBAY_PAYMENT_POLICY_ID,
      returnPolicyId: process.env.EBAY_RETURN_POLICY_ID
    };
  }
  
  /**
   * Get merchant location for the user
   */
  private async getMerchantLocation(userId: string): Promise<string> {
    // In production, fetch from user settings
    return 'default_location';
  }
  
  /**
   * Find best category using eBay's taxonomy
   */
  private async findBestCategory(productData: AIProcessedProduct): Promise<string> {
    try {
      const response = await this.ebayApi.commerce.taxonomy.getCategorySuggestions({
        q: `${productData.title} ${productData.brand || ''} ${productData.category || ''}`
      });
      
      if (response.categorySuggestions?.length > 0) {
        return response.categorySuggestions[0].category.categoryId;
      }
    } catch (error) {
      console.error('Category lookup failed:', error);
    }
    
    // Fallback to general category
    return '15032'; // General clothing category
  }
  
  /**
   * Store listing details in database
   */
  private async storeListingDetails(userId: string, details: any): Promise<void> {
    const { supabase } = await import('../lib/supabase');
    
    await supabase.from('ebay_listings').insert({
      user_id: userId,
      item_id: details.itemId,
      offer_id: details.offerId,
      sku: details.sku,
      title: details.title,
      price: details.price,
      status: details.status,
      created_at: new Date().toISOString()
    });
  }
  
  /**
   * Create enhanced listing description
   */
  private createListingDescription(productData: AIProcessedProduct): string {
    return `
      <div style="font-family: Arial, sans-serif;">
        <h2>${productData.title}</h2>
        
        ${productData.aiGeneratedDescription}
        
        <h3>Condition</h3>
        <p>${productData.conditionDescription || 'Please see photos for condition details.'}</p>
        
        <h3>Features</h3>
        <ul>
          ${Object.entries(productData.aiExtractedFeatures)
            .filter(([_, value]) => value)
            .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
            .join('')}
        </ul>
        
        <p><em>Listed with EasyFlip.ai - Professional AI-Powered Listings</em></p>
      </div>
    `;
  }
  
  /**
   * Enhance AI-generated description with SEO keywords
   */
  private enhanceDescription(description: string): string {
    // Add common search terms and trust signals
    const enhancements = [
      'Fast shipping',
      'Carefully packaged',
      'Smoke-free home',
      'Check our other listings'
    ];
    
    return `${description}\n\n${enhancements.join('. ')}.`;
  }
  
  /**
   * Get package details for shipping calculations
   */
  private getPackageDetails(productData: AIProcessedProduct): any {
    return {
      weight: {
        value: productData.weight || 1,
        unit: 'POUND'
      },
      dimensions: productData.dimensions ? {
        length: productData.dimensions.length || 10,
        width: productData.dimensions.width || 8,
        height: productData.dimensions.height || 4,
        unit: 'INCH'
      } : undefined
    };
  }
}

// Type definitions
interface AIProcessedProduct {
  id: string;
  title: string;
  brand?: string;
  model?: string;
  category?: string;
  suggestedCategoryId?: string;
  condition: string;
  conditionDescription?: string;
  aiGeneratedDescription: string;
  aiExtractedFeatures: AIExtractedFeatures;
  suggestedPrice: number;
  quantity?: number;
  images: ProcessedImage[];
  barcode?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

interface AIExtractedFeatures {
  brand?: string;
  color?: string;
  material?: string;
  size?: string;
  style?: string;
  pattern?: string;
  sleeveLength?: string;
  neckline?: string;
  fit?: string;
  model?: string;
  storage?: string;
  connectivity?: string[];
  customAspects?: Record<string, any>;
}

interface ProcessedImage {
  buffer: Buffer;
  filename?: string;
  mimeType?: string;
}

interface ListingResult {
  success: boolean;
  itemId: string;
  offerId: string;
  sku: string;
  listingUrl: string;
  warnings?: any[];
}

export default EBayListingService;