import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, AlertTriangle, TrendingUp, TrendingDown, Plus, Search, 
  Filter, Edit, Trash2, BarChart3, RefreshCw, ArrowUpDown, Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';
import AddInventoryModal from '../components/AddInventoryModal';
import EditInventoryModal from '../components/EditInventoryModal';
import InventoryMovementsModal from '../components/InventoryMovementsModal';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  total_quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  sold_quantity: number;
  average_cost: number;
  total_value: number;
  low_stock_threshold: number;
  location?: string;
  last_movement_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface InventoryAlert {
  id: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstocked' | 'negative_stock';
  alert_status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  message: string;
  current_quantity: number;
  threshold_quantity: number;
  triggered_at: string;
  inventory_item: {
    sku: string;
    name: string;
  };
}

const InventoryDashboard = () => {
  const { authUser } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'value' | 'updated'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    if (authUser) {
      fetchInventoryData();
    }
  }, [authUser]);

  const fetchInventoryData = async () => {
    if (!authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) {
      console.error('❌ [INVENTORY] Database connection not available');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 [INVENTORY] Fetching inventory data...');
      
      // Fetch inventory items
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (itemsError) throw itemsError;

      // Fetch active alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('inventory_alerts')
        .select(`
          *,
          inventory_item:inventory_items(sku, name)
        `)
        .eq('user_id', authUser.id)
        .eq('alert_status', 'active')
        .order('triggered_at', { ascending: false });

      if (alertsError) throw alertsError;

      setInventoryItems(items || []);
      setAlerts(alertsData || []);
      console.log('✅ [INVENTORY] Data loaded:', { items: items?.length, alerts: alertsData?.length });
    } catch (error) {
      console.error('❌ [INVENTORY] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventory = async (inventoryData: Partial<InventoryItem>) => {
    if (!authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      console.log('➕ [INVENTORY] Adding new inventory item...');
      
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([{
          ...inventoryData,
          user_id: authUser.id,
          total_quantity: inventoryData.total_quantity || 0,
          available_quantity: inventoryData.total_quantity || 0
        }])
        .select()
        .single();

      if (error) throw error;

      // Create initial stock movement if quantity > 0
      if (inventoryData.total_quantity && inventoryData.total_quantity > 0) {
        await supabase.rpc('create_inventory_movement', {
          p_user_id: authUser.id,
          p_inventory_item_id: data.id,
          p_movement_type: 'initial_stock',
          p_quantity_change: inventoryData.total_quantity,
          p_reason: 'Initial inventory setup',
          p_unit_cost: inventoryData.average_cost || 0
        });
      }

      await fetchInventoryData();
      setShowAddModal(false);
      console.log('✅ [INVENTORY] Item added successfully');
    } catch (error) {
      console.error('❌ [INVENTORY] Error adding item:', error);
      alert('Failed to add inventory item. Please try again.');
    }
  };

  const handleEditInventory = async (inventoryData: Partial<InventoryItem>) => {
    if (!selectedItem || !authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      console.log('✏️ [INVENTORY] Updating inventory item...');
      
      const { error } = await supabase
        .from('inventory_items')
        .update(inventoryData)
        .eq('id', selectedItem.id)
        .eq('user_id', authUser.id);

      if (error) throw error;

      await fetchInventoryData();
      setShowEditModal(false);
      setSelectedItem(null);
      console.log('✅ [INVENTORY] Item updated successfully');
    } catch (error) {
      console.error('❌ [INVENTORY] Error updating item:', error);
      alert('Failed to update inventory item. Please try again.');
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!authUser) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}" (SKU: ${item.sku})? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      console.log('🗑️ [INVENTORY] Deleting inventory item...');
      
      const { error } = await supabase
        .from('inventory_items')
        .update({ is_active: false })
        .eq('id', item.id)
        .eq('user_id', authUser.id);

      if (error) throw error;

      await fetchInventoryData();
      console.log('✅ [INVENTORY] Item deleted successfully');
    } catch (error) {
      console.error('❌ [INVENTORY] Error deleting item:', error);
      alert('Failed to delete inventory item. Please try again.');
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    if (!authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('inventory_alerts')
        .update({ 
          alert_status: 'acknowledged', 
          acknowledged_at: new Date().toISOString() 
        })
        .eq('id', alertId)
        .eq('user_id', authUser.id);

      if (error) throw error;
      
      await fetchInventoryData();
    } catch (error) {
      console.error('❌ [INVENTORY] Error acknowledging alert:', error);
    }
  };

  // Filter and sort items
  const filteredItems = inventoryItems
    .filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === '' || item.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'quantity':
          aValue = a.available_quantity;
          bValue = b.available_quantity;
          break;
        case 'value':
          aValue = a.total_value;
          bValue = b.total_value;
          break;
        default:
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Calculate summary stats
  const stats = {
    totalItems: inventoryItems.length,
    totalValue: inventoryItems.reduce((sum, item) => sum + item.total_value, 0),
    lowStockItems: inventoryItems.filter(item => 
      item.available_quantity <= item.low_stock_threshold
    ).length,
    outOfStockItems: inventoryItems.filter(item => item.available_quantity === 0).length
  };

  // Get unique categories for filter
  const categories = [...new Set(inventoryItems.map(item => item.category).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/app"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">Inventory Management</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchInventoryData}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Inventory Alerts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.alert_type === 'out_of_stock' 
                      ? 'bg-red-50 border-red-400' 
                      : 'bg-yellow-50 border-yellow-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {alert.inventory_item.name}
                      </h3>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        SKU: {alert.inventory_item.sku}
                      </p>
                    </div>
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Acknowledge alert"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Items</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
                <p className="text-2xl font-bold text-gray-900">${stats.totalValue.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Low Stock</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <TrendingDown className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Out of Stock</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.outOfStockItems}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category?.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="updated">Last Updated</option>
                <option value="name">Name</option>
                <option value="quantity">Quantity</option>
                <option value="value">Value</option>
              </select>
            </div>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantities
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost & Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        {item.description && (
                          <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                        )}
                        {item.location && (
                          <p className="text-xs text-gray-400">📍 {item.location}</p>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {item.available_quantity}
                          </span>
                          <span className="text-xs text-gray-500">available</span>
                        </div>
                        {item.reserved_quantity > 0 && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-yellow-600">
                              {item.reserved_quantity}
                            </span>
                            <span className="text-xs text-gray-500">reserved</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {item.total_quantity}
                          </span>
                          <span className="text-xs text-gray-500">total</span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          ${item.average_cost.toFixed(2)} / unit
                        </p>
                        <p className="text-sm text-green-600 font-medium">
                          ${item.total_value.toFixed(2)} total
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {item.available_quantity === 0 ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Out of Stock
                          </span>
                        ) : item.available_quantity <= item.low_stock_threshold ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            In Stock
                          </span>
                        )}
                        {item.category && (
                          <p className="text-xs text-gray-500">
                            {item.category.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowMovementsModal(true);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          title="View movements"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowEditModal(true);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory items found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterCategory 
                    ? "Try adjusting your search filters." 
                    : "Add your first inventory item to get started."
                  }
                </p>
                {!searchTerm && !filterCategory && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Add First Item
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddInventoryModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddInventory}
        />
      )}

      {showEditModal && selectedItem && (
        <EditInventoryModal
          isOpen={showEditModal}
          item={selectedItem}
          onClose={() => {
            setShowEditModal(false);
            setSelectedItem(null);
          }}
          onSave={handleEditInventory}
        />
      )}

      {showMovementsModal && selectedItem && (
        <InventoryMovementsModal
          isOpen={showMovementsModal}
          item={selectedItem}
          onClose={() => {
            setShowMovementsModal(false);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
};

export default InventoryDashboard;