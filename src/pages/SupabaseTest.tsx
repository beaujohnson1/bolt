import React, { useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SupabaseTest: React.FC = () => {
  const { authUser } = useAuth();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test: string, success: boolean, details?: any) => {
    const result = {
      test,
      success,
      details: details || '',
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [...prev, result]);
    console.log(`${success ? '✅' : '❌'} [SUPABASE-TEST] ${test}:`, details);
  };

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    const supabase = getSupabase();
    
    if (!supabase) {
      addResult('Client initialization', false, 'Failed to create Supabase client');
      setIsRunning(false);
      return;
    }
    
    addResult('Client initialization', true, 'Supabase client created');

    // Test 1: Basic connectivity
    try {
      const { data, error } = await supabase
        .from('uploaded_photos')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        addResult('Database connectivity', false, `${error.message} (Code: ${error.code})`);
      } else {
        addResult('Database connectivity', true, `Connection successful`);
      }
    } catch (err) {
      addResult('Database connectivity', false, `Network error: ${err.message}`);
    }

    // Test 2: Authentication
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        addResult('Authentication check', false, error.message);
      } else if (session) {
        addResult('Authentication check', true, `User: ${session.user.email}`);
      } else {
        addResult('Authentication check', false, 'No active session');
      }
    } catch (err) {
      addResult('Authentication check', false, `Error: ${err.message}`);
    }

    // Test 3: Storage bucket access
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        addResult('Storage bucket access', false, error.message);
      } else {
        const itemImagesBucket = buckets?.find(b => b.name === 'item-images');
        if (itemImagesBucket) {
          addResult('Storage bucket access', true, `Found item-images bucket (${itemImagesBucket.public ? 'public' : 'private'})`);
        } else {
          addResult('Storage bucket access', false, 'item-images bucket not found');
        }
      }
    } catch (err) {
      addResult('Storage bucket access', false, `Network error: ${err.message}`);
    }

    // Test 4: Storage upload test
    if (authUser) {
      try {
        const testFile = new Blob(['test'], { type: 'text/plain' });
        const fileName = `test-${Date.now()}.txt`;
        
        const { data, error } = await supabase.storage
          .from('item-images')
          .upload(fileName, testFile);
        
        if (error) {
          addResult('Storage upload test', false, `${error.message}`);
        } else {
          addResult('Storage upload test', true, `File uploaded: ${data.path}`);
          
          // Clean up test file
          await supabase.storage.from('item-images').remove([fileName]);
        }
      } catch (err) {
        addResult('Storage upload test', false, `Network error: ${err.message}`);
      }
    }

    // Test 5: Database insert test
    if (authUser) {
      try {
        const testRecord = {
          user_id: authUser.id,
          image_url: 'test://test.jpg',
          filename: 'test.jpg',
          file_size: 1234,
          file_type: 'image/jpeg',
          upload_order: 0,
          status: 'test',
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('uploaded_photos')
          .insert(testRecord)
          .select();
        
        if (error) {
          addResult('Database insert test', false, `${error.message} (Code: ${error.code})`);
        } else {
          addResult('Database insert test', true, `Record inserted with ID: ${data[0]?.id}`);
          
          // Clean up test record
          if (data[0]?.id) {
            await supabase.from('uploaded_photos').delete().eq('id', data[0].id);
          }
        }
      } catch (err) {
        addResult('Database insert test', false, `Network error: ${err.message}`);
      }
    }

    // Test 6: Network configuration
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        }
      });
      
      if (response.ok) {
        addResult('Direct REST API test', true, `Status: ${response.status}`);
      } else {
        addResult('Direct REST API test', false, `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      addResult('Direct REST API test', false, `Network error: ${err.message}`);
    }

    // Test 7: Environment variables
    const envTests = [
      { name: 'VITE_SUPABASE_URL', value: import.meta.env.VITE_SUPABASE_URL },
      { name: 'VITE_SUPABASE_ANON_KEY', value: import.meta.env.VITE_SUPABASE_ANON_KEY }
    ];

    envTests.forEach(({ name, value }) => {
      if (value && value.trim()) {
        addResult(`Environment: ${name}`, true, `Length: ${value.length} chars`);
      } else {
        addResult(`Environment: ${name}`, false, 'Missing or empty');
      }
    });

    setIsRunning(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
      
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isRunning || !authUser}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium"
        >
          {isRunning ? 'Running Tests...' : 'Run Supabase Tests'}
        </button>
        
        {!authUser && (
          <p className="text-red-600 mt-2">Please sign in to run database tests</p>
        )}
      </div>

      <div className="space-y-4">
        {testResults.map((result, index) => (
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
              </div>
              <span className="text-sm opacity-75">{result.timestamp}</span>
            </div>
            
            {result.details && (
              <div className="mt-2 text-sm font-mono bg-white bg-opacity-50 p-2 rounded">
                {result.details}
              </div>
            )}
          </div>
        ))}
      </div>

      {testResults.length > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Summary</h3>
          <p>
            Passed: {testResults.filter(r => r.success).length} / {testResults.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default SupabaseTest;