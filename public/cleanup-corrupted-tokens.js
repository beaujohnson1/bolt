/**
 * Token Cleanup Script
 * Removes corrupted OAuth tokens and prepares for fresh authentication
 */

console.log('🧹 Starting Token Cleanup...\n');

// Function to validate token format
function isValidToken(token) {
  if (!token || typeof token !== 'string') return false;
  
  // Valid OAuth tokens are typically:
  // - Base64 encoded or JWT format
  // - Between 20-2000 characters
  // - Don't contain console log patterns
  
  if (token.length < 20 || token.length > 2000) {
    console.log(`  ❌ Invalid token length: ${token.length} characters`);
    return false;
  }
  
  // Check for common debug/log patterns that indicate corruption
  const debugPatterns = [
    'console.log',
    'DEBUG',
    'INFO',
    '🔍',
    '✅',
    '❌',
    'Validating',
    'Successfully',
    'Error:',
    'Warning:'
  ];
  
  for (const pattern of debugPatterns) {
    if (token.includes(pattern)) {
      console.log(`  ❌ Token contains debug pattern: "${pattern}"`);
      return false;
    }
  }
  
  // Check if it looks like a valid token format
  // OAuth tokens are usually alphanumeric with some special chars
  const validTokenRegex = /^[A-Za-z0-9\-_\.~\+\/]+=*$/;
  if (!validTokenRegex.test(token)) {
    console.log('  ❌ Token contains invalid characters');
    return false;
  }
  
  return true;
}

// Function to clean up tokens
function cleanupTokens() {
  console.log('📋 Checking all eBay-related localStorage entries:\n');
  
  const keysToCheck = [
    'ebay_oauth_tokens',
    'easyflip_ebay_access_token',
    'easyflip_ebay_refresh_token',
    'easyflip_ebay_token_scope',
    'easyflip_ebay_token_expiry'
  ];
  
  const corruptedKeys = [];
  
  for (const key of keysToCheck) {
    const value = localStorage.getItem(key);
    
    if (!value) {
      console.log(`  ⚪ ${key}: Not found`);
      continue;
    }
    
    console.log(`  🔍 ${key}:`);
    
    // Special handling for JSON objects
    if (key === 'ebay_oauth_tokens') {
      try {
        const parsed = JSON.parse(value);
        console.log(`     - Type: JSON object`);
        console.log(`     - Has access_token: ${!!parsed.access_token}`);
        console.log(`     - Has refresh_token: ${!!parsed.refresh_token}`);
        console.log(`     - Has scope: ${!!parsed.scope}`);
        
        if (parsed.access_token && !isValidToken(parsed.access_token)) {
          console.log(`     ❌ CORRUPTED: Invalid access_token`);
          corruptedKeys.push(key);
        } else if (parsed.access_token) {
          console.log(`     ✅ Valid access_token format`);
        }
        
        if (parsed.refresh_token && !isValidToken(parsed.refresh_token)) {
          console.log(`     ❌ CORRUPTED: Invalid refresh_token`);
          corruptedKeys.push(key);
        } else if (parsed.refresh_token) {
          console.log(`     ✅ Valid refresh_token format`);
        }
      } catch (e) {
        console.log(`     ❌ CORRUPTED: Invalid JSON - ${e.message}`);
        corruptedKeys.push(key);
      }
    } 
    // Check individual token fields
    else if (key.includes('access_token') || key.includes('refresh_token')) {
      if (!isValidToken(value)) {
        console.log(`     ❌ CORRUPTED: Invalid token format`);
        console.log(`     - Length: ${value.length} characters`);
        console.log(`     - Preview: ${value.substring(0, 50)}...`);
        corruptedKeys.push(key);
      } else {
        console.log(`     ✅ Valid token format`);
      }
    }
    // Scope and expiry are simple strings/numbers
    else {
      console.log(`     - Value: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
    }
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  if (corruptedKeys.length > 0) {
    console.log('⚠️  CORRUPTED TOKENS DETECTED!\n');
    console.log('The following keys contain corrupted data:');
    corruptedKeys.forEach(key => console.log(`  - ${key}`));
    
    console.log('\n📌 RECOMMENDED ACTION:');
    console.log('Run the following command to clear corrupted tokens:\n');
    console.log('cleanupTokens.remove();\n');
    
    return corruptedKeys;
  } else {
    console.log('✅ All tokens appear to be valid!\n');
    console.log('If you\'re still experiencing issues, you may want to:');
    console.log('1. Click "Reauthenticate with eBay" to get fresh tokens');
    console.log('2. Or run: cleanupTokens.removeAll() to clear everything\n');
    return [];
  }
}

// Function to remove specific corrupted tokens
cleanupTokens.remove = function(keysToRemove) {
  const keys = keysToRemove || cleanupTokens();
  
  if (keys.length === 0) {
    console.log('ℹ️  No corrupted tokens to remove');
    return;
  }
  
  console.log('🗑️  Removing corrupted tokens...\n');
  
  keys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`  ✅ Removed: ${key}`);
  });
  
  console.log('\n✨ Cleanup complete!');
  console.log('Please click "Reauthenticate with eBay" to get fresh tokens.\n');
};

// Function to remove ALL eBay tokens (nuclear option)
cleanupTokens.removeAll = function() {
  console.log('🗑️  Removing ALL eBay tokens...\n');
  
  const allKeys = [
    'ebay_oauth_tokens',
    'easyflip_ebay_access_token',
    'easyflip_ebay_refresh_token',
    'easyflip_ebay_token_scope',
    'easyflip_ebay_token_expiry'
  ];
  
  allKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`  ✅ Removed: ${key}`);
    }
  });
  
  console.log('\n✨ All tokens cleared!');
  console.log('Please click "Reauthenticate with eBay" to authenticate.\n');
};

// Run the check automatically
const corruptedKeys = cleanupTokens();

// Export for use in console
window.cleanupTokens = cleanupTokens;

console.log('💡 TIP: This script is available as window.cleanupTokens');
console.log('You can run cleanupTokens() again anytime to check token status.');