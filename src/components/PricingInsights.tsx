import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, Target, Clock, Calendar, BarChart3, AlertCircle, Info } from 'lucide-react';
import DynamicPricingService, { PricingInsights as PricingInsightsType } from '../services/DynamicPricingService';
import { useAuth } from '../contexts/AuthContext';

interface PricingInsightsProps {
  itemId: string;
  itemData: {
    title: string;
    brand?: string;
    category?: string;
    condition?: string;
    size?: string;
    color?: string;
    suggested_price?: number;
  };
  onPriceUpdate?: (newPrice: number) => void;
}

const PricingInsights: React.FC<PricingInsightsProps> = ({
  itemId,
  itemData,
  onPriceUpdate
}) => {
  const { authUser } = useAuth();
  const [insights, setInsights] = useState<PricingInsightsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingService] = useState(() => new DynamicPricingService());

  useEffect(() => {
    loadPricingInsights();
  }, [itemId, authUser]);

  const loadPricingInsights = async () => {
    if (!authUser) {
      setError('Please sign in to see pricing insights');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const pricingInsights = await pricingService.generatePricingRecommendation(
        itemId,
        authUser.id,
        itemData
      );

      setInsights(pricingInsights);
    } catch (err) {
      console.error('Error loading pricing insights:', err);
      setError('Failed to load pricing insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const handleAcceptPrice = () => {
    if (insights?.recommendation.recommended_price && onPriceUpdate) {
      onPriceUpdate(insights.recommendation.recommended_price);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 bg-gray-300 rounded mr-2"></div>
            <div className="h-6 bg-gray-300 rounded w-32"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center text-red-600 mb-2">
          <AlertCircle className="w-5 h-5 mr-2" />
          <h3 className="font-semibold">Unable to Load Pricing Insights</h3>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadPricingInsights}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No pricing insights available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Target className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Smart Pricing Insights</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(insights.recommendation.confidence_score)}`}>
            {getConfidenceLabel(insights.recommendation.confidence_score)}
          </div>
        </div>
      </div>

      {/* Main Recommendation */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {formatPrice(insights.recommendation.recommended_price)}
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Recommended listing price
          </div>
          <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
            <span>Range: {formatPrice(insights.recommendation.price_range_min)} - {formatPrice(insights.recommendation.price_range_max)}</span>
          </div>
          <button
            onClick={handleAcceptPrice}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Use This Price
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-600">Market Data</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {insights.recommendation.market_data_points}
            </div>
            <div className="text-xs text-gray-500">sold listings</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-600">Avg. Sale Time</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {insights.recommendation.days_on_market_avg || 7}
            </div>
            <div className="text-xs text-gray-500">days</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {getTrendIcon(insights.demandTrend)}
              <span className="text-sm font-medium text-gray-600 ml-2">Demand Trend</span>
            </div>
            <div className="text-xl font-semibold text-gray-900 capitalize">
              {insights.demandTrend}
            </div>
            <div className="text-xs text-gray-500">market trend</div>
          </div>
        </div>
      </div>

      {/* Market Analysis */}
      <div className="p-6 border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4">Market Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Average Sold Price:</span>
              <span className="font-medium">
                {formatPrice(insights.recommendation.average_sold_price || 0)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Median Sold Price:</span>
              <span className="font-medium">
                {formatPrice(insights.recommendation.median_sold_price || 0)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Seasonality Factor:</span>
              <span className="font-medium">
                {((insights.seasonalityFactor - 1) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Similar Listings:</span>
              <span className="font-medium">
                {insights.competitiveAnalysis.similarListingsCount}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Competitor Avg:</span>
              <span className="font-medium">
                {formatPrice(insights.competitiveAnalysis.avgCompetitorPrice)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Price Position:</span>
              <span className={`font-medium capitalize ${
                insights.competitiveAnalysis.pricePosition === 'above' ? 'text-red-600' :
                insights.competitiveAnalysis.pricePosition === 'below' ? 'text-green-600' :
                'text-blue-600'
              }`}>
                {insights.competitiveAnalysis.pricePosition}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Best Time to List */}
      {insights.bestTimeToList && (
        <div className="p-6 border-b border-gray-200 bg-green-50">
          <div className="flex items-center mb-3">
            <Calendar className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="font-semibold text-green-900">Optimal Listing Time</h4>
          </div>
          <p className="text-sm text-green-800">
            Based on market data, consider listing on{' '}
            <span className="font-medium">{insights.bestTimeToList.dayOfWeek}s</span> during the{' '}
            <span className="font-medium">{insights.bestTimeToList.timeOfDay}</span> for best results.
          </p>
        </div>
      )}

      {/* Pricing Tips */}
      <div className="p-6">
        <div className="flex items-center mb-3">
          <Info className="w-5 h-5 text-blue-600 mr-2" />
          <h4 className="font-semibold text-gray-900">Pricing Strategy Tips</h4>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          {insights.demandTrend === 'increasing' && (
            <div className="flex items-start">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Demand is increasing - you can price at the higher end of the range</span>
            </div>
          )}
          {insights.demandTrend === 'decreasing' && (
            <div className="flex items-start">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Demand is decreasing - consider pricing competitively to sell faster</span>
            </div>
          )}
          {insights.seasonalityFactor > 1.1 && (
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>It's peak season for this category - take advantage of higher demand</span>
            </div>
          )}
          {insights.seasonalityFactor < 0.9 && (
            <div className="flex items-start">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Off-season pricing - consider waiting or pricing to move quickly</span>
            </div>
          )}
          {insights.recommendation.confidence_score < 0.6 && (
            <div className="flex items-start">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
              <span>Limited market data - monitor similar listings and adjust as needed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingInsights;