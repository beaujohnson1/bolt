import React, { useEffect, useState } from 'react';
import { Camera, Clock, DollarSign, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import EmailCapture from './EmailCapture';
import GoogleSignInSupabase from './GoogleSignInSupabase';
import { useScrollTracking } from '../hooks/useScrollTracking';
import { useAuth } from '../contexts/AuthContext';

const Hero = () => {
  const heroRef = useScrollTracking('hero_section');
  const navigate = useNavigate();
  const { authUser } = useAuth();
  const [hasSubmittedToGHL, setHasSubmittedToGHL] = useState(false);

  // Automatically submit authenticated user data to GoHighLevel
  useEffect(() => {
    const submitAuthenticatedUser = async () => {
      if (authUser && authUser.email && !hasSubmittedToGHL) {
        try {
          console.log('🔄 [HERO] Submitting authenticated user to GoHighLevel:', authUser.email);
          
          // Add timeout to prevent hanging
          const response = await Promise.race([
            fetch('/.netlify/functions/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
              email: authUser.email,
              name: authUser.full_name || authUser.name || '',
              firstName: authUser.full_name?.split(' ')[0] || '',
              lastName: authUser.full_name?.split(' ')[1] || '',
              picture: authUser.avatar_url || '',
              googleId: authUser.id || '',
              source: 'google_signin_authenticated',
              timestamp: new Date().toISOString(),
              page_url: window.location.href
            }),
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('GHL submission timeout')), 3000)
          )
        ]);

          if (response.ok) {
            console.log('✅ [HERO] Successfully submitted to GoHighLevel');
            setHasSubmittedToGHL(true);
            // Store in localStorage to prevent re-submission
            localStorage.setItem(`ghl_submitted_${authUser.id}`, 'true');
            
            // Redirect to dashboard after successful submission
            console.log('🎯 [HERO] Redirecting authenticated user to dashboard');
            navigate('/app'); // Remove delay for faster redirect
          }
        } catch (error) {
          console.error('❌ [HERO] Failed to submit to GoHighLevel:', error);
        }
      }
    };

    // Check if already submitted
    if (authUser && authUser.id) {
      const alreadySubmitted = localStorage.getItem(`ghl_submitted_${authUser.id}`);
      if (alreadySubmitted) {
        setHasSubmittedToGHL(true);
        // If already submitted, redirect immediately to dashboard
        console.log('🎯 [HERO] User already submitted, redirecting to dashboard');
        navigate('/app'); // Remove delay for faster redirect
      } else {
        submitAuthenticatedUser();
      }
    }
  }, [authUser, hasSubmittedToGHL]);
  
  return (
    <section ref={heroRef} className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center pt-20">
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
            
            {/* Primary CTA */}
            <div className="mb-8">
              <div className="max-w-md mx-auto lg:mx-0 space-y-4">
                {authUser ? (
                  /* Authenticated User Content */
                  <div className="text-center lg:text-left">
                    {hasSubmittedToGHL ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <div className="flex items-center justify-center lg:justify-start space-x-3 mb-3">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <h3 className="text-lg font-semibold text-green-800">Welcome to the Waitlist!</h3>
                        </div>
                        <p className="text-green-700 mb-4">
                          Hi {authUser.full_name?.split(' ')[0] || authUser.email}! You're all set for early access to EasyFlip.
                        </p>
                        <a 
                          href="/app" 
                          className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                          Go to Dashboard
                        </a>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <div className="flex items-center justify-center lg:justify-start space-x-3 mb-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                          <span className="text-blue-800 font-medium">Joining waitlist...</span>
                        </div>
                        <p className="text-blue-700">
                          Adding you to our early access list, {authUser.full_name?.split(' ')[0] || authUser.email}!
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Non-authenticated User Content */
                  <>
                    <GoogleSignInSupabase 
                      buttonText="Join Waitlist with Google"
                      size="lg"
                    />
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-500">or continue with email</span>
                      </div>
                    </div>
                    
                    <EmailCapture 
                      buttonText="Join the Waitlist"
                      placeholder="Enter your email address"
                      size="lg"
                    />
                  </>
                )}
              </div>
            </div>
            
            {/* Social Proof Strip */}
            <div className="space-y-4">
              {/* Waitlist Counter */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center bg-white/80 backdrop-blur rounded-full px-4 py-2 shadow-sm border border-gray-200">
                  <div className="flex -space-x-1 mr-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
                    <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                    <div className="w-6 h-6 bg-purple-500 rounded-full border-2 border-white"></div>
                    <div className="w-6 h-6 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                      +
                    </div>
                  </div>
                  <span className="text-gray-700 font-medium">
                    Join <span className="text-blue-600 font-bold">247</span> people on the waitlist
                  </span>
                </div>
              </div>
              
              {/* Trust Indicator */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 text-center lg:text-left">Be among the first to know when we launch</span>
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
