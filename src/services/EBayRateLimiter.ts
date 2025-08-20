import { backOff } from 'exponential-backoff';

/**
 * eBay API rate limiting and error handling service
 * Implements circuit breaker and exponential backoff patterns
 */
export class EBayRateLimiter {
  private readonly limits = {
    'browse': { daily: 5000, perSecond: 10 },
    'sell': { daily: 1000, perSecond: 5 },
    'oauth': { daily: 100, perSecond: 1 },
    'trading': { daily: 5000, perSecond: 10 },
    'taxonomy': { daily: 500, perSecond: 2 }
  };
  
  private counters = new Map<string, { count: number; resetAt: number }>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  
  // eBay-specific error codes
  private readonly retryableErrors = [2001, 2003, 3004, 3005, 11002];
  private readonly tokenErrors = [1001, 1002, 25002, 931, 932];
  private readonly rateLimitErrors = [2001, 218066];
  
  /**
   * Execute API call with comprehensive error handling and retry logic
   */
  async executeWithRetry<T>(
    apiCall: () => Promise<T>,
    context: { userId: string; operation: string; apiType: string }
  ): Promise<T> {
    // Check rate limits first
    await this.checkRateLimit(context.userId, context.apiType);
    
    // Check circuit breaker
    const breaker = this.getCircuitBreaker(context.apiType);
    if (breaker.isOpen()) {
      throw new Error(`Circuit breaker open for ${context.apiType}. Service temporarily unavailable.`);
    }
    
    try {
      // Execute with exponential backoff
      const result = await backOff(async () => {
        try {
          const response = await apiCall();
          breaker.recordSuccess();
          return response;
        } catch (error: any) {
          console.error(`API Error in ${context.operation}:`, error);
          
          // Handle token expiration
          if (this.isTokenError(error)) {
            console.log('Token error detected, triggering refresh...');
            throw new TokenRefreshRequiredError(error.message);
          }
          
          // Handle rate limiting with smart backoff
          if (this.isRateLimitError(error)) {
            const retryAfter = this.parseRetryAfter(error);
            console.log(`Rate limited. Waiting ${retryAfter}ms before retry...`);
            await this.delay(retryAfter);
            throw error; // Retry with backoff
          }
          
          // Check if error is retryable
          if (!this.isRetryableError(error)) {
            breaker.recordFailure();
            throw new NonRetryableError(error.message, error.errorCode);
          }
          
          throw error; // Retryable error
        }
      }, {
        numOfAttempts: 5,
        maxDelay: 30000,
        jitter: 'full',
        startingDelay: 1000,
        timeMultiple: 2,
        retry: (error: any) => {
          return this.isRetryableError(error) && !breaker.isOpen();
        }
      });
      
      return result;
      
    } catch (error: any) {
      if (error instanceof TokenRefreshRequiredError) {
        // Bubble up for token refresh handling
        throw error;
      }
      
      if (error instanceof NonRetryableError) {
        throw new Error(`eBay API Error ${error.code}: ${error.message}`);
      }
      
      // Max retries exceeded or circuit breaker open
      breaker.recordFailure();
      throw new Error(`API operation failed after retries: ${error.message}`);
    }
  }
  
  /**
   * Check and enforce rate limits
   */
  private async checkRateLimit(userId: string, apiType: string): Promise<void> {
    const key = `${userId}:${apiType}`;
    const limit = this.limits[apiType] || this.limits['sell'];
    const now = Date.now();
    
    let counter = this.counters.get(key);
    
    // Reset counter if expired
    if (!counter || counter.resetAt < now) {
      counter = { 
        count: 0, 
        resetAt: now + 86400000 // 24 hours
      };
    }
    
    // Check daily limit
    if (counter.count >= limit.daily) {
      const waitTime = counter.resetAt - now;
      throw new Error(
        `Daily rate limit exceeded for ${apiType}. ` +
        `Reset in ${Math.ceil(waitTime / 3600000)} hours.`
      );
    }
    
    // Increment counter
    counter.count++;
    this.counters.set(key, counter);
    
    // Enforce per-second limit with delay
    const msPerRequest = 1000 / limit.perSecond;
    await this.delay(msPerRequest);
  }
  
