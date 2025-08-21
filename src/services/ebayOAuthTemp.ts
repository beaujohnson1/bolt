/**
 * TEMPORARY OAuth Service - Uses OLD callback URL that eBay recognizes
 * Use this until you update the redirect URL in eBay Developer Console
 */

export class EBayOAuthTemp {
  // Use the OLD callback URL that eBay already knows about
  private static readonly RU_NAME = 'https://easyflip.ai/.netlify/functions/auth-ebay-callback';
  
  private static readonly CLIENT_ID = 'easyflip-easyflip-PRD-c645ded63-a17c4d94';
  
  /**
   * Generate OAuth URL with the OLD callback that eBay recognizes
   */
  public static generateAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.RU_NAME, // Using OLD URL that eBay knows
      response_type: 'code',
      scope: [
        'https://api.ebay.com/oauth/api_scope',
        'https://api.ebay.com/oauth/api_scope/sell.inventory',
        'https://api.ebay.com/oauth/api_scope/sell.marketing',
        'https://api.ebay.com/oauth/api_scope/sell.account',
        'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
      ].join(' ')
    });

    return `https://auth.ebay.com/oauth2/authorize?${params.toString()}`;
  }
  
  /**
   * Check what redirect URL eBay is expecting
   */
  public static debugRedirectUrl(): void {
    console.log('=== eBay OAuth Debug ===');
    console.log('Current redirect URL:', this.RU_NAME);
    console.log('This MUST match EXACTLY what is in eBay Developer Console');
    console.log('');
    console.log('To fix "unauthorized_client" error:');
    console.log('1. Go to https://developer.ebay.com/my/keys');
    console.log('2. Click on your app (easyflip-easyflip-PRD)');
    console.log('3. Update "Your auth accepted URL" to:', this.RU_NAME);
    console.log('========================');
  }
}

// Auto-run debug on import
if (typeof window !== 'undefined') {
  EBayOAuthTemp.debugRedirectUrl();
}

export default EBayOAuthTemp;