import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import ConnectionTest from '../components/ConnectionTest';

const ConnectionTestPage = () => {
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Tests</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <ConnectionTest key={refreshKey} />
      </main>
    </div>
  );
};

export default ConnectionTestPage;