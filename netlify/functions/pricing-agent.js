export const handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🎯 [PRICING-AGENT] Function invoked:', {
      method: event.httpMethod,
      path: event.path,
      hasBody: !!event.body
    });

    const { httpMethod, path } = event;
    
    // Parse request body if present
    let requestBody = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        console.error('❌ [PRICING-AGENT] Invalid JSON in request body:', e);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON in request body' })
        };
      }
    }

    // Route requests based on path and method
    if (path.includes('/pricing-agent/recommend') && httpMethod === 'POST') {
      return await handlePricingRecommendation(requestBody);
    } else if (path.includes('/pricing-agent/market-data') && httpMethod === 'POST') {
      return await handleMarketDataCollection(requestBody);
    } else if (path.includes('/pricing-agent/performance') && httpMethod === 'POST') {
      return await handlePerformanceTracking(requestBody);
    } else if (path.includes('/pricing-agent/trends') && httpMethod === 'GET') {
      return await handleTrendAnalysis();
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Pricing agent endpoint not found' })
      };
    }

  } catch (error) {
    console.error('❌ [PRICING-AGENT] Unexpected error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

/**
 * Generate pricing recommendation for an item
 */
async function handlePricingRecommendation(body) {
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    console.log('🎯 [PRICING-AGENT] Generating pricing recommendation for:', body.itemData?.title);
    
    const { itemId, userId, itemData } = body;
    
    if (!itemId || !userId || !itemData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: itemId, userId, itemData' })
      };
    }

    // Mock pricing recommendation logic
    // In production, this would:
    // 1. Call eBay API to get recent sold listings
    // 2. Analyze pricing patterns
    // 3. Apply seasonality and demand factors
    // 4. Generate recommendation with confidence score

    const mockRecommendation = {
      recommended_price: calculateMockPrice(itemData),
      confidence_score: 0.85,
      price_range_min: calculateMockPrice(itemData) * 0.85,
      price_range_max: calculateMockPrice(itemData) * 1.15,
      market_data_points: 47,
      average_sold_price: calculateMockPrice(itemData) * 0.95,
      median_sold_price: calculateMockPrice(itemData) * 0.93,
      days_on_market_avg: 8,
      seasonality_factor: getCurrentSeasonalityFactor(itemData.category),
      demand_trend: getMockDemandTrend(),
      insights: [
        'Based on 47 similar sold listings',
        'Peak season pricing applied',
        'Market demand is stable'
      ]
    };

    console.log('✅ [PRICING-AGENT] Pricing recommendation generated:', {
      price: mockRecommendation.recommended_price,
      confidence: mockRecommendation.confidence_score
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        recommendation: mockRecommendation,
        marketData: generateMockMarketData(itemData),
        competitiveAnalysis: {
          similarListingsCount: 23,
          avgCompetitorPrice: mockRecommendation.recommended_price * 1.08,
          pricePosition: 'competitive'
        },
        bestTimeToList: {
          dayOfWeek: 'Sunday',
          timeOfDay: 'evening'
        }
      })
    };

  } catch (error) {
    console.error('❌ [PRICING-AGENT] Error generating pricing recommendation:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate pricing recommendation' })
    };
  }
}

/**
 * Collect market data for analysis
 */
async function handleMarketDataCollection(body) {
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    console.log('📊 [PRICING-AGENT] Collecting market data for:', body.searchQuery);
    
    const { searchQuery, category, brand } = body;
    
    if (!searchQuery) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required field: searchQuery' })
      };
    }

    // Mock market data collection
    const marketData = generateMockMarketData({ 
      title: searchQuery, 
      category, 
      brand 
    });

    console.log('✅ [PRICING-AGENT] Market data collected:', marketData.length, 'items');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: marketData,
        searchQuery,
        category,
        brand,
        collectedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ [PRICING-AGENT] Error collecting market data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to collect market data' })
    };
  }
}

/**
 * Track pricing performance
 */
async function handlePerformanceTracking(body) {
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    console.log('📈 [PRICING-AGENT] Tracking pricing performance for:', body.itemId);
    
    const { itemId, recommendedPrice, actualSoldPrice, daysToSell } = body;
    
    if (!itemId || !recommendedPrice) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: itemId, recommendedPrice' })
      };
    }

    // Calculate accuracy score if item was sold
    let accuracyScore = null;
    if (actualSoldPrice) {
      const priceDiff = Math.abs(actualSoldPrice - recommendedPrice);
      const priceAvg = (actualSoldPrice + recommendedPrice) / 2;
      accuracyScore = Math.max(0, 1 - (priceDiff / priceAvg));
    }

    const performanceData = {
      itemId,
      recommendedPrice,
      actualSoldPrice,
      daysToSell,
      accuracyScore,
      trackedAt: new Date().toISOString()
    };

    console.log('✅ [PRICING-AGENT] Performance tracked:', {
      accuracy: accuracyScore ? (accuracyScore * 100).toFixed(1) + '%' : 'pending'
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        performance: performanceData
      })
    };

  } catch (error) {
    console.error('❌ [PRICING-AGENT] Error tracking performance:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to track pricing performance' })
    };
  }
}

/**
 * Analyze market trends
 */
