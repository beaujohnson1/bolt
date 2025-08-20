/**
 * eBay API Performance Monitor and Metrics Collection System
 * Comprehensive monitoring of API performance, health, and business metrics
 */

class EBayPerformanceMonitor {
  constructor(options = {}) {
    this.config = {
      // Metrics collection intervals
      metricsInterval: options.metricsInterval || 30000, // 30 seconds
      healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
      
      // Performance thresholds
      responseTimeThresholds: {
        good: options.responseTimeThresholds?.good || 1000, // 1 second
        warning: options.responseTimeThresholds?.warning || 3000, // 3 seconds
        critical: options.responseTimeThresholds?.critical || 10000 // 10 seconds
      },
      
      // Success rate thresholds
      successRateThresholds: {
        good: options.successRateThresholds?.good || 0.99, // 99%
        warning: options.successRateThresholds?.warning || 0.95, // 95%
        critical: options.successRateThresholds?.critical || 0.9 // 90%
      },
      
      // Data retention
      metricsRetentionDays: options.metricsRetentionDays || 30,
      detailedMetricsRetentionHours: options.detailedMetricsRetentionHours || 24,
      
      // Alert settings
      enableAlerts: options.enableAlerts !== false,
      alertCooldownPeriod: options.alertCooldownPeriod || 300000, // 5 minutes
      
      // Storage options
      persistMetrics: options.persistMetrics !== false,
      metricsStoragePath: options.metricsStoragePath || './metrics',
      
      ...options
    };

    // Real-time metrics
    this.realTimeMetrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        lastMinute: [],
        lastHour: [],
        lastDay: []
      },
      
      responseTime: {
        current: 0,
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
        min: Infinity,
        max: 0
      },
      
      endpoints: new Map(), // Per-endpoint metrics
      errors: new Map(), // Error tracking
      
