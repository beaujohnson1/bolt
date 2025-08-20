/**
 * Circuit Breaker Pattern Implementation for eBay API Integration
 * Prevents cascading failures and provides fallback mechanisms during outages
 */

class CircuitBreakerError extends Error {
  constructor(message, state, lastFailure = null) {
    super(message);
    this.name = 'CircuitBreakerError';
    this.state = state;
    this.lastFailure = lastFailure;
    this.timestamp = new Date().toISOString();
  }
}

class EBayCircuitBreaker {
  constructor(options = {}) {
    this.config = {
      // Failure thresholds
      failureThreshold: options.failureThreshold || 5,
      recoveryThreshold: options.recoveryThreshold || 3,
      
      // Timeout settings
      timeout: options.timeout || 30000, // 30 seconds
      resetTimeout: options.resetTimeout || 60000, // 1 minute
      
      // Success rate monitoring
      successRateThreshold: options.successRateThreshold || 0.5, // 50%
      minimumRequestsForRate: options.minimumRequestsForRate || 10,
      
      // Volume-based triggering
      volumeThreshold: options.volumeThreshold || 10,
      
      // Monitoring window
      monitoringWindowSize: options.monitoringWindowSize || 120000, // 2 minutes
      
      // Fallback options
      enableFallback: options.enableFallback !== false,
      fallbackTimeout: options.fallbackTimeout || 5000,
      
      ...options
    };

    // Circuit breaker states
    this.states = {
      CLOSED: 'CLOSED',
      OPEN: 'OPEN',
      HALF_OPEN: 'HALF_OPEN'
    };

    // Current state
    this.state = this.states.CLOSED;
    
    // Failure tracking
    this.failures = [];
    this.successes = [];
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    
    // Timing
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.stateChangeTime = Date.now();
    
    // Half-open state tracking
    this.halfOpenAttempts = 0;
    this.halfOpenSuccesses = 0;
    
    // Metrics
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      circuitOpenCount: 0,
      circuitHalfOpenCount: 0,
      fallbackExecutions: 0,
      averageResponseTime: 0,
      lastStateChange: new Date().toISOString()
    };

    // Fallback functions
    this.fallbackHandlers = new Map();
    
