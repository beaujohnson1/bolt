/**
 * Quick OAuth Endpoint Test
 * Simple connectivity test for immediate diagnosis
 */

console.log('🔍 Testing OAuth endpoint connectivity...');

const testOAuthEndpoint = async () => {
    try {
        const response = await fetch('https://easyflip.ai/.netlify/functions/simple-ebay-oauth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generate-auth-url' })
        });

        console.log(`Status: ${response.status}`);
        console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ OAuth endpoint accessible');
            console.log('Response:', data);
            
            if (data.success && data.authUrl) {
                console.log('✅ Auth URL generated successfully');
                console.log(`Auth URL: ${data.authUrl.substring(0, 100)}...`);
            } else {
                console.log('❌ Auth URL generation failed');
            }
        } else {
            console.log('❌ OAuth endpoint not accessible');
            const text = await response.text();
            console.log('Response body:', text);
        }

    } catch (error) {
        console.log('❌ Network error:', error.message);
    }
};

testOAuthEndpoint();