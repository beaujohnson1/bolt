import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Database,
  Zap,
  Eye,
  BarChart3,
  Gauge
} from 'lucide-react';
import { getSystemHealth, getMetricHistory } from '../utils/systemMonitor';
import { getCostAnalysis, getUsageStatistics } from '../utils/enhancedCostTracker';
import { getPerformanceMetrics } from '../utils/performanceOptimizer';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, status, icon }) => {
  const statusColors = {
    healthy: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    critical: 'bg-red-50 border-red-200 text-red-800'
  };

  const statusIcons = {
    healthy: <CheckCircle className="h-4 w-4 text-green-600" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
    critical: <XCircle className="h-4 w-4 text-red-600" />
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${statusColors[status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        {statusIcons[status]}
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <div className="text-sm opacity-75">{change}</div>
        )}
      </div>
    </div>
  );
};

interface AlertBannerProps {
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    timestamp: Date;
    actions: string[];
  }>;
  onResolve: (alertId: string) => void;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onResolve }) => {
  if (alerts.length === 0) return null;

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  return (
    <div className="space-y-2 mb-6">
      {criticalAlerts.map(alert => (
        <div key={alert.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800">{alert.title}</h4>
                <p className="text-red-700 text-sm">{alert.message}</p>
                <div className="mt-2 text-xs text-red-600">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
                {alert.actions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-red-800">Suggested Actions:</p>
                    <ul className="text-xs text-red-700 list-disc list-inside">
                      {alert.actions.slice(0, 3).map((action, idx) => (
                        <li key={idx}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onResolve(alert.id)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Resolve
            </button>
          </div>
        </div>
      ))}
      
      {warningAlerts.map(alert => (
        <div key={alert.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800">{alert.title}</h4>
                <p className="text-yellow-700 text-sm">{alert.message}</p>
                <div className="mt-2 text-xs text-yellow-600">
                  {new Date(alert.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
            <button
              onClick={() => onResolve(alert.id)}
              className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
            >
              Resolve
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const PerformanceDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadDashboardData = async () => {
    try {
      console.log('📊 [DASHBOARD] Loading performance data...');
      
      // Load system health data
      const health = getSystemHealth();
      setSystemHealth(health);
      
      // Load cost analysis
      const costs = getCostAnalysis();
      setCostAnalysis(costs);
      
      // Load performance optimization metrics
      const perfMetrics = getPerformanceMetrics();
      setPerformanceMetrics(perfMetrics);
      
      // Load usage statistics
      const usage = getUsageStatistics(undefined, 7);
      setUsageStats(usage);
      
      setLastUpdate(new Date());
      console.log('✅ [DASHBOARD] Performance data loaded successfully');
    } catch (error) {
      console.error('❌ [DASHBOARD] Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleResolveAlert = (alertId: string) => {
    // In a real implementation, this would call the system monitor
    console.log('🔧 [DASHBOARD] Resolving alert:', alertId);
    loadDashboardData(); // Refresh data
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  const overallStatus = systemHealth?.overallStatus || 'healthy';
  const alerts = systemHealth?.activeAlerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-gray-600">Real-time system monitoring and optimization insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            overallStatus === 'healthy' ? 'bg-green-100 text-green-800' :
            overallStatus === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {overallStatus.toUpperCase()}
          </div>
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Active Alerts */}
      <AlertBanner alerts={alerts} onResolve={handleResolveAlert} />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="API Response Time"
          value={systemHealth?.metrics?.apiResponseTime ? 
            `${Math.round(systemHealth.metrics.apiResponseTime.value)}ms` : 'N/A'}
          status={systemHealth?.metrics?.apiResponseTime?.status || 'healthy'}
          icon={<Clock className="h-5 w-5" />}
        />
        
        <MetricCard
          title="Error Rate"
          value={systemHealth?.metrics?.errorRate ? 
            `${systemHealth.metrics.errorRate.value.toFixed(1)}%` : 'N/A'}
          status={systemHealth?.metrics?.errorRate?.status || 'healthy'}
          icon={<XCircle className="h-5 w-5" />}
        />
        
        <MetricCard
          title="Cost Today"
          value={costAnalysis ? `$${costAnalysis.totalCostToday.toFixed(2)}` : 'N/A'}
          change={costAnalysis?.budgetStatus === 'over' ? 'Over budget' : 'Within budget'}
          status={costAnalysis?.budgetStatus === 'over' ? 'critical' : 
                   costAnalysis?.budgetStatus === 'approaching' ? 'warning' : 'healthy'}
          icon={<DollarSign className="h-5 w-5" />}
        />
        
        <MetricCard
          title="Cache Hit Rate"
          value={performanceMetrics ? `${performanceMetrics.cacheHitRate}%` : 'N/A'}
          status={performanceMetrics?.cacheHitRate > 70 ? 'healthy' : 
                  performanceMetrics?.cacheHitRate > 50 ? 'warning' : 'critical'}
          icon={<Database className="h-5 w-5" />}
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Analysis */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Cost Analysis
          </h2>
          {costAnalysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">This Month</p>
                  <p className="text-xl font-bold">${costAnalysis.totalCostMonth.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Projected Monthly</p>
                  <p className="text-xl font-bold">${costAnalysis.projectedMonthlyCost.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Cost Breakdown:</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">OpenAI</span>
                    <span className="text-sm font-medium">${costAnalysis.costBreakdown.openai.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Google Vision</span>
                    <span className="text-sm font-medium">${costAnalysis.costBreakdown.googleVision.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">eBay API</span>
                    <span className="text-sm font-medium">${costAnalysis.costBreakdown.ebay.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {costAnalysis.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Recommendations:</p>
                  <div className="space-y-1">
                    {costAnalysis.recommendations.slice(0, 3).map((rec: string, idx: number) => (
                      <p key={idx} className="text-xs text-gray-600">• {rec}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Performance Optimization */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Performance Optimization
          </h2>
          {performanceMetrics && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Cache Hits</p>
                  <p className="text-xl font-bold">{performanceMetrics.cacheHits}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cost Saved</p>
                  <p className="text-xl font-bold">${performanceMetrics.costSaved.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Requests</span>
                  <span className="text-sm font-medium">{performanceMetrics.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cache Size</span>
                  <span className="text-sm font-medium">{performanceMetrics.cacheSize} items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <span className="text-sm font-medium">{(performanceMetrics.errorRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Health
          </h2>
          {systemHealth && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{systemHealth.summary.healthyMetrics}</p>
                  <p className="text-xs text-gray-600">Healthy</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{systemHealth.summary.warningMetrics}</p>
                  <p className="text-xs text-gray-600">Warning</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{systemHealth.summary.criticalMetrics}</p>
                  <p className="text-xs text-gray-600">Critical</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Key Metrics:</p>
                {Object.entries(systemHealth.metrics || {}).slice(0, 4).map(([key, metric]: [string, any]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {metric.value ? `${Math.round(metric.value)}${metric.unit}` : 'N/A'}
                      </span>
                      <div className={`w-2 h-2 rounded-full ${
                        metric.status === 'healthy' ? 'bg-green-500' :
                        metric.status === 'warning' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Usage Statistics */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Usage Statistics (7 days)
          </h2>
          {usageStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                  <p className="text-xl font-bold">{usageStats.averageResponseTime}ms</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Error Rate</p>
                  <p className="text-xl font-bold">{usageStats.errorRate}%</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Top Operations:</p>
                {usageStats.topOperations?.slice(0, 3).map((op: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-sm text-gray-600 truncate">{op.operation}</span>
                    <span className="text-sm font-medium">${op.cost.toFixed(3)}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Daily Usage:</p>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {usageStats.dailyUsage?.slice(-5).map((day: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                      <span className="font-medium">${day.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            Clear Cache
          </button>
          <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
            Run Health Check
          </button>
          <button className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700">
            Export Metrics
          </button>
          <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
            Optimize Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;