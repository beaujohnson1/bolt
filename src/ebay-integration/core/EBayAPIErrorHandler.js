/**
 * Advanced eBay API Error Handler with Exponential Backoff and Retry Logic
 * Handles all eBay API error scenarios with intelligent recovery strategies
 */

class EBayAPIError extends Error {
  constructor(message, errorCode, statusCode, isRetryable = false, originalError = null) {
    super(message);
    this.name = 'EBayAPIError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

class EBayAPIErrorHandler {
  constructor(options = {}) {
    this.config = {
      maxRetries: options.maxRetries || 5,
      baseDelay: options.baseDelay || 1000, // 1 second
      maxDelay: options.maxDelay || 60000, // 60 seconds
      backoffFactor: options.backoffFactor || 2,
      jitterFactor: options.jitterFactor || 0.1,
      retryableStatusCodes: options.retryableStatusCodes || [429, 500, 502, 503, 504],
      retryableErrorCodes: options.retryableErrorCodes || [
        'IAF_TOKEN_EXPIRED',
        'INTERNAL_ERROR',
        'SERVICE_UNAVAILABLE',
        'TIMEOUT',
        'RATE_LIMIT_EXCEEDED'
      ],
      ...options
    };

    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      retriedRequests: 0,
      successfulRetries: 0,
      failedRetries: 0,
      errorsByCode: new Map(),
      averageRetryCount: 0
    };

    this.errorPatterns = this.initializeErrorPatterns();
  }

  /**
   * Initialize error pattern recognition for intelligent handling
   */
  initializeErrorPatterns() {
    return {
      // Rate limiting patterns
      rateLimiting: {
        patterns: [/rate.?limit/i, /too.?many.?requests/i, /quota.?exceeded/i],
        handler: 'handleRateLimitError'
      },
      
      // Authentication patterns
      authentication: {
        patterns: [/unauthorized/i, /token.?expired/i, /invalid.?token/i],
        handler: 'handleAuthError'
      },
      
      // Server error patterns
      serverError: {
        patterns: [/internal.?server/i, /service.?unavailable/i, /gateway.?timeout/i],
        handler: 'handleServerError'
      },
      
      // Business logic patterns
      businessLogic: {
        patterns: [/invalid.?item/i, /listing.?not.?found/i, /category.?mismatch/i],
        handler: 'handleBusinessLogicError'
      },
      
      // Network patterns
      network: {
        patterns: [/network.?error/i, /connection.?timeout/i, /dns.?error/i],
        handler: 'handleNetworkError'
      }
    };
  }

  /**
   * Main error handling method with intelligent retry logic
   */
  async handleAPICall(apiFunction, context = {}) {
    this.metrics.totalRequests++;
    let lastError = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt);
          await this.delay(delay);
          this.metrics.retriedRequests++;
          retryCount++;
        }

        const result = await apiFunction();
        
        if (attempt > 0) {
          this.metrics.successfulRetries++;
          this.updateAverageRetryCount(retryCount);
        }

