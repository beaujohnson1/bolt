import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, Settings } from 'lucide-react';

interface ConnectionErrorProps {
  error: string;
  onRetry: () => void;
  loading?: boolean;
}

const ConnectionError: React.FC<ConnectionErrorProps> = ({ error, onRetry, loading = false }) => {
  const isNetworkError = error.includes('Failed to fetch') || 
                         error.includes('Connection failed') || 
                         error.includes('network') ||
                         error.includes('timeout');

  const isConfigError = error.includes('Missing') || 
                       error.includes('configuration') ||
                       error.includes('environment');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-8">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            {isNetworkError ? (
              <Wifi className="h-8 w-8 text-red-600" />
            ) : isConfigError ? (
              <Settings className="h-8 w-8 text-red-600" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-red-600" />
            )}
          </div>
          
          {/* Error Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {isNetworkError ? 'Connection Problem' : 
             isConfigError ? 'Configuration Error' : 
             'Authentication Error'}
          </h3>
          
          {/* Error Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {error}
          </p>
          
          {/* Troubleshooting Tips */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-medium text-blue-900 mb-2">Quick fixes to try:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              {isNetworkError ? (
                <>
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing the page</li>
                  <li>• Disable VPN if you're using one</li>
                  <li>• Clear browser cache and cookies</li>
                </>
              ) : isConfigError ? (
                <>
                  <li>• Check environment variables are set</li>
                  <li>• Verify Supabase URL and API key</li>
                  <li>• Restart the development server</li>
                </>
              ) : (
                <>
                  <li>• Try signing in again</li>
                  <li>• Clear browser data</li>
                  <li>• Check if cookies are enabled</li>
                </>
              )}
            </ul>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onRetry}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </>
              )}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Refresh Page
            </button>
          </div>
          
          {/* Support Link */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Still having issues? Contact{' '}
              <a 
                href="mailto:beau@beaujohnson.org" 
                className="text-blue-600 hover:text-blue-700"
              >
                support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionError;