# 🔐 Environment Variables Setup Guide

## Step 1: Generate Encryption Key

Open a terminal and run:
```bash
openssl rand -base64 32
```

If you don't have OpenSSL, use this Node.js command instead:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Save this key securely - you'll need it for the next step!**

## Step 2: Add Variables to Netlify

Go to: **Netlify Dashboard → Site Settings → Environment Variables**

Add these variables:

### Required eBay Credentials
```
EBAY_APP_ID = [Your eBay App ID/Client ID]
EBAY_CERT_ID = [Your eBay Cert ID/Client Secret]
EBAY_DEV_ID = [Your eBay Developer ID]
EBAY_RU_NAME = [Your eBay RuName]
```

### Security Keys
```
ENCRYPTION_KEY = [The key you generated in Step 1]
SESSION_SECRET = [Generate another random string]
```

### Supabase Configuration
```
SUPABASE_URL = [Your Supabase project URL]
SUPABASE_SERVICE_KEY = [Your Supabase service role key]
SUPABASE_ANON_KEY = [Your Supabase anon/public key]
```

### eBay Business Policies (Optional for now)
```
EBAY_FULFILLMENT_POLICY_ID = [Leave blank for now]
EBAY_PAYMENT_POLICY_ID = [Leave blank for now]
EBAY_RETURN_POLICY_ID = [Leave blank for now]
```

### Application Settings
```
NODE_ENV = production
ALLOWED_ORIGIN = https://easyflip.ai
```

## Step 3: Where to Find Your Keys

### eBay Credentials
1. Go to: https://developer.ebay.com/my/keys
2. Select your app
3. Copy the Production keys (not Sandbox)

### Supabase Keys
1. Go to: Your Supabase Dashboard
2. Settings → API
3. Copy:
   - Project URL
   - service_role key (secret)
   - anon/public key

## Step 4: Verify in Netlify

After adding all variables:
1. Click "Save"
2. Trigger a new deploy: **Deploys → Trigger Deploy → Deploy Site**

## Step 5: Quick Verification

Once deployed, check if the OAuth endpoint is responding:
```
https://easyflip.ai/.netlify/functions/ebay-api-oauth/health
```

You should see a response (even if it's an error, it means the function is deployed).

## 🎯 Ready for Testing!

Once your environment variables are set and the site is redeployed, you're ready to test the OAuth flow!