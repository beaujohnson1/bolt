/**
 * eBay Token Manager with Automatic Refresh and Error Recovery
 * Handles OAuth2 token lifecycle with robust error handling and fallback mechanisms
 */

const crypto = require('crypto');

class TokenError extends Error {
  constructor(message, type, statusCode = null, retryable = false) {
    super(message);
    this.name = 'TokenError';
    this.type = type;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.timestamp = new Date().toISOString();
  }
}

class EBayTokenManager {
  constructor(options = {}) {
    this.config = {
      // OAuth credentials
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      redirectUri: options.redirectUri,
      
      // Scopes
      scopes: options.scopes || [
        'https://api.ebay.com/oauth/api_scope/sell.marketing',
        'https://api.ebay.com/oauth/api_scope/sell.account',
        'https://api.ebay.com/oauth/api_scope/sell.inventory'
      ],
      
      // Token refresh settings
      refreshThreshold: options.refreshThreshold || 300, // 5 minutes before expiry
      autoRefresh: options.autoRefresh !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000,
      
      // Storage settings
      persistTokens: options.persistTokens !== false,
      tokenStoragePath: options.tokenStoragePath || './tokens.json',
      encryptTokens: options.encryptTokens !== false,
      encryptionKey: options.encryptionKey || this.generateEncryptionKey(),
      
      // Environment settings
      environment: options.environment || 'sandbox', // sandbox or production
      
      // Endpoints
      endpoints: {
        sandbox: {
          auth: 'https://auth.sandbox.ebay.com/oauth2/authorize',
          token: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
        },
        production: {
          auth: 'https://auth.ebay.com/oauth2/authorize',
          token: 'https://api.ebay.com/identity/v1/oauth2/token'
        }
      },
      
      ...options
    };

    // Token state
    this.tokens = {
      access_token: null,
      refresh_token: null,
      expires_at: null,
      token_type: 'Bearer',
      scope: null
    };

    // Refresh state
    this.refreshState = {
      isRefreshing: false,
      refreshPromise: null,
      lastRefreshAttempt: null,
      refreshRetries: 0
    };

    // Metrics
    this.metrics = {
      totalTokenRequests: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      tokenUsageCount: 0,
      averageRefreshTime: 0,
      lastRefreshTime: null
    };

    // Event listeners for token lifecycle
    this.eventListeners = new Map();

    // Queue for pending requests during refresh
    this.pendingRequests = [];

    // Initialize
    this.initialize();
  }

