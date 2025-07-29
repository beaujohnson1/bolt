import React from 'react';
import { Clock, Construction as Frustration, DollarSign, Smartphone } from 'lucide-react';

const ProblemSection = () => {
  return (
    <section className="bg-gray-50 py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Selling Your Stuff Shouldn't Be a Part-Time Job
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            The average person spends 3+ hours per item just to make a single sale. 
            Meanwhile, that vintage camera sits in your closet losing value every day.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left - Pain Points */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Hours of Manual Work</h3>
                <p className="text-gray-600">
                  Taking photos, writing descriptions, researching prices, posting on multiple platforms, 
                  and managing inquiries across different apps.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Pricing Guesswork</h3>
                <p className="text-gray-600">
                  Either price too high and items don't sell, or price too low and leave money on the table. 
                  No idea what similar items actually sold for.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md">
              <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Platform Juggling</h3>
                <p className="text-gray-600">
                  Managing separate apps for eBay, Facebook, Poshmark, and OfferUp. Different formats, 
                  rules, and audiences for each platform.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md">
              <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Frustration className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Overwhelming Process</h3>
                <p className="text-gray-600">
                  So much work that most items never get listed. Your valuable stuff stays cluttered 
                  in closets, losing value while taking up space.
                </p>
              </div>
            </div>
          </div>
          
          {/* Right - Visual Illustration */}
          <div className="flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Clock className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">3.2 Hours</h3>
                <p className="text-gray-600 mb-6">Average time to sell one item the traditional way</p>
                
                <div className="space-y-3 text-left">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taking photos</span>
                    <span className="text-gray-900 font-medium">45 min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Research & pricing</span>
                    <span className="text-gray-900 font-medium">30 min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Writing listings</span>
                    <span className="text-gray-900 font-medium">40 min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Posting to platforms</span>
                    <span className="text-gray-900 font-medium">35 min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Managing inquiries</span>
                    <span className="text-gray-900 font-medium">50 min</span>
                  </div>
                  <hr className="my-3" />
                  <div className="flex justify-between font-bold">
                    <span>Total Time</span>
                    <span className="text-red-600">3.2 hours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
