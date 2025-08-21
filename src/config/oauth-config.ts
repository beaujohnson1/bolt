/**
 * eBay OAuth2 Configuration with Environment Validation
 * Using hendt/ebay-api library for robust OAuth implementation
 */

import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  // eBay Production API Credentials
  EBAY_PROD_APP_ID: z.string().min(1, 'Production App ID is required'),
  EBAY_PROD_CERT_ID: z.string().min(1, 'Production Cert ID is required'), 
  EBAY_PROD_DEV_ID: z.string().optional(),
  
  // eBay Sandbox API Credentials (optional, for development)
  EBAY_SANDBOX_APP_ID: z.string().optional(),
  EBAY_SANDBOX_CERT_ID: z.string().optional(),
  EBAY_SANDBOX_DEV_ID: z.string().optional(),
  
  // OAuth Configuration
  EBAY_OAUTH_SCOPES: z.string().optional(),
  EBAY_OAUTH_RU_NAME: z.string().min(1, 'RuName is required'),
  EBAY_OAUTH_REDIRECT_URI: z.string().url('Invalid redirect URI').optional(),
  
  // Environment Settings
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  VITE_EBAY_USE_PRODUCTION: z.string().optional().default('false'),
  
  // Security Settings
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  CSRF_SECRET: z.string().min(32, 'CSRF secret must be at least 32 characters').optional(),
  
  // Rate Limiting
  OAUTH_RATE_LIMIT_WINDOW_MS: z.string().optional().default('900000'), // 15 minutes
  OAUTH_RATE_LIMIT_MAX_REQUESTS: z.string().optional().default('50'),
});

type EnvConfig = z.infer<typeof envSchema>;

class OAuthConfigManager {
  private config: EnvConfig | null = null;
  private validated = false;

  /**
   * Get environment variables from various sources
   */
  private getEnvVars(): Record<string, string> {
    // In browser context, get from import.meta.env
    if (typeof window !== 'undefined' && import.meta?.env) {
      return {
        EBAY_PROD_APP_ID: import.meta.env.VITE_EBAY_PROD_APP_ID || '',
        EBAY_PROD_CERT_ID: import.meta.env.VITE_EBAY_PROD_CERT_ID || '',
        EBAY_PROD_DEV_ID: import.meta.env.VITE_EBAY_PROD_DEV_ID || '',
        EBAY_SANDBOX_APP_ID: import.meta.env.VITE_EBAY_SANDBOX_APP_ID || '',
        EBAY_SANDBOX_CERT_ID: import.meta.env.VITE_EBAY_SANDBOX_CERT_ID || '',
        EBAY_SANDBOX_DEV_ID: import.meta.env.VITE_EBAY_SANDBOX_DEV_ID || '',
        EBAY_OAUTH_SCOPES: import.meta.env.VITE_EBAY_OAUTH_SCOPES || this.getDefaultScopes().join(' '),
        EBAY_OAUTH_RU_NAME: import.meta.env.VITE_EBAY_OAUTH_RU_NAME || 'https://easyflip.ai/app/api/ebay/callback-fixed',
        EBAY_OAUTH_REDIRECT_URI: import.meta.env.VITE_EBAY_OAUTH_REDIRECT_URI || `${window.location.origin}/auth/ebay/callback`,
        NODE_ENV: import.meta.env.MODE || 'development',
        VITE_EBAY_USE_PRODUCTION: import.meta.env.VITE_EBAY_USE_PRODUCTION || 'false',
        JWT_SECRET: import.meta.env.VITE_JWT_SECRET || this.generateFallbackSecret(),
        CSRF_SECRET: import.meta.env.VITE_CSRF_SECRET || this.generateFallbackSecret(),
        OAUTH_RATE_LIMIT_WINDOW_MS: import.meta.env.VITE_OAUTH_RATE_LIMIT_WINDOW_MS || '900000',
        OAUTH_RATE_LIMIT_MAX_REQUESTS: import.meta.env.VITE_OAUTH_RATE_LIMIT_MAX_REQUESTS || '50',
      };
    }

    // In Node.js context, get from process.env
    if (typeof process !== 'undefined' && process.env) {
      return {
        EBAY_PROD_APP_ID: process.env.EBAY_PROD_APP_ID || process.env.VITE_EBAY_PROD_APP_ID || '',
        EBAY_PROD_CERT_ID: process.env.EBAY_PROD_CERT_ID || process.env.VITE_EBAY_PROD_CERT_ID || '',
        EBAY_PROD_DEV_ID: process.env.EBAY_PROD_DEV_ID || process.env.VITE_EBAY_PROD_DEV_ID || '',
        EBAY_SANDBOX_APP_ID: process.env.EBAY_SANDBOX_APP_ID || process.env.VITE_EBAY_SANDBOX_APP_ID || '',
        EBAY_SANDBOX_CERT_ID: process.env.EBAY_SANDBOX_CERT_ID || process.env.VITE_EBAY_SANDBOX_CERT_ID || '',
        EBAY_SANDBOX_DEV_ID: process.env.EBAY_SANDBOX_DEV_ID || process.env.VITE_EBAY_SANDBOX_DEV_ID || '',
        EBAY_OAUTH_SCOPES: process.env.EBAY_OAUTH_SCOPES || this.getDefaultScopes().join(' '),
        EBAY_OAUTH_RU_NAME: process.env.EBAY_OAUTH_RU_NAME || 'https://easyflip.ai/app/api/ebay/callback-fixed',
        EBAY_OAUTH_REDIRECT_URI: process.env.EBAY_OAUTH_REDIRECT_URI || 'https://easyflip.ai/app/api/ebay/callback-fixed',
        NODE_ENV: process.env.NODE_ENV || 'development',
        VITE_EBAY_USE_PRODUCTION: process.env.VITE_EBAY_USE_PRODUCTION || 'false',
        JWT_SECRET: process.env.JWT_SECRET || this.generateFallbackSecret(),
        CSRF_SECRET: process.env.CSRF_SECRET || this.generateFallbackSecret(),
        OAUTH_RATE_LIMIT_WINDOW_MS: process.env.OAUTH_RATE_LIMIT_WINDOW_MS || '900000',
        OAUTH_RATE_LIMIT_MAX_REQUESTS: process.env.OAUTH_RATE_LIMIT_MAX_REQUESTS || '50',
      };
    }

    // Fallback for other contexts
    return {
      EBAY_PROD_APP_ID: '',
      EBAY_PROD_CERT_ID: '',
      EBAY_PROD_DEV_ID: '',
      EBAY_SANDBOX_APP_ID: '',
      EBAY_SANDBOX_CERT_ID: '',  
      EBAY_SANDBOX_DEV_ID: '',
      EBAY_OAUTH_SCOPES: this.getDefaultScopes().join(' '),
      EBAY_OAUTH_RU_NAME: 'https://easyflip.ai/app/api/ebay/callback-fixed',
      EBAY_OAUTH_REDIRECT_URI: 'https://easyflip.ai/app/api/ebay/callback-fixed',
      NODE_ENV: 'development',
      VITE_EBAY_USE_PRODUCTION: 'false',
      JWT_SECRET: this.generateFallbackSecret(),
      CSRF_SECRET: this.generateFallbackSecret(),
      OAUTH_RATE_LIMIT_WINDOW_MS: '900000',
      OAUTH_RATE_LIMIT_MAX_REQUESTS: '50',
    };
  }

  /**
   * Get default OAuth scopes for eBay API
   */
  private getDefaultScopes(): string[] {
    return [
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account', 
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.marketing',
      'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
    ];
  }

  /**
   * Generate a fallback secret for development
   */
  private generateFallbackSecret(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return `fallback_${timestamp}_${random}`.padEnd(32, '0');
  }

  /**
   * Validate and load configuration
   */
  validateAndLoad(): EnvConfig {
    if (this.config && this.validated) {
      return this.config;
    }

    try {
      const envVars = this.getEnvVars();
      console.log('🔧 [OAUTH-CONFIG] Validating environment configuration...');
      console.log('🔧 [OAUTH-CONFIG] Environment context:', {
        hasWindow: typeof window !== 'undefined',
        hasProcess: typeof process !== 'undefined',
        nodeEnv: envVars.NODE_ENV,
        useProduction: envVars.VITE_EBAY_USE_PRODUCTION,
        hasAppId: !!envVars.EBAY_PROD_APP_ID,
        hasCertId: !!envVars.EBAY_PROD_CERT_ID,
        hasRuName: !!envVars.EBAY_OAUTH_RU_NAME
      });

      this.config = envSchema.parse(envVars);
      this.validated = true;

      console.log('✅ [OAUTH-CONFIG] Environment validation successful');
      console.log('✅ [OAUTH-CONFIG] Configuration loaded:', {
        environment: this.config.NODE_ENV,
        useProduction: this.config.VITE_EBAY_USE_PRODUCTION,
        scopes: this.config.EBAY_OAUTH_SCOPES?.split(' ').length || 0,
        hasCredentials: !!(this.config.EBAY_PROD_APP_ID && this.config.EBAY_PROD_CERT_ID)
      });

      return this.config;
    } catch (error) {
      console.error('❌ [OAUTH-CONFIG] Environment validation failed:', error);
      
      if (error instanceof z.ZodError) {
        console.error('❌ [OAUTH-CONFIG] Validation errors:', error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          received: e.received
        })));
      }

      throw new Error(`OAuth configuration validation failed: ${error.message}`);
    }
  }

  /**
   * Get eBay API configuration for hendt/ebay-api
   */
  getEBayApiConfig() {
    const config = this.validateAndLoad();
    const useProduction = config.VITE_EBAY_USE_PRODUCTION === 'true' || config.NODE_ENV === 'production';

    return {
      appId: useProduction ? config.EBAY_PROD_APP_ID : (config.EBAY_SANDBOX_APP_ID || config.EBAY_PROD_APP_ID),
      certId: useProduction ? config.EBAY_PROD_CERT_ID : (config.EBAY_SANDBOX_CERT_ID || config.EBAY_PROD_CERT_ID),
      devId: useProduction ? config.EBAY_PROD_DEV_ID : (config.EBAY_SANDBOX_DEV_ID || config.EBAY_PROD_DEV_ID),
      sandbox: !useProduction,
      ruName: config.EBAY_OAUTH_RU_NAME,
      redirectUri: config.EBAY_OAUTH_REDIRECT_URI,
      scopes: config.EBAY_OAUTH_SCOPES?.split(' ') || this.getDefaultScopes(),
      siteId: useProduction ? 0 : 0, // 0 = EBAY_US for both
      marketplaceId: 'EBAY_US'
    };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig() {
    const config = this.validateAndLoad();
    
    return {
      jwtSecret: config.JWT_SECRET,
      csrfSecret: config.CSRF_SECRET,
      rateLimitWindowMs: parseInt(config.OAUTH_RATE_LIMIT_WINDOW_MS),
      rateLimitMaxRequests: parseInt(config.OAUTH_RATE_LIMIT_MAX_REQUESTS),
    };
  }

  /**
   * Check if configuration is valid
   */
  isValid(): boolean {
    try {
      this.validateAndLoad();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current environment
   */
  getEnvironment(): 'development' | 'production' | 'test' {
    try {
      const config = this.validateAndLoad();
      return config.NODE_ENV;
    } catch {
      return 'development';
    }
  }

  /**
   * Check if using production eBay environment
   */
  isProduction(): boolean {
    try {
      const config = this.validateAndLoad();
      return config.VITE_EBAY_USE_PRODUCTION === 'true' || config.NODE_ENV === 'production';
    } catch {
      return false;
    }
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics() {
    try {
      const config = this.validateAndLoad();
      const ebayConfig = this.getEBayApiConfig();
      const securityConfig = this.getSecurityConfig();

      return {
        isValid: true,
        environment: config.NODE_ENV,
        useProduction: this.isProduction(),
        credentials: {
          hasAppId: !!ebayConfig.appId,
          hasOtherCertId: !!ebayConfig.certId,
          hasDevId: !!ebayConfig.devId,
          hasRuName: !!ebayConfig.ruName,
        },
        oauth: {
          redirectUri: ebayConfig.redirectUri,
          scopes: ebayConfig.scopes,
          scopeCount: ebayConfig.scopes?.length || 0,
        },
        security: {
          hasJwtSecret: !!securityConfig.jwtSecret,
          hasCsrfSecret: !!securityConfig.csrfSecret,
          rateLimitWindow: securityConfig.rateLimitWindowMs,
          rateLimitMax: securityConfig.rateLimitMaxRequests,
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        environment: 'unknown',
        useProduction: false,
      };
    }
  }
}

// Export singleton instance
export const oauthConfig = new OAuthConfigManager();

// Export types and utilities
export type { EnvConfig };
export { envSchema };