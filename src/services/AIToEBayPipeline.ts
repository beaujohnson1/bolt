import { EBayListingService } from './EBayListingService';
import { EBayApiService } from './EBayApiService';
import { processImageWithAI } from './aiImageProcessor';
import { supabase } from '../lib/supabase';

/**
 * Complete AI to eBay listing pipeline
 * Orchestrates the flow from photo upload to live eBay listing
 */
export class AIToEBayPipeline {
  private listingService: EBayListingService;
  private apiService: EBayApiService;
  
  constructor() {
    this.apiService = new EBayApiService();
    this.listingService = new EBayListingService(this.apiService);
  }
  
  /**
   * Process images and create eBay listing
   */
  async processAndList(
    images: File[],
    userId: string,
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    const pipelineId = this.generatePipelineId();
    console.log(`[Pipeline ${pipelineId}] Starting AI to eBay pipeline`);
    
    try {
      // Step 1: Process images with AI
      console.log(`[Pipeline ${pipelineId}] Processing ${images.length} images with AI...`);
      const aiResults = await this.processImagesWithAI(images, pipelineId);
      
      // Step 2: Enhance and validate data
      console.log(`[Pipeline ${pipelineId}] Enhancing AI data...`);
      const enhancedData = await this.enhanceAIData(aiResults, options);
      
      // Step 3: Prepare images for eBay
      console.log(`[Pipeline ${pipelineId}] Preparing images for eBay...`);
      const processedImages = await this.prepareImagesForEBay(images);
      
      // Step 4: Create eBay listing
      console.log(`[Pipeline ${pipelineId}] Creating eBay listing...`);
      const listingData = {
        ...enhancedData,
        images: processedImages,
        quantity: options.quantity || 1
      };
      
      const listingResult = await this.listingService.createListing(
        listingData,
        userId
      );
      
      // Step 5: Store pipeline results
      await this.storePipelineResults(pipelineId, userId, {
        aiData: aiResults,
        listingResult,
        options
      });
      
      // Step 6: Track metrics
      await this.trackMetrics(pipelineId, {
        imagesProcessed: images.length,
        processingTime: Date.now() - parseInt(pipelineId),
        success: true
      });
      
      return {
        success: true,
        pipelineId,
        listingUrl: listingResult.listingUrl,
        itemId: listingResult.itemId,
        sku: listingResult.sku,
        aiData: enhancedData,
        processingTime: Date.now() - parseInt(pipelineId)
      };
      
    } catch (error: any) {
      console.error(`[Pipeline ${pipelineId}] Error:`, error);
      
      // Store error for debugging
      await this.storeError(pipelineId, userId, error);
      
      // Track failure metrics
      await this.trackMetrics(pipelineId, {
        imagesProcessed: images.length,
        processingTime: Date.now() - parseInt(pipelineId),
        success: false,
        error: error.message
      });
      
      throw new Error(`Pipeline failed: ${error.message}`);
    }
  }
  
  /**
   * Process images with AI for data extraction
   */
  private async processImagesWithAI(
    images: File[],
    pipelineId: string
  ): Promise<AIProcessedData> {
    // Convert files to base64 for AI processing
    const imageDataPromises = images.map(async (file) => {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return {
        name: file.name,
        base64,
        mimeType: file.type
      };
    });
    
    const imageData = await Promise.all(imageDataPromises);
    
    // Process with AI (using existing AI service)
    const aiResult = await processImageWithAI(imageData[0].base64);
    
    // Merge results from multiple images if needed
    if (images.length > 1) {
      // Process additional images for more details
      const additionalResults = await Promise.all(
        imageData.slice(1).map(img => 
          processImageWithAI(img.base64).catch(() => null)
        )
      );
      
      // Merge additional details
      additionalResults.forEach(result => {
        if (result && result.confidence > 0.7) {
          // Merge high-confidence details
          Object.entries(result.features || {}).forEach(([key, value]) => {
            if (value && !aiResult.features[key]) {
              aiResult.features[key] = value;
            }
          });
        }
      });
    }
    
    return {
      id: pipelineId,
      title: this.generateTitle(aiResult),
      brand: aiResult.brand || 'Unbranded',
      model: aiResult.model,
      category: aiResult.category,
      suggestedCategoryId: aiResult.ebayCategory,
      condition: this.mapCondition(aiResult.condition),
      conditionDescription: aiResult.conditionNotes,
      aiGeneratedDescription: this.generateDescription(aiResult),
      aiExtractedFeatures: {
        brand: aiResult.brand,
        color: aiResult.color,
        material: aiResult.material,
        size: aiResult.size,
        style: aiResult.style,
        pattern: aiResult.pattern,
        model: aiResult.model,
        customAspects: aiResult.itemSpecifics
      },
      suggestedPrice: aiResult.suggestedPrice || 29.99,
      confidence: aiResult.confidence
    };
  }
  
  /**
   * Enhance AI data with additional processing
   */
  private async enhanceAIData(
    aiData: AIProcessedData,
    options: PipelineOptions
  ): Promise<AIProcessedData> {
    // Apply user overrides
    if (options.titleOverride) {
      aiData.title = options.titleOverride;
    }
    
    if (options.priceOverride) {
      aiData.suggestedPrice = options.priceOverride;
    }
    
    if (options.conditionOverride) {
      aiData.condition = options.conditionOverride;
    }
    
    // Enhance title for SEO
    if (!options.titleOverride) {
      aiData.title = this.optimizeTitleForSEO(aiData.title, aiData.brand, aiData.model);
    }
    
    // Add trending keywords if available
    if (options.includeTrendingKeywords) {
      aiData.aiGeneratedDescription = await this.addTrendingKeywords(
        aiData.aiGeneratedDescription,
        aiData.category
      );
    }
    
    return aiData;
  }
  
  /**
   * Prepare images for eBay upload
   */
  private async prepareImagesForEBay(images: File[]): Promise<ProcessedImage[]> {
    const processedImages = await Promise.all(
      images.map(async (file) => {
        const buffer = await file.arrayBuffer();
        
        // TODO: Add image optimization here (resize, compress, etc.)
        
        return {
          buffer: Buffer.from(buffer),
          filename: file.name,
          mimeType: file.type
        };
      })
    );
    
    return processedImages;
  }
  
  /**
   * Generate optimized title from AI data
   */
  private generateTitle(aiData: any): string {
    const parts = [
      aiData.brand,
      aiData.model,
      aiData.productType,
      aiData.color,
      aiData.size,
      aiData.condition === 'NEW' ? 'New' : null
    ].filter(Boolean);
    
    let title = parts.join(' ').trim();
    
    // Ensure title doesn't exceed eBay's 80 character limit
    if (title.length > 80) {
      title = title.substring(0, 77) + '...';
    }
    
    return title || 'Item for Sale';
  }
  
  /**
   * Generate SEO-optimized description
   */
  private generateDescription(aiData: any): string {
    const sections = [];
    
    // Main description
    if (aiData.description) {
      sections.push(aiData.description);
    }
    
    // Features
    if (aiData.features && aiData.features.length > 0) {
      sections.push('\nKey Features:');
      aiData.features.forEach((feature: string) => {
        sections.push(`• ${feature}`);
      });
    }
    
    // Condition details
    if (aiData.conditionNotes) {
      sections.push(`\nCondition: ${aiData.conditionNotes}`);
    }
    
    // Measurements
    if (aiData.measurements) {
      sections.push('\nMeasurements:');
      Object.entries(aiData.measurements).forEach(([key, value]) => {
        sections.push(`• ${key}: ${value}`);
      });
    }
    
    return sections.join('\n');
  }
  
