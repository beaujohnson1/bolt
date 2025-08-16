import React, { useState, useEffect } from 'react';
import { X, Save, Image, Package, Tag, Truck, DollarSign, Target } from 'lucide-react';
import CategorySelector from './CategorySelector';
import ItemSpecifics from './ItemSpecifics';

interface GeneratedItem {
  id: string;
  sku: string;
  photos: string[];
  primaryPhoto: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  brand?: string;
  size?: string;
  color?: string;
  model_number?: string;
  ai_suggested_keywords: string[];
  ai_confidence: number;
  ai_analysis: any;
  status: 'not_started' | 'analyzing' | 'ready' | 'needs_attention' | 'complete';
  generationError?: string;
  lastUpdated: Date;
}

interface EditListingModalProps {
  item: GeneratedItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<GeneratedItem>) => void;
}

const EditListingModal: React.FC<EditListingModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('listing');
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
    model_number: '',
    ai_suggested_keywords: [] as string[]
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
        model_number: item.model_number || '',
        ai_suggested_keywords: item.ai_suggested_keywords || []
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
    { id: 'listing', label: 'Complete Listing', icon: Package },
    { id: 'photos', label: 'Photos', icon: Image },
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
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {activeTab === 'listing' && (
            <div className="space-y-8">
              {/* Basic Listing Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-600" />
                  Basic Listing Information
                </h3>
                
                <div className="space-y-4">
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

                  {/* Brand, Size, Color, Model */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => updateFormData('brand', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Brand name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                      <input
                        type="text"
                        value={formData.size}
                        onChange={(e) => updateFormData('size', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Size"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => updateFormData('color', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Primary color"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model #</label>
                      <input
                        type="text"
                        value={formData.model_number}
                        onChange={(e) => updateFormData('model_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Model/style number"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Item category"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder="Enter detailed description for buyers"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {formData.description.length}/1000 characters recommended
                    </div>
                  </div>
                </div>
              </div>

              {/* eBay Item Specifics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-600" />
                  eBay Item Specifics
                </h3>
                
                <div className="space-y-4">
                  {/* Standard eBay Fields for Clothing */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3">Required eBay Specifics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                          <option value="">Select department</option>
                          <option value="Men">Men</option>
                          <option value="Women">Women</option>
                          <option value="Unisex Adult">Unisex Adult</option>
                          <option value="Boys">Boys</option>
                          <option value="Girls">Girls</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => updateFormData('category', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="e.g., Jacket, Shirt, Pants"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Size Type</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                          <option value="">Select size type</option>
                          <option value="Regular">Regular</option>
                          <option value="Plus">Plus</option>
                          <option value="Petite">Petite</option>
                          <option value="Big & Tall">Big & Tall</option>
                          <option value="Maternity">Maternity</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fit</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                          <option value="">Select fit</option>
                          <option value="Slim">Slim</option>
                          <option value="Regular">Regular</option>
                          <option value="Relaxed">Relaxed</option>
                          <option value="Loose">Loose</option>
                          <option value="Tight">Tight</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {/* Optional eBay Fields */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Additional Specifics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                          <option value="">Select style</option>
                          <option value="Casual">Casual</option>
                          <option value="Formal">Formal</option>
                          <option value="Athletic">Athletic</option>
                          <option value="Business">Business</option>
                          <option value="Vintage">Vintage</option>
                          <option value="Bohemian">Bohemian</option>
                          <option value="Classic">Classic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Occasion</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                          <option value="">Select occasion</option>
                          <option value="Everyday">Everyday</option>
                          <option value="Work">Work</option>
                          <option value="Party">Party</option>
                          <option value="Wedding">Wedding</option>
                          <option value="Travel">Travel</option>
                          <option value="Outdoor">Outdoor</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                          <option value="">Select season</option>
                          <option value="Spring">Spring</option>
                          <option value="Summer">Summer</option>
                          <option value="Fall">Fall</option>
                          <option value="Winter">Winter</option>
                          <option value="All Seasons">All Seasons</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sleeve Length</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                          <option value="">Select sleeve length</option>
                          <option value="Sleeveless">Sleeveless</option>
                          <option value="Short Sleeve">Short Sleeve</option>
                          <option value="3/4 Sleeve">3/4 Sleeve</option>
                          <option value="Long Sleeve">Long Sleeve</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Neckline</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                          <option value="">Select neckline</option>
                          <option value="Crew Neck">Crew Neck</option>
                          <option value="V-Neck">V-Neck</option>
                          <option value="Scoop Neck">Scoop Neck</option>
                          <option value="Turtle Neck">Turtle Neck</option>
                          <option value="Collar">Collar</option>
                          <option value="Hood">Hood</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
                        <input
                          type="text"
                          placeholder="e.g., Pockets, Lined, Breathable"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Optimizer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                  Smart Pricing
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Current Price Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => updateFormData('price', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                      placeholder="0.00"
                    />
                    
                    {/* Quick Pricing Buttons */}
                    <div className="mt-3 flex space-x-2">
                      <button
                        onClick={() => updateFormData('price', 28)}
                        className="flex-1 px-3 py-2 bg-blue-100 text-blue-800 rounded text-sm font-medium hover:bg-blue-200 transition-colors"
                      >
                        Quick Sale: $28
                      </button>
                      <button
                        onClick={() => updateFormData('price', 32.50)}
                        className="flex-1 px-3 py-2 bg-green-100 text-green-800 rounded text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        Market: $32.50
                      </button>
                      <button
                        onClick={() => updateFormData('price', 38)}
                        className="flex-1 px-3 py-2 bg-purple-100 text-purple-800 rounded text-sm font-medium hover:bg-purple-200 transition-colors"
                      >
                        Premium: $38
                      </button>
                    </div>
                  </div>

                  {/* Market Analysis */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Market Analysis</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">$32</div>
                        <div className="text-xs text-gray-600">Market Average</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">$28-45</div>
                        <div className="text-xs text-gray-600">Price Range</div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded p-3">
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Similar items sold (7 days):</span>
                          <span className="font-medium">12 items</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average sale price:</span>
                          <span className="font-medium text-green-600">$32.50</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fastest sale price:</span>
                          <span className="font-medium text-blue-600">$28.00 (2 days)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4 mt-4">
                  <h5 className="font-medium text-yellow-900 mb-2">💡 Pricing Tips</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="text-sm text-yellow-800">• Lower prices sell faster with less profit</div>
                    <div className="text-sm text-yellow-800">• Market price balances speed and profit</div>
                    <div className="text-sm text-yellow-800">• Premium pricing for rare items</div>
                    <div className="text-sm text-yellow-800">• Consider brand reputation and condition</div>
                  </div>
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
          
          <div className="flex items-center space-x-3">
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
            
            <button
              onClick={() => {
                handleSave();
                // TODO: Implement eBay publishing
                alert('eBay publishing will be available soon!');
              }}
              disabled={saving}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              <Package className="w-4 h-4" />
              <span>Publish to eBay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditListingModal;