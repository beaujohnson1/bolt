const { ImageAnnotatorClient } = require('@google-cloud/vision');

/**
 * Create Google Vision client using Base64-encoded credentials from environment
 * This approach works in Netlify's serverless environment
 */
function getVisionClient() {
  console.log('🔑 [GOOGLE-VISION] Initializing Vision client from environment credentials...');
  
  const b64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;

  if (!b64) {
    console.error('❌ [GOOGLE-VISION] Missing GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable');
    throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable. Please set this in Netlify site settings.');
  }

  try {
    // Decode Base64 and parse JSON credentials
    const credentialsJson = Buffer.from(b64, 'base64').toString('utf8');
    const credentials = JSON.parse(credentialsJson);
    
    console.log('✅ [GOOGLE-VISION] Credentials decoded successfully');
    console.log('🔍 [GOOGLE-VISION] Project ID:', credentials.project_id);
    console.log('🔍 [GOOGLE-VISION] Client email:', credentials.client_email);

    // Create and return Vision client
    const client = new ImageAnnotatorClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
        project_id: credentials.project_id
      },
      projectId: credentials.project_id
    });

    console.log('✅ [GOOGLE-VISION] Vision client initialized successfully');
    return client;
    
  } catch (error) {
    console.error('❌ [GOOGLE-VISION] Error initializing Vision client:', error);
    
    if (error.message.includes('Unexpected token')) {
      throw new Error('Invalid Base64 credentials format. Please check GOOGLE_APPLICATION_CREDENTIALS_BASE64 encoding.');
    }
    
    throw new Error(`Failed to initialize Google Vision client: ${error.message}`);
  }
}

/**
 * Test Google Vision API connection
 */
async function testVisionConnection() {
  try {
    console.log('🧪 [GOOGLE-VISION] Testing Vision API connection...');
    
    const client = getVisionClient();
    
    // Create a simple 1x1 pixel test image in base64
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // Test with a simple text detection call
    const [result] = await client.textDetection({
      image: { content: testImageBase64 }
    });
    
    console.log('✅ [GOOGLE-VISION] Connection test successful');
    return {
      success: true,
      message: 'Google Vision API connection successful',
      textAnnotations: result.textAnnotations?.length || 0
    };
    
  } catch (error) {
    console.error('❌ [GOOGLE-VISION] Connection test failed:', error);
    return {
      success: false,
      message: `Connection test failed: ${error.message}`,
      error: error.message
    };
  }
}

module.exports = { 
  getVisionClient, 
  testVisionConnection 
};