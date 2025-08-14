// PERFORMANCE OPTIMIZATION: Function warming and monitoring utility
const functionWarmupCache = new Map();
const performanceMetrics = new Map();

// Warm-up configuration
const WARMUP_FUNCTIONS = [
  'analyze-image',
  'optimized-vision-analysis', 
  'openai-vision-analysis',
  'pricing-agent'
];

// Performance monitoring
let totalRequests = 0;
let totalErrors = 0;
let averageResponseTime = 0;

// Function to warm up cold starts
exports.warmupFunction = async (functionName) => {
  const warmupKey = `warmup_${functionName}`;
  const lastWarmup = functionWarmupCache.get(warmupKey);
  const now = Date.now();
  
  // Warm up every 10 minutes to prevent cold starts
  if (!lastWarmup || (now - lastWarmup) > 10 * 60 * 1000) {
    console.log(`🔥 [WARMUP] Warming up function: ${functionName}`);
    functionWarmupCache.set(warmupKey, now);
    return true;
  }
  
  return false;
};

// Performance tracking wrapper
exports.trackPerformance = (functionName, handler) => {
  return async (event, context) => {
    const startTime = Date.now();
    totalRequests++;
    
    try {
      // Check if function needs warmup
      exports.warmupFunction(functionName);
      
      // Execute the actual handler
      const result = await handler(event, context);
      
      // Track successful execution
      const responseTime = Date.now() - startTime;
      exports.recordMetric(functionName, responseTime, true);
      
      // Add performance headers
      if (result.headers) {
        result.headers['X-Function-Performance'] = responseTime.toString();
        result.headers['X-Function-Name'] = functionName;
      }
      
      return result;
    } catch (error) {
      totalErrors++;
      const responseTime = Date.now() - startTime;
      exports.recordMetric(functionName, responseTime, false);
      
      console.error(`❌ [PERF] ${functionName} failed in ${responseTime}ms:`, error);
      throw error;
    }
  };
};

// Record performance metrics
exports.recordMetric = (functionName, responseTime, success) => {
  const key = `${functionName}_metrics`;
  const existing = performanceMetrics.get(key) || {
    totalCalls: 0,
    totalTime: 0,
    errors: 0,
    averageTime: 0
  };
  
  existing.totalCalls++;
  existing.totalTime += responseTime;
  if (!success) existing.errors++;
  existing.averageTime = existing.totalTime / existing.totalCalls;
  
  performanceMetrics.set(key, existing);
  
  // Update global average
  averageResponseTime = (averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
  
  console.log(`📊 [PERF] ${functionName}: ${responseTime}ms (avg: ${existing.averageTime.toFixed(2)}ms)`);
};

// Get performance statistics
exports.getPerformanceStats = () => {
  const stats = {
    global: {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
      averageResponseTime: averageResponseTime.toFixed(2)
    },
    functions: {}
  };
  
  for (const [key, metrics] of performanceMetrics.entries()) {
    const functionName = key.replace('_metrics', '');
    stats.functions[functionName] = {
      ...metrics,
      errorRate: metrics.totalCalls > 0 ? (metrics.errors / metrics.totalCalls) * 100 : 0,
      averageTime: metrics.averageTime.toFixed(2)
    };
  }
  
  return stats;
};

// Pre-warming scheduler (called by netlify-plugin-scheduled-functions if available)
exports.scheduleWarmup = async () => {
  console.log('🔥 [WARMUP] Starting scheduled warmup for all functions...');
  
  const warmupPromises = WARMUP_FUNCTIONS.map(async (functionName) => {
    try {
      const warmedUp = exports.warmupFunction(functionName);
      if (warmedUp) {
        console.log(`✅ [WARMUP] Warmed up: ${functionName}`);
      }
    } catch (error) {
      console.error(`❌ [WARMUP] Failed to warm up ${functionName}:`, error);
    }
  });
  
  await Promise.allSettled(warmupPromises);
  console.log('🏁 [WARMUP] Scheduled warmup completed');
};

// Bundle size optimization utility
exports.optimizeResponse = (data, compress = true) => {
  if (!data) return data;
  
  // Remove unnecessary fields for smaller payloads
  const optimized = { ...data };
  
  // Remove debug information in production
  if (process.env.NODE_ENV === 'production') {
    delete optimized.debug;
    delete optimized.preprocessing;
    delete optimized.rawAnalysis;
  }
  
  // Compress large text fields
  if (compress && optimized.description && optimized.description.length > 500) {
    optimized.description = optimized.description.substring(0, 500) + '...';
  }
  
  return optimized;
};

// Memory usage monitoring
exports.getMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      rss: Math.round(usage.rss / 1024 / 1024) // MB
    };
  }
  return null;
};