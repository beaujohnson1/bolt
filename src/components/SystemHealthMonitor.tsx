import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, Activity, Zap, Shield } from 'lucide-react';
import { errorResilience } from '../services/ErrorResilienceService';
import { smartCache } from '../services/SmartCacheManager';

interface SystemHealthMonitorProps {
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({
  className = '',
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealthData = async () => {
    setIsLoading(true);
    try {
      const [health, stats] = await Promise.all([
        Promise.resolve(errorResilience.getSystemHealth()),
        Promise.resolve(smartCache.getStats())
      ]);
      
      setHealthData(health);
      setCacheStats(stats);
      setLastUpdated(new Date());
      
      console.log('📊 [HEALTH-MONITOR] Health data updated:', { health, stats });
    } catch (error) {
      console.error('❌ [HEALTH-MONITOR] Failed to fetch health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4" />;
      case 'unhealthy': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (!healthData || !cacheStats) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-100 rounded-lg p-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Compact status indicator
  if (!showDetails) {
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(healthData.overall)} ${className}`}>
        {getHealthIcon(healthData.overall)}
        <span className="capitalize">{healthData.overall}</span>
        {cacheStats.hitRate > 0 && (
          <span className="text-xs opacity-75">
            • {(cacheStats.hitRate * 100).toFixed(0)}% cache hit
          </span>
        )}
      </div>
    );
  }

  // Detailed health dashboard
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getHealthStatusColor(healthData.overall)}`}>
              {getHealthIcon(healthData.overall)}
              <span className="capitalize">System {healthData.overall}</span>
            </div>
            
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            )}
          </div>
          
          {lastUpdated && (
            <div className="text-xs text-gray-500 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cache Performance */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-medium text-blue-900">Cache Performance</h3>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Hit Rate</span>
                <span className="font-medium text-blue-900">
                  {(cacheStats.hitRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Items Cached</span>
                <span className="font-medium text-blue-900">
                  {cacheStats.itemCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Memory Usage</span>
                <span className="font-medium text-blue-900">
                  {(cacheStats.memoryUsage / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            </div>
          </div>

          {/* Response Times */}
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-medium text-green-900">Response Times</h3>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Average</span>
                <span className="font-medium text-green-900">
                  {cacheStats.averageResponseTime.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Total Requests</span>
                <span className="font-medium text-green-900">
                  {cacheStats.totalRequests.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Error Resilience */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-medium text-purple-900">Resilience</h3>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-purple-700">Circuit Breakers</span>
                <span className="font-medium text-purple-900">
                  {healthData.circuitBreakers.filter((cb: any) => cb.state === 'closed').length}/
                  {healthData.circuitBreakers.length} OK
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-700">Services</span>
                <span className="font-medium text-purple-900">
                  {healthData.services.filter((s: any) => s.healthy).length}/
                  {healthData.services.length} Healthy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Status */}
        {healthData.services.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Service Status</h3>
            <div className="space-y-2">
              {healthData.services.map((service: any) => (
                <div key={service.service} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${service.healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium text-gray-900">{service.service}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{service.responseTime.toFixed(0)}ms</span>
                    {service.error && (
                      <span className="text-red-600 text-xs truncate max-w-32" title={service.error}>
                        {service.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Circuit Breakers */}
        {healthData.circuitBreakers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Circuit Breakers</h3>
            <div className="space-y-2">
              {healthData.circuitBreakers.map((cb: any) => (
                <div key={cb.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      cb.state === 'closed' ? 'bg-green-500' : 
                      cb.state === 'half-open' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-900">{cb.name}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="capitalize">{cb.state}</span>
                    {cb.failures > 0 && (
                      <span className="text-red-600">{cb.failures} failures</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Rates */}
        {healthData.errorRates.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Error Rates</h3>
            <div className="space-y-2">
              {healthData.errorRates
                .filter((er: any) => er.errorRate > 0)
                .map((errorRate: any) => (
                <div key={errorRate.service} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-900">{errorRate.service}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-red-600">
                      {(errorRate.errorRate * 100).toFixed(1)}% error rate
                    </span>
                    <span className="text-red-500">
                      {errorRate.recentErrors} recent errors
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-center pt-4 border-t border-gray-200">
          <button
            onClick={fetchHealthData}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Activity className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthMonitor;