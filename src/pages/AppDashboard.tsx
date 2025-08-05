import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Package, Eye, ShoppingCart, Calendar, Target, Zap, Plus, Settings, Bell, Mic, MicOff, Upload, Camera, MessageCircle, Send, Play, Pause, Image, Trash2, Bot, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, type Item, type Listing, type Sale } from '../lib/supabase';

// Types for dashboard data
interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  totalViews: number;
  activeListings: number;
  revenueChange: number;
  salesChange: number;
  viewsChange: number;
  listingsChange: number;
}

interface PerformanceData {
  date: string;
  revenue: number;
  sales: number;
  views: number;
  profit: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
  sales: number;
}

interface RecentSaleData {
  id: string;
  item: string;
  price: number;
  time: string;
  status: string;
  profit: number;
}

interface ListingWithItemImage {
  id: string;
  item_id: string;
  title: string;
  price: number;
  status: string;
  total_views: number;
  total_watchers: number;
  created_at: string;
  listed_at: string;
  items: {
    primary_image_url: string;
    category: string;
  };
}

const AppDashboard = () => {
  const { user, authUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [isRecording, setIsRecording] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const chatEndRef = useRef(null);

  // Supabase data states
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalSales: 0,
    totalViews: 0,
    activeListings: 0,
    revenueChange: 0,
    salesChange: 0,
    viewsChange: 0,
    listingsChange: 0
  });
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSaleData[]>([]);
  const [allListings, setAllListings] = useState<ListingWithItemImage[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch and process Supabase data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!authUser) return;
      
      setLoadingData(true);
      
      try {
        // Calculate date range
        const now = new Date();
        const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
        
        // Fetch data from Supabase
        const [salesResult, listingsResult, itemsResult] = await Promise.all([
          supabase
            .from('sales')
            .select('*')
            .eq('user_id', authUser.id)
            .gte('sold_at', startDate.toISOString()),
          supabase
            .from('listings')
            .select(`
              *,
              items (
                primary_image_url,
                category
              )
            `)
            .eq('user_id', authUser.id),
          supabase
            .from('items')
            .select('*')
            .eq('user_id', authUser.id)
        ]);
        
        if (salesResult.error) throw salesResult.error;
        if (listingsResult.error) throw listingsResult.error;
        if (itemsResult.error) throw itemsResult.error;
        
        const sales = salesResult.data || [];
        const listings = listingsResult.data || [];
        const items = itemsResult.data || [];
        
        // Store all listings for the active listings section
        setAllListings(listings);
        
        // Process dashboard stats
        const totalRevenue = sales.reduce((sum, sale) => sum + (sale.sale_price || 0), 0);
        const totalSales = sales.length;
        const totalViews = listings.reduce((sum, listing) => sum + (listing.total_views || 0), 0);
        const activeListings = listings.filter(listing => listing.status === 'active').length;
        
        // Calculate changes (mock for now - would need historical data)
        const revenueChange = totalRevenue > 0 ? Math.random() * 30 - 5 : 0;
        const salesChange = totalSales > 0 ? Math.random() * 25 - 5 : 0;
        const viewsChange = totalViews > 0 ? Math.random() * 20 - 10 : 0;
        const listingsChange = activeListings > 0 ? Math.random() * 15 - 5 : 0;
        
        setDashboardStats({
          totalRevenue,
          totalSales,
          totalViews,
          activeListings,
          revenueChange,
          salesChange,
          viewsChange,
          listingsChange
        });
        
        // Process performance data (group by day)
        const performanceMap = new Map<string, PerformanceData>();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
          const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
          performanceMap.set(dateStr, {
            date: dateStr,
            revenue: 0,
            sales: 0,
            views: 0,
            profit: 0
          });
          return dateStr;
        }).reverse();
        
        // Aggregate sales by day
        sales.forEach(sale => {
          const saleDate = new Date(sale.sold_at);
          const dayStr = saleDate.toLocaleDateString('en-US', { weekday: 'short' });
          const dayData = performanceMap.get(dayStr);
          if (dayData) {
            dayData.revenue += sale.sale_price || 0;
            dayData.sales += 1;
            dayData.profit += sale.net_profit || 0;
          }
        });
        
        // Add views from listings
        listings.forEach(listing => {
          if (listing.listed_at) {
            const listingDate = new Date(listing.listed_at);
            const dayStr = listingDate.toLocaleDateString('en-US', { weekday: 'short' });
            const dayData = performanceMap.get(dayStr);
            if (dayData) {
              dayData.views += listing.total_views || 0;
            }
          }
        });
        
        setPerformanceData(Array.from(performanceMap.values()));
        
        // Process category data
        const categoryMap = new Map<string, { sales: number, revenue: number }>();
        const categoryColors = {
          'electronics': '#8b5cf6',
          'clothing': '#06b6d4',
          'home_garden': '#10b981',
          'books_media': '#f59e0b',
          'collectibles': '#ef4444',
          'shoes': '#ec4899',
          'accessories': '#14b8a6',
          'toys_games': '#f97316',
          'sports_outdoors': '#84cc16',
          'jewelry': '#a855f7',
          'other': '#6b7280'
        };
        
        // Link sales to items to get categories
        sales.forEach(sale => {
          // Find the listing for this sale
          const listing = listings.find(l => l.id === sale.listing_id);
          if (listing) {
            // Find the item for this listing
            const item = items.find(i => i.id === listing.item_id);
            if (item && item.category) {
              const category = item.category;
              const existing = categoryMap.get(category) || { sales: 0, revenue: 0 };
              existing.sales += 1;
              existing.revenue += sale.sale_price || 0;
              categoryMap.set(category, existing);
            }
          }
        });
        
        const totalCategorySales = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.sales, 0);
        const processedCategoryData = Array.from(categoryMap.entries()).map(([category, data]) => ({
          name: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: totalCategorySales > 0 ? Math.round((data.sales / totalCategorySales) * 100) : 0,
          color: categoryColors[category as keyof typeof categoryColors] || '#6b7280',
          sales: data.revenue
        }));
        
        setCategoryData(processedCategoryData);
        
        // Process recent sales
        const processedRecentSales = sales
          .sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime())
          .slice(0, 4)
          .map(sale => {
            const saleDate = new Date(sale.sold_at);
            const now = new Date();
            const diffHours = Math.floor((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60));
            const timeAgo = diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours / 24)}d ago`;
            
            return {
              id: sale.id,
              item: sale.item_title,
              price: sale.sale_price,
              time: timeAgo,
              status: sale.payment_status === 'completed' ? 'sold' : 'pending',
              profit: sale.net_profit || 0
            };
          });
        
        setRecentSales(processedRecentSales);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    
    fetchDashboardData();
  }, [authUser, timeRange]);

  // Delete listing functionality
  const handleDeleteListing = async (listingId: string, itemId: string) => {
    console.log('🗑️ [DASHBOARD] Starting delete process for listing:', listingId, 'item:', itemId);
    
    if (!authUser || !user) {
      console.error('❌ [DASHBOARD] No authenticated user found');
      alert('You must be signed in to delete listings');
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm('Are you sure you want to delete this listing? This action cannot be undone.');
    if (!confirmed) {
      console.log('ℹ️ [DASHBOARD] Delete cancelled by user');
      return;
    }

    try {
      console.log('🔄 [DASHBOARD] Deleting listing from database...');
      
      // Delete the listing first
      const { error: listingError } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)
        .eq('user_id', authUser.id); // Ensure user can only delete their own listings

      if (listingError) {
        console.error('❌ [DASHBOARD] Error deleting listing:', {
          error: listingError,
          code: listingError.code,
          message: listingError.message,
          details: listingError.details,
          hint: listingError.hint
        });
        throw new Error(`Failed to delete listing: ${listingError.message}`);
      }

      console.log('✅ [DASHBOARD] Listing deleted successfully');

      // Delete the associated item
      console.log('🔄 [DASHBOARD] Deleting item from database...');
      const { error: itemError } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', authUser.id); // Ensure user can only delete their own items

      if (itemError) {
        console.error('❌ [DASHBOARD] Error deleting item:', {
          error: itemError,
          code: itemError.code,
          message: itemError.message,
          details: itemError.details,
          hint: itemError.hint
        });
        throw new Error(`Failed to delete item: ${itemError.message}`);
      }

      console.log('✅ [DASHBOARD] Item deleted successfully');

      // Update local state to remove the deleted listing
      setAllListings(prevListings => 
        prevListings.filter(listing => listing.id !== listingId)
      );

      // Update dashboard stats
      setDashboardStats(prevStats => ({
        ...prevStats,
        activeListings: Math.max(0, prevStats.activeListings - 1)
      }));

      // Decrease user's listing count
      if (user.listings_used > 0) {
        console.log('🔄 [DASHBOARD] Updating user listing count...');
        await updateUser({ 
          listings_used: Math.max(0, user.listings_used - 1) 
        });
        console.log('✅ [DASHBOARD] User listing count updated');
      }

      console.log('🎉 [DASHBOARD] Delete process completed successfully');
      alert('Listing deleted successfully!');

    } catch (error) {
      console.error('❌ [DASHBOARD] Critical error during delete process:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        listingId,
        itemId,
        userId: authUser.id
      });
      
      alert(`Failed to delete listing: ${error.message}. Please try again or contact support if the problem persists.`);
    }
  };

  useEffect(() => {
    setChatMessages([
      {
        id: 1,
        text: `👋 Hey ${user?.name || 'there'}! I'm your AI Reseller Coach powered by advanced AI. I can analyze your sales data, optimize pricing strategies, recommend sourcing locations, identify market trends, and help maximize your profits. What would you like to optimize in your reselling business?`,
        sender: 'ai',
        timestamp: new Date()
      }
    ]);
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Voice Functions
  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      setTimeout(() => {
        handleAIResponse("I heard you! Based on what you described, here's my analysis and pricing recommendation...");
      }, 1500);
    } else {
      setIsRecording(true);
    }
  };

  // Chat Functions
  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      const newMessage = {
        id: Date.now(),
        text: currentMessage,
        sender: 'user',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, newMessage]);
      const messageToProcess = currentMessage;
      setCurrentMessage('');
      
      // Call real AI coach API
      callAICoach(messageToProcess);
    }
  };

  const handleAIResponse = (response) => {
    const aiMessage = {
      id: Date.now(),
      text: response,
      sender: 'ai',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, aiMessage]);
    
    if (voiceMode) {
      setAiSpeaking(true);
      setTimeout(() => setAiSpeaking(false), 3000);
    }
  };

  const generateAIResponse = (message) => {
    const responses = [
      "💰 Based on current market data, I'd suggest pricing that item between $45-65 for optimal sales velocity. Would you like me to create an eBay listing draft?",
      "📈 Great find! Electronics in that category are trending up 23% this month. I recommend listing with these keywords for better visibility.",
      "🎯 For sourcing, try estate sales on weekends - they typically have 40% better profit margins than thrift stores in your area.",
      "⏰ Thursday evenings around 7 PM EST have the highest conversion rates for that category. Want me to schedule your listing?",
      "📊 That's a solid flip! Based on your selling history, you typically do well with similar items. Your average profit margin is looking great!"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const callAICoach = async (message) => {
    try {
      // Add typing indicator
      const typingMessage = {
        id: Date.now(),
        text: '...',
        sender: 'ai',
        timestamp: new Date(),
        typing: true
      };
      setChatMessages(prev => [...prev, typingMessage]);

      // Prepare user context for better AI responses
      const userContext = {
        totalSales: dashboardStats.totalSales,
        totalRevenue: dashboardStats.totalRevenue,
        activeListings: dashboardStats.activeListings,
        subscriptionPlan: user?.subscription_plan
      };

      const response = await fetch('/.netlify/functions/ai-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userContext
        }),
      });

      if (!response.ok) {
        throw new Error(`AI Coach API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'AI Coach request failed');
      }

      // Remove typing indicator and add real response
      setChatMessages(prev => {
        const filtered = prev.filter(msg => !msg.typing);
        return [...filtered, {
          id: Date.now(),
          text: result.response,
          sender: 'ai',
          timestamp: new Date()
        }];
      });

      // Voice mode handling
      if (voiceMode) {
        setAiSpeaking(true);
        setTimeout(() => setAiSpeaking(false), 3000);
      }

    } catch (error) {
      console.error('AI Coach error:', error);
      
      // Remove typing indicator and show fallback response
      setChatMessages(prev => {
        const filtered = prev.filter(msg => !msg.typing);
        return [...filtered, {
          id: Date.now(),
          text: generateAIResponse(message),
          sender: 'ai',
          timestamp: new Date()
        }];
      });
    }
  };

  const getRandomItem = () => {
    const items = ['vintage collectible', 'electronics device', 'designer clothing item', 'home decor piece', 'book or media item'];
    return items[Math.floor(Math.random() * items.length)];
  };

  const createDraftListing = async (photo) => {
    if (!authUser || !user) {
      alert('Please sign in to create listings');
      return;
    }
  };

  const handleNewListing = () => {
    navigate('/capture');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Stat Card Component
  const StatCard = ({ icon: Icon, title, value, change, gradient, metric, subtitle }) => (
    <div 
      className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105 ${selectedMetric === metric ? 'ring-4 ring-white ring-opacity-30' : ''}`}
      onClick={() => setSelectedMetric(metric)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-200' : 'text-red-200'}`}>
          <TrendingUp className="w-4 h-4 mr-1" />
          <span>{change >= 0 ? '+' : ''}{change}%</span>
        </div>
      </div>
      <div>
        <p className="text-white text-opacity-80 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        <p className="text-white text-opacity-70 text-xs mt-1">{subtitle}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                EasyFlip AI
              </h1>
              <div className="flex space-x-6">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600'}`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => setActiveTab('coach')}
                  className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'coach' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600'}`}
                >
                  AI Coach
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-50 border-0 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button 
                onClick={handleNewListing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Listing
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Welcome Message */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.name || 'Seller'}! 👋
              </h2>
              <p className="text-gray-600">
                Here's what's happening with your listings today.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {loadingData ? (
                <div className="col-span-4 flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading dashboard data...</span>
                </div>
              ) : (
                <>
              <StatCard
                icon={DollarSign}
                title="Total Revenue"
                value={`$${dashboardStats.totalRevenue.toLocaleString()}`}
                change={dashboardStats.revenueChange}
                gradient="from-green-500 to-emerald-600"
                metric="revenue"
                subtitle="This week"
              />
              <StatCard
                icon={ShoppingCart}
                title="Total Sales"
                value={dashboardStats.totalSales.toString()}
                change={dashboardStats.salesChange}
                gradient="from-blue-500 to-cyan-600"
                metric="sales"
                subtitle="Items sold"
              />
              <StatCard
                icon={Eye}
                title="Total Views"
                value={dashboardStats.totalViews.toLocaleString()}
                change={dashboardStats.viewsChange}
                gradient="from-purple-500 to-pink-600"
                metric="views"
                subtitle="Listing views"
              />
              <StatCard
                icon={Package}
                title="Active Listings"
                value={dashboardStats.activeListings.toString()}
                change={dashboardStats.listingsChange}
                gradient="from-orange-500 to-red-600"
                metric="listings"
                subtitle="Currently listed"
              />
                </>
              )}
            </div>

            {/* Charts Section */}
            {!loadingData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Performance Chart */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Trend</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: 'none', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey={selectedMetric} 
                      stroke="#8b5cf6" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales by Category</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              </div>
            )}

            {/* Active Listings */}
            {!loadingData && (
              <div className="bg-white rounded-2xl p-6 shadow-lg mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Listings</h2>
                {allListings.filter(listing => listing.status === 'active').length > 0 ? (
                  <div className="space-y-4">
                    {allListings
                      .filter(listing => listing.status === 'active')
                      .map((listing) => {
                        const listingDate = new Date(listing.listed_at || listing.created_at);
                        const now = new Date();
                        const diffHours = Math.floor((now.getTime() - listingDate.getTime()) / (1000 * 60 * 60));
                        const timeAgo = diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours / 24)}d ago`;
                        
                        return (
                          <div
                            key={listing.id}
                           className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                          >
                            <div 
                              className="flex items-center space-x-4 flex-1 cursor-pointer"
                              onClick={() => navigate(`/details/${listing.item_id}`)}
                            >
                              {listing.items?.primary_image_url ? (
                                <img
                                  src={listing.items.primary_image_url}
                                  alt={listing.title}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                                  <Package className="w-6 h-6 text-white" />
                                </div>
                              )}
                              <div>
                                <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                                <p className="text-gray-600 text-sm">Listed {timeAgo}</p>
                              </div>
                            </div>
                            <div className="text-right mr-4">
                              <p className="font-bold text-gray-900">${listing.price}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Eye className="w-4 h-4 mr-1" />
                                  {listing.total_views || 0}
                                </span>
                                <span className="flex items-center">
                                  <Target className="w-4 h-4 mr-1" />
                                  {listing.total_watchers || 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Active
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteListing(listing.id, listing.item_id);
                                }}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete listing"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No active listings yet. Create your first listing to get started!</p>
                    <button
                      onClick={handleNewListing}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create New Listing
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Recent Sales */}
            {!loadingData && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Sales</h2>
              {recentSales.length > 0 ? (
                <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{sale.item}</h3>
                        <p className="text-gray-600 text-sm">{sale.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">${sale.price}</p>
                      <p className="text-green-600 text-sm">+${sale.profit} profit</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sale.status === 'sold' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {sale.status}
                    </span>
                  </div>
                ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No sales yet. Create your first listing to get started!</p>
                </div>
              )}
            </div>
            )}
          </>
        )}

        {/* AI Coach Tab */}
        {activeTab === 'coach' && (
          <div className="bg-white rounded-2xl shadow-lg h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-semibold">AI Reseller Coach</h2>
                  <p className="text-sm text-blue-100">Online • Ready to help</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleRecording}
                  className={`p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-500' : 'hover:bg-white hover:bg-opacity-10'}`}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.sender === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {message.sender === 'ai' && (
                        <Bot className="w-5 h-5 mt-0.5 text-blue-600" />
                      )}
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </div>
                </div>
              ))}
              {aiSpeaking && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-5 h-5 text-blue-600" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about pricing, sourcing, or anything reselling related..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {isRecording && (
                <div className="mt-2 flex items-center justify-center text-red-600">
                  <Mic className="w-4 h-4 mr-2 animate-pulse" />
                  <span className="text-sm">Listening...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppDashboard;