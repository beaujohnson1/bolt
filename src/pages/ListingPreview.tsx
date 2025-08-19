import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, ExternalLink, Zap, Package, Eye, Target } from 'lucide-react';
import { getSupabase, type Item, type Listing } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import EbayApiService from '../services/ebayApi';
import ebayOAuth from '../services/ebayOAuth';
import EbayAuthButton from '../components/EbayAuthButton';
import MockEbayAuth from '../components/MockEbayAuth';
import ManualEbayAuth from '../components/ManualEbayAuth';


const ListingPreview = () => {
  const { itemId } = useParams();
  const { authUser } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['ebay', 'facebook']);
  const [isPosting, setIsPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [listingUrls, setListingUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isEbayAuthenticated, setIsEbayAuthenticated] = useState(false);

  useEffect(() => {
    // Check eBay authentication status
    const initialAuthStatus = ebayOAuth.isAuthenticated();
    setIsEbayAuthenticated(initialAuthStatus);
    console.log('🔍 [LISTING-PREVIEW] Initial eBay auth status:', initialAuthStatus);
    
    // Check URL parameters for successful authentication
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ebay_connected') === 'true') {
      console.log('🎉 [LISTING-PREVIEW] Detected successful eBay connection from URL');
      // Force refresh auth status after a brief delay
      setTimeout(() => {
        const newAuthStatus = ebayOAuth.refreshAuthStatus();
        console.log('🔄 [LISTING-PREVIEW] Refreshed auth status:', newAuthStatus);
        setIsEbayAuthenticated(newAuthStatus);
      }, 100);
    }
    
    // Watch for authentication changes
    const unwatch = ebayOAuth.watchForTokenChanges((authenticated) => {
      console.log('🔄 [LISTING-PREVIEW] eBay auth status changed:', authenticated);
      setIsEbayAuthenticated(authenticated);
    });
    
    const fetchItemAndListing = async () => {
      if (!itemId || !authUser) return;
      
      const supabase = getSupabase();
      if (!supabase) {
        alert('Database connection not available. Please check your configuration.');
        setLoading(false);
        return;
      }

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
          if (listingData.status === 'active') {
            setPosted(true);
          }
        }
      } catch (error) {
        console.error('Error fetching item/listing:', error);
        alert('Failed to load item details.');
      } finally {
        setLoading(false);
      }
    };

    fetchItemAndListing();
    
    // Cleanup watcher
    return () => {
      if (typeof unwatch === 'function') {
        unwatch();
      }
    };
  }, [itemId, authUser]);

  const platforms = [
    {
      id: 'ebay',
      name: 'eBay',
      logo: '🛒',
      description: 'Global marketplace with built-in shipping & payment processing',
      color: 'bg-yellow-50 border-yellow-200',
      features: ['182M active buyers', 'Built-in payments', 'Managed shipping', 'Buyer protection']
    },
    {
      id: 'facebook',
      name: 'Facebook Marketplace',
      logo: '📘',
      description: 'Local marketplace with massive reach',
      color: 'bg-blue-50 border-blue-200',
      features: ['Local buyers', 'No fees', 'Facebook integration', 'Coming soon'],
      disabled: true
    },
    {
      id: 'poshmark',
      name: 'Poshmark',
      logo: '👗',
      description: 'Fashion-focused marketplace',
      color: 'bg-pink-50 border-pink-200',
      features: ['Fashion focus', 'Social features', 'Prepaid shipping', 'Coming soon'],
      disabled: true
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

    try {
      console.log('📝 [LISTING-PREVIEW] Starting platform posting...', {
        platforms: selectedPlatforms,
        itemId: item.id,
        title: item.title
      });

      const urls: Record<string, string> = {};
      const platformResults: Record<string, { success: boolean; error?: string; url?: string }> = {};

      // Post to each selected platform
      for (const platformId of selectedPlatforms) {
        if (platformId === 'ebay') {
          console.log('📝 [LISTING-PREVIEW] Posting to eBay...');
          try {
            const ebayService = new EbayApiService();
            const ebayListing = await ebayService.createListingFromItem(item);
            
            // Check if this is actually a mock/demo listing
            if (ebayListing.listingId.includes('MOCK_') || ebayListing.listingId.includes('demo_')) {
              console.warn('⚠️ [LISTING-PREVIEW] eBay returned MOCK listing - not a real eBay listing!');
              platformResults.ebay = { 
                success: false, 
                error: 'eBay authentication required - listing was not posted to real eBay' 
              };
            } else {
              urls.ebay = ebayListing.listingUrl;
              platformResults.ebay = { success: true, url: ebayListing.listingUrl };
              console.log('✅ [LISTING-PREVIEW] Real eBay listing created:', ebayListing.listingUrl);
            }
          } catch (ebayError) {
            console.error('❌ [LISTING-PREVIEW] eBay listing failed:', ebayError);
            platformResults.ebay = { 
              success: false, 
              error: ebayError.message || 'eBay listing creation failed' 
            };
          }
        }
        // Add other platforms here as they're implemented
      }

      // Check if any platforms actually succeeded
      const successfulPlatforms = Object.entries(platformResults).filter(([_, result]) => result.success);
      const failedPlatforms = Object.entries(platformResults).filter(([_, result]) => !result.success);

      console.log('📊 [LISTING-PREVIEW] Platform results:', {
        successful: successfulPlatforms.length,
        failed: failedPlatforms.length,
        details: platformResults
      });

      // If all platforms failed, throw an error instead of showing false success
      if (successfulPlatforms.length === 0 && failedPlatforms.length > 0) {
        const errorMessages = failedPlatforms.map(([platform, result]) => 
          `${platform}: ${result.error}`
        ).join(', ');
        throw new Error(`All platform listings failed: ${errorMessages}`);
      }

      // If some platforms failed, show a warning but continue
      if (failedPlatforms.length > 0) {
        const failedPlatformNames = failedPlatforms.map(([platform]) => platform).join(', ');
        console.warn(`⚠️ [LISTING-PREVIEW] Some platforms failed: ${failedPlatformNames}`);
        alert(`Warning: Listing failed on ${failedPlatformNames}. Check your authentication and try again.`);
      }

      // Update or create listing in database
      console.log('💾 [LISTING-PREVIEW] Updating database with listing result...');
      console.log('💾 [LISTING-PREVIEW] authUser:', { id: authUser.id, email: authUser.email });
      console.log('💾 [LISTING-PREVIEW] item:', { id: item.id, title: item.title });
      console.log('💾 [LISTING-PREVIEW] selectedPlatforms:', selectedPlatforms);
      
      if (listing) {
        // Update existing listing
        const supabase = getSupabase();
        if (!supabase) {
          console.error('❌ [LISTING-PREVIEW] Database connection not available');
          throw new Error('Database connection not available');
        }
        
        console.log('🔄 [LISTING-PREVIEW] Updating existing listing:', listing.id);
        const { data: updateData, error: updateError } = await supabase
          .from('listings')
          .update({
            status: 'active',
            platforms: selectedPlatforms,
            listed_at: new Date().toISOString()
          })
          .eq('id', listing.id)
          .eq('user_id', authUser.id); // Add user_id filter for RLS

        console.log('🔄 [LISTING-PREVIEW] Update result:', { data: updateData, error: updateError });
        if (updateError) {
          console.error('❌ [LISTING-PREVIEW] Database update error:', updateError);
          throw updateError;
        }
      } else {
        // Create new listing
        const supabase = getSupabase();
        if (!supabase) {
          console.error('❌ [LISTING-PREVIEW] Database connection not available');
          throw new Error('Database connection not available');
        }
        
        const listingData = {
          item_id: item.id,
          user_id: authUser.id,
          title: item.title,
          description: item.description || '',
          price: item.suggested_price,
          images: item.images,
          platforms: selectedPlatforms,
          status: 'active',
          listed_at: new Date().toISOString()
        };
        
        console.log('📝 [LISTING-PREVIEW] Creating new listing with data:', listingData);
        const { data: createData, error: createError } = await supabase
          .from('listings')
          .insert([listingData])
          .select(); // Add select to get the created record

        console.log('📝 [LISTING-PREVIEW] Create result:', { data: createData, error: createError });
        if (createError) {
          console.error('❌ [LISTING-PREVIEW] Database create error:', createError);
          throw createError;
        }
      }

      setListingUrls(urls);
      setPosted(true);
      console.log('✅ [LISTING-PREVIEW] All platforms posted successfully');
    } catch (error) {
      console.error('Error posting listing:', error);
      alert(`Failed to post listing: ${error.message}. Please try again.`);
    } finally {
      setIsPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Item not found</h2>
          <Link to="/app" className="text-blue-600 hover:text-blue-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (posted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Listing Posted Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your item has been posted to {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''}. 
              You'll receive notifications when buyers show interest.
            </p>
            
            {/* Platform Links */}
            {Object.entries(listingUrls).length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-gray-900">View Your Listings:</h3>
                {Object.entries(listingUrls).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View on {platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                  </a>
                ))}
              </div>
            )}
            
            <div className="space-y-3">
              <Link
                to="/app"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                Back to Dashboard
              </Link>
              <Link
                to="/capture"
                className="block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
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
                  <span className="ml-2 font-medium">{item.condition.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <span className="ml-2 font-medium">{item.category.replace('_', ' ')}</span>
                </div>
              </div>
              
              {/* Keywords Preview */}
              {item.ai_suggested_keywords && item.ai_suggested_keywords.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">SEO Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {item.ai_suggested_keywords.slice(0, 8).map((keyword, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.description}
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
                    className={`border-2 rounded-xl p-4 transition-colors ${
                      platform.disabled 
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
                        : selectedPlatforms.includes(platform.id)
                        ? 'border-blue-500 bg-blue-50 cursor-pointer'
                        : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                    onClick={() => !platform.disabled && handlePlatformToggle(platform.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{platform.logo}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {platform.name}
                          </h3>
                          {platform.disabled && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
                              Coming Soon
                            </span>
                          )}
                          {selectedPlatforms.includes(platform.id) && !platform.disabled && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{platform.description}</p>
                        
                        {/* Platform Features */}
                        <div className="grid grid-cols-2 gap-2">
                          {platform.features.map((feature, index) => (
                            <div key={index} className="flex items-center space-x-1 text-xs text-gray-600">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Posting Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Ready to Post
              </h2>
              
              <div className="space-y-4">
                {/* eBay Authentication Check */}
                {selectedPlatforms.includes('ebay') && !isEbayAuthenticated && (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-900 mb-2">🔐 eBay Account Connection Required</h4>
                      <p className="text-sm text-yellow-800 mb-3">
                        To post listings to eBay, you need to connect your eBay account first.
                      </p>
                      <EbayAuthButton 
                        onAuthSuccess={() => setIsEbayAuthenticated(true)}
                        className="w-full"
                      />
                    </div>
                    
                    <MockEbayAuth />
                    
                    <ManualEbayAuth onAuthSuccess={() => setIsEbayAuthenticated(true)} />
                  </div>
                )}
                
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">🚀 What happens when you post:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Your listing goes live immediately on selected platforms</li>
                    <li>• Optimized title and keywords for maximum visibility</li>
                    <li>• Professional description with key features highlighted</li>
                    <li>• Competitive pricing based on market analysis</li>
                    <li>• You'll get direct links to manage your listings</li>
                  </ul>
                </div>
                
                <button
                  onClick={handlePost}
                  disabled={isPosting || selectedPlatforms.length === 0 || (selectedPlatforms.includes('ebay') && !isEbayAuthenticated)}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  {isPosting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Posting to {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''}...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Post to {selectedPlatforms.length} Platform{selectedPlatforms.length > 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
                
                {selectedPlatforms.length === 0 && (
                  <p className="text-red-600 text-sm text-center">
                    Please select at least one platform to continue
                  </p>
                )}
                
                {selectedPlatforms.includes('ebay') && !isEbayAuthenticated && (
                  <p className="text-yellow-600 text-sm text-center">
                    Please connect your eBay account before posting
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ListingPreview;