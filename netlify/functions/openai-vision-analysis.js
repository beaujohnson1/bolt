const OpenAI = require('openai');

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    console.log('Function started with body:', event.body);

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { imageUrl, analysisType = 'comprehensive' } = JSON.parse(event.body);

    if (!imageUrl) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'imageUrl is required' })
      };
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY environment variable not set');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview", // As specified by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: getAnalysisPrompt(analysisType)
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high" // Important for clothing analysis
              }
            }
          ]
        }
      ],
      max_tokens: 1500, // Increase token limit
      temperature: 0.1  // Lower temperature for consistent results
    });

    const analysis = response.choices.message.content;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        analysis: analysis,
        usage: response.usage
      })
    };

  } catch (error) {
    console.error('OpenAI Vision Analysis Error:', error);

    // Return detailed error info for debugging
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    });
  }
};

function getAnalysisPrompt(analysisType) {
  // This function should return a prompt based on analysisType
  // For now, it returns a generic prompt as provided in the bug report
  return `Analyze this clothing item for resale listing. Provide response in this JSON format:
{
  "brand": "detected brand or 'Unknown'",
  "itemType": "specific item type (e.g., 'leggings', 't-shirt', 'hoodie')",
  "condition": "New with Tags/New without Tags/Excellent/Good/Fair/Poor",
  "size": "detected size or null",
  "color": "primary color",
  "materials": ["list", "of", "materials"],
  "defects": ["list", "of", "any", "defects"],
  "style": "style category",
  "confidence": 0.85
}`;
}