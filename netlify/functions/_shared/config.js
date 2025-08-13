// Shared configuration for Netlify functions
// This approach stores large credentials as code constants instead of env vars

// Google Cloud Service Account - stored as code constant to avoid 4KB env var limit
// This will be populated with your actual Google credentials
const GOOGLE_SERVICE_ACCOUNT_BASE64 = process.env.GOOGLE_CREDS || 
  // If GOOGLE_CREDS is not available, credentials will need to be hardcoded here
  // Format: base64 encoded service account JSON
  null;

// Configuration object
const config = {
  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_KEY || process.env.OPENAI_API_KEY
  },

  // Google Cloud
  google: {
    credentials: GOOGLE_SERVICE_ACCOUNT_BASE64,
    projectId: process.env.GOOGLE_PROJECT || process.env.GOOGLE_CLOUD_PROJECT_ID || 'easyflip-vision-api'
  },

  // eBay API
  ebay: {
    environment: process.env.VITE_EBAY_USE_PRODUCTION === 'true' ? 'production' : 'sandbox',
    production: {
      appId: process.env.EBAY_PROD_APP || process.env.VITE_EBAY_PROD_APP_ID,
      devId: process.env.EBAY_PROD_DEV || process.env.VITE_EBAY_PROD_DEV_ID,
      certId: process.env.EBAY_PROD_CERT || process.env.VITE_EBAY_PROD_CERT_ID,
      baseUrl: 'https://api.ebay.com'
    },
    sandbox: {
      appId: process.env.EBAY_SAND_APP || process.env.VITE_EBAY_SANDBOX_APP_ID,
      devId: process.env.EBAY_SAND_DEV || process.env.VITE_EBAY_SANDBOX_DEV_ID, 
      certId: process.env.EBAY_SAND_CERT || process.env.VITE_EBAY_SANDBOX_CERT_ID,
      baseUrl: 'https://api.sandbox.ebay.com'
    }
  },

  // Go High Level
  ghl: {
    apiKey: process.env.GHL_KEY || process.env.GHL_API_KEY,
    apiUrl: process.env.GHL_URL || process.env.GHL_API_URL || 'https://rest.gohighlevel.com/v1/',
    pipelineId: process.env.GHL_PIPELINE || process.env.GHL_PIPELINE_ID,
    stageId: process.env.GHL_STAGE || process.env.GHL_STAGE_ID
  }
};

// Validation function
const validateConfig = () => {
  const issues = [];
  
  if (!config.openai.apiKey) {
    issues.push('Missing OpenAI API key');
  }
  
  if (!config.google.credentials || config.google.credentials.includes('YOUR_GOOGLE_CREDENTIALS')) {
    issues.push('Missing Google credentials');
  }
  
  return issues;
};

module.exports = {
  config,
  validateConfig
};