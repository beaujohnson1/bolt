import React, { useState, useEffect } from 'react';
import { Camera, Package, TrendingUp, DollarSign, Eye, MessageCircle, BarChart3, Upload, Zap, Bot, Star, Award, Users, ShoppingCart, Target, Clock, CheckCircle, AlertCircle, RefreshCw, Trash2, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, type Item, type Listing, type Sale } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import GenerateListingsTable from '../components/GenerateListingsTable';
import SKUTable from '../components/SKUTable';
import { formatPrice, formatDate, generateSKU, getItemSpecifics } from '../utils/itemUtils';

const AppDashboard = () => {
  const { user, authUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [items, setItems] = useState<Item[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Debug log to confirm DashboardLayout is properly imported
  console.log('🔍 [APP-DASHBOARD] DashboardLayout imported as:', DashboardLayout);
  console.log('🔍 [APP-DASHBOARD] DashboardLayout type:', typeof DashboardLayout);
  console.log('🔍 [APP-DASHBOARD] DashboardLayout is function:', typeof DashboardLayout === 'function');

  useEffect(() => {
    if (authUser) {
      fetchDashboardData();
    }
  }, [authUser]);

  const fetchDashboardData = async () => {
    if (!authUser) return;

    try {
      setLoading(true);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;

      // Fetch listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (listingsError) throw listingsError;

      // Fetch sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', authUser.id)
        .order('sold_at', { ascending: false });

      if (salesError) throw salesError;

      setItems(itemsData || []);
      setListings(listingsData || []);
      setSales(salesData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'upload':
        return <UploadTab />;
      case 'skus':
        return <SKUTable isDarkMode={isDarkMode} />;
      case 'generate':
        return <GenerateListingsTable isDarkMode={isDarkMode} />;
      case 'publish':
        return <PublishTab />;
      case 'coach':
        return <CoachTab />;
      default:
        return <OverviewTab />;
    }
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${isDarkMode ? 'glass-panel' : 'glass-panel-light'} backdrop-blur-glass rounded-2xl p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>Items Processed</p>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {items.length}
              </p>
            </div>
            <Package className={`w-8 h-8 ${isDarkMode ? 'text-cyber-blue-500' : 'text-blue-600'}`} />
          </div>
        </div>

        <div className={`${isDarkMode ? 'glass-panel' : 'glass-panel-light'} backdrop-blur-glass rounded-2xl p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>Active Listings</p>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {listings.filter(l => l.status === 'active').length}
              </p>
            </div>
            <ShoppingCart className={`w-8 h-8 ${isDarkMode ? 'text-cyber-blue-500' : 'text-blue-600'}`} />
          </div>
        </div>

        <div className={`${isDarkMode ? 'glass-panel' : 'glass-panel-light'} backdrop-blur-glass rounded-2xl p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>Total Sales</p>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {sales.length}
              </p>
            </div>
            <DollarSign className={`w-8 h-8 ${isDarkMode ? 'text-cyber-blue-500' : 'text-blue-600'}`} />
          </div>
        </div>

        <div className={`${isDarkMode ? 'glass-panel' : 'glass-panel-light'} backdrop-blur-glass rounded-2xl p-6`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>Revenue</p>
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ${user?.monthly_revenue || 0}
              </p>
            </div>
            <TrendingUp className={`w-8 h-8 ${isDarkMode ? 'text-cyber-blue-500' : 'text-blue-600'}`} />
          </div>
        </div>
      </div>

      {/* Recent Items */}
      <div className={`${isDarkMode ? 'glass-panel' : 'glass-panel-light'} backdrop-blur-glass rounded-2xl p-6`}>
        <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Recent Items
        </h2>
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.slice(0, 6).map((item) => (
              <div key={item.id} className={`border rounded-lg p-4 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <img
                  src={item.primary_image_url || item.images[0]}
                  alt={item.title}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
                <h3 className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {item.title}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                  {formatPrice(item.suggested_price)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
              No items yet. Upload some photos to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const UploadTab = () => (
    <div className={`${isDarkMode ? 'glass-panel' : 'glass-panel-light'} backdrop-blur-glass rounded-2xl p-8`}>
      <div className="text-center">
        <div className="w-24 h-24 bg-cyber-gradient rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-cyber-blue-500/30">
          <Camera className="w-12 h-12 text-white" />
        </div>
        <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Upload New Items
        </h2>
        <p className={`mb-8 ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
          Take photos of items you want to sell and let our AI analyze them
        </p>
        <Link
          to="/capture"
          className="inline-flex items-center gap-3 bg-cyber-gradient text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-cyber-blue-500/30 hover:scale-105 transition-all duration-300"
        >
          <Upload className="w-5 h-5" />
          Start Photo Capture
        </Link>
      </div>
    </div>
  );

  const PublishTab = () => (
    <div className={`${isDarkMode ? 'glass-panel' : 'glass-panel-light'} backdrop-blur-glass rounded-2xl p-8`}>
      <div className="text-center">
        <div className="w-24 h-24 bg-cyber-gradient rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-cyber-blue-500/30">
          <Zap className="w-12 h-12 text-white" />
        </div>
        <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Publish Listings
        </h2>
        <p className={`mb-8 ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
          Publish your generated listings to eBay and other platforms
        </p>
        <button className="inline-flex items-center gap-3 bg-cyber-gradient text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-cyber-blue-500/30 hover:scale-105 transition-all duration-300">
          <Zap className="w-5 h-5" />
          Coming Soon
        </button>
      </div>
    </div>
  );

  const CoachTab = () => (
    <div className={`${isDarkMode ? 'glass-panel' : 'glass-panel-light'} backdrop-blur-glass rounded-2xl p-8`}>
      <div className="text-center">
        <div className="w-24 h-24 bg-cyber-gradient rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-cyber-blue-500/30">
          <Bot className="w-12 h-12 text-white" />
        </div>
        <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          AI Reseller Coach
        </h2>
        <p className={`mb-8 ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
          Get personalized insights and recommendations to optimize your reselling business
        </p>
        <button className="inline-flex items-center gap-3 bg-cyber-gradient text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-cyber-blue-500/30 hover:scale-105 transition-all duration-300">
          <Bot className="w-5 h-5" />
          Coming Soon
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTabContent()}
    </DashboardLayout>
  );
};

export default AppDashboard;