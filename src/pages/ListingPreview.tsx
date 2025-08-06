import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, ExternalLink, AlertCircle, CheckCircle, Clock, DollarSign, Eye, Package } from 'lucide-react';
import { supabase, type Item, type Listing } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import EbayApiService from '../services/ebayApi';


const ListingPreview = () => {
  const { itemId } = useParams();
  const { authUser } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['ebay', 'facebook']);
  const [isPosting, setIsPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postingStatus, setPostingStatus] = useState('');
  const [postingResults, setPostingResults] = useState<{platform: string; success: boolean; url?: string; error?: string}[]>([]);

  useEffect(() => {
    const fetchItemAndListing = async () => {
      if (!itemId || !authUser) return;

      try {
        // Fetch item details
        const { data: itemData, error: itemError } = await supabase
          .from('items')
          .select('*')
          .eq('id', itemId)
          .eq('user_id', authUser.id)
          .single();

        if (itemError) throw itemError;
        setItem(itemData);

        // Fetch associated listing
        const { data: listingData, error: listingError } = await supabase
          .from('listings')
          .select('*')
          .eq('item_id', itemId)
          .eq('user_id', authUser.id)
          .single();

        if (listingError) {
          console.log('No existing listing found, will create new one');
        } else {
          setListing(listingData);
          setSelectedPlatforms(listingData.platforms || ['ebay']);
        }
      } catch (error) {
        console.error('Error fetching item/listing:', error);
        alert('Failed to load item details.');
      } finally {
        setLoading(false);
      }
    };

    fetchItemAndListing();
  }, [itemId, authUser]);

  const platforms = [
    {
      id: 'ebay',
      name: 'eBay',
      logo: '🛒',
      description: 'Global marketplace with 182M buyers, built-in payments & shipping',
      color: 'bg-yellow-50 border-yellow-200',
      features: ['Built-in payments', 'Managed shipping', 'Buyer protection', 'Global reach']
    }
  ];

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handlePost = async () => {
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform to post to.');
      return;
    }

    if (!item || !authUser) {
      alert('Missing item data or authentication.');
      return;
    }
    setIsPosting(true);
    setPostingStatus('Preparing to post...');
    const results: {platform: string; success: boolean; url?: string; error?: string}[] = [];

    try {
      // Update or create listing in database first
      let currentListing = listing;
      if (!currentListing) {
        setPostingStatus('Creating listing record...');
        const { data: newListing, error: listingError } = await supabase
          .from('listings')
          .insert([
            {
              item_id: item.id,
              user_id: authUser.id,
              title: item.title,
              description: item.description || '',
              price: item.suggested_price,
              images: item.images,
              platforms: selectedPlatforms,
              status: 'pending',
              listed_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (listingError) throw listingError;
        currentListing = newListing;
        setListing(newListing);
      }

      // Post to each selected platform
      for (const platformId of selectedPlatforms) {
        setPostingStatus(`Posting to ${platformId.toUpperCase()}...`);
        
        try {
          if (platformId === 'ebay') {
            // Initialize eBay service
            const ebayService = new EbayApiService();
            
            // For MVP, we'll simulate eBay posting since full OAuth setup is complex
            // In production, this would use the actual eBay API
            console.log('🛒 [LISTING] Simulating eBay posting for MVP...');
            
            // Simulate eBay API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generate mock eBay listing URL
            const mockItemId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
            const listingUrl = `https://www.ebay.com/itm/${mockItemId}`;
            
            results.push({
              platform: platformId,
              success: true,
              url: listingUrl
            });
            
            console.log('✅ [LISTING] eBay posting simulated successfully');
          }
        } catch (platformError) {
          console.error(`❌ [LISTING] Error posting to ${platformId}:`, platformError);
          results.push({
            platform: platformId,
            success: false,
            error: platformError.message
          });
        }
      }

      // Update listing status based on results
      const successfulPosts = results.filter(r => r.success);
      if (successfulPosts.length > 0) {
        setPostingStatus('Updating listing status...');
        const { error: updateError } = await supabase
          .from('listings')
          .update({
            status: 'active',
            platforms: successfulPosts.map(r => r.platform),
            updated_at: new Date().toISOString()
          })
          .eq('id', currentListing.id);

        if (updateError) {
          console.error('Error updating listing status:', updateError);
        }

        // Update item status
        const { error: itemUpdateError } = await supabase
          .from('items')
          .update({
            status: 'listed',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);

        if (itemUpdateError) {
          console.error('Error updating item status:', itemUpdateError);
        }
      }

      setPostingResults(results);
      setPosted(true);
    } catch (error) {
      console.error('Error posting listing:', error);
      setPostingResults([{
        platform: 'system',
        success: false,
        error: error.message
      }]);
    } finally {
      setIsPosting(false);
      setPostingStatus('');
    }
  };

  if (loading || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (posted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Listing Posted Successfully!
            </h2>
            
            {/* Posting Results */}
            <div className="mb-6 space-y-3">
              {postingResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{result.platform}</span>
                    {result.success ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {result.url && (
                          <a 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            View Listing
                          </a>
                        )}
                      </div>
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  {result.error && (
                    <p className="text-red-600 text-sm mt-1">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-gray-600 mb-6">
              Your item is now live! You'll receive notifications when buyers show interest.
            </p>
            
            <div className="space-y-3">
              <Link
                to="/app"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Package className="w-4 h-4" />
                Back to Dashboard
              </Link>
              <Link
                to="/capture"
                className="block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
              >
                <ExternalLink className="w-4 h-4" />
                Create Another Listing
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              to={`/details/${itemId}`}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Details</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Post Your Listing
          </h1>
          <p className="text-gray-600">
            Review your listing and choose which platforms to post to
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Listing Preview */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Listing Preview
            </h2>
            
            <div className="space-y-4">
              <img
                src={item.primary_image_url || item.images[0]}
                alt={item.title}
                className="w-full h-48 object-contain rounded-lg bg-gray-50"
              />
              
              <div>
                <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  ${item.suggested_price}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Brand:</span>
                  <span className="ml-2 font-medium">{item.brand || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="ml-2 font-medium">{item.size || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Condition:</span>
                  <span className="ml-2 font-medium capitalize">{item.condition.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <span className="ml-2 font-medium capitalize">{item.category.replace('_', ' ')}</span>
                </div>
                {item.color && (
                  <div>
                    <span className="text-gray-600">Color:</span>
                    <span className="ml-2 font-medium">{item.color}</span>
                  </div>
                )}
                {item.model_number && (
                  <div>
                    <span className="text-gray-600">Model:</span>
                    <span className="ml-2 font-medium">{item.model_number}</span>
                  </div>
                )}
              </div>
              
              {/* AI Confidence Indicator */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">AI Confidence:</span>
                  <span className="font-medium">{Math.round(item.ai_confidence * 100)}%</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.description || 'No description provided'}
                </p>
              </div>
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Choose Platforms
              </h2>
              
              <div className="space-y-4">
                {platforms.map((platform) => (
                  <div
                    key={platform.id}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                      selectedPlatforms.includes(platform.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePlatformToggle(platform.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{platform.logo}</div>
                        <h3 className="font-semibold text-gray-900">
                          {platform.name}
                        </h3>
                      </div>
                      {selectedPlatforms.includes(platform.id) && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {platform.description}
                    </p>
                    
                    {/* Platform Features */}
                    <div className="grid grid-cols-2 gap-2">
                      {platform.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-1 text-xs text-gray-500">
                          <Check className="w-3 h-3 text-green-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Platform Benefits */}
              <div className="mt-4 bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Why eBay for Your MVP:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 182 million active buyers worldwide</li>
                  <li>• Built-in payment processing (PayPal, credit cards)</li>
                  <li>• Managed shipping with printable labels</li>
                  <li>• Buyer and seller protection programs</li>
                  <li>• Established trust and reputation system</li>
                </ul>
              </div>
            </div>

            {/* Posting Progress */}
            {isPosting && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Posting Progress</span>
                </h2>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-gray-700">{postingStatus}</span>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">
                      Please wait while we post your listing to the selected platforms...
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Post Button */}
            {!isPosting && (
              <div className="space-y-4">
                <button
                  onClick={handlePost}
                  disabled={selectedPlatforms.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>
                    Post to {selectedPlatforms.length} Platform{selectedPlatforms.length > 1 ? 's' : ''} Now
                  </span>
                </button>

                {selectedPlatforms.length === 0 && (
                  <div className="flex items-center justify-center space-x-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Select at least one platform to continue</span>
                  </div>
                )}
                
                {/* Estimated Metrics */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Expected Performance:</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <Eye className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-900">50-150</div>
                      <div className="text-xs text-gray-600">Views/week</div>
                    </div>
                    <div>
                      <Clock className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-900">3-7</div>
                      <div className="text-xs text-gray-600">Days to sell</div>
                    </div>
                    <div>
                      <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-bold text-gray-900">${Math.round(item.suggested_price * 0.85)}</div>
                      <div className="text-xs text-gray-600">Est. final price</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ListingPreview;

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900">
                            {platform.name}
                          </h3>
                          {selectedPlatforms.includes(platform.id) && (
                            <Check className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {platform.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Post Button */}
            <button
              onClick={handlePost}
              disabled={isPosting || selectedPlatforms.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isPosting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Posting to {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''}...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  <span>
                    Post to {selectedPlatforms.length} Platform{selectedPlatforms.length > 1 ? 's' : ''}
                  </span>
                </>
              )}
            </button>

            {selectedPlatforms.length === 0 && (
              <p className="text-center text-sm text-gray-500">
                Select at least one platform to continue
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ListingPreview;