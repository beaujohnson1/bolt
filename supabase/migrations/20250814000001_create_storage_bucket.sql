-- Create storage bucket for item images and set up policies
-- This migration creates the item-images bucket and necessary policies

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