import React from 'react';

const EnvDebug = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Environment Variables Debug</h1>
          
          <div className="space-y-6">
            {/* Supabase Variables */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-4">Supabase Configuration</h2>
              <pre className="bg-white p-4 rounded border text-sm overflow-auto">
                {JSON.stringify({
                  hasUrl: !!url,
                  hasKey: !!key,
                  urlHost: url ? new URL(url).host : null,
                  urlLength: url ? url.length : 0,
                  keyLength: key ? key.length : 0,
                  environment: import.meta.env.MODE,
                  isDev: import.meta.env.DEV,
                  isProd: import.meta.env.PROD
                }, null, 2)}
              </pre>
            </div>

            {/* OpenAI Configuration */}
            <div className="bg-green-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-900 mb-4">OpenAI Configuration</h2>
              <pre className="bg-white p-4 rounded border text-sm overflow-auto">
                {JSON.stringify({
                  hasOpenAIKey: !!openaiKey,
                  openaiKeyLength: openaiKey ? openaiKey.length : 0
                }, null, 2)}
              </pre>
            </div>

            {/* All Environment Variables */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">All Vite Environment Variables</h2>
              <pre className="bg-white p-4 rounded border text-sm overflow-auto max-h-96">
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(import.meta.env)
                      .filter(([key]) => key.startsWith('VITE_'))
                      .map(([key, value]) => [
                        key, 
                        typeof value === 'string' && value.length > 50 
                          ? `${value.substring(0, 20)}...${value.substring(value.length - 10)}` 
                          : value
                      ])
                  ), 
                  null, 
                  2
                )}
              </pre>
            </div>

            {/* Status Summary */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg ${url ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <div className="font-medium">Supabase URL</div>
                  <div className="text-sm">{url ? '✅ Configured' : '❌ Missing'}</div>
                </div>
                <div className={`p-4 rounded-lg ${key ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <div className="font-medium">Supabase Key</div>
                  <div className="text-sm">{key ? '✅ Configured' : '❌ Missing'}</div>
                </div>
                <div className={`p-4 rounded-lg ${openaiKey ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  <div className="font-medium">OpenAI Key</div>
                  <div className="text-sm">{openaiKey ? '✅ Configured' : '⚠️ Optional'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvDebug;