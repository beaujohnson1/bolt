import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  DollarSign, 
  Clock, 
  Target,
  BarChart3,
  Settings,
  Zap,
  Eye,
  Search,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { aiAccuracyAgent } from '../services/AIAccuracyAgent';
import { ocrKeywordOptimizer } from '../services/OCRKeywordOptimizer';
import { ebaySpecificsValidator } from '../services/EbaySpecificsValidator';
import { promptOptimizationEngine } from '../services/PromptOptimizationEngine';

interface AIMetrics {
  totalPredictions: number;
  avgAccuracy: number;
  avgCostCents: number;
  topFailingField: string;
  improvementTrend: number;
  costEfficiency: number;
  fieldAccuracies: {
    title: number;
    brand: number;
    size: number;
    condition: number;
    category: number;
    color: number;
    keywords: number;
    specifics: number;
  };
}

interface PerformanceInsight {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  metric?: number;
  action?: string;
}

const AIInsightsDashboard: React.FC = () => {
  const { authUser } = useAuth();
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'accuracy' | 'costs' | 'optimization'>('overview');
  const [timeRange, setTimeRange] = useState(30); // days
  const [isDarkMode] = useState(true);

  useEffect(() => {
    if (authUser) {
      loadAIMetrics();
    }
  }, [authUser, timeRange]);

  const loadAIMetrics = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      console.log('📊 [AI-INSIGHTS] Loading AI metrics for user:', authUser.id);

      // Get AI accuracy metrics
      const performanceMetrics = await aiAccuracyAgent.getPerformanceMetrics(authUser.id, timeRange);
      
      if (performanceMetrics) {
        setMetrics(performanceMetrics);
        
        // Generate insights based on performance
        const generatedInsights = await generateInsights(performanceMetrics);
        setInsights(generatedInsights);
      } else {
        // Set placeholder metrics for new users
        setMetrics({
          totalPredictions: 0,
          avgAccuracy: 0,
          avgCostCents: 0,
          topFailingField: 'none',
          improvementTrend: 0,
          costEfficiency: 0,
          fieldAccuracies: {
            title: 0, brand: 0, size: 0, condition: 0,
            category: 0, color: 0, keywords: 0, specifics: 0
          }
        });
        
        setInsights([{
          type: 'info',
          title: 'Welcome to AI Insights',
          description: 'Start analyzing items to see your AI performance metrics here.',
          action: 'Upload your first photos'
        }]);
      }

    } catch (error) {
      console.error('❌ [AI-INSIGHTS] Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async (performanceMetrics: AIMetrics): Promise<PerformanceInsight[]> => {
    const insights: PerformanceInsight[] = [];

    // Overall performance insights
    if (performanceMetrics.avgAccuracy >= 0.85) {
      insights.push({
        type: 'success',
        title: 'Excellent AI Performance',
        description: 'Your AI analysis accuracy is above 85%. Keep up the great work!',
        metric: performanceMetrics.avgAccuracy
      });
    } else if (performanceMetrics.avgAccuracy < 0.6) {
      insights.push({
        type: 'error',
        title: 'AI Accuracy Needs Attention',
        description: 'AI accuracy is below 60%. Consider improving photo quality or adjusting prompts.',
        metric: performanceMetrics.avgAccuracy,
        action: 'Review photo guidelines'
      });
    } else {
      insights.push({
        type: 'warning',
        title: 'AI Performance is Moderate',
        description: 'There\'s room for improvement in AI accuracy. Focus on clearer photos and better lighting.',
        metric: performanceMetrics.avgAccuracy,
        action: 'Optimize photo quality'
      });
    }

    // Cost efficiency insights
    if (performanceMetrics.costEfficiency > 15) {
      insights.push({
        type: 'success',
        title: 'Cost Efficient AI Usage',
        description: 'You\'re getting great value from your AI analysis costs.',
        metric: performanceMetrics.costEfficiency
      });
    } else if (performanceMetrics.costEfficiency < 8) {
      insights.push({
        type: 'warning',
        title: 'High AI Costs vs Accuracy',
        description: 'Consider optimizing your AI usage for better cost efficiency.',
        metric: performanceMetrics.costEfficiency,
        action: 'Review prompt optimization'
      });
    }

    // Field-specific insights
    const lowestField = Object.entries(performanceMetrics.fieldAccuracies)
      .sort(([,a], [,b]) => a - b)[0];
    
    if (lowestField && lowestField[1] < 0.5) {
      insights.push({
        type: 'warning',
        title: `${lowestField[0]} Detection Needs Work`,
        description: `${lowestField[0]} accuracy is only ${Math.round(lowestField[1] * 100)}%. Focus on clearer photos of ${lowestField[0]} information.`,
        metric: lowestField[1],
        action: `Improve ${lowestField[0]} photo capture`
      });
    }

    // Trend insights
    if (performanceMetrics.improvementTrend > 0.1) {
      insights.push({
        type: 'success',
        title: 'Improving Performance Trend',
        description: 'Your AI accuracy has been improving over time. Great progress!',
        metric: performanceMetrics.improvementTrend
      });
    }

    // Get optimization recommendations
    const recommendations = await aiAccuracyAgent.getOptimizationRecommendations(authUser.id);
    recommendations.slice(0, 3).forEach(rec => {
      insights.push({
        type: 'info',
        title: 'Optimization Recommendation',
        description: rec
      });
    });

    return insights;
  };

  const formatCurrency = (cents: number): string => {
    return `$${(cents / 100).toFixed(3)}`;
  };

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const getInsightIcon = (type: PerformanceInsight['type']) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'error': return AlertCircle;
      case 'warning': return AlertCircle;
      default: return Eye;
    }
  };

  const getInsightColor = (type: PerformanceInsight['type']) => {
    switch (type) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Brain className="w-8 h-8 text-cyan-500" />
              <h1 className="text-xl font-bold">AI Insights Dashboard</h1>
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
                onClick={loadAIMetrics}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-700 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'accuracy', name: 'Accuracy Analysis', icon: Target },
              { id: 'costs', name: 'Cost Analysis', icon: DollarSign },
              { id: 'optimization', name: 'Optimization', icon: Zap }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-cyan-500 text-cyan-500'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Predictions"
                value={metrics?.totalPredictions || 0}
                icon={Brain}
                trend={metrics?.improvementTrend}
                isDarkMode={isDarkMode}
              />
              
              <MetricCard
                title="Average Accuracy"
                value={formatPercentage(metrics?.avgAccuracy || 0)}
                icon={Target}
                trend={metrics?.improvementTrend}
                isDarkMode={isDarkMode}
              />
              
              <MetricCard
                title="Avg Cost per Analysis"
                value={formatCurrency(metrics?.avgCostCents || 0)}
                icon={DollarSign}
                trend={metrics?.costEfficiency ? -0.1 : 0}
                isDarkMode={isDarkMode}
              />
              
              <MetricCard
                title="Cost Efficiency"
                value={`${(metrics?.costEfficiency || 0).toFixed(1)}x`}
                icon={TrendingUp}
                trend={0.15}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Field Accuracy Breakdown */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-500" />
                Field Accuracy Breakdown
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics && Object.entries(metrics.fieldAccuracies).map(([field, accuracy]) => (
                  <div key={field} className="text-center">
                    <div className="text-2xl font-bold text-cyan-500 mb-1">
                      {formatPercentage(accuracy)}
                    </div>
                    <div className="text-sm text-gray-400 capitalize">
                      {field}
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          accuracy > 0.8 ? 'bg-green-500' : 
                          accuracy > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${accuracy * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-500" />
                Performance Insights
              </h2>
              
              <div className="space-y-4">
                {insights.map((insight, index) => {
                  const Icon = getInsightIcon(insight.type);
                  return (
                    <div key={index} className="flex items-start gap-3 p-4 bg-gray-700 rounded-lg">
                      <Icon className={`w-5 h-5 ${getInsightColor(insight.type)} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1">
                        <div className="font-medium text-white">{insight.title}</div>
                        <div className="text-sm text-gray-400 mt-1">{insight.description}</div>
                        {insight.action && (
                          <div className="text-xs text-cyan-400 mt-2">
                            Action: {insight.action}
                          </div>
                        )}
                      </div>
                      {insight.metric && (
                        <div className="text-right">
                          <div className="font-bold text-cyan-500">
                            {typeof insight.metric === 'number' && insight.metric < 1 
                              ? formatPercentage(insight.metric)
                              : insight.metric
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'accuracy' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Accuracy Analysis</h2>
            <p className="text-gray-400">Detailed accuracy analysis coming soon...</p>
          </div>
        )}

        {activeTab === 'costs' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Cost Analysis</h2>
            <p className="text-gray-400">Cost breakdown and optimization suggestions coming soon...</p>
          </div>
        )}

        {activeTab === 'optimization' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">AI Optimization</h2>
            <p className="text-gray-400">Prompt optimization and A/B testing tools coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  isDarkMode: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, trend, isDarkMode }) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    return trend > 0 ? TrendingUp : TrendingDown;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    return trend > 0 ? 'text-green-500' : 'text-red-500';
  };

  const TrendIcon = getTrendIcon();

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {title}
          </p>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {value}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {TrendIcon && (
            <TrendIcon className={`w-4 h-4 ${getTrendColor()}`} />
          )}
          <Icon className="w-8 h-8 text-cyan-500" />
        </div>
      </div>
      
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span className={`text-xs ${getTrendColor()}`}>
            {trend > 0 ? '+' : ''}{(trend * 100).toFixed(1)}%
          </span>
          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            vs last period
          </span>
        </div>
      )}
    </div>
  );
};

export default AIInsightsDashboard;