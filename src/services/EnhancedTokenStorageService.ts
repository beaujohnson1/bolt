/**
 * Enhanced Token Storage Service
 * 
 * Implements multiple storage mechanisms with fallback strategies following Hendt eBay API patterns:
 * - Primary: Encrypted localStorage
 * - Backup: sessionStorage 
 * - Emergency: IndexedDB
 * - Validation: Multiple redundant checks
 * - Recovery: Automatic cleanup and restoration
 */

import { TokenEncryptionService, EncryptedData } from './TokenEncryptionService';
import { supabase } from '../lib/supabase';

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  scope?: string;
  created_at?: number;
  updated_at?: number;
}

export interface StorageStatus {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  encrypted: boolean;
  validated: boolean;
}

export interface TokenMetadata {
  stored_at: number;
  expires_at: number;
  refresh_attempts: number;
  last_validated: number;
  storage_method: string;
  encryption_version: number;
}

export class EnhancedTokenStorageService {
  private encryptionService: TokenEncryptionService;
  private readonly STORAGE_KEYS = {
    PRIMARY: 'ebay_oauth_tokens_v2',
    BACKUP: 'ebay_tokens_backup',
    METADATA: 'ebay_token_metadata',
    EMERGENCY: 'ebay_emergency_tokens',
    VALIDATION: 'ebay_token_validation'
  };
  
  private readonly DB_NAME = 'EbayTokenStorage';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'tokens';
  
  constructor() {
    this.encryptionService = new TokenEncryptionService();
    this.initializeStorage();
  }
  
  /**
   * Initialize storage systems and perform health checks
   */
  private async initializeStorage(): Promise<void> {
    try {
      await this.performStorageHealthCheck();
      await this.initializeIndexedDB();
      await this.cleanupExpiredTokens();
      console.log('✅ Enhanced token storage initialized successfully');
    } catch (error) {
      console.error('❌ Storage initialization failed:', error);
      // Continue with reduced functionality
    }
  }
  
  /**
   * Store tokens using multiple redundant methods
   */
  async storeTokens(tokens: TokenData, userId?: string): Promise<void> {
    const startTime = Date.now();
    const metadata: TokenMetadata = {
      stored_at: startTime,
      expires_at: tokens.expires_at || (startTime + (tokens.expires_in * 1000)),
      refresh_attempts: 0,
      last_validated: startTime,
      storage_method: 'multi-redundant',
      encryption_version: 2
    };
    
    const enhancedTokens = {
      ...tokens,
      created_at: tokens.created_at || startTime,
      updated_at: startTime
    };
    
    const storageResults: Record<string, boolean> = {};
    
    try {
      // Method 1: Encrypted localStorage (Primary)
      try {
        const encryptedData = this.encryptionService.encrypt(JSON.stringify(enhancedTokens));
        localStorage.setItem(this.STORAGE_KEYS.PRIMARY, JSON.stringify(encryptedData));
        localStorage.setItem(this.STORAGE_KEYS.METADATA, JSON.stringify(metadata));
        storageResults.localStorage = true;
        console.log('✅ Tokens stored in encrypted localStorage');
      } catch (error) {
        console.warn('⚠️ localStorage storage failed:', error);
        storageResults.localStorage = false;
      }
      
      // Method 2: sessionStorage backup (Unencrypted for session only)
      try {
        sessionStorage.setItem(this.STORAGE_KEYS.BACKUP, JSON.stringify(enhancedTokens));
        sessionStorage.setItem(this.STORAGE_KEYS.METADATA, JSON.stringify(metadata));
        storageResults.sessionStorage = true;
        console.log('✅ Tokens stored in sessionStorage backup');
      } catch (error) {
        console.warn('⚠️ sessionStorage backup failed:', error);
        storageResults.sessionStorage = false;
      }
      
      // Method 3: IndexedDB for persistent backup
      try {
        await this.storeInIndexedDB(enhancedTokens, metadata);
        storageResults.indexedDB = true;
        console.log('✅ Tokens stored in IndexedDB');
      } catch (error) {
        console.warn('⚠️ IndexedDB storage failed:', error);
        storageResults.indexedDB = false;
      }
      
      // Method 4: Legacy compatibility storage
      try {
        localStorage.setItem('ebay_manual_token', tokens.access_token);
        localStorage.setItem('ebay_access_token', tokens.access_token);
        localStorage.setItem('ebay_refresh_token', tokens.refresh_token || '');
        localStorage.setItem('ebay_token_expiry', metadata.expires_at.toString());
        storageResults.legacy = true;
        console.log('✅ Tokens stored in legacy format');
      } catch (error) {
        console.warn('⚠️ Legacy storage failed:', error);
        storageResults.legacy = false;
      }
      
      // Method 5: Supabase backup for logged-in users
      if (userId) {
        try {
          await this.storeInSupabase(userId, enhancedTokens);
          storageResults.supabase = true;
          console.log('✅ Tokens stored in Supabase');
        } catch (error) {
          console.warn('⚠️ Supabase storage failed:', error);
          storageResults.supabase = false;
        }
      }
      
      // Validation: Verify at least one storage method succeeded
      const successfulMethods = Object.values(storageResults).filter(Boolean).length;
      if (successfulMethods === 0) {
        throw new Error('All storage methods failed');
      }
      
      // Store validation record
      const validationRecord = {
        timestamp: Date.now(),
        storage_results: storageResults,
        successful_methods: successfulMethods,
        token_hash: this.generateTokenHash(tokens.access_token)
      };
      
      try {
        localStorage.setItem(this.STORAGE_KEYS.VALIDATION, JSON.stringify(validationRecord));
      } catch (validationError) {
        console.warn('⚠️ Validation record storage failed:', validationError);
      }
      
      console.log(`✅ Tokens stored successfully using ${successfulMethods} methods:`, storageResults);
      
    } catch (error) {
      console.error('❌ Critical token storage failure:', error);
      throw new Error(`Token storage failed: ${error.message}`);
    }
  }
  
  /**
   * Retrieve tokens with automatic fallback chain
   */
  async getTokens(): Promise<TokenData | null> {
    console.log('🔍 Retrieving tokens using fallback chain...');
    
    // Method 1: Try encrypted localStorage first
    try {
      const encryptedData = localStorage.getItem(this.STORAGE_KEYS.PRIMARY);
      if (encryptedData) {
        const parsed = JSON.parse(encryptedData);
        const decrypted = this.encryptionService.decrypt(parsed);
        const tokens = JSON.parse(decrypted);
        
        if (this.validateTokenData(tokens)) {
          console.log('✅ Tokens retrieved from encrypted localStorage');
          await this.updateLastValidated(tokens);
          return tokens;
        }
      }
    } catch (error) {
      console.warn('⚠️ Encrypted localStorage retrieval failed:', error);
    }
    
    // Method 2: Try sessionStorage backup
    try {
      const backupData = sessionStorage.getItem(this.STORAGE_KEYS.BACKUP);
      if (backupData) {
        const tokens = JSON.parse(backupData);
        
        if (this.validateTokenData(tokens)) {
          console.log('✅ Tokens retrieved from sessionStorage backup');
          // Re-store in primary location
          await this.storeTokens(tokens);
          return tokens;
        }
      }
    } catch (error) {
      console.warn('⚠️ sessionStorage backup retrieval failed:', error);
    }
    
    // Method 3: Try IndexedDB
    try {
      const tokens = await this.getFromIndexedDB();
      if (tokens && this.validateTokenData(tokens)) {
        console.log('✅ Tokens retrieved from IndexedDB');
        // Re-store in primary locations
        await this.storeTokens(tokens);
        return tokens;
      }
    } catch (error) {
      console.warn('⚠️ IndexedDB retrieval failed:', error);
    }
    
    // Method 4: Try legacy format reconstruction
    try {
      const legacyTokens = this.reconstructFromLegacyStorage();
      if (legacyTokens && this.validateTokenData(legacyTokens)) {
        console.log('✅ Tokens reconstructed from legacy storage');
        // Upgrade to modern storage
        await this.storeTokens(legacyTokens);
        return legacyTokens;
      }
    } catch (error) {
      console.warn('⚠️ Legacy storage reconstruction failed:', error);
    }
    
    console.log('❌ No valid tokens found in any storage method');
    return null;
  }
  
