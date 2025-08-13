const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: (process.env.OPENAI_KEY || process.env.OPENAI_API_KEY),
});

// System prompt for the AI Reseller Coach
const SYSTEM_PROMPT = `You are an expert AI Reseller Coach for EasyFlip, a platform that helps people sell items on eBay and other marketplaces. Your role is to help users optimize their reselling business using data-driven insights.

Your expertise includes:
- Analyzing eBay sales data and market trends
- Identifying fast-selling vs slow-selling items
- Optimizing profit margins and pricing strategies
- Recommending sourcing strategies and inventory management
- Providing timing insights (best days/times to list)
- Category-specific selling advice
- Market trend analysis and seasonal patterns

You have access to the user's selling history and can provide personalized recommendations. Always be helpful, encouraging, and data-driven in your responses. Use specific examples and actionable advice.

Keep responses conversational but informative, and always focus on helping the user make more money through smarter selling strategies.`;

// Knowledge base for common reselling topics
const KNOWLEDGE_BASE = {
  pricing: {
    strategies: [
      "Research completed listings, not just active ones",
      "Price 10-15% below average for faster sales",
      "Use psychological pricing ($19.99 vs $20.00)",
      "Consider seasonal demand fluctuations"
    ],
    timing: [
      "Electronics sell best Thursday-Sunday evenings",
      "Clothing peaks on weekends",
      "Home items perform well Monday-Wednesday",
      "End auctions Sunday 7-9 PM EST for maximum bids"
    ]
  },
  sourcing: {
    locations: [
      "Estate sales (40% higher profit margins than thrift stores)",
      "Garage sales (best early morning for selection)",
      "Thrift stores (check new arrivals daily)",
      "Clearance sections at retail stores",
      "Online liquidation sites"
    ],
    tips: [
      "Focus on items you know well initially",
      "Look for brand names and quality materials",
      "Check sold listings before purchasing",
      "Build relationships with regular sources"
    ]
  },
  categories: {
    high_profit: ["Electronics", "Designer clothing", "Collectibles", "Jewelry"],
    fast_moving: ["Popular electronics", "Trendy clothing", "Seasonal items"],
    consistent: ["Books", "Home goods", "Tools", "Vintage items"]
  }
};

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message, userContext } = JSON.parse(event.body);
    
    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    console.log('Processing AI Coach request:', message);

    // Enhance the user message with context from knowledge base
    const enhancedContext = buildContextualPrompt(message, userContext);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: enhancedContext
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    console.log('AI Coach response generated successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: aiResponse,
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens,
          completion_tokens: completion.usage?.completion_tokens,
          total_tokens: completion.usage?.total_tokens
        }
      })
    };

  } catch (error) {
    console.error('AI Coach error:', error);
    
    // Provide fallback response for common queries
    const fallbackResponse = generateFallbackResponse(event.body);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        response: fallbackResponse,
        fallback: true
      })
    };
  }
};

function buildContextualPrompt(message, userContext = {}) {
  let contextualPrompt = message;
  
  // Add user context if available
  if (userContext.totalSales) {
    contextualPrompt += `\n\nUser Context: This user has made ${userContext.totalSales} sales with $${userContext.totalRevenue} in revenue.`;
  }
  
  // Add relevant knowledge base information based on message content
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('pric')) {
    contextualPrompt += `\n\nPricing Strategies: ${KNOWLEDGE_BASE.pricing.strategies.join(', ')}`;
  }
  
  if (messageLower.includes('sourc') || messageLower.includes('find') || messageLower.includes('buy')) {
    contextualPrompt += `\n\nSourcing Tips: ${KNOWLEDGE_BASE.sourcing.tips.join(', ')}`;
  }
  
  if (messageLower.includes('time') || messageLower.includes('when')) {
    contextualPrompt += `\n\nTiming Insights: ${KNOWLEDGE_BASE.pricing.timing.join(', ')}`;
  }
  
  return contextualPrompt;
}

function generateFallbackResponse(requestBody) {
  try {
    const { message } = JSON.parse(requestBody);
    const messageLower = message.toLowerCase();
    
    // Pricing questions
    if (messageLower.includes('pric')) {
      return "💰 For optimal pricing, I recommend researching completed listings (not just active ones) and pricing 10-15% below the average for faster sales. Electronics typically sell best Thursday-Sunday evenings, while clothing peaks on weekends. Would you like specific pricing advice for a particular category?";
    }
    
    // Sourcing questions
    if (messageLower.includes('sourc') || messageLower.includes('find') || messageLower.includes('buy')) {
      return "🎯 Great sourcing locations include estate sales (40% higher profit margins), garage sales (go early!), and thrift store new arrivals. Focus on items you know well initially, and always check sold listings before purchasing. What type of items are you looking to source?";
    }
    
    // Category questions
    if (messageLower.includes('categor') || messageLower.includes('sell')) {
      return "📊 High-profit categories include electronics, designer clothing, collectibles, and jewelry. Fast-moving items are popular electronics and trendy clothing. Books, home goods, and vintage items provide consistent sales. What category interests you most?";
    }
    
    // Timing questions
    if (messageLower.includes('time') || messageLower.includes('when')) {
      return "⏰ Timing is crucial! Electronics sell best Thursday-Sunday evenings, clothing peaks on weekends, and home items perform well Monday-Wednesday. For auctions, end them Sunday 7-9 PM EST for maximum bids. What type of items are you timing?";
    }
    
    // General/default response
    return "👋 I'm here to help optimize your reselling business! I can provide insights on pricing strategies, sourcing locations, market trends, and timing optimization. What specific aspect of your reselling business would you like to improve?";
    
  } catch (error) {
    return "👋 I'm your AI Reseller Coach! I can help with pricing strategies, sourcing tips, market analysis, and business optimization. What would you like to know about reselling?";
  }
}