import React, { useState, useEffect } from 'react';
import { X, Save, Image, Package, Tag, Truck } from 'lucide-react';
import CategorySelector from './CategorySelector';
import ItemSpecifics from './ItemSpecifics';

interface ListingItem {
  id: string;
  sku: string;
  photos: string[];
  primaryPhoto: string;
  title: string;
  description: string;
  price: number;
  categoryPath: string;
  categoryId: string;
  itemSpecifics: Record<string, string>;
  keywords: string[];
  status: 'not_started' | 'analyzing' | 'ready' | 'needs_attention' | 'complete';
  generationError?: string;
  lastUpdated: Date;
  aiConfidence: number;
  brand?: string;
  size?: string;
  condition?: string;
  category?: string;
  color?: string;
  material?: string;
}

interface EditListingModalProps {
  item: ListingItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<ListingItem>) => void;
}

const EditListingModal: React.FC<EditListingModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    brand: '',
    size: '',
    condition: '',
    category: '',
    color: '',
    material: '',
    categoryPath: '',
    categoryId: '',
    itemSpecifics: {} as Record<string, string>,
    keywords: [] as string[]
  });

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        price: item.price || 0,
        brand: item.brand || '',
        size: item.size || '',
        condition: item.condition || '',
        category: item.category || '',
        color: item.color || '',
        material: item.material || '',
        categoryPath: item.categoryPath || '',
        categoryId: item.categoryId || '',
        itemSpecifics: item.itemSpecifics || {},
        keywords: item.keywords || []
      });
    }
  }, [item]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updatedData = {
        ...formData,
        price: parseFloat(formData.price.toString()) || 0,
        lastUpdated: new Date()
      };
      
      await onSave(updatedData);
      
    } catch (error) {
      console.error('Error saving listing:', error);
      alert('Failed to save listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Package },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'category', label: 'Category', icon: Tag },
    { id: 'shipping', label: 'Shipping', icon: Truck }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Listing</h2>
            <p className="text-gray-600">SKU: {item.sku}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
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

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Listing Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter listing title"
                  maxLength={80}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.title.length}/80 characters
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => updateFormData('price', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {/* Brand and Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => updateFormData('brand', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brand name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => updateFormData('size', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Size"
                  />
                </div>
              </div>

              {/* Condition and Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => updateFormData('condition', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select condition</option>
                    <option value="New with tags">New with tags</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => updateFormData('category', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Item category"
                  />
                </div>
              </div>

              {/* Color and Material */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => updateFormData('color', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Primary color"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Material</label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => updateFormData('material', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Primary material"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                  placeholder="Enter detailed description for buyers"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.description.length}/1000 characters recommended
                </div>
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Photo Management</h3>
              
              {/* Photo Grid */}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                {item.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-lg border"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {index === 0 ? 'Primary' : index + 1}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Photo Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• First photo is your primary listing image</li>
                  <li>• Additional photos show different angles and details</li>
                  <li>• High-quality photos increase buyer confidence</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'category' && (
            <div className="space-y-6">
              <CategorySelector
                selectedPath={formData.categoryPath}
                selectedId={formData.categoryId}
                onSelect={(path, id) => {
                  updateFormData('categoryPath', path);
                  updateFormData('categoryId', id);
                }}
              />
              
              <ItemSpecifics
                specifics={formData.itemSpecifics}
                categoryId={formData.categoryId}
                onChange={(specifics) => updateFormData('itemSpecifics', specifics)}
              />
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Shipping Information</h3>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">🚧 Coming Soon</h4>
                <p className="text-sm text-yellow-800">
                  Shipping options and weight/dimension settings will be available in the next update.
                  For now, eBay's default shipping options will be used.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center space-x-2"
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
      </div>
    </div>
  );
};

export default EditListingModal;