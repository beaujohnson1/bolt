import React from 'react';
import { Mail } from 'lucide-react';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <a 
            href="#" 
            className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            EasyFlip<span className="text-blue-600">.ai</span>
          </a>
          
          {/* Chat Button */}
          <a
            href="mailto:support@easyflip.ai?subject=Let's Chat - EasyFlip Inquiry"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center space-x-2"
          >
            <Mail className="w-4 h-4" />
            <span>Let's Chat</span>
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
