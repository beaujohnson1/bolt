import { supabase } from '../lib/supabase';
import { TokenEncryptionService, EncryptedTokenData } from './TokenEncryptionService';
import { TokenData } from './EBayApiService';

/**
 * Secure multi-user token management service
 * Handles encrypted storage and retrieval of eBay OAuth tokens
 */
export class EBayTokenService {
  private encryption: TokenEncryptionService;
  
  constructor() {
    this.encryption = new TokenEncryptionService();
  }
  
  /**
   * Store encrypted tokens for a user
   */
  async storeTokens(userId: string, tokens: TokenData): Promise<void> {
    try {
      // Encrypt token data
      const encryptedTokens = this.encryption.encryptTokens(tokens);
      
      // Calculate expiry timestamps
      const expiresAt = new Date(tokens.expires_at || Date.now() + (tokens.expires_in * 1000));
      const refreshExpiresAt = new Date(Date.now() + (47304000 * 1000)); // 18 months
      
      // Store in database with upsert
      const { error } = await supabase
        .from('user_oauth_tokens')
        .upsert({
          user_id: userId,
          provider: 'ebay',
          access_token_encrypted: JSON.stringify(encryptedTokens.access_token_encrypted),
          refresh_token_encrypted: encryptedTokens.refresh_token_encrypted 
            ? JSON.stringify(encryptedTokens.refresh_token_encrypted) 
            : null,
          full_token_data_encrypted: JSON.stringify(encryptedTokens.full_token_data_encrypted),
          expires_at: expiresAt.toISOString(),
          refresh_expires_at: refreshExpiresAt.toISOString(),
          scopes: JSON.stringify(tokens.scopes || []),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,provider'
        });
      
      if (error) {
        console.error('Database error storing tokens:', error);
        throw new Error('Failed to store tokens in database');
      }
      
      console.log(`✅ Tokens stored successfully for user ${userId}`);
      
    } catch (error) {
      console.error('Token storage error:', error);
      throw new Error('Failed to store encrypted tokens');
    }
  }
  
  /**
   * Retrieve and decrypt valid tokens for a user
   */
  async getValidToken(userId: string): Promise<string | null> {
    try {
      // Query for valid tokens (5 minute buffer before expiry)
      const { data, error } = await supabase
        .from('user_oauth_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'ebay')
        .gt('expires_at', new Date(Date.now() + 5 * 60 * 1000).toISOString())
        .single();
      
      if (error || !data) {
        console.log(`No valid tokens found for user ${userId}`);
        return null;
      }
      
      // Decrypt access token
      const encryptedData = JSON.parse(data.access_token_encrypted);
      const accessToken = this.encryption.decrypt(encryptedData);
      
      return accessToken;
      
    } catch (error) {
      console.error('Token retrieval error:', error);
      return null;
    }
  }
  
  /**
   * Get full decrypted token data for a user
   */
  async getTokens(userId: string): Promise<TokenData | null> {
    try {
      const { data, error } = await supabase
        .from('user_oauth_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'ebay')
        .single();
      
      if (error || !data) {
        return null;
      }
      
      // Decrypt full token data
      let encryptedTokenData: EncryptedTokenData;
      
      if (data.full_token_data_encrypted) {
        encryptedTokenData = {
          access_token_encrypted: JSON.parse(data.access_token_encrypted),
          refresh_token_encrypted: data.refresh_token_encrypted 
            ? JSON.parse(data.refresh_token_encrypted) 
            : undefined,
          full_token_data_encrypted: JSON.parse(data.full_token_data_encrypted),
          created_at: new Date(data.created_at).getTime()
        };
      } else {
        // Fallback for legacy data
        encryptedTokenData = {
          access_token_encrypted: JSON.parse(data.access_token_encrypted),
          refresh_token_encrypted: data.refresh_token_encrypted 
            ? JSON.parse(data.refresh_token_encrypted) 
            : undefined,
          created_at: new Date(data.created_at).getTime()
        };
      }
      
      const tokens = this.encryption.decryptTokens(encryptedTokenData);
      
      return {
        ...tokens,
        expires_at: new Date(data.expires_at).getTime(),
        created_at: new Date(data.created_at).getTime()
      };
      
    } catch (error) {
      console.error('Full token retrieval error:', error);
      return null;
    }
  }
  
  /**
   * Check if user has valid tokens
   */
  async hasValidToken(userId: string): Promise<boolean> {
    const token = await this.getValidToken(userId);
    return token !== null;
  }
  
  /**
   * Get token scopes for a user
   */
  async getScopes(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_oauth_tokens')
        .select('scopes')
        .eq('user_id', userId)
        .eq('provider', 'ebay')
        .single();
      
      if (error || !data?.scopes) {
        return [];
      }
      
      return JSON.parse(data.scopes);
      
    } catch (error) {
      console.error('Scopes retrieval error:', error);
      return [];
    }
  }
  
  /**
   * Remove tokens for a user (disconnect)
   */
  async removeTokens(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_oauth_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('provider', 'ebay');
      
      if (error) {
        throw new Error('Failed to remove tokens from database');
      }
      
      console.log(`✅ Tokens removed for user ${userId}`);
      
    } catch (error) {
      console.error('Token removal error:', error);
      throw new Error('Failed to disconnect eBay account');
    }
  }
  
  /**
   * Cleanup expired tokens (maintenance task)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_oauth_tokens')
        .delete()
        .eq('provider', 'ebay')
        .lt('refresh_expires_at', new Date().toISOString());
      
      if (error) {
        console.error('Cleanup error:', error);
        return 0;
      }
      
      const count = Array.isArray(data) ? data.length : 0;
      console.log(`🧹 Cleaned up ${count} expired token records`);
      
      return count;
      
    } catch (error) {
      console.error('Token cleanup error:', error);
      return 0;
    }
  }
  
  /**
   * Audit log for token operations
   */
  private async logTokenOperation(
    userId: string, 
    operation: string, 
    success: boolean, 
    details?: any
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: `token_${operation}`,
          resource_type: 'oauth_token',
          success,
          details: details || {},
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw - logging failures shouldn't break main operations
    }
  }
}

export default EBayTokenService;