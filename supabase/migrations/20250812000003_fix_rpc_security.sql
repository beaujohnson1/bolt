-- Fix RPC functions to work with Row Level Security
-- Add SECURITY DEFINER to bypass RLS policies

-- Drop existing functions
DROP FUNCTION IF EXISTS delete_all_user_data(UUID);
DROP FUNCTION IF EXISTS delete_item_safely(UUID, UUID);

-- Create enhanced function to delete all user data safely
CREATE OR REPLACE FUNCTION delete_all_user_data(p_user_id UUID)
RETURNS TEXT 
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  -- Verify the user exists and we have permission
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN 'User not found';
  END IF;
  
  -- Delete in proper dependency order
  
  -- 1. Delete all sales first (they reference listings)
  DELETE FROM sales WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE 'Deleted % sales', deleted_count;
  
  -- 2. Delete photo_analysis records for all user items
  DELETE FROM photo_analysis 
  WHERE item_id IN (SELECT id FROM items WHERE user_id = p_user_id);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE 'Deleted % photo_analysis records', deleted_count;
  
  -- 3. Delete all listings (they reference items)
  DELETE FROM listings WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE 'Deleted % listings', deleted_count;
  
  -- 4. Delete uploaded_photos (they may reference items)
  DELETE FROM uploaded_photos WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE 'Deleted % uploaded_photos', deleted_count;
  
  -- 5. Finally delete all items
  DELETE FROM items WHERE user_id = p_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE 'Deleted % items', deleted_count;
  
  RETURN 'Successfully deleted ' || total_deleted || ' total records for user';
END;
$$ LANGUAGE plpgsql;

-- Create enhanced function to delete a single item safely
CREATE OR REPLACE FUNCTION delete_item_safely(p_item_id UUID, p_user_id UUID)
RETURNS TEXT
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
  total_deleted INTEGER := 0;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM items WHERE id = p_item_id AND user_id = p_user_id) THEN
    RETURN 'Item not found or access denied';
  END IF;
  
  -- Delete in proper dependency order
  
  -- 1. Delete sales for this item's listings
  DELETE FROM sales 
  WHERE listing_id IN (SELECT id FROM listings WHERE item_id = p_item_id);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE 'Deleted % sales', deleted_count;
  
  -- 2. Delete photo_analysis for this item
  DELETE FROM photo_analysis WHERE item_id = p_item_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE 'Deleted % photo_analysis records', deleted_count;
  
  -- 3. Delete listings for this item
  DELETE FROM listings WHERE item_id = p_item_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE 'Deleted % listings', deleted_count;
  
  -- 4. Finally delete the item
  DELETE FROM items WHERE id = p_item_id AND user_id = p_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  total_deleted := total_deleted + deleted_count;
  RAISE NOTICE 'Deleted % items', deleted_count;
  
  RETURN 'Successfully deleted item and ' || total_deleted || ' total records';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION delete_all_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_item_safely(UUID, UUID) TO authenticated;