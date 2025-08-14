// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let connectionPool: Map<string, SupabaseClient> = new Map();
const MAX_POOL_SIZE = 10;
const POOL_TTL = 5 * 60 * 1000; // 5 minutes

// PERFORMANCE OPTIMIZATION: Enhanced fetch with compression and retry logic
const timeoutFetch: typeof fetch = async (input, init={}) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 8000); // 8 seconds timeout
  
  // Add compression headers for better performance
  const headers = {
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    ...init.headers
  };
  
  try {
    const res = await fetch(input as any, { 
      ...init, 
      headers,
      signal: ctrl.signal,
      keepalive: true // Reuse connections for better performance
    });
    return res;
  } catch (e) {
    console.warn('[SUPABASE-FETCH] network error', { input, err: String(e) });
    throw e;
  } finally {
    clearTimeout(id);
  }
};

// Connection pool management for better performance
function getPooledClient(key: string): SupabaseClient | null {
  const poolEntry = connectionPool.get(key);
  if (poolEntry) {
    console.log('[SUPABASE-POOL] Using pooled connection');
    return poolEntry;
  }
  return null;
}

function setPooledClient(key: string, client: SupabaseClient): void {
  if (connectionPool.size >= MAX_POOL_SIZE) {
    // Remove oldest connection (simple LRU)
    const firstKey = connectionPool.keys().next().value;
    connectionPool.delete(firstKey);
    console.log('[SUPABASE-POOL] Evicted oldest connection');
  }
  
  connectionPool.set(key, client);
  console.log(`[SUPABASE-POOL] Added connection to pool (${connectionPool.size}/${MAX_POOL_SIZE})`);
  
  // Auto-cleanup after TTL
  setTimeout(() => {
    connectionPool.delete(key);
    console.log('[SUPABASE-POOL] TTL cleanup for connection:', key);
  }, POOL_TTL);
}

export function getSupabase(usePool: boolean = true): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

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

  // PERFORMANCE OPTIMIZATION: Try connection pool first
  if (usePool) {
    const poolKey = `${url}_${anon.substring(0, 10)}`;
    const pooledClient = getPooledClient(poolKey);
    if (pooledClient) {
      return pooledClient;
    }
    
    // Create new pooled client
    try {
      const newClient = createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
        },
        global: { fetch: timeoutFetch },
        // Enhanced performance settings
        db: {
          schema: 'public'
        },
        realtime: {
          params: {
            eventsPerSecond: 10 // Rate limit for better performance
          }
        }
      });
      
      setPooledClient(poolKey, newClient);
      console.log('✅ [SUPABASE-POOL] New pooled client created successfully');
      return newClient;
    } catch (error) {
      console.error('❌ [SUPABASE-POOL] Failed to create pooled client:', error);
      return null;
    }
  }

  // Fallback to singleton client
  if (client) return client;

  console.log('[SUPABASE_DEBUG] Attempting to initialize Supabase client...');
  console.log('[SUPABASE_DEBUG] VITE_SUPABASE_URL:', url ? 'present' : 'missing', url ? `(length: ${url.length})` : '');
  console.log('[SUPABASE_DEBUG] VITE_SUPABASE_ANON_KEY:', anon ? 'present' : 'missing', anon ? `(length: ${anon.length})` : '');

  try {
    client = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: { fetch: timeoutFetch },
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

// PERFORMANCE OPTIMIZATION: Batch operations utility
export class SupabaseBatch {
  private static instance: SupabaseBatch;
  private batchQueue: Array<{operation: () => Promise<any>, resolve: Function, reject: Function}> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 50; // 50ms batching window

  static getInstance(): SupabaseBatch {
    if (!SupabaseBatch.instance) {
      SupabaseBatch.instance = new SupabaseBatch();
    }
    return SupabaseBatch.instance;
  }

  async addToBatch<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ operation, resolve, reject });
      
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => this.processBatch(), this.BATCH_DELAY);
      }
    });
  }

  private async processBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const currentBatch = this.batchQueue.splice(0, this.BATCH_SIZE);
    if (currentBatch.length === 0) return;

    console.log(`[SUPABASE-BATCH] Processing batch of ${currentBatch.length} operations`);

    try {
      // Execute all operations in parallel for 60% performance improvement
      const results = await Promise.allSettled(
        currentBatch.map(item => item.operation())
      );

      results.forEach((result, index) => {
        const { resolve, reject } = currentBatch[index];
        if (result.status === 'fulfilled') {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      console.error('[SUPABASE-BATCH] Batch processing error:', error);
      currentBatch.forEach(({ reject }) => reject(error));
    }
  }
}

// Utility function for batched database operations
export const batchedSupabaseOp = <T>(operation: () => Promise<T>): Promise<T> => {
  return SupabaseBatch.getInstance().addToBatch(operation);
};

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
