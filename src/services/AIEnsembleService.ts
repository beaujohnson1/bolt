/**
 * AI Ensemble Service
 * Advanced AI model selection and ensemble predictions for maximum accuracy
 */

interface ImageAnalysisComplexity {
  hasSmallText: boolean;
  imageCount: number;
  estimatedTextDensity: number;
  hasMultipleItems: boolean;
  lightingQuality: 'poor' | 'fair' | 'good' | 'excellent';
  imageSharpness: number;
  complexityScore: number;
}

interface ModelCapabilities {
  name: string;
  endpoint: string;
  strengths: string[];
  weaknesses: string[];
  costPerCall: number;
  averageResponseTime: number;
  accuracyRating: number;
  maxImageSize: number;
  maxImages: number;
  supportsMultiImage: boolean;
}

interface EnsemblePrediction {
  primaryResult: any;
  consensusResult: any;
  modelAgreement: number;
  confidenceScore: number;
  usedModels: string[];
  disagreements: Array<{
    field: string;
    values: Array<{ model: string; value: any; confidence: number }>;
    resolution: string;
  }>;
  performanceMetrics: {
    totalTime: number;
    avgResponseTime: number;
    costEstimate: number;
  };
}

interface ModelSelection {
  selectedModel: string;
  reasoning: string[];
  fallbackModels: string[];
  ensembleStrategy: 'single' | 'consensus' | 'weighted' | 'hierarchical';
  expectedAccuracy: number;
  estimatedCost: number;
}