  /**
   * Check if valid tokens exist without retrieving them
   */
  async hasValidTokens(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      return tokens !== null && !this.isTokenExpired(tokens);
    } catch (error) {
      console.error('❌ Token validation check failed:', error);
      return false;
    }
  }
  
  /**
   * Get storage status across all methods
   */
  async getStorageStatus(): Promise<StorageStatus> {
    const status: StorageStatus = {
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
      encrypted: false,
      validated: false
    };
    
    try {
      // Check localStorage
      const primaryData = localStorage.getItem(this.STORAGE_KEYS.PRIMARY);
      status.localStorage = !!primaryData;
      status.encrypted = !!primaryData;
      
      // Check sessionStorage
      const backupData = sessionStorage.getItem(this.STORAGE_KEYS.BACKUP);
      status.sessionStorage = !!backupData;
      
      // Check IndexedDB
      const idbData = await this.getFromIndexedDB();
      status.indexedDB = !!idbData;
      
      // Check validation
      const validationData = localStorage.getItem(this.STORAGE_KEYS.VALIDATION);
      status.validated = !!validationData;
      
    } catch (error) {
      console.error('❌ Storage status check failed:', error);
    }
    
    return status;
  }
  
  /**
   * Clear all stored tokens across all storage methods
   */
  async clearAllTokens(): Promise<void> {
    console.log('🧹 Clearing all stored tokens...');
    
    const clearOperations = [
      // localStorage
      () => {
        Object.values(this.STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
        // Legacy keys
        ['ebay_manual_token', 'ebay_access_token', 'ebay_refresh_token', 
         'ebay_token_expiry', 'ebay_oauth_tokens', 'oauth_tokens'].forEach(key => {
          localStorage.removeItem(key);
        });
      },
      
      // sessionStorage
      () => {
        Object.values(this.STORAGE_KEYS).forEach(key => {
          sessionStorage.removeItem(key);
        });
      },
      
      // IndexedDB
      () => this.clearIndexedDB(),
    ];
    
    const results = await Promise.allSettled(clearOperations.map(op => 
      Promise.resolve().then(op)
    ));
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Cleared tokens from ${successful}/${results.length} storage methods`);
  }
  
  /**
   * Repair corrupted storage by rebuilding from valid sources
   */
  async repairStorage(): Promise<void> {
    console.log('🔧 Attempting storage repair...');
    
    try {
      const tokens = await this.getTokens();
      if (tokens) {
        // Re-store using all methods to repair corrupted storage
        await this.clearAllTokens();
        await this.storeTokens(tokens);
        console.log('✅ Storage repair completed successfully');
      } else {
        console.log('❌ No valid tokens found for repair');
      }
    } catch (error) {
      console.error('❌ Storage repair failed:', error);
      throw error;
    }
  }
  
  /**
   * Validate token data structure and expiration
   */
  private validateTokenData(tokens: any): boolean {
    if (!tokens || typeof tokens !== 'object') {
      return false;
    }
    
    // Required fields
    if (!tokens.access_token || !tokens.token_type) {
      return false;
    }
    
    // Check expiration
    if (this.isTokenExpired(tokens)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if token is expired
   */
  private isTokenExpired(tokens: TokenData): boolean {
    if (!tokens.expires_at) {
      return false; // No expiry info, assume valid
    }
    
    // Add 5-minute buffer
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    return Date.now() + bufferTime >= tokens.expires_at;
  }
  
  /**
   * Generate hash for token validation
   */
  private generateTokenHash(token: string): string {
    // Simple hash for validation (not cryptographic)
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
  
  /**
   * Initialize IndexedDB for persistent storage
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB not supported');
        resolve();
        return;
      }
      
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => {
        console.warn('IndexedDB initialization failed');
        resolve(); // Don't reject, continue without IndexedDB
      };
      
      request.onsuccess = () => {
        console.log('✅ IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('expires_at', 'expires_at', { unique: false });
        }
      };
    });
  }
  
  /**
   * Store tokens in IndexedDB
   */
  private async storeInIndexedDB(tokens: TokenData, metadata: TokenMetadata): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const data = {
          id: 'current_tokens',
          tokens,
          metadata,
          stored_at: Date.now()
        };
        
        const putRequest = store.put(data);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * Retrieve tokens from IndexedDB
   */
  private async getFromIndexedDB(): Promise<TokenData | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const getRequest = store.get('current_tokens');
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? result.tokens : null);
        };
        
        getRequest.onerror = () => resolve(null);
      };
      
      request.onerror = () => resolve(null);
    });
  }
  
  /**
   * Clear IndexedDB storage
   */
  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => resolve(); // Don't fail on clear errors
      };
      
      request.onerror = () => resolve();
    });
  }
  
  /**
   * Store tokens in Supabase for logged-in users
   */
  private async storeInSupabase(userId: string, tokens: TokenData): Promise<void> {
    try {
      const encryptedTokens = this.encryptionService.encryptTokens(tokens);
      
      const { error } = await supabase
        .from('user_oauth_tokens')
        .upsert({
          user_id: userId,
          provider: 'ebay',
          access_token_encrypted: JSON.stringify(encryptedTokens.access_token_encrypted),
          refresh_token_encrypted: encryptedTokens.refresh_token_encrypted 
            ? JSON.stringify(encryptedTokens.refresh_token_encrypted) 
            : null,
          expires_at: new Date(tokens.expires_at).toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,provider'
        });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Supabase storage error:', error);
      throw error;
    }
  }
  
  /**
   * Reconstruct tokens from legacy storage format
   */
  private reconstructFromLegacyStorage(): TokenData | null {
    try {
      const accessToken = localStorage.getItem('ebay_access_token') || 
                         localStorage.getItem('ebay_manual_token');
      const refreshToken = localStorage.getItem('ebay_refresh_token');
      const expiry = localStorage.getItem('ebay_token_expiry');
      
      if (!accessToken) {
        return null;
      }
      
      const expiresAt = expiry ? parseInt(expiry) : Date.now() + (7200 * 1000);
      const expiresIn = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      
      return {
        access_token: accessToken,
        refresh_token: refreshToken || undefined,
        expires_in: expiresIn,
        expires_at: expiresAt,
        token_type: 'Bearer',
        created_at: Date.now() - (7200 * 1000), // Estimate creation time
        updated_at: Date.now()
      };
    } catch (error) {
      console.error('Legacy reconstruction failed:', error);
      return null;
    }
  }
  
  /**
   * Update last validated timestamp
   */
  private async updateLastValidated(tokens: TokenData): Promise<void> {
    try {
      const metadataStr = localStorage.getItem(this.STORAGE_KEYS.METADATA);
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        metadata.last_validated = Date.now();
        localStorage.setItem(this.STORAGE_KEYS.METADATA, JSON.stringify(metadata));
      }
    } catch (error) {
      // Non-critical error, continue
    }
  }
  
  /**
   * Perform storage health check
   */
  private async performStorageHealthCheck(): Promise<void> {
    const healthCheck = {
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
      encryption: false
    };
    
    try {
      // Test localStorage
      const testKey = 'ebay_health_check';
      localStorage.setItem(testKey, 'test');
      healthCheck.localStorage = localStorage.getItem(testKey) === 'test';
      localStorage.removeItem(testKey);
    } catch (error) {
      console.warn('localStorage health check failed:', error);
    }
    
    try {
      // Test sessionStorage
      const testKey = 'ebay_session_health_check';
      sessionStorage.setItem(testKey, 'test');
      healthCheck.sessionStorage = sessionStorage.getItem(testKey) === 'test';
      sessionStorage.removeItem(testKey);
    } catch (error) {
      console.warn('sessionStorage health check failed:', error);
    }
    
    try {
      // Test IndexedDB
      healthCheck.indexedDB = !!window.indexedDB;
    } catch (error) {
      console.warn('IndexedDB health check failed:', error);
    }
    
    try {
      // Test encryption
      const testData = 'encryption_test';
      const encrypted = this.encryptionService.encrypt(testData);
      const decrypted = this.encryptionService.decrypt(encrypted);
      healthCheck.encryption = decrypted === testData;
    } catch (error) {
      console.warn('Encryption health check failed:', error);
    }
    
    console.log('🏥 Storage health check:', healthCheck);
  }
  
  /**
   * Clean up expired tokens from all storage methods
   */
  private async cleanupExpiredTokens(): Promise<void> {
    try {
      const tokens = await this.getTokens();
      if (tokens && this.isTokenExpired(tokens)) {
        console.log('🧹 Cleaning up expired tokens');
        await this.clearAllTokens();
      }
    } catch (error) {
      console.warn('Token cleanup failed:', error);
    }
  }
}

export default EnhancedTokenStorageService;