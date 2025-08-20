// OAuth Performance Optimizer
// Eliminates timing issues, implements exponential backoff, debouncing, and efficient polling

export interface PerformanceMetrics {
  operationDuration: number;
  retryCount: number;
  storageAccessTime: number;
  networkLatency: number;
  totalPollingTime: number;
  successRate: number;
}

export interface BackoffConfig {
  initialDelay: number;
  maxDelay: number;
  multiplier: number;
  maxRetries: number;
}

export interface PerformanceConfig {
  polling: {
    baseInterval: number;
    maxInterval: number;
    jitterMax: number;
    maxDuration: number;
  };
  debouncing: {
    authCheck: number;
    storageWrite: number;
    eventDispatch: number;
  };
  backoff: BackoffConfig;
  batching: {
    maxBatchSize: number;
    batchTimeout: number;
  };
}

class OAuthPerformanceOptimizer {
  private performanceMetrics: PerformanceMetrics[] = [];
  private pendingOperations = new Map<string, any>();
  private lastOperationTimes = new Map<string, number>();
  private eventBatch: Array<{ type: string; data: any; timestamp: number }> = [];
  private batchTimer: NodeJS.Timeout | null = null;

  private defaultConfig: PerformanceConfig = {
    polling: {
      baseInterval: 1000,      // Start with 1 second
      maxInterval: 8000,       // Max 8 seconds between polls
      jitterMax: 200,          // Add up to 200ms random jitter
      maxDuration: 120000      // Stop polling after 2 minutes
    },
    debouncing: {
      authCheck: 300,          // Debounce auth checks by 300ms
      storageWrite: 100,       // Debounce storage writes by 100ms
      eventDispatch: 50        // Debounce event dispatching by 50ms
    },
    backoff: {
      initialDelay: 100,       // Start with 100ms delay
      maxDelay: 5000,          // Max 5 second delay
      multiplier: 1.5,         // Increase delay by 1.5x each retry
      maxRetries: 5            // Maximum 5 retries
    },
    batching: {
      maxBatchSize: 10,        // Batch up to 10 events
      batchTimeout: 50         // Flush batch after 50ms
    }
  };

