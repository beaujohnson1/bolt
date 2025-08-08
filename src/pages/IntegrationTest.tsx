import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader, Camera, Database, Brain, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { callFunction } from '../lib/functions';
import { supabase } from '../lib/supabase';

const IntegrationTest = () => {
  const [tests, setTests] = useState({
    supabase: { status: 'idle', message: 'Not tested' },
    googleVision: { status: 'idle', message: 'Not tested' },
    openaiVision: { status: 'idle', message: 'Not tested' },
    ebayApi: { status: 'idle', message: 'Not tested' }
  });
  const [testing, setTesting] = useState(false);

  const runAllTests = async () => {
    setTesting(true);
    
    // Reset all tests
    setTests({
      supabase: { status: 'testing', message: 'Testing connection...' },
      googleVision: { status: 'testing', message: 'Testing OCR...' },
      openaiVision: { status: 'testing', message: 'Testing AI analysis...' },
      ebayApi: { status: 'testing', message: 'Testing eBay API...' }
    });

    // Test 1: Supabase Connection
    try {
      console.log('🧪 [INTEGRATION-TEST] Testing Supabase connection...');
      
      // Test actual connection by making a simple query
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) throw error;
      
      setTests(prev => ({
        ...prev,
        supabase: { status: 'success', message: 'Supabase connection successful' }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        supabase: { status: 'error', message: error.message }
      }));
    }

    // Test 2: Google Vision API
    try {
      console.log('🧪 [INTEGRATION-TEST] Testing Google Vision API...');
      
      const result = await callFunction('test-google-vision', { method: 'GET' });
      
      if (result.success || result.mock) {
        setTests(prev => ({
          ...prev,
          googleVision: { 
            status: 'success', 
            message: result.mock 
              ? 'Mock Google Vision (functions not available in sandbox)' 
              : 'Google Vision API connected successfully' 
          }
        }));
      } else {
        throw new Error(result.error || result.reason || 'Google Vision test failed');
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        googleVision: { status: 'error', message: `Google Vision error: ${error.message}` }
      }));
    }

    // Test 3: OpenAI Vision Analysis
    try {
      // Create a simple test image (1x1 pixel base64)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      console.log('🧪 [INTEGRATION-TEST] Testing OpenAI Vision analysis...');
      
      const result = await callFunction('openai-vision-analysis', {
        method: 'POST',
        body: JSON.stringify({
          imageUrls: [`data:image/png;base64,${testImageBase64}`],
          analysisType: 'enhanced_listing'
        })
      });
      
      if ((result.ok && result.data) || result.mock) {
        setTests(prev => ({
          ...prev,
          openaiVision: { 
            status: 'success', 
            message: result.mock 
              ? 'Mock OpenAI Vision (functions not available in sandbox)' 
              : 'OpenAI Vision analysis working correctly' 
          }
        }));
      } else {
        throw new Error(result.error || result.reason || 'OpenAI Vision analysis failed');
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        openaiVision: { status: 'error', message: `OpenAI Vision error: ${error.message}` }
      }));
    }

    // Test 4: eBay API (basic connection test)
    try {
      // For now, just check if environment variables are set
      const hasEbayVars = !!(
        import.meta.env.VITE_EBAY_SANDBOX_APP_ID || 
        import.meta.env.VITE_EBAY_PROD_APP_ID
      );
      
      if (hasEbayVars) {
        setTests(prev => ({
          ...prev,
          ebayApi: { status: 'success', message: 'eBay API credentials configured' }
        }));
      } else {
        setTests(prev => ({
          ...prev,
          ebayApi: { status: 'warning', message: 'eBay API credentials not configured (optional for MVP)' }
        }));
      }
    } catch (error) {
      setTests(prev => ({
        ...prev,
        ebayApi: { status: 'error', message: `eBay API error: ${error.message}` }
      }));
    }

    setTesting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      case 'testing':
        return <Loader className="w-6 h-6 text-blue-600 animate-spin" />;
      default:
        return <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />;
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
      case 'testing':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const testItems = [
    {
      key: 'supabase',
      title: 'Supabase Database',
      description: 'User authentication and data storage',
      icon: Database
    },
    {
      key: 'googleVision',
      title: 'Google Vision API',
      description: 'OCR text extraction from clothing tags',
      icon: Camera
    },
    {
      key: 'openaiVision',
      title: 'OpenAI Vision Analysis',
      description: 'AI-powered item analysis and listing generation',
      icon: Brain
    },
    {
      key: 'ebayApi',
      title: 'eBay API',
      description: 'Marketplace integration for listings',
      icon: ShoppingCart
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              EasyFlip Integration Test
            </h1>
            <p className="text-gray-600 mb-6">
              Test all API integrations to ensure your application is ready for production.
            </p>
            
            <button
              onClick={runAllTests}
              disabled={testing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 mx-auto"
            >
              {testing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Running Tests...</span>
                </>
              ) : (
                <>
                  <span>Run All Tests</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {testItems.map((item) => {
              const test = tests[item.key];
              const Icon = item.icon;
              
              return (
                <div
                  key={item.key}
                  className={`p-6 rounded-lg border-2 transition-all duration-300 ${getStatusColor(test.status)}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Icon className="w-8 h-8 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.title}
                        </h3>
                        {getStatusIcon(test.status)}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                      <p className={`text-sm font-medium ${
                        test.status === 'success' ? 'text-green-700' :
                        test.status === 'error' ? 'text-red-700' :
                        test.status === 'warning' ? 'text-yellow-700' :
                        'text-blue-700'
                      }`}>
                        {test.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Environment Variables Status */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Environment Variables Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>VITE_SUPABASE_URL:</span>
                  <span className={import.meta.env.VITE_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
                    {import.meta.env.VITE_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>VITE_SUPABASE_ANON_KEY:</span>
                  <span className={import.meta.env.VITE_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
                    {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>VITE_OPENAI_API_KEY:</span>
                  <span className={import.meta.env.VITE_OPENAI_API_KEY ? 'text-green-600' : 'text-yellow-600'}>
                    {import.meta.env.VITE_OPENAI_API_KEY ? '✓ Set' : '⚠ Optional'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Environment:</span>
                  <span className="text-blue-600">
                    {import.meta.env.MODE} ({import.meta.env.DEV ? 'Development' : 'Production'})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex justify-center space-x-4">
            <Link
              to="/"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to Home
            </Link>
            <Link
              to="/app"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationTest;