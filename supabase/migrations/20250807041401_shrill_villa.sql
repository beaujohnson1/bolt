/*
  # Create Uploaded Photos Table
  
  This migration creates a table to store uploaded photos before they are
  assigned to items via SKU assignment.
  
  ## Changes:
  1. Create uploaded_photos table for photo staging
  2. Add RLS policies for user access
  3. Add indexes for performance
*/

-- Create uploaded_photos table for staging photos before SKU assignment
CREATE TABLE IF NOT EXISTS uploaded_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  filename text NOT NULL,
  file_size integer,
  file_type text,
  upload_order integer DEFAULT 0,
  status text DEFAULT 'uploaded', -- uploaded, assigned, processed
  assigned_item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  assigned_sku text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_uploaded_photos_user_id ON uploaded_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_photos_status ON uploaded_photos(status);
CREATE INDEX IF NOT EXISTS idx_uploaded_photos_assigned_sku ON uploaded_photos(assigned_sku);
CREATE INDEX IF NOT EXISTS idx_uploaded_photos_created_at ON uploaded_photos(created_at);

-- Enable RLS
ALTER TABLE uploaded_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own uploaded photos"
  ON uploaded_photos FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_uploaded_photos_updated_at 
  BEFORE UPDATE ON uploaded_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Uploaded photos table created successfully!';
  RAISE NOTICE 'Users can now upload photos for later SKU assignment';
  RAISE NOTICE 'Table includes: id, user_id, image_url, filename, status, assigned_sku';
  RAISE NOTICE 'Ready for photo staging workflow!';
END $$;