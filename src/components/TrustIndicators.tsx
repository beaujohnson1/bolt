import React from 'react';
import { Star, Users, TrendingUp } from 'lucide-react';

const TrustIndicators = () => {
  return (
    <section className="bg-white py-12 border-b border-gray-200">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {/* Average Earnings */}
          <div className="flex flex-col items-center">
            <TrendingUp className="w-12 h-12 text-green-600 mb-3" />
            <div className="text-3xl font-bold text-gray-900 mb-2">3+ hours</div>
            <div className="text-gray-600">Time saved per item sold</div>
          </div>
          
          {/* Rating */}
          <div className="flex flex-col items-center">
            <div className="flex space-x-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-current" />
              ))}
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">60 sec</div>
            <div className="text-gray-600">To create listings on 4 platforms</div>
          </div>
          
          {/* Waitlist */}
          <div className="flex flex-col items-center">
            <Users className="w-12 h-12 text-blue-600 mb-3" />
            <div className="text-3xl font-bold text-gray-900 mb-2">Join</div>
            <div className="text-gray-600">The waitlist for early access</div>
          </div>
        </div>
        
        {/* Testimonial Quote */}
        <div className="mt-12 text-center max-w-4xl mx-auto">
          <blockquote className="text-xl text-gray-700 font-medium italic">
            "I sold my kids' outgrown clothes in minutes instead of spending my entire weekend. 
            Made $180 in the first week with EasyFlip!"
          </blockquote>
          <cite className="text-gray-600 mt-3 block">— Sarah M., Mom of 3, Austin TX</cite>
        </div>
      </div>
    </section>
  );
};

export default TrustIndicators;
