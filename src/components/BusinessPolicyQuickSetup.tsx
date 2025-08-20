import React, { useState } from 'react';
import { Settings, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import BusinessPolicyService from '../services/BusinessPolicyService';

interface BusinessPolicyQuickSetupProps {
  onPoliciesSelected: (policies: {
    fulfillment?: string;
    payment?: string;
    return?: string;
  }) => void;
  className?: string;
}

const BusinessPolicyQuickSetup: React.FC<BusinessPolicyQuickSetupProps> = ({
  onPoliciesSelected,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const businessPolicyService = new BusinessPolicyService();

  const handleQuickSetup = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const defaultPolicies = await businessPolicyService.getDefaultPolicyIds();
      
      if (!defaultPolicies.shipping && !defaultPolicies.payment && !defaultPolicies.return) {
        throw new Error('No default policies found. Please create policies in your eBay account first.');
      }
      
      onPoliciesSelected({
        fulfillment: defaultPolicies.shipping,
        payment: defaultPolicies.payment,
        return: defaultPolicies.return
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      console.error('Error setting up default policies:', err);
      setError('Failed to load default policies. Please select them manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 mb-2">Quick Policy Setup</h4>
          <p className="text-sm text-blue-800 mb-3">
            Automatically select your default business policies for faster listing creation.
          </p>
          
          {error && (
            <div className="mb-3 flex items-start space-x-2 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-3 flex items-center space-x-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span>Default policies loaded successfully!</span>
            </div>
          )}
          
          <button
            onClick={handleQuickSetup}
            disabled={loading || success}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Loading...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Policies Loaded</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Use Default Policies</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessPolicyQuickSetup;