/**
 * Debug utility to check eBay OAuth token storage and detection
 */

export const debugEbayAuth = () => {
  console.log('🔍 [DEBUG] Starting eBay OAuth debug check...');
  
  // Check localStorage contents
  console.log('📦 [DEBUG] localStorage contents:');
  
  const oauthTokens = localStorage.getItem('ebay_oauth_tokens');
  const manualToken = localStorage.getItem('ebay_manual_token');
  
  console.log('🔑 [DEBUG] ebay_oauth_tokens:', oauthTokens);
  console.log('🔑 [DEBUG] ebay_manual_token:', manualToken);
  
  if (oauthTokens) {
    try {
      const parsed = JSON.parse(oauthTokens);
      console.log('✅ [DEBUG] Parsed OAuth tokens:', {
        hasAccessToken: !!parsed.access_token,
        hasRefreshToken: !!parsed.refresh_token,
        accessTokenLength: parsed.access_token?.length,
        refreshTokenLength: parsed.refresh_token?.length,
        expiresAt: parsed.expires_at,
        expiresIn: parsed.expires_in,
        tokenType: parsed.token_type,
        isExpired: parsed.expires_at ? Date.now() > parsed.expires_at : 'unknown'
      });
    } catch (error) {
      console.error('❌ [DEBUG] Error parsing OAuth tokens:', error);
    }
  } else {
    console.log('❌ [DEBUG] No OAuth tokens found in localStorage');
  }
  
  if (manualToken) {
    console.log('✅ [DEBUG] Manual token found, length:', manualToken.length);
  } else {
    console.log('❌ [DEBUG] No manual token found in localStorage');
  }
  
  // Check all localStorage keys
  console.log('🗂️ [DEBUG] All localStorage keys:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.includes('ebay') || key?.includes('oauth')) {
      console.log(`  - ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`);
    }
  }
  
  console.log('🔍 [DEBUG] eBay OAuth debug check complete');
};

// Make it available globally for console testing
(window as any).debugEbayAuth = debugEbayAuth;