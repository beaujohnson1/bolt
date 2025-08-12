/**
 * System Health Monitoring and Alerting
 * Provides real-time monitoring of system performance, health checks, and automated alerts
 */

interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: {
    warning: number;
    critical: number;
  };
  timestamp: Date;
}

interface SystemAlert {
  id: string;
  type: 'performance' | 'cost' | 'error' | 'capacity';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  actions: string[];
}

interface PerformanceMetrics {
  apiResponseTime: HealthMetric;
  errorRate: HealthMetric;
  throughput: HealthMetric;
  costPerHour: HealthMetric;
  cacheHitRate: HealthMetric;
  queueDepth: HealthMetric;
  memoryUsage: HealthMetric;
  activeConnections: HealthMetric;
}

class SystemMonitor {
  private metrics: Map<string, HealthMetric[]> = new Map();
  private alerts: SystemAlert[] = [];
  private readonly METRIC_RETENTION_HOURS = 24;
  private readonly ALERT_RETENTION_HOURS = 72;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeMetrics();
    this.startMonitoring();
  }

  /**
   * Initialize default metrics with thresholds
   */
  private initializeMetrics(): void {
    const defaultMetrics = [
      {
        name: 'apiResponseTime',
        unit: 'ms',
        thresholds: { warning: 10000, critical: 30000 } // 10s warning, 30s critical
      },
      {
        name: 'errorRate',
        unit: '%',
        thresholds: { warning: 5, critical: 15 } // 5% warning, 15% critical
      },
      {
        name: 'throughput',
        unit: 'requests/min',
        thresholds: { warning: 100, critical: 200 } // High throughput warning
      },
      {
        name: 'costPerHour',
        unit: 'USD',
        thresholds: { warning: 5, critical: 10 } // $5/hour warning
      },
      {
        name: 'cacheHitRate',
        unit: '%',
        thresholds: { warning: 60, critical: 40 } // Below 60% warning
      },
      {
        name: 'queueDepth',
        unit: 'items',
        thresholds: { warning: 100, critical: 500 } // Queue backup warning
      },
      {
        name: 'memoryUsage',
        unit: 'MB',
        thresholds: { warning: 200, critical: 400 } // Memory usage warning
      },
      {
        name: 'activeConnections',
        unit: 'connections',
        thresholds: { warning: 50, critical: 100 } // Connection limit warning
      }
    ];

    defaultMetrics.forEach(metric => {
      this.metrics.set(metric.name, []);
    });
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    console.log('📊 [MONITOR] Starting system monitoring...');
    
    // Run health checks every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.checkHealthThresholds();
      this.cleanupOldData();
    }, 30000);
  }

  /**
   * Record a metric value
   */
  recordMetric(
    name: string,
    value: number,
    unit: string = '',
    thresholds?: { warning: number; critical: number }
  ): void {
    const metric: HealthMetric = {
      name,
      value,
      unit,
      status: this.getHealthStatus(value, thresholds || this.getDefaultThresholds(name)),
      threshold: thresholds || this.getDefaultThresholds(name),
      timestamp: new Date()
    };

    const history = this.metrics.get(name) || [];
    history.push(metric);
    this.metrics.set(name, history);

    // Keep only recent metrics
    const cutoff = new Date(Date.now() - this.METRIC_RETENTION_HOURS * 60 * 60 * 1000);
    const filtered = history.filter(m => m.timestamp >= cutoff);
    this.metrics.set(name, filtered);

    // Check for alerts
    this.checkMetricAlert(metric);
  }

  /**
   * Get health status based on value and thresholds
   */
  private getHealthStatus(
    value: number,
    thresholds: { warning: number; critical: number }
  ): 'healthy' | 'warning' | 'critical' {
    if (value >= thresholds.critical) {
      return 'critical';
    } else if (value >= thresholds.warning) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Get default thresholds for a metric
   */
  private getDefaultThresholds(name: string): { warning: number; critical: number } {
    const defaults: Record<string, { warning: number; critical: number }> = {
      apiResponseTime: { warning: 10000, critical: 30000 },
      errorRate: { warning: 5, critical: 15 },
      throughput: { warning: 100, critical: 200 },
      costPerHour: { warning: 5, critical: 10 },
      cacheHitRate: { warning: 60, critical: 40 }, // Inverted - low is bad
      queueDepth: { warning: 100, critical: 500 },
      memoryUsage: { warning: 200, critical: 400 },
      activeConnections: { warning: 50, critical: 100 }
    };

    return defaults[name] || { warning: 100, critical: 200 };
  }

  /**
   * Collect current system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      // API Response Time (average of last 10 requests)
      const recentResponseTimes = this.getRecentMetricValues('apiResponseTime', 10);
      if (recentResponseTimes.length > 0) {
        const avgResponseTime = recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length;
        this.recordMetric('apiResponseTime', avgResponseTime, 'ms');
      }

      // Error Rate (last hour)
      const hourlyErrorRate = await this.calculateErrorRate(60);
      this.recordMetric('errorRate', hourlyErrorRate, '%');

      // Throughput (requests per minute)
      const throughput = await this.calculateThroughput(1);
      this.recordMetric('throughput', throughput, 'requests/min');

      // Cost per hour
      const hourlyCost = await this.calculateHourlyCost();
      this.recordMetric('costPerHour', hourlyCost, 'USD');

      // Cache hit rate
      const cacheHitRate = await this.calculateCacheHitRate();
      this.recordMetric('cacheHitRate', cacheHitRate, '%');

      // Simulated metrics (in production, these would come from actual system monitoring)
      this.recordMetric('queueDepth', Math.floor(Math.random() * 50), 'items');
      this.recordMetric('memoryUsage', 100 + Math.floor(Math.random() * 100), 'MB');
      this.recordMetric('activeConnections', Math.floor(Math.random() * 30), 'connections');

    } catch (error) {
      console.error('❌ [MONITOR] Error collecting metrics:', error);
      this.createAlert({
        type: 'error',
        severity: 'warning',
        title: 'Metric Collection Error',
        message: 'Failed to collect system metrics',
        details: { error: error.message }
      });
    }
  }

  /**
   * Calculate error rate for specified minutes
   */
  private async calculateErrorRate(minutes: number): Promise<number> {
    // In production, this would query your error logs/database
    // For now, return a simulated value
    return Math.random() * 3; // 0-3% error rate
  }

  /**
   * Calculate throughput for specified minutes
   */
  private async calculateThroughput(minutes: number): Promise<number> {
    // In production, this would query your request logs
    // For now, return a simulated value
    return 20 + Math.floor(Math.random() * 40); // 20-60 requests per minute
  }

  /**
   * Calculate current hourly cost
   */
  private async calculateHourlyCost(): Promise<number> {
    // In production, this would integrate with your cost tracking system
    // For now, return a simulated value based on time of day
    const hour = new Date().getHours();
    const baseCost = 1.5; // $1.50 base per hour
    const peakMultiplier = (hour >= 9 && hour <= 17) ? 1.5 : 1.0; // Peak hours cost more
    return baseCost * peakMultiplier * (1 + Math.random() * 0.5);
  }

  /**
   * Calculate cache hit rate
   */
  private async calculateCacheHitRate(): Promise<number> {
    // In production, this would come from your cache system
    // For now, return a simulated value
    return 70 + Math.random() * 25; // 70-95% hit rate
  }

  /**
   * Get recent metric values
   */
  private getRecentMetricValues(metricName: string, count: number): number[] {
    const history = this.metrics.get(metricName) || [];
    return history
      .slice(-count)
      .map(m => m.value);
  }

  /**
   * Check metric for alert conditions
   */
  private checkMetricAlert(metric: HealthMetric): void {
    if (metric.status === 'critical') {
      this.createAlert({
        type: 'performance',
        severity: 'critical',
        title: `Critical: ${metric.name}`,
        message: `${metric.name} is at critical level: ${metric.value}${metric.unit}`,
        details: {
          metric: metric.name,
          value: metric.value,
          unit: metric.unit,
          threshold: metric.threshold.critical,
          status: metric.status
        }
      });
    } else if (metric.status === 'warning') {
      this.createAlert({
        type: 'performance',
        severity: 'warning',
        title: `Warning: ${metric.name}`,
        message: `${metric.name} is above warning threshold: ${metric.value}${metric.unit}`,
        details: {
          metric: metric.name,
          value: metric.value,
          unit: metric.unit,
          threshold: metric.threshold.warning,
          status: metric.status
        }
      });
    }
  }

  /**
   * Check all health thresholds
   */
  private checkHealthThresholds(): void {
    for (const [metricName, history] of this.metrics.entries()) {
      if (history.length === 0) continue;

      const latest = history[history.length - 1];
      const recent = history.slice(-5); // Last 5 readings

      // Check for sustained issues
      const criticalCount = recent.filter(m => m.status === 'critical').length;
      const warningCount = recent.filter(m => m.status === 'warning').length;

      if (criticalCount >= 3) {
        this.createAlert({
          type: 'performance',
          severity: 'critical',
          title: `Sustained Critical Issue: ${metricName}`,
          message: `${metricName} has been critical for ${criticalCount} consecutive readings`,
          details: {
            metric: metricName,
            consecutiveCritical: criticalCount,
            values: recent.map(m => m.value)
          }
        });
      } else if (warningCount >= 4) {
        this.createAlert({
          type: 'performance',
          severity: 'warning',
          title: `Sustained Warning: ${metricName}`,
          message: `${metricName} has been in warning state for ${warningCount} consecutive readings`,
          details: {
            metric: metricName,
            consecutiveWarnings: warningCount,
            values: recent.map(m => m.value)
          }
        });
      }
    }
  }

  /**
   * Create system alert
   */
  private createAlert(alertData: {
    type: 'performance' | 'cost' | 'error' | 'capacity';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    details: Record<string, any>;
  }): void {
    const alert: SystemAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alertData,
      timestamp: new Date(),
      resolved: false,
      actions: this.generateSuggestedActions(alertData)
    };

    this.alerts.push(alert);

    // Log alert
    const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : '📘';
    console.log(`${emoji} [MONITOR] ${alert.severity.toUpperCase()} ALERT:`, {
      title: alert.title,
      message: alert.message,
      details: alert.details
    });

    // Keep only recent alerts
    const cutoff = new Date(Date.now() - this.ALERT_RETENTION_HOURS * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff);
  }

  /**
   * Generate suggested actions for alerts
   */
  private generateSuggestedActions(alertData: any): string[] {
    const actions: string[] = [];

    switch (alertData.type) {
      case 'performance':
        if (alertData.details?.metric === 'apiResponseTime') {
          actions.push('Check API endpoint health');
          actions.push('Review recent code deployments');
          actions.push('Monitor third-party service status');
          actions.push('Consider enabling caching');
        } else if (alertData.details?.metric === 'errorRate') {
          actions.push('Review error logs for patterns');
          actions.push('Check database connectivity');
          actions.push('Verify API key configurations');
          actions.push('Monitor resource availability');
        } else if (alertData.details?.metric === 'cacheHitRate') {
          actions.push('Review cache configuration');
          actions.push('Check cache expiry settings');
          actions.push('Analyze cache key patterns');
          actions.push('Consider cache warming strategies');
        }
        break;

      case 'cost':
        actions.push('Review recent API usage patterns');
        actions.push('Check for cost optimization opportunities');
        actions.push('Implement usage limits if necessary');
        actions.push('Consider upgrading to higher tier for better rates');
        break;

      case 'capacity':
        actions.push('Scale infrastructure resources');
        actions.push('Review resource utilization patterns');
        actions.push('Implement load balancing');
        actions.push('Consider queue management');
        break;

      case 'error':
        actions.push('Review system logs');
        actions.push('Check service dependencies');
        actions.push('Verify configuration settings');
        actions.push('Restart services if necessary');
        break;
    }

    return actions;
  }

  /**
   * Get current system health status
   */
  getSystemHealth(): {
    overallStatus: 'healthy' | 'warning' | 'critical';
    metrics: PerformanceMetrics;
    activeAlerts: SystemAlert[];
    summary: {
      totalMetrics: number;
      healthyMetrics: number;
      warningMetrics: number;
      criticalMetrics: number;
    };
  } {
    const currentMetrics: Partial<PerformanceMetrics> = {};
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    // Get latest metric for each type
    for (const [metricName, history] of this.metrics.entries()) {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        currentMetrics[metricName as keyof PerformanceMetrics] = latest;

        switch (latest.status) {
          case 'healthy': healthyCount++; break;
          case 'warning': warningCount++; break;
          case 'critical': criticalCount++; break;
        }
      }
    }

    // Determine overall status
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      overallStatus = 'critical';
    } else if (warningCount > 0) {
      overallStatus = 'warning';
    }

    // Get active alerts
    const activeAlerts = this.alerts.filter(a => !a.resolved);

    return {
      overallStatus,
      metrics: currentMetrics as PerformanceMetrics,
      activeAlerts,
      summary: {
        totalMetrics: healthyCount + warningCount + criticalCount,
        healthyMetrics: healthyCount,
        warningMetrics: warningCount,
        criticalMetrics: criticalCount
      }
    };
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log('✅ [MONITOR] Alert resolved:', alertId);
      return true;
    }
    return false;
  }

  /**
   * Get metric history
   */
  getMetricHistory(
    metricName: string,
    hours: number = 24
  ): HealthMetric[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const history = this.metrics.get(metricName) || [];
    return history.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const metricCutoff = new Date(Date.now() - this.METRIC_RETENTION_HOURS * 60 * 60 * 1000);
    const alertCutoff = new Date(Date.now() - this.ALERT_RETENTION_HOURS * 60 * 60 * 1000);

    // Clean old metrics
    for (const [metricName, history] of this.metrics.entries()) {
      const filtered = history.filter(m => m.timestamp >= metricCutoff);
      this.metrics.set(metricName, filtered);
    }

    // Clean old alerts
    const activeAlerts = this.alerts.filter(a => a.timestamp >= alertCutoff);
    this.alerts = activeAlerts;
  }

  /**
   * Export monitoring data
   */
  exportMonitoringData(): string {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: Object.fromEntries(this.metrics.entries()),
      alerts: this.alerts,
      systemHealth: this.getSystemHealth()
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('📊 [MONITOR] System monitoring stopped');
    }
  }
}

// Singleton instance
export const systemMonitor = new SystemMonitor();

// Helper functions
export const recordMetric = (
  name: string,
  value: number,
  unit: string = '',
  thresholds?: { warning: number; critical: number }
) => {
  return systemMonitor.recordMetric(name, value, unit, thresholds);
};

export const getSystemHealth = () => {
  return systemMonitor.getSystemHealth();
};

export const resolveAlert = (alertId: string) => {
  return systemMonitor.resolveAlert(alertId);
};

export const getMetricHistory = (metricName: string, hours: number = 24) => {
  return systemMonitor.getMetricHistory(metricName, hours);
};