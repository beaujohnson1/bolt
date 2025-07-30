# EasyFlip GoHighLevel Setup Instructions

## 🎯 **Next Steps to Complete Integration**

### 1. **GoHighLevel Setup**

#### Get Your API Key:
1. Log into your GoHighLevel account
2. Go to **Settings** → **Integrations** → **API**
3. Create a new API key with these permissions:
   - `contacts.write`
   - `contacts.read` 
   - `opportunities.write` (if using pipelines)
4. Copy the API key

#### Get Pipeline & Stage IDs (Optional but Recommended):
1. Go to **CRM** → **Pipelines**
2. Create or select a pipeline for "EasyFlip Leads"
3. Note the Pipeline ID from the URL
4. Create/select a stage like "New Lead" or "Early Access"
5. Note the Stage ID

### 2. **Google Sign-In Setup (Optional)**

#### Create Google OAuth Client:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set authorized origins: `https://your-netlify-domain.netlify.app`
6. Copy the Client ID

### 3. **Update Environment Variables**

Edit your `.env` file with real values:

```env
# Required for email capture
GHL_API_KEY=your_actual_api_key_here
GHL_API_URL=https://services.leadconnectorhq.com/v1

# Optional but recommended
GHL_PIPELINE_ID=your_pipeline_id
GHL_STAGE_ID=your_stage_id

# Optional for Google sign-in
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. **Deploy to Netlify**

The environment variables need to be set in Netlify:

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site Settings** → **Environment Variables**
4. Add each variable from your `.env` file

### 5. **Test the Integration**

1. Deploy your changes
2. Test email signup on your live site
3. Check GoHighLevel for new contacts
4. Verify tags and custom fields are populated

## 🚀 **Ready to Launch!**

Once these steps are complete, your EasyFlip landing page will:
- ✅ Capture emails automatically
- ✅ Send leads directly to GoHighLevel
- ✅ Tag and organize prospects
- ✅ Enable immediate follow-up campaigns

## 🆘 **Need Help?**

If you run into issues:
1. Check Netlify function logs
2. Verify API permissions in GoHighLevel
3. Test with a simple email first
4. Check network tab for API errors

**Let's get those leads flowing!** 📧💰