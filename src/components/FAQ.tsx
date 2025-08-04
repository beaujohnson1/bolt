import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How does the AI pricing work?",
      answer: "Our AI analyzes thousands of completed sales across all platforms for items similar to yours. It considers factors like condition, brand, demand, and seasonal trends to recommend the optimal price that maximizes both speed of sale and profit. The system is constantly learning from new sales data to improve accuracy."
    },
    {
      question: "Which platforms does EasyList.ai work with?",
      answer: "We automatically post to eBay, Facebook Marketplace, and OfferUp. Each listing is tailored for that platform's specific format, audience, and search algorithms. We're constantly adding new platforms based on user demand."
    },
    {
      question: "Do I need to manage multiple apps?", 
      answer: "No! That's the whole point. You manage everything from the EasyList.ai app. View messages from all platforms, update prices, track analytics, and handle sales all in one place. No more juggling multiple apps and accounts."
    },
    {
      question: "What if the AI gets my item details wrong?",
      answer: "You can easily edit any details before posting. The AI is highly accurate (95%+ for common items), but you always have final control. You can adjust the title, description, price, category, or any other details with just a few taps."
    },
    {
      question: "How much can I really earn?",
      answer: "It varies by what you're selling, but our average user makes $347/month. We've seen users earn anywhere from $50/month (casual sellers) to $2,000+/month (regular declutterers). The key is that you'll sell more items because it's so much easier."
    },
    {
      question: "Is there a free trial?",
      answer: "Yes! Both plans come with a 7-day free trial. The monthly plan includes full access to all features. The commission plan is always free to start - you only pay the 5% when you actually make a sale."
    },
    {
      question: "What happens to my existing listings?", 
      answer: "EasyFlip can import and manage your existing listings from supported platforms. You'll be able to track and manage everything from one dashboard, even items you listed before using our app."
    },
    {
      question: "What does the AI Reseller Coach do?",
      answer: "Our AI Reseller Coach is your personal business optimization assistant. It analyzes your eBay sales data to identify patterns and opportunities: which items sell fastest vs. slowest, your most profitable categories, optimal pricing strategies, seasonal trends, and inventory recommendations. The coach provides actionable insights like 'Electronics sell 40% faster when listed on Thursday evenings' or 'Your vintage clothing has 85% higher profit margins than modern items.' It's like having a data scientist dedicated to growing your reselling business."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-gray-50 py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get answers to the most common questions about EasyFlip and start selling smarter today.
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                  onClick={() => toggleFAQ(index)}
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 pr-8">
                      {faq.question}
                    </h3>
                    <div className="flex-shrink-0">
                      {openIndex === index ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </button>
                
                {openIndex === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Contact Support */}
        <div className="mt-16 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Still Have Questions?
            </h3>
            <p className="text-gray-600 mb-6">
              Our support team is here to help you get started and make the most of EasyList.ai.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
                Contact Support
              </button>
              <button className="border-2 border-gray-300 hover:border-blue-600 text-gray-700 hover:text-blue-600 font-semibold py-3 px-6 rounded-lg transition-colors">
                Schedule Demo Call
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
