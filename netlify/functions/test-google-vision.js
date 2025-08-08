// Test endpoint to verify Google Vision API integration
const { getVisionClient, testVisionConnection } = require('./_shared/googleVisionClient');

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
      console.log('🧪 [TEST-GOOGLE-VISION] Testing Google Vision API connection...');
      
      const result = await testVisionConnection();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: result.success,
          message: result.message,
          timestamp: new Date().toISOString(),
          environment: {
            hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
            credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64?.length || 0
          }
        })
      };
    } catch (error) {
      console.error('❌ [TEST-GOOGLE-VISION] Connection test failed:', error);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
          environment: {
            hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
            credentialsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64?.length || 0
          }
        })
      };
    }
  }

  if (event.httpMethod === 'POST') {
    // OCR test with provided image
    try {
      const { imageBase64, imageUrl } = JSON.parse(event.body);
      
      if (!imageBase64 && !imageUrl) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'imageBase64 or imageUrl is required for OCR test'
          })
        };
      }

      console.log('🧪 [TEST-GOOGLE-VISION] Testing OCR with provided image...');
      
      const visionClient = getVisionClient();
      
      // Use provided image data
      const imageContent = imageBase64 || imageUrl;
      let requestImage;
      
      if (imageUrl && imageUrl.startsWith('http')) {
        // Fetch image from URL
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        requestImage = { content: Buffer.from(buffer).toString('base64') };
      } else {
        // Use base64 content directly
        const base64Content = imageContent.startsWith('data:') 
          ? imageContent.split(',')[1] 
          : imageContent;
        requestImage = { content: base64Content };
      }
      
      const [result] = await visionClient.textDetection({
        image: requestImage
      });

      const extractedText = result?.fullTextAnnotation?.text || '';
      const textAnnotations = result?.textAnnotations || [];
      
      console.log('✅ [TEST-GOOGLE-VISION] OCR test successful');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          test_type: 'google-vision-ocr',
          result: {
            extractedText: extractedText,
            textLength: extractedText.length,
            annotationCount: textAnnotations.length,
            hasText: extractedText.length > 0,
            annotations: textAnnotations.slice(0, 5).map(annotation => ({
              description: annotation.description,
              confidence: annotation.confidence
            }))
          },
          timestamp: new Date().toISOString()
        })
      };
    } catch (error) {
      console.error('❌ [TEST-GOOGLE-VISION] OCR test failed:', error);
      
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