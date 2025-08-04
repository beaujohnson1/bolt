import React, { useState, useEffect, useRef } from 'react';
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

const AppDashboard = () => {
  const { user, authUser } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [isRecording, setIsRecording] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const fileInputRef = useRef(null);
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
            .select('*')
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

  useEffect(() => {
    setChatMessages([
      {
        id: 1,
        text: `👋 Hey ${user?.name || 'there'}! I'm your AI Reseller Coach. I can help with pricing, sourcing, creating eBay listings, and market insights. Upload a photo or ask me anything!`,
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

  // Photo Upload Functions
  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhoto = {
          id: Date.now() + Math.random(),
          url: e.target.result,
          name: file.name,
          file: file
        };
        setUploadedPhotos(prev => [...prev, newPhoto]);
        
        // Simulate AI analysis
        setTimeout(() => {
          handleAIResponse(`🔍 I've analyzed your photo! This looks like a ${getRandomItem()}. Based on current market data, I suggest pricing it at $${Math.floor(Math.random() * 200 + 50)}. Want me to create an eBay listing?`);
        }, 2000);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      const event = { target: { files: imageFiles } };
      handlePhotoUpload(event);
    }
  };

  const removePhoto = (photoId) => {
    setUploadedPhotos(prev => prev.filter(photo => photo.id !== photoId));
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
      
      setTimeout(() => {
        handleAIResponse(generateAIResponse(messageToProcess));
      }, 1500);
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

  const getRandomItem = () => {
    const items = ['vintage collectible', 'electronics device', 'designer clothing item', 'home decor piece', 'book or media item'];
    return items[Math.floor(Math.random() * items.length)];
  };

  const createEbayListing = () => {
    setIsCreatingListing(true);
    setTimeout(() => {
      setIsCreatingListing(false);
      handleAIResponse("✅ eBay listing created successfully! I've optimized the title, description, and keywords. Your item is now live and should start getting views within the hour.");
    }, 3000);
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
                  onClick={() => setActiveTab('photos')}
                  className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'photos' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-blue-600'}`}
                >
                  Photo Upload
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
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center shadow-lg">
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

        {/* Photo Upload Tab */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Upload Item Photos</h2>
              
              {/* Drag & Drop Area */}
              <div 
                className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center hover:border-blue-500 transition-colors cursor-pointer bg-blue-50 hover:bg-blue-100"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Drop photos here or click to upload</h3>
                <p className="text-gray-500">AI will analyze your items and suggest pricing</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Uploaded Photos */}
              {uploadedPhotos.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Photos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {uploadedPhotos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <img 
                          src={photo.url} 
                          alt={photo.name}
                          className="w-full h-32 object-cover rounded-lg shadow-md"
                        />
                        <button
                          onClick={() => removePhoto(photo.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={createEbayListing}
                          className="absolute bottom-2 left-2 right-2 bg-blue-600 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Create Listing
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create Listing Loading */}
              {isCreatingListing && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-blue-700">Creating your eBay listing...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
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
                  onClick={() => setVoiceMode(!voiceMode)}
                  className={`p-2 rounded-lg transition-colors ${voiceMode ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-10'}`}
                >
                  {voiceMode ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
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