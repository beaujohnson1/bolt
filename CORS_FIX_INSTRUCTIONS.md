# 🚨 URGENT: CORS Error Fix Instructions

## IMMEDIATE ACTION REQUIRED

Your production app at `https://easyflip.ai` is blocked by CORS policy. Users cannot access the app.

## 🔧 SUPABASE DASHBOARD FIX (DO THIS NOW)

### Step 1: Login to Supabase Dashboard
1. Go to: **https://supabase.com/dashboard**
2. Select your project: **kstmyodjnckgoosidsbb**

### Step 2: Update Authentication Settings
1. Navigate to: **Settings → Authentication**
2. Find the **"Site URL"** field
3. Change it from `http://localhost:3000` to: **`https://easyflip.ai`**

### Step 3: Update Redirect URLs
1. In the same Authentication settings page
2. Find **"Redirect URLs"** section
3. Add these URLs (one per line):
   ```
   https://easyflip.ai
   https://easyflip.ai/auth/callback
   https://easyflip.ai/**
   http://localhost:3000
   http://localhost:3000/auth/callback
   ```

### Step 4: Save and Wait
1. **Click "Save"** in Supabase dashboard
2. **Wait 2-3 minutes** for changes to propagate globally
3. **Clear browser cache** completely
4. **Test the app** at https://easyflip.ai

## 🧪 VERIFICATION STEPS

### Test 1: Direct API Call
Open browser console on https://easyflip.ai and run:
```javascript
fetch('https://kstmyodjnckgoosidsbb.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'your-anon-key-here',
    'Content-Type': 'application/json'
  }
}).then(r => console.log('✅ API Response:', r.status))
.catch(e => console.error('❌ CORS Error:', e))
```

### Test 2: Authentication Flow
1. Go to https://easyflip.ai
2. Click "Sign In" button
3. Try Google sign-in
4. Check for CORS errors in console

## 🚨 IF STILL GETTING CORS ERRORS

### Option A: Check Project Status
1. **Settings → General** in Supabase
2. Verify project is **"Active"** (not paused)
3. Check for any billing issues

### Option B: Additional CORS Settings
Some Supabase projects have additional CORS settings:
1. **Settings → API**
2. Look for **"CORS Origins"** or **"Allowed Origins"**
3. Add: `https://easyflip.ai`

### Option C: Contact Supabase Support
If the above doesn't work within 30 minutes:
1. **Create support ticket** at https://supabase.com/support
2. **Include this info:**
   - Project ID: kstmyodjnckgoosidsbb
   - Domain: https://easyflip.ai
   - Error: CORS policy blocking requests
   - Urgency: PRODUCTION DOWN

## 📋 EXPECTED SUPABASE SETTINGS

After the fix, your Supabase Authentication settings should show:

```
✅ Site URL: https://easyflip.ai
✅ Redirect URLs:
   - https://easyflip.ai
   - https://easyflip.ai/auth/callback
   - https://easyflip.ai/**
   - http://localhost:3000
   - http://localhost:3000/auth/callback

✅ Email Auth: Enabled
✅ Confirm Email: Disabled (for faster testing)
```

## ⏰ TIMELINE

- **0-5 minutes:** Update Supabase dashboard settings
- **5-8 minutes:** Wait for propagation
- **8-10 minutes:** Clear cache and test
- **10-15 minutes:** Verify all auth flows work

**TOTAL TIME TO FIX: 15 minutes maximum**

## 🎯 SUCCESS CRITERIA

- [ ] No CORS errors in browser console
- [ ] Users can load https://easyflip.ai
- [ ] Sign-in button works
- [ ] Google OAuth works
- [ ] Users can access dashboard after auth
- [ ] No "Failed to fetch" errors

**THIS IS A PRODUCTION EMERGENCY - FIX IMMEDIATELY**