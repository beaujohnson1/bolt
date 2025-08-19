# OAuth Flow Fixes Implementation

## Critical Issues Identified

Based on the analysis, here are the primary issues causing the blank page after OAuth authentication:

### 1. Race Condition in Component State Updates
**Problem**: Multiple components listening for auth changes simultaneously with different timing delays.

**Evidence**:
- EbayAuthButton: 750ms delay
- ListingPreview: 100ms delay 
- OAuth service: 50ms delay for storage events
- Callback page: 500ms delay before redirect

**Impact**: Components may not receive auth state updates in the correct order.

### 2. Event Dispatch Timing Issues
**Problem**: Events fired before components are fully mounted or ready to receive them.

**Evidence**:
- Custom events dispatched in callback page before redirect
- Storage events manually triggered
- Components may mount after events are fired

### 3. URL Parameter Persistence
**Problem**: `ebay_connected=true` parameter remains in URL and triggers multiple checks.

**Evidence**:
- Multiple components check the same URL parameter
- No cleanup after successful processing
- Could cause infinite loops or state confusion

### 4. localStorage Synchronization Gaps
**Problem**: Rapid localStorage operations may not be immediately available to all components.

**Evidence**:
- Multiple localStorage keys set sequentially
- Cross-tab storage events used for same-tab communication
- Manual storage event dispatch indicates reliability issues

## Comprehensive Fix Implementation

### Fix 1: Centralized Auth State Manager

Create a robust auth state manager that eliminates race conditions:

```typescript
// src/contexts/EbayAuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import ebayOAuth from '../services/ebayOAuth';

interface EbayAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: any | null;
  error: string | null;
  lastChecked: number;
}

interface EbayAuthContextType extends EbayAuthState {
  refreshAuth: () => Promise<void>;
  clearAuth: () => void;
}

const EbayAuthContext = createContext<EbayAuthContextType | undefined>(undefined);

export const useEbayAuth = () => {
  const context = useContext(EbayAuthContext);
  if (!context) {
    throw new Error('useEbayAuth must be used within EbayAuthProvider');
  }
  return context;
};

export const EbayAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<EbayAuthState>({
    isAuthenticated: false,
    isLoading: true,
    tokens: null,
    error: null,
    lastChecked: 0
  });

  const refreshAuth = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const tokens = await ebayOAuth.getValidAccessToken();
      const isAuth = ebayOAuth.isAuthenticated();
      
      setAuthState({
        isAuthenticated: isAuth,
        isLoading: false,
        tokens,
        error: null,
        lastChecked: Date.now()
      });
      
      console.log('🔄 [EBAY-AUTH] Auth state refreshed:', { isAuth, hasTokens: !!tokens });
    } catch (error) {
      console.error('❌ [EBAY-AUTH] Auth refresh failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        lastChecked: Date.now()
      }));
    }
  }, []);

  const clearAuth = useCallback(() => {
    ebayOAuth.clearStoredTokens();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      tokens: null,
      error: null,
      lastChecked: Date.now()
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Initial auth check
    refreshAuth();
    
    // Set up single auth watcher
    const unwatch = ebayOAuth.watchForTokenChanges(async (authenticated) => {
      if (!mounted) return;
      
      console.log('🔄 [EBAY-AUTH] Token change detected:', authenticated);
      await refreshAuth();
    });

    // Check URL parameters once
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ebay_connected') === 'true') {
      console.log('🎉 [EBAY-AUTH] OAuth success detected, forcing refresh...');
      
      // Clean URL immediately
      const url = new URL(window.location.href);
      url.searchParams.delete('ebay_connected');
      url.searchParams.delete('timestamp');
      window.history.replaceState({}, '', url.toString());
      
      // Force refresh after small delay
      setTimeout(() => {
        if (mounted) refreshAuth();
      }, 1000);
    }

    return () => {
      mounted = false;
      unwatch();
    };
  }, [refreshAuth]);

  const value = {
    ...authState,
    refreshAuth,
    clearAuth
  };

  return (
    <EbayAuthContext.Provider value={value}>
      {children}
    </EbayAuthContext.Provider>
  );
};
```

### Fix 2: Improved Token Storage with Validation

Enhance the token storage mechanism with proper validation:

```typescript
// src/services/ebayOAuth.ts - Enhanced storeTokens method
private storeTokens(tokens: EbayOAuthTokens): void {
  try {
    console.log('💾 [EBAY-OAUTH] Storing tokens with validation...');
    
    // Validate token structure
    if (!tokens.access_token) {
      throw new Error('Invalid tokens: missing access_token');
    }
    
    // Calculate expiry if missing
    if (tokens.expires_in && !tokens.expires_at) {
      tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
    }
    
    const tokenString = JSON.stringify(tokens);
    
    // Atomic storage with validation
    const originalOAuth = localStorage.getItem('ebay_oauth_tokens');
    const originalManual = localStorage.getItem('ebay_manual_token');
    
    try {
      localStorage.setItem('ebay_oauth_tokens', tokenString);
      localStorage.setItem('ebay_manual_token', tokens.access_token);
      
      // Verify storage immediately
      const stored = localStorage.getItem('ebay_oauth_tokens');
      if (!stored || JSON.parse(stored).access_token !== tokens.access_token) {
        throw new Error('Token storage verification failed');
      }
      
      console.log('✅ [EBAY-OAUTH] Tokens stored and verified');
      
      // Use BroadcastChannel for reliable cross-component communication
      const channel = new BroadcastChannel('ebay-auth');
      channel.postMessage({
        type: 'AUTH_CHANGED',
        authenticated: true,
        tokens,
        timestamp: Date.now()
      });
      channel.close();
      
    } catch (storageError) {
      // Rollback on failure
      if (originalOAuth) localStorage.setItem('ebay_oauth_tokens', originalOAuth);
      else localStorage.removeItem('ebay_oauth_tokens');
      
      if (originalManual) localStorage.setItem('ebay_manual_token', originalManual);
      else localStorage.removeItem('ebay_manual_token');
      
      throw storageError;
    }
    
  } catch (error) {
    console.error('❌ [EBAY-OAUTH] Error storing tokens:', error);
    throw error;
  }
}
```