    // Event listeners
    this.eventListeners = new Map();
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(operation, context = {}) {
    this.metrics.totalRequests++;
    
    // Check circuit state before execution
    if (this.state === this.states.OPEN) {
      return this.handleOpenCircuit(context);
    }

    const startTime = Date.now();
    
    try {
      // Set timeout for the operation
      const result = await this.executeWithTimeout(operation, context);
      
      // Record success
      this.recordSuccess(Date.now() - startTime);
      
      return result;
      
    } catch (error) {
      // Record failure
      this.recordFailure(error, Date.now() - startTime);
      
      // Check if circuit should open
      this.evaluateCircuitState();
      
      // Try fallback if available
      if (this.state === this.states.OPEN && this.config.enableFallback) {
        return this.executeFallback(context, error);
      }
      
      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  async executeWithTimeout(operation, context) {
    return Promise.race([
      operation(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
        }, this.config.timeout);
      })
    ]);
  }

  /**
   * Handle requests when circuit is open
   */
  async handleOpenCircuit(context) {
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    
    // Check if reset timeout has passed
    if (timeSinceLastFailure >= this.config.resetTimeout) {
      this.transitionToHalfOpen();
      // Allow this request to proceed in half-open state
      return this.execute(context.operation, context);
    }
    
    // Circuit is still open, try fallback
    if (this.config.enableFallback) {
      return this.executeFallback(context, new CircuitBreakerError(
        'Circuit breaker is OPEN',
        this.state,
        this.getLastFailure()
      ));
    }
    
    throw new CircuitBreakerError(
      `Circuit breaker is OPEN. Reset timeout: ${this.config.resetTimeout - timeSinceLastFailure}ms`,
      this.state,
      this.getLastFailure()
    );
  }

  /**
   * Execute fallback function
   */
  async executeFallback(context, originalError) {
    this.metrics.fallbackExecutions++;
    
    const fallbackKey = context.fallbackKey || 'default';
    const fallbackHandler = this.fallbackHandlers.get(fallbackKey);
    
    if (!fallbackHandler) {
      throw new CircuitBreakerError(
        `No fallback handler available for ${fallbackKey}`,
        this.state,
        originalError
      );
    }

    try {
      // Execute fallback with timeout
      const fallbackResult = await Promise.race([
        fallbackHandler(context, originalError),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Fallback timeout after ${this.config.fallbackTimeout}ms`));
          }, this.config.fallbackTimeout);
        })
      ]);

      // Emit fallback execution event
      this.emit('fallbackExecuted', {
        fallbackKey,
        context,
        originalError,
        result: fallbackResult
      });

      return {
        data: fallbackResult,
        fromFallback: true,
        originalError: originalError.message
      };

    } catch (fallbackError) {
      throw new CircuitBreakerError(
        `Fallback execution failed: ${fallbackError.message}`,
        this.state,
        originalError
      );
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(responseTime) {
    this.metrics.totalSuccesses++;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses++;
    this.lastSuccessTime = Date.now();
    
    // Add to success tracking
    this.successes.push({
      timestamp: Date.now(),
      responseTime
    });
    
    // Update average response time
    this.updateAverageResponseTime(responseTime);
    
    // Clean old successes
    this.cleanOldRecords(this.successes);
    
    // Handle half-open state
    if (this.state === this.states.HALF_OPEN) {
      this.halfOpenSuccesses++;
      
      if (this.halfOpenSuccesses >= this.config.recoveryThreshold) {
        this.transitionToClosed();
      }
    }
    
    this.emit('success', { responseTime, consecutiveSuccesses: this.consecutiveSuccesses });
  }

  /**
   * Record failed operation
   */
  recordFailure(error, responseTime = null) {
    this.metrics.totalFailures++;
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    
    // Add to failure tracking
    this.failures.push({
      timestamp: Date.now(),
      error: error.message,
      responseTime,
      type: this.classifyError(error)
    });
    
    // Clean old failures
    this.cleanOldRecords(this.failures);
    
    this.emit('failure', { 
      error, 
      responseTime, 
      consecutiveFailures: this.consecutiveFailures 
    });
  }

  /**
   * Classify error type for better handling
   */
  classifyError(error) {
    if (error.message.includes('timeout')) return 'TIMEOUT';
    if (error.message.includes('rate limit')) return 'RATE_LIMIT';
    if (error.statusCode >= 500) return 'SERVER_ERROR';
    if (error.statusCode === 503) return 'SERVICE_UNAVAILABLE';
    if (error.code === 'ECONNRESET') return 'CONNECTION_RESET';
    if (error.code === 'ENOTFOUND') return 'DNS_ERROR';
    return 'UNKNOWN';
  }

  /**
   * Evaluate whether circuit should change state
   */
  evaluateCircuitState() {
    const now = Date.now();
    const recentFailures = this.failures.filter(f => 
      now - f.timestamp <= this.config.monitoringWindowSize
    );
    const recentSuccesses = this.successes.filter(s => 
      now - s.timestamp <= this.config.monitoringWindowSize
    );
    
    const totalRecentRequests = recentFailures.length + recentSuccesses.length;
    
    // Don't evaluate if we don't have enough data
    if (totalRecentRequests < this.config.minimumRequestsForRate) {
      return;
    }
    
    // Check failure threshold
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.transitionToOpen();
      return;
    }
    
    // Check success rate
    const successRate = recentSuccesses.length / totalRecentRequests;
    if (successRate < this.config.successRateThreshold && 
        totalRecentRequests >= this.config.volumeThreshold) {
      this.transitionToOpen();
      return;
    }
    
    // Check for specific error patterns
    const criticalErrors = recentFailures.filter(f => 
      ['SERVER_ERROR', 'SERVICE_UNAVAILABLE', 'TIMEOUT'].includes(f.type)
    );
    
    if (criticalErrors.length >= Math.ceil(this.config.failureThreshold * 0.6)) {
      this.transitionToOpen();
    }
  }

  /**
   * Transition to OPEN state
   */
  transitionToOpen() {
    if (this.state !== this.states.OPEN) {
      this.state = this.states.OPEN;
      this.stateChangeTime = Date.now();
      this.metrics.circuitOpenCount++;
      this.metrics.lastStateChange = new Date().toISOString();
      
      this.emit('stateChange', {
        from: this.getPreviousState(),
        to: this.state,
        reason: 'Failure threshold exceeded',
        consecutiveFailures: this.consecutiveFailures
      });
      
      console.warn(`Circuit breaker OPENED due to ${this.consecutiveFailures} consecutive failures`);
    }
  }

  /**
   * Transition to HALF_OPEN state
   */
  transitionToHalfOpen() {
    this.state = this.states.HALF_OPEN;
    this.stateChangeTime = Date.now();
    this.halfOpenAttempts = 0;
    this.halfOpenSuccesses = 0;
    this.metrics.circuitHalfOpenCount++;
    this.metrics.lastStateChange = new Date().toISOString();
    
    this.emit('stateChange', {
      from: this.states.OPEN,
      to: this.state,
      reason: 'Reset timeout elapsed',
      timeInOpenState: Date.now() - this.stateChangeTime
    });
    
    console.info('Circuit breaker transitioned to HALF_OPEN');
  }

  /**
   * Transition to CLOSED state
   */
  transitionToClosed() {
    this.state = this.states.CLOSED;
    this.stateChangeTime = Date.now();
    this.consecutiveFailures = 0;
    this.metrics.lastStateChange = new Date().toISOString();
    
    this.emit('stateChange', {
      from: this.states.HALF_OPEN,
      to: this.state,
      reason: 'Recovery threshold met',
      successfulAttempts: this.halfOpenSuccesses
    });
    
    console.info('Circuit breaker CLOSED - service recovered');
  }

  /**
   * Clean old records from tracking arrays
   */
  cleanOldRecords(records) {
    const cutoffTime = Date.now() - this.config.monitoringWindowSize;
    while (records.length > 0 && records[0].timestamp < cutoffTime) {
      records.shift();
    }
  }

  /**
   * Update average response time metric
   */
  updateAverageResponseTime(responseTime) {
    const totalSuccesses = this.metrics.totalSuccesses;
    const currentAverage = this.metrics.averageResponseTime;
    
    this.metrics.averageResponseTime = 
      ((currentAverage * (totalSuccesses - 1)) + responseTime) / totalSuccesses;
  }

  /**
   * Get the last failure information
   */
  getLastFailure() {
    return this.failures.length > 0 ? this.failures[this.failures.length - 1] : null;
  }

  /**
   * Get previous state (for transition tracking)
   */
  getPreviousState() {
    // This is a simplified version - in production, you'd track state history
    if (this.state === this.states.OPEN) return this.states.CLOSED;
    if (this.state === this.states.HALF_OPEN) return this.states.OPEN;
    return this.states.CLOSED;
  }

  /**
   * Register a fallback handler
   */
  registerFallback(key, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Fallback handler must be a function');
    }
    
    this.fallbackHandlers.set(key, handler);
  }

  /**
   * Remove a fallback handler
   */
  removeFallback(key) {
    return this.fallbackHandlers.delete(key);
  }

  /**
   * Get current circuit state and metrics
   */
  getStatus() {
    const now = Date.now();
    const timeInCurrentState = now - this.stateChangeTime;
    
    return {
      state: this.state,
      timeInCurrentState,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      halfOpenAttempts: this.halfOpenAttempts,
      halfOpenSuccesses: this.halfOpenSuccesses,
      nextRetryTime: this.state === this.states.OPEN ? 
        this.lastFailureTime + this.config.resetTimeout : null,
      metrics: { ...this.metrics },
      recentActivity: this.getRecentActivity()
    };
  }

  /**
   * Get recent activity summary
   */
  getRecentActivity() {
    const now = Date.now();
    const recentFailures = this.failures.filter(f => 
      now - f.timestamp <= this.config.monitoringWindowSize
    );
    const recentSuccesses = this.successes.filter(s => 
      now - s.timestamp <= this.config.monitoringWindowSize
    );
    
    return {
      windowSize: this.config.monitoringWindowSize,
      recentFailures: recentFailures.length,
      recentSuccesses: recentSuccesses.length,
      successRate: recentSuccesses.length + recentFailures.length > 0 ? 
        recentSuccesses.length / (recentSuccesses.length + recentFailures.length) : 0,
      errorBreakdown: this.getErrorBreakdown(recentFailures)
    };
  }

  /**
   * Get breakdown of error types
   */
  getErrorBreakdown(failures) {
    const breakdown = {};
    failures.forEach(failure => {
      breakdown[failure.type] = (breakdown[failure.type] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Force circuit state (for testing)
   */
  forceState(newState) {
    if (!Object.values(this.states).includes(newState)) {
      throw new Error(`Invalid state: ${newState}`);
    }
    
    const oldState = this.state;
    this.state = newState;
    this.stateChangeTime = Date.now();
    
    this.emit('stateChange', {
      from: oldState,
      to: newState,
      reason: 'Forced state change'
    });
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset() {
    this.state = this.states.CLOSED;
    this.failures = [];
    this.successes = [];
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.halfOpenAttempts = 0;
    this.halfOpenSuccesses = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.stateChangeTime = Date.now();
    
    // Reset metrics
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      circuitOpenCount: 0,
      circuitHalfOpenCount: 0,
      fallbackExecutions: 0,
      averageResponseTime: 0,
      lastStateChange: new Date().toISOString()
    };
    
    this.emit('reset');
  }

  /**
   * Event listener management
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }

  /**
   * Remove event listener
   */
  off(event, listener) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in circuit breaker event listener:`, error);
      }
    });
  }

  /**
   * Start monitoring and cleanup
   */
  startMonitoring() {
    // Clean up old records every minute
    this.cleanupTimer = setInterval(() => {
      this.cleanOldRecords(this.failures);
      this.cleanOldRecords(this.successes);
    }, 60000);
  }

  /**
   * Stop monitoring and cleanup
   */
  stopMonitoring() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Shutdown circuit breaker
   */
  shutdown() {
    this.stopMonitoring();
    this.eventListeners.clear();
    this.fallbackHandlers.clear();
  }
}

module.exports = { EBayCircuitBreaker, CircuitBreakerError };