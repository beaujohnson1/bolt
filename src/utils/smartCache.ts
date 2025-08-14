// PERFORMANCE OPTIMIZATION: Smart cache with multi-tier caching and invalidation
export class SmartCache {
  private static instance: SmartCache;
  private memoryCache = new Map<string, any>();
  private persistentCache = new Map<string, any>();
  private cacheStats = { hits: 0, misses: 0, evictions: 0 };
  
  // Configuration
  private readonly MEMORY_TTL = 5 * 60 * 1000; // 5 minutes for hot data
  private readonly PERSISTENT_TTL = 24 * 60 * 60 * 1000; // 24 hours for warm data
  private readonly MAX_MEMORY_SIZE = 100; // Keep hot data small
  private readonly MAX_PERSISTENT_SIZE = 1000;
  
  // Cache tiers for different data types
  private readonly CACHE_TIERS = {
    HOT: 'memory', // Frequently accessed data (user sessions, recent analyses)
    WARM: 'persistent', // Less frequent but still valuable (image analyses, API responses)
    COLD: 'none' // Rare access, don't cache
  };

  static getInstance(): SmartCache {
    if (!SmartCache.instance) {
      SmartCache.instance = new SmartCache();
    }
    return SmartCache.instance;
  }

  private constructor() {
    // Auto-cleanup expired entries every 5 minutes
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  // Smart cache key generation with context awareness
  generateSmartKey(type: string, identifier: string, context?: any): string {
    const baseKey = `${type}:${identifier}`;
    if (context) {
      const contextHash = this.hashObject(context);
      return `${baseKey}:${contextHash}`;
    }
    return baseKey;
  }

  // Intelligent cache tier selection based on access patterns
  determineCacheTier(type: string, data: any): 'memory' | 'persistent' | 'none' {
    // User session data - always hot
    if (type.includes('user') || type.includes('session')) {
      return 'memory';
    }
    
    // AI analysis results - warm (expensive to regenerate)
    if (type.includes('analysis') || type.includes('ai') || type.includes('vision')) {
      return 'persistent';
    }
    
    // Large images or temporary data - don't cache
    if (data && typeof data === 'string' && data.length > 100000) {
      return 'none';
    }
    
    // Default to persistent for valuable computations
    return 'persistent';
  }

  // Get with automatic tier selection and promotion
  get<T>(key: string, type?: string): T | null {
    // Check memory cache first (fastest)
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult && !this.isExpired(memoryResult)) {
      this.cacheStats.hits++;
      console.log(`🚀 [SMART-CACHE] Memory hit for key: ${key.substring(0, 30)}...`);
      return memoryResult.data;
    }

    // Check persistent cache
    const persistentResult = this.persistentCache.get(key);
    if (persistentResult && !this.isExpired(persistentResult)) {
      this.cacheStats.hits++;
      console.log(`💾 [SMART-CACHE] Persistent hit for key: ${key.substring(0, 30)}...`);
      
      // Promote to memory if accessed frequently
      if (persistentResult.accessCount > 2) {
        this.promoteToMemory(key, persistentResult);
      } else {
        persistentResult.accessCount = (persistentResult.accessCount || 0) + 1;
        persistentResult.lastAccessed = Date.now();
      }
      
      return persistentResult.data;
    }

    this.cacheStats.misses++;
    console.log(`❌ [SMART-CACHE] Miss for key: ${key.substring(0, 30)}...`);
    return null;
  }

  // Set with intelligent tier placement
  set<T>(key: string, data: T, type: string = 'default', customTTL?: number): void {
    const tier = this.determineCacheTier(type, data);
    
    if (tier === 'none') {
      console.log(`🚫 [SMART-CACHE] Skipping cache for key: ${key.substring(0, 30)}... (tier: none)`);
      return;
    }

    const entry = {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
      type,
      ttl: customTTL || (tier === 'memory' ? this.MEMORY_TTL : this.PERSISTENT_TTL)
    };

    if (tier === 'memory') {
      this.setInMemory(key, entry);
    } else {
      this.setInPersistent(key, entry);
    }

    console.log(`✅ [SMART-CACHE] Cached in ${tier} tier: ${key.substring(0, 30)}...`);
  }

  // Invalidate related cache entries (smart invalidation)
  invalidate(pattern: string | RegExp): number {
    let invalidated = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    // Invalidate from memory cache
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        invalidated++;
      }
    }

    // Invalidate from persistent cache
    for (const key of this.persistentCache.keys()) {
      if (regex.test(key)) {
        this.persistentCache.delete(key);
        invalidated++;
      }
    }

    console.log(`🧹 [SMART-CACHE] Invalidated ${invalidated} entries matching pattern: ${pattern}`);
    return invalidated;
  }

  // Batch operations for better performance
  getMultiple<T>(keys: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  setMultiple<T>(entries: Array<{key: string, data: T, type?: string}>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.data, entry.type || 'batch');
    }
  }

  // Cache statistics and monitoring
  getStats() {
    return {
      ...this.cacheStats,
      memorySize: this.memoryCache.size,
      persistentSize: this.persistentCache.size,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0
    };
  }

  // Private helper methods
  private setInMemory(key: string, entry: any): void {
    if (this.memoryCache.size >= this.MAX_MEMORY_SIZE) {
      this.evictLRU(this.memoryCache);
    }
    this.memoryCache.set(key, entry);
  }

  private setInPersistent(key: string, entry: any): void {
    if (this.persistentCache.size >= this.MAX_PERSISTENT_SIZE) {
      this.evictLRU(this.persistentCache);
    }
    this.persistentCache.set(key, entry);
  }

  private promoteToMemory(key: string, entry: any): void {
    console.log(`⬆️ [SMART-CACHE] Promoting to memory: ${key.substring(0, 30)}...`);
    this.setInMemory(key, { ...entry, lastAccessed: Date.now() });
  }

  private evictLRU(cache: Map<string, any>): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey);
      this.cacheStats.evictions++;
      console.log(`🗑️ [SMART-CACHE] Evicted LRU entry: ${oldestKey.substring(0, 30)}...`);
    }
  }

  private isExpired(entry: any): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private cleanupExpired(): void {
    let cleaned = 0;
    
    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    // Clean persistent cache
    for (const [key, entry] of this.persistentCache.entries()) {
      if (this.isExpired(entry)) {
        this.persistentCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [SMART-CACHE] Cleaned up ${cleaned} expired entries`);
    }
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Global instance for easy access
export const smartCache = SmartCache.getInstance();

// Utility functions for common cache operations
export const cacheAIResult = (imageUrls: string[], result: any) => {
  const key = smartCache.generateSmartKey('ai_analysis', imageUrls.join('|'));
  smartCache.set(key, result, 'ai_analysis');
};

export const getCachedAIResult = (imageUrls: string[]) => {
  const key = smartCache.generateSmartKey('ai_analysis', imageUrls.join('|'));
  return smartCache.get(key, 'ai_analysis');
};

export const invalidateUserCache = (userId: string) => {
  return smartCache.invalidate(`user:${userId}`);
};

export const getCacheStats = () => smartCache.getStats();