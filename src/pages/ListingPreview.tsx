import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, ExternalLink } from 'lucide-react';

interface ItemData {
  id: string;
  image: string;
  title: string;
  category: string;
  condition: string;
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  description: string;
  brand: string;
  size: string;
  confidence: number;
}

const ListingPreview = () => {
  const { itemId } = useParams();
  const [item, setItem] = useState<ItemData | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['ebay', 'facebook']);
  const [isPosting, setIsPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    if (itemId) {
      const savedItem = localStorage.getItem(`item_${itemId}`);
      if (savedItem) {
        setItem(JSON.parse(savedItem));
      }
    }
  }, [itemId]);

  const platforms = [
    {
      id: 'ebay',
      name: 'eBay',
      logo: '🛒',
      description: 'Global marketplace with built-in shipping & payment processing',
      color: 'bg-yellow-50 border-yellow-200'
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

    setIsPosting(true);

    try {
      // Simulate posting to platforms
      await new Promise(resolve => setTimeout(resolve, 3000));
      setPosted(true);
    } catch (error) {
      console.error('Error posting listing:', error);
      alert('Failed to post listing. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  if (!item) {
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
                src={item.image}
                alt={item.title}
                className="w-full h-48 object-contain rounded-lg bg-gray-50"
              />
              
              <div>
                <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                <div className="text-2xl font-bold text-green-600 mt-2">
                  ${item.suggestedPrice}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Brand:</span>
                  <span className="ml-2 font-medium">{item.brand}</span>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <span className="ml-2 font-medium">{item.size}</span>
                </div>
                <div>
                  <span className="text-gray-600">Condition:</span>
                  <span className="ml-2 font-medium">{item.condition}</span>
                </div>
                <div>
                  <span className="text-gray-600">Category:</span>
                  <span className="ml-2 font-medium">{item.category}</span>
                </div>
              </div>
              
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
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                      selectedPlatforms.includes(platform.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePlatformToggle(platform.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">{platform.logo}</div>
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