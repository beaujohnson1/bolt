import React, { useState } from 'react';
import { Check, Shield, Users, Award } from 'lucide-react';

const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const pricingPlans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      yearlyPrice: 290,
      listings: '100',
      description: 'Perfect for beginners getting started',
      features: [
        'Up to 100 listings per month',
        'AI photo recognition & pricing',
        'Basic eBay integration',
        'Voice AI coach (30 min/month)',
        'Email support',
        'Mobile app access'
      ],
      buttonText: 'Start Free Trial',
      popular: false,
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 49,
      yearlyPrice: 490,
      listings: '500',
      description: 'Best for active resellers',
      features: [
        'Up to 500 listings per month',
        'Advanced AI pricing analytics',
        'Full marketplace integration',
        'Unlimited voice AI coach',
        'Priority support',
        'Advanced market insights',
        'Profit optimization tools',
        'Custom listing templates'
      ],
      buttonText: 'Start Free Trial',
      popular: true,
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99,
      yearlyPrice: 990,
      listings: '1,000',
      description: 'For power resellers and teams',
      features: [
        'Up to 1,000 listings per month',
        'AI-powered bulk listing tools',
        'Multi-marketplace automation',
        'Unlimited voice AI coach',
        'White-glove onboarding',
        'Advanced analytics dashboard',
        'API access',
        'Dedicated account manager',
        'Custom integrations'
      ],
      buttonText: 'Contact Sales',
      popular: false,
      gradient: 'from-orange-500 to-red-600'
    }
  ];

  const PricingCard = ({ plan }) => (
    <div className={`relative bg-white rounded-2xl shadow-xl p-8 ${plan.popular ? 'ring-4 ring-purple-500 scale-105' : ''} transition-all duration-300 hover:shadow-2xl`}>
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p className="text-gray-600 mb-4">{plan.description}</p>
        <div className="mb-4">
          <span className="text-5xl font-bold text-gray-900">${isAnnual ? plan.yearlyPrice : plan.price}</span>
          <span className="text-gray-600">/{isAnnual ? 'year' : 'month'}</span>
        </div>
        <div className={`inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r ${plan.gradient} text-white text-sm font-semibold`}>
          {plan.listings} listings/month
        </div>
      </div>

      <ul className="space-y-4 mb-8">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
        plan.popular 
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg' 
          : 'bg-gray-900 text-white hover:bg-gray-800'
      }`}>
        {plan.buttonText}
      </button>
    </div>
  );

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Choose the plan that fits your reselling volume
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mb-12">
            <span className={`${!isAnnual ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`${isAnnual ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
              Annual
              <span className="ml-2 text-green-600 text-sm font-medium">(Save 20%)</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">All plans include a 14-day free trial. No credit card required.</p>
          <div className="flex justify-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              SSL Secured
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              24/7 Support
            </div>
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-2" />
              99.9% Uptime
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;