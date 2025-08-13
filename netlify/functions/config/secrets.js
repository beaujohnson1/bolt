// Centralized secrets management for Netlify Functions
// This file helps manage environment variables efficiently

const getSecret = (key) => {
  return process.env[key] || '';
};

// OpenAI configuration
exports.openai = {
  apiKey: getSecret('OPENAI_API_KEY')
};

// Google Cloud configuration
exports.googleCloud = {
  credentials: getSecret('GOOGLE_CREDENTIALS_BASE64'),
  projectId: getSecret('GOOGLE_PROJECT_ID')
};

// eBay configuration
exports.ebay = {
  production: {
    appId: getSecret('EBAY_PROD_APP_ID'),
    devId: getSecret('EBAY_PROD_DEV_ID'),
    certId: getSecret('EBAY_PROD_CERT_ID'),
    baseUrl: 'https://api.ebay.com'
  },
  sandbox: {
    appId: getSecret('EBAY_SANDBOX_APP_ID'),
    devId: getSecret('EBAY_SANDBOX_DEV_ID'),
    certId: getSecret('EBAY_SANDBOX_CERT_ID'),
    baseUrl: 'https://api.sandbox.ebay.com'
  }
};

// Go High Level configuration
exports.ghl = {
  apiKey: getSecret('GHL_API_KEY'),
  apiUrl: getSecret('GHL_API_URL'),
  pipelineId: getSecret('GHL_PIPELINE_ID'),
  stageId: getSecret('GHL_STAGE_ID')
};