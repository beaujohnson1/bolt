// eBay Workflow End-to-End Testing Utility
// Tests the complete listing creation workflow from dashboard to eBay

import EbayApiService from '../services/ebayApi';
import ebayOAuth from '../services/ebayOAuth';
import { validateCompleteEbayListing } from './ebayListingValidator';

export interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
  duration?: number;
}

export interface WorkflowTestResults {
  overallSuccess: boolean;
  totalDuration: number;
  steps: TestResult[];
  summary: string;
}

/**
 * Test eBay authentication workflow
 */
export async function testEbayAuthentication(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔐 [TEST] Testing eBay authentication...');
    
    // Check if user is authenticated
    const isAuthenticated = ebayOAuth.isAuthenticated();
    
    if (!isAuthenticated) {
      return {
        step: 'eBay Authentication',
        success: false,
        message: 'User not authenticated with eBay. Please connect your eBay account first.',
        duration: Date.now() - startTime
      };
    }

    // Try to get a valid access token
    const accessToken = await ebayOAuth.getValidAccessToken();
    
    if (!accessToken) {
      return {
        step: 'eBay Authentication',
        success: false,
        message: 'Failed to retrieve valid eBay access token.',
        duration: Date.now() - startTime
      };
    }

    // Check if it's a real token or mock
    const isRealToken = accessToken !== 'dev_mode_bypass_token' && !accessToken.includes('mock');
    
    return {
      step: 'eBay Authentication',
      success: true,
      message: isRealToken ? 'Real eBay authentication successful' : 'Mock authentication detected (development mode)',
      data: {
        hasAccessToken: !!accessToken,
        tokenType: isRealToken ? 'real' : 'mock',
        tokenLength: accessToken.length
      },
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      step: 'eBay Authentication',
      success: false,
      message: `Authentication test failed: ${error.message}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test eBay API connectivity
 */
export async function testEbayApiConnectivity(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('📡 [TEST] Testing eBay API connectivity...');
    
    const ebayService = new EbayApiService();
    
    // Test category fetching (minimal API call)
    const categories = await ebayService.getCategories(1);
    
    if (!categories || categories.length === 0) {
      throw new Error('No categories returned from eBay API');
    }

    return {
      step: 'eBay API Connectivity',
      success: true,
      message: `Successfully connected to eBay API and retrieved ${categories.length} categories`,
      data: {
        categoriesRetrieved: categories.length,
        sampleCategory: categories[0]
      },
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      step: 'eBay API Connectivity',
      success: false,
      message: `API connectivity test failed: ${error.message}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test business policies retrieval
 */
export async function testBusinessPolicies(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🏢 [TEST] Testing business policies retrieval...');
    
    const ebayService = new EbayApiService();
    
    // Get business policies
    const policies = await ebayService.getBusinessPolicyIds();
    
    const hasFulfillment = !!policies.fulfillmentPolicyId;
    const hasPayment = !!policies.paymentPolicyId;
    const hasReturn = !!policies.returnPolicyId;
    
    const allPoliciesPresent = hasFulfillment && hasPayment && hasReturn;
    
    return {
      step: 'Business Policies',
      success: allPoliciesPresent,
      message: allPoliciesPresent 
        ? 'All business policies retrieved successfully' 
        : `Missing policies: ${[
            !hasFulfillment && 'fulfillment',
            !hasPayment && 'payment', 
            !hasReturn && 'return'
          ].filter(Boolean).join(', ')}`,
      data: {
        fulfillmentPolicyId: policies.fulfillmentPolicyId,
        paymentPolicyId: policies.paymentPolicyId,
        returnPolicyId: policies.returnPolicyId,
        allPresent: allPoliciesPresent
      },
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      step: 'Business Policies',
      success: false,
      message: `Business policies test failed: ${error.message}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test listing validation
 */
export async function testListingValidation(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('✅ [TEST] Testing listing validation...');
    
    // Create a sample listing for validation
    const sampleListing = {
      listing: {
        title: 'Test Vintage Designer Jacket',
        description: 'Beautiful vintage designer jacket in excellent condition. Perfect for fashion enthusiasts.',
        price: 89.99,
        condition: 'used_excellent',
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg'
        ],
        brand: 'Test Brand',
        size: 'M',
        color: 'Blue',
        keywords: ['vintage', 'designer', 'jacket', 'fashion']
      },
      categoryId: '11450',
      businessPolicies: {
        fulfillment: '123456789',
        payment: '987654321',
        return: '456789123'
      },
      itemSpecifics: [
        { name: 'Brand', value: 'Test Brand' },
        { name: 'Size', value: 'M' },
        { name: 'Color', value: 'Blue' }
      ]
    };

    const validationResult = validateCompleteEbayListing(sampleListing);
    
    return {
      step: 'Listing Validation',
      success: validationResult.isValid,
      message: validationResult.isValid 
        ? 'Listing validation passed successfully' 
        : `Validation failed: ${validationResult.errors.join(', ')}`,
      data: {
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        isValid: validationResult.isValid
      },
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      step: 'Listing Validation',
      success: false,
      message: `Validation test failed: ${error.message}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test listing creation (dry run - uses mock data)
 */
export async function testListingCreation(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('📝 [TEST] Testing listing creation...');
    
    const ebayService = new EbayApiService();
    
    // Create a sample item for testing
    const sampleItem = {
      id: 'test-item-id',
      title: 'Test Vintage Designer Jacket for Listing Creation Test',
      description: 'This is a test item for validating the listing creation workflow. Beautiful vintage designer jacket in excellent condition.',
      suggested_price: 89.99,
      final_price: 89.99,
      condition: 'used_excellent',
      images: [
        'https://example.com/test-image1.jpg',
        'https://example.com/test-image2.jpg'
      ],
      brand: 'Test Brand',
      size: 'M',
      color: 'Blue',
      ai_suggested_keywords: ['vintage', 'designer', 'jacket', 'fashion', 'test'],
      ai_analysis: {
        ebay_category_id: '11450',
        item_specifics: [
          { name: 'Brand', value: 'Test Brand' },
          { name: 'Size', value: 'M' },
          { name: 'Color', value: 'Blue' },
          { name: 'Condition', value: 'Excellent' }
        ]
      }
    };

    // Attempt to create listing
    const listing = await ebayService.createListingFromItem(sampleItem);
    
    if (!listing || !listing.listingId) {
      throw new Error('No listing ID returned from eBay service');
    }

    const isRealListing = !listing.listingId.includes('MOCK_') && 
                         !listing.listingId.includes('demo_') && 
                         !listing.listingId.includes('test');

    return {
      step: 'Listing Creation',
      success: true,
      message: isRealListing 
        ? `Real eBay listing created successfully: ${listing.listingId}` 
        : `Mock/test listing created: ${listing.listingId}`,
      data: {
        listingId: listing.listingId,
        listingUrl: listing.listingUrl,
        title: listing.title,
        price: listing.price,
        status: listing.status,
        isRealListing
      },
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      step: 'Listing Creation',
      success: false,
      message: `Listing creation test failed: ${error.message}`,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run complete end-to-end workflow test
 */
export async function runCompleteWorkflowTest(): Promise<WorkflowTestResults> {
  const overallStartTime = Date.now();
  const steps: TestResult[] = [];
  
  console.log('🚀 [TEST] Starting complete eBay workflow test...');
  
  // Step 1: Authentication
  const authTest = await testEbayAuthentication();
  steps.push(authTest);
  
  // Step 2: API Connectivity (only if auth passed)
  if (authTest.success) {
    const apiTest = await testEbayApiConnectivity();
    steps.push(apiTest);
    
    // Step 3: Business Policies (only if API connected)
    if (apiTest.success) {
      const policiesTest = await testBusinessPolicies();
      steps.push(policiesTest);
    }
  }
  
  // Step 4: Validation (always run)
  const validationTest = await testListingValidation();
  steps.push(validationTest);
  
  // Step 5: Listing Creation (only if previous steps passed)
  const prerequisitesPassed = steps.slice(0, -1).every(step => step.success);
  if (prerequisitesPassed) {
    const creationTest = await testListingCreation();
    steps.push(creationTest);
  }
  
  const totalDuration = Date.now() - overallStartTime;
  const successfulSteps = steps.filter(step => step.success);
  const overallSuccess = steps.length > 0 && successfulSteps.length === steps.length;
  
  // Generate summary
  const summary = generateTestSummary(steps, overallSuccess, totalDuration);
  
  console.log('🏁 [TEST] Complete workflow test finished');
  console.log(summary);
  
  return {
    overallSuccess,
    totalDuration,
    steps,
    summary
  };
}

/**
 * Generate human-readable test summary
 */
function generateTestSummary(steps: TestResult[], overallSuccess: boolean, totalDuration: number): string {
  const successfulSteps = steps.filter(step => step.success);
  const failedSteps = steps.filter(step => !step.success);
  
  let summary = `\n📊 eBay Workflow Test Results\n`;
  summary += `═══════════════════════════\n`;
  summary += `Overall Status: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}\n`;
  summary += `Total Duration: ${totalDuration}ms\n`;
  summary += `Steps Completed: ${successfulSteps.length}/${steps.length}\n\n`;
  
  // Individual step results
  summary += `📋 Step Details:\n`;
  steps.forEach((step, index) => {
    const status = step.success ? '✅' : '❌';
    summary += `${index + 1}. ${status} ${step.step} (${step.duration}ms)\n`;
    summary += `   ${step.message}\n`;
  });
  
  if (failedSteps.length > 0) {
    summary += `\n⚠️ Failed Steps:\n`;
    failedSteps.forEach(step => {
      summary += `• ${step.step}: ${step.message}\n`;
    });
  }
  
  if (overallSuccess) {
    summary += `\n🎉 All tests passed! Your eBay listing workflow is ready.\n`;
  } else {
    summary += `\n🔧 Some tests failed. Please address the issues above before posting listings to eBay.\n`;
  }
  
  return summary;
}

/**
 * Quick health check for eBay integration
 */
export async function quickHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  try {
    // Check authentication
    if (!ebayOAuth.isAuthenticated()) {
      issues.push('eBay authentication required');
    }
    
    // Check if we can get an access token
    const token = await ebayOAuth.getValidAccessToken();
    if (!token) {
      issues.push('Unable to retrieve eBay access token');
    }
    
    // Test basic API connectivity (simplified)
    const ebayService = new EbayApiService();
    try {
      await ebayService.getCategories(1);
    } catch (error) {
      issues.push(`eBay API connectivity issue: ${error.message}`);
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  } catch (error) {
    issues.push(`Health check failed: ${error.message}`);
    return {
      healthy: false,
      issues
    };
  }
}