import React from 'react';
import { Mail, LogIn, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, authUser, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [authLoading, setAuthLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Debug logging
  React.useEffect(() => {
    console.log('Header state:', { user: !!user, authUser: !!authUser, loading });
  }, [user, authUser, loading]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (showAuthModal) {
      setEmail('');
      setPassword('');
      setName('');
      setError('');
      setAuthLoading(false);
    }
  }, [showAuthModal]);

  // Close modal and navigate when user is authenticated
  React.useEffect(() => {
    if (user && authUser && showAuthModal) {
      setShowAuthModal(false);
      navigate('/app');
    }
  }, [user, authUser, showAuthModal, navigate]);

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      setAuthLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      setError('Google sign-in failed. Please try email/password instead.');
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAuthLoading(true);
    
    try {
      if (isSignUp) {
        await signUp(email, password, name);
        setError('Account created successfully! You can now sign in.');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        // Navigation will happen automatically via useEffect
      }
    } catch (error: any) {
      console.error('Auth failed:', error);
      setError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDashboard = () => {
    navigate('/app');
  };

  // Show loading only for a reasonable time
  const [showLoading, setShowLoading] = React.useState(true);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 3000); // Stop showing loading after 3 seconds max
    
    if (!loading) {
      setShowLoading(false);
    }
    
    return () => clearTimeout(timer);
  }, [loading]);
  
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
            {user && authUser ? (
              <button
                onClick={handleDashboard}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            ) : showLoading && loading ? (
              <button
                disabled
                className="bg-gray-400 text-white font-semibold py-3 px-6 rounded-full flex items-center space-x-2"
              >
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Loading...</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
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
      
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-blue-400 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-3 mb-4"
            >
              {authLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
              ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              )}
              <span>{authLoading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>
            
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">or continue with email</span>
              </div>
            </div>
            
            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isSignUp && (
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              )}
              
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={6}
              />
              
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {authLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                  </div>
                ) : (
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                )}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
