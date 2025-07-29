import React from 'react';
import { Check, Zap } from 'lucide-react';

const Pricing = () => {
  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Simple Pricing That Pays for Itself
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the plan that works for you. Both options typically pay for themselves 
            with your first sale through better pricing and faster selling.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <div className="bg-gray-50 p-8 rounded-2xl border-2 border-gray-200 relative">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Monthly Unlimited</h3>
              <div className="text-5xl font-bold text-gray-900 mb-2">
                $9.99
                <span className="text-xl font-normal text-gray-600">/month</span>
              </div>
              <p className="text-gray-600">Perfect for regular sellers</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Unlimited listings across all platforms</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">AI pricing and descriptions</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Real-time analytics dashboard</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Buyer communication assistant</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Priority customer support</span>
              </div>
            </div>
            
            <button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors">
              Start Free Trial
            </button>
            
            <p className="text-center text-sm text-gray-600 mt-4">
              7-day free trial • Cancel anytime
            </p>
          </div>
          
          {/* Commission Plan - Featured */}
          <div className="bg-blue-50 p-8 rounded-2xl border-2 border-blue-300 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Most Popular</span>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Pay Per Sale</h3>
              <div className="text-5xl font-bold text-blue-600 mb-2">
                5%
                <span className="text-xl font-normal text-gray-600"> commission</span>
              </div>
              <p className="text-gray-600">Only pay when you sell</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Unlimited listings across all platforms</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">AI pricing and descriptions</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Real-time analytics dashboard</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Buyer communication assistant</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Priority customer support</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-blue-600 font-bold" />
                <span className="text-gray-700 font-medium">Pay only when you sell</span>
              </div>
            </div>
            
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors">
              Start Selling Now
            </button>
            
            <p className="text-center text-sm text-gray-600 mt-4">
              No upfront costs • First sale is free
            </p>
          </div>
        </div>
        
        {/* Comparison Note */}
        <div className="mt-12 text-center max-w-3xl mx-auto">
          <div className="bg-green-50 p-6 rounded-xl">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Smart Tip</h4>
            <p className="text-gray-700">
              If you sell more than $200/month, the unlimited plan saves you money. 
              For occasional sellers, the 5% commission works best. You can switch plans anytime!
            </p>
          </div>
        </div>
        
        {/* ROI Calculator */}
        <div className="mt-16 bg-gray-50 p-8 rounded-2xl max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            See How Much You'll Save
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-2">Traditional Selling</div>
              <div className="text-3xl font-bold text-red-600 mb-4">3+ hours</div>
              <div className="text-sm text-gray-600">per item × $25/hour = $75 in time</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-2">EasyList.ai</div>
              <div className="text-3xl font-bold text-green-600 mb-4">60 seconds</div>
              <div className="text-sm text-gray-600">+ $9.99/month or 5% fee</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-2">Your Savings</div>
              <div className="text-3xl font-bold text-blue-600 mb-4">$65+</div>
              <div className="text-sm text-gray-600">per item in time value</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
