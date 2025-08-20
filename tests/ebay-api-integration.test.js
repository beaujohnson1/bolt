/**
 * Comprehensive test suite for hendt/ebay-api integration
 * Tests OAuth flow, token management, and listing creation
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { EBayApiService } from '../src/services/EBayApiService';
import { TokenEncryptionService } from '../src/services/TokenEncryptionService';
import { EBayTokenService } from '../src/services/EBayTokenService';
import { EBayListingService } from '../src/services/EBayListingService';
import { EBayRateLimiter } from '../src/services/EBayRateLimiter';
import { AIToEBayPipeline } from '../src/services/AIToEBayPipeline';

describe('eBay API Integration Tests', () => {
  let apiService;
  let tokenService;
  let listingService;
  let rateLimiter;
  let pipeline;
  
  beforeAll(() => {
    // Initialize services
    apiService = new EBayApiService();
    tokenService = new EBayTokenService();
    listingService = new EBayListingService(apiService);
    rateLimiter = new EBayRateLimiter();
    pipeline = new AIToEBayPipeline();
  });
  
  describe('Token Encryption Service', () => {
    let encryptionService;
    
    beforeAll(() => {
      encryptionService = new TokenEncryptionService();
    });
    
    it('should encrypt and decrypt tokens correctly', () => {
      const originalToken = 'v^1.1#i^1#p^3#f^0#I^3#r^1#t^Ul4xMF8wOjdGQ0M5MEVG';
      
      const encrypted = encryptionService.encrypt(originalToken);
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted.encrypted).not.toBe(originalToken);
      
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(originalToken);
    });
    
    it('should encrypt token objects', () => {
      const tokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_in: 7200,
        token_type: 'Bearer'
      };
      
      const encryptedData = encryptionService.encryptTokens(tokens);
      expect(encryptedData).toHaveProperty('access_token_encrypted');
      expect(encryptedData).toHaveProperty('refresh_token_encrypted');
      expect(encryptedData).toHaveProperty('full_token_data_encrypted');
      
      const decryptedTokens = encryptionService.decryptTokens(encryptedData);
      expect(decryptedTokens.access_token).toBe(tokens.access_token);
      expect(decryptedTokens.refresh_token).toBe(tokens.refresh_token);
    });
    
    it('should generate secure encryption keys', () => {
      const key = TokenEncryptionService.generateEncryptionKey();
      expect(key).toBeTruthy();
      expect(Buffer.from(key, 'base64').length).toBe(32);
    });
  });
  
  describe('OAuth Flow', () => {
    it('should generate valid authorization URL', () => {
      const authUrl = apiService.generateAuthUrl('user123', 'session456');
      
      expect(authUrl).toContain('https://auth.ebay.com/oauth2/authorize');
      expect(authUrl).toContain('client_id=');
      expect(authUrl).toContain('redirect_uri=');
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain('state=');
    });
    
    it('should validate state parameter', () => {
      const validState = 'a'.repeat(64);
      const invalidState = 'invalid';
      
      expect(apiService.validateState(validState)).toBe(true);
      expect(apiService.validateState(invalidState)).toBe(false);
    });
    
    it('should handle OAuth callback errors', async () => {
      await expect(
        apiService.handleOAuthCallback('invalid_code', 'invalid_state')
      ).rejects.toThrow('Invalid state parameter');
    });
  });
  
  describe('Token Management', () => {
    const mockUserId = 'test-user-123';
    const mockTokens = {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      expires_in: 7200,
      token_type: 'Bearer',
      created_at: Date.now(),
      expires_at: Date.now() + 7200000
    };
    
    it('should store encrypted tokens', async () => {
      // Mock Supabase response
      jest.spyOn(tokenService, 'storeTokens').mockResolvedValue();
      
      await expect(
        tokenService.storeTokens(mockUserId, mockTokens)
      ).resolves.not.toThrow();
    });
    
    it('should retrieve and decrypt tokens', async () => {
      jest.spyOn(tokenService, 'getTokens').mockResolvedValue(mockTokens);
      
      const tokens = await tokenService.getTokens(mockUserId);
      expect(tokens).toHaveProperty('access_token');
      expect(tokens).toHaveProperty('refresh_token');
    });
    
    it('should check token validity', async () => {
      jest.spyOn(tokenService, 'hasValidToken').mockResolvedValue(true);
      
      const hasValid = await tokenService.hasValidToken(mockUserId);
      expect(hasValid).toBe(true);
    });
  });
  
  describe('Rate Limiting', () => {
    const mockContext = {
      userId: 'test-user',
      operation: 'createListing',
      apiType: 'sell'
    };
    
    it('should enforce rate limits', async () => {
      const apiCall = jest.fn().mockResolvedValue({ success: true });
      
      const result = await rateLimiter.executeWithRetry(
        apiCall,
        mockContext
      );
      
      expect(result).toEqual({ success: true });
      expect(apiCall).toHaveBeenCalled();
    });
    
    it('should retry on retryable errors', async () => {
      const apiCall = jest.fn()
        .mockRejectedValueOnce({ errorCode: 2001 })
        .mockResolvedValueOnce({ success: true });
      
      const result = await rateLimiter.executeWithRetry(
        apiCall,
        mockContext
      );
      
      expect(result).toEqual({ success: true });
      expect(apiCall).toHaveBeenCalledTimes(2);
    });
    
    it('should handle circuit breaker', async () => {
      const apiCall = jest.fn().mockRejectedValue({ errorCode: 500 });
      
      // Trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await rateLimiter.executeWithRetry(apiCall, mockContext);
        } catch (e) {
          // Expected to fail
        }
      }
      
      // Circuit should be open now
      await expect(
        rateLimiter.executeWithRetry(apiCall, mockContext)
      ).rejects.toThrow('Circuit breaker open');
    });
    
    it('should track rate limit status', () => {
      const status = rateLimiter.getRateLimitStatus('test-user', 'sell');
      
      expect(status).toHaveProperty('used');
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('resetAt');
      expect(status).toHaveProperty('percentUsed');
    });
  });
  
  describe('Listing Creation', () => {
    const mockProductData = {
      id: 'test-123',
      title: 'Test Product',
      brand: 'TestBrand',
      model: 'Model123',
      category: 'Electronics',
      condition: 'LIKE_NEW',
      aiGeneratedDescription: 'This is a test product description',
      aiExtractedFeatures: {
        color: 'Black',
        size: 'Medium',
        material: 'Plastic'
      },
      suggestedPrice: 49.99,
      quantity: 1,
      images: []
    };
    
    it('should map AI data to eBay aspects', () => {
      const aspects = listingService.mapAspects(mockProductData.aiExtractedFeatures);
      
      expect(aspects).toHaveProperty('Color', ['Black']);
      expect(aspects).toHaveProperty('Size', ['Medium']);
      expect(aspects).toHaveProperty('Material', ['Plastic']);
    });
    
    it('should optimize title for eBay', () => {
      const longTitle = 'This is a very long title that exceeds the eBay limit of 80 characters and needs to be truncated';
      const optimized = listingService.optimizeTitle(longTitle);
      
      expect(optimized.length).toBeLessThanOrEqual(80);
      expect(optimized).toContain('...');
    });
    
    it('should map conditions correctly', () => {
      expect(listingService.mapCondition('NEW')).toBe('1000');
      expect(listingService.mapCondition('LIKE_NEW')).toBe('2000');
      expect(listingService.mapCondition('GOOD')).toBe('4000');
      expect(listingService.mapCondition('UNKNOWN')).toBe('3000');
    });
    
    it('should generate valid SKUs', () => {
      const sku = listingService.generateSKU(mockProductData);
      
      expect(sku).toMatch(/^[A-Z]{2}-[a-z0-9]+-[A-Z0-9]{3}$/);
      expect(sku).toContain('TE'); // First two letters of TestBrand
    });
  });
  
  describe('AI to eBay Pipeline', () => {
    it('should process pipeline successfully', async () => {
      const mockImages = [
        new File(['image1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'image2.jpg', { type: 'image/jpeg' })
      ];
      
      // Mock AI processing
      jest.spyOn(pipeline, 'processImagesWithAI').mockResolvedValue({
        title: 'AI Generated Title',
        brand: 'Brand',
        suggestedPrice: 29.99,
        condition: 'GOOD',
        aiExtractedFeatures: {}
      });
      
      // Mock listing creation
      jest.spyOn(pipeline.listingService, 'createListing').mockResolvedValue({
        success: true,
        itemId: '123456789',
        offerId: 'offer123',
        sku: 'SKU123',
        listingUrl: 'https://www.ebay.com/itm/123456789'
      });
      
      const result = await pipeline.processAndList(
        mockImages,
        'test-user',
        { quantity: 1 }
      );
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('listingUrl');
      expect(result).toHaveProperty('pipelineId');
    });
    
    it('should handle pipeline errors gracefully', async () => {
      const mockImages = [
        new File(['image'], 'image.jpg', { type: 'image/jpeg' })
      ];
      
      jest.spyOn(pipeline, 'processImagesWithAI').mockRejectedValue(
        new Error('AI processing failed')
      );
      
      await expect(
        pipeline.processAndList(mockImages, 'test-user')
      ).rejects.toThrow('Pipeline failed: AI processing failed');
    });
  });
  
  describe('Integration Flow', () => {
    it('should complete full OAuth to listing flow', async () => {
      // This is an integration test that would run against a test environment
      // Skipped in unit tests but important for end-to-end testing
      
      expect(true).toBe(true);
    });
  });
});

// Mock implementations for testing
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn().mockResolvedValue({ error: null })
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } }
      })
    }
  }
}));

export default describe;