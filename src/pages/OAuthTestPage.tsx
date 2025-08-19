import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, TestTube, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import AuthStatusDebug from '../components/AuthStatusDebug';

const OAuthTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'success' | 'failure';
    message: string;
    timestamp: string;
  }>>([]);

  const addTestResult = (test: string, status: 'pending' | 'success' | 'failure', message: string) => {
    setTestResults(prev => [
      ...prev,
      {
        test,
        status,
        message,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const runRouteTest = (testName: string, route: string, description: string) => {
    addTestResult(testName, 'pending', `Testing route: ${route}`);
    
    // Open the route in a new tab/window to test it
    const testWindow = window.open(route, '_blank', 'width=800,height=600');
    
    if (testWindow) {
      addTestResult(testName, 'success', `${description} - Window opened successfully`);
      
      // Monitor if the window closes (user completed test)
      const checkClosed = setInterval(() => {
        if (testWindow.closed) {
          clearInterval(checkClosed);
          addTestResult(testName, 'success', `${description} - Test window closed`);
        }
      }, 1000);
      
      // Auto-cleanup after 2 minutes
      setTimeout(() => {
        clearInterval(checkClosed);
        if (!testWindow.closed) {
          testWindow.close();
          addTestResult(testName, 'pending', `${description} - Test window auto-closed`);
        }
      }, 120000);
    } else {
      addTestResult(testName, 'failure', `${description} - Failed to open window (popup blocked?)`);
    }
  };

  const runCallbackTests = () => {
    const baseUrl = window.location.origin;
    
    // Test different OAuth callback scenarios
    const tests = [
      {
        name: 'Google OAuth Success',
        route: `${baseUrl}/oauth/google/callback#access_token=test_token&token_type=Bearer&expires_in=3600`,
        description: 'Google OAuth callback with valid tokens'
      },
      {
        name: 'Google OAuth Error',
        route: `${baseUrl}/oauth/google/callback#error=access_denied&error_description=User%20denied%20access`,
        description: 'Google OAuth callback with error'
      },
      {
        name: 'eBay OAuth Success',
        route: `${baseUrl}/oauth/ebay/callback?code=test_auth_code&state=test_state`,
        description: 'eBay OAuth callback with authorization code'
      },
      {
        name: 'eBay OAuth Error',
        route: `${baseUrl}/oauth/ebay/callback?error=access_denied&error_description=User%20denied%20access`,
        description: 'eBay OAuth callback with error'
      },
      {
        name: 'Generic OAuth Route',
        route: `${baseUrl}/oauth`,
        description: 'Generic OAuth router page'
      },
      {
        name: 'Invalid OAuth Route',
        route: `${baseUrl}/oauth/unknown/provider`,
        description: 'Unknown OAuth provider route'
      }
    ];

    tests.forEach(test => {
      runRouteTest(test.name, test.route, test.description);
    });
  };

  const runLegacyRouteTests = () => {
    const baseUrl = window.location.origin;
    
    const tests = [
      {
        name: 'Legacy Google Callback',
        route: `${baseUrl}/auth/callback#access_token=test_token&token_type=Bearer`,
        description: 'Legacy Google OAuth callback route'
      },
      {
        name: 'Legacy eBay Callback',
        route: `${baseUrl}/auth/ebay/callback?code=test_code&state=test_state`,
        description: 'Legacy eBay OAuth callback route'
      }
    ];

    tests.forEach(test => {
      runRouteTest(test.name, test.route, test.description);
    });
  };

  const clearResults = () => {
    setTestResults([]);
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <TestTube className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            OAuth Routing Test Suite
          </h1>
          <p className="text-gray-600">
            Test OAuth callback routing and authentication flows
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Test Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Test Controls
              </h2>
              
              <div className="space-y-3">
                <button
                  onClick={runCallbackTests}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Test OAuth Callbacks
                </button>
                
                <button
                  onClick={runLegacyRouteTests}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Test Legacy Routes
                </button>
                
                <button
                  onClick={clearResults}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Clear Results
                </button>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Tests will open in new windows. Make sure popups are allowed.
                  Close the test windows when done to mark tests as complete.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Manual Tests
              </h2>
              
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Test Routes:</strong>
                </div>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li><code>/oauth</code> - OAuth router</li>
                  <li><code>/oauth/callback</code> - Generic callback</li>
                  <li><code>/oauth/google/callback</code> - Google callback</li>
                  <li><code>/oauth/ebay/callback</code> - eBay callback</li>
                  <li><code>/auth/callback</code> - Legacy Google</li>
                  <li><code>/auth/ebay/callback</code> - Legacy eBay</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Test Results
                </h2>
                <span className="text-sm text-gray-500">
                  {testResults.length} tests run
                </span>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {testResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TestTube className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No tests run yet. Click a test button to start.</p>
                  </div>
                ) : (
                  testResults.map((result, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-0.5">
                        {result.status === 'success' && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                        {result.status === 'failure' && (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        {result.status === 'pending' && (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm text-gray-900">
                            {result.test}
                          </div>
                          <div className="text-xs text-gray-500">
                            {result.timestamp}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {result.message}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Status */}
        <div className="mt-8">
          <AuthStatusDebug />
        </div>
      </main>
    </div>
  );
};

export default OAuthTestPage;