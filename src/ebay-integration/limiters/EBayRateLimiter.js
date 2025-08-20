/**
 * Advanced eBay API Rate Limiter with Daily and Per-Second Limits
 * Implements sliding window and token bucket algorithms for precise rate control
 */

class EBayRateLimiter {
  constructor(options = {}) {
    this.config = {
      // Daily limits per application
      dailyLimits: {
        browse: options.dailyLimits?.browse || 5000,
        trading: options.dailyLimits?.trading || 5000,
        sell: options.dailyLimits?.sell || 5000,
        analytics: options.dailyLimits?.analytics || 1000,
        developer: options.dailyLimits?.developer || 5000
      },
      
      // Per-second limits
      perSecondLimits: {
        browse: options.perSecondLimits?.browse || 5,
        trading: options.perSecondLimits?.trading || 5,
        sell: options.perSecondLimits?.sell || 5,
        analytics: options.perSecondLimits?.analytics || 2,
        developer: options.perSecondLimits?.developer || 5
      },
      
      // Window settings
      slidingWindowSize: options.slidingWindowSize || 60000, // 1 minute
      tokenBucketRefillRate: options.tokenBucketRefillRate || 1000, // 1 second
      
      // Safety margins
      safetyMargin: options.safetyMargin || 0.9, // Use 90% of limits
      adaptiveThrottling: options.adaptiveThrottling !== false,
      
      // Queue settings
      maxQueueSize: options.maxQueueSize || 1000,
      queueTimeout: options.queueTimeout || 300000, // 5 minutes
      
      ...options
    };

    // Rate limiting state
    this.state = {
      dailyUsage: new Map(), // API -> count
      slidingWindows: new Map(), // API -> [timestamps]
      tokenBuckets: new Map(), // API -> {tokens, lastRefill}
      queuedRequests: new Map(), // API -> [requests]
      lastResetTime: new Date().setHours(0, 0, 0, 0)
    };

    // Performance metrics
    this.metrics = {
      totalRequests: 0,
      throttledRequests: 0,
      queuedRequests: 0,
      rejectedRequests: 0,
      averageWaitTime: 0,
      peakUsage: new Map(),
      dailyUsageHistory: new Map()
    };

    // Initialize rate limiting structures
    this.initializeRateLimiters();
    
    // Start cleanup and reset timers
    this.startTimers();
  }

  /**
   * Initialize rate limiting data structures
   */
  initializeRateLimiters() {
    const apis = Object.keys(this.config.dailyLimits);
    
    apis.forEach(api => {
      this.state.dailyUsage.set(api, 0);
      this.state.slidingWindows.set(api, []);
      this.state.tokenBuckets.set(api, {
        tokens: this.config.perSecondLimits[api],
        lastRefill: Date.now()
      });
      this.state.queuedRequests.set(api, []);
      this.metrics.peakUsage.set(api, 0);
      this.metrics.dailyUsageHistory.set(api, []);
    });
  }

  /**
   * Main rate limiting check and enforcement
   */
  async checkRateLimit(apiName, context = {}) {
    this.metrics.totalRequests++;
    
    const now = Date.now();
    
    // Check if daily reset is needed
    this.checkDailyReset();
    
    // Validate API name
    if (!this.config.dailyLimits[apiName]) {
      throw new Error(`Unknown API: ${apiName}`);
    }

    // Check daily limit
    if (!this.checkDailyLimit(apiName)) {
      this.metrics.rejectedRequests++;
      throw new Error(`Daily limit exceeded for ${apiName} API`);
    }

    // Check per-second limit using token bucket
    const waitTime = await this.checkPerSecondLimit(apiName, context);
    
    if (waitTime > 0) {
      this.metrics.throttledRequests++;
      await this.handleThrottling(apiName, waitTime, context);
    }

    // Update usage tracking
    this.updateUsageTracking(apiName, now);
    
    return true;
  }

  /**
   * Check daily limit with safety margin
   */
  checkDailyLimit(apiName) {
    const currentUsage = this.state.dailyUsage.get(apiName) || 0;
    const dailyLimit = this.config.dailyLimits[apiName];
    const safeLimit = Math.floor(dailyLimit * this.config.safetyMargin);
    
    return currentUsage < safeLimit;
  }

  /**
   * Check per-second limit using token bucket algorithm
   */
  async checkPerSecondLimit(apiName, context = {}) {
    const bucket = this.state.tokenBuckets.get(apiName);
    const now = Date.now();
    
    // Refill tokens based on time elapsed
    this.refillTokenBucket(apiName, now);
    
    // Check if tokens are available
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return 0; // No wait required
    }

    // Calculate wait time
    const tokensNeeded = 1;
    const waitTime = this.calculateWaitTime(apiName, tokensNeeded);
    
    // Apply adaptive throttling if enabled
    if (this.config.adaptiveThrottling) {
      return this.applyAdaptiveThrottling(apiName, waitTime, context);
    }
    
    return waitTime;
  }

  /**
   * Refill token bucket based on elapsed time
   */
  refillTokenBucket(apiName, now) {
    const bucket = this.state.tokenBuckets.get(apiName);
    const timeSinceLastRefill = now - bucket.lastRefill;
    const refillInterval = this.config.tokenBucketRefillRate;
    
    if (timeSinceLastRefill >= refillInterval) {
      const tokensToAdd = Math.floor(timeSinceLastRefill / refillInterval);
      const maxTokens = this.config.perSecondLimits[apiName];
      
      bucket.tokens = Math.min(bucket.tokens + tokensToAdd, maxTokens);
      bucket.lastRefill = now;
    }
  }

  /**
   * Calculate wait time for token availability
   */
  calculateWaitTime(apiName, tokensNeeded) {
    const bucket = this.state.tokenBuckets.get(apiName);
    const tokensAvailable = bucket.tokens;
    const tokensToWaitFor = tokensNeeded - tokensAvailable;
    
    return tokensToWaitFor * this.config.tokenBucketRefillRate;
  }

  /**
   * Apply adaptive throttling based on system load
   */
  applyAdaptiveThrottling(apiName, baseWaitTime, context) {
    const currentLoad = this.calculateCurrentLoad(apiName);
    const queueLength = this.state.queuedRequests.get(apiName).length;
    
    // Increase wait time based on load
    let adaptiveMultiplier = 1;
    
    if (currentLoad > 0.8) {
      adaptiveMultiplier = 2;
    } else if (currentLoad > 0.6) {
      adaptiveMultiplier = 1.5;
    }
    
    // Increase wait time based on queue length
    if (queueLength > 50) {
      adaptiveMultiplier *= 1.5;
    } else if (queueLength > 20) {
      adaptiveMultiplier *= 1.2;
    }
    
    // Apply priority adjustments
    if (context.priority === 'high') {
      adaptiveMultiplier *= 0.5;
    } else if (context.priority === 'low') {
      adaptiveMultiplier *= 1.5;
    }
    
    return Math.min(baseWaitTime * adaptiveMultiplier, 30000); // Max 30 seconds
  }

  /**
   * Calculate current system load
   */
  calculateCurrentLoad(apiName) {
    const dailyUsage = this.state.dailyUsage.get(apiName) || 0;
    const dailyLimit = this.config.dailyLimits[apiName];
    const window = this.state.slidingWindows.get(apiName) || [];
    const perSecondLimit = this.config.perSecondLimits[apiName];
    
    const dailyLoad = dailyUsage / dailyLimit;
    const recentLoad = window.length / perSecondLimit;
    
    return Math.max(dailyLoad, recentLoad);
  }

  /**
   * Handle throttling with queueing support
   */
  async handleThrottling(apiName, waitTime, context) {
    const useQueue = context.useQueue !== false && waitTime > 5000; // Queue for waits > 5s
    
    if (useQueue) {
      return this.queueRequest(apiName, context);
    } else {
      this.updateWaitTimeMetrics(waitTime);
      await this.delay(waitTime);
    }
  }

  /**
   * Queue request for later processing
   */
  async queueRequest(apiName, context) {
    const queue = this.state.queuedRequests.get(apiName);
    
    if (queue.length >= this.config.maxQueueSize) {
      this.metrics.rejectedRequests++;
      throw new Error(`Queue full for ${apiName} API`);
    }

    return new Promise((resolve, reject) => {
      const queuedRequest = {
        resolve,
        reject,
        timestamp: Date.now(),
        context,
        timeout: setTimeout(() => {
          this.removeFromQueue(apiName, queuedRequest);
          reject(new Error(`Queued request timeout for ${apiName} API`));
        }, this.config.queueTimeout)
      };

      queue.push(queuedRequest);
      this.metrics.queuedRequests++;
    });
  }

  /**
   * Process queued requests
   */
  async processQueuedRequests() {
    const apis = Object.keys(this.config.dailyLimits);
    
    for (const apiName of apis) {
      const queue = this.state.queuedRequests.get(apiName);
      
      while (queue.length > 0) {
        // Check if we can process a request
        const bucket = this.state.tokenBuckets.get(apiName);
        this.refillTokenBucket(apiName, Date.now());
        
        if (bucket.tokens >= 1 && this.checkDailyLimit(apiName)) {
          const request = queue.shift();
          clearTimeout(request.timeout);
          
          bucket.tokens -= 1;
          this.updateUsageTracking(apiName, Date.now());
          
          request.resolve();
        } else {
          break; // Can't process more requests right now
        }
      }
    }
  }

  /**
   * Remove request from queue
   */
  removeFromQueue(apiName, requestToRemove) {
    const queue = this.state.queuedRequests.get(apiName);
    const index = queue.indexOf(requestToRemove);
    if (index > -1) {
      queue.splice(index, 1);
    }
  }

  /**
   * Update usage tracking and metrics
   */
  updateUsageTracking(apiName, timestamp) {
    // Update daily usage
    const currentDailyUsage = this.state.dailyUsage.get(apiName) || 0;
    this.state.dailyUsage.set(apiName, currentDailyUsage + 1);
    
    // Update sliding window
    const window = this.state.slidingWindows.get(apiName);
    window.push(timestamp);
    
    // Clean old entries from sliding window
    const cutoffTime = timestamp - this.config.slidingWindowSize;
    while (window.length > 0 && window[0] < cutoffTime) {
      window.shift();
    }
    
    // Update peak usage
    const currentPeak = this.metrics.peakUsage.get(apiName) || 0;
    this.metrics.peakUsage.set(apiName, Math.max(currentPeak, window.length));
  }

  /**
   * Check if daily reset is needed
   */
  checkDailyReset() {
    const now = new Date();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    
    if (todayStart > this.state.lastResetTime) {
      this.performDailyReset();
      this.state.lastResetTime = todayStart;
    }
  }

  /**
   * Perform daily reset of counters
   */
  performDailyReset() {
    console.log('Performing daily rate limit reset');
    
    // Store yesterday's usage for history
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split('T')[0];
    
    for (const [apiName, usage] of this.state.dailyUsage) {
      const history = this.metrics.dailyUsageHistory.get(apiName) || [];
      history.push({ date: dateKey, usage });
      
      // Keep only last 30 days
      if (history.length > 30) {
        history.shift();
      }
      
      this.metrics.dailyUsageHistory.set(apiName, history);
    }
    
    // Reset daily counters
    for (const apiName of Object.keys(this.config.dailyLimits)) {
      this.state.dailyUsage.set(apiName, 0);
    }
  }

  /**
   * Update wait time metrics
   */
  updateWaitTimeMetrics(waitTime) {
    const currentAverage = this.metrics.averageWaitTime;
    const totalThrottled = this.metrics.throttledRequests;
    
    this.metrics.averageWaitTime = ((currentAverage * (totalThrottled - 1)) + waitTime) / totalThrottled;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(apiName = null) {
    if (apiName) {
      return this.getSingleAPIStatus(apiName);
    }
    
    const status = {};
    for (const api of Object.keys(this.config.dailyLimits)) {
      status[api] = this.getSingleAPIStatus(api);
    }
    
    return status;
  }

  /**
   * Get status for a single API
   */
  getSingleAPIStatus(apiName) {
    const dailyUsage = this.state.dailyUsage.get(apiName) || 0;
    const dailyLimit = this.config.dailyLimits[apiName];
    const bucket = this.state.tokenBuckets.get(apiName);
    const queue = this.state.queuedRequests.get(apiName) || [];
    
    return {
      dailyUsage,
      dailyLimit,
      dailyRemaining: dailyLimit - dailyUsage,
      dailyPercentUsed: (dailyUsage / dailyLimit) * 100,
      tokensAvailable: bucket?.tokens || 0,
      perSecondLimit: this.config.perSecondLimits[apiName],
      queueLength: queue.length,
      estimatedWaitTime: this.estimateWaitTime(apiName)
    };
  }

  /**
   * Estimate wait time for next available slot
   */
  estimateWaitTime(apiName) {
    const bucket = this.state.tokenBuckets.get(apiName);
    
    if (bucket.tokens >= 1) {
      return 0;
    }
    
    const tokensNeeded = 1 - bucket.tokens;
    return tokensNeeded * this.config.tokenBucketRefillRate;
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      peakUsage: Object.fromEntries(this.metrics.peakUsage),
      dailyUsageHistory: Object.fromEntries(this.metrics.dailyUsageHistory),
      throttleRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.throttledRequests / this.metrics.totalRequests) * 100 : 0,
      queueUtilization: this.calculateQueueUtilization(),
      currentLoad: this.calculateSystemLoad()
    };
  }

  /**
   * Calculate queue utilization
   */
  calculateQueueUtilization() {
    const queueLengths = [];
    for (const queue of this.state.queuedRequests.values()) {
      queueLengths.push(queue.length);
    }
    
    const totalQueued = queueLengths.reduce((sum, length) => sum + length, 0);
    const maxCapacity = Object.keys(this.config.dailyLimits).length * this.config.maxQueueSize;
    
    return maxCapacity > 0 ? (totalQueued / maxCapacity) * 100 : 0;
  }

  /**
   * Calculate overall system load
   */
  calculateSystemLoad() {
    const loads = [];
    for (const apiName of Object.keys(this.config.dailyLimits)) {
      loads.push(this.calculateCurrentLoad(apiName));
    }
    
    return loads.length > 0 ? loads.reduce((sum, load) => sum + load, 0) / loads.length : 0;
  }

  /**
   * Start background timers
   */
  startTimers() {
    // Process queued requests every second
    this.queueProcessorTimer = setInterval(() => {
      this.processQueuedRequests();
    }, 1000);
    
    // Daily reset check every hour
    this.dailyResetTimer = setInterval(() => {
      this.checkDailyReset();
    }, 3600000);
  }

  /**
   * Stop background timers
   */
  stopTimers() {
    if (this.queueProcessorTimer) {
      clearInterval(this.queueProcessorTimer);
    }
    
    if (this.dailyResetTimer) {
      clearInterval(this.dailyResetTimer);
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    this.stopTimers();
    
    // Clear all queued requests
    for (const queue of this.state.queuedRequests.values()) {
      queue.forEach(request => {
        clearTimeout(request.timeout);
        request.reject(new Error('Rate limiter shutting down'));
      });
      queue.length = 0;
    }
  }
}

module.exports = EBayRateLimiter;