  constructor(private config: Partial<PerformanceConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Optimized exponential backoff with jitter
   */
  async exponentialBackoff<T>(
    operation: () => Promise<T>, 
    operationName: string,
    customConfig?: Partial<BackoffConfig>
  ): Promise<T> {
    const config = { ...this.config.backoff, ...customConfig };
    const startTime = performance.now();
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Record success metrics
        this.recordMetrics(operationName, {
          operationDuration: performance.now() - startTime,
          retryCount: attempt,
          storageAccessTime: 0,
          networkLatency: 0,
          totalPollingTime: 0,
          successRate: 1
        });
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(
          config.initialDelay * Math.pow(config.multiplier, attempt),
          config.maxDelay
        );
        
        // Add jitter (0-20% of delay)
        const jitter = Math.random() * baseDelay * 0.2;
        const delay = baseDelay + jitter;
        
        console.log(`🔄 [PERF-OPT] ${operationName} attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Record failure metrics
    this.recordMetrics(operationName, {
      operationDuration: performance.now() - startTime,
      retryCount: config.maxRetries,
      storageAccessTime: 0,
      networkLatency: 0,
      totalPollingTime: 0,
      successRate: 0
    });
    
    throw lastError!;
  }

  /**
   * Optimized token polling with exponential backoff and early termination
   */
  async optimizedTokenPolling(
    checkFunction: () => boolean | Promise<boolean>,
    onSuccess: (result: any) => void,
    onTimeout?: () => void
  ): Promise<boolean> {
    const startTime = performance.now();
    let interval = this.config.polling.baseInterval;
    let pollCount = 0;
    const maxDuration = this.config.polling.maxDuration;
    
    console.log('🔍 [PERF-OPT] Starting optimized token polling...');
    
    return new Promise<boolean>((resolve) => {
      const poll = async () => {
        pollCount++;
        const pollStartTime = performance.now();
        
        try {
          const result = await checkFunction();
          const pollDuration = performance.now() - pollStartTime;
          
          console.log(`🔍 [PERF-OPT] Poll ${pollCount}: ${result ? 'SUCCESS' : 'NO_TOKENS'} (${Math.round(pollDuration)}ms)`);
          
          if (result) {
            const totalTime = performance.now() - startTime;
            console.log(`✅ [PERF-OPT] Token found after ${pollCount} polls in ${Math.round(totalTime)}ms`);
            
            this.recordMetrics('token_polling', {
              operationDuration: totalTime,
              retryCount: pollCount,
              storageAccessTime: pollDuration,
              networkLatency: 0,
              totalPollingTime: totalTime,
              successRate: 1
            });
            
            onSuccess(result);
            resolve(true);
            return;
          }
          
          // Check timeout
          const elapsed = performance.now() - startTime;
          if (elapsed >= maxDuration) {
            console.log(`⏱️ [PERF-OPT] Token polling timeout after ${Math.round(elapsed)}ms`);
            
            this.recordMetrics('token_polling', {
              operationDuration: elapsed,
              retryCount: pollCount,
              storageAccessTime: pollDuration,
              networkLatency: 0,
              totalPollingTime: elapsed,
              successRate: 0
            });
            
            if (onTimeout) onTimeout();
            resolve(false);
            return;
          }
          
          // Calculate next interval with exponential backoff and jitter
          interval = Math.min(interval * 1.2, this.config.polling.maxInterval);
          const jitter = Math.random() * this.config.polling.jitterMax;
          const nextDelay = interval + jitter;
          
          console.log(`🔄 [PERF-OPT] Next poll in ${Math.round(nextDelay)}ms (interval: ${Math.round(interval)}ms)`);
          
          setTimeout(poll, nextDelay);
          
        } catch (error) {
          console.error(`❌ [PERF-OPT] Polling error on attempt ${pollCount}:`, error);
          
          // Still continue polling on error, but with increased interval
          interval = Math.min(interval * 1.5, this.config.polling.maxInterval);
          setTimeout(poll, interval);
        }
      };
      
      // Start polling immediately
      poll();
    });
  }

  /**
   * Debounced function wrapper
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    key?: string
  ): T {
    const operationKey = key || func.name || 'unknown';
    
    return ((...args: any[]) => {
      const existingTimeout = this.pendingOperations.get(operationKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const timeout = setTimeout(() => {
        this.pendingOperations.delete(operationKey);
        func(...args);
      }, delay);
      
      this.pendingOperations.set(operationKey, timeout);
    }) as T;
  }

  /**
   * Debounced auth check with performance tracking
   */
  debouncedAuthCheck = this.debounce((checkFunction: () => boolean) => {
    const startTime = performance.now();
    const result = checkFunction();
    const duration = performance.now() - startTime;
    
    console.log(`🔍 [PERF-OPT] Debounced auth check: ${result} (${Math.round(duration)}ms)`);
    
    this.recordMetrics('auth_check', {
      operationDuration: duration,
      retryCount: 0,
      storageAccessTime: duration,
      networkLatency: 0,
      totalPollingTime: 0,
      successRate: result ? 1 : 0
    });
    
    return result;
  }, this.config.debouncing.authCheck, 'auth_check');

  /**
   * Debounced storage operation
   */
  debouncedStorageWrite = this.debounce((operation: () => void) => {
    const startTime = performance.now();
    
    try {
      operation();
      const duration = performance.now() - startTime;
      
      console.log(`💾 [PERF-OPT] Debounced storage write completed (${Math.round(duration)}ms)`);
      
      this.recordMetrics('storage_write', {
        operationDuration: duration,
        retryCount: 0,
        storageAccessTime: duration,
        networkLatency: 0,
        totalPollingTime: 0,
        successRate: 1
      });
      
    } catch (error) {
      console.error(`❌ [PERF-OPT] Debounced storage write failed:`, error);
      
      this.recordMetrics('storage_write', {
        operationDuration: performance.now() - startTime,
        retryCount: 0,
        storageAccessTime: 0,
        networkLatency: 0,
        totalPollingTime: 0,
        successRate: 0
      });
    }
  }, this.config.debouncing.storageWrite, 'storage_write');

  /**
   * Efficient event batching system
   */
  batchEvent(type: string, data: any): void {
    this.eventBatch.push({
      type,
      data,
      timestamp: Date.now()
    });

    // Auto-flush if batch is full
    if (this.eventBatch.length >= this.config.batching.maxBatchSize) {
      this.flushEventBatch();
      return;
    }

    // Set up timer to flush batch
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushEventBatch();
      }, this.config.batching.batchTimeout);
    }
  }

  /**
   * Flush accumulated events
   */
  private flushEventBatch(): void {
    if (this.eventBatch.length === 0) return;

    const batchSize = this.eventBatch.length;
    const batchStartTime = performance.now();
    
    console.log(`📡 [PERF-OPT] Flushing event batch: ${batchSize} events`);

    try {
      // Group events by type for efficient processing
      const eventGroups = this.eventBatch.reduce((groups, event) => {
        if (!groups[event.type]) groups[event.type] = [];
        groups[event.type].push(event);
        return groups;
      }, {} as Record<string, any[]>);

      // Dispatch grouped events
      Object.entries(eventGroups).forEach(([type, events]) => {
        const customEvent = new CustomEvent('oauthBatchEvent', {
          detail: {
            type,
            events,
            batchSize: events.length,
            timestamp: Date.now()
          }
        });
        
        window.dispatchEvent(customEvent);
      });

      const batchDuration = performance.now() - batchStartTime;
      console.log(`✅ [PERF-OPT] Event batch flushed: ${batchSize} events in ${Math.round(batchDuration)}ms`);

      this.recordMetrics('event_batch', {
        operationDuration: batchDuration,
        retryCount: 0,
        storageAccessTime: 0,
        networkLatency: 0,
        totalPollingTime: 0,
        successRate: 1
      });

    } catch (error) {
      console.error(`❌ [PERF-OPT] Error flushing event batch:`, error);
    } finally {
      // Clear batch and timer
      this.eventBatch = [];
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
    }
  }

  /**
   * Optimized localStorage operations with retry logic
   */
  async optimizedLocalStorageWrite(key: string, value: string): Promise<boolean> {
    return this.exponentialBackoff(async () => {
      const startTime = performance.now();
      
      // Test localStorage availability
      try {
        localStorage.setItem('_test_availability', 'test');
        localStorage.removeItem('_test_availability');
      } catch (error) {
        throw new Error('localStorage not available');
      }
      
      // Perform the actual write
      localStorage.setItem(key, value);
      
      // Verify the write
      const verified = localStorage.getItem(key);
      if (verified !== value) {
        throw new Error('localStorage write verification failed');
      }
      
      const duration = performance.now() - startTime;
      console.log(`💾 [PERF-OPT] localStorage write successful for ${key} (${Math.round(duration)}ms)`);
      
      return true;
    }, `localStorage_write_${key}`);
  }

  /**
   * Optimized localStorage read with caching
   */
  async optimizedLocalStorageRead(key: string): Promise<string | null> {
    const cacheKey = `cached_${key}`;
    const lastRead = this.lastOperationTimes.get(cacheKey) || 0;
    const now = Date.now();
    
    // Use cache if read within last 100ms (prevents redundant reads)
    if (now - lastRead < 100) {
      const cached = this.pendingOperations.get(cacheKey);
      if (cached !== undefined) {
        console.log(`📋 [PERF-OPT] Using cached localStorage read for ${key}`);
        return cached;
      }
    }
    
    return this.exponentialBackoff(async () => {
      const startTime = performance.now();
      
      const value = localStorage.getItem(key);
      
      // Cache the result
      this.pendingOperations.set(cacheKey, value);
      this.lastOperationTimes.set(cacheKey, now);
      
      const duration = performance.now() - startTime;
      console.log(`📋 [PERF-OPT] localStorage read for ${key}: ${value ? 'found' : 'not found'} (${Math.round(duration)}ms)`);
      
      return value;
    }, `localStorage_read_${key}`);
  }

  /**
   * Network request optimization with timeout and retry
   */
  async optimizedNetworkRequest(
    url: string,
    options: RequestInit,
    timeoutMs: number = 30000
  ): Promise<Response> {
    return this.exponentialBackoff(async () => {
      const startTime = performance.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        const networkLatency = performance.now() - startTime;
        console.log(`🌐 [PERF-OPT] Network request to ${url}: ${response.status} (${Math.round(networkLatency)}ms)`);
        
        this.recordMetrics('network_request', {
          operationDuration: networkLatency,
          retryCount: 0,
          storageAccessTime: 0,
          networkLatency,
          totalPollingTime: 0,
          successRate: response.ok ? 1 : 0
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
        
      } finally {
        clearTimeout(timeoutId);
      }
    }, `network_${url}`);
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(operation: string, metrics: PerformanceMetrics): void {
    this.performanceMetrics.push({
      ...metrics,
      timestamp: Date.now(),
      operation
    } as any);
    
    // Keep only last 100 metrics to prevent memory bloat
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): {
    summary: any;
    metrics: PerformanceMetrics[];
    recommendations: string[];
  } {
    const metrics = this.performanceMetrics;
    const recommendations: string[] = [];
    
    if (metrics.length === 0) {
      return {
        summary: { message: 'No performance data available' },
        metrics: [],
        recommendations: ['Start using the performance optimizer to collect metrics']
      };
    }
    
    // Calculate summary statistics
    const avgDuration = metrics.reduce((sum, m) => sum + m.operationDuration, 0) / metrics.length;
    const avgRetries = metrics.reduce((sum, m) => sum + m.retryCount, 0) / metrics.length;
    const successRate = metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length;
    const avgStorageTime = metrics.reduce((sum, m) => sum + m.storageAccessTime, 0) / metrics.length;
    const avgNetworkLatency = metrics.reduce((sum, m) => sum + m.networkLatency, 0) / metrics.length;
    
    // Generate recommendations
    if (avgDuration > 1000) {
      recommendations.push('Consider reducing operation complexity - average duration is high');
    }
    
    if (avgRetries > 2) {
      recommendations.push('High retry rate detected - investigate underlying issues');
    }
    
    if (successRate < 0.9) {
      recommendations.push('Low success rate - review error handling and retry logic');
    }
    
    if (avgStorageTime > 50) {
      recommendations.push('localStorage operations are slow - consider reducing data size');
    }
    
    if (avgNetworkLatency > 5000) {
      recommendations.push('High network latency - consider request optimization');
    }
    
    const summary = {
      totalOperations: metrics.length,
      averageDuration: Math.round(avgDuration),
      averageRetries: Math.round(avgRetries * 100) / 100,
      successRate: Math.round(successRate * 10000) / 100, // percentage with 2 decimals
      averageStorageTime: Math.round(avgStorageTime),
      averageNetworkLatency: Math.round(avgNetworkLatency),
      lastUpdated: new Date().toISOString()
    };
    
    return {
      summary,
      metrics,
      recommendations
    };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Clear all pending operations
    this.pendingOperations.forEach(timeout => {
      if (typeof timeout === 'number') {
        clearTimeout(timeout);
      }
    });
    this.pendingOperations.clear();
    
    // Flush any remaining events
    this.flushEventBatch();
    
    // Clear metrics
    this.performanceMetrics = [];
    
    console.log('🧹 [PERF-OPT] Performance optimizer cleaned up');
  }
}

// Export singleton instance
export const oauthPerformanceOptimizer = new OAuthPerformanceOptimizer();

// Export class for custom instances
export { OAuthPerformanceOptimizer };