### Fix 3: Callback Page Improvements

Enhance the callback page for better reliability:

```javascript
// netlify/functions/auth-ebay-callback.cjs - Enhanced callback HTML
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>eBay Authentication Success</title>
  <script>
    console.log('🎉 [EBAY-CALLBACK] Processing OAuth tokens...');
    
    const tokenData = ${JSON.stringify(tokenData)};
    
    // Enhanced token storage with validation
    const storeTokensWithValidation = () => {
      try {
        // Validate token structure
        if (!tokenData.access_token || !tokenData.token_type) {
          throw new Error('Invalid token structure received');
        }
        
        // Calculate expiry
        if (tokenData.expires_in && !tokenData.expires_at) {
          tokenData.expires_at = Date.now() + (tokenData.expires_in * 1000);
        }
        
        // Store with atomic operation
        const tokenString = JSON.stringify(tokenData);
        localStorage.setItem('ebay_oauth_tokens', tokenString);
        localStorage.setItem('ebay_manual_token', tokenData.access_token);
        
        // Verify storage
        const verification = localStorage.getItem('ebay_oauth_tokens');
        if (!verification) {
          throw new Error('Token storage verification failed');
        }
        
        console.log('✅ [EBAY-CALLBACK] Tokens stored and verified');
        
        // Use BroadcastChannel for reliable communication
        if (typeof BroadcastChannel !== 'undefined') {
          const channel = new BroadcastChannel('ebay-auth');
          channel.postMessage({
            type: 'AUTH_CHANGED',
            authenticated: true,
            tokens: tokenData,
            source: 'callback',
            timestamp: Date.now()
          });
          channel.close();
        }
        
        // Legacy event support
        window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
          detail: { authenticated: true, tokens: tokenData, source: 'callback' }
        }));
        
        return true;
      } catch (error) {
        console.error('❌ [EBAY-CALLBACK] Token storage failed:', error);
        return false;
      }
    };
    
    // Store tokens and redirect
    if (storeTokensWithValidation()) {
      const returnUrl = localStorage.getItem('ebay_oauth_return_url') || '${baseUrl}/app';
      localStorage.removeItem('ebay_oauth_return_url');
      
      // Clean up return URL and add success parameter
      const url = new URL(returnUrl);
      url.searchParams.set('ebay_connected', 'true');
      url.searchParams.set('timestamp', Date.now().toString());
      
      console.log('🎯 [EBAY-CALLBACK] Redirecting to:', url.toString());
      
      // Redirect with delay to ensure all operations complete
      setTimeout(() => {
        window.location.href = url.toString();
      }, 750); // Increased delay for reliability
    } else {
      alert('Failed to store authentication tokens. Please try again.');
      window.location.href = '${baseUrl}/app?ebay_error=token_storage_failed';
    }
  </script>
</head>
<body>
  <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
    <h2>🎉 eBay Connected Successfully!</h2>
    <p>Storing your authentication tokens...</p>
    <div style="margin: 20px auto; width: 30px; height: 30px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
    <p>You will be redirected automatically.</p>
  </div>
  <style>
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</body>
</html>`;
```

### Fix 4: Enhanced Component Integration

Update components to use the centralized auth state:

```typescript
// src/components/EbayAuthButton.tsx - Simplified with context
import React from 'react';
import { Link2, CheckCircle, AlertCircle } from 'lucide-react';
import { useEbayAuth } from '../contexts/EbayAuthContext';
import ebayOAuth from '../services/ebayOAuth';

export const EbayAuthButton: React.FC<EbayAuthButtonProps> = ({ onAuthSuccess, className = '' }) => {
  const { isAuthenticated, isLoading, clearAuth } = useEbayAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && onAuthSuccess) {
      onAuthSuccess();
    }
  }, [isAuthenticated, onAuthSuccess]);

  const handleConnectEbay = async () => {
    setIsConnecting(true);
    try {
      clearAuth(); // Clear any existing tokens
      
      // Store current URL for return
      localStorage.setItem('ebay_oauth_return_url', window.location.href);
      
      // Initiate OAuth flow
      await ebayOAuth.initiateOAuthFlow();
    } catch (error) {
      console.error('❌ [EBAY-AUTH-BUTTON] OAuth initiation failed:', error);
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        <span className="text-sm text-gray-600">Checking eBay connection...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">eBay Connected</span>
        </div>
        <button
          onClick={clearAuth}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnectEbay}
      disabled={isConnecting}
      className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
    >
      {isConnecting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Link2 className="w-4 h-4" />
          <span>Connect eBay Account</span>
        </>
      )}
    </button>
  );
};
```

## Implementation Steps

1. **Implement EbayAuthContext** - Create centralized auth state management
2. **Update OAuth Service** - Add BroadcastChannel support and validation
3. **Enhance Callback Page** - Improve reliability with better error handling
4. **Update Components** - Use centralized context instead of direct service calls
5. **Add URL Cleanup** - Prevent parameter persistence issues
6. **Test Thoroughly** - Use debug tools to verify fixes

## Expected Outcomes

After implementing these fixes:

- ✅ Eliminates race conditions between components
- ✅ Ensures reliable token storage and retrieval
- ✅ Provides consistent auth state across all components
- ✅ Handles edge cases and error scenarios
- ✅ Improves user experience with loading states
- ✅ Enables proper debugging and monitoring