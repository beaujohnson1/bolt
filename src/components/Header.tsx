import React from 'react';
import { Mail, LogIn, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleDashboard = () => {
    navigate('/app');
  };

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
            EasyFlip<span className="text-blue-600">.ai</span> ✨
          </a>
          
          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <button
                onClick={handleDashboard}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            ) : (
              <button
                onClick={handleQuickLogin}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              </button>
            )}
            
            <a
              href="mailto:beau@beaujohnson.org?subject=Let's Chat - EasyFlip Inquiry"
              className="border-2 border-gray-300 hover:border-blue-400 text-gray-700 hover:text-blue-600 font-semibold py-3 px-6 rounded-full transition-all duration-300 hover:scale-105 flex items-center space-x-2"
            >
              <Mail className="w-4 h-4" />
              <span>Contact</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
