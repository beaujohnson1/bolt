import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, Link2, Upload, Bot, Zap, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ebayOAuthService from '../services/ebayOAuth';
import { initializeOAuthDebugConsole } from '../utils/oauthDebugConsole';

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
  const [showManualCheck, setShowManualCheck] = useState(false);
  
  // Initialize debug console and get reference
  const debugConsole = initializeOAuthDebugConsole();

  // Check eBay connection status with enhanced reliability
  useEffect(() => {
    const checkEbayConnection = () => {
      const connected = ebayOAuthService.isAuthenticated();
      console.log('🔍 [ONBOARDING] Checking eBay connection:', connected);
      debugConsole.log(`eBay connection check: ${connected ? 'Connected' : 'Not connected'}`, connected ? 'success' : 'info', 'onboarding');
      setIsEbayConnected(connected);
    };

    checkEbayConnection();

    // Watch for auth changes
    const cleanup = ebayOAuthService.watchForTokenChanges((authenticated) => {
      console.log('📡 [ONBOARDING] eBay auth changed:', authenticated);
      debugConsole.log(`Auth status changed: ${authenticated ? 'Authenticated' : 'Not authenticated'}`, authenticated ? 'success' : 'warning', 'auth-change');
      setIsEbayConnected(authenticated);
      if (authenticated && currentStep === 'connect_ebay') {
        debugConsole.log('Auto-advancing to upload photos step', 'success', 'navigation');
        // Auto-advance to next step when eBay is connected
        setTimeout(() => onStepChange('upload_photos'), 500);
      }
    });

    // Enhanced postMessage handler with comprehensive communication support
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 [ONBOARDING] Received postMessage:', {
        origin: event.origin,
        expectedOrigin: window.location.origin,
        type: event.data?.type,
        source: event.data?.source,
        timestamp: event.data?.timestamp,
        hasTokens: !!event.data?.tokens
      });
      
      // Support multiple trusted origins for enhanced compatibility
      const trustedOrigins = [
        window.location.origin,
        'https://easyflip.ai',
        'https://localhost:5173',
        'http://localhost:5173',
        'https://easyflip.netlify.app'
      ];
      
      const isValidOrigin = trustedOrigins.includes(event.origin) || 
                           event.origin.includes('localhost') ||
                           event.origin.includes('127.0.0.1') ||
                           event.origin.includes('netlify.app');
      
      // Handle multiple message types from enhanced callback
      const validMessageTypes = [
        'EBAY_OAUTH_SUCCESS',
        'EBAY_AUTH_SUCCESS',
        'EBAY_OAUTH_COMPLETE'
      ];
      
      if (isValidOrigin && validMessageTypes.includes(event.data?.type)) {
        console.log('🎉 [ONBOARDING] Valid OAuth success message received!');
        console.log('📋 [ONBOARDING] Message details:', {
          type: event.data.type,
          source: event.data.source,
          validation: event.data.validation,
          tokenLength: event.data.tokens?.access_token?.length || 0
        });
        
        // Store tokens if provided (multiple formats for compatibility)
        if (event.data.tokens) {
          console.log('💾 [ONBOARDING] Storing tokens from postMessage');
          try {
            const tokens = event.data.tokens;
            localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokens));
            localStorage.setItem('ebay_manual_token', tokens.access_token);
            localStorage.setItem('ebay_app_token', tokens.access_token);
            localStorage.setItem('ebay_app_token_expiry', tokens.expires_at?.toString() || (Date.now() + tokens.expires_in * 1000).toString());
            console.log('✅ [ONBOARDING] All token formats stored successfully');
          } catch (error) {
            console.error('❌ [ONBOARDING] Error storing tokens from postMessage:', error);
          }
        }
        
        // Ultra-aggressive token verification with comprehensive checking
        const performUltraAggressiveCheck = (attempt: number = 1) => {
          console.log(`🔍 [ONBOARDING] Ultra-aggressive check attempt ${attempt}/10`);
          
          // Multiple validation methods
          const methods = [
            () => ebayOAuthService.isAuthenticated(),
            () => !!localStorage.getItem('ebay_oauth_tokens'),
            () => !!localStorage.getItem('ebay_manual_token'),
            () => !!localStorage.getItem('ebay_app_token')
          ];
          
          const results = methods.map((method, index) => {
            try {
              const result = method();
              console.log(`✓ [ONBOARDING] Validation method ${index + 1}:`, result);
              return result;
            } catch (error) {
              console.log(`❌ [ONBOARDING] Validation method ${index + 1} error:`, error.message);
              return false;
            }
          });
          
          const connected = results.some(result => result === true);
          console.log(`🔍 [ONBOARDING] Overall auth status on attempt ${attempt}:`, connected);
          console.log(`📊 [ONBOARDING] Validation results:`, results);
          
          if (connected) {
            console.log('✅ [ONBOARDING] Authentication confirmed via ultra-aggressive check!');
            setIsEbayConnected(true);
            setIsConnecting(false);
            
            // Dispatch custom event to refresh other components
            window.dispatchEvent(new CustomEvent('ebayAuthenticationConfirmed', {
              detail: { 
                source: 'onboarding_ultra_check',
                attempt: attempt,
                timestamp: Date.now()
              }
            }));
            
            if (currentStep === 'connect_ebay') {
              console.log('🚀 [ONBOARDING] Auto-advancing to upload_photos step');
              setTimeout(() => onStepChange('upload_photos'), 500);
            }
          } else if (attempt < 10) {
            // Retry with progressive delay
            const delays = [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000];
            const delay = delays[attempt - 1] || 5000;
            console.log(`⏳ [ONBOARDING] Retrying in ${delay}ms...`);
            setTimeout(() => performUltraAggressiveCheck(attempt + 1), delay);
          } else {
            console.warn('⚠️ [ONBOARDING] Authentication verification failed after 10 attempts');
            setIsConnecting(false);
          }
        };
        
        // Start ultra-aggressive checking immediately
        performUltraAggressiveCheck();
      }
      
      // Handle error messages
      if (isValidOrigin && event.data?.type === 'EBAY_OAUTH_ERROR') {
        console.error('❌ [ONBOARDING] OAuth error message received:', event.data.error);
        setIsConnecting(false);
        // You could show an error message to the user here
      }
    };

    // Enhanced BroadcastChannel for cross-tab communication
    let broadcastChannel: BroadcastChannel | null = null;
    const handleBroadcastMessage = (event: MessageEvent) => {
      console.log('📡 [ONBOARDING] BroadcastChannel message:', {
        type: event.data?.type,
        source: event.data?.source,
        authenticated: event.data?.authenticated,
        hasTokens: !!event.data?.tokens,
        timestamp: event.data?.timestamp
      });
      
      // Handle multiple broadcast message types
      const validBroadcastTypes = [
        'AUTH_CHANGED',
        'EBAY_AUTH_SUCCESS',
        'EBAY_OAUTH_SUCCESS'
      ];
      
      if (validBroadcastTypes.includes(event.data?.type)) {
        console.log('🎉 [ONBOARDING] Valid auth broadcast received!');
        
        // Store tokens if provided via broadcast
        if (event.data.tokens) {
          console.log('💾 [ONBOARDING] Storing tokens from BroadcastChannel');
          try {
            const tokens = event.data.tokens;
            localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokens));
            localStorage.setItem('ebay_manual_token', tokens.access_token);
            localStorage.setItem('ebay_app_token', tokens.access_token);
            localStorage.setItem('ebay_app_token_expiry', tokens.expires_at?.toString() || (Date.now() + tokens.expires_in * 1000).toString());
            console.log('✅ [ONBOARDING] Tokens stored from broadcast');
          } catch (error) {
            console.error('❌ [ONBOARDING] Error storing broadcast tokens:', error);
          }
        }
        
        // Enhanced verification with multiple attempts
        const verifyBroadcastAuth = (attempt: number = 1) => {
          console.log(`🔍 [ONBOARDING] Broadcast verification attempt ${attempt}/5`);
          
          const connected = ebayOAuthService.isAuthenticated();
          const hasTokens = !!localStorage.getItem('ebay_oauth_tokens');
          const hasManualToken = !!localStorage.getItem('ebay_manual_token');
          
          console.log('📊 [ONBOARDING] Broadcast verification status:', {
            connected,
            hasTokens,
            hasManualToken,
            attempt
          });
          
          if (connected || hasTokens || hasManualToken) {
            console.log('✅ [ONBOARDING] Broadcast authentication verified!');
            setIsEbayConnected(true);
            setIsConnecting(false);
            
            if (currentStep === 'connect_ebay') {
              setTimeout(() => onStepChange('upload_photos'), 300);
            }
          } else if (attempt < 5) {
            const delay = attempt * 200;
            setTimeout(() => verifyBroadcastAuth(attempt + 1), delay);
          }
        };
        
        verifyBroadcastAuth();
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

    // Storage event handler for auth notification triggers
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'ebay_auth_notification') {
        console.log('💾 [ONBOARDING] Auth notification storage event detected');
        
        try {
          const notification = event.newValue ? JSON.parse(event.newValue) : null;
          if (notification && notification.type === 'success' && notification.tokens) {
            console.log('🎉 [ONBOARDING] Auth success via storage event!');
            
            // Store tokens from storage notification
            localStorage.setItem('ebay_oauth_tokens', JSON.stringify(notification.tokens));
            localStorage.setItem('ebay_manual_token', notification.tokens.access_token);
            
            setTimeout(() => {
              const connected = ebayOAuthService.isAuthenticated();
              console.log('🔍 [ONBOARDING] Auth status after storage event:', connected);
              if (connected) {
                setIsEbayConnected(true);
                setIsConnecting(false);
                if (currentStep === 'connect_ebay') {
                  setTimeout(() => onStepChange('upload_photos'), 300);
                }
              }
            }, 100);
          }
        } catch (error) {
          console.error('❌ [ONBOARDING] Error processing storage event:', error);
        }
      }
      
      // Also check for direct token storage changes
      if (event.key?.includes('ebay_') && event.key?.includes('token')) {
        console.log('🔍 [ONBOARDING] eBay token storage change detected:', event.key);
        setTimeout(() => {
          const connected = ebayOAuthService.isAuthenticated();
          if (connected) {
            setIsEbayConnected(true);
            setIsConnecting(false);
          }
        }, 200);
      }
    };

    // Custom event handlers for additional communication methods
    const handleCustomEvents = (event: CustomEvent) => {
      console.log('🎨 [ONBOARDING] Custom event received:', {
        type: event.type,
        authenticated: event.detail?.authenticated,
        source: event.detail?.source,
        hasTokens: !!event.detail?.tokens
      });
      
      const validCustomEvents = [
        'ebayAuthChanged',
        'ebayTokenDetected',
        'oauthSuccess',
        'ebayOAuthComplete',
        'ebayAuthenticationConfirmed'
      ];
      
      if (validCustomEvents.includes(event.type) && event.detail?.authenticated) {
        console.log('🎉 [ONBOARDING] Valid auth custom event received!');
        
        if (event.detail.tokens) {
          // Store tokens from custom event
          try {
            const tokens = event.detail.tokens;
            localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokens));
            localStorage.setItem('ebay_manual_token', tokens.access_token);
            console.log('✅ [ONBOARDING] Tokens stored from custom event');
          } catch (error) {
            console.error('❌ [ONBOARDING] Error storing custom event tokens:', error);
          }
        }
        
        setTimeout(() => {
          const connected = ebayOAuthService.isAuthenticated();
          console.log('🔍 [ONBOARDING] Auth status after custom event:', connected);
          if (connected) {
            setIsEbayConnected(true);
            setIsConnecting(false);
            if (currentStep === 'connect_ebay') {
              setTimeout(() => onStepChange('upload_photos'), 300);
            }
          }
        }, 100);
      }
    };

    // Check for direct window property (Method 5 from callback)
    const checkWindowProperty = () => {
      if (window.ebayAuthResult && window.ebayAuthResult.success) {
        console.log('🏠 [ONBOARDING] Window property auth result found!');
        
        if (window.ebayAuthResult.tokens) {
          try {
            const tokens = window.ebayAuthResult.tokens;
            localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokens));
            localStorage.setItem('ebay_manual_token', tokens.access_token);
            console.log('✅ [ONBOARDING] Tokens stored from window property');
          } catch (error) {
            console.error('❌ [ONBOARDING] Error storing window property tokens:', error);
          }
        }
        
        // Clean up the property
        delete window.ebayAuthResult;
        
        setTimeout(() => {
          const connected = ebayOAuthService.isAuthenticated();
          if (connected) {
            setIsEbayConnected(true);
            setIsConnecting(false);
            if (currentStep === 'connect_ebay') {
              setTimeout(() => onStepChange('upload_photos'), 300);
            }
          }
        }, 100);
      }
    };

    // Poll for window property periodically
    const windowPropertyInterval = setInterval(checkWindowProperty, 500);

    // Register all event listeners
    window.addEventListener('message', handleMessage);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageEvent);
    
    // Register custom event listeners
    const customEvents = ['ebayAuthChanged', 'ebayTokenDetected', 'oauthSuccess', 'ebayOAuthComplete', 'ebayAuthenticationConfirmed'];
    customEvents.forEach(eventType => {
      window.addEventListener(eventType as any, handleCustomEvents);
    });

    return () => {
      cleanup();
      
      // Clean up all event listeners
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageEvent);
      
      // Clean up custom event listeners
      customEvents.forEach(eventType => {
        window.removeEventListener(eventType as any, handleCustomEvents);
      });
      
      // Clean up window property polling
      clearInterval(windowPropertyInterval);
      
      // Clean up BroadcastChannel
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcastMessage);
        broadcastChannel.close();
      }
      
      console.log('🧹 [ONBOARDING] All event listeners cleaned up');
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

  const handleManualAuthCheck = () => {
    console.log('🔍 [ONBOARDING] Manual authentication check initiated');
    debugConsole.log('🔍 Manual authentication check initiated', 'info', 'manual-check');
    debugConsole.updateStatus('Checking for authentication...');
    
    // Check all possible token locations
    let tokensFound = false;
    
    // 1. Check for beacon
    try {
      const beacon = localStorage.getItem('ebay_oauth_beacon');
      if (beacon) {
        const beaconData = JSON.parse(beacon);
        if (beaconData.tokens) {
          console.log('✅ [ONBOARDING] Found tokens in beacon during manual check');
          debugConsole.log('✅ Found tokens in beacon!', 'success', 'manual-beacon');
          
          // Store the tokens
          localStorage.setItem('ebay_oauth_tokens', JSON.stringify(beaconData.tokens));
          localStorage.setItem('ebay_manual_token', beaconData.tokens.access_token);
          localStorage.removeItem('ebay_oauth_beacon');
          tokensFound = true;
        }
      }
    } catch (e) {
      console.error('❌ [ONBOARDING] Error checking beacon:', e);
    }
    
    // 2. Check if tokens are already stored
    if (!tokensFound) {
      tokensFound = ebayOAuthService.isAuthenticated();
      if (tokensFound) {
        console.log('✅ [ONBOARDING] Tokens found in storage during manual check');
        debugConsole.log('✅ Tokens found in storage!', 'success', 'manual-storage');
      }
    }
    
    // 3. Check URL parameters
    if (!tokensFound) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('ebay_connected') === 'true') {
        console.log('✅ [ONBOARDING] Success parameter found during manual check');
        debugConsole.log('✅ Success parameter found!', 'success', 'manual-url');
        
        // Clean URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('ebay_connected');
        newUrl.searchParams.delete('timestamp');
        window.history.replaceState({}, '', newUrl.toString());
        
        // Check tokens again after a short delay
        setTimeout(() => {
          tokensFound = ebayOAuthService.isAuthenticated();
          if (tokensFound) {
            setIsEbayConnected(true);
            setShowManualCheck(false);
            debugConsole.log('✅ Authentication confirmed!', 'success', 'manual-confirmed');
            debugConsole.updateStatus('Authentication successful!');
          }
        }, 500);
        return;
      }
    }
    
    if (tokensFound) {
      setIsEbayConnected(true);
      setShowManualCheck(false);
      debugConsole.log('✅ Authentication confirmed!', 'success', 'manual-confirmed');
      debugConsole.updateStatus('Authentication successful!');
      
      if (currentStep === 'connect_ebay') {
        setTimeout(() => onStepChange('upload_photos'), 500);
      }
    } else {
      debugConsole.log('❌ No authentication found', 'error', 'manual-notfound');
      debugConsole.updateStatus('No authentication found - please try connecting again');
      alert('No authentication found. Please try connecting to eBay again.');
      setShowManualCheck(false);
    }
  };

  const handleConnectEbay = async () => {
    console.log('🔗 [ONBOARDING] Starting eBay connection process...');
    debugConsole.log('Starting eBay OAuth connection process...', 'info', 'oauth-start');
    debugConsole.updateStatus('Initiating OAuth flow...');
    
    // Reset any previous error states
    setIsConnecting(true);
    setShowManualCheck(false);
    
    try {
      console.log('🌐 [ONBOARDING] Calling OAuth service to initiate flow...');
      debugConsole.log('Requesting OAuth authorization URL from server...', 'info', 'oauth-init');
      
      // Use the current dashboard URL as redirect
      const redirectUri = `${window.location.origin}/app`;
      
      // CRITICAL: Only proceed if OAuth initiation succeeds
      await ebayOAuthService.initiateOAuthFlow(redirectUri);
      
      console.log('✅ [ONBOARDING] OAuth flow initiated successfully - popup should be open');
      console.log('⏳ [ONBOARDING] Starting token polling for popup completion...');
      debugConsole.log('OAuth popup window opened successfully!', 'success', 'popup');
      debugConsole.updateStatus('Waiting for user authentication...');
      
      // Enhanced multi-stage token polling - ONLY starts if OAuth initiation succeeded
      let checkCount = 0;
      const maxChecks = 240; // 2 minutes with varied intervals
      let pollingActive = true;
      
      const performTokenPolling = () => {
        if (!pollingActive) {
          console.log('🛑 [ONBOARDING] Polling stopped by external signal');
          return;
        }
        
        checkCount++;
        
        // Check multiple sources for authentication success
        const connected = ebayOAuthService.isAuthenticated();
        
        // Check for success beacon from callback page
        let beaconFound = false;
        try {
          const beacon = localStorage.getItem('ebay_oauth_beacon');
          if (beacon) {
            const beaconData = JSON.parse(beacon);
            // Check if beacon is fresh (within last 5 minutes)
            if (beaconData.timestamp && (Date.now() - beaconData.timestamp) < 300000) {
              beaconFound = true;
              console.log('🎯 [ONBOARDING] Success beacon detected!', beaconData);
              debugConsole.log('🎯 Success beacon found! Processing tokens...', 'success', 'beacon');
              
              // Clean up beacon
              localStorage.removeItem('ebay_oauth_beacon');
              
              // If beacon has tokens but they're not in regular storage, store them
              if (beaconData.tokens && !connected) {
                try {
                  localStorage.setItem('ebay_oauth_tokens', JSON.stringify(beaconData.tokens));
                  localStorage.setItem('ebay_manual_token', beaconData.tokens.access_token);
                  console.log('✅ [ONBOARDING] Tokens extracted from beacon and stored');
                  debugConsole.log('✅ Tokens extracted from beacon and stored', 'success', 'beacon-store');
                } catch (e) {
                  console.error('❌ [ONBOARDING] Failed to store beacon tokens:', e);
                }
              }
            }
          }
        } catch (e) {
          // Beacon check failed, continue with normal polling
        }
        
        // Check for URL parameter indicating success
        const urlParams = new URLSearchParams(window.location.search);
        const hasSuccessParam = urlParams.get('ebay_connected') === 'true';
        if (hasSuccessParam) {
          console.log('🔗 [ONBOARDING] Success URL parameter detected during polling');
          debugConsole.log('🔗 Success URL parameter detected!', 'success', 'url-param');
          
          // Clean URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('ebay_connected');
          newUrl.searchParams.delete('timestamp');
          window.history.replaceState({}, '', newUrl.toString());
        }
        
        // Consider authentication successful if ANY method detects it
        const authDetected = connected || beaconFound || hasSuccessParam;
        
        console.log(`⏱️ [ONBOARDING] Token poll ${checkCount}/${maxChecks}: connected=${connected}, beacon=${beaconFound}, url=${hasSuccessParam}`);
        debugConsole.log(`Token poll ${checkCount}/${maxChecks}: ${authDetected ? 'FOUND!' : 'No tokens yet'} (auth=${connected}, beacon=${beaconFound}, url=${hasSuccessParam})`, authDetected ? 'success' : 'info', 'polling');
        
        if (authDetected) {
          console.log('🎉 [ONBOARDING] Authentication detected during polling!');
          debugConsole.log('🎉 AUTHENTICATION SUCCESSFUL! Tokens detected', 'success', 'auth-success');
          debugConsole.updateStatus('Authentication completed successfully!');
          pollingActive = false;
          setIsEbayConnected(true);
          setIsConnecting(false);
          
          // Force one more auth check to ensure state is updated
          setTimeout(() => {
            const finalCheck = ebayOAuthService.isAuthenticated();
            if (finalCheck) {
              setIsEbayConnected(true);
            }
          }, 100);
          
          if (currentStep === 'connect_ebay') {
            setTimeout(() => onStepChange('upload_photos'), 500);
          }
          return; // Stop polling
        }
        
        if (checkCount >= maxChecks) {
          console.log('⏱️ [ONBOARDING] Token polling timeout reached - stopping polling');
          debugConsole.log('❌ Authentication timeout - showing manual check option', 'error', 'timeout');
          debugConsole.updateStatus('Authentication timed out - manual check available');
          pollingActive = false;
          setIsConnecting(false);
          
          // Show manual check button instead of alert
          setShowManualCheck(true);
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
      
      // Start polling only after successful OAuth initiation
      setTimeout(performTokenPolling, 100);
      
      // Store polling control for cleanup
      (window as any).ebayPollingActive = pollingActive;
      
    } catch (error: any) {
      console.error('❌ [ONBOARDING] CRITICAL ERROR in eBay connection:', {
        error: error.message,
        category: error.category,
        canRetry: error.canRetry,
        originalError: error.originalError?.message,
        timestamp: new Date().toISOString()
      });
      
      debugConsole.log(`❌ OAuth Error: ${error.message}`, 'error', 'oauth-error');
      debugConsole.updateStatus(`Error: ${error.category || 'Unknown error'}`);
      
      // Stop connecting state immediately on error
      setIsConnecting(false);
      
      // Enhanced error handling with categorized responses
      const errorCategory = error.category || 'unknown';
      const canRetry = error.canRetry !== false; // Default to true unless explicitly false
      
      let alertMessage = '';
      let retryGuidance = '';
      
      switch (errorCategory) {
        case 'popup_blocked':
          alertMessage = '🚫 Authentication Window Blocked\n\n' +
                        'Your browser blocked the eBay login window. To fix this:\n\n' +
                        '1. Look for a popup blocker icon in your address bar\n' +
                        '2. Click it and select "Always allow popups from this site"\n' +
                        '3. Or check your browser settings to allow popups\n' +
                        '4. Then try connecting again';
          retryGuidance = 'After allowing popups, click "Connect to eBay" again.';
          break;
          
        case 'network_error':
          alertMessage = '🌐 Network Connection Error\n\n' +
                        'Could not connect to eBay servers. Please:\n\n' +
                        '1. Check your internet connection\n' +
                        '2. Try refreshing the page\n' +
                        '3. If the problem persists, eBay services may be temporarily unavailable';
          retryGuidance = 'Try again in a few moments.';
          break;
          
        case 'auth_config_error':
          alertMessage = '⚙️ Configuration Error\n\n' +
                        'There\'s an issue with the eBay authentication setup.\n' +
                        'Please contact support if this error persists.';
          retryGuidance = 'You can try again, but if it keeps failing, please contact support.';
          break;
          
        case 'timeout_error':
          alertMessage = '⏱️ Request Timeout\n\n' +
                        'The connection to eBay timed out.\n' +
                        'This might be due to slow internet or server issues.';
          retryGuidance = 'Please try connecting again.';
          break;
          
        default:
          alertMessage = '❌ Connection Failed\n\n' +
                        `Error: ${error.message}\n\n` +
                        'Please try connecting again.';
          retryGuidance = 'If the problem persists, please contact support.';
          break;
      }
      
      // Show categorized error message to user
      const fullMessage = canRetry 
        ? `${alertMessage}\n\n${retryGuidance}`
        : `${alertMessage}\n\nPlease contact support for assistance.`;
        
      alert(fullMessage);
      
      // Log retry guidance for debugging
      console.log('🔄 [ONBOARDING] Error Recovery:', {
        category: errorCategory,
        canRetry,
        retryGuidance
      });
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

      {/* Manual Authentication Check Button */}
      {showManualCheck && !isEbayConnected && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Authentication May Have Completed
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                The authentication window may have closed. Click below to check if your eBay account was successfully connected.
              </p>
              <button
                onClick={handleManualAuthCheck}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Check Authentication Status
              </button>
            </div>
          </div>
        </div>
      )}

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