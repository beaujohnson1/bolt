# Fix Email Confirmation Issue

## 🚨 **Problem:**
Email confirmation links are expiring or not working properly, showing "otp_expired" error.

## 🔧 **Quick Solution - Disable Email Confirmation for Development:**

### **1. In Supabase Dashboard:**
1. Go to: **https://supabase.com/dashboard/project/glcreocjgiqywlqwfphi**
2. Navigate to: **Authentication** → **Settings**
3. Scroll down to **"Email Confirmation"**
4. **Turn OFF** "Enable email confirmations"
5. Click **Save**

### **2. Test Immediately:**
Now you can:
- Sign up with any email
- Sign in immediately without waiting for confirmation
- Access the dashboard right away

## 🎯 **Alternative - Manual Confirmation:**

If you want to keep email confirmation enabled:

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Find your user account
3. Click the **"..."** menu next to your user
4. Select **"Confirm User"**
5. Now you can sign in normally

## 🔍 **Why This Happens:**

- Email links expire quickly (usually 1 hour)
- Development environment issues with URL redirects
- Email delivery delays

## 🚀 **For Production:**

You can re-enable email confirmation later when deploying to production. For development, it's common to disable it for faster testing.

## ✅ **Next Steps:**

1. Disable email confirmation in Supabase
2. Try signing up again
3. You should be able to sign in immediately
4. Test the full app workflow