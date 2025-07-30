import React from 'react';
import { Camera, Clock, DollarSign } from 'lucide-react';
import EmailCapture from './EmailCapture';
import GoogleSignIn from './GoogleSignIn';

const Hero = () => {
  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center pt-20">
      <div className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Turn Your Clutter Into Cash in
              <span className="text-blue-600"> Under 60 Seconds</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Stop wasting 3+ hours per item. One photo automatically creates optimized listings
              on eBay, Facebook Marketplace, OfferUp, and Poshmark simultaneously.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center lg:justify-start">
              <div className="flex-1 space-y-3">
                <GoogleSignIn 
                  buttonText="Get Early Access with Google"
                  size="lg"
                />
                <div className="text-center text-gray-500 text-sm">or</div>
                <EmailCapture 
                  buttonText="Get Early Access - Free"
                  placeholder="Enter email for early access"
                  size="lg"
                />
              </div>
              <button className="border-2 border-gray-300 hover:border-blue-600 text-gray-700 hover:text-blue-600 font-semibold py-4 px-8 rounded-xl text-lg transition-all duration-300">
                Watch Demo (2 min)
              </button>
            </div>
            
            {/* Social Proof Strip */}
            <div className="flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white"></div>
                  <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white"></div>
                  <div className="w-8 h-8 bg-purple-500 rounded-full border-2 border-white"></div>
                </div>
                <span className="font-medium">2,847+ sellers already earning</span>
              </div>
            </div>
          </div>
          
          {/* Right Content - Phone Mockup */}
          <div className="relative">
            <div className="relative mx-auto w-80 h-96 bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800">
              {/* Phone Screen */}
              <div className="bg-gradient-to-b from-blue-500 to-blue-600 h-full p-6 text-white">
                <div className="text-center mb-6">
                  <Camera className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold">Just Snap a Photo</h3>
                </div>
                
                <div className="bg-white/20 backdrop-blur rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Vintage Camera</span>
                    <span className="font-bold">$89</span>
                  </div>
                  <div className="text-xs opacity-80 mt-1">Posted to 4 platforms</div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-800/30 rounded p-2 text-center">eBay ✓</div>
                  <div className="bg-blue-800/30 rounded p-2 text-center">Facebook ✓</div>
                  <div className="bg-blue-800/30 rounded p-2 text-center">Poshmark ✓</div>
                  <div className="bg-blue-800/30 rounded p-2 text-center">OfferUp ✓</div>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-green-500 text-white p-3 rounded-full shadow-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-orange-500 text-white p-3 rounded-full shadow-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
