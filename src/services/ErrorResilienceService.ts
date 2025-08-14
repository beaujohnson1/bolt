/**
 * Enhanced Error Resilience Service
 * Circuit breakers, retry logic, graceful degradation, and quality scoring
 */

interface CircuitBreakerState {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  successCount: number;
  totalRequests: number;
  threshold: number;
  timeout: number;
  halfOpenMaxRequests: number;
}

interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  jitter: boolean;
}

interface HealthCheckResult {
  service: string;
  healthy: boolean;
  responseTime: number;
  error?: string;
  lastChecked: number;
}

interface QualityScore {
  overall: number;
  accuracy: number;
  completeness: number;
  confidence: number;
  consistency: number;
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    issues: string[];
  }>;
}

interface ResilientOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount: number;
  totalTime: number;
  qualityScore?: QualityScore;
  fallbackUsed: boolean;
  circuitBreakerState?: string;
}

class ErrorResilienceService {
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private healthChecks = new Map<string, HealthCheckResult>();
  private errorMetrics = new Map<string, { count: number; lastError: number; types: Record<string, number> }>();

  private readonly defaultRetryPolicy: RetryPolicy = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE', '500', '502', '503', '504'],
    jitter: true
  };

  private readonly defaultCircuitBreakerConfig = {
    threshold: 5,           // Failures before opening
    timeout: 60000,         // Time to wait before half-open (1 minute)
    halfOpenMaxRequests: 3  // Max requests to test in half-open state
  };

  constructor() {
    console.log('🛡️ [RESILIENCE] Error Resilience Service initialized');
    this.startHealthCheckMonitoring();
    this.startCircuitBreakerCleanup();
  }

  /**
   * Execute operation with full resilience patterns
   */
  async executeResilientOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      retryPolicy?: Partial<RetryPolicy>;
      circuitBreakerConfig?: Partial<typeof this.defaultCircuitBreakerConfig>;
      fallbackOperation?: () => Promise<T>;
      qualityValidator?: (result: T) => QualityScore;
      timeout?: number;
    } = {}
  ): Promise<ResilientOperationResult<T>> {
    const startTime = performance.now();
    let retryCount = 0;
    let lastError: Error | null = null;
    let fallbackUsed = false;

    const retryPolicy = { ...this.defaultRetryPolicy, ...options.retryPolicy };
    
    console.log(`🛡️ [RESILIENCE] Executing resilient operation: ${operationName}`);

    try {
      // Check circuit breaker
      const circuitBreaker = this.getOrCreateCircuitBreaker(operationName, options.circuitBreakerConfig);
      
      if (circuitBreaker.state === 'open') {
        console.log(`⚠️ [RESILIENCE] Circuit breaker OPEN for ${operationName}, using fallback`);
        
        if (options.fallbackOperation) {
          const fallbackResult = await options.fallbackOperation();
          fallbackUsed = true;
          
          return {
            success: true,
            data: fallbackResult,
            retryCount: 0,
            totalTime: performance.now() - startTime,
            qualityScore: options.qualityValidator?.(fallbackResult),
            fallbackUsed: true,
            circuitBreakerState: 'open'
          };
        } else {
          throw new Error(`Service ${operationName} is currently unavailable (circuit breaker open)`);
        }
      }

      // Execute with retry logic
      while (retryCount <= retryPolicy.maxRetries) {
        try {
          let result: T;
          
          // Execute with timeout if specified
          if (options.timeout) {
            result = await this.withTimeout(operation(), options.timeout);
          } else {
            result = await operation();
          }

          // Record success
          this.recordCircuitBreakerSuccess(operationName);
          this.updateHealthCheck(operationName, true, performance.now() - startTime);
          
          // Validate quality if validator provided
          const qualityScore = options.qualityValidator?.(result);
          
          // Check if result meets quality threshold
          if (qualityScore && qualityScore.overall < 0.6) {
            console.log(`⚠️ [RESILIENCE] Low quality result for ${operationName}:`, qualityScore.overall);
            
            // Try fallback if quality is too low
            if (options.fallbackOperation && retryCount === retryPolicy.maxRetries) {
              console.log(`🔄 [RESILIENCE] Using fallback due to low quality for ${operationName}`);
              const fallbackResult = await options.fallbackOperation();
              fallbackUsed = true;
              
              return {
                success: true,
                data: fallbackResult,
                retryCount,
                totalTime: performance.now() - startTime,
                qualityScore: options.qualityValidator?.(fallbackResult),
                fallbackUsed: true,
                circuitBreakerState: circuitBreaker.state
              };
            }
          }

          console.log(`✅ [RESILIENCE] Operation ${operationName} succeeded after ${retryCount} retries`);

          return {
            success: true,
            data: result,
            retryCount,
            totalTime: performance.now() - startTime,
            qualityScore,
            fallbackUsed: false,
            circuitBreakerState: circuitBreaker.state
          };

        } catch (error) {
          lastError = error as Error;
          retryCount++;
          
          console.log(`❌ [RESILIENCE] Operation ${operationName} failed (attempt ${retryCount}):`, error);
          
          // Record failure
          this.recordCircuitBreakerFailure(operationName);
          this.updateHealthCheck(operationName, false, performance.now() - startTime, lastError.message);
          this.recordError(operationName, lastError);

          // Check if error is retryable
          if (!this.isRetryableError(lastError, retryPolicy) || retryCount > retryPolicy.maxRetries) {
            break;
          }

          // Calculate delay with exponential backoff and jitter
          const delay = this.calculateRetryDelay(retryCount, retryPolicy);
          console.log(`⏳ [RESILIENCE] Retrying ${operationName} in ${delay}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // All retries exhausted, try fallback
      if (options.fallbackOperation) {
        console.log(`🔄 [RESILIENCE] All retries exhausted for ${operationName}, using fallback`);
        
        try {
          const fallbackResult = await options.fallbackOperation();
          fallbackUsed = true;
          
          return {
            success: true,
            data: fallbackResult,
            retryCount,
            totalTime: performance.now() - startTime,
            qualityScore: options.qualityValidator?.(fallbackResult),
            fallbackUsed: true,
            circuitBreakerState: circuitBreaker.state
          };
        } catch (fallbackError) {
          console.error(`❌ [RESILIENCE] Fallback also failed for ${operationName}:`, fallbackError);
          lastError = fallbackError as Error;
        }
      }

      // Complete failure
      return {
        success: false,
        error: lastError?.message || 'Operation failed',
        retryCount,
        totalTime: performance.now() - startTime,
        fallbackUsed,
        circuitBreakerState: circuitBreaker.state
      };

    } catch (error) {
      console.error(`❌ [RESILIENCE] Fatal error in resilient operation ${operationName}:`, error);
      
      return {
        success: false,
        error: (error as Error).message,
        retryCount,
        totalTime: performance.now() - startTime,
        fallbackUsed,
        circuitBreakerState: this.circuitBreakers.get(operationName)?.state
      };
    }
  }

  /**
   * Quality scoring for analysis results
   */
  calculateQualityScore(result: any): QualityScore {
    const factors: Array<{ name: string; score: number; weight: number; issues: string[] }> = [];

    // Accuracy factors
    const accuracyScore = this.evaluateAccuracy(result);
    factors.push({
      name: 'Accuracy',
      score: accuracyScore.score,
      weight: 0.3,
      issues: accuracyScore.issues
    });

    // Completeness factors
    const completenessScore = this.evaluateCompleteness(result);
    factors.push({
      name: 'Completeness',
      score: completenessScore.score,
      weight: 0.25,
      issues: completenessScore.issues
    });

    // Confidence factors
    const confidenceScore = this.evaluateConfidence(result);
    factors.push({
      name: 'Confidence',
      score: confidenceScore.score,
      weight: 0.25,
      issues: confidenceScore.issues
    });

    // Consistency factors
    const consistencyScore = this.evaluateConsistency(result);
    factors.push({
      name: 'Consistency',
      score: consistencyScore.score,
      weight: 0.2,
      issues: consistencyScore.issues
    });

    // Calculate weighted overall score
    const overallScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);

    return {
      overall: overallScore,
      accuracy: accuracyScore.score,
      completeness: completenessScore.score,
      confidence: confidenceScore.score,
      consistency: consistencyScore.score,
      factors
    };
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheckResult[];
    circuitBreakers: Array<{ name: string; state: string; failures: number }>;
    errorRates: Array<{ service: string; errorRate: number; recentErrors: number }>;
  } {
    const services = Array.from(this.healthChecks.values());
    const healthyServices = services.filter(s => s.healthy).length;
    const totalServices = services.length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (totalServices === 0) {
      overall = 'healthy';
    } else if (healthyServices === totalServices) {
      overall = 'healthy';
    } else if (healthyServices / totalServices > 0.5) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    const circuitBreakers = Array.from(this.circuitBreakers.values()).map(cb => ({
      name: cb.name,
      state: cb.state,
      failures: cb.failures
    }));

    const errorRates = Array.from(this.errorMetrics.entries()).map(([service, metrics]) => {
      const totalRequests = this.circuitBreakers.get(service)?.totalRequests || 1;
      return {
        service,
        errorRate: metrics.count / totalRequests,
        recentErrors: metrics.count
      };
    });

    return {
      overall,
      services,
      circuitBreakers,
      errorRates
    };
  }

  /**
   * Private helper methods
   */

  private getOrCreateCircuitBreaker(name: string, config?: Partial<typeof this.defaultCircuitBreakerConfig>): CircuitBreakerState {
    if (!this.circuitBreakers.has(name)) {
      const finalConfig = { ...this.defaultCircuitBreakerConfig, ...config };
      this.circuitBreakers.set(name, {
        name,
        state: 'closed',
        failures: 0,
        lastFailureTime: 0,
        successCount: 0,
        totalRequests: 0,
        threshold: finalConfig.threshold,
        timeout: finalConfig.timeout,
        halfOpenMaxRequests: finalConfig.halfOpenMaxRequests
      });
    }
    
    return this.circuitBreakers.get(name)!;
  }

  private recordCircuitBreakerSuccess(name: string): void {
    const cb = this.getOrCreateCircuitBreaker(name);
    cb.successCount++;
    cb.totalRequests++;
    
    if (cb.state === 'half-open') {
      if (cb.successCount >= cb.halfOpenMaxRequests) {
        cb.state = 'closed';
        cb.failures = 0;
        console.log(`✅ [RESILIENCE] Circuit breaker ${name} closed after successful recovery`);
      }
    }
  }

  private recordCircuitBreakerFailure(name: string): void {
    const cb = this.getOrCreateCircuitBreaker(name);
    cb.failures++;
    cb.totalRequests++;
    cb.lastFailureTime = Date.now();
    
    if (cb.state === 'closed' && cb.failures >= cb.threshold) {
      cb.state = 'open';
      console.log(`🚨 [RESILIENCE] Circuit breaker ${name} opened after ${cb.failures} failures`);
    } else if (cb.state === 'half-open') {
      cb.state = 'open';
      console.log(`🚨 [RESILIENCE] Circuit breaker ${name} reopened due to failure in half-open state`);
    }
  }

  private updateHealthCheck(service: string, healthy: boolean, responseTime: number, error?: string): void {
    this.healthChecks.set(service, {
      service,
      healthy,
      responseTime,
      error,
      lastChecked: Date.now()
    });
  }

  private recordError(service: string, error: Error): void {
    const current = this.errorMetrics.get(service) || { count: 0, lastError: 0, types: {} };
    current.count++;
    current.lastError = Date.now();
    
    const errorType = this.categorizeError(error);
    current.types[errorType] = (current.types[errorType] || 0) + 1;
    
    this.errorMetrics.set(service, current);
  }

  private isRetryableError(error: Error, policy: RetryPolicy): boolean {
    const errorMessage = error.message.toLowerCase();
    
    return policy.retryableErrors.some(retryableError => {
      const lowerRetryable = retryableError.toLowerCase();
      return errorMessage.includes(lowerRetryable) || 
             error.name.toLowerCase().includes(lowerRetryable);
    });
  }

  private calculateRetryDelay(retryCount: number, policy: RetryPolicy): number {
    let delay = policy.baseDelay * Math.pow(policy.backoffMultiplier, retryCount - 1);
    delay = Math.min(delay, policy.maxDelay);
    
    if (policy.jitter) {
      // Add random jitter ±25%
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }
    
    return Math.max(100, Math.floor(delay)); // Minimum 100ms delay
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('network')) return 'NETWORK';
    if (message.includes('500') || message.includes('internal server')) return 'SERVER_ERROR';
    if (message.includes('503') || message.includes('unavailable')) return 'SERVICE_UNAVAILABLE';
    if (message.includes('429') || message.includes('rate limit')) return 'RATE_LIMIT';
    if (message.includes('401') || message.includes('unauthorized')) return 'AUTH_ERROR';
    if (message.includes('404')) return 'NOT_FOUND';
    
    return 'UNKNOWN';
  }

  private evaluateAccuracy(result: any): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check for valid brand detection
    if (!result.brand || result.brand.toLowerCase().includes('unknown')) {
      score -= 0.2;
      issues.push('Brand not detected or marked as unknown');
    }

    // Check for valid size detection
    if (!result.size) {
      score -= 0.15;
      issues.push('Size not detected');
    }

    // Check for confidence score
    if (result.confidence && result.confidence < 0.7) {
      score -= 0.15;
      issues.push('Low confidence score from AI model');
    }

    // Check for category accuracy
    if (!result.item_type || result.item_type === 'Unknown') {
      score -= 0.1;
      issues.push('Item type not accurately detected');
    }

    return { score: Math.max(0, score), issues };
  }

  private evaluateCompleteness(result: any): { score: number; issues: string[] } {
    const issues: string[] = [];
    const requiredFields = ['title', 'brand', 'item_type', 'condition', 'color'];
    const optionalFields = ['size', 'material', 'pattern', 'style_keywords'];
    
    let score = 0;
    let requiredFieldsPresent = 0;
    let optionalFieldsPresent = 0;

    // Check required fields
    for (const field of requiredFields) {
      if (result[field] && result[field] !== 'Unknown') {
        requiredFieldsPresent++;
      } else {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Check optional fields
    for (const field of optionalFields) {
      if (result[field] && result[field] !== 'Unknown') {
        optionalFieldsPresent++;
      }
    }

    score = (requiredFieldsPresent / requiredFields.length) * 0.8 + 
           (optionalFieldsPresent / optionalFields.length) * 0.2;

    return { score, issues };
  }

  private evaluateConfidence(result: any): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check AI confidence
    if (result.confidence) {
      score = result.confidence;
      if (result.confidence < 0.8) {
        issues.push(`AI confidence below threshold: ${result.confidence}`);
      }
    } else {
      score = 0.7; // Default if no confidence provided
      issues.push('No confidence score provided');
    }

    // Check for evidence of analysis
    if (!result.evidence || result.evidence.length === 0) {
      score -= 0.1;
      issues.push('No evidence or reasoning provided for analysis');
    }

    return { score: Math.max(0, score), issues };
  }

  private evaluateConsistency(result: any): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check title consistency with detected fields
    if (result.title && result.brand) {
      if (!result.title.toLowerCase().includes(result.brand.toLowerCase())) {
        score -= 0.2;
        issues.push('Title does not include detected brand');
      }
    }

    // Check color consistency
    if (result.color && result.title) {
      const colorWords = result.color.toLowerCase().split(' ');
      const titleLower = result.title.toLowerCase();
      const colorInTitle = colorWords.some(color => titleLower.includes(color));
      
      if (!colorInTitle) {
        score -= 0.1;
        issues.push('Detected color not reflected in title');
      }
    }

    // Check size format consistency
    if (result.size && !/^[XSMLXL0-9]+$/.test(result.size.replace(/[-\s]/g, ''))) {
      score -= 0.1;
      issues.push('Size format appears inconsistent');
    }

    return { score: Math.max(0, score), issues };
  }

  private startHealthCheckMonitoring(): void {
    // Periodic health check cleanup
    setInterval(() => {
      const cutoffTime = Date.now() - 5 * 60 * 1000; // 5 minutes
      
      for (const [service, health] of this.healthChecks.entries()) {
        if (health.lastChecked < cutoffTime) {
          console.log(`⚠️ [RESILIENCE] Health check expired for ${service}`);
          this.healthChecks.delete(service);
        }
      }
    }, 60000); // Check every minute
  }

  private startCircuitBreakerCleanup(): void {
    // Periodic circuit breaker state management
    setInterval(() => {
      const now = Date.now();
      
      for (const cb of this.circuitBreakers.values()) {
        if (cb.state === 'open' && (now - cb.lastFailureTime) > cb.timeout) {
          cb.state = 'half-open';
          cb.successCount = 0;
          console.log(`🔄 [RESILIENCE] Circuit breaker ${cb.name} transitioned to half-open`);
        }
      }
    }, 30000); // Check every 30 seconds
  }
}

// Singleton instance
export const errorResilience = new ErrorResilienceService();