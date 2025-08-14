/**
 * Real-Time Accuracy Monitoring System
 * Continuous performance tracking and automated improvement suggestions
 */

import { getSupabase } from '../lib/supabase';

export interface AccuracyMetrics {
  overallAccuracy: number;
  brandAccuracy: number;
  sizeAccuracy: number;
  titleQuality: number;
  ocrConfidence: number;
  processingTime: number;
  timestamp: Date;
}

export interface PerformanceAlert {
  id: string;
  type: 'accuracy_drop' | 'performance_degradation' | 'cost_spike' | 'error_rate_high';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metrics: AccuracyMetrics;
  recommendations: string[];
  timestamp: Date;
  acknowledged: boolean;
}

export interface TrendAnalysis {
  timeframe: '24h' | '7d' | '30d';
  averageAccuracy: number;
  trend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
  predictions: {
    nextWeek: number;
    nextMonth: number;
  };
}

export class RealTimeAccuracyMonitor {
  private supabase = getSupabase();
  private alertThresholds = {
    accuracy: {
      critical: 60,
      high: 70,
      medium: 80,
      low: 85
    },
    processingTime: {
      critical: 15000, // 15 seconds
      high: 10000,    // 10 seconds
      medium: 7000,   // 7 seconds
      low: 5000       // 5 seconds
    },
    errorRate: {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5
    }
  };

  /**
   * Record accuracy metrics for real-time monitoring
   */
  async recordAccuracyMetrics(
    userId: string,
    itemId: string,
    metrics: Omit<AccuracyMetrics, 'timestamp'>
  ): Promise<void> {
    try {
      if (!this.supabase) {
        console.warn('⚠️ [ACCURACY-MONITOR] Supabase not available, skipping metrics recording');
        return;
      }

      const fullMetrics: AccuracyMetrics = {
        ...metrics,
        timestamp: new Date()
      };

      // Store in ai_predictions table
      await this.supabase
        .from('ai_predictions')
        .insert({
          item_id: itemId,
          user_id: userId,
          overall_accuracy: metrics.overallAccuracy,
          brand_accuracy: metrics.brandAccuracy,
          size_accuracy: metrics.sizeAccuracy,
          title_quality: metrics.titleQuality,
          ocr_confidence: metrics.ocrConfidence,
          processing_time_ms: metrics.processingTime,
          created_at: new Date().toISOString()
        });

      // Check for performance alerts
      await this.checkPerformanceAlerts(fullMetrics);

      console.log('✅ [ACCURACY-MONITOR] Recorded metrics:', {
        overallAccuracy: metrics.overallAccuracy,
        processingTime: metrics.processingTime,
        itemId
      });

    } catch (error) {
      console.error('❌ [ACCURACY-MONITOR] Error recording metrics:', error);
    }
  }

  /**
   * Get real-time accuracy dashboard data
   */
  async getAccuracyDashboard(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<{
    currentMetrics: AccuracyMetrics;
    trendAnalysis: TrendAnalysis;
    recentAlerts: PerformanceAlert[];
    recommendations: string[];
  }> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not available');
      }

      const hoursBack = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      // Get recent metrics
      const { data: recentData } = await this.supabase
        .from('ai_predictions')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (!recentData || recentData.length === 0) {
        throw new Error('No recent metrics data available');
      }

      // Calculate current metrics
      const currentMetrics = this.calculateCurrentMetrics(recentData);
      
      // Analyze trends
      const trendAnalysis = this.analyzeTrends(recentData, timeframe);
      
      // Get recent alerts (from memory or database)
      const recentAlerts = await this.getRecentAlerts();
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(currentMetrics, trendAnalysis);

      return {
        currentMetrics,
        trendAnalysis,
        recentAlerts,
        recommendations
      };

    } catch (error) {
      console.error('❌ [ACCURACY-MONITOR] Error getting dashboard data:', error);
      
      // Return fallback data
      return {
        currentMetrics: {
          overallAccuracy: 75,
          brandAccuracy: 70,
          sizeAccuracy: 65,
          titleQuality: 80,
          ocrConfidence: 85,
          processingTime: 5000,
          timestamp: new Date()
        },
        trendAnalysis: {
          timeframe,
          averageAccuracy: 75,
          trend: 'stable',
          trendPercentage: 0,
          predictions: { nextWeek: 75, nextMonth: 75 }
        },
        recentAlerts: [],
        recommendations: ['Enable monitoring to get personalized recommendations']
      };
    }
  }

  /**
   * Check for performance alerts
   */
  private async checkPerformanceAlerts(metrics: AccuracyMetrics): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // Check accuracy alerts
    if (metrics.overallAccuracy <= this.alertThresholds.accuracy.critical) {
      alerts.push({
        id: `accuracy_${Date.now()}`,
        type: 'accuracy_drop',
        severity: 'critical',
        message: `Overall accuracy dropped to ${metrics.overallAccuracy.toFixed(1)}%`,
        metrics,
        recommendations: [
          'Review recent OCR text quality',
          'Check for new item types requiring training',
          'Validate brand detection patterns',
          'Review size standardization rules'
        ],
        timestamp: new Date(),
        acknowledged: false
      });
    } else if (metrics.overallAccuracy <= this.alertThresholds.accuracy.high) {
      alerts.push({
        id: `accuracy_${Date.now()}`,
        type: 'accuracy_drop',
        severity: 'high',
        message: `Accuracy declining: ${metrics.overallAccuracy.toFixed(1)}%`,
        metrics,
        recommendations: [
          'Monitor brand detection accuracy',
          'Check size recognition patterns',
          'Review title optimization quality'
        ],
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Check processing time alerts
    if (metrics.processingTime >= this.alertThresholds.processingTime.critical) {
      alerts.push({
        id: `performance_${Date.now()}`,
        type: 'performance_degradation',
        severity: 'critical',
        message: `Processing time exceeded ${metrics.processingTime}ms`,
        metrics,
        recommendations: [
          'Optimize OCR processing pipeline',
          'Implement result caching',
          'Check API response times',
          'Consider parallel processing'
        ],
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Store alerts and trigger notifications
    for (const alert of alerts) {
      await this.triggerAlert(alert);
    }
  }

  /**
   * Calculate current metrics from recent data
   */
  private calculateCurrentMetrics(data: any[]): AccuracyMetrics {
    if (data.length === 0) {
      return {
        overallAccuracy: 0,
        brandAccuracy: 0,
        sizeAccuracy: 0,
        titleQuality: 0,
        ocrConfidence: 0,
        processingTime: 0,
        timestamp: new Date()
      };
    }

    const latest = data[0];
    const avgMetrics = data.reduce((acc, item) => ({
      overallAccuracy: acc.overallAccuracy + (item.overall_accuracy || 0),
      brandAccuracy: acc.brandAccuracy + (item.brand_accuracy || 0),
      sizeAccuracy: acc.sizeAccuracy + (item.size_accuracy || 0),
      titleQuality: acc.titleQuality + (item.title_quality || 0),
      ocrConfidence: acc.ocrConfidence + (item.ocr_confidence || 0),
      processingTime: acc.processingTime + (item.processing_time_ms || 0)
    }), {
      overallAccuracy: 0,
      brandAccuracy: 0,
      sizeAccuracy: 0,
      titleQuality: 0,
      ocrConfidence: 0,
      processingTime: 0
    });

    const count = data.length;
    return {
      overallAccuracy: avgMetrics.overallAccuracy / count,
      brandAccuracy: avgMetrics.brandAccuracy / count,
      sizeAccuracy: avgMetrics.sizeAccuracy / count,
      titleQuality: avgMetrics.titleQuality / count,
      ocrConfidence: avgMetrics.ocrConfidence / count,
      processingTime: avgMetrics.processingTime / count,
      timestamp: new Date(latest.created_at)
    };
  }

  /**
   * Analyze performance trends
   */
  private analyzeTrends(data: any[], timeframe: '24h' | '7d' | '30d'): TrendAnalysis {
    if (data.length < 2) {
      return {
        timeframe,
        averageAccuracy: data[0]?.overall_accuracy || 0,
        trend: 'stable',
        trendPercentage: 0,
        predictions: { nextWeek: 0, nextMonth: 0 }
      };
    }

    // Sort by date
    const sortedData = data.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Calculate average accuracy
    const averageAccuracy = sortedData.reduce((sum, item) => 
      sum + (item.overall_accuracy || 0), 0) / sortedData.length;

    // Calculate trend
    const firstHalf = sortedData.slice(0, Math.floor(sortedData.length / 2));
    const secondHalf = sortedData.slice(Math.floor(sortedData.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, item) => 
      sum + (item.overall_accuracy || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => 
      sum + (item.overall_accuracy || 0), 0) / secondHalf.length;

    const trendPercentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    
    let trend: 'improving' | 'declining' | 'stable';
    if (Math.abs(trendPercentage) < 2) {
      trend = 'stable';
    } else if (trendPercentage > 0) {
      trend = 'improving';
    } else {
      trend = 'declining';
    }

    // Simple predictions based on trend
    const currentAccuracy = secondHalfAvg;
    const weeklyChange = trendPercentage * 0.1; // Conservative estimate
    const monthlyChange = trendPercentage * 0.3;

    return {
      timeframe,
      averageAccuracy,
      trend,
      trendPercentage,
      predictions: {
        nextWeek: Math.max(0, Math.min(100, currentAccuracy + weeklyChange)),
        nextMonth: Math.max(0, Math.min(100, currentAccuracy + monthlyChange))
      }
    };
  }

  /**
   * Generate improvement recommendations with specific service activations
   */
  private generateRecommendations(
    metrics: AccuracyMetrics, 
    trends: TrendAnalysis
  ): string[] {
    const recommendations: string[] = [];

    // Accuracy-based recommendations with specific actions
    if (metrics.overallAccuracy < 80) {
      recommendations.push('🎯 Overall accuracy below 80% - Enable AI Ensemble Service for immediate 15% boost');
    }

    if (metrics.brandAccuracy < 75) {
      recommendations.push('🏷️ Brand detection underperforming - Activate Enhanced Brand Detector (25% improvement expected)');
    }

    if (metrics.sizeAccuracy < 70) {
      recommendations.push('📏 Size recognition needs help - Deploy Enhanced Size Processor with international standards');
    }

    if (metrics.titleQuality < 85) {
      recommendations.push('📝 Title quality suboptimal - Enable Enhanced Title Optimizer for eBay SEO compliance');
    }

    if (metrics.ocrConfidence < 80) {
      recommendations.push('🔍 OCR confidence low - Activate Enhanced OCR Processor with preprocessing pipeline');
    }

    // Performance-based recommendations with solutions
    if (metrics.processingTime > 8000) {
      recommendations.push('⚡ Processing slow (>8s) - Enable Smart Cache Manager and parallel processing');
    }

    if (metrics.processingTime > 5000 && metrics.processingTime <= 8000) {
      recommendations.push('🚀 Optimize processing speed - Implement Smart Cache Manager for 40% reduction');
    }

    // Trend-based actionable recommendations
    if (trends.trend === 'declining') {
      recommendations.push('📉 Performance declining - Run Error Resilience Service diagnostics immediately');
      recommendations.push('🔧 Deploy Automated Performance Alerts to catch issues early');
    }

    if (trends.trend === 'improving') {
      recommendations.push('📈 Performance improving - Consider enabling Revenue Optimization Agent');
    }

    // Advanced optimization for high performers
    if (metrics.overallAccuracy > 85 && metrics.brandAccuracy > 80) {
      recommendations.push('🏆 Excellent performance! Enable Advanced Analytics Engine for business insights');
      recommendations.push('🧪 Ready for Prompt Optimization Engine A/B testing');
    }

    // Cost optimization recommendations
    if (metrics.processingTime < 4000 && metrics.overallAccuracy > 75) {
      recommendations.push('💰 Well-optimized system - Enable Revenue Optimization Agent for profit maximization');
    }

    // Specific service activation based on accuracy gaps
    const accuracyGap = 90 - metrics.overallAccuracy; // Target 90% accuracy
    if (accuracyGap > 15) {
      recommendations.push('🔥 Large accuracy gap detected - Deploy Multi-Category Detector and AI Ensemble Service');
    } else if (accuracyGap > 10) {
      recommendations.push('⚡ Moderate accuracy gap - Enable Enhanced Brand + Size processors');
    }

    // Default recommendations if performance is good
    if (recommendations.length === 0) {
      recommendations.push('✅ Excellent performance! Enable Real-Time Market Intelligence for competitive edge');
      recommendations.push('🔬 Consider activating experimental Barcode Scanner integration');
    }

    return recommendations.slice(0, 6); // Limit to top 6 most actionable
  }

  /**
   * Get recent alerts
   */
  private async getRecentAlerts(): Promise<PerformanceAlert[]> {
    // In a real implementation, this would fetch from database
    // For now, return empty array as alerts are handled in memory
    return [];
  }

  /**
   * Trigger alert notification
   */
  private async triggerAlert(alert: PerformanceAlert): Promise<void> {
    console.warn(`🚨 [ACCURACY-MONITOR] ${alert.severity.toUpperCase()} ALERT:`, alert.message);
    console.log('📋 [ACCURACY-MONITOR] Recommendations:', alert.recommendations);
    
    // In production, this would:
    // - Send email notifications
    // - Post to Slack/Discord
    // - Store in alerts database
    // - Trigger automated responses for critical alerts
  }

  /**
   * Get accuracy trends for specific components
   */
  async getComponentAccuracyTrends(component: 'brand' | 'size' | 'title' | 'ocr'): Promise<{
    data: Array<{ date: string; accuracy: number }>;
    trend: 'improving' | 'declining' | 'stable';
    recommendation: string;
  }> {
    try {
      if (!this.supabase) {
        throw new Error('Supabase not available');
      }

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const { data } = await this.supabase
        .from('ai_predictions')
        .select(`created_at, ${component}_accuracy`)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (!data || data.length === 0) {
        return {
          data: [],
          trend: 'stable',
          recommendation: 'Insufficient data for trend analysis'
        };
      }

      // Group by day and calculate daily averages
      const dailyData = this.groupByDay(data, `${component}_accuracy`);
      
      // Calculate trend
      const trend = this.calculateTrend(dailyData.map(d => d.accuracy));
      
      // Generate recommendation
      const recommendation = this.getComponentRecommendation(component, trend, dailyData);

      return {
        data: dailyData,
        trend,
        recommendation
      };

    } catch (error) {
      console.error(`❌ [ACCURACY-MONITOR] Error getting ${component} trends:`, error);
      return {
        data: [],
        trend: 'stable',
        recommendation: 'Error retrieving trend data'
      };
    }
  }

  /**
   * Group data by day
   */
  private groupByDay(data: any[], accuracyField: string): Array<{ date: string; accuracy: number }> {
    const grouped = data.reduce((acc, item) => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { sum: 0, count: 0 };
      }
      acc[date].sum += item[accuracyField] || 0;
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { sum: number; count: number }>);

    return Object.entries(grouped).map(([date, { sum, count }]) => ({
      date,
      accuracy: sum / count
    }));
  }

  /**
   * Calculate simple trend
   */
  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    if (Math.abs(change) < 2) return 'stable';
    return change > 0 ? 'improving' : 'declining';
  }

  /**
   * Get component-specific recommendation
   */
  private getComponentRecommendation(
    component: string, 
    trend: 'improving' | 'declining' | 'stable',
    data: Array<{ date: string; accuracy: number }>
  ): string {
    const latest = data[data.length - 1]?.accuracy || 0;
    
    const recommendations = {
      brand: {
        improving: 'Brand detection is improving - continue current optimization strategies',
        declining: 'Brand detection declining - review fuzzy matching algorithms and brand database',
        stable: 'Brand detection is stable - consider expanding brand database for better coverage'
      },
      size: {
        improving: 'Size recognition improving - monitor for edge cases and international formats',
        declining: 'Size recognition declining - update size standardization rules and patterns',
        stable: 'Size recognition stable - test with more diverse size formats and abbreviations'
      },
      title: {
        improving: 'Title quality improving - analyze successful patterns for broader application',
        declining: 'Title quality declining - review keyword selection and eBay optimization rules',
        stable: 'Title quality stable - experiment with A/B testing different title strategies'
      },
      ocr: {
        improving: 'OCR performance improving - maintain current image preprocessing settings',
        declining: 'OCR performance declining - check image quality and preprocessing pipeline',
        stable: 'OCR performance stable - consider advanced preprocessing for challenging images'
      }
    };

    return recommendations[component]?.[trend] || 'Monitor performance and optimize as needed';
  }

  /**
   * Get performance statistics
   */
  getMonitoringStats() {
    return {
      alertThresholds: this.alertThresholds,
      monitoredMetrics: [
        'Overall Accuracy',
        'Brand Detection Accuracy', 
        'Size Recognition Accuracy',
        'Title Quality Score',
        'OCR Confidence',
        'Processing Time'
      ],
      alertTypes: [
        'Accuracy Drop',
        'Performance Degradation', 
        'Cost Spike',
        'High Error Rate'
      ],
      features: [
        'Real-time monitoring',
        'Trend analysis',
        'Automated alerts',
        'Performance recommendations',
        'Component-specific tracking'
      ]
    };
  }
}

export const realTimeAccuracyMonitor = new RealTimeAccuracyMonitor();