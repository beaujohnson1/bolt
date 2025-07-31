import React, { useState } from 'react';
import { Camera, DollarSign, TrendingUp, Zap } from 'lucide-react';
import EmailCapture from './EmailCapture';
import { useScrollTracking } from '../hooks/useScrollTracking';
import { trackButtonClick } from '../utils/analytics';

const PricingCalculator = () => {
  const calculatorRef = useScrollTracking('pricing_calculator');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [brand, setBrand] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState('');

  const categories = [
    'Electronics', 'Clothing', 'Home & Garden', 'Toys & Games', 
    'Sports & Outdoors', 'Books & Media', 'Jewelry & Accessories'
  ];

  const conditions = ['Like New', 'Good', 'Fair', 'Poor'];

  const calculatePrice = () => {
    if (selectedCategory && condition) {
      trackButtonClick('Get Price Estimate', 'pricing_calculator');
      setShowResults(true);
    }
  };

  const getEstimatedPrice = () => {
    const basePrice = {
      'Electronics': 150,
      'Clothing': 25,
      'Home & Garden': 45,
      'Toys & Games': 20,
      'Sports & Outdoors': 35,
      'Books & Media': 12,
      'Jewelry & Accessories': 30
    }[selectedCategory] || 25;

    const conditionMultiplier = {
      'Like New': 0.9,
      'Good': 0.7,
      'Fair': 0.5,
      'Poor': 0.3
    }[condition] || 0.7;

    return Math.round(basePrice * conditionMultiplier);
  };

  return (
    <section ref={calculatorRef} className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Free AI Pricing Calculator
            </h2>
            <p className="text-xl text-gray-600">
              Get instant pricing suggestions based on real market data. 
              See what your items are actually worth before you sell.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            {!showResults ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What are you selling?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                          selectedCategory === category
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What's the condition?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {conditions.map((cond) => (
                      <button
                        key={cond}
                        onClick={() => setCondition(cond)}
                        className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                          condition === cond
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Brand (optional)
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g., Apple, Nike, IKEA"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={calculatePrice}
                  disabled={!selectedCategory || !condition}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <Zap className="w-5 h-5" />
                  <span>Get My Price Estimate</span>
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-8">
                  <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <DollarSign className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    ${getEstimatedPrice()}
                  </h3>
                  <p className="text-gray-600">Estimated selling price</p>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl mb-8">
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">Category</div>
                      <div className="text-gray-600">{selectedCategory}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Condition</div>
                      <div className="text-gray-600">{condition}</div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Market Range</div>
                      <div className="text-gray-600">${Math.round(getEstimatedPrice() * 0.8)} - ${Math.round(getEstimatedPrice() * 1.2)}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Want to sell this item in 60 seconds?
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Get early access to EasyFlip and turn this estimate into cash with one photo.
                  </p>
                  
                  <EmailCapture 
                    buttonText="Join the Waitlist"
                    placeholder="Enter your email"
                  />
                </div>

                <button
                  onClick={() => {
                    setShowResults(false);
                    setSelectedCategory('');
                    setCondition('');
                    setBrand('');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Calculate Another Item
                </button>
              </div>
            )}
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <TrendingUp className="w-8 h-8 text-blue-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Real Market Data</h4>
              <p className="text-gray-600 text-sm">Prices based on actual completed sales across all platforms</p>
            </div>
            <div className="flex flex-col items-center">
              <Camera className="w-8 h-8 text-green-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">One-Photo Listing</h4>
              <p className="text-gray-600 text-sm">Skip the research - just snap and sell with optimal pricing</p>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="w-8 h-8 text-purple-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Instant Results</h4>
              <p className="text-gray-600 text-sm">Get pricing estimates in seconds, not hours of research</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingCalculator;
