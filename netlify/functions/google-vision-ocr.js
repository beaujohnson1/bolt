const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Initialize Google Vision client
let visionClient;

function getVisionClient() {
  if (!visionClient) {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
    
    if (!credentials) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable not set');
    }

    try {
      const credentialsJson = Buffer.from(credentials, 'base64').toString('utf8');
      const credentialsObj = JSON.parse(credentialsJson);
      
      visionClient = new ImageAnnotatorClient({
        credentials: credentialsObj,
        projectId: credentialsObj.project_id
      });
      
      console.log('✅ [GOOGLE-VISION] Vision client initialized');
    } catch (error) {
      console.error('❌ [GOOGLE-VISION] Error initializing client:', error);
      throw new Error('Failed to initialize Google Vision client');
    }
  }
  
  return visionClient;
}

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
    const { imageUrl, imageBase64 } = JSON.parse(event.body || '{}');
    
    if (!imageUrl && !imageBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'imageUrl or imageBase64 is required' 
        })
      };
    }

    console.log('📝 [GOOGLE-VISION] Starting OCR text detection...');
    
    const client = getVisionClient();
    
    let imageContent;
    if (imageBase64) {
      // Use provided base64 content
      imageContent = { content: imageBase64 };
    } else if (imageUrl) {
      // Fetch image from URL and convert to base64
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      imageContent = { content: Buffer.from(buffer).toString('base64') };
    }
    
    // Call Google Vision API
    const [result] = await client.textDetection({
      image: imageContent
    });

    const extractedText = result?.fullTextAnnotation?.text || '';
    const textAnnotations = result?.textAnnotations || [];
    
    console.log('✅ [GOOGLE-VISION] OCR completed:', {
      textLength: extractedText.length,
      annotationCount: textAnnotations.length
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        extractedText: extractedText,
        textAnnotations: textAnnotations.slice(0, 10), // Limit for response size
        textLength: extractedText.length
      })
    };

  } catch (error) {
    console.error('❌ [GOOGLE-VISION] OCR failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        extractedText: '', // Fallback empty text
        textAnnotations: []
      })
    };
  }
};