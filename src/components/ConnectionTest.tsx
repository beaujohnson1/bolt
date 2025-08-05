import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, AlertCircle, Database, Shield, Image, ShoppingCart } from 'lucide-react';
import EbayApiService from '../services/ebayApi';

const ConnectionTest = () => {
  const { user, authUser } = useAuth();
  const [tests, setTests] = useState({
    supabaseConnection: { status: 'testing', message: 'Testing...' },
    authentication: { status: 'testing', message: 'Testing...' },
    database: { status: 'testing', message: 'Testing...' },
    storage: { status: 'testing', message: 'Testing...' },
    googleOAuth: { status: 'testing', message: 'Testing...' },
    ebayApi: { status: 'testing', message: 'Testing...' }
  });
  const [trendingTest, setTrendingTest] = useState({
    status: 'idle',
    message: 'Click Test to check eBay trending items API'
  });

  useEffect(() => {
    runTests();
  }, [user, authUser]);

  const runTests = async () => {
    // Test 1: Supabase Connection
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) throw error;
      
      setTests(prev => ({
        ...prev,
        supabaseConnection: { 
          status: 'success', 
          message: 'Connected to Supabase successfully' 
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        supabaseConnection: { 
          status: 'error', 
          message: `Connection failed: ${error.message}` 
        }
      }));
    }

    // Test 2: Authentication Status
    if (authUser) {
      setTests(prev => ({
        ...prev,
        authentication: { 
          status: 'success', 
          message: `Authenticated as: ${authUser.email}` 
        }
      }));
    } else {
      setTests(prev => ({
        ...prev,
        authentication: { 
          status: 'warning', 
          message: 'Not authenticated - this is normal if not signed in' 
        }
      }));
    }

    // Test 3: Database Access
    if (authUser) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        setTests(prev => ({
          ...prev,
          database: { 
            status: 'success', 
            message: data ? 'User profile found in database' : 'Database accessible (no profile yet)' 
          }
        }));
      } catch (error) {
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
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      
      const itemImagesBucket = data?.find(bucket => bucket.name === 'item-images');
      if (!itemImagesBucket) {
        throw new Error('item-images bucket not found in bucket list');
      }
      
      setTests(prev => ({
        ...prev,
        storage: { 
          status: 'success', 
          message: `Storage bucket "item-images" found and accessible` 
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        storage: { 
          status: 'error', 
          message: `Storage error: ${error.message}` 
        }
      }));
    }

    // Test 5: Google OAuth Configuration
    try {
      const { data: { providers } } = await supabase.auth.getOAuthProviders();
      const googleEnabled = providers?.some(p => p.name === 'google');
      
      setTests(prev => ({
        ...prev,
        googleOAuth: { 
          status: googleEnabled ? 'success' : 'warning', 
          message: googleEnabled ? 'Google OAuth is configured' : 'Google OAuth not enabled' 
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        googleOAuth: { 
          status: 'error', 
          message: `OAuth test failed: ${error.message}` 
        }
      }));
    }

    // Test 6: eBay API Configuration
    try {
      const ebayService = new EbayApiService();
      const connectionTest = await ebayService.testConnection();
      const config = ebayService.getConfig();
      
      setTests(prev => ({
        ...prev,
        ebayApi: { 
          status: connectionTest.success ? 'success' : 'warning', 
          message: `${connectionTest.message} (${connectionTest.environment})`
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        ebayApi: { 
          status: 'error', 
          message: `eBay API configuration error: ${error.message}` 
        }
      }));
    }
  };

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
              </div>
            ) : (
              <p>ℹ️ <strong>Not signed in</strong> - Use the sign-in button in the header to test authentication</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex space-x-4">
          <button
            onClick={runTests}
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