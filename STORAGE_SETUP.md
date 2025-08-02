# Supabase Storage Setup Instructions

## 🎯 **Critical Next Step: Set Up Storage Bucket**

Your Supabase database is connected, but you need to create a storage bucket for image uploads.

### **1. Create Storage Bucket**
1. Go to your Supabase dashboard: https://glcreocjgiqywlqwfphi.supabase.co
2. Click **Storage** in the left sidebar
3. Click **New bucket**
4. Enter bucket name: `item-images`
5. Make it **Public** (toggle the public option ON)
6. Click **Create bucket**

### **2. Configure Bucket Policies (Important!)**
After creating the bucket, you need to set up policies so users can upload images:

1. In Storage, click on your `item-images` bucket
2. Go to **Policies** tab
3. Click **New Policy**
4. Choose **For full customization**
5. Add this policy:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Users can upload own images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to images
CREATE POLICY "Public can view images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'item-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### **3. Test Your Connection**
Once storage is set up, you can test the full app:

1. Click **"Sign In"** in your app header
2. Sign up with Google or email
3. Go to dashboard and click **"New Listing"**
4. Upload a photo - it should work!

### **4. Optional: Configure Authentication URLs**
For production deployment, add these URLs in **Authentication > Settings**:
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/app`

## ✅ **Your App Will Then Have:**
- Real user authentication ✅
- Database storage ✅  
- Image upload & storage ✅
- Full dashboard functionality ✅
- Ready for MVP launch! 🚀