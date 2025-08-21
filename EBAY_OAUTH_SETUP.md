# eBay OAuth Setup Guide

## Critical Discovery: RuName vs Redirect URL

eBay OAuth uses a **RuName** (Redirect URL Name) which is NOT the actual URL!

### Your eBay Configuration:
- **RuName**: `easyflip.ai-easyflip-easyfl-cnqajybp`
- **Client ID**: `easyflip-easyflip-PRD-c645ded63-a17c4d94`
- **Auth Accepted URL**: `https://easyflip.ai/app/api/ebay/callback-fixed`

## How eBay OAuth Actually Works:

1. **Authorization Request**: Use RuName as `redirect_uri` parameter
   ```
   https://auth.ebay.com/oauth2/authorize?
   client_id=easyflip-easyflip-PRD-c645ded63-a17c4d94&
   redirect_uri=easyflip.ai-easyflip-easyfl-cnqajybp&  ← RuName, NOT URL!
   response_type=code&
   scope=...
   ```

2. **After Authorization**: eBay redirects to your "Auth Accepted URL"
   - eBay looks up the RuName → finds `https://easyflip.ai/app/api/ebay/callback-fixed`
   - Redirects user there with the authorization code

3. **Token Exchange**: Also uses RuName
   ```javascript
   body: {
     grant_type: 'authorization_code',
     code: 'AUTH_CODE_FROM_EBAY',
     redirect_uri: 'easyflip.ai-easyflip-easyfl-cnqajybp' // RuName again!
   }
   ```

## Environment Variables for Netlify:

Add these to your Netlify environment variables:

```env
# eBay OAuth Credentials
VITE_EBAY_CLIENT_ID=easyflip-easyflip-PRD-c645ded63-a17c4d94
VITE_EBAY_CLIENT_SECRET=[Your Client Secret from eBay]
VITE_EBAY_RU_NAME=easyflip.ai-easyflip-easyfl-cnqajybp
VITE_EBAY_SANDBOX=false

# For the callback handler (server-side)
EBAY_CLIENT_ID=easyflip-easyflip-PRD-c645ded63-a17c4d94
EBAY_CLIENT_SECRET=[Your Client Secret from eBay]
EBAY_RU_NAME=easyflip.ai-easyflip-easyfl-cnqajybp
```

## How to Add Environment Variables in Netlify:

1. Go to Netlify Dashboard
2. Select your site
3. Go to "Site settings" → "Environment variables"
4. Add each variable above
5. Deploy again for changes to take effect

## Important Notes:

- **RuName is NOT a URL** - it's an identifier that eBay maps to your actual redirect URL
- The "Auth Accepted URL" in eBay settings (`https://easyflip.ai/app/api/ebay/callback-fixed`) is where users actually get redirected
- The RuName (`easyflip.ai-easyflip-easyfl-cnqajybp`) is what you use in OAuth parameters
- This confusion is why you were getting "unauthorized_client" errors!

## Testing:

After deploying with correct RuName:
1. Clear browser storage: `localStorage.clear()`
2. Try connecting eBay account
3. Should redirect to eBay login
4. After authorization, should redirect back to your callback URL
5. Tokens should be stored successfully