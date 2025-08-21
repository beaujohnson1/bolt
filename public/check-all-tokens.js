/**
 * Comprehensive Token Checker
 * Finds ALL eBay-related tokens in localStorage
 */

console.log('🔍 Scanning ALL localStorage for eBay tokens...\n');

// Get all localStorage keys
const allKeys = Object.keys(localStorage);
console.log(`Total localStorage keys: ${allKeys.length}\n`);

// Find all eBay-related keys (case insensitive)
const ebayKeys = allKeys.filter(key => {
  const lowerKey = key.toLowerCase();
  return lowerKey.includes('ebay') || 
         lowerKey.includes('oauth') || 
         lowerKey.includes('token') ||
         lowerKey.includes('easyflip');
});

console.log(`Found ${ebayKeys.length} potentially eBay-related keys:\n`);

// Display each key with its value preview
ebayKeys.forEach(key => {
  const value = localStorage.getItem(key);
  console.log(`📦 ${key}:`);
  console.log(`   Length: ${value ? value.length : 0} characters`);
  
  if (value) {
    // Check if it looks like corrupted data
    const hasDebugPatterns = [
      'console.log',
      'timestamp',
      'message":',
      '[{',
      'DEBUG',
      '🔍',
      '✅',
      '❌'
    ].some(pattern => value.includes(pattern));
    
    if (hasDebugPatterns) {
      console.log(`   ⚠️ LIKELY CORRUPTED (contains debug patterns)`);
    }
    
    // Show preview
    const preview = value.length > 100 ? 
      value.substring(0, 100) + '...' : 
      value;
    console.log(`   Preview: ${preview}`);
  }
  console.log('');
});

// Function to clear ALL eBay tokens
window.clearAllEbayTokens = function() {
  console.log('\n🗑️ Clearing ALL eBay-related tokens...\n');
  
  const keysToRemove = allKeys.filter(key => {
    const lowerKey = key.toLowerCase();
    return lowerKey.includes('ebay') || 
           lowerKey.includes('oauth') || 
           lowerKey.includes('token') ||
           lowerKey.includes('easyflip');
  });
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`   ✅ Removed: ${key}`);
  });
  
  console.log('\n✨ All eBay tokens cleared!');
  console.log('Please click "Reauthenticate with eBay" to get fresh tokens.\n');
};

console.log('\n💡 To clear ALL tokens, run: clearAllEbayTokens()');
console.log('This will remove EVERYTHING eBay-related from localStorage.');