import crypto from 'crypto';

/**
 * Secure token encryption service using AES-256-GCM
 * Provides enterprise-grade encryption for OAuth tokens
 */
export class TokenEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keySize = 32; // 256 bits
  private readonly ivSize = 16;  // 128 bits
  private readonly tagSize = 16; // 128 bits
  private readonly encryptionKey: Buffer;
  
  constructor() {
    this.encryptionKey = this.getEncryptionKey();
    this.validateKeyStrength();
  }
  
  private getEncryptionKey(): Buffer {
    const keyBase64 = process.env.ENCRYPTION_KEY;
    
    if (!keyBase64) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    return Buffer.from(keyBase64, 'base64');
  }
  
  private validateKeyStrength(): void {
    if (this.encryptionKey.length < this.keySize) {
      throw new Error('Encryption key must be at least 256 bits (32 bytes)');
    }
  }
  
  /**
   * Encrypt sensitive token data
   */
  encrypt(plaintext: string): EncryptedData {
    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivSize);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.algorithm
      };
      
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt token data');
    }
  }
  
  /**
   * Decrypt token data
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      // Validate input
      if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.tag) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        Buffer.from(encryptedData.iv, 'hex')
      );
      
      // Set authentication tag
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt token data');
    }
  }
  
  /**
   * Generate a secure encryption key (for initial setup)
   */
  static generateEncryptionKey(): string {
    const key = crypto.randomBytes(32); // 256 bits
    return key.toString('base64');
  }
  
  /**
   * Encrypt token object for database storage
   */
  encryptTokens(tokens: any): EncryptedTokenData {
    const tokensJson = JSON.stringify(tokens);
    const encryptedAccess = this.encrypt(tokens.access_token);
    const encryptedRefresh = this.encrypt(tokens.refresh_token || '');
    const encryptedFull = this.encrypt(tokensJson);
    
    return {
      access_token_encrypted: encryptedAccess,
      refresh_token_encrypted: encryptedRefresh,
      full_token_data_encrypted: encryptedFull,
      created_at: Date.now()
    };
  }
  
  /**
   * Decrypt token object from database
   */
  decryptTokens(encryptedTokenData: EncryptedTokenData): any {
    try {
      // Try to decrypt full token data first
      if (encryptedTokenData.full_token_data_encrypted) {
        const decryptedJson = this.decrypt(encryptedTokenData.full_token_data_encrypted);
        return JSON.parse(decryptedJson);
      }
      
      // Fallback to individual token decryption
      const accessToken = this.decrypt(encryptedTokenData.access_token_encrypted);
      const refreshToken = encryptedTokenData.refresh_token_encrypted 
        ? this.decrypt(encryptedTokenData.refresh_token_encrypted) 
        : null;
      
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer'
      };
      
    } catch (error) {
      console.error('Token decryption failed:', error);
      throw new Error('Failed to decrypt stored tokens');
    }
  }
}

// Type definitions
export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  algorithm: string;
}

export interface EncryptedTokenData {
  access_token_encrypted: EncryptedData;
  refresh_token_encrypted?: EncryptedData;
  full_token_data_encrypted?: EncryptedData;
  created_at: number;
}

export default TokenEncryptionService;