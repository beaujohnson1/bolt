# Complete eBay OAuth Setup Guide for EasyFlip.ai

## 🚨 CRITICAL: Current Production Configuration

### Your eBay Production Credentials:
- **App ID**: `easyflip-easyflip-PRD-c645ded63-a17c4d94`
- **Dev ID**: `45056dfe-cbf5-4f0e-a3a6-873ef9360bfd`
- **Cert ID**: `PRD-645ded6329c3-055c-4df2-9b50-8248`
- **RuName**: `easyflip.ai-easyflip-easyfl-cnqajybp`

## 📋 Step-by-Step Setup Guide

### Step 1: Verify eBay Developer Account Settings

1. **Login to eBay Developer Program**:
   - Go to https://developer.ebay.com
   - Sign in with your developer account

2. **Navigate to Application Settings**:
   - Click on "My Account" → "Application Keys"
   - Select your production app: `easyflip-easyflip-PRD-c645ded63-a17c4d94`

3. **Verify RuName Configuration**:
   - Under "User Tokens" section, find your RuName
   - **CRITICAL**: Your RuName must be EXACTLY: `easyflip.ai-easyflip-easyfl-cnqajybp`
   - If different, you need to update it in eBay Developer account

4. **Check OAuth Redirect URI**:
   - In "OAuth Settings", verify the redirect URI
   - For RuName-based flow, eBay handles the redirect internally
   - The RuName acts as your redirect identifier

### Step 2: Configure OAuth Scopes

In your eBay Developer account, ensure these scopes are enabled:
- `https://api.ebay.com/oauth/api_scope/sell.inventory` - Required for creating listings
- `https://api.ebay.com/oauth/api_scope/sell.account` - Required for account management
- `https://api.ebay.com/oauth/api_scope/sell.fulfillment` - Required for order fulfillment
- `https://api.ebay.com/oauth/api_scope/commerce.identity.readonly` - Required for user identity

### Step 3: Test OAuth Flow Manually

1. **Generate Authorization URL**:
   Open this URL in your browser (all one line):
   ```
   https://auth.ebay.com/oauth2/authorize?client_id=easyflip-easyflip-PRD-c645ded63-a17c4d94&response_type=code&redirect_uri=easyflip.ai-easyflip-easyfl-cnqajybp&scope=https://api.ebay.com/oauth/api_scope/sell.inventory%20https://api.ebay.com/oauth/api_scope/sell.account%20https://api.ebay.com/oauth/api_scope/sell.fulfillment%20https://api.ebay.com/oauth/api_scope/commerce.identity.readonly&prompt=login
   ```

2. **Login to eBay**:
   - Use your eBay seller account credentials
   - NOT your developer account credentials

3. **Grant Permissions**:
   - Review the permissions requested
   - Click "Agree" or "Grant Access"

4. **Check Redirect**:
   - You should be redirected to a URL containing an authorization code
   - The URL format will be: `https://easyflip.ai/.netlify/functions/auth-ebay-callback?code=XXXXX&state=XXXXX`

### Step 4: Common Issues and Solutions

#### Issue 1: "Invalid request" Error
**Cause**: RuName mismatch
**Solution**: 
- Verify RuName in eBay Developer account matches exactly: `easyflip.ai-easyflip-easyfl-cnqajybp`
- Check for trailing spaces or typos

#### Issue 2: "Invalid client" Error
**Cause**: Wrong App ID or environment
**Solution**:
- Ensure using production App ID: `easyflip-easyflip-PRD-c645ded63-a17c4d94`
- Verify `VITE_EBAY_USE_PRODUCTION=true` in .env.local

#### Issue 3: Endless Polling / No Tokens Detected
**Cause**: Token exchange failing
**Solution**:
- Check browser console for errors
- Verify callback URL is accessible
- Ensure popup blockers are disabled

#### Issue 4: "Invalid scope" Error
**Cause**: Requesting scopes not configured in eBay app
**Solution**:
- Go to eBay Developer account
- Enable all required scopes for your app
- Wait 5-10 minutes for changes to propagate

### Step 5: Environment Configuration

