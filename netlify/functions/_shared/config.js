// Shared configuration for Netlify functions
// This approach stores large credentials as code constants instead of env vars

// Google Cloud Service Account - stored as code constant to avoid 4KB env var limit
// Base64 encoded service account JSON for easyflip-vision-api
const GOOGLE_SERVICE_ACCOUNT_BASE64 = process.env.GOOGLE_CREDS || 
  'ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiZWFzeWZsaXAtdmlzaW9uLWFwaSIsCiAgInByaXZhdGVfa2V5X2lkIjogIjRkMDBjNjc2ZWE0NzY2NzNkNjdkNTU4NDFjOWE3ZTYyYzQwOGMzY2UiLAogICJwcml2YXRlX2tleSI6ICItLS0tLUJFR0lOIFBSSVZBVEUgS0VZLS0tLS1cbk1JSUV2UUlCQURBTkJna3Foa2lHOXcwQkFRRUZBQVNDQktjd2dnU2pBZ0VBQW9JQkFRREQ5aCszMmhtelVranRcbnVaWmo2TXFWQUgyaDZmdjJudkV4QkVFVHgzNnQzR2k3MUtmSG5WKzZUc2hUUWVQeUV3YXVCZmUyZjVtNXdSK1ZcbkpuVy80MG1yUDQyZFlqUUtzdFdCVTM2NHBzdXdSMmpPai9iMTFISXBWWkJEaGFzUGdBSWo5L2tOLzV3MEJWcVRcblF0Z3ZyOFQyTENCandwN2w1TkFIWXI2SG45cUVVRzJxM2l5NythTXkzRGt3SysvcU9DSzBhOVJBejV2RzNIUkhcblhzMkFJeHZVUGRJcENPSWZ5UlljcUo5bHE0WHU1NmpvY1JROEVaZm1nZVVVZ09tazVzVVpjU245TlBKTTJLM2Rcbm84b1kwUlF0MDU2aUY4QUhwSVkya1V6VnVoenI3bW1keGpYcWlFOGliaFgycmlTZExrVktUb25lODFZZmRUS0lcbjVpNHV0SlpGQWdNQkFBRUNnZ0VBS2gyS2daUHhOQlg2TUlWVGFoT00vbXNGbFRmWmZBNTYzY01CVFlQeG1PSW1cbjdEOXU4N3JCNlNPbmNDVllIUjJ6c05EOWhRNTFkbk9vR3dFU0MzU0l6N0l2K0dRenRSenNRQWcyMHU2ZUZqdXlcbnJicEpKRnBOVXM3ZDIzVXQ1MzNtZDk2Q2UxeTFNSVQ2QzI0eFVrWmZlVnpRZFVCTnNERDErTEJqTEhqUm1OL2pcbit2aWM4WlNCMlB2eGpVVHhEdUV0cWtXeGhvcG5qd1FHVXBaenZJYmd4dXNodlk3a2E5K2p2MUJiSlNWTWZLN01cbkk4czgzM0RkRFZMWUNneHNPN2lsWkEwazdSNzJHYytJbVc2c2s1YnJDb1ZySXhUbkYzVnYyTTYzNk5XcHZkaTlcbkVpcm5MME05UTJvckhVVHZpcjM3RUN2TjhKMWpNaHc1Vmh6K1AyQVlZUUtCZ1FEaG9YTk9kTXFrRWpuTW9DbUtcbjF5bUJNRnJQcy8rd2kvRHF5c0h0ZUpockt4UTBHZHlaa0ROZ1gwRWRLU044NUpsRGNneTJreFcxYVhjRmdkcVlcbkY0cmdjUVRHcm1Ma1R3RXVvUHRTdFNZZmxacFVpOWVIQlNRa0hIYzl4WXRVOUFwVnVCdllYYWFXWjJUUHVBVzBcbnlUNVNhS01YK2dVeXBFSnVqcFMwYUFaRTNRS0JnUURlVmx4MDdoMjQ0NUdzd1FtYXYrSGtOaFp3RFpYOS8yZEFcbkovNE5pbnZ0R1BxajZ0amI0RitKT3E5cm1WaExtVWxpRnRzQXBQalNna2RrQk1oV2RQaEZvUVFydVFvVjFFeXZcbkx5WVlKVWZzc3RMOGlxNTRwMEJtZnZiOFM5THBrTGdGcXVNSG9lSitXNDJlSnFwaWtOTUpDTmNMcXh2REgrVlVcbmt5ckdGbmJzaVFLQmdRQzdhWU9CVTNsT051VlRsbVZyTWJVRDNjcFFZODZxTWxMMmMxd0poL1h5Ym1IbHRPV0xcbm1EOVVlVXA0a2tjcjRpVjc1Q3V6S3hFSkVvVU9TZ0hyK3dJYjAwU0lVeWxKUW1aVStOcElwTGI1M1NYSHZEQlZcbnNtdUdveTVZWE5HU3l2SWFxVVpYdmRJMWM4UkUxVEhJTExCYmV4YWRQOHM1ZVQ3RTNpR2VpQmxNOFFLQmdDQVhcbkVPTWpseENmYitBaVFIT2diRWNXODJnYTNlSTZJYm5seThwQ2laNXY4NFVER1dlcTI3OGZ4RC9nY3hqK045UTdcbmZrSjZqUnM5Q0hiTUplb3NtY1RhOTVJajgrdXdwNXpGVGxjLzBrQzhrcTAyaXZZSkZjZDFYY3FPV3hPdytvNStcbjJxTzRYc3RrQlcybElRUjI2SzZ1SXZPaEw3R2JBZXVTRGlObkRLVVpBb0dBU1ZXTURYd01oSkZiL1d0Si9NbExcbkV5WW02L3ZrdG9IeW9VNll2TjdQZVJkVTIzSEFzMERRS3pQci80Sk9iS3pDY2dwdU5LY2tUcmp5Ym5aeFZlN0pcbmdZNkxiQnZXT1hPK2NEdGtvWHpPbUlIejZLM0szTHh6TWR5d3ZVaVVMblEyUWZSdFRaM0srZGt0WUtIL0wrckhcbmxtcmtoandTT0JqcVJLa0J0b0twM3B3PVxuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIiwKICAiY2xpZW50X2VtYWlsIjogImVhc3lmbGlwLWFwaS12aXNpb25AZWFzeWZsaXAtdmlzaW9uLWFwaS5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgImNsaWVudF9pZCI6ICIxMDg4Mzk2NDE4NDUyMTg4MTUzNDciLAogICJhdXRoX3VyaSI6ICJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsCiAgInRva2VuX3VyaSI6ICJodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS90b2tlbiIsCiAgImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLAogICJjbGllbnRfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L2Vhc3lmbGlwLWFwaS12aXNpb24lNDBlYXN5ZmxpcC12aXNpb24tYXBpLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAidW5pdmVyc2VfZG9tYWluIjogImdvb2dsZWFwaXMuY29tIgp9Cg==';

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
    // CRITICAL FIX: Use same environment detection logic as frontend
    environment: (process.env.VITE_EBAY_USE_PRODUCTION === 'true' || 
                 process.env.NODE_ENV === 'production') ? 'production' : 'sandbox',
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