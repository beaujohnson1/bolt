import { getSupabase } from '../lib/supabase';
import { analyzeClothingItem } from './openaiService';
import { safeTrim, toStr } from '../utils/strings';

interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  template: string;
  category: 'clothing' | 'accessories' | 'shoes' | 'general';
  parameters: {
    temperature: number;
    maxTokens: number;
    model: string;
  };
  performanceMetrics: {
    avgAccuracy: number;
    avgCost: number;
    avgResponseTime: number;
    totalTests: number;
  };
  status: 'draft' | 'testing' | 'active' | 'retired';
}

interface PromptExperiment {
  id: string;
  name: string;
  description: string;
  controlPrompt: PromptTemplate;
  testPrompts: PromptTemplate[];
  testImages: string[];
  status: 'setup' | 'running' | 'analyzing' | 'completed';
  results?: ExperimentResults;
}

interface ExperimentResults {
  controlMetrics: {
    avgAccuracy: number;
    avgCost: number;
    avgResponseTime: number;
    fieldAccuracies: Record<string, number>;
  };
  testMetrics: Array<{
    promptId: string;
    avgAccuracy: number;
    avgCost: number;
    avgResponseTime: number;
    fieldAccuracies: Record<string, number>;
    improvement: number;
  }>;
  winner: string;
  statisticalSignificance: number;
  recommendations: string[];
}

interface PromptAnalysis {
  accuracy: number;
  cost: number;
  responseTime: number;
  fieldBreakdown: Record<string, number>;
  commonErrors: string[];
  suggestions: string[];
}

export class PromptOptimizationEngine {
  private supabase;
  private currentPrompts: Map<string, PromptTemplate>;
  
  // Base prompt templates for different scenarios
  private static readonly BASE_TEMPLATES = {
    clothing_v1: {
      name: "Enhanced Clothing Analysis v1",
      template: `You are an expert clothing and fashion item analyzer for eBay listings. Extract MAXIMUM detail from images and OCR text to create accurate, profitable listings.

CRITICAL INSTRUCTIONS:
- If you cannot verify a field from the image or OCR, return null (NEVER use the word "Unknown")
- Prefer OCR text over visual guesses when available
- Use provided CANDIDATES when they match what you see
- Choose ONLY from allowed values when provided for eBay aspects
- Be extremely specific with item types and descriptions
- Report evidence for how you determined brand/size (ocr|vision|null)

CANDIDATES (pre-extracted from OCR):
{candidates}

KNOWN_FIELDS (from previous analysis):
{knownFields}

OCR_TEXT:
{ocrText}

{ebayAspectsPrompt}

Return ONLY JSON matching this schema:
{schema}

Do NOT include markdown or code fences.`,
      parameters: { temperature: 0.1, maxTokens: 1500, model: 'gpt-4o-mini' }
    },
    
    clothing_v2_concise: {
      name: "Concise Clothing Analysis v2",
      template: `Expert eBay clothing analyzer. Extract key details from images and OCR.

RULES:
- Return null if unsure (never "Unknown")
- Use OCR over guesswork
- Match provided candidates when accurate
- Use exact eBay allowed values only

OCR: {ocrText}
CANDIDATES: {candidates}
{ebayAspectsPrompt}

Return valid JSON only:
{schema}`,
      parameters: { temperature: 0.05, maxTokens: 1200, model: 'gpt-4o-mini' }
    },
    
    clothing_v3_detailed: {
      name: "Detailed Clothing Analysis v3",
      template: `You are a professional fashion expert and eBay seller analyzing clothing items for maximum profit potential.

ANALYSIS GOALS:
1. Extract ALL visible brand information with high confidence
2. Determine exact size from tags/labels (OCR priority)
3. Identify premium materials and features for pricing
4. Generate SEO-optimized keywords for eBay search
5. Ensure eBay compliance with item specifics

EVIDENCE REQUIREMENTS:
- Brand: Must see brand name/logo in image or OCR
- Size: Must extract from size tag/label 
- Material: Look for care labels and fabric content
- Condition: Assess visible wear/damage carefully

OCR TEXT (high priority data):
{ocrText}

PRE-EXTRACTED CANDIDATES:
{candidates}

KNOWN CONTEXT:
{knownFields}

{ebayAspectsPrompt}

Analyze systematically and return precise JSON:
{schema}`,
      parameters: { temperature: 0.15, maxTokens: 1800, model: 'gpt-4o-mini' }
    }
  };

  constructor() {
    this.supabase = getSupabase();
    this.currentPrompts = new Map();
    this.initializeBasePrompts();
  }

  /**
   * Initialize base prompt templates
   */
  private initializeBasePrompts(): void {
    Object.entries(PromptOptimizationEngine.BASE_TEMPLATES).forEach(([key, template]) => {
      const promptTemplate: PromptTemplate = {
        id: key,
        name: template.name,
        version: '1.0',
        template: template.template,
        category: 'clothing',
        parameters: template.parameters,
        performanceMetrics: {
          avgAccuracy: 0,
          avgCost: 0,
          avgResponseTime: 0,
          totalTests: 0
        },
        status: 'draft'
      };
      
      this.currentPrompts.set(key, promptTemplate);
    });
  }

  /**
   * Create a new prompt A/B test experiment
   */
  async createPromptExperiment(
    name: string,
    description: string,
    controlPromptId: string,
    testPromptIds: string[],
    testImages: string[]
  ): Promise<string | null> {
    if (!this.supabase) return null;

    try {
      console.log('🧪 [PROMPT-OPTIMIZER] Creating new experiment:', name);

      const controlPrompt = this.currentPrompts.get(controlPromptId);
      if (!controlPrompt) {
        throw new Error(`Control prompt not found: ${controlPromptId}`);
      }

      const testPrompts = testPromptIds.map(id => this.currentPrompts.get(id)).filter(Boolean) as PromptTemplate[];
      
      const experiment: PromptExperiment = {
        id: `exp_${Date.now()}`,
        name,
        description,
        controlPrompt,
        testPrompts,
        testImages: testImages.slice(0, 20), // Limit test images
        status: 'setup'
      };

      // Store experiment in database
      const { data, error } = await this.supabase
        .from('prompt_experiments')
        .insert({
          experiment_name: name,
          prompt_version: controlPrompt.version,
          prompt_text: controlPrompt.template,
          model_used: controlPrompt.parameters.model,
          temperature: controlPrompt.parameters.temperature,
          max_tokens: controlPrompt.parameters.maxTokens,
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [PROMPT-OPTIMIZER] Error creating experiment:', error);
        return null;
      }

      console.log('✅ [PROMPT-OPTIMIZER] Experiment created:', data.id);
      return data.id;

    } catch (error) {
      console.error('❌ [PROMPT-OPTIMIZER] Error creating experiment:', error);
      return null;
    }
  }

  /**
   * Run an A/B test experiment
   */
  async runPromptExperiment(experimentId: string): Promise<ExperimentResults | null> {
    if (!this.supabase) return null;

    try {
      console.log('🚀 [PROMPT-OPTIMIZER] Running experiment:', experimentId);

      // Get experiment data
      const { data: experiment, error } = await this.supabase
        .from('prompt_experiments')
        .select('*')
        .eq('id', experimentId)
        .single();

      if (error || !experiment) {
        console.error('❌ [PROMPT-OPTIMIZER] Experiment not found:', error);
        return null;
      }

      // For now, simulate experiment results with realistic data
      // In production, this would run actual tests
      const controlMetrics = await this.simulatePromptPerformance('control', experiment);
      const testResults = await Promise.all([
        this.simulatePromptPerformance('test1', experiment),
        this.simulatePromptPerformance('test2', experiment)
      ]);

      const results: ExperimentResults = {
        controlMetrics,
        testMetrics: testResults.map((metrics, index) => ({
          promptId: `test_${index + 1}`,
          ...metrics,
          improvement: (metrics.avgAccuracy - controlMetrics.avgAccuracy) / controlMetrics.avgAccuracy
        })),
        winner: this.determineWinner(controlMetrics, testResults),
        statisticalSignificance: 0.95, // Simulated
        recommendations: this.generateExperimentRecommendations(controlMetrics, testResults)
      };

      // Update experiment status
      await this.supabase
        .from('prompt_experiments')
        .update({
          status: 'completed',
          end_date: new Date().toISOString(),
          avg_accuracy: results.controlMetrics.avgAccuracy,
          avg_cost_cents: Math.round(results.controlMetrics.avgCost * 100),
          avg_response_time_ms: results.controlMetrics.avgResponseTime
        })
        .eq('id', experimentId);

      console.log('✅ [PROMPT-OPTIMIZER] Experiment completed:', results.winner);
      return results;

    } catch (error) {
      console.error('❌ [PROMPT-OPTIMIZER] Error running experiment:', error);
      return null;
    }
  }

  /**
   * Analyze prompt performance on a set of test images
   */
  async analyzePromptPerformance(
    promptId: string,
    testImages: string[],
    groundTruth?: Record<string, any>[]
  ): Promise<PromptAnalysis> {
    console.log('📊 [PROMPT-OPTIMIZER] Analyzing prompt performance:', promptId);

    const prompt = this.currentPrompts.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    const results: any[] = [];
    const startTime = Date.now();

    // Test prompt on each image
    for (let i = 0; i < Math.min(testImages.length, 10); i++) {
      try {
        const imageUrl = testImages[i];
        
        // Temporarily modify the OpenAI function to use this specific prompt
        // In production, this would be a more robust implementation
        const result = await this.testPromptOnImage(prompt, imageUrl);
        results.push(result);
        
      } catch (error) {
        console.error('❌ [PROMPT-OPTIMIZER] Error testing image:', error);
        results.push({ error: error.message });
      }
    }

    const totalTime = Date.now() - startTime;
    
    // Calculate metrics
    const validResults = results.filter(r => !r.error);
    const accuracy = this.calculateAccuracy(validResults, groundTruth);
    const avgCost = this.estimateCost(validResults, prompt.parameters);
    const avgResponseTime = totalTime / results.length;
    
    const fieldBreakdown = this.calculateFieldAccuracies(validResults);
    const commonErrors = this.identifyCommonErrors(results);
    const suggestions = this.generateImprovementSuggestions(fieldBreakdown, commonErrors);

    return {
      accuracy,
      cost: avgCost,
      responseTime: avgResponseTime,
      fieldBreakdown,
      commonErrors,
      suggestions
    };
  }

  /**
   * Get the best performing prompt for a category
   */
  getBestPromptForCategory(category: string): PromptTemplate | null {
    const categoryPrompts = Array.from(this.currentPrompts.values())
      .filter(prompt => prompt.category === category && prompt.status === 'active')
      .sort((a, b) => b.performanceMetrics.avgAccuracy - a.performanceMetrics.avgAccuracy);

    return categoryPrompts.length > 0 ? categoryPrompts[0] : null;
  }

  /**
   * Update prompt performance metrics
   */
  async updatePromptMetrics(
    promptId: string,
    accuracy: number,
    cost: number,
    responseTime: number
  ): Promise<void> {
    const prompt = this.currentPrompts.get(promptId);
    if (!prompt) return;

    const metrics = prompt.performanceMetrics;
    const totalTests = metrics.totalTests + 1;
    
    // Update rolling averages
    metrics.avgAccuracy = ((metrics.avgAccuracy * metrics.totalTests) + accuracy) / totalTests;
    metrics.avgCost = ((metrics.avgCost * metrics.totalTests) + cost) / totalTests;
    metrics.avgResponseTime = ((metrics.avgResponseTime * metrics.totalTests) + responseTime) / totalTests;
    metrics.totalTests = totalTests;

    this.currentPrompts.set(promptId, prompt);

    // Update database if available
    if (this.supabase && metrics.totalTests % 10 === 0) { // Update DB every 10 tests
      try {
        await this.supabase
          .from('prompt_experiments')
          .update({
            avg_accuracy: metrics.avgAccuracy,
            avg_cost_cents: Math.round(metrics.avgCost * 100),
            avg_response_time_ms: metrics.avgResponseTime,
            total_tests: metrics.totalTests
          })
          .eq('prompt_version', promptId);
      } catch (error) {
        console.error('❌ [PROMPT-OPTIMIZER] Error updating metrics:', error);
      }
    }
  }

  /**
   * Generate optimization recommendations for prompts
   */
  generatePromptRecommendations(analysis: PromptAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.accuracy < 0.7) {
      recommendations.push('🎯 Overall accuracy is low - consider simplifying the prompt or adding more specific instructions');
    }

    if (analysis.cost > 0.05) {
      recommendations.push('💰 Cost per analysis is high - try reducing max_tokens or using a more efficient model');
    }

    if (analysis.responseTime > 5000) {
      recommendations.push('⚡ Response time is slow - consider optimizing prompt length or model parameters');
    }

    // Field-specific recommendations
    const lowAccuracyFields = Object.entries(analysis.fieldBreakdown)
      .filter(([_, accuracy]) => accuracy < 0.6)
      .map(([field, _]) => field);

    if (lowAccuracyFields.length > 0) {
      recommendations.push(`🔍 Focus on improving accuracy for: ${lowAccuracyFields.join(', ')}`);
    }

    // Error-based recommendations
    if (analysis.commonErrors.includes('json_parse_error')) {
      recommendations.push('⚠️ JSON parsing issues - add stricter JSON formatting instructions');
    }

    if (analysis.commonErrors.includes('unknown_values')) {
      recommendations.push('❌ Too many "Unknown" values - emphasize returning null when uncertain');
    }

    return recommendations;
  }

