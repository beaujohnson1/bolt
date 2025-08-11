// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

// tiny fetch with timeout + better error surfacing
const timeoutFetch: typeof fetch = async (input, init={}) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 8000); // 8 seconds timeout
  try {
    const res = await fetch(input as any, { ...init, signal: ctrl.signal });
    return res;
  } catch (e) {
    console.warn('[SUPABASE-FETCH] network error', { input, err: String(e) });
    throw e;
  } finally {
    clearTimeout(id);
  }
};

export function getSupabase(): SupabaseClient | null {
  if (client) return client;

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  console.log('[SUPABASE_DEBUG] Attempting to initialize Supabase client...');
  console.log('[SUPABASE_DEBUG] VITE_SUPABASE_URL:', url ? 'present' : 'missing', url ? `(length: ${url.length})` : '');
  console.log('[SUPABASE_DEBUG] VITE_SUPABASE_ANON_KEY:', anon ? 'present' : 'missing', anon ? `(length: ${anon.length})` : '');

  if (!url || !anon) {
    console.warn(
      'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
    );
    console.warn('Current values:', {
      VITE_SUPABASE_URL_present: !!url,
      VITE_SUPABASE_ANON_KEY_present: !!anon,
      VITE_SUPABASE_URL_host: url ? new URL(url).host : null
    });
    return null;
  }

  try {
    client = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce', // This is important for secure authentication flows
      },
      global: { fetch: timeoutFetch }, // This adds the timeout to all Supabase client requests
    });
    console.log('✅ [SUPABASE_DEBUG] Supabase client initialized successfully');
    return client;
  } catch (error) {
    console.error('❌ [SUPABASE_DEBUG] Failed to initialize Supabase client:', error);
    return null;
  }
}

// Legacy export for backward compatibility - will be removed gradually
export const supabase = getSupabase();

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
