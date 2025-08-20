/**
 * eBay OAuth2 Controller using hendt/ebay-api library
 * Provides initiate, callback, and status endpoints with comprehensive error handling
 */

import { Request, Response, NextFunction } from 'express';
import { eBayApi } from 'ebay-api';
import { oauthConfig } from '../config/oauth-config';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

interface OAuthState {
  sessionId: string;
  userId?: string;
  returnUrl?: string;
  timestamp: number;
  csrfToken: string;
}

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  expires_at: number;
}

interface AuthSession {
  sessionId: string;
  userId?: string;
  ebayApi: eBayApi;
  state: OAuthState;
  tokens?: TokenData;
}

class EBayAuthController {
  private sessions: Map<string, AuthSession> = new Map();
  private tokenStorage: Map<string, TokenData> = new Map();
  private config = oauthConfig.getEBayApiConfig();
  private securityConfig = oauthConfig.getSecurityConfig();

  constructor() {
    console.log('🏗️ [EBAY-AUTH-CONTROLLER] Initializing with config:', {
      sandbox: this.config.sandbox,
      hasAppId: !!this.config.appId,
      hasCertId: !!this.config.certId,
      hasRuName: !!this.config.ruName,
      scopeCount: this.config.scopes?.length || 0
    });

    // Clean up expired sessions every 15 minutes
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 15 * 60 * 1000);
  }

  /**
   * Initiate OAuth2 flow
   * GET /auth/ebay/initiate
   */
  async initiateAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('🚀 [EBAY-AUTH] Initiating OAuth flow...');
      
      const sessionId = uuidv4();
      const csrfToken = uuidv4();
      const returnUrl = req.query.returnUrl as string || req.headers.referer || '/dashboard';
      const userId = req.user?.id; // If user is logged in

      // Create eBay API instance
      const ebayApiInstance = new eBayApi({
        appId: this.config.appId,
        certId: this.config.certId,
        devId: this.config.devId,
        sandbox: this.config.sandbox,
        siteId: this.config.siteId,
        ruName: this.config.ruName,
      });

      // Set OAuth2 scopes
      ebayApiInstance.OAuth2.setScope(this.config.scopes);

      // Create state object
      const state: OAuthState = {
        sessionId,
        userId,
        returnUrl,
        timestamp: Date.now(),
        csrfToken
      };

      // Store session
      const session: AuthSession = {
        sessionId,
        userId,
        ebayApi: ebayApiInstance,
        state
      };
      
      this.sessions.set(sessionId, session);

      // Generate authorization URL with state
      const stateToken = this.encodeState(state);
      const authUrl = ebayApiInstance.OAuth2.generateAuthUrl(stateToken);

      console.log('✅ [EBAY-AUTH] Authorization URL generated:', {
        sessionId,
        authUrlDomain: new URL(authUrl).hostname,
        scopes: this.config.scopes?.length,
        returnUrl
      });

      // Set secure session cookie
      res.cookie('ebay_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 60 * 1000, // 30 minutes
        path: '/'
      });

      res.json({
        success: true,
        data: {
          authUrl,
          sessionId,
          csrfToken,
          expiresIn: 30 * 60 * 1000 // 30 minutes
        },
        message: 'Authorization URL generated successfully'
      });
    } catch (error) {
      console.error('❌ [EBAY-AUTH] Error initiating auth:', error);
      next(this.createError(error, 'AUTH_INITIATE_FAILED', 500));
    }
  }

  /**
   * Handle OAuth2 callback
   * GET/POST /auth/ebay/callback
   */
  async handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('🔄 [EBAY-AUTH] Processing OAuth callback...');
      
      const { code, state: stateToken, error: oauthError } = req.query;
      const sessionId = req.cookies.ebay_session;

      // Check for OAuth errors
      if (oauthError) {
        throw new Error(`OAuth error from eBay: ${oauthError}`);
      }

      if (!code || !stateToken) {
        throw new Error('Missing required OAuth parameters (code or state)');
      }

      if (!sessionId) {
        throw new Error('Missing session identifier');
      }

      // Validate and decode state
      const state = this.decodeState(stateToken as string);
      const session = this.sessions.get(sessionId);

      if (!session) {
        throw new Error('Invalid or expired session');
      }

      if (session.state.sessionId !== state.sessionId) {
        throw new Error('State mismatch - potential CSRF attack');
      }

      // Check state expiry (30 minutes max)
      const stateAge = Date.now() - state.timestamp;
      if (stateAge > 30 * 60 * 1000) {
        this.sessions.delete(sessionId);
        throw new Error('OAuth state expired');
      }

      console.log('✅ [EBAY-AUTH] State validation passed');

      // Exchange code for token
      const tokenResponse = await session.ebayApi.OAuth2.getToken(code as string);
      
      const tokenData: TokenData = {
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_in: tokenResponse.expires_in,
        token_type: tokenResponse.token_type,
        scope: tokenResponse.scope,
        expires_at: Date.now() + (tokenResponse.expires_in * 1000)
      };

      // Store tokens
      const tokenKey = this.generateTokenKey(sessionId, state.userId);
      this.tokenStorage.set(tokenKey, tokenData);
      session.tokens = tokenData;

      console.log('✅ [EBAY-AUTH] Token exchange successful:', {
        sessionId,
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        scopes: tokenData.scope
      });

      // Generate success response
      const successToken = jwt.sign({
        sessionId,
        userId: state.userId,
        timestamp: Date.now(),
        type: 'oauth_success'
      }, this.securityConfig.jwtSecret, { expiresIn: '5m' });

      // Clear session cookie
      res.clearCookie('ebay_session');

      // Determine response format based on request
      const isApiRequest = req.headers['content-type']?.includes('application/json') || 
                          req.headers.accept?.includes('application/json');

      if (isApiRequest) {
        // API response
        res.json({
          success: true,
          data: {
            tokens: tokenData,
            sessionId,
            userId: state.userId
          },
          message: 'eBay authentication successful'
        });
      } else {
        // Browser redirect with success parameters
        const returnUrl = new URL(state.returnUrl || '/dashboard', req.protocol + '://' + req.get('host'));
        returnUrl.searchParams.set('ebay_connected', 'true');
        returnUrl.searchParams.set('success_token', successToken);
        returnUrl.searchParams.set('timestamp', Date.now().toString());

        // Send success page with auto-redirect
        res.send(this.generateCallbackSuccessPage(returnUrl.toString(), tokenData));
      }

      // Clean up session after delay
      setTimeout(() => {
        this.sessions.delete(sessionId);
      }, 5 * 60 * 1000); // 5 minutes

    } catch (error) {
      console.error('❌ [EBAY-AUTH] Callback error:', error);
      
      // Determine response format
      const isApiRequest = req.headers['content-type']?.includes('application/json') || 
                          req.headers.accept?.includes('application/json');
      
      if (isApiRequest) {
        next(this.createError(error, 'OAUTH_CALLBACK_FAILED', 400));
      } else {
        // Browser redirect with error
        const returnUrl = req.query.state ? 
          this.decodeState(req.query.state as string).returnUrl || '/dashboard' : '/dashboard';
        const errorUrl = new URL(returnUrl, req.protocol + '://' + req.get('host'));
        errorUrl.searchParams.set('ebay_error', 'true');
        errorUrl.searchParams.set('error_message', error.message);
        
        res.send(this.generateCallbackErrorPage(errorUrl.toString(), error.message));
      }
    }
  }

  /**
   * Get authentication status
   * GET /auth/ebay/status
   */
  async getAuthStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const sessionId = req.query.sessionId as string || req.cookies.ebay_session;

      let tokenData: TokenData | null = null;
      let isAuthenticated = false;

      // Check for active tokens
      if (userId || sessionId) {
        const tokenKey = this.generateTokenKey(sessionId, userId);
        tokenData = this.tokenStorage.get(tokenKey) || null;
        
        if (tokenData) {
          // Check if token is expired
          isAuthenticated = Date.now() < tokenData.expires_at;
          
          if (!isAuthenticated && tokenData.refresh_token) {
            // Try to refresh token
            try {
              const refreshedTokens = await this.refreshToken(tokenKey, tokenData.refresh_token);
              tokenData = refreshedTokens;
              isAuthenticated = true;
            } catch (refreshError) {
              console.warn('⚠️ [EBAY-AUTH] Token refresh failed:', refreshError);
              this.tokenStorage.delete(tokenKey);
              tokenData = null;
            }
          }
        }
      }

      const status = {
        isAuthenticated,
        hasTokens: !!tokenData,
        tokenExpiry: tokenData?.expires_at ? new Date(tokenData.expires_at).toISOString() : null,
        scopes: tokenData?.scope?.split(' ') || [],
        environment: this.config.sandbox ? 'sandbox' : 'production',
        lastChecked: new Date().toISOString()
      };

      console.log('🔍 [EBAY-AUTH] Auth status check:', {
        userId,
        sessionId: sessionId?.substring(0, 8) + '...',
        isAuthenticated,
        hasTokens: !!tokenData,
        tokenExpiry: status.tokenExpiry
      });

      res.json({
        success: true,
        data: status,
        message: `Authentication status: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`
      });
    } catch (error) {
      console.error('❌ [EBAY-AUTH] Error checking status:', error);
      next(this.createError(error, 'AUTH_STATUS_FAILED', 500));
    }
  }

  /**
   * Refresh access token
   * POST /auth/ebay/refresh
   */
  async refreshAccessToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refresh_token, sessionId } = req.body;
      const userId = req.user?.id;

      if (!refresh_token) {
        throw new Error('Refresh token is required');
      }

      const tokenKey = this.generateTokenKey(sessionId, userId);
      const newTokens = await this.refreshToken(tokenKey, refresh_token);

      res.json({
        success: true,
        data: {
          access_token: newTokens.access_token,
          expires_in: newTokens.expires_in,
          token_type: newTokens.token_type,
          expires_at: newTokens.expires_at
        },
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      console.error('❌ [EBAY-AUTH] Token refresh error:', error);
      next(this.createError(error, 'TOKEN_REFRESH_FAILED', 400));
    }
  }

  /**
   * Revoke tokens and sign out
   * POST /auth/ebay/revoke
   */
  async revokeTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.body;
      const userId = req.user?.id;

      const tokenKey = this.generateTokenKey(sessionId, userId);
      const tokenData = this.tokenStorage.get(tokenKey);

      if (tokenData) {
        // Create eBay API instance for revocation
        const ebayApiInstance = new eBayApi({
          appId: this.config.appId,
          certId: this.config.certId,
          devId: this.config.devId,
          sandbox: this.config.sandbox,
          siteId: this.config.siteId,
          ruName: this.config.ruName,
        });

        try {
          // Revoke token on eBay side
          await ebayApiInstance.OAuth2.revokeToken(tokenData.access_token);
          console.log('✅ [EBAY-AUTH] Token revoked on eBay');
        } catch (revokeError) {
          console.warn('⚠️ [EBAY-AUTH] eBay token revocation failed:', revokeError);
        }

        // Remove from local storage
        this.tokenStorage.delete(tokenKey);
      }

      // Clean up any related sessions
      for (const [sessionId, session] of this.sessions) {
        if (session.userId === userId) {
          this.sessions.delete(sessionId);
        }
      }

      res.clearCookie('ebay_session');

      res.json({
        success: true,
        message: 'Tokens revoked and session cleared'
      });
    } catch (error) {
      console.error('❌ [EBAY-AUTH] Token revocation error:', error);
      next(this.createError(error, 'TOKEN_REVOKE_FAILED', 500));
    }
  }

  /**
   * Get valid access token for API calls
   */
  async getValidToken(sessionId?: string, userId?: string): Promise<string | null> {
    const tokenKey = this.generateTokenKey(sessionId, userId);
    let tokenData = this.tokenStorage.get(tokenKey);

    if (!tokenData) {
      return null;
    }

    // Check if token is expired
    if (Date.now() >= tokenData.expires_at) {
      if (tokenData.refresh_token) {
        try {
          tokenData = await this.refreshToken(tokenKey, tokenData.refresh_token);
        } catch (error) {
          console.error('❌ [EBAY-AUTH] Auto token refresh failed:', error);
          this.tokenStorage.delete(tokenKey);
          return null;
        }
      } else {
        this.tokenStorage.delete(tokenKey);
        return null;
      }
    }

    return tokenData.access_token;
  }

  // Private helper methods

  private encodeState(state: OAuthState): string {
    return jwt.sign(state, this.securityConfig.jwtSecret, { expiresIn: '30m' });
  }

  private decodeState(stateToken: string): OAuthState {
    try {
      return jwt.verify(stateToken, this.securityConfig.jwtSecret) as OAuthState;
    } catch (error) {
      throw new Error('Invalid state token');
    }
  }

  private generateTokenKey(sessionId?: string, userId?: string): string {
    return `${userId || 'anonymous'}:${sessionId || 'global'}`;
  }

  private async refreshToken(tokenKey: string, refreshToken: string): Promise<TokenData> {
    const ebayApiInstance = new eBayApi({
      appId: this.config.appId,
      certId: this.config.certId,
      devId: this.config.devId,
      sandbox: this.config.sandbox,
      siteId: this.config.siteId,
      ruName: this.config.ruName,
    });

    const tokenResponse = await ebayApiInstance.OAuth2.refreshToken(refreshToken);
    
    const newTokenData: TokenData = {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token || refreshToken,
      expires_in: tokenResponse.expires_in,
      token_type: tokenResponse.token_type,
      scope: tokenResponse.scope,
      expires_at: Date.now() + (tokenResponse.expires_in * 1000)
    };

    this.tokenStorage.set(tokenKey, newTokenData);
    console.log('✅ [EBAY-AUTH] Token refreshed successfully');
    
    return newTokenData;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedSessions = 0;
    let cleanedTokens = 0;

    // Clean expired sessions
    for (const [sessionId, session] of this.sessions) {
      if (now - session.state.timestamp > 30 * 60 * 1000) { // 30 minutes
        this.sessions.delete(sessionId);
        cleanedSessions++;
      }
    }

    // Clean expired tokens
    for (const [tokenKey, tokenData] of this.tokenStorage) {
      if (now >= tokenData.expires_at && !tokenData.refresh_token) {
        this.tokenStorage.delete(tokenKey);
        cleanedTokens++;
      }
    }

    if (cleanedSessions > 0 || cleanedTokens > 0) {
      console.log(`🧹 [EBAY-AUTH] Cleanup complete: ${cleanedSessions} sessions, ${cleanedTokens} tokens`);
    }
  }

  private createError(error: any, code: string, status: number) {
    const err = new Error(error.message || 'OAuth operation failed');
    (err as any).status = status;
    (err as any).code = code;
    (err as any).originalError = error;
    return err;
  }

  private generateCallbackSuccessPage(returnUrl: string, tokenData: TokenData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBay Authentication Success</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
        .success { color: #28a745; }
        .loading { color: #6c757d; }
    </style>
</head>
<body>
    <div class="success">
        <h1>✅ eBay Authentication Successful!</h1>
        <p>Your eBay account has been connected successfully.</p>
        <p class="loading">Redirecting you back to the application...</p>
    </div>
    <script>
        // Store tokens in localStorage for the app
        try {
            const tokens = ${JSON.stringify(tokenData)};
            localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokens));
            localStorage.setItem('ebay_manual_token', tokens.access_token);
            
            // Notify parent window if in popup
            if (window.opener) {
                window.opener.postMessage({
                    type: 'EBAY_OAUTH_SUCCESS',
                    tokens: tokens,
                    timestamp: Date.now()
                }, window.location.origin);
            }
            
            // Use BroadcastChannel for cross-tab communication
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel('ebay-oauth-popup');
                channel.postMessage({
                    type: 'EBAY_OAUTH_SUCCESS',
                    tokens: tokens,
                    timestamp: Date.now()
                });
                channel.close();
            }
        } catch (e) {
            console.error('Error storing tokens:', e);
        }
        
        // Redirect after 2 seconds
        setTimeout(() => {
            window.location.href = '${returnUrl}';
        }, 2000);
    </script>
</body>
</html>`;
  }

  private generateCallbackErrorPage(returnUrl: string, errorMessage: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eBay Authentication Error</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
        .error { color: #dc3545; }
        .loading { color: #6c757d; }
    </style>
</head>
<body>
    <div class="error">
        <h1>❌ eBay Authentication Failed</h1>
        <p>There was an error connecting your eBay account:</p>
        <p><strong>${errorMessage}</strong></p>
        <p class="loading">Redirecting you back to try again...</p>
    </div>
    <script>
        // Notify parent window if in popup
        if (window.opener) {
            window.opener.postMessage({
                type: 'EBAY_OAUTH_ERROR',
                error: '${errorMessage}',
                timestamp: Date.now()
            }, window.location.origin);
        }
        
        // Redirect after 3 seconds
        setTimeout(() => {
            window.location.href = '${returnUrl}';
        }, 3000);
    </script>
</body>
</html>`;
  }
}

export default new EBayAuthController();