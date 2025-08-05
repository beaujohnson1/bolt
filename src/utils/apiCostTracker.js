// Track API usage and costs
export const trackAPIUsage = {
  logUsage: async (userId, apiType, tokensUsed, cost) => {
    // Store in your database or analytics service
    console.log(`📊 [API-COST] Usage - User: ${userId}, Type: ${apiType}, Tokens: ${tokensUsed}, Cost: $${cost}`);
    
    // You can extend this to store in Supabase or another analytics service
    // Example:
    // await supabase.from('api_usage').insert({
    //   user_id: userId,
    //   api_type: apiType,
    //   tokens_used: tokensUsed,
    //   cost: cost,
    //   timestamp: new Date().toISOString()
    // });
  },
  
  calculateOpenAICost: (tokensUsed, model = 'gpt-4-vision-preview') => {
    // GPT-4 Vision pricing: ~$0.01 per image for standard quality
    // High detail images cost more
    const costs = {
      'gpt-4-vision-preview': 0.01, // Base cost per image
      'gpt-3.5-turbo': 0.002 // Per 1K tokens
    };
    
    if (model === 'gpt-4-vision-preview') {
      return costs[model]; // Fixed cost per image
    } else {
      return (tokensUsed / 1000) * costs[model]; // Per token cost
    }
  },
  
  calculateGoogleVisionCost: (featuresUsed) => {
    // Google Vision API pricing: $1.50 per 1000 units for most features
    const costPerUnit = 0.0015;
    return featuresUsed * costPerUnit;
  },
  
  checkUserLimits: async (userId, subscriptionPlan = 'free') => {
    // Define limits based on subscription plan
    const limits = {
      free: { monthly_calls: 50, daily_calls: 5 },
      pro: { monthly_calls: 500, daily_calls: 50 },
      enterprise: { monthly_calls: 5000, daily_calls: 500 }
    };
    
    const userLimits = limits[subscriptionPlan] || limits.free;
    
    // In a real implementation, you'd check against stored usage data
    // For now, return mock data
    const mockUsage = {
      monthly_calls_used: Math.floor(Math.random() * userLimits.monthly_calls * 0.7),
      daily_calls_used: Math.floor(Math.random() * userLimits.daily_calls * 0.5)
    };
    
    const canUseAPI = 
      mockUsage.monthly_calls_used < userLimits.monthly_calls &&
      mockUsage.daily_calls_used < userLimits.daily_calls;
    
    return {
      canUseAPI,
      remainingCalls: {
        monthly: userLimits.monthly_calls - mockUsage.monthly_calls_used,
        daily: userLimits.daily_calls - mockUsage.daily_calls_used
      },
      usage: mockUsage,
      limits: userLimits
    };
  },
  
  estimateTotalCost: (googleVisionFeatures, useOpenAI = true) => {
    const googleCost = trackAPIUsage.calculateGoogleVisionCost(googleVisionFeatures);
    const openaiCost = useOpenAI ? trackAPIUsage.calculateOpenAICost(0, 'gpt-4-vision-preview') : 0;
    
    return {
      google_vision: googleCost,
      openai_vision: openaiCost,
      total: googleCost + openaiCost
    };
  }
};

// Usage tracking middleware for API calls
export const withUsageTracking = async (userId, apiCall, apiType, estimatedTokens = 0) => {
  const startTime = Date.now();
  
  try {
    const result = await apiCall();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Calculate cost based on API type
    let cost = 0;
    if (apiType === 'openai-vision') {
      cost = trackAPIUsage.calculateOpenAICost(estimatedTokens, 'gpt-4-vision-preview');
    } else if (apiType === 'google-vision') {
      cost = trackAPIUsage.calculateGoogleVisionCost(1); // 1 unit for basic analysis
    }
    
    // Log usage
    await trackAPIUsage.logUsage(userId, apiType, estimatedTokens, cost);
    
    console.log(`⏱️ [API-TRACKING] ${apiType} completed in ${duration}ms, cost: $${cost}`);
    
    return {
      ...result,
      metadata: {
        duration,
        cost,
        api_type: apiType
      }
    };
  } catch (error) {
    console.error(`❌ [API-TRACKING] ${apiType} failed:`, error);
    throw error;
  }
};