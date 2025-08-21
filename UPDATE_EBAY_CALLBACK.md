# eBay OAuth Callback Update Instructions

## ⚠️ CRITICAL: Update Your eBay App Settings

### 1. Update eBay Developer Console

Go to: https://developer.ebay.com/my/keys

1. Click on your app (easyflip-easyflip-PRD)
2. Find "User Tokens" section
3. Update "Your auth accepted URL" to:
   ```
   https://easyflip.ai/app/api/ebay/callback-fixed
   ```
4. Save changes

### 2. Update Environment Variables

In your Netlify dashboard or `.env` file, ensure you have:

```env
VITE_EBAY_CLIENT_ID=easyflip-easyflip-PRD-c645ded63-a17c4d94
VITE_EBAY_CLIENT_SECRET=[your_client_secret]
VITE_EBAY_RU_NAME=https://easyflip.ai/app/api/ebay/callback-fixed
VITE_EBAY_SANDBOX=false
```

### 3. What's Fixed

✅ **New OAuth Service** (`ebayOAuthFixed.ts`)
- Single storage key for tokens
- Automatic token refresh
- Incognito mode support
- Proper error handling

✅ **New Callback Handler** (`/app/api/ebay/callback-fixed`)
- Proper token exchange
- Multiple storage fallbacks
- Cross-window communication
- Clear success/error messages

✅ **Updated Components**
- OnboardingFlow now uses the fixed OAuth service
- Proper callback URL throughout the app
- Better token detection

### 4. Testing

1. Clear your browser storage:
   - Open DevTools Console
   - Run: `localStorage.clear()`

2. Try connecting eBay:
   - Should open popup to eBay
   - After authorization, should redirect to callback
   - Tokens should be stored automatically
   - Window should close and app should detect connection

### 5. Troubleshooting

If still not working:

1. **Check eBay Console**: Ensure the callback URL is exactly:
   `https://easyflip.ai/app/api/ebay/callback-fixed`

2. **Check Console Logs**: Look for:
   - `[ONBOARDING] Auth URL generated:` - Should show correct callback URL
   - `[OAuth Success]` messages in the callback window

3. **Check Storage**: After successful auth, check localStorage for:
   - `ebay_oauth_tokens_v2` key

4. **Try Incognito**: The new implementation should work in incognito mode too

### 6. Manual Token Check

Run in console to check if tokens are stored:
```javascript
localStorage.getItem('ebay_oauth_tokens_v2')
```

If you see tokens there but the app doesn't recognize them, run:
```javascript
import { EBayOAuthMigration } from './src/utils/ebayOAuthMigration';
EBayOAuthMigration.autoFix();
```