import React, { useState, useEffect } from 'react';
import { X, Calendar, Package, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';

interface InventoryMovement {
  id: string;
  movement_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  unit_cost?: number;
  total_cost?: number;
  reason?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

interface InventoryMovementsModalProps {
  isOpen: boolean;
  item: any;
  onClose: () => void;
}

const InventoryMovementsModal: React.FC<InventoryMovementsModalProps> = ({
  isOpen,
  item,
  onClose
}) => {
  const { authUser } = useAuth();
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen && item && authUser) {
      fetchMovements();
    }
  }, [isOpen, item, authUser]);

  const fetchMovements = async () => {
    if (!authUser || !item) return;
    
    const supabase = getSupabase();
    if (!supabase) return;

    setLoading(true);
    try {
      console.log('🔍 [INVENTORY-MOVEMENTS] Fetching movements for item:', item.id);
      
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('inventory_item_id', item.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setMovements(data || []);
      console.log('✅ [INVENTORY-MOVEMENTS] Loaded movements:', data?.length);
    } catch (error) {
      console.error('❌ [INVENTORY-MOVEMENTS] Error fetching movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (movementType: string) => {
    switch (movementType) {
      case 'initial_stock':
      case 'restock':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'sale':
      case 'damage':
      case 'theft':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'return':
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      case 'adjustment':
        return <Package className="w-4 h-4 text-yellow-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMovementColor = (movementType: string) => {
    switch (movementType) {
      case 'initial_stock':
      case 'restock':
        return 'text-green-600 bg-green-50';
      case 'sale':
      case 'damage':
      case 'theft':
        return 'text-red-600 bg-red-50';
      case 'return':
        return 'text-blue-600 bg-blue-50';
      case 'adjustment':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatMovementType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredMovements = movements.filter(movement => {
    if (filter === 'all') return true;
    return movement.movement_type === filter;
  });

  const movementTypes = [...new Set(movements.map(m => m.movement_type))];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Inventory Movements</h2>
              <p className="text-gray-600">{item?.name} (SKU: {item?.sku})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Stock Summary */}
        <div className="p-6 bg-gray-50 border-b">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{item?.total_quantity || 0}</div>
              <div className="text-sm text-gray-600">Total Stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{item?.available_quantity || 0}</div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{item?.reserved_quantity || 0}</div>
              <div className="text-sm text-gray-600">Reserved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">${item?.total_value?.toFixed(2) || '0.00'}</div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by type:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {movementTypes.map(type => (
                <option key={type} value={type}>
                  {formatMovementType(type)}
                </option>
              ))}
            </select>
            <div className="text-sm text-gray-500">
              Showing {filteredMovements.length} of {movements.length} movements
            </div>
          </div>
        </div>

        {/* Movements List */}
        <div className="overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMovements.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredMovements.map((movement) => (
                <div key={movement.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-full ${getMovementColor(movement.movement_type)}`}>
                        {getMovementIcon(movement.movement_type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {formatMovementType(movement.movement_type)}
                          </h3>
                          <span className={`text-sm font-medium ${
                            movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            Quantity: {movement.quantity_before} → {movement.quantity_after}
                          </p>
                          
                          {movement.reason && (
                            <p>Reason: {movement.reason}</p>
                          )}
                          
                          {movement.reference_number && (
                            <p>Reference: {movement.reference_number}</p>
                          )}
                          
                          {movement.notes && (
                            <p>Notes: {movement.notes}</p>
                          )}
                          
                          {movement.unit_cost && movement.unit_cost > 0 && (
                            <p>
                              Cost: ${movement.unit_cost.toFixed(2)}/unit
                              {movement.total_cost && movement.total_cost > 0 && (
                                <span> (Total: ${movement.total_cost.toFixed(2)})</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {formatDate(movement.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No movements found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "No inventory movements have been recorded for this item yet."
                  : `No movements of type "${formatMovementType(filter)}" found.`
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryMovementsModal;