/**
 * Enhanced Cost Tracking and Monitoring System
 * Provides real-time cost analysis, budget alerts, and optimization recommendations
 */

interface APIUsageRecord {
  timestamp: Date;
  userId: string;
  apiType: 'openai' | 'google-vision' | 'ebay';
  operation: string;
  tokensUsed?: number;
  imageCount?: number;
  requestCount: number;
  costCents: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
}

interface CostAnalysis {
  totalCostToday: number;
  totalCostMonth: number;
  averageCostPerOperation: number;
  mostExpensiveOperation: string;
  costBreakdown: {
    openai: number;
    googleVision: number;
    ebay: number;
  };
  projectedMonthlyCost: number;
  budgetStatus: 'under' | 'approaching' | 'over';
  recommendations: string[];
}

interface BudgetAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  currentSpend: number;
  budgetLimit: number;
  percentageUsed: number;
  suggestedActions: string[];
}

class EnhancedCostTracker {
  private usageHistory: APIUsageRecord[] = [];
  private readonly MONTHLY_BUDGET_CENTS = 10000; // $100 monthly budget
  private readonly DAILY_BUDGET_CENTS = 500;     // $5 daily budget
  
  // Updated pricing based on actual API costs (December 2024)
  private readonly API_COSTS = {
    openai: {
      'gpt-4o-mini': {
        input: 0.000150,   // $0.150 per 1M input tokens
        output: 0.000600,  // $0.600 per 1M output tokens
        vision: 0.001,     // ~$0.001 per image (varies by detail)
      },
      'gpt-4o': {
        input: 0.0025,     // $2.50 per 1M input tokens
        output: 0.01,      // $10.00 per 1M output tokens
        vision: 0.005,     // ~$0.005 per image (high detail)
      }
    },
    googleVision: {
      textDetection: 0.0015,        // $1.50 per 1000 requests
      documentDetection: 0.0015,    // $1.50 per 1000 requests
      objectDetection: 0.0015,      // $1.50 per 1000 requests
    },
    ebay: {
      searchItems: 0,               // Free within rate limits
      getItem: 0,                   // Free within rate limits
      rateLimitPenalty: 0.01,       // Cost of rate limit delays
    }
  };

  /**
   * Track API usage and calculate costs
   */
  async trackUsage(
    userId: string,
    apiType: 'openai' | 'google-vision' | 'ebay',
    operation: string,
    details: {
      tokensUsed?: number;
      imageCount?: number;
      model?: string;
      responseTime: number;
      success: boolean;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      const costCents = this.calculateOperationCost(apiType, operation, details);
      
      const record: APIUsageRecord = {
        timestamp: new Date(),
        userId,
        apiType,
        operation,
        tokensUsed: details.tokensUsed,
        imageCount: details.imageCount,
        requestCount: 1,
        costCents,
        responseTime: details.responseTime,
        success: details.success,
        errorMessage: details.errorMessage
      };

      this.usageHistory.push(record);
      
      // Keep only last 1000 records in memory (in production, store in database)
      if (this.usageHistory.length > 1000) {
        this.usageHistory = this.usageHistory.slice(-1000);
      }

      console.log(`💰 [COST-TRACKER] ${apiType} ${operation}:`, {
        cost: `$${(costCents / 100).toFixed(3)}`,
        tokens: details.tokensUsed || 0,
        images: details.imageCount || 0,
        time: `${details.responseTime}ms`,
        success: details.success
      });

      // Check for budget alerts
      await this.checkBudgetAlerts(userId);

    } catch (error) {
      console.error('❌ [COST-TRACKER] Error tracking usage:', error);
    }
  }

  /**
   * Calculate cost for an operation
   */
  private calculateOperationCost(
    apiType: 'openai' | 'google-vision' | 'ebay',
    operation: string,
    details: any
  ): number {
    let costCents = 0;

    switch (apiType) {
      case 'openai':
        if (operation.includes('vision')) {
          const model = details.model || 'gpt-4o-mini';
          const imageCount = details.imageCount || 1;
          costCents = this.API_COSTS.openai[model]?.vision * imageCount * 100 || 0;
        }
        if (details.tokensUsed) {
          const model = details.model || 'gpt-4o-mini';
          const inputTokens = Math.floor(details.tokensUsed * 0.7); // Estimate 70% input
          const outputTokens = Math.floor(details.tokensUsed * 0.3); // Estimate 30% output
          
          const inputCost = (inputTokens / 1000000) * this.API_COSTS.openai[model]?.input * 100 || 0;
          const outputCost = (outputTokens / 1000000) * this.API_COSTS.openai[model]?.output * 100 || 0;
          costCents += inputCost + outputCost;
        }
        break;

      case 'google-vision':
        const requestCount = details.imageCount || 1;
        costCents = (this.API_COSTS.googleVision.textDetection * requestCount) * 100;
        break;

      case 'ebay':
        // eBay API is free within rate limits, but count rate limit delays as cost
        if (details.responseTime > 5000) { // If response took > 5 seconds, likely rate limited
          costCents = this.API_COSTS.ebay.rateLimitPenalty * 100;
        }
        break;
    }

    return Math.round(costCents * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get comprehensive cost analysis
   */
  getCostAnalysis(userId?: string): CostAnalysis {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter records
    let records = this.usageHistory;
    if (userId) {
      records = records.filter(r => r.userId === userId);
    }

    const todayRecords = records.filter(r => r.timestamp >= startOfDay);
    const monthRecords = records.filter(r => r.timestamp >= startOfMonth);

    // Calculate costs
    const totalCostToday = todayRecords.reduce((sum, r) => sum + r.costCents, 0) / 100;
    const totalCostMonth = monthRecords.reduce((sum, r) => sum + r.costCents, 0) / 100;

    // Cost breakdown
    const costBreakdown = {
      openai: monthRecords
        .filter(r => r.apiType === 'openai')
        .reduce((sum, r) => sum + r.costCents, 0) / 100,
      googleVision: monthRecords
        .filter(r => r.apiType === 'google-vision')
        .reduce((sum, r) => sum + r.costCents, 0) / 100,
      ebay: monthRecords
        .filter(r => r.apiType === 'ebay')
        .reduce((sum, r) => sum + r.costCents, 0) / 100
    };

    // Most expensive operation
    const operationCosts = new Map<string, number>();
    monthRecords.forEach(r => {
      const key = `${r.apiType}:${r.operation}`;
      operationCosts.set(key, (operationCosts.get(key) || 0) + r.costCents);
    });
    const mostExpensiveOperation = Array.from(operationCosts.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

    // Projections
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysSoFar = now.getDate();
    const projectedMonthlyCost = daysSoFar > 0 ? (totalCostMonth / daysSoFar) * daysInMonth : 0;

    // Budget status
    const monthlyBudget = this.MONTHLY_BUDGET_CENTS / 100;
    let budgetStatus: 'under' | 'approaching' | 'over' = 'under';
    if (projectedMonthlyCost > monthlyBudget) {
      budgetStatus = 'over';
    } else if (projectedMonthlyCost > monthlyBudget * 0.8) {
      budgetStatus = 'approaching';
    }

    // Generate recommendations
    const recommendations = this.generateCostRecommendations(
      costBreakdown, 
      projectedMonthlyCost, 
      monthlyBudget
    );

    return {
      totalCostToday,
      totalCostMonth,
      averageCostPerOperation: monthRecords.length > 0 ? totalCostMonth / monthRecords.length : 0,
      mostExpensiveOperation,
      costBreakdown,
      projectedMonthlyCost,
      budgetStatus,
      recommendations
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  private generateCostRecommendations(
    costBreakdown: { openai: number; googleVision: number; ebay: number },
    projectedCost: number,
    budget: number
  ): string[] {
    const recommendations: string[] = [];
    const total = costBreakdown.openai + costBreakdown.googleVision + costBreakdown.ebay;

    if (projectedCost > budget) {
      recommendations.push('🚨 Projected monthly cost exceeds budget - immediate action needed');
    }

    if (costBreakdown.openai > total * 0.7) {
      recommendations.push('💡 OpenAI costs are high - consider using gpt-4o-mini for more operations');
      recommendations.push('🖼️ Optimize image processing - resize images before sending to APIs');
      recommendations.push('📄 Implement caching to avoid reprocessing similar images');
    }

    if (costBreakdown.googleVision > total * 0.3) {
      recommendations.push('👁️ Google Vision costs are significant - batch process images when possible');
      recommendations.push('🔍 Consider using lower resolution for OCR where appropriate');
    }

    if (total > 0) {
      const openaiPercent = (costBreakdown.openai / total) * 100;
      const visionPercent = (costBreakdown.googleVision / total) * 100;

      if (openaiPercent > 80) {
        recommendations.push('⚖️ Balance workload - OpenAI represents 80%+ of costs');
      }
      if (visionPercent > 40) {
        recommendations.push('📊 Google Vision is 40%+ of costs - review OCR necessity');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Cost distribution looks healthy');
      recommendations.push('📈 Continue monitoring for optimization opportunities');
    }

    return recommendations;
  }

  /**
   * Check for budget alerts
   */
  private async checkBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
    const analysis = this.getCostAnalysis(userId);
    const alerts: BudgetAlert[] = [];

    // Daily budget check
    const dailyBudget = this.DAILY_BUDGET_CENTS / 100;
    const dailyPercentage = (analysis.totalCostToday / dailyBudget) * 100;

    if (dailyPercentage > 100) {
      alerts.push({
        type: 'critical',
        message: 'Daily budget exceeded',
        currentSpend: analysis.totalCostToday,
        budgetLimit: dailyBudget,
        percentageUsed: dailyPercentage,
        suggestedActions: [
          'Review recent API usage for inefficiencies',
          'Temporarily reduce AI analysis features',
          'Implement rate limiting for remaining day'
        ]
      });
    } else if (dailyPercentage > 80) {
      alerts.push({
        type: 'warning',
        message: 'Daily budget 80% used',
        currentSpend: analysis.totalCostToday,
        budgetLimit: dailyBudget,
        percentageUsed: dailyPercentage,
        suggestedActions: [
          'Monitor remaining usage carefully',
          'Prioritize essential operations only'
        ]
      });
    }

    // Monthly budget check
    const monthlyBudget = this.MONTHLY_BUDGET_CENTS / 100;
    const monthlyPercentage = (analysis.projectedMonthlyCost / monthlyBudget) * 100;

    if (monthlyPercentage > 100) {
      alerts.push({
        type: 'critical',
        message: 'Projected to exceed monthly budget',
        currentSpend: analysis.totalCostMonth,
        budgetLimit: monthlyBudget,
        percentageUsed: monthlyPercentage,
        suggestedActions: [
          'Implement aggressive cost optimization',
          'Review and optimize most expensive operations',
          'Consider upgrading to higher tier for better rates'
        ]
      });
    } else if (monthlyPercentage > 80) {
      alerts.push({
        type: 'warning',
        message: 'Projected monthly spend at 80% of budget',
        currentSpend: analysis.totalCostMonth,
        budgetLimit: monthlyBudget,
        percentageUsed: monthlyPercentage,
        suggestedActions: [
          'Review cost optimization opportunities',
          'Consider implementing caching strategies'
        ]
      });
    }

    // Log alerts
    alerts.forEach(alert => {
      const emoji = alert.type === 'critical' ? '🚨' : '⚠️';
      console.log(`${emoji} [COST-ALERT] ${alert.message}:`, {
        current: `$${alert.currentSpend.toFixed(2)}`,
        budget: `$${alert.budgetLimit.toFixed(2)}`,
        percentage: `${alert.percentageUsed.toFixed(1)}%`
      });
    });

    return alerts;
  }

  /**
   * Get usage statistics for dashboard
   */
  getUsageStatistics(userId?: string, days: number = 7): {
    dailyUsage: { date: string; cost: number; operations: number }[];
    topOperations: { operation: string; cost: number; count: number }[];
    errorRate: number;
    averageResponseTime: number;
  } {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let records = this.usageHistory.filter(r => r.timestamp >= cutoffDate);
    if (userId) {
      records = records.filter(r => r.userId === userId);
    }

    // Daily usage
    const dailyUsage = new Map<string, { cost: number; operations: number }>();
    records.forEach(r => {
      const dateKey = r.timestamp.toISOString().split('T')[0];
      const existing = dailyUsage.get(dateKey) || { cost: 0, operations: 0 };
      dailyUsage.set(dateKey, {
        cost: existing.cost + (r.costCents / 100),
        operations: existing.operations + 1
      });
    });

    // Top operations
    const operationStats = new Map<string, { cost: number; count: number }>();
    records.forEach(r => {
      const key = `${r.apiType}:${r.operation}`;
      const existing = operationStats.get(key) || { cost: 0, count: 0 };
      operationStats.set(key, {
        cost: existing.cost + (r.costCents / 100),
        count: existing.count + 1
      });
    });

    const topOperations = Array.from(operationStats.entries())
      .map(([operation, stats]) => ({ operation, ...stats }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    // Error rate and response time
    const errorRate = records.length > 0 
      ? (records.filter(r => !r.success).length / records.length) * 100 
      : 0;
    const averageResponseTime = records.length > 0
      ? records.reduce((sum, r) => sum + r.responseTime, 0) / records.length
      : 0;

    return {
      dailyUsage: Array.from(dailyUsage.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topOperations,
      errorRate: Math.round(errorRate * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }

  /**
   * Export usage data for analysis
   */
  exportUsageData(userId?: string, format: 'json' | 'csv' = 'json'): string {
    let records = this.usageHistory;
    if (userId) {
      records = records.filter(r => r.userId === userId);
    }

    if (format === 'csv') {
      const headers = [
        'timestamp', 'userId', 'apiType', 'operation', 'tokensUsed',
        'imageCount', 'costCents', 'responseTime', 'success', 'errorMessage'
      ];
      
      const csvRows = [
        headers.join(','),
        ...records.map(r => [
          r.timestamp.toISOString(),
          r.userId,
          r.apiType,
          r.operation,
          r.tokensUsed || 0,
          r.imageCount || 0,
          r.costCents,
          r.responseTime,
          r.success,
          r.errorMessage || ''
        ].join(','))
      ];
      
      return csvRows.join('\n');
    }

    return JSON.stringify(records, null, 2);
  }
}

// Singleton instance
export const enhancedCostTracker = new EnhancedCostTracker();

// Helper functions
export const trackAPIUsage = (
  userId: string,
  apiType: 'openai' | 'google-vision' | 'ebay',
  operation: string,
  details: {
    tokensUsed?: number;
    imageCount?: number;
    model?: string;
    responseTime: number;
    success: boolean;
    errorMessage?: string;
  }
) => {
  return enhancedCostTracker.trackUsage(userId, apiType, operation, details);
};

export const getCostAnalysis = (userId?: string) => {
  return enhancedCostTracker.getCostAnalysis(userId);
};

export const getUsageStatistics = (userId?: string, days: number = 7) => {
  return enhancedCostTracker.getUsageStatistics(userId, days);
};