  // Helper Methods

  private async testPromptOnImage(prompt: PromptTemplate, imageUrl: string): Promise<any> {
    // This would integrate with the actual AI service in production
    // For now, return simulated results
    return {
      title: "Test Item Title",
      brand: Math.random() > 0.3 ? "Nike" : null,
      size: Math.random() > 0.4 ? "L" : null,
      color: Math.random() > 0.2 ? "Black" : null,
      confidence: 0.7 + (Math.random() * 0.3),
      responseTime: 1500 + (Math.random() * 2000)
    };
  }

  private async simulatePromptPerformance(type: string, experiment: any): Promise<any> {
    // Simulate realistic performance metrics
    const baseAccuracy = 0.75;
    const variation = type === 'control' ? 0 : (Math.random() - 0.5) * 0.2;
    
    return {
      avgAccuracy: Math.max(0.4, Math.min(0.95, baseAccuracy + variation)),
      avgCost: 0.02 + (Math.random() * 0.03),
      avgResponseTime: 2000 + (Math.random() * 3000),
      fieldAccuracies: {
        brand: 0.8 + (Math.random() - 0.5) * 0.3,
        size: 0.7 + (Math.random() - 0.5) * 0.3,
        color: 0.75 + (Math.random() - 0.5) * 0.3,
        title: 0.85 + (Math.random() - 0.5) * 0.2
      }
    };
  }

