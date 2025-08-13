import { getSupabase } from '../lib/supabase';

interface BenchmarkTarget {
  id: string;
  name: string;
  description: string;
  metric: string;
  targetValue: number;
  minimumValue: number;
  excellenceValue: number;
  unit: string;
  category: 'accuracy' | 'performance' | 'cost' | 'quality';
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly';
  createdAt: Date;
}

interface BenchmarkScore {
  targetId: string;
  currentValue: number;
  targetValue: number;
  score: number; // 0-100
  status: 'failing' | 'below_target' | 'meeting_target' | 'exceeding_target' | 'excellent';
  gap: number;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

interface BenchmarkReport {
  overallScore: number;
  categoryScores: Record<string, number>;
  targetScores: BenchmarkScore[];
  summary: {
    totalTargets: number;
    targetsMet: number;
    targetsExceeded: number;
    criticalIssues: number;
  };
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    target: string;
    action: string;
    expectedImpact: string;
  }[];
  trendAnalysis: {
    overallTrend: 'improving' | 'stable' | 'declining';
    improvingTargets: string[];
    decliningTargets: string[];
    weeklyChange: number;
  };
}

export class AccuracyBenchmarkingSystem {
  private supabase;
  private benchmarkTargets: BenchmarkTarget[] = [];
  private currentScores: BenchmarkScore[] = [];
  
  // Industry-standard benchmark targets for AI clothing analysis
  private static readonly DEFAULT_TARGETS: Omit<BenchmarkTarget, 'id' | 'createdAt'>[] = [
    {
      name: 'Overall AI Accuracy',
      description: 'Overall accuracy across all AI predictions',
      metric: 'overall_accuracy',
      targetValue: 0.85,
      minimumValue: 0.70,
      excellenceValue: 0.92,
      unit: '%',
      category: 'accuracy',
      priority: 'critical',
      enabled: true,
      timeframe: 'daily'
    },
    {
      name: 'Brand Detection Accuracy',
      description: 'Accuracy of brand identification from clothing tags and logos',
      metric: 'brand_accuracy',
      targetValue: 0.80,
      minimumValue: 0.65,
      excellenceValue: 0.90,
      unit: '%',
      category: 'accuracy',
      priority: 'high',
      enabled: true,
      timeframe: 'daily'
    },
    {
      name: 'Size Detection Accuracy',
      description: 'Accuracy of size extraction from clothing labels',
      metric: 'size_accuracy',
      targetValue: 0.75,
      minimumValue: 0.60,
      excellenceValue: 0.85,
      unit: '%',
      category: 'accuracy',
      priority: 'high',
      enabled: true,
      timeframe: 'daily'
    },
    {
      name: 'Color Identification Accuracy',
      description: 'Accuracy of color detection and description',
      metric: 'color_accuracy',
      targetValue: 0.82,
      minimumValue: 0.70,
      excellenceValue: 0.90,
      unit: '%',
      category: 'accuracy',
      priority: 'medium',
      enabled: true,
      timeframe: 'daily'
    },
    {
      name: 'Title Generation Quality',
      description: 'Quality and eBay compliance of generated titles',
      metric: 'title_accuracy',
      targetValue: 0.88,
      minimumValue: 0.75,
      excellenceValue: 0.94,
      unit: '%',
      category: 'quality',
      priority: 'high',
      enabled: true,
      timeframe: 'daily'
    },
    {
      name: 'Processing Speed',
      description: 'Average time to process and analyze each image',
      metric: 'avg_processing_time',
      targetValue: 3000,
      minimumValue: 5000,
      excellenceValue: 2000,
      unit: 'ms',
      category: 'performance',
      priority: 'medium',
      enabled: true,
      timeframe: 'hourly'
    },
    {
      name: 'Cost Efficiency',
      description: 'Cost per accurate prediction (accuracy/cost ratio)',
      metric: 'cost_efficiency',
      targetValue: 0.15,
      minimumValue: 0.08,
      excellenceValue: 0.25,
      unit: 'accuracy/$',
      category: 'cost',
      priority: 'medium',
      enabled: true,
      timeframe: 'daily'
    },
    {
      name: 'OCR Text Quality',
      description: 'Quality and completeness of OCR text extraction',
      metric: 'ocr_text_quality',
      targetValue: 0.85,
      minimumValue: 0.70,
      excellenceValue: 0.92,
      unit: '%',
      category: 'quality',
      priority: 'medium',
      enabled: true,
      timeframe: 'daily'
    },
    {
      name: 'User Satisfaction Score',
      description: 'User acceptance rate of AI-generated listings',
      metric: 'user_acceptance_rate',
      targetValue: 0.90,
      minimumValue: 0.80,
      excellenceValue: 0.95,
      unit: '%',
      category: 'quality',
      priority: 'high',
      enabled: true,
      timeframe: 'weekly'
    },
    {
      name: 'API Error Rate',
      description: 'Percentage of failed API calls and processing errors',
      metric: 'error_rate',
      targetValue: 0.02,
      minimumValue: 0.05,
      excellenceValue: 0.01,
      unit: '%',
      category: 'performance',
      priority: 'high',
      enabled: true,
      timeframe: 'hourly'
    }
  ];

  constructor() {
    this.supabase = getSupabase();
    this.initializeDefaultTargets();
  }

  /**
   * Initialize default benchmark targets
   */
  private initializeDefaultTargets(): void {
    this.benchmarkTargets = AccuracyBenchmarkingSystem.DEFAULT_TARGETS.map((target, index) => ({
      id: `target_${index}_${Date.now()}`,
      createdAt: new Date(),
      ...target
    }));

    console.log('📊 [BENCHMARKING] Initialized with', this.benchmarkTargets.length, 'default targets');
  }

  /**
   * Load benchmark targets from database
   */
  async loadBenchmarkTargets(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data: targets, error } = await this.supabase
        .from('benchmark_targets')
        .select('*')
        .eq('enabled', true)
        .order('priority', { ascending: false });

      if (error) {
        console.warn('⚠️ [BENCHMARKING] Could not load targets from database:', error);
        return;
      }

      if (targets && targets.length > 0) {
        // Merge with default targets, prioritizing database targets
        const dbTargets = targets.map(t => ({
          ...t,
          createdAt: new Date(t.created_at)
        }));
        
        this.benchmarkTargets = [
          ...dbTargets,
          ...this.benchmarkTargets.filter(dt => 
            !dbTargets.some(dbt => dbt.metric === dt.metric)
          )
        ];

        console.log(`📥 [BENCHMARKING] Loaded ${targets.length} custom targets from database`);
      }

    } catch (error) {
      console.error('❌ [BENCHMARKING] Error loading benchmark targets:', error);
    }
  }

  /**
   * Calculate current benchmark scores
   */
  async calculateBenchmarkScores(): Promise<BenchmarkScore[]> {
    console.log('📊 [BENCHMARKING] Calculating benchmark scores...');

    const scores: BenchmarkScore[] = [];

    for (const target of this.benchmarkTargets.filter(t => t.enabled)) {
      try {
        const currentValue = await this.getCurrentMetricValue(target.metric, target.timeframe);
        if (currentValue === null) {
          console.warn(`⚠️ [BENCHMARKING] No data available for metric: ${target.metric}`);
          continue;
        }

        const score = this.calculateScore(currentValue, target);
        const status = this.determineStatus(currentValue, target);
        const gap = this.calculateGap(currentValue, target);
        const trend = await this.calculateTrend(target.metric, target.timeframe);

        scores.push({
          targetId: target.id,
          currentValue,
          targetValue: target.targetValue,
          score,
          status,
          gap,
          trend,
          lastUpdated: new Date()
        });

      } catch (error) {
        console.error(`❌ [BENCHMARKING] Error calculating score for ${target.name}:`, error);
      }
    }

    this.currentScores = scores;
    await this.storeBenchmarkScores(scores);

    console.log(`✅ [BENCHMARKING] Calculated ${scores.length} benchmark scores`);
    return scores;
  }

  /**
   * Get current value for a specific metric
   */
  private async getCurrentMetricValue(metric: string, timeframe: string): Promise<number | null> {
    if (!this.supabase) return null;

    try {
      const timeWindowHours = this.getTimeWindowHours(timeframe);
      const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

      // Get recent predictions based on metric type
      let query = this.supabase
        .from('ai_predictions')
        .select(this.getSelectFields(metric))
        .gte('created_at', cutoffTime.toISOString());

      // Add filters based on metric requirements
      if (metric.includes('accuracy')) {
        query = query.not(metric, 'is', null);
      }

      const { data: predictions, error } = await query;

      if (error || !predictions || predictions.length === 0) {
        return null;
      }

      return this.aggregateMetricValue(metric, predictions);

    } catch (error) {
      console.error(`❌ [BENCHMARKING] Error getting metric value for ${metric}:`, error);
      return null;
    }
  }

  /**
   * Get time window in hours for timeframe
   */
  private getTimeWindowHours(timeframe: string): number {
    switch (timeframe) {
      case 'hourly': return 1;
      case 'daily': return 24;
      case 'weekly': return 168;
      case 'monthly': return 720;
      default: return 24;
    }
  }

  /**
   * Get select fields for SQL query based on metric
   */
  private getSelectFields(metric: string): string {
    const baseFields = 'id, created_at, total_cost_cents, analysis_duration_ms';
    
    switch (metric) {
      case 'overall_accuracy':
        return `${baseFields}, overall_accuracy`;
      case 'brand_accuracy':
        return `${baseFields}, brand_accuracy`;
      case 'size_accuracy':
        return `${baseFields}, size_accuracy`;
      case 'color_accuracy':
        return `${baseFields}, color_accuracy`;
      case 'title_accuracy':
        return `${baseFields}, title_accuracy`;
      case 'condition_accuracy':
        return `${baseFields}, condition_accuracy`;
      case 'category_accuracy':
        return `${baseFields}, category_accuracy`;
      default:
        return `${baseFields}, overall_accuracy`;
    }
  }

  /**
   * Aggregate metric value from predictions
   */
  private aggregateMetricValue(metric: string, predictions: any[]): number {
    switch (metric) {
      case 'avg_processing_time':
        return predictions.reduce((sum, p) => sum + (p.analysis_duration_ms || 0), 0) / predictions.length;
      
      case 'cost_efficiency':
        const totalCost = predictions.reduce((sum, p) => sum + (p.total_cost_cents || 0), 0) / 100; // Convert to dollars
        const avgAccuracy = predictions.reduce((sum, p) => sum + (p.overall_accuracy || 0), 0) / predictions.length;
        return totalCost > 0 ? avgAccuracy / totalCost : 0;
      
      case 'error_rate':
        const errorCount = predictions.filter(p => p.overall_accuracy < 0.3).length;
        return errorCount / predictions.length;
      
      case 'user_acceptance_rate':
        // This would need to be calculated from user feedback data
        // For now, estimate based on accuracy
        const highAccuracyCount = predictions.filter(p => (p.overall_accuracy || 0) > 0.8).length;
        return highAccuracyCount / predictions.length;
      
      case 'ocr_text_quality':
        // Estimate based on predictions with good OCR extraction
        // This would be improved with actual OCR quality metrics
        return predictions.reduce((sum, p) => sum + (p.overall_accuracy || 0), 0) / predictions.length;
      
      default:
        // For accuracy metrics, calculate average
        const field = metric;
        const validValues = predictions
          .map(p => p[field])
          .filter(v => v !== null && v !== undefined && !isNaN(v));
        
        return validValues.length > 0 
          ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length 
          : 0;
    }
  }

  /**
   * Calculate benchmark score (0-100)
   */
  private calculateScore(currentValue: number, target: BenchmarkTarget): number {
    let score: number;

    if (target.metric === 'avg_processing_time' || target.metric === 'error_rate') {
      // Lower is better for these metrics
      if (currentValue <= target.excellenceValue) {
        score = 100;
      } else if (currentValue <= target.targetValue) {
        score = 80 + (20 * (target.targetValue - currentValue) / (target.targetValue - target.excellenceValue));
      } else if (currentValue <= target.minimumValue) {
        score = 60 + (20 * (target.minimumValue - currentValue) / (target.minimumValue - target.targetValue));
      } else {
        score = Math.max(0, 60 * (1 - (currentValue - target.minimumValue) / target.minimumValue));
      }
    } else {
      // Higher is better for these metrics
      if (currentValue >= target.excellenceValue) {
        score = 100;
      } else if (currentValue >= target.targetValue) {
        score = 80 + (20 * (currentValue - target.targetValue) / (target.excellenceValue - target.targetValue));
      } else if (currentValue >= target.minimumValue) {
        score = 60 + (20 * (currentValue - target.minimumValue) / (target.targetValue - target.minimumValue));
      } else {
        score = Math.max(0, 60 * currentValue / target.minimumValue);
      }
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Determine status based on current value and target
   */
  private determineStatus(currentValue: number, target: BenchmarkTarget): BenchmarkScore['status'] {
    if (target.metric === 'avg_processing_time' || target.metric === 'error_rate') {
      // Lower is better
      if (currentValue <= target.excellenceValue) return 'excellent';
      if (currentValue <= target.targetValue) return 'exceeding_target';
      if (currentValue <= target.minimumValue) return 'meeting_target';
      if (currentValue <= target.minimumValue * 1.5) return 'below_target';
      return 'failing';
    } else {
      // Higher is better
      if (currentValue >= target.excellenceValue) return 'excellent';
      if (currentValue >= target.targetValue) return 'exceeding_target';
      if (currentValue >= target.minimumValue) return 'meeting_target';
      if (currentValue >= target.minimumValue * 0.8) return 'below_target';
      return 'failing';
    }
  }

  /**
   * Calculate gap to target
   */
  private calculateGap(currentValue: number, target: BenchmarkTarget): number {
    if (target.metric === 'avg_processing_time' || target.metric === 'error_rate') {
      // Lower is better - gap is how much over target
      return Math.max(0, currentValue - target.targetValue);
    } else {
      // Higher is better - gap is how much under target
      return Math.max(0, target.targetValue - currentValue);
    }
  }

  /**
   * Calculate trend for metric
   */
  private async calculateTrend(metric: string, timeframe: string): Promise<BenchmarkScore['trend']> {
    if (!this.supabase) return 'stable';

    try {
      const windowHours = this.getTimeWindowHours(timeframe);
      const currentWindow = new Date(Date.now() - windowHours * 60 * 60 * 1000);
      const previousWindow = new Date(Date.now() - 2 * windowHours * 60 * 60 * 1000);

      // Get current period data
      const { data: currentData } = await this.supabase
        .from('ai_predictions')
        .select(this.getSelectFields(metric))
        .gte('created_at', currentWindow.toISOString());

      // Get previous period data
      const { data: previousData } = await this.supabase
        .from('ai_predictions')
        .select(this.getSelectFields(metric))
        .gte('created_at', previousWindow.toISOString())
        .lt('created_at', currentWindow.toISOString());

      if (!currentData || !previousData || currentData.length === 0 || previousData.length === 0) {
        return 'stable';
      }

      const currentValue = this.aggregateMetricValue(metric, currentData);
      const previousValue = this.aggregateMetricValue(metric, previousData);

      const changeThreshold = 0.05; // 5% change threshold
      const percentChange = Math.abs(currentValue - previousValue) / Math.max(previousValue, 0.001);

      if (percentChange < changeThreshold) {
        return 'stable';
      }

      // For metrics where lower is better
      if (metric === 'avg_processing_time' || metric === 'error_rate') {
        return currentValue < previousValue ? 'improving' : 'declining';
      } else {
        return currentValue > previousValue ? 'improving' : 'declining';
      }

    } catch (error) {
      console.error(`❌ [BENCHMARKING] Error calculating trend for ${metric}:`, error);
      return 'stable';
    }
  }

  /**
   * Generate comprehensive benchmark report
   */
  async generateBenchmarkReport(): Promise<BenchmarkReport> {
    console.log('📋 [BENCHMARKING] Generating comprehensive benchmark report...');

    const scores = await this.calculateBenchmarkScores();
    
    // Calculate overall score (weighted by priority)
    const overallScore = this.calculateOverallScore(scores);
    
    // Calculate category scores
    const categoryScores = this.calculateCategoryScores(scores);
    
    // Generate summary statistics
    const summary = this.generateSummary(scores);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(scores);
    
    // Generate trend analysis
    const trendAnalysis = await this.generateTrendAnalysis(scores);

    const report: BenchmarkReport = {
      overallScore,
      categoryScores,
      targetScores: scores,
      summary,
      recommendations,
      trendAnalysis
    };

    // Store report in database
    await this.storeBenchmarkReport(report);

    console.log('✅ [BENCHMARKING] Benchmark report generated:', {
      overallScore,
      targetsMet: summary.targetsMet,
      criticalIssues: summary.criticalIssues
    });

    return report;
  }

  /**
   * Calculate overall weighted score
   */
  private calculateOverallScore(scores: BenchmarkScore[]): number {
    if (scores.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    scores.forEach(score => {
      const target = this.benchmarkTargets.find(t => t.id === score.targetId);
      if (target) {
        const weight = this.getPriorityWeight(target.priority);
        totalWeightedScore += score.score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
  }

  /**
   * Get priority weight for scoring
   */
  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  /**
   * Calculate category scores
   */
  private calculateCategoryScores(scores: BenchmarkScore[]): Record<string, number> {
    const categoryScores: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    scores.forEach(score => {
      const target = this.benchmarkTargets.find(t => t.id === score.targetId);
      if (target) {
        if (!categoryScores[target.category]) {
          categoryScores[target.category] = 0;
          categoryCounts[target.category] = 0;
        }
        categoryScores[target.category] += score.score;
        categoryCounts[target.category]++;
      }
    });

    // Calculate averages
    Object.keys(categoryScores).forEach(category => {
      categoryScores[category] = Math.round(categoryScores[category] / categoryCounts[category]);
    });

    return categoryScores;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(scores: BenchmarkScore[]): BenchmarkReport['summary'] {
    const totalTargets = scores.length;
    const targetsMet = scores.filter(s => s.status === 'meeting_target' || s.status === 'exceeding_target' || s.status === 'excellent').length;
    const targetsExceeded = scores.filter(s => s.status === 'exceeding_target' || s.status === 'excellent').length;
    
    // Critical issues are failing targets with critical or high priority
    const criticalIssues = scores.filter(s => {
      const target = this.benchmarkTargets.find(t => t.id === s.targetId);
      return s.status === 'failing' && target && (target.priority === 'critical' || target.priority === 'high');
    }).length;

    return {
      totalTargets,
      targetsMet,
      targetsExceeded,
      criticalIssues
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(scores: BenchmarkScore[]): BenchmarkReport['recommendations'] {
    const recommendations: BenchmarkReport['recommendations'] = [];

    // Sort scores by priority and status to address most critical issues first
    const prioritizedScores = scores
      .map(score => ({
        score,
        target: this.benchmarkTargets.find(t => t.id === score.targetId)!
      }))
      .filter(item => item.target)
      .sort((a, b) => {
        // Sort by failing status first, then by priority
        if (a.score.status === 'failing' && b.score.status !== 'failing') return -1;
        if (b.score.status === 'failing' && a.score.status !== 'failing') return 1;
        return this.getPriorityWeight(b.target.priority) - this.getPriorityWeight(a.target.priority);
      });

    // Generate recommendations for top issues
    prioritizedScores.slice(0, 8).forEach(({ score, target }) => {
      const recommendation = this.getRecommendationForTarget(target, score);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });

    return recommendations;
  }

  /**
   * Get specific recommendation for a target
   */
  private getRecommendationForTarget(target: BenchmarkTarget, score: BenchmarkScore): BenchmarkReport['recommendations'][0] | null {
    const priority = score.status === 'failing' ? 'high' : score.status === 'below_target' ? 'medium' : 'low';
    
    const recommendations: Record<string, any> = {
      'overall_accuracy': {
        action: 'Implement enhanced OCR processing and improve prompt engineering',
        expectedImpact: 'Increase overall accuracy by 10-15%'
      },
      'brand_accuracy': {
        action: 'Deploy enhanced brand detection with expanded brand database',
        expectedImpact: 'Improve brand detection by 20-25%'
      },
      'size_accuracy': {
        action: 'Activate enhanced size processor with standardization',
        expectedImpact: 'Boost size detection accuracy by 15-20%'
      },
      'title_accuracy': {
        action: 'Enable enhanced title optimizer with eBay compliance',
        expectedImpact: 'Improve title quality scores by 10-12%'
      },
      'avg_processing_time': {
        action: 'Optimize image processing pipeline and enable caching',
        expectedImpact: 'Reduce processing time by 30-40%'
      },
      'cost_efficiency': {
        action: 'Implement cost optimization strategies and batch processing',
        expectedImpact: 'Improve cost efficiency by 25-35%'
      },
      'error_rate': {
        action: 'Enhance error handling and implement retry mechanisms',
        expectedImpact: 'Reduce error rate by 50-60%'
      }
    };

    const rec = recommendations[target.metric];
    if (!rec) return null;

    return {
      priority,
      target: target.name,
      action: rec.action,
      expectedImpact: rec.expectedImpact
    };
  }

  /**
   * Generate trend analysis
   */
  private async generateTrendAnalysis(scores: BenchmarkScore[]): Promise<BenchmarkReport['trendAnalysis']> {
    const improvingTargets = scores
      .filter(s => s.trend === 'improving')
      .map(s => this.benchmarkTargets.find(t => t.id === s.targetId)?.name)
      .filter(Boolean) as string[];

    const decliningTargets = scores
      .filter(s => s.trend === 'declining')
      .map(s => this.benchmarkTargets.find(t => t.id === s.targetId)?.name)
      .filter(Boolean) as string[];

    // Calculate overall trend based on weighted scores
    const improvingCount = improvingTargets.length;
    const decliningCount = decliningTargets.length;
    const stableCount = scores.length - improvingCount - decliningCount;

    let overallTrend: BenchmarkReport['trendAnalysis']['overallTrend'];
    if (improvingCount > decliningCount * 1.5) {
      overallTrend = 'improving';
    } else if (decliningCount > improvingCount * 1.5) {
      overallTrend = 'declining';
    } else {
      overallTrend = 'stable';
    }

    // Calculate weekly change (simplified - would be more sophisticated in production)
    const weeklyChange = (improvingCount - decliningCount) / Math.max(scores.length, 1) * 100;

    return {
      overallTrend,
      improvingTargets,
      decliningTargets,
      weeklyChange: Math.round(weeklyChange * 10) / 10
    };
  }

  /**
   * Store benchmark scores in database
   */
  private async storeBenchmarkScores(scores: BenchmarkScore[]): Promise<void> {
    if (!this.supabase) return;

    try {
      const records = scores.map(score => ({
        target_id: score.targetId,
        current_value: score.currentValue,
        target_value: score.targetValue,
        score: score.score,
        status: score.status,
        gap: score.gap,
        trend: score.trend,
        last_updated: score.lastUpdated.toISOString()
      }));

      const { error } = await this.supabase
        .from('benchmark_scores')
        .upsert(records, { onConflict: 'target_id' });

      if (error) {
        console.error('❌ [BENCHMARKING] Error storing benchmark scores:', error);
      }

    } catch (error) {
      console.error('❌ [BENCHMARKING] Error storing benchmark scores:', error);
    }
  }

  /**
   * Store benchmark report in database
   */
  private async storeBenchmarkReport(report: BenchmarkReport): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('benchmark_reports')
        .insert({
          overall_score: report.overallScore,
          category_scores: report.categoryScores,
          summary: report.summary,
          recommendations: report.recommendations,
          trend_analysis: report.trendAnalysis,
          generated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ [BENCHMARKING] Error storing benchmark report:', error);
      }

    } catch (error) {
      console.error('❌ [BENCHMARKING] Error storing benchmark report:', error);
    }
  }

  /**
   * Get latest benchmark report
   */
  async getLatestBenchmarkReport(): Promise<BenchmarkReport | null> {
    const scores = this.currentScores.length > 0 ? this.currentScores : await this.calculateBenchmarkScores();
    
    if (scores.length === 0) {
      return null;
    }

    return await this.generateBenchmarkReport();
  }

  /**
   * Add custom benchmark target
   */
  addCustomTarget(target: Omit<BenchmarkTarget, 'id' | 'createdAt'>): string {
    const newTarget: BenchmarkTarget = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      ...target
    };

    this.benchmarkTargets.push(newTarget);
    console.log('➕ [BENCHMARKING] Added custom target:', newTarget.name);

    return newTarget.id;
  }

  /**
   * Update benchmark target
   */
  updateTarget(targetId: string, updates: Partial<BenchmarkTarget>): boolean {
    const targetIndex = this.benchmarkTargets.findIndex(t => t.id === targetId);
    if (targetIndex === -1) return false;

    this.benchmarkTargets[targetIndex] = {
      ...this.benchmarkTargets[targetIndex],
      ...updates
    };

    console.log('✏️ [BENCHMARKING] Updated target:', targetId);
    return true;
  }

  /**
   * Get all benchmark targets
   */
  getBenchmarkTargets(): BenchmarkTarget[] {
    return [...this.benchmarkTargets];
  }

  /**
   * Get current scores
   */
  getCurrentScores(): BenchmarkScore[] {
    return [...this.currentScores];
  }

  /**
   * Get targets by category
   */
  getTargetsByCategory(category: string): BenchmarkTarget[] {
    return this.benchmarkTargets.filter(t => t.category === category && t.enabled);
  }

  /**
   * Get critical failing targets
   */
  getCriticalFailingTargets(): Array<{ target: BenchmarkTarget; score: BenchmarkScore }> {
    return this.currentScores
      .filter(score => score.status === 'failing')
      .map(score => ({
        score,
        target: this.benchmarkTargets.find(t => t.id === score.targetId)!
      }))
      .filter(item => item.target && (item.target.priority === 'critical' || item.target.priority === 'high'))
      .sort((a, b) => this.getPriorityWeight(b.target.priority) - this.getPriorityWeight(a.target.priority));
  }
}

// Export singleton instance
export const accuracyBenchmarkingSystem = new AccuracyBenchmarkingSystem();