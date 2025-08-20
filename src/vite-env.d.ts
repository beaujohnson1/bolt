/// <reference types="vite/client" />

// Window property extensions for OAuth communication
declare global {
  interface Window {
    ebayAuthResult?: {
      success: boolean;
      tokens: any;
      timestamp: number;
    };
  }
}
