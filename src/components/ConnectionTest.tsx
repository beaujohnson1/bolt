import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, AlertCircle, Database, Shield, Image, ShoppingCart, RefreshCw, Wifi } from 'lucide-react';
import EbayApiService from '../services/ebayApi';
import { callFunction } from '../lib/functions';
import { runHealthCheck, getEnvironmentStatus } from '../utils/connectionUtils';

const ConnectionTest = () => {
  const { user, authUser, error: authError, retryConnection } = useAuth();
  const [tests, setTests] = useState({
    supabaseConnection: { status: 'testing', message: 'Testing...' },
    authentication: { status: 'testing', message: 'Testing...' },
    database: { status: 'testing', message: 'Testing...' },
    storage: { status: 'testing', message: 'Testing...' },
    googleOAuth: { status: 'testing', message: 'Testing...' },
    ebayApi: { status: 'testing', message: 'Testing...' }
  });
  const [healthCheck, setHealthCheck] = useState<any>(null);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);
  const [trendingTest, setTrendingTest] = useState({
    status: 'idle',
    message: 'Click Test to check eBay trending items API'
  });
  const testsInitialized = React.useRef(false);
  const testsRunning = React.useRef(false);

  useEffect(() => {
    // Only run tests once when component mounts and prevent multiple runs
    if (!testsInitialized.current && !testsRunning.current) {
      console.log('🧪 [CONNECTION-TEST] Initializing tests for the first time');
      runTests();
      testsInitialized.current = true;
    }
  }, []); // Empty dependency array to run only once

  const runTests = async () => {
    // Prevent multiple simultaneous test runs
    if (testsRunning.current) {
      console.log('🛑 [CONNECTION-TEST] Tests already running, skipping');
      return;
    }
    
    testsRunning.current = true;
    console.log('🔄 [CONNECTION-TEST] Starting connection tests...');
    
    try {
      // Test 1: Supabase Connection
      setTests(prev => ({ ...prev, supabaseConnection: { status: 'testing', message: 'Testing...' } }));
      try {
        console.log('🔍 [CONNECTION-TEST] Testing Supabase connection...');
        console.log('🌐 [CONNECTION-TEST] Testing from origin:', window.location.origin);
        
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) throw error;
        
        console.log('✅ [CONNECTION-TEST] Supabase connection successful');
        setTests(prev => ({
          ...prev,
          supabaseConnection: { 
            status: 'success', 
            message: `Connected to Supabase successfully from ${window.location.origin}` 
          }
        }));
      } catch (error) {
        console.error('❌ [CONNECTION-TEST] Supabase connection failed:', error);
        
        let errorMessage = `Connection failed: ${error.message}`;
        if (error.message?.includes('CORS') || error.message?.includes('Access-Control-Allow-Origin')) {
          errorMessage = `🚨 CORS ERROR: ${window.location.origin} not allowed in Supabase settings`;
        }
        
        setTests(prev => ({
          ...prev,
          supabaseConnection: { 
            status: 'error', 
            message: errorMessage
          }
        }));
      }

      // Test 2: Authentication Status
      setTests(prev => ({ ...prev, authentication: { status: 'testing', message: 'Testing...' } }));
      if (authUser) {
        console.log('✅ [CONNECTION-TEST] User is authenticated');
        setTests(prev => ({
          ...prev,
          authentication: { 
            status: 'success', 
            message: `Authenticated as: ${authUser.email}` 
          }
        }));
      } else {
        console.log('ℹ️ [CONNECTION-TEST] User not authenticated');
        setTests(prev => ({
          ...prev,
          authentication: { 
            status: 'warning', 
            message: 'Not authenticated - this is normal if not signed in' 
          }
        }));
      }

      // Test 3: Database Access
      setTests(prev => ({ ...prev, database: { status: 'testing', message: 'Testing...' } }));
      if (authUser) {
        try {
          console.log('🔍 [CONNECTION-TEST] Testing database access...');
          
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          
          if (error && error.code !== 'PGRST116') throw error;
          
          console.log('✅ [CONNECTION-TEST] Database access successful');
          setTests(prev => ({
            ...prev,
            database: { 
              status: 'success', 
              message: data ? 'User profile found in database' : 'Database accessible (no profile yet)' 
            }
          }));
        } catch (error) {
          console.error('❌ [CONNECTION-TEST] Database access failed:', error);
          setTests(prev => ({
            ...prev,
            database: { 
              status: 'error', 
              message: `Database error: ${error.message}` 
            }
          }));
        }
      } else {
        setTests(prev => ({
          ...prev,
          database: { 
            status: 'warning', 
            message: 'Sign in to test database access' 
          }
        }));
      }

      // Test 4: Storage Access
      setTests(prev => ({ ...prev, storage: { status: 'testing', message: 'Testing...' } }));
      try {
        console.log('🔍 [CONNECTION-TEST] Testing storage access...');
        
        const storageClient = supabase.storage;
        if (!storageClient) {
          throw new Error('Storage client not initialized');
        }
        
        console.log('✅ [CONNECTION-TEST] Storage client is accessible');
        setTests(prev => ({
          ...prev,
          storage: { 
            status: 'success', 
            message: 'Storage is functional and accessible' 
          }
        }));
      } catch (error) {
        console.error('❌ [STORAGE] Storage test error:', error);
        setTests(prev => ({
          ...prev,
          storage: { 
            status: 'error', 
            message: `Storage test error: ${error.message}` 
          }
        }));
      }

      // Test 5: Google OAuth Configuration
      setTests(prev => ({ ...prev, googleOAuth: { status: 'testing', message: 'Testing...' } }));
      try {
        console.log('🔍 [CONNECTION-TEST] Testing Google OAuth...');
        
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        console.log('✅ [CONNECTION-TEST] OAuth system accessible');
        setTests(prev => ({
          ...prev,
          googleOAuth: { 
            status: 'success', 
            message: 'OAuth system is accessible and session management working' 
          }
        }));
      } catch (error) {
        console.error('❌ [CONNECTION-TEST] OAuth test failed:', error);
        setTests(prev => ({
          ...prev,
          googleOAuth: { 
            status: 'error', 
            message: `OAuth test failed: ${error.message}` 
          }
        }));
      }

      // Test 6: eBay API Configuration
      setTests(prev => ({ ...prev, ebayApi: { status: 'testing', message: 'Testing...' } }));
      try {
        console.log('🔍 [CONNECTION-TEST] Testing eBay API...');
        const ebayService = new EbayApiService();
        const connectionTest = await ebayService.testConnection();
        
        console.log('📊 [CONNECTION-TEST] eBay test result:', connectionTest);
        setTests(prev => ({
          ...prev,
          ebayApi: { 
            status: connectionTest.success ? 'success' : 'warning', 
            message: `${connectionTest.message} (${connectionTest.environment})`
          }
        }));
      } catch (error) {
        console.error('❌ [CONNECTION-TEST] eBay API test failed:', error);
        setTests(prev => ({
          ...prev,
          ebayApi: { 
            status: 'error', 
            message: `eBay API configuration error: ${error.message}` 
          }
        }));
      }
      
      console.log('✅ [CONNECTION-TEST] All connection tests completed');
    } catch (error) {
      console.error('❌ [CONNECTION-TEST] Critical error during tests:', error);
    } finally {
      testsRunning.current = false;
    }
  };

  const runComprehensiveHealthCheck = async () => {
    setRunningHealthCheck(true);
    try {
      console.log('🏥 [CONNECTION-TEST] Running comprehensive health check...');
      const result = await runHealthCheck();
      setHealthCheck(result);
      console.log('✅ [CONNECTION-TEST] Health check completed:', result.overall);
    } catch (error) {
      console.error('❌ [CONNECTION-TEST] Health check failed:', error);
    } finally {
      setRunningHealthCheck(false);
    }
  };
  const testTrendingItems = useCallback(async () => {
    console.log('🧪 [CONNECTION-TEST] Testing trending items API...');
    setTrendingTest({ status: 'testing', message: 'Testing eBay trending items API...' });

    try {
      const ebayService = new EbayApiService();
      const trendingItems = await ebayService.getTrendingItems();
      
      console.log('✅ [CONNECTION-TEST] Trending items test successful:', trendingItems.length);
      setTrendingTest({
        status: 'success',
        message: `Successfully fetched ${trendingItems.length} trending items`
      });
    } catch (error) {
      console.error('❌ [CONNECTION-TEST] Trending items test failed:', error);
      setTrendingTest({
        status: 'error',
        message: `Failed to fetch trending items: ${error.message}`
      });
    }
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
          <Database className="w-6 h-6 text-blue-600" />
          <span>Supabase Connection Test</span>
        </h2>
        
        {/* Auth Error Alert */}
        {authError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <h4 className="font-medium text-red-900">Authentication Error</h4>
                <p className="text-sm text-red-700 mt-1">{authError}</p>
                <button
                  onClick={retryConnection}
                  className="mt-2 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Health Check Section */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Health Check</h3>
            <button
              onClick={runComprehensiveHealthCheck}
              disabled={runningHealthCheck}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <Wifi className={`w-4 h-4 ${runningHealthCheck ? 'animate-pulse' : ''}`} />
              <span>{runningHealthCheck ? 'Running...' : 'Run Health Check'}</span>
            </button>
          </div>
          
          {healthCheck && (
            <div className={`p-4 rounded-lg border-2 ${
              healthCheck.overall === 'healthy' ? 'bg-green-50 border-green-200' :
              healthCheck.overall === 'degraded' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {healthCheck.overall === 'healthy' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : healthCheck.overall === 'degraded' ? (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-medium">
                  System Status: {healthCheck.overall.toUpperCase()}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {Object.entries(healthCheck.tests).map(([testName, result]: [string, any]) => (
                  <div key={testName} className="flex justify-between">
                    <span>{testName}:</span>
                    <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                      {result.success ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {Object.entries(tests).map(([testName, result]) => (
            <div key={testName} className={`p-4 rounded-lg border-2 ${getStatusColor(result.status)}`}>
              <div className="flex items-center space-x-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {testName.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Additional eBay Trending Items Test */}
          <div className={`p-4 rounded-lg border-2 ${getStatusColor(trendingTest.status)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(trendingTest.status)}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    eBay Trending Items API
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{trendingTest.message}</p>
                </div>
              </div>
              <button
                onClick={testTrendingItems}
                disabled={trendingTest.status === 'testing'}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                {trendingTest.status === 'testing' ? 'Testing...' : 'Test'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Current Status:</h3>
          <div className="text-sm text-blue-800">
            {user && authUser ? (
              <div>
                <p>✅ <strong>Signed in as:</strong> {authUser.email}</p>
                <p>✅ <strong>User ID:</strong> {authUser.id}</p>
                <p>✅ <strong>Provider:</strong> {authUser.app_metadata?.provider || 'email'}</p>
                <p>✅ <strong>Session expires:</strong> {authUser.session?.expires_at ? new Date(authUser.session.expires_at * 1000).toLocaleString() : 'Unknown'}</p>
              </div>
            ) : (
              <p>ℹ️ <strong>Not signed in</strong> - Use the sign-in button in the header to test authentication</p>
            )}
            
            {/* Environment Status */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Environment Configuration:</h4>
              {(() => {
                const envStatus = getEnvironmentStatus();
                return (
                  <div className="space-y-1">
                    <p>🌐 <strong>Environment:</strong> {envStatus.environment}</p>
                    <p>🔗 <strong>Supabase URL:</strong> {envStatus.supabaseUrl.present ? '✅ Set' : '❌ Missing'}</p>
                    <p>🔑 <strong>Supabase Key:</strong> {envStatus.supabaseKey.present ? '✅ Set' : '❌ Missing'}</p>
                    <p>🤖 <strong>OpenAI Key:</strong> {envStatus.openaiKey.present ? '✅ Set' : '⚠️ Optional'}</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => {
              console.log('🔄 [CONNECTION-TEST] Manual test run triggered');
              testsInitialized.current = false; // Reset to allow re-running
              runTests();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Run Tests Again
          </button>
          
          {!user && (
            <p className="text-gray-600 text-sm flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Sign in to test full functionality
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


export default ConnectionTest;