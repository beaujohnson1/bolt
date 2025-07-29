import React from 'react';
import { Star, Quote } from 'lucide-react';

const Testimonials = () => {
  const testimonials = [
    {
      quote: "I was skeptical at first, but EasyFlip made selling my daughter's outgrown clothes effortless. What used to take me entire weekends now takes minutes. I've made over $800 in the past month just decluttering!",
      name: "Jennifer Martinez",
      title: "Working Mom",
      location: "Phoenix, AZ",
      image: "https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      earnings: "$847 in 30 days"
    },
    {
      quote: "The pricing feature is incredible. I was underpricing everything before. Now the AI tells me exactly what to charge based on actual sales data. My average sale price increased by 35% and items still sell faster.",
      name: "Mike Thompson",
      title: "Tech Professional",
      location: "Seattle, WA", 
      image: "https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      earnings: "$1,200 in 45 days"
    },
    {
      quote: "Moving across the country meant selling everything. EasyFlip posted my furniture to all platforms instantly. Sold my dining set, couch, and bedroom furniture in one week. Couldn't have done it without this app!",
      name: "Sarah Chen",
      title: "Marketing Manager", 
      location: "Austin, TX",
      image: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      earnings: "$2,100 in 7 days"
    }
  ];

  return (
    <section className="bg-gray-50 py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Real People, Real Results
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join thousands of satisfied sellers who've transformed their clutter into cash 
            with EasyFlip.
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl shadow-lg relative">
              <div className="absolute -top-4 left-8">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Quote className="w-4 h-4 text-white" />
                </div>
              </div>
              
              {/* Star Rating */}
              <div className="flex space-x-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              
              {/* Testimonial */}
              <blockquote className="text-gray-700 leading-relaxed mb-8 italic">
                "{testimonial.quote}"
              </blockquote>
              
              {/* Author */}
              <div className="flex items-center space-x-4">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-600">{testimonial.title}</div>
                  <div className="text-sm text-gray-500">{testimonial.location}</div>
                </div>
              </div>
              
              {/* Earnings Badge */}
              <div className="mt-6 inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                💰 {testimonial.earnings}
              </div>
            </div>
          ))}
        </div>
        
        {/* Success Stats */}
        <div className="mt-16 bg-white p-8 rounded-2xl shadow-lg max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Proven Results Across All Users
            </h3>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">90%</div>
              <div className="text-gray-600">Faster listing time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">35%</div>
              <div className="text-gray-600">Higher average sale price</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">40%</div>
              <div className="text-gray-600">Faster sales</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">$347</div>
              <div className="text-gray-600">Average monthly earnings</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
