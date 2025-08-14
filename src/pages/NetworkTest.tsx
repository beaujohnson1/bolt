import React, { useState } from 'react';

const NetworkTest: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test: string, success: boolean, details: string, timing?: number) => {
    const result = {
      test,
      success,
      details,
      timing: timing ? `${timing}ms` : '',
      timestamp: new Date().toLocaleTimeString()
    };
    setResults(prev => [...prev, result]);
    console.log(`${success ? '✅' : '❌'} [NETWORK-TEST] ${test}: ${details}`);
  };

  const testConnectivity = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Basic internet connectivity
    try {
      const start = Date.now();
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      const timing = Date.now() - start;
      addResult('Internet connectivity', true, 'Google reachable', timing);
    } catch (error) {
      addResult('Internet connectivity', false, error.message);
    }

    // Test 2: Supabase domain resolution
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      try {
        const start = Date.now();
        const url = new URL(supabaseUrl);
        const response = await fetch(`https://${url.hostname}`, { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        const timing = Date.now() - start;
        addResult('Supabase domain', true, `${url.hostname} reachable`, timing);
      } catch (error) {
        addResult('Supabase domain', false, error.message);
      }

      // Test 3: Supabase REST API endpoint
      try {
        const start = Date.now();
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          }
        });
        const timing = Date.now() - start;
        if (response.ok) {
          addResult('Supabase REST API', true, `HTTP ${response.status}`, timing);
        } else {
          addResult('Supabase REST API', false, `HTTP ${response.status}: ${response.statusText}`, timing);
        }
      } catch (error) {
        addResult('Supabase REST API', false, error.message);
      }

      // Test 4: Supabase Storage API
      try {
        const start = Date.now();
        const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          }
        });
        const timing = Date.now() - start;
        if (response.ok || response.status === 400) { // 400 is expected without proper auth
          addResult('Supabase Storage API', true, `HTTP ${response.status}`, timing);
        } else {
          addResult('Supabase Storage API', false, `HTTP ${response.status}: ${response.statusText}`, timing);
        }
      } catch (error) {
        addResult('Supabase Storage API', false, error.message);
      }
    }

    // Test 5: Check for proxy/corporate firewall
    try {
      const response = await fetch('https://httpbin.org/ip');
      const data = await response.json();
      addResult('Network environment', true, `IP: ${data.origin}`);
    } catch (error) {
      addResult('Network environment', false, 'May be behind corporate firewall');
    }

    setIsRunning(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Network Connectivity Test</h1>
      
      <div className="mb-6">
        <button
          onClick={testConnectivity}
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium"
        >
          {isRunning ? 'Running Tests...' : 'Test Network Connectivity'}
        </button>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Environment Variables:</h3>
        <div className="text-sm font-mono">
          <p>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
          <p>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
        </div>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {result.success ? '✅' : '❌'}
                </span>
                <span className="font-medium">{result.test}</span>
                {result.timing && (
                  <span className="text-sm bg-white bg-opacity-50 px-2 py-1 rounded">
                    {result.timing}
                  </span>
                )}
              </div>
              <span className="text-sm opacity-75">{result.timestamp}</span>
            </div>
            
            <div className="mt-2 text-sm font-mono bg-white bg-opacity-50 p-2 rounded">
              {result.details}
            </div>
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Diagnosis:</h3>
          <div className="text-sm">
            {results.filter(r => r.success).length === results.length ? (
              <p className="text-green-700">✅ All connectivity tests passed. The issue may be with Supabase configuration or authentication.</p>
            ) : results.some(r => r.test === 'Internet connectivity' && !r.success) ? (
              <p className="text-red-700">❌ No internet connectivity detected.</p>
            ) : results.some(r => r.test.includes('Supabase') && !r.success) ? (
              <p className="text-red-700">❌ Supabase servers unreachable. You may be behind a corporate firewall or have network restrictions.</p>
            ) : (
              <p className="text-yellow-700">⚠️ Mixed results. Some services reachable, others not.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkTest;