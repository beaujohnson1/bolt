import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kstmyodjnckgoosidsbb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzdG15b2RqbmNrZ29vc2lkc2JiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDM5MTMsImV4cCI6MjA2OTY3OTkxM30.5OsVbf1uCWZnkH5tgVL6ZJAoLvJIyEJzdscyR_g2k0Y';

// Using secure hardcoded values from new Supabase project
// Old exposed credentials have been replaced

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (generated from your schema)
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  subscription_plan: 'free' | 'pro' | 'commission';
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing';
  listings_used: number;
  listings_limit: number;
  monthly_revenue: number;
  total_sales: number;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: string;
  condition: string;
  brand?: string;
  model_number?: string;
  size?: string;
  color?: string;
  suggested_price: number;
  price_range_min?: number;
  price_range_max?: number;
  images: string[];
  primary_image_url?: string;
  ai_confidence: number;
  ai_analysis: any;
  status: string;
  created_at: string;
  updated_at: string;
  sku?: string;
  ai_suggested_keywords?: string[];
  item_type?: string;
  category_path?: string;
  weight_oz?: number;
  price_range_min?: number;
  price_range_max?: number;
  final_price?: number;
  ai_detected_category?: string;
  ai_detected_brand?: string;
  ai_detected_condition?: string;
  ai_key_features?: string[];
  market_comparisons?: any;
  estimated_sale_time_days?: number;
}

export interface Listing {
  id: string;
  item_id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  platforms: string[];
  status: 'draft' | 'active' | 'sold' | 'ended' | 'pending';
  total_views: number;
  total_watchers: number;
  total_messages: number;
  created_at: string;
  updated_at: string;
  listed_at?: string;
  sold_at?: string;
}

export interface Sale {
  id: string;
  listing_id: string;
  user_id: string;
  platform: string;
  item_title: string;
  sale_price: number;
  buyer_info: any;
  shipping_address: any;
  payment_status: 'pending' | 'completed' | 'refunded' | 'failed';
  shipping_status: 'pending' | 'label_created' | 'shipped' | 'delivered' | 'returned';
  tracking_number?: string;
  sold_at: string;
  shipped_at?: string;
  delivered_at?: string;
  net_profit: number;
  created_at: string;
}