        return result;

      } catch (error) {
        lastError = error;
        this.metrics.totalErrors++;
        
        const ebayError = this.classifyError(error, context);
        
        // Log error for monitoring
        this.logError(ebayError, attempt, context);
        
        // Check if error is retryable
        if (!this.isRetryableError(ebayError) || attempt === this.config.maxRetries) {
          this.metrics.failedRetries++;
          throw ebayError;
        }

        // Apply error-specific handling
        await this.applyErrorSpecificHandling(ebayError, attempt, context);
      }
    }

    throw lastError;
  }

  /**
   * Classify and enrich error information
   */
  classifyError(error, context) {
    const statusCode = error.response?.status || error.statusCode || 0;
    const errorMessage = error.message || error.response?.data?.message || 'Unknown error';
    const errorCode = error.response?.data?.errorCode || error.code || 'UNKNOWN_ERROR';

    // Determine if error is retryable
    const isRetryable = this.determineRetryability(error, statusCode, errorCode, errorMessage);

    // Create enriched error
    const ebayError = new EBayAPIError(
      this.enhanceErrorMessage(errorMessage, context),
      errorCode,
      statusCode,
      isRetryable,
      error
    );

    // Add context information
    ebayError.context = context;
    ebayError.endpoint = context.endpoint || 'unknown';
    ebayError.method = context.method || 'unknown';
    ebayError.category = this.categorizeError(errorMessage);

    // Update metrics
    this.updateErrorMetrics(ebayError);

    return ebayError;
  }

  /**
   * Determine if an error should be retried
   */
  determineRetryability(error, statusCode, errorCode, errorMessage) {
    // Check status codes
    if (this.config.retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    // Check error codes
    if (this.config.retryableErrorCodes.includes(errorCode)) {
      return true;
    }

    // Check error message patterns
    for (const [category, config] of Object.entries(this.errorPatterns)) {
      if (config.patterns.some(pattern => pattern.test(errorMessage))) {
        return ['rateLimiting', 'serverError', 'network'].includes(category);
      }
    }

    // Network-related errors from axios/fetch
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ENOTFOUND') {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  calculateDelay(attempt) {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffFactor, attempt - 1);
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    const totalDelay = exponentialDelay + jitter;
    
    return Math.min(totalDelay, this.config.maxDelay);
  }

  /**
   * Apply error-specific handling strategies
   */
  async applyErrorSpecificHandling(error, attempt, context) {
    const category = this.categorizeError(error.message);
    
    switch (category) {
      case 'rateLimiting':
        await this.handleRateLimitError(error, attempt, context);
        break;
      case 'authentication':
        await this.handleAuthError(error, attempt, context);
        break;
      case 'serverError':
        await this.handleServerError(error, attempt, context);
        break;
      case 'network':
        await this.handleNetworkError(error, attempt, context);
        break;
      default:
        // Default exponential backoff
        break;
    }
  }

  /**
   * Handle rate limiting errors with adaptive delays
   */
  async handleRateLimitError(error, attempt, context) {
    // Check for Retry-After header
    const retryAfter = error.originalError?.response?.headers?.['retry-after'];
    if (retryAfter) {
      const delay = parseInt(retryAfter) * 1000; // Convert to milliseconds
      console.warn(`Rate limited. Waiting ${delay}ms as indicated by Retry-After header`);
      await this.delay(delay);
      return;
    }

    // Use longer delays for rate limiting
    const rateLimitDelay = this.config.baseDelay * Math.pow(3, attempt);
    console.warn(`Rate limited. Using exponential backoff: ${rateLimitDelay}ms`);
  }

  /**
   * Handle authentication errors with token refresh
   */
  async handleAuthError(error, attempt, context) {
    if (context.tokenRefreshCallback && typeof context.tokenRefreshCallback === 'function') {
      console.log('Attempting to refresh authentication token');
      try {
        await context.tokenRefreshCallback();
        console.log('Token refresh successful');
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.message);
        // Don't retry auth errors if token refresh fails
        error.isRetryable = false;
      }
    }
  }

  /**
   * Handle server errors with circuit breaker awareness
   */
  async handleServerError(error, attempt, context) {
    // Longer delays for server errors
    const serverErrorDelay = this.config.baseDelay * Math.pow(2.5, attempt);
    console.warn(`Server error detected. Using extended backoff: ${serverErrorDelay}ms`);
    
    // Notify circuit breaker if available
    if (context.circuitBreaker) {
      context.circuitBreaker.recordFailure();
    }
  }

  /**
   * Handle network errors with connection-aware delays
   */
  async handleNetworkError(error, attempt, context) {
    // Use longer delays for network issues
    const networkDelay = this.config.baseDelay * Math.pow(2, attempt) + Math.random() * 2000;
    console.warn(`Network error detected. Using adaptive delay: ${networkDelay}ms`);
  }

  /**
   * Categorize error for appropriate handling
   */
  categorizeError(errorMessage) {
    for (const [category, config] of Object.entries(this.errorPatterns)) {
      if (config.patterns.some(pattern => pattern.test(errorMessage))) {
        return category;
      }
    }
    return 'unknown';
  }

  /**
   * Enhance error message with context
   */
  enhanceErrorMessage(originalMessage, context) {
    const contextInfo = [];
    
    if (context.endpoint) contextInfo.push(`endpoint: ${context.endpoint}`);
    if (context.method) contextInfo.push(`method: ${context.method}`);
    if (context.itemId) contextInfo.push(`itemId: ${context.itemId}`);
    if (context.operation) contextInfo.push(`operation: ${context.operation}`);

    if (contextInfo.length > 0) {
      return `${originalMessage} [${contextInfo.join(', ')}]`;
    }

    return originalMessage;
  }

  /**
   * Update error metrics for monitoring
   */
  updateErrorMetrics(error) {
    const errorKey = `${error.statusCode}_${error.errorCode}`;
    const currentCount = this.metrics.errorsByCode.get(errorKey) || 0;
    this.metrics.errorsByCode.set(errorKey, currentCount + 1);
  }

  /**
   * Update average retry count metric
   */
  updateAverageRetryCount(retryCount) {
    const totalSuccessful = this.metrics.successfulRetries;
    const currentAverage = this.metrics.averageRetryCount;
    this.metrics.averageRetryCount = ((currentAverage * (totalSuccessful - 1)) + retryCount) / totalSuccessful;
  }

  /**
   * Log error for monitoring and debugging
   */
  logError(error, attempt, context) {
    const logData = {
      timestamp: new Date().toISOString(),
      attempt: attempt + 1,
      errorCode: error.errorCode,
      statusCode: error.statusCode,
      message: error.message,
      category: error.category,
      isRetryable: error.isRetryable,
      context: context,
      endpoint: context.endpoint
    };

    console.error('eBay API Error:', JSON.stringify(logData, null, 2));
    
    // Emit error event for external monitoring
    if (this.errorCallback) {
      this.errorCallback(logData);
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    return error.isRetryable === true;
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      errorsByCode: Object.fromEntries(this.metrics.errorsByCode),
      errorRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.totalErrors / this.metrics.totalRequests) * 100 : 0,
      retryRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.retriedRequests / this.metrics.totalRequests) * 100 : 0,
      retrySuccessRate: this.metrics.retriedRequests > 0 ? 
        (this.metrics.successfulRetries / this.metrics.retriedRequests) * 100 : 0
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      retriedRequests: 0,
      successfulRetries: 0,
      failedRetries: 0,
      errorsByCode: new Map(),
      averageRetryCount: 0
    };
  }

  /**
   * Set error callback for external monitoring
   */
  setErrorCallback(callback) {
    this.errorCallback = callback;
  }

  /**
   * Create a wrapped function with error handling
   */
  wrap(apiFunction, context = {}) {
    return (...args) => this.handleAPICall(() => apiFunction(...args), context);
  }
}

module.exports = { EBayAPIErrorHandler, EBayAPIError };