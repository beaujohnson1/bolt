import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Target, Clock, Award, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';

interface PricingStats {
  totalRecommendations: number;
  avgConfidenceScore: number;
  avgRecommendedPrice: number;
  totalSavings: number;
  accuracyRate: number;
  topPerformingCategory: string;
  recentTrends: {
    category: string;
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
  }[];
  monthlyStats: {
    month: string;
    recommendations: number;
    avgPrice: number;
  }[];
}

interface PricingPerformance {
  item_id: string;
  item_title: string;
  recommended_price: number;
  actual_sold_price?: number;
  price_accuracy_score?: number;
  days_to_sell?: number;
  recommendation_date: string;
  sold_date?: string;
}

const PricingDashboard: React.FC = () => {
  const { authUser } = useAuth();
  const [stats, setStats] = useState<PricingStats | null>(null);
  const [recentPerformance, setRecentPerformance] = useState<PricingPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authUser) {
      loadDashboardData();
    }
  }, [authUser]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = getSupabase();
      if (!supabase) throw new Error('Database connection not available');

      // Fetch pricing recommendations stats
      const { data: recommendations, error: recError } = await supabase
        .from('pricing_recommendations')
        .select('*')
        .eq('user_id', authUser!.id)
        .order('created_at', { ascending: false });

      if (recError) throw recError;

      // Fetch pricing performance data
      const { data: performance, error: perfError } = await supabase
        .from('pricing_performance')
        .select(`
          *,
          items(title)
        `)
        .eq('user_id', authUser!.id)
        .order('recommendation_date', { ascending: false })
        .limit(10);

      if (perfError) throw perfError;

      // Process data into dashboard stats
      const dashboardStats = processStatsData(recommendations || [], performance || []);
      setStats(dashboardStats);

      // Format performance data
      const formattedPerformance = (performance || []).map(p => ({
        item_id: p.item_id,
        item_title: p.items?.title || 'Unknown Item',
        recommended_price: p.recommended_price,
        actual_sold_price: p.actual_sold_price,
        price_accuracy_score: p.price_accuracy_score,
        days_to_sell: p.days_to_sell,
        recommendation_date: p.recommendation_date,
        sold_date: p.sold_date
      }));

      setRecentPerformance(formattedPerformance);

    } catch (error) {
      console.error('Error loading pricing dashboard:', error);
      setError('Failed to load pricing dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processStatsData = (recommendations: any[], performance: any[]): PricingStats => {
    const totalRecommendations = recommendations.length;
    const avgConfidenceScore = recommendations.length > 0 
      ? recommendations.reduce((sum, r) => sum + r.confidence_score, 0) / recommendations.length 
      : 0;
    const avgRecommendedPrice = recommendations.length > 0 
      ? recommendations.reduce((sum, r) => sum + r.recommended_price, 0) / recommendations.length 
      : 0;

    // Calculate accuracy from performance data
    const accuratePerformance = performance.filter(p => 
      p.price_accuracy_score && p.price_accuracy_score >= 0.8
    );
    const accuracyRate = performance.length > 0 
      ? (accuratePerformance.length / performance.length) * 100 
      : 0;

    // Mock data for categories and trends (would be calculated from real data)
    const recentTrends = [
      { category: 'Clothing', trend: 'increasing' as const, changePercent: 8.5 },
      { category: 'Electronics', trend: 'stable' as const, changePercent: 1.2 },
      { category: 'Shoes', trend: 'decreasing' as const, changePercent: -3.7 },
    ];

    const monthlyStats = [
      { month: 'Dec 2024', recommendations: 45, avgPrice: 67.80 },
      { month: 'Jan 2025', recommendations: 52, avgPrice: 71.20 },
      { month: 'Feb 2025', recommendations: 38, avgPrice: 69.50 },
    ];

    return {
      totalRecommendations,
      avgConfidenceScore,
      avgRecommendedPrice,
      totalSavings: 2400, // Mock data
      accuracyRate,
      topPerformingCategory: 'Clothing',
      recentTrends,
      monthlyStats
    };
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getAccuracyColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="h-6 bg-gray-300 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pricing Data Yet</h3>
        <p className="text-gray-600">Start analyzing items to see your pricing insights here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Recommendations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecommendations}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
              <p className="text-2xl font-bold text-gray-900">{formatPercent(stats.avgConfidenceScore * 100)}</p>
            </div>
            <Target className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Price</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.avgRecommendedPrice)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Accuracy Rate</p>
              <p className="text-2xl font-bold text-gray-900">{formatPercent(stats.accuracyRate)}</p>
            </div>
            <Award className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Trends */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Market Trends</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recentTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getTrendIcon(trend.trend)}
                    <span className="font-medium text-gray-900">{trend.category}</span>
                  </div>
                  <div className={`text-sm font-medium ${
                    trend.changePercent > 0 ? 'text-green-600' : 
                    trend.changePercent < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {trend.changePercent > 0 ? '+' : ''}{trend.changePercent}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Performance */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Performance</h3>
          </div>
          <div className="p-6">
            {recentPerformance.length > 0 ? (
              <div className="space-y-4">
                {recentPerformance.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.item_title}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Rec: {formatPrice(item.recommended_price)}</span>
                        {item.actual_sold_price && (
                          <span>Sold: {formatPrice(item.actual_sold_price)}</span>
                        )}
                        {item.days_to_sell && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {item.days_to_sell}d
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${getAccuracyColor(item.price_accuracy_score)}`}>
                      {item.price_accuracy_score 
                        ? formatPercent(item.price_accuracy_score * 100)
                        : 'Pending'
                      }
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No performance data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Stats Chart */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.monthlyStats.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{month.month}</span>
                    <span className="text-sm text-gray-500">
                      {month.recommendations} items • {formatPrice(month.avgPrice)} avg
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(month.recommendations / 60) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">💡 Pricing Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div className="space-y-2">
            <p>• Your pricing accuracy is {formatPercent(stats.accuracyRate)}</p>
            <p>• {stats.topPerformingCategory} items perform best</p>
            <p>• Average confidence score: {formatPercent(stats.avgConfidenceScore * 100)}</p>
          </div>
          <div className="space-y-2">
            <p>• Market trends show seasonal variation</p>
            <p>• Consider timing listings for optimal results</p>
            <p>• Monitor competitor pricing regularly</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingDashboard;