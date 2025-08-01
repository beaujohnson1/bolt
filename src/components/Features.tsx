import React from 'react';
import { Brain, Target, MessageSquare, BarChart3, Shield, Smartphone } from 'lucide-react';
import { useScrollTracking } from '../hooks/useScrollTracking';

const Features = () => {
  const featuresRef = useScrollTracking('features_section');
  
  const features = [
    {
      icon: Brain,
      title: "Smart Item Recognition",
      description: "AI instantly identifies your items, suggests categories, and highlights selling points that buyers care about most.",
      color: "blue"
    },
    {
      icon: Target,
      title: "Market-Perfect Pricing",
      description: "Analyzes thousands of completed sales to recommend the optimal price that sells fast while maximizing your profit.",
      color: "green"
    },
    {
      icon: MessageSquare,
      title: "Auto-Generated Descriptions", 
      description: "Creates compelling, SEO-optimized listings that highlight key features and benefits for each platform's audience.",
      color: "purple"
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Track views, watchers, and messages across all platforms from one dashboard. Know what's working and what isn't.",
      color: "orange"
    },
    {
      icon: Shield,
      title: "Buyer Communication Assistant",
      description: "AI suggests responses to common buyer questions and helps negotiate the best deals automatically.",
      color: "red"
    },
    {
      icon: Smartphone,
      title: "Cross-Platform Management",
      description: "Manage all your listings from one app. Update prices, respond to messages, and track sales across all platforms.",
      color: "indigo"
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600",
      purple: "bg-purple-100 text-purple-600",
      orange: "bg-orange-100 text-orange-600",
      red: "bg-red-100 text-red-600",
      indigo: "bg-indigo-100 text-indigo-600"
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <section ref={featuresRef} className="bg-white py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Everything You Need to Sell Smarter
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From AI-powered pricing to automated posting, EasyFlip handles every aspect
            of selling so you can focus on what matters most.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="bg-gray-50 p-8 rounded-2xl hover:shadow-lg transition-shadow duration-300">
                <div className={`w-14 h-14 ${getColorClasses(feature.color)} rounded-xl flex items-center justify-center mb-6`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
        
        {/* Feature Highlight */}
        <div className="mt-20 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-2xl max-w-4xl mx-auto">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Starting with eBay - The World's Marketplace
            </h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              eBay's 182 million active buyers worldwide, plus built-in payment processing, 
              shipping labels, and buyer protection. Perfect for your MVP launch.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-500 rounded-xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg">
                  eB
                </div>
                <div className="text-sm font-medium">eBay</div>
                <div className="text-xs text-gray-600">182M active buyers</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg">
                  💳
                </div>
                <div className="text-sm font-medium">Built-in Payments</div>
                <div className="text-xs text-gray-600">Secure processing</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg">
                  📦
                </div>
                <div className="text-sm font-medium">Managed Shipping</div>
                <div className="text-xs text-gray-600">Labels & tracking</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