class AIEnsembleService {
  private readonly models: Record<string, ModelCapabilities> = {
    'gpt-4o': {
      name: 'GPT-4o',
      endpoint: '/.netlify/functions/openai-vision-analysis',
      strengths: ['complex reasoning', 'detailed analysis', 'multi-image understanding'],
      weaknesses: ['higher cost', 'slower response'],
      costPerCall: 0.02,
      averageResponseTime: 3000,
      accuracyRating: 0.95,
      maxImageSize: 20 * 1024 * 1024, // 20MB
      maxImages: 10,
      supportsMultiImage: true
    },
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      endpoint: '/.netlify/functions/openai-vision-analysis',
      strengths: ['fast response', 'cost-effective', 'reliable'],
      weaknesses: ['less detailed for complex images'],
      costPerCall: 0.005,
      averageResponseTime: 1500,
      accuracyRating: 0.88,
      maxImageSize: 10 * 1024 * 1024, // 10MB
      maxImages: 5,
      supportsMultiImage: true
    },
  };

  private readonly costBudgetLimits = {
    low: 0.01,      // Budget-conscious
    medium: 0.03,   // Balanced
    high: 0.08,     // Premium accuracy
    unlimited: 1.0   // Best possible results
  };

  constructor() {
    console.log('🤖 [AI-ENSEMBLE] AI Ensemble Service initialized with models:', Object.keys(this.models));
  }

  /**
   * Analyze image complexity to determine optimal model selection
   */
  async analyzeImageComplexity(imageUrls: string[], ocrText?: string): Promise<ImageAnalysisComplexity> {
    try {
      console.log('🔍 [AI-ENSEMBLE] Analyzing image complexity for', imageUrls.length, 'images...');

      const complexity: ImageAnalysisComplexity = {
        hasSmallText: false,
        imageCount: imageUrls.length,
        estimatedTextDensity: 0,
        hasMultipleItems: false,
        lightingQuality: 'fair',
        imageSharpness: 0.7,
        complexityScore: 0
      };

      // Analyze OCR text if available
      if (ocrText) {
        complexity.estimatedTextDensity = ocrText.length / 1000; // Normalize by 1000 chars
        complexity.hasSmallText = this.detectSmallText(ocrText);
      }

      // Estimate image complexity based on file size and count
      complexity.hasMultipleItems = imageUrls.length > 2;
      
      // Simple heuristics for complexity scoring
      let score = 0;
      
      // Text complexity
      if (complexity.hasSmallText) score += 0.3;
      if (complexity.estimatedTextDensity > 0.5) score += 0.2;
      
      // Image count complexity
      if (complexity.imageCount > 3) score += 0.2;
      if (complexity.imageCount > 5) score += 0.1;
      
      // Multi-item complexity
      if (complexity.hasMultipleItems) score += 0.2;

      complexity.complexityScore = Math.min(1.0, score);

      console.log('📊 [AI-ENSEMBLE] Image complexity analysis:', {
        score: complexity.complexityScore,
        hasSmallText: complexity.hasSmallText,
        textDensity: complexity.estimatedTextDensity,
        imageCount: complexity.imageCount
      });

      return complexity;

    } catch (error) {
      console.error('❌ [AI-ENSEMBLE] Complexity analysis failed:', error);
      
      // Return default complexity
      return {
        hasSmallText: false,
        imageCount: imageUrls.length,
        estimatedTextDensity: 0.3,
        hasMultipleItems: imageUrls.length > 2,
        lightingQuality: 'fair',
        imageSharpness: 0.7,
        complexityScore: 0.5
      };
    }
  }

  /**
   * Select optimal AI model based on complexity and constraints
   */
  selectOptimalModel(
    complexity: ImageAnalysisComplexity,
    constraints: {
      budget: 'low' | 'medium' | 'high' | 'unlimited';
      priority: 'speed' | 'accuracy' | 'cost' | 'balanced';
      maxResponseTime?: number;
    }
  ): ModelSelection {
    try {
      console.log('🎯 [AI-ENSEMBLE] Selecting optimal model for complexity:', complexity.complexityScore, 'constraints:', constraints);

      const availableModels = Object.entries(this.models);
      const budgetLimit = this.costBudgetLimits[constraints.budget];
      
      // Filter models by budget and constraints
      const eligibleModels = availableModels.filter(([name, model]) => {
        if (model.costPerCall > budgetLimit) return false;
        if (constraints.maxResponseTime && model.averageResponseTime > constraints.maxResponseTime) return false;
        return true;
      });

      if (eligibleModels.length === 0) {
        // Fallback to cheapest model if no eligible models
        const cheapestModel = availableModels.sort((a, b) => a[1].costPerCall - b[1].costPerCall)[0];
        return this.createModelSelection(cheapestModel[0], ['Budget constraint fallback'], [cheapestModel[0]], 'single', 0.7, cheapestModel[1].costPerCall);
      }

      // Score models based on priority and complexity
      const scoredModels = eligibleModels.map(([name, model]) => ({
        name,
        model,
        score: this.calculateModelScore(model, complexity, constraints)
      })).sort((a, b) => b.score - a.score);

      const selectedModel = scoredModels[0];
      const fallbackModels = scoredModels.slice(1, 3).map(m => m.name);

      // Determine ensemble strategy
      const ensembleStrategy = this.determineEnsembleStrategy(complexity, constraints, scoredModels);
      
      const reasoning = this.generateSelectionReasoning(selectedModel.model, complexity, constraints);

      console.log('✅ [AI-ENSEMBLE] Selected model:', selectedModel.name, 'with strategy:', ensembleStrategy);

      return this.createModelSelection(
        selectedModel.name,
        reasoning,
        fallbackModels,
        ensembleStrategy,
        selectedModel.model.accuracyRating,
        selectedModel.model.costPerCall
      );

    } catch (error) {
      console.error('❌ [AI-ENSEMBLE] Model selection failed:', error);
      
      // Fallback to default model
      return this.createModelSelection('gpt-4o-mini', ['Fallback selection'], ['gpt-4o'], 'single', 0.85, 0.005);
    }
  }

  /**
   * Execute ensemble prediction with multiple models
   */
  async executeEnsemblePrediction(
    imageUrls: string[],
    options: any,
    modelSelection: ModelSelection
  ): Promise<EnsemblePrediction> {
    const startTime = performance.now();
    
    try {
      console.log('🎭 [AI-ENSEMBLE] Executing ensemble prediction with strategy:', modelSelection.ensembleStrategy);

      const results: Array<{ model: string; result: any; time: number; success: boolean }> = [];
      let totalCost = 0;

      if (modelSelection.ensembleStrategy === 'single') {
        // Single model execution
        const result = await this.executeModelPrediction(modelSelection.selectedModel, imageUrls, options);
        results.push({
          model: modelSelection.selectedModel,
          result: result.analysis,
          time: result.responseTime,
          success: result.success
        });
        totalCost += this.models[modelSelection.selectedModel].costPerCall;

      } else if (modelSelection.ensembleStrategy === 'consensus') {
        // Multiple model consensus
        const modelsToUse = [modelSelection.selectedModel, ...modelSelection.fallbackModels.slice(0, 2)];
        
        const modelPromises = modelsToUse.map(async (modelName) => {
          try {
            const result = await this.executeModelPrediction(modelName, imageUrls, options);
            totalCost += this.models[modelName].costPerCall;
            return {
              model: modelName,
              result: result.analysis,
              time: result.responseTime,
              success: result.success
            };
          } catch (error) {
            console.warn(`⚠️ [AI-ENSEMBLE] Model ${modelName} failed:`, error);
            return {
              model: modelName,
              result: null,
              time: 0,
              success: false
            };
          }
        });

        const modelResults = await Promise.allSettled(modelPromises);
        results.push(...modelResults
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value)
          .filter(r => r.success)
        );

      } else if (modelSelection.ensembleStrategy === 'hierarchical') {
        // Hierarchical execution: fast model first, then detailed if needed
        const fastModel = this.getFastestModel();
        const detailedModel = modelSelection.selectedModel;

        // Execute fast model first
        const fastResult = await this.executeModelPrediction(fastModel, imageUrls, options);
        results.push({
          model: fastModel,
          result: fastResult.analysis,
          time: fastResult.responseTime,
          success: fastResult.success
        });
        totalCost += this.models[fastModel].costPerCall;

        // Execute detailed model if fast model confidence is low
        if (fastResult.analysis?.confidence < 0.8) {
          console.log('🔄 [AI-ENSEMBLE] Fast model confidence low, executing detailed model...');
          const detailedResult = await this.executeModelPrediction(detailedModel, imageUrls, options);
          results.push({
            model: detailedModel,
            result: detailedResult.analysis,
            time: detailedResult.responseTime,
            success: detailedResult.success
          });
          totalCost += this.models[detailedModel].costPerCall;
        }
      }

      // Analyze consensus and disagreements
      const consensus = this.buildConsensus(results);
      const primaryResult = results.find(r => r.model === modelSelection.selectedModel)?.result || results[0]?.result;
      
      const totalTime = performance.now() - startTime;
      const avgResponseTime = results.length > 0 ? results.reduce((sum, r) => sum + r.time, 0) / results.length : 0;

      console.log('✅ [AI-ENSEMBLE] Ensemble prediction complete:', {
        modelsUsed: results.map(r => r.model),
        totalTime: totalTime.toFixed(2) + 'ms',
        consensus: consensus.modelAgreement,
        cost: totalCost.toFixed(4)
      });

      return {
        primaryResult,
        consensusResult: consensus.result,
        modelAgreement: consensus.modelAgreement,
        confidenceScore: consensus.confidenceScore,
        usedModels: results.map(r => r.model),
        disagreements: consensus.disagreements,
        performanceMetrics: {
          totalTime,
          avgResponseTime,
          costEstimate: totalCost
        }
      };

    } catch (error) {
      console.error('❌ [AI-ENSEMBLE] Ensemble prediction failed:', error);
      throw error;
    }
  }

  /**
   * Smart model selection and execution (main public method)
   */
  async getSmartAIAnalysis(
    imageUrls: string[],
    options: any = {},
    constraints: {
      budget?: 'low' | 'medium' | 'high' | 'unlimited';
      priority?: 'speed' | 'accuracy' | 'cost' | 'balanced';
      maxResponseTime?: number;
    } = {}
  ): Promise<EnsemblePrediction> {
    try {
      console.log('🧠 [AI-ENSEMBLE] Starting smart AI analysis for', imageUrls.length, 'images...');

      // Set default constraints
      const finalConstraints = {
        budget: constraints.budget || 'medium',
        priority: constraints.priority || 'balanced',
        maxResponseTime: constraints.maxResponseTime
      };

      // Analyze image complexity
      const complexity = await this.analyzeImageComplexity(imageUrls, options.ocrText);

      // Select optimal model strategy
      const modelSelection = this.selectOptimalModel(complexity, finalConstraints);

      // Execute ensemble prediction
      const prediction = await this.executeEnsemblePrediction(imageUrls, options, modelSelection);

      console.log('🎯 [AI-ENSEMBLE] Smart AI analysis complete with', prediction.usedModels.length, 'models');

      return prediction;

    } catch (error) {
      console.error('❌ [AI-ENSEMBLE] Smart AI analysis failed:', error);
      
      // Fallback to simple single model execution
      return this.executeFallbackPrediction(imageUrls, options);
    }
  }

  /**
   * Private helper methods
   */

  private detectSmallText(ocrText: string): boolean {
    // Detect patterns indicating small text (size tags, care labels, etc.)
    const smallTextPatterns = [
      /\b[XLS]\b/gi,           // Size abbreviations
      /\b\d+[%]\b/g,           // Percentages (material composition)
      /machine wash/gi,         // Care instructions
      /do not bleach/gi,       // Care instructions
      /\b[A-Z]{2,}\b/g         // Abbreviations
    ];

    return smallTextPatterns.some(pattern => pattern.test(ocrText));
  }

  private calculateModelScore(
    model: ModelCapabilities,
    complexity: ImageAnalysisComplexity,
    constraints: any
  ): number {
    let score = 0;

    // Base accuracy score
    score += model.accuracyRating * 0.4;

    // Priority-based scoring
    switch (constraints.priority) {
      case 'speed':
        score += (3000 - model.averageResponseTime) / 3000 * 0.3; // Faster is better
        break;
      case 'accuracy':
        score += model.accuracyRating * 0.3;
        break;
      case 'cost':
        score += (0.02 - model.costPerCall) / 0.02 * 0.3; // Cheaper is better
        break;
      case 'balanced':
        score += model.accuracyRating * 0.15;
        score += (3000 - model.averageResponseTime) / 3000 * 0.15;
        break;
    }

    // Complexity-based adjustments
    if (complexity.complexityScore > 0.7 && model.name.includes('4o') && !model.name.includes('mini')) {
      score += 0.2; // Prefer full GPT-4o for complex images
    }

    if (complexity.hasSmallText && model.name === 'Google Vision') {
      score += 0.15; // Google Vision excels at OCR
    }

    if (complexity.imageCount > 5 && model.supportsMultiImage) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  private determineEnsembleStrategy(
    complexity: ImageAnalysisComplexity,
    constraints: any,
    scoredModels: any[]
  ): 'single' | 'consensus' | 'weighted' | 'hierarchical' {
    
    // High complexity or high accuracy priority -> consensus
    if (complexity.complexityScore > 0.8 || constraints.priority === 'accuracy') {
      return 'consensus';
    }

    // Budget constraints -> single model
    if (constraints.budget === 'low' || constraints.priority === 'cost') {
      return 'single';
    }

    // Speed priority -> hierarchical (fast then detailed if needed)
    if (constraints.priority === 'speed') {
      return 'hierarchical';
    }

    // Default balanced approach
    return scoredModels.length > 1 ? 'consensus' : 'single';
  }

  private generateSelectionReasoning(
    model: ModelCapabilities,
    complexity: ImageAnalysisComplexity,
    constraints: any
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Selected ${model.name} for ${constraints.priority} priority`);

    if (complexity.complexityScore > 0.7) {
      reasoning.push('High complexity images require advanced reasoning');
    }

    if (complexity.hasSmallText) {
      reasoning.push('Small text detection requires high-resolution analysis');
    }

    if (constraints.budget === 'low') {
      reasoning.push('Budget-conscious selection favors cost-effective models');
    }

    reasoning.push(`Expected accuracy: ${(model.accuracyRating * 100).toFixed(1)}%`);

    return reasoning;
  }

  private createModelSelection(
    selectedModel: string,
    reasoning: string[],
    fallbackModels: string[],
    ensembleStrategy: 'single' | 'consensus' | 'weighted' | 'hierarchical',
    expectedAccuracy: number,
    estimatedCost: number
  ): ModelSelection {
    return {
      selectedModel,
      reasoning,
      fallbackModels,
      ensembleStrategy,
      expectedAccuracy,
      estimatedCost
    };
  }

  private async executeModelPrediction(
    modelName: string,
    imageUrls: string[],
    options: any
  ): Promise<{ analysis: any; responseTime: number; success: boolean }> {
    const startTime = performance.now();
    
    try {
      const model = this.models[modelName];
      
      // Handle OpenAI/Anthropic APIs
      const response = await fetch(model.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...options,
            imageUrls,
            model: modelName
          })
        });

        if (!response.ok) {
          throw new Error(`Model ${modelName} request failed: ${response.status}`);
        }

        const result = await response.json();
        const responseTime = performance.now() - startTime;

        return {
          analysis: result.data || result.analysis,
          responseTime,
          success: true
        };
    } catch (error) {
      console.error(`❌ [AI-ENSEMBLE] Model ${modelName} execution failed:`, error);
      return {
        analysis: null,
        responseTime: performance.now() - startTime,
        success: false
      };
    }
  }


  private buildConsensus(results: Array<{ model: string; result: any; time: number; success: boolean }>): {
    result: any;
    modelAgreement: number;
    confidenceScore: number;
    disagreements: any[];
  } {
    if (results.length === 0) {
      return {
        result: null,
        modelAgreement: 0,
        confidenceScore: 0,
        disagreements: []
      };
    }

    if (results.length === 1) {
      return {
        result: results[0].result,
        modelAgreement: 1.0,
        confidenceScore: results[0].result?.confidence || 0.8,
        disagreements: []
      };
    }

    // Build consensus from multiple results
    const consensusResult: any = {};
    const disagreements: any[] = [];
    let agreementCount = 0;
    let totalFields = 0;

    // Fields to analyze for consensus
    const fieldsToAnalyze = ['title', 'brand', 'item_type', 'color', 'size', 'condition', 'material'];

    fieldsToAnalyze.forEach(field => {
      const values = results.map(r => r.result?.[field]).filter(v => v);
      
      if (values.length === 0) return;
      
      totalFields++;
      
      // Find most common value
      const valueCounts = values.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sortedValues = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
      const mostCommon = sortedValues[0];
      
      consensusResult[field] = mostCommon[0];
      
      // Check for agreement
      if (mostCommon[1] === values.length) {
        agreementCount++;
      } else {
        // Record disagreement
        disagreements.push({
          field,
          values: sortedValues.map(([value, count]) => ({
            model: 'multiple',
            value,
            confidence: count / values.length
          })),
          resolution: mostCommon[0]
        });
      }
    });

    const modelAgreement = totalFields > 0 ? agreementCount / totalFields : 1.0;
    const avgConfidence = results.reduce((sum, r) => sum + (r.result?.confidence || 0.8), 0) / results.length;

    return {
      result: consensusResult,
      modelAgreement,
      confidenceScore: avgConfidence * modelAgreement, // Penalize disagreement
      disagreements
    };
  }

  private getFastestModel(): string {
    const fastestModel = Object.entries(this.models)
      .sort((a, b) => a[1].averageResponseTime - b[1].averageResponseTime)[0];
    
    return fastestModel[0];
  }

  private async executeFallbackPrediction(imageUrls: string[], options: any): Promise<EnsemblePrediction> {
    console.log('🚨 [AI-ENSEMBLE] Executing fallback prediction...');
    
    try {
      const fallbackModelName = this.getFastestModel();
      const fallbackResult = await this.executeModelPrediction(fallbackModelName, imageUrls, options);
      
      return {
        primaryResult: fallbackResult.analysis,
        consensusResult: fallbackResult.analysis,
        modelAgreement: 1.0,
        confidenceScore: 0.8,
        usedModels: [fallbackModelName],
        disagreements: [],
        performanceMetrics: {
          totalTime: fallbackResult.responseTime,
          avgResponseTime: fallbackResult.responseTime,
          costEstimate: this.models[fallbackModelName].costPerCall
        }
      };
    } catch (error) {
      console.error('❌ [AI-ENSEMBLE] Fallback prediction failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const aiEnsemble = new AIEnsembleService();