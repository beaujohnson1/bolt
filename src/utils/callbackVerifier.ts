/**
 * Callback URL Verification Utility
 * Helps debug OAuth callback execution and token storage
 */

interface CallbackTestResult {
  success: boolean;
  statusCode?: number;
  responseData?: any;
  error?: string;
  timestamp: number;
}

export class CallbackVerifier {
  private static instance: CallbackVerifier;
  
  public static getInstance(): CallbackVerifier {
    if (!CallbackVerifier.instance) {
      CallbackVerifier.instance = new CallbackVerifier();
    }
    return CallbackVerifier.instance;
  }

  /**
   * Test if the callback URL is accessible and responding
   */
  async testCallbackUrl(): Promise<CallbackTestResult> {
    const callbackUrl = `${window.location.origin}/.netlify/functions/auth-ebay-callback`;
    const timestamp = Date.now();
    
    try {
      console.log('🧪 [CALLBACK-VERIFIER] Testing callback URL:', callbackUrl);
      
      // Test with a simple GET request to verify accessibility
      const response = await fetch(callbackUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/json',
          'User-Agent': 'EasyFlip-CallbackVerifier/1.0'
        }
      });
      
      const responseText = await response.text();
      
      console.log('🧪 [CALLBACK-VERIFIER] Callback URL test result:', {
        status: response.status,
        statusText: response.statusText,
        responseLength: responseText.length,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      return {
        success: response.status < 500, // Accept redirects as success
        statusCode: response.status,
        responseData: {
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 200)
        },
        timestamp
      };
      
    } catch (error) {
      console.error('🧪 [CALLBACK-VERIFIER] Callback URL test failed:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp
      };
    }
  }

  /**
   * Test callback with mock authorization parameters
   */
  async testCallbackWithMockParams(): Promise<CallbackTestResult> {
    const callbackUrl = `${window.location.origin}/.netlify/functions/auth-ebay-callback`;
    const mockParams = new URLSearchParams({
      code: 'test_authorization_code_12345',
      state: 'test_state_verification_67890'
    });
    
    const testUrl = `${callbackUrl}?${mockParams.toString()}`;
    const timestamp = Date.now();
    
    try {
      console.log('🧪 [CALLBACK-VERIFIER] Testing callback with mock params:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/json',
          'User-Agent': 'EasyFlip-CallbackVerifier/1.0'
        }
      });
      
      const responseText = await response.text();
      
      console.log('🧪 [CALLBACK-VERIFIER] Mock callback test result:', {
        status: response.status,
        statusText: response.statusText,
        responseLength: responseText.length
      });
      
      return {
        success: response.status < 500,
        statusCode: response.status,
        responseData: {
          statusText: response.statusText,
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 500),
          containsTokenStorage: responseText.includes('localStorage.setItem'),
          containsEmergencyBeacon: responseText.includes('emergency'),
          containsPostMessage: responseText.includes('postMessage')
        },
        timestamp
      };
      
    } catch (error) {
      console.error('🧪 [CALLBACK-VERIFIER] Mock callback test failed:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp
      };
    }
  }

  /**
   * Comprehensive callback verification
   */
  async runComprehensiveTest(): Promise<{
    basicTest: CallbackTestResult;
    mockTest: CallbackTestResult;
    summary: {
      callbackAccessible: boolean;
      callbackFunctional: boolean;
      recommendedActions: string[];
    };
  }> {
    console.log('🧪 [CALLBACK-VERIFIER] Running comprehensive callback verification...');
    
    const basicTest = await this.testCallbackUrl();
    const mockTest = await this.testCallbackWithMockParams();
    
    const callbackAccessible = basicTest.success;
    const callbackFunctional = mockTest.success && 
      (mockTest.responseData?.containsTokenStorage || 
       mockTest.responseData?.containsPostMessage);
    
    const recommendedActions: string[] = [];
    
    if (!callbackAccessible) {
      recommendedActions.push('Callback URL is not accessible - check Netlify function deployment');
    }
    
    if (!callbackFunctional) {
      recommendedActions.push('Callback function may not be processing OAuth parameters correctly');
    }
    
    if (callbackAccessible && !mockTest.responseData?.containsTokenStorage) {
      recommendedActions.push('Callback may not be storing tokens properly');
    }
    
    if (callbackAccessible && !mockTest.responseData?.containsPostMessage) {
      recommendedActions.push('Callback may not be communicating with parent window');
    }
    
    if (recommendedActions.length === 0) {
      recommendedActions.push('Callback appears to be functioning correctly');
    }
    
    const summary = {
      callbackAccessible,
      callbackFunctional,
      recommendedActions
    };
    
    console.log('🧪 [CALLBACK-VERIFIER] Comprehensive test summary:', summary);
    
    return {
      basicTest,
      mockTest,
      summary
    };
  }
}

// Export singleton instance
export const callbackVerifier = CallbackVerifier.getInstance();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).callbackVerifier = callbackVerifier;
  console.log('🧪 [CALLBACK-VERIFIER] Callback verifier available as window.callbackVerifier');
}