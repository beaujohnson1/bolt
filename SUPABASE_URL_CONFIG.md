# Fix Email Confirmation Redirect Issue

## 🚨 **Problem:**
Supabase is redirecting email confirmations to `localhost:3000` instead of your actual app URL.

## 🔧 **Solution:**

### **1. Update Site URL in Supabase Dashboard**

1. Go to your Supabase dashboard: **https://supabase.com/dashboard/project/glcreocjgiqywlqwfphi**
2. Navigate to **Authentication** → **Settings**
3. Find the **Site URL** field
4. Change it from `http://localhost:3000` to your actual app URL

**If testing locally:** Use your local development URL (probably `http://localhost:5173`)
**If deployed:** Use your deployed URL (like `https://your-app.netlify.app`)

### **2. Update Redirect URLs**

In the same Authentication Settings page:

**Additional Redirect URLs:** Add both:
- `http://localhost:5173` (for local development)
- Your deployed URL (when you deploy)

### **3. For Local Development**

Since you're testing locally, set:
- **Site URL**: `http://localhost:5173`
- **Additional Redirect URLs**: `http://localhost:5173`

### **4. Test Again**

1. Create a new account with a different email
2. Check the confirmation email
3. The link should now redirect to the correct URL

## 🎯 **Quick Fix for Current Session:**

If you want to test immediately without waiting for a new confirmation email:

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Users**
3. Find your user account
4. Click the **...** menu and select **Confirm User**
5. This will manually confirm your email

## 🚀 **Alternative: Disable Email Confirmation (For Testing)**

For faster testing during development:

1. Go to **Authentication** → **Settings**
2. Turn OFF **Enable email confirmations**
3. Users can sign up and sign in immediately without email confirmation

You can re-enable this later for production.