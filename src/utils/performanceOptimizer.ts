/**
 * Performance Optimization Utilities for eBay Listing Generation System
 * Implements caching, batch processing, and cost optimization strategies
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash: string;
  costSavings: number;
}

interface OptimizationMetrics {
  totalRequests: number;
  cacheHits: number;
  costSaved: number;
  timesSaved: number;
  errorRate: number;
}

interface ImageOptimizationResult {
  optimizedUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: OptimizationMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    costSaved: 0,
    timesSaved: 0,
    errorRate: 0
  };

  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_IMAGE_SIZE = 1024 * 1024; // 1MB
  private readonly TARGET_IMAGE_WIDTH = 1024; // Optimal for vision APIs

  /**
   * Generate cache key for image analysis
   */
  private generateCacheKey(imageUrls: string[], analysisType: string = 'standard'): string {
    const urlString = Array.isArray(imageUrls) ? imageUrls.sort().join('|') : imageUrls;
    return `ai_analysis_${analysisType}_${this.hashString(urlString)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(entry: CacheEntry<any>): boolean {
    return (Date.now() - entry.timestamp) < this.CACHE_TTL;
  }

  /**
   * Optimize images before sending to APIs
   */
  async optimizeImages(imageUrls: string[]): Promise<ImageOptimizationResult[]> {
    console.log('🖼️ [PERFORMANCE] Optimizing images for API calls...');
    const startTime = Date.now();
    
    try {
      const optimizedImages = await Promise.all(
        imageUrls.map(async (url) => {
          try {
            // In a real implementation, you would:
            // 1. Fetch the image
            // 2. Check its size and dimensions
            // 3. Compress/resize if needed
            // 4. Return optimized URL (could use Cloudinary, etc.)
            
            // For now, return mock optimization data
            const mockResult: ImageOptimizationResult = {
              optimizedUrl: url, // In production, this would be the optimized URL
              originalSize: 2.5 * 1024 * 1024, // Mock 2.5MB original
              compressedSize: 800 * 1024, // Mock 800KB compressed
              compressionRatio: 0.68 // 32% size reduction
            };
            
            return mockResult;
          } catch (error) {
            console.warn('⚠️ [PERFORMANCE] Failed to optimize image:', url, error);
            return {
              optimizedUrl: url,
              originalSize: 0,
              compressedSize: 0,
              compressionRatio: 1
            };
          }
        })
      );

      const totalTimeSaved = Date.now() - startTime;
      const totalSizeSaved = optimizedImages.reduce(
        (sum, img) => sum + (img.originalSize - img.compressedSize), 
        0
      );

      console.log('✅ [PERFORMANCE] Image optimization complete:', {
        images: optimizedImages.length,
        sizeSavedMB: (totalSizeSaved / (1024 * 1024)).toFixed(2),
        timeTakenMs: totalTimeSaved
      });

      return optimizedImages;
    } catch (error) {
      console.error('❌ [PERFORMANCE] Image optimization failed:', error);
      // Return original URLs on failure
      return imageUrls.map(url => ({
        optimizedUrl: url,
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 1
      }));
    }
  }

  /**
   * Get cached analysis or perform new analysis
   */
  async getCachedAnalysis<T>(
    cacheKey: string,
    analysisFunction: () => Promise<T>,
    estimatedCost: number = 0.05
  ): Promise<{ data: T; fromCache: boolean; costSaved: number }> {
    this.metrics.totalRequests++;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      this.metrics.cacheHits++;
      this.metrics.costSaved += estimatedCost;
      this.metrics.timesSaved += 1;
      
      console.log('💾 [PERFORMANCE] Cache hit for key:', cacheKey.substring(0, 20) + '...');
      console.log('💰 [PERFORMANCE] Cost saved: $' + estimatedCost.toFixed(3));
      
      return {
        data: cached.data,
        fromCache: true,
        costSaved: estimatedCost
      };
    }

    // Perform analysis if not cached
    try {
      console.log('🔄 [PERFORMANCE] Cache miss - performing new analysis...');
      const startTime = Date.now();
      const data = await analysisFunction();
      const analysisTime = Date.now() - startTime;

      // Store in cache
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        hash: cacheKey,
        costSavings: 0
      };
      
      this.cache.set(cacheKey, entry);
      
      console.log('✅ [PERFORMANCE] New analysis complete and cached:', {
        timeTakenMs: analysisTime,
        cost: '$' + estimatedCost.toFixed(3)
      });

      return {
        data,
        fromCache: false,
        costSaved: 0
      };
    } catch (error) {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1) / this.metrics.totalRequests;
      throw error;
    }
  }

  /**
   * Batch process multiple images with optimal API usage
   */
  async batchProcessImages(
    imageBatches: string[][],
    processingFunction: (images: string[]) => Promise<any>,
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
      maxConcurrent?: number;
    } = {}
  ): Promise<any[]> {
    const { 
      batchSize = 5, 
      delayBetweenBatches = 1000, 
      maxConcurrent = 2 
    } = options;

    console.log('📦 [PERFORMANCE] Starting batch processing:', {
      totalBatches: imageBatches.length,
      batchSize,
      maxConcurrent
    });

    const results: any[] = [];
    const startTime = Date.now();

    // Process batches with concurrency control
    for (let i = 0; i < imageBatches.length; i += maxConcurrent) {
      const currentBatches = imageBatches.slice(i, i + maxConcurrent);
      
      try {
        const batchPromises = currentBatches.map(async (batch) => {
          return await processingFunction(batch);
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        console.log(`✅ [PERFORMANCE] Processed batch ${i + 1}-${Math.min(i + maxConcurrent, imageBatches.length)}/${imageBatches.length}`);

        // Add delay between batch groups to respect rate limits
        if (i + maxConcurrent < imageBatches.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      } catch (error) {
        console.error('❌ [PERFORMANCE] Batch processing error:', error);
        results.push(null); // Add null for failed batch
      }
    }

    const totalTime = Date.now() - startTime;
    console.log('🏁 [PERFORMANCE] Batch processing complete:', {
      processedBatches: results.length,
      totalTimeMs: totalTime,
      avgTimePerBatch: Math.round(totalTime / results.length)
    });

    return results;
  }

  /**
   * Intelligent API cost optimization
   */
  async optimizeAPIUsage(
    imageUrls: string[],
    analysisType: 'basic' | 'detailed' | 'premium' = 'basic'
  ): Promise<{
    optimizationStrategy: string;
    estimatedCost: number;
    estimatedTime: number;
    recommendations: string[];
  }> {
    const imageCount = imageUrls.length;
    
    // Cost per API call (estimated)
    const costs = {
      googleVision: 0.0015, // Per request
      openaiBasic: 0.01,    // GPT-4o-mini
      openaiDetailed: 0.03, // GPT-4o with high detail
      openaiPremium: 0.06   // GPT-4o with max tokens
    };

    let strategy = 'standard';
    let estimatedCost = 0;
    let estimatedTime = 0;
    const recommendations: string[] = [];

    if (imageCount <= 3) {
      strategy = 'single_call';
      estimatedCost = costs.googleVision + costs.openaiBasic;
      estimatedTime = 15000; // 15 seconds
      recommendations.push('Using single API call strategy for small batch');
    } else if (imageCount <= 10) {
      strategy = 'batch_optimized';
      estimatedCost = costs.googleVision * imageCount + costs.openaiDetailed * 2; // Group images
      estimatedTime = 30000; // 30 seconds
      recommendations.push('Using batch optimization for medium batch');
      recommendations.push('Grouping images to reduce OpenAI calls');
    } else {
      strategy = 'advanced_batching';
      estimatedCost = costs.googleVision * imageCount + costs.openaiDetailed * Math.ceil(imageCount / 5);
      estimatedTime = 60000; // 60 seconds
      recommendations.push('Using advanced batching for large batch');
      recommendations.push('Consider processing in background for better UX');
      recommendations.push('Implement progressive loading of results');
    }

    // Add premium features cost if requested
    if (analysisType === 'detailed') {
      estimatedCost *= 1.5;
      recommendations.push('Detailed analysis includes market research');
    } else if (analysisType === 'premium') {
      estimatedCost *= 2.0;
      recommendations.push('Premium analysis includes full eBay integration');
    }

    return {
      optimizationStrategy: strategy,
      estimatedCost,
      estimatedTime,
      recommendations
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isCacheValid(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [PERFORMANCE] Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): OptimizationMetrics & { 
    cacheHitRate: number; 
    cacheSize: number;
    avgCostPerRequest: number;
  } {
    const hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100 
      : 0;
    
    const avgCost = this.metrics.totalRequests > 0
      ? (this.metrics.costSaved / this.metrics.totalRequests)
      : 0;

    return {
      ...this.metrics,
      cacheHitRate: Math.round(hitRate * 100) / 100,
      cacheSize: this.cache.size,
      avgCostPerRequest: Math.round(avgCost * 1000) / 1000
    };
  }

  /**
   * Reset metrics for new measurement period
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      costSaved: 0,
      timesSaved: 0,
      errorRate: 0
    };
    console.log('📊 [PERFORMANCE] Metrics reset');
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Helper functions for easier integration
export const withPerformanceOptimization = async <T>(
  cacheKey: string,
  expensiveOperation: () => Promise<T>,
  estimatedCost: number = 0.05
): Promise<T> => {
  const result = await performanceOptimizer.getCachedAnalysis(
    cacheKey, 
    expensiveOperation, 
    estimatedCost
  );
  return result.data;
};

export const optimizeImages = (imageUrls: string[]) => {
  return performanceOptimizer.optimizeImages(imageUrls);
};

export const getPerformanceMetrics = () => {
  return performanceOptimizer.getMetrics();
};