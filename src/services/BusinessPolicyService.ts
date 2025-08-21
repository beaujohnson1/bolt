interface BusinessPolicy {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  categoryTypes?: string[];
}

interface FulfillmentPolicy extends BusinessPolicy {
  type: 'fulfillment';
  shippingOptions: {
    service: string;
    cost: number;
    estimatedDelivery: string;
  }[];
  handlingTime: {
    min: number;
    max: number;
    unit: string;
  };
  domesticShippingDiscounts?: {
    combinedItemWeight: boolean;
    shippingPromotions: boolean;
  };
}

interface PaymentPolicy extends BusinessPolicy {
  type: 'payment';
  acceptedMethods: string[];
  immediatePaymentRequired: boolean;
  payPalEmailAddress?: string;
  creditCardTypes?: string[];
}

interface ReturnPolicy extends BusinessPolicy {
  type: 'return';
  acceptsReturns: boolean;
  returnPeriod: {
    value: number;
    unit: string;
  };
  refundMethod: string;
  returnShippingCostPaidBy: string;
  restockingFeePercentage?: number;
  description?: string;
}

interface BusinessPolicyResponse {
  fulfillmentPolicies: FulfillmentPolicy[];
  paymentPolicies: PaymentPolicy[];
  returnPolicies: ReturnPolicy[];
}

class BusinessPolicyService {
  private ebayApiService: any;

  constructor() {
    // Import EbayApiService dynamically to avoid circular dependencies
    this.initializeEbayService();
  }

  private async initializeEbayService() {
    const { default: EbayApiService } = await import('./ebayApi');
    this.ebayApiService = new EbayApiService();
  }

  /**
   * Fetch all business policies for the authenticated user
   */
  async getAllBusinessPolicies(): Promise<BusinessPolicyResponse> {
    try {
      console.log('🏢 [BUSINESS-POLICY] Fetching all business policies...');
      
      if (!this.ebayApiService) {
        await this.initializeEbayService();
      }

      const accessToken = await this.ebayApiService.getAccessToken();
      
      // If in dev mode, return mock data
      if (accessToken === 'dev_mode_bypass_token') {
        console.log('🏢 [BUSINESS-POLICY] Dev mode - returning mock policies');
        return this.getMockPolicies();
      }

      // Fetch all policy types in parallel
      const [fulfillmentPolicies, paymentPolicies, returnPolicies] = await Promise.all([
        this.getFulfillmentPolicies(accessToken),
        this.getPaymentPolicies(accessToken),
        this.getReturnPolicies(accessToken)
      ]);

      const result = {
        fulfillmentPolicies,
        paymentPolicies,
        returnPolicies
      };

      console.log('✅ [BUSINESS-POLICY] All business policies fetched:', {
        fulfillment: fulfillmentPolicies.length,
        payment: paymentPolicies.length,
        return: returnPolicies.length
      });

      return result;
    } catch (error) {
      console.error('❌ [BUSINESS-POLICY] Error fetching business policies:', error);
      
      // Return mock data as fallback
      console.log('🔧 [BUSINESS-POLICY] Falling back to mock policies');
      return this.getMockPolicies();
    }
  }

