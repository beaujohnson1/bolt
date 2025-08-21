exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    try {
        const { code, state, error, error_description } = event.queryStringParameters || {};

        if (error) {
            return {
                statusCode: 200,
                headers: { ...headers, 'Content-Type': 'text/html' },
                body: `<html><body><h1>Error: ${error}</h1></body></html>`
            };
        }

        if (code) {
            const html = `<!DOCTYPE html>
<html>
<head>
    <title>eBay Authentication Success</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>eBay Authentication Successful!</h1>
    <div id="status">Processing tokens...</div>
    
    <script>
        console.log('OAuth Callback: Starting process');
        
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code');
        
        async function exchangeTokens() {
            try {
                if (!authCode) {
                    throw new Error('No authorization code found');
                }
                
                const response = await fetch('/.netlify/functions/simple-ebay-oauth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'exchange-code',
                        code: authCode
                    })
                });
                
                const data = await response.json();
                console.log('Token exchange response:', data);
                
                if (data.success && data.access_token) {
                    // Store tokens in multiple formats
                    const tokenData = {
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        expires_in: data.expires_in,
                        expires_at: Date.now() + (data.expires_in * 1000),
                        token_type: data.token_type || 'Bearer',
                        scope: data.scope || ''
                    };
                    
                    // Store tokens
                    localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
                    localStorage.setItem('easyflip_ebay_access_token', data.access_token);
                    localStorage.setItem('ebay_access_token', data.access_token);
                    localStorage.setItem('ebay_refresh_token', data.refresh_token || '');
                    localStorage.setItem('ebay_token_expiry', String(tokenData.expires_at));
                    
                    console.log('Tokens stored successfully');
                    
                    // Communicate success
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'EBAY_OAUTH_SUCCESS',
                            tokens: tokenData
                        }, '*');
                    }
                    
                    document.getElementById('status').innerHTML = 
                        '<div style="color: green;"><strong>SUCCESS!</strong><br>Tokens stored successfully!</div>';
                    
                    if (window.opener) {
                        setTimeout(() => window.close(), 2000);
                    }
                } else {
                    throw new Error(data.error || 'Token exchange failed');
                }
            } catch (error) {
                console.error('Token exchange error:', error);
                document.getElementById('status').innerHTML = 
                    '<div style="color: red;"><strong>ERROR:</strong> ' + error.message + '</div>';
            }
        }
        
        setTimeout(exchangeTokens, 1000);
    </script>
</body>
</html>`;
            
            return {
                statusCode: 200,
                headers: { ...headers, 'Content-Type': 'text/html' },
                body: html
            };
        }

        return {
            statusCode: 400,
            headers: { ...headers, 'Content-Type': 'text/html' },
            body: '<html><body><h1>Invalid OAuth Callback</h1></body></html>'
        };

    } catch (error) {
        console.error('Callback Error:', error);
        return {
            statusCode: 500,
            headers: { ...headers, 'Content-Type': 'text/html' },
            body: `<html><body><h1>Error: ${error.message}</h1></body></html>`
        };
    }
};