import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit3, DollarSign, Tag, Package, Star, Hash, Palette, Ruler, Award, Brain, Save, X } from 'lucide-react';
import { supabase, type Item } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import KeywordOptimizationService from '../services/KeywordOptimizationService';

const ItemDetails = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [editedItem, setEditedItem] = useState<Item | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [userKeywords, setUserKeywords] = useState<string[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId || !authUser) return;

      try {
        const { data, error } = await supabase
          .from('items')
          .select('*, ai_suggested_keywords')
          .eq('id', itemId)
          .eq('user_id', authUser.id)
          .single();

        if (error) throw error;

        setItem(data);
        setEditedItem(data);
        
        // Load suggested keywords and initialize user keywords
        if (data.ai_suggested_keywords) {
          setSuggestedKeywords(data.ai_suggested_keywords);
          setUserKeywords([...data.ai_suggested_keywords]);
        }
        
        // Load any existing user-approved keywords from photo analysis
        try {
          const { data: photoAnalysis } = await supabase
            .from('photo_analysis')
            .select('user_approved_keywords')
            .eq('item_id', itemId)
            .single();
            
          if (photoAnalysis?.user_approved_keywords) {
            setUserKeywords(photoAnalysis.user_approved_keywords);
          }
        } catch (error) {
          console.log('No existing photo analysis found, using AI suggestions');
        }
      } catch (error) {
        console.error('Error fetching item:', error);
        alert('Failed to load item details.');
        navigate('/app');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemId, authUser, navigate]);

  const handleSave = async () => {
    if (!editedItem || !itemId || !authUser) return;

    setSaving(true);
    try {
      console.log('💾 [ITEM-DETAILS] Saving item details and keywords...');
      
      // Save item details to database
      const { error } = await supabase
        .from('items')
        .update({
          title: editedItem.title,
          description: editedItem.description,
          category: editedItem.category,
          condition: editedItem.condition,
          brand: editedItem.brand,
          model_number: editedItem.model_number,
          size: editedItem.size,
          color: editedItem.color,
          suggested_price: editedItem.suggested_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('user_id', authUser.id);

      if (error) throw error;

      console.log('✅ [ITEM-DETAILS] Item details saved successfully');
      
      // Save user-approved keywords for AI learning system
      if (userKeywords.length > 0) {
        try {
          const keywordService = new KeywordOptimizationService(supabase);
          await keywordService.updateUserApprovedKeywords(itemId, userKeywords);
          console.log('✅ [ITEM-DETAILS] User-approved keywords saved for learning');
        } catch (keywordError) {
          console.error('❌ [ITEM-DETAILS] Error saving keywords for learning:', keywordError);
        }
      }

      setItem(editedItem);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = (keyword: string) => {
    if (!userKeywords.includes(keyword.toLowerCase())) {
      setUserKeywords([...userKeywords, keyword.toLowerCase()]);
    }
  };

  const removeKeyword = (keyword: string) => {
    setUserKeywords(userKeywords.filter(k => k !== keyword));
  };

  const handleAddKeyword = () => {
    const keyword = newKeyword.trim().toLowerCase();
    if (keyword && !userKeywords.includes(keyword)) {
      setUserKeywords([...userKeywords, keyword]);
      setNewKeyword('');
    }
  };

  const handleKeywordInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleContinue = () => {
    if (itemId) {
      navigate(`/preview/${itemId}`);
    }
  };

  if (loading || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              to="/capture"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </Link>
            
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>{isEditing ? 'Cancel' : 'Edit Details'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative">
                <img
                  src={item.primary_image_url || item.images[0]}
                  alt={item.title}
                  className="main-item-image w-full h-96 object-contain rounded-lg bg-gray-50"
                />
                {item.images.length > 1 && (
                  <div className="image-counter absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
                    1 of {item.images.length}
                  </div>
                )}
              </div>
              
              {/* Additional Images */}
              {item.images.length > 1 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">All Photos ({item.images.length})</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {item.images.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <img
                          src={imageUrl}
                          alt={`${item.title} - Photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            // Update main image when thumbnail is clicked
                            const mainImg = document.querySelector('.main-item-image') as HTMLImageElement;
                            if (mainImg) {
                              mainImg.src = imageUrl;
                              // Update counter
                              const counter = document.querySelector('.image-counter');
                              if (counter) {
                                counter.textContent = `${index + 1} of ${item.images.length}`;
                              }
                            }
                          }}
                        />
                        <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-xs px-1 rounded">
                          {index + 1}
                        </div>
                        {index === 0 && (
                          <div className="absolute top-1 left-1 bg-green-600 text-white text-xs px-1 rounded">
                            Main
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Click any photo to view it larger. First photo was used for AI analysis.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* AI Confidence */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">
                  AI Confidence: {Math.round(item.ai_confidence * 100)}%
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {item.ai_confidence > 0.8 ? 'High confidence - details should be accurate' : 
                 item.ai_confidence > 0.6 ? 'Medium confidence - please review details' :
                 'Lower confidence - please verify all details'}
              </p>
            </div>

            {/* Title */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedItem?.title || ''}
                  onChange={(e) => setEditedItem(prev => prev ? {...prev, title: e.target.value} : null)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
              )}
            </div>

            {/* Price */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <label className="text-sm font-medium text-gray-700">
                  Suggested Price
                </label>
              </div>
              <div className="space-y-3">
                {isEditing ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedItem?.suggested_price || 0}
                      onChange={(e) => setEditedItem(prev => prev ? {...prev, suggested_price: parseFloat(e.target.value)} : null)}
                      className="w-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                    />
                  </div>
                ) : (
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    ${item.suggested_price}
                  </div>
                )}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Market Range:</span> ${item.price_range_min} - ${item.price_range_max}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Based on similar items sold recently
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Category
                  </label>
                </div>
                {isEditing ? (
                  <select
                    value={editedItem?.category || ''}
                    onChange={(e) => setEditedItem(prev => prev ? {...prev, category: e.target.value} : null)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="clothing">Clothing</option>
                    <option value="shoes">Shoes</option>
                    <option value="accessories">Accessories</option>
                    <option value="electronics">Electronics</option>
                    <option value="home_garden">Home & Garden</option>
                    <option value="toys_games">Toys & Games</option>
                    <option value="books_media">Books & Media</option>
                    <option value="jewelry">Jewelry</option>
                    <option value="sports_outdoors">Sports & Outdoors</option>
                    <option value="collectibles">Collectibles</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <span className="font-medium text-gray-900 capitalize">
                    {item.category.replace('_', ' ')}
                  </span>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Package className="w-4 h-4 text-green-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Condition
                  </label>
                </div>
                {isEditing ? (
                  <select
                    value={editedItem?.condition || ''}
                    onChange={(e) => setEditedItem(prev => prev ? {...prev, condition: e.target.value} : null)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="like_new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                ) : (
                  <span className="font-medium text-gray-900 capitalize">
                    {item.condition.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>

            {/* Brand & Size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Award className="w-4 h-4 text-purple-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Brand
                  </label>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedItem?.brand || ''}
                    onChange={(e) => setEditedItem(prev => prev ? {...prev, brand: e.target.value} : null)}
                    placeholder="e.g., Nike, Gap, Apple"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <span className="font-medium text-gray-900">{item.brand || 'Not detected'}</span>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Ruler className="w-4 h-4 text-orange-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Size
                  </label>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedItem?.size || ''}
                    onChange={(e) => setEditedItem(prev => prev ? {...prev, size: e.target.value} : null)}
                    placeholder="e.g., M, 32x34, 8.5"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <span className="font-medium text-gray-900">{item.size || 'Not detected'}</span>
                )}
              </div>
            </div>

            {/* Color */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Palette className="w-4 h-4 text-pink-600" />
                <label className="text-sm font-medium text-gray-700">
                  Color
                </label>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={editedItem?.color || ''}
                  onChange={(e) => setEditedItem(prev => prev ? {...prev, color: e.target.value} : null)}
                  placeholder="e.g., Black, Navy Blue, Red"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  {item.color && (
                    <div 
                      className="w-4 h-4 rounded-full border border-gray-300"
                      style={{ backgroundColor: item.color.toLowerCase() === 'black' ? '#000000' : 
                                                item.color.toLowerCase() === 'white' ? '#ffffff' :
                                                item.color.toLowerCase() === 'red' ? '#dc2626' :
                                                item.color.toLowerCase() === 'blue' ? '#2563eb' :
                                                item.color.toLowerCase() === 'green' ? '#16a34a' :
                                                item.color.toLowerCase() === 'gray' || item.color.toLowerCase() === 'grey' ? '#6b7280' :
                                                item.color.toLowerCase() === 'brown' ? '#92400e' :
                                                item.color.toLowerCase() === 'navy' ? '#1e3a8a' :
                                                '#9ca3af' }}
                    ></div>
                  )}
                  <span className="font-medium text-gray-900">{item.color || 'Not detected'}</span>
                </div>
              )}
            </div>

            {/* Model Number (if detected) */}
            {(item.model_number || isEditing) && (
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Hash className="w-4 h-4 text-indigo-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Model Number
                  </label>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedItem?.model_number || ''}
                    onChange={(e) => setEditedItem(prev => prev ? {...prev, model_number: e.target.value} : null)}
                    placeholder="e.g., iPhone 13, Air Force 1, 501 Jeans"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <span className="font-medium text-gray-900">{item.model_number}</span>
                )}
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={editedItem?.description || ''}
                  onChange={(e) => setEditedItem(prev => prev ? {...prev, description: e.target.value} : null)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-700 leading-relaxed">{item.description}</p>
              )}
            </div>

            {/* Keyword Suggestions Section */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Hash className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  SEO Keywords for eBay Listing
                </h3>
              </div>
              
              {/* AI Suggested Keywords */}
              {suggestedKeywords.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-blue-500" />
                    <span>AI Suggested Keywords:</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {suggestedKeywords.map((keyword, index) => (
                      <button
                        key={index}
                        onClick={() => addKeyword(keyword)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          userKeywords.includes(keyword)
                            ? 'bg-green-100 border border-green-300 text-green-700 cursor-default'
                            : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 cursor-pointer'
                        }`}
                        disabled={userKeywords.includes(keyword)}
                      >
                        {userKeywords.includes(keyword) ? (
                          <>
                            <span className="text-green-600">✓</span> {keyword}
                          </>
                        ) : (
                          <>+ {keyword}</>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* User Selected Keywords */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Selected Keywords ({userKeywords.length}/10):
                </p>
                {userKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {userKeywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-green-100 border border-green-200 rounded-lg text-sm text-green-700 flex items-center space-x-2"
                      >
                        <span>{keyword}</span>
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-200 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mb-3 p-3 bg-gray-50 rounded-lg">
                    No keywords selected yet. Add keywords to improve your listing's visibility.
                  </div>
                )}
              </div>
              
              {/* Add Custom Keywords */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Add Custom Keywords:</p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={handleKeywordInputKeyPress}
                    placeholder="Type keyword and press Enter"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    maxLength={20}
                  />
                  <button
                    onClick={handleAddKeyword}
                    disabled={!newKeyword.trim() || userKeywords.includes(newKeyword.trim().toLowerCase())}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">
                    Keywords help your listing appear in eBay searches and improve AI learning.
                  </p>
                  <p className="text-xs text-blue-600">
                    💡 Try: style descriptors, materials, occasions, target audience
                  </p>
                </div>
              </div>
              
              {/* Keyword Tips */}
              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Keyword Tips:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Use specific terms buyers search for (e.g., "vintage", "retro", "boho")</li>
                  <li>• Include style descriptors (e.g., "casual", "formal", "athletic")</li>
                  <li>• Add occasion keywords (e.g., "work", "party", "vacation")</li>
                  <li>• Consider seasonal terms (e.g., "summer", "winter", "holiday")</li>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
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
                      setEditedItem(item);
                      setUserKeywords(item.ai_suggested_keywords || []);
                      setIsEditing(false);
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={handleContinue}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>Continue to Post Listing</span>
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemDetails;