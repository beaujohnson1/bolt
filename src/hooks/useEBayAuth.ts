import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * React hook for eBay authentication with hendt/ebay-api
 */
export const useEBayAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    provider: 'ebay',
    scopes: []
  });

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  /**
   * Check if user has valid eBay tokens
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthenticated(false);
        setConnectionStatus({
          connected: false,
          provider: 'ebay',
          scopes: []
        });
        return;
      }

      // Check for valid tokens
      const response = await fetch(`/.netlify/functions/ebay-api-oauth/status?userId=${user.id}`);
      const data = await response.json();

      setIsAuthenticated(data.connected);
      setConnectionStatus(data);
      
    } catch (err) {
      console.error('Auth status check failed:', err);
      setError('Failed to check authentication status');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initiate OAuth flow
   */
  const initiateOAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get auth URL from backend
      const response = await fetch(`/.netlify/functions/ebay-api-oauth/auth-url?userId=${user.id}`);
      const data = await response.json();

      if (!data.success || !data.authUrl) {
        throw new Error('Failed to generate authorization URL');
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        'ebay-oauth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for OAuth completion
      return new Promise<void>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkInterval);
            checkAuthStatus().then(() => resolve());
          }
        }, 1000);

        // Also listen for postMessage from popup
        const handleMessage = (event: MessageEvent) => {
          if (event.data.type === 'EBAY_OAUTH_SUCCESS') {
            window.removeEventListener('message', handleMessage);
            clearInterval(checkInterval);
            popup.close();
            
            // Store tokens and update status
            checkAuthStatus().then(() => resolve());
          } else if (event.data.type === 'EBAY_OAUTH_ERROR') {
            window.removeEventListener('message', handleMessage);
            clearInterval(checkInterval);
            popup.close();
            reject(new Error(event.data.error || 'OAuth failed'));
          }
        };

        window.addEventListener('message', handleMessage);

        // Timeout after 5 minutes
        setTimeout(() => {
          window.removeEventListener('message', handleMessage);
          clearInterval(checkInterval);
          if (!popup.closed) {
            popup.close();
          }
          reject(new Error('OAuth timeout'));
        }, 300000);
      });

    } catch (err: any) {
      console.error('OAuth initiation failed:', err);
      setError(err.message || 'Failed to initiate OAuth');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [checkAuthStatus]);

  /**
   * Disconnect eBay account
   */
  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call disconnect endpoint
      const response = await fetch('/.netlify/functions/ebay-api-oauth/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to disconnect eBay account');
      }

      setIsAuthenticated(false);
      setConnectionStatus({
        connected: false,
        provider: 'ebay',
        scopes: []
      });

    } catch (err: any) {
      console.error('Disconnect failed:', err);
      setError(err.message || 'Failed to disconnect');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh access token
   */
  const refreshToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call refresh endpoint
      const response = await fetch('/.netlify/functions/ebay-api-oauth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to refresh token');
      }

      await checkAuthStatus();

    } catch (err: any) {
      console.error('Token refresh failed:', err);
      setError(err.message || 'Failed to refresh token');
      
      // If refresh fails, user needs to re-authenticate
      setIsAuthenticated(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [checkAuthStatus]);

  return {
    isAuthenticated,
    isLoading,
    error,
    connectionStatus,
    initiateOAuth,
    disconnect,
    refreshToken,
    checkAuthStatus
  };
};

// Type definitions
interface ConnectionStatus {
  connected: boolean;
  provider: string;
  scopes: string[];
}

export default useEBayAuth;