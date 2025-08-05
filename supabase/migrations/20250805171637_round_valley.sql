/*
  # Add Model Number Column to Items Table
  
  This migration adds a model_number column to the items table to store
  model numbers, style numbers, or SKUs extracted from item photos.
  
  ## Changes:
  1. Add model_number column to items table
  2. Add index for model number searches
  3. Update any existing items to have null model_number (safe default)
*/

-- Add model_number column to items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'model_number'
  ) THEN
    ALTER TABLE items ADD COLUMN model_number text;
    RAISE NOTICE 'Added model_number column to items table';
  ELSE
    RAISE NOTICE 'model_number column already exists in items table';
  END IF;
END $$;

-- Add index for model number searches (useful for finding similar items)
CREATE INDEX IF NOT EXISTS idx_items_model_number ON items(model_number) 
WHERE model_number IS NOT NULL;

-- Add index for brand + model number combination (very useful for exact matches)
CREATE INDEX IF NOT EXISTS idx_items_brand_model ON items(brand, model_number) 
WHERE brand IS NOT NULL AND model_number IS NOT NULL;

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Model number support added successfully!';
  RAISE NOTICE 'Items table now supports model_number field';
  RAISE NOTICE 'Indexes created for efficient model number searches';
  RAISE NOTICE 'Ready for enhanced listing title generation with model numbers!';
END $$;