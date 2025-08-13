import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle, Globe, Wrench } from 'lucide-react';
import EnhancedEbayService from '../services/EnhancedEbayService';

interface EbayStatus {
  success: boolean;
  environment: string;
  message: string;
  hasProduction: boolean;
}

const EbayEnvironmentStatus: React.FC = () => {
  const [status, setStatus] = useState<EbayStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkEbayStatus();
  }, []);

  const checkEbayStatus = async () => {
    try {
      setLoading(true);
      const ebayService = new EnhancedEbayService();
      const result = await ebayService.testConnection();
      setStatus(result);
    } catch (error) {
      setStatus({
        success: false,
        environment: 'error',
        message: error.message,
        hasProduction: false
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-blue-800">Checking eBay API...</span>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-gray-600" />
        <span className="text-sm text-gray-800">eBay status unknown</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (!status.success) return 'red';
    if (status.hasProduction) return 'green';
    return 'yellow';
  };

  const getStatusIcon = () => {
    if (!status.success) return <AlertTriangle className="w-4 h-4" />;
    if (status.hasProduction) return <CheckCircle className="w-4 h-4" />;
    return <Wrench className="w-4 h-4" />;
  };

  const color = getStatusColor();
  const icon = getStatusIcon();

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-2 bg-${color}-50 rounded-lg border border-${color}-200`}>
      <div className={`text-${color}-600`}>
        {icon}
      </div>
      <div className="flex flex-col">
        <div className={`text-sm font-medium text-${color}-800`}>
          eBay API: {status.environment.toUpperCase()}
          {status.hasProduction && <Globe className="w-3 h-3 inline ml-1" />}
        </div>
        <div className={`text-xs text-${color}-700`}>
          {status.message}
        </div>
      </div>
      <button
        onClick={checkEbayStatus}
        className={`text-xs px-2 py-1 bg-${color}-100 hover:bg-${color}-200 rounded transition-colors`}
        title="Refresh status"
      >
        Refresh
      </button>
    </div>
  );
};

export default EbayEnvironmentStatus;