import React from 'react';
import { Camera, Zap, Target, TrendingUp } from 'lucide-react';

const SolutionSection = () => {
  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            One Photo. Multiple Platforms. Instant Listings.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            EasyFlip uses AI to turn your single photo into optimized listings
            across eBay, Facebook Marketplace, and OfferUp.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left - Benefits */}
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Cut Listing Time by 90%
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  What used to take 3+ hours now takes under 60 seconds. Snap a photo, 
                  confirm the details, and your item is live on all major platforms instantly.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  AI-Powered Perfect Pricing
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Our AI analyzes thousands of completed sales to suggest the optimal price. 
                  No more guesswork - just data-driven pricing that sells fast at top dollar.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Maximize Your Reach & Revenue
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Post to four platforms simultaneously to reach the largest possible audience. 
                  More eyes means faster sales and higher prices for your items.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Professional Listings Every Time
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  AI writes compelling descriptions, optimizes titles for search, and formats 
                  everything perfectly for each platform's requirements.
                </p>
              </div>
            </div>
          </div>
          
          {/* Right - Demo Preview */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl">
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Vintage Polaroid Camera
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">Detected automatically</p>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Suggested Price:</span>
                    <span className="font-bold text-green-600">$89</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Market Range:</span>
                    <span className="text-gray-700">$75 - $120</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Est. Sale Time:</span>
                    <span className="text-gray-700">2-5 days</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-blue-50 p-2 rounded text-center text-sm">
                    <div className="font-medium">eBay</div>
                    <div className="text-green-600 text-xs">✓ Posted</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-center text-sm">
                    <div className="font-medium">Facebook</div>
                    <div className="text-green-600 text-xs">✓ Posted</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-center text-sm">
                    <div className="font-medium">Poshmark</div>
                    <div className="text-green-600 text-xs">✓ Posted</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-center text-sm">
                    <div className="font-medium">OfferUp</div>
                    <div className="text-green-600 text-xs">✓ Posted</div>
                  </div>
                </div>
                
                <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Confirm & Post Everywhere
                </button>
              </div>
            </div>
            
            {/* Success Indicator */}
            <div className="absolute -bottom-4 -right-4 bg-green-500 text-white p-4 rounded-full shadow-lg">
              <div className="text-center">
                <div className="text-lg font-bold">60s</div>
                <div className="text-xs">Total Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
