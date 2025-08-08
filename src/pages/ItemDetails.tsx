import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, ExternalLink, Trash2, Save, X, Package, Eye, Target, MessageCircle, Zap, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase, type Item, type Listing } from '../lib/supabase';
import { KeywordOptimizationService } from '../services/KeywordOptimizationService';

const ItemDetails = () => {
  const { itemId } = useParams();
  const { user, authUser, updateUser } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [item, setItem] = useState<Item | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [savingKeywords, setSavingKeywords] = useState(false);

  // Fetch item and listing data
  useEffect(() => {
    const fetchItemData = async () => {
      if (!itemId || !authUser) return;
      
      const supabase = getSupabase();
      if (!supabase) {
        alert('Database connection not available. Please check your configuration.');
        return;
      }

      try {
        console.log('🔍 [ITEM-DETAILS] Fetching item with ID:', itemId);
        
        // Fetch item details
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .eq('user_id', authUser.id)
          .single();

        if (itemError) {
          console.error('❌ [ITEM-DETAILS] Error fetching item:', itemError);
          throw itemError;
        }

        console.log('✅ [ITEM-DETAILS] Item fetched successfully:', itemData);
        setItem(itemData);
        setKeywords(itemData.ai_suggested_keywords || []);

        // Fetch associated listing if it exists
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('item_id', itemId)
          .eq('user_id', authUser.id)
          .single();

        if (listingError && listingError.code !== 'PGRST116') {
          console.error('❌ [ITEM-DETAILS] Error fetching listing:', listingError);
        } else if (listingData) {
          console.log('✅ [ITEM-DETAILS] Listing found:', listingData);
          setListing(listingData);
        } else {
          console.log('ℹ️ [ITEM-DETAILS] No listing found for this item');
        }
      } catch (error) {
        console.error('❌ [ITEM-DETAILS] Critical error fetching data:', error);
        alert('Failed to load item details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchItemData();
  }, [itemId, authUser]);

  // Save keyword changes
  const handleSaveKeywords = async () => {
    if (!item || !authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) {
      alert('Database connection not available. Please check your configuration.');
      return;
    }

    setSavingKeywords(true);
    try {
      console.log('💾 [ITEM-DETAILS] Saving keyword updates...');
      
      // Update item with new keywords
      const { error: updateError } = await supabase
        .from('items')
        .update({ ai_suggested_keywords: keywords })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // Update keyword preferences for learning
      const keywordService = new KeywordOptimizationService(supabase);
      await keywordService.updateUserApprovedKeywords(item.id, keywords);

      console.log('✅ [ITEM-DETAILS] Keywords saved successfully');
      setEditingKeywords(false);
      
      // Update local state
      setItem(prev => prev ? { ...prev, ai_suggested_keywords: keywords } : null);
    } catch (error) {
      console.error('❌ [ITEM-DETAILS] Error saving keywords:', error);
      alert('Failed to save keywords. Please try again.');
    } finally {
      setSavingKeywords(false);
    }
  };

  // Delete item and listing
  const handleDelete = async () => {
    if (!item || !authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) {
      alert('Database connection not available. Please check your configuration.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this item? This action cannot be undone.');
    if (!confirmed) return;

    try {
      console.log('🗑️ [ITEM-DETAILS] Deleting item and listing...');
      
      // Delete listing first if it exists
      if (listing) {
        const { error: listingError } = await supabase
          .from('listings')
          .delete()
          .eq('id', listing.id);

        if (listingError) throw listingError;
      }

      // Delete item
      const { error: itemError } = await supabase
        .from('items')
        .delete()
        .eq('id', item.id);

      if (itemError) throw itemError;

      // Update user's listing count
      if (user && user.listings_used > 0) {
        await updateUser({ listings_used: Math.max(0, user.listings_used - 1) });
      }

      console.log('✅ [ITEM-DETAILS] Item deleted successfully');
      navigate('/app');
    } catch (error) {
      console.error('❌ [ITEM-DETAILS] Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  // Create listing for this item
  const handleCreateListing = () => {
    navigate(`/preview/${itemId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading item details...</p>
        </div>
      </div>
    );
  }

  // Item not found
  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Item not found</h2>
          <p className="text-gray-600 mb-4">The item you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link 
            to="/app" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
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
            <Link
              to="/app"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Delete item"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
              
              {item.images && item.images.length > 0 ? (
                <div className="space-y-4">
                  {/* Primary Image */}
                  <div className="relative">
                    <img
                      src={item.primary_image_url || item.images[0]}
                      alt={item.title}
                      className="w-full h-80 object-contain rounded-lg bg-gray-50 border"
                    />
                    <div className="absolute top-3 left-3 bg-blue-600 text-white px-2 py-1 rounded text-sm font-medium">
                      Primary
                    </div>
                  </div>
                  
                  {/* Additional Images */}
                  {item.images.length > 1 && (
                    <div className="grid grid-cols-3 gap-3">
                      {item.images.slice(1).map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`${item.title} ${index + 2}`}
                          className="w-full h-24 object-cover rounded-lg border hover:opacity-75 transition-opacity cursor-pointer"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No images available</p>
                </div>
              )}
            </div>

            {/* AI Analysis */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Confidence Score</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(item.ai_confidence || 0) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{Math.round((item.ai_confidence || 0) * 100)}%</span>
                  </div>
                </div>
                
                {item.ai_analysis?.key_features && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Features Detected</h4>
                    <div className="flex flex-wrap gap-2">
                      {item.ai_analysis.key_features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Item Information */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">${item.suggested_price}</div>
                  {item.price_range_min && item.price_range_max && (
                    <div className="text-sm text-gray-500">
                      Range: ${item.price_range_min} - ${item.price_range_max}
                    </div>
                  )}
                </div>
              </div>

              {/* Item Properties Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Brand</h3>
                  <p className="text-gray-900">{item.brand ?? 'Unknown'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Category</h3>
                  <p className="text-gray-900">{item.category?.replace('_', ' ') ?? 'Unknown'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Size</h3>
                  <p className="text-gray-900">{item.size ?? 'Not specified'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Condition</h3>
                  <p className="text-gray-900">{item.condition?.replace('_', ' ') ?? 'Good'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Color</h3>
                  <p className="text-gray-900">{item.color ?? 'Various'}</p>
                </div>
                {item.model_number && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-1">Model Number</h3>
                    <p className="text-gray-900">{item.model_number ?? 'Not specified'}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {item.description && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg">
                    {item.description}
                  </p>
                </div>
              )}

              {/* SEO Keywords */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-700">SEO Keywords</h3>
                  {!editingKeywords ? (
                    <button
                      onClick={() => setEditingKeywords(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSaveKeywords}
                        disabled={savingKeywords}
                        className="text-green-600 hover:text-green-700 text-sm flex items-center space-x-1"
                      >
                        <Save className="w-4 h-4" />
                        <span>{savingKeywords ? 'Saving...' : 'Save'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingKeywords(false);
                          setKeywords(item.ai_suggested_keywords || []);
                        }}
                        className="text-gray-600 hover:text-gray-700 text-sm"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                
                {editingKeywords ? (
                  <div className="space-y-3">
                    <textarea
                      value={keywords.join(', ')}
                      onChange={(e) => setKeywords(e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Enter keywords separated by commas"
                    />
                    <p className="text-xs text-gray-500">
                      Separate keywords with commas. These help your listing appear in more searches.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {keywords.length > 0 ? (
                      keywords.map((keyword, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {keyword}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No keywords added yet</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Listing Status */}
            {listing ? (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Listing Status</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      listing.status === 'active' ? 'bg-green-100 text-green-700' :
                      listing.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {listing.status === 'active' ? 'Live on eBay' : listing.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">Views</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">{listing.total_views || 0}</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                        <Target className="w-4 h-4" />
                        <span className="text-sm">Watchers</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">{listing.total_watchers || 0}</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm">Messages</span>
                      </div>
                      <div className="text-xl font-bold text-gray-900">{listing.total_messages || 0}</div>
                    </div>
                  </div>
                  
                  {listing.status === 'active' && (
                    <div className="pt-4 border-t">
                      <a
                        href={`https://www.ebay.com/itm/${listing.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View on eBay</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* No Listing - Show Create Options */
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Ready to List</h2>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">🚀 Your item is ready to sell!</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• AI has analyzed your photos and suggested optimal pricing</li>
                      <li>• Keywords are optimized for maximum visibility</li>
                      <li>• Professional description is ready to go</li>
                      <li>• One-click posting to eBay with built-in payment processing</li>
                    </ul>
                  </div>
                  
                  <button
                    onClick={handleCreateListing}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <Zap className="w-5 h-5" />
                    <span>Create Listing</span>
                  </button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    Your listing will go live on eBay with optimized title, description, and pricing
                  </p>
                </div>
              </div>
            )}

            {/* Optimization Tips */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
              <h3 className="font-semibold text-purple-900 mb-3">💡 Optimization Tips</h3>
              <ul className="text-sm text-purple-800 space-y-2">
                <li className="flex items-start space-x-2">
                  <Star className="w-4 h-4 mt-0.5 text-purple-600" />
                  <span>Your pricing is based on analysis of similar sold items</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Star className="w-4 h-4 mt-0.5 text-purple-600" />
                  <span>Keywords are optimized for eBay's search algorithm</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Star className="w-4 h-4 mt-0.5 text-purple-600" />
                  <span>Multiple photos increase buyer confidence by 40%</span>
                </li>
                {!listing && (
                  <li className="flex items-start space-x-2">
                    <Star className="w-4 h-4 mt-0.5 text-purple-600" />
                    <span>List now for maximum visibility during peak hours</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemDetails;