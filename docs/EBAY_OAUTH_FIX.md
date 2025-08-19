# eBay OAuth Connection Fix Guide

## 🚨 Critical Issues Found

### 1. Redirect URI Mismatch
**Problem**: OAuth redirects are failing because of inconsistent redirect URI configuration.

**Current Configuration**:
- Production: Using RuName `'easyflip.ai-easyflip-easyfl-flntccc'`
- Development: Should use local callback URL but defaulting to production

**Fix Required**:

#### Option A: Force Development Mode (Recommended for Testing)
Add this to your `.env` file:
```bash
VITE_EBAY_USE_PRODUCTION=false
```

#### Option B: Fix Production OAuth (For Live Deployment)
1. **Verify RuName in eBay Developer Account**:
   - Log into https://developer.ebay.com
   - Go to Application Settings
   - Confirm RuName exactly matches: `easyflip.ai-easyflip-easyfl-flntccc`
   - Ensure it's approved and active

2. **Update Callback Function**:
   The callback URL in `auth-ebay-callback.js` should handle both:
   - Local development: `http://localhost:53778/.netlify/functions/auth-ebay-callback`
   - Production: RuName redirect

### 2. Environment Detection Fix

**Problem**: System defaulting to production even in development.

**Current Code** (in `ebayApi.ts` line 65):
```javascript
this.environment = import.meta.env.VITE_EBAY_USE_PRODUCTION === 'true' || 
                  import.meta.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
```

**Fix**: Update to prioritize development:
```javascript
this.environment = import.meta.env.NODE_ENV === 'production' && 
                  import.meta.env.VITE_EBAY_USE_PRODUCTION !== 'false' ? 'production' : 'sandbox';
```

### 3. OAuth Flow Debugging

**Current Issue**: Authorization URLs are being generated but redirects fail.

**Debug Steps**:
1. **Check Console Logs**: OAuth URLs are being generated successfully
2. **Verify eBay Developer Settings**: 
   - RuName must be exact: `easyflip.ai-easyflip-easyfl-flntccc`
   - Callback URL must be registered in eBay account
3. **Test OAuth Flow**:
   - Click "Connect eBay Account" 
   - Should redirect to eBay authorization page
   - After authorization, should redirect back to your app

## 🔧 Quick Fix Implementation

### Step 1: Force Development Mode
Create/update `.env` file in project root:
```bash
# Force development/sandbox mode
VITE_EBAY_USE_PRODUCTION=false

# Ensure these are set for sandbox
VITE_EBAY_SANDBOX_APP_ID=your_sandbox_app_id
VITE_EBAY_SANDBOX_DEV_ID=your_sandbox_dev_id  
VITE_EBAY_SANDBOX_CERT_ID=your_sandbox_cert_id
VITE_EBAY_SANDBOX_BASE_URL=https://api.sandbox.ebay.com
```

### Step 2: Update OAuth URLs for Development
In `ebay-oauth.js`, ensure development uses localhost callback:

**Current (line 94)**:
```javascript
const callbackUrl = `${process.env.URL || 'http://localhost:61792'}/.netlify/functions/auth-ebay-callback`;
```

**Should be**:
```javascript
const callbackUrl = `${process.env.URL || 'http://localhost:53778'}/.netlify/functions/auth-ebay-callback`;
```

### Step 3: Test the Flow
1. Restart `netlify dev`
2. Go to ListingPreview page
3. Click "Connect eBay Account"
4. Should redirect to eBay sandbox authorization
5. After authorization, should redirect back with tokens

## 🎯 Expected Results After Fix

### Successful OAuth Flow:
1. ✅ Click "Connect eBay Account" → Redirects to eBay
2. ✅ User authorizes on eBay → Redirects back to app  
3. ✅ Tokens stored in localStorage
4. ✅ "eBay Connected" status shows green checkmark
5. ✅ Listing creation proceeds with real eBay API calls

### Database Operations:
- ✅ No more 406 errors (these are likely secondary issues)
- ✅ Listings save to database successfully
- ✅ User can view and manage created listings

## 🚀 Long-term Solutions

### For Production Deployment:
1. **Verify eBay Production App Settings**
2. **Configure proper domain redirect URLs**  
3. **Test production OAuth flow**
4. **Implement proper error handling for OAuth failures**

### For Development:
1. **Set up eBay Sandbox account properly**
2. **Use consistent development URLs**
3. **Add development-specific OAuth handling**

## ⚠️ Important Notes

- **Never commit production eBay credentials to git**
- **Use sandbox for all development and testing**
- **Production OAuth requires eBay app approval and proper domain verification**
- **RuName must be exactly as registered with eBay**

## 📞 Next Steps

1. **Immediate**: Implement Step 1 (force development mode)
2. **Validate**: Test OAuth flow end-to-end  
3. **Confirm**: Check that listings save to database
4. **Deploy**: Once working locally, configure production OAuth properly