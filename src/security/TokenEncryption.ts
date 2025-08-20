/**
 * TokenEncryption Class
 * 
 * Implements AES-256-GCM encryption for secure token storage with:
 * - Hardware Security Module (HSM) compatible key management
 * - Key rotation and versioning
 * - Secure random IV generation
 * - Authentication tag verification
 * - Performance monitoring
 */

import { createClient } from '@supabase/supabase-js';

// Types for encryption operations
interface EncryptionResult {
  encryptedData: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
  keyVersion: number;
}

interface DecryptionInput {
  encryptedData: Uint8Array;
  iv: Uint8Array;
  tag: Uint8Array;
  keyVersion: number;
}

interface EncryptionKey {
  id: string;
  version: number;
  key: CryptoKey;
  status: 'active' | 'deprecated' | 'revoked';
  createdAt: Date;
}

interface PerformanceMetrics {
  encryptionTime: number;
  decryptionTime: number;
  keyRotationTime: number;
}

interface SecurityContext {
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  riskScore?: number;
}

export class TokenEncryption {
  private supabase: any;
  private keyCache: Map<number, EncryptionKey> = new Map();
  private keyRotationInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private performanceMetrics: PerformanceMetrics[] = [];
  private maxCacheSize: number = 10;
  
  // Encryption constants
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 16; // 128 bits
  private readonly TAG_LENGTH = 16; // 128 bits

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeKeyCache();
  }

  /**
   * Initialize encryption key cache and start rotation monitoring
   */
  private async initializeKeyCache(): Promise<void> {
    try {
      await this.loadActiveKeys();
      this.startKeyRotationMonitoring();
    } catch (error) {
      console.error('Failed to initialize encryption key cache:', error);
      throw new Error('Encryption system initialization failed');
    }
  }

  /**
   * Load active encryption keys from database
   */
  private async loadActiveKeys(): Promise<void> {
    const { data: keys, error } = await this.supabase
      .from('encryption_keys')
      .select('*')
      .in('status', ['active', 'deprecated'])
      .order('key_version', { ascending: false })
      .limit(this.maxCacheSize);

    if (error) {
      throw new Error(`Failed to load encryption keys: ${error.message}`);
    }

    for (const keyData of keys) {
      const cryptoKey = await this.reconstructCryptoKey(keyData);
      this.keyCache.set(keyData.key_version, {
        id: keyData.id,
        version: keyData.key_version,
        key: cryptoKey,
        status: keyData.status,
        createdAt: new Date(keyData.created_at)
      });
    }
  }

  /**
   * Reconstruct CryptoKey from encrypted database storage
   */
  private async reconstructCryptoKey(keyData: any): Promise<CryptoKey> {
    try {
      // Decrypt the key using environment-based master key
      const masterKeyBytes = await this.getMasterKeyFromEnvironment();
      const decryptedKeyMaterial = await this.decryptKeyMaterial(
        keyData.encrypted_key,
        keyData.key_iv,
        keyData.key_tag,
        masterKeyBytes
      );

      // Import the key material as a CryptoKey
      return await crypto.subtle.importKey(
        'raw',
        decryptedKeyMaterial,
        { name: this.ALGORITHM },
        false, // Not extractable
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      throw new Error(`Failed to reconstruct crypto key: ${error.message}`);
    }
  }

  /**
   * Get master key from environment variables (simulating HSM)
   */
  private async getMasterKeyFromEnvironment(): Promise<Uint8Array> {
    const masterKeyHex = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKeyHex) {
      throw new Error('Master encryption key not found in environment');
    }

    // Validate key format and length
    if (!/^[0-9a-fA-F]{64}$/.test(masterKeyHex)) {
      throw new Error('Invalid master key format');
    }

    return new Uint8Array(
      masterKeyHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );
  }

  /**
   * Decrypt key material using master key
   */
  private async decryptKeyMaterial(
    encryptedKey: Uint8Array,
    iv: Uint8Array,
    tag: Uint8Array,
    masterKey: Uint8Array
  ): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      masterKey,
      { name: this.ALGORITHM },
      false,
      ['decrypt']
    );

    const encryptedBuffer = new Uint8Array(encryptedKey.length + tag.length);
    encryptedBuffer.set(encryptedKey);
    encryptedBuffer.set(tag, encryptedKey.length);

    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      cryptoKey,
      encryptedBuffer
    );

    return new Uint8Array(decrypted);
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  async encrypt(
    data: string | object,
    context?: SecurityContext
  ): Promise<EncryptionResult> {
    const startTime = performance.now();
    
    try {
      // Get active encryption key
      const activeKey = await this.getActiveKey();
      
      // Prepare data for encryption
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
      const dataBuffer = new TextEncoder().encode(plaintext);
      
      // Generate secure random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      // Encrypt with authentication
      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv, tagLength: this.TAG_LENGTH * 8 },
        activeKey.key,
        dataBuffer
      );
      
      const encryptedArray = new Uint8Array(encrypted);
      const encryptedData = encryptedArray.slice(0, -this.TAG_LENGTH);
      const tag = encryptedArray.slice(-this.TAG_LENGTH);
      
      // Record performance metrics
      const encryptionTime = performance.now() - startTime;
      this.recordPerformanceMetric('encryption', encryptionTime);
      
      // Log security event if context provided
      if (context) {
        await this.logSecurityEvent('encrypt', context, encryptionTime);
      }
      
      return {
        encryptedData,
        iv,
        tag,
        keyVersion: activeKey.version
      };
      
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error(`Token encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   */
  async decrypt(
    input: DecryptionInput,
    context?: SecurityContext
  ): Promise<string> {
    const startTime = performance.now();
    
    try {
      // Get decryption key by version
      const decryptionKey = await this.getKeyByVersion(input.keyVersion);
      
      if (!decryptionKey) {
        throw new Error(`Encryption key version ${input.keyVersion} not found`);
      }
      
      // Prepare encrypted data with tag
      const encryptedBuffer = new Uint8Array(input.encryptedData.length + input.tag.length);
      encryptedBuffer.set(input.encryptedData);
      encryptedBuffer.set(input.tag, input.encryptedData.length);
      
      // Decrypt and verify authentication
      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: input.iv, tagLength: this.TAG_LENGTH * 8 },
        decryptionKey.key,
        encryptedBuffer
      );
      
      const decryptionTime = performance.now() - startTime;
      this.recordPerformanceMetric('decryption', decryptionTime);
      
      // Log security event if context provided
      if (context) {
        await this.logSecurityEvent('decrypt', context, decryptionTime);
      }
      
      return new TextDecoder().decode(decrypted);
      
    } catch (error) {
      console.error('Decryption failed:', error);
      
      // Log failed decryption attempt
      if (context) {
        await this.logSecurityEvent('decrypt_failed', context, 0, {
          error: error.message,
          keyVersion: input.keyVersion
        });
      }
      
      throw new Error(`Token decryption failed: ${error.message}`);
    }
  }

  /**
   * Get active encryption key
   */
  private async getActiveKey(): Promise<EncryptionKey> {
    // Try to get from cache first
    for (const key of this.keyCache.values()) {
      if (key.status === 'active') {
        return key;
      }
    }

    // Reload cache and try again
    await this.loadActiveKeys();
    
    for (const key of this.keyCache.values()) {
      if (key.status === 'active') {
        return key;
      }
    }

    throw new Error('No active encryption key found');
  }

  /**
   * Get encryption key by version
   */
  private async getKeyByVersion(version: number): Promise<EncryptionKey | null> {
    // Check cache first
    if (this.keyCache.has(version)) {
      return this.keyCache.get(version)!;
    }

    // Load from database if not in cache
    const { data: keyData, error } = await this.supabase
      .from('encryption_keys')
      .select('*')
      .eq('key_version', version)
      .single();

    if (error || !keyData) {
      return null;
    }

    const cryptoKey = await this.reconstructCryptoKey(keyData);
    const encryptionKey = {
      id: keyData.id,
      version: keyData.key_version,
      key: cryptoKey,
      status: keyData.status,
      createdAt: new Date(keyData.created_at)
    };

    // Add to cache (with size limit)
    if (this.keyCache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.keyCache.entries())
        .sort(([,a], [,b]) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      this.keyCache.delete(oldestKey[0]);
    }
    
    this.keyCache.set(version, encryptionKey);
    return encryptionKey;
  }

  /**
   * Generate new encryption key for rotation
   */
  async generateNewKey(): Promise<EncryptionKey> {
    const startTime = performance.now();
    
    try {
      // Generate new cryptographic key
      const newCryptoKey = await crypto.subtle.generateKey(
        { name: this.ALGORITHM, length: this.KEY_LENGTH },
        true, // Extractable for storage
        ['encrypt', 'decrypt']
      );

      // Export key for encrypted storage
      const keyMaterial = await crypto.subtle.exportKey('raw', newCryptoKey);
      
      // Encrypt key material with master key
      const masterKeyBytes = await this.getMasterKeyFromEnvironment();
      const keyIv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      const encryptedKeyData = await this.encryptKeyMaterial(
        new Uint8Array(keyMaterial),
        keyIv,
        masterKeyBytes
      );

      // Get next version number
      const nextVersion = await this.getNextKeyVersion();

      // Store encrypted key in database
      const { data: keyRecord, error } = await this.supabase
        .from('encryption_keys')
        .insert({
          key_version: nextVersion,
          encrypted_key: encryptedKeyData.encryptedKey,
          key_iv: keyIv,
          key_tag: encryptedKeyData.tag,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to store new encryption key: ${error.message}`);
      }

      // Create non-extractable key for use
      const usableKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: this.ALGORITHM },
        false,
        ['encrypt', 'decrypt']
      );

      const newKey: EncryptionKey = {
        id: keyRecord.id,
        version: nextVersion,
        key: usableKey,
        status: 'active',
        createdAt: new Date()
      };

      // Update cache
      this.keyCache.set(nextVersion, newKey);

      const keyRotationTime = performance.now() - startTime;
      this.recordPerformanceMetric('keyRotation', keyRotationTime);

      return newKey;
      
    } catch (error) {
      console.error('Key generation failed:', error);
      throw new Error(`Failed to generate new encryption key: ${error.message}`);
    }
  }

  /**
   * Encrypt key material using master key
   */
  private async encryptKeyMaterial(
    keyMaterial: Uint8Array,
    iv: Uint8Array,
    masterKey: Uint8Array
  ): Promise<{ encryptedKey: Uint8Array; tag: Uint8Array }> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      masterKey,
      { name: this.ALGORITHM },
      false,
      ['encrypt']
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv, tagLength: this.TAG_LENGTH * 8 },
      cryptoKey,
      keyMaterial
    );

    const encryptedArray = new Uint8Array(encrypted);
    const encryptedKey = encryptedArray.slice(0, -this.TAG_LENGTH);
    const tag = encryptedArray.slice(-this.TAG_LENGTH);

    return { encryptedKey, tag };
  }

  /**
   * Get next key version number
   */
  private async getNextKeyVersion(): Promise<number> {
    const { data, error } = await this.supabase
      .from('encryption_keys')
      .select('key_version')
      .order('key_version', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to get next key version: ${error.message}`);
    }

    return data.length > 0 ? data[0].key_version + 1 : 1;
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<void> {
    try {
      // Deprecate current active key
      await this.supabase
        .from('encryption_keys')
        .update({ 
          status: 'deprecated',
          deprecated_at: new Date().toISOString()
        })
        .eq('status', 'active');

      // Generate new active key
      const newKey = await this.generateNewKey();
      
      // Update cache
      await this.loadActiveKeys();
      
      console.log(`Key rotation completed. New key version: ${newKey.version}`);
      
    } catch (error) {
      console.error('Key rotation failed:', error);
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }

  /**
   * Start automatic key rotation monitoring
   */
  private startKeyRotationMonitoring(): void {
    setInterval(async () => {
      try {
        const activeKey = await this.getActiveKey();
        const keyAge = Date.now() - activeKey.createdAt.getTime();
        
        if (keyAge >= this.keyRotationInterval) {
          console.log('Automatic key rotation triggered');
          await this.rotateKeys();
        }
      } catch (error) {
        console.error('Key rotation monitoring error:', error);
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Record performance metrics
   */
  private recordPerformanceMetric(operation: string, duration: number): void {
    const metric = {
      encryptionTime: operation === 'encryption' ? duration : 0,
      decryptionTime: operation === 'decryption' ? duration : 0,
      keyRotationTime: operation === 'keyRotation' ? duration : 0
    };

    this.performanceMetrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }

  /**
   * Log security events for audit trail
   */
  private async logSecurityEvent(
    action: string,
    context: SecurityContext,
    duration: number,
    metadata?: any
  ): Promise<void> {
    try {
      await this.supabase
        .from('token_audit_log')
        .insert({
          action: action.includes('decrypt') ? 'read' : 'create',
          table_name: 'encrypted_tokens',
          session_id: context.sessionId,
          request_id: context.requestId,
          user_agent: context.userAgent,
          ip_address: context.ipAddress,
          risk_score: context.riskScore || 0,
          new_values: {
            operation: action,
            duration_ms: duration,
            metadata
          }
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw here as it shouldn't break the main operation
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageEncryptionTime: number;
    averageDecryptionTime: number;
    averageKeyRotationTime: number;
    totalOperations: number;
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        averageEncryptionTime: 0,
        averageDecryptionTime: 0,
        averageKeyRotationTime: 0,
        totalOperations: 0
      };
    }

    const totals = this.performanceMetrics.reduce(
      (acc, metric) => ({
        encryption: acc.encryption + metric.encryptionTime,
        decryption: acc.decryption + metric.decryptionTime,
        keyRotation: acc.keyRotation + metric.keyRotationTime
      }),
      { encryption: 0, decryption: 0, keyRotation: 0 }
    );

    const count = this.performanceMetrics.length;

    return {
      averageEncryptionTime: totals.encryption / count,
      averageDecryptionTime: totals.decryption / count,
      averageKeyRotationTime: totals.keyRotation / count,
      totalOperations: count
    };
  }

  /**
   * Validate encryption system health
   */
  async validateHealth(): Promise<{
    healthy: boolean;
    activeKeys: number;
    deprecatedKeys: number;
    lastRotation: Date | null;
    performanceHealth: boolean;
  }> {
    try {
      const { data: keys, error } = await this.supabase
        .from('encryption_keys')
        .select('status, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Health check failed: ${error.message}`);
      }

      const activeKeys = keys.filter(k => k.status === 'active').length;
      const deprecatedKeys = keys.filter(k => k.status === 'deprecated').length;
      const lastRotation = keys.length > 0 ? new Date(keys[0].created_at) : null;

      const stats = this.getPerformanceStats();
      const performanceHealth = stats.averageEncryptionTime < 100 && 
                               stats.averageDecryptionTime < 100;

      return {
        healthy: activeKeys > 0 && performanceHealth,
        activeKeys,
        deprecatedKeys,
        lastRotation,
        performanceHealth
      };
    } catch (error) {
      console.error('Health validation failed:', error);
      return {
        healthy: false,
        activeKeys: 0,
        deprecatedKeys: 0,
        lastRotation: null,
        performanceHealth: false
      };
    }
  }
}