  /**
   * Map AI condition to eBay condition
   */
  private mapCondition(aiCondition: string): string {
    const conditionMap: Record<string, string> = {
      'new': 'NEW',
      'like new': 'LIKE_NEW',
      'excellent': 'VERY_GOOD',
      'very good': 'VERY_GOOD',
      'good': 'GOOD',
      'fair': 'ACCEPTABLE',
      'poor': 'FOR_PARTS'
    };
    
    return conditionMap[aiCondition?.toLowerCase()] || 'GOOD';
  }
  
  /**
   * Optimize title for SEO
   */
  private optimizeTitleForSEO(
    title: string,
    brand?: string,
    model?: string
  ): string {
    // Ensure brand and model are in title
    if (brand && !title.includes(brand)) {
      title = `${brand} ${title}`;
    }
    
    if (model && !title.includes(model)) {
      title = title.replace(brand || '', `${brand} ${model}`);
    }
    
    // Remove duplicate words
    const words = title.split(' ');
    const uniqueWords = [...new Set(words)];
    title = uniqueWords.join(' ');
    
    // Trim to 80 characters
    if (title.length > 80) {
      title = title.substring(0, 77) + '...';
    }
    
    return title;
  }
  
  /**
   * Add trending keywords to description
   */
  private async addTrendingKeywords(
    description: string,
    category?: string
  ): Promise<string> {
    // In production, fetch trending keywords from API
    const trendingKeywords = [
      'fast shipping',
      'authentic',
      'rare',
      'vintage',
      'limited edition'
    ];
    
    // Add relevant keywords that aren't already in description
    const keywordsToAdd = trendingKeywords.filter(
      keyword => !description.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 3);
    
    if (keywordsToAdd.length > 0) {
      description += `\n\nAdditional details: ${keywordsToAdd.join(', ')}.`;
    }
    
    return description;
  }
  
  /**
   * Store pipeline results
   */
  private async storePipelineResults(
    pipelineId: string,
    userId: string,
    results: any
  ): Promise<void> {
    await supabase.from('pipeline_results').insert({
      pipeline_id: pipelineId,
      user_id: userId,
      ai_data: results.aiData,
      listing_result: results.listingResult,
      options: results.options,
      created_at: new Date().toISOString()
    });
  }
  
  /**
   * Store error for debugging
   */
  private async storeError(
    pipelineId: string,
    userId: string,
    error: any
  ): Promise<void> {
    await supabase.from('pipeline_errors').insert({
      pipeline_id: pipelineId,
      user_id: userId,
      error_message: error.message,
      error_stack: error.stack,
      created_at: new Date().toISOString()
    });
  }
  
  /**
   * Track pipeline metrics
   */
  private async trackMetrics(pipelineId: string, metrics: any): Promise<void> {
    await supabase.from('pipeline_metrics').insert({
      pipeline_id: pipelineId,
      ...metrics,
      created_at: new Date().toISOString()
    });
  }
  
  /**
   * Generate unique pipeline ID
   */
  private generatePipelineId(): string {
    return Date.now().toString();
  }
}

// Type definitions
interface PipelineOptions {
  quantity?: number;
  titleOverride?: string;
  priceOverride?: number;
  conditionOverride?: string;
  includeTrendingKeywords?: boolean;
  enablePromotions?: boolean;
  shippingProfile?: string;
}

interface PipelineResult {
  success: boolean;
  pipelineId: string;
  listingUrl: string;
  itemId: string;
  sku: string;
  aiData: AIProcessedData;
  processingTime: number;
}

interface AIProcessedData {
  id: string;
  title: string;
  brand?: string;
  model?: string;
  category?: string;
  suggestedCategoryId?: string;
  condition: string;
  conditionDescription?: string;
  aiGeneratedDescription: string;
  aiExtractedFeatures: any;
  suggestedPrice: number;
  quantity?: number;
  images?: ProcessedImage[];
  confidence?: number;
}

interface ProcessedImage {
  buffer: Buffer;
  filename?: string;
  mimeType?: string;
}

export default AIToEBayPipeline;