  /**
   * Fetch fulfillment (shipping) policies
   */
  private async getFulfillmentPolicies(accessToken: string): Promise<FulfillmentPolicy[]> {
    try {
      console.log('📦 [BUSINESS-POLICY] Fetching fulfillment policies with enhanced headers...');
      
      const response = await this.ebayApiService._callProxy(
        `${this.ebayApiService.baseUrl}/sell/account/v1/fulfillment_policy`,
        'GET',
        {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      );

      const policies = response?.fulfillmentPolicies || [];
      
      return policies.map((policy: any) => ({
        id: policy.fulfillmentPolicyId,
        name: policy.name,
        description: policy.description,
        type: 'fulfillment' as const,
        isDefault: policy.marketplaceId === 'EBAY_US',
        categoryTypes: policy.categoryTypes?.map((ct: any) => ct.name) || [],
        shippingOptions: policy.shippingOptions?.map((option: any) => ({
          service: option.optionType,
          cost: parseFloat(option.shippingCost?.value || '0'),
          estimatedDelivery: option.shippingCarrierCode || 'Standard'
        })) || [],
        handlingTime: {
          min: policy.handlingTime?.value || 1,
          max: policy.handlingTime?.value || 1,
          unit: policy.handlingTime?.unit || 'DAY'
        },
        domesticShippingDiscounts: {
          combinedItemWeight: policy.globalShipping?.status === 'ACTIVE',
          shippingPromotions: true
        }
      }));
    } catch (error) {
      console.error('❌ [BUSINESS-POLICY] Error fetching fulfillment policies:', error);
      
      // Enhanced error logging for 502 issues
      if (error.message && error.message.includes('502')) {
        console.error('🚨 [BUSINESS-POLICY] 502 ERROR: eBay Account API returned Bad Gateway');
        console.error('🚨 [BUSINESS-POLICY] Possible causes: Invalid token, missing sell.account scope, API down');
        console.error('🚨 [BUSINESS-POLICY] Check OAuth token in localStorage for sell.account scope');
      }
      
      return [];
    }
  }

  /**
   * Fetch payment policies
   */
  private async getPaymentPolicies(accessToken: string): Promise<PaymentPolicy[]> {
    try {
      console.log('💳 [BUSINESS-POLICY] Fetching payment policies with enhanced headers...');
      
      const response = await this.ebayApiService._callProxy(
        `${this.ebayApiService.baseUrl}/sell/account/v1/payment_policy`,
        'GET',
        {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      );

      const policies = response?.paymentPolicies || [];
      
      return policies.map((policy: any) => ({
        id: policy.paymentPolicyId,
        name: policy.name,
        description: policy.description,
        type: 'payment' as const,
        isDefault: policy.marketplaceId === 'EBAY_US',
        categoryTypes: policy.categoryTypes?.map((ct: any) => ct.name) || [],
        acceptedMethods: policy.paymentMethods?.map((pm: any) => pm.paymentMethodType) || ['PAYPAL', 'CREDIT_CARD'],
        immediatePaymentRequired: policy.immediatePay || false,
        payPalEmailAddress: policy.paymentInstructions?.payeeEmail,
        creditCardTypes: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'DISCOVER']
      }));
    } catch (error) {
      console.error('❌ [BUSINESS-POLICY] Error fetching payment policies:', error);
      
      // Enhanced error logging for 502 issues
      if (error.message && error.message.includes('502')) {
        console.error('🚨 [BUSINESS-POLICY] 502 ERROR: eBay Account API returned Bad Gateway');
        console.error('🚨 [BUSINESS-POLICY] Possible causes: Invalid token, missing sell.account scope, API down');
        console.error('🚨 [BUSINESS-POLICY] Check OAuth token in localStorage for sell.account scope');
      }
      
      return [];
    }
  }

  /**
   * Fetch return policies
   */
  private async getReturnPolicies(accessToken: string): Promise<ReturnPolicy[]> {
    try {
      console.log('🔄 [BUSINESS-POLICY] Fetching return policies with enhanced headers...');
      
      const response = await this.ebayApiService._callProxy(
        `${this.ebayApiService.baseUrl}/sell/account/v1/return_policy`,
        'GET',
        {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      );

      const policies = response?.returnPolicies || [];
      
      return policies.map((policy: any) => ({
        id: policy.returnPolicyId,
        name: policy.name,
        description: policy.returnInstructions || policy.description,
        type: 'return' as const,
        isDefault: policy.marketplaceId === 'EBAY_US',
        categoryTypes: policy.categoryTypes?.map((ct: any) => ct.name) || [],
        acceptsReturns: policy.returnsAccepted || false,
        returnPeriod: {
          value: parseInt(policy.returnPeriod?.value || '30'),
          unit: policy.returnPeriod?.unit || 'DAY'
        },
        refundMethod: policy.refundMethod || 'MONEY_BACK',
        returnShippingCostPaidBy: policy.returnShippingCostPayer || 'BUYER',
        restockingFeePercentage: parseFloat(policy.restockingFeePercentage || '0')
      }));
    } catch (error) {
      console.error('❌ [BUSINESS-POLICY] Error fetching return policies:', error);
      
      // Enhanced error logging for 502 issues
      if (error.message && error.message.includes('502')) {
        console.error('🚨 [BUSINESS-POLICY] 502 ERROR: eBay Account API returned Bad Gateway');
        console.error('🚨 [BUSINESS-POLICY] Possible causes: Invalid token, missing sell.account scope, API down');
        console.error('🚨 [BUSINESS-POLICY] Check OAuth token in localStorage for sell.account scope');
      }
      
      return [];
    }
  }

  /**
   * Get mock policies for development/fallback
   */
  private getMockPolicies(): BusinessPolicyResponse {
    return {
      fulfillmentPolicies: [
        {
          id: 'FULFILLMENT_POLICY_1',
          name: 'Standard Shipping',
          description: 'Standard shipping with tracking for domestic orders',
          type: 'fulfillment',
          isDefault: true,
          categoryTypes: ['ALL_EXCLUDING_MOTORS'],
          shippingOptions: [
            {
              service: 'USPS Priority Mail',
              cost: 8.50,
              estimatedDelivery: '3-5 business days'
            },
            {
              service: 'USPS Ground Advantage',
              cost: 5.99,
              estimatedDelivery: '5-7 business days'
            }
          ],
          handlingTime: {
            min: 1,
            max: 2,
            unit: 'DAY'
          },
          domesticShippingDiscounts: {
            combinedItemWeight: true,
            shippingPromotions: true
          }
        },
        {
          id: 'FULFILLMENT_POLICY_2',
          name: 'Fast & Free Shipping',
          description: 'Free expedited shipping for orders over $35',
          type: 'fulfillment',
          isDefault: false,
          categoryTypes: ['CLOTHING_SHOES_ACCESSORIES'],
          shippingOptions: [
            {
              service: 'Free Priority Mail',
              cost: 0,
              estimatedDelivery: '2-3 business days'
            }
          ],
          handlingTime: {
            min: 1,
            max: 1,
            unit: 'DAY'
          },
          domesticShippingDiscounts: {
            combinedItemWeight: true,
            shippingPromotions: true
          }
        }
      ],
      paymentPolicies: [
        {
          id: 'PAYMENT_POLICY_1',
          name: 'Standard Payment',
          description: 'Accept all major payment methods',
          type: 'payment',
          isDefault: true,
          categoryTypes: ['ALL_EXCLUDING_MOTORS'],
          acceptedMethods: ['PAYPAL', 'CREDIT_CARD', 'APPLE_PAY', 'GOOGLE_PAY'],
          immediatePaymentRequired: true,
          payPalEmailAddress: 'seller@example.com',
          creditCardTypes: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS', 'DISCOVER']
        },
        {
          id: 'PAYMENT_POLICY_2',
          name: 'High Value Items',
          description: 'Special payment terms for expensive items',
          type: 'payment',
          isDefault: false,
          categoryTypes: ['ELECTRONICS', 'JEWELRY_WATCHES'],
          acceptedMethods: ['PAYPAL', 'CREDIT_CARD'],
          immediatePaymentRequired: true,
          payPalEmailAddress: 'seller@example.com',
          creditCardTypes: ['VISA', 'MASTERCARD', 'AMERICAN_EXPRESS']
        }
      ],
      returnPolicies: [
        {
          id: 'RETURN_POLICY_1',
          name: '30-Day Returns',
          description: 'Hassle-free returns within 30 days. Items must be returned in original condition with tags attached.',
          type: 'return',
          isDefault: true,
          categoryTypes: ['ALL_EXCLUDING_MOTORS'],
          acceptsReturns: true,
          returnPeriod: {
            value: 30,
            unit: 'DAY'
          },
          refundMethod: 'MONEY_BACK',
          returnShippingCostPaidBy: 'BUYER',
          restockingFeePercentage: 0
        },
        {
          id: 'RETURN_POLICY_2',
          name: 'Final Sale',
          description: 'No returns accepted - all sales final. Please review item description carefully before purchasing.',
          type: 'return',
          isDefault: false,
          categoryTypes: ['VINTAGE_COLLECTIBLES'],
          acceptsReturns: false,
          returnPeriod: {
            value: 0,
            unit: 'DAY'
          },
          refundMethod: 'MONEY_BACK',
          returnShippingCostPaidBy: 'BUYER',
          restockingFeePercentage: 0
        }
      ]
    };
  }

  /**
   * Get default policy IDs for quick setup
   */
  async getDefaultPolicyIds(): Promise<{shipping?: string, payment?: string, return?: string}> {
    try {
      const policies = await this.getAllBusinessPolicies();
      
      return {
        shipping: policies.fulfillmentPolicies.find(p => p.isDefault)?.id,
        payment: policies.paymentPolicies.find(p => p.isDefault)?.id,
        return: policies.returnPolicies.find(p => p.isDefault)?.id
      };
    } catch (error) {
      console.error('❌ [BUSINESS-POLICY] Error getting default policy IDs:', error);
      return {};
    }
  }
}

export default BusinessPolicyService;
export type { BusinessPolicy, FulfillmentPolicy, PaymentPolicy, ReturnPolicy, BusinessPolicyResponse };