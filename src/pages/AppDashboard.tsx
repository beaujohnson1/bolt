import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Plus, BarChart3, Settings, LogOut, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

const AppDashboard = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Home Sale Helper</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {!user?.isPro && (
                <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 hover:from-purple-700 hover:to-blue-700 transition-colors">
                  <Crown className="w-4 h-4" />
                  <span>Upgrade to Pro</span>
                </button>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500">
                    {user?.listingsUsed}/{user?.listingsLimit} listings used
                  </div>
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name}!
          </h2>
          <p className="text-gray-600">
            Ready to turn your clutter into cash? Let's get started.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link
            to="/capture"
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-xl transition-colors group"
          >
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg group-hover:bg-blue-400 transition-colors">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">New Listing</h3>
                <p className="text-blue-100">Snap a photo to get started</p>
              </div>
            </div>
          </Link>

          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
                <p className="text-gray-600">View your sales performance</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
                <p className="text-gray-600">Manage your account</p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Usage</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {user?.listingsUsed || 0}
              </div>
              <div className="text-gray-600">Listings Created</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">$0</div>
              <div className="text-gray-600">Total Sales</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">0</div>
              <div className="text-gray-600">Active Listings</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Free Plan Usage</span>
              <span>{user?.listingsUsed}/{user?.listingsLimit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((user?.listingsUsed || 0) / (user?.listingsLimit || 5)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h4>
            <p className="text-gray-600 mb-6">
              Create your first listing by taking a photo of an item you want to sell.
            </p>
            <Link
              to="/capture"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Create First Listing</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppDashboard;