/**
 * Automatic Token Refresh Service
 * 
 * Implements proactive token management following Hendt eBay API patterns:
 * - Automatic refresh before expiration
 * - Exponential backoff retry logic
 * - Circuit breaker for API failures
 * - Background refresh scheduling
 * - Error recovery and fallback strategies
 */

import { EnhancedTokenStorageService, TokenData } from './EnhancedTokenStorageService';
import { EBayCircuitBreaker } from '../ebay-integration/circuits/EBayCircuitBreaker';

export interface RefreshConfig {
  refreshBufferMinutes: number; // How many minutes before expiry to refresh
  maxRetries: number;
  initialRetryDelay: number; // ms
  maxRetryDelay: number; // ms
  backoffMultiplier: number;
  circuitBreakerThreshold: number;
}

export interface RefreshStatus {
  isActive: boolean;
  lastRefresh: number;
  nextRefresh: number;
  retryCount: number;
  errors: string[];
  circuitState: 'closed' | 'open' | 'half-open';
}

export interface RefreshResult {
  success: boolean;
  tokens?: TokenData;
  error?: string;
  retryAfter?: number;
  circuitTripped?: boolean;
}

export class AutomaticTokenRefreshService {
  private storageService: EnhancedTokenStorageService;
  private circuitBreaker: EBayCircuitBreaker;
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshQueue: Array<() => void> = [];
  
  private config: RefreshConfig = {
    refreshBufferMinutes: 30, // Refresh 30 minutes before expiry
    maxRetries: 5,
    initialRetryDelay: 1000, // 1 second
    maxRetryDelay: 60000, // 1 minute
    backoffMultiplier: 2,
    circuitBreakerThreshold: 3
  };
  
  private refreshStatus: RefreshStatus = {
    isActive: false,
    lastRefresh: 0,
    nextRefresh: 0,
    retryCount: 0,
    errors: [],
    circuitState: 'closed'
  };
  
  constructor(storageService?: EnhancedTokenStorageService) {
    this.storageService = storageService || new EnhancedTokenStorageService();
    this.circuitBreaker = new EBayCircuitBreaker({
      failureThreshold: this.config.circuitBreakerThreshold,
      resetTimeout: 60000,
      monitorTimeout: 30000
    });
    
    this.initializeRefreshService();
  }
  
  /**
   * Initialize the refresh service and start monitoring
   */
  private async initializeRefreshService(): Promise<void> {
    try {
      console.log('🔄 Initializing automatic token refresh service...');
      
      // Check if tokens exist and need refresh
      const tokens = await this.storageService.getTokens();
      if (tokens) {
        this.scheduleNextRefresh(tokens);
        console.log('✅ Token refresh service initialized');
      } else {
        console.log('ℹ️ No tokens found, refresh service in standby mode');
      }
      
      // Listen for new token storage events
      this.setupTokenStorageListener();
      
    } catch (error) {
      console.error('❌ Token refresh service initialization failed:', error);
    }
  }
  
  /**
   * Start automatic refresh for given tokens
   */
  async startAutoRefresh(tokens: TokenData): Promise<void> {
    console.log('🚀 Starting automatic token refresh...');
    
    this.refreshStatus.isActive = true;
    this.refreshStatus.retryCount = 0;
    this.refreshStatus.errors = [];
    
    this.scheduleNextRefresh(tokens);
  }
  
  /**
   * Stop automatic refresh
   */
  stopAutoRefresh(): void {
    console.log('⏹️ Stopping automatic token refresh...');
    
    this.refreshStatus.isActive = false;
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  
  /**
   * Force immediate token refresh
   */
  async forceRefresh(): Promise<RefreshResult> {
    console.log('🔄 Force refreshing tokens...');
    
    try {
      const tokens = await this.storageService.getTokens();
      if (!tokens || !tokens.refresh_token) {
        throw new Error('No refresh token available');
      }
      
      return await this.performTokenRefresh(tokens.refresh_token);
      
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get current refresh status
   */
  getRefreshStatus(): RefreshStatus {
    return { ...this.refreshStatus, circuitState: this.circuitBreaker.getState() };
  }
  
  /**
   * Update refresh configuration
   */
  updateConfig(newConfig: Partial<RefreshConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Token refresh config updated:', this.config);
  }
  
  /**
   * Schedule the next token refresh
   */
  private scheduleNextRefresh(tokens: TokenData): void {
    if (!this.refreshStatus.isActive || !tokens.expires_at || !tokens.refresh_token) {
      return;
    }
    
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Calculate refresh time (buffer before expiry)
    const bufferTime = this.config.refreshBufferMinutes * 60 * 1000;
    const refreshTime = tokens.expires_at - bufferTime;
    const timeUntilRefresh = Math.max(0, refreshTime - Date.now());
    
    this.refreshStatus.nextRefresh = refreshTime;
    
    console.log(`⏰ Next token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
    
    this.refreshTimer = setTimeout(() => {
      this.executeScheduledRefresh(tokens.refresh_token!);
    }, timeUntilRefresh);
  }
  
  /**
   * Execute scheduled token refresh
   */
  private async executeScheduledRefresh(refreshToken: string): Promise<void> {
    if (this.isRefreshing) {
      console.log('⏳ Refresh already in progress, queuing request...');
      return new Promise(resolve => {
        this.refreshQueue.push(resolve);
      });
    }
    
    this.isRefreshing = true;
    
    try {
      console.log('🔄 Executing scheduled token refresh...');
      
      const result = await this.performTokenRefreshWithRetry(refreshToken);
      
      if (result.success && result.tokens) {
        await this.storageService.storeTokens(result.tokens);
        this.refreshStatus.lastRefresh = Date.now();
        this.refreshStatus.retryCount = 0;
        this.refreshStatus.errors = [];
        
        // Schedule next refresh
        this.scheduleNextRefresh(result.tokens);
        
        console.log('✅ Scheduled token refresh completed successfully');
        
        // Notify any queued requests
        this.processRefreshQueue();
        
      } else {
        this.handleRefreshFailure(result.error || 'Unknown refresh error');
      }
      
    } catch (error) {
      this.handleRefreshFailure(error.message);
    } finally {
      this.isRefreshing = false;
    }
  }
  
  /**
   * Perform token refresh with exponential backoff retry
   */
  private async performTokenRefreshWithRetry(refreshToken: string): Promise<RefreshResult> {
    let lastError: string = '';
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`🔄 Token refresh attempt ${attempt}/${this.config.maxRetries}`);
        
        const result = await this.performTokenRefresh(refreshToken);
        
        if (result.success) {
          console.log(`✅ Token refresh succeeded on attempt ${attempt}`);
          return result;
        }
        
        lastError = result.error || 'Unknown error';
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          console.log('❌ Non-retryable error, stopping retry attempts:', lastError);
          break;
        }
        
      } catch (error) {
        lastError = error.message;
        console.warn(`⚠️ Token refresh attempt ${attempt} failed:`, lastError);
      }
      
      // Wait before next attempt (exponential backoff)
      if (attempt < this.config.maxRetries) {
        const delay = Math.min(
          this.config.initialRetryDelay * Math.pow(this.config.backoffMultiplier, attempt - 1),
          this.config.maxRetryDelay
        );
        
        console.log(`⏳ Waiting ${delay}ms before next attempt...`);
        await this.sleep(delay);
      }
    }
    
    return {
      success: false,
      error: lastError
    };
  }
  
  /**
   * Perform actual token refresh API call
   */
  private async performTokenRefresh(refreshToken: string): Promise<RefreshResult> {
    try {
      // Use circuit breaker to protect against cascading failures
      const result = await this.circuitBreaker.execute(async () => {
        const response = await fetch('/.netlify/functions/simple-ebay-oauth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'refresh-token',
            refresh_token: refreshToken
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      });
      
      // Validate response
      if (!result.access_token) {
        throw new Error('Invalid refresh response: missing access_token');
      }
      
      const tokens: TokenData = {
        access_token: result.access_token,
        refresh_token: result.refresh_token || refreshToken,
        expires_in: result.expires_in || 7200,
        expires_at: Date.now() + ((result.expires_in || 7200) * 1000),
        token_type: result.token_type || 'Bearer',
        scope: result.scope,
        updated_at: Date.now()
      };
      
      return {
        success: true,
        tokens
      };
      
    } catch (error) {
      console.error('❌ Token refresh API call failed:', error);
      
      // Check if circuit breaker tripped
      if (this.circuitBreaker.getState() === 'open') {
        return {
          success: false,
          error: 'Circuit breaker open - eBay API temporarily unavailable',
          circuitTripped: true,
          retryAfter: 60000 // Suggest retry after 1 minute
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle refresh failures
   */
  private handleRefreshFailure(error: string): void {
    console.error('❌ Token refresh failed:', error);
    
    this.refreshStatus.retryCount++;
    this.refreshStatus.errors.push(error);
    
    // Keep only last 10 errors
    if (this.refreshStatus.errors.length > 10) {
      this.refreshStatus.errors = this.refreshStatus.errors.slice(-10);
    }
    
    // If too many failures, stop auto refresh
    if (this.refreshStatus.retryCount >= this.config.maxRetries) {
      console.warn('⚠️ Too many refresh failures, stopping auto refresh');
      this.stopAutoRefresh();
      
      // Dispatch event to notify application
      window.dispatchEvent(new CustomEvent('ebayTokenRefreshFailed', {
        detail: {
          error,
          retryCount: this.refreshStatus.retryCount,
          timestamp: Date.now()
        }
      }));
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.min(
        this.config.initialRetryDelay * Math.pow(this.config.backoffMultiplier, this.refreshStatus.retryCount),
        this.config.maxRetryDelay
      );
      
      console.log(`⏳ Scheduling refresh retry in ${retryDelay}ms...`);
      
      this.refreshTimer = setTimeout(() => {
        this.storageService.getTokens().then(tokens => {
          if (tokens && tokens.refresh_token) {
            this.executeScheduledRefresh(tokens.refresh_token);
          }
        });
      }, retryDelay);
    }
  }
  
  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: string): boolean {
    const nonRetryablePatterns = [
      'invalid_grant',
      'invalid_client',
      'unauthorized_client',
      'unsupported_grant_type',
      'invalid_refresh_token'
    ];
    
    return nonRetryablePatterns.some(pattern => 
      error.toLowerCase().includes(pattern)
    );
  }
  
  /**
   * Process queued refresh requests
   */
  private processRefreshQueue(): void {
    while (this.refreshQueue.length > 0) {
      const resolve = this.refreshQueue.shift();
      if (resolve) {
        resolve();
      }
    }
  }
  
  /**
   * Setup listener for token storage events
   */
  private setupTokenStorageListener(): void {
    // Listen for storage events to restart refresh when new tokens are stored
    window.addEventListener('storage', (event) => {
      if (event.key?.includes('ebay') && event.key?.includes('token')) {
        this.handleTokenStorageChange();
      }
    });
    
    // Listen for custom events
    window.addEventListener('ebayAuthChanged', (event: CustomEvent) => {
      if (event.detail?.authenticated && event.detail?.tokens) {
        this.startAutoRefresh(event.detail.tokens);
      }
    });
  }
  
  /**
   * Handle token storage change
   */
  private async handleTokenStorageChange(): Promise<void> {
    try {
      const tokens = await this.storageService.getTokens();
      if (tokens && tokens.refresh_token) {
        console.log('🔄 Token storage changed, restarting auto refresh...');
        this.startAutoRefresh(tokens);
      }
    } catch (error) {
      console.warn('⚠️ Failed to handle token storage change:', error);
    }
  }
  
  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get refresh statistics
   */
  getRefreshStats(): {
    totalRefreshes: number;
    successfulRefreshes: number;
    failedRefreshes: number;
    lastError: string | null;
    averageRefreshTime: number;
  } {
    const errors = this.refreshStatus.errors;
    
    return {
      totalRefreshes: this.refreshStatus.retryCount + (this.refreshStatus.lastRefresh > 0 ? 1 : 0),
      successfulRefreshes: this.refreshStatus.lastRefresh > 0 ? 1 : 0,
      failedRefreshes: this.refreshStatus.retryCount,
      lastError: errors.length > 0 ? errors[errors.length - 1] : null,
      averageRefreshTime: 0 // Could be implemented with timing tracking
    };
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    console.log('🧹 Destroying automatic token refresh service...');
    
    this.stopAutoRefresh();
    this.refreshQueue = [];
    this.circuitBreaker.destroy?.();
  }
}

export default AutomaticTokenRefreshService;