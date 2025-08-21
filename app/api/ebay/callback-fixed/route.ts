/**
 * Fixed eBay OAuth Callback Handler
 * Implements Hendt eBay API best practices for reliable token exchange
 */

import { NextRequest, NextResponse } from 'next/server';

// CORS headers for cross-origin communication
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
};

export async function GET(request: NextRequest) {
  console.log('[eBay OAuth Callback Fixed] Processing callback');

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('[eBay OAuth Callback Fixed] OAuth error:', error, errorDescription);
      
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>eBay Authorization Failed</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 400px;
              text-align: center;
            }
            .error { color: #e53e3e; }
            button {
              background: #4299e1;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 4px;
              cursor: pointer;
              margin-top: 1rem;
            }
            button:hover { background: #3182ce; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="error">Authorization Failed</h2>
            <p>${errorDescription || error || 'An unknown error occurred'}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            // Notify parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'ebay_oauth_error',
                error: '${error}',
                description: '${errorDescription}'
              }, '${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}');
            }
            
            // Auto-close after 5 seconds
            setTimeout(() => window.close(), 5000);
          </script>
        </body>
        </html>
        `,
        {
          status: 400,
          headers: {
            'Content-Type': 'text/html',
            ...corsHeaders
          }
        }
      );
    }

    // Validate authorization code
    if (!code) {
      console.error('[eBay OAuth Callback Fixed] No authorization code received');
      
      return new NextResponse(
        'Missing authorization code',
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }

    console.log('[eBay OAuth Callback Fixed] Received auth code, exchanging for tokens...');

    // Exchange code for tokens
    const tokenEndpoint = process.env.VITE_EBAY_SANDBOX === 'true'
      ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
      : 'https://api.ebay.com/identity/v1/oauth2/token';

    const clientId = process.env.VITE_EBAY_CLIENT_ID;
    const clientSecret = process.env.VITE_EBAY_CLIENT_SECRET;
    const redirectUri = process.env.VITE_EBAY_RU_NAME;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('[eBay OAuth Callback Fixed] Missing environment variables');
      return new NextResponse(
        'Server configuration error',
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    try {
      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: decodeURIComponent(code),
          redirect_uri: redirectUri
        })
      });

      const responseText = await tokenResponse.text();
      console.log('[eBay OAuth Callback Fixed] Token response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        console.error('[eBay OAuth Callback Fixed] Token exchange failed:', responseText);
        
        return new NextResponse(
          `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Token Exchange Failed</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                max-width: 400px;
                text-align: center;
              }
              .error { color: #e53e3e; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="error">Token Exchange Failed</h2>
              <p>Failed to exchange authorization code for access token.</p>
              <p>Please try connecting your eBay account again.</p>
            </div>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
          </html>
          `,
          {
            status: 500,
            headers: {
              'Content-Type': 'text/html',
              ...corsHeaders
            }
          }
        );
      }

      const tokens = JSON.parse(responseText);
      console.log('[eBay OAuth Callback Fixed] Tokens obtained successfully');

      // Add timestamp for expiration tracking
      tokens.timestamp = Date.now();

      // Return success page with token handling
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>eBay Authorization Successful</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 400px;
              text-align: center;
            }
            .success { color: #48bb78; }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #4299e1;
              border-radius: 50%;
              width: 30px;
              height: 30px;
              animation: spin 1s linear infinite;
              margin: 1rem auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 class="success">✓ Authorization Successful!</h2>
            <p>Your eBay account has been connected successfully.</p>
            <div class="spinner"></div>
            <p>Storing tokens and closing window...</p>
          </div>
          <script>
            // Store tokens in localStorage (with fallback mechanisms)
            const tokens = ${JSON.stringify(tokens)};
            const STORAGE_KEY = 'ebay_oauth_tokens_v2';
            
            try {
              // Primary storage
              localStorage.setItem(STORAGE_KEY, JSON.stringify({ authToken: tokens }));
              console.log('[OAuth Success] Tokens stored in localStorage');
              
              // Fallback to sessionStorage if localStorage fails
              sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ authToken: tokens }));
              
              // Notify parent window if opened as popup
              if (window.opener) {
                window.opener.postMessage({
                  type: 'ebay_oauth_success',
                  tokens: tokens,
                  state: '${state || ''}'
                }, '${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}');
                console.log('[OAuth Success] Notified parent window');
              }
              
              // Broadcast to other tabs
              if (window.BroadcastChannel) {
                const channel = new BroadcastChannel('ebay_oauth');
                channel.postMessage({ 
                  type: 'token_updated', 
                  tokens: tokens 
                });
                channel.close();
                console.log('[OAuth Success] Broadcasted to other tabs');
              }
              
              // Dispatch storage event for same-tab detection
              window.dispatchEvent(new StorageEvent('storage', {
                key: STORAGE_KEY,
                newValue: JSON.stringify({ authToken: tokens }),
                url: window.location.href
              }));
              
            } catch (error) {
              console.error('[OAuth Success] Storage error:', error);
              
              // Last resort: pass via URL to parent
              if (window.opener) {
                window.opener.postMessage({
                  type: 'ebay_oauth_storage_failed',
                  tokens: tokens,
                  error: error.message
                }, '*');
              }
            }
            
            // Close window after ensuring message delivery
            setTimeout(() => {
              if (window.opener) {
                window.close();
              } else {
                // If not a popup, redirect to dashboard
                window.location.href = '${process.env.NEXT_PUBLIC_APP_URL || '/'}/dashboard';
              }
            }, 2000);
          </script>
        </body>
        </html>
        `,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
            ...corsHeaders
          }
        }
      );

    } catch (error) {
      console.error('[eBay OAuth Callback Fixed] Token exchange error:', error);
      
      return new NextResponse(
        'Token exchange failed',
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

  } catch (error) {
    console.error('[eBay OAuth Callback Fixed] Unexpected error:', error);
    
    return new NextResponse(
      'Internal server error',
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders
  });
}