async function handleTrendAnalysis() {
  const headers = { 'Content-Type': 'application/json' };
  
  try {
    console.log('📊 [PRICING-AGENT] Analyzing market trends');
    
    const trends = {
      categories: [
        { name: 'Clothing', trend: 'increasing', changePercent: 8.5, volume: 1250 },
        { name: 'Electronics', trend: 'stable', changePercent: 1.2, volume: 890 },
        { name: 'Shoes', trend: 'decreasing', changePercent: -3.7, volume: 654 },
        { name: 'Accessories', trend: 'increasing', changePercent: 12.3, volume: 432 },
      ],
      seasonality: {
        currentFactor: getCurrentSeasonalityFactor('general'),
        nextMonthPrediction: 1.15,
        peakSeason: 'November-December'
      },
      marketHealth: {
        overallTrend: 'positive',
        volatilityIndex: 0.23,
        liquidityScore: 0.78
      },
      updatedAt: new Date().toISOString()
    };

    console.log('✅ [PRICING-AGENT] Market trends analyzed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        trends
      })
    };

  } catch (error) {
    console.error('❌ [PRICING-AGENT] Error analyzing trends:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to analyze market trends' })
    };
  }
}

/**
 * Helper functions
 */
function calculateMockPrice(itemData) {
  // Mock pricing logic based on item characteristics
  let basePrice = 25;
  
  if (itemData.brand) {
    const premiumBrands = ['nike', 'adidas', 'apple', 'coach', 'levi'];
    if (premiumBrands.some(brand => 
      itemData.brand.toLowerCase().includes(brand)
    )) {
      basePrice += 20;
    }
  }
  
  if (itemData.category) {
    const categoryMultipliers = {
      'electronics': 2.5,
      'clothing': 1.8,
      'shoes': 2.0,
      'accessories': 1.5
    };
    
    const multiplier = Object.entries(categoryMultipliers).find(([cat]) => 
      itemData.category.toLowerCase().includes(cat)
    )?.[1] || 1.2;
    
    basePrice *= multiplier;
  }
  
  if (itemData.condition) {
    const conditionMultipliers = {
      'new': 1.3,
      'like_new': 1.2,
      'excellent': 1.1,
      'good': 1.0,
      'fair': 0.8,
      'poor': 0.6
    };
    
    const multiplier = conditionMultipliers[itemData.condition] || 1.0;
    basePrice *= multiplier;
  }
  
  // Add some randomness to simulate market variation
  const variation = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
  basePrice *= variation;
  
  return Math.round(basePrice * 100) / 100;
}

function getCurrentSeasonalityFactor(category) {
  const currentMonth = new Date().getMonth() + 1;
  
  const seasonalFactors = {
    'clothing': {
      1: 0.8, 2: 0.85, 3: 1.0, 4: 1.1, 5: 1.0, 6: 0.9,
      7: 0.8, 8: 1.0, 9: 1.2, 10: 1.1, 11: 1.3, 12: 1.0
    },
    'electronics': {
      1: 0.9, 2: 0.9, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0,
      7: 1.0, 8: 1.1, 9: 1.1, 10: 1.1, 11: 1.4, 12: 1.2
    },
    'default': {
      1: 0.9, 2: 0.95, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0,
      7: 0.95, 8: 1.0, 9: 1.05, 10: 1.1, 11: 1.2, 12: 1.0
    }
  };
  
  const categoryKey = category ? category.toLowerCase() : 'default';
  const factors = seasonalFactors[categoryKey] || seasonalFactors['default'];
  
  return factors[currentMonth] || 1.0;
}

function getMockDemandTrend() {
  const trends = ['increasing', 'stable', 'decreasing'];
  const weights = [0.4, 0.4, 0.2]; // 40% increasing, 40% stable, 20% decreasing
  
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < trends.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      return trends[i];
    }
  }
  
  return 'stable';
}

function generateMockMarketData(itemData) {
  const basePrice = calculateMockPrice(itemData);
  const marketData = [];
  
  // Generate 15-30 mock market data points
  const count = 15 + Math.floor(Math.random() * 15);
  
  for (let i = 0; i < count; i++) {
    const priceVariation = 0.7 + (Math.random() * 0.6); // 0.7 to 1.3
    const soldPrice = Math.round(basePrice * priceVariation * 100) / 100;
    
    // Generate sold date within last 90 days
    const daysAgo = Math.floor(Math.random() * 90);
    const soldDate = new Date();
    soldDate.setDate(soldDate.getDate() - daysAgo);
    
    marketData.push({
      search_query: itemData.title || 'unknown',
      brand: itemData.brand,
      category: itemData.category,
      condition: itemData.condition || 'good',
      title: generateMockTitle(itemData),
      sold_price: soldPrice,
      sold_date: soldDate.toISOString(),
      shipping_cost: Math.round((3 + Math.random() * 12) * 100) / 100,
      platform: 'ebay',
      view_count: Math.floor(Math.random() * 200),
      bid_count: Math.floor(Math.random() * 15),
      watch_count: Math.floor(Math.random() * 50),
      days_to_sell: 1 + Math.floor(Math.random() * 21)
    });
  }
  
  return marketData.sort((a, b) => 
    new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime()
  );
}

function generateMockTitle(itemData) {
  const templates = [
    `${itemData.brand || 'Brand'} ${itemData.category || 'Item'} ${itemData.size || 'Size'} ${itemData.color || 'Color'}`,
    `${itemData.category || 'Item'} by ${itemData.brand || 'Brand'} - ${itemData.condition || 'Good'} Condition`,
    `${itemData.brand || 'Brand'} ${itemData.category || 'Item'} - ${itemData.size || 'One Size'} - ${itemData.color || 'Multi'}`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)]
    .replace(/\s+/g, ' ')
    .trim();
}