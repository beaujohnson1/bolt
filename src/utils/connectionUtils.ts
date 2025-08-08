// Utility functions for testing and managing Supabase connections

import { supabase } from '../lib/supabase';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Test basic Supabase connectivity
 */
export const testSupabaseConnection = async (): Promise<ConnectionTestResult> => {
  try {
    console.log('🧪 [CONNECTION-TEST] Testing basic Supabase connection...');
    console.log('🌐 [CONNECTION-TEST] Testing from origin:', window.location.origin);
    
    const startTime = Date.now();
    
    // Test with a simple query that doesn't require authentication
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.error('❌ [CONNECTION-TEST] Supabase query failed:', error);
      
      // Check for CORS-specific errors
      if (error.message?.includes('CORS') || error.message?.includes('Access-Control-Allow-Origin')) {
        return {
          success: false,
          message: `CORS Error: ${window.location.origin} is not allowed. Update Supabase dashboard settings.`,
          details: { error, duration, origin: window.location.origin },
          timestamp: new Date().toISOString()
        };
      }
      
      return {
        success: false,
        message: `Database query failed: ${error.message}`,
        details: { error, duration },
        timestamp: new Date().toISOString()
      };
    }
    
    console.log('✅ [CONNECTION-TEST] Supabase connection successful');
    return {
      success: true,
      message: `Connected successfully in ${duration}ms`,
      details: { duration, queryResult: data },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ [CONNECTION-TEST] Connection test failed:', error);
    
    // Enhanced CORS error detection
    if (error.message?.includes('CORS') || 
        error.message?.includes('Access-Control-Allow-Origin') ||
        error.message?.includes('blocked by CORS policy')) {
      return {
        success: false,
        message: `CORS Error: Supabase is blocking requests from ${window.location.origin}. Please update Supabase dashboard settings.`,
        details: { error: error.message, origin: window.location.origin },
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Test authentication system
 */
export const testAuthSystem = async (): Promise<ConnectionTestResult> => {
  try {
    console.log('🧪 [CONNECTION-TEST] Testing auth system...');
    
    const startTime = Date.now();
    
    // Test getting current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.error('❌ [CONNECTION-TEST] Auth system test failed:', error);
      return {
        success: false,
        message: `Auth system error: ${error.message}`,
        details: { error, duration },
        timestamp: new Date().toISOString()
      };
    }
    
    console.log('✅ [CONNECTION-TEST] Auth system working');
    return {
      success: true,
      message: `Auth system working (${session ? 'authenticated' : 'not authenticated'}) - ${duration}ms`,
      details: { duration, hasSession: !!session, userId: session?.user?.id },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ [CONNECTION-TEST] Auth test failed:', error);
    return {
      success: false,
      message: `Auth test failed: ${error.message}`,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Test storage access
 */
export const testStorageAccess = async (): Promise<ConnectionTestResult> => {
  try {
    console.log('🧪 [CONNECTION-TEST] Testing storage access...');
    
    const startTime = Date.now();
    
    // Test listing buckets (doesn't require authentication)
    const { data, error } = await supabase.storage.listBuckets();
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.error('❌ [CONNECTION-TEST] Storage test failed:', error);
      return {
        success: false,
        message: `Storage error: ${error.message}`,
        details: { error, duration },
        timestamp: new Date().toISOString()
      };
    }
    
    console.log('✅ [CONNECTION-TEST] Storage access working');
    return {
      success: true,
      message: `Storage accessible (${data?.length || 0} buckets) - ${duration}ms`,
      details: { duration, buckets: data?.map(b => b.name) },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('❌ [CONNECTION-TEST] Storage test failed:', error);
    return {
      success: false,
      message: `Storage test failed: ${error.message}`,
      details: { error: error.message },
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Comprehensive connection health check
 */
export const runHealthCheck = async (): Promise<{
  overall: 'healthy' | 'degraded' | 'unhealthy';
  tests: Record<string, ConnectionTestResult>;
}> => {
  console.log('🏥 [HEALTH-CHECK] Running comprehensive health check...');
  
  const tests = {
    supabase: await testSupabaseConnection(),
    auth: await testAuthSystem(),
    storage: await testStorageAccess()
  };
  
  const successCount = Object.values(tests).filter(test => test.success).length;
  const totalTests = Object.keys(tests).length;
  
  let overall: 'healthy' | 'degraded' | 'unhealthy';
  if (successCount === totalTests) {
    overall = 'healthy';
  } else if (successCount > 0) {
    overall = 'degraded';
  } else {
    overall = 'unhealthy';
  }
  
  console.log(`🏥 [HEALTH-CHECK] Health check complete: ${overall} (${successCount}/${totalTests} tests passed)`);
  
  return { overall, tests };
};

/**
 * Get environment configuration status
 */
export const getEnvironmentStatus = () => {
  const config = {
    supabaseUrl: {
      present: !!import.meta.env.VITE_SUPABASE_URL,
      value: import.meta.env.VITE_SUPABASE_URL ? 
        `${import.meta.env.VITE_SUPABASE_URL.substring(0, 20)}...` : 
        'Not set'
    },
    supabaseKey: {
      present: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      value: import.meta.env.VITE_SUPABASE_ANON_KEY ? 
        `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
        'Not set'
    },
    openaiKey: {
      present: !!import.meta.env.VITE_OPENAI_API_KEY,
      value: import.meta.env.VITE_OPENAI_API_KEY ? 
        `${import.meta.env.VITE_OPENAI_API_KEY.substring(0, 20)}...` : 
        'Not set'
    },
    environment: import.meta.env.MODE,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD
  };
  
  return config;
};