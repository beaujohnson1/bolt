import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target, 
  BarChart3, 
  PieChart, 
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';
import { getCostAnalysis, getUsageStatistics } from '../utils/enhancedCostTracker';

interface BusinessMetrics {
  // Revenue Metrics
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  totalRevenue: number;
  revenueGrowthRate: number;
  
  // User Metrics
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  churnRate: number;
  
  // Product Metrics
  totalListingsGenerated: number;
  listingsThisMonth: number;
  averageListingsPerUser: number;
  aiAccuracyRate: number;
  
  // Financial Metrics
  grossMargin: number;
  customerLifetimeValue: number;
  customerAcquisitionCost: number;
  apiCostEfficiency: number;
}

interface RevenueProjection {
  month: string;
  projected: number;
  actual?: number;
  target: number;
}

interface CategoryInsight {
  category: string;
  revenue: number;
  volume: number;
  averagePrice: number;
  growthRate: number;
}

const BusinessIntelligenceDashboard: React.FC = () => {
  const { authUser } = useAuth();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [projections, setProjections] = useState<RevenueProjection[]>([]);
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    loadBusinessMetrics();
  }, [timeRange]);

  const loadBusinessMetrics = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not available');

      // Fetch user metrics
      const { data: users } = await supabase
        .from('users')
        .select('id, created_at, last_seen')
        .gte('created_at', new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString());

      // Fetch items/listings data
      const { data: items } = await supabase
        .from('items')
        .select('id, created_at, suggested_price, user_id')
        .gte('created_at', new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString());

      // Fetch AI performance data
      const { data: aiPredictions } = await supabase
        .from('ai_predictions')
        .select('overall_accuracy, created_at')
        .gte('created_at', new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString());

      // Calculate business metrics
      const businessMetrics = calculateBusinessMetrics(users || [], items || [], aiPredictions || []);
      setMetrics(businessMetrics);

      // Generate revenue projections
      const revenueProjections = generateRevenueProjections(businessMetrics);
      setProjections(revenueProjections);

      // Generate category insights
      const insights = generateCategoryInsights(items || []);
      setCategoryInsights(insights);

    } catch (error) {
      console.error('Error loading business metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBusinessMetrics = (
    users: any[], 
    items: any[], 
    aiPredictions: any[]
  ): BusinessMetrics => {
    const now = Date.now();
    const monthAgo = now - (30 * 24 * 60 * 60 * 1000);

    // User metrics
    const totalUsers = users.length;
    const activeUsers = users.filter(u => 
      new Date(u.last_seen || u.created_at) > new Date(monthAgo)
    ).length;
    const newUsersThisMonth = users.filter(u => 
      new Date(u.created_at) > new Date(monthAgo)
    ).length;

    // Product metrics
    const totalListingsGenerated = items.length;
    const listingsThisMonth = items.filter(i => 
      new Date(i.created_at) > new Date(monthAgo)
    ).length;
    const averageListingsPerUser = totalUsers > 0 ? totalListingsGenerated / totalUsers : 0;

    // AI metrics
    const aiAccuracyRate = aiPredictions.length > 0 
      ? aiPredictions.reduce((sum, p) => sum + (p.overall_accuracy || 0), 0) / aiPredictions.length 
      : 0;

    // Revenue calculations (estimated based on pricing model)
    const estimatedRevenuePerListing = 1.50; // Average $1.50 per listing
    const monthlyRecurringRevenue = listingsThisMonth * estimatedRevenuePerListing;
    const totalRevenue = totalListingsGenerated * estimatedRevenuePerListing;
    const averageRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0;

    // Growth rates (simplified calculation)
    const userGrowthRate = totalUsers > 0 ? (newUsersThisMonth / totalUsers) * 100 : 0;
    const revenueGrowthRate = monthlyRecurringRevenue > 0 ? 25 : 0; // Placeholder growth rate

    // Financial metrics
    const costAnalysis = getCostAnalysis();
    const grossMargin = monthlyRecurringRevenue > 0 
      ? ((monthlyRecurringRevenue - costAnalysis.totalCostMonth) / monthlyRecurringRevenue) * 100 
      : 95; // Default 95% margin

    return {
      monthlyRecurringRevenue,
      averageRevenuePerUser,
      totalRevenue,
      revenueGrowthRate,
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      userGrowthRate,
      churnRate: 5, // Placeholder
      totalListingsGenerated,
      listingsThisMonth,
      averageListingsPerUser,
      aiAccuracyRate,
      grossMargin,
      customerLifetimeValue: averageRevenuePerUser * 8, // Assuming 8 month average lifespan
      customerAcquisitionCost: 25, // Placeholder
      apiCostEfficiency: monthlyRecurringRevenue / Math.max(costAnalysis.totalCostMonth, 0.01)
    };
  };

  const generateRevenueProjections = (metrics: BusinessMetrics): RevenueProjection[] => {
    const currentMRR = metrics.monthlyRecurringRevenue;
    const growthRate = metrics.revenueGrowthRate / 100;
    
    const projections: RevenueProjection[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 0; i < 12; i++) {
      const projected = currentMRR * Math.pow(1 + growthRate, i);
      const target = i === 0 ? currentMRR : 10000; // $10K target
      
      projections.push({
        month: months[(new Date().getMonth() + i) % 12],
        projected: Math.round(projected),
        actual: i === 0 ? currentMRR : undefined,
        target
      });
    }
    
    return projections;
  };

  const generateCategoryInsights = (items: any[]): CategoryInsight[] => {
    const categoryMap = new Map<string, { revenue: number; volume: number; prices: number[] }>();
    
    items.forEach(item => {
      const category = item.category || 'Other';
      const price = item.suggested_price || 25;
      const revenue = price * 0.05; // 5% commission estimate
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { revenue: 0, volume: 0, prices: [] });
      }
      
      const data = categoryMap.get(category)!;
      data.revenue += revenue;
      data.volume += 1;
      data.prices.push(price);
    });
    
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        volume: data.volume,
        averagePrice: data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length,
        growthRate: Math.random() * 20 - 10 // Placeholder growth rate
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getProgressToTarget = (current: number, target: number): number => {
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Unable to Load Business Metrics</h2>
          <p className="text-gray-400">Please check your database connection and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <BarChart3 className="w-8 h-8 text-cyan-500" />
              <h1 className="text-xl font-bold">Business Intelligence Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              
              <button 
                onClick={loadBusinessMetrics}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress to $10K Goal */}
        <div className="mb-8 bg-gradient-to-r from-purple-900 to-blue-900 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Path to $10K/Month</h2>
            <Target className="w-8 h-8 text-cyan-400" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-cyan-400">
                {formatCurrency(metrics.monthlyRecurringRevenue)}
              </div>
              <div className="text-sm text-gray-300">Current MRR</div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${getProgressToTarget(metrics.monthlyRecurringRevenue, 10000)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-green-400">
                {Math.ceil((10000 - metrics.monthlyRecurringRevenue) / 1.50)}
              </div>
              <div className="text-sm text-gray-300">Listings needed for $10K</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-yellow-400">
                {Math.ceil(10000 / metrics.averageRevenuePerUser)}
              </div>
              <div className="text-sm text-gray-300">Users needed for $10K</div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Monthly Recurring Revenue"
            value={formatCurrency(metrics.monthlyRecurringRevenue)}
            change={metrics.revenueGrowthRate}
            icon={DollarSign}
            color="text-green-400"
          />
          
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers.toLocaleString()}
            change={metrics.userGrowthRate}
            icon={Users}
            color="text-blue-400"
          />
          
          <MetricCard
            title="AI Accuracy"
            value={formatPercent(metrics.aiAccuracyRate * 100)}
            change={5.2}
            icon={Zap}
            color="text-purple-400"
          />
          
          <MetricCard
            title="Gross Margin"
            value={formatPercent(metrics.grossMargin)}
            change={2.1}
            icon={TrendingUp}
            color="text-cyan-400"
          />
        </div>

        {/* Revenue Projection Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Revenue Projection
            </h3>
            
            <div className="space-y-3">
              {projections.slice(0, 6).map((projection, index) => (
                <div key={projection.month} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{projection.month}</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(projection.projected / projection.target) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-medium text-cyan-400">
                    {formatCurrency(projection.projected)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-cyan-400" />
              Category Performance
            </h3>
            
            <div className="space-y-3">
              {categoryInsights.map((insight, index) => (
                <div key={insight.category} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{insight.category}</span>
                      <span className="text-sm text-gray-400">
                        {insight.volume} items • {formatCurrency(insight.averagePrice)} avg
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min((insight.revenue / Math.max(...categoryInsights.map(c => c.revenue))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-sm font-medium text-green-400">
                    {formatCurrency(insight.revenue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">User Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Users</span>
                <span className="font-medium">{metrics.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">New Users (30d)</span>
                <span className="font-medium">{metrics.newUsersThisMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Listings/User</span>
                <span className="font-medium">{metrics.averageListingsPerUser.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Customer LTV</span>
                <span className="font-medium">{formatCurrency(metrics.customerLifetimeValue)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Product Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Listings</span>
                <span className="font-medium">{metrics.totalListingsGenerated.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">This Month</span>
                <span className="font-medium">{metrics.listingsThisMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">AI Accuracy</span>
                <span className="font-medium">{formatPercent(metrics.aiAccuracyRate * 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">API Efficiency</span>
                <span className="font-medium">{metrics.apiCostEfficiency.toFixed(1)}x</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Financial Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Gross Margin</span>
                <span className="font-medium text-green-400">{formatPercent(metrics.grossMargin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ARPU</span>
                <span className="font-medium">{formatCurrency(metrics.averageRevenuePerUser)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">CAC</span>
                <span className="font-medium">{formatCurrency(metrics.customerAcquisitionCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">LTV:CAC Ratio</span>
                <span className="font-medium text-cyan-400">
                  {(metrics.customerLifetimeValue / metrics.customerAcquisitionCost).toFixed(1)}:1
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="mt-8 bg-gradient-to-r from-orange-900 to-red-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-400" />
            Strategic Recommendations
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-orange-400 mb-2">Immediate Actions</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Launch freemium model (3 free listings/month)</li>
                <li>• Improve AI accuracy to 90%+ (current: {formatPercent(metrics.aiAccuracyRate * 100)})</li>
                <li>• Implement referral program for user acquisition</li>
                <li>• Add bulk upload features for power users</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-orange-400 mb-2">Growth Opportunities</h4>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>• Expand to Facebook Marketplace integration</li>
                <li>• Launch mobile app for easier photo capture</li>
                <li>• Partner with local thrift stores and resellers</li>
                <li>• Add automated repricing based on market trends</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, color }) => {
  const isPositive = change > 0;
  
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-8 h-8 ${color}`} />
        <div className={`flex items-center gap-1 text-sm ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}>
          {isPositive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      
      <div className="text-2xl font-bold text-white mb-1">
        {value}
      </div>
      
      <div className="text-sm text-gray-400">
        {title}
      </div>
    </div>
  );
};

export default BusinessIntelligenceDashboard;