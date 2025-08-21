/**
 * Enhanced Error Handling Service
 * 
 * Provides comprehensive error handling and recovery for eBay OAuth operations:
 * - Categorized error handling with specific recovery strategies
 * - Automatic retry logic with exponential backoff
 * - Error logging and analytics
 * - User-friendly error messages
 * - Recovery workflow automation
 */

export interface ErrorContext {
  operation: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  recoveryStrategy: RecoveryStrategy;
  userMessage: string;
  technicalDetails?: string;
  suggestedActions?: string[];
}

export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  message: string;
  newState?: any;
  requiresUserAction?: boolean;
  actionInstructions?: string;
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  VALIDATION = 'validation',
  STORAGE = 'storage',
  CONFIGURATION = 'configuration',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  REAUTH = 'reauth',
  REFRESH_TOKEN = 'refresh_token',
  CLEAR_STORAGE = 'clear_storage',
  USER_ACTION = 'user_action',
  FALLBACK = 'fallback',
  NONE = 'none'
}

export class EnhancedErrorHandlingService {
  private errorHistory: Array<ErrorDetails & ErrorContext> = [];
  private maxHistorySize = 100;
  private retryAttempts = new Map<string, number>();
  private circuitBreakers = new Map<string, { failures: number; lastFailure: number; isOpen: boolean }>();
  
  /**
   * Process and categorize an error
   */
  async processError(error: any, context: ErrorContext): Promise<ErrorDetails> {
    console.log('🔍 Processing error:', error, context);
    
    try {
      const errorDetails = this.categorizeError(error, context);
      
      // Add to history
      this.addToHistory(errorDetails, context);
      
      // Update circuit breaker
      this.updateCircuitBreaker(context.operation, false);
      
      // Log error
      await this.logError(errorDetails, context);
      
      console.log('📊 Error processed:', errorDetails);
      return errorDetails;
      
    } catch (processingError) {
      console.error('❌ Error processing failed:', processingError);
      
      // Return a generic error if processing fails
      return {
        code: 'PROCESSING_ERROR',
        message: 'Error processing failed',
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        userMessage: 'An unexpected error occurred. Please try again or contact support.',
        technicalDetails: processingError.message
      };
    }
  }
  
  /**
   * Attempt automatic error recovery
   */
  async attemptRecovery(errorDetails: ErrorDetails, context: ErrorContext): Promise<RecoveryResult> {
    console.log('🔧 Attempting error recovery:', errorDetails.recoveryStrategy);
    
    try {
      switch (errorDetails.recoveryStrategy) {
        case RecoveryStrategy.RETRY:
          return await this.handleRetryRecovery(errorDetails, context);
          
        case RecoveryStrategy.REFRESH_TOKEN:
          return await this.handleTokenRefreshRecovery(errorDetails, context);
          
        case RecoveryStrategy.REAUTH:
          return await this.handleReauthRecovery(errorDetails, context);
          
        case RecoveryStrategy.CLEAR_STORAGE:
          return await this.handleStorageClearRecovery(errorDetails, context);
          
        case RecoveryStrategy.FALLBACK:
          return await this.handleFallbackRecovery(errorDetails, context);
          
        case RecoveryStrategy.USER_ACTION:
          return this.handleUserActionRecovery(errorDetails, context);
          
        default:
          return {
            success: false,
            strategy: RecoveryStrategy.NONE,
            message: 'No recovery strategy available',
            requiresUserAction: true,
            actionInstructions: 'Please contact support or try again later.'
          };
      }
    } catch (recoveryError) {
      console.error('❌ Recovery attempt failed:', recoveryError);
      
      return {
        success: false,
        strategy: errorDetails.recoveryStrategy,
        message: `Recovery failed: ${recoveryError.message}`,
        requiresUserAction: true,
        actionInstructions: 'Please try again or contact support.'
      };
    }
  }
  
