import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Enhanced fetch with CORS handling and better timeout
const corsAwareFetch: typeof fetch = async (input, init = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('[SUPABASE-FETCH] Request timeout after 20 seconds');
    controller.abort();
  }, 20000); // 20 second timeout for production
  
  try {
    const url = typeof input === 'string' ? input : input.toString();
    console.log('[SUPABASE-FETCH] Making request to:', url);
    console.log('[SUPABASE-FETCH] Origin:', window.location.origin);
    
    const response = await fetch(input as any, { 
      ...init, 
      signal: controller.signal,
      // Add CORS and connectivity headers
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Request-Method': init.method || 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization, apikey',
        ...init.headers
      }
    });
    
    console.log('[SUPABASE-FETCH] Response received:', {
      status: response.status,
      ok: response.ok,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    return response;
  } catch (error: any) {
    console.error('[SUPABASE-FETCH] Network error:', {
      message: error.message,
      name: error.name,
      url: typeof input === 'string' ? input : input.toString(),
      origin: window.location.origin
    });
    
    // Provide more specific error messages
    if (error.name === 'AbortError') {
      throw new Error('Request timed out - please check your internet connection');
    } else if (error.message?.includes('CORS')) {
      throw new Error(`CORS error - Supabase is blocking requests from ${window.location.origin}. Please update Supabase dashboard settings.`);
    } else if (error.message?.includes('Failed to fetch')) {
      throw new Error(`Unable to connect to Supabase from ${window.location.origin} - please check CORS settings in Supabase dashboard`);
    } else {
      throw new Error(`Network connection failed. Please check your internet connection or try again. If the problem persists, verify Supabase CORS settings.`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
};

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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: import.meta.env.DEV, // Enable debug logging in development
    // Production-specific auth settings
    redirectTo: import.meta.env.PROD ? 'https://easyflip.ai/auth/callback' : undefined,
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.warn('[SUPABASE-STORAGE] Error getting item:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('[SUPABASE-STORAGE] Error setting item:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('[SUPABASE-STORAGE] Error removing item:', error);
        }
      }
    }
  },
  global: { 
    fetch: corsAwareFetch,
    headers: {
      'X-Client-Info': 'easyflip-web-app',
      'X-Client-Origin': window.location.origin
    }
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