  /**
   * Initialize token manager
   */
  async initialize() {
    // Load persisted tokens if available
    if (this.config.persistTokens) {
      await this.loadPersistedTokens();
    }

    // Start auto-refresh monitoring
    if (this.config.autoRefresh) {
      this.startAutoRefreshMonitoring();
    }

    this.emit('initialized');
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(state = null) {
    const authUrl = this.config.endpoints[this.config.environment].auth;
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' ')
    });

    if (state) {
      params.append('state', state);
    }

    return `${authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(authorizationCode, state = null) {
    this.metrics.totalTokenRequests++;

    try {
      const tokenData = await this.requestTokens({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: this.config.redirectUri
      });

      await this.updateTokens(tokenData);
      
      this.emit('tokensObtained', { tokens: this.sanitizeTokensForLogging() });
      
      return this.tokens;

    } catch (error) {
      this.emit('tokenError', { error, operation: 'exchangeCode' });
      throw this.handleTokenError(error, 'TOKEN_EXCHANGE_FAILED');
    }
  }

  /**
   * Get valid access token (refreshing if necessary)
   */
  async getValidToken() {
    // Check if we have a token
    if (!this.tokens.access_token) {
      throw new TokenError('No access token available', 'NO_TOKEN');
    }

    // Check if token is expired or about to expire
    if (this.isTokenExpiredOrExpiring()) {
      if (this.tokens.refresh_token) {
        await this.refreshAccessToken();
      } else {
        throw new TokenError('Token expired and no refresh token available', 'TOKEN_EXPIRED');
      }
    }

    this.metrics.tokenUsageCount++;
    return this.tokens.access_token;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshState.isRefreshing) {
      return this.refreshState.refreshPromise;
    }

    this.refreshState.isRefreshing = true;
    this.refreshState.lastRefreshAttempt = Date.now();
    
    const refreshPromise = this.performTokenRefresh();
    this.refreshState.refreshPromise = refreshPromise;

    try {
      const result = await refreshPromise;
      this.refreshState.refreshRetries = 0;
      return result;
    } catch (error) {
      this.refreshState.refreshRetries++;
      throw error;
    } finally {
      this.refreshState.isRefreshing = false;
      this.refreshState.refreshPromise = null;
      
      // Process any pending requests
      this.processPendingRequests();
    }
  }

  /**
   * Perform the actual token refresh with retry logic
   */
  async performTokenRefresh() {
    let lastError = null;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`Token refresh attempt ${attempt}/${this.config.maxRetries}`);

        const tokenData = await this.requestTokens({
          grant_type: 'refresh_token',
          refresh_token: this.tokens.refresh_token
        });

        await this.updateTokens(tokenData);
        
        // Update metrics
        this.metrics.successfulRefreshes++;
        const refreshTime = Date.now() - startTime;
        this.updateAverageRefreshTime(refreshTime);
        this.metrics.lastRefreshTime = new Date().toISOString();

        this.emit('tokenRefreshed', { 
          attempt, 
          refreshTime,
          tokens: this.sanitizeTokensForLogging() 
        });

        return this.tokens;

      } catch (error) {
        lastError = error;
        console.error(`Token refresh attempt ${attempt} failed:`, error.message);

        // Don't retry for certain error types
        if (!this.isRetryableTokenError(error)) {
          break;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await this.delay(delay);
        }
      }
    }

    this.metrics.failedRefreshes++;
    this.emit('tokenRefreshFailed', { error: lastError, attempts: this.config.maxRetries });
    
    throw this.handleTokenError(lastError, 'TOKEN_REFRESH_FAILED');
  }

  /**
   * Make token request to eBay OAuth endpoint
   */
  async requestTokens(tokenParams) {
    const tokenUrl = this.config.endpoints[this.config.environment].token;
    
    const credentials = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString('base64');

    const headers = {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };

    const body = new URLSearchParams(tokenParams).toString();

    try {
      // Using fetch (Node.js 18+) or can be replaced with axios
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers,
        body,
        timeout: 30000
      });

      if (!response.ok) {
        const errorData = await response.text();
        let parsedError;
        
        try {
          parsedError = JSON.parse(errorData);
        } catch {
          parsedError = { error: 'unknown_error', error_description: errorData };
        }

        throw new TokenError(
          parsedError.error_description || parsedError.error || 'Token request failed',
          parsedError.error || 'TOKEN_REQUEST_FAILED',
          response.status,
          response.status >= 500 || response.status === 429
        );
      }

      return await response.json();

    } catch (error) {
      if (error instanceof TokenError) {
        throw error;
      }
      
      throw new TokenError(
        `Network error during token request: ${error.message}`,
        'NETWORK_ERROR',
        null,
        true
      );
    }
  }

  /**
   * Update stored tokens with new token data
   */
  async updateTokens(tokenData) {
    // Calculate expiration time
    const expiresIn = tokenData.expires_in || 7200; // Default 2 hours
    const expiresAt = Date.now() + (expiresIn * 1000);

    // Update token state
    this.tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || this.tokens.refresh_token,
      expires_at: expiresAt,
      token_type: tokenData.token_type || 'Bearer',
      scope: tokenData.scope || this.tokens.scope
    };

    // Persist tokens if enabled
    if (this.config.persistTokens) {
      await this.persistTokens();
    }

    this.emit('tokensUpdated', { tokens: this.sanitizeTokensForLogging() });
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpiredOrExpiring() {
    if (!this.tokens.expires_at) {
      return true;
    }

    const threshold = this.config.refreshThreshold * 1000;
    return Date.now() >= (this.tokens.expires_at - threshold);
  }

  /**
   * Check if error is retryable
   */
  isRetryableTokenError(error) {
    if (error.retryable === false) {
      return false;
    }

    // Don't retry invalid client credentials
    if (error.type === 'invalid_client' || error.type === 'unauthorized_client') {
      return false;
    }

    // Don't retry invalid refresh token
    if (error.type === 'invalid_grant') {
      return false;
    }

    // Retry network errors and server errors
    return error.retryable === true || 
           error.type === 'NETWORK_ERROR' || 
           (error.statusCode && error.statusCode >= 500);
  }

  /**
   * Handle token errors with classification
   */
  handleTokenError(error, defaultType) {
    if (error instanceof TokenError) {
      return error;
    }

    return new TokenError(
      error.message || 'Unknown token error',
      defaultType,
      error.statusCode || error.status,
      error.retryable
    );
  }

  /**
   * Load persisted tokens from storage
   */
  async loadPersistedTokens() {
    try {
      const fs = require('fs').promises;
      const tokenData = await fs.readFile(this.config.tokenStoragePath, 'utf8');
      
      let parsedTokens;
      if (this.config.encryptTokens) {
        parsedTokens = this.decryptTokens(tokenData);
      } else {
        parsedTokens = JSON.parse(tokenData);
      }

      // Validate token structure
      if (parsedTokens && parsedTokens.access_token) {
        this.tokens = { ...this.tokens, ...parsedTokens };
        console.log('Loaded persisted tokens');
      }

    } catch (error) {
      console.log('No persisted tokens found or failed to load:', error.message);
    }
  }

  /**
   * Persist tokens to storage
   */
  async persistTokens() {
    try {
      const fs = require('fs').promises;
      
      let tokenData;
      if (this.config.encryptTokens) {
        tokenData = this.encryptTokens(this.tokens);
      } else {
        tokenData = JSON.stringify(this.tokens, null, 2);
      }

      await fs.writeFile(this.config.tokenStoragePath, tokenData, 'utf8');
      console.log('Tokens persisted to storage');

    } catch (error) {
      console.error('Failed to persist tokens:', error.message);
    }
  }

  /**
   * Encrypt tokens for secure storage
   */
  encryptTokens(tokens) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.config.encryptionKey);
    
    let encrypted = cipher.update(JSON.stringify(tokens), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    });
  }

  /**
   * Decrypt tokens from secure storage
   */
  decryptTokens(encryptedData) {
    const { encrypted, iv, authTag } = JSON.parse(encryptedData);
    const algorithm = 'aes-256-gcm';
    
    const decipher = crypto.createDecipher(algorithm, this.config.encryptionKey);
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Generate encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Sanitize tokens for logging (remove sensitive data)
   */
  sanitizeTokensForLogging() {
    return {
      expires_at: this.tokens.expires_at,
      token_type: this.tokens.token_type,
      scope: this.tokens.scope,
      has_access_token: !!this.tokens.access_token,
      has_refresh_token: !!this.tokens.refresh_token
    };
  }

  /**
   * Process pending requests after token refresh
   */
  processPendingRequests() {
    const requests = [...this.pendingRequests];
    this.pendingRequests.length = 0;

    requests.forEach(({ resolve, reject }) => {
      this.getValidToken()
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Queue request during token refresh
   */
  queueRequestDuringRefresh() {
    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ resolve, reject });
    });
  }

  /**
   * Start auto-refresh monitoring
   */
  startAutoRefreshMonitoring() {
    this.refreshMonitorTimer = setInterval(() => {
      if (this.tokens.access_token && 
          this.isTokenExpiredOrExpiring() && 
          !this.refreshState.isRefreshing &&
          this.tokens.refresh_token) {
        
        console.log('Auto-refreshing token');
        this.refreshAccessToken().catch(error => {
          console.error('Auto-refresh failed:', error.message);
          this.emit('autoRefreshFailed', { error });
        });
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop auto-refresh monitoring
   */
  stopAutoRefreshMonitoring() {
    if (this.refreshMonitorTimer) {
      clearInterval(this.refreshMonitorTimer);
    }
  }

  /**
   * Update average refresh time metric
   */
  updateAverageRefreshTime(refreshTime) {
    const successfulRefreshes = this.metrics.successfulRefreshes;
    const currentAverage = this.metrics.averageRefreshTime;
    
    this.metrics.averageRefreshTime = 
      ((currentAverage * (successfulRefreshes - 1)) + refreshTime) / successfulRefreshes;
  }

  /**
   * Get token status and metrics
   */
  getStatus() {
    return {
      hasToken: !!this.tokens.access_token,
      hasRefreshToken: !!this.tokens.refresh_token,
      expiresAt: this.tokens.expires_at,
      isExpired: this.isTokenExpiredOrExpiring(),
      isRefreshing: this.refreshState.isRefreshing,
      lastRefreshAttempt: this.refreshState.lastRefreshAttempt,
      refreshRetries: this.refreshState.refreshRetries,
      pendingRequests: this.pendingRequests.length,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Revoke tokens
   */
  async revokeTokens() {
    // Clear tokens
    this.tokens = {
      access_token: null,
      refresh_token: null,
      expires_at: null,
      token_type: 'Bearer',
      scope: null
    };

    // Clear persisted tokens
    if (this.config.persistTokens) {
      try {
        const fs = require('fs').promises;
        await fs.unlink(this.config.tokenStoragePath);
      } catch (error) {
        console.log('No token file to remove or removal failed');
      }
    }

    this.emit('tokensRevoked');
  }

  /**
   * Event listener management
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }

  off(event, listener) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in token manager event listener:`, error);
      }
    });
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown token manager
   */
  shutdown() {
    this.stopAutoRefreshMonitoring();
    this.eventListeners.clear();
    this.pendingRequests.length = 0;
  }
}

module.exports = { EBayTokenManager, TokenError };