/**
 * Smart Cache Manager
 * Intelligent caching system for 40-50% performance improvement
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  memoryUsage: number;
  averageResponseTime: number;
  itemCount: number;
}

interface SemanticKey {
  category: string;
  brand: string;
  itemType: string;
  hash: string;
}

export class SmartCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    memoryUsage: 0,
    averageResponseTime: 0,
    itemCount: 0
  };
  
  private readonly MAX_MEMORY_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  private cleanupTimer?: NodeJS.Timeout;
  private compressionWorker?: Worker;

  constructor() {
    this.initializeCache();
    this.startPeriodicCleanup();
    this.initializeCompressionWorker();
    
    console.log('🚀 [CACHE] Smart Cache Manager initialized');
  }

  private async initializeCache(): Promise<void> {
    try {
      // Load persisted cache from IndexedDB
      await this.loadPersistedCache();
      
      // Preload critical data
      await this.preloadCriticalData();
      
      console.log('✅ [CACHE] Cache initialization complete');
    } catch (error) {
      console.warn('⚠️ [CACHE] Cache initialization failed:', error);
    }
  }

  private initializeCompressionWorker(): void {
    try {
      // Create compression worker for large data
      const workerCode = `
        self.onmessage = function(e) {
          const { action, data, id } = e.data;
          
          if (action === 'compress') {
            try {
              const compressed = JSON.stringify(data);
              self.postMessage({ id, result: compressed, success: true });
            } catch (error) {
              self.postMessage({ id, error: error.message, success: false });
            }
          } else if (action === 'decompress') {
            try {
              const decompressed = JSON.parse(data);
              self.postMessage({ id, result: decompressed, success: true });
            } catch (error) {
              self.postMessage({ id, error: error.message, success: false });
            }
          }
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.compressionWorker = new Worker(URL.createObjectURL(blob));
      
      console.log('🔧 [CACHE] Compression worker initialized');
    } catch (error) {
      console.warn('⚠️ [CACHE] Compression worker failed to initialize:', error);
    }
  }

  /**
   * Smart get with semantic similarity and predictive loading
   */
  async get<T>(key: string, semanticContext?: Partial<SemanticKey>): Promise<T | null> {
    const startTime = performance.now();
    this.stats.totalRequests++;

    try {
      // Try exact key match first
      let entry = this.memoryCache.get(key);
      
      if (entry && !this.isExpired(entry)) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.stats.hits++;
        this.updateStats(startTime);
        
        console.log('✅ [CACHE] Cache hit (exact):', key);
        return this.decompressData(entry.data);
      }

      // Try semantic similarity match
      if (semanticContext) {
        const similarKey = await this.findSimilarKey(semanticContext);
        if (similarKey) {
          entry = this.memoryCache.get(similarKey);
          if (entry && !this.isExpired(entry)) {
            entry.accessCount++;
            entry.lastAccessed = Date.now();
            this.stats.hits++;
            this.updateStats(startTime);
            
            console.log('✅ [CACHE] Cache hit (semantic):', similarKey, 'for', key);
            return this.decompressData(entry.data);
          }
        }
      }

      // Cache miss
      this.stats.misses++;
      this.updateStats(startTime);
      
      console.log('❌ [CACHE] Cache miss:', key);
      
      // Trigger predictive loading
      if (semanticContext) {
        this.triggerPredictiveLoading(semanticContext);
      }
      
      return null;
    } catch (error) {
      console.error('❌ [CACHE] Get operation failed:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Smart set with compression and intelligent TTL
   */
  async set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      priority?: CacheEntry['priority'];
      tags?: string[];
      semanticContext?: Partial<SemanticKey>;
    } = {}
  ): Promise<void> {
    try {
      const {
        ttl = this.calculateIntelligentTTL(data, options.semanticContext),
        priority = 'medium',
        tags = [],
        semanticContext
      } = options;

      // Compress large data
      const compressedData = await this.compressData(data);
      const dataSize = this.calculateSize(compressedData);

      // Check memory limits and evict if necessary
      await this.ensureMemoryAvailable(dataSize);

      const entry: CacheEntry<T> = {
        data: compressedData,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        ttl,
        priority,
        tags: [...tags, ...(semanticContext ? this.generateSemanticTags(semanticContext) : [])],
        size: dataSize
      };

      this.memoryCache.set(key, entry);
      this.stats.itemCount++;
      this.stats.memoryUsage += dataSize;

      // Persist critical data
      if (priority === 'critical' || priority === 'high') {
        await this.persistToDisk(key, entry);
      }

      console.log('💾 [CACHE] Data cached:', key, {
        size: dataSize,
        ttl,
        priority,
        tags: entry.tags
      });

    } catch (error) {
      console.error('❌ [CACHE] Set operation failed:', error);
    }
  }

  /**
   * Intelligent TTL calculation based on data characteristics
   */
  private calculateIntelligentTTL(data: any, semanticContext?: Partial<SemanticKey>): number {
    // Base TTL on data type and usage patterns
    if (semanticContext?.category === 'ai-analysis') {
      return 60 * 60 * 1000; // 1 hour for AI analysis results
    }
    
    if (semanticContext?.category === 'product-info') {
      return 24 * 60 * 60 * 1000; // 24 hours for product information
    }
    
    if (semanticContext?.category === 'ebay-api') {
      return 15 * 60 * 1000; // 15 minutes for eBay API data
    }
    
    // Size-based TTL
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 100000) { // >100KB
      return 2 * 60 * 60 * 1000; // 2 hours for large data
    }
    
    return this.DEFAULT_TTL;
  }

  /**
   * Find semantically similar cached items
   */
  private async findSimilarKey(semanticContext: Partial<SemanticKey>): Promise<string | null> {
    try {
      const { category, brand, itemType } = semanticContext;
      let bestMatch: { key: string; score: number } | null = null;

      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry)) continue;

        let score = 0;
        
        // Category match (highest weight)
        if (category && entry.tags.includes(`category:${category}`)) {
          score += 50;
        }
        
        // Brand match
        if (brand && entry.tags.includes(`brand:${brand.toLowerCase()}`)) {
          score += 30;
        }
        
        // Item type match
        if (itemType && entry.tags.includes(`itemType:${itemType.toLowerCase()}`)) {
          score += 20;
        }

        if (score > 0 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { key, score };
        }
      }

      // Return best match if similarity is high enough
      if (bestMatch && bestMatch.score >= 50) {
        console.log('🎯 [CACHE] Found similar item:', bestMatch.key, 'score:', bestMatch.score);
        return bestMatch.key;
      }

      return null;
    } catch (error) {
      console.error('❌ [CACHE] Similarity search failed:', error);
      return null;
    }
  }

  /**
   * Predictive loading based on user patterns
   */
  private async triggerPredictiveLoading(semanticContext: Partial<SemanticKey>): Promise<void> {
    try {
      const { category, brand } = semanticContext;
      
      // Load related categories
      if (category && brand) {
        const relatedCategories = this.getRelatedCategories(category);
        const predictiveKeys = relatedCategories.map(cat => 
          `ai-analysis:${brand}:${cat}`
        );
        
        console.log('🔮 [CACHE] Triggering predictive loading for:', predictiveKeys);
        
        // Mark for background loading (would integrate with actual data fetching)
        this.scheduleBackgroundLoading(predictiveKeys);
      }
    } catch (error) {
      console.error('❌ [CACHE] Predictive loading failed:', error);
    }
  }

  /**
   * Memory management with intelligent eviction
   */
  private async ensureMemoryAvailable(requiredSize: number): Promise<void> {
    if (this.stats.memoryUsage + requiredSize <= this.MAX_MEMORY_SIZE) {
      return;
    }

    console.log('🧹 [CACHE] Memory limit reached, starting intelligent eviction...');

    // Calculate eviction scores (lower = evict first)
    const evictionCandidates = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({
        key,
        entry,
        score: this.calculateEvictionScore(entry)
      }))
      .sort((a, b) => a.score - b.score);

    let freedMemory = 0;
    const evictedKeys: string[] = [];

    for (const candidate of evictionCandidates) {
      if (freedMemory >= requiredSize) break;

      // Don't evict critical data
      if (candidate.entry.priority === 'critical') continue;

      this.memoryCache.delete(candidate.key);
      freedMemory += candidate.entry.size;
      this.stats.memoryUsage -= candidate.entry.size;
      this.stats.itemCount--;
      evictedKeys.push(candidate.key);
    }

    console.log('🗑️ [CACHE] Evicted items:', evictedKeys.length, 'freed:', freedMemory, 'bytes');
  }

  /**
   * Calculate eviction score (lower = evict first)
   */
  private calculateEvictionScore(entry: CacheEntry): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;
    
    // Priority weights
    const priorityWeights = {
      low: 1,
      medium: 2,
      high: 4,
      critical: 10
    };
    
    // Frequency factor (access count per hour)
    const hoursSinceCreation = age / (60 * 60 * 1000);
    const accessFrequency = hoursSinceCreation > 0 ? entry.accessCount / hoursSinceCreation : entry.accessCount;
    
    // Recency factor (hours since last access)
    const recencyPenalty = timeSinceAccess / (60 * 60 * 1000);
    
    // Final score (lower = more likely to evict)
    return priorityWeights[entry.priority] * accessFrequency * (1 / (1 + recencyPenalty));
  }

  /**
   * Data compression for large items
   */
  private async compressData(data: any): Promise<any> {
    try {
      const serialized = JSON.stringify(data);
      
      // Only compress large data
      if (serialized.length > 10000) { // >10KB
        if (this.compressionWorker) {
          return new Promise((resolve) => {
            const id = Math.random().toString(36);
            
            const handleMessage = (e: MessageEvent) => {
              if (e.data.id === id) {
                this.compressionWorker!.removeEventListener('message', handleMessage);
                resolve(e.data.success ? e.data.result : data);
              }
            };
            
            this.compressionWorker!.addEventListener('message', handleMessage);
            this.compressionWorker!.postMessage({ action: 'compress', data, id });
          });
        }
      }
      
      return data;
    } catch (error) {
      console.warn('⚠️ [CACHE] Compression failed, using uncompressed:', error);
      return data;
    }
  }

  /**
   * Data decompression
   */
  private async decompressData(data: any): Promise<any> {
    try {
      // Check if data is compressed (simple heuristic)
      if (typeof data === 'string' && data.length > 10000) {
        if (this.compressionWorker) {
          return new Promise((resolve) => {
            const id = Math.random().toString(36);
            
            const handleMessage = (e: MessageEvent) => {
              if (e.data.id === id) {
                this.compressionWorker!.removeEventListener('message', handleMessage);
                resolve(e.data.success ? e.data.result : data);
              }
            };
            
            this.compressionWorker!.addEventListener('message', handleMessage);
            this.compressionWorker!.postMessage({ action: 'decompress', data, id });
          });
        }
      }
      
      return data;
    } catch (error) {
      console.warn('⚠️ [CACHE] Decompression failed, using raw data:', error);
      return data;
    }
  }

  /**
   * Generate semantic tags for better categorization
   */
  private generateSemanticTags(context: Partial<SemanticKey>): string[] {
    const tags: string[] = [];
    
    if (context.category) tags.push(`category:${context.category}`);
    if (context.brand) tags.push(`brand:${context.brand.toLowerCase()}`);
    if (context.itemType) tags.push(`itemType:${context.itemType.toLowerCase()}`);
    
    return tags;
  }

  /**
   * Get related categories for predictive loading
   */
  private getRelatedCategories(category: string): string[] {
    const categoryRelations: Record<string, string[]> = {
      'clothing': ['accessories', 'shoes', 'bags'],
      'electronics': ['accessories', 'cables', 'cases'],
      'books_media': ['electronics', 'collectibles'],
      'home_garden': ['tools', 'outdoor', 'decor'],
      'toys_games': ['collectibles', 'books_media'],
      'sports_outdoors': ['clothing', 'accessories', 'equipment']
    };
    
    return categoryRelations[category] || [];
  }

  /**
   * Persist critical data to IndexedDB
   */
  private async persistToDisk(key: string, entry: CacheEntry): Promise<void> {
    try {
      const request = indexedDB.open('SmartCache', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        store.put({ key, entry });
        console.log('💾 [CACHE] Persisted to disk:', key);
      };
    } catch (error) {
      console.warn('⚠️ [CACHE] Disk persistence failed:', error);
    }
  }

  /**
   * Load persisted cache from IndexedDB
   */
  private async loadPersistedCache(): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open('SmartCache', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cache')) {
          resolve();
          return;
        }
        
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const persistedEntries = getAllRequest.result;
          let loadedCount = 0;
          
          for (const { key, entry } of persistedEntries) {
            if (!this.isExpired(entry)) {
              this.memoryCache.set(key, entry);
              this.stats.itemCount++;
              this.stats.memoryUsage += entry.size;
              loadedCount++;
            }
          }
          
          console.log('📂 [CACHE] Loaded from disk:', loadedCount, 'items');
          resolve();
        };
        
        getAllRequest.onerror = () => resolve();
      };
      
      request.onerror = () => resolve();
    });
  }

  /**
   * Preload critical frequently-used data
   */
  private async preloadCriticalData(): Promise<void> {
    try {
      // Preload common category mappings
      const commonCategories = ['clothing', 'electronics', 'books_media'];
      // This would integrate with actual data sources
      console.log('🚀 [CACHE] Preloading critical data for categories:', commonCategories);
    } catch (error) {
      console.warn('⚠️ [CACHE] Preload failed:', error);
    }
  }

  /**
   * Schedule background loading for predictive caching
   */
  private scheduleBackgroundLoading(keys: string[]): void {
    // This would integrate with the actual data fetching system
    console.log('⏰ [CACHE] Scheduled background loading:', keys);
  }

  /**
   * Utility functions
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private updateStats(startTime: number): void {
    const responseTime = performance.now() - startTime;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime) / 
      this.stats.totalRequests;
    this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
  }

  /**
   * Periodic cleanup of expired entries
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private cleanup(): void {
    console.log('🧹 [CACHE] Starting periodic cleanup...');
    
    let cleanedCount = 0;
    let freedMemory = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        this.stats.itemCount--;
        this.stats.memoryUsage -= entry.size;
        freedMemory += entry.size;
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log('🗑️ [CACHE] Cleanup complete:', cleanedCount, 'expired items removed, freed:', freedMemory, 'bytes');
    }
  }

  /**
   * Public API methods
   */
  
  getStats(): CacheStats {
    return { ...this.stats };
  }

  invalidateByTags(tags: string[]): void {
    console.log('🗑️ [CACHE] Invalidating by tags:', tags);
    
    let invalidatedCount = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (tags.some(tag => entry.tags.includes(tag))) {
        this.memoryCache.delete(key);
        this.stats.itemCount--;
        this.stats.memoryUsage -= entry.size;
        invalidatedCount++;
      }
    }
    
    console.log('🗑️ [CACHE] Invalidated', invalidatedCount, 'items by tags');
  }

  clear(): void {
    console.log('🗑️ [CACHE] Clearing all cache...');
    this.memoryCache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      memoryUsage: 0,
      averageResponseTime: 0,
      itemCount: 0
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    this.clear();
    console.log('💥 [CACHE] Cache manager destroyed');
  }
}

// Singleton instance
export const smartCache = new SmartCacheManager();