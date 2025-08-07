import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Package, Eye, ShoppingCart, Calendar, Target, Zap, Plus, Settings, Bell, Mic, MicOff, Upload, Camera, MessageCircle, Send, Play, Pause, Image, Trash2, Bot, User, Star, Cloud } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, type Item, type Listing, type Sale } from '../lib/supabase';
import EbayApiService, { type TrendingItem } from '../services/ebayApi';
import DashboardLayout from '../components/DashboardLayout';
import { resizeImage, calculateImageHash, processImagesWithEnhancement } from '../utils/imageUtils';

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

// Upload Tab Component
const UploadTab: React.FC<{
  selectedFiles: File[];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onProcessFiles: () => void;
  isUploading: boolean;
  uploadProgress: number;
  processingStatus: string;
}> = ({ selectedFiles, onFileUpload, onProcessFiles, isUploading, uploadProgress, processingStatus }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  return (
    <div className="space-y-6">
      {/* Upload Section Header */}
      <div className="bg-cyber-gradient text-white p-6 rounded-2xl shadow-lg shadow-cyber-blue-500/30">
        <h2 className="text-xl font-bold">📸 AI-Powered Photo Upload & Processing</h2>
      </div>

      {/* Upload Instructions */}
      <div className="glass-panel dark:glass-panel backdrop-blur-glass rounded-2xl p-6">
        <div className="space-y-3 text-white/80 dark:text-white/80">
          <p>⚡ Upload time depends on your internet connection speed.</p>
          <p>🌐 You can switch to another browser tab or minimize the window.</p>
          <p><strong className="text-cyber-blue-500">⚠️ Important: Do not exit/close the browser during upload.</strong></p>
        </div>
      </div>

      {/* Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-3xl p-20 text-center backdrop-blur-light transition-all duration-400 cursor-pointer ${
          dragActive 
            ? 'border-cyber-blue-500 bg-cyber-blue-500/10 transform -translate-y-1 shadow-2xl shadow-cyber-blue-500/30' 
            : 'border-cyber-blue-500/30 dark:border-cyber-blue-500/30 bg-white/2 dark:bg-white/2 hover:border-cyber-blue-500 hover:bg-cyber-blue-500/5 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyber-blue-500/20'
        } upload-area-hover`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { 
          e.preventDefault(); 
          setDragActive(true); 
        }}
        onDragLeave={(e) => { 
          e.preventDefault(); 
          setDragActive(false); 
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const event = {
              target: { files: e.dataTransfer.files }
            } as React.ChangeEvent<HTMLInputElement>;
            onFileUpload(event);
          }
        }}
      >
        <div className="w-20 h-20 bg-cyber-gradient rounded-full mx-auto mb-6 flex items-center justify-center text-3xl shadow-lg shadow-cyber-blue-500/40 transition-transform duration-300 hover:scale-110 hover:rotate-6">
          <Cloud className="w-8 h-8 text-white" />
        </div>
        
        <div className="text-2xl font-bold mb-3 text-cyber-gradient">
          {dragActive ? 'DROP FILES HERE!' : 'AI PHOTO UPLOAD ZONE'}
        </div>
        
        <div className="text-white/70 dark:text-white/70 mb-4 text-lg">
          {dragActive ? 'Release to upload your photos' : 'Drag and drop or click to select your inventory photos'}
        </div>
        
        <div className="text-white/50 dark:text-white/50 text-sm font-medium">
          JPG, PNG, HEIC, HEIF supported • AI will optimize and categorize
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.heic,.heif"
          onChange={onFileUpload}
          className="hidden"
        />
      </div>

      {/* Selected Files Display */}
      {selectedFiles.length > 0 && (
        <div className="glass-panel dark:glass-panel backdrop-blur-glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-white dark:text-white">
            Selected Files ({selectedFiles.length})
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {selectedFiles.slice(0, 8).map((file, index) => (
              <div key={index} className="bg-white/10 dark:bg-white/10 rounded-lg p-3 text-center">
                <div className="w-12 h-12 bg-cyber-gradient rounded-lg mx-auto mb-2 flex items-center justify-center">
                  <Image className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs text-white/80 dark:text-white/80 truncate">
                  {file.name}
                </div>
                <div className="text-xs text-white/60 dark:text-white/60">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            ))}
          </div>
          
          {isUploading && (
            <div className="bg-white/10 dark:bg-white/10 rounded-lg p-3 text-center flex items-center justify-center mb-6">
              <div className="text-white/80 dark:text-white/80 text-sm">
                {processingStatus || `Processing ${selectedFiles.length} photos...`}
              </div>
            </div>
          )}
          
          {/* Process Button */}
          <button
            onClick={onProcessFiles}
            disabled={isUploading}
            className="w-full bg-cyber-gradient hover:opacity-90 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing... {Math.round(uploadProgress)}%</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Process {selectedFiles.length} Files with AI</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// SKU Tab Component
const SKUTab: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { authUser } = useAuth();
  const [itemsToSku, setItemsToSku] = useState<Item[]>([]);
  const [loadingSkus, setLoadingSkus] = useState(true);
  const [assigningSkus, setAssigningSkus] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      if (!authUser) return;
      setLoadingSkus(true);
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('status', 'draft') // Fetch items in draft status
          .order('created_at', { ascending: true });

        if (error) throw error;
        setItemsToSku(data || []);
      } catch (error) {
        console.error('Error fetching items for SKU assignment:', error);
        alert('Failed to load items for SKU assignment.');
      } finally {
        setLoadingSkus(false);
      }
    };
    fetchItems();
  }, [authUser]);

  const handleAssignSkus = async () => {
    if (itemsToSku.length === 0) {
      alert('No items to assign SKUs to.');
      return;
    }
    setAssigningSkus(true);
    try {
      const updates = itemsToSku.map((item, index) => ({
        id: item.id,
        sku: generateSKU(index), // Sequential SKU
        status: 'sku_assigned' // Update status
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('items')
          .update({ sku: update.sku, status: update.status })
          .eq('id', update.id);

        if (error) throw error;
      }

      alert('SKUs assigned successfully!');
      setActiveTab('generate'); // Move to Generate Listings tab
    } catch (error) {
      console.error('Error assigning SKUs:', error);
      alert('Failed to assign SKUs. Please try again.');
    } finally {
      setAssigningSkus(false);
    }
  };

  if (loadingSkus) {
    return (
      <div className="glass-panel dark:glass-panel backdrop-blur-glass rounded-2xl p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyber-blue-500 mx-auto mb-4"></div>
        <p className="text-white/70">Loading items for SKU assignment...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel dark:glass-panel backdrop-blur-glass rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 text-white dark:text-white">🏷️ Assign SKU Numbers</h2>
        <p className="text-white/80 dark:text-white/80 mb-6">
          Review your processed items and assign sequential SKU numbers.
        </p>
        
        {itemsToSku.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {itemsToSku.map((item, index) => (
                <div key={item.id} className="bg-white/10 rounded-lg p-4 text-center">
                  <img
                    src={item.primary_image_url || 'https://via.placeholder.com/150'}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded-md mb-3"
                  />
                  <div className="space-y-2">
                    <p className="text-sm text-white/90 font-medium truncate">{item.title}</p>
                    <p className="text-xs text-white/60">Brand: {item.brand || 'Unknown'}</p>
                    <p className="text-xs text-white/60">Price: ${item.suggested_price}</p>
                    <div className="bg-cyber-gradient text-white px-2 py-1 rounded text-xs font-bold">
                      Will be: {generateSKU(index)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleAssignSkus}
              disabled={assigningSkus}
              className="w-full bg-cyber-gradient hover:opacity-90 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
            >
              {assigningSkus ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Assigning SKUs...</span>
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  <span>Assign SKUs ({itemsToSku.length} items)</span>
                </>
              )}
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <Package className="w-16 h-16 text-white/30 dark:text-white/30 mx-auto mb-4" />
            <p className="text-white/50 dark:text-white/50">
              No new items ready for SKU assignment. Upload photos first!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Generate Listings Tab Component
const GenerateListingsTab: React.FC = () => {
  const { authUser } = useAuth();
  const [itemsToGenerate, setItemsToGenerate] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      if (!authUser) return;
      setLoadingItems(true);
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('status', 'sku_assigned') // Fetch items with SKU assigned
          .order('created_at', { ascending: true });

        if (error) throw error;
        setItemsToGenerate(data || []);
      } catch (error) {
        console.error('Error fetching items for listing generation:', error);
        alert('Failed to load items for listing generation.');
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, [authUser]);

  if (loadingItems) {
    return (
      <div className="glass-panel dark:glass-panel backdrop-blur-glass rounded-2xl p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyber-blue-500 mx-auto mb-4"></div>
        <p className="text-white/70">Loading items for listing generation...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel dark:glass-panel backdrop-blur-glass rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 text-white dark:text-white">✨ Generate Listings</h2>
        <p className="text-white/80 dark:text-white/80 mb-6">
          Review items with assigned SKUs and generate optimized listings.
        </p>
        
        {itemsToGenerate.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {itemsToGenerate.map((item) => (
                <div key={item.id} className="bg-white/10 rounded-lg p-4 text-center">
                  <img
                    src={item.primary_image_url || 'https://via.placeholder.com/150'}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded-md mb-3"
                  />
                  <div className="space-y-1">
                    <p className="text-sm text-white/90 font-medium truncate">{item.title}</p>
                    <p className="text-xs text-white/60">SKU: {item.sku || 'N/A'}</p>
                    <p className="text-xs text-white/60">Price: ${item.suggested_price}</p>
                    <p className="text-xs text-white/60">Brand: {item.brand || 'Unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full bg-cyber-gradient hover:opacity-90 disabled:opacity-50 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Generate Listings ({itemsToGenerate.length} items)</span>
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <Zap className="w-16 h-16 text-white/30 dark:text-white/30 mx-auto mb-4" />
            <p className="text-white/50 dark:text-white/50">
              No items ready for listing generation. Assign SKUs first!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Publish Tab Component
const PublishTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="glass-panel dark:glass-panel backdrop-blur-glass rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 text-white dark:text-white">🚀 Publish to eBay</h2>
        <p className="text-white/80 dark:text-white/80 mb-6">
          Publish your generated listings to eBay and other platforms.
        </p>
        
        <div className="text-center py-8">
          <ShoppingCart className="w-16 h-16 text-white/30 dark:text-white/30 mx-auto mb-4" />
          <p className="text-white/50 dark:text-white/50">
            Generate listings first to publish them
          </p>
        </div>
      </div>
    </div>
  );
};

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
  
  // eBay trending items state
  const [ebayService] = useState(() => new EbayApiService());
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('11450'); // Default to Clothing category
  const [trendingTest, setTrendingTest] = useState({ status: 'idle', message: 'Click to test eBay trending items API' });

  // New tab state for the redesigned dashboard
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Fetch trending items function
  const fetchTrendingItems = async (categoryId: string = selectedCategory) => {
    setLoadingTrending(true);
    try {
      console.log('📈 [DASHBOARD] Fetching trending items for category:', categoryId);
      const items = await ebayService.getTrendingItems([categoryId], 8);
      console.log('✅ [DASHBOARD] Trending items fetched:', items.length);
      setTrendingItems(items);
    } catch (error) {
      console.error('❌ [DASHBOARD] Error fetching trending items:', error);
      setTrendingItems([]);
    } finally {
      setLoadingTrending(false);
    }
  };

  // Test trending items API
  const testTrendingItems = async () => {
    setTrendingTest({ status: 'testing', message: 'Testing eBay trending items API...' });
    try {
      const testItems = await ebayService.getTrendingItems(['11450'], 3); // Test with clothing category
      setTrendingTest({ 
        status: 'success', 
        message: `Successfully fetched ${testItems.length} trending items` 
      });
    } catch (error) {
      setTrendingTest({ 
        status: 'error', 
        message: `Failed to fetch trending items: ${error.message}` 
      });
    }
  };

  // Load trending items on component mount
  useEffect(() => {
    fetchTrendingItems();
  }, []);

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

  // Handle file upload for new workflow
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      console.log(`📁 [DASHBOARD] Selected ${files.length} files for upload`);
    }
  };

  // Process uploaded files
  const processUploadedFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    if (!user || !authUser) {
      alert('Please sign in to process files');
      return;
    }

    // Check if user has reached their limit
    if (user.listings_used >= user.listings_limit && user.subscription_plan === 'free') {
      console.log('❌ [DASHBOARD] Listing limit reached!', {
        used: user.listings_used,
        limit: user.listings_limit,
        plan: user.subscription_plan
      });
      alert('You\'ve reached your free listing limit. Upgrade to Pro for unlimited listings!');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setProcessingStatus('Starting image processing...');
    
    try {
      const processedItems = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProcessingStatus(`Processing image ${i + 1}/${selectedFiles.length}: ${file.name}`);
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);

        // Resize image for storage
        const resizedFile = await resizeImage(file, 800);

        // Upload image to Supabase Storage
        const fileExt = resizedFile.name.split('.').pop();
        const fileName = `${authUser.id}/${Date.now()}_${i}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, resizedFile);

        if (uploadError) {
          console.error(`❌ [DASHBOARD] Upload error for image ${i + 1}:`, uploadError);
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('item-images')
          .getPublicUrl(fileName);

        // Create item in database with placeholder values (AI analysis will happen later)
        setProcessingStatus(`Saving item ${i + 1}/${selectedFiles.length} details...`);
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .insert([
            {
              user_id: authUser.id,
              title: `Item ${i + 1} (Analysis Pending)`,
              description: 'AI analysis will be performed after SKU assignment.',
              category: 'other',
              condition: 'good',
              brand: 'Unknown',
              model_number: null,
              size: 'Unknown',
              color: 'Unknown',
              suggested_price: 0,
              price_range_min: 0,
              price_range_max: 0,
              images: [publicUrl],
              primary_image_url: publicUrl,
              ai_confidence: 0,
              ai_analysis: {},
              ai_suggested_keywords: [],
              status: 'draft'
            }
          ])
          .select()
          .single();

        if (itemError) {
          console.error('❌ [DASHBOARD] Error creating item:', itemError);
          throw itemError;
        }
        processedItems.push(itemData);
      }

      // Update user's listing count
      setProcessingStatus('Updating user listing count...');
      await updateUser({ listings_used: user.listings_used + processedItems.length });

      setProcessingStatus('Complete!');
      setSelectedFiles([]); // Clear selected files after processing
      setUploadProgress(100);
      
      // Navigate to SKU assignment tab
      setActiveTab('skus');
    } catch (error) {
      console.error('❌ [DASHBOARD] Critical error during photo processing:', error);
      alert(`Failed to process photos: ${error.message}. Please try again.`);
    } finally {
      setIsUploading(false);
      setProcessingStatus('');
    }
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

  const generateSKU = (index) => {
    return `SKU-${Date.now()}-${index.toString().padStart(3, '0')}`;
  };

  // Overview Tab Component
  const OverviewTab: React.FC<{
    dashboardStats: DashboardStats;
    user: any;
    chatMessages: any[];
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    handleSendMessage: () => void;
    handleKeyPress: (e: any) => void;
    chatEndRef: any;
  }> = ({ dashboardStats, user, chatMessages, currentMessage, setCurrentMessage, handleSendMessage, handleKeyPress, chatEndRef }) => {
    return (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={DollarSign}
            title="Total Revenue"
            value={`$${dashboardStats.totalRevenue.toFixed(2)}`}
            change={dashboardStats.revenueChange}
            gradient="from-green-500 to-emerald-600"
            metric="revenue"
            subtitle="This month"
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
            value={dashboardStats.totalViews.toString()}
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
        </div>

        {/* Quick Chat */}
        <div className="glass-panel dark:glass-panel backdrop-blur-glass rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 text-white dark:text-white">🤖 Quick AI Coach</h2>
          <div className="flex space-x-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask your AI coach anything..."
              className="flex-1 p-3 rounded-lg bg-white/10 dark:bg-white/10 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyber-blue-500 placeholder-white/50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim()}
              className="bg-cyber-gradient hover:opacity-90 disabled:opacity-50 text-white p-3 rounded-lg transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab 
          dashboardStats={dashboardStats}
          user={user}
          chatMessages={chatMessages}
          currentMessage={currentMessage}
          setCurrentMessage={setCurrentMessage}
          handleSendMessage={handleSendMessage}
          handleKeyPress={handleKeyPress}
          chatEndRef={chatEndRef}
        />;
      case 'upload':
        return <UploadTab 
          selectedFiles={selectedFiles}
          onFileUpload={handleFileUpload}
          onProcessFiles={processUploadedFiles}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          processingStatus={processingStatus}
        />;
      case 'skus':
        return <SKUTab setActiveTab={setActiveTab} />;
      case 'generate':
        return <GenerateListingsTab />;
      case 'publish':
        return <PublishTab />;
      case 'coach':
        return (
          <div className="space-y-6">
            <div className="glass-panel dark:glass-panel backdrop-blur-glass rounded-2xl p-6 h-[calc(100vh-250px)] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white dark:text-white">🤖 AI Reseller Coach</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setVoiceMode(!voiceMode)}
                    className={`p-2 rounded-lg transition-colors ${
                      voiceMode ? 'bg-cyber-gradient text-white' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {voiceMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* Quick Questions */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    "What's my best-selling category?",
                    "How should I price electronics?",
                    "When's the best time to list?",
                    "What items should I source?"
                  ].map((question, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentMessage(question);
                        const newMessage = {
                          id: Date.now(),
                          text: question,
                          sender: 'user',
                          timestamp: new Date()
                        };
                        setChatMessages(prev => [...prev, newMessage]);
                        setCurrentMessage('');
                        callAICoach(question);
                      }}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1 rounded-full transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto mb-4 p-4 rounded-lg bg-white/5 dark:bg-white/5">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`mb-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block p-3 rounded-lg max-w-xs ${
                      msg.sender === 'user'
                        ? 'bg-cyber-gradient text-white'
                        : 'bg-gray-700 text-white'
                    }`}>
                      {msg.typing ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      ) : (
                        <span className="text-sm">{msg.text}</span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              
              {/* Chat Input */}
              <div className="flex space-x-2">
                {voiceMode && (
                  <button
                    onClick={toggleRecording}
                    className={`p-3 rounded-lg transition-all duration-300 ${
                      isRecording 
                        ? 'bg-red-500 text-white animate-pulse' 
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {isRecording ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                )}
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask your coach anything..."
                  className="flex-1 p-3 rounded-lg bg-white/10 dark:bg-white/10 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyber-blue-500 placeholder-white/50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim()}
                  className="bg-cyber-gradient hover:opacity-90 disabled:opacity-50 text-white p-3 rounded-lg transition-opacity"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <OverviewTab 
          dashboardStats={dashboardStats}
          user={user}
          chatMessages={chatMessages}
          currentMessage={currentMessage}
          setCurrentMessage={setCurrentMessage}
          handleSendMessage={handleSendMessage}
          handleKeyPress={handleKeyPress}
          chatEndRef={chatEndRef}
        />;
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
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderTabContent()}
    </DashboardLayout>
  );
};

export default AppDashboard;