  /**
   * Categorize error and determine recovery strategy
   */
  private categorizeError(error: any, context: ErrorContext): ErrorDetails {
    const errorMessage = this.extractErrorMessage(error);
    const errorCode = this.extractErrorCode(error);
    
    // Network errors
    if (this.isNetworkError(error, errorMessage)) {
      return {
        code: errorCode || 'NETWORK_ERROR',
        message: errorMessage,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        userMessage: 'Network connection issue. Please check your internet connection and try again.',
        suggestedActions: ['Check internet connection', 'Try again in a few moments']
      };
    }
    
    // Authentication errors
    if (this.isAuthenticationError(error, errorMessage)) {
      return {
        code: errorCode || 'AUTH_ERROR',
        message: errorMessage,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        recoveryStrategy: RecoveryStrategy.REAUTH,
        userMessage: 'Authentication failed. Please sign in again.',
        suggestedActions: ['Sign out and sign in again', 'Clear browser cache']
      };
    }
    
    // Token expiration/refresh errors
    if (this.isTokenError(error, errorMessage)) {
      return {
        code: errorCode || 'TOKEN_ERROR',
        message: errorMessage,
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.REFRESH_TOKEN,
        userMessage: 'Session expired. Refreshing your authentication...',
        suggestedActions: ['Please wait while we refresh your session']
      };
    }
    
    // Rate limiting errors
    if (this.isRateLimitError(error, errorMessage)) {
      return {
        code: errorCode || 'RATE_LIMIT',
        message: errorMessage,
        category: ErrorCategory.RATE_LIMIT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        suggestedActions: ['Wait 1-2 minutes before trying again']
      };
    }
    
    // Storage errors
    if (this.isStorageError(error, errorMessage)) {
      return {
        code: errorCode || 'STORAGE_ERROR',
        message: errorMessage,
        category: ErrorCategory.STORAGE,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.CLEAR_STORAGE,
        userMessage: 'Storage issue detected. Clearing cached data...',
        suggestedActions: ['Allow storage clearing', 'Sign in again if prompted']
      };
    }
    
    // Configuration errors
    if (this.isConfigurationError(error, errorMessage)) {
      return {
        code: errorCode || 'CONFIG_ERROR',
        message: errorMessage,
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.CRITICAL,
        retryable: false,
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        userMessage: 'Configuration issue detected. Please contact support.',
        suggestedActions: ['Contact support', 'Check system requirements']
      };
    }
    
    // Server errors (5xx)
    if (this.isServerError(error, errorMessage)) {
      return {
        code: errorCode || 'SERVER_ERROR',
        message: errorMessage,
        category: ErrorCategory.SERVER_ERROR,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        recoveryStrategy: RecoveryStrategy.RETRY,
        userMessage: 'Server temporarily unavailable. Please try again in a moment.',
        suggestedActions: ['Try again in a few minutes', 'Check system status']
      };
    }
    
    // Client errors (4xx)
    if (this.isClientError(error, errorMessage)) {
      return {
        code: errorCode || 'CLIENT_ERROR',
        message: errorMessage,
        category: ErrorCategory.CLIENT_ERROR,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        recoveryStrategy: RecoveryStrategy.USER_ACTION,
        userMessage: 'Request error. Please check your input and try again.',
        suggestedActions: ['Verify your input', 'Contact support if the issue persists']
      };
    }
    
    // Unknown errors
    return {
      code: errorCode || 'UNKNOWN_ERROR',
      message: errorMessage,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      recoveryStrategy: RecoveryStrategy.FALLBACK,
      userMessage: 'An unexpected error occurred. Please try again.',
      technicalDetails: JSON.stringify(error, null, 2),
      suggestedActions: ['Try again', 'Refresh the page', 'Contact support if the issue persists']
    };
  }
  
  /**
   * Handle retry recovery
   */
  private async handleRetryRecovery(errorDetails: ErrorDetails, context: ErrorContext): Promise<RecoveryResult> {
    const operationKey = `${context.operation}_${context.sessionId || 'global'}`;
    const currentAttempts = this.retryAttempts.get(operationKey) || 0;
    const maxAttempts = this.getMaxRetryAttempts(errorDetails.category);
    
    if (currentAttempts >= maxAttempts) {
      return {
        success: false,
        strategy: RecoveryStrategy.RETRY,
        message: 'Maximum retry attempts exceeded',
        requiresUserAction: true,
        actionInstructions: 'Please wait a few minutes and try again, or contact support.'
      };
    }
    
    // Calculate delay with exponential backoff
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, currentAttempts), maxDelay);
    
    this.retryAttempts.set(operationKey, currentAttempts + 1);
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return {
      success: true,
      strategy: RecoveryStrategy.RETRY,
      message: `Retrying operation (attempt ${currentAttempts + 1}/${maxAttempts})`,
      newState: { retryAttempt: currentAttempts + 1, retryDelay: delay }
    };
  }
  
  /**
   * Handle token refresh recovery
   */
  private async handleTokenRefreshRecovery(errorDetails: ErrorDetails, context: ErrorContext): Promise<RecoveryResult> {
    try {
      // Attempt token refresh through the automatic refresh service
      const refreshService = (window as any).automaticTokenRefreshService;
      if (refreshService) {
        const result = await refreshService.forceRefresh();
        
        if (result.success) {
          return {
            success: true,
            strategy: RecoveryStrategy.REFRESH_TOKEN,
            message: 'Token refreshed successfully',
            newState: { refreshed: true, tokens: result.tokens }
          };
        }
      }
      
      // Fallback to reauth if refresh fails
      return {
        success: false,
        strategy: RecoveryStrategy.REFRESH_TOKEN,
        message: 'Token refresh failed, reauthentication required',
        requiresUserAction: true,
        actionInstructions: 'Please sign in again to continue.'
      };
      
    } catch (error) {
      console.error('Token refresh recovery failed:', error);
      
      return {
        success: false,
        strategy: RecoveryStrategy.REFRESH_TOKEN,
        message: 'Token refresh failed',
        requiresUserAction: true,
        actionInstructions: 'Please sign in again to continue.'
      };
    }
  }
  
  /**
   * Handle reauthentication recovery
   */
  private async handleReauthRecovery(errorDetails: ErrorDetails, context: ErrorContext): Promise<RecoveryResult> {
    try {
      // Clear existing tokens
      const storageService = (window as any).enhancedTokenStorageService;
      if (storageService) {
        await storageService.clearAllTokens();
      }
      
      // Dispatch event to trigger reauthentication
      window.dispatchEvent(new CustomEvent('ebayReauthRequired', {
        detail: {
          reason: errorDetails.message,
          context: context,
          timestamp: Date.now()
        }
      }));
      
      return {
        success: true,
        strategy: RecoveryStrategy.REAUTH,
        message: 'Reauthentication initiated',
        requiresUserAction: true,
        actionInstructions: 'Please complete the sign-in process to continue.'
      };
      
    } catch (error) {
      console.error('Reauth recovery failed:', error);
      
      return {
        success: false,
        strategy: RecoveryStrategy.REAUTH,
        message: 'Reauthentication setup failed',
        requiresUserAction: true,
        actionInstructions: 'Please refresh the page and sign in again.'
      };
    }
  }
  
  /**
   * Handle storage clear recovery
   */
  private async handleStorageClearRecovery(errorDetails: ErrorDetails, context: ErrorContext): Promise<RecoveryResult> {
    try {
      // Clear all storage
      const storageService = (window as any).enhancedTokenStorageService;
      if (storageService) {
        await storageService.clearAllTokens();
      }
      
      // Clear localStorage manually as backup
      Object.keys(localStorage).forEach(key => {
        if (key.includes('ebay')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('ebay')) {
          sessionStorage.removeItem(key);
        }
      });
      
      return {
        success: true,
        strategy: RecoveryStrategy.CLEAR_STORAGE,
        message: 'Storage cleared successfully',
        requiresUserAction: true,
        actionInstructions: 'Please sign in again to continue.'
      };
      
    } catch (error) {
      console.error('Storage clear recovery failed:', error);
      
      return {
        success: false,
        strategy: RecoveryStrategy.CLEAR_STORAGE,
        message: 'Storage clearing failed',
        requiresUserAction: true,
        actionInstructions: 'Please refresh the page and try again.'
      };
    }
  }
  
  /**
   * Handle fallback recovery
   */
  private async handleFallbackRecovery(errorDetails: ErrorDetails, context: ErrorContext): Promise<RecoveryResult> {
    // Try multiple recovery strategies in order
    const strategies = [RecoveryStrategy.RETRY, RecoveryStrategy.CLEAR_STORAGE];
    
    for (const strategy of strategies) {
      try {
        const modifiedError = { ...errorDetails, recoveryStrategy: strategy };
        const result = await this.attemptRecovery(modifiedError, context);
        
        if (result.success) {
          return {
            ...result,
            strategy: RecoveryStrategy.FALLBACK,
            message: `Fallback recovery succeeded using ${strategy}`
          };
        }
      } catch (error) {
        console.warn(`Fallback strategy ${strategy} failed:`, error);
      }
    }
    
    return {
      success: false,
      strategy: RecoveryStrategy.FALLBACK,
      message: 'All fallback strategies failed',
      requiresUserAction: true,
      actionInstructions: 'Please refresh the page or contact support.'
    };
  }
  
  /**
   * Handle user action recovery
   */
  private handleUserActionRecovery(errorDetails: ErrorDetails, context: ErrorContext): RecoveryResult {
    return {
      success: false,
      strategy: RecoveryStrategy.USER_ACTION,
      message: 'User action required',
      requiresUserAction: true,
      actionInstructions: errorDetails.suggestedActions?.join(' ') || 'Please follow the suggested actions.'
    };
  }
  
  /**
   * Extract error message from various error formats
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.message) {
      return error.message;
    }
    
    if (error?.error_description) {
      return error.error_description;
    }
    
    if (error?.error) {
      return typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
    }
    
    return JSON.stringify(error);
  }
  
  /**
   * Extract error code from various error formats
   */
  private extractErrorCode(error: any): string | undefined {
    if (error?.code) return error.code;
    if (error?.error) return error.error;
    if (error?.status) return error.status.toString();
    if (error?.statusCode) return error.statusCode.toString();
    return undefined;
  }
  
  /**
   * Error type detection methods
   */
  private isNetworkError(error: any, message: string): boolean {
    const networkPatterns = [
      'network', 'timeout', 'connection', 'fetch', 'cors',
      'net::', 'ERR_NETWORK', 'ERR_INTERNET_DISCONNECTED'
    ];
    return networkPatterns.some(pattern => 
      message.toLowerCase().includes(pattern) || 
      error?.name?.toLowerCase().includes(pattern)
    );
  }
  
  private isAuthenticationError(error: any, message: string): boolean {
    const authPatterns = [
      'unauthorized', 'authentication', 'login', 'signin',
      'invalid_credentials', 'access_denied', 'forbidden'
    ];
    return authPatterns.some(pattern => 
      message.toLowerCase().includes(pattern)
    ) || error?.status === 401;
  }
  
  private isTokenError(error: any, message: string): boolean {
    const tokenPatterns = [
      'token', 'expired', 'invalid_grant', 'refresh',
      'session', 'expires_in'
    ];
    return tokenPatterns.some(pattern => 
      message.toLowerCase().includes(pattern)
    );
  }
  
  private isRateLimitError(error: any, message: string): boolean {
    return message.toLowerCase().includes('rate limit') || 
           message.toLowerCase().includes('too many requests') ||
           error?.status === 429;
  }
  
  private isStorageError(error: any, message: string): boolean {
    const storagePatterns = [
      'localstorage', 'sessionstorage', 'indexeddb', 'storage',
      'quota', 'disk', 'permission'
    ];
    return storagePatterns.some(pattern => 
      message.toLowerCase().includes(pattern)
    );
  }
  
  private isConfigurationError(error: any, message: string): boolean {
    const configPatterns = [
      'configuration', 'config', 'environment', 'missing',
      'undefined', 'not found', 'invalid_client'
    ];
    return configPatterns.some(pattern => 
      message.toLowerCase().includes(pattern)
    );
  }
  
  private isServerError(error: any, message: string): boolean {
    return (error?.status >= 500 && error?.status < 600) ||
           message.toLowerCase().includes('server error') ||
           message.toLowerCase().includes('internal error');
  }
  
  private isClientError(error: any, message: string): boolean {
    return (error?.status >= 400 && error?.status < 500) ||
           message.toLowerCase().includes('bad request') ||
           message.toLowerCase().includes('invalid request');
  }
  
  /**
   * Get maximum retry attempts based on error category
   */
  private getMaxRetryAttempts(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 3;
      case ErrorCategory.RATE_LIMIT:
        return 2;
      case ErrorCategory.SERVER_ERROR:
        return 3;
      default:
        return 1;
    }
  }
  
  /**
   * Add error to history
   */
  private addToHistory(errorDetails: ErrorDetails, context: ErrorContext): void {
    this.errorHistory.unshift({ ...errorDetails, ...context });
    
    // Keep only the most recent errors
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }
  
  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(operation: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(operation) || {
      failures: 0,
      lastFailure: 0,
      isOpen: false
    };
    
    if (success) {
      breaker.failures = 0;
      breaker.isOpen = false;
    } else {
      breaker.failures++;
      breaker.lastFailure = Date.now();
      
      // Open circuit after 5 failures
      if (breaker.failures >= 5) {
        breaker.isOpen = true;
      }
    }
    
    this.circuitBreakers.set(operation, breaker);
  }
  
  /**
   * Log error for analytics and debugging
   */
  private async logError(errorDetails: ErrorDetails, context: ErrorContext): Promise<void> {
    try {
      // Console logging for development
      console.error('🚨 Error logged:', {
        ...errorDetails,
        context,
        timestamp: new Date().toISOString()
      });
      
      // Could send to analytics service in production
      // await this.sendToAnalytics(errorDetails, context);
      
    } catch (loggingError) {
      console.warn('Failed to log error:', loggingError);
    }
  }
  
  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: Array<ErrorDetails & ErrorContext>;
  } {
    const errorsByCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = this.errorHistory.filter(e => e.category === category).length;
      return acc;
    }, {} as Record<ErrorCategory, number>);
    
    const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = this.errorHistory.filter(e => e.severity === severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);
    
    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: this.errorHistory.slice(0, 10)
    };
  }
  
  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
    this.circuitBreakers.clear();
    console.log('🧹 Error history cleared');
  }
}

export default EnhancedErrorHandlingService;