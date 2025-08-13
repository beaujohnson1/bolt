// Test endpoint to verify OpenAI GPT-4 Vision integration
const OpenAI = require('openai');
const { config, validateConfig } = require('./_shared/config');

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod === 'GET') {
    // Simple connection test
    try {
      console.log('🧪 [TEST-OPENAI] Testing basic OpenAI connection...');
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: "Hello, this is a test. Please respond with 'OpenAI connection successful'."
          }
        ],
        max_tokens: 50
      });

      console.log('✅ [TEST-OPENAI] Connection test successful');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'OpenAI connection successful',
          response: response.choices[0].message.content,
          model: 'gpt-3.5-turbo',
          timestamp: new Date().toISOString()
        })
      };
    } catch (error) {
      console.error('❌ [TEST-OPENAI] Connection test failed:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        })
      };
    }
  }

  if (event.httpMethod === 'POST') {
    // GPT-4 Vision test with sample image
    try {
      const { imageBase64, testType = 'vision' } = JSON.parse(event.body);
      
      if (!imageBase64) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'imageBase64 is required for vision test'
          })
        };
      }

      console.log('🧪 [TEST-OPENAI] Testing GPT-4 Vision with provided image...');
      
      const prompt = `You are testing GPT-4 Vision integration for a clothing resale app. Analyze this image and return a JSON response with:

{
  "test_status": "success",
  "can_see_image": true,
  "description": "brief description of what you see",
  "detected_items": ["list", "of", "items", "you", "can", "identify"],
  "text_visible": "any text you can read",
  "confidence": 0.95,
  "recommendations": "any suggestions for the app"
}

Return ONLY the JSON object.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      });

      console.log('✅ [TEST-OPENAI] GPT-4 Vision test successful');
      
      let parsedResult;
      try {
        parsedResult = JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        // If JSON parsing fails, return the raw response
        parsedResult = {
          test_status: "partial_success",
          raw_response: response.choices[0].message.content,
          parse_error: parseError.message
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          test_type: 'gpt-4-vision',
          result: parsedResult,
          usage: response.usage,
          timestamp: new Date().toISOString()
        })
      };
    } catch (error) {
      console.error('❌ [TEST-OPENAI] GPT-4 Vision test failed:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message,
          error_type: error.name,
          timestamp: new Date().toISOString()
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};