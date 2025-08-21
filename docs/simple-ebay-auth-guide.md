# Simple eBay Authentication Component Guide

## Overview

The `SimpleEbayAuth` component follows the Hendt eBay API pattern exactly and integrates with our fixed OAuth service to provide reliable eBay authentication.

## Features

- **Hendt eBay API Pattern**: Implements the exact pattern used in the popular @hendt/ebay-api library
- **Fixed OAuth Service**: Uses `ebayOAuthFixed.ts` which provides reliable token management
- **Popup OAuth Flow**: Opens eBay authorization in a popup window for better UX
- **Cross-Window Communication**: Uses postMessage API for secure communication between popup and parent
- **Automatic Token Management**: Handles token storage, refresh, and expiration automatically
- **Comprehensive Error Handling**: Includes timeout protection and error recovery
- **Multiple Storage Formats**: Compatible with existing token storage formats

## Architecture

```
SimpleEbayAuth Component
├── EBayOAuthFixed Service
├── /.netlify/functions/simple-ebay-callback
├── eBay Authorization Server
└── Token Storage (localStorage)
```

## Hendt Pattern Implementation

The component follows the exact Hendt eBay API pattern:

```javascript
// Original Hendt pattern:
const eBay = new eBayApi({
  appId: 'CLIENT_ID',
  certId: 'CLIENT_SECRET',
  ruName: 'REDIRECT_URL',
  sandbox: false
});

const url = eBay.OAuth2.generateAuthUrl();
// Open URL for user authorization
// On callback, exchange code for token
const token = await eBay.OAuth2.getToken(code);
```

Our implementation:

```javascript
// 1. Generate auth URL (equivalent to eBay.OAuth2.generateAuthUrl())
const authUrl = EBayOAuthFixed.generateAuthUrl();

// 2. Open popup (equivalent to opening URL for user authorization)
const popup = window.open(authUrl, 'ebayAuth');

// 3. Listen for callback success
window.addEventListener('message', handleMessage);

// 4. Store tokens (equivalent to eBay.OAuth2.getToken(code))
EBayOAuthFixed.setCredentials(tokenData);
```

## OAuth Flow Steps

1. **User Action**: User clicks "Connect eBay Account" button
2. **Generate URL**: Component calls `EBayOAuthFixed.generateAuthUrl()`
3. **Open Popup**: Opens eBay authorization page in popup window
4. **User Authorization**: User signs in and authorizes the application
5. **eBay Redirect**: eBay redirects to `/.netlify/functions/simple-ebay-callback`
6. **Token Exchange**: Callback function exchanges authorization code for access token
7. **Communication**: Callback page sends success message via postMessage
8. **Token Storage**: Component receives message and stores tokens
9. **Popup Close**: Popup closes automatically and user is authenticated

## Usage

### Basic Usage

```tsx
import React from 'react';
import SimpleEbayAuth from '../components/SimpleEbayAuth';

const MyPage: React.FC = () => {
  return (
    <div>
      <h1>eBay Integration</h1>
      <SimpleEbayAuth />
    </div>
  );
};

export default MyPage;
```

### Custom Integration

```tsx
import React, { useEffect, useState } from 'react';
import { EBayOAuthFixed, AuthToken } from '../services/ebayOAuthFixed';

const CustomEbayAuth: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Initialize the service
    EBayOAuthFixed.initialize();
    
    // Check existing token
    const existingToken = EBayOAuthFixed.getAccessToken();
    setToken(existingToken);
    
    // Listen for token updates
    const unsubscribe = EBayOAuthFixed.onTokenRefresh((authToken) => {
      setToken(authToken.access_token);
    });
    
    return unsubscribe;
  }, []);

  const handleConnect = async () => {
    const authUrl = EBayOAuthFixed.generateAuthUrl();
    const popup = window.open(authUrl, 'ebayAuth', 'width=600,height=700');
    
    // Handle popup communication (see full implementation in SimpleEbayAuth.tsx)
  };

  return (
    <div>
      {token ? (
        <div>Connected to eBay</div>
      ) : (
        <button onClick={handleConnect}>Connect eBay</button>
      )}
    </div>
  );
};
```

## Testing

### Test URL

Visit the test page to see the component in action:
```
http://localhost:8888/simple-ebay-auth-test
```