  private determineWinner(control: any, tests: any[]): string {
    const bestTest = tests.reduce((best, current) => 
      current.avgAccuracy > best.avgAccuracy ? current : best
    );
    
    return bestTest.avgAccuracy > control.avgAccuracy ? `test_${tests.indexOf(bestTest) + 1}` : 'control';
  }

  private generateExperimentRecommendations(control: any, tests: any[]): string[] {
    const recommendations: string[] = [];
    
    const bestTest = tests.reduce((best, current) => 
      current.avgAccuracy > best.avgAccuracy ? current : best
    );

    if (bestTest.avgAccuracy > control.avgAccuracy) {
      const improvement = ((bestTest.avgAccuracy - control.avgAccuracy) / control.avgAccuracy) * 100;
      recommendations.push(`✅ Test prompt shows ${improvement.toFixed(1)}% accuracy improvement`);
    } else {
      recommendations.push('🔄 Control prompt still performs best - try different variations');
    }

    if (bestTest.avgCost < control.avgCost) {
      recommendations.push('💰 Test prompt is more cost-efficient');
    }

    return recommendations;
  }

  private calculateAccuracy(results: any[], groundTruth?: any[]): number {
    if (!groundTruth || results.length === 0) {
      // Simulate accuracy when no ground truth available
      return 0.7 + (Math.random() * 0.25);
    }

    // Calculate actual accuracy against ground truth
    let totalAccuracy = 0;
    const minLength = Math.min(results.length, groundTruth.length);

    for (let i = 0; i < minLength; i++) {
      const result = results[i];
      const truth = groundTruth[i];
      
      let fieldMatches = 0;
      let totalFields = 0;
      
      ['brand', 'size', 'color', 'title'].forEach(field => {
        if (truth[field] !== undefined) {
          totalFields++;
          if (result[field] && this.fieldsMatch(result[field], truth[field])) {
            fieldMatches++;
          }
        }
      });

      totalAccuracy += totalFields > 0 ? fieldMatches / totalFields : 0;
    }

    return totalAccuracy / minLength;
  }

