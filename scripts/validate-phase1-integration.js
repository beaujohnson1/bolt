#!/usr/bin/env node
/**
 * Phase 1 Integration Validation Script
 * Validates that OAuth localStorage keys match EasyFlip app format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Phase 1 OAuth Integration Validation');
console.log('=' .repeat(50));

// Test files
const testFile = path.join(__dirname, '../public/test-simple-oauth.html');
const callbackFile = path.join(__dirname, '../netlify/functions/simple-ebay-callback.js');

try {
    const testContent = fs.readFileSync(testFile, 'utf8');
    const callbackContent = fs.readFileSync(callbackFile, 'utf8');

    // Expected localStorage keys in EasyFlip format
    const expectedKeys = [
        'ebay_manual_token',     // Just the access token string
        'ebay_oauth_tokens'      // Full token object as JSON
    ];

    // Old keys that should no longer exist
    const deprecatedKeys = [
        'simple_ebay_access_token',
        'simple_ebay_refresh_token', 
        'simple_ebay_token_expiry'
    ];

    console.log('✅ Checking localStorage key compliance...\n');

    // Validate new keys exist
    let allNewKeysPresent = true;
    expectedKeys.forEach(key => {
        const inTest = testContent.includes(key);
        const inCallback = callbackContent.includes(key);
        
        console.log(`📦 ${key}:`);
        console.log(`   Test file:     ${inTest ? '✅' : '❌'}`);
        console.log(`   Callback file: ${inCallback ? '✅' : '❌'}`);
        
        if (!inTest || !inCallback) {
            allNewKeysPresent = false;
        }
    });

    console.log('\n❌ Checking deprecated keys are removed...\n');

    // Validate old keys are gone
    let noOldKeysRemain = true;
    deprecatedKeys.forEach(key => {
        const inTest = testContent.includes(key);
        const inCallback = callbackContent.includes(key);
        
        if (inTest || inCallback) {
            console.log(`⚠️  ${key}: Still present!`);
            console.log(`   Test file:     ${inTest ? '❌' : '✅'}`);
            console.log(`   Callback file: ${inCallback ? '❌' : '✅'}`);
            noOldKeysRemain = false;
        }
    });

    if (noOldKeysRemain) {
        console.log('✅ All deprecated keys successfully removed');
    }

    console.log('\n' + '=' .repeat(50));
    
    if (allNewKeysPresent && noOldKeysRemain) {
        console.log('🎉 Phase 1 Integration: SUCCESSFUL');
        console.log('');
        console.log('✅ OAuth functions now use EasyFlip localStorage format:');
        console.log('   - ebay_manual_token: Access token string');
        console.log('   - ebay_oauth_tokens: Full token object JSON');
        console.log('');
        console.log('🚀 Ready for Phase 2: Main app integration');
        console.log('');
        console.log('📝 Test the integration:');
        console.log('   1. Visit: https://easyflip.ai/test-simple-oauth.html');
        console.log('   2. Complete OAuth flow');
        console.log('   3. Check localStorage for new key format');
        
        process.exit(0);
    } else {
        console.log('❌ Phase 1 Integration: FAILED');
        console.log('');
        console.log('Issues found:');
        if (!allNewKeysPresent) {
            console.log('  - Missing required localStorage keys');
        }
        if (!noOldKeysRemain) {
            console.log('  - Deprecated keys still present');
        }
        
        process.exit(1);
    }

} catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
}