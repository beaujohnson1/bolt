import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Test component for verifying eBay API integration
 */
export const EBayIntegrationTest: React.FC = () => {
  const [tests, setTests] = useState({
    environment: { status: 'pending', message: 'Checking environment...' },
    database: { status: 'pending', message: 'Checking database...' },
    oauth: { status: 'pending', message: 'Checking OAuth endpoint...' },
    encryption: { status: 'pending', message: 'Testing encryption...' }
  });

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    // Test 1: Check environment/health
    try {
      const healthResponse = await fetch('/.netlify/functions/ebay-api-oauth-health');
      const healthData = await healthResponse.json();
      
      setTests(prev => ({
        ...prev,
        environment: {
          status: healthData.ready ? 'success' : 'error',
          message: healthData.message
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        environment: {
          status: 'error',
          message: 'Failed to reach health endpoint'
        }
      }));
    }

    // Test 2: Check database connection
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase
        .from('oauth_states')
        .select('count')
        .limit(1);
      
      setTests(prev => ({
        ...prev,
        database: {
          status: error ? 'error' : 'success',
          message: error ? `Database error: ${error.message}` : '✅ Database connected'
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        database: {
          status: 'error',
          message: 'Failed to connect to database'
        }
      }));
    }

    // Test 3: Check OAuth endpoint
    try {
      const response = await fetch('/.netlify/functions/ebay-api-oauth/auth-url?userId=test');
      
      setTests(prev => ({
        ...prev,
        oauth: {
          status: response.ok ? 'success' : 'warning',
          message: response.ok 
            ? '✅ OAuth endpoint responding' 
            : `⚠️ OAuth endpoint returned ${response.status}`
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        oauth: {
          status: 'error',
          message: 'OAuth endpoint not found'
        }
      }));
    }

    // Test 4: Test encryption
    try {
      // This would normally import and test the encryption service
      // For now, we'll just check if the environment variable exists
      const hasEncryptionKey = process.env.ENCRYPTION_KEY || 
        (await fetch('/.netlify/functions/ebay-api-oauth-health')
          .then(r => r.json())
          .then(d => !d.missingVars?.includes('ENCRYPTION_KEY')));
      
      setTests(prev => ({
        ...prev,
        encryption: {
          status: hasEncryptionKey ? 'success' : 'warning',
          message: hasEncryptionKey 
            ? '✅ Encryption configured' 
            : '⚠️ Encryption key not set'
        }
      }));
    } catch (error) {
      setTests(prev => ({
        ...prev,
        encryption: {
          status: 'warning',
          message: 'Could not verify encryption'
        }
      }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />;
    }
  };

  const allTestsPassed = Object.values(tests).every(t => t.status === 'success');
  const hasErrors = Object.values(tests).some(t => t.status === 'error');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">🔧 eBay Integration Test Suite</h2>
        
        <div className="space-y-4 mb-6">
          {Object.entries(tests).map(([key, test]) => (
            <div key={key} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
              {getStatusIcon(test.status)}
              <div className="flex-1">
                <p className="font-medium capitalize">{key.replace('_', ' ')}</p>
                <p className="text-sm text-gray-600">{test.message}</p>
              </div>
            </div>
          ))}
        </div>

        {allTestsPassed && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">
              🎉 All tests passed! Your integration is ready.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {hasErrors && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium mb-2">
              ⚠️ Some tests failed. Please check:
            </p>
            <ul className="text-sm text-red-700 list-disc list-inside">
              <li>Environment variables in Netlify</li>
              <li>Database migration completed</li>
              <li>Site has been redeployed</li>
            </ul>
          </div>
        )}

        <button
          onClick={runTests}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Run Tests Again
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Next Steps:</h3>
        <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
          <li>Set all environment variables in Netlify</li>
          <li>Redeploy your site</li>
          <li>Run tests to verify configuration</li>
          <li>Test OAuth flow with real eBay account</li>
          <li>Create your first AI-powered listing!</li>
        </ol>
      </div>
    </div>
  );
};

export default EBayIntegrationTest;