  /**
   * Get or create circuit breaker for API type
   */
  private getCircuitBreaker(apiType: string): CircuitBreaker {
    if (!this.circuitBreakers.has(apiType)) {
      this.circuitBreakers.set(apiType, new CircuitBreaker(apiType));
    }
    return this.circuitBreakers.get(apiType)!;
  }
  
  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // Check eBay error codes
    if (error.errorCode && this.retryableErrors.includes(error.errorCode)) {
      return true;
    }
    
    // Check HTTP status codes
    if (error.statusCode) {
      return error.statusCode >= 500 || error.statusCode === 429;
    }
    
    // Check for network errors
    if (error.code) {
      return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code);
    }
    
    return false;
  }
  
  /**
   * Check if error is token-related
   */
  private isTokenError(error: any): boolean {
    if (!error) return false;
    
    if (error.errorCode && this.tokenErrors.includes(error.errorCode)) {
      return true;
    }
    
    if (error.message) {
      const tokenKeywords = ['token', 'unauthorized', 'authentication', 'expired'];
      return tokenKeywords.some(keyword => 
        error.message.toLowerCase().includes(keyword)
      );
    }
    
    return error.statusCode === 401;
  }
  
  /**
   * Check if error is rate limit related
   */
  private isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    if (error.errorCode && this.rateLimitErrors.includes(error.errorCode)) {
      return true;
    }
    
    return error.statusCode === 429;
  }
  
  /**
   * Parse retry-after header or use smart backoff
   */
  private parseRetryAfter(error: any): number {
    // Check for Retry-After header
    if (error.headers?.['retry-after']) {
      const retryAfter = error.headers['retry-after'];
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    
    // Check for eBay-specific rate limit info
    if (error.errorCode === 2001) {
      return 60000; // 1 minute for call limit
    }
    
    if (error.errorCode === 218066) {
      return 300000; // 5 minutes for listing limit
    }
    
    // Default backoff
    return 30000; // 30 seconds
  }
  
  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current rate limit status
   */
  getRateLimitStatus(userId: string, apiType: string): RateLimitStatus {
    const key = `${userId}:${apiType}`;
    const counter = this.counters.get(key);
    const limit = this.limits[apiType] || this.limits['sell'];
    
    if (!counter || counter.resetAt < Date.now()) {
      return {
        used: 0,
        remaining: limit.daily,
        resetAt: new Date(Date.now() + 86400000),
        percentUsed: 0
      };
    }
    
    return {
      used: counter.count,
      remaining: limit.daily - counter.count,
      resetAt: new Date(counter.resetAt),
      percentUsed: (counter.count / limit.daily) * 100
    };
  }
  
  /**
   * Reset rate limits for a user (admin function)
   */
  resetUserLimits(userId: string): void {
    const keysToDelete: string[] = [];
    
    this.counters.forEach((_, key) => {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.counters.delete(key));
    console.log(`Reset rate limits for user ${userId}`);
  }
}

/**
 * Circuit breaker implementation for fault tolerance
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  private readonly threshold = 5; // Open after 5 failures
  private readonly timeout = 60000; // Try again after 1 minute
  private readonly successThreshold = 2; // Close after 2 successes
  private successCount = 0;
  
  constructor(private name: string) {}
  
  isOpen(): boolean {
    if (this.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log(`Circuit breaker ${this.name} entering HALF_OPEN state`);
      }
    }
    
    return this.state === 'OPEN';
  }
  
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failures = 0;
        console.log(`Circuit breaker ${this.name} CLOSED after successful recovery`);
      }
    } else if (this.state === 'CLOSED') {
      this.failures = Math.max(0, this.failures - 1);
    }
  }
  
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.log(`Circuit breaker ${this.name} OPEN after ${this.failures} failures`);
    }
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      console.log(`Circuit breaker ${this.name} reopened after failure in HALF_OPEN state`);
    }
  }
}

// Custom error classes
class TokenRefreshRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenRefreshRequiredError';
  }
}

class NonRetryableError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

// Type definitions
interface RateLimitStatus {
  used: number;
  remaining: number;
  resetAt: Date;
  percentUsed: number;
}

export default EBayRateLimiter;