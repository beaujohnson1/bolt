import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, Link2, Upload, Bot, Zap, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ebayOAuthService from '../services/ebayOAuth';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending';
  action?: () => void;
  actionText?: string;
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onStepChange: (stepId: string) => void;
  currentStep?: string;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ 
  onComplete, 
  onStepChange, 
  currentStep = 'connect_ebay' 
}) => {
  const { user } = useAuth();
  const [isEbayConnected, setIsEbayConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasCreatedFirstItem, setHasCreatedFirstItem] = useState(false);

  // Check eBay connection status with enhanced reliability
  useEffect(() => {
    const checkEbayConnection = () => {
      const connected = ebayOAuthService.isAuthenticated();
      console.log('🔍 [ONBOARDING] Checking eBay connection:', connected);
      setIsEbayConnected(connected);
    };

    checkEbayConnection();

    // Watch for auth changes
    const cleanup = ebayOAuthService.watchForTokenChanges((authenticated) => {
      console.log('📡 [ONBOARDING] eBay auth changed:', authenticated);
      setIsEbayConnected(authenticated);
      if (authenticated && currentStep === 'connect_ebay') {
        // Auto-advance to next step when eBay is connected
        setTimeout(() => onStepChange('upload_photos'), 500);
      }
    });

    // Enhanced postMessage handler with multiple origin support
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 [ONBOARDING] Received postMessage:', {
        origin: event.origin,
        expectedOrigin: window.location.origin,
        data: event.data,
        timestamp: Date.now()
      });
      
      // Support multiple trusted origins for enhanced compatibility
      const trustedOrigins = [
        window.location.origin,
        'https://easyflip.ai',
        'https://localhost:5173',
        'http://localhost:5173',
        '*' // Allow any origin in development
      ];
      
      const isValidOrigin = trustedOrigins.includes(event.origin) || 
                           event.origin.includes('localhost') ||
                           event.origin.includes('127.0.0.1');
      
      if ((isValidOrigin || event.origin === window.location.origin) && 
          event.data?.type === 'EBAY_OAUTH_SUCCESS') {
        console.log('🎉 [ONBOARDING] Valid OAuth success message received!');
        
        // Store tokens if provided
        if (event.data.tokens) {
          console.log('💾 [ONBOARDING] Storing tokens from postMessage');
          try {
            localStorage.setItem('ebay_oauth_tokens', JSON.stringify(event.data.tokens));
            localStorage.setItem('ebay_manual_token', event.data.tokens.access_token);
          } catch (error) {
            console.error('❌ [ONBOARDING] Error storing tokens from postMessage:', error);
          }
        }
        
        // Aggressive token verification with multiple attempts
        const performAggressiveCheck = (attempt: number = 1) => {
          console.log(`🔍 [ONBOARDING] Aggressive check attempt ${attempt}`);
          
          const connected = ebayOAuthService.isAuthenticated();
          console.log(`🔍 [ONBOARDING] Auth status on attempt ${attempt}:`, connected);
          
          if (connected) {
            console.log('✅ [ONBOARDING] Authentication confirmed!');
            setIsEbayConnected(true);
            
            if (currentStep === 'connect_ebay') {
              setTimeout(() => onStepChange('upload_photos'), 300);
            }
          } else if (attempt < 5) {
            // Retry with exponential backoff
            const delay = attempt * 200; // 200ms, 400ms, 600ms, 800ms
            setTimeout(() => performAggressiveCheck(attempt + 1), delay);
          }
        };
        
        // Start aggressive checking immediately
        performAggressiveCheck();
      }
    };

    // BroadcastChannel for cross-tab communication
    let broadcastChannel: BroadcastChannel | null = null;
    const handleBroadcastMessage = (event: MessageEvent) => {
      console.log('📡 [ONBOARDING] BroadcastChannel message:', event.data);
      
      if (event.data?.type === 'AUTH_CHANGED' && event.data.authenticated) {
        console.log('🎉 [ONBOARDING] Auth change via BroadcastChannel!');
        
        setTimeout(() => {
          const connected = ebayOAuthService.isAuthenticated();
          console.log('🔍 [ONBOARDING] Auth status after broadcast:', connected);
          setIsEbayConnected(connected);
          
          if (connected && currentStep === 'connect_ebay') {
            setTimeout(() => onStepChange('upload_photos'), 300);
          }
        }, 100);
      }
    };

    // Initialize BroadcastChannel if available
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('ebay-auth');
        broadcastChannel.addEventListener('message', handleBroadcastMessage);
        console.log('📡 [ONBOARDING] BroadcastChannel initialized');
      } catch (error) {
        console.warn('⚠️ [ONBOARDING] BroadcastChannel setup failed:', error);
      }
    }

    // Enhanced focus handling for popup return
    const handleFocus = () => {
      console.log('👁️ [ONBOARDING] Window focus detected, checking auth...');
      
      setTimeout(() => {
        const connected = ebayOAuthService.isAuthenticated();
        console.log('👁️ [ONBOARDING] Auth status after focus:', connected);
        setIsEbayConnected(connected);
        
        if (connected && currentStep === 'connect_ebay') {
          setTimeout(() => onStepChange('upload_photos'), 300);
        }
      }, 200);
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('focus', handleFocus);

    return () => {
      cleanup();
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleFocus);
      
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcastMessage);
        broadcastChannel.close();
      }
    };
  }, [currentStep, onStepChange]);

  // Check if user has created their first item
  useEffect(() => {
    const checkFirstItem = () => {
      const firstItemCreated = localStorage.getItem(`first_item_created_${user?.id}`);
      setHasCreatedFirstItem(!!firstItemCreated);
    };

    checkFirstItem();
    
    // Listen for first item creation
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('first_item_created')) {
        checkFirstItem();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.id]);

  const handleConnectEbay = async () => {
    try {
      setIsConnecting(true);
      console.log('🔗 [ONBOARDING] Initiating eBay OAuth flow...');
      
      // Use the current dashboard URL as redirect
      const redirectUri = `${window.location.origin}/app`;
      await ebayOAuthService.initiateOAuthFlow(redirectUri);
      
      // Enhanced multi-stage token polling for bulletproof detection
      let checkCount = 0;
      const maxChecks = 240; // 2 minutes with varied intervals
      
      const performTokenPolling = () => {
        checkCount++;
        
        const connected = ebayOAuthService.isAuthenticated();
        console.log(`⏱️ [ONBOARDING] Token poll ${checkCount}/${maxChecks}:`, connected);
        
        if (connected) {
          console.log('🎉 [ONBOARDING] Authentication detected during polling!');
          setIsEbayConnected(true);
          setIsConnecting(false);
          
          if (currentStep === 'connect_ebay') {
            setTimeout(() => onStepChange('upload_photos'), 500);
          }
          return; // Stop polling
        }
        
        if (checkCount >= maxChecks) {
          console.log('⏱️ [ONBOARDING] Token polling timeout reached');
          setIsConnecting(false);
          return;
        }
        
        // Dynamic polling intervals: aggressive early, then backing off
        let nextInterval;
        if (checkCount <= 20) {
          nextInterval = 50; // First 1 second: every 50ms
        } else if (checkCount <= 40) {
          nextInterval = 100; // Next 2 seconds: every 100ms
        } else if (checkCount <= 60) {
          nextInterval = 500; // Next 10 seconds: every 500ms
        } else if (checkCount <= 120) {
          nextInterval = 1000; // Next 60 seconds: every 1s
        } else {
          nextInterval = 2000; // Final 60 seconds: every 2s
        }
        
        setTimeout(performTokenPolling, nextInterval);
      };
      
      // Start aggressive polling immediately
      setTimeout(performTokenPolling, 100);
      
    } catch (error) {
      console.error('❌ [ONBOARDING] Error connecting to eBay:', error);
      
      // Enhanced error handling with user-friendly messaging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ [ONBOARDING] Detailed error:', errorMessage);
      
      // Check if it's a popup blocker issue
      if (errorMessage.includes('popup') || errorMessage.includes('blocked')) {
        alert('Popup was blocked. Please allow popups for this site and try again.');
      } else {
        alert(`Failed to connect to eBay: ${errorMessage}. Please try again.`);
      }
      
      setIsConnecting(false);
    }
  };

  const getStepStatus = (stepId: string): 'completed' | 'current' | 'pending' => {
    if (stepId === 'connect_ebay') {
      return isEbayConnected ? 'completed' : (currentStep === stepId ? 'current' : 'pending');
    }
    if (stepId === 'upload_photos') {
      if (!isEbayConnected) return 'pending';
      return currentStep === stepId ? 'current' : (hasCreatedFirstItem ? 'completed' : 'pending');
    }
    if (stepId === 'generate_listing') {
      if (!isEbayConnected || !hasCreatedFirstItem) return 'pending';
      return currentStep === stepId ? 'current' : 'pending';
    }
    if (stepId === 'launch_listing') {
      return currentStep === stepId ? 'current' : 'pending';
    }
    return 'pending';
  };

  const steps: OnboardingStep[] = [
    {
      id: 'connect_ebay',
      title: 'Connect Your eBay Account',
      description: 'Link your eBay account to enable live listing creation',
      icon: <Link2 className="w-6 h-6" />,
      status: getStepStatus('connect_ebay'),
      action: !isEbayConnected ? handleConnectEbay : undefined,
      actionText: isConnecting ? 'Connecting...' : 'Connect eBay Account'
    },
    {
      id: 'upload_photos',
      title: 'Upload Photos',
      description: 'Take or upload photos of your items to get started',
      icon: <Upload className="w-6 h-6" />,
      status: getStepStatus('upload_photos'),
      action: isEbayConnected ? () => onStepChange('upload_photos') : undefined,
      actionText: 'Upload Photos'
    },
    {
      id: 'generate_listing',
      title: 'Generate AI Analysis',
      description: 'Let AI analyze your items and create optimized listings',
      icon: <Bot className="w-6 h-6" />,
      status: getStepStatus('generate_listing'),
      action: (isEbayConnected && hasCreatedFirstItem) ? () => onStepChange('generate_listing') : undefined,
      actionText: 'Generate Listings'
    },
    {
      id: 'launch_listing',
      title: 'Launch Your Listing',
      description: 'Review and publish your listing to eBay',
      icon: <Zap className="w-6 h-6" />,
      status: getStepStatus('launch_listing'),
      action: undefined,
      actionText: 'Launch Listing'
    }
  ];

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  // Check if onboarding is complete
  const isOnboardingComplete = isEbayConnected && hasCreatedFirstItem;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to EasyFlip! 
        </h2>
        <p className="text-lg text-gray-600">
          Let's get you set up in 4 easy steps
        </p>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{completedSteps}/{steps.length} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`relative border rounded-xl p-6 transition-all duration-200 ${
              step.status === 'completed'
                ? 'bg-green-50 border-green-200'
                : step.status === 'current'
                ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start space-x-4">
              {/* Step Icon */}
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  step.status === 'completed'
                    ? 'bg-green-500 text-white'
                    : step.status === 'current'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-300 text-gray-500'
                }`}
              >
                {step.status === 'completed' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-semibold ${
                  step.status === 'completed'
                    ? 'text-green-800'
                    : step.status === 'current'
                    ? 'text-blue-800'
                    : 'text-gray-800'
                }`}>
                  {step.title}
                  {step.status === 'completed' && (
                    <span className="ml-2 text-sm font-normal text-green-600">
                      ✓ Complete
                    </span>
                  )}
                </h3>
                <p className={`mt-1 ${
                  step.status === 'completed'
                    ? 'text-green-600'
                    : step.status === 'current'
                    ? 'text-blue-600'
                    : 'text-gray-600'
                }`}>
                  {step.description}
                </p>

                {/* Action Button */}
                {step.action && step.status !== 'completed' && (
                  <button
                    onClick={step.action}
                    disabled={isConnecting}
                    className={`mt-3 inline-flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      step.status === 'current'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span>{step.actionText}</span>
                    {!isConnecting && <ArrowRight className="w-4 h-4" />}
                    {isConnecting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    )}
                  </button>
                )}
              </div>

              {/* Step Number */}
              <div className="flex-shrink-0">
                <span className={`text-sm font-medium ${
                  step.status === 'completed'
                    ? 'text-green-600'
                    : step.status === 'current'
                    ? 'text-blue-600'
                    : 'text-gray-400'
                }`}>
                  {index + 1}
                </span>
              </div>
            </div>

            {/* Connection Arrow */}
            {index < steps.length - 1 && (
              <div className="absolute left-11 top-20 w-0.5 h-4 bg-gray-300" />
            )}
          </div>
        ))}
      </div>

      {/* Special eBay Connection CTA */}
      {!isEbayConnected && currentStep === 'connect_ebay' && (
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">
                Ready to start selling?
              </h3>
              <p className="text-blue-100 mb-4">
                Connect your eBay account to create live listings that reach millions of buyers. 
                This secure connection allows EasyFlip to publish listings directly to your eBay store.
              </p>
              <button
                onClick={handleConnectEbay}
                disabled={isConnecting}
                className="inline-flex items-center space-x-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                    <span>Connecting to eBay...</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-5 h-5" />
                    <span>Connect eBay Account</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {isOnboardingComplete && (
        <div className="mt-8 bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold mb-2">
            🎉 Congratulations! You're all set!
          </h3>
          <p className="text-green-100 mb-4">
            Your eBay account is connected and you've created your first item. 
            You're ready to start generating and publishing optimized listings!
          </p>
          <button
            onClick={onComplete}
            className="inline-flex items-center space-x-2 bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default OnboardingFlow;