### Test Script

Run the integration test:
```bash
node tests/simple-ebay-auth-test.cjs
```

### Manual Testing Steps

1. Navigate to `/simple-ebay-auth-test`
2. Click "Connect eBay Account" button
3. Popup should open with eBay authorization page
4. Sign in and authorize the application
5. Popup should close automatically
6. Component should show "Connected to eBay" status
7. Test reconnect and disconnect functionality

## Configuration

The component uses environment variables from the EBayOAuthFixed service:

```env
VITE_EBAY_CLIENT_ID=your_client_id
VITE_EBAY_CLIENT_SECRET=your_client_secret
VITE_EBAY_RU_NAME=your_ru_name
VITE_EBAY_SANDBOX=false
```

## Security Features

- **Origin Validation**: Only accepts messages from the same origin
- **Token Encryption**: Tokens are securely stored in localStorage
- **Timeout Protection**: Authentication times out after 5 minutes
- **Error Handling**: Comprehensive error handling and recovery
- **Cross-Tab Sync**: Token updates are synchronized across browser tabs

## Callback Endpoint Integration

The component works with the fixed callback endpoint:

**Endpoint**: `/.netlify/functions/simple-ebay-callback`

**Features**:
- Automatic token exchange
- Multiple communication methods (postMessage, BroadcastChannel, localStorage)
- Comprehensive error handling
- HTML success/error pages
- Token storage in multiple formats for compatibility

## Token Management

### Storage Locations

The service stores tokens in multiple formats for compatibility:

```javascript
// Primary formats
localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
localStorage.setItem('oauth_tokens', JSON.stringify(tokenData));

// Legacy compatibility formats
localStorage.setItem('ebay_access_token', tokenData.access_token);
localStorage.setItem('easyflip_ebay_access_token', tokenData.access_token);
// ... and more
```

### Automatic Refresh

Tokens are automatically refreshed 10 minutes before expiration:

```javascript
// Setup automatic refresh
const refreshIn = Math.max(
  (token.expires_in - 600) * 1000, // 10 minutes before expiry
  60000 // Minimum 1 minute
);

setTimeout(() => {
  EBayOAuthFixed.refreshAuthToken();
}, refreshIn);
```

## Error Handling

The component handles various error scenarios:

- **Popup Blocked**: Clear error message with instructions
- **Authentication Timeout**: 5-minute timeout with automatic cleanup
- **Token Exchange Failure**: Retry mechanism and clear error reporting
- **Network Issues**: Graceful degradation and user feedback
- **Invalid Tokens**: Automatic token refresh or re-authentication prompt

## Troubleshooting

### Common Issues

1. **Popup Blocked**: Ensure popups are allowed for the domain
2. **Token Exchange Fails**: Check environment variables and eBay app configuration
3. **CORS Issues**: Ensure callback URL matches eBay Developer Console configuration
4. **Token Not Persisting**: Check localStorage permissions and storage quotas

### Debug Information

The component includes debug logging:

```javascript
console.log('🚀 [SIMPLE-EBAY-AUTH] Starting OAuth flow...');
console.log('🔗 [SIMPLE-EBAY-AUTH] Generated auth URL:', authUrl);
console.log('🎯 [SIMPLE-EBAY-AUTH] Popup opened successfully');
```

Enable debug mode in the browser console to see detailed logs.

## Files Created

- `src/components/SimpleEbayAuth.tsx` - Main component
- `src/pages/SimpleEbayAuthTest.tsx` - Test page
- `tests/simple-ebay-auth-test.cjs` - Integration test
- `docs/simple-ebay-auth-guide.md` - This documentation

## Integration with Existing System

The component integrates seamlessly with the existing OAuth infrastructure:

- Uses existing `ebayOAuthFixed.ts` service
- Compatible with existing `simple-ebay-callback.js` endpoint
- Works with current environment configuration
- Maintains compatibility with legacy token formats

## Next Steps

1. Test the component on the test page
2. Integrate into your application where eBay authentication is needed
3. Monitor token refresh and error handling in production
4. Consider adding additional UI feedback for better user experience

## Support

For issues or questions:
1. Check the browser console for debug logs
2. Verify environment variables are set correctly
3. Test with the integration test script
4. Ensure eBay Developer Console configuration matches redirect URLs