Your `.env.local` file should have:
```bash
# eBay Production Configuration
VITE_EBAY_USE_PRODUCTION=true
VITE_EBAY_PROD_APP_ID=easyflip-easyflip-PRD-c645ded63-a17c4d94
VITE_EBAY_PROD_DEV_ID=45056dfe-cbf5-4f0e-a3a6-873ef9360bfd
VITE_EBAY_PROD_CERT_ID=PRD-645ded6329c3-055c-4df2-9b50-8248
VITE_EBAY_PROD_BASE_URL=https://api.ebay.com

# Netlify Functions Configuration
EBAY_USE_PRODUCTION=true
EBAY_PROD_APP=easyflip-easyflip-PRD-c645ded63-a17c4d94
EBAY_PROD_DEV=45056dfe-cbf5-4f0e-a3a6-873ef9360bfd
EBAY_PROD_CERT=PRD-645ded6329c3-055c-4df2-9b50-8248
```

### Step 6: Debug OAuth Flow

1. **Open Browser DevTools** (F12)
2. **Go to Network Tab**
3. **Click "Connect eBay Account"**
4. **Watch for**:
   - OAuth popup opening
   - Redirect after eBay login
   - Callback function execution
   - Token storage in localStorage

### Step 7: Verify Token Storage

After successful OAuth, check browser console:
```javascript
// Run in browser console
localStorage.getItem('ebay_access_token')
localStorage.getItem('ebay_refresh_token')
localStorage.getItem('ebay_token_expiry')
```

All three should have values if OAuth succeeded.

## 🔧 Emergency Fixes

### Quick Fix 1: Force Token Refresh
```javascript
// Run in browser console
localStorage.removeItem('ebay_access_token');
localStorage.removeItem('ebay_refresh_token');
localStorage.removeItem('ebay_token_expiry');
location.reload();
```

### Quick Fix 2: Test Callback Directly
Visit this URL to test if callback is working:
```
https://easyflip.ai/.netlify/functions/auth-ebay-callback?code=test&state=test
```
You should see an HTML page response, not an error.

### Quick Fix 3: Bypass OAuth for Testing
If you have valid tokens from another source:
```javascript
// Run in browser console
localStorage.setItem('ebay_access_token', 'YOUR_ACCESS_TOKEN');
localStorage.setItem('ebay_refresh_token', 'YOUR_REFRESH_TOKEN');
localStorage.setItem('ebay_token_expiry', String(Date.now() + 7200000));
location.reload();
```

## 📊 OAuth Flow Diagram

```
1. User clicks "Connect eBay"
   ↓
2. Generate OAuth URL with RuName
   ↓
3. Open eBay authorization page
   ↓
4. User logs in and approves
   ↓
5. eBay redirects to callback with code
   ↓
6. Callback exchanges code for tokens
   ↓
7. Tokens stored in localStorage
   ↓
8. User redirected back to app
   ↓
9. App detects tokens and continues
```

## 🚀 Production Checklist

- [ ] RuName verified in eBay Developer account
- [ ] All required OAuth scopes enabled
- [ ] Production credentials in .env.local
- [ ] VITE_EBAY_USE_PRODUCTION=true
- [ ] Callback URL accessible at https://easyflip.ai/.netlify/functions/auth-ebay-callback
- [ ] EmergencyOAuthBridge deployed and active
- [ ] Token detection working (25ms polling)
- [ ] Popup blockers disabled for testing

## 📞 Support Resources

1. **eBay Developer Support**: https://developer.ebay.com/support
2. **OAuth Documentation**: https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html
3. **RuName Guide**: https://developer.ebay.com/api-docs/static/oauth-redirect-uri.html

## ⚠️ Security Notes

- **NEVER** share your Cert ID publicly
- **NEVER** commit credentials to Git
- **ALWAYS** use environment variables
- **ROTATE** tokens regularly
- **MONITOR** OAuth usage in eBay Developer account

## 🎯 Expected Success Flow

When everything is configured correctly:

1. Click "Connect eBay Account" → Opens eBay login
2. Login with eBay seller account → Shows permission page
3. Click "Agree" → Redirects to callback
4. Callback processes → Stores tokens
5. Returns to app → Shows "eBay Connected ✓"
6. Listing creation → Works with live eBay API

Total time: 5-10 seconds from click to connected status.