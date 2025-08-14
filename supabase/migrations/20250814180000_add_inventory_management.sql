/*
  # Inventory Management System
  
  This migration adds inventory management features to support:
  - Stock quantity tracking for items
  - Automatic quantity updates when listings are sold
  - Low stock alerts and notifications
  - Inventory history and audit trail
  - SKU-based inventory management
  
  ## Tables Added/Modified:
  1. **inventory_items** - New table for inventory tracking
  2. **inventory_movements** - Track all inventory changes
  3. **items** - Add inventory-related fields
  4. **listings** - Add quantity tracking
  
  ## Features:
  - Real-time stock level monitoring
  - Automatic stock deduction on sales
  - Low stock alerts
  - Inventory movement history
  - SKU-based organization
*/

-- Add inventory-related fields to existing items table
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS initial_quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS reserved_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS available_quantity integer GENERATED ALWAYS AS (current_quantity - reserved_quantity) STORED,
ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS cost_basis numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS inventory_location text;

-- Add quantity tracking to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS quantity_listed integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS quantity_sold integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_available integer GENERATED ALWAYS AS (quantity_listed - quantity_sold) STORED;

-- =============================================
-- INVENTORY_ITEMS TABLE (SKU-based Inventory)
-- =============================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- SKU and identification
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  category item_category,
  
  -- Inventory tracking
  total_quantity integer DEFAULT 0,
  available_quantity integer DEFAULT 0,
  reserved_quantity integer DEFAULT 0,
  sold_quantity integer DEFAULT 0,
  
  -- Costing
  average_cost numeric(10,2) DEFAULT 0,
  total_value numeric(10,2) GENERATED ALWAYS AS (available_quantity * average_cost) STORED,
  
  -- Thresholds and alerts
  low_stock_threshold integer DEFAULT 1,
  reorder_point integer DEFAULT 0,
  max_stock_level integer,
  
  -- Physical details
  location text,
  bin_location text,
  weight_oz numeric(8,2),
  dimensions text,
  
  -- Status
  is_active boolean DEFAULT true,
  last_movement_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  UNIQUE(user_id, sku),
  CONSTRAINT positive_quantities CHECK (
    total_quantity >= 0 AND 
    available_quantity >= 0 AND 
    reserved_quantity >= 0 AND
    sold_quantity >= 0
  )
);

-- =============================================
-- INVENTORY_MOVEMENTS TABLE (Audit Trail)
-- =============================================
CREATE TYPE movement_type AS ENUM (
  'initial_stock', 'restock', 'adjustment', 'sale', 'return', 
  'damage', 'theft', 'transfer', 'reservation', 'unreservation'
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  
  -- Movement details
  movement_type movement_type NOT NULL,
  quantity_change integer NOT NULL, -- Positive for additions, negative for subtractions
  quantity_before integer NOT NULL,
  quantity_after integer NOT NULL,
  
  -- Cost tracking
  unit_cost numeric(10,2),
  total_cost numeric(10,2),
  
  -- Context
  reason text,
  reference_number text,
  notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- INVENTORY_ALERTS TABLE (Low Stock Notifications)
-- =============================================
CREATE TYPE alert_type AS ENUM ('low_stock', 'out_of_stock', 'overstocked', 'negative_stock');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  
  -- Alert details
  alert_type alert_type NOT NULL,
  alert_status alert_status DEFAULT 'active',
  message text NOT NULL,
  current_quantity integer,
  threshold_quantity integer,
  
  -- Status tracking
  triggered_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Inventory items indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_sku ON inventory_items(user_id, sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON inventory_items(user_id, available_quantity) 
  WHERE available_quantity <= low_stock_threshold;

-- Inventory movements indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_user_id ON inventory_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_item_id ON inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);

-- Inventory alerts indexes
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_user_id ON inventory_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_status ON inventory_alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_type ON inventory_alerts(alert_type);

-- Items table SKU index
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_user_sku ON items(user_id, sku) WHERE sku IS NOT NULL;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- Inventory items policies
CREATE POLICY "Users can manage own inventory items"
  ON inventory_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Inventory movements policies  
CREATE POLICY "Users can manage own inventory movements"
  ON inventory_movements FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Inventory alerts policies
CREATE POLICY "Users can manage own inventory alerts"
  ON inventory_alerts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update inventory item quantities
CREATE OR REPLACE FUNCTION update_inventory_quantities()
RETURNS TRIGGER AS $$
BEGIN
  -- Update available quantity calculation
  NEW.available_quantity = NEW.total_quantity - NEW.reserved_quantity;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply inventory quantity trigger
CREATE TRIGGER update_inventory_item_quantities BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_inventory_quantities();

-- Function to create inventory movement record
CREATE OR REPLACE FUNCTION create_inventory_movement(
  p_user_id uuid,
  p_inventory_item_id uuid,
  p_movement_type movement_type,
  p_quantity_change integer,
  p_reason text DEFAULT NULL,
  p_unit_cost numeric DEFAULT NULL,
  p_reference_number text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_movement_id uuid;
  v_current_quantity integer;
  v_new_quantity integer;
BEGIN
  -- Get current quantity
  SELECT total_quantity INTO v_current_quantity
  FROM inventory_items 
  WHERE id = p_inventory_item_id AND user_id = p_user_id;
  
  IF v_current_quantity IS NULL THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;
  
  v_new_quantity := v_current_quantity + p_quantity_change;
  
  -- Prevent negative quantities (except for adjustments)
  IF v_new_quantity < 0 AND p_movement_type != 'adjustment' THEN
    RAISE EXCEPTION 'Insufficient inventory. Available: %, Requested: %', v_current_quantity, ABS(p_quantity_change);
  END IF;
  
  -- Create movement record
  INSERT INTO inventory_movements (
    user_id, inventory_item_id, movement_type, quantity_change,
    quantity_before, quantity_after, unit_cost, total_cost, 
    reason, reference_number, created_by
  ) VALUES (
    p_user_id, p_inventory_item_id, p_movement_type, p_quantity_change,
    v_current_quantity, v_new_quantity, p_unit_cost, 
    COALESCE(p_unit_cost * ABS(p_quantity_change), 0),
    p_reason, p_reference_number, p_user_id
  ) RETURNING id INTO v_movement_id;
  
  -- Update inventory item quantities
  UPDATE inventory_items 
  SET 
    total_quantity = v_new_quantity,
    last_movement_at = now(),
    -- Update average cost for additions
    average_cost = CASE 
      WHEN p_quantity_change > 0 AND p_unit_cost IS NOT NULL 
      THEN ((average_cost * v_current_quantity) + (p_unit_cost * p_quantity_change)) / v_new_quantity
      ELSE average_cost
    END
  WHERE id = p_inventory_item_id AND user_id = p_user_id;
  
  -- Check for low stock alerts
  PERFORM check_inventory_alerts(p_user_id, p_inventory_item_id);
  
  RETURN v_movement_id;
END;
$$ language 'plpgsql';

-- Function to check and create inventory alerts
CREATE OR REPLACE FUNCTION check_inventory_alerts(
  p_user_id uuid,
  p_inventory_item_id uuid
) RETURNS void AS $$
DECLARE
  v_item inventory_items%ROWTYPE;
  v_alert_message text;
BEGIN
  -- Get inventory item details
  SELECT * INTO v_item
  FROM inventory_items 
  WHERE id = p_inventory_item_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Clear existing active alerts for this item
  UPDATE inventory_alerts 
  SET alert_status = 'resolved', resolved_at = now()
  WHERE user_id = p_user_id 
    AND inventory_item_id = p_inventory_item_id 
    AND alert_status = 'active';
  
  -- Check for out of stock
  IF v_item.available_quantity <= 0 THEN
    INSERT INTO inventory_alerts (
      user_id, inventory_item_id, alert_type, message, 
      current_quantity, threshold_quantity
    ) VALUES (
      p_user_id, p_inventory_item_id, 'out_of_stock',
      format('Item "%s" (SKU: %s) is out of stock', v_item.name, v_item.sku),
      v_item.available_quantity, 0
    );
  -- Check for low stock
  ELSIF v_item.available_quantity <= v_item.low_stock_threshold THEN
    INSERT INTO inventory_alerts (
      user_id, inventory_item_id, alert_type, message,
      current_quantity, threshold_quantity
    ) VALUES (
      p_user_id, p_inventory_item_id, 'low_stock',
      format('Item "%s" (SKU: %s) is running low (%s remaining)', 
             v_item.name, v_item.sku, v_item.available_quantity),
      v_item.available_quantity, v_item.low_stock_threshold
    );
  END IF;
END;
$$ language 'plpgsql';

-- Function to reserve inventory for listings
CREATE OR REPLACE FUNCTION reserve_inventory_for_listing(
  p_user_id uuid,
  p_item_id uuid,
  p_quantity integer
) RETURNS boolean AS $$
DECLARE
  v_inventory_item_id uuid;
  v_available_quantity integer;
BEGIN
  -- Find inventory item by item SKU or create if needed
  SELECT ii.id, ii.available_quantity INTO v_inventory_item_id, v_available_quantity
  FROM inventory_items ii
  JOIN items i ON ii.sku = i.sku
  WHERE i.id = p_item_id AND ii.user_id = p_user_id;
  
  -- If no inventory item found, return false
  IF v_inventory_item_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if enough quantity available
  IF v_available_quantity < p_quantity THEN
    RETURN false;
  END IF;
  
  -- Reserve the quantity
  UPDATE inventory_items 
  SET reserved_quantity = reserved_quantity + p_quantity
  WHERE id = v_inventory_item_id;
  
  -- Create movement record
  PERFORM create_inventory_movement(
    p_user_id, v_inventory_item_id, 'reservation', 
    0, -- No change to total quantity
    format('Reserved %s units for listing', p_quantity),
    NULL, -- No cost for reservation
    p_item_id::text
  );
  
  RETURN true;
END;
$$ language 'plpgsql';

-- Function to process sale and update inventory
CREATE OR REPLACE FUNCTION process_inventory_sale(
  p_user_id uuid,
  p_listing_id uuid,
  p_quantity_sold integer
) RETURNS void AS $$
DECLARE
  v_inventory_item_id uuid;
  v_item_id uuid;
BEGIN
  -- Get item and inventory details
  SELECT l.item_id INTO v_item_id
  FROM listings l
  WHERE l.id = p_listing_id AND l.user_id = p_user_id;
  
  SELECT ii.id INTO v_inventory_item_id
  FROM inventory_items ii
  JOIN items i ON ii.sku = i.sku
  WHERE i.id = v_item_id AND ii.user_id = p_user_id;
  
  IF v_inventory_item_id IS NOT NULL THEN
    -- Unreserve and reduce inventory
    UPDATE inventory_items 
    SET 
      reserved_quantity = GREATEST(0, reserved_quantity - p_quantity_sold),
      sold_quantity = sold_quantity + p_quantity_sold
    WHERE id = v_inventory_item_id;
    
    -- Create movement record
    PERFORM create_inventory_movement(
      p_user_id, v_inventory_item_id, 'sale', 
      -p_quantity_sold,
      format('Sale of %s units from listing', p_quantity_sold),
      NULL,
      p_listing_id::text
    );
  END IF;
  
  -- Update listing quantities
  UPDATE listings 
  SET quantity_sold = quantity_sold + p_quantity_sold
  WHERE id = p_listing_id AND user_id = p_user_id;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to new tables
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_alerts_updated_at BEFORE UPDATE ON inventory_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Inventory Management System added successfully!';
  RAISE NOTICE 'Tables created: inventory_items, inventory_movements, inventory_alerts';
  RAISE NOTICE 'Features: Stock tracking, automatic reservations, low stock alerts';
  RAISE NOTICE 'Functions: Inventory movements, sales processing, alert management';
  RAISE NOTICE 'Triggers: Automatic quantity calculations and audit trails';
  RAISE NOTICE 'Ready for full inventory management functionality!';
END $$;