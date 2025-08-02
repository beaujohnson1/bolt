import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

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