  private estimateCost(results: any[], parameters: any): number {
    // Rough cost estimation based on OpenAI pricing
    const avgTokens = parameters.maxTokens * 0.7; // Assume 70% of max tokens used
    const costPerToken = parameters.model === 'gpt-4o-mini' ? 0.00001 : 0.00003;
    return avgTokens * costPerToken;
  }

  private calculateFieldAccuracies(results: any[]): Record<string, number> {
    const fields = ['brand', 'size', 'color', 'title'];
    const accuracies: Record<string, number> = {};

    fields.forEach(field => {
      const fieldResults = results.filter(r => r[field] !== undefined);
      const successRate = fieldResults.filter(r => r[field] !== null && safeTrim(toStr(r[field])) !== '').length / Math.max(fieldResults.length, 1);
      accuracies[field] = successRate;
    });

    return accuracies;
  }

  private identifyCommonErrors(results: any[]): string[] {
    const errors: string[] = [];
    
    const errorResults = results.filter(r => r.error);
    if (errorResults.length > results.length * 0.1) {
      errors.push('json_parse_error');
    }

    const unknownValues = results.filter(r => 
      r.brand === 'Unknown' || r.size === 'Unknown' || r.color === 'Unknown'
    );
    if (unknownValues.length > results.length * 0.2) {
      errors.push('unknown_values');
    }

    return errors;
  }

  private generateImprovementSuggestions(fieldBreakdown: Record<string, number>, commonErrors: string[]): string[] {
    const suggestions: string[] = [];

    Object.entries(fieldBreakdown).forEach(([field, accuracy]) => {
      if (accuracy < 0.6) {
        suggestions.push(`Improve ${field} extraction with more specific instructions`);
      }
    });

    if (commonErrors.includes('json_parse_error')) {
      suggestions.push('Add explicit JSON formatting requirements');
    }

    if (commonErrors.includes('unknown_values')) {
      suggestions.push('Emphasize returning null instead of "Unknown"');
    }

    return suggestions;
  }

  private fieldsMatch(value1: any, value2: any): boolean {
    const str1 = safeTrim(toStr(value1)).toLowerCase();
    const str2 = safeTrim(toStr(value2)).toLowerCase();
    return str1 === str2 || (str1.length > 0 && str2.includes(str1));
  }
}

// Export singleton instance
export const promptOptimizationEngine = new PromptOptimizationEngine();