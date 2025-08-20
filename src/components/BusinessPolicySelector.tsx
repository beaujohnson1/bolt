import React, { useState, useEffect } from 'react';
import { ChevronDown, Package, CreditCard, RotateCcw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import BusinessPolicyService, { 
  type BusinessPolicyResponse, 
  type FulfillmentPolicy, 
  type PaymentPolicy, 
  type ReturnPolicy 
} from '../services/BusinessPolicyService';
import BusinessPolicyQuickSetup from './BusinessPolicyQuickSetup';

interface BusinessPolicySelectionProps {
  selectedPolicies: {
    fulfillment?: string;
    payment?: string;
    return?: string;
  };
  onPolicyChange: (type: 'fulfillment' | 'payment' | 'return', policyId: string) => void;
  className?: string;
}

const BusinessPolicySelector: React.FC<BusinessPolicySelectionProps> = ({
  selectedPolicies,
  onPolicyChange,
  className = ''
}) => {
  const [policies, setPolicies] = useState<BusinessPolicyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const businessPolicyService = new BusinessPolicyService();

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const policiesData = await businessPolicyService.getAllBusinessPolicies();
      setPolicies(policiesData);
      
      // Auto-select default policies if none are selected
      if (!selectedPolicies.fulfillment && policiesData.fulfillmentPolicies.length > 0) {
        const defaultPolicy = policiesData.fulfillmentPolicies.find(p => p.isDefault) || policiesData.fulfillmentPolicies[0];
        onPolicyChange('fulfillment', defaultPolicy.id);
      }
      
      if (!selectedPolicies.payment && policiesData.paymentPolicies.length > 0) {
        const defaultPolicy = policiesData.paymentPolicies.find(p => p.isDefault) || policiesData.paymentPolicies[0];
        onPolicyChange('payment', defaultPolicy.id);
      }
      
      if (!selectedPolicies.return && policiesData.returnPolicies.length > 0) {
        const defaultPolicy = policiesData.returnPolicies.find(p => p.isDefault) || policiesData.returnPolicies[0];
        onPolicyChange('return', defaultPolicy.id);
      }
      
    } catch (err) {
      console.error('Error loading business policies:', err);
      setError('Failed to load business policies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderFulfillmentPolicy = (policy: FulfillmentPolicy) => (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{policy.name}</span>
        {policy.isDefault && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Default</span>
        )}
      </div>
      
      {policy.description && (
        <p className="text-sm text-gray-600">{policy.description}</p>
      )}
      
      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          Handling Time: {policy.handlingTime.min}-{policy.handlingTime.max} {policy.handlingTime.unit.toLowerCase()}s
        </p>
        
        {policy.shippingOptions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-700">Shipping Options:</p>
            {policy.shippingOptions.slice(0, 2).map((option, index) => (
              <div key={index} className="text-xs text-gray-600 pl-2">
                • {option.service}: ${option.cost.toFixed(2)} ({option.estimatedDelivery})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPaymentPolicy = (policy: PaymentPolicy) => (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{policy.name}</span>
        {policy.isDefault && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Default</span>
        )}
      </div>
      
      {policy.description && (
        <p className="text-sm text-gray-600">{policy.description}</p>
      )}
      
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-gray-500">Immediate Payment:</span>
          <span className={`font-medium ${policy.immediatePaymentRequired ? 'text-green-600' : 'text-orange-600'}`}>
            {policy.immediatePaymentRequired ? 'Required' : 'Not Required'}
          </span>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700">Accepted Methods:</p>
          <div className="flex flex-wrap gap-1">
            {policy.acceptedMethods.slice(0, 4).map((method, index) => (
              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {method.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReturnPolicy = (policy: ReturnPolicy) => (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{policy.name}</span>
        {policy.isDefault && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Default</span>
        )}
      </div>
      
      {policy.description && (
        <p className="text-sm text-gray-600">{policy.description}</p>
      )}
      
      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-gray-500">Returns:</span>
          <span className={`font-medium ${policy.acceptsReturns ? 'text-green-600' : 'text-red-600'}`}>
            {policy.acceptsReturns ? `${policy.returnPeriod.value} ${policy.returnPeriod.unit.toLowerCase()}s` : 'Not Accepted'}
          </span>
        </div>
        
        {policy.acceptsReturns && (
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-500">Return Shipping:</span>
              <span className="text-gray-700">{policy.returnShippingCostPaidBy.replace('_', ' ')}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-gray-500">Refund Method:</span>
              <span className="text-gray-700">{policy.refundMethod.replace('_', ' ')}</span>
            </div>
            
            {policy.restockingFeePercentage > 0 && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-500">Restocking Fee:</span>
                <span className="text-orange-600">{policy.restockingFeePercentage}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Business Policies</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-12 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Business Policies</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={loadPolicies}
                className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!policies) {
    return null;
  }

  const sections = [
    {
      key: 'fulfillment',
      title: 'Shipping Policy',
      icon: Package,
      policies: policies.fulfillmentPolicies,
      selectedId: selectedPolicies.fulfillment,
      renderPolicy: renderFulfillmentPolicy,
      description: 'Choose how items will be shipped to buyers'
    },
    {
      key: 'payment',
      title: 'Payment Policy',
      icon: CreditCard,
      policies: policies.paymentPolicies,
      selectedId: selectedPolicies.payment,
      renderPolicy: renderPaymentPolicy,
      description: 'Select accepted payment methods and terms'
    },
    {
      key: 'return',
      title: 'Return Policy',
      icon: RotateCcw,
      policies: policies.returnPolicies,
      selectedId: selectedPolicies.return,
      renderPolicy: renderReturnPolicy,
      description: 'Define return and refund conditions'
    }
  ];

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2 mb-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Business Policies</h3>
        </div>
        <div className="flex items-start space-x-2 text-sm text-gray-600">
          <Info className="w-4 h-4 mt-0.5 text-blue-500" />
          <p>
            Select the business policies that will apply to your listing. These policies define shipping, 
            payment, and return terms for buyers.
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Setup Option */}
        {(!selectedPolicies.fulfillment || !selectedPolicies.payment || !selectedPolicies.return) && (
          <BusinessPolicyQuickSetup
            onPoliciesSelected={(policies) => {
              if (policies.fulfillment) onPolicyChange('fulfillment', policies.fulfillment);
              if (policies.payment) onPolicyChange('payment', policies.payment);
              if (policies.return) onPolicyChange('return', policies.return);
            }}
            className="mb-4"
          />
        )}

        {sections.map((section) => (
          <div key={section.key} className="border rounded-lg">
            <div className="p-3 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <section.icon className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">{section.title}</span>
                  {section.selectedId && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <button
                  onClick={() => toggleSection(section.key)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${
                      expandedSection === section.key ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">{section.description}</p>
            </div>

            {section.policies.length > 0 ? (
              <div className="space-y-0">
                {section.policies.map((policy) => (
                  <label
                    key={policy.id}
                    className={`block cursor-pointer border-b last:border-b-0 hover:bg-gray-50 ${
                      section.selectedId === policy.id ? 'bg-blue-50 ring-2 ring-blue-200' : ''
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex items-start space-x-3">
                        <input
                          type="radio"
                          name={`policy-${section.key}`}
                          value={policy.id}
                          checked={section.selectedId === policy.id}
                          onChange={() => onPolicyChange(section.key as any, policy.id)}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          {expandedSection === section.key ? (
                            section.renderPolicy(policy as any)
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium text-gray-900">{policy.name}</span>
                                {policy.isDefault && (
                                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    Default
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">No {section.title.toLowerCase()}s found.</p>
                <p className="text-xs mt-1">Create policies in your eBay account to get started.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick summary */}
      <div className="p-4 border-t bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-2">Selected Policies Summary</h4>
        <div className="space-y-1 text-sm">
          {sections.map((section) => {
            const selectedPolicy = section.policies.find(p => p.id === section.selectedId);
            return (
              <div key={section.key} className="flex items-center justify-between">
                <span className="text-gray-600">{section.title}:</span>
                <span className={`font-medium ${selectedPolicy ? 'text-gray-900' : 'text-red-600'}`}>
                  {selectedPolicy ? selectedPolicy.name : 'Not selected'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BusinessPolicySelector;