      businessMetrics: {
        revenue: 0,
        itemsListed: 0,
        itemsSold: 0,
        averageSellingPrice: 0,
        conversionRate: 0
      }
    };

    // Historical data storage
    this.historicalData = {
      hourly: [],
      daily: [],
      weekly: []
    };

    // Performance tracking
    this.performanceWindows = {
      minute: { requests: [], responseTimes: [] },
      hour: { requests: [], responseTimes: [] },
      day: { requests: [], responseTimes: [] }
    };

    // Alert state
    this.alertState = {
      lastAlerts: new Map(),
      activeAlerts: new Set(),
      alertHistory: []
    };

    // Health status
    this.healthStatus = {
      overall: 'HEALTHY',
      components: new Map(),
      lastCheck: null,
      issues: []
    };

    // Active monitoring
    this.isMonitoring = false;
    this.intervals = new Map();

    // Event listeners
    this.eventListeners = new Map();

    // Initialize
    this.initialize();
  }

  /**
   * Initialize the performance monitor
   */
  async initialize() {
    // Load historical data if persistence is enabled
    if (this.config.persistMetrics) {
      await this.loadHistoricalData();
    }

    // Initialize endpoint tracking
    this.initializeEndpointTracking();

    // Start monitoring
    this.startMonitoring();

    this.emit('initialized');
  }

  /**
   * Initialize endpoint-specific tracking
   */
  initializeEndpointTracking() {
    const commonEndpoints = [
      '/browse/v1/item_summary/search',
      '/sell/inventory/v1/inventory_item',
      '/sell/account/v1/return_policy',
      '/sell/marketing/v1/campaign',
      '/commerce/charity/v1/charity_org'
    ];

    commonEndpoints.forEach(endpoint => {
      this.realTimeMetrics.endpoints.set(endpoint, {
        requests: 0,
        successes: 0,
        failures: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        lastRequestTime: null,
        errors: new Map()
      });
    });
  }

  /**
   * Record API request metrics
   */
  recordRequest(requestData) {
    const timestamp = Date.now();
    const {
      endpoint,
      method,
      responseTime,
      statusCode,
      success,
      error,
      requestSize,
      responseSize,
      userId,
      itemId
    } = requestData;

    // Update overall metrics
    this.updateOverallMetrics(responseTime, success, timestamp);

    // Update endpoint-specific metrics
    this.updateEndpointMetrics(endpoint, responseTime, success, error);

    // Update performance windows
    this.updatePerformanceWindows(timestamp, responseTime, success);

    // Track errors
    if (!success && error) {
      this.trackError(error, endpoint, statusCode);
    }

    // Update business metrics if applicable
    this.updateBusinessMetrics(requestData);

    // Check for alerts
    if (this.config.enableAlerts) {
      this.checkAlertConditions();
    }

    // Emit metrics event
    this.emit('requestRecorded', {
      endpoint,
      responseTime,
      success,
      timestamp
    });
  }

  /**
   * Update overall system metrics
   */
  updateOverallMetrics(responseTime, success, timestamp) {
    const metrics = this.realTimeMetrics;
    
    // Request counts
    metrics.requests.total++;
    if (success) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
    }

    // Response time metrics
    metrics.responseTime.current = responseTime;
    metrics.responseTime.min = Math.min(metrics.responseTime.min, responseTime);
    metrics.responseTime.max = Math.max(metrics.responseTime.max, responseTime);

    // Update average response time
    const totalRequests = metrics.requests.total;
    const currentAverage = metrics.responseTime.average;
    metrics.responseTime.average = 
      ((currentAverage * (totalRequests - 1)) + responseTime) / totalRequests;

    // Add to time-based collections
    metrics.requests.lastMinute.push({ timestamp, success, responseTime });
    metrics.requests.lastHour.push({ timestamp, success, responseTime });
    metrics.requests.lastDay.push({ timestamp, success, responseTime });

    // Clean old data
    this.cleanTimeBasedData();
  }

  /**
   * Update endpoint-specific metrics
   */
  updateEndpointMetrics(endpoint, responseTime, success, error) {
    if (!this.realTimeMetrics.endpoints.has(endpoint)) {
      this.realTimeMetrics.endpoints.set(endpoint, {
        requests: 0,
        successes: 0,
        failures: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        lastRequestTime: null,
        errors: new Map()
      });
    }

    const endpointMetrics = this.realTimeMetrics.endpoints.get(endpoint);
    
    endpointMetrics.requests++;
    endpointMetrics.totalResponseTime += responseTime;
    endpointMetrics.averageResponseTime = 
      endpointMetrics.totalResponseTime / endpointMetrics.requests;
    endpointMetrics.lastRequestTime = Date.now();

    if (success) {
      endpointMetrics.successes++;
    } else {
      endpointMetrics.failures++;
      
      if (error) {
        const errorKey = error.code || error.message || 'UNKNOWN_ERROR';
        const currentCount = endpointMetrics.errors.get(errorKey) || 0;
        endpointMetrics.errors.set(errorKey, currentCount + 1);
      }
    }
  }

  /**
   * Update performance windows for trend analysis
   */
  updatePerformanceWindows(timestamp, responseTime, success) {
    const windows = this.performanceWindows;
    
    // Add to all windows
    Object.values(windows).forEach(window => {
      window.requests.push({ timestamp, success });
      window.responseTimes.push({ timestamp, responseTime });
    });

    // Clean old data from windows
    const now = timestamp;
    const oneMinute = 60 * 1000;
    const oneHour = 60 * oneMinute;
    const oneDay = 24 * oneHour;

    this.cleanWindow(windows.minute, now - oneMinute);
    this.cleanWindow(windows.hour, now - oneHour);
    this.cleanWindow(windows.day, now - oneDay);
  }

  /**
   * Clean old data from performance window
   */
  cleanWindow(window, cutoffTime) {
    window.requests = window.requests.filter(r => r.timestamp > cutoffTime);
    window.responseTimes = window.responseTimes.filter(r => r.timestamp > cutoffTime);
  }

  /**
   * Track error occurrences
   */
  trackError(error, endpoint, statusCode) {
    const errorKey = `${statusCode || 'UNKNOWN'}_${error.code || error.message || 'UNKNOWN'}`;
    
    if (!this.realTimeMetrics.errors.has(errorKey)) {
      this.realTimeMetrics.errors.set(errorKey, {
        count: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        endpoints: new Set(),
        examples: []
      });
    }

    const errorData = this.realTimeMetrics.errors.get(errorKey);
    errorData.count++;
    errorData.lastSeen = Date.now();
    errorData.endpoints.add(endpoint);
    
    // Keep last 5 error examples
    if (errorData.examples.length >= 5) {
      errorData.examples.shift();
    }
    errorData.examples.push({
      timestamp: Date.now(),
      endpoint,
      statusCode,
      message: error.message
    });
  }

  /**
   * Update business metrics
   */
  updateBusinessMetrics(requestData) {
    const { endpoint, success, responseData } = requestData;

    if (!success || !responseData) return;

    // Track revenue-generating activities
    if (endpoint.includes('/sell/') && responseData.itemSold) {
      this.realTimeMetrics.businessMetrics.itemsSold++;
      
      if (responseData.salePrice) {
        this.realTimeMetrics.businessMetrics.revenue += responseData.salePrice;
        this.updateAverageSellingPrice(responseData.salePrice);
      }
    }

    // Track listings
    if (endpoint.includes('/inventory_item') && requestData.method === 'POST') {
      this.realTimeMetrics.businessMetrics.itemsListed++;
    }

    // Update conversion rate
    this.updateConversionRate();
  }

  /**
   * Update average selling price
   */
  updateAverageSellingPrice(salePrice) {
    const metrics = this.realTimeMetrics.businessMetrics;
    const itemsSold = metrics.itemsSold;
    const currentAverage = metrics.averageSellingPrice;
    
    metrics.averageSellingPrice = 
      ((currentAverage * (itemsSold - 1)) + salePrice) / itemsSold;
  }

  /**
   * Update conversion rate
   */
  updateConversionRate() {
    const metrics = this.realTimeMetrics.businessMetrics;
    
    if (metrics.itemsListed > 0) {
      metrics.conversionRate = metrics.itemsSold / metrics.itemsListed;
    }
  }

  /**
   * Calculate percentiles for response times
   */
  calculatePercentiles() {
    const window = this.performanceWindows.hour;
    const responseTimes = window.responseTimes.map(r => r.responseTime).sort((a, b) => a - b);
    
    if (responseTimes.length === 0) return;

    const metrics = this.realTimeMetrics.responseTime;
    
    metrics.median = this.getPercentile(responseTimes, 50);
    metrics.p95 = this.getPercentile(responseTimes, 95);
    metrics.p99 = this.getPercentile(responseTimes, 99);
  }

  /**
   * Get percentile value from sorted array
   */
  getPercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Check for alert conditions
   */
  checkAlertConditions() {
    const now = Date.now();
    
    // Check response time alerts
    this.checkResponseTimeAlerts(now);
    
    // Check success rate alerts
    this.checkSuccessRateAlerts(now);
    
    // Check error rate alerts
    this.checkErrorRateAlerts(now);
    
    // Check business metrics alerts
    this.checkBusinessMetricsAlerts(now);
  }

  /**
   * Check response time alert conditions
   */
  checkResponseTimeAlerts(now) {
    const currentResponseTime = this.realTimeMetrics.responseTime.current;
    const averageResponseTime = this.realTimeMetrics.responseTime.average;
    
    if (currentResponseTime > this.config.responseTimeThresholds.critical) {
      this.triggerAlert('CRITICAL_RESPONSE_TIME', {
        currentResponseTime,
        threshold: this.config.responseTimeThresholds.critical
      }, now);
    } else if (averageResponseTime > this.config.responseTimeThresholds.warning) {
      this.triggerAlert('HIGH_AVERAGE_RESPONSE_TIME', {
        averageResponseTime,
        threshold: this.config.responseTimeThresholds.warning
      }, now);
    }
  }

  /**
   * Check success rate alert conditions
   */
  checkSuccessRateAlerts(now) {
    const window = this.performanceWindows.minute;
    const recentRequests = window.requests;
    
    if (recentRequests.length < 10) return; // Need minimum requests
    
    const successfulRequests = recentRequests.filter(r => r.success).length;
    const successRate = successfulRequests / recentRequests.length;
    
    if (successRate < this.config.successRateThresholds.critical) {
      this.triggerAlert('CRITICAL_SUCCESS_RATE', {
        successRate,
        threshold: this.config.successRateThresholds.critical
      }, now);
    } else if (successRate < this.config.successRateThresholds.warning) {
      this.triggerAlert('LOW_SUCCESS_RATE', {
        successRate,
        threshold: this.config.successRateThresholds.warning
      }, now);
    }
  }

  /**
   * Check error rate alerts
   */
  checkErrorRateAlerts(now) {
    const recentErrors = Array.from(this.realTimeMetrics.errors.values())
      .filter(error => now - error.lastSeen < 60000); // Last minute
    
    if (recentErrors.length > 10) { // More than 10 different errors in last minute
      this.triggerAlert('HIGH_ERROR_VARIETY', {
        errorCount: recentErrors.length
      }, now);
    }
  }

  /**
   * Check business metrics alerts
   */
  checkBusinessMetricsAlerts(now) {
    const metrics = this.realTimeMetrics.businessMetrics;
    
    // Alert if conversion rate drops significantly
    if (metrics.itemsListed > 50 && metrics.conversionRate < 0.1) {
      this.triggerAlert('LOW_CONVERSION_RATE', {
        conversionRate: metrics.conversionRate
      }, now);
    }
  }

  /**
   * Trigger an alert
   */
  triggerAlert(alertType, data, timestamp) {
    const lastAlert = this.alertState.lastAlerts.get(alertType);
    
    // Check cooldown period
    if (lastAlert && timestamp - lastAlert < this.config.alertCooldownPeriod) {
      return;
    }

    const alert = {
      type: alertType,
      data,
      timestamp,
      id: `${alertType}_${timestamp}`
    };

    this.alertState.lastAlerts.set(alertType, timestamp);
    this.alertState.activeAlerts.add(alertType);
    this.alertState.alertHistory.push(alert);

    // Keep only last 100 alerts in history
    if (this.alertState.alertHistory.length > 100) {
      this.alertState.alertHistory.shift();
    }

    this.emit('alert', alert);
    console.warn(`ALERT [${alertType}]:`, data);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertType) {
    if (this.alertState.activeAlerts.has(alertType)) {
      this.alertState.activeAlerts.delete(alertType);
      
      this.emit('alertResolved', { type: alertType, timestamp: Date.now() });
      console.info(`ALERT RESOLVED [${alertType}]`);
    }
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    const healthResults = {
      overall: 'HEALTHY',
      components: new Map(),
      issues: [],
      timestamp: Date.now()
    };

    // Check API response times
    const avgResponseTime = this.realTimeMetrics.responseTime.average;
    if (avgResponseTime > this.config.responseTimeThresholds.critical) {
      healthResults.components.set('response_time', 'CRITICAL');
      healthResults.issues.push('Critical response times detected');
      healthResults.overall = 'CRITICAL';
    } else if (avgResponseTime > this.config.responseTimeThresholds.warning) {
      healthResults.components.set('response_time', 'WARNING');
      healthResults.issues.push('High response times detected');
      if (healthResults.overall === 'HEALTHY') {
        healthResults.overall = 'WARNING';
      }
    } else {
      healthResults.components.set('response_time', 'HEALTHY');
    }

    // Check success rate
    const window = this.performanceWindows.hour;
    if (window.requests.length > 0) {
      const successRate = window.requests.filter(r => r.success).length / window.requests.length;
      
      if (successRate < this.config.successRateThresholds.critical) {
        healthResults.components.set('success_rate', 'CRITICAL');
        healthResults.issues.push('Critical success rate detected');
        healthResults.overall = 'CRITICAL';
      } else if (successRate < this.config.successRateThresholds.warning) {
        healthResults.components.set('success_rate', 'WARNING');
        healthResults.issues.push('Low success rate detected');
        if (healthResults.overall === 'HEALTHY') {
          healthResults.overall = 'WARNING';
        }
      } else {
        healthResults.components.set('success_rate', 'HEALTHY');
      }
    }

    // Check for active alerts
    if (this.alertState.activeAlerts.size > 0) {
      healthResults.components.set('alerts', 'WARNING');
      healthResults.issues.push(`${this.alertState.activeAlerts.size} active alerts`);
      if (healthResults.overall === 'HEALTHY') {
        healthResults.overall = 'WARNING';
      }
    } else {
      healthResults.components.set('alerts', 'HEALTHY');
    }

    this.healthStatus = healthResults;
    this.emit('healthCheck', healthResults);

    return healthResults;
  }

  /**
   * Get comprehensive metrics report
   */
  getMetricsReport() {
    this.calculatePercentiles();
    
    return {
      timestamp: Date.now(),
      realTimeMetrics: this.sanitizeMetrics(this.realTimeMetrics),
      healthStatus: {
        ...this.healthStatus,
        components: Object.fromEntries(this.healthStatus.components)
      },
      alerts: {
        active: Array.from(this.alertState.activeAlerts),
        recent: this.alertState.alertHistory.slice(-10)
      },
      performanceWindows: this.getPerformanceWindowSummary(),
      topErrors: this.getTopErrors(),
      endpointPerformance: this.getEndpointPerformanceSummary()
    };
  }

  /**
   * Sanitize metrics for reporting (convert Maps to Objects)
   */
  sanitizeMetrics(metrics) {
    return {
      ...metrics,
      endpoints: Object.fromEntries(
        Array.from(metrics.endpoints.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            errors: Object.fromEntries(value.errors)
          }
        ])
      ),
      errors: Object.fromEntries(
        Array.from(metrics.errors.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            endpoints: Array.from(value.endpoints)
          }
        ])
      )
    };
  }

  /**
   * Get performance window summary
   */
  getPerformanceWindowSummary() {
    const summary = {};
    
    Object.entries(this.performanceWindows).forEach(([window, data]) => {
      const requests = data.requests;
      const responseTimes = data.responseTimes.map(r => r.responseTime);
      
      summary[window] = {
        totalRequests: requests.length,
        successfulRequests: requests.filter(r => r.success).length,
        successRate: requests.length > 0 ? 
          requests.filter(r => r.success).length / requests.length : 0,
        averageResponseTime: responseTimes.length > 0 ? 
          responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
        minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0
      };
    });
    
    return summary;
  }

  /**
   * Get top errors by frequency
   */
  getTopErrors(limit = 10) {
    return Array.from(this.realTimeMetrics.errors.entries())
      .map(([errorKey, errorData]) => ({
        error: errorKey,
        count: errorData.count,
        lastSeen: errorData.lastSeen,
        endpoints: Array.from(errorData.endpoints),
        recentExample: errorData.examples[errorData.examples.length - 1]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get endpoint performance summary
   */
  getEndpointPerformanceSummary(limit = 10) {
    return Array.from(this.realTimeMetrics.endpoints.entries())
      .map(([endpoint, metrics]) => ({
        endpoint,
        requests: metrics.requests,
        successRate: metrics.requests > 0 ? metrics.successes / metrics.requests : 0,
        averageResponseTime: metrics.averageResponseTime,
        errorCount: metrics.failures,
        lastRequestTime: metrics.lastRequestTime
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit);
  }

  /**
   * Clean time-based data to prevent memory leaks
   */
  cleanTimeBasedData() {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    const oneHour = 60 * oneMinute;
    const oneDay = 24 * oneHour;

    // Clean minute data
    this.realTimeMetrics.requests.lastMinute = 
      this.realTimeMetrics.requests.lastMinute.filter(r => now - r.timestamp < oneMinute);

    // Clean hour data
    this.realTimeMetrics.requests.lastHour = 
      this.realTimeMetrics.requests.lastHour.filter(r => now - r.timestamp < oneHour);

    // Clean day data
    this.realTimeMetrics.requests.lastDay = 
      this.realTimeMetrics.requests.lastDay.filter(r => now - r.timestamp < oneDay);
  }

  /**
   * Start monitoring intervals
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Metrics collection interval
    this.intervals.set('metrics', setInterval(() => {
      this.calculatePercentiles();
      this.cleanTimeBasedData();
    }, this.config.metricsInterval));

    // Health check interval
    this.intervals.set('healthCheck', setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval));

    // Historical data aggregation interval (every 5 minutes)
    this.intervals.set('historicalAggregation', setInterval(() => {
      this.aggregateHistoricalData();
    }, 300000));

    console.log('Performance monitoring started');
  }

  /**
   * Stop monitoring intervals
   */
  stopMonitoring() {
    this.isMonitoring = false;

    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
    });
    this.intervals.clear();

    console.log('Performance monitoring stopped');
  }

  /**
   * Aggregate data for historical analysis
   */
  aggregateHistoricalData() {
    const now = Date.now();
    const metrics = this.realTimeMetrics;

    // Create hourly aggregation
    const hourlyData = {
      timestamp: now,
      totalRequests: metrics.requests.total,
      successRate: metrics.requests.total > 0 ? 
        metrics.requests.successful / metrics.requests.total : 0,
      averageResponseTime: metrics.responseTime.average,
      revenue: metrics.businessMetrics.revenue,
      itemsListed: metrics.businessMetrics.itemsListed,
      itemsSold: metrics.businessMetrics.itemsSold
    };

    this.historicalData.hourly.push(hourlyData);

    // Keep only last 24 hours of hourly data
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    this.historicalData.hourly = this.historicalData.hourly.filter(
      data => data.timestamp > oneDayAgo
    );

    // Persist if enabled
    if (this.config.persistMetrics) {
      this.persistHistoricalData();
    }
  }

  /**
   * Load historical data from storage
   */
  async loadHistoricalData() {
    try {
      const fs = require('fs').promises;
      const dataPath = `${this.config.metricsStoragePath}/historical.json`;
      
      const data = await fs.readFile(dataPath, 'utf8');
      this.historicalData = JSON.parse(data);
      
      console.log('Loaded historical metrics data');
    } catch (error) {
      console.log('No historical data found or failed to load');
    }
  }

  /**
   * Persist historical data to storage
   */
  async persistHistoricalData() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Ensure directory exists
      await fs.mkdir(this.config.metricsStoragePath, { recursive: true });
      
      const dataPath = `${this.config.metricsStoragePath}/historical.json`;
      await fs.writeFile(dataPath, JSON.stringify(this.historicalData, null, 2));
      
    } catch (error) {
      console.error('Failed to persist historical data:', error.message);
    }
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

  off(event, listener) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in performance monitor event listener:`, error);
      }
    });
  }

  /**
   * Shutdown monitor
   */
  shutdown() {
    this.stopMonitoring();
    
    if (this.config.persistMetrics) {
      this.persistHistoricalData();
    }
    
    this.eventListeners.clear();
  }
}

module.exports = EBayPerformanceMonitor;