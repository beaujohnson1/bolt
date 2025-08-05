# easyflip-landing-page

## eBay API Integration Setup

### Environment Variables Required

Add these environment variables to your Netlify site settings (prefixed with `VITE_` for client-side access):

```env
# eBay Sandbox (for development/testing)
VITE_EBAY_SANDBOX_APP_ID=your_sandbox_app_id
VITE_EBAY_SANDBOX_DEV_ID=your_sandbox_dev_id
VITE_EBAY_SANDBOX_CERT_ID=your_sandbox_cert_id
VITE_EBAY_SANDBOX_BASE_URL=https://api.sandbox.ebay.com

# eBay Production (for live app)
VITE_EBAY_PROD_APP_ID=your_production_app_id
VITE_EBAY_PROD_DEV_ID=your_production_dev_id
VITE_EBAY_PROD_CERT_ID=your_production_cert_id
VITE_EBAY_PROD_BASE_URL=https://api.ebay.com

# Environment flag
NODE_ENV=development  # or 'production'
```

### Security Notes
- Never commit API keys to Git
- Use sandbox keys for all development and testing
- Switch to production keys only when ready for live listings
- All credentials are managed through Netlify's secure environment variables

### Testing eBay Integration
- Visit `/test-connection` to verify eBay API configuration
- The system automatically selects sandbox or production based on `NODE_ENV`
- Check browser console for detailed eBay API logs