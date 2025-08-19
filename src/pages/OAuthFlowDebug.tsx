import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, RefreshCw, CheckCircle, AlertTriangle, XCircle, Bug } from 'lucide-react';
import { Link } from 'react-router-dom';
import { oauthDebugger, type OAuthFlowDebugResult } from '../utils/oauthFlowDebugger';
import ebayOAuth from '../services/ebayOAuth';

const OAuthFlowDebug = () => {
  const [debugResults, setDebugResults] = useState<OAuthFlowDebugResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<string>('');
  const [authStatus, setAuthStatus] = useState<boolean>(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    // Initial status check
    checkAuthStatus();
    
    // Watch for token changes
    const unwatch = ebayOAuth.watchForTokenChanges((authenticated) => {
      setAuthStatus(authenticated);
      checkTokenInfo();
    });

    return unwatch;
  }, []);

  const checkAuthStatus = () => {
    const isAuth = ebayOAuth.isAuthenticated();
    setAuthStatus(isAuth);
    checkTokenInfo();
  };

  const checkTokenInfo = async () => {
    try {
      const token = await ebayOAuth.getValidAccessToken();
      const storedTokens = localStorage.getItem('ebay_oauth_tokens');
      const manualToken = localStorage.getItem('ebay_manual_token');
      
      setTokenInfo({
        hasValidToken: !!token,
        tokenLength: token?.length || 0,
        tokenPreview: token ? token.substring(0, 30) + '...' : null,
        storedOAuthTokens: storedTokens ? JSON.parse(storedTokens) : null,
        storedManualToken: manualToken
      });
    } catch (error) {
      console.error('Error checking token info:', error);
      setTokenInfo({ error: error.message });
    }
  };

  const runDebug = async () => {
    setIsRunning(true);
    try {
      const results = await oauthDebugger.runDebug();
      setDebugResults(results);
      setReport(oauthDebugger.generateReport());
    } catch (error) {
      console.error('Debug run failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runAutoFix = () => {
    oauthDebugger.autoFix();
    setTimeout(() => {
      checkAuthStatus();
      runDebug();
    }, 1000);
  };

  const clearAllTokens = () => {
    ebayOAuth.clearStoredTokens();
    checkAuthStatus();
    console.log('All eBay tokens cleared');
  };

  const testTokenStorage = () => {
    const testTokens = {
      access_token: 'test_token_' + Date.now(),
      refresh_token: 'refresh_token_' + Date.now(),
      expires_in: 7200,
      token_type: 'Bearer',
      expires_at: Date.now() + (7200 * 1000)
    };

    localStorage.setItem('ebay_oauth_tokens', JSON.stringify(testTokens));
    localStorage.setItem('ebay_manual_token', testTokens.access_token);
    
    // Dispatch events to test the flow
    window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
      detail: { authenticated: true, tokens: testTokens }
    }));
    
    setTimeout(checkAuthStatus, 100);
    console.log('Test tokens stored and events dispatched');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Bug className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to="/app" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to App
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OAuth Flow Debugger</h1>
          <p className="text-gray-600">
            Comprehensive debugging tool for eBay OAuth authentication flow
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Authentication Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${authStatus ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center space-x-2">
                {authStatus ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">
                  {authStatus ? 'Authenticated' : 'Not Authenticated'}
                </span>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
              <div className="text-sm text-blue-700">
                <strong>Token Info:</strong><br />
                {tokenInfo ? (
                  <>
                    Valid: {tokenInfo.hasValidToken ? 'Yes' : 'No'}<br />
                    Length: {tokenInfo.tokenLength}
                  </>
                ) : (
                  'Loading...'
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
              <div className="text-sm text-purple-700">
                <strong>Storage:</strong><br />
                OAuth: {tokenInfo?.storedOAuthTokens ? 'Present' : 'Missing'}<br />
                Manual: {tokenInfo?.storedManualToken ? 'Present' : 'Missing'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={runDebug}
              disabled={isRunning}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Full Debug</span>
                </>
              )}
            </button>

            <button
              onClick={runAutoFix}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Auto Fix</span>
            </button>

            <button
              onClick={testTokenStorage}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              <Bug className="w-4 h-4" />
              <span>Test Token Storage</span>
            </button>

            <button
              onClick={clearAllTokens}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              <XCircle className="w-4 h-4" />
              <span>Clear All Tokens</span>
            </button>

            <button
              onClick={checkAuthStatus}
              className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        {/* Debug Results */}
        {debugResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
            <div className="space-y-3">
              {debugResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{result.step}</div>
                      <div className="text-sm text-gray-600 mt-1">{result.message}</div>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            View Data
                          </summary>
                          <pre className="text-xs text-gray-600 mt-1 bg-gray-100 p-2 rounded overflow-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Report</h2>
            <pre className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
              {report}
            </pre>
          </div>
        )}

        {/* Token Details */}
        {tokenInfo && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Token Details</h2>
            <pre className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg overflow-auto">
              {JSON.stringify(tokenInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthFlowDebug;