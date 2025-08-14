import React, { useState, useEffect } from 'react';
import { X, Save, Package, Plus, Minus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';

interface EditInventoryModalProps {
  isOpen: boolean;
  item: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

const EditInventoryModal: React.FC<EditInventoryModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave
}) => {
  const { authUser } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    low_stock_threshold: 1,
    average_cost: 0,
    location: '',
    bin_location: '',
    weight_oz: 0,
    dimensions: ''
  });
  
  // Stock adjustment
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentCost, setAdjustmentCost] = useState(0);
  
  const [saving, setSaving] = useState(false);

  const categories = [
    'clothing', 'shoes', 'accessories', 'electronics', 'home_garden',
    'toys_games', 'sports_outdoors', 'books_media', 'jewelry', 'collectibles', 'other'
  ];

  useEffect(() => {
    if (item) {
      setFormData({
        sku: item.sku || '',
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        low_stock_threshold: item.low_stock_threshold || 1,
        average_cost: item.average_cost || 0,
        location: item.location || '',
        bin_location: item.bin_location || '',
        weight_oz: item.weight_oz || 0,
        dimensions: item.dimensions || ''
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sku || !formData.name) {
      alert('SKU and Name are required fields.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        low_stock_threshold: parseInt(formData.low_stock_threshold.toString()) || 1,
        average_cost: parseFloat(formData.average_cost.toString()) || 0,
        weight_oz: parseFloat(formData.weight_oz.toString()) || 0
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!authUser || !item || adjustmentQuantity === 0) {
      alert('Please enter a valid adjustment quantity.');
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    setSaving(true);
    try {
      let quantityChange = 0;
      let movementType = 'adjustment';
      
      switch (adjustmentType) {
        case 'add':
          quantityChange = Math.abs(adjustmentQuantity);
          movementType = 'restock';
          break;
        case 'remove':
          quantityChange = -Math.abs(adjustmentQuantity);
          movementType = 'adjustment';
          break;
        case 'set':
          quantityChange = adjustmentQuantity - item.total_quantity;
          movementType = 'adjustment';
          break;
      }

      // Create inventory movement
      const { error } = await supabase.rpc('create_inventory_movement', {
        p_user_id: authUser.id,
        p_inventory_item_id: item.id,
        p_movement_type: movementType,
        p_quantity_change: quantityChange,
        p_reason: adjustmentReason || `Manual ${adjustmentType} adjustment`,
        p_unit_cost: adjustmentType === 'add' && adjustmentCost > 0 ? adjustmentCost : null,
        p_reference_number: `ADJ-${Date.now()}`
      });

      if (error) throw error;

      // Reset adjustment form
      setAdjustmentQuantity(0);
      setAdjustmentReason('');
      setAdjustmentCost(0);
      
      alert('Stock adjustment completed successfully!');
      onClose(); // Close modal and refresh data
    } catch (error) {
      console.error('Error adjusting stock:', error);
      alert('Failed to adjust stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { id: 'details', label: 'Item Details', icon: Package },
    { id: 'stock', label: 'Stock Adjustment', icon: Plus }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Inventory Item</h2>
              <p className="text-gray-600">SKU: {item?.sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b bg-gray-50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => updateFormData('sku', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData('description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => updateFormData('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Inventory Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.low_stock_threshold}
                      onChange={(e) => updateFormData('low_stock_threshold', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Average Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.average_cost}
                      onChange={(e) => updateFormData('average_cost', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Physical Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => updateFormData('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bin Location
                    </label>
                    <input
                      type="text"
                      value={formData.bin_location}
                      onChange={(e) => updateFormData('bin_location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (oz)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.weight_oz}
                      onChange={(e) => updateFormData('weight_oz', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dimensions
                    </label>
                    <input
                      type="text"
                      value={formData.dimensions}
                      onChange={(e) => updateFormData('dimensions', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-6">
              {/* Current Stock Display */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Stock Levels</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{item?.total_quantity || 0}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{item?.available_quantity || 0}</div>
                    <div className="text-sm text-gray-600">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{item?.reserved_quantity || 0}</div>
                    <div className="text-sm text-gray-600">Reserved</div>
                  </div>
                </div>
              </div>

              {/* Stock Adjustment */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Adjustment</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adjustment Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('add')}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          adjustmentType === 'add'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Plus className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-sm font-medium">Add Stock</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('remove')}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          adjustmentType === 'remove'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Minus className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-sm font-medium">Remove Stock</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustmentType('set')}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          adjustmentType === 'set'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Package className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-sm font-medium">Set Total</div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {adjustmentType === 'set' ? 'New Total Quantity' : 'Quantity'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={adjustmentQuantity}
                        onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>

                    {adjustmentType === 'add' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit Cost ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={adjustmentCost}
                          onChange={(e) => setAdjustmentCost(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Adjustment
                    </label>
                    <input
                      type="text"
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Physical count correction, damaged goods, etc."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleStockAdjustment}
                    disabled={adjustmentQuantity === 0 || saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    Apply Stock Adjustment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'details' && (
          <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.sku || !formData.name}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditInventoryModal;