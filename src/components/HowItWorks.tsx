import React from 'react';
import { Camera, Zap, DollarSign } from 'lucide-react';

const HowItWorks = () => {
  return (
    <section className="bg-gray-50 py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Sell Anything in 3 Simple Steps
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            No more complex processes. EasyFlip handles everything from pricing to posting.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="relative">
                <div className="w-20 h-20 bg-blue-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Snap a Photo
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Take one photo of your item. Our AI instantly identifies what it is, 
                its condition, and key features that buyers care about.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="relative">
                <div className="w-20 h-20 bg-green-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                AI Does the Work
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Our system researches current market prices, writes compelling descriptions, 
                and creates optimized listings for each platform automatically.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="relative">
                <div className="w-20 h-20 bg-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <DollarSign className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Get Paid Fast
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Your item goes live on eBay, Facebook, and OfferUp simultaneously. 
                Buyers see it, buy it, and you get paid.
              </p>
            </div>
          </div>
          
          {/* Connection Lines */}
          <div className="hidden md:flex justify-center items-center mt-8 space-x-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
          </div>
          
          {/* Time Comparison */}
          <div className="mt-16 bg-white p-8 rounded-2xl shadow-lg">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Traditional Way vs. EasyList.ai
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Photos & research</span>
                    <div className="flex space-x-4">
                      <span className="text-red-600 line-through">75 min</span>
                      <span className="text-green-600 font-bold">30 sec</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Writing listings</span>
                    <div className="flex space-x-4">
                      <span className="text-red-600 line-through">40 min</span>
                      <span className="text-green-600 font-bold">Auto</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Posting to platforms</span>
                    <div className="flex space-x-4">
                      <span className="text-red-600 line-through">35 min</span>
                      <span className="text-green-600 font-bold">30 sec</span>
                    </div>
                  </div>
                  <hr className="my-4" />
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total Time</span>
                    <div className="flex space-x-4">
                      <span className="text-red-600">3+ hours</span>
                      <span className="text-green-600">60 seconds</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">180x</div>
                <div className="text-lg text-gray-600">Faster than manual listing</div>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Time saved per item</div>
                  <div className="text-2xl font-bold text-blue-600">2 hours 59 minutes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
