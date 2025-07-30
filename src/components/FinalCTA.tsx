import React from 'react';
import { Clock, Shield, Zap, ArrowRight } from 'lucide-react';
import EmailCapture from './EmailCapture';
import GoogleSignIn from './GoogleSignIn';

const FinalCTA = () => {
  return (
    <section className="bg-gradient-to-br from-blue-600 to-indigo-700 py-20">
      <div className="container mx-auto px-6 text-center text-white">
        <div className="max-w-4xl mx-auto">
          {/* Urgency Headline */}
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Stop Wasting Time. Start Earning Today.
          </h2>
          
          <p className="text-xl mb-8 opacity-90 max-w-3xl mx-auto">
            Every day you wait is money left on the table. Join others who are ready to 
            transform their clutter into cash with EasyFlip.
          </p>
          
          {/* Key Benefits */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="flex items-center justify-center space-x-3">
              <Clock className="w-6 h-6 text-blue-200" />
              <span className="font-medium">60-second listings</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Zap className="w-6 h-6 text-blue-200" />
              <span className="font-medium">4 platforms simultaneously</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Shield className="w-6 h-6 text-blue-200" />
              <span className="font-medium">7-day free trial</span>
            </div>
          </div>
          
          {/* Primary CTA */}
          <div className="space-y-4 mb-8">
            <div className="max-w-lg mx-auto space-y-3">
              <GoogleSignIn 
                buttonText="Join Waitlist with Google"
                size="lg"
              />
              <div className="text-center text-blue-200 text-sm">or</div>
              <EmailCapture 
                buttonText="Join the Waitlist"
                placeholder="Enter your email for early access"
                size="lg"
              />
            </div>
            
            <div className="text-blue-200 text-sm">
              Be first to know when we launch • No spam • Exclusive early access
            </div>
          </div>
          
          {/* Risk Reversal */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-8">
            <h3 className="text-2xl font-bold mb-4">Our 30-Day Money-Back Guarantee</h3>
            <p className="text-blue-100 leading-relaxed">
              Try EasyFlip risk-free for 30 days. If you don't sell at least one item
              or aren't completely satisfied with how much time you save, we'll refund every penny. 
              No questions asked.
            </p>
          </div>
          
          {/* Secondary CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-3 px-6 rounded-lg transition-colors">
              Watch 2-Minute Demo
            </button>
            <button className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold py-3 px-6 rounded-lg transition-colors">
              See Pricing Plans
            </button>
          </div>
          
          {/* Social Proof */}
          <div className="mt-12 pt-8 border-t border-blue-400">
            <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
              <div className="flex items-center space-x-3">
                <div className="flex -space-x-2">
                  <div className="w-10 h-10 bg-white rounded-full border-2 border-blue-600"></div>
                  <div className="w-10 h-10 bg-white rounded-full border-2 border-blue-600"></div>
                  <div className="w-10 h-10 bg-white rounded-full border-2 border-blue-600"></div>
                </div>
                <span className="text-blue-100">Join the waitlist today</span>
              </div>
              
              <div className="text-blue-100">
                Be first to know when EasyFlip launches
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
