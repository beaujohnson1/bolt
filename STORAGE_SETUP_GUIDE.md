# Supabase Storage Setup Guide

## Current Status
- ✅ **Database Connection**: Working properly
- ✅ **User Profile RPC Function**: `create_user_profile` function exists and works
- ✅ **Tables**: `uploaded_photos` table exists and accessible  
- ❌ **Storage Bucket**: `item-images` bucket does not exist
- ❌ **Photo Uploads**: All photos fall back to base64 local storage

## The Problem
The `item-images` storage bucket was not created properly due to Row Level Security (RLS) policies preventing bucket creation via the API. This is a common issue when storage.buckets table has RLS enabled but lacks policies for bucket creation.

## Immediate Fix Required

### Option 1: Manual Bucket Creation (Recommended)
1. Go to: https://supabase.com/dashboard/project/kstmyodjnckgoosidsbb/storage/buckets
2. Click "New bucket"
3. Configure:
   - **Name**: `item-images`
   - **Public bucket**: ✅ **Enabled** (critical for image access)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/gif`
4. Click "Save"

### Option 2: SQL Migration Fix (Advanced)
If you have database admin access, run this SQL in the Supabase SQL editor:

```sql
-- Create the storage bucket for item images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'item-images',
  'item-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload own images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'item-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to images
CREATE POLICY "Public can view images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'item-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'item-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own images
CREATE POLICY "Users can update own images" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'item-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Grant permissions to service_role for admin operations
CREATE POLICY "Service role can manage all images" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'item-images');
```

## Current Workaround
The application has been updated to gracefully handle the missing storage bucket:

1. **Bucket Detection**: Checks if `item-images` bucket exists
2. **Graceful Fallback**: If bucket is missing, automatically stores photos as base64 data
3. **Clear Status Messages**: Shows user exactly what's happening
4. **Full Functionality**: Photo upload still works, just stored differently

## After Creating the Bucket
Once the bucket is created, restart the application and test photo uploads:

1. `npm run dev` (if not already running)
2. Go to `/capture` route
3. Upload test photos
4. Check console for successful cloud storage messages

## Testing Storage
Run the diagnostic script to verify everything works:
```bash
node test-supabase-storage.js
```

Expected output after fix:
```
✅ Basic Connection: PASS
✅ Storage Access: PASS  
✅ Bucket Creation: PASS
✅ File Upload: PASS
✅ User Profile RPC: PASS
✅ Table Access: PASS
```

## Long-term Solution
To prevent this issue in the future:

1. **Storage RLS Policies**: Review storage bucket RLS policies to allow proper bucket creation
2. **Migration Testing**: Test all migrations in staging environment first
3. **Automated Setup**: Create setup scripts that handle storage configuration
4. **Documentation**: Keep storage requirements documented for team members

## Architecture Impact
- **Current**: All photos stored as base64 in database (larger storage, slower loading)
- **After Fix**: Photos stored in cloud storage (optimized, faster, CDN-ready)
- **No Data Loss**: All existing base64 photos continue to work
- **Seamless Migration**: Once bucket exists, new photos automatically use cloud storage

## Contact
If you need assistance with bucket creation or database admin access, contact the infrastructure team.