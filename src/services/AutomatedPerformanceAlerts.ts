import { getSupabase } from '../lib/supabase';
import { realTimeAccuracyMonitor } from './RealTimeAccuracyMonitor';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  timeWindow: number; // minutes
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // minutes between alerts
  actions: AlertAction[];
  conditions: AlertCondition[];
}

interface AlertAction {
  type: 'email' | 'webhook' | 'log' | 'database' | 'auto_fix';
  config: Record<string, any>;
  enabled: boolean;
}

interface AlertCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains';
  value: any;
  required: boolean;
}

interface AlertNotification {
  id: string;
  ruleId: string;
  ruleName: string;
  priority: AlertRule['priority'];
  metric: string;
  currentValue: number;
  thresholdValue: number;
  message: string;
  details: Record<string, any>;
  triggeredAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
  actions: {
    type: string;
    executed: boolean;
    executedAt?: Date;
    result?: any;
    error?: string;
  }[];
}

export class AutomatedPerformanceAlerts {
  private supabase;
  private alertRules: AlertRule[] = [];
  private activeNotifications: AlertNotification[] = [];
  private monitoringActive = false;
  private checkInterval: NodeJS.Timer | null = null;

  // Pre-defined alert rules for common AI performance issues
  private static readonly PREDEFINED_RULES: Omit<AlertRule, 'id'>[] = [
    {
      name: 'Critical Accuracy Drop',
      description: 'Overall AI accuracy has dropped below critical threshold',
      metric: 'overall_accuracy',
      threshold: 0.6,
      operator: 'lt',
      timeWindow: 30,
      enabled: true,
      priority: 'critical',
      cooldown: 15,
      actions: [
        {
          type: 'email',
          config: { recipients: ['admin@company.com'], subject: 'CRITICAL: AI Accuracy Alert' },
          enabled: true
        },
        {
          type: 'webhook',
          config: { url: '/api/alerts/critical', method: 'POST' },
          enabled: true
        },
        {
          type: 'auto_fix',
          config: { action: 'switch_to_backup_model' },
          enabled: false
        }
      ],
      conditions: []
    },
    {
      name: 'Brand Detection Failure',
      description: 'Brand detection accuracy has fallen below acceptable levels',
      metric: 'brand_accuracy',
      threshold: 0.5,
      operator: 'lt',
      timeWindow: 60,
      enabled: true,
      priority: 'high',
      cooldown: 30,
      actions: [
        {
          type: 'email',
          config: { recipients: ['tech@company.com'], subject: 'Brand Detection Alert' },
          enabled: true
        },
        {
          type: 'log',
          config: { level: 'warn', category: 'brand_detection' },
          enabled: true
        }
      ],
      conditions: []
    },
    {
      name: 'Size Detection Issues',
      description: 'Size detection accuracy needs attention',
      metric: 'size_accuracy',
      threshold: 0.4,
      operator: 'lt',
      timeWindow: 60,
      enabled: true,
      priority: 'high',
      cooldown: 30,
      actions: [
        {
          type: 'email',
          config: { recipients: ['tech@company.com'], subject: 'Size Detection Alert' },
          enabled: true
        },
        {
          type: 'database',
          config: { table: 'performance_issues', severity: 'high' },
          enabled: true
        }
      ],
      conditions: []
    },
    {
      name: 'High API Costs',
      description: 'AI processing costs are exceeding budget thresholds',
      metric: 'cost_per_prediction',
      threshold: 0.10,
      operator: 'gt',
      timeWindow: 120,
      enabled: true,
      priority: 'medium',
      cooldown: 60,
      actions: [
        {
          type: 'email',
          config: { recipients: ['finance@company.com'], subject: 'AI Cost Alert' },
          enabled: true
        },
        {
          type: 'auto_fix',
          config: { action: 'enable_cost_optimization' },
          enabled: true
        }
      ],
      conditions: []
    },
    {
      name: 'Low Processing Volume',
      description: 'AI processing volume is unusually low, possible system issue',
      metric: 'predictions_per_hour',
      threshold: 5,
      operator: 'lt',
      timeWindow: 60,
      enabled: true,
      priority: 'medium',
      cooldown: 45,
      actions: [
        {
          type: 'webhook',
          config: { url: '/api/system/health-check', method: 'GET' },
          enabled: true
        },
        {
          type: 'log',
          config: { level: 'warn', category: 'system_health' },
          enabled: true
        }
      ],
      conditions: []
    },
    {
      name: 'Model Response Time Degradation',
      description: 'AI model response times are slower than expected',
      metric: 'avg_response_time_ms',
      threshold: 5000,
      operator: 'gt',
      timeWindow: 30,
      enabled: true,
      priority: 'medium',
      cooldown: 20,
      actions: [
        {
          type: 'log',
          config: { level: 'warn', category: 'performance' },
          enabled: true
        },
        {
          type: 'auto_fix',
          config: { action: 'clear_model_cache' },
          enabled: false
        }
      ],
      conditions: []
    },
    {
      name: 'Title Generation Quality Drop',
      description: 'eBay title generation quality has decreased',
      metric: 'title_accuracy',
      threshold: 0.75,
      operator: 'lt',
      timeWindow: 90,
      enabled: true,
      priority: 'medium',
      cooldown: 45,
      actions: [
        {
          type: 'email',
          config: { recipients: ['product@company.com'], subject: 'Title Quality Alert' },
          enabled: true
        },
        {
          type: 'database',
          config: { table: 'quality_issues', category: 'title_generation' },
          enabled: true
        }
      ],
      conditions: []
    }
  ];

  constructor() {
    this.supabase = getSupabase();
    this.initializePredefinedRules();
  }

  /**
   * Initialize predefined alert rules
   */
  private initializePredefinedRules(): void {
    this.alertRules = AutomatedPerformanceAlerts.PREDEFINED_RULES.map((rule, index) => ({
      id: `rule_${index}_${Date.now()}`,
      ...rule
    }));

    console.log('⚙️ [AUTOMATED-ALERTS] Initialized with', this.alertRules.length, 'predefined rules');
  }

  /**
   * Start automated alert monitoring
   */
  async startMonitoring(checkIntervalMinutes: number = 2): Promise<void> {
    if (this.monitoringActive) {
      console.log('⚠️ [AUTOMATED-ALERTS] Monitoring already active');
      return;
    }

    console.log('🚀 [AUTOMATED-ALERTS] Starting automated performance alert monitoring...');

    // Load rules from database if available
    await this.loadRulesFromDatabase();

    // Start monitoring loop
    this.monitoringActive = true;
    this.checkInterval = setInterval(() => {
      this.performAlertCheck();
    }, checkIntervalMinutes * 60 * 1000);

    // Initial check
    await this.performAlertCheck();

    console.log(`✅ [AUTOMATED-ALERTS] Monitoring started with ${checkIntervalMinutes}-minute intervals`);
  }

  /**
   * Stop automated alert monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.monitoringActive = false;
    console.log('⏹️ [AUTOMATED-ALERTS] Monitoring stopped');
  }

  /**
   * Perform alert check cycle
   */
  private async performAlertCheck(): Promise<void> {
    try {
      console.log('🔄 [AUTOMATED-ALERTS] Performing alert check...');

      // Get current metrics
      const metrics = await this.getCurrentMetrics();
      if (!metrics) {
        console.warn('⚠️ [AUTOMATED-ALERTS] No metrics available for alert check');
        return;
      }

      // Check each enabled rule
      for (const rule of this.alertRules.filter(r => r.enabled)) {
        await this.checkRule(rule, metrics);
      }

      // Clean up old notifications
      this.cleanupOldNotifications();

      console.log('✅ [AUTOMATED-ALERTS] Alert check completed');

    } catch (error) {
      console.error('❌ [AUTOMATED-ALERTS] Error during alert check:', error);
    }
  }

  /**
   * Check a specific alert rule
   */
  private async checkRule(rule: AlertRule, metrics: Record<string, any>): Promise<void> {
    try {
      // Check if rule is in cooldown
      if (this.isInCooldown(rule)) {
        return;
      }

      // Check conditions
      if (!this.evaluateConditions(rule.conditions, metrics)) {
        return;
      }

      // Get metric value
      const currentValue = this.getMetricValue(rule.metric, metrics);
      if (currentValue === null || currentValue === undefined) {
        console.warn(`⚠️ [AUTOMATED-ALERTS] Metric ${rule.metric} not found in current metrics`);
        return;
      }

      // Evaluate threshold
      const thresholdMet = this.evaluateThreshold(currentValue, rule.threshold, rule.operator);
      
      if (thresholdMet) {
        await this.triggerAlert(rule, currentValue, metrics);
      }

    } catch (error) {
      console.error(`❌ [AUTOMATED-ALERTS] Error checking rule ${rule.name}:`, error);
    }
  }

  /**
   * Check if rule is in cooldown period
   */
  private isInCooldown(rule: AlertRule): boolean {
    const recentNotification = this.activeNotifications
      .filter(n => n.ruleId === rule.id && !n.resolved)
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())[0];

    if (!recentNotification) return false;

    const cooldownEnd = new Date(recentNotification.triggeredAt.getTime() + rule.cooldown * 60 * 1000);
    return new Date() < cooldownEnd;
  }

  /**
   * Evaluate rule conditions
   */
  private evaluateConditions(conditions: AlertCondition[], metrics: Record<string, any>): boolean {
    for (const condition of conditions) {
      const value = this.getMetricValue(condition.field, metrics);
      const conditionMet = this.evaluateThreshold(value, condition.value, condition.operator);
      
      if (condition.required && !conditionMet) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get metric value from metrics object
   */
  private getMetricValue(metric: string, metrics: Record<string, any>): any {
    // Support nested properties with dot notation
    const keys = metric.split('.');
    let value = metrics;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(currentValue: any, threshold: any, operator: string): boolean {
    switch (operator) {
      case 'gt': return currentValue > threshold;
      case 'gte': return currentValue >= threshold;
      case 'lt': return currentValue < threshold;
      case 'lte': return currentValue <= threshold;
      case 'eq': return currentValue === threshold;
      case 'contains': return String(currentValue).includes(String(threshold));
      default: return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, currentValue: any, metrics: Record<string, any>): Promise<void> {
    console.log(`🚨 [AUTOMATED-ALERTS] Triggering alert: ${rule.name}`);

    // Create notification
    const notification: AlertNotification = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      priority: rule.priority,
      metric: rule.metric,
      currentValue,
      thresholdValue: rule.threshold,
      message: this.generateAlertMessage(rule, currentValue),
      details: {
        metrics,
        rule: rule.description,
        timeWindow: rule.timeWindow
      },
      triggeredAt: new Date(),
      resolved: false,
      actions: rule.actions.map(action => ({
        type: action.type,
        executed: false
      }))
    };

    // Add to active notifications
    this.activeNotifications.push(notification);

    // Execute actions
    for (let i = 0; i < rule.actions.length; i++) {
      const action = rule.actions[i];
      if (action.enabled) {
        await this.executeAction(action, notification, i);
      }
    }

    // Store in database
    await this.storeNotification(notification);

    console.log(`✅ [AUTOMATED-ALERTS] Alert processed: ${notification.id}`);
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, currentValue: any): string {
    const formattedValue = typeof currentValue === 'number' 
      ? currentValue.toFixed(3) 
      : String(currentValue);
    
    const formattedThreshold = typeof rule.threshold === 'number' 
      ? rule.threshold.toFixed(3) 
      : String(rule.threshold);

    return `${rule.name}: ${rule.metric} is ${formattedValue} (threshold: ${rule.operator} ${formattedThreshold})`;
  }

  /**
   * Execute alert action
   */
  private async executeAction(action: AlertAction, notification: AlertNotification, actionIndex: number): Promise<void> {
    const actionState = notification.actions[actionIndex];
    
    try {
      console.log(`🔧 [AUTOMATED-ALERTS] Executing action: ${action.type}`);

      let result: any;

      switch (action.type) {
        case 'email':
          result = await this.executeEmailAction(action, notification);
          break;
        case 'webhook':
          result = await this.executeWebhookAction(action, notification);
          break;
        case 'log':
          result = await this.executeLogAction(action, notification);
          break;
        case 'database':
          result = await this.executeDatabaseAction(action, notification);
          break;
        case 'auto_fix':
          result = await this.executeAutoFixAction(action, notification);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      actionState.executed = true;
      actionState.executedAt = new Date();
      actionState.result = result;

      console.log(`✅ [AUTOMATED-ALERTS] Action ${action.type} executed successfully`);

    } catch (error) {
      console.error(`❌ [AUTOMATED-ALERTS] Action ${action.type} failed:`, error);
      
      actionState.executed = false;
      actionState.error = error.message;
    }
  }

  /**
   * Execute email action
   */
  private async executeEmailAction(action: AlertAction, notification: AlertNotification): Promise<any> {
    // In production, integrate with email service (SendGrid, AWS SES, etc.)
    console.log('📧 [EMAIL-ACTION] Sending alert email:', {
      recipients: action.config.recipients,
      subject: action.config.subject,
      message: notification.message,
      priority: notification.priority
    });

    // Simulate email sending
    return {
      sent: true,
      recipients: action.config.recipients,
      messageId: `email_${Date.now()}`
    };
  }

  /**
   * Execute webhook action
   */
  private async executeWebhookAction(action: AlertAction, notification: AlertNotification): Promise<any> {
    const payload = {
      alert: {
        id: notification.id,
        rule: notification.ruleName,
        priority: notification.priority,
        message: notification.message,
        metric: notification.metric,
        currentValue: notification.currentValue,
        threshold: notification.thresholdValue,
        triggeredAt: notification.triggeredAt.toISOString()
      }
    };

    // In production, make actual HTTP request
    console.log('🔗 [WEBHOOK-ACTION] Sending webhook:', {
      url: action.config.url,
      method: action.config.method,
      payload
    });

    return {
      status: 200,
      sent: true,
      url: action.config.url
    };
  }

  /**
   * Execute log action
   */
  private async executeLogAction(action: AlertAction, notification: AlertNotification): Promise<any> {
    const logLevel = action.config.level || 'info';
    const category = action.config.category || 'alerts';
    
    const logMessage = `[${category.toUpperCase()}] ${notification.message}`;
    
    switch (logLevel) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
      default:
        console.log(logMessage);
        break;
    }

    return {
      logged: true,
      level: logLevel,
      category
    };
  }

  /**
   * Execute database action
   */
  private async executeDatabaseAction(action: AlertAction, notification: AlertNotification): Promise<any> {
    if (!this.supabase) {
      throw new Error('Database not available');
    }

    const table = action.config.table || 'alert_logs';
    const record = {
      alert_id: notification.id,
      rule_name: notification.ruleName,
      priority: notification.priority,
      message: notification.message,
      details: notification.details,
      created_at: new Date().toISOString(),
      ...action.config.additionalFields
    };

    const { error } = await this.supabase
      .from(table)
      .insert(record);

    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }

    return {
      stored: true,
      table,
      recordId: record.alert_id
    };
  }

  /**
   * Execute auto-fix action
   */
  private async executeAutoFixAction(action: AlertAction, notification: AlertNotification): Promise<any> {
    const fixAction = action.config.action;
    
    console.log(`🛠️ [AUTO-FIX] Executing auto-fix: ${fixAction}`);

    switch (fixAction) {
      case 'switch_to_backup_model':
        return this.switchToBackupModel();
      case 'enable_cost_optimization':
        return this.enableCostOptimization();
      case 'clear_model_cache':
        return this.clearModelCache();
      case 'restart_monitoring':
        return this.restartMonitoring();
      default:
        throw new Error(`Unknown auto-fix action: ${fixAction}`);
    }
  }

  /**
   * Auto-fix: Switch to backup model
   */
  private async switchToBackupModel(): Promise<any> {
    console.log('🔄 [AUTO-FIX] Switching to backup AI model...');
    // Implementation would switch to a more reliable but possibly less accurate model
    return { action: 'switch_to_backup_model', executed: true };
  }

  /**
   * Auto-fix: Enable cost optimization
   */
  private async enableCostOptimization(): Promise<any> {
    console.log('💰 [AUTO-FIX] Enabling cost optimization mode...');
    // Implementation would enable cost-saving measures like lower resolution images
    return { action: 'enable_cost_optimization', executed: true };
  }

  /**
   * Auto-fix: Clear model cache
   */
  private async clearModelCache(): Promise<any> {
    console.log('🗑️ [AUTO-FIX] Clearing model cache...');
    // Implementation would clear any cached model data
    return { action: 'clear_model_cache', executed: true };
  }

  /**
   * Auto-fix: Restart monitoring
   */
  private async restartMonitoring(): Promise<any> {
    console.log('🔄 [AUTO-FIX] Restarting accuracy monitoring...');
    // Implementation would restart the monitoring services
    return { action: 'restart_monitoring', executed: true };
  }

  /**
   * Get current metrics for evaluation
   */
  private async getCurrentMetrics(): Promise<Record<string, any> | null> {
    try {
      // Get metrics from accuracy monitor
      const accuracyStatus = await realTimeAccuracyMonitor.getAccuracyStatus();
      
      if (!accuracyStatus.metrics) {
        return null;
      }

      // Get additional metrics from database
      const additionalMetrics = await this.getAdditionalMetrics();

      return {
        ...accuracyStatus.metrics.fieldAccuracies,
        overall_accuracy: accuracyStatus.metrics.overallAccuracy,
        cost_efficiency: accuracyStatus.metrics.costEfficiency,
        ...additionalMetrics
      };

    } catch (error) {
      console.error('❌ [AUTOMATED-ALERTS] Error getting current metrics:', error);
      return null;
    }
  }

  /**
   * Get additional metrics from database
   */
  private async getAdditionalMetrics(): Promise<Record<string, any>> {
    if (!this.supabase) return {};

    try {
      // Get recent predictions for additional calculations
      const { data: predictions, error } = await this.supabase
        .from('ai_predictions')
        .select('total_cost_cents, analysis_duration_ms, created_at')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .order('created_at', { ascending: false });

      if (error || !predictions || predictions.length === 0) {
        return {};
      }

      // Calculate additional metrics
      const totalCost = predictions.reduce((sum, p) => sum + (p.total_cost_cents || 0), 0);
      const avgResponseTime = predictions.reduce((sum, p) => sum + (p.analysis_duration_ms || 0), 0) / predictions.length;
      const predictionsPerHour = predictions.length;
      const costPerPrediction = totalCost / Math.max(predictions.length, 1) / 100; // Convert to dollars

      return {
        predictions_per_hour: predictionsPerHour,
        avg_response_time_ms: avgResponseTime,
        cost_per_prediction: costPerPrediction,
        total_cost_last_hour: totalCost / 100
      };

    } catch (error) {
      console.error('❌ [AUTOMATED-ALERTS] Error getting additional metrics:', error);
      return {};
    }
  }

  /**
   * Store notification in database
   */
  private async storeNotification(notification: AlertNotification): Promise<void> {
    if (!this.supabase) return;

    try {
      const { error } = await this.supabase
        .from('automated_alerts')
        .insert({
          alert_id: notification.id,
          rule_id: notification.ruleId,
          rule_name: notification.ruleName,
          priority: notification.priority,
          metric: notification.metric,
          current_value: notification.currentValue,
          threshold_value: notification.thresholdValue,
          message: notification.message,
          details: notification.details,
          triggered_at: notification.triggeredAt.toISOString(),
          resolved: notification.resolved,
          actions_executed: notification.actions.filter(a => a.executed).length
        });

      if (error) {
        console.error('❌ [AUTOMATED-ALERTS] Error storing notification:', error);
      }

    } catch (error) {
      console.error('❌ [AUTOMATED-ALERTS] Error storing notification:', error);
    }
  }

  /**
   * Load rules from database
   */
  private async loadRulesFromDatabase(): Promise<void> {
    if (!this.supabase) return;

    try {
      const { data: rules, error } = await this.supabase
        .from('alert_rules')
        .select('*')
        .eq('enabled', true);

      if (error) {
        console.warn('⚠️ [AUTOMATED-ALERTS] Could not load rules from database:', error);
        return;
      }

      if (rules && rules.length > 0) {
        console.log(`📥 [AUTOMATED-ALERTS] Loaded ${rules.length} custom rules from database`);
        // Merge with predefined rules
        this.alertRules = [...this.alertRules, ...rules];
      }

    } catch (error) {
      console.error('❌ [AUTOMATED-ALERTS] Error loading rules from database:', error);
    }
  }

  /**
   * Clean up old notifications
   */
  private cleanupOldNotifications(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const beforeCount = this.activeNotifications.length;
    
    this.activeNotifications = this.activeNotifications.filter(notification => 
      notification.triggeredAt > cutoff || !notification.resolved
    );
    
    const cleanedCount = beforeCount - this.activeNotifications.length;
    if (cleanedCount > 0) {
      console.log(`🧹 [AUTOMATED-ALERTS] Cleaned up ${cleanedCount} old notifications`);
    }
  }

  /**
   * Get system status
   */
  getSystemStatus(): {
    monitoringActive: boolean;
    rulesCount: number;
    activeNotifications: number;
    lastCheck?: Date;
  } {
    return {
      monitoringActive: this.monitoringActive,
      rulesCount: this.alertRules.filter(r => r.enabled).length,
      activeNotifications: this.activeNotifications.filter(n => !n.resolved).length,
      lastCheck: this.activeNotifications.length > 0 
        ? this.activeNotifications[this.activeNotifications.length - 1].triggeredAt 
        : undefined
    };
  }

  /**
   * Resolve notification
   */
  resolveNotification(notificationId: string): boolean {
    const notification = this.activeNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.resolved = true;
      notification.resolvedAt = new Date();
      console.log('✅ [AUTOMATED-ALERTS] Notification resolved:', notificationId);
      return true;
    }
    return false;
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const newRule: AlertRule = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...rule
    };
    
    this.alertRules.push(newRule);
    console.log('➕ [AUTOMATED-ALERTS] Added custom rule:', newRule.name);
    
    return newRule.id;
  }

  /**
   * Get all notifications
   */
  getNotifications(): AlertNotification[] {
    return [...this.activeNotifications].sort((a, b) => 
      b.triggeredAt.getTime() - a.triggeredAt.getTime()
    );
  }
}

// Export singleton instance
export const automatedPerformanceAlerts = new AutomatedPerformanceAlerts();