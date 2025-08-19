import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import EbayAuthButton from '../components/EbayAuthButton';
import ManualEbayAuth from '../components/ManualEbayAuth';
import EbayAuthDebug from '../components/EbayAuthDebug';
import ebayOAuth from '../services/ebayOAuth';

const EbayAuthTest = () => {
  const [searchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'success' | 'failure';
    message: string;
  }>>([]);

  useEffect(() => {
    // Check initial authentication status
    checkAuthStatus();
    
    // Check for URL parameters
    const ebayConnected = searchParams.get('ebay_connected');
    const ebayError = searchParams.get('ebay_error');
    const timestamp = searchParams.get('timestamp');
    
    if (ebayConnected === 'true') {
      console.log('🎉 [EBAY-AUTH-TEST] Detected successful connection from URL');
      addTestResult('URL Parameter Detection', 'success', 
        `Successfully detected ebay_connected=true with timestamp=${timestamp}`);
      
      // Force refresh after a brief delay
      setTimeout(() => {
        checkAuthStatus();
      }, 100);
    }
    
    if (ebayError) {
      addTestResult('OAuth Error Detection', 'failure', 
        `Detected OAuth error: ${ebayError}`);
    }
    
    // Watch for authentication changes
    const unwatch = ebayOAuth.watchForTokenChanges((authenticated) => {
      console.log('🔔 [EBAY-AUTH-TEST] Auth status changed:', authenticated);
      setIsAuthenticated(authenticated);
      addTestResult('Real-time Auth Changes', 'success', 
        `Authentication status changed to: ${authenticated}`);
    });
    
    return unwatch;
  }, [searchParams]);

  const checkAuthStatus = () => {
    const authStatus = ebayOAuth.isAuthenticated();
    setIsAuthenticated(authStatus);
    addTestResult('Authentication Check', authStatus ? 'success' : 'pending', 
      `Current authentication status: ${authStatus}`);
  };

  const addTestResult = (test: string, status: 'pending' | 'success' | 'failure', message: string) => {
    setTestResults(prev => {
      const filtered = prev.filter(r => r.test !== test);
      return [...filtered, { test, status, message }];
    });
  };

  const runConnectivityTests = async () => {
    addTestResult('Storage Test', 'pending', 'Testing localStorage access...');
    
    try {
      // Test localStorage
      const testKey = 'ebay_test_' + Date.now();
      localStorage.setItem(testKey, 'test');
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved === 'test') {
        addTestResult('Storage Test', 'success', 'localStorage working correctly');
      } else {
        addTestResult('Storage Test', 'failure', 'localStorage not working');
      }
      
      // Test OAuth service
      addTestResult('OAuth Service Test', 'pending', 'Testing OAuth service...');
      const validToken = await ebayOAuth.getValidAccessToken();
      
      if (validToken) {
        if (validToken === 'dev_mode_bypass_token') {
          addTestResult('OAuth Service Test', 'pending', 'Using development mode token');
        } else {
          addTestResult('OAuth Service Test', 'success', 'Valid OAuth token retrieved');
        }
      } else {
        addTestResult('OAuth Service Test', 'pending', 'No valid token available');
      }
      
      // Test event system
      addTestResult('Event System Test', 'pending', 'Testing custom events...');
      
      const eventPromise = new Promise<boolean>((resolve) => {
        const handler = (e: CustomEvent) => {
          window.removeEventListener('ebayAuthChanged', handler);
          resolve(e.detail.test === 'success');
        };
        window.addEventListener('ebayAuthChanged', handler);
        
        // Trigger test event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
            detail: { test: 'success', authenticated: true }
          }));
        }, 100);
      });
      
      const eventWorked = await eventPromise;
      addTestResult('Event System Test', eventWorked ? 'success' : 'failure', 
        `Custom events ${eventWorked ? 'working' : 'not working'}`);
      
    } catch (error) {
      addTestResult('General Test', 'failure', `Test failed: ${error.message}`);
    }
  };

  const handleAuthSuccess = () => {
    addTestResult('Auth Success Callback', 'success', 'Authentication success callback triggered');
    checkAuthStatus();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              to="/app"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            eBay Authentication Test Page
          </h1>
          <p className="text-gray-600">
            Test and debug eBay OAuth token persistence
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Authentication Status */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Current Authentication Status
              </h2>
              
              <div className={`flex items-center space-x-3 p-4 rounded-lg ${
                isAuthenticated 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {isAuthenticated ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900">eBay Account Connected</div>
                      <div className="text-sm text-green-700">Ready to create listings</div>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-6 h-6 text-red-600" />
                    <div>
                      <div className="font-medium text-red-900">eBay Account Not Connected</div>
                      <div className="text-sm text-red-700">Connect your account to create listings</div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-4 flex items-center space-x-2">
                <button
                  onClick={checkAuthStatus}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Status</span>
                </button>
              </div>
            </div>

            {/* Test Results */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Test Results
                </h2>
                <button
                  onClick={runConnectivityTests}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                >
                  Run Tests
                </button>
              </div>
              
              <div className="space-y-3">
                {testResults.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tests run yet</p>
                ) : (
                  testResults.map((result, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {result.status === 'success' && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {result.status === 'failure' && (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        {result.status === 'pending' && (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900">{result.test}</div>
                        <div className="text-xs text-gray-600">{result.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Authentication Methods */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                eBay OAuth Connection
              </h2>
              
              <div className="space-y-4">
                <EbayAuthButton 
                  onAuthSuccess={handleAuthSuccess}
                  className="w-full"
                />
                
                <div className="text-sm text-gray-600">
                  <p className="mb-2">This will:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Redirect you to eBay for authorization</li>
                    <li>Store OAuth tokens in localStorage</li>
                    <li>Return you to this page with confirmation</li>
                    <li>Update authentication status automatically</li>
                  </ul>
                </div>
              </div>
            </div>

            <ManualEbayAuth onAuthSuccess={handleAuthSuccess} />
          </div>
        </div>

        {/* Debug Information */}
        <div className="mt-8">
          <EbayAuthDebug />
        </div>
      </main>
    </div>
  );
};

export default EbayAuthTest;