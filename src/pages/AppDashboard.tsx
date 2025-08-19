import React, { useState, useEffect } from 'react';
import { Camera, Package, TrendingUp, DollarSign, Upload, Zap, Bot, ShoppingCart, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase, type Item, type Listing, type Sale } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import GenerateListingsTable from '../components/GenerateListingsTable';
import SKUAssignmentPage from '../components/SKUAssignment/SKUAssignmentPage';
import PhotoCapture from './PhotoCapture';
import { formatPrice } from '../utils/itemUtils';
import GenerateListingsPage from './GenerateListingsPage';
import EbayEnvironmentStatus from '../components/EbayEnvironmentStatus';
import InventoryDashboard from './InventoryDashboard';

const AppDashboard = () => {
  const { user, authUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [items, setItems] = useState<Item[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);

  // Handle photo upload completion - switch to SKUs tab and store photos
  const handlePhotoUploadComplete = (photos?: any[]) => {
    console.log('🎯 [APP-DASHBOARD] Photo upload complete, switching to SKUs tab...');
    if (photos) {
      console.log('📸 [APP-DASHBOARD] Storing uploaded photos for SKU assignment:', photos.length);
      setUploadedPhotos(photos);
    }
    setActiveTab('skus');
    setRefreshTrigger(prev => prev + 1); // Trigger refresh of SKU table
  };

  // Delete a single item with comprehensive cleanup
  const deleteItem = async (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ [DELETE] Supabase client not available');
      return;
    }

    try {
      console.log('🗑️ [DELETE] Deleting item:', itemId);
      
      // First try simple delete
      let { error } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', authUser.id);

      // If that fails with 409, do comprehensive cleanup
      if (error && error.code === '23503') {
        console.log('🔄 [DELETE] Foreign key constraint detected, doing comprehensive cleanup...');
        
        // Delete related records first in proper order
        // 1. First get all listings for this item
        const { data: itemListings } = await supabase
          .from('listings')
          .select('id')
          .eq('item_id', itemId);
        
        // 2. Delete sales records for each listing
        if (itemListings && itemListings.length > 0) {
          for (const listing of itemListings) {
            await supabase.from('sales').delete().eq('listing_id', listing.id);
          }
        }
        
        // 3. Delete photo analysis records (main constraint blocker)
        try {
          await supabase.from('photo_analysis').delete().eq('item_id', itemId);
        } catch (e) {
          console.warn('Photo analysis delete failed:', e);
        }
        
        // 4. Delete only tables that exist and may reference this item
        const tablesToTry = ['ai_predictions', 'pricing_recommendations', 'pricing_performance', 'price_tracking_jobs'];
        for (const table of tablesToTry) {
          try {
            await supabase.from(table).delete().eq('item_id', itemId);
          } catch (e) {
            // Table doesn't exist or other error - ignore
          }
        }
        
        // 5. Delete listings for this item
        await supabase.from('listings').delete().eq('item_id', itemId);
        
        // Try deleting the item again
        const { error: retryError } = await supabase
          .from('items')
          .delete()
          .eq('id', itemId)
          .eq('user_id', authUser.id);
          
        if (retryError) throw retryError;
      } else if (error) {
        throw error;
      }
      
      // Refresh the dashboard data
      await fetchDashboardData();
      console.log('✅ [DELETE] Item deleted successfully');
    } catch (error) {
      console.error('❌ [DELETE] Error deleting item:', error);
      alert(`Failed to delete item: ${error.message || 'Unknown error'}. You can try using "Clear All" for a more thorough cleanup.`);
    }
  };

  // Delete all items using a comprehensive approach
  const deleteAllItems = async () => {
    if (!authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ [DELETE-ALL] Supabase client not available');
      return;
    }

    try {
      setDeletingAll(true);
      console.log('🗑️ [DELETE-ALL] Starting comprehensive cleanup for user:', authUser.id);
      
      // Step 1: Try using an RPC function for cascading delete (if it exists)
      console.log('🗑️ [DELETE-ALL] Step 1: Attempting RPC cascading delete...');
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_all_user_data', {
          p_user_id: authUser.id
        });
        
        if (!rpcError) {
          console.log('✅ [DELETE-ALL] RPC delete successful:', rpcResult);
          await fetchDashboardData();
          setShowDeleteConfirm(false);
          alert('Successfully deleted all items using database function!');
          return;
        } else {
          console.log('⚠️ [DELETE-ALL] RPC function not available, falling back to manual cleanup');
        }
      } catch (rpcException) {
        console.log('⚠️ [DELETE-ALL] RPC method failed, using manual cleanup');
      }

      // Step 2: Manual comprehensive cleanup
      console.log('🗑️ [DELETE-ALL] Step 2: Manual comprehensive cleanup...');
      
      // Delete from tables that definitely exist (skip 404 tables)
      const tablesToCleanup = [
        'sales',
        'listings', 
        'photo_analysis',
        'uploaded_photos',
        'items'
      ];

      let totalDeleted = 0;
      
      for (const tableName of tablesToCleanup) {
        try {
          console.log(`🗑️ [DELETE-ALL] Cleaning table: ${tableName}`);
          const { count, error } = await supabase
            .from(tableName)
            .delete({ count: 'exact' })
            .eq('user_id', authUser.id);

          if (error) {
            console.warn(`⚠️ [DELETE-ALL] Error cleaning ${tableName}:`, error);
          } else {
            const deletedCount = count || 0;
            totalDeleted += deletedCount;
            console.log(`✅ [DELETE-ALL] Deleted ${deletedCount} records from ${tableName}`);
          }
        } catch (tableError) {
          console.warn(`⚠️ [DELETE-ALL] Exception cleaning ${tableName}:`, tableError);
        }
      }

      // Step 3: Force delete remaining items individually
      console.log('🗑️ [DELETE-ALL] Step 3: Checking for remaining items...');
      const { data: remainingItems } = await supabase
        .from('items')
        .select('id, title')
        .eq('user_id', authUser.id);

      if (remainingItems && remainingItems.length > 0) {
        console.log(`🗑️ [DELETE-ALL] Found ${remainingItems.length} remaining items, force deleting...`);
        
        for (const item of remainingItems) {
          try {
            // Try to delete any remaining related records for this specific item
            // 1. First get all listings for this item
            const { data: itemListings } = await supabase
              .from('listings')
              .select('id')
              .eq('item_id', item.id);
            
            // 2. Delete sales records for each listing
            if (itemListings && itemListings.length > 0) {
              for (const listing of itemListings) {
                await supabase.from('sales').delete().eq('listing_id', listing.id);
              }
            }
            
            // 3. Delete photo analysis records (main constraint blocker)
            try {
              await supabase.from('photo_analysis').delete().eq('item_id', item.id);
            } catch (e) {
              console.warn('Photo analysis delete failed for item:', item.id, e);
            }
            
            // 4. Delete only tables that exist and may reference this item
            const tablesToTry = ['ai_predictions', 'pricing_recommendations', 'pricing_performance', 'price_tracking_jobs'];
            for (const table of tablesToTry) {
              try {
                await supabase.from(table).delete().eq('item_id', item.id);
              } catch (e) {
                // Table doesn't exist or other error - ignore
              }
            }
            
            // 5. Delete listings for this item
            await supabase.from('listings').delete().eq('item_id', item.id);
            
            // Then delete the item
            const { error } = await supabase
              .from('items')
              .delete()
              .eq('id', item.id)
              .eq('user_id', authUser.id);

            if (!error) {
              totalDeleted++;
              console.log(`✅ [DELETE-ALL] Force deleted item: ${item.title}`);
            }
          } catch (itemError) {
            console.error(`❌ [DELETE-ALL] Could not force delete item ${item.id}:`, itemError);
          }
        }
      }
      
      // Refresh the dashboard data
      await fetchDashboardData();
      setShowDeleteConfirm(false);
      
      console.log(`✅ [DELETE-ALL] Cleanup complete. Total records deleted: ${totalDeleted}`);
      
      // Final check to see if items still exist
      const { data: finalCheck } = await supabase
        .from('items')
        .select('id')
        .eq('user_id', authUser.id);
        
      const remainingCount = finalCheck?.length || 0;
      
      if (remainingCount === 0) {
        alert(`✅ Successfully deleted all items! Your dashboard is now clean.`);
      } else {
        alert(`⚠️ Cleanup attempted. ${remainingCount} items may still exist due to database constraints. Please click "Refresh" to see current status, or try deleting individual items that persist.`);
      }
      
    } catch (error) {
      console.error('❌ [DELETE-ALL] Error in comprehensive cleanup:', error);
      alert(`Error during cleanup: ${error.message}. Please try again or delete items individually.`);
    } finally {
      setDeletingAll(false);
    }
  };

  useEffect(() => {
    if (authUser) {
      fetchDashboardData();
    }
  }, [authUser]);

  // Check for dashboard refresh flag on component mount and visibility change
  useEffect(() => {
    const checkRefreshFlag = () => {
      const needsRefresh = localStorage.getItem('dashboard_refresh_needed');
      if (needsRefresh === 'true') {
        console.log('🔄 [DASHBOARD] Refresh flag detected, refreshing data...');
        localStorage.removeItem('dashboard_refresh_needed');
        fetchDashboardData();
      }
    };

    // Check on mount
    checkRefreshFlag();

    // Check when page becomes visible (user switches back to dashboard)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkRefreshFlag();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authUser]);

  const fetchDashboardData = async () => {
    if (!authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ [DASHBOARD] Supabase client not available');
      return;
    }

    try {
      setLoading(true);

      // Fetch all data in parallel for faster loading
      const [itemsResult, listingsResult, salesResult] = await Promise.all([
        supabase
          .from('items')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('listings')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false }),
        
        supabase
          .from('sales')
          .select('*')
          .eq('user_id', authUser.id)
          .order('sold_at', { ascending: false })
      ]);

      // Check for errors
      if (itemsResult.error) throw itemsResult.error;
      if (listingsResult.error) throw listingsResult.error;
      if (salesResult.error) throw salesResult.error;

      setItems(itemsResult.data || []);
      setListings(listingsResult.data || []);
      setSales(salesResult.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'upload':
        return <PhotoCapture onUploadComplete={handlePhotoUploadComplete} embedded={true} />;
      case 'skus':
        return <SKUAssignmentPage isDarkMode={isDarkMode} key={refreshTrigger} onAssignmentComplete={() => setActiveTab('generate')} uploadedPhotos={uploadedPhotos} />;
      case 'generate':
        return <GenerateListingsPage key={`generate-${refreshTrigger}`} />;
      case 'inventory':
        return <InventoryDashboard />;
      case 'publish':
        return <PublishTab />;
      case 'coach':
        return <CoachTab />;
      default:
        return <OverviewTab />;
    }
  };

  const OverviewTab = () => {
    console.log('🔍 [OVERVIEW-TAB] Rendering with items:', items.length, items.map(i => ({ id: i.id, title: i.title })));
    return (
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

      {/* eBay API Status */}
      <div className="mb-4">
        <EbayEnvironmentStatus />
      </div>

      {/* Recent Items */}
      <div className={`${isDarkMode ? 'glass-panel' : 'glass-panel-light'} backdrop-blur-glass rounded-2xl p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Recent Items
          </h2>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Test Items
              </button>
            )}
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="Refresh data from database"
            >
              <Package className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
        {items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.slice(0, 6).map((item) => (
              <Link 
                key={item.id} 
                to={`/details/${item.id}`}
                onClick={() => console.log('🔍 [DASHBOARD] Item clicked:', item.id, item.title)}
                className={`group block border rounded-lg p-4 hover:shadow-lg transition-all duration-200 cursor-pointer relative z-10 pointer-events-auto ${isDarkMode ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300'}`}
                style={{ pointerEvents: 'auto' }}
              >
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
                <div className={`mt-2 text-xs font-semibold ${isDarkMode ? 'text-cyber-blue-500' : 'text-blue-600'}`}>
                  🎯 View Details & Smart Pricing →
                </div>
                
                {/* Delete button */}
                <button
                  onClick={(e) => deleteItem(item.id, e)}
                  className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-30"
                  title="Delete item"
                >
                  <X className="w-3 h-3" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🔍 [DASHBOARD] Button clicked for item:', item.id);
                    navigate(`/details/${item.id}`);
                  }}
                  className={`absolute inset-0 w-full h-full bg-transparent z-20`}
                  style={{ background: 'transparent' }}
                />
              </Link>
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
  };

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
    <>
      <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderTabContent()}
      </DashboardLayout>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 rounded-full p-2 mr-3">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete All Items</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete all {items.length} test items? This action cannot be undone.
            </p>
            
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> If some items persist after deletion, this may be due to database constraints. 
                Click "Refresh" after deletion to see the updated results.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingAll}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteAllItems}
                disabled={deletingAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppDashboard;