import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[SUPABASE] Missing environment variables:', {
    VITE_SUPABASE_URL_present: !!SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY_present: !!SUPABASE_ANON_KEY,
    currentOrigin: window.location.origin
  });
  throw new Error('Supabase environment variables missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

console.log('[SUPABASE] Initializing client with:', {
  url: SUPABASE_URL,
  origin: window.location.origin,
  hasKey: !!SUPABASE_ANON_KEY
});

// Use local proxy for auth requests in production
const getAuthUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname === 'easyflip.ai') {
    return `${window.location.origin}/api/auth`;
  }
  return `${SUPABASE_URL}/auth/v1`;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    // Override auth URL to use proxy in production
    url: typeof window !== 'undefined' && window.location.hostname === 'easyflip.ai' 
      ? `${window.location.origin}/api/auth` 
      : undefined
  }
});

// Legacy function for backward compatibility
export function getSupabase(): SupabaseClient